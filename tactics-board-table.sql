-- =====================================================================
-- 공생관 앱 — 전술 보드(tactics_boards) 테이블 설정 스크립트
-- Supabase 대시보드 → SQL Editor → New query 에 이 내용 전체를 붙여넣고
-- "Run" 버튼을 눌러 한 번만 실행하면 됩니다.
--
-- 이 테이블이 없으면 전술 탭에서 "저장"을 눌러도 favorite_venues 테이블이
-- 없었을 때와 똑같은 이유로 저장이 실패합니다. 먼저 이 스크립트를 실행해
-- 주시기 바랍니다.
-- =====================================================================

-- 1) 경기 날짜별 전술 배치 테이블 생성
--    match_date를 primary key로 써서, 한 경기 날짜에는 배치가 하나만 존재하도록 합니다.
--    positions는 [{ "name": "김종혁", "x": 120, "y": 260 }, ...] 형태의 JSON 배열입니다.
create table if not exists tactics_boards (
  match_date text primary key,
  positions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2) 행 단위 보안(RLS) 활성화
alter table tactics_boards enable row level security;

-- 3) 이 테이블에 남아있는 기존 정책을 이름과 상관없이 전부 삭제합니다.
do $$
declare
  pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'tactics_boards' loop
    execute format('drop policy if exists %I on public.tactics_boards', pol.policyname);
  end loop;
end $$;

-- 4) 지금은 팀 내부용 도구이므로, 공개(anon) 키로 조회/추가/수정/삭제가 모두
--    가능하도록 정책을 만듭니다. (favorite_venues, app_state 테이블과 동일한 보안 수준)
--    실제 배치/저장은 앱의 관리자 로그인 화면에서만 버튼이 노출되어 제한됩니다.
create policy "tactics_boards_public_select"
  on tactics_boards for select
  to anon
  using (true);

create policy "tactics_boards_public_insert"
  on tactics_boards for insert
  to anon
  with check (true);

create policy "tactics_boards_public_update"
  on tactics_boards for update
  to anon
  using (true)
  with check (true);

create policy "tactics_boards_public_delete"
  on tactics_boards for delete
  to anon
  using (true);

-- =====================================================================
-- 여기까지 실행하면 준비가 끝납니다.
-- =====================================================================
