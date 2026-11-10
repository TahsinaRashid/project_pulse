"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function BrandMark() {
  return (
    <span className="grid size-9 grid-cols-3 items-center gap-0.5 rounded-lg bg-[#214b3a] px-2" aria-hidden="true">
      <span className="h-2 rounded-sm bg-[#b9d7bd]" />
      <span className="h-4 rounded-sm bg-[#f3a879]" />
      <span className="h-3 rounded-sm bg-white" />
    </span>
  );
}

export default function ClientShell({ children, name }) {
  const router = useRouter();
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to log out. Please try again.");
      router.replace("/login");
    } catch (error) {
      setLogoutError(error.message || "Unable to log out. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f5ef] text-[#20342b]">
      <header className="sticky top-0 z-40 border-b border-[#e5e8df] bg-[#f7f7f2]/95 backdrop-blur">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/dashboard/client" className="flex shrink-0 items-center gap-2.5" aria-label="Project Pulse client dashboard">
            <BrandMark />
            <span className="text-base font-semibold">Project Pulse</span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6" aria-label="Client navigation">
            <Link href="/dashboard/client" className="text-sm font-medium text-[#42574a] transition hover:text-[#214b3a]">
              Overview
            </Link>
            <span className="hidden text-sm text-[#738076] sm:inline">{name || "Client"}</span>
            <button type="button" onClick={handleLogout} className="rounded-full bg-[#214b3a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#18392c]">
              Log out
            </button>
          </nav>
        </div>
      </header>
      {logoutError && <p role="alert" className="mx-auto mt-3 w-full max-w-7xl px-5 text-sm text-rose-700 sm:px-8">{logoutError}</p>}
      <div className="flex-1">{children}</div>
      <footer className="mt-12 bg-[#203a2d] px-5 py-8 text-[#e9eee8] sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 border-b border-white/15 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/dashboard/client" className="inline-flex items-center gap-2.5 font-semibold">
            <BrandMark />
            Project Pulse
          </Link>
          <p className="text-sm text-[#c2cec2]">A shared pulse on project health, progress, and the people behind the work.</p>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 pt-4 text-xs text-[#b7c5b7] sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Project Pulse. All rights reserved.</p>
          <p>Clearer projects, closer teams.</p>
        </div>
      </footer>
    </div>
  );
}
