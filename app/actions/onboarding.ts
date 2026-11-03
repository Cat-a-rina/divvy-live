"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth.protect();

  const name = formData.get("name");
  const displayName = typeof name === "string" ? name.trim() : "";

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      onboarded: true,
      ...(displayName ? { displayName } : {}),
    },
  });

  redirect("/dashboard");
}
