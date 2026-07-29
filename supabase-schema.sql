-- =====================================================================
-- 공생관 앱 — Supabase 초기 설정 스크립트
-- Supabase 대시보드 → SQL Editor → New query 에 이 내용 전체를 붙여넣고
-- "Run" 버튼을 눌러 한 번만 실행하면 됩니다.
-- =====================================================================

-- 1) 앱 전체 데이터를 JSON 한 덩어리로 저장할 테이블
--    (기존 JSONBin.io 방식과 동일한 구조를 그대로 유지해서, app.js 쪽 코드를
--     최소한으로만 바꿔도 되도록 설계했습니다.)
create table if not exists app_state (
  id int primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2) 앱이 사용할 고정 행(row)을 하나 만들어 둡니다. (id = 1)
insert into app_state (id, data)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- 3) 행 단위 보안(RLS) 활성화
alter table app_state enable row level security;

-- 4) 이 테이블에 남아있는 기존 정책을 이름과 상관없이 전부 삭제합니다.
--    (이전에 다른 이름으로 정책을 만든 적이 있어도 "이미 존재합니다" 오류 없이 깨끗하게 정리됩니다.)
do $$
declare
  pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_state' loop
    execute format('drop policy if exists %I on public.app_state', pol.policyname);
  end loop;
end $$;

-- 5) 지금은 팀 내부용 도구이므로, 공개(anon) 키로도 읽기/쓰기가 가능하도록 정책을 새로 만듭니다.
--    ⚠️ 참고: 이는 지금까지 쓰던 JSONBin.io 마스터 키 노출 방식과 보안 수준이 동일합니다
--    (더 안전하게 만들려면 나중에 Supabase Auth로 로그인한 사용자만 쓰기 가능하도록 정책을 좁히면 됩니다).
create policy "app_state_public_select"
  on app_state for select
  to anon
  using (true);

create policy "app_state_public_update"
  on app_state for update
  to anon
  using (true)
  with check (true);

-- =====================================================================
-- 여기까지 실행하면 준비가 끝납니다.
-- 실행 후 Table Editor에서 app_state 테이블에 id=1인 행이 하나 보이면 정상입니다.
-- =====================================================================
