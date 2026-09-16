'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // proceed with client-side redirect regardless
    }
    router.push('/');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={
        className ||
        'text-sm font-medium text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50'
      }
    >
      {loading ? 'Logging out…' : 'Log Out'}
    </button>
  );
}
