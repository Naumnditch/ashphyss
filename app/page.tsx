import Link from 'next/link';
import { PhysicsPathsSelector } from '@/components/PhysicsPathsSelector';

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-semibold">Physics Taught by an Engineer</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Invest in understanding, not just answers.
        </p>
      </section>
      
      <PhysicsPathsSelector />
    </div>
  );
}


