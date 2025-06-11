create schema if not exists opportunity_radar;

create table if not exists opportunity_radar.opportunities (
  id text primary key,
  name text not null,
  deadline date not null,
  region text not null,
  type text not null,
  stage text not null,
  owner text not null,
  funding integer,
  fit integer,
  focus text,
  link text,
  created_at timestamptz default now()
);

create table if not exists opportunity_radar.custom_opportunities (
  id text primary key,
  client_id text not null,
  name text not null,
  deadline date not null,
  region text not null,
  type text not null,
  stage text not null,
  owner text not null,
  funding integer,
  fit integer,
  focus text,
  link text,
  created_at timestamptz default now()
);

create table if not exists opportunity_radar.watchlist (
  client_id text not null,
  opportunity_id text not null,
  created_at timestamptz default now(),
  primary key (client_id, opportunity_id)
);
