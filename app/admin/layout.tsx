import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { AdminNav } from '@/components/admin/AdminNav';
import { LogoutButton } from '@/components/LogoutButton';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');
  if (user.role !== 'admin') redirect('/dashboard');

  return (
    <div>
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Admin Portal</span>
              <p className="text-sm text-gray-600">Signed in as {user.firstName} {user.lastName}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/account/devices" className="text-sm text-gray-500 hover:text-gray-900">My Devices</Link>
              <LogoutButton className="text-sm font-medium text-gray-500 hover:text-red-600 border border-gray-300 hover:border-red-300 rounded-lg px-3.5 py-2 transition-colors" />
            </div>
          </div>
          <AdminNav />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
