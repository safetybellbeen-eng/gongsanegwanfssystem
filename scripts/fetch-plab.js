// 플랩풋볼(Plabfootball) API에서 오늘부터 14일간의 경기 목록을 가져와
// Supabase의 plab_matches 테이블에 upsert(id 기준 갱신/삽입)하는 스크립트입니다.
//
// - GitHub Actions에서만 실행됩니다 (workflow_dispatch 수동 실행).
// - 기존 공생관 웹앱(index.html / app.js / style.css)과는 전혀 연결되지 않은 별도 파이프라인입니다.
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY는 GitHub Secrets에서 환경변수로 전달받습니다.
//
// ⚠️ 4차 수정 사항 (진단 로그 전용 추가, 필터/매핑 로직은 전혀 바꾸지 않았습니다)
// "가산"이 포함된 경기장이 plab_matches에 한 건도 저장되지 않는 문제의 원인을 찾기 위해,
// 아래 5단계마다 "가산" 포함 경기가 몇 건 있는지 추적하는 로그만 추가했습니다.
//   1) 각 날짜별 전체 페이지 조회 여부
//   2) API 원본 results 안에 가산 경기가 있는지
//   3) 가산 경기의 apply_status
//   4) 가산 경기가 데이터 검증에서 제외되는지
//   5) 최종 upsert 대상에 가산 경기가 포함되는지
// 가산 경기를 강제로 포함시키거나 별도 취급하는 로직은 전혀 추가하지 않았습니다 — 순수하게 로그만 남깁니다.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DAYS_TO_FETCH = 14;
const TABLE_NAME = 'plab_matches';
const MAX_PAGES_PER_DATE = 50; // 무한 루프 방지용 안전장치
const ALLOWED_STATUSES = ['available', 'hurry'];
const DIAG_KEYWORD = '가산'; // 진단 대상 키워드 (이 값 자체가 저장 여부를 바꾸지는 않습니다)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[fetch-plab] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다.');
  console.error('[fetch-plab] GitHub Secrets에 두 값이 등록되어 있는지, 워크플로에서 env로 전달하고 있는지 확인해 주세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ---------- 날짜 계산 (KST 기준, 오늘을 1일째로 포함해 14일) ---------- */
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

/* ---------- 진단용 헬퍼 ---------- */
function isDiagMatch(item) {
  return String((item && item.stadium_name) || '').includes(DIAG_KEYWORD);
}
function logDiagRaw(item) {
  console.log(
    '[진단][가산 원본]',
    JSON.stringify({
      id: item.id,
      schedule: item.schedule,
      time: item.time,
      stadium_name: item.stadium_name,
      apply_status: item.apply_status,
      player_count: item.player_count,
      confirm_cnt: item.confirm_cnt,
      max_player_cnt: item.max_player_cnt,
    })
  );
}

/* ---------- 특정 날짜의 전체 페이지를 끝까지 조회 ---------- */
async function fetchAllPagesForDate(date) {
  const results = [];
  let page = 1;
  let pageCount = 0;
  let dateDiagCount = 0;

  while (true) {
    pageCount++;
    if (pageCount > MAX_PAGES_PER_DATE) {
      console.warn(`[fetch-plab] ${date}: 최대 페이지 수(${MAX_PAGES_PER_DATE})에 도달해 중단합니다.`);
      break;
    }
    const url = `https://social-admin.plabfootball.com/api/v2/match-explore/1/match/?date=${date}&page=${page}&type=region`;
    console.log(`[진단][${date}] 페이지 ${page} 요청: ${url}`);

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.error(`[fetch-plab] ${date} 페이지 ${page} 요청 실패 (status ${res.status})`);
      break;
    }
    const data = await res.json();
    const pageResults = Array.isArray(data.results) ? data.results : [];
    console.log(`[진단][${date}] 페이지 ${page} 원본 ${pageResults.length}건`);

    const pageDiag = pageResults.filter(isDiagMatch);
    if (pageDiag.length) {
      console.log(`[진단][${date}] 페이지 ${page}에서 "${DIAG_KEYWORD}" 포함 경기 ${pageDiag.length}건 발견`);
      pageDiag.forEach(logDiagRaw);
    }
    dateDiagCount += pageDiag.length;

    results.push(...pageResults);

    if (!data.next) break; // next가 null/빈 문자열/undefined면 마지막 페이지
    page++;
  }

  console.log(`[진단][${date}] 조회한 총 페이지 수: ${pageCount}`);
  console.log(`[진단][${date}] 원본 results 총 개수: ${results.length}`);
  console.log(`[진단][${date}] "${DIAG_KEYWORD}" 포함 경기 수: ${dateDiagCount}`);

  return results;
}

