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
      
      {/* Construction Notice */}
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 font-bold text-lg">
          The site is under construction, please contact me through email or whatsapp through the following, 
          Email: contact@ashphys.com / Whatsapp: +90 541 100 70 27
        </p>
      </div>
    </div>
  );
}


