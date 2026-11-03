import { cacheLife } from "next/cache";

const SYSTEM_PRICING_PLANS_URL =
  "https://gbfs.divvybikes.com/gbfs/en/system_pricing_plans.json";

export type VehicleType = "classic" | "ebike" | "scooter";

export type PricingPlan = {
  unlockFee: number;
  perMinuteRate: number;
};

type RawPricingPlan = {
  plan_id: string;
  price: string;
  description: string;
};

function parsePerMinuteRate(description: string): number {
  const match = description.match(/\$([\d.]+) per minute/);
  return match ? Number.parseFloat(match[1]) : 0;
}

export async function getPricingPlans(): Promise<
  Record<VehicleType, PricingPlan>
> {
  "use cache";
  cacheLife("hours");

  const res = await fetch(SYSTEM_PRICING_PLANS_URL);
  if (!res.ok) {
    throw new Error(`Divvy system_pricing_plans request failed: ${res.status}`);
  }
  const body = (await res.json()) as { data: { plans: RawPricingPlan[] } };

  const byId = new Map(body.data.plans.map((plan) => [plan.plan_id, plan]));
  const planFor = (planId: string): PricingPlan => {
    const plan = byId.get(planId);
    return {
      unlockFee: plan ? Number.parseFloat(plan.price) : 0,
      perMinuteRate: plan ? parsePerMinuteRate(plan.description) : 0,
    };
  };

  return {
    classic: planFor("BIKE_SINGLE_RIDE"),
    ebike: planFor("EBIKE_SINGLE_RIDE"),
    scooter: planFor("SCOOTER_SINGLE_RIDE"),
  };
}
