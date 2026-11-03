import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export async function createSupabaseServerClient() {
  const { getToken } = await auth();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      accessToken: async () => (await getToken()) ?? null,
    },
  );
}
