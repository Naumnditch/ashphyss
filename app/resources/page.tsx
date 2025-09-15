import Link from 'next/link';

const dummyResources = [
  { id: 'r1', title: 'Kinematics Problem Set', price: 9.99 },
  { id: 'r2', title: 'Electricity & Magnetism Notes', price: 12.99 },
  { id: 'r3', title: 'Exam Prep Checklist', price: 4.99 },
];

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Resources</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dummyResources.map((res) => (
          <div key={res.id} className="card p-4 flex flex-col gap-2">
            <h3 className="font-medium">{res.title}</h3>
            <p className="text-gray-600">${res.price.toFixed(2)}</p>
            <form action={`/api/checkout/resources`} method="POST">
              <input type="hidden" name="resourceId" value={res.id} />
              <button className="btn btn-primary w-full" type="submit">Buy</button>
            </form>
          </div>
        ))}
      </div>
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-2">Private Tutoring</h2>
        <p className="text-gray-600 mb-3">One-on-one sessions tailored to your goals.</p>
        <Link href="/book" className="btn btn-primary w-fit">Book a Tutoring Session</Link>
      </div>
    </div>
  );
}


