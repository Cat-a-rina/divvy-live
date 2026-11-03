import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-divvy-blue px-4">
      <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-white">
        Divvy Explorer
      </h1>
      <Suspense>
        <SignUp
          fallbackRedirectUrl="/dashboard"
          appearance={{
            variables: { colorPrimary: "#0057a3" },
          }}
        />
      </Suspense>
    </div>
  );
}
