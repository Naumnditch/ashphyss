import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { LogoutButton } from '@/components/LogoutButton';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');
  if (user.role !== 'teacher') redirect('/dashboard');

  return (
    <div>
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/teacher/dashboard" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
            Teacher Portal
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/teacher/analytics" className="text-sm text-gray-500 hover:text-gray-900">Analytics</Link>
            <span className="text-sm text-gray-500">{user.firstName} {user.lastName}</span>
            <Link href="/account/devices" className="text-sm text-gray-500 hover:text-gray-900">My Devices</Link>
            <LogoutButton className="text-sm font-medium text-gray-500 hover:text-red-600 border border-gray-300 hover:border-red-300 rounded-lg px-3.5 py-1.5 transition-colors" />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
