// 플랩풋볼(Plabfootball) API에서 오늘부터 14일간의 경기 목록을 가져와
// Supabase의 plab_matches 테이블에 upsert(id 기준 갱신/삽입)하는 스크립트입니다.
//
// - GitHub Actions에서만 실행됩니다 (workflow_dispatch 수동 실행).
// - 기존 공생관 웹앱(index.html / app.js / style.css)과는 전혀 연결되지 않은 별도 파이프라인입니다.
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY는 GitHub Secrets에서 환경변수로 전달받습니다.
//
// [API 및 필드 구조 요약 — 실제 응답을 직접 확인해 확정한 내용]
// - 엔드포인트: https://www.plabfootball.com/api/v3/social-matches/
//   (date, hide_soldout=1, area_id(여러 개 반복), page 파라미터 사용)
// - 응답 구조: { data: { count, next, previous, results: [...] } }
// - 각 경기 객체: id/time/title/badges는 최상위, schedule/format/participants/level 등은
//   전부 attributes 안에 있습니다 (item.attributes.schedule, item.attributes.participants.label 등).
// - hide_soldout=1로 이미 마감 경기는 응답에서 제외되어 오므로, badges에 hurry가 있으면 'hurry',
//   그 외에는 'available'로만 판단하면 됩니다.
// - data.next는 GitHub Actions 실행 환경에서 접속이 안 되는 social-backend.plabfootball.com을
//   가리켜서, 그 URL을 직접 호출하지 않고 "다음 페이지 존재 여부" 판단 용도로만 사용합니다.
//   실제 다음 페이지 요청은 항상 www.plabfootball.com에 page 번호만 올려서 직접 만듭니다.

const { createClient } = require('@supabase/supabase-js');
// Node.js 20에는 네이티브 WebSocket이 없어서, @supabase/supabase-js가 내부적으로 만드는
// Realtime 클라이언트가 생성 시점에 즉시 에러를 던집니다. 이 스크립트는 realtime(구독) 기능을
// 전혀 쓰지 않지만, createClient() 자체가 이 초기화를 피할 수 없어서 ws 패키지를 대신 꽂아줍니다.
const WebSocket = require('ws');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DAYS_TO_FETCH = 14;
const TABLE_NAME = 'plab_matches';
const MAX_PAGES_PER_DATE = 200; // 무한 루프 방지용 안전장치
const API_BASE = 'https://www.plabfootball.com/api/v3/social-matches/';

// 플랩 홈페이지 개발자도구에서 실제로 확인된 서울 지역 area_id 목록입니다. 추측으로 만든 값이
// 아니라 실제 Request URL에 포함되어 있던 값을 그대로 반영했습니다.
const SEOUL_AREA_IDS = [
  18, 138, 139, 58, 68, 88, 518, 135, 136, 137, 144, 78, 55, 148, 75,
  5, 6, 8, 51, 143, 38, 56, 100, 101, 140, 141, 142, 28, 133, 134,
];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[fetch-plab] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다.');
  console.error('[fetch-plab] GitHub Secrets에 두 값이 등록되어 있는지, 워크플로에서 env로 전달하고 있는지 확인해 주세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: WebSocket },
});

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

/* ---------- 특정 날짜·페이지의 요청 URL 생성 (area_id를 여러 번 append) ----------
   항상 www.plabfootball.com/api/v3/social-matches만 직접 호출합니다.
   ⚠️ response.data.next는 실행 환경(GitHub Actions)에서 접속이 안 되는
   social-backend.plabfootball.com 주소를 가리켜서 타임아웃이 났습니다.
   그래서 data.next의 URL을 그대로 따라가지 않고, "다음 페이지가 있는지" 판단 용도로만
   쓰고, 실제 요청은 항상 이 함수로 직접 만든 URL로 보냅니다. */
function buildPageUrl(date, page) {
  const params = new URLSearchParams();
  params.set('date', date);
  params.set('hide_soldout', '1');
  SEOUL_AREA_IDS.forEach((id) => {
    params.append('area_id', String(id));
  });
  params.set('page', String(page));
  return `${API_BASE}?${params.toString()}`;
}

/* ---------- 특정 날짜의 전체 페이지를 끝까지 조회 ----------
   매 페이지 항상 www.plabfootball.com을 직접 호출하고, page 번호만 1씩 증가시킵니다.
   data.next가 없거나(마지막 페이지) 이번 페이지 results가 0건이면 종료합니다. */
