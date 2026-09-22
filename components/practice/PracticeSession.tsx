'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { SimulationIcon } from '@/components/icons/SimulationIcon';
import { MomentumDiagram } from '@/components/practice/MomentumDiagrams';
import { trackEvent } from '@/lib/analytics/client';
import { previewAnswer, FORMAT_HINT } from '@/lib/grading/numericAnswer';
import { nextQuestionIndex, type QuestionStatus } from '@/lib/practice/progress';
import { QuestionMap } from '@/components/practice/QuestionMap';

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
  options: Option[];
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

export function PracticeSession({ topicId }: { topicId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState<TopicInfo | null>(null);
  const [simulation, setSimulation] = useState<SimInfo | null>(null);
  const [queue, setQueue] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [mastery, setMastery] = useState<Mastery | null>(null);
  const [statuses, setStatuses] = useState<Record<string, QuestionStatus>>({});

  const [selected, setSelected] = useState<string>('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    correctAnswerLabel: string;
    explanation: string;
    feedback?: string | null;
  } | null>(null);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/practice/${topicId}`);
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
      const skipped = readSkipped(topicId);
      const initial: Record<string, QuestionStatus> = {};
      for (const q of questions) {
        initial[q.id] = q.lastResult ?? (skipped.has(q.id) ? 'skipped' : 'untried');
      }
      setQueue(questions);
      setStatuses(initial);
      // Start where "next" would: the first untried question, then skipped, then wrong.
      setIndex(nextQuestionIndex(questions.map((q) => initial[q.id]), questions.length - 1));
      setLoading(false);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    trackEvent({ eventType: 'practice_start', entityType: 'topic', entityId: topicId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const current = queue[index];

  // When the current question first appeared, so the attempt log can record
  // how long it took. Reset whenever the question changes.
  const questionShownAt = useRef<number>(Date.now());
  useEffect(() => {
    questionShownAt.current = Date.now();
  }, [current?.id]);

  // Live mirror of how the grader will read a free-entry answer. Purely
  // informational — it never blocks or rewrites what the student typed.
  const answerPreview =
    current?.answerType === 'numeric' && !result ? previewAnswer(selected) : null;

  const handleCheck = async () => {
    if (!current || !selected.trim()) return;
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
      setResult({
        isCorrect: data.data.isCorrect,
        correctAnswerLabel: data.data.correctAnswerLabel,
        explanation: data.data.explanation,
        feedback: data.data.feedback,
      });
      setMastery(data.data.mastery);
      setStatuses((prev) => {
        const updated: Record<string, QuestionStatus> = { ...prev, [current.id]: data.data.isCorrect ? 'correct' : 'wrong' };
        writeSkipped(topicId, updated);
        return updated;
      });
      setChecking(false);
    } catch {
      setChecking(false);
    }
  };

  const statusList = queue.map((q) => statuses[q.id] ?? 'untried');

  const goTo = (i: number) => {
    setSelected('');
    setResult(null);
    setIndex(i);
  };

  const handleNext = () => goTo(nextQuestionIndex(statusList, index));

  const handleSkip = () => {
    if (!current) return;
    const updated = { ...statuses };
    // Skipping a question already answered just moves on; it keeps its result.
    if (updated[current.id] === 'untried') updated[current.id] = 'skipped';
    setStatuses(updated);
    writeSkipped(topicId, updated);
    goTo(nextQuestionIndex(queue.map((q) => updated[q.id] ?? 'untried'), index));
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-400 text-sm">Loading questions…</div>;
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-8 text-center">
        <p className="text-amber-900 text-sm">{error}</p>
      </div>
    );
  }

  if (!topic || !mastery) return null;

  const streakNeeded = mastery.streakNeeded || 5;

  if (mastery.mastered) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 rounded-full bg-green-50 mx-auto mb-6 flex items-center justify-center text-3xl">
          🏆
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Topic Mastered!</h2>
        <p className="text-gray-500 mb-1">
          {mastery.correctStreak} correct in a row · {mastery.totalCorrect}/{mastery.totalAttempted} overall
        </p>
        <p className="text-gray-400 text-sm mb-8">You&rsquo;ve got this one down.</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/curriculum/${topic.chapterId}`}
            className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg font-semibold text-sm"
          >
            Back to Chapter
          </Link>
          <button
            onClick={() => {
              setMastery({ ...mastery, mastered: false, correctStreak: 0 });
              goTo(nextQuestionIndex(statusList, queue.length - 1));
            }}
            className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg font-semibold text-sm"
          >
            Keep Practicing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Progress header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: streakNeeded }).map((_, i) => (
            <div
              key={i}
              className={`w-6 h-2 rounded-full ${
                i < mastery.correctStreak ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400">
          {mastery.correctStreak}/{streakNeeded} to master &middot; {mastery.totalCorrect}/
          {mastery.totalAttempted} overall
        </span>
      </div>

      <QuestionMap numbers={queue.map((q) => q.number)} statuses={statusList} current={index} onSelect={goTo} />

      {/* Question card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className="text-sm font-semibold text-gray-900">
            Question {current.number} <span className="font-normal text-gray-400">of {queue.length}</span>
          </span>
          {!result && statuses[current.id] === 'correct' && (
            <span className="text-xs font-medium text-green-700">✓ You got this right before — answer again to practise</span>
          )}
          {!result && statuses[current.id] === 'wrong' && (
            <span className="text-xs font-medium text-red-700">✕ Wrong last time — have another go</span>
          )}
          {!result && statuses[current.id] === 'skipped' && (
            <span className="text-xs font-medium text-gray-500">– You skipped this one</span>
          )}
        </div>
        {current.imageUrl && current.imageUrl.startsWith('diagram:') && (
          <MomentumDiagram diagramKey={current.imageUrl} />
        )}
        {current.imageUrl && !current.imageUrl.startsWith('diagram:') && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.imageUrl} alt="" className="w-full max-w-md mx-auto mb-5 rounded border border-gray-200" />
        )}
        <p className="text-[17px] text-gray-900 leading-relaxed mb-6">{current.questionText}</p>

        {current.answerType === 'multiple_choice' && (
          <div className="space-y-2.5">
            {current.options.map((opt) => {
              const isSelected = selected === opt.id;
              const showCorrect = result && opt.text === result.correctAnswerLabel;
              const showWrong = result && isSelected && !result.isCorrect;
              return (
                <button
                  key={opt.id}
                  disabled={!!result}
                  onClick={() => setSelected(opt.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-[15px] transition-colors ${
                    showCorrect
                      ? 'border-green-400 bg-green-50 text-green-900'
                      : showWrong
                      ? 'border-red-400 bg-red-50 text-red-900'
                      : isSelected
                      ? 'border-blue-400 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  } ${result ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="font-semibold mr-2">{opt.letter}.</span>
                  {opt.text}
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
              placeholder="Your answer"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
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
            placeholder="Your answer"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
          />
        )}
      </div>

      {/* Feedback */}
      {result && (
        <div
          className={`rounded-xl p-5 mb-5 border ${
            result.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <p className={`font-semibold mb-1.5 ${result.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
            {result.isCorrect ? '✓ Correct!' : `✕ Not quite — the answer was ${result.correctAnswerLabel}`}
          </p>
          {result.feedback && !result.isCorrect && (
            <p className="text-sm text-red-900 leading-relaxed mb-2">{result.feedback}</p>
          )}
          {result.explanation && (
            <p className="text-sm text-gray-700 leading-relaxed">{result.explanation}</p>
          )}

          {!result.isCorrect && (
            <div className="mt-4 pt-4 border-t border-red-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Want to revise this first?
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/curriculum/${topic.chapterId}#topic-${topic.id}`}
                  className="text-xs font-semibold bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-50"
                >
                  📖 Review the lesson
                </Link>
                {simulation && (
                  <Link
                    href={simulation.url_path}
                    className="text-xs font-semibold bg-white border border-blue-300 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-50 flex items-center gap-1"
                  >
                    <SimulationIcon className="w-3.5 h-3.5" /> Try the simulation
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action button */}
      {!result ? (
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            disabled={checking}
            className="shrink-0 border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-lg font-semibold text-[15px] disabled:opacity-40"
          >
            Skip for now
          </button>
          <button
            onClick={handleCheck}
            disabled={!selected.trim() || checking}
            className="flex-1 bg-gray-900 hover:bg-black text-white py-3 rounded-lg font-semibold text-[15px] disabled:opacity-40"
          >
            {checking ? 'Checking…' : 'Check Answer'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleNext}
          className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-lg font-semibold text-[15px]"
        >
          Next Question →
        </button>
      )}
    </div>
  );
}
