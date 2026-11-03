import { getStations } from "@/lib/divvy/gbfs";

export async function GET() {
  const stations = await getStations();
  return Response.json({ stations });
}
