const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DAYS_TO_FETCH = 14;
const TABLE_NAME = 'plab_matches';
const ALLOWED_STATUSES = new Set(['available', 'hurry']);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[fetch-plab] GitHub Secrets에 SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function getKstDateString(offsetDays = 0) {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() + offsetDays);
  return [
    kst.getUTCFullYear(),
    String(kst.getUTCMonth() + 1).padStart(2, '0'),
    String(kst.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function buildDateList() {
  return Array.from({ length: DAYS_TO_FETCH }, (_, i) => getKstDateString(i));
}

async function fetchAllPagesForDate(date) {
  const results = [];
  let url = `https://social-admin.plabfootball.com/api/v2/match-explore/1/match/?date=${date}&page=1&type=region`;
  let pageCount = 0;

  while (url) {
    pageCount += 1;

    if (pageCount > 200) {
      throw new Error(`${date}: 페이지 수가 200개를 초과해 안전상 중단했습니다.`);
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'gongsaengwan-plab-sync/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`${date} page ${pageCount}: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.results)) {
      throw new Error(`${date} page ${pageCount}: results 배열이 없습니다.`);
    }

    results.push(...data.results);
    url = data.next || null;
  }

  console.log(`[fetch-plab] ${date}: ${pageCount}페이지, ${results.length}건`);
  return results;
}

function isSeoulMatch(item) {
  // 실제 확인된 응답에는 별도 city 필드가 없고 stadium_name이 "서울 ..."로 시작합니다.
  return typeof item.stadium_name === 'string' &&
    item.stadium_name.trim().startsWith('서울');
}

function mapMatch(item) {
  const id = Number(item.id);
  const schedule = typeof item.schedule === 'string' ? item.schedule : '';
  const matchDate = schedule.slice(0, 10);
  const matchTime = item.time || schedule.slice(11, 16) || null;

  return {
    id,
    match_date: matchDate,
    match_time: matchTime,
    stadium_name: item.stadium_name,
    match_url: `https://plabfootball.com/match/${id}`,
    apply_status: item.apply_status,
    player_count: item.player_count ?? null,
    confirm_count: Number.isInteger(item.confirm_cnt) ? item.confirm_cnt : null,
    max_player_cnt: Number.isInteger(item.max_player_cnt) ? item.max_player_cnt : null,
    updated_at: new Date().toISOString(),
  };
}

function isValidRow(row) {
  return (
    Number.isInteger(row.id) &&
    row.id > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.match_date) &&
    typeof row.match_time === 'string' &&
    row.match_time.length > 0 &&
    typeof row.stadium_name === 'string' &&
    row.stadium_name.length > 0 &&
    typeof row.match_url === 'string' &&
    row.match_url.length > 0
  );
}

async function main() {
  const dates = buildDateList();
  console.log(`[fetch-plab] 조회 범위: ${dates[0]} ~ ${dates[dates.length - 1]}`);

  const rawMatches = [];
  for (const date of dates) {
    const matches = await fetchAllPagesForDate(date);
    rawMatches.push(...matches);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  const unknownStatuses = [...new Set(
    rawMatches
      .map((item) => item.apply_status)
      .filter((status) => status && !ALLOWED_STATUSES.has(status) && status !== 'full')
  )];

  if (unknownStatuses.length > 0) {
    console.warn('[fetch-plab] 확인이 필요한 상태값:', unknownStatuses.join(', '));
  }

  const mapped = rawMatches
    .filter(isSeoulMatch)
    .filter((item) => ALLOWED_STATUSES.has(item.apply_status))
    .map(mapMatch)
    .filter(isValidRow);

  const deduped = [...new Map(mapped.map((row) => [row.id, row])).values()];

  console.log(`[fetch-plab] 원본 ${rawMatches.length}건`);
  console.log(`[fetch-plab] 서울 + 모집 가능 + 필수값 검증 후 ${deduped.length}건`);

  // 비정상 수집 시 기존 정상 데이터를 지우지 않는 안전장치
  if (deduped.length === 0) {
    throw new Error('최종 저장 대상이 0건이라 기존 데이터를 유지하고 작업을 중단합니다.');
  }

  // 먼저 새 데이터를 upsert하여 저장 실패 시 기존 데이터가 유지되도록 합니다.
  const { error: upsertError } = await supabase
    .from(TABLE_NAME)
    .upsert(deduped, { onConflict: 'id' });

  if (upsertError) {
    throw new Error(`Supabase upsert 실패: ${upsertError.message}`);
  }

  console.log(`[fetch-plab] ${deduped.length}건 upsert 완료`);

  // 이번 조회기간 밖의 오래된 행만 정리합니다.
  const { error: cleanupError } = await supabase
    .from(TABLE_NAME)
    .delete()
    .lt('match_date', dates[0]);

  if (cleanupError) {
    throw new Error(`과거 데이터 정리 실패: ${cleanupError.message}`);
  }

  console.log('[fetch-plab] 과거 경기 정리 완료');
}

main().catch((error) => {
  console.error('[fetch-plab] 실패:', error);
  process.exit(1);
});
