// 플랩풋볼(Plabfootball) API에서 오늘 날짜의 경기 목록을 가져와 콘솔에 출력하는 테스트 스크립트입니다.
//
// - 이 스크립트는 GitHub Actions(workflow_dispatch로 수동 실행)에서만 사용됩니다.
// - 기존 공생관 웹앱(index.html / app.js / style.css)이나 Supabase와는 전혀 연결되지 않은
//   완전히 독립적인 테스트용 코드입니다. 지금은 데이터를 저장하거나 앱에 반영하지 않고,
//   응답이 정상적으로 오는지 로그로만 확인합니다.

function getTodayDateString() {
  // GitHub Actions 실행 서버는 기본적으로 UTC 시간대를 사용하므로,
  // 한국 시간(KST, UTC+9) 기준 "오늘"을 명시적으로 계산합니다.
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function fetchPlabMatches() {
  const date = getTodayDateString();
  const url = `https://social-admin.plabfootball.com/api/v2/match-explore/1/match/?date=${date}&page=1&type=region`;

  console.log(`[fetch-plab] 요청 날짜(KST 기준): ${date}`);
  console.log(`[fetch-plab] 요청 URL: ${url}`);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  console.log(`[fetch-plab] 응답 상태 코드: ${res.status}`);

  if (!res.ok) {
    const text = await res.text();
    console.error(`[fetch-plab] 요청 실패 (status ${res.status})`);
    console.error(text);
    process.exitCode = 1;
    return;
  }

  const data = await res.json();
  console.log('[fetch-plab] 응답 JSON 전체:');
  console.log(JSON.stringify(data, null, 2));
}

fetchPlabMatches().catch((err) => {
  console.error('[fetch-plab] 스크립트 실행 중 오류가 발생했습니다:');
  console.error(err);
  process.exitCode = 1;
});
