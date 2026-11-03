create table stations (
  station_id text primary key,
  name text not null,
  lat double precision not null,
  lon double precision not null,
  capacity int not null,
  updated_at timestamptz not null default now()
);

alter table stations enable row level security;

create policy "anyone can read station info"
  on stations for select
  to anon, authenticated
  using (true);

alter policy "authenticated can read live station status" on station_status_live to anon, authenticated;
alter policy "authenticated can read worker run log" on worker_runs to anon, authenticated;
