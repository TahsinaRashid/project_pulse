"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const roleDestinations = {
	ADMIN: "/dashboard/admin",
	EMPLOYEE: "/dashboard/employee",
	CLIENT: "/dashboard/client",
};

const features = [
	{
		number: "01",
		title: "See the whole portfolio",
		description: "Track project health, milestones, and delivery signals from one clear view.",
		detail: "Portfolio visibility",
	},
	{
		number: "02",
		title: "Keep every role aligned",
		description: "Give admins, delivery teams, and clients the context and tools they need.",
		detail: "Role-aware workspace",
	},
	{
		number: "03",
		title: "Surface risks early",
		description: "Weekly check-ins and client feedback help bring blockers into the open sooner.",
		detail: "Early risk signals",
	},
	{
		number: "04",
		title: "Make progress visible",
		description: "A shared activity trail keeps decisions, updates, and next steps connected.",
		detail: "Connected updates",
	},
];

const roles = [
	{
		name: "Admins",
		index: "A",
		color: "bg-[#e7f0e8]",
		description: "Monitor portfolio health, spot delivery risks, and keep projects moving.",
	},
	{
		name: "Employees",
		index: "E",
		color: "bg-[#f5ead8]",
		description: "Share weekly progress, flag blockers, and keep project updates current.",
	},
	{
		name: "Clients",
		index: "C",
		color: "bg-[#f2e6e0]",
		description: "Follow delivery progress and share feedback with the people doing the work.",
	},
];

