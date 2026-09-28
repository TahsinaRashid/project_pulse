"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const roleDestinations = {
  ADMIN: '/dashboard/admin',
  EMPLOYEE: '/dashboard/employee',
  CLIENT: '/dashboard/client',
};

const roleOptions = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'CLIENT', label: 'Client' },
];

function BrandMark() {
  return (
    <span className="grid size-9 grid-cols-3 items-center gap-0.5 rounded-lg bg-[#214b3a] px-2" aria-hidden="true">
      <span className="h-2 rounded-sm bg-[#b9d7bd]" />
      <span className="h-4 rounded-sm bg-[#f3a879]" />
      <span className="h-3 rounded-sm bg-white" />
    </span>
  );
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    ['Home', '/#top'],
    ['Features', '/#features'],
    ['About', '/#about'],
    ['Contact', '/#contact'],
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#e5e8df] bg-[#f7f7f2]/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Project Pulse home">
          <BrandMark />
          <span className="text-base font-semibold text-[#20342b]">Project Pulse</span>
        </Link>
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
          {links.map(([label, href]) => <Link key={label} className="text-sm text-[#5b685e] transition hover:text-[#214b3a]" href={href}>{label}</Link>)}
        </nav>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg border border-[#dce2d8] text-[#214b3a] transition hover:bg-[#e9ede5] lg:hidden"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="flex w-4 flex-col gap-1" aria-hidden="true">
            <span className={`h-0.5 w-full bg-current transition ${menuOpen ? 'translate-y-[3px] rotate-45' : ''}`} />
            <span className={`h-0.5 w-full bg-current transition ${menuOpen ? '-translate-y-[3px] -rotate-45' : ''}`} />
          </span>
        </button>
      </div>
      {menuOpen && (
        <nav className="border-t border-[#e5e8df] bg-[#f7f7f2] px-5 py-4 lg:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map(([label, href]) => <Link key={label} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-[#42574a] hover:bg-[#e9ede5]" href={href}>{label}</Link>)}
          </div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer id="contact" className="bg-[#203a2d] px-5 py-12 text-[#e9eee8] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 border-b border-white/15 pb-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
          <div className="max-w-sm">
            <Link href="/#top" className="inline-flex items-center gap-2.5">
              <BrandMark />
              <span className="font-semibold">Project Pulse</span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-[#c2cec2]">A shared pulse on project health, progress, and the people behind the work.</p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase text-[#a9c7aa]">Explore</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#d3ddd2]">
              <Link className="transition hover:text-white" href="/#features">Features</Link>
              <Link className="transition hover:text-white" href="/#how-it-works">How it works</Link>
              <Link className="transition hover:text-white" href="/#about">Who it is for</Link>
            </div>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase text-[#a9c7aa]">Workspace</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#d3ddd2]">
              <Link className="transition hover:text-white" href="/#contact">Request access</Link>
              <a className="transition hover:text-white" href="mailto:hello@projectpulse.app">Contact</a>
            </div>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase text-[#a9c7aa]">Follow along</h2>
            <div className="mt-4 flex gap-2">
              {[['in', 'LinkedIn'], ['x', 'X'], ['gh', 'GitHub']].map(([label, name]) => (
                <Link key={name} href="/#contact" aria-label={name} className="grid size-9 place-items-center rounded-full border border-white/25 text-xs font-semibold text-white transition hover:bg-white/10">{label}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-5 text-xs text-[#b7c5b7] sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Project Pulse. All rights reserved.</p>
          <p>Clearer projects, closer teams.</p>
        </div>
      </div>
    </footer>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('registered') === '1'
      ? 'Account created successfully. Please log in.'
      : '';
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => {
        const destination = roleDestinations[String(data?.user?.role || '').toUpperCase()];
        if (!cancelled && destination) router.replace(destination);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!role) {
      setError('Role is required.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Unable to sign in. Please try again.');
        return;
      }
      const destination = roleDestinations[String(data.user?.role || '').toUpperCase()];
      if (!destination) {
        setError('Your account does not have a recognized role. Contact your administrator.');
        return;
      }
      router.replace(destination);
    } catch {
      setError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f2] font-sans text-[#20342b]">
      <Navbar />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-16 sm:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(54, 78, 57, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(54, 78, 57, 0.045) 1px, transparent 1px)', backgroundSize: '44px 44px' }} aria-hidden="true" />
        <section className="relative w-full max-w-md border-t-2 border-[#e99569] bg-white p-7 shadow-[0_28px_80px_-48px_rgba(28,47,37,0.45)] sm:p-9" aria-labelledby="login-heading">
          <p className="text-xs font-bold uppercase text-[#638069]">Welcome back</p>
          <h1 id="login-heading" className="mt-3 text-3xl font-semibold leading-tight text-[#20342b]">Log in to Project Pulse</h1>
          <p className="mt-2 text-sm leading-6 text-[#637066]">Access your project monitoring workspace.</p>

          {success && (
            <div className="mt-5 rounded-lg border border-[#bfd9bf] bg-[#edf9ee] px-3.5 py-3 text-sm font-medium text-[#254a2e]">{success}</div>
          )}

          <form onSubmit={submit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#34483a]">Email</label>
              <input
                id="email"
                type="email"
                required
                className="min-h-12 w-full rounded-lg border border-[#d6ded3] bg-[#fbfcf9] px-3.5 text-sm text-[#20342b] outline-none transition placeholder:text-[#98a097] focus:border-[#56805d] focus:bg-white focus:ring-2 focus:ring-[#a9c9ac]/40"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="you@example.com"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#34483a]">Password</label>
              <input
                id="password"
                type="password"
                required
                className="min-h-12 w-full rounded-lg border border-[#d6ded3] bg-[#fbfcf9] px-3.5 text-sm text-[#20342b] outline-none transition placeholder:text-[#98a097] focus:border-[#56805d] focus:bg-white focus:ring-2 focus:ring-[#a9c9ac]/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            <div>
              <label htmlFor="role" className="mb-2 block text-sm font-semibold text-[#34483a]">Role</label>
              <select
                id="role"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="min-h-12 w-full rounded-lg border border-[#d6ded3] bg-[#fbfcf9] px-3.5 text-sm text-[#20342b] outline-none transition focus:border-[#56805d] focus:bg-white focus:ring-2 focus:ring-[#a9c9ac]/40"
              >
                <option value="">Select your role</option>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {error && <p id="login-error" role="alert" className="rounded-lg border border-[#e8b9a2] bg-[#fff5ef] px-3.5 py-3 text-sm font-medium text-[#8b3f2c]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#214b3a] px-4 text-sm font-semibold text-white transition hover:bg-[#173c2c] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {loading && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>
          <p className="mt-5 border-t border-[#e8ebe5] pt-4 text-xs leading-5 text-[#778178]">
            Don&apos;t have an account? <Link href="/signup" className="font-semibold text-[#335543] transition hover:text-[#214b3a]">Sign up</Link>
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
