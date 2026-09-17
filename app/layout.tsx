import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import { SoftPaywallModal } from '@/components/paywall/SoftPaywallModal';
import { getCurrentUser } from '@/lib/auth/session';
import { getUserTier, TIER_PLUS } from '@/lib/subscriptions/getUserTier';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AshPhys — Physics Tutoring',
  description: 'Unlock your child\'s potential in Physics with personalized lessons.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const tier = user ? await getUserTier(user.id) : 0;
  const paywallEligible = tier < TIER_PLUS;

  return (
    <html lang="en">
      <body className={inter.className}>
        <PageViewTracker />
        <Navbar />
        <main className="container-max py-8 min-h-[70vh]">{children}</main>
        <Footer />
        <SoftPaywallModal eligible={paywallEligible} />
      </body>
    </html>
  );
}


