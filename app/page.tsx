import { LiveNearestStation } from "@/components/live-nearest-station";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Bike, Leaf } from "lucide-react";
import Link from "next/link";

// Reads auth state per request, and the live card itself subscribes to
// Realtime on the client, so this page can't produce a static shell.
export const instant = false;

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-divvy-blue text-white">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4">
        <span className="flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wide">
          <Bike aria-hidden="true" size={20} />
          Divvy Explorer
        </span>
        {userId ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm font-semibold uppercase tracking-wide hover:underline"
            >
              Dashboard
            </Link>
            <UserButton />
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide">
            <SignInButton mode="modal">
              <button type="button" className="hover:underline">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="rounded-full bg-white px-4 py-1.5 text-divvy-blue hover:bg-white/90"
              >
                Sign up
              </button>
            </SignUpButton>
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide">
            Get around Chicago on two wheels
          </h1>
          <p className="max-w-sm text-sm text-white/80">
            Find a bike, plan your ride, and go. Sign up to follow a station
            or save a route for next time.
          </p>
        </div>

        <div className="text-[#0a1f3d]">
          <LiveNearestStation />
        </div>

        <p className="flex items-center justify-center gap-1.5 text-xs text-white/60">
          <Leaf aria-hidden="true" size={14} />A greener way to get around the
          city.
        </p>
      </div>
    </div>
  );
}
