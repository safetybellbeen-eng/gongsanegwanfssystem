// 플랩풋볼(Plabfootball) API에서 경기 목록을 가져와
// Supabase의 plab_matches 테이블에 upsert(id 기준 갱신/삽입)하는 스크립트입니다.
//
// - GitHub Actions에서만 실행됩니다 (workflow_dispatch 수동 실행).
// - 기존 공생관 웹앱(index.html / app.js / style.css)과는 전혀 연결되지 않은 별도 파이프라인입니다.
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY는 GitHub Secrets에서 환경변수로 전달받습니다.
//
// ⚠️ 6차 수정 사항 (API 자체를 교체)
// 기존에 쓰던 social-admin.plabfootball.com/api/v2/match-explore/1/match/ 관련 로직을 전부
// 제거하고, 아래 새 API만 사용합니다.
//   https://www.plabfootball.com/api/v3/social-matches
//
// ⚠️⚠️ 반드시 확인해 주셔야 하는 것 (이 API 응답을 직접 본 적이 없어서 추정한 부분입니다) ⚠️⚠️
// 1) "id"에 해당하는 필드를 알려주신 목록(title, time, schedule, attributes.format,
//    participants.label, participants.percentage, badges[].code, badges[].label)에서
//    찾지 못했습니다. Supabase의 plab_matches.id는 기본키라서 이 값이 없으면 저장이 안 됩니다.
//    아래 코드는 item.id / item.match_id / item.uuid / item.slug 순서로 찾아보도록
//    만들어뒀지만, 진짜 필드명을 확인해서 알려주셔야 정확히 고칠 수 있습니다.
// 2) 이 API 호출 시 날짜(date)나 페이지(page) 파라미터가 필요한지도 알려주신 내용에는 없어서,
//    일단 페이지 번호만 붙여서 호출하고, 각 항목의 schedule 값으로 날짜를 걸러내도록
//    만들었습니다. 응답에 페이지네이션(count/next/previous/results) 구조가 없다면 이 부분도
//    같이 알려주셔야 합니다.
// 3) participants.label에서 "확정인원/정원" 숫자를 정규식으로 추출해 confirm_count/
//    max_player_cnt에 넣도록 했습니다 (예: "12/18" → confirm_count=12, max_player_cnt=18).
//    실제 label 형식이 다르면 이 부분만 고치면 됩니다.
// 4) 모집 상태(apply_status)는 badges 배열 안에서 "full"/"마감", "hurry"/"마감임박",
//    "available"/"모집중" 같은 패턴을 찾아서 판정하도록 했습니다. 정확한 code 값은
//    아래 진단 로그(첫 번째 경기의 badges 전체)를 보고 확정해야 합니다.
//
// 이 모든 추정 부분은 실행 후 로그의 "[진단]" 항목을 보면 바로 확인할 수 있습니다.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const API_BASE = 'https://www.plabfootball.com/api/v3/social-matches';
const DAYS_TO_FETCH = 14;
const TABLE_NAME = 'plab_matches';
const MAX_PAGES = 200; // 무한 루프 방지용 안전장치

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
function buildDateWindow() {
  const base = getKstNow();
  const start = toDateString(base);
  const endDate = new Date(base);
  endDate.setUTCDate(endDate.getUTCDate() + (DAYS_TO_FETCH - 1));
  const end = toDateString(endDate);
  return { start, end };
}

/* ---------- 전체 페이지를 끝까지 조회 ----------
   ⚠️ 이 API에 date 파라미터가 필요한지 몰라서, 일단 page만 붙여서 전체를 받아온 뒤
   schedule 값으로 날짜 범위를 걸러냅니다. 페이지네이션 구조(count/next/previous/results)도
   추정입니다 — 다르면 로그에서 바로 확인할 수 있습니다. */