const questions = [
	{
		question: "Who is Project Pulse designed for?",
		answer: "Project Pulse brings project administrators, delivery teams, and clients into one shared view of project health and progress.",
	},
	{
		question: "How do weekly check-ins work?",
		answer: "Employees can share a progress summary, completion estimate, confidence level, and any blockers so the team has a regular signal between milestones.",
	},
	{
		question: "Can clients see project updates?",
		answer: "Yes. Client access is designed to make progress and feedback part of the same project conversation.",
	},
	{
		question: "How do I get access?",
		answer: "Use the sign-in link if your team already has an account. For new access, contact the Project Pulse team using the request link below.",
	},
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

function DashboardPreview() {
	return (
		<div className="relative mx-auto w-full max-w-[620px]">
			<div className="absolute -inset-4 -rotate-2 rounded-[28px] bg-[#e2e8d9]" aria-hidden="true" />
			<div className="relative overflow-hidden rounded-xl border border-[#dce1d9] bg-white shadow-[0_28px_80px_-36px_rgba(28,47,37,0.42)]">
				<div className="flex items-center justify-between border-b border-[#e8ebe5] px-5 py-4 sm:px-7">
					<div className="flex items-center gap-3">
						<BrandMark />
						<div>
							<p className="text-sm font-semibold text-[#20342b]">Project Pulse</p>
							<p className="text-xs text-[#78847a]">Workspace overview</p>
						</div>
					</div>
					<span className="rounded-full bg-[#e8f1e7] px-3 py-1 text-xs font-semibold text-[#356848]">This week</span>
				</div>
				<div className="grid gap-5 p-5 sm:grid-cols-[1.2fr_0.8fr] sm:p-7">
					<div>
						<div className="mb-5 flex items-end justify-between gap-2">
							<div>
								<p className="text-xs font-medium text-[#778178]">Portfolio health</p>
								<p className="mt-1 text-3xl font-semibold tracking-normal text-[#20342b]">82<span className="text-lg text-[#718078]"> / 100</span></p>
							</div>
							<span className="mb-1 text-xs font-semibold text-[#438056]">On track</span>
						</div>
						<div className="flex h-32 items-end gap-2 border-b border-l border-[#e8ebe5] px-3 pb-0 sm:h-40">
							{[42, 58, 50, 74, 64, 86, 78, 96, 82, 100, 88, 94].map((height, index) => (
								<span
									key={`${height}-${index}`}
									className={`w-full rounded-t-sm ${index > 8 ? "bg-[#e99569]" : "bg-[#a9c9ac]"}`}
									style={{ height: `${height}%` }}
								/>
							))}
						</div>
						<div className="mt-2 flex justify-between pl-3 text-[10px] text-[#98a097]"><span>Mon</span><span>Wed</span><span>Fri</span></div>
					</div>
					<div className="space-y-3">
						<div className="rounded-lg bg-[#f5f6f2] p-4">
							<p className="text-xs text-[#778178]">Active projects</p>
							<p className="mt-2 text-2xl font-semibold text-[#20342b]">12</p>
							<p className="mt-1 text-xs text-[#748174]">Across 3 teams</p>
						</div>
						<div className="rounded-lg border border-[#eceee9] p-4">
							<div className="flex items-center justify-between gap-2">
								<p className="text-xs font-semibold text-[#34483a]">Needs attention</p>
								<span className="size-2 rounded-full bg-[#df8d62]" />
							</div>
							<p className="mt-2 text-sm font-medium text-[#20342b]">API integration</p>
							<p className="mt-1 text-xs text-[#778178]">Check-in due today</p>
						</div>
					</div>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8ebe5] bg-[#fbfcf9] px-5 py-3 sm:px-7">
					<span className="text-xs font-medium text-[#59665b]">Recent project activity</span>
					<span className="text-xs text-[#829087]">Updated a few minutes ago</span>
				</div>
			</div>
			<div className="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-lg border border-[#e3e7df] bg-white px-4 py-3 shadow-lg sm:flex">
				<span className="grid size-8 place-items-center rounded-full bg-[#e8f1e7] text-xs font-semibold text-[#356848]">+2</span>
				<span className="text-xs font-medium text-[#405047]">New team check-ins</span>
			</div>
		</div>
	);
}

export default function HomePage() {
	const router = useRouter();
	const [menuOpen, setMenuOpen] = useState(false);

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (!token) return;

		let cancelled = false;

		fetch("/api/auth/me", {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then(async (response) => {
				if (response.status === 401) {
					localStorage.removeItem("token");
					return null;
				}
				if (!response.ok) return null;
				return response.json();
			})
			.then((data) => {
				if (cancelled || !data?.user) return;
				const role = String(data.user.role || "").toUpperCase();
				router.replace(roleDestinations[role] || "/dashboard");
			})
			.catch((error) => {
				console.error("Session check failed", error);
			});

		return () => {
			cancelled = true;
		};
	}, [router]);

	const closeMenu = () => setMenuOpen(false);

	return (
		<div id="top" className="min-h-screen bg-[#f7f7f2] font-sans text-[#20342b]">
			<header className="sticky top-0 z-50 border-b border-[#e5e8df] bg-[#f7f7f2]/95 backdrop-blur">
				<div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
					<a href="#top" className="flex items-center gap-2.5" aria-label="Project Pulse home">
						<BrandMark />
						<span className="text-base font-semibold tracking-normal">Project Pulse</span>
					</a>
					<nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
						<a className="text-sm text-[#5b685e] transition hover:text-[#214b3a]" href="#top">Home</a>
						<a className="text-sm text-[#5b685e] transition hover:text-[#214b3a]" href="#features">Features</a>
						<a className="text-sm text-[#5b685e] transition hover:text-[#214b3a]" href="#about">About</a>
						<a className="text-sm text-[#5b685e] transition hover:text-[#214b3a]" href="#contact">Contact</a>
					</nav>
					<div className="hidden items-center gap-3 lg:flex">
						<a href="/login" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[#335543] transition hover:bg-[#e9ede5]">Login</a>
						<a href="/signup" className="rounded-lg bg-[#214b3a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#173c2c]">Sign Up</a>
					</div>
					<button
						type="button"
						className="grid size-10 place-items-center rounded-lg border border-[#dce2d8] text-[#214b3a] transition hover:bg-[#e9ede5] lg:hidden"
						aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
						aria-expanded={menuOpen}
						onClick={() => setMenuOpen(!menuOpen)}
					>
						<span className="flex w-4 flex-col gap-1" aria-hidden="true">
							<span className={`h-0.5 w-full bg-current transition ${menuOpen ? "translate-y-[3px] rotate-45" : ""}`} />
							<span className={`h-0.5 w-full bg-current transition ${menuOpen ? "-translate-y-[3px] -rotate-45" : ""}`} />
						</span>
					</button>
				</div>
				{menuOpen && (
					<nav className="border-t border-[#e5e8df] bg-[#f7f7f2] px-5 py-4 lg:hidden" aria-label="Mobile navigation">
						<div className="mx-auto flex max-w-7xl flex-col gap-1">
							<a onClick={closeMenu} className="rounded-lg px-3 py-2.5 text-sm text-[#42574a] hover:bg-[#e9ede5]" href="#top">Home</a>
							<a onClick={closeMenu} className="rounded-lg px-3 py-2.5 text-sm text-[#42574a] hover:bg-[#e9ede5]" href="#features">Features</a>
							<a onClick={closeMenu} className="rounded-lg px-3 py-2.5 text-sm text-[#42574a] hover:bg-[#e9ede5]" href="#about">About</a>
							<a onClick={closeMenu} className="rounded-lg px-3 py-2.5 text-sm text-[#42574a] hover:bg-[#e9ede5]" href="#contact">Contact</a>
							<div className="mt-2 flex gap-3 border-t border-[#e5e8df] pt-3">
								<a onClick={closeMenu} href="/login" className="flex-1 rounded-lg border border-[#cad4c9] px-4 py-2.5 text-center text-sm font-semibold text-[#335543]">Login</a>
								<a onClick={closeMenu} href="/signup" className="flex-1 rounded-lg bg-[#214b3a] px-4 py-2.5 text-center text-sm font-semibold text-white">Sign Up</a>
							</div>
						</div>
					</nav>
				)}
			</header>

			<main>
				<section className="relative overflow-hidden px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
					<div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(54, 78, 57, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(54, 78, 57, 0.045) 1px, transparent 1px)", backgroundSize: "44px 44px" }} aria-hidden="true" />
					<div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
						<div className="max-w-xl">
							<p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#dbe3d8] bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase text-[#43644b]">
								<span className="size-1.5 rounded-full bg-[#e99569]" /> Project delivery, in sync
							</p>
							<h1 className="text-5xl font-semibold leading-[1.05] tracking-normal text-[#20342b] sm:text-6xl">Make every project feel <span className="text-[#56805d]">in focus.</span></h1>
							<p className="mt-6 max-w-lg text-base leading-7 text-[#637066] sm:text-lg sm:leading-8">One calm, clear place to follow project health, share progress, and catch delivery risks before they become surprises.</p>
							<div className="mt-8 flex flex-wrap items-center gap-3">
								<a href="/login" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#214b3a] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#173c2c]">
									Get started <span aria-hidden="true">&#8594;</span>
								</a>
								<a href="#features" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#d6ded3] bg-white/70 px-5 text-sm font-semibold text-[#335543] transition hover:border-[#9db39c] hover:bg-white">Explore the platform</a>
							</div>
							<div className="mt-8 flex items-center gap-3 text-xs text-[#748075]">
								<span className="flex -space-x-2" aria-hidden="true">
									<span className="grid size-7 place-items-center rounded-full border-2 border-[#f7f7f2] bg-[#dce8d9] text-[9px] font-bold text-[#45644a]">A</span>
									<span className="grid size-7 place-items-center rounded-full border-2 border-[#f7f7f2] bg-[#f3dfcb] text-[9px] font-bold text-[#805d3c]">E</span>
									<span className="grid size-7 place-items-center rounded-full border-2 border-[#f7f7f2] bg-[#eadbd5] text-[9px] font-bold text-[#80594c]">C</span>
								</span>
								<span>Admins, teams, and clients. One shared picture.</span>
							</div>
						</div>
						<DashboardPreview />
					</div>
				</section>

				<section id="features" className="scroll-mt-24 border-y border-[#e6e8e1] bg-white px-5 py-20 sm:px-8 sm:py-24">
					<div className="mx-auto max-w-7xl">
						<div className="mb-12 grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-end">
							<div>
								<p className="text-xs font-bold uppercase text-[#638069]">A steadier way to deliver</p>
								<h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-normal text-[#20342b] sm:text-4xl">Less chasing. More shared momentum.</h2>
							</div>
							<p className="max-w-xl text-base leading-7 text-[#68746a] md:justify-self-end">Project Pulse connects the updates, feedback, and project signals your team needs to make good decisions with confidence.</p>
						</div>
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							{features.map((feature) => (
								<article key={feature.number} className="group flex min-h-56 flex-col border-t-2 border-[#dce5d9] bg-[#f8f9f5] p-5 transition duration-200 hover:-translate-y-1 hover:border-[#e99569] hover:bg-[#f3f6ef]">
									<div className="flex items-center justify-between">
										<span className="text-xs font-semibold text-[#8b998d]">{feature.number}</span>
										<span className="size-2 rounded-full bg-[#e99569] transition group-hover:scale-125" aria-hidden="true" />
									</div>
									<h3 className="mt-7 text-lg font-semibold text-[#263d30]">{feature.title}</h3>
									<p className="mt-2 text-sm leading-6 text-[#6b776d]">{feature.description}</p>
									<p className="mt-auto pt-5 text-xs font-semibold text-[#527259]">{feature.detail}</p>
								</article>
							))}
						</div>
					</div>
				</section>

				<section id="how-it-works" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
					<div className="mx-auto max-w-7xl">
						<div className="max-w-2xl">
							<p className="text-xs font-bold uppercase text-[#638069]">How it works</p>
							<h2 className="mt-3 text-3xl font-semibold tracking-normal text-[#20342b] sm:text-4xl">A simple rhythm that keeps work moving.</h2>
						</div>
						<div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-12">
							{[
								["01", "Bring the work together", "Set up projects and invite the people who need a clear view of delivery."],
								["02", "Share a regular pulse", "Teams post check-ins, clients share feedback, and activity stays connected."],
								["03", "Act on what you see", "Use health signals and early risk visibility to focus attention where it matters."],
							].map(([number, title, description]) => (
								<article key={number} className="relative border-l border-[#cfd9ce] pl-5 sm:pl-6">
									<span className="absolute -left-2 top-0 grid size-4 place-items-center rounded-full bg-[#e99569] ring-4 ring-[#f7f7f2]" aria-hidden="true" />
									<p className="text-xs font-bold text-[#7e9280]">STEP {number}</p>
									<h3 className="mt-4 text-xl font-semibold text-[#283d31]">{title}</h3>
									<p className="mt-3 max-w-sm text-sm leading-6 text-[#68746a]">{description}</p>
								</article>
							))}
						</div>
					</div>
				</section>

				<section id="about" className="scroll-mt-24 bg-[#eaf0e7] px-5 py-20 sm:px-8 sm:py-24">
					<div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
						<div className="max-w-md">
							<p className="text-xs font-bold uppercase text-[#638069]">Built around your people</p>
							<h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-[#20342b] sm:text-4xl">One project. Three perspectives. Better alignment.</h2>
							<p className="mt-5 text-base leading-7 text-[#637066]">Everyone sees the work through a different lens. Project Pulse gives each role a useful way to contribute to the same source of truth.</p>
						</div>
						<div className="grid gap-3 sm:grid-cols-3">
							{roles.map((role) => (
								<article key={role.name} className={`${role.color} min-h-52 rounded-lg p-5`}>
									<span className="grid size-10 place-items-center rounded-lg bg-white/75 text-sm font-bold text-[#49664e]">{role.index}</span>
									<h3 className="mt-7 text-lg font-semibold text-[#263d30]">{role.name}</h3>
									<p className="mt-2 text-sm leading-6 text-[#5e6d61]">{role.description}</p>
								</article>
							))}
						</div>
					</div>
				</section>

				<section className="px-5 py-20 sm:px-8 sm:py-24">
					<div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
						<div>
							<p className="text-xs font-bold uppercase text-[#638069]">A better signal, week by week</p>
							<h2 className="mt-3 max-w-lg text-3xl font-semibold leading-tight tracking-normal text-[#20342b] sm:text-4xl">Clarity is a team practice.</h2>
							<p className="mt-4 max-w-lg text-base leading-7 text-[#68746a]">Make the important parts of project health visible: steady progress, honest feedback, and risks that get attention early.</p>
						</div>
						<div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#e1e6dc] bg-[#e1e6dc] sm:grid-cols-4">
							{[
								["01", "Shared portfolio"],
								["03", "Connected roles"],
								["Weekly", "Team check-ins"],
								["Early", "Risk visibility"],
							].map(([value, label]) => (
								<div key={label} className="min-h-32 bg-white p-4 sm:p-5">
									<p className="text-2xl font-semibold text-[#42684a] sm:text-3xl">{value}</p>
									<p className="mt-3 text-xs leading-5 text-[#748075]">{label}</p>
								</div>
							))}
						</div>
					</div>
				</section>

				<section id="contact" className="scroll-mt-24 px-5 pb-20 sm:px-8 sm:pb-24">
					<div className="relative mx-auto max-w-7xl overflow-hidden rounded-xl bg-[#214b3a] px-6 py-12 text-white sm:px-12 sm:py-14">
						<div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-20" style={{ backgroundImage: "linear-gradient(135deg, transparent 48%, #c6d9bc 49%, #c6d9bc 50%, transparent 51%)", backgroundSize: "28px 28px" }} aria-hidden="true" />
						<div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center">
							<div className="max-w-xl">
								<p className="text-xs font-bold uppercase text-[#c5d9c4]">Make room for better work</p>
								<h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">Bring your next project into focus.</h2>
								<p className="mt-3 max-w-lg text-sm leading-6 text-[#d2ded2]">Already part of a workspace? Sign in. New to Project Pulse? Request access from our team.</p>
							</div>
							<div className="flex flex-wrap gap-3">
								<a href="/login" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-[#214b3a] transition hover:-translate-y-0.5 hover:bg-[#eef3eb]">Login</a>
								<a href="mailto:hello@projectpulse.app?subject=Project%20Pulse%20access" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/40 px-5 text-sm font-semibold text-white transition hover:bg-white/10">Request access</a>
							</div>
						</div>
					</div>
				</section>

				<section className="border-t border-[#e6e8e1] bg-white px-5 py-20 sm:px-8 sm:py-24">
					<div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.7fr_1.3fr]">
						<div>
							<p className="text-xs font-bold uppercase text-[#638069]">Good to know</p>
							<h2 className="mt-3 text-3xl font-semibold tracking-normal text-[#20342b] sm:text-4xl">A few common questions.</h2>
						</div>
						<div className="divide-y divide-[#e7eae4] border-y border-[#e7eae4]">
							{questions.map((item) => (
								<details key={item.question} className="group py-5">
									<summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-left text-base font-semibold text-[#2a4032]">
										{item.question}
										<span className="grid size-7 shrink-0 place-items-center rounded-full border border-[#dce4d9] text-[#527259] transition group-open:rotate-45" aria-hidden="true">+</span>
									</summary>
									<p className="max-w-2xl pr-10 pt-4 text-sm leading-6 text-[#68746a]">{item.answer}</p>
								</details>
							))}
						</div>
					</div>
				</section>
			</main>

			<footer className="bg-[#203a2d] px-5 py-12 text-[#e9eee8] sm:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="grid gap-10 border-b border-white/15 pb-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
						<div className="max-w-sm">
							<a href="#top" className="inline-flex items-center gap-2.5">
								<BrandMark />
								<span className="font-semibold">Project Pulse</span>
							</a>
							<p className="mt-4 text-sm leading-6 text-[#c2cec2]">A shared pulse on project health, progress, and the people behind the work.</p>
						</div>
						<div>
							<h2 className="text-xs font-bold uppercase text-[#a9c7aa]">Explore</h2>
							<div className="mt-4 flex flex-col gap-3 text-sm text-[#d3ddd2]">
								<a className="transition hover:text-white" href="#features">Features</a>
								<a className="transition hover:text-white" href="#how-it-works">How it works</a>
								<a className="transition hover:text-white" href="#about">Who it is for</a>
							</div>
						</div>
						<div>
							<h2 className="text-xs font-bold uppercase text-[#a9c7aa]">Workspace</h2>
							<div className="mt-4 flex flex-col gap-3 text-sm text-[#d3ddd2]">
								<a className="transition hover:text-white" href="/login">Login</a>
								<a className="transition hover:text-white" href="#contact">Request access</a>
								<a className="transition hover:text-white" href="mailto:hello@projectpulse.app">Contact</a>
							</div>
						</div>
						<div>
							<h2 className="text-xs font-bold uppercase text-[#a9c7aa]">Follow along</h2>
							<div className="mt-4 flex gap-2">
								{[["in", "LinkedIn"], ["x", "X"], ["gh", "GitHub"]].map(([label, name]) => (
									<a key={name} href="#contact" aria-label={name} className="grid size-9 place-items-center rounded-full border border-white/25 text-xs font-semibold text-white transition hover:bg-white/10">{label}</a>
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
		</div>
	);
}
