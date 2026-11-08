'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { SimulationIcon } from '@/components/icons/SimulationIcon';
import { MomentumDiagram } from '@/components/practice/MomentumDiagrams';
import { trackEvent } from '@/lib/analytics/client';
import { previewAnswer, FORMAT_HINT } from '@/lib/grading/numericAnswer';
import { nextQuestionIndex, summarize, type QuestionStatus } from '@/lib/practice/progress';
import { QuestionMap } from '@/components/practice/QuestionMap';
import { SolutionViewer } from '@/components/solutions/SolutionViewer';
import { PracticeTopBar, type LessonInfo } from '@/components/practice/PracticeShell';
import { HandwrittenSolution, type SolutionState } from '@/components/handwriting/HandwrittenSolution';
import { Popover } from '@/components/handwriting/controls';
import { SoundToggle } from '@/components/SoundToggle';
import { ExplanationView } from '@/components/explanations/ExplanationView';
import { animateReveal, celebrateCorrect, celebrateMilestone, primeFeedback, shakeIncorrect } from '@/lib/feedback';

// The heaviest piece of the page, loaded only when a canvas is shown: the
// admin's (writing the teacher solution) or a student's own workspace.
const HandwritingEditor = dynamic(() => import('@/components/handwriting/HandwritingEditor'), {
  ssr: false,
  loading: () => <p className="flex h-full items-center justify-center text-sm text-gray-400">Loading the canvas…</p>,
});
// Students: their own canvas, typed steps and "Share my solution".
const StudentWorkspace = dynamic(() => import('@/components/workspace/StudentWorkspace'), {
  ssr: false,
  loading: () => <p className="flex h-full items-center justify-center text-sm text-gray-400">Loading your workspace…</p>,
});

interface Option {
  id: string;
  text: string;
  letter: string;
}

interface Question {
  id: string;
  number: number;
  lastResult: 'correct' | 'wrong' | null;
  questionText: string;
  imageUrl?: string | null;
  answerType: 'multiple_choice' | 'numeric' | 'free_text';
  difficultyLevel: number;
  marks?: number | null;
  options: Option[];
  solutionId?: string | null;
}

// Foundation/Intermediate/Challenging/Stretch tier badge, derived from difficulty_level.
// Purely presentational — it reads the same column every bank already has, so it
// lights up for older questions too (1→Foundation, 2→Intermediate, 3→Challenging,
// 4+→Stretch), not just the new AS kinematics/accelerated-motion banks.
const TIER_LABELS: Record<number, { label: string; className: string }> = {
  1: { label: 'Foundation', className: 'bg-green-50 text-green-700 border-green-200' },
  2: { label: 'Intermediate', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  3: { label: 'Challenging', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};
const STRETCH_TIER = { label: 'Stretch', className: 'bg-violet-50 text-violet-700 border-violet-200' };

function tierBadge(difficultyLevel: number) {
  return TIER_LABELS[difficultyLevel] ?? STRETCH_TIER;
}

interface Mastery {
  correctStreak: number;
  bestStreak: number;
  totalAttempted: number;
  totalCorrect: number;
  mastered: boolean;
  streakNeeded?: number;
}

interface TopicInfo {
  id: string;
  name: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
}

interface SimInfo {
  title: string;
  url_path: string;
}

export interface PracticeDownloads {
  worksheet: string;
  answerKey?: string | null;
}

// Skipped questions are remembered per browser; right and wrong come from the server.
function skippedKey(topicId: string) {
  return `ashphys:practice-skipped:${topicId}`;
}

function readSkipped(topicId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(skippedKey(topicId)) || '[]'));
  } catch {
    return new Set();
  }
}

function writeSkipped(topicId: string, statuses: Record<string, QuestionStatus>) {
  try {
    const ids = Object.keys(statuses).filter((id) => statuses[id] === 'skipped');
    localStorage.setItem(skippedKey(topicId), JSON.stringify(ids));
  } catch {
    // Private browsing or blocked storage: skips just won't survive a reload.
  }
}

const ADMIN_MODE_KEY = 'ashphys:practice-admin-mode';
type AdminMode = 'write' | 'preview';
/** A student's panel: their own working, or (after a wrong answer) the worked solutions. */
type StudentMode = 'work' | 'solution';

