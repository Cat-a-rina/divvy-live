"use client";

import { Bike, Heart, Home, Route as RouteIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/stations", label: "Stations", icon: Bike },
  { href: "/routes", label: "Routes", icon: RouteIcon },
  { href: "/favorites", label: "Favorites", icon: Heart },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-divvy-blue/15 bg-white"
    >
      <ul className="mx-auto flex w-full max-w-4xl items-stretch justify-around">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-semibold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-divvy-blue ${
                  isActive ? "text-divvy-blue" : "text-[#0a1f3d]/50"
                }`}
              >
                <Icon aria-hidden="true" size={22} strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
