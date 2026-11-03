import { createSupabaseServerClient } from "./server";

export type SavedStation = {
  id: string;
  station_id: string;
  nickname: string | null;
  created_at: string;
};

export type SavedRoute = {
  id: string;
  origin_station_id: string;
  destination_station_id: string;
  label: string | null;
  created_at: string;
};

export async function getFavoriteStations(): Promise<SavedStation[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_stations")
    .select("id, station_id, nickname, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getSavedRoutes(): Promise<SavedRoute[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("saved_routes")
    .select("id, origin_station_id, destination_station_id, label, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
