import Link from 'next/link';
import Image from 'next/image';
import { CurriculumDropdown } from './CurriculumDropdown';
import { NavDropdown } from './NavDropdown';
import { MobileMenu, type MobileMenuItem } from './MobileMenu';
import { SearchBar } from './SearchBar';
import { getCurrentUser } from '@/lib/auth/session';
import { MessagesNavLink } from './messages/MessagesNavLink';

function dashboardHref(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  if (user.role === 'admin') return '/admin/teacher-applications';
  if (user.role === 'teacher') return user.status === 'active' ? '/teacher/dashboard' : '/teacher/pending';
  return '/dashboard';
}

export async function Navbar() {
  const user = await getCurrentUser();

  // Below lg, the links hidden above all live in the MobileMenu sheet instead.
  const mobileItems: MobileMenuItem[] = [
    { href: '/curriculum', label: 'Curriculum' },
    { href: '/courses', label: 'Courses' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/past-papers', label: 'Past Papers' },
    { href: '/booklets', label: 'Booklets' },
    { href: '/resources', label: 'Resources' },
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact' },
    ...(!user ? [{ href: '/auth/login', label: 'Sign In' }] : []),
  ];

  return (
    <header className="border-b border-gray-200">
      <div className="container-max py-3 sm:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center min-w-0 mr-1 sm:mr-4 shrink-0">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/assets/logo.png"
              alt="AshPhys"
              width={730}
              height={185}
              priority
              className="w-[108px] xs:w-[130px] sm:w-[160px] md:w-[210px] xl:w-[270px] h-auto"
            />
          </Link>
        </div>
        {/*
          Breakpoints here are deliberately staggered, not the usual
          sm/md/lg triplet: cramming the full desktop cluster (curriculum +
          study materials + courses + more) in alongside the full search
          input and both auth links right at `lg` (1024px) overflowed the
          header. Desktop-only items now wait for `xl` (1280px); the
          hamburger (MobileMenu) covers everything below that instead.
        */}
        <nav className="flex items-center gap-1.5 sm:gap-5 min-w-0">
          <div className="hidden xl:block"><CurriculumDropdown /></div>

          <div className="hidden xl:block">
            <NavDropdown
              label="Study Materials"
              items={[
                { href: '/past-papers', label: 'Past Papers', hint: 'With video walkthroughs' },
                { href: '/booklets', label: 'Booklets', hint: 'Printable course notes' },
                { href: '/resources', label: 'Resources' },
              ]}
            />
          </div>

          <Link className="text-sm hover:underline hidden xl:inline-block whitespace-nowrap" href="/courses">Courses</Link>
          <Link className="text-sm hover:underline hidden md:inline-block font-semibold text-blue-600 whitespace-nowrap" href="/pricing">Pricing</Link>

          <div className="hidden xl:block">
            <NavDropdown
              label="More"
              items={[
                { href: '/', label: 'Home' },
                { href: '/about', label: 'About Us' },
                { href: '/contact', label: 'Contact' },
              ]}
            />
          </div>

          {/* Below xl: one hamburger opens every link above as a full-width sheet. */}
          <MobileMenu items={mobileItems} />

          <SearchBar />
          {user ? (
            <>
              <MessagesNavLink href={user.role === 'admin' ? '/admin/messages' : '/dashboard/messages'} />
              <Link className="btn btn-primary text-xs sm:text-sm px-2.5 sm:px-4 whitespace-nowrap" href={dashboardHref(user)}>
                {user.role === 'admin' ? 'Admin' : 'Dashboard'}
              </Link>
            </>
          ) : (
            <>
              <Link className="text-sm hover:underline text-blue-600 font-medium whitespace-nowrap hidden lg:inline-block" href="/auth/login">Sign In</Link>
              <Link className="btn btn-primary text-xs sm:text-sm px-2.5 sm:px-4 whitespace-nowrap" href="/auth/signup">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
