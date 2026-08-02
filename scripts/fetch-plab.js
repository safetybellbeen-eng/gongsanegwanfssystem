// 플랩풋볼(Plabfootball) API에서 오늘부터 14일간의 서울 지역 경기 목록을 가져와
// Supabase의 plab_matches 테이블을 통째로 갱신(전체 삭제 후 재삽입)하는 스크립트입니다.
//
// - GitHub Actions에서만 실행됩니다 (workflow_dispatch 수동 실행).
// - 기존 공생관 웹앱(index.html / app.js / style.css)과는 전혀 연결되지 않은 별도 파이프라인입니다.
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY는 GitHub Secrets에서 환경변수로 전달받습니다.
//
// ⚠️ 2차 수정 사항 (실제 Supabase 테이블 구조 확인 후 반영)
// - 저장 컬럼명을 실제 스키마에 정확히 맞췄습니다: confirm_cnt(X) → confirm_count(O)
//   (이 오타가 이전 실행 실패의 원인이었을 가능성이 높습니다 — Supabase는 존재하지 않는
//   컬럼으로 insert를 시도하면 에러를 던집니다.)
// - level, gender, type, is_parking_available 컬럼도 함께 저장하도록 추가했습니다.
//
// ⚠️ 필드 매핑 관련 안내
// 아래 mapMatch() / isSeoulMatch() 안의 필드 경로(item.xxx)는 플랩 API의 실제 응답 구조를
// 최대한 정확히 추정해서 작성했습니다. 실행 후 Supabase에 값이 비거나 이상하게 들어간다면,
// 아래에서 출력하는 "[필드 경고]" 로그를 확인하고 이 두 함수 안의 경로만 실제 응답에 맞게
// 고치면 됩니다. (다른 부분은 손댈 필요 없습니다.)

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DAYS_TO_FETCH = 14;
const TABLE_NAME = 'plab_matches';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[fetch-plab] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다.');
  console.error('[fetch-plab] GitHub Secrets에 두 값이 등록되어 있는지, 워크플로에서 env로 전달하고 있는지 확인해 주세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ---------- 날짜 계산 (KST 기준 오늘부터 14일) ---------- */
function getKstNow() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}
function toDateString(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function buildDateList() {
  const base = getKstNow();
  const list = [];
  for (let i = 0; i < DAYS_TO_FETCH; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    list.push(toDateString(d));
  }
  return list;
}

/* ---------- 플랩 API에서 특정 날짜의 전체 페이지를 끝까지 조회 ---------- */
async function fetchAllPagesForDate(date) {
  const results = [];
  let url = `https://social-admin.plabfootball.com/api/v2/match-explore/1/match/?date=${date}&page=1&type=region`;
  let pageCount = 0;

  while (url) {
    pageCount++;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.error(`[fetch-plab] ${date} 페이지 ${pageCount} 요청 실패 (status ${res.status})`);
      break;
    }
    const data = await res.json();
    // DRF(Django REST Framework) 표준 페이지네이션 형태({count, next, previous, results})를 가정합니다.
    const pageResults = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : null;
    if (!pageResults) {
      console.warn(`[필드 경고] ${date} 페이지 ${pageCount}: 예상한 배열(results)을 응답에서 찾지 못했습니다.`);
      console.warn(JSON.stringify(data).slice(0, 500));
      break;
    }
    results.push(...pageResults);
    url = data.next || null; // next가 없으면(null) 마지막 페이지로 판단하고 종료
    if (pageCount > 200) { // 무한 루프 방지용 안전장치
      console.warn(`[fetch-plab] ${date}: 페이지 수가 비정상적으로 많아 200페이지에서 중단합니다.`);
      break;
    }
  }
  console.log(`[fetch-plab] ${date}: ${pageCount}페이지 조회, ${results.length}건 수집`);
  return results;
}

/* ---------- 서울 지역 판별 ---------- */
function isSeoulMatch(item) {
  const region =
    item.city ||
    item.region ||
    item.area_name ||
    item.city_name ||
    (item.stadium && (item.stadium.city || item.stadium.region || item.stadium.area_name)) ||
    '';
  return String(region).includes('서울');
}

/* ---------- 플랩 응답 1건 → plab_matches 저장 형태로 변환 ----------
   실제 테이블 컬럼: id, match_date, match_time, stadium_name, match_url, apply_status,
   player_count, confirm_count, max_player_cnt, level, gender, type, is_parking_available, updated_at */
