create table station_status_live (
  station_id text primary key,
  num_bikes_available int not null,
  num_ebikes_available int not null,
  num_scooters_available int not null,
  num_docks_available int not null,
  is_renting boolean not null,
  is_returning boolean not null,
  last_reported timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table station_status_live enable row level security;

create table worker_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  success boolean not null,
  rows_changed int not null default 0,
  error_message text
);

alter table worker_runs enable row level security;
