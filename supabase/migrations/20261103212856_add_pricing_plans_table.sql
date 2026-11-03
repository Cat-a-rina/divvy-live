create table pricing_plans (
  plan_id text primary key,
  unlock_fee double precision not null,
  per_minute_rate double precision not null,
  updated_at timestamptz not null default now()
);

alter table pricing_plans enable row level security;

create policy "anyone can read pricing plans"
  on pricing_plans for select
  to anon, authenticated
  using (true);
