import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getPendingCounts } from '@/lib/admin/overview';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');
  if (user.role !== 'admin') redirect('/dashboard');

  const pending = await getPendingCounts();

  return (
    <div className="lg:flex lg:items-start lg:gap-8">
      <AdminSidebar name={`${user.firstName} ${user.lastName}`} pending={pending} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
