import Link from 'next/link';
import { query } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/auth/session';
import { UserRoleActions } from '@/components/admin/UserRoleActions';

export const dynamic = 'force-dynamic';

async function getUsers(search: string, role: string) {
  const conditions: string[] = [];
  const values: any[] = [];

  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    conditions.push(
      `(LOWER(first_name) LIKE $${values.length} OR LOWER(last_name) LIKE $${values.length} OR LOWER(email) LIKE $${values.length})`
    );
  }
  if (role && role !== 'all') {
    values.push(role);
    conditions.push(`role = $${values.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.status, u.created_at, s.name as section_name,
            (SELECT COUNT(*) FROM sessions ss
             WHERE ss.user_id = u.id AND ss.revoked_at IS NULL AND ss.created_at > now() - interval '90 days'
            )::int AS active_sessions
     FROM users u
     LEFT JOIN sections s ON s.id = u.section_id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT 100`,
    values
  );
  return result.rows;
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'student', label: 'Students' },
  { id: 'teacher', label: 'Teachers' },
  { id: 'admin', label: 'Admins' },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { search?: string; role?: string };
}) {
  const currentUser = await getCurrentUser();
  const search = searchParams.search || '';
  const role = searchParams.role || 'all';
  const users = await getUsers(search, role);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Users</h1>
      <p className="text-gray-500 text-sm mb-6">{users.length} shown · search across all roles</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form className="flex-1" method="get">
          {role !== 'all' && <input type="hidden" name="role" value={role} />}
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by name or email…"
            className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </form>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={`/admin/users?${new URLSearchParams({ ...(search ? { search } : {}), role: f.id }).toString()}`}
              className={`text-sm font-medium px-3 py-1.5 rounded-md whitespace-nowrap ${
                role === f.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {users.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400 text-sm">No users match that search.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((u) => (
              <div key={u.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 text-[15px] truncate">
                    {u.first_name} {u.last_name}
                    {currentUser?.id === u.id && <span className="text-gray-400 font-normal"> (you)</span>}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {u.email}
                    {u.section_name && <span> · {u.section_name}</span>}
                    <span className={u.active_sessions >= 2 ? 'text-amber-600 font-medium' : ''}>
                      {' '}· {u.active_sessions} device{u.active_sessions === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {currentUser?.id === u.id ? (
                    <span className="text-[11px] text-gray-300">can&rsquo;t edit yourself</span>
                  ) : (
                    <UserRoleActions userId={u.id} role={u.role} status={u.status} activeSessions={u.active_sessions} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
