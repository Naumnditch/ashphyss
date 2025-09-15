import Link from 'next/link';

export default function SuccessPage({ searchParams }: { searchParams: Record<string, string | string[]> }) {
  const booking = typeof searchParams.booking === 'string' ? searchParams.booking : undefined;
  const resource = typeof searchParams.resource === 'string' ? searchParams.resource : undefined;

  return (
    <div className="max-w-md mx-auto text-center space-y-4">
      <h1 className="text-2xl font-semibold">Payment Successful</h1>
      {booking && <p className="text-gray-700">Your tutoring session is confirmed. Booking ID: {booking}</p>}
      {resource && <p className="text-gray-700">Your resource purchase was successful.</p>}
      <Link href="/" className="btn btn-primary w-full">Go Home</Link>
    </div>
  );
}


