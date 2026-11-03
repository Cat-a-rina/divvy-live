import { createSupabaseServerClient } from "@/lib/supabase/server";

export type VehicleType = "classic" | "ebike" | "scooter";

export type PricingPlan = {
  unlockFee: number;
  perMinuteRate: number;
};

type PricingPlanRow = {
  plan_id: string;
  unlock_fee: number;
  per_minute_rate: number;
};

// Pricing comes from our own database, kept current by the divvy-worker Edge
// Function — nothing in this app calls Divvy's API directly.
export async function getPricingPlans(): Promise<
  Record<VehicleType, PricingPlan>
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("pricing_plans").select("*");
  if (error) throw error;

  const byId = new Map((data as PricingPlanRow[]).map((plan) => [plan.plan_id, plan]));
  const planFor = (planId: string): PricingPlan => {
    const plan = byId.get(planId);
    return {
      unlockFee: plan?.unlock_fee ?? 0,
      perMinuteRate: plan?.per_minute_rate ?? 0,
    };
  };

  return {
    classic: planFor("BIKE_SINGLE_RIDE"),
    ebike: planFor("EBIKE_SINGLE_RIDE"),
    scooter: planFor("SCOOTER_SINGLE_RIDE"),
  };
}
