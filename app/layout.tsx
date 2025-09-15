import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AshPhys — Physics Tutoring',
  description: 'Unlock your child\'s potential in Physics with personalized lessons.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main className="container-max py-8 min-h-[70vh]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}


