"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function followStation(stationId: string) {
  const { userId } = await auth.protect();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("followed_stations")
    .insert({ user_id: userId, station_id: stationId });
  if (error) throw error;

  revalidatePath("/");
}

export async function unfollowStation(stationId: string) {
  const { userId } = await auth.protect();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("followed_stations")
    .delete()
    .eq("user_id", userId)
    .eq("station_id", stationId);
  if (error) throw error;

  revalidatePath("/");
}
