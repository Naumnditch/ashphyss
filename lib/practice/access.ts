/**
 * Who may read whose practice data.
 *
 * Note on RLS: the spec asked for Postgres row-level policies. This app does
 * not use Supabase Auth or PostgREST — every query goes through a single
 * server-side `pg` connection that owns the tables, and identity comes from
 * our own JWT — so a policy written against auth.uid() would match nothing
 * and protect nothing. What the database already does is deny-by-default:
 * RLS is ON for practice_attempts and practice_sessions with no policies at
 * all, so the anon and authenticated API roles can read nothing through the
 * Supabase API.
 *
 * That makes this module the real access control. Every read of practice data
 * goes through `rosterScope`, which narrows the query to what the viewer is
 * allowed to see, and there is no code path that reads attempts without it.
 * Writes are separate: attempts are only ever inserted by the submit route,
 * never from the client, so a student cannot forge a correct attempt.
 */

export type ViewerRole = 'student' | 'teacher' | 'admin' | string;

export interface Viewer {
  id: string;
  role: ViewerRole;
}

export interface RosterScope {
  /**
   * A SQL predicate over a student id, with $1.. placeholders offset by
   * `paramOffset`. `false` means "this viewer may see nobody".
   */
  clause: string;
  params: unknown[];
  /** True when the viewer can see every student (admins only). */
  unrestricted: boolean;
}

/**
 * Builds the predicate that restricts a practice query to the students this
 * viewer is entitled to see.
 *
 *   admin    -> every student
 *   teacher  -> only students whose section belongs to that teacher
 *   student  -> only themselves
 *   anyone else -> nobody
 *
 * @param column      the student-id column to constrain, e.g. 'a.student_id'
 * @param paramOffset how many $n placeholders the caller has already used
 */
export function rosterScope(viewer: Viewer | null, column: string, paramOffset = 0): RosterScope {
  if (!viewer) {
    return { clause: 'FALSE', params: [], unrestricted: false };
  }

  if (viewer.role === 'admin') {
    return { clause: 'TRUE', params: [], unrestricted: true };
  }

  if (viewer.role === 'teacher') {
    return {
      clause: `${column} IN (
        SELECT u.id FROM users u
        JOIN sections s ON s.id = u.section_id
        WHERE s.teacher_id = $${paramOffset + 1}
      )`,
      params: [viewer.id],
      unrestricted: false,
    };
  }

  if (viewer.role === 'student') {
    return { clause: `${column} = $${paramOffset + 1}`, params: [viewer.id], unrestricted: false };
  }

  return { clause: 'FALSE', params: [], unrestricted: false };
}

/**
 * True when this viewer may open the drill-down for one particular student.
 * Teachers are checked against their own sections, so one teacher can never
 * read another teacher's roster.
 */
export async function canViewStudent(
  viewer: Viewer | null,
  studentId: string,
  runQuery: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>
): Promise<boolean> {
  if (!viewer) return false;
  if (viewer.role === 'admin') return true;
  if (viewer.role === 'student') return viewer.id === studentId;
  if (viewer.role !== 'teacher') return false;

  const result = await runQuery(
    `SELECT 1 FROM users u
     JOIN sections s ON s.id = u.section_id
     WHERE u.id = $1 AND s.teacher_id = $2
     LIMIT 1`,
    [studentId, viewer.id]
  );
  return result.rows.length > 0;
}