async function fetchAllPagesForDate(date) {
  const results = [];
  let pageNum = 1;
  let pageCount = 0;
  let gasanForDate = 0;

  while (true) {
    pageCount++;
    if (pageCount > MAX_PAGES_PER_DATE) {
      console.warn(`[fetch-plab] ${date}: 최대 페이지 수(${MAX_PAGES_PER_DATE})에 도달해 중단합니다.`);
      break;
    }

    const url = buildPageUrl(date, pageNum);
    console.log(`[진단] 전체 요청 URL: ${url}`);
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    console.log(`[진단] 응답 상태 코드: ${res.status}`);
    console.log(`[진단] 조회 날짜: ${date}`);
    console.log(`[진단] 페이지 번호: ${pageNum}`);

    if (!res.ok) {
      console.error(`[fetch-plab] ${date} 페이지 ${pageNum} 요청 실패 (status ${res.status})`);
      break;
    }

    const responseJson = await res.json();
    const data = responseJson.data;
    const pageResults = Array.isArray(data?.results) ? data.results : [];
    const next = data?.next;

    console.log(`[진단] 해당 페이지 results 개수: ${pageResults.length}`);
    console.log(`[진단] data.next 존재 여부: ${next ? '있음' : '없음'} (실제 next URL은 호출하지 않고 판단 용도로만 사용)`);

    const pageGasan = pageResults.filter((item) => String(item.title || '').includes('가산')).length;
    gasanForDate += pageGasan;

    results.push(...pageResults);

    // 다음 페이지 존재 여부는 data.next 유무와 results 개수 둘 다로 확인합니다.
    // (실제 next URL은 절대 호출하지 않고, 다음 페이지 번호로 직접 요청을 다시 만듭니다.)
    if (!next || pageResults.length === 0) break;
    pageNum++;

  }

  console.log(`[진단] ${date} "가산" 포함 경기 수: ${gasanForDate}건`);
  return results;
}

