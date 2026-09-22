import { describe, it, expect } from 'vitest';
import { rosterScope, canViewStudent, type Viewer } from '../access';

const admin: Viewer = { id: 'admin-1', role: 'admin' };
const teacherA: Viewer = { id: 'teacher-a', role: 'teacher' };
const teacherB: Viewer = { id: 'teacher-b', role: 'teacher' };
const student: Viewer = { id: 'student-1', role: 'student' };

/** Stands in for the database: answers the ownership check from a fixture. */
function fakeDb(enrolment: Record<string, string>) {
  return async (_text: string, params?: unknown[]) => {
    const [studentId, teacherId] = params as [string, string];
    return { rows: enrolment[studentId] === teacherId ? [{ ok: 1 }] : [] };
  };
}

describe('rosterScope', () => {
  it('lets an admin see everyone', () => {
    const scope = rosterScope(admin, 'a.student_id');
    expect(scope.unrestricted).toBe(true);
    expect(scope.clause).toBe('TRUE');
    expect(scope.params).toEqual([]);
  });

  it('restricts a teacher to students in their own sections', () => {
    const scope = rosterScope(teacherA, 'a.student_id');
    expect(scope.unrestricted).toBe(false);
    expect(scope.params).toEqual(['teacher-a']);
    expect(scope.clause).toMatch(/sections/);
    expect(scope.clause).toMatch(/s\.teacher_id = \$1/);
    // The predicate must key off the section's owner, not off the student
    // or the section alone — that is what stops one teacher reading another
    // teacher's roster.
    expect(scope.clause).toMatch(/u\.section_id/);
  });

  it('never embeds a teacher id other than the viewer’s own', () => {
    const scope = rosterScope(teacherA, 'a.student_id');
    expect(scope.params).not.toContain('teacher-b');
    expect(scope.clause).not.toContain('teacher-b');
  });

  it('restricts a student to their own rows', () => {
    const scope = rosterScope(student, 'a.student_id');
    expect(scope.clause).toBe('a.student_id = $1');
    expect(scope.params).toEqual(['student-1']);
  });

  it('shows nothing to a logged-out or unknown-role viewer', () => {
    expect(rosterScope(null, 'a.student_id').clause).toBe('FALSE');
    expect(rosterScope({ id: 'x', role: 'parent' }, 'a.student_id').clause).toBe('FALSE');
  });

  it('offsets placeholders so it can be appended to an existing query', () => {
    const scope = rosterScope(teacherA, 'a.student_id', 2);
    expect(scope.clause).toMatch(/\$3/);
    expect(scope.clause).not.toMatch(/\$1\b/);
  });
});

describe('canViewStudent — a teacher must not reach another teacher’s roster', () => {
  // ada is in teacher A's class, bram is in teacher B's class.
  const db = fakeDb({ ada: 'teacher-a', bram: 'teacher-b' });

  it('lets a teacher open their own student', async () => {
    expect(await canViewStudent(teacherA, 'ada', db)).toBe(true);
    expect(await canViewStudent(teacherB, 'bram', db)).toBe(true);
  });

  it('refuses a teacher the other teacher’s student', async () => {
    expect(await canViewStudent(teacherA, 'bram', db)).toBe(false);
    expect(await canViewStudent(teacherB, 'ada', db)).toBe(false);
  });

  it('refuses a student who is in no class at all', async () => {
    expect(await canViewStudent(teacherA, 'unenrolled', db)).toBe(false);
  });

  it('lets a student see only themselves', async () => {
    expect(await canViewStudent({ id: 'ada', role: 'student' }, 'ada', db)).toBe(true);
    expect(await canViewStudent({ id: 'ada', role: 'student' }, 'bram', db)).toBe(false);
  });

  it('lets an admin see anyone, and a logged-out viewer no one', async () => {
    expect(await canViewStudent(admin, 'bram', db)).toBe(true);
    expect(await canViewStudent(null, 'ada', db)).toBe(false);
  });
});
