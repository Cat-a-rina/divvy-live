"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function toggleFavoriteStation(stationId: string) {
  const { userId } = await auth.protect();
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: lookupError } = await supabase
    .from("saved_stations")
    .select("id")
    .eq("station_id", stationId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    const { error } = await supabase
      .from("saved_stations")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("saved_stations")
      .insert({ user_id: userId, station_id: stationId });
    if (error) throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/stations");
  revalidatePath("/favorites");
}

export async function removeFavoriteStation(id: string) {
  await auth.protect();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("saved_stations").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/dashboard");
  revalidatePath("/stations");
  revalidatePath("/favorites");
}

export async function renameFavoriteStation(id: string, formData: FormData) {
  await auth.protect();

  const nickname = formData.get("nickname");
  if (typeof nickname !== "string") {
    throw new Error("Nickname is required");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("saved_stations")
    .update({ nickname: nickname.trim() || null })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/favorites");
}
