import { distanceMeters } from "./distance";
import type { PricingPlan, VehicleType } from "./pricing";

// Divvy's API has no directions endpoint (see AGENTS.md), so trip duration
// here is estimated from straight-line distance and an assumed average
// urban cycling/riding speed per vehicle type — not an actual route.
const AVERAGE_SPEED_KMH: Record<VehicleType, number> = {
  classic: 15,
  ebike: 18,
  scooter: 15,
};

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  classic: "Classic bike",
  ebike: "E-bike",
  scooter: "Scooter",
};

export type TripEstimate = {
  vehicleType: VehicleType;
  minutes: number;
  cost: number;
};

export function estimateTrip(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number },
  vehicleType: VehicleType,
  plan: PricingPlan,
): TripEstimate {
  const km = distanceMeters(origin, destination) / 1000;
  const minutes = Math.max(
    1,
    Math.ceil((km / AVERAGE_SPEED_KMH[vehicleType]) * 60),
  );
  const cost = plan.unlockFee + minutes * plan.perMinuteRate;
  return { vehicleType, minutes, cost };
}
