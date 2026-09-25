'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  // Route protection lives server-side now (middleware.ts checks the
  // httpOnly token cookie before this page ever renders), so there's no
  // client-side gate to duplicate here.
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // proceed with client-side redirect regardless
    }
    router.push('/');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Student Dashboard</h1>
        <div className="flex items-center gap-4">
          <Link href="/account/devices" className="text-sm text-gray-600 hover:underline">
            My Devices
          </Link>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-2">Chapters Completed</h2>
          <p className="text-3xl font-bold text-blue-600">0 / 25</p>
          <p className="text-gray-600 mt-2">Start learning physics today!</p>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-2">Average Quiz Score</h2>
          <p className="text-3xl font-bold text-green-600">--</p>
          <p className="text-gray-600 mt-2">No quizzes attempted yet</p>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-2">Total Hours</h2>
          <p className="text-3xl font-bold text-purple-600">0h</p>
          <p className="text-gray-600 mt-2">Time spent learning</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">✉️ Messages</h2>
            <p className="text-gray-600 text-sm">
              Read messages from the AshPhys team and ask us anything.
            </p>
          </div>
          <Link
            href="/dashboard/messages"
            className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded font-medium mt-4 text-center"
          >
            Open Messages
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">📖 Browse the Curriculum</h2>
            <p className="text-gray-600 text-sm">
              See all 25 chapters and pick what you want to study.
            </p>
          </div>
          <Link
            href="/curriculum"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded font-medium mt-4 text-center"
          >
            View Curriculum
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">🏫 Join a Class</h2>
            <p className="text-gray-600 text-sm">
              Have a join code from your teacher? Enter it to join their class.
            </p>
          </div>
          <Link
            href="/dashboard/join-class"
            className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded font-medium mt-4 text-center"
          >
            Enter Join Code
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">🎥 Video Solve Requests</h2>
            <p className="text-gray-600 text-sm">
              Stuck on a problem? Plus and Pro members can request a personal video walkthrough.
            </p>
          </div>
          <Link
            href="/video-requests"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded font-medium mt-4 text-center"
          >
            Request a Video
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">🧑‍🏫 1-on-1 Tutoring</h2>
            <p className="text-gray-600 text-sm">
              Book a private tutoring session with a physics teacher — discounted for Pro members.
            </p>
          </div>
          <Link
            href="/tutoring"
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded font-medium mt-4 text-center"
          >
            Book a Session
          </Link>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h2 className="text-2xl font-semibold mb-4">📚 Course Coming Soon</h2>
        <p className="text-gray-700 mb-4">
          The AshPhys platform is currently being built! Your teacher is adding:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
          <li>Interactive video lessons</li>
          <li>Auto-graded practice problems</li>
          <li>Interactive simulations</li>
          <li>Progress tracking</li>
          <li>Peer discussion forums</li>
        </ul>
        <p className="text-sm text-gray-600">
          Expected launch: <strong>August 24, 2026</strong>
        </p>
      </div>

      <div className="mt-8">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
