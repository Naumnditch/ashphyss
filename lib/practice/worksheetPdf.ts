/**
 * Builds a topic's practice questions as a printable A4 PDF, on the server,
 * so a student gets a real file to download, print or send on.
 *
 * Fonts are bundled TTFs rather than PDFKit's built-in Helvetica: the
 * built-ins only cover Latin-1, and the questions are full of −, ×, ⁻¹¹, µ,
 * Ω and subscripts. Pages are laid out by hand (margins set to zero so
 * PDFKit never paginates on its own), measuring each question first so a
 * question is never split across two pages.
 */

import path from 'node:path';
import { isValidElement, type ReactNode } from 'react';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import { getDiagram } from '@/components/practice/MomentumDiagrams';

export interface WorksheetTopic {
  topic_name: string;
  chapter_number: number;
  chapter_title: string;
}

export interface WorksheetProblem {
  id: string;
  problem_number: number | null;
  question_text: string;
  question_image_url: string | null;
  answer_type: string;
  answer_correct: string | null;
  answer_unit: string | null;
  difficulty_level: number | null;
}

export interface WorksheetOption {
  problem_id: string;
  option_text: string;
  option_letter: string;
  is_correct: boolean;
}

export interface WorksheetInput {
  topic: WorksheetTopic;
  problems: WorksheetProblem[];
  options: WorksheetOption[];
  showAnswers: boolean;
}

const FONT_DIR = path.join(process.cwd(), 'lib/practice/fonts');
const REGULAR = path.join(FONT_DIR, 'DejaVuSans.ttf');
const BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 44;
const TOP = 44;
const BOTTOM = PAGE_H - 54;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const NUMBER_W = 24;
const TEXT_X = MARGIN_X + NUMBER_W;
const TEXT_W = CONTENT_W - NUMBER_W;
const TAG_W = 66;
const QUESTION_GAP = 18;
const DIAGRAM_W = 300;

const INK = '#111827';
const GREY = '#6b7280';
const RULE = '#d1d5db';

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Warm-up',
  2: 'Standard',
  3: 'Standard',
  4: 'Challenging',
  5: 'Challenging',
};

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
};

/** How many ruled lines of working space a written-answer question gets. */
export function workingLines(answerType: string, difficulty: number | null): number {
  if (answerType === 'multiple_choice') return 0;
  const level = difficulty ?? 2;
  if (level <= 1) return 2;
  if (level <= 3) return 4;
  return 6;
}

/** "1.8e10" → "1.8 × 10¹⁰", the way the answer is written on paper. */
export function formatAnswer(value: string): string {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)e\+?(-?\d+)$/i);
  if (!match) return value;
  const exponent = [...String(Number(match[2]))].map((c) => SUPERSCRIPT[c]).join('');
  return `${match[1]} × 10${exponent}`;
}

export function worksheetFilename(topicName: string, showAnswers: boolean): string {
  const base = topicName.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
  return `${base} - ${showAnswers ? 'answer key' : 'worksheet'}.pdf`;
}

// SVG attributes React writes as-is; every other camelCase prop is kebab-cased.
const CAMEL_SVG_ATTRIBUTES = new Set(['viewBox', 'markerWidth', 'markerHeight', 'refX', 'refY', 'preserveAspectRatio']);

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Serialises a diagram's React tree to SVG markup. Next.js refuses
 * react-dom/server inside a route handler, and the diagrams are plain
 * function components with no hooks, so this is all that is needed.
 * Styling-only props (className, style) are dropped: the PDF draws the
 * figure's background itself.
 */
export function toSvgMarkup(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return escapeXml(String(node));
  if (Array.isArray(node)) return node.map(toSvgMarkup).join('');
  if (!isValidElement(node)) return '';

  const { children, ...props } = node.props as Record<string, unknown> & { children?: ReactNode };
  if (typeof node.type === 'function') {
    return toSvgMarkup((node.type as (p: unknown) => ReactNode)(node.props));
  }
  if (typeof node.type !== 'string') return toSvgMarkup(children);

  const attributes = Object.entries(props)
    .filter(([name, value]) => name !== 'className' && name !== 'style' && value !== null && value !== undefined && value !== false)
    .map(([name, value]) => {
      const attr = CAMEL_SVG_ATTRIBUTES.has(name) ? name : name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      return ` ${attr}="${escapeXml(String(value))}"`;
    })
    .join('');
  return `<${node.type}${attributes}>${toSvgMarkup(children)}</${node.type}>`;
}

/** The figure's SVG markup, with its viewBox size, or null if none is defined. */
function diagramSvg(key: string): { svg: string; width: number; height: number } | null {
  const element = getDiagram(key);
  if (!element) return null;
  const svg = toSvgMarkup(element);
  const box = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!box) return null;
  return { svg, width: Number(box[1]), height: Number(box[2]) };
}

