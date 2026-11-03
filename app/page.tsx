import { auth } from "@clerk/nextjs/server";
import { Bike, Heart, Leaf, Route as RouteIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

// Checks sign-in state (a runtime API), so this page can't produce a static
// shell — it's a small marketing page, so that's an acceptable trade-off.
export const instant = false;

const FEATURES = [
  {
    icon: Bike,
    title: "Find the nearest station",
    description: "Live bike and dock counts, the moment you open the app.",
  },
  {
    icon: RouteIcon,
    title: "Plan your route",
    description: "Save an origin and destination you ride often.",
  },
  {
    icon: Heart,
    title: "Save your favorites",
    description: "One-tap status checks for the stations you use most.",
  },
];

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-divvy-blue text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <Bike aria-hidden="true" size={48} />
          <h1 className="font-heading text-4xl font-bold uppercase tracking-wide">
            Divvy Explorer
          </h1>
          <p className="max-w-sm text-white/80">
            Get around Chicago on two wheels. Find a bike, plan your ride, and
            go.
          </p>
        </div>

        <ul className="grid w-full gap-4 text-left sm:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <li
                key={feature.title}
                className="flex flex-col gap-2 rounded-lg bg-white/10 p-4"
              >
                <Icon aria-hidden="true" size={22} />
                <p className="font-heading text-sm font-bold uppercase tracking-wide">
                  {feature.title}
                </p>
                <p className="text-sm text-white/75">{feature.description}</p>
              </li>
            );
          })}
        </ul>

        <div className="flex w-full max-w-xs flex-col gap-3">
          <Link
            href="/sign-up"
            className="font-heading rounded-full bg-white px-6 py-3 text-base font-bold uppercase tracking-wide text-divvy-blue transition-colors hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Sign up
          </Link>
          <Link
            href="/sign-in"
            className="font-heading rounded-full border border-white/60 px-6 py-3 text-base font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Sign in
          </Link>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-white/60">
          <Leaf aria-hidden="true" size={14} />A greener way to get around the
          city.
        </p>
      </div>
    </div>
  );
}
