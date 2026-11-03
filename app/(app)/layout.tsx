import { BottomNav } from "@/components/bottom-nav";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Bike } from "lucide-react";
import Link from "next/link";

// Every page under this group requires a signed-in, onboarded user and reads
// per-request data (auth, Supabase rows), so none of it can produce a static
// shell. Opting out here (highest point in the subtree) covers all of it.
export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-divvy-blue text-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-heading text-xl font-bold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <Bike aria-hidden="true" size={24} />
            Divvy Explorer
          </Link>
          <UserButton />
        </div>
      </header>
      <main className="flex flex-1 justify-center bg-background pb-20">
        <div className="w-full max-w-4xl px-5 py-8">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
