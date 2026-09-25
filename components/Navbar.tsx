import Link from 'next/link';
import Image from 'next/image';
import { query } from '@/lib/db/client';
import { CurriculumDropdown } from './CurriculumDropdown';
import { NavDropdown } from './NavDropdown';
import { SearchBar } from './SearchBar';
import { getCurrentUser } from '@/lib/auth/session';
import { MessagesNavLink } from './messages/MessagesNavLink';

async function getChapters() {
  try {
    const result = await query(
      `SELECT id, chapter_number, title FROM chapters WHERE status = 'published' ORDER BY chapter_number ASC`
    );
    return result.rows;
  } catch (err) {
    console.error('Navbar: failed to load chapters', err);
    return [];
  }
}

function dashboardHref(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  if (user.role === 'admin') return '/admin/teacher-applications';
  if (user.role === 'teacher') return user.status === 'active' ? '/teacher/dashboard' : '/teacher/pending';
  return '/dashboard';
}

export async function Navbar() {
  const [chapters, user] = await Promise.all([getChapters(), getCurrentUser()]);

  return (
    <header className="border-b border-gray-200">
      <div className="container-max py-4 flex items-center justify-between">
        <div className="flex items-center mr-4">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/assets/logo.png"
              alt="AshPhys"
              width={730}
              height={185}
              priority
              className="w-[210px] sm:w-[270px] h-auto"
            />
          </Link>
        </div>
        <nav className="flex items-center gap-2 sm:gap-5">
          <div className="hidden lg:block"><CurriculumDropdown chapters={chapters} /></div>

          <div className="hidden lg:block">
            <NavDropdown
              label="Study Materials"
              items={[
                { href: '/past-papers', label: 'Past Papers', hint: 'With video walkthroughs' },
                { href: '/booklets', label: 'Booklets', hint: 'Printable course notes' },
                { href: '/resources', label: 'Resources' },
              ]}
            />
          </div>

          <Link className="text-sm hover:underline hidden lg:inline-block whitespace-nowrap" href="/courses">Courses</Link>
          <Link className="text-sm hover:underline hidden md:inline-block font-semibold text-blue-600 whitespace-nowrap" href="/pricing">Pricing</Link>

          <div className="hidden lg:block">
            <NavDropdown
              label="More"
              items={[
                { href: '/', label: 'Home' },
                { href: '/about', label: 'About Us' },
                { href: '/contact', label: 'Contact' },
              ]}
            />
          </div>

          {/* below lg the links above are hidden, so everything lives here */}
          <div className="lg:hidden">
            <NavDropdown
              label="Menu"
              items={[
                { href: '/curriculum', label: 'Curriculum' },
                { href: '/courses', label: 'Courses' },
                { href: '/pricing', label: 'Pricing' },
                { href: '/past-papers', label: 'Past Papers' },
                { href: '/booklets', label: 'Booklets' },
                { href: '/resources', label: 'Resources' },
                { href: '/about', label: 'About Us' },
                { href: '/contact', label: 'Contact' },
              ]}
            />
          </div>

          <SearchBar />
          {user ? (
            <>
              <MessagesNavLink href={user.role === 'admin' ? '/admin/messages' : '/dashboard/messages'} />
              <Link className="btn btn-primary text-sm whitespace-nowrap" href={dashboardHref(user)}>
                {user.role === 'admin' ? 'Admin' : 'Dashboard'}
              </Link>
            </>
          ) : (
            <>
              <Link className="text-sm hover:underline text-blue-600 font-medium whitespace-nowrap" href="/auth/login">Sign In</Link>
              <Link className="btn btn-primary text-sm whitespace-nowrap" href="/auth/signup">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