async function fetchAllPages() {
  const results = [];
  let page = 1;
  let pageCount = 0;

  while (true) {
    pageCount++;
    if (pageCount > MAX_PAGES) {
      console.warn(`[fetch-plab] 최대 페이지 수(${MAX_PAGES})에 도달해 중단합니다.`);
      break;
    }
    const url = `${API_BASE}?page=${page}`;
    console.log(`[진단] 페이지 ${page} 요청: ${url}`);

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.error(`[fetch-plab] 페이지 ${page} 요청 실패 (status ${res.status})`);
      break;
    }
    const data = await res.json();

    // 응답이 {results:[...]} 형태인지, 배열 자체인지 둘 다 대응합니다.
    const pageResults = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : null;
    if (!pageResults) {
      console.warn(`[진단] 페이지 ${page}: 예상한 배열(results)을 응답에서 찾지 못했습니다. 응답 최상위 키:`, Object.keys(data));
      break;
    }
    console.log(`[진단] 페이지 ${page} results 개수: ${pageResults.length}`);

    // 첫 페이지의 첫 번째 항목은 필드 구조를 확인할 수 있도록 전체를 로그로 남깁니다.
    if (page === 1 && pageResults.length) {
      console.log('[진단] 첫 번째 경기 원본 데이터 전체(필드명 확인용):');
      console.log(JSON.stringify(pageResults[0], null, 2));
    }

    results.push(...pageResults);

    const hasNext = data.next !== undefined ? !!data.next : pageResults.length > 0 && page < MAX_PAGES && Array.isArray(data.results);
    if (!data.next && data.next !== undefined) break; // next가 명시적으로 null/빈값이면 종료
    if (data.next === undefined) break; // next 필드 자체가 없으면(페이지네이션 없는 응답) 한 번만 조회하고 종료
    page++;
  }

  console.log(`[진단] 조회한 총 페이지 수: ${pageCount}`);
  console.log(`[진단] 원본 결과 총 개수: ${results.length}`);

  return results;
}

/* ---------- 인원수 파싱 ----------
   participants.label이 "12/18" 또는 "12/18명" 같은 형식이라고 가정하고 숫자 두 개를 뽑습니다.
   형식이 다르면 둘 다 null로 처리됩니다. */
function parseParticipants(label) {
  if (!label) return { confirm: null, max: null };
  const match = String(label).match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return { confirm: null, max: null };
  return { confirm: Number(match[1]), max: Number(match[2]) };
}

/* ---------- 모집 상태 판정 ----------
   badges 배열 안에서 code/label에 특정 패턴이 있는지 찾습니다. 정확한 code 값을 몰라서
   여러 패턴을 넓게 확인합니다. 하나도 안 걸리면 기본값으로 'available'을 씁니다. */
function resolveApplyStatus(badges) {
  const list = Array.isArray(badges) ? badges : [];
  const joined = list.map((b) => `${b && b.code}|${b && b.label}`).join(' ');
  if (/full|마감(?!임박)/i.test(joined)) return 'full';
  if (/hurry|마감임박|soon/i.test(joined)) return 'hurry';
  if (/available|모집중|open/i.test(joined)) return 'available';
  return 'available'; // 알 수 없으면 우선 모집중으로 간주 (저장은 되고, 상태 표시만 부정확할 수 있음)
}

/* ---------- 검증 + 매핑 ----------
   확인된 필드: title, time, schedule, attributes.format, participants.label,
   participants.percentage, badges[].code, badges[].label
   ⚠️ id에 해당하는 필드를 확인 못 해서, 아래 순서로 후보를 찾습니다: id, match_id, uuid, slug */
