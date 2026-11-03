"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function saveRoute(formData: FormData) {
  const { userId } = await auth.protect();

  const originStationId = formData.get("originStationId");
  const destinationStationId = formData.get("destinationStationId");
  const label = formData.get("label");

  if (typeof originStationId !== "string" || typeof destinationStationId !== "string") {
    throw new Error("Origin and destination stations are required");
  }
  if (originStationId === destinationStationId) {
    throw new Error("Origin and destination must be different stations");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("saved_routes").insert({
    user_id: userId,
    origin_station_id: originStationId,
    destination_station_id: destinationStationId,
    label: typeof label === "string" && label.trim() ? label.trim() : null,
  });
  if (error) throw error;

  revalidatePath("/routes");
}

export async function deleteRoute(id: string) {
  await auth.protect();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("saved_routes").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/routes");
}