function toNullableNumber(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

/* ---------- badges에서 모집 상태 판단 ----------
   hide_soldout=1로 이미 마감(품절) 경기는 응답에서 제외되어 오므로, 여기서는
   hurry(마감임박) 여부만 판단하면 됩니다. 그 외는 전부 available(모집중)입니다. */
function getApplyStatus(item) {
  const badges = Array.isArray(item.badges) ? item.badges : [];
  const hasHurry = badges.some((b) => b && b.code === 'hurry');
  return hasHurry ? 'hurry' : 'available';
}

/* ---------- 검증 + 매핑 ----------
   실제 확인된 필드만 사용합니다:
   id, schedule, time, title(경기장명), attributes.format(경기 형식),
   attributes.participants.label("6/15" 형식 → 현재/정원), badges(모집 상태) */
function mapAndValidate(item) {
  const idNum = Number(item.id);
  if (item.id === undefined || item.id === null || Number.isNaN(idNum)) {
    return { ok: false, reason: 'id가 유효한 숫자가 아님' };
  }
  // ⚠️ 실제 원본 데이터를 확인한 결과, schedule은 최상위가 아니라 attributes 안에 있습니다.
  if (!item.attributes?.schedule) {
    return { ok: false, reason: 'attributes.schedule 없음' };
  }
  const matchDate = String(item.attributes.schedule).slice(0, 10);
  if (!matchDate) {
    return { ok: false, reason: 'match_date를 attributes.schedule에서 추출할 수 없음' };
  }
  if (!item.time) {
    return { ok: false, reason: 'time 없음' };
  }
  if (!item.title) {
    return { ok: false, reason: 'title(경기장명) 없음' };
  }

  // ⚠️ participants도 마찬가지로 attributes 안에 있습니다 (attributes.participants.label).
  const label = String(item.attributes?.participants?.label || '');
  const [currentText, maxText] = label.split('/');
  const confirmCount = toNullableNumber(currentText);
  const maxPlayerCnt = toNullableNumber(maxText);

  return {
    ok: true,
    row: {
      id: idNum,
      match_date: matchDate,
      match_time: item.time,
      stadium_name: item.title,
      match_url: `https://plabfootball.com/match/${item.id}`,
      apply_status: getApplyStatus(item),
      player_count: item.attributes?.format ?? null, // 계산하지 않고 원본 값(또는 null) 그대로 저장
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
  console.log(`[진단] 조회 대상 날짜 범위(참고용, 응답에서 이 범위만 필터링): ${startDate} ~ ${endDate}`);

  let allRaw = [];
  for (const date of dates) {
    const dayResults = await fetchAllPagesForDate(date);
    allRaw = allRaw.concat(dayResults);
  }
  console.log(`[진단] 전체 원본 경기 수(필터 전): ${allRaw.length}건`);

  // ⚠️ "가산" 경기가 이 필터 때문에 잘못 빠지는 건 아닌지 직접 확인할 수 있도록, 필터 전/후의
  // 가산 포함 경기 수를 각각 따로 찍습니다. 필터 후에도 숫자가 그대로면 안전하게 걸러진 것이고,
  // 필터 후에 숫자가 줄었다면(특히 0이 되었다면) area_group 값이 "서울"이 아닌 다른 표기일
  // 가능성이 높다는 뜻이라, 그 경우 이 필터를 걷어내거나 기준을 다시 잡아야 합니다.
  const gasanBeforeFilter = allRaw.filter((item) => String(item.title || '').includes('가산'));
  console.log(`[진단] "가산" 포함 경기 수 (서울 필터 적용 전): ${gasanBeforeFilter.length}건`);
  if (gasanBeforeFilter.length) {
    const gasanAreaGroups = [...new Set(gasanBeforeFilter.map((item) => item.attributes?.area_group))];
    console.log('[진단] "가산" 경기들의 실제 area_group 값:', gasanAreaGroups);
  }

  // ⚠️ area_id 파라미터만으로는 서울 외 지역(예: 경기 김포)이 섞여 들어오는 것이 실제로 확인됐습니다.
  // 실제 원본 데이터에서 확인된 attributes.area_group 필드("서울"/"경기"/"인천" 등)로
  // 서울 지역만 다시 한번 걸러냅니다.
  const seoulRaw = allRaw.filter((item) => String(item.attributes?.area_group || '').includes('서울'));
  console.log(`[진단] area_group="서울" 필터 후: ${seoulRaw.length}건 (제외됨: ${allRaw.length - seoulRaw.length}건)`);

  const totalGasan = seoulRaw.filter((item) => String(item.title || '').includes('가산')).length;
  console.log(`[진단] "가산" 포함 경기 수 (서울 필터 적용 후): ${totalGasan}건`);

  const validRows = [];
  for (const item of seoulRaw) {
    const result = mapAndValidate(item);
    if (!result.ok) {
      console.warn(`[fetch-plab] 검증 실패로 제외: id=${item.id}, 사유=${result.reason}`);
      continue;
    }
    validRows.push(result.row);
  }

  // id 기준 중복 제거 (마지막 값 사용)
  const dedupedMap = new Map();
  validRows.forEach((row) => dedupedMap.set(row.id, row));
  const finalRows = Array.from(dedupedMap.values());
  console.log(`[진단] 전체 최종 저장 대상 수: ${finalRows.length}건`);

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

  // ⚠️ upsert는 "이번에 새로 찾은 것만" 갱신/삽입할 뿐, 예전에 저장됐지만 이번 결과에는 없는
  // 행(예: 서울 필터를 넣기 전에 저장된 안양/전주 등 다른 지역 경기)은 그대로 남아있게 됩니다.
  // 그래서 오늘/미래 날짜인데 이번 실행 결과(finalRows)에 없는 기존 행을 추가로 찾아서 정리합니다.
  const { data: existingFutureRows, error: fetchExistingError } = await supabase
    .from(TABLE_NAME)
    .select('id')
    .gte('match_date', todayS);

  if (fetchExistingError) {
    console.error('[fetch-plab] 오늘/미래 기존 데이터 조회 실패:', fetchExistingError.message);
  } else {
    const finalIdSet = new Set(finalRows.map((r) => r.id));
    const staleIds = (existingFutureRows || [])
      .map((r) => r.id)
      .filter((id) => !finalIdSet.has(id));

    console.log(`[진단] 이번 결과에 없는(정리 대상) 기존 오늘/미래 데이터: ${staleIds.length}건`);

    if (staleIds.length) {
      // id가 너무 많으면 한 번에 지우기 부담스러우니 500개씩 나눠서 삭제합니다.
      const CHUNK_SIZE = 500;
      for (let i = 0; i < staleIds.length; i += CHUNK_SIZE) {
        const chunk = staleIds.slice(i, i + CHUNK_SIZE);
        const { error: staleDeleteError } = await supabase.from(TABLE_NAME).delete().in('id', chunk);
        if (staleDeleteError) {
          console.error('[fetch-plab] 정리 대상 삭제 실패:', staleDeleteError.message);
        }
      }
      console.log(`[fetch-plab] 정리 대상(이번 결과에 없던 기존 오늘/미래 데이터) ${staleIds.length}건 삭제 완료`);
    }
  }
}

main().catch((err) => {
  console.error('[fetch-plab] 스크립트 실행 중 오류가 발생했습니다:');
  console.error(err);
  process.exitCode = 1;
});
