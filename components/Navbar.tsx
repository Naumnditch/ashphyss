import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
  return (
    <header className="border-b border-gray-200">
      <div className="container-max py-4 flex items-center justify-between">
        <div className="flex items-center flex-1 mr-4">
          <div className="bg-black w-16 relative" style={{ height: '2.7px' }}>
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black" style={{ width: '2.7px', height: '10px' }}></div>
          </div>
          <Link href="/" className="text-xl font-semibold mx-1">
            <Image src="/assets/logo.png" alt="AshPhys" width={140} height={100} />
          </Link>
          <div className="bg-black flex-1 relative" style={{ height: '2.7px' }}>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black" style={{ width: '2.7px', height: '10px' }}></div>
          </div>
        </div>
        <nav className="flex items-center gap-4">
          <Link className="text-sm hover:underline" href="/">Home</Link>
          <Link className="text-sm hover:underline" href="/about">About Us</Link>
          <Link className="text-sm hover:underline" href="/resources">Resources</Link>
          <Link className="text-sm hover:underline" href="/contact">Contact</Link>
          <Link className="btn btn-primary text-sm" href="/book">Book Now</Link>
        </nav>
      </div>
    </header>
  );
}