export async function renderWorksheetPdf({ topic, problems, options, showAnswers }: WorksheetInput): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    bufferPages: true,
    font: REGULAR,
    info: {
      Title: `${topic.topic_name} — ${showAnswers ? 'Answer key' : 'Worksheet'}`,
      Author: 'AshPhys',
    },
  });
  doc.registerFont('regular', REGULAR);
  doc.registerFont('bold', BOLD);

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const optionsByProblem = new Map<string, WorksheetOption[]>();
  for (const option of options) {
    const list = optionsByProblem.get(option.problem_id) ?? [];
    list.push(option);
    optionsByProblem.set(option.problem_id, list);
  }

  let y = drawHeader(doc, topic, problems.length, showAnswers);

  problems.forEach((problem, index) => {
    const choices = optionsByProblem.get(problem.id) ?? [];
    const height = drawQuestion(doc, problem, index, choices, showAnswers, y, false) - y;
    if (y + height > BOTTOM && y > TOP) {
      doc.addPage();
      y = TOP;
    }
    y = drawQuestion(doc, problem, index, choices, showAnswers, y, true) + QUESTION_GAP;
  });

  drawFooters(doc, topic.topic_name, showAnswers);
  doc.end();
  return finished;
}

function drawHeader(doc: PDFKit.PDFDocument, topic: WorksheetTopic, count: number, showAnswers: boolean): number {
  let y = TOP;
  doc.font('bold').fontSize(8).fillColor(INK).text('ASHPHYS', MARGIN_X, y, { characterSpacing: 1.8, lineBreak: false });
  doc
    .font('regular')
    .fontSize(8.5)
    .fillColor(GREY)
    .text(`Chapter ${topic.chapter_number} · ${count} question${count === 1 ? '' : 's'}`, MARGIN_X, y, {
      width: CONTENT_W,
      align: 'right',
      lineBreak: false,
    });

  y += 18;
  doc.font('bold').fontSize(17).fillColor(INK);
  doc.text(topic.topic_name, MARGIN_X, y, { width: CONTENT_W });
  y += doc.heightOfString(topic.topic_name, { width: CONTENT_W }) + 2;

  const subtitle = showAnswers ? `${topic.chapter_title} · Answer key` : topic.chapter_title;
  doc.font('regular').fontSize(9).fillColor(GREY).text(subtitle, MARGIN_X, y, { width: CONTENT_W });
  y += 22;

  const columnGap = 16;
  const columnW = (CONTENT_W - columnGap * 2) / 3;
  ['NAME', 'CLASS', 'DATE'].forEach((label, i) => {
    const x = MARGIN_X + i * (columnW + columnGap);
    doc.font('regular').fontSize(7).fillColor(GREY).text(label, x, y, { characterSpacing: 0.8, lineBreak: false });
    doc.moveTo(x, y + 22).lineTo(x + columnW, y + 22).lineWidth(0.7).strokeColor('#9ca3af').stroke();
  });
  y += 34;

  doc.moveTo(MARGIN_X, y).lineTo(MARGIN_X + CONTENT_W, y).lineWidth(1.6).strokeColor(INK).stroke();
  return y + 22;
}

/**
 * Lays out one question from `top` and returns where it ends. With
 * `draw` false nothing is written — the same code measures the question,
 * so the page-break decision can never disagree with what is drawn.
 */
