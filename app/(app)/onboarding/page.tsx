import { completeOnboarding } from "@/app/actions/onboarding";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Reads per-request auth data to decide whether to redirect.
export const instant = false;

const FEATURES = [
  {
    title: "Find your nearest station",
    description:
      "The moment you open the app, we'll show you the closest Divvy station and how many bikes and docks it has right now.",
  },
  {
    title: "Save your favorite stations",
    description:
      "Favorite the stations near home or work for one-tap status checks, any time.",
  },
  {
    title: "Plan and save routes",
    description:
      "Pick an origin and destination to save a route you ride often, like your daily commute.",
  },
];

export default async function OnboardingPage() {
  const user = await currentUser();
  const onboarded = Boolean(user?.publicMetadata.onboarded);

  if (onboarded) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 py-8">
      <div>
        <p className="font-heading text-sm font-semibold uppercase tracking-widest text-divvy-blue">
          Welcome{user?.firstName ? `, ${user.firstName}` : ""}
        </p>
        <h1 className="font-heading mt-1 text-4xl font-bold uppercase tracking-wide">
          Let&apos;s get you rolling
        </h1>
      </div>

      <ul className="flex flex-col gap-5">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="rounded-lg border border-divvy-blue/20 bg-white p-4 shadow-sm"
          >
            <p className="font-semibold text-divvy-blue">{feature.title}</p>
            <p className="mt-1 text-sm text-[#0a1f3d]/70">
              {feature.description}
            </p>
          </li>
        ))}
      </ul>

      <form action={completeOnboarding} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          What should we call you?
          <input
            name="name"
            defaultValue={user?.firstName ?? ""}
            placeholder="e.g. Cat"
            className="rounded border border-divvy-blue/30 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-divvy-blue"
          />
        </label>
        <button
          type="submit"
          className="font-heading w-full rounded-full bg-divvy-blue px-6 py-3 text-base font-bold uppercase tracking-wide text-white transition-colors hover:bg-divvy-blue-dark"
        >
          Get started
        </button>
      </form>
    </div>
  );
}
