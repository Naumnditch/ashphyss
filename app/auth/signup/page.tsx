'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type AccountType = 'student' | 'teacher';

export default function SignUpPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    schoolName: '',
    applicationMessage: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, accountType }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      if (accountType === 'teacher') {
        router.push('/teacher/pending');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-2 text-[15px]">Join AshPhys to start teaching or learning physics</p>
        </div>

        {/* Segmented account-type toggle */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => setAccountType('student')}
            className={`py-2.5 rounded-md text-sm font-semibold transition-all ${
              accountType === 'student'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            I&rsquo;m a Student
          </button>
          <button
            type="button"
            onClick={() => setAccountType('teacher')}
            className={`py-2.5 rounded-md text-sm font-semibold transition-all ${
              accountType === 'teacher'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            I&rsquo;m a Teacher
          </button>
        </div>

        {accountType === 'teacher' && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-6 text-[13px] text-blue-900 leading-relaxed">
            Teacher accounts are reviewed before activation, usually within a day or two. You&rsquo;ll be
            able to log in and check your status any time.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-5">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">First name</label>
              <input
                type="text"
                name="firstName"
                placeholder="Ahmed"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Last name</label>
              <input
                type="text"
                name="lastName"
                placeholder="Hassan"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {accountType === 'teacher' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">
                  Where do you currently teach?
                </label>
                <input
                  type="text"
                  name="schoolName"
                  placeholder="e.g. Al-Jazari International School"
                  value={formData.schoolName}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">
                  Tell us a little about your classes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  name="applicationMessage"
                  placeholder="What do you teach, and how many students would you bring?"
                  value={formData.applicationMessage}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1.5">At least 8 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-lg font-semibold text-[15px] transition-colors disabled:opacity-50 mt-2"
          >
            {loading
              ? 'Creating account…'
              : accountType === 'teacher'
              ? 'Submit Application'
              : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-gray-900 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
