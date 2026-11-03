const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function distanceMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}