function mapMatch(item) {
  const stadiumName =
    (item.stadium && item.stadium.name) ||
    item.stadium_name ||
    item.place_name ||
    null;

  const id = item.id ?? item.match_id ?? item.uid ?? null;

  return {
    id,
    match_date: item.date || item.match_date || null,
    match_time: item.start_time || item.time || item.match_time || null,
    stadium_name: stadiumName,
    match_url: id ? `https://www.plabfootball.com/match/${id}` : null,
    apply_status: item.apply_status ?? null,
    player_count: item.player_cnt ?? item.confirm_cnt ?? item.confirm_count ?? null,
    confirm_count: item.confirm_count ?? item.confirm_cnt ?? null,
    max_player_cnt: item.max_player_cnt ?? null,
    level: item.level ?? null,
    gender: item.gender ?? null,
    type: item.type ?? item.match_type ?? null,
    is_parking_available: item.is_parking_available ?? item.parking_available ?? null,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  const dates = buildDateList();
  console.log(`[fetch-plab] 조회 대상: 오늘부터 ${DAYS_TO_FETCH}일 (${dates[0]} ~ ${dates[dates.length - 1]})`);

  let allRaw = [];
  for (const date of dates) {
    const dayResults = await fetchAllPagesForDate(date);
    allRaw = allRaw.concat(dayResults);
  }
  console.log(`[fetch-plab] 전체 수집(필터 전): ${allRaw.length}건`);

  // 모집 상태 판정 기준이 맞는지 확인할 수 있도록, 실제로 어떤 apply_status 값들이 들어오는지 로그로 남깁니다.
  const uniqueStatuses = [...new Set(allRaw.map((item) => item.apply_status))];
  console.log('[fetch-plab] 발견된 apply_status 값들:', uniqueStatuses);

  const filtered = allRaw
    .filter((item) => isSeoulMatch(item))
    .filter((item) => item.apply_status !== 'full');
  console.log(`[fetch-plab] 서울 지역 + 마감(full) 제외 후: ${filtered.length}건`);

  const rows = [];
  for (const item of filtered) {
    const row = mapMatch(item);
    if (!row.id) {
      console.warn('[필드 경고] id를 찾지 못해 건너뜁니다:', JSON.stringify(item).slice(0, 300));
      continue;
    }
    rows.push(row);
  }

  // 같은 id가 여러 날짜 조회에서 중복으로 잡힐 수 있어 id 기준으로 중복 제거합니다.
  const dedupedMap = new Map();
  rows.forEach((r) => dedupedMap.set(r.id, r));
  const finalRows = Array.from(dedupedMap.values());
  console.log(`[fetch-plab] 중복 제거 후 최종 저장 대상: ${finalRows.length}건`);

  // 1) 기존 데이터를 먼저 전부 삭제합니다.
  //    Supabase는 조건 없는 delete를 막아두므로, id가 항상 0 이상이라는 점을 이용해 전체 삭제 조건을 만듭니다.
  const { error: deleteError } = await supabase.from(TABLE_NAME).delete().gte('id', 0);
  if (deleteError) {
    console.error('[fetch-plab] 기존 데이터 삭제 실패:', deleteError.message);
    process.exitCode = 1;
    return;
  }
  console.log(`[fetch-plab] 기존 ${TABLE_NAME} 데이터 삭제 완료`);

  // 2) 새로 수집한 데이터를 삽입합니다.
  if (finalRows.length) {
    const { error: insertError } = await supabase.from(TABLE_NAME).insert(finalRows);
    if (insertError) {
      console.error('[fetch-plab] 신규 데이터 저장 실패:', insertError.message);
      console.error('[fetch-plab] 저장하려던 첫 번째 행 예시:', JSON.stringify(finalRows[0]));
      process.exitCode = 1;
      return;
    }
    console.log(`[fetch-plab] ${TABLE_NAME}에 ${finalRows.length}건 저장 완료`);
  } else {
    console.log('[fetch-plab] 저장할 데이터가 없어 삭제만 수행하고 종료합니다.');
  }
}

main().catch((err) => {
  console.error('[fetch-plab] 스크립트 실행 중 오류가 발생했습니다:');
  console.error(err);
  process.exitCode = 1;
});