function drawQuestion(
  doc: PDFKit.PDFDocument,
  problem: WorksheetProblem,
  index: number,
  choices: WorksheetOption[],
  showAnswers: boolean,
  top: number,
  draw: boolean
): number {
  let y = top;
  const number = `${problem.problem_number ?? index + 1}.`;
  const difficulty = problem.difficulty_level ? DIFFICULTY_LABELS[problem.difficulty_level] : null;
  const textW = difficulty ? TEXT_W - TAG_W - 8 : TEXT_W;
  const textOptions = { width: textW, lineGap: 2.5 };

  doc.font('regular').fontSize(10.5);
  const textH = doc.heightOfString(problem.question_text, textOptions);
  if (draw) {
    doc.font('bold').fontSize(10.5).fillColor(INK).text(number, MARGIN_X, y, { lineBreak: false });
    doc.font('regular').fontSize(10.5).fillColor(INK).text(problem.question_text, TEXT_X, y, textOptions);
    if (difficulty) {
      const tagX = MARGIN_X + CONTENT_W - TAG_W;
      doc.roundedRect(tagX, y, TAG_W, 13, 3).lineWidth(0.6).strokeColor(RULE).stroke();
      doc
        .font('regular')
        .fontSize(6.5)
        .fillColor(GREY)
        .text(difficulty.toUpperCase(), tagX, y + 3.6, { width: TAG_W, align: 'center', characterSpacing: 0.6, lineBreak: false });
    }
  }
  y += Math.max(textH, 13);

  if (problem.question_image_url?.startsWith('diagram:')) {
    const figure = diagramSvg(problem.question_image_url);
    if (figure) {
      const height = (DIAGRAM_W * figure.height) / figure.width;
      y += 8;
      if (draw) {
        doc.roundedRect(TEXT_X, y, DIAGRAM_W, height, 6).fillAndStroke('#faf7f0', '#e4ddcc');
        SVGtoPDF(doc, figure.svg, TEXT_X, y, {
          width: DIAGRAM_W,
          height,
          fontCallback: (_family: string, bold: boolean) => (bold ? 'bold' : 'regular'),
        });
      }
      y += height;
    } else {
      y += 8;
      if (draw) {
        doc.roundedRect(TEXT_X, y, TEXT_W, 24, 4).lineWidth(0.7).dash(3, { space: 3 }).strokeColor('#9ca3af').stroke().undash();
        doc
          .font('regular')
          .fontSize(8.5)
          .fillColor(GREY)
          .text('The figure for this question is not available yet.', TEXT_X + 10, y + 8, { lineBreak: false });
      }
      y += 24;
    }
  }

  if (choices.length > 0) {
    y += 8;
    const letterX = TEXT_X + 16;
    const optionX = TEXT_X + 32;
    const optionW = TEXT_X + TEXT_W - optionX;
    for (const choice of choices) {
      const marked = showAnswers && choice.is_correct;
      const label = marked ? `${choice.option_text}   ✓ correct` : choice.option_text;
      doc.font(marked ? 'bold' : 'regular').fontSize(10);
      const h = doc.heightOfString(label, { width: optionW, lineGap: 1.5 });
      if (draw) {
        doc.rect(TEXT_X, y + 1.5, 8.5, 8.5).lineWidth(0.8).strokeColor('#6b7280');
        if (marked) doc.fillAndStroke(INK, INK);
        else doc.stroke();
        doc.font('bold').fontSize(10).fillColor(INK).text(choice.option_letter, letterX, y, { lineBreak: false });
        doc.font(marked ? 'bold' : 'regular').fontSize(10).fillColor(INK).text(label, optionX, y, { width: optionW, lineGap: 1.5 });
      }
      y += h + 4;
    }
    return y;
  }

  const lines = workingLines(problem.answer_type, problem.difficulty_level);
  if (lines > 0) {
    y += 4;
    for (let i = 0; i < lines; i++) {
      y += 20;
      if (draw) doc.moveTo(TEXT_X, y).lineTo(TEXT_X + TEXT_W, y).lineWidth(0.5).strokeColor(RULE).stroke();
    }
  }

  y += 22;
  if (draw) {
    doc.font('bold').fontSize(7.5).fillColor(GREY).text('ANSWER', TEXT_X, y - 9, { characterSpacing: 0.8, lineBreak: false });
    const labelW = doc.widthOfString('ANSWER', { characterSpacing: 0.8 }) + 8;
    let lineEnd = TEXT_X + TEXT_W;
    if (problem.answer_unit) {
      doc.font('bold').fontSize(9.5);
      const unitW = doc.widthOfString(problem.answer_unit);
      lineEnd -= unitW + 6;
      doc.fillColor('#374151').text(problem.answer_unit, lineEnd + 6, y - 10.5, { lineBreak: false });
    }
    doc.moveTo(TEXT_X + labelW, y).lineTo(lineEnd, y).lineWidth(1.1).strokeColor('#9ca3af').stroke();
  }

  if (showAnswers && problem.answer_correct) {
    y += 6;
    const key = `Answer: ${formatAnswer(problem.answer_correct)}${problem.answer_unit ? ` ${problem.answer_unit}` : ''}`;
    if (draw) doc.font('bold').fontSize(9.5).fillColor(INK).text(key, TEXT_X, y, { lineBreak: false });
    y += 12;
  }
  return y;
}

function drawFooters(doc: PDFKit.PDFDocument, topicName: string, showAnswers: boolean) {
  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    const y = PAGE_H - 34;
    doc.moveTo(MARGIN_X, y - 8).lineTo(MARGIN_X + CONTENT_W, y - 8).lineWidth(0.5).strokeColor(RULE).stroke();
    doc
      .font('regular')
      .fontSize(7.5)
      .fillColor(GREY)
      .text(`${topicName}${showAnswers ? ' — answer key' : ''} · ashphys.org`, MARGIN_X, y, { lineBreak: false });
    doc.text(`Page ${i - start + 1} of ${count}`, MARGIN_X, y, { width: CONTENT_W, align: 'right', lineBreak: false });
  }
}