/* ---------- 검증 + 매핑 (기존 로직 그대로, 변경 없음) ----------
   실제 확인된 필드만 사용합니다: id, time, schedule, stadium_name, apply_status,
   player_count(경기 형식, 예: "6vs6"), confirm_cnt(현재 모집 인원), max_player_cnt(최대 정원) */
function mapAndValidate(item) {
  const idNum = Number(item.id);
  if (item.id === undefined || item.id === null || Number.isNaN(idNum)) {
    return { ok: false, reason: 'id가 유효한 숫자가 아님' };
  }
  if (!item.schedule) {
    return { ok: false, reason: 'schedule 없음' };
  }
  const matchDate = String(item.schedule).slice(0, 10);
  if (!matchDate) {
    return { ok: false, reason: 'match_date를 schedule에서 추출할 수 없음' };
  }
  if (!item.time) {
    return { ok: false, reason: 'time 없음' };
  }
  if (!item.stadium_name) {
    return { ok: false, reason: 'stadium_name 없음' };
  }
  if (!item.player_count) {
    return { ok: false, reason: 'player_count 없음' };
  }
  if (!ALLOWED_STATUSES.includes(item.apply_status)) {
    return { ok: false, reason: `apply_status(${item.apply_status})가 저장 대상(available/hurry)이 아님` };
  }
  // confirm_cnt / max_player_cnt는 null이어도 경기 저장 자체를 막지 않습니다.
  // Supabase의 confirm_count, max_player_cnt 컬럼은 nullable이므로 값이 없으면 null 그대로 저장합니다.
  const confirmCount = item.confirm_cnt == null ? null : Number(item.confirm_cnt);
  const maxPlayerCnt = item.max_player_cnt == null ? null : Number(item.max_player_cnt);

  return {
    ok: true,
    row: {
      id: idNum,
      match_date: matchDate,
      match_time: item.time,
      stadium_name: item.stadium_name,
      match_url: `https://plabfootball.com/match/${item.id}`,
      apply_status: item.apply_status,
      player_count: item.player_count, // "6vs6" 같은 경기 형식 문자열. 계산하지 않고 원본 그대로 저장합니다.
      confirm_count: confirmCount,
      max_player_cnt: maxPlayerCnt,
      updated_at: new Date().toISOString(),
    },
  };
}

