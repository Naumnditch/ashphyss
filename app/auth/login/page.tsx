'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DeviceLimitInfo {
  message: string;
  devices: { id: string; label: string | null; lastSeenAt: string }[];
  preAuthToken: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deviceLimit, setDeviceLimit] = useState<DeviceLimitInfo | null>(null);
  const [signingOut, setSigningOut] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const attemptLogin = async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await response.json();

    if (response.status === 409 && data.error === 'device_limit') {
      setDeviceLimit({ message: data.message, devices: data.devices, preAuthToken: data.preAuthToken });
      setLoading(false);
      return;
    }

    if (!response.ok) {
      setError(data.error || 'Login failed');
      setLoading(false);
      return;
    }

    setDeviceLimit(null);
    const { role, status } = data.data;
    if (role === 'admin') {
      router.push('/admin/teacher-applications');
    } else if (role === 'teacher') {
      router.push(status === 'active' ? '/teacher/dashboard' : '/teacher/pending');
    } else {
      router.push('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDeviceLimit(null);

    try {
      await attemptLogin();
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const signOutDevice = async (sessionId: string) => {
    if (!deviceLimit) return;
    setSigningOut(sessionId);
    setError('');
    try {
      const res = await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, preAuthToken: deviceLimit.preAuthToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not sign out that device');
        return;
      }
      // A slot just freed up — retry the same login automatically.
      setLoading(true);
      await attemptLogin();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSigningOut(null);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Login</h1>
          <p className="text-gray-600 mt-2">Access your AshPhys learning platform</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {deviceLimit ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded">
              {deviceLimit.message}
            </div>
            <div className="border border-gray-200 rounded divide-y">
              {deviceLimit.devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.label || 'Unknown device'}</p>
                    <p className="text-xs text-gray-500">Last active {new Date(d.lastSeenAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => signOutDevice(d.id)}
                    disabled={signingOut !== null}
                    className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    {signingOut === d.id ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setDeviceLimit(null)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              ← Back
            </button>
          </div>
        ) : (
          <>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Password</label>
                  <Link href="/auth/forgot-password" className="text-xs text-blue-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600">
              Don&rsquo;t have an account?{' '}
              <Link href="/auth/signup" className="text-blue-600 hover:underline">
                Sign up here
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
