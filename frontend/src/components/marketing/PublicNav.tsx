"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

const NAV_LINKS = [
  { href: "#features", label: "Features", dropdown: false },
  { href: "#solutions", label: "Solutions", dropdown: true },
  { href: "#pricing", label: "Pricing", dropdown: false },
  { href: "#testimonials", label: "Resources", dropdown: true },
  { href: "#company", label: "Company", dropdown: true },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="wf-nav">
      <div className="wf-nav__inner">
        <Logo size="lg" />

        <ul className="wf-nav__links">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="wf-nav__link">
                {link.label}
                {link.dropdown ? <span className="text-[10px] text-[#94a3b8]">▾</span> : null}
              </a>
            </li>
          ))}
        </ul>

        <div className="wf-nav__actions">
          <Link href="/login" className="wf-nav__login">
            Log in
          </Link>
          <Link href="/register" className="wf-nav__cta">
            Get Started
          </Link>
        </div>

        <button
          type="button"
          aria-label="Open menu"
          className="ml-auto flex flex-col gap-1.5 p-1 text-[var(--navy)] min-[1101px]:hidden"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="block h-0.5 w-6 bg-current" />
          <span className="block h-0.5 w-6 bg-current" />
          <span className="block h-0.5 w-6 bg-current" />
        </button>
      </div>

      {open ? (
        <div className="border-t border-[var(--gray-200)] bg-white px-6 py-4 lg:hidden">
          <ul className="space-y-3">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block text-sm font-medium text-[var(--gray-600)]"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <Button href="/login" variant="outline" size="sm" className="w-full">
              Log in
            </Button>
            <Button href="/register" size="sm" className="w-full">
              Get Started
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