function mapAndValidate(item) {
  const rawId = item.id ?? item.match_id ?? item.uuid ?? item.slug ?? null;
  if (rawId === null || rawId === undefined || rawId === '') {
    return { ok: false, reason: 'id로 쓸 수 있는 필드(id/match_id/uuid/slug)를 찾지 못함' };
  }
  const idNum = Number(rawId);
  const finalId = Number.isNaN(idNum) ? rawId : idNum; // 숫자로 못 바꾸면 원본(문자열)을 그대로 사용

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
  if (!item.title) {
    return { ok: false, reason: 'title 없음' };
  }

  const format = (item.attributes && item.attributes.format) || null;
  const participantsLabel = (item.participants && item.participants.label) || null;
  const participantsPercentage = (item.participants && item.participants.percentage) ?? null;
  const { confirm, max } = parseParticipants(participantsLabel);
  const applyStatus = resolveApplyStatus(item.badges);

  return {
    ok: true,
    status: applyStatus,
    row: {
      id: finalId,
      match_date: matchDate,
      match_time: item.time,
      stadium_name: item.title, // ⚠️ 새 API에 stadium_name이 따로 없어서 title을 그대로 사용합니다.
      match_url: `https://www.plabfootball.com/match/${finalId}`, // ⚠️ 실제 상세페이지 URL 패턴 확인 필요
      apply_status: applyStatus,
      player_count: format, // "6vs6" 같은 경기 형식 (attributes.format)
      confirm_count: confirm,
      max_player_cnt: max,
      updated_at: new Date().toISOString(),
      // 참고용 원본 퍼센트 값(컬럼이 없으면 upsert 시 무시/에러가 날 수 있어 주석 처리해뒀습니다)
      // participants_percentage: participantsPercentage,
    },
  };
}

async function main() {
  const { start, end } = buildDateWindow();
  console.log(`[진단] 조회 대상 날짜 범위(참고용, 응답에서 이 범위만 필터링): ${start} ~ ${end}`);

  const allRaw = await fetchAllPages();
  console.log(`[진단] 전체 원본 경기 수(필터 전): ${allRaw.length}건`);

  // stadium_name 대용으로 title 예시 20개
  console.log('[진단] title 예시 20개:', allRaw.slice(0, 20).map((item) => item.title));

  const gasanCount = allRaw.filter((item) => String(item.title || '').includes('가산')).length;
  const gangseoCount = allRaw.filter((item) => String(item.title || '').includes('강서')).length;
  const geumcheonCount = allRaw.filter((item) => String(item.title || '').includes('금천')).length;
  console.log(`[진단] "가산" 포함 경기 수: ${gasanCount}건`);
  console.log(`[진단] "강서" 포함 경기 수: ${gangseoCount}건`);
  console.log(`[진단] "금천" 포함 경기 수: ${geumcheonCount}건`);

  // 날짜 범위(오늘부터 14일) 안에 있는 것만 남깁니다.
  const inWindow = allRaw.filter((item) => {
    const d = String(item.schedule || '').slice(0, 10);
    return d >= start && d <= end;
  });
  console.log(`[진단] 날짜 범위(${start}~${end}) 안의 경기 수: ${inWindow.length}건`);

  let availableCount = 0;
  let hurryCount = 0;
  let fullCount = 0;
  const validRows = [];

  for (const item of inWindow) {
    const result = mapAndValidate(item);
    if (!result.ok) {
      console.warn(`[fetch-plab] 검증 실패로 제외: title=${item.title}, 사유=${result.reason}`);
      continue;
    }
    if (result.status === 'available') availableCount++;
    else if (result.status === 'hurry') hurryCount++;
    else if (result.status === 'full') fullCount++;

    if (result.status === 'full') continue; // full은 저장하지 않음
    validRows.push(result.row);
  }
  console.log(`[진단] available 수: ${availableCount}건`);
  console.log(`[진단] hurry 수: ${hurryCount}건`);
  console.log(`[진단] full(저장 제외) 수: ${fullCount}건`);

  // id 기준 중복 제거 (마지막 값 사용)
  const dedupedMap = new Map();
  validRows.forEach((row) => dedupedMap.set(row.id, row));
  const finalRows = Array.from(dedupedMap.values());
  console.log(`[진단] 최종 저장 대상 수: ${finalRows.length}건`);

  if (finalRows.length === 0) {
    console.error('최종 저장 대상이 0건이라 기존 데이터를 유지하고 작업을 중단합니다.');
    process.exitCode = 1;
    return;
  }

  const { error: upsertError } = await supabase.from(TABLE_NAME).upsert(finalRows, { onConflict: 'id' });
  if (upsertError) {
    console.error('[fetch-plab] upsert 실패:', upsertError.message);
    console.error('[fetch-plab] 저장하려던 첫 번째 행 예시:', JSON.stringify(finalRows[0]));
    process.exitCode = 1;
    return;
  }
  console.log(`[진단] upsert 완료 건수: ${finalRows.length}건`);

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
