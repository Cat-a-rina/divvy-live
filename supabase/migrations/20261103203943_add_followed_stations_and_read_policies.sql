-- open up read access to the two worker-owned tables for signed-in users
create policy "authenticated can read live station status"
  on station_status_live for select
  to authenticated
  using (true);

create policy "authenticated can read worker run log"
  on worker_runs for select
  to authenticated
  using (true);

-- personal table: which stations a person follows
create table followed_stations (
  id bigint generated always as identity primary key,
  user_id text not null,
  station_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, station_id)
);

alter table followed_stations enable row level security;

create policy "users can read their own follows"
  on followed_stations for select
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));

create policy "users can add their own follows"
  on followed_stations for insert
  to authenticated
  with check (user_id = (auth.jwt() ->> 'sub'));

create policy "users can remove their own follows"
  on followed_stations for delete
  to authenticated
  using (user_id = (auth.jwt() ->> 'sub'));
