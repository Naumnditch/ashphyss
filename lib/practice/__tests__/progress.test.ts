import { describe, it, expect } from 'vitest';
import { nextQuestionIndex, summarize, type QuestionStatus } from '../progress';

describe('nextQuestionIndex', () => {
  it('moves on to the next question nobody has tried', () => {
    expect(nextQuestionIndex(['correct', 'untried', 'untried'], 0)).toBe(1);
  });

  it('jumps over answered and skipped questions to reach an untried one', () => {
    expect(nextQuestionIndex(['untried', 'correct', 'skipped', 'wrong', 'untried'], 0)).toBe(4);
  });

  it('wraps round to an untried question earlier in the set', () => {
    expect(nextQuestionIndex(['untried', 'correct', 'correct'], 2)).toBe(0);
  });

  it('brings skipped questions back once every question has been seen', () => {
    expect(nextQuestionIndex(['correct', 'skipped', 'wrong', 'correct'], 3)).toBe(1);
  });

  it('offers the wrong ones again after the skipped ones are done', () => {
    expect(nextQuestionIndex(['correct', 'wrong', 'correct'], 0)).toBe(1);
  });

  it('does not offer the question you are already on', () => {
    expect(nextQuestionIndex(['skipped', 'correct'], 0)).toBe(1);
  });

  it('just steps forward when every question is correct', () => {
    expect(nextQuestionIndex(['correct', 'correct', 'correct'], 2)).toBe(0);
  });
});

describe('summarize', () => {
  it('counts each status', () => {
    const statuses: QuestionStatus[] = ['correct', 'correct', 'wrong', 'skipped', 'untried'];
    expect(summarize(statuses)).toEqual({ total: 5, correct: 2, wrong: 1, skipped: 1, untried: 1 });
  });
});
