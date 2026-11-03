create table saved_stations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  station_id text not null,
  nickname text,
  created_at timestamptz not null default now(),
  unique (user_id, station_id)
);

alter table saved_stations enable row level security;

create policy "users can read their own saved stations"
  on saved_stations for select
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));

create policy "users can add their own saved stations"
  on saved_stations for insert
  to authenticated
  with check (user_id = (auth.jwt() ->> 'sub'));

create policy "users can update their own saved stations"
  on saved_stations for update
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'))
  with check (user_id = (auth.jwt() ->> 'sub'));

create policy "users can delete their own saved stations"
  on saved_stations for delete
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));

create table saved_routes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  origin_station_id text not null,
  destination_station_id text not null,
  stops text[] not null default '{}',
  label text,
  created_at timestamptz not null default now()
);

alter table saved_routes enable row level security;

create policy "users can read their own saved routes"
  on saved_routes for select
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));

create policy "users can add their own saved routes"
  on saved_routes for insert
  to authenticated
  with check (user_id = (auth.jwt() ->> 'sub'));

create policy "users can delete their own saved routes"
  on saved_routes for delete
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));
