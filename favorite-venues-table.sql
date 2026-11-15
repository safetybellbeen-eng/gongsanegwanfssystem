-- =====================================================================
-- 공생관 앱 — 즐겨찾기 경기장(favorite_venues) 테이블 설정 스크립트
-- Supabase 대시보드 → SQL Editor → New query 에 이 내용 전체를 붙여넣고
-- "Run" 버튼을 눌러 한 번만 실행하면 됩니다.
--
-- ⚠️ "즐겨찾기 저장에 실패했습니다" 오류의 원인:
--   이 favorite_venues 테이블이 Supabase 프로젝트에 아직 생성되어 있지
--   않거나(테이블 자체가 없음), 생성은 됐지만 RLS(행 단위 보안) 정책이
--   없어서 공개(anon) 키로는 insert/delete가 막혀 있는 경우입니다.
--   아래 스크립트는 두 경우 모두를 한 번에 해결합니다.
-- =====================================================================

-- 1) 즐겨찾기 경기장 테이블 생성
--    venue_name을 primary key로 써서, 추가/삭제가 그 자체로 원자적인
--    DB 작업이 되도록 합니다 (다른 저장 작업과 절대 겹쳐서 유실될 일이 없음).
create table if not exists favorite_venues (
  venue_name text primary key,
  created_at timestamptz not null default now()
);

-- 2) 행 단위 보안(RLS) 활성화
alter table favorite_venues enable row level security;

-- 3) 이 테이블에 남아있는 기존 정책을 이름과 상관없이 전부 삭제합니다.
--    (이전에 다른 이름으로 정책을 만든 적이 있어도 "이미 존재합니다" 오류 없이 깨끗하게 정리됩니다.)
do $$
declare
  pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'favorite_venues' loop
    execute format('drop policy if exists %I on public.favorite_venues', pol.policyname);
  end loop;
end $$;

-- 4) 지금은 팀 내부용 도구이므로, 공개(anon) 키로 조회/추가/삭제가 모두
--    가능하도록 정책을 새로 만듭니다. (app_state 테이블과 동일한 보안 수준)
create policy "favorite_venues_public_select"
  on favorite_venues for select
  to anon
  using (true);

create policy "favorite_venues_public_insert"
  on favorite_venues for insert
  to anon
  with check (true);

create policy "favorite_venues_public_delete"
  on favorite_venues for delete
  to anon
  using (true);

-- =====================================================================
-- 여기까지 실행하면 준비가 끝납니다.
-- 실행 후 Table Editor에서 favorite_venues 테이블이 보이고,
-- 앱에서 지도 탭 ☆ 버튼을 누르면 즐겨찾기가 정상적으로 저장되는지
-- 확인해 보시기 바랍니다.
-- =====================================================================
