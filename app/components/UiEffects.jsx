"use client";

import { useEffect, useRef, useState } from "react";

export function UiEffects() {
  useEffect(() => {
    let revealObserver;
    const revealSelector = "[data-reveal], main > section, main > div > section, article[class*=\"rounded-2xl\"], article[class*=\"rounded-xl\"]";
    const updateStickyHeader = () => {
      document.querySelectorAll(".site-nav").forEach((header) => {
        header.dataset.scrolled = String(window.scrollY > 8);
      });
      const currentSection = [...document.querySelectorAll("main section[id]")]
        .filter((section) => section.getBoundingClientRect().top <= 150)
        .at(-1)?.id || "top";
      document.querySelectorAll("header.site-nav .nav-link").forEach((link) => {
        const url = new URL(link.href, window.location.href);
        const isCurrent = url.pathname === window.location.pathname
          ? (url.hash ? url.hash === `#${currentSection}` : true)
          : url.hash === `#${currentSection}`;
        if (isCurrent) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };
    const revealTargets = (root) => {
      if (root.matches?.(revealSelector)) {
        root.classList.add("reveal-item");
        if (revealObserver) revealObserver.observe(root);
        else root.classList.add("is-visible");
      }
      root.querySelectorAll?.(revealSelector).forEach((target) => {
        target.classList.add("reveal-item");
        if (revealObserver) revealObserver.observe(target);
        else target.classList.add("is-visible");
      });
    };
    updateStickyHeader();
    window.addEventListener("scroll", updateStickyHeader, { passive: true });

    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealTargets(document);
      return () => window.removeEventListener("scroll", updateStickyHeader);
    }

    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" });

    revealTargets(document);
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) revealTargets(node);
      }));
      updateStickyHeader();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    return () => {
      revealObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("scroll", updateStickyHeader);
    };
  }, []);

  return null;
}

export function Spinner({ label = "Loading" }) {
  return (
    <span role="status" aria-label={label} className="inline-block size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
  );
}

export function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton rounded-xl ${className}`} />;
}

export function Toast({ message, onDismiss }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!message) return undefined;
    const leaveTimer = window.setTimeout(() => setLeaving(true), 3400);
    const dismissTimer = window.setTimeout(onDismiss, 3700);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [message, onDismiss]);

  if (!message) return null;
  return <div role="status" className={`toast-message mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ${leaving ? "toast-leave" : ""}`}>{message}</div>;
}

export function HealthBar({ value = 0 }) {
  const score = Math.max(0, Math.min(100, Number(value) || 0));
  const tone = score >= 80 ? "green" : score >= 60 ? "amber" : "rose";
  return (
    <div className="health-track" role="progressbar" aria-label="Project health" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
      <div className="health-fill" data-tone={tone} style={{ width: `${score}%` }} />
    </div>
  );
}

export function CountUp({ value, duration = 900, className = "", minimumDigits = 1 }) {
  const elementRef = useRef(null);
  const [count, setCount] = useState(0);
  const target = Number(value) || 0;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setCount(target));
      return () => cancelAnimationFrame(frame);
    }

    let frame;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const animate = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - ((1 - progress) ** 3);
        setCount(Math.round(target * eased));
        if (progress < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [duration, target]);

  return <span ref={elementRef} className={className}>{String(count).padStart(minimumDigits, "0")}</span>;
}