async function main() {
  const dates = buildDateList();
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  console.log(`[fetch-plab] 조회 기간: ${startDate} ~ ${endDate} (오늘 포함 ${DAYS_TO_FETCH}일)`);

  let allRaw = [];
  for (const date of dates) {
    const dayResults = await fetchAllPagesForDate(date);
    allRaw = allRaw.concat(dayResults);
  }
  console.log(`[fetch-plab] 전체 원본 경기 수: ${allRaw.length}건`);

  // ---- 진단 1단계: 원본 전체에서 "가산" 포함 경기 집계 ----
  const allDiagRaw = allRaw.filter(isDiagMatch);
  console.log(`[진단] 전체 원본 경기: ${allRaw.length}건`);
  console.log(`[진단] 전체 "${DIAG_KEYWORD}" 경기: ${allDiagRaw.length}건`);

  // ---- 진단 2단계: 가산 경기의 apply_status 확인 ----
  allDiagRaw.forEach((item) => {
    console.log(`[진단][가산 상태] id=${item.id}, stadium_name=${item.stadium_name}, apply_status=${item.apply_status}`);
  });
  const diagAvailableOrHurry = allDiagRaw.filter((item) => ALLOWED_STATUSES.includes(item.apply_status));
  console.log(`[진단] 모집 가능(available/hurry) "${DIAG_KEYWORD}" 경기: ${diagAvailableOrHurry.length}건`);

  // ---- 검증 단계 (기존 로직 그대로) + 진단 3단계: 검증 통과한 가산 경기 추적 ----
  let availableCount = 0;
  let hurryCount = 0;
  let skippedCount = 0;
  const validRows = [];
  const diagValidatedIds = new Set();

  for (const item of allRaw) {
    if (item.apply_status === 'available') availableCount++;
    else if (item.apply_status === 'hurry') hurryCount++;

    const result = mapAndValidate(item);
    if (!result.ok) {
      skippedCount++;
      console.warn(`[fetch-plab] 검증 실패로 제외: id=${item.id}, 사유=${result.reason}`);
      if (isDiagMatch(item)) {
        console.log(`[진단][가산 검증실패] id=${item.id}, stadium_name=${item.stadium_name}, 사유=${result.reason}`);
      }
      continue;
    }
    validRows.push(result.row);
    if (isDiagMatch(item)) diagValidatedIds.add(result.row.id);
  }

  console.log(`[fetch-plab] available(모집중) 경기 수: ${availableCount}건`);
  console.log(`[fetch-plab] hurry(마감임박) 경기 수: ${hurryCount}건`);
  console.log(`[fetch-plab] 검증 실패로 제외된 경기 수: ${skippedCount}건`);
  console.log(`[진단] 검증 통과 "${DIAG_KEYWORD}" 경기: ${diagValidatedIds.size}건`);

  // id 기준 중복 제거 (마지막 값 사용) — 기존 로직 그대로
  const dedupedMap = new Map();
  validRows.forEach((row) => dedupedMap.set(row.id, row));
  const finalRows = Array.from(dedupedMap.values());
  console.log(`[fetch-plab] 최종 저장 대상 경기 수: ${finalRows.length}건`);

  // ---- 진단 4단계: 최종 upsert 대상에 가산 경기가 포함되는지 ----
  const finalDiagCount = finalRows.filter((row) => diagValidatedIds.has(row.id)).length;
  console.log(`[진단] 최종 저장 대상 "${DIAG_KEYWORD}" 경기: ${finalDiagCount}건`);

  if (finalRows.length) {
    console.log('[fetch-plab] player_count 예시값 3개:', finalRows.slice(0, 3).map((r) => r.player_count));
    console.log(
      '[fetch-plab] confirm_count/max_player_cnt 예시값 3개:',
      finalRows.slice(0, 3).map((r) => `${r.confirm_count}/${r.max_player_cnt}`)
    );
  }

  // 최종 저장 대상이 0건이면 기존 데이터를 절대 건드리지 않고 중단합니다.
  if (finalRows.length === 0) {
    console.error('최종 저장 대상이 0건이라 기존 데이터를 유지하고 작업을 중단합니다.');
    process.exitCode = 1;
    return;
  }

  // id 기준 upsert (전체 삭제 후 재삽입하지 않습니다)
  const { error: upsertError } = await supabase.from(TABLE_NAME).upsert(finalRows, { onConflict: 'id' });
  if (upsertError) {
    console.error('[fetch-plab] upsert 실패:', upsertError.message);
    console.error('[fetch-plab] 저장하려던 첫 번째 행 예시:', JSON.stringify(finalRows[0]));
    process.exitCode = 1;
    return;
  }
  console.log(`[fetch-plab] upsert 완료: ${finalRows.length}건`);

  // 오늘 이전(과거)의 경기만 정리합니다. 오늘/미래 데이터는 이번에 upsert된 내용을 그대로 유지합니다.
  const todayS = toDateString(getKstNow());
  const { error: cleanupError } = await supabase.from(TABLE_NAME).delete().lt('match_date', todayS);
  if (cleanupError) {
    console.error('[fetch-plab] 과거 데이터 정리 실패:', cleanupError.message);
  } else {
    console.log(`[fetch-plab] 과거 데이터(match_date < ${todayS}) 정리 완료`);
  }
}

main().catch((err) => {
  console.error('[fetch-plab] 스크립트 실행 중 오류가 발생했습니다:');
  console.error(err);
  process.exitCode = 1;
});
