create table if not exists public.game_settings (
  id smallint primary key check (id = 1),
  questions jsonb not null,
  version integer not null default 1 check (version > 0)
);

alter table public.game_settings enable row level security;

grant select on public.game_settings to anon, authenticated;
grant insert, update on public.game_settings to authenticated;

drop policy if exists "Players can read game settings" on public.game_settings;
create policy "Players can read game settings"
  on public.game_settings for select
  using (true);

drop policy if exists "Authenticated admins can insert game settings" on public.game_settings;
create policy "Authenticated admins can insert game settings"
  on public.game_settings for insert to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Authenticated admins can update game settings" on public.game_settings;
create policy "Authenticated admins can update game settings"
  on public.game_settings for update to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
