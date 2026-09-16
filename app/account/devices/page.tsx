import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/session';
import { listActiveSessions } from '@/lib/auth/sessions';
import { DEVICE_ID_COOKIE } from '@/lib/auth/device';
import { DevicesList } from '@/components/account/DevicesList';

export const dynamic = 'force-dynamic';

export default async function DevicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const sessions = await listActiveSessions(user.id);
  const currentDeviceId = cookies().get(DEVICE_ID_COOKIE)?.value ?? null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">My Devices</h1>
      <p className="text-gray-500 text-sm mb-6">
        You can be signed in on up to 2 devices at once. Sign out of a device you no longer use to free up a slot.
      </p>
      <DevicesList
        sessions={sessions.map((s) => ({
          id: s.id,
          deviceId: s.deviceId,
          deviceLabel: s.deviceLabel,
          lastSeenAt: s.lastSeenAt,
          createdAt: s.createdAt,
        }))}
        currentDeviceId={currentDeviceId}
      />
    </div>
  );
}