export function PracticeSession({
  topicId,
  curriculumId,
  lesson,
  downloads = null,
  isAdmin = false,
  initialProblemId = null,
}: {
  topicId: string;
  curriculumId?: string;
  lesson: LessonInfo;
  downloads?: PracticeDownloads | null;
  isAdmin?: boolean;
  /** Open on this question (?q= — e.g. from the dashboard's shared solutions). */
  initialProblemId?: string | null;
}) {
  // Each curriculum has its own question bank for a lesson, so skips are
  // remembered per bank. IGCSE keeps the key it had before curricula existed.
  const skipKey = curriculumId && curriculumId !== 'igcse' ? `${topicId}:${curriculumId}` : topicId;
  const bankQuery = curriculumId ? `?curriculum=${encodeURIComponent(curriculumId)}` : '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState<TopicInfo | null>(null);
  const [simulation, setSimulation] = useState<SimInfo | null>(null);
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [mastery, setMastery] = useState<Mastery | null>(null);
  const [statuses, setStatuses] = useState<Record<string, QuestionStatus>>({});

  const [solutionOpenFor, setSolutionOpenFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    correctAnswerLabel: string;
    explanation: string;
    explanationFormat?: 'structured' | 'plain';
    feedback?: string | null;
  } | null>(null);

  // Layout state: the solution panel (collapsible when stacked on narrow
  // screens), the question map and downloads menus, and the admin's mode.
  const [adminMode, setAdminMode] = useState<AdminMode>('write');
  const [studentMode, setStudentMode] = useState<StudentMode>('work');
  const [panelOpen, setPanelOpen] = useState(isAdmin);
  // What the student's solution panel ended up showing ('none' = no handwriting for this question).
  const [solutionState, setSolutionState] = useState<SolutionState | null>(null);
  const [menu, setMenu] = useState<{ id: 'map' | 'downloads'; anchor: HTMLElement } | null>(null);
  const questionScroll = useRef<HTMLDivElement>(null);
  // Answer feedback (lib/feedback): where confetti starts, what shakes, and
  // whether the answer just checked finished the set (bigger celebration).
  const feedbackBox = useRef<HTMLDivElement>(null);
  const answerArea = useRef<HTMLDivElement>(null);
  const milestone = useRef(false);

  useEffect(() => {
    if (!isAdmin) return;
    try {
      if (localStorage.getItem(ADMIN_MODE_KEY) === 'preview') setAdminMode('preview');
    } catch {
      /* ignore */
    }
  }, [isAdmin]);

  const chooseAdminMode = (mode: AdminMode) => {
    setAdminMode(mode);
    setPanelOpen(true);
    try {
      localStorage.setItem(ADMIN_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/practice/${topicId}${bankQuery}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not load practice questions.');
        setLoading(false);
        return;
      }
      if (data.data.questions.length === 0) {
        setError('No practice questions are available for this lesson yet.');
        setLoading(false);
        return;
      }
      setTopic(data.data.topic);
      setSimulation(data.data.simulation);
      setMastery(data.data.mastery);
      const questions: Question[] = data.data.questions;
      const skipped = readSkipped(skipKey);
      const initial: Record<string, QuestionStatus> = {};
      for (const q of questions) {
        initial[q.id] = q.lastResult ?? (skipped.has(q.id) ? 'skipped' : 'untried');
      }
      setQueue(questions);
      setStatuses(initial);
      // Start where "next" would: the first untried question, then skipped, then wrong.
      const linked = initialProblemId ? questions.findIndex((q) => q.id === initialProblemId) : -1;
      setIndex(linked >= 0 ? linked : nextQuestionIndex(questions.map((q) => initial[q.id]), questions.length - 1));
      setLoading(false);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the link only picks the first question
  }, [topicId, bankQuery, skipKey]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    trackEvent({
      eventType: 'practice_start',
      entityType: 'topic',
      entityId: topicId,
      metadata: curriculumId ? { curriculum: curriculumId } : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const current = queue[index];

  // When the current question first appeared, so the attempt log can record
  // how long it took. Reset whenever the question changes.
  const questionShownAt = useRef<number>(Date.now());
  useEffect(() => {
    questionShownAt.current = Date.now();
    questionScroll.current?.scrollTo({ top: 0 });
  }, [current?.id]);

  // Live mirror of how the grader will read a free-entry answer. Purely
  // informational — it never blocks or rewrites what the student typed.
  const answerPreview =
    current?.answerType === 'numeric' && !result ? previewAnswer(selected) : null;

  const handleCheck = async () => {
    if (!current || !selected.trim()) return;
    // Still inside the click/Enter: unlock audio now, the result arrives after an await.
    primeFeedback();
    setChecking(true);
    try {
      const res = await fetch(`/api/practice/${topicId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: current.id,
          submittedAnswer: selected,
          timeSpentMs: Date.now() - questionShownAt.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChecking(false);
        return;
      }
      // Purely for the celebration: this correct answer completed the set or mastered the lesson.
      const answered = (s: QuestionStatus | undefined) => s === 'correct' || s === 'wrong';
      milestone.current =
        !!data.data.isCorrect &&
        ((!queue.every((q) => answered(statuses[q.id])) && queue.every((q) => q.id === current.id || answered(statuses[q.id]))) ||
          (!mastery?.mastered && !!data.data.mastery?.mastered));
      setResult({
        isCorrect: data.data.isCorrect,
        correctAnswerLabel: data.data.correctAnswerLabel,
        explanation: data.data.explanation,
        explanationFormat: data.data.explanationFormat,
        feedback: data.data.feedback,
      });
      setMastery(data.data.mastery);
      setStatuses((prev) => {
        const updated: Record<string, QuestionStatus> = { ...prev, [current.id]: data.data.isCorrect ? 'correct' : 'wrong' };
        writeSkipped(skipKey, updated);
        return updated;
      });
      setChecking(false);
    } catch {
      setChecking(false);
    }
  };

  // Celebrate or shake once per checked answer, after the feedback box has rendered.
  // Fire-and-forget: none of it delays the Next button.
  useEffect(() => {
    if (!result) return;
    if (result.isCorrect) {
      (milestone.current ? celebrateMilestone : celebrateCorrect)(feedbackBox.current);
    } else {
      shakeIncorrect(answerArea.current?.querySelector('[data-selected], input'));
    }
    milestone.current = false;
  }, [result]);

  // The optional interactive solution expands rather than appearing all at once.
  const revealOnMount = useCallback((el: HTMLDivElement | null) => {
    if (el) animateReveal(el);
  }, []);

  const statusList = queue.map((q) => statuses[q.id] ?? 'untried');

  const goTo = (i: number) => {
    setSelected('');
    setResult(null);
    setSolutionOpenFor(null);
    setMenu(null);
    if (!isAdmin) setPanelOpen(false);
    setStudentMode('work');
    setSolutionState(null);
    setIndex(i);
  };

  const handleNext = () => goTo(nextQuestionIndex(statusList, index));

  const handleSkip = () => {
    if (!current) return;
    const updated = { ...statuses };
    // Skipping a question already answered just moves on; it keeps its result.
    if (updated[current.id] === 'untried') {
      updated[current.id] = 'skipped';
      // Lets admins see skips (localStorage alone never reaches the server).
      trackEvent({
        eventType: 'practice_skip',
        entityType: 'topic',
        entityId: topicId,
        metadata: { problemId: current.id, ...(curriculumId ? { curriculum: curriculumId } : {}) },
      });
    }
    setStatuses(updated);
    writeSkipped(skipKey, updated);
    goTo(nextQuestionIndex(queue.map((q) => updated[q.id] ?? 'untried'), index));
  };

  // A wrong answer is the only thing that can reveal the worked solutions
  // (the server checks it too): switch the student's panel to them, and open
  // the panel when stacked on a small screen.
  const answeredWrong = !!result && !result.isCorrect;
  useEffect(() => {
    if (!answeredWrong) return;
    setStudentMode('solution');
    setPanelOpen(true);
  }, [answeredWrong]);

  const showStudentPanel = (mode: StudentMode) => {
    setStudentMode(mode);
    setPanelOpen(true);
  };

  const toggleMenu = (id: 'map' | 'downloads') => (e: React.MouseEvent<HTMLElement>) => {
    const anchor = e.currentTarget;
    setMenu((m) => (m?.id === id ? null : { id, anchor }));
  };
  const closeMenu = useCallback(() => setMenu(null), []);

  const downloadsMenu = downloads && (
    <>
      <button
        type="button"
        onClick={toggleMenu('downloads')}
        aria-expanded={menu?.id === 'downloads'}
        className="hidden h-9 shrink-0 items-center rounded-lg px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 sm:inline-flex"
      >
        PDF ▾
      </button>
      {menu?.id === 'downloads' && (
        <Popover anchor={menu.anchor} onClose={closeMenu} label="Downloads">
          <div className="flex w-48 flex-col gap-1">
            <a href={downloads.worksheet} download className="rounded-lg px-2 py-1.5 font-semibold hover:bg-gray-100">
              Download PDF
            </a>
            {downloads.answerKey && (
              <a href={downloads.answerKey} download className="rounded-lg px-2 py-1.5 font-semibold hover:bg-gray-100">
                Answer key PDF
              </a>
            )}
          </div>
        </Popover>
      )}
    </>
  );

  if (loading || error || !topic || !mastery || !current) {
    return (
      <>
        <PracticeTopBar lesson={lesson}>{downloadsMenu}</PracticeTopBar>
        <div className="flex flex-1 items-center justify-center p-6">
          {loading ? (
            <p className="text-sm text-gray-400">Loading questions…</p>
          ) : error ? (
            <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
              <p className="text-sm text-amber-900">{error}</p>
            </div>
          ) : null}
        </div>
      </>
    );
  }

  const streakNeeded = mastery.streakNeeded || 5;
  const summary = summarize(statusList);

  // The "Topic Mastered" screen is only for a student who has worked through
  // the whole set. A streak earned part-way through must not hide questions
  // that are still untried or skipped, so those always go back to the questions.
  const finishedAllQuestions = statusList.every((s) => s !== 'untried' && s !== 'skipped');

  const topBar = (
    <PracticeTopBar lesson={lesson}>
      {/* Question navigation */}
      <nav aria-label="Questions" className="flex shrink-0 items-center rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => goTo(Math.max(0, index - 1))}
          disabled={index === 0}
          aria-label="Previous question"
          className="inline-flex h-8 w-8 items-center justify-center rounded-l-lg text-gray-700 hover:bg-gray-100 disabled:opacity-35"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={toggleMenu('map')}
          aria-expanded={menu?.id === 'map'}
          aria-label={`Question ${current.number} of ${queue.length}. Show all questions`}
          className="h-8 border-x border-gray-200 px-2 text-xs font-semibold tabular-nums text-gray-800 hover:bg-gray-100"
        >
          Q{current.number}
          <span className="font-normal text-gray-400"> / {queue.length}</span> ▾
        </button>
        <button
          type="button"
          onClick={() => goTo(Math.min(queue.length - 1, index + 1))}
          disabled={index >= queue.length - 1}
          aria-label="Next question"
          className="inline-flex h-8 w-8 items-center justify-center rounded-r-lg text-gray-700 hover:bg-gray-100 disabled:opacity-35"
        >
          ›
        </button>
      </nav>

      {/* Progress */}
      <div className="hidden shrink-0 items-center gap-2 md:flex" title={`${mastery.correctStreak}/${streakNeeded} in a row to master · ${mastery.totalCorrect}/${mastery.totalAttempted} correct overall`}>
        <div className="flex items-center gap-1" aria-hidden="true">
          {Array.from({ length: streakNeeded }).map((_, i) => (
            <div key={i} className="h-1.5 w-4 overflow-hidden rounded-full bg-gray-200">
              <div className={`fb-progress-fill h-full w-full rounded-full bg-green-500 ${i < mastery.correctStreak ? 'scale-x-100' : 'scale-x-0'}`} />
            </div>
          ))}
        </div>
        <span className="text-xs tabular-nums text-gray-500">
          {mastery.correctStreak}/{streakNeeded} to master
          <span className="hidden xl:inline"> · {summary.correct + summary.wrong} of {summary.total} answered</span>
        </span>
      </div>

      <SoundToggle />

      {downloadsMenu}

      {isAdmin && (
        <div className="flex shrink-0 rounded-lg border border-gray-200 p-0.5" role="radiogroup" aria-label="Admin mode">
          <button
            type="button"
            role="radio"
            aria-checked={adminMode === 'write'}
            onClick={() => chooseAdminMode('write')}
            className={`rounded-md px-2 py-1 text-xs font-semibold ${adminMode === 'write' ? 'bg-gray-900 text-on-ink' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            ✎<span className="hidden sm:inline"> Write</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={adminMode === 'preview'}
            onClick={() => chooseAdminMode('preview')}
            className={`rounded-md px-2 py-1 text-xs font-semibold ${adminMode === 'preview' ? 'bg-gray-900 text-on-ink' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            👁<span className="hidden sm:inline"> Student view</span>
          </button>
        </div>
      )}

      {menu?.id === 'map' && (
        <Popover anchor={menu.anchor} onClose={closeMenu} label="All questions">
          <div className="max-h-[70dvh] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto">
            <QuestionMap numbers={queue.map((q) => q.number)} statuses={statusList} current={index} onSelect={goTo} />
          </div>
        </Popover>
      )}
    </PracticeTopBar>
  );

  if (mastery.mastered && finishedAllQuestions && !result) {
    return (
      <>
        {topBar}
        <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
          <div className="text-center">
            <div className="fb-pop w-16 h-16 rounded-full bg-green-50 mx-auto mb-6 flex items-center justify-center text-3xl">
              🏆
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Topic Mastered!</h2>
            <p className="text-gray-500 mb-1">
              {mastery.correctStreak} correct in a row · {mastery.totalCorrect}/{mastery.totalAttempted} overall
            </p>
            <p className="text-gray-400 text-sm mb-8">You&rsquo;ve got this one down.</p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href={`/curriculum/${topic.chapterId}${curriculumId ? `?c=${curriculumId}` : ''}`}
                className="fb-lift bg-gray-900 hover:bg-black text-on-ink px-5 py-2.5 rounded-lg font-semibold text-sm"
              >
                Back to Chapter
              </Link>
              <button
                onClick={() => {
                  setMastery({ ...mastery, mastered: false, correctStreak: 0 });
                  goTo(nextQuestionIndex(statusList, queue.length - 1));
                }}
                className="fb-press border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg font-semibold text-sm"
              >
                Keep Practicing
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const questionLabel = `question ${current.number}`;
  const studentShowsSolution = !isAdmin && answeredWrong && studentMode === 'solution';
  const panelTitle = isAdmin
    ? adminMode === 'write'
      ? 'Admin: write solution'
      : 'Student view'
    : studentShowsSolution
      ? 'Worked solution'
      : 'My working';

  return (
    <>
      {topBar}
      <div className="flex min-h-0 flex-1 flex-col split:grid split:grid-cols-[minmax(320px,37%)_minmax(0,1fr)] split:grid-rows-[minmax(0,1fr)]">
        {/* Left: question, answer, check, feedback. Scrolls on its own if a question is long. */}
        <section
          ref={questionScroll}
          aria-label={`Question ${current.number}`}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain split:flex-none"
        >
          <div className="flex-1 px-4 pt-4 split:px-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  Question {current.number} <span className="font-normal text-gray-400">of {queue.length}</span>
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tierBadge(current.difficultyLevel).className}`}>
                  {tierBadge(current.difficultyLevel).label}
                </span>
                {!!current.marks && (
                  <span className="text-[11px] font-medium text-gray-400">
                    {current.marks} mark{current.marks === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {!result && statuses[current.id] === 'correct' && (
                <span className="text-xs font-medium text-green-700">✓ You got this right before</span>
              )}
              {!result && statuses[current.id] === 'wrong' && (
                <span className="text-xs font-medium text-red-700">✕ Wrong last time — have another go</span>
              )}
              {!result && statuses[current.id] === 'skipped' && (
                <span className="text-xs font-medium text-gray-500">– You skipped this one</span>
              )}
            </div>

            {current.imageUrl && current.imageUrl.startsWith('diagram:') && <MomentumDiagram diagramKey={current.imageUrl} />}
            {current.imageUrl && !current.imageUrl.startsWith('diagram:') && (
              // Uploaded figures are raster images drawn on white: keep a white mat behind them
              // in dark mode instead of inverting them.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.imageUrl}
                alt=""
                className="mx-auto mb-4 max-h-[40dvh] w-full max-w-md rounded border border-gray-200 object-contain p-1"
                style={{ backgroundColor: '#ffffff' }}
              />
            )}
            <p className="mb-5 text-base leading-relaxed text-gray-900">{current.questionText}</p>

            <div ref={answerArea}>
            {current.answerType === 'multiple_choice' && (
              <div className="space-y-2">
                {current.options.map((opt) => {
                  const isSelected = selected === opt.id;
                  const showCorrect = result && opt.text === result.correctAnswerLabel;
                  const showWrong = result && isSelected && !result.isCorrect;
                  const mark = showCorrect ? '✓' : showWrong ? '✕' : isSelected && !result ? '✓' : null;
                  return (
                    <button
                      key={opt.id}
                      disabled={!!result}
                      data-selected={isSelected || undefined}
                      aria-pressed={isSelected}
                      onClick={() => {
                        primeFeedback();
                        setSelected(opt.id);
                      }}
                      className={`relative w-full rounded-lg border py-2.5 pl-3.5 pr-10 text-left text-[15px] transition-colors duration-200 ease-out ${
                        showCorrect
                          ? 'border-green-400 bg-green-50 text-green-900'
                          : showWrong
                          ? 'border-red-400 bg-red-50 text-red-900'
                          : isSelected
                          ? 'border-blue-400 bg-blue-50 text-blue-900'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      } ${result ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span className="mr-2 font-semibold">{opt.letter}.</span>
                      {opt.text}
                      {mark && (
                        <span
                          key={mark + (result ? 'r' : '')}
                          aria-hidden="true"
                          className={`fb-pop absolute right-3 top-1/2 -mt-2.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                            showCorrect ? 'bg-green-600' : showWrong ? 'bg-red-500' : 'bg-blue-600'
                          }`}
                        >
                          {mark}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {current.answerType === 'numeric' && (
              <div>
                {/* type="text", not "number": a number input silently discards
                    anything it considers invalid, so "1.8 x 10^10" reached the
                    server as an empty string. Nothing here validates as you
                    type — the preview below just mirrors what the grader will
                    read, and grading happens only on submit. */}
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={selected}
                  disabled={!!result}
                  onChange={(e) => setSelected(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !result && void handleCheck()}
                  placeholder="Your answer"
                  className={`w-full rounded-lg border px-4 py-2.5 text-[15px] transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 ${
                    answeredWrong ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                <p className="mt-2 text-xs text-gray-500">{FORMAT_HINT}</p>
                {answerPreview && (
                  <p className="mt-1 text-xs text-blue-700">
                    Reading this as <span className="font-semibold">{answerPreview}</span>
                  </p>
                )}
              </div>
            )}

            {current.answerType === 'free_text' && (
              <input
                type="text"
                value={selected}
                disabled={!!result}
                onChange={(e) => setSelected(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !result && void handleCheck()}
                placeholder="Your answer"
                className={`w-full rounded-lg border px-4 py-2.5 text-[15px] transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 ${
                  answeredWrong ? 'border-red-400' : 'border-gray-300'
                }`}
              />
            )}
            </div>

            {/* Feedback */}
            {result && (
              <div
                ref={feedbackBox}
                role="status"
                className={`fb-fade-in mt-4 rounded-xl border p-4 ${result.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
              >
                <p className={`mb-1.5 font-semibold ${result.isCorrect ? 'fb-pop-in text-green-800' : 'text-red-800'}`}>
                  {result.isCorrect ? '✓ Correct!' : `✕ Not quite — the answer was ${result.correctAnswerLabel}`}
                </p>
                {result.feedback && !result.isCorrect && (
                  <p className="mb-2 text-sm leading-relaxed text-red-900">{result.feedback}</p>
                )}
                {result.explanation && <ExplanationView text={result.explanation} format={result.explanationFormat} />}

                {!result.isCorrect && (
                  <div className="mt-3 border-t border-red-100 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Want to revise this first?</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/lessons/${topic.id}${curriculumId ? `?c=${curriculumId}` : ''}`}
                        className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        📖 Review the lesson
                      </Link>
                      {simulation && (
                        <Link
                          href={simulation.url_path}
                          className="flex items-center gap-1 rounded-full border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          <SimulationIcon className="h-3.5 w-3.5" /> Try the simulation
                        </Link>
                      )}
                      {solutionState !== 'none' && (
                        <button
                          type="button"
                          onClick={() => showStudentPanel('solution')}
                          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 split:hidden"
                        >
                          ✍️ Worked solution
                        </button>
                      )}
                      {!isAdmin && (
                        <Link
                          href="/dashboard?tab=videos"
                          className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          🎥 Request a video
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Optional interactive solution: the student opens it if they want it.
                It mounts (and fetches) only when opened, so closed ones cost nothing. */}
            {current.solutionId && (
              <div className="mt-4">
                <button
                  onClick={() => setSolutionOpenFor((cur) => (cur === current.id ? null : current.id))}
                  aria-expanded={solutionOpenFor === current.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                >
                  ✨ {solutionOpenFor === current.id ? 'Hide interactive solution' : 'Interactive solution (optional)'}
                </button>
                {solutionOpenFor === current.id && (
                  <div ref={revealOnMount} className="mt-3">
                    <SolutionViewer key={current.solutionId} id={current.solutionId} embedded />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions stay in reach at the bottom of the column. */}
          <div className="sticky bottom-0 mt-4 border-t border-gray-100 bg-white px-4 py-3 split:px-5">
            {!result ? (
              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  disabled={checking}
                  className="fb-press shrink-0 rounded-lg border border-gray-300 px-5 py-2.5 text-[15px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleCheck}
                  disabled={!selected.trim() || checking}
                  className="fb-lift flex-1 rounded-lg bg-gray-900 py-2.5 text-[15px] font-semibold text-on-ink hover:bg-black disabled:opacity-40"
                >
                  {checking ? 'Checking…' : 'Check Answer'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleNext}
                className="fb-lift w-full rounded-lg bg-gray-900 py-2.5 text-[15px] font-semibold text-on-ink hover:bg-black"
              >
                Next Question →
              </button>
            )}
          </div>
        </section>

        {/* Right: the admin's canvas, or the student's own workspace / read-only worked solutions. */}
        <section
          aria-label={panelTitle}
          className={`flex min-h-0 flex-col border-t border-gray-200 split:border-l split:border-t-0 ${
            panelOpen ? 'shrink-0 basis-[60%] split:basis-auto' : 'shrink-0'
          }`}
        >
          <div className="flex h-10 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3">
            {!isAdmin && answeredWrong ? (
              <div className="flex shrink-0 rounded-lg border border-gray-200 p-0.5" role="radiogroup" aria-label="Show in this panel">
                {(
                  [
                    ['work', '✎ My working'],
                    ['solution', '✍️ Worked solution'],
                  ] as [StudentMode, string][]
                ).map(([mode, text]) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={studentMode === mode}
                    onClick={() => showStudentPanel(mode)}
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${studentMode === mode ? 'bg-gray-900 text-on-ink' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            ) : (
              <span
                className={`text-xs font-semibold ${isAdmin ? 'rounded-md bg-violet-50 px-2 py-0.5 text-violet-700' : 'text-gray-700'}`}
              >
                {isAdmin ? (adminMode === 'write' ? '✎ ' : '👁 ') : '✎ '}
                {panelTitle}
              </span>
            )}
            <span className="truncate text-xs text-gray-400">· Q{current.number}</span>
            <button
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              aria-expanded={panelOpen}
              className="ml-auto rounded-md px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 split:hidden"
            >
              {panelOpen ? 'Hide ▾' : 'Show ▴'}
            </button>
          </div>
          <div className={`relative min-h-0 flex-1 ${panelOpen ? '' : 'hidden'} split:block`}>
            {isAdmin && adminMode === 'write' ? (
              <HandwritingEditor key={current.id} problemId={current.id} label={questionLabel} />
            ) : isAdmin || studentShowsSolution ? (
              <HandwrittenSolution
                key={current.id}
                topicId={topicId}
                problemId={current.id}
                label={`Worked solution to ${questionLabel}`}
                questionLabel={questionLabel}
                onState={setSolutionState}
              />
            ) : (
              <StudentWorkspace key={current.id} topicId={topicId} problemId={current.id} label={questionLabel} />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
