/* ---------- Utilities ---------- */
const $ = (s)=>document.querySelector(s);

/* 파일을 더블클릭해서(file://) 직접 열면 지도 검색·서비스 워커·PWA 매니페스트가 동작하지 않습니다.
   원인을 바로 알 수 있도록 화면에 안내를 띄웁니다. */
if(location.protocol === 'file:'){
  console.warn('[공생관] file:// 로 열려 있습니다. 지도 검색, 서비스 워커, PWA 매니페스트 등은 http(s) 주소에서만 동작합니다. 로컬 서버(예: VS Code Live Server)나 실제 배포 주소로 열어주세요.');
  window.addEventListener('DOMContentLoaded', ()=>{
    const warnEl = document.createElement('div');
    warnEl.textContent = '⚠️ 지금 파일을 직접 열어서(file://) 보고 계십니다. 지도 검색 등 일부 기능은 로컬 서버나 실제 배포 주소(http/https)에서만 정상 동작합니다.';
    warnEl.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#ffb020;color:#1a1300;font-size:12px;font-weight:700;text-align:center;padding:8px 12px;';
    document.body.prepend(warnEl);
  });
}
const toastEl = $('#toast');
/* 구단 엠블럼: 로그인 화면 및 헤더 브랜드 마크에서 공통으로 사용 (assets/club-emblem.png 파일 참조) */
const CLUB_EMBLEM = './assets/club-emblem.png';
document.querySelectorAll('.club-emblem-img').forEach(img=>{ img.src = CLUB_EMBLEM; });

/* 로그인 화면: '입력 안내' 버튼으로 안내 문구 열기/닫기 */
(function(){
  const b = document.getElementById('loginHelpBtn'), n = document.getElementById('loginNote');
  if(!b || !n) return;
  const toggle = ()=>{ n.hidden = !n.hidden; };
  b.addEventListener('click', toggle);
  b.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); toggle(); } });
})();
function toast(msg){ toastEl.textContent = msg; toastEl.classList.add('show'); setTimeout(()=>toastEl.classList.remove('show'), 2200); }
function fmtDate(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function pad(n){ return String(n).padStart(2,'0'); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function kstNow(){ const now=new Date(); return new Date(now.getTime() + (9*60 + now.getTimezoneOffset())*60000); }
function getLocalName(){ try{ return localStorage.getItem('futsal-my-name'); }catch(e){ return null; } }
function setLocalName(name){ try{ localStorage.setItem('futsal-my-name', name); }catch(e){} }
function getLocalBirth(){ try{ return localStorage.getItem('futsal-my-birth'); }catch(e){ return null; } }
function setLocalBirth(b){ try{ localStorage.setItem('futsal-my-birth', b); }catch(e){} }
function getLocalCode(){ try{ return localStorage.getItem('futsal-my-code'); }catch(e){ return null; } }
function setLocalCode(code){ try{ localStorage.setItem('futsal-my-code', code); }catch(e){} }
function getLocalRememberPref(){ try{ const v = localStorage.getItem('futsal-remember-pref'); return v===null ? true : v==='1'; }catch(e){ return true; } }
function setLocalRememberPref(on){ try{ localStorage.setItem('futsal-remember-pref', on ? '1' : '0'); }catch(e){} }
function clearLocalLogin(){
  try{
    localStorage.removeItem('futsal-my-name');
    localStorage.removeItem('futsal-my-birth');
    localStorage.removeItem('futsal-my-code');
  }catch(e){}
}
/* 로그아웃은 "이 기기에서의 자동 로그인 세션"만 끝냅니다.
   "아이디 및 참석코드 저장"에 체크해 두었다면 그 값은 로그아웃 후에도 유지되어,
   다음 접속 시 아이디·참석코드 입력칸에 그대로 채워집니다(생일은 매번 다시 입력). */
function clearLoginSessionOnly(){
  try{ localStorage.removeItem('futsal-my-birth'); }catch(e){}
}

/* ---------- 명언 ---------- */
/* 출처가 확실한 유명 발언은 인물명을, 그렇지 않은 팀 응원 메시지는 인물명 없이 표시합니다. */
const SOCCER_QUOTES = [
  { text: '축구는 혼자 빛나는 경기가 아니라 함께 움직이는 경기다.', who: null },
  { text: '오늘의 패스 한 번이 내일의 승리를 만든다.', who: null },
  { text: '연습은 배신하지 않는다.', who: null },
  { text: '즐기지 못하면 오래 뛸 수 없다.', who: null },
  { text: '패배도 다음 경기를 위한 데이터일 뿐이다.', who: null },
  { text: '팀보다 위대한 개인은 없다.', who: '펠레' },
  { text: '중요한 건 승패가 아니라 어떻게 싸웠는가다.', who: '지네딘 지단' },
  { text: '나는 실수를 두려워하지 않는다, 그 안에서 배우기 때문이다.', who: '리오넬 메시' },
  { text: '재능은 노력이 뒷받침되지 않으면 오래가지 않는다.', who: '크리스티아누 호날두' },
  { text: '축구는 단순한 경기지만, 단순하게 하는 것이 가장 어렵다.', who: '요한 크루이프' },
  { text: '실수를 가장 적게 하는 팀이 결국 이긴다.', who: '요한 크루이프' },
  { text: '패배도 배움의 한 과정일 뿐이다.', who: '알렉스 퍼거슨' },
  { text: '자신을 믿지 않으면 아무도 나를 믿어주지 않는다.', who: '카카' },
  { text: '즐기지 못하는 순간, 최고가 될 수 없다.', who: '네이마르' },
  { text: '꿈을 위해 매일 조금씩이라도 나아가야 한다.', who: '손흥민' },
  { text: '노력은 배신하지 않는다.', who: '박지성' },
  { text: '공은 둥글고, 경기는 끝나봐야 안다.', who: '제프 헤르베르거' },
  { text: '오늘 흘린 땀이 다음 경기의 자신감이 된다.', who: null },
  { text: '작은 습관 하나가 팀 전체의 분위기를 바꾼다.', who: null },
  { text: '이기고 지는 것보다, 함께 뛰었다는 사실이 남는다.', who: null },
  { text: '준비된 사람에게만 기회가 보인다.', who: null },
  { text: '한 골보다 값진 건 끝까지 포기하지 않는 마음이다.', who: null },
];
function renderQuote(){
  const el = $('#quoteBar');
  if(!el) return;
  const q = SOCCER_QUOTES[Math.floor(Math.random()*SOCCER_QUOTES.length)];
  el.innerHTML = `“${escapeHtml(q.text)}”${q.who ? `<span class="who">— ${escapeHtml(q.who)}</span>` : ''}`;
}
renderQuote();

/* ---------- Login ---------- */
// TODO: 정식 배포 전 Supabase Auth 및 서버 측 권한 검증으로 이전 필요
const ACCESS_CODE = 'jb0309';
let myName = null;
let myBirth = null;

async function loginOrValidate(name, birth){
  const fresh = await remoteLoad();
  if(!fresh.members) fresh.members = {};
  const existing = fresh.members[name];
  const isAdminAccount = (name===ADMIN_NAME && birth===ADMIN_BIRTH);

  if(existing && existing.birth){
    if(existing.birth !== birth){
      return { ok:false, message:'비밀번호(생일)가 일치하지 않습니다.\n처음 등록한 생일을 입력해 주시기 바랍니다.' };
    }
    if(!existing.approved && !isAdminAccount){
      return { ok:false, pending:true, message:'관리자 승인 대기 중입니다.\n관리자가 승인하면 접속할 수 있습니다.' };
    }
  } else {
    // 신규 가입 신청: 관리자 계정이 아니면 바로 접속시키지 않고 승인 대기 상태로만 등록
    fresh.members[name] = { birth, status:'offline', approved: isAdminAccount, lastSeen: Date.now() };
    const savedNew = await remoteSave(fresh);
    if(!savedNew) return { ok:false, message:'서버 저장에 실패했습니다.\n네트워크 상태를 확인해 주시기 바랍니다.' };
    if(!isAdminAccount){
      return { ok:false, pending:true, message:'가입 신청이 접수되었습니다.\n관리자 승인 후 접속할 수 있습니다.' };
    }
  }
  fresh.members[name].status = 'online';
  fresh.members[name].lastSeen = Date.now();
  if(isAdminAccount) fresh.members[name].approved = true;
  const saved = await remoteSave(fresh);
  if(!saved) return { ok:false, message:'서버 저장에 실패했습니다.\n네트워크 상태를 확인해 주시기 바랍니다.' };
  return { ok:true, data: fresh };
}

async function initAppUI(){
  const now = new Date();
  viewYear = now.getFullYear(); viewMonth = now.getMonth();
  // ⚠️ favorite_venues 테이블이 아직 Supabase에 없거나 네트워크가 늦어도, 이 한 단계 때문에
  // 로그인 이후 화면 전체가 멈추면 안 되므로 이중으로 안전장치를 둡니다: try/catch + 시간 제한.
  try{
    await Promise.race([
      loadFavoriteVenues(),
      new Promise(resolve=>setTimeout(resolve, 3000)) // 3초 넘으면 그냥 넘어감
    ]);
  }catch(e){
    console.error('[즐겨찾기] 초기 로드 중 오류(무시하고 계속 진행):', e);
  }
  populateVenuePresetSelect();
  renderCalendar();
  renderMatchPanel();
  renderMemberList();
  loadWeather();
  computeAttendanceStats();
  renderMatchStats();
  updateAdminVisibility();
  updateNotifyBanner();
  loadDefaultMapVenue();
  renderMyInjuryPanel();
  initMatchesTabOnce();
}

/* 부상 설정은 관리자뿐 아니라 로그인한 본인도 스스로 할 수 있습니다. */
function renderMyInjuryPanel(){
  const statusText = $('#myInjuryStatusText');
  if(!statusText || !myName) return;
  const m = appData.members && appData.members[myName];
  if(m && isCurrentlyInjured(myName)){
    statusText.textContent = `현재 부상 중입니다 (복귀 예정일: ${m.injuryEnd}).`;
  } else if(m && m.injuryStart && m.injuryEnd){
    statusText.textContent = `등록된 부상 기간: ${m.injuryStart} ~ ${m.injuryEnd} (지금은 해당하지 않습니다)`;
  } else {
    statusText.textContent = '현재 등록된 부상 기간이 없습니다.';
  }
  const startInput = $('#myInjuryStartInput');
  const endInput = $('#myInjuryEndInput');
  if(startInput) startInput.value = (m && m.injuryStart) || '';
  if(endInput) endInput.value = (m && m.injuryEnd) || '';
}
const myInjuryToggleBtn = $('#myInjuryToggleBtn');
if(myInjuryToggleBtn) myInjuryToggleBtn.addEventListener('click', ()=>{
  const panel = $('#myInjuryPanel');
  if(!panel) return;
  const show = panel.style.display === 'none';
  panel.style.display = show ? 'block' : 'none';
  if(show) renderMyInjuryPanel();
});
const myInjurySaveBtn = $('#myInjurySaveBtn');
if(myInjurySaveBtn) myInjurySaveBtn.addEventListener('click', async ()=>{
  const start = $('#myInjuryStartInput').value;
  const end = $('#myInjuryEndInput').value;
  if(!start || !end){ toast('시작일과 종료일을 모두 선택해 주시기 바랍니다.'); return; }
  if(end < start){ toast('종료일이 시작일보다 빠를 수 없습니다.'); return; }
  await setInjuryPeriod(myName, start, end);
  renderMyInjuryPanel();
  toast('부상 기간을 등록했습니다. 해당 기간 동안 투표와 순위 집계에서 제외됩니다.');
});
const myInjuryClearBtn = $('#myInjuryClearBtn');
if(myInjuryClearBtn) myInjuryClearBtn.addEventListener('click', async ()=>{
  await setInjuryPeriod(myName, '', '');
  renderMyInjuryPanel();
  toast('부상 상태를 해제했습니다.');
});

/* 관리자 도구의 "지금 새로고침" 버튼: 페이지를 다시 불러오지 않고 Supabase의 최신 데이터를 가져와 화면을 갱신합니다.
   웹/모바일 브라우저는 물론, 홈 화면에 추가해서 실행한 경우에도 동일하게 동작합니다. */
async function refreshAllData(){
  const btn = $('#adminRefreshBtn');
  const statusEl = $('#adminRefreshStatus');
  if(btn) btn.disabled = true;
  if(statusEl){ statusEl.style.color = 'var(--muted)'; statusEl.textContent = '불러오는 중...'; }
  try{
    appData = await remoteLoad();
    renderCalendar();
    renderMemberList();
    computeAttendanceStats();
    renderMatchStats();
    updateAdminVisibility();
    if(selectedDate) await renderMatchPanel();
    if(statusEl){ statusEl.style.color = 'var(--pitch)'; statusEl.textContent = '최신 데이터로 갱신했습니다 (' + new Date().toLocaleTimeString('ko-KR') + ')'; }
    toast('최신 데이터로 새로고침했습니다.');
  }catch(e){
    console.error(e);
    if(statusEl){ statusEl.style.color = 'var(--danger)'; statusEl.textContent = '새로고침에 실패했습니다. 네트워크 상태를 확인해 주시기 바랍니다.'; }
  }finally{
    if(btn) btn.disabled = false;
  }
}
const adminRefreshBtn = $('#adminRefreshBtn');
if(adminRefreshBtn) adminRefreshBtn.addEventListener('click', refreshAllData);

$('#loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const errEl = $('#loginError');
  errEl.textContent = '';
  const id = $('#loginId').value.trim();
  const pw = $('#loginPw').value.trim();
  const code = $('#loginAccessCode').value;
  if(!id){ errEl.textContent = '이름을 입력해 주시기 바랍니다.'; return; }
  if(!/^[0-9]{6}$/.test(pw)){ errEl.textContent = '비밀번호는 숫자 6자리(생일, 예: 990101)여야 합니다.'; return; }
  if(code !== ACCESS_CODE){ errEl.textContent = '참석코드가 올바르지 않습니다.'; return; }

  const submitBtn = $('#loginForm button[type="submit"]');
  submitBtn.disabled = true; submitBtn.innerHTML = '확인 중...';
  const result = await loginOrValidate(id, pw);
  submitBtn.disabled = false; submitBtn.innerHTML = '입장하기 <span class="arrow">→</span>';

  if(!result.ok){
    errEl.textContent = result.message;
    errEl.style.color = result.pending ? 'var(--amber)' : 'var(--danger)';
    return;
  }
  errEl.style.color = 'var(--danger)';

  myName = id;
  myBirth = pw;
  appData = result.data;
  const rememberId = $('#rememberIdChk').checked;
  setLocalRememberPref(rememberId);
  if(rememberId){
    setLocalName(myName);
    setLocalBirth(myBirth);
    setLocalCode(code);
  } else {
    clearLocalLogin();
  }
  $('#nameTag').textContent = myName;
  $('#birthTag').textContent = `(${myBirth})`;
  $('#adminBadge').style.display = isAdmin() ? 'inline-block' : 'none';
  $('#loginOverlay').classList.add('hidden');
  renderQuote();
  await initAppUI();
});

/* ================= WEATHER (Open-Meteo, 캐시+5초 이내 표시) ================= */
const WEATHER_LAT = 37.5665, WEATHER_LNG = 126.9780;
const WEATHER_CACHE_KEY = 'futsal-weather-cache-v2';
const WEATHER_CACHE_TTL = 30*60*1000; // 30분
const WEATHER_FETCH_TIMEOUT = 4500;   // 4.5초
const weekdayKR = ['일','월','화','수','목','금','토'];

async function fetchWithTimeout(url, ms){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), ms);
  try{ return await fetch(url, {signal: controller.signal}); }
  finally{ clearTimeout(timer); }
}

function weatherIconFromCode(code){
  if(code===0) return '☀️';
  if([1,2].includes(code)) return '🌤️';
  if(code===3) return '☁️';
  if([45,48].includes(code)) return '🌫️';
  if([51,53,55,56,57].includes(code)) return '🌦️';
  if([61,63,65,66,67,80,81,82].includes(code)) return '🌧️';
  if([71,73,75,77,85,86].includes(code)) return '🌨️';
  if([95,96,99].includes(code)) return '⛈️';
  return '🌡️';
}

function getWeatherCache(ignoreTtl){
  try{
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(!ignoreTtl && (Date.now() - obj.ts > WEATHER_CACHE_TTL)) return null;
    return obj;
  }catch(e){ return null; }
}
function saveWeatherCache(data){
  try{ localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); }catch(e){}
}
function setWeatherBadge(state){
  const el = $('#weatherBadge');
  if(!el) return;
  el.textContent = state;
  el.className = 'weather-badge '+state;
}

let weekData = { thisWeek: [], nextWeek: [] };
let hourlyToday = [];

function buildWeekDataFromOpenMeteo(json){
  const daily = json.daily, hourly = json.hourly;
  const win = (appData.matchTimeWindow) || { startHour:19, endHour:21 };

  // 시간별 데이터를 날짜별로 정리
  const hourlyByDate = {};
  for(let i=0;i<hourly.time.length;i++){
    const t = hourly.time[i];
    const dPart = t.slice(0,10).replace(/-/g,'');
    const hPart = parseInt(t.slice(11,13));
    if(!hourlyByDate[dPart]) hourlyByDate[dPart] = [];
    hourlyByDate[dPart].push({
      hour: hPart,
      pop: hourly.precipitation_probability[i]||0,
      rain: hourly.precipitation[i]||0,
      snow: hourly.snowfall ? (hourly.snowfall[i]||0) : 0,
      code: hourly.weathercode ? hourly.weathercode[i] : null
    });
  }
  /* 오전(0~11시)/오후(12~23시) 구간에서 대표 시각(오전 9시, 오후 3시)에 가장 가까운 시간의 날씨 코드를 대표값으로 사용 */
  function pickRepCode(hrs, targetHour, fallback){
    if(!hrs.length) return fallback;
    let best = hrs[0];
    hrs.forEach(h=>{ if(Math.abs(h.hour-targetHour) < Math.abs(best.hour-targetHour)) best = h; });
    return best.code!=null ? best.code : fallback;
  }

  const days = daily.time.map((dateStr,i)=>{
    const dkey = dateStr.replace(/-/g,'');
    const hrs = (hourlyByDate[dkey]||[]).filter(h=>h.hour>=win.startHour && h.hour<=win.endHour);
    const matchPop = hrs.length ? Math.max(...hrs.map(h=>h.pop)) : (daily.precipitation_probability_max[i]||0);
    const matchRain = hrs.length ? hrs.reduce((s,h)=>s+h.rain,0) : (daily.precipitation_sum ? daily.precipitation_sum[i]||0 : 0);
    const matchSnow = hrs.length ? hrs.reduce((s,h)=>s+h.snow,0) : (daily.snowfall_sum ? daily.snowfall_sum[i]||0 : 0);

    const amHrs = (hourlyByDate[dkey]||[]).filter(h=>h.hour>=0 && h.hour<12);
    const pmHrs = (hourlyByDate[dkey]||[]).filter(h=>h.hour>=12 && h.hour<24);
    const amPop = amHrs.length ? Math.max(...amHrs.map(h=>h.pop)) : 0;
    const pmPop = pmHrs.length ? Math.max(...pmHrs.map(h=>h.pop)) : 0;
    const amCode = pickRepCode(amHrs, 9, daily.weathercode[i]);
    const pmCode = pickRepCode(pmHrs, 15, daily.weathercode[i]);

    return {
      date: dkey,
      tmax: daily.temperature_2m_max[i],
      tmin: daily.temperature_2m_min[i],
      pop: daily.precipitation_probability_max[i]||0,
      rain: daily.precipitation_sum ? (daily.precipitation_sum[i]||0) : 0,
      snow: daily.snowfall_sum ? (daily.snowfall_sum[i]||0) : 0,
      code: daily.weathercode[i],
      amPop, pmPop, amCode, pmCode,
      matchPop: Math.round(matchPop),
      matchRain: Math.round(matchRain*10)/10,
      matchSnow: Math.round(matchSnow*10)/10,
      matchWindow: `${win.startHour}~${win.endHour}시`
    };
  });
  const thisWeek = days.slice(0,7);
  const nextWeek = days.slice(7,14);

  const now = kstNow();
  const nowH = now.getHours();
  const todayStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
  const hourly12 = [];
  for(let i=0;i<hourly.time.length;i++){
    const t = hourly.time[i]; // "2026-07-21T14:00"
    const dPart = t.slice(0,10).replace(/-/g,'');
    const hPart = parseInt(t.slice(11,13));
    if(dPart===todayStr && hPart>=nowH){
      hourly12.push({ time: pad(hPart)+'00', pop: hourly.precipitation_probability[i]||0, rn: hourly.precipitation[i]||0 });
      if(hourly12.length>=12) break;
    }
  }
  return { thisWeek, nextWeek, hourly: hourly12 };
}

function applyWeatherData(built, badge){
  weekData.thisWeek = built.thisWeek;
  weekData.nextWeek = built.nextWeek;
  hourlyToday = built.hourly;
  renderWeekStrip($('#tabNext').classList.contains('active') ? 'nextWeek' : 'thisWeek');
  renderHourly();
  setWeatherBadge(badge);
  if(badge==='LIVE'){
    $('#weatherStatus').textContent = 'Open-Meteo 실시간 데이터 · 방금 새로고침됨';
  } else if(badge==='CACHE'){
    $('#weatherStatus').textContent = '최신 데이터를 불러오지 못해 저장된 날씨를 표시 중입니다.';
  }
}

async function fetchOpenMeteo(){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LNG}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,snowfall_sum&hourly=precipitation_probability,precipitation,snowfall,weathercode&timezone=Asia%2FSeoul&forecast_days=14`;
  const res = await fetchWithTimeout(url, WEATHER_FETCH_TIMEOUT);
  if(!res.ok) throw new Error('네트워크 오류 ('+res.status+')');
  return await res.json();
}

/* ================= 기상청(KMA) 단기예보 연동 =================
   Open-Meteo는 해외 예보 모델이라 실제 기상청 수치와 다를 수 있습니다.
   관리자가 data.go.kr에서 발급받은 API 키를 등록하면, 오늘~모레(단기예보 제공 범위)는
   실제 기상청 데이터로 대체하고, 그 이후 날짜는 Open-Meteo로 보완합니다. */
const KMA_NX = 60, KMA_NY = 127; // 서울(중구 인근) 격자좌표

function getKmaBaseDateTime(){
  const now = kstNow();
  const times = [2,5,8,11,14,17,20,23];
  const h = now.getHours(), m = now.getMinutes();
  let chosen = null;
  for(let i=times.length-1;i>=0;i--){
    if(h>times[i] || (h===times[i] && m>=15)){ chosen = times[i]; break; }
  }
  const baseDate = new Date(now);
  if(chosen===null){ chosen = 23; baseDate.setDate(baseDate.getDate()-1); }
  return { base_date: `${baseDate.getFullYear()}${pad(baseDate.getMonth()+1)}${pad(baseDate.getDate())}`, base_time: `${pad(chosen)}00` };
}
function parsePcpToMm(str){
  if(!str || str==='강수없음') return 0;
  if(str.includes('mm 미만')) return 0.5;
  if(str.includes('mm 이상')){ const v=parseFloat(str); return isNaN(v)?30:v; }
  const m = str.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}
function parseSnoToCm(str){
  if(!str || str==='적설없음') return 0;
  if(str.includes('cm 미만')) return 0.5;
  if(str.includes('cm 이상')){ const v=parseFloat(str); return isNaN(v)?5:v; }
  const m = str.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}
function kmaToWmoCode(sky, pty){
  const p = String(pty);
  if(p==='1') return 61;      // 비
  if(p==='2') return 66;      // 비/눈
  if(p==='3') return 71;      // 눈
  if(p==='4') return 80;      // 소나기
  if(p==='5'||p==='6'||p==='7') return 71;
  const s = String(sky);
  if(s==='1') return 0;  // 맑음
  if(s==='3') return 2;  // 구름많음
  if(s==='4') return 3;  // 흐림
  return 1;
}
async function fetchKmaVilageFcst(apiKey){
  const {base_date, base_time} = getKmaBaseDateTime();
  const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${encodeURIComponent(apiKey)}&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${KMA_NX}&ny=${KMA_NY}`;
  const res = await fetchWithTimeout(url, WEATHER_FETCH_TIMEOUT);
  if(!res.ok) throw new Error('기상청 네트워크 오류 ('+res.status+')');
  const json = await res.json();
  const header = json.response && json.response.header;
  if(!header || header.resultCode !== '00') throw new Error((header&&header.resultMsg) || '기상청 응답 오류');
  const items = json.response.body && json.response.body.items && json.response.body.items.item;
  if(!items || !items.length) throw new Error('기상청 예보 데이터가 비어 있습니다');
  return items;
}
/* KMA 단기예보 원자료를 이 앱의 공통 일별 데이터 구조(Open-Meteo와 동일한 형태)로 변환합니다. */
function buildKmaDays(items, win){
  const byDate = {};
  items.forEach(it=>{
    if(!byDate[it.fcstDate]) byDate[it.fcstDate] = { slots:{}, tmx:null, tmn:null };
    if(!byDate[it.fcstDate].slots[it.fcstTime]) byDate[it.fcstDate].slots[it.fcstTime] = {};
    byDate[it.fcstDate].slots[it.fcstTime][it.category] = it.fcstValue;
    if(it.category==='TMX') byDate[it.fcstDate].tmx = parseFloat(it.fcstValue);
    if(it.category==='TMN') byDate[it.fcstDate].tmn = parseFloat(it.fcstValue);
  });
  const dateKeys = Object.keys(byDate).sort();
  return dateKeys.map(dkey=>{
    const entry = byDate[dkey];
    const slotHours = Object.keys(entry.slots).map(t=>{
      const s = entry.slots[t];
      return {
        hour: parseInt(t.slice(0,2),10),
        pop: s.POP!=null ? parseInt(s.POP,10) : 0,
        rain: parsePcpToMm(s.PCP),
        snow: parseSnoToCm(s.SNO),
        code: kmaToWmoCode(s.SKY, s.PTY),
        tmp: s.TMP!=null ? parseFloat(s.TMP) : null
      };
    }).sort((a,b)=>a.hour-b.hour);

    const tmps = slotHours.filter(h=>h.tmp!=null).map(h=>h.tmp);
    const tmax = entry.tmx!=null ? entry.tmx : (tmps.length?Math.max(...tmps):null);
    const tmin = entry.tmn!=null ? entry.tmn : (tmps.length?Math.min(...tmps):null);

    const winHrs = slotHours.filter(h=>h.hour>=win.startHour && h.hour<=win.endHour);
    const matchPop = winHrs.length ? Math.max(...winHrs.map(h=>h.pop)) : (slotHours.length?Math.max(...slotHours.map(h=>h.pop)):0);
    const matchRain = winHrs.length ? winHrs.reduce((s,h)=>s+h.rain,0) : 0;
    const matchSnow = winHrs.length ? winHrs.reduce((s,h)=>s+h.snow,0) : 0;

    const amHrs = slotHours.filter(h=>h.hour>=0 && h.hour<12);
    const pmHrs = slotHours.filter(h=>h.hour>=12 && h.hour<24);
    const amPop = amHrs.length ? Math.max(...amHrs.map(h=>h.pop)) : 0;
    const pmPop = pmHrs.length ? Math.max(...pmHrs.map(h=>h.pop)) : 0;
    const dayPop = slotHours.length ? Math.max(...slotHours.map(h=>h.pop)) : 0;
    const dayCode = winHrs.length ? winHrs[0].code : (slotHours.length ? slotHours[Math.floor(slotHours.length/2)].code : 1);
    const pick = (hrs, target)=>{
      if(!hrs.length) return dayCode;
      let best = hrs[0];
      hrs.forEach(h=>{ if(Math.abs(h.hour-target)<Math.abs(best.hour-target)) best = h; });
      return best.code;
    };

    return {
      date: dkey,
      tmax, tmin,
      pop: dayPop,
      rain: slotHours.reduce((s,h)=>s+h.rain,0),
      snow: slotHours.reduce((s,h)=>s+h.snow,0),
      code: dayCode,
      amPop, pmPop,
      amCode: pick(amHrs, 9),
      pmCode: pick(pmHrs, 15),
      matchPop: Math.round(matchPop),
      matchRain: Math.round(matchRain*10)/10,
      matchSnow: Math.round(matchSnow*10)/10,
      matchWindow: `${win.startHour}~${win.endHour}시`,
      source: 'kma'
    };
  });
}

async function loadWeather(){
  const btn = $('#weatherRefresh');
  btn.classList.add('spinning');

  // 1) 유효한 캐시가 있으면 네트워크보다 먼저 즉시 표시
  const validCache = getWeatherCache(false);
  if(validCache){
    applyWeatherData(buildWeekDataFromOpenMeteo(validCache.data), 'CACHE');
  } else {
    setWeatherBadge('LOADING');
    $('#weatherStatus').textContent = '날씨 데이터를 불러오는 중...';
  }

  // 2) 백그라운드에서 최신 데이터 요청 (최대 4.5초)
  let kmaDays = null, kmaError = null;
  // TODO: 정식 배포 전 Supabase Auth 및 서버 측 권한 검증으로 이전 필요 (API 키가 클라이언트에 노출됨)
  const KMA_DEFAULT_KEY = 'dc7cef750ae468f35bc3d71e59817d0cc938b4c8acd3cd798ad9d06eda94079b';
  const apiKey = appData.kmaApiKey || KMA_DEFAULT_KEY;
  if(apiKey){
    try{
      const win = (appData.matchTimeWindow) || { startHour:19, endHour:21 };
      const items = await fetchKmaVilageFcst(apiKey);
      kmaDays = buildKmaDays(items, win);
    }catch(e){
      console.error('KMA fetch failed', e);
      kmaError = e;
    }
  }

  try{
    const json = await fetchOpenMeteo();
    saveWeatherCache(json);
    const built = buildWeekDataFromOpenMeteo(json);
    if(kmaDays && kmaDays.length){
      // 기상청 데이터가 있는 날짜는 Open-Meteo 대신 기상청 값으로 교체
      const kmaByDate = {}; kmaDays.forEach(d=>{ kmaByDate[d.date]=d; });
      built.thisWeek = built.thisWeek.map(d=> kmaByDate[d.date] || d);
      built.nextWeek = built.nextWeek.map(d=> kmaByDate[d.date] || d);
    }
    applyWeatherData(built, 'LIVE');
    if(kmaDays && kmaDays.length){
      $('#weatherStatus').textContent = `기상청 실시간 데이터(오늘~모레) + Open-Meteo 보완 · 방금 새로고침됨`;
    } else if(apiKey && kmaError){
      $('#weatherStatus').textContent = `기상청 데이터를 불러오지 못해 Open-Meteo로 표시 중입니다 (${kmaError.message||'오류'})`;
    }
  }catch(e){
    console.error(e);
    const anyCache = getWeatherCache(true); // 만료되었어도 마지막 정상 데이터 사용
    if(anyCache){
      applyWeatherData(buildWeekDataFromOpenMeteo(anyCache.data), 'CACHE');
    } else {
      setWeatherBadge('ERROR');
      $('#weatherStatus').textContent = '날씨 데이터를 불러올 수 없습니다. 잠시 후 새로고침을 눌러 주시기 바랍니다.';
      renderWeekStrip('thisWeek');
      renderHourly();
    }
  }
  btn.classList.remove('spinning');
}
/* 경기 가능 여부 판정 기준 (공식 기준은 아니고, 실외 풋살 기준으로 임의로 정한 값입니다. 필요하면 조정 가능)
   하루 전체가 아니라 실제 경기가 열리는 시간대(기본 19~21시, 관리자 도구에서 변경 가능)의 강수·강설만 따집니다.
   - 낙뢰 코드(95/96/99) 또는 해당 시간대 강설 3cm 이상 또는 강수 10mm 이상 → 경기 불가/실내 추천
   - 그 외 해당 시간대 강설이 조금이라도 있거나 강수 1mm 이상 → 눈/비 맞으면서 가능
   - 흐림·박무 계열(2,3,45,48) → 흐리지만 가능
   - 그 외(맑음) → 무조건 가능 */
function computePlayability(d){
  const rain = Math.round((d.matchRain!=null ? d.matchRain : d.rain||0)*10)/10;
  const snow = Math.round((d.matchSnow!=null ? d.matchSnow : d.snow||0)*10)/10;
  const pop = d.matchPop!=null ? d.matchPop : d.pop||0;
  const win = d.matchWindow || '';
  const code = d.code;
  const isThunder = [95,96,99].includes(code);
  if(isThunder || snow>=3 || rain>=10){
    return { level:'no', icon:'🚫⛈️', label:'경기 불가 또는 실내구장 추천', detail:`${win} 강수확률 ${pop}% · 예상 강수량 ${rain}mm · 강설량 ${snow}cm` };
  }
  if(snow>0 || rain>=1){
    return { level:'wet', icon:'🥶🌧️', label:'눈/비 맞으면서 가능', detail:`${win} 강수확률 ${pop}% · 예상 강수량 ${rain}mm · 강설량 ${snow}cm` };
  }
  if([2,3,45,48].includes(code)){
    return { level:'cloudy', icon:'🙂⛅', label:'흐리지만 가능', detail:`${win} 강수확률 ${pop}% · 예상 강수량 ${rain}mm` };
  }
  return { level:'good', icon:'😎☀️', label:'무조건 가능', detail:`${win} 강수확률 ${pop}% · 예상 강수량 ${rain}mm` };
}
function showDayVerdict(d){
  const el = $('#dayVerdict');
  if(!el) return;
  const v = computePlayability(d);
  const dateObj = new Date(d.date.slice(0,4), d.date.slice(4,6)-1, d.date.slice(6,8));
  el.style.display = 'flex';
  el.className = 'day-verdict level-'+v.level;
  el.innerHTML = `
    <div class="dv-icon">${v.icon}</div>
    <div class="dv-text">
      <div class="dv-date">${dateObj.getMonth()+1}월 ${dateObj.getDate()}일 (${weekdayKR[dateObj.getDay()]}) 경기 가능 여부</div>
      <div class="dv-label">${v.label}</div>
      <div class="dv-detail">${v.detail} · 자체 기준 예측이니 참고용으로만 확인하시기 바랍니다</div>
    </div>
  `;
}
function renderWeekStrip(which){
  const strip = $('#weekStrip');
  strip.innerHTML='';
  $('#dayVerdict').style.display = 'none';
  const todayStr = `${kstNow().getFullYear()}${pad(kstNow().getMonth()+1)}${pad(kstNow().getDate())}`;
  const list = weekData[which];
  if(!list || !list.length){ strip.innerHTML = '<div style="grid-column:1/-1;color:var(--muted);font-size:13px;text-align:center;padding:20px;">데이터가 없습니다.</div>'; return; }
  list.forEach(d=>{
    const dateObj = new Date(d.date.slice(0,4), d.date.slice(4,6)-1, d.date.slice(6,8));
    const isToday = d.date===todayStr;
    const amIcon = weatherIconFromCode(d.amCode!=null?d.amCode:d.code);
    const pmIcon = weatherIconFromCode(d.pmCode!=null?d.pmCode:d.code);
    const div = document.createElement('div');
    div.className = 'day-chip'+(isToday?' today':'');
    div.innerHTML = `
      <div class="dow">${isToday?'오늘':weekdayKR[dateObj.getDay()]}</div>
      <div class="ddate">${dateObj.getMonth()+1}.${dateObj.getDate()}</div>
      <div class="ampm-row">
        <div class="ampm-col"><span class="ampm-label">오전</span><span class="ampm-ico">${amIcon}</span><span class="ampm-pop">${d.amPop||0}%</span></div>
        <div class="ampm-col"><span class="ampm-label">오후</span><span class="ampm-ico">${pmIcon}</span><span class="ampm-pop">${d.pmPop||0}%</span></div>
      </div>
      <div class="temps"><span class="max">${isFinite(d.tmax)?Math.round(d.tmax):'-'}°</span> <span class="min">${isFinite(d.tmin)?Math.round(d.tmin):'-'}°</span></div>
    `;
    div.addEventListener('click', ()=>showDayVerdict(d));
    strip.appendChild(div);
  });
}
function renderHourly(){
  const hourly = $('#hourlyRow');
  hourly.innerHTML='';
  if(!hourlyToday.length){ hourly.innerHTML = '<div style="color:var(--muted);font-size:12px;">오늘 남은 시간대의 예보 데이터가 없습니다.</div>'; return; }
  hourlyToday.forEach(h=>{
    const cell = document.createElement('div');
    cell.className='hour-cell';
    cell.innerHTML = `<div class="t">${h.time.slice(0,2)}시</div><div class="p">${h.pop}%</div><div class="mm">${h.rn}mm</div>`;
    hourly.appendChild(cell);
  });
}
$('#tabThis').addEventListener('click', ()=>{ $('#tabThis').classList.add('active'); $('#tabNext').classList.remove('active'); renderWeekStrip('thisWeek'); });
$('#tabNext').addEventListener('click', ()=>{ $('#tabNext').classList.add('active'); $('#tabThis').classList.remove('active'); renderWeekStrip('nextWeek'); });
$('#weatherRefresh').addEventListener('click', loadWeather);

/* ================= 공유 데이터 저장소 (Supabase) ================= */
// TODO: 정식 배포 전 Supabase Auth 및 RLS(행 단위 보안)를 도입해 지금의 "누구나 읽기/쓰기 가능" 정책을 좁혀야 함
const SUPABASE_URL = 'https://ootiqpypoqttjiqjhkio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GY9qgB0wVnh2YmYWO9qrTA_OK-chx5W';
const supabaseClient = (typeof supabase !== 'undefined') ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const SUPABASE_ROW_ID = 1; // app_state 테이블의 고정 행(row) id — 팀 전체가 공유하는 데이터 한 덩어리

function emptyAppData(){ return { venues:{}, votedDates:[], votes:{}, members:{}, weekAvailability:{}, weekAbsence:{}, weekOverride:{}, actualAttendance:{}, matchGuests:{}, excludedWeeks:[], statAdjustments:{}, matchTimeWindow:{startHour:19,endHour:21}, kakaoJsKey:'', notice:{title:'',body:'',updatedAt:null}, kmaApiKey:'' }; }
let appData = emptyAppData();

async function remoteLoad(){
  try{
    if(!supabaseClient) throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    const { data, error } = await supabaseClient
      .from('app_state')
      .select('data')
      .eq('id', SUPABASE_ROW_ID)
      .single();
    if(error) throw error;
    const record = (data && data.data) || {};
    return {
      venues: record.venues||{},
      votedDates: record.votedDates||[],
      votes: record.votes||{},
      members: record.members||{},
      weekAvailability: record.weekAvailability||{},
      weekAbsence: record.weekAbsence||{},
      weekOverride: record.weekOverride||{},
      actualAttendance: record.actualAttendance||{},
      notice: record.notice || {title:'',body:'',updatedAt:null},
      kmaApiKey: record.kmaApiKey || '',
      matchGuests: record.matchGuests || {},
      excludedWeeks: record.excludedWeeks || [],
      statAdjustments: record.statAdjustments || {},
      matchTimeWindow: record.matchTimeWindow||{startHour:19,endHour:21},
      kakaoJsKey: record.kakaoJsKey || ''
    };
  }catch(e){
    console.error('remoteLoad 실패', e);
    toast('공유 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주시기 바랍니다.');
    return emptyAppData();
  }
}
async function remoteSave(data){
  try{
    if(!supabaseClient) throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    const { error } = await supabaseClient
      .from('app_state')
      .update({ data: data, updated_at: new Date().toISOString() })
      .eq('id', SUPABASE_ROW_ID);
    if(error) throw error;
    return true;
  }catch(e){
    console.error('remoteSave 실패', e);
    toast('저장에 실패했습니다. 네트워크 상태를 확인해 주시기 바랍니다.');
    return false;
  }
}
/* 저장 직전에 항상 최신 데이터를 다시 받아서 병합 → 다른 팀원의 변경을 덮어쓰지 않도록 함 */
async function mutateAppData(mutator){
  const fresh = await remoteLoad();
  mutator(fresh);
  const ok = await remoteSave(fresh);
  if(ok) appData = fresh;
  return fresh;
}
async function loadAppData(){ appData = await remoteLoad(); }

/* ================= CALENDAR & VOTES ================= */
let viewYear, viewMonth;
let selectedDate = todayStr(); // 출석 탭을 열면 이번 주 투표 화면이 바로 보이도록 오늘을 기본 선택
let adminAttendanceEditDate = null; // 관리자가 현재 "실제 참석"을 편집 중인 날짜
let map = null, marker = null;

function parseYMD(str){
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}
function todayStr(){ return fmtDate(new Date()); }

/* 모든 날짜 변경(캘린더 클릭·이전/오늘/다음 버튼)이 이 함수를 통해서만 상태를 바꿉니다. */
async function setSelectedDate(dateStr){
  selectedDate = dateStr;
  syncCalendarWithDate(dateStr);
  await renderMatchPanel();
}
function syncCalendarWithDate(dateStr){
  const d = parseYMD(dateStr);
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();
  renderCalendar();
}

function getWeekStart(dateStr){
  const d = parseYMD(dateStr);
  d.setDate(d.getDate() - d.getDay()); // 일요일 시작
  return fmtDate(d);
}
function getWeekDates(weekKey){
  const start = parseYMD(weekKey);
  const arr = [];
  for(let i=0;i<7;i++){ const d = new Date(start); d.setDate(d.getDate()+i); arr.push(fmtDate(d)); }
  return arr;
}
/* 선택한 주가 오늘 기준으로 이번 주/다음 주/지난 주 중 어디인지 라벨을 계산합니다. */
function getWeekLabel(weekKey){
  const curWeek = getWeekStart(todayStr());
  const diffDays = Math.round((parseYMD(weekKey) - parseYMD(curWeek)) / 86400000);
  const diffWeeks = Math.round(diffDays/7);
  if(diffWeeks === 0) return '이번 주';
  if(diffWeeks === 1) return '다음 주';
  if(diffWeeks === -1) return '지난 주';
  if(diffWeeks > 1) return `${diffWeeks}주 후`;
  return `${Math.abs(diffWeeks)}주 전`;
}
/* weekOverride는 배열이어야 하지만, 과거 버전에서 문자열로 저장된 값이 남아있을 수 있어 항상 이 함수로 정리해서 사용합니다.
   (문자열을 그대로 펼치면 한 글자씩 분해되어 "NaN.NaN(undefined)" 같은 오류가 나기 때문에 반드시 이 함수를 거칩니다.) */
function normalizeDateList(val, validDates){
  let arr;
  if(Array.isArray(val)) arr = val;
  else if(typeof val === 'string' && val) arr = [val];
  else arr = [];
  arr = arr.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d));
  if(validDates) arr = arr.filter(d=>validDates.includes(d));
  return Array.from(new Set(arr));
}
/* 특정 주의 가능 인원 수를 집계하고, 확정된 경기 날짜(들)를 계산합니다.
   - 자동: 단독 1위 날짜가 있으면 자동으로 확정됩니다. 공동 1위(동점)면 관리자가 수동으로 확정하기 전까지는 미확정 상태입니다.
   - 수동: 관리자가 weekOverride에 추가한 날짜는 투표 결과와 무관하게 항상 확정 목록에 추가됩니다(소수 인원 선택 경기 등, 한 주에 여러 날짜를 확정할 수 있습니다). */
function autoWinnerDate(info){ return info && info.autoWinner ? info.autoWinner : null; }
function getWeekInfo(weekKey){
  const dates = getWeekDates(weekKey);
  const avail = (appData.weekAvailability && appData.weekAvailability[weekKey]) || {};
  const counts = {};
  dates.forEach(d=>counts[d]=0);
  Object.values(avail).forEach(arr=>(arr||[]).forEach(d=>{ if(counts[d]!=null) counts[d]++; }));
  let max = 0;
  dates.forEach(d=>{ if(counts[d]>max) max=counts[d]; });
  const topDates = max>0 ? dates.filter(d=>counts[d]===max) : [];
  const manual = normalizeDateList((appData.weekOverride||{})[weekKey], dates);
  const autoWinner = (max>0 && topDates.length===1) ? topDates[0] : null;
  const isTie = topDates.length>1 && manual.length===0;
  const confirmedDates = Array.from(new Set([...(autoWinner?[autoWinner]:[]), ...manual]));
  return { dates, avail, counts, max, topDates, isTie, manual, autoWinner, confirmedDates };
}
/* 주간 가능 투표(weekAvailability)를 바탕으로 확정된 날짜(들)의 참석/불참을 votes에 자동 반영합니다.
   (기존 참석 횟수 순위·시상대·캘린더 점 표시가 이 votes 데이터를 그대로 사용하도록 호환성을 유지)
   - 그 주에 아예 투표하지 않은 승인된 회원도 확정일 기준 "불참"으로 자동 포함되고, 투표해서 확정일을 고르면 "참석"으로 바뀝니다. */
function resyncWeekDerivedVotes(data, weekKey){
  const dates = getWeekDates(weekKey);
  dates.forEach(d=>{ delete data.votes[d]; });
  const avail = (data.weekAvailability && data.weekAvailability[weekKey]) || {};
  const counts = {};
  dates.forEach(d=>counts[d]=0);
  Object.values(avail).forEach(arr=>(arr||[]).forEach(d=>{ if(counts[d]!=null) counts[d]++; }));
  let max = 0;
  dates.forEach(d=>{ if(counts[d]>max) max=counts[d]; });
  const topDates = max>0 ? dates.filter(d=>counts[d]===max) : [];
  const manual = normalizeDateList((data.weekOverride||{})[weekKey], dates);
  if(!data.weekOverride) data.weekOverride = {};
  data.weekOverride[weekKey] = manual; // 정리된 배열로 다시 저장해서 오염 데이터를 치유
  const autoWinner = (max>0 && topDates.length===1) ? topDates[0] : null;
  const confirmedDates = Array.from(new Set([...(autoWinner?[autoWinner]:[]), ...manual]));
  const approvedNames = Object.keys(data.members||{}).filter(n=>data.members[n].approved && n!==ADMIN_NAME);
  const weekAbsenceMap = (data.weekAbsence && data.weekAbsence[weekKey]) || {};
  confirmedDates.forEach(winner=>{
    // "불참(no)"은 그 주 전체 불참을 명시적으로 선언한 사람만 해당합니다.
    // 다른 날짜에는 투표했지만 확정된 날짜와 일정이 안 맞았던 사람, 아예 투표를 안 한 사람은
    // "불참"이 아니라 그냥 이 날짜의 집계에서 빠집니다 (미투표는 별도 통계로 관리됩니다).
    data.votes[winner] = approvedNames
      .filter(name => (avail[name]||[]).includes(winner) || weekAbsenceMap[name])
      .map(name => ({
        name, choice: (avail[name]||[]).includes(winner) ? 'yes' : 'no'
      }));
  });
  dates.forEach(d=>{
    const hasVotes = data.votes[d] && data.votes[d].length;
    const hasVenue = data.venues && data.venues[d];
    if(hasVotes || hasVenue){ if(!data.votedDates.includes(d)) data.votedDates.push(d); }
    else { data.votedDates = data.votedDates.filter(x=>x!==d); }
  });
}

/* 로그인 비밀번호(생일 6자리, YYMMDD)를 기준으로 특정 월/일에 생일인 승인된 회원을 찾습니다. */
function getBirthdayMembersForDate(month, day){
  const mm = pad(month), dd = pad(day);
  return Object.keys(appData.members||{}).filter(n=>{
    if(!appData.members[n].approved) return false;
    const b = appData.members[n].birth;
    if(!b || b.length!==6) return false;
    return b.slice(2,4)===mm && b.slice(4,6)===dd;
  });
}
function renderCalendar(){
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  $('#monthLabel').textContent = `${viewYear}년 ${viewMonth+1}월`;
  const grid = $('#calGrid');
  grid.innerHTML='';
  grid.classList.toggle('week-mode', !!window.__calWeekMode);
  const head = document.createElement('div');
  head.className = 'cal-wk cal-wk-head';
  head.innerHTML = '<span class="wk-label"></span>' + ['일','월','화','수','목','금','토'].map((d,i)=>`<div class="cal-dow ${i===0?'sun':(i===6?'sat':'')}">${d}</div>`).join('');
  grid.appendChild(head);

  const todayS = todayStr();
  const thisWk = getWeekStart(todayS);
  const nextWkD = parseYMD(thisWk); nextWkD.setDate(nextWkD.getDate()+7);
  const nextWk = fmtDate(nextWkD);
  const selWk = selectedDate ? getWeekStart(selectedDate) : null;
  const weekCache = {};
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const cur = new Date(viewYear, viewMonth, 1 - firstOfMonth.getDay());
  const lastOfMonth = new Date(viewYear, viewMonth, daysInMonth);
  const end = new Date(viewYear, viewMonth, daysInMonth + (6 - lastOfMonth.getDay()));
  while(cur <= end){
    const weekStartStr = fmtDate(cur);
    const row = document.createElement('div');
    const isThis = weekStartStr === thisWk, isNext = weekStartStr === nextWk, isSel = weekStartStr === selWk;
    row.className = 'cal-wk' + (isThis?' is-this':'') + (isNext?' is-next':'') + (isSel?' is-sel':'');
    const sd = new Date(cur), ed = new Date(cur); ed.setDate(ed.getDate()+6);
    row.innerHTML = (isThis||isNext)
      ? `<span class="wk-label"><i class="wk-no">${isThis?1:2}</i><span><b>${isThis?'이번 주':'다음 주'}</b><small>(${sd.getMonth()+1}/${sd.getDate()}~${ed.getMonth()+1}/${ed.getDate()})</small></span></span>`
      : '<span class="wk-label"></span>';
    for(let i=0;i<7;i++){
      const dObj = new Date(cur);
      const dateStr = fmtDate(dObj);
      const day = dObj.getDate();
      const wKey = getWeekStart(dateStr);
      if(!weekCache[wKey]) weekCache[wKey] = getWeekInfo(wKey);
      const info = weekCache[wKey];
      const count = info.counts[dateStr] || 0;
      const isWinner = info.confirmedDates.includes(dateStr);
      const isPendingTop = info.isTie && info.topDates.includes(dateStr);
      const votesForDay = appData.votes[dateStr] || [];
      const myVoteForDay = votesForDay.find(v=>v.name===myName);
      const myPick = ((info.avail && info.avail[myName]) || []).includes(dateStr);
      const bdayNames = getBirthdayMembersForDate(dObj.getMonth()+1, day);
      const el = document.createElement('div');
      el.className='cal-cell'+(dObj.getMonth()!==viewMonth?' out':'')+(dateStr===todayS?' today':'')+(dateStr===selectedDate?' selected':'')+(isWinner?' confirmed':'')+(isPendingTop?' pending':'')+(i===0?' sun':(i===6?' sat':''));
      const dots = Math.min(2, count>=6 ? 2 : (count>0 ? 1 : 0));
      el.innerHTML = `
        <div class="d">${day}</div>
        ${bdayNames.length?`<div class="bday-badge" title="${escapeHtml(bdayNames.join(', '))} 생일">🎂</div>`:''}
        ${isWinner ? '<div class="cf-tag">확정</div>' : `<div class="dots" title="${count}명 가능">${'<i></i>'.repeat(dots)}</div>`}
        ${(myPick || (myVoteForDay && myVoteForDay.choice==='yes')) ? '<span class="my-mark" title="내가 선택한 날짜"></span>' : ''}
      `;
      el.addEventListener('click', ()=>{ setSelectedDate(dateStr); openVoteSheet(); });
      row.appendChild(el);
      cur.setDate(cur.getDate()+1);
    }
    row.addEventListener('click', (e)=>{ if(e.target.closest('.cal-cell')) return; setSelectedDate(weekStartStr); openVoteSheet(); });
    grid.appendChild(row);
  }
  renderGamedayBanner();
}

/* 달력 아래 '경기일 확정' 배너: 오늘 이후 가장 가까운 확정 경기일(이번 주·다음 주 기준)을 보여줍니다. */
function renderGamedayBanner(){
  const box = document.getElementById('gamedayBanner');
  if(!box) return;
  const todayS = todayStr();
  const w0 = getWeekStart(todayS);
  const w1o = parseYMD(w0); w1o.setDate(w1o.getDate()+7);
  let found = null;
  for(const wk of [w0, fmtDate(w1o)]){
    const info = getWeekInfo(wk);
    const upcoming = (info.confirmedDates||[]).filter(d=>d>=todayS).sort();
    if(upcoming.length){ found = { wk, info, date: upcoming[0] }; break; }
  }
  if(!found){ box.hidden = true; box.innerHTML = ''; return; }
  const co = parseYMD(found.date);
  const cnt = found.info.counts[found.date] || 0;
  const viaVotes = autoWinnerDate(found.info) === found.date;
  box.hidden = false;
  box.innerHTML = `
    <div class="gameday-card">
      <div class="gd-label"><span class="gd-trophy">🏆</span>${escapeHtml(getWeekLabel(found.wk))} 경기일</div>
      <div class="gd-main"><b>${co.getMonth()+1}월 ${co.getDate()}일 (${weekdayKR[co.getDay()]}) <em>확정!</em></b>
      <small>${viaVotes ? `가장 많은 ${cnt}명이 선택한 날짜로 경기를 진행합니다.` : '관리자가 지정한 경기일입니다.'}</small></div>
    </div>`;
}

/* 참석(초록)/불참(빨강)/미투표(회색) 3색 원형 그래프. 미투표가 0명이면 자연스럽게 2색 그래프와 동일합니다. */
function pieGradient(yes, no, notVoted){
  notVoted = notVoted || 0;
  const total = yes+no+notVoted;
  if(total===0) return null;
  const yesPct = (yes/total)*100;
  const noPct = (no/total)*100;
  return `conic-gradient(var(--pitch) 0% ${yesPct}%, var(--danger) ${yesPct}% ${yesPct+noPct}%, var(--muted) ${yesPct+noPct}% 100%)`;
}

let lastVotesJson = null;

/* 캘린더에서 날짜를 클릭하면 그 날짜가 속한 '주' 전체의 가능일 투표 패널을 보여줍니다. */
/* 관리자가 실제 참석을 확정한 날짜는 투표 대신 실제 참석 여부를 기준으로 참석/불참을 판단합니다. */
function getEffectiveVotesForDate(date){
  const actual = appData.actualAttendance && appData.actualAttendance[date];
  if(actual && actual.finalized){
    const approvedNames = getApprovedNonAdminNames();
    const attendSet = new Set(actual.attendees||[]);
    // 실제 참석 체크가 끝나면 전원이 참석/불참 둘 중 하나로 확정되어 미투표는 없습니다.
    return approvedNames.map(name=>({ name, choice: attendSet.has(name) ? 'yes' : 'no' }));
  }
  return appData.votes[date] || [];
}
/* 참석/불참/미투표를 사용자가 정한 기준으로 명확히 3단계로 구분합니다.
   - 참석: 그 날짜를 가능일로 선택한 사람
   - 불참: 그 날짜는 선택하지 않았지만, (a) 그 주의 다른 날짜는 하나 이상 선택했거나
           (b) 그 주 전체 불참을 선언한 사람
   - 미투표: 그 주 모든 날짜에 대해 아무 선택도 하지 않았고 전체 불참 선언도 하지 않은 사람
   (data.votes는 위 구분과 다른 목적의 파생 데이터라 여기선 쓰지 않고, weekAvailability/weekAbsence
   원본을 직접 봅니다. 실제 참석 체크가 끝난 날짜는 전원이 참석/불참으로 확정되어 미투표가 항상 0명입니다.) */
function getVoteBreakdownForDate(date){
  const actual = appData.actualAttendance && appData.actualAttendance[date];
  const approvedNames = getApprovedNonAdminNames();
  if(actual && actual.finalized){
    const attendSet = new Set(actual.attendees||[]);
    return {
      yesList: approvedNames.filter(n=>attendSet.has(n)),
      noList: approvedNames.filter(n=>!attendSet.has(n)),
      notVotedList: []
    };
  }
  const weekKey = getWeekStart(date);
  const avail = (appData.weekAvailability && appData.weekAvailability[weekKey]) || {};
  const weekAbsenceMap = (appData.weekAbsence && appData.weekAbsence[weekKey]) || {};
  const yesList = [], noList = [], notVotedList = [];
  approvedNames.forEach(name=>{
    const picks = avail[name] || [];
    if(picks.includes(date)){
      yesList.push(name);
    } else if(picks.length > 0 || weekAbsenceMap[name]){
      noList.push(name);
    } else {
      notVotedList.push(name);
    }
  });
  return { yesList, noList, notVotedList };
}
/* 투표 결과와 실제 참석을 비교해 노쇼(참석 투표했지만 안 옴)와 번개참석(불참·미투표였지만 실제로 옴)을 계산합니다. */
function computeNoShowSummary(date){
  const actual = appData.actualAttendance && appData.actualAttendance[date];
  if(!actual || !actual.finalized) return null;
  const votes = appData.votes[date] || [];
  const attendSet = new Set(actual.attendees||[]);
  const noShow = votes.filter(v=>v.choice==='yes' && !attendSet.has(v.name)).map(v=>v.name);
  const votedNames = votes.map(v=>v.name);
  const suddenFromNo = votes.filter(v=>v.choice==='no' && attendSet.has(v.name)).map(v=>v.name);
  const approvedNames = getApprovedNonAdminNames();
  const suddenFromNonVoter = approvedNames.filter(n=>!votedNames.includes(n) && attendSet.has(n));
  return { noShow, suddenAttend: [...suddenFromNo, ...suddenFromNonVoter], guests: actual.guests||[] };
}


async function renderMatchPanel(){
  const panel = $('#matchPanel');
  if(!selectedDate){ panel.innerHTML = '<div class="match-empty">날짜를 선택하면<br>이번 주 경기일 투표 현황을 확인할 수 있습니다.</div>'; return; }

  const weekKey = getWeekStart(selectedDate);
  const info = getWeekInfo(weekKey);
  const { dates, avail, counts, max, topDates, isTie, manual, confirmedDates } = info;
  lastVotesJson = JSON.stringify(avail);

  const approvedNames = getApprovedNonAdminNames();
  const absenceMap = (appData.weekAbsence && appData.weekAbsence[weekKey]) || {};
  const absentNames = approvedNames.filter(n=>absenceMap[n]);
  const availableNames = approvedNames.filter(n=>!absenceMap[n] && (avail[n]||[]).length>0);
  const notVoted = approvedNames.filter(n=>!absenceMap[n] && (!avail[n] || avail[n].length===0));
  const admin = isAdminUser();
  const iAmAbsent = !!absenceMap[myName];
  const iAmInjured = isCurrentlyInjured(myName);
  const isSelectedConfirmed = confirmedDates.includes(selectedDate);
  const notVotedHtml = isSelectedConfirmed ? '' : `
    <div class="not-voted-row">
      <span class="label">미투표 인원 (${notVoted.length}명)</span>
      <div class="not-voted-list">${notVoted.length? notVoted.map(n=>`<span class="nv-chip">${escapeHtml(n)}</span>`).join('') : '<span class="nv-empty">모두 투표했어요 🎉</span>'}</div>
    </div>
    <div class="not-voted-row">
      <span class="label">불참자 현황 (${absentNames.length}명)</span>
      <div class="not-voted-list">${absentNames.length? absentNames.map(n=>`<span class="nv-chip">${escapeHtml(n)}</span>`).join('') : '<span class="nv-empty">불참 선언한 인원이 없습니다</span>'}</div>
    </div>
  `;

  const s0 = parseYMD(dates[0]), s6 = parseYMD(dates[6]);
  const rangeLabel = `${s0.getMonth()+1}.${s0.getDate()}(${weekdayKR[0]}) ~ ${s6.getMonth()+1}.${s6.getDate()}(${weekdayKR[6]})`;
  const weekLabel = getWeekLabel(weekKey);

  let banner;
  if(isSelectedConfirmed){
    const isManualDate = manual.includes(selectedDate);
    banner = `<div class="confirm-banner">🏆 이 날짜는 확정된 경기입니다${isManualDate?' (관리자 지정)':''}</div>`;
  } else if(isTie){
    const labels = topDates.map(d=>{ const o=parseYMD(d); return `${o.getMonth()+1}.${o.getDate()}(${weekdayKR[o.getDay()]})`; }).join(', ');
    banner = `<div class="confirm-banner tie">⚖️ 공동 1위로 확정 예정: <b>${labels}</b> · 각 ${max}명 참여 (동점이라 추가 투표를 기다리고 있습니다)</div>`;
  } else {
    banner = `<div class="past-notice">아직 ${weekLabel} 투표가 없습니다.<br>가능한 날짜를 선택하거나, ${weekLabel} 전체 불참을 선택해 주시기 바랍니다.</div>`;
  }

  /* 확정된 경기의 참석률/참석·불참·미투표 명단은 그대로 유지 (읽기 전용, 별도 참석/불참 버튼은 없음 — 날짜 선택이 곧 참석 여부입니다) */
  let confirmedSummaryHtml = '';
  if(isSelectedConfirmed){
    const actualRecord = appData.actualAttendance && appData.actualAttendance[selectedDate];
    const isFinalized = actualRecord && actualRecord.finalized;
    const { yesList, noList, notVotedList } = getVoteBreakdownForDate(selectedDate);
    const guests = (isFinalized && actualRecord.guests) || [];
    const yesCount = yesList.length + guests.length;
    const noCount = noList.length;
    const notVotedCount = notVotedList.length;
    const grad = pieGradient(yesCount, noCount, notVotedCount);
    const total = yesCount + noCount + notVotedCount;
    const weekRate = total ? Math.round(yesCount/total*100) : null;
    const noShowSummary = isFinalized ? computeNoShowSummary(selectedDate) : null;
    confirmedSummaryHtml = `
      ${isFinalized ? `<div class="confirm-banner" style="background:rgba(61,220,132,0.1);border-color:rgba(61,220,132,0.4);color:var(--pitch);">✅ 실제 참석 체크 완료</div>` : ''}
      ${weekRate!=null ? `<div class="week-rate-big">${weekLabel} 참석률 <b>${weekRate}%</b> <span class="wr-sub">(${yesCount}/${total}명${isFinalized?' · 실제 참석 기준':' · 투표 기준'})</span></div>` : ''}
      <div class="pie-row">
        ${grad ? `<div class="pie" style="background:${grad};"></div>` : `<div class="pie" style="background:var(--surface-2);"></div>`}
        <div class="pie-legend">
          ${total? `
            <div class="li"><span class="sw yes"></span>참석 ${Math.round(yesCount/total*100)}% (${yesCount}명)</div>
            <div class="li"><span class="sw no"></span>불참 ${Math.round(noCount/total*100)}% (${noCount}명)</div>
            <div class="li"><span class="sw notvoted"></span>미투표 ${Math.round(notVotedCount/total*100)}% (${notVotedCount}명)</div>
          ` : `<div class="pie-empty">아직 투표가 없습니다.</div>`}
        </div>
      </div>
      <div class="voter-lists three-col">
        <div class="voter-col yes"><h4>참석 명단</h4>${(yesList.length||guests.length)? [...yesList.map(name=>`<div class="voter-name">${escapeHtml(name)}</div>`), ...guests.map(g=>`<div class="voter-name">${escapeHtml(g)} <span style="color:var(--muted);font-size:10px;">(게스트)</span></div>`)].join('') : '<div class="voter-empty">아직 없음</div>'}</div>
        <div class="voter-col no"><h4>불참 명단</h4>${noList.length? noList.map(name=>`<div class="voter-name">${escapeHtml(name)}</div>`).join('') : '<div class="voter-empty">아직 없음</div>'}</div>
        <div class="voter-col notvoted"><h4>미투표 명단</h4>${notVotedList.length? notVotedList.map(name=>`<div class="voter-name">${escapeHtml(name)}</div>`).join('') : '<div class="voter-empty">아직 없음</div>'}</div>
      </div>
      ${noShowSummary && (noShowSummary.noShow.length || noShowSummary.suddenAttend.length) ? `
      <div class="noshow-summary">
        ${noShowSummary.noShow.length? `<div class="ns-row"><span class="ns-label noshow">노쇼</span>${noShowSummary.noShow.map(n=>`<span class="nv-chip">${escapeHtml(n)}</span>`).join('')}</div>` : ''}
        ${noShowSummary.suddenAttend.length? `<div class="ns-row"><span class="ns-label sudden">번개참석</span>${noShowSummary.suddenAttend.map(n=>`<span class="nv-chip">${escapeHtml(n)}</span>`).join('')}</div>` : ''}
      </div>` : ''}
    `;
  }

  /* 팝업에서 날짜(또는 "이번 주 불참")를 고른 뒤 버튼으로 한 번에 저장합니다. */
  const myAvail = avail[myName] || [];
  if(!window.__voteDraft || window.__voteDraft.weekKey!==weekKey || !window.__voteDraft.dirty){
    window.__voteDraft = { weekKey, picks: new Set(myAvail), abs: iAmAbsent, dirty:false };
  }
  const draft = window.__voteDraft;
  const CK = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.500 4.500 4.500L19 7.500"/></svg>';
  const dm = (o)=>`${o.getMonth()+1}월 ${o.getDate()}일`;
  const rowsHtml = dates.map((d,i)=>{
    const dObj = parseYMD(d);
    const isPast = d < todayStr();
    const picked = draft.picks.has(d);
    const isConfirmedDay = confirmedDates.includes(d);
    const c = counts[d]||0;
    const w = max>0 && c>0 ? Math.max(14, Math.round(c/max*100)) : 0;
    const disabled = isPast || iAmInjured;
    return `<div class="vr ${picked?'pick':''} ${isConfirmedDay?'conf':''} ${(max>0&&c===max)?'top':''} ${disabled?'disabled':''} ${i===0?'sun':(i===6?'sat':'')}" data-date="${d}" role="button" tabindex="0">
      <span class="vr-d">${weekdayKR[i]}<small>${dObj.getDate()}일</small></span>
      <span class="vr-g"><i style="width:${w}%"></i></span>
      <span class="vr-c">${c}명</span>
      ${isConfirmedDay?'<span class="vr-tag">확정</span>':''}
      <span class="vr-k">${picked?CK:''}</span></div>`;
  }).join('');
  const absRowHtml = `<div class="vr vr-abs ${draft.abs?'pick':''} ${iAmInjured?'disabled':''}" id="vrAbs" role="button" tabindex="0"><span class="vr-d vr-abs-t">${weekLabel} 불참 <small>(전체)</small></span><span class="vr-k">${draft.abs?CK:''}</span></div>`;
  const respondedN = availableNames.length + absentNames.length;
  const pct = approvedNames.length ? Math.round(respondedN/approvedNames.length*100) : 0;
  const mainHtml = `
    <div class="sh-head">
      <div><b>${escapeHtml(weekLabel)} 투표</b><small>${dm(s0)} ~ ${dm(s6)}</small></div>
      <div class="sh-nav"><button type="button" id="vpPrevWeek" aria-label="이전 주">‹</button><button type="button" id="vpNextWeek" aria-label="다음 주">›</button><button type="button" id="vpClose" aria-label="닫기">✕</button></div>
    </div>
    ${iAmInjured ? `<div class="confirm-banner" style="background:rgba(255,93,93,0.1);border-color:rgba(255,93,93,0.4);color:var(--danger);white-space:normal;">🤕 부상 중에는 투표할 수 없습니다. (복귀 예정일: ${escapeHtml(appData.members[myName].injuryEnd)})</div>` : ''}
    ${isTie && !isSelectedConfirmed ? banner : ''}
    <div class="sh-stat"><b>참여 현황</b><span class="bar"><i style="width:${pct}%"></i></span><span class="n">${respondedN} / ${approvedNames.length}명</span></div>
    <div class="vr-list ${draft.abs?'abs-on':''}" id="vrList">${rowsHtml}${absRowHtml}</div>
    <button type="button" class="vp-submit" id="vpSubmit"></button>
    ${(()=>{
      const selD = (max>0 && topDates.length) ? topDates[0] : (dates.includes(selectedDate)?selectedDate:dates[0]);
      const chips = dates.map((d,i)=>{ const o=parseYMD(d); const c=counts[d]||0;
        return `<button type="button" class="vc ${c===0?'zero':''} ${(max>0&&c===max)?'hot':''} ${d===selD?'sel':''}" data-vd="${d}"><b>${weekdayKR[i]}</b><span>${o.getDate()}</span><em>${c}</em></button>`; }).join('');
      const names = {}; dates.forEach(d=>{ names[d]=Object.keys(avail).filter(n=>(avail[n]||[]).includes(d)); });
      return `<div class="vv" id="voterView" data-names='${escapeHtml(JSON.stringify(names))}' data-me="${escapeHtml(myName||'')}">
        <div class="vv-t"><b>날짜별 투표자</b><small>${s0.getMonth()+1}.${s0.getDate()} ~ ${s6.getMonth()+1}.${s6.getDate()}</small></div>
        <div class="vv-chips">${chips}</div>
        <div class="vv-det" id="vvDet"></div></div>`; })()}
    ${(isSelectedConfirmed && !admin) ? `<div class="vp-card">${banner}${confirmedSummaryHtml}</div>` : ''}
  `;

  /* 관리자 전용: 이번 주 전체 날짜의 확정 상태를 한눈에 보고 여러 날짜를 확정/해제할 수 있는 보조 패널 (항상 표시) */
  let adminHtml = '';
  if(admin){
    const adminChips = dates.map((d,i)=>{
      const isPast = d < todayStr();
      const isConfirmed = confirmedDates.includes(d);
      const isManualDate = manual.includes(d);
      const dObj = parseYMD(d);
      let btn = '';
      if(!isPast){
        if(isConfirmed && isManualDate) btn = `<button class="wconfirm-btn off" data-confirm="${d}">해제</button>`;
        else if(!isConfirmed) btn = `<button class="wconfirm-btn" data-confirm="${d}">확정</button>`;
      } else if(isConfirmed){
        const finalized = appData.actualAttendance && appData.actualAttendance[d] && appData.actualAttendance[d].finalized;
        btn = `<button class="wconfirm-btn actual ${finalized?'done':''}" data-actual="${d}">${finalized?'✓ 참석체크됨':'실제 참석'}</button>`;
      }
      return `
        <div class="admin-week-chip ${isConfirmed?'winner':''}">
          <span class="wdow">${weekdayKR[i]}</span><span class="wdate">${dObj.getDate()}</span><span class="wcount">${counts[d]}명</span>
          ${btn}
        </div>
      `;
    }).join('');
    adminHtml = `
      <div class="admin-week-manage">
        <div class="label">관리자: ${weekLabel} 확정 관리 (${s0.getMonth()+1}.${s0.getDate()} ~ ${s6.getMonth()+1}.${s6.getDate()})</div>
        <div class="admin-week-grid">${adminChips}</div>
      </div>
    `;

    /* 실제 참석 체크 편집기: 지난 확정 경기에 대해서만 열 수 있습니다 */
    if(adminAttendanceEditDate && dates.includes(adminAttendanceEditDate)){
      const editDate = adminAttendanceEditDate;
      const editVotes = appData.votes[editDate] || [];
      const existingActual = appData.actualAttendance && appData.actualAttendance[editDate];
      const attendSet = new Set(existingActual ? existingActual.attendees : editVotes.filter(v=>v.choice==='yes').map(v=>v.name));
      const approvedNamesForEdit = getApprovedNonAdminNames();
      const eObj = parseYMD(editDate);
      const checklistHtml = approvedNamesForEdit.map(n=>`
        <label class="actual-check-row">
          <input type="checkbox" class="actual-check" data-name="${escapeHtml(n)}" ${attendSet.has(n)?'checked':''}>
          <span>${escapeHtml(n)}</span>
        </label>
      `).join('');
      const guestListStr = existingActual && existingActual.guests
        ? existingActual.guests.join(', ')
        : ((appData.matchGuests && appData.matchGuests[editDate]) || []).join(', ');
      adminHtml += `
        <div class="actual-attend-editor">
          <div class="label">실제 참석 체크 — ${eObj.getMonth()+1}.${eObj.getDate()}(${weekdayKR[eObj.getDay()]})</div>
          <div class="actual-check-grid">${checklistHtml}</div>
          <input type="text" id="actualGuestInput" placeholder="용병/게스트 이름 (쉼표로 구분)" value="${escapeHtml(guestListStr)}">
          <div class="admin-row">
            <button id="saveActualBtn">저장</button>
            <button id="cancelActualBtn" class="danger">취소</button>
          </div>
        </div>
      `;
    }
  }

  panel.innerHTML = mainHtml + (adminHtml ? `<details class="da-detail" ${adminAttendanceEditDate?'open':''}><summary>관리자: 확정·실제 참석 관리</summary>${adminHtml}</details>` : '');
  try{ renderWeekStatus(); }catch(e){ console.error('[투표현황]', e); }

  /* 날짜별 투표자: 요일 칩을 누르면 해당 날짜 명단만 아래에 표시 */
  const vv = panel.querySelector('#voterView');
  if(vv){
    let vvNames = {};
    try{ vvNames = JSON.parse(vv.dataset.names || '{}'); }catch(e){}
    const vvMe = vv.dataset.me;
    const showVoters = (d)=>{
      vv.querySelectorAll('.vc').forEach(b=>b.classList.toggle('sel', b.dataset.vd===d));
      const o = parseYMD(d); const list = vvNames[d] || [];
      const det = vv.querySelector('#vvDet');
      det.innerHTML = `<h4>${o.getMonth()+1}.${o.getDate()} (${weekdayKR[o.getDay()]})<i>${list.length}명 참여</i></h4>` +
        (list.length ? `<div class="nm">${list.map(n=>`<u class="${n===vvMe?'':'o'}">${escapeHtml(n)}</u>`).join('')}</div>` : '<div class="vv-none">아직 투표한 사람이 없습니다</div>');
    };
    vv.querySelectorAll('.vc').forEach(b=>b.addEventListener('click', ()=>showVoters(b.dataset.vd)));
    const init = vv.querySelector('.vc.sel'); if(init) showVoters(init.dataset.vd);
  }

  const submitBtn = panel.querySelector('#vpSubmit');
  const vrList = panel.querySelector('#vrList');
  const absRow = panel.querySelector('#vrAbs');
  const syncDraftUI = ()=>{
    panel.querySelectorAll('.vr[data-date]').forEach(el=>{
      const on = draft.picks.has(el.dataset.date);
      el.classList.toggle('pick', on);
      const k = el.querySelector('.vr-k'); if(k) k.innerHTML = on ? CK : '';
    });
    if(absRow){ absRow.classList.toggle('pick', draft.abs); const k=absRow.querySelector('.vr-k'); if(k) k.innerHTML = draft.abs ? CK : ''; }
    if(vrList) vrList.classList.toggle('abs-on', draft.abs);
    if(!submitBtn) return;
    const n = draft.picks.size;
    let label, disabled = false;
    if(iAmInjured){ label = '부상 중에는 투표할 수 없습니다'; disabled = true; }
    else if(!draft.dirty){ label = draft.abs ? '불참으로 저장됨' : (n ? `저장됨 · ${n}일 선택` : '날짜를 선택하세요'); disabled = true; }
    else if(draft.abs){ label = '불참으로 저장'; }
    else if(n){ label = `투표하기 · ${n}일 선택`; }
    else if(iAmAbsent){ label = '불참 취소하기'; }
    else if(myAvail.length){ label = '선택을 모두 해제하고 저장'; }
    else { label = '날짜를 선택하세요'; disabled = true; }
    submitBtn.textContent = label;
    submitBtn.disabled = disabled;
  };
  panel.querySelectorAll('.vr[data-date]:not(.disabled)').forEach(el=>{
    el.addEventListener('click', ()=>{
      const d = el.dataset.date;
      if(draft.abs) draft.abs = false;           // 날짜를 고르면 불참 선택은 자동으로 풀립니다
      if(draft.picks.has(d)) draft.picks.delete(d); else draft.picks.add(d);
      draft.dirty = true;
      syncDraftUI();
    });
  });
  if(absRow && !iAmInjured) absRow.addEventListener('click', ()=>{
    draft.abs = !draft.abs;
    if(draft.abs) draft.picks.clear();           // 불참을 고르면 날짜 선택은 모두 풀립니다
    draft.dirty = true;
    syncDraftUI();
  });
  syncDraftUI();
  if(submitBtn) submitBtn.addEventListener('click', async ()=>{
    if(submitBtn.disabled) return;
    submitBtn.disabled = true;
    if(draft.abs){ if(!iAmAbsent) await declareWeekAbsence(weekKey); }
    else if(iAmAbsent && draft.picks.size===0){ await cancelWeekAbsence(weekKey); }
    else { await saveWeekVotes(weekKey); }
    window.__voteDraft = null;
    closeVoteSheet();
  });
  const vpClose = panel.querySelector('#vpClose');
  if(vpClose) vpClose.addEventListener('click', closeVoteSheet);
  const shiftWeek = (n)=>{ const d=parseYMD(weekKey); d.setDate(d.getDate()+n); setSelectedDate(fmtDate(d)); };
  const pw = panel.querySelector('#vpPrevWeek'), nw = panel.querySelector('#vpNextWeek');
  if(pw) pw.addEventListener('click', ()=>shiftWeek(-7));
  if(nw) nw.addEventListener('click', ()=>shiftWeek(7));
  panel.querySelectorAll('.wconfirm-btn[data-confirm]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{ e.stopPropagation(); adminToggleConfirmDate(weekKey, btn.dataset.confirm); });
  });
  panel.querySelectorAll('.wconfirm-btn[data-actual]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      adminAttendanceEditDate = (adminAttendanceEditDate===btn.dataset.actual) ? null : btn.dataset.actual;
      renderMatchPanel();
    });
  });
  const saveActualBtn = panel.querySelector('#saveActualBtn');
  if(saveActualBtn) saveActualBtn.addEventListener('click', ()=>adminSaveActualAttendance(adminAttendanceEditDate));
  const cancelActualBtn = panel.querySelector('#cancelActualBtn');
  if(cancelActualBtn) cancelActualBtn.addEventListener('click', ()=>{ adminAttendanceEditDate = null; renderMatchPanel(); });
  const absenceBtn = panel.querySelector('#absenceBtn');
  if(absenceBtn) absenceBtn.addEventListener('click', ()=>{
    if(iAmAbsent) cancelWeekAbsence(weekKey); else declareWeekAbsence(weekKey);
  });
}

/* 관리자가 실제 참석 체크리스트 + 게스트 명단을 저장 (경기 종료 후 실제 참석 인원 확정) */
async function adminSaveActualAttendance(date){
  if(!requireAdmin() || !date) return;
  const checkboxes = document.querySelectorAll('.actual-check');
  const attendees = [];
  checkboxes.forEach(cb=>{ if(cb.checked) attendees.push(cb.dataset.name); });
  const guestInput = document.querySelector('#actualGuestInput');
  const guests = guestInput ? guestInput.value.split(/[,，]/).map(s=>s.trim()).filter(Boolean) : [];
  await mutateAppData(data=>{
    if(!data.actualAttendance) data.actualAttendance = {};
    data.actualAttendance[date] = { attendees, guests, finalized:true, savedAt: Date.now() };
  });
  adminAttendanceEditDate = null;
  renderCalendar();
  await renderMatchPanel();
  computeAttendanceStats();
  renderMatchStats();
  toast('실제 참석 현황을 저장했습니다.');
}

/* 관리자가 특정 날짜를 확정/해제 토글 (한 주에 여러 날짜를 동시에 확정할 수 있습니다) */
async function adminToggleConfirmDate(weekKey, dateStr){
  if(!requireAdmin()) return;
  await mutateAppData(data=>{
    if(!data.weekOverride) data.weekOverride = {};
    let list = normalizeDateList(data.weekOverride[weekKey], getWeekDates(weekKey));
    if(list.includes(dateStr)){ list = list.filter(x=>x!==dateStr); }
    else { list = [...list, dateStr]; }
    data.weekOverride[weekKey] = list;
    resyncWeekDerivedVotes(data, weekKey);
  });
  renderCalendar();
  await renderMatchPanel();
  computeAttendanceStats();
  renderMatchStats();
  renderMatchVenueConfirmedHint();
  toast('확정 상태를 변경했습니다.');
}

/* 주간 가능일 복수선택 토글: 이미 선택했으면 해제, 아니면 추가 */
async function saveWeekVotes(weekKey){
  if(isCurrentlyInjured(myName)){ toast(`부상 중에는 투표할 수 없습니다. (복귀 예정일: ${appData.members[myName].injuryEnd})`); return; }
  const dr = window.__voteDraft;
  if(!dr || dr.weekKey!==weekKey) return;
  const picks = [...dr.picks].filter(d=>d>=todayStr()).sort();
  const saved = ((appData.weekAvailability && appData.weekAvailability[weekKey] && appData.weekAvailability[weekKey][myName]) || []);
  if(!picks.length && !saved.length){ toast('참석 가능한 날짜를 먼저 선택해 주세요.'); return; }
  await mutateAppData(data=>{
    if(!data.weekAvailability) data.weekAvailability = {};
    if(!data.weekAvailability[weekKey]) data.weekAvailability[weekKey] = {};
    // 이미 지난 날짜의 기존 선택은 보존하고, 오늘 이후 날짜만 이번 선택으로 교체합니다.
    const keepPast = (data.weekAvailability[weekKey][myName] || []).filter(d=>d<todayStr());
    data.weekAvailability[weekKey][myName] = [...keepPast, ...picks].sort();
    if(picks.length){
      if(!data.weekAbsence) data.weekAbsence = {};
      if(data.weekAbsence[weekKey]) delete data.weekAbsence[weekKey][myName];
    }
    resyncWeekDerivedVotes(data, weekKey);
  });
  window.__voteDraft = null;
  toast(picks.length ? '참석 가능일을 저장했습니다.' : '선택을 해제했습니다.');
  renderCalendar();
  await renderMatchPanel();
  computeAttendanceStats();
  renderMatchStats();
}
async function toggleWeekDay(dateStr){
  if(dateStr < todayStr()){ toast('지난 날짜는 선택할 수 없습니다.'); return; }
  if(isCurrentlyInjured(myName)){ toast(`부상 중에는 투표할 수 없습니다. (복귀 예정일: ${appData.members[myName].injuryEnd})`); return; }
  const weekKey = getWeekStart(dateStr);
  let added = true;
  await mutateAppData(data=>{
    if(!data.weekAvailability) data.weekAvailability = {};
    if(!data.weekAvailability[weekKey]) data.weekAvailability[weekKey] = {};
    let mine = data.weekAvailability[weekKey][myName] || [];
    if(mine.includes(dateStr)){ mine = mine.filter(x=>x!==dateStr); added = false; }
    else { mine = [...mine, dateStr].sort(); }
    data.weekAvailability[weekKey][myName] = mine;
    // 날짜를 선택하면 "이번 주 불참" 상태는 자동으로 해제됩니다(둘은 동시에 될 수 없습니다)
    if(added){
      if(!data.weekAbsence) data.weekAbsence = {};
      if(data.weekAbsence[weekKey]) delete data.weekAbsence[weekKey][myName];
    }
    resyncWeekDerivedVotes(data, weekKey);
  });
  toast(added ? '가능한 날짜로 선택했습니다.' : '선택을 해제했습니다.');
  renderCalendar();
  await renderMatchPanel();
  computeAttendanceStats();
  renderMatchStats();
}

/* 이번 주 전체 불참 선언: 날짜 복수선택과 동시에 할 수 없어서, 선언하면 그 주의 가능일 선택은 모두 지워집니다. */
async function declareWeekAbsence(weekKey){
  if(isCurrentlyInjured(myName)){ toast(`부상 중에는 투표할 수 없습니다. (복귀 예정일: ${appData.members[myName].injuryEnd})`); return; }
  await mutateAppData(data=>{
    if(!data.weekAbsence) data.weekAbsence = {};
    if(!data.weekAbsence[weekKey]) data.weekAbsence[weekKey] = {};
    data.weekAbsence[weekKey][myName] = true;
    if(!data.weekAvailability) data.weekAvailability = {};
    if(!data.weekAvailability[weekKey]) data.weekAvailability[weekKey] = {};
    data.weekAvailability[weekKey][myName] = [];
    resyncWeekDerivedVotes(data, weekKey);
  });
  toast('이번 주는 불참으로 등록했습니다.');
  renderCalendar();
  await renderMatchPanel();
  computeAttendanceStats();
  renderMatchStats();
}
/* 불참 선언 취소(다시 날짜를 고를 수 있는 상태로) */
async function cancelWeekAbsence(weekKey){
  await mutateAppData(data=>{
    if(data.weekAbsence && data.weekAbsence[weekKey]) delete data.weekAbsence[weekKey][myName];
  });
  renderCalendar();
  await renderMatchPanel();
}

/* 실시간 갱신: 20초마다 확인해 변경되면 자동 반영 (투표 + 멤버 명단)
   (JSONBin.io 무료 요청 건수를 아끼기 위해 너무 짧은 주기로는 확인하지 않아요)
   ⚠️ 예전에는 변경 감지 시 appData 전체를 통째로 교체했는데, 그러면 하필 그 사이에 다른 곳에서
   저장한 값(즐겨찾기 등)이 이 스냅샷엔 아직 없어서 화면에서 순간적으로 사라지는 문제가 있었습니다.
   이제는 이 주기적 갱신이 실제로 관여하는 투표 관련 필드만 선택적으로 갱신하고, 나머지 필드는
   그대로 둡니다. */
setInterval(async ()=>{
  const fresh = await remoteLoad();
  appData.members = fresh.members;
  renderMemberList();
  if(selectedDate){
    const weekKey = getWeekStart(selectedDate);
    const freshJson = JSON.stringify((fresh.weekAvailability||{})[weekKey] || {});
    if(freshJson !== lastVotesJson){
      appData.weekAvailability = fresh.weekAvailability;
      appData.weekAbsence = fresh.weekAbsence;
      appData.weekOverride = fresh.weekOverride;
      appData.votes = fresh.votes;
      appData.votedDates = fresh.votedDates;
      lastVotesJson = freshJson;
      renderCalendar();
      await renderMatchPanel();
    }
  }
}, 20000);

$('#calRefresh').addEventListener('click', async ()=>{
  const btn = $('#calRefresh');
  window.__voteDraft = null;
  btn.classList.add('spinning');
  await loadAppData();
  renderCalendar();
  if(selectedDate) await renderMatchPanel();
  computeAttendanceStats();
  renderMatchStats();
  btn.classList.remove('spinning');
  toast('캘린더와 투표 현황을 새로고침했습니다.');
});

/* ---------- 참석률 순위 ---------- */
let lastNaturalStats = {};
let lastNaturalMissCounts = {};
let lastStatPeriodInfo = {};
function computeAttendanceStats(){
  const excludedWeeks = new Set(appData.excludedWeeks || []);
  const validDateKeys = Object.keys(appData.votes)
    .filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k) && !excludedWeeks.has(getWeekStart(k)));
  const stats = {};
  validDateKeys.forEach(date=>{
    getEffectiveVotesForDate(date).forEach(v=>{
      if(v.name === ADMIN_NAME) return; // 관리자는 선수가 아니라 운영 계정이므로 모든 순위 통계에서 제외합니다.
      if(isInjuredOnDate(v.name, date)) return; // 부상 기간 중인 날짜는 참석/불참 통계에서 제외합니다.
      if(!stats[v.name]) stats[v.name] = {yes:0, no:0, total:0};
      stats[v.name].total++;
      if(v.choice==='yes') stats[v.name].yes++; else stats[v.name].no++;
    });
  });

  // 투표 미실시 횟수: 열렸던 전체 주(week) 중, 명시적으로 "불참 선언"도 하지 않고 날짜도 하나도 고르지 않은 횟수
  // - 아직 오지 않은 미래 주(예: 다음 주 이후)는 투표 기간이 끝나지 않았으므로 "미투표"로 판단하지 않고,
  //   오늘이 속한 주까지만(과거~이번 주) 집계합니다.
  // - 관리자가 "미투표 통계 제외 주간"으로 지정한 주는 시험운영 등으로 팀 순위 전체(참석·미투표·불참) 집계에서 건너뜁니다.
  const currentWeekKey = getWeekStart(todayStr());
  const weekKeys = Object.keys(appData.weekAvailability||{})
    .filter(wk=>wk<=currentWeekKey && !excludedWeeks.has(wk));
  const approvedNames = getApprovedNonAdminNames();
  const missCounts = {};
  approvedNames.forEach(n=>missCounts[n]=0);
  weekKeys.forEach(wk=>{
    const avail = appData.weekAvailability[wk] || {};
    const absence = (appData.weekAbsence && appData.weekAbsence[wk]) || {};
    approvedNames.forEach(n=>{
      if(isInjuredDuringWeek(n, wk)) return; // 부상 기간과 겹치는 주는 미투표로 집계하지 않습니다.
      const arr = avail[n];
      if(absence[n]) return; // 명시적으로 불참을 선언한 건 "미투표"가 아니에요
      if(!arr || arr.length===0) missCounts[n]++;
    });
  });

  // 관리자 도구(순위 횟수 수동 조정)에서 "현재 자동 집계" 참고용으로 보여주기 위해 조정 전 값과 집계 기간을 저장해둡니다.
  lastNaturalStats = JSON.parse(JSON.stringify(stats));
  lastNaturalMissCounts = { ...missCounts };
  const sortedMatchDates = [...validDateKeys].sort();
  const sortedWeekKeys = [...weekKeys].sort();
  lastStatPeriodInfo = {
    today: todayStr(),
    matchCount: sortedMatchDates.length,
    earliestMatchDate: sortedMatchDates[0] || null,
    latestMatchDate: sortedMatchDates[sortedMatchDates.length-1] || null,
    weekCount: sortedWeekKeys.length,
    earliestWeek: sortedWeekKeys[0] || null,
    currentWeekKey: currentWeekKey
  };

  // 관리자가 수동으로 보정한 값(순위 횟수 수동 조정)을 자연 집계 위에 더합니다.
  const adj = appData.statAdjustments || {};
  Object.keys(adj).forEach(name=>{
    if(name===ADMIN_NAME) return;
    if(!stats[name]) stats[name] = {yes:0, no:0, total:0};
  });
  Object.keys(stats).forEach(name=>{
    const a = adj[name] || {};
    stats[name].yes = Math.max(0, stats[name].yes + (a.yes||0));
    stats[name].no = Math.max(0, stats[name].no + (a.no||0));
    stats[name].total = stats[name].yes + stats[name].no;
  });
  approvedNames.forEach(n=>{
    const a = adj[n] || {};
    missCounts[n] = Math.max(0, (missCounts[n]||0) + (a.missed||0));
  });

  // 홈 화면 "팀 현황"에 쓰는 팀 평균 참석률 (전체 참석 / 전체 투표 기록)
  (function(){
    let y=0, t=0;
    Object.keys(stats).forEach(n=>{ y+=stats[n].yes; t+=stats[n].total; });
    window.__teamAttendanceRate = t>0 ? Math.round(y/t*100) : null;
  })();

  // 4-1. 참석 순위
  const attendList = Object.keys(stats).map(name=>({
    name, yes: stats[name].yes, total: stats[name].total, rate: stats[name].yes/stats[name].total
  })).sort((a,b)=> b.yes-a.yes || b.rate-a.rate || b.total-a.total || a.name.localeCompare(b.name,'ko'));
  renderGenericPodium('#podiumAttend', attendList, 'yes', '참석', '회');
  renderGenericRankList('#rankListAttend', '#rankEmptyAttend', attendList, 'yes', '회');

  // 4-2. 미투표자 순위
  const missList = approvedNames.map(name=>({ name, missed: missCounts[name] }))
    .filter(r=>weekKeys.length>0 && r.missed>0)
    .sort((a,b)=> b.missed-a.missed || a.name.localeCompare(b.name,'ko'));
  renderGenericPodium('#podiumMiss', missList, 'missed', '미투표', '회');
  renderGenericRankList('#rankListMiss', '#rankEmptyMiss', missList, 'missed', '회');

  // 4-3. 불참 순위
  const noShowList = Object.keys(stats).map(name=>({ name, no: stats[name].no, total: stats[name].total }))
    .filter(r=>r.no>0)
    .sort((a,b)=> b.no-a.no || a.name.localeCompare(b.name,'ko'));
  renderGenericPodium('#podiumNoShow', noShowList, 'no', '불참', '회');
  renderGenericRankList('#rankListNoShow', '#rankEmptyNoShow', noShowList, 'no', '회');

  const mine = stats[myName];
  window.__myAttend = { yes: mine?mine.yes:0, no: mine?mine.no:0, total: mine?mine.total:0, miss: (missCounts[myName]||0) };
  const myRank = attendList.findIndex(r=>r.name===myName);
  setTimeout(()=>{ try{ tryRenderAttendPanes(); }catch(e){} }, 0);
  const medal = myRank===0?'🥇':myRank===1?'🥈':myRank===2?'🥉':'';
  const rateTag = $('#myRateTag');
  const ratePie = $('#myRatePie');
  if(rateTag){
    rateTag.textContent = mine ? `내 참석 ${mine.yes}회 (${Math.round(mine.yes/mine.total*100)}%) · ${myRank+1}위 ${medal}` : '참석 기록 없음';
  }
  if(ratePie){
    if(mine){
      const pct = Math.round(mine.yes/mine.total*100);
      ratePie.style.background = `conic-gradient(var(--pitch) 0% ${pct}%, var(--surface-2) ${pct}% 100%)`;
    } else {
      ratePie.style.background = 'var(--surface-2)';
    }
  }
}
// TODO: 정식 배포 전 Supabase Auth 및 서버 측 권한 검증으로 이전 필요 (관리자 계정/생일이 하드코딩됨)
const ADMIN_NAME = '관리자';
/* 투표/출석 관련 통계에서는 관리자 계정을 인원수에서 제외합니다 (관리자는 선수가 아니라 운영 계정이므로). */
function getApprovedNonAdminNames(){
  return Object.keys(appData.members||{}).filter(n=>appData.members[n].approved && n!==ADMIN_NAME);
}
const ADMIN_BIRTH = '260402';
function isAdminUser(){ return myName===ADMIN_NAME && myBirth===ADMIN_BIRTH; }
function isAdmin(){ return isAdminUser(); } // 하위 호환용 별칭
function requireAdmin(){
  if(!isAdminUser()){ toast('관리자만 사용할 수 있는 기능입니다.'); return false; }
  return true;
}
function updateAdminVisibility(){
  const show = isAdminUser();
  const eyebrow = $('#adminSectionEyebrow');
  const panel = $('#adminPanel');
  const badge = $('#adminBadge');
  const entryBtn = $('#adminEntryBtn');
  if(badge) badge.style.display = show ? 'inline-block' : 'none';
  if(eyebrow) eyebrow.style.display = show ? 'flex' : 'none';
  if(panel) panel.style.display = show ? 'block' : 'none';
  if(entryBtn) entryBtn.style.display = show ? 'inline-block' : 'none';
  const tacticsSaveBtn = $('#tacticsSaveBtn');
  const tacticsResetBtn = $('#tacticsResetBtn');
  if(tacticsSaveBtn) tacticsSaveBtn.style.display = show ? 'inline-block' : 'none';
  if(tacticsResetBtn) tacticsResetBtn.style.display = show ? 'inline-block' : 'none';
  if(tacticsSelectedDate){ renderTacticsRoster(); renderTacticsCourt(); updateTacticsStatus(); }
  if(show){
    populateMatchWindowSelects();
    renderAdminMemberTable();
    renderAdminPendingTable();
    const notice = appData.notice || {};
    const nt = $('#noticeTitleInput'), nb = $('#noticeBodyInput');
    if(nt) nt.value = notice.title || '';
    if(nb) nb.value = notice.body || '';
    populateMatchVenuePresetSelect();
    const dateInput = $('#matchVenueDateInput');
    if(dateInput){
      const cur = dateInput.value;
      const curIsConfirmed = !!(cur && appData.votes[cur] && appData.votes[cur].length>0);
      const nearest = findNearestUpcomingConfirmedDate();
      const hasConfirmed = Object.keys(appData.votes||{}).some(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=todayStr() && (appData.votes[d]||[]).length>0);
      if(!cur || (!curIsConfirmed && hasConfirmed)){
        dateInput.value = nearest;
        loadMatchVenueTimeEditorForDate(nearest);
      }
    }
    renderMatchVenueConfirmedHint();
    const kmaInput = $('#kmaApiKeyInput');
    if(kmaInput) kmaInput.value = appData.kmaApiKey || '';
    renderExcludeWeekList();
    renderStatAdjustTable();
    updateFavVenueBtn();
  }
}
function populateMatchWindowSelects(){
  const startSel = $('#matchStartHour'), endSel = $('#matchEndHour');
  if(!startSel || !endSel) return;
  if(!startSel.options.length){
    for(let h=0; h<24; h++){ startSel.innerHTML += `<option value="${h}">${pad(h)}</option>`; endSel.innerHTML += `<option value="${h}">${pad(h)}</option>`; }
  }
  const win = appData.matchTimeWindow || { startHour:19, endHour:21 };
  startSel.value = String(win.startHour);
  endSel.value = String(win.endHour);
}
$('#saveMatchWindowBtn').addEventListener('click', async ()=>{
  if(!requireAdmin()) return;
  const startHour = parseInt($('#matchStartHour').value);
  const endHour = parseInt($('#matchEndHour').value);
  if(endHour < startHour){ toast('종료 시각이 시작 시각보다 빠를 수 없습니다.'); return; }
  await mutateAppData(data=>{ data.matchTimeWindow = { startHour, endHour }; });
  toast('경기 시간대를 저장했습니다. 날씨 새로고침 시 반영됩니다.');
  loadWeather();
});

$('#saveNoticeBtn').addEventListener('click', async ()=>{
  if(!requireAdmin()) return;
  const title = $('#noticeTitleInput').value.trim();
  const body = $('#noticeBodyInput').value.trim();
  if(!title && !body){ toast('제목이나 내용을 입력해 주시기 바랍니다.'); return; }
  await mutateAppData(data=>{ data.notice = { title, body, updatedAt: Date.now() }; });
  renderNoticeCard();
  toast('공지사항을 저장했습니다.');
});
$('#clearNoticeBtn').addEventListener('click', async ()=>{
  if(!requireAdmin()) return;
  if(!confirm('공지사항을 삭제하시겠습니까?')) return;
  await mutateAppData(data=>{ data.notice = { title:'', body:'', updatedAt:null }; });
  $('#noticeTitleInput').value = '';
  $('#noticeBodyInput').value = '';
  renderNoticeCard();
  toast('공지사항을 삭제했습니다.');
});

$('#saveKmaKeyBtn').addEventListener('click', async ()=>{
  if(!requireAdmin()) return;
  const key = $('#kmaApiKeyInput').value.trim();
  if(!key){ $('#kmaKeyStatus').textContent = '키를 입력해 주시기 바랍니다.'; $('#kmaKeyStatus').style.color='var(--danger)'; return; }
  await mutateAppData(data=>{ data.kmaApiKey = key; });
  $('#kmaKeyStatus').style.color = 'var(--pitch)';
  $('#kmaKeyStatus').textContent = '저장했습니다. 새로고침하면 반영됩니다.';
  toast('기상청 API 키를 저장했습니다.');
  loadWeather();
});
$('#clearKmaKeyBtn').addEventListener('click', async ()=>{
  if(!requireAdmin()) return;
  if(!confirm('기상청 API 키를 삭제하시겠습니까? 이후 날씨는 다시 Open-Meteo만 사용합니다.')) return;
  await mutateAppData(data=>{ data.kmaApiKey = ''; });
  $('#kmaApiKeyInput').value = '';
  $('#kmaKeyStatus').textContent = '삭제했습니다.';
  $('#kmaKeyStatus').style.color = 'var(--muted)';
  toast('기상청 API 키를 삭제했습니다.');
  loadWeather();
});

async function adminDeleteMember(name){
  if(!requireAdmin()) return;
  if(name === myName){ toast('본인 계정은 삭제할 수 없습니다.'); return; }
  if(!confirm(`'${name}' 회원을 삭제하시겠습니까?\n이 회원의 모든 투표 기록도 함께 삭제되며 되돌릴 수 없습니다.`)) return;
  await mutateAppData(data=>{
    if(data.members) delete data.members[name];
    Object.keys(data.votes||{}).forEach(date=>{
      data.votes[date] = (data.votes[date]||[]).filter(v=>v.name!==name);
      if(data.votes[date].length===0) delete data.votes[date];
    });
    data.votedDates = (data.votedDates||[]).filter(date=> (data.votes[date] && data.votes[date].length) || data.venues[date]);
  });
  renderMemberList();
  renderAdminMemberTable();
  renderAdminPendingTable();
  renderCalendar();
  computeAttendanceStats();
  if(selectedDate) await renderMatchPanel();
  toast(`'${name}' 회원과 투표 기록을 삭제했습니다.`);
}
async function adminApproveMember(name){
  if(!requireAdmin()) return;
  if(!confirm(`'${name}' 님의 가입을 승인하시겠습니까?`)) return;
  await mutateAppData(data=>{
    if(data.members && data.members[name]) data.members[name].approved = true;
  });
  renderMemberList();
  renderAdminMemberTable();
  renderAdminPendingTable();
  toast(`'${name}' 님의 가입을 승인했습니다.`);
}
async function adminRejectMember(name){
  if(!requireAdmin()) return;
  if(!confirm(`'${name}' 님의 가입 신청을 거절하시겠습니까? 신청 정보가 삭제됩니다.`)) return;
  await mutateAppData(data=>{ if(data.members) delete data.members[name]; });
  renderAdminPendingTable();
  toast(`'${name}' 님의 가입 신청을 거절했습니다.`);
}

/* 부상 기간(injuryStart~injuryEnd)에 기반한 판정 함수들. 관리자뿐 아니라 본인도 설정할 수 있습니다. */
function isCurrentlyInjured(name){
  const m = appData.members && appData.members[name];
  if(!m || !m.injuryStart || !m.injuryEnd) return false;
  const t = todayStr();
  return t>=m.injuryStart && t<=m.injuryEnd;
}
function isInjuredOnDate(name, dateStr){
  const m = appData.members && appData.members[name];
  if(!m || !m.injuryStart || !m.injuryEnd) return false;
  return dateStr>=m.injuryStart && dateStr<=m.injuryEnd;
}
function isInjuredDuringWeek(name, weekKey){
  const m = appData.members && appData.members[name];
  if(!m || !m.injuryStart || !m.injuryEnd) return false;
  return getWeekDates(weekKey).some(d=>d>=m.injuryStart && d<=m.injuryEnd);
}
async function setInjuryPeriod(name, startDate, endDate){
  await mutateAppData(data=>{
    if(data.members && data.members[name]){
      data.members[name].injuryStart = startDate || '';
      data.members[name].injuryEnd = endDate || '';
    }
  });
  renderMemberList();
  renderAdminMemberTable();
  computeAttendanceStats();
}

function renderMemberList(){
  const strip = $('#memberStrip');
  if(!strip) return;
  const names = Object.keys(appData.members||{}).filter(n=>appData.members[n].approved).sort((a,b)=>a.localeCompare(b,'ko'));
  if(!names.length){ strip.innerHTML = '<span style="font-size:12px;color:var(--muted);">아직 승인된 멤버가 없습니다.</span>'; return; }
  const admin = isAdminUser();
  strip.innerHTML = names.map(name=>{
    const m = appData.members[name] || {};
    const statusClass = m.status==='online' ? 'online' : 'offline';
    const injured = isCurrentlyInjured(name);
    const injuryBadge = injured ? `<span class="rest-badge injury" title="복귀 예정일: ${escapeHtml(m.injuryEnd)}">🤕 부상</span>` : '';
    return `<div class="member-chip ${name===myName?'me':''}"><span class="dot ${statusClass}"></span>${escapeHtml(name)}${m.birth?`<span class="b">${escapeHtml(m.birth)}</span>`:''}${injuryBadge}${admin && name!==myName?`<button class="member-del" data-name="${escapeHtml(name)}" title="멤버 삭제">✕</button>`:''}</div>`;
  }).join('');
  if(admin){
    strip.querySelectorAll('.member-del').forEach(btn=>{
      btn.addEventListener('click', (e)=>{ e.stopPropagation(); adminDeleteMember(btn.dataset.name); });
    });
  }
  renderMemberModal(); // 팝업이 열려있는 동안에도 최신 상태로 갱신
}

/* 팀 멤버가 많아져도 스크롤 없이 한눈에 보이도록, 터치(클릭) 시 팝업으로 전체 명단을 보여줍니다. */
function renderMemberModal(){
  const listEl = $('#memberModalList');
  if(!listEl) return;
  const names = Object.keys(appData.members||{}).filter(n=>appData.members[n].approved).sort((a,b)=>a.localeCompare(b,'ko'));
  if(!names.length){
    listEl.innerHTML = '<div class="rank-empty">아직 승인된 멤버가 없습니다.</div>';
    return;
  }
  listEl.innerHTML = names.map(name=>{
    const m = appData.members[name] || {};
    const statusClass = m.status==='online' ? 'online' : 'offline';
    const injured = isCurrentlyInjured(name);
    const injuryBadge = injured ? `<span class="rest-badge injury" title="복귀 예정일: ${escapeHtml(m.injuryEnd)}">🤕 부상</span>` : '';
    return `
      <div class="member-modal-row">
        <span class="dot ${statusClass}"></span>
        <span class="nm ${name===myName?'me':''}">${escapeHtml(name)}</span>
        ${injuryBadge}
        <span class="bd">${escapeHtml(m.birth||'')}</span>
      </div>
    `;
  }).join('');
}
function openMemberModal(){
  const backdrop = $('#memberModalBackdrop');
  if(!backdrop) return;
  renderMemberModal();
  backdrop.style.display = 'flex';
}
function closeMemberModal(){
  const backdrop = $('#memberModalBackdrop');
  if(backdrop) backdrop.style.display = 'none';
}
const memberViewAllBtn = $('#memberViewAllBtn');
if(memberViewAllBtn) memberViewAllBtn.addEventListener('click', openMemberModal);
const memberStripEl = $('#memberStrip');
if(memberStripEl) memberStripEl.addEventListener('click', openMemberModal);
const closeMemberModalBtn = $('#closeMemberModalBtn');
if(closeMemberModalBtn) closeMemberModalBtn.addEventListener('click', closeMemberModal);
const memberModalBackdrop = $('#memberModalBackdrop');
if(memberModalBackdrop) memberModalBackdrop.addEventListener('click', (e)=>{
  if(e.target === memberModalBackdrop) closeMemberModal(); // 배경(바깥) 클릭 시에만 닫힘, 카드 안쪽 클릭은 유지
});
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape') closeMemberModal();
});

/* 관리자가 참석·미투표·불참 횟수를 자동 집계 위에 수동으로 더하거나 뺄 수 있게 합니다. */
function renderStatAdjustTable(){
  const el = $('#statAdjustTable');
  const periodEl = $('#statPeriodInfo');
  if(!el) return;
  if(!requireAdminSilent()){ el.innerHTML=''; if(periodEl) periodEl.textContent=''; return; }
  if(periodEl){
    const p = lastStatPeriodInfo || {};
    if(p.matchCount){
      const wLabel = p.earliestWeek ? `${p.earliestWeek} 주 ~ ${p.currentWeekKey} 주(이번 주)` : '아직 없음';
      periodEl.innerHTML = `📅 오늘(${p.today}) 기준 집계 범위<br>· 참석/불참: 확정된 경기 ${p.earliestMatchDate} ~ ${p.latestMatchDate} (총 ${p.matchCount}경기, 미래에 확정된 경기가 있다면 포함)<br>· 미투표: ${wLabel} (${p.weekCount}주간, 아직 안 지난 미래 주는 제외)`;
    } else {
      periodEl.textContent = `📅 오늘(${p.today}) 기준 — 아직 집계할 확정 경기가 없습니다.`;
    }
  }
  const names = getApprovedNonAdminNames().sort((a,b)=>a.localeCompare(b,'ko'));
  if(!names.length){ el.innerHTML = '<div class="rank-empty">승인된 회원이 없습니다.</div>'; return; }
  const adj = appData.statAdjustments || {};
  el.innerHTML = names.map(name=>{
    const a = adj[name] || {};
    const natYes = (lastNaturalStats[name] && lastNaturalStats[name].yes) || 0;
    const natNo = (lastNaturalStats[name] && lastNaturalStats[name].no) || 0;
    const natMiss = lastNaturalMissCounts[name] || 0;
    return `
      <div class="stat-adjust-row">
        <span class="n">${escapeHtml(name)}</span>
        <div class="stat-adjust-fields">
          <label>참석<span class="nat">자동 ${natYes}</span><input type="number" class="adj-yes" data-name="${escapeHtml(name)}" value="${a.yes||0}"></label>
          <label>미투표<span class="nat">자동 ${natMiss}</span><input type="number" class="adj-missed" data-name="${escapeHtml(name)}" value="${a.missed||0}"></label>
          <label>불참<span class="nat">자동 ${natNo}</span><input type="number" class="adj-no" data-name="${escapeHtml(name)}" value="${a.no||0}"></label>
        </div>
        <button type="button" data-action="stat-save" data-name="${escapeHtml(name)}">저장</button>
      </div>
    `;
  }).join('');
  el.querySelectorAll('button[data-action="stat-save"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const name = btn.dataset.name;
      const row = btn.closest('.stat-adjust-row');
      const yes = parseInt(row.querySelector('.adj-yes').value, 10) || 0;
      const missed = parseInt(row.querySelector('.adj-missed').value, 10) || 0;
      const no = parseInt(row.querySelector('.adj-no').value, 10) || 0;
      await mutateAppData(data=>{
        if(!data.statAdjustments) data.statAdjustments = {};
        if(yes===0 && missed===0 && no===0){ delete data.statAdjustments[name]; }
        else { data.statAdjustments[name] = { yes, missed, no }; }
      });
      computeAttendanceStats();
      renderMatchStats();
      toast(`'${name}' 님의 순위 조정값을 저장했습니다.`);
    });
  });
}

function renderAdminMemberTable(){
  const el = $('#adminMemberTable');
  if(!el) return;
  if(!requireAdminSilent()){ el.innerHTML=''; return; }
  const names = Object.keys(appData.members||{}).filter(n=>appData.members[n].approved).sort((a,b)=>a.localeCompare(b,'ko'));
  if(!names.length){ el.innerHTML = '<div class="rank-empty">승인된 회원이 없습니다.</div>'; return; }
  el.innerHTML = names.map(name=>{
    const m = appData.members[name] || {};
    const isSelf = name===myName;
    const injured = isCurrentlyInjured(name);
    return `
      <div class="admin-member-row">
        <span class="n">${escapeHtml(name)}</span>
        <span class="bday">${escapeHtml(m.birth||'-')}</span>
        <button type="button" data-action="delete" data-name="${escapeHtml(name)}" ${isSelf?'disabled title="본인은 삭제할 수 없습니다"':''}>삭제</button>
      </div>
      <div class="admin-injury-row" data-name="${escapeHtml(name)}">
        <span class="il">${injured?`🤕 부상 중 (~${escapeHtml(m.injuryEnd)})`:'부상 기간'}</span>
        <input type="date" class="injury-start" data-name="${escapeHtml(name)}" value="${escapeHtml(m.injuryStart||'')}">
        <span>~</span>
        <input type="date" class="injury-end" data-name="${escapeHtml(name)}" value="${escapeHtml(m.injuryEnd||'')}">
        <button type="button" data-action="injury-save" data-name="${escapeHtml(name)}">설정</button>
        <button type="button" class="ghost" data-action="injury-clear" data-name="${escapeHtml(name)}">해제</button>
      </div>
    `;
  }).join('');
  el.querySelectorAll('button[data-action="delete"]').forEach(btn=>{
    btn.addEventListener('click', ()=>adminDeleteMember(btn.dataset.name));
  });
  el.querySelectorAll('button[data-action="injury-save"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const name = btn.dataset.name;
      const row = btn.closest('.admin-injury-row');
      const start = row.querySelector('.injury-start').value;
      const end = row.querySelector('.injury-end').value;
      if(!start || !end){ toast('시작일과 종료일을 모두 선택해 주시기 바랍니다.'); return; }
      if(end < start){ toast('종료일이 시작일보다 빠를 수 없습니다.'); return; }
      await setInjuryPeriod(name, start, end);
      toast(`'${name}' 님의 부상 기간을 설정했습니다.`);
    });
  });
  el.querySelectorAll('button[data-action="injury-clear"]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const name = btn.dataset.name;
      await setInjuryPeriod(name, '', '');
      toast(`'${name}' 님의 부상 상태를 해제했습니다.`);
    });
  });
}
function renderAdminPendingTable(){
  const el = $('#adminPendingTable');
  const countEl = $('#pendingCount');
  if(!el || !requireAdminSilent()) return;
  const names = Object.keys(appData.members||{}).filter(n=>!appData.members[n].approved).sort((a,b)=>a.localeCompare(b,'ko'));
  if(countEl) countEl.textContent = names.length ? `${names.length}건` : '';
  if(!names.length){ el.innerHTML = '<div class="rank-empty">승인 대기 중인 가입 신청이 없습니다.</div>'; return; }
  el.innerHTML = names.map(name=>{
    const m = appData.members[name] || {};
    return `
      <div class="pending-row">
        <span class="n">${escapeHtml(name)}</span>
        <span class="bday">${escapeHtml(m.birth||'-')}</span>
        <button class="approve-btn" data-name="${escapeHtml(name)}">승인</button>
        <button class="reject-btn" data-name="${escapeHtml(name)}">거절</button>
      </div>
    `;
  }).join('');
  el.querySelectorAll('.approve-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>adminApproveMember(btn.dataset.name));
  });
  el.querySelectorAll('.reject-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>adminRejectMember(btn.dataset.name));
  });
}
function requireAdminSilent(){ return isAdminUser(); }

$('#resetDateVotesBtn').addEventListener('click', async ()=>{
  if(!requireAdmin()) return;
  if(!selectedDate){ toast('먼저 캘린더에서 날짜를 선택해 주시기 바랍니다.'); return; }
  const weekKey = getWeekStart(selectedDate);
  if(!confirm(`선택하신 날짜가 속한 주(${weekKey} 시작)의 가능일 투표를 초기화하시겠습니까? 경기장 정보는 유지됩니다.`)) return;
  await mutateAppData(data=>{
    if(data.weekAvailability) delete data.weekAvailability[weekKey];
    if(data.weekOverride) delete data.weekOverride[weekKey];
    resyncWeekDerivedVotes(data, weekKey);
  });
  renderCalendar();
  await renderMatchPanel();
  computeAttendanceStats();
  renderMatchStats();
  toast('선택한 주의 투표를 초기화했습니다.');
});
$('#resetAllVotesBtn').addEventListener('click', async ()=>{
  if(!requireAdmin()) return;
  const warn = '⚠️ 경고: 전체 투표 초기화를 진행하면 지금까지 쌓인 모든 주간 가능일 투표와 확정 기록이 전부 삭제됩니다.\n\n이전 데이터는 복구할 수 없습니다. 정말 초기화하시겠습니까?';
  if(!confirm(warn)) return;
  await mutateAppData(data=>{
    data.weekAvailability = {};
    data.weekOverride = {};
    data.votes = {};
    data.votedDates = Object.keys(data.venues||{});
  });
  renderCalendar();
  if(selectedDate) await renderMatchPanel();
  computeAttendanceStats();
  renderMatchStats();
  toast('모든 투표 기록을 초기화했습니다.');
});

/* ---------- 경기 진행 기록 (월별 확정 횟수 · 누적 진행 횟수) ---------- */
function computeMatchStats(){
  // appData.votes의 키는 (동점이 아닌 한) 확정된 경기 날짜만 존재합니다.
  const confirmedDates = Object.keys(appData.votes||{}).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && (appData.votes[d]||[]).length>0).sort();
  const todayS = todayStr();
  const played = confirmedDates.filter(d=>d<=todayS);
  const upcoming = confirmedDates.filter(d=>d>todayS);
  const byMonth = {};
  const byMonthDates = {};
  played.forEach(d=>{ const key=d.slice(0,7); byMonth[key]=(byMonth[key]||0)+1; (byMonthDates[key]=byMonthDates[key]||[]).push(d); });
  const months = Object.keys(byMonth).sort().reverse();
  Object.keys(byMonthDates).forEach(k=>byMonthDates[k].sort().reverse());
  return { totalPlayed: played.length, upcomingCount: upcoming.length, byMonth, byMonthDates, months };
}
function renderMatchStats(){
  renderHeroMatch();
  renderNoticeCard();
  tryRenderHomeTab();
  checkMatchConfirmedNotification();
  checkVoteDeadlineReminder();
  if(allVenuePinsPlaced) applyConfirmedVenueMarker();
  const el = $('#matchStatsCard');
  if(!el) return;
  const stats = computeMatchStats();
  const thisMonthKey = todayStr().slice(0,7);
  const thisMonthCount = stats.byMonth[thisMonthKey] || 0;
  el.innerHTML = `
    <div class="stats-top">
      <div class="stats-box">
        <div class="stats-big">${stats.totalPlayed}</div>
        <div class="stats-label">총 누적 경기 진행 횟수</div>
      </div>
      <div class="stats-box">
        <div class="stats-big small">${thisMonthCount}</div>
        <div class="stats-label">이번 달(${thisMonthKey.replace('-','.')}) 경기 횟수</div>
      </div>
      ${stats.upcomingCount? `
      <div class="stats-box">
        <div class="stats-big small">${stats.upcomingCount}</div>
        <div class="stats-label">예정된 확정 경기</div>
      </div>` : ''}
    </div>
    <div class="stats-history">
      <div class="stats-history-label">월별 진행 기록 (눌러서 경기별 전술 보기)</div>
      <div class="stats-history-list" id="matchStatsMonthList">
        ${stats.months.length? stats.months.map(m=>`<div class="smh-row" data-month="${m}"><span>${m.replace('-','.')}</span><span>${stats.byMonth[m]}회</span></div>`).join('') : '<div class="rank-empty">아직 진행된 경기가 없습니다.</div>'}
      </div>
      <div class="stats-history-dates" id="matchStatsDateList" style="display:none;"></div>
      <div id="matchStatsTacticsPreview"></div>
    </div>
  `;
  window.__matchStatsData = stats; // 클릭 핸들러에서 재사용
  el.querySelectorAll('#matchStatsMonthList .smh-row').forEach(row=>{
    row.addEventListener('click', ()=>{
      const month = row.dataset.month;
      const dateListEl = $('#matchStatsDateList');
      const previewEl = $('#matchStatsTacticsPreview');
      const dates = stats.byMonthDates[month] || [];
      const alreadyOpenForThisMonth = dateListEl.dataset.month === month && dateListEl.style.display !== 'none';
      if(alreadyOpenForThisMonth){
        dateListEl.style.display = 'none';
        previewEl.innerHTML = '';
        return;
      }
      dateListEl.dataset.month = month;
      dateListEl.style.display = 'flex';
      dateListEl.innerHTML = dates.map(d=>`<button type="button" class="smh-date-chip" data-date="${d}">${d}</button>`).join('');
      previewEl.innerHTML = '';
      dateListEl.querySelectorAll('.smh-date-chip').forEach(chip=>{
        chip.addEventListener('click', ()=>{
          dateListEl.querySelectorAll('.smh-date-chip').forEach(c=>c.classList.toggle('active', c===chip));
          renderTacticsMiniForDate(chip.dataset.date, previewEl);
        });
      });
    });
  });
}

/* 최상단 히어로 카드: 오늘 이후로 가장 가까운 확정 경기를 D-day와 함께 보여줍니다. */
function renderHeroMatch(){
  const el = $('#heroMatchCard');
  if(!el) return;
  const todayS = todayStr();
  const confirmedDates = Object.keys(appData.votes||{})
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=todayS && (appData.votes[d]||[]).length>0)
    .sort();
  if(!confirmedDates.length){
    el.className = 'hero-match-card empty';
    el.innerHTML = '아직 확정된 예정 경기가 없습니다.<br>캘린더에서 주간 투표를 진행해 보세요.';
    return;
  }
  const date = confirmedDates[0];
  const dObj = parseYMD(date);
  const diffDays = Math.round((dObj - parseYMD(todayS)) / 86400000);
  const ddayLabel = diffDays===0 ? 'D-DAY' : `D-${diffDays}`;
  // 관리자가 "실제 참석 체크"나 이 카드에서 직접 인원을 추가/제외했으면 그 결과를 우선 사용합니다.
  const effVotes = getEffectiveVotesForDate(date);
  const yesList = effVotes.filter(v=>v.choice==='yes');
  const guestNames = (appData.matchGuests && appData.matchGuests[date]) || [];
  const venue = getVenueInfo(date);
  const approvedTotal = getApprovedNonAdminNames().length;
  const totalAttending = yesList.length + guestNames.length;
  const admin = isAdminUser();

  const avatarPalette = ['#3ddc84','#6db8ff','#ffd76b','#ff8fa3','#c9a0ff','#ff9d5c'];
  const avatarColor = (name)=>{
    let h=0; for(let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) % avatarPalette.length;
    return avatarPalette[h];
  };
  const maxShow = 5;
  const attendeeChips = [
    ...yesList.map(v=>({ name:v.name, isGuest:false })),
    ...guestNames.map(n=>({ name:n, isGuest:true }))
  ];
  const shown = attendeeChips.slice(0, maxShow);
  const overflow = attendeeChips.length - shown.length;
  const avatarsHtml = shown.map(p=>`<div class="avatar-circle ${p.isGuest?'guest':''}" style="background:${avatarColor(p.name)};" title="${escapeHtml(p.name)}${p.isGuest?' (용병)':''}">${escapeHtml(p.name.charAt(0))}</div>`).join('')
    + (overflow>0 ? `<div class="avatar-circle more">+${overflow}</div>` : '');

  // 관리자만: 참석 인원 옆에 제외(✕) 버튼, 그리고 갑자기 오게 된 사람을 추가하는 선택창을 보여줍니다.
  // 여기서 뺀/더한 결과는 팀 순위(참여횟수)에도 그대로 반영됩니다.
  const attendeeNames = new Set(yesList.map(v=>v.name));
  const notAttendingApproved = getApprovedNonAdminNames().filter(n=>!attendeeNames.has(n));
  const adminAddControl = admin ? `
    <div class="hero-admin-add-row">
      <select id="heroAddAttendeeSelect">
        <option value="">갑자기 오는 인원 추가...</option>
        ${notAttendingApproved.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}
      </select>
      <button id="heroAddAttendeeBtn">추가</button>
    </div>
  ` : '';

  el.className = 'hero-match-card';
  const svgI = (d)=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const timeText = venue && venue.time ? ` ${escapeHtml(String(venue.time).slice(0,5))}` : '';
  el.innerHTML = `
    <div class="hero-top"><span class="hero-label">다음 경기</span></div>
    <div class="nm-body" id="nmBody">
      <div class="nm-left">
        <div class="nm-venue">${venue ? escapeHtml(venue.name) : '경기장 미등록'}</div>
        <div class="nm-line">${svgI('<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>')}<span>${dObj.getMonth()+1}월 ${dObj.getDate()}일 (${weekdayKR[dObj.getDay()]})</span></div>
        <div class="nm-line">${svgI('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')}<span>${venue && venue.time ? escapeHtml(String(venue.time).slice(0,5)) : '시간 미정'}</span></div>
        <div class="nm-actions">
          ${venue && (venue.format==='5'||venue.format==='6') ? `<span class="nm-format">${venue.format} vs ${venue.format}</span>` : ''}
          ${venue && venue.link ? `<button class="hero-link-btn" id="heroLinkBtn" data-link="${escapeHtml(venue.link)}">경기 링크 ›</button>` : ''}
        </div>
      </div>
      <span class="nm-chev">›</span>
      <div class="nm-photo"></div>
    </div>
    ${admin ? `
    <details class="nm-admin">
      <summary>관리자: 참석 인원 관리 (${totalAttending}/${approvedTotal}명)</summary>
      <div class="hero-attendee-list">${attendeeChips.length? attendeeChips.map(p=>`<span class="nv-chip">${escapeHtml(p.name)}${p.isGuest?' <span class="guest-tag">용병</span>':''} <button class="chip-remove-btn" data-name="${escapeHtml(p.name)}" data-guest="${p.isGuest?'1':'0'}" title="제외">✕</button></span>`).join('') : '<span class="nv-empty">아직 참석자가 없습니다</span>'}</div>
      ${adminAddControl}
    </details>` : ''}
  `;
  /* 카드를 누르면 그 경기가 속한 주의 출석 화면으로 이동합니다 */
  const nmBody = document.getElementById('nmBody');
  if(nmBody) nmBody.addEventListener('click', (e)=>{
    if(e.target.closest('#heroLinkBtn')) return;
    setActiveMobileSection('calendar');
    if(typeof setAttendPane==='function') setAttendPane('vote');
    if(typeof setSelectedDate==='function') setSelectedDate(date);
  });
  const linkBtn = $('#heroLinkBtn');
  if(linkBtn){
    linkBtn.addEventListener('click', ()=>{
      window.open(linkBtn.dataset.link, '_blank', 'noopener');
    });
  }
  if(admin){
    el.querySelectorAll('.chip-remove-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if(btn.dataset.guest==='1') adminRemoveMatchGuest(date, btn.dataset.name);
        else adminModifyAttendance(date, btn.dataset.name, 'remove');
      });
    });
    const addBtn = $('#heroAddAttendeeBtn');
    if(addBtn) addBtn.addEventListener('click', ()=>{
      const sel = $('#heroAddAttendeeSelect');
      if(sel && sel.value) adminModifyAttendance(date, sel.value, 'add');
    });
  }
}

/* 확정 경기에서 관리자가 인원을 직접 추가/제외합니다 (선수가 갑자기 못 오거나, 갑자기 오게 된 경우).
   내부적으로는 "실제 참석 체크"와 같은 데이터(actualAttendance)를 사용해서, 팀 순위의 참여횟수 집계에도
   바로 반영됩니다. */
async function adminModifyAttendance(date, name, action){
  if(!requireAdmin()) return;
  await mutateAppData(data=>{
    const approvedNames = Object.keys(data.members||{}).filter(n=>data.members[n].approved && n!==ADMIN_NAME);
    const existing = data.actualAttendance && data.actualAttendance[date];
    let current = (existing && existing.finalized)
      ? [...existing.attendees]
      : (data.votes[date]||[]).filter(v=>v.choice==='yes').map(v=>v.name).filter(n=>approvedNames.includes(n));
    const existingGuests = (existing && existing.finalized) ? (existing.guests||[]) : ((data.matchGuests && data.matchGuests[date]) || []);
    if(action==='remove'){ current = current.filter(n=>n!==name); }
    else if(!current.includes(name)){ current.push(name); }
    if(!data.actualAttendance) data.actualAttendance = {};
    data.actualAttendance[date] = { attendees: current, guests: existingGuests, finalized: true, savedAt: Date.now() };
  });
  renderMatchStats();
  computeAttendanceStats();
  toast(action==='remove' ? `'${name}' 님을 참석 명단에서 제외했습니다.` : `'${name}' 님을 참석 명단에 추가했습니다.`);
}
/* 홈 카드에서 용병을 바로 제외할 때 사용 (사전 등록된 용병 명단과 확정된 실제 참석 명단 둘 다 갱신) */
async function adminRemoveMatchGuest(date, name){
  if(!requireAdmin()) return;
  await mutateAppData(data=>{
    if(data.matchGuests && data.matchGuests[date]){
      data.matchGuests[date] = data.matchGuests[date].filter(n=>n!==name);
      if(!data.matchGuests[date].length) delete data.matchGuests[date];
    }
    const existing = data.actualAttendance && data.actualAttendance[date];
    if(existing && existing.finalized){
      existing.guests = (existing.guests||[]).filter(n=>n!==name);
    }
  });
  renderMatchStats();
  toast(`'${name}' 님(용병)을 참석 명단에서 제외했습니다.`);
}

/* 관리자가 등록한 공지사항 1건을 표시합니다. */
function renderNoticeCard(){
  const el = $('#noticeCard');
  if(!el) return;
  const notice = appData.notice;
  if(!notice || (!notice.title && !notice.body)){
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  const dateStr = notice.updatedAt ? new Date(notice.updatedAt).toLocaleDateString('ko-KR').replace(/\. /g,'.').replace(/\.$/,'') : '';
  el.innerHTML = `
    <div class="nc-top"><span class="nc-tag"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M3 10v4a1 1 0 0 0 1 1h2l5 4V5L6 9H4a1 1 0 0 0-1 1z"/><path d="M14 8.500a4.500 4.500 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>공지사항</span><span class="nc-title">${escapeHtml(notice.title||'공지사항')}</span><span class="nc-chevron">›</span></div>
    ${notice.body?`<div class="nc-body">${escapeHtml(notice.body)}</div>`:''}
    ${dateStr?`<div class="nc-date">${dateStr}</div>`:''}
  `;
  // 모바일에서는 제목 한 줄만 보이고, 카드를 누르면 본문이 펼쳐집니다.
  el.onclick = ()=>el.classList.toggle('open');
}

function renderGenericRankList(listSel, emptySel, list, metricKey, unit){
  const rankList = $(listSel);
  const rankEmpty = $(emptySel);
  if(!rankList) return;
  if(!list.length){ if(rankEmpty) rankEmpty.style.display='block'; rankList.innerHTML=''; return; }
  if(rankEmpty) rankEmpty.style.display='none';
  const maxV = list[0][metricKey] || 1;
  const rest = list.slice(3);
  if(!rest.length){ rankList.innerHTML = '<div class="rank-empty">4위 이하 기록이 아직 없습니다.</div>'; return; }
  rankList.innerHTML = rest.map((r,i)=>`
    <div class="rank-row">
      <div class="no">${i+4}</div>
      <div class="name">${escapeHtml(r.name)}</div>
      <div class="bar-wrap"><div class="bar" style="width:${Math.round((r[metricKey]/maxV)*100)}%;"></div></div>
      <div class="pct">${r[metricKey]}${unit||''}</div>
    </div>
  `).join('');
}
function renderGenericPodium(sel, list, metricKey, metricLabel, unit){
  const podium = $(sel);
  if(!podium) return;
  if(!list.length){ podium.innerHTML=''; return; }
  const order = [1,0,2]; // 2등-1등-3등 순서로 배치
  const classes = ['silver','gold','bronze'];
  const medals = ['🥈','🥇','🥉'];
  podium.innerHTML = order.map((idx,pos)=>{
    const r = list[idx];
    if(!r) return '';
    return `
      <div class="podium-col ${classes[pos]}">
        <div class="medal">${medals[pos]}</div>
        <div class="pname">${escapeHtml(r.name)}</div>
        <div class="prate">${metricLabel} ${r[metricKey]}${unit||''}</div>
        <div class="bar">${idx+1}위</div>
      </div>
    `;
  }).join('');
}
$('#rankRefresh').addEventListener('click', async ()=>{
  const btn = $('#rankRefresh');
  btn.classList.add('spinning');
  await loadAppData();
  computeAttendanceStats();
  renderMatchStats();
  btn.classList.remove('spinning');
  toast('참석 횟수 순위를 새로고침했습니다.');
});

/* ---------- Map (venue input moved here) ---------- */
const FUTSAL_VENUES = [
  {name:'서울 강남 도곡에프씨(중대부고 운동장)', address:'서울특별시 강남구 선릉로 207'},
  {name:'서울 강동 송파 풋살장', address:'서울특별시 송파구 풍납동 403-2'},
  {name:'서울 강북 아크 풋살 스타디움', address:'서울특별시 도봉구 도봉로110라길 69-6, 4층'},
  {name:'서울 강서 KBS 스포츠월드', address:'서울특별시 강서구 공항대로 376'},
  {name:'서울 광진 리더짐 풋살장', address:'서울특별시 광진구 구의로 28, 6층'},
  {name:'서울 노원 염광 운동장', address:'서울특별시 노원구 월계로45가길 9'},
  {name:'서울 노원 하라 풋살장', address:'서울특별시 노원구 동일로 1323'},
  {name:'서울 논현 누리풋볼클럽', address:'서울특별시 강남구 논현로 748, 지하 1층'},
  {name:'서울 도봉 라온 풋살장', address:'서울특별시 도봉구 방학동 553-2'},
  {name:'서울 도봉 루다 풋살장', address:'서울특별시 도봉구 방학로 223'},
  {name:'서울 서대문 HIP 풋살그라운드 충정로점', address:'서울특별시 서대문구 경기대로9길 24'},
  {name:'서울 서대문 돌산구장', address:'서울특별시 서대문구 홍은동 10-305'},
  {name:'서울 서초 서동원 축구아카데미', address:'서울특별시 서초구 청계산로 41'},
  {name:'서울 성북 서경대 풋살파크', address:'서울특별시 성북구 서경로 118, 수인관'},
  {name:'서울 송파 천마 풋살파크', address:'서울특별시 송파구 성내천로29길 31'},
  {name:'서울 수유 마이그라운드 풋살장', address:'서울특별시 강북구 도봉로 342, 옥상층'},
  {name:'서울 어반풋볼파크 강서점', address:'서울특별시 강서구 내발산동 755-1'},
  {name:'서울 영등포 SKY 풋살파크', address:'서울특별시 영등포구 선유로43길 19'},
  {name:'서울 영등포 남서울상가 SKY 풋살파크', address:'서울특별시 영등포구 영중로14길 11, 3층 옥상'},
  {name:'서울 영등포 더에프필드', address:'서울특별시 영등포구 선유로 138'},
  {name:'서울 용산 아디다스 더베이스', address:'서울특별시 용산구 한강대로23길 55'},
  {name:'서울 은평 롯데몰 풋살장', address:'서울특별시 은평구 통일로 1050'},
  {name:'서울 잠실 랩스풋볼', address:'서울특별시 송파구 올림픽로8길 21'},
  {name:'서울 지니 풋살파크 용두동점', address:'서울특별시 동대문구 왕산로 68'},
  {name:'서울 지니 풋살파크 중화점', address:'서울특별시 중랑구 봉화산로 56'},
  {name:'서울 짐앤조이 2호점 풋살파크', address:'서울특별시 성동구 자동차시장1길 96, 11층 옥상'},
  {name:'서울 화곡 스트리트 풋살파크', address:'서울특별시 강서구 화곡로 142'},
  {name:'플랩 스타디움 가산 디지털엠파이어', address:'서울특별시 금천구 범안로 1130, 디지털엠파이어 옥상'},
  {name:'플랩 스타디움 가산 마리오', address:'서울특별시 금천구 벚꽃로 266, 마리오아울렛 3관 4층'},
  {name:'플랩 스타디움 가산 벽산디지털밸리 6차', address:'서울특별시 금천구 가산디지털1로 219'},
  {name:'플랩 스타디움 가산 코오롱테크노밸리', address:'서울특별시 금천구 디지털로9길 56, 코오롱테크노밸리 옥상'}
];
/* 플랩풋볼 실제 stadium_name과 프리셋 이름의 표기가 완전히 같지 않을 수 있어(공백 차이 등),
   비교 전에 공백을 모두 제거해서 맞춰봅니다. */
function normalizeVenueName(s){ return String(s||'').replace(/\s+/g, ''); }
function findVenuePreset(name){
  const exact = FUTSAL_VENUES.find(v=>v.name===name);
  if(exact) return exact;
  // 완전 일치가 없으면 공백 무시 + 부분 포함으로 한 번 더 시도합니다.
  const target = normalizeVenueName(name);
  if(!target) return null;
  return FUTSAL_VENUES.find(v=>{
    const preset = normalizeVenueName(v.name);
    return preset && (preset===target || preset.includes(target) || target.includes(preset));
  }) || null;
}
/* appData.venues[date]는 과거엔 문자열이었고 지금은 {name, address} 객체입니다. 둘 다 지원합니다. */
function getVenueInfo(dateStr){
  const raw = appData.venues[dateStr];
  if(!raw) return null;
  if(typeof raw === 'string'){ const preset = findVenuePreset(raw); return { name: raw, address: preset ? preset.address : '' }; }
  return raw;
}
function populateVenuePresetSelect(){
  const sel = $('#venuePresetSelect');
  if(!sel) return;
  const prevValue = sel.value;
  const favSet = favoriteVenueSet;
  const favVenues = FUTSAL_VENUES.filter(v=>favSet.has(v.name));
  const restVenues = FUTSAL_VENUES.filter(v=>!favSet.has(v.name));
  let html = '<option value="">목록에서 선택</option>';
  if(favVenues.length){
    html += `<optgroup label="⭐ 자주 쓰는 경기장">${favVenues.map(v=>`<option value="${escapeHtml(v.name)}">⭐ ${escapeHtml(v.name)}</option>`).join('')}</optgroup>`;
  }
  html += `<optgroup label="전체 경기장">${restVenues.map(v=>`<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)}</option>`).join('')}</optgroup>`;
  sel.innerHTML = html;
  if(prevValue) sel.value = prevValue;
}
$('#venuePresetSelect').addEventListener('change', ()=>{
  const name = $('#venuePresetSelect').value;
  if(!name) return;
  $('#venueInput').value = name;
  lookupVenueOnMap();
});

/* 즐겨찾기(자주 쓰는 경기장) 토글 버튼. 관리자만 사용할 수 있고, 프리셋 목록에 있는 경기장이든
   플랩풋볼에서 넘어온 경기장이든(프리셋과 이름이 정확히 일치하지 않아도) 지도에 지금 표시 중인
   이름 그대로를 즐겨찾기 키로 저장합니다. 즐겨찾기 등록/해제는 지도 탭에서만 할 수 있습니다. */
function updateFavVenueBtn(){
  const btn = $('#favVenueBtn');
  if(!btn) return;
  if(!isAdminUser()){ btn.style.display='none'; return; }
  if(!currentVenueName){ btn.style.display='none'; return; }
  btn.style.display = 'inline-block';
  const isFav = favoriteVenueSet.has(currentVenueName);
  btn.textContent = isFav ? '★' : '☆';
  btn.classList.toggle('on', isFav);
}
/* ⚠️ 즐겨찾기는 이제 app_state의 공유 블롭이 아니라 독립된 favorite_venues 테이블에 저장합니다.
   추가/삭제가 그 자체로 원자적인 DB 작업이라, 투표·부상설정 등 다른 저장 작업과 절대 겹쳐서
   유실될 일이 없습니다. */
let favoriteVenueSet = new Set();
async function loadFavoriteVenues(){
  if(!supabaseClient) return;
  try{
    const { data, error } = await supabaseClient.from('favorite_venues').select('venue_name');
    if(error) throw error;
    favoriteVenueSet = new Set((data||[]).map(r=>r.venue_name));
  }catch(e){
    console.error('[즐겨찾기] 목록을 불러오지 못했습니다:', e);
  }
}
async function setFavoriteVenueRobust(name, shouldBeFavorite){
  try{
    if(shouldBeFavorite){
      const { error } = await supabaseClient.from('favorite_venues').insert({ venue_name: name });
      // 이미 즐겨찾기되어 있어서 primary key 충돌이 나는 경우는 실패로 취급하지 않습니다.
      if(error && error.code !== '23505') throw error;
      favoriteVenueSet.add(name);
    } else {
      const { error } = await supabaseClient.from('favorite_venues').delete().eq('venue_name', name);
      if(error) throw error;
      favoriteVenueSet.delete(name);
    }
    return { ok:true };
  }catch(e){
    console.error('[즐겨찾기] 저장/삭제 실패:', e);
    // 테이블이 아직 없거나(42P01) RLS 정책이 없어서 막힌 경우(42501)를 구분해서 안내합니다.
    let reason = e && e.message ? e.message : '알 수 없는 오류';
    if(e && e.code === '42P01') reason = 'favorite_venues 테이블이 아직 없습니다. favorite-venues-table.sql을 Supabase에서 실행해 주시기 바랍니다.';
    else if(e && e.code === '42501') reason = '저장 권한이 없습니다(RLS 정책 확인 필요). favorite-venues-table.sql을 Supabase에서 실행해 주시기 바랍니다.';
    return { ok:false, reason };
  }
}
$('#favVenueBtn').addEventListener('click', async ()=>{
  if(!requireAdmin()) return;
  const name = currentVenueName;
  if(!name) return;
  const willBeFavorite = !favoriteVenueSet.has(name);
  const result = await setFavoriteVenueRobust(name, willBeFavorite);
  populateVenuePresetSelect();
  updateFavVenueBtn();
  if(venuePinObjects[name]){
    venuePinObjects[name].type = favoriteVenueSet.has(name) ? 'favorite' : 'regular';
    renderVenuePinContent(name);
  }
  if(!result.ok){
    toast(`즐겨찾기 저장에 실패했습니다: ${result.reason}`);
  } else {
    toast(willBeFavorite ? '즐겨찾기에 추가했습니다.' : '즐겨찾기에서 제거했습니다.');
  }
});
$('#copyVenueAddressBtn').addEventListener('click', ()=>{
  const text = $('#venueAddressText').textContent;
  if(!text) return;
  navigator.clipboard.writeText(text).then(()=>toast('주소를 복사했습니다.')).catch(()=>toast('복사에 실패했어요. 직접 선택해서 복사해 주시기 바랍니다.'));
});
window.copyVenueAddress = function(addr){
  if(!addr) return;
  navigator.clipboard.writeText(addr).then(()=>toast('주소를 복사했습니다.')).catch(()=>toast('복사에 실패했어요.'));
};

/* 지도 탭은 조회 전용입니다. 확정 경기의 공식 경기장은 관리자 도구에서만 저장할 수 있습니다. */
$('#lookupVenueBtn').addEventListener('click', ()=>lookupVenueOnMap());
$('#venueInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') lookupVenueOnMap(); });
async function lookupVenueOnMap(){
  const name = $('#venueInput').value.trim();
  if(!name){ toast('경기장 이름을 입력하거나 목록에서 선택해 주시기 바랍니다.'); return; }
  const preset = findVenuePreset(name);
  const info = preset ? { name: preset.name, address: preset.address } : { name, address: '' };
  await showVenueOnMap(info);
}

/* 지도 렌더링의 핵심 로직 (직접 검색과 "기본 경기장 자동 표시"가 공통으로 사용합니다) */
let currentVenueName = null; // 지도에 지금 표시 중인 경기장의 확정된 이름 (즐겨찾기 버튼이 기준으로 삼는 이름)
async function showVenueOnMap(info){
  if(location.protocol === 'file:'){
    toast('파일을 직접 열어서는(file://) 경기장 검색이 동작하지 않습니다. 로컬 서버나 실제 배포 주소에서 열어주시기 바랍니다.');
    return;
  }
  const ok = await ensureKakaoReady();
  if(!ok) return;

  $('#mapEmpty').style.display='none';
  $('#map').style.display='block';
  $('#mapFullscreenBtn').style.display='block';
  if(!map){
    map = new kakao.maps.Map($('#map'), { center: new kakao.maps.LatLng(37.5665,126.9780), level: 8 });
  }
  await renderAllVenuePins(); // 목록에 있는 모든 경기장 핀을 먼저 준비합니다 (첫 실행 후에는 캐시되어 즉시 완료됨).
  await placeVenueMarker(info);
  currentVenueName = info.name;

  const addrRow = $('#venueAddressRow');
  if(info.address){
    addrRow.style.display = 'flex';
    $('#venueAddressText').textContent = info.address;
  } else {
    addrRow.style.display = 'none';
  }
  updateFavVenueBtn();
}

/* 목록에 있는 모든 경기장을 이름표와 함께 지도에 항상 표시합니다.
   한 번 좌표를 찾은 경기장은 세션 동안 캐시해서, 지도를 다시 열 때마다 다시 검색하지 않습니다.
   각 경기장의 마커/이름표 객체를 보관해뒀다가, 선택된 경기장만 강조 스타일로 바꿔 재사용합니다
   (같은 위치에 마커가 두 개 겹치는 것을 방지). */
let allVenuePinsPlaced = false;
const venueGeocodeCache = {};
const venuePinObjects = {}; // { 이름: { overlay, el, pos, address, type, expanded } }
let currentExpandedVenue = null;
let confirmedVenueName = null; // 실제 확정 경기의 경기장 이름 (일치하는 핀을 축구공으로 표시)

/* 경기장 마다: 평소엔 아이콘+이름만 작게 보이고, 터치하면 주소와 복사 버튼이 펼쳐집니다.
   다른 경기장을 터치하거나 지도 빈 곳을 터치하면 자동으로 닫힙니다.
   아이콘으로 종류를 구분합니다: 📍 일반 경기장 / ⭐ 즐겨찾기 / ⚽ 확정 경기 경기장(가장 눈에 띄게)
   주의: 카카오맵 CustomOverlay는 content의 크기가 나중에 바뀌어도 자동으로 다시 계산해주지 않아서,
   내용을 바꿀 때마다 setContent()를 다시 호출해 강제로 재계산시킵니다 (안 하면 좁은 폭에 텍스트가
   세로로 끼거나, 아예 안 보이는 문제가 생깁니다). */
function venueIconFor(type){
  if(type==='confirmed') return '⚽';
  if(type==='favorite') return '⭐';
  return '📍';
}
function renderVenuePinContent(name){
  const obj = venuePinObjects[name];
  if(!obj) return;
  const icon = venueIconFor(obj.type);
  obj.el.className = `venue-pin ${obj.type}${obj.expanded?' expanded':''}`;
  if(obj.expanded){
    obj.el.innerHTML = `
      <div class="vp-head">${icon} <b>${escapeHtml(name)}</b></div>
      ${obj.address ? `<div class="vp-addr">${escapeHtml(obj.address)}</div><button type="button" class="vp-copy">주소 복사</button>` : '<div class="vp-addr">등록된 주소가 없습니다</div>'}
    `;
    const copyBtn = obj.el.querySelector('.vp-copy');
    if(copyBtn) copyBtn.addEventListener('click', (e)=>{ e.stopPropagation(); window.copyVenueAddress(obj.address); });
  } else {
    obj.el.innerHTML = `${icon} <span class="vp-name">${escapeHtml(name)}</span>`;
  }
  // 카카오맵이 새 크기를 다시 계산하도록 강제합니다.
  if(obj.overlay) obj.overlay.setContent(obj.el);
}
function collapseAllVenuePins(){
  if(currentExpandedVenue){
    const prev = currentExpandedVenue;
    currentExpandedVenue = null;
    const obj = venuePinObjects[prev];
    if(obj){ obj.expanded = false; renderVenuePinContent(prev); }
  }
}
function expandVenuePin(name){
  if(!venuePinObjects[name]) return;
  collapseAllVenuePins();
  currentExpandedVenue = name;
  venuePinObjects[name].expanded = true;
  renderVenuePinContent(name);
  map.setCenter(venuePinObjects[name].pos);
}

async function renderAllVenuePins(){
  if(!map || allVenuePinsPlaced) return;
  allVenuePinsPlaced = true;
  for(const v of FUTSAL_VENUES){
    let coords = venueGeocodeCache[v.name];
    if(!coords){
      coords = await kakaoGeocode(v.address, true);
      if(coords) venueGeocodeCache[v.name] = coords;
    }
    if(!coords) continue;
    const pos = new kakao.maps.LatLng(coords.lat, coords.lng);
    const isFav = favoriteVenueSet.has(v.name);
    const el = document.createElement('div');
    el.addEventListener('click', (e)=>{
      e.stopPropagation();
      const obj = venuePinObjects[v.name];
      if(obj.expanded){ collapseAllVenuePins(); } else { expandVenuePin(v.name); }
    });
    const overlay = new kakao.maps.CustomOverlay({
      position: pos, content: el, yAnchor: 1, xAnchor: 0.5,
      zIndex: isFav ? 3 : 2
    });
    overlay.setMap(map);
    venuePinObjects[v.name] = { overlay, el, pos, address: v.address, type: isFav?'favorite':'regular', expanded:false };
    renderVenuePinContent(v.name);
  }
  // 지도 빈 공간을 누르면 열려있던 상세정보를 닫습니다.
  kakao.maps.event.addListener(map, 'click', ()=>{ collapseAllVenuePins(); });
  applyConfirmedVenueMarker();
}

/* 홈 화면과 동일한 "가장 가까운 확정 경기"의 경기장을 ⚽ 아이콘으로 확실하게 구분해서 표시합니다. */
function applyConfirmedVenueMarker(){
  const todayS = todayStr();
  const confirmedDates = Object.keys(appData.votes||{})
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=todayS && (appData.votes[d]||[]).length>0)
    .sort();
  const nearest = confirmedDates[0];
  const venue = nearest ? getVenueInfo(nearest) : null;
  const newConfirmedName = (venue && venuePinObjects[venue.name]) ? venue.name : null;
  if(confirmedVenueName && confirmedVenueName !== newConfirmedName && venuePinObjects[confirmedVenueName]){
    const prevObj = venuePinObjects[confirmedVenueName];
    prevObj.type = favoriteVenueSet.has(confirmedVenueName) ? 'favorite' : 'regular';
    renderVenuePinContent(confirmedVenueName);
  }
  confirmedVenueName = newConfirmedName;
  if(confirmedVenueName){
    const obj = venuePinObjects[confirmedVenueName];
    obj.type = 'confirmed';
    renderVenuePinContent(confirmedVenueName);
  }
}
/* 즐겨찾기 토글 시, 지도를 다시 그리지 않고 해당 핀의 아이콘만 바로 바꿉니다. */
function setVenueStarBadge(name, on){
  const obj = venuePinObjects[name];
  if(!obj) return;
  if(obj.type !== 'confirmed'){ obj.type = on ? 'favorite' : 'regular'; }
  renderVenuePinContent(name);
}
function refreshVenuePinStyle(){ /* 강조 스타일은 이제 아이콘 종류(type)로만 구분하므로 별도 처리가 필요 없습니다. */ }

/* 지도 탭을 처음 열었을 때: 홈 화면과 동일하게 "가장 가까운 확정 경기"의 경기장을 기본으로 보여줍니다.
   경기장 선택 UI는 그대로 남아있어서, 다른 경기장을 직접 검색해서 볼 수도 있습니다. */
let mapDefaultLoaded = false;
async function loadDefaultMapVenue(force){
  if(mapDefaultLoaded && !force) return;
  if(typeof appData==='undefined' || !appData) return;
  const todayS = todayStr();
  const confirmedDates = Object.keys(appData.votes||{})
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=todayS && (appData.votes[d]||[]).length>0)
    .sort();
  const nearest = confirmedDates[0];
  if(!nearest) return; // 확정된 예정 경기가 없으면 기존처럼 빈 상태로 둡니다.
  const venue = getVenueInfo(nearest);
  if(!venue || !venue.name) return;
  mapDefaultLoaded = true;
  const sel = $('#venuePresetSelect');
  const input = $('#venueInput');
  if(sel) sel.value = findVenuePreset(venue.name) ? venue.name : '';
  if(input) input.value = venue.name;
  await showVenueOnMap({ name: venue.name, address: venue.address || '' });
}

/* ---------- 관리자 도구: 경기장 선택 및 경기시간 기입 ---------- */
/* 관리자 도구 상단에 지금 실제로 확정된 경기일이 무엇인지 명확히 보여줍니다.
   (경기가 확정되기 전에 저장한 날짜와 실제 확정일이 어긋나는 것을 방지하기 위함) */
function renderMatchVenueConfirmedHint(){
  const el = $('#matchVenueConfirmedHint');
  if(!el) return;
  const nearest = findNearestUpcomingConfirmedDate();
  const hasConfirmed = Object.keys(appData.votes||{}).some(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=todayStr() && (appData.votes[d]||[]).length>0);
  if(hasConfirmed){
    const o = parseYMD(nearest);
    el.textContent = `현재 실제로 확정된 다음 경기일: ${o.getMonth()+1}.${o.getDate()}(${weekdayKR[o.getDay()]}) — 아래 날짜가 이 날짜와 같아야 홈 화면에 반영됩니다.`;
  } else {
    el.textContent = '현재 확정된 예정 경기가 없습니다. 먼저 캘린더에서 주간 투표를 확정한 뒤 입력해 주시기 바랍니다.';
  }
}
function populateMatchVenuePresetSelect(){
  const sel = $('#matchVenuePresetSelect');
  if(!sel || sel.options.length>1) return;
  FUTSAL_VENUES.forEach(v=>{ sel.innerHTML += `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)}</option>`; });
}
function findNearestUpcomingConfirmedDate(){
  const todayS = todayStr();
  const confirmedDates = Object.keys(appData.votes||{})
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=todayS && (appData.votes[d]||[]).length>0)
    .sort();
  return confirmedDates[0] || todayS;
}
let pendingMatchGuests = []; // 현재 편집 중인 날짜의 용병 명단 (저장 버튼을 눌러야 실제로 반영됨)
function renderMatchVenueGuestList(){
  const el = $('#matchVenueGuestList');
  if(!el) return;
  if(!pendingMatchGuests.length){
    el.innerHTML = '<span class="empty-hint">등록된 용병이 없습니다.</span>';
    return;
  }
  el.innerHTML = pendingMatchGuests.map((name, i)=>
    `<span class="guest-chip">${escapeHtml(name)}<button type="button" data-idx="${i}" title="삭제">✕</button></span>`
  ).join('');
  el.querySelectorAll('button[data-idx]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      pendingMatchGuests.splice(parseInt(btn.dataset.idx,10), 1);
      renderMatchVenueGuestList();
    });
  });
}
function addPendingMatchGuest(){
  const input = $('#matchVenueGuestNameInput');
  if(!input) return;
  const name = input.value.trim();
  if(!name){ toast('용병 이름을 입력해 주시기 바랍니다.'); return; }
  if(pendingMatchGuests.includes(name)){ toast('이미 추가된 이름입니다.'); return; }
  pendingMatchGuests.push(name);
  input.value = '';
  renderMatchVenueGuestList();
  input.focus();
}
$('#addMatchVenueGuestBtn').addEventListener('click', addPendingMatchGuest);
$('#matchVenueGuestNameInput').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){ e.preventDefault(); addPendingMatchGuest(); }
});

/* ---------- 미투표 통계 제외 주간 (시험운영 기간 등) ---------- */
function renderExcludeWeekList(){
  const el = $('#excludeWeekList');
  if(!el) return;
  const weeks = [...(appData.excludedWeeks || [])].sort();
  if(!weeks.length){
    el.innerHTML = '<span class="empty-hint">제외된 주간이 없습니다.</span>';
    return;
  }
  el.innerHTML = weeks.map(wk=>{
    const dates = getWeekDates(wk);
    const s = parseYMD(dates[0]), e = parseYMD(dates[6]);
    const label = `${s.getMonth()+1}.${s.getDate()} ~ ${e.getMonth()+1}.${e.getDate()}`;
    return `<span class="guest-chip">${escapeHtml(label)}<button type="button" data-week="${wk}" title="제외 해제">✕</button></span>`;
  }).join('');
  el.querySelectorAll('button[data-week]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const wk = btn.dataset.week;
      await mutateAppData(data=>{
        data.excludedWeeks = (data.excludedWeeks || []).filter(w=>w!==wk);
      });
      renderExcludeWeekList();
      computeAttendanceStats();
      toast('제외 해제했습니다. 다시 팀 순위 통계에 포함됩니다.');
    });
  });
}
$('#addExcludeWeekBtn').addEventListener('click', async ()=>{
  if(!requireAdmin()) return;
  const dateInput = $('#excludeWeekDateInput');
  const dateVal = dateInput.value;
  if(!dateVal){ toast('날짜를 선택해 주시기 바랍니다.'); return; }
  const weekKey = getWeekStart(dateVal);
  if((appData.excludedWeeks||[]).includes(weekKey)){ toast('이미 제외된 주간입니다.'); return; }
  await mutateAppData(data=>{
    if(!data.excludedWeeks) data.excludedWeeks = [];
    data.excludedWeeks.push(weekKey);
  });
  dateInput.value = '';
  renderExcludeWeekList();
  computeAttendanceStats();
  toast('해당 주간을 팀 순위 통계에서 제외했습니다.');
});

function loadMatchVenueTimeEditorForDate(dateStr){
  const info = getVenueInfo(dateStr);
  const sel = $('#matchVenuePresetSelect');
  if(sel) sel.value = (info && findVenuePreset(info.name)) ? info.name : '';
  const timeInput = $('#matchVenueTimeInput');
  if(timeInput) timeInput.value = info && info.time ? info.time : '';
  const linkInput = $('#matchVenueLinkInput');
  if(linkInput) linkInput.value = info && info.link ? info.link : '';
  const formatSelect = $('#matchVenueFormatSelect');
  if(formatSelect) formatSelect.value = (info && info.format) ? info.format : '';
  pendingMatchGuests = [...((appData.matchGuests && appData.matchGuests[dateStr]) || [])];
  renderMatchVenueGuestList();
}
/* 관리자가 입력한 링크를 정리합니다. http(s):// 로 시작하지 않으면 https:// 를 붙여 정상적인 링크로 저장합니다. */
function normalizeMatchLink(raw){
  const v = (raw||'').trim();
  if(!v) return '';
  if(/^https?:\/\//i.test(v)) return v;
  return 'https://' + v;
}
$('#matchVenueDateInput').addEventListener('change', (e)=>{
  if(e.target.value) loadMatchVenueTimeEditorForDate(e.target.value);
});
$('#saveMatchVenueTimeBtn').addEventListener('click', async ()=>{
  if(!requireAdmin()) return;
  const statusEl = $('#matchVenueTimeStatus');
  const dateStr = $('#matchVenueDateInput').value;
  const venueName = $('#matchVenuePresetSelect').value;
  const timeStr = $('#matchVenueTimeInput').value.trim();
  const linkRaw = $('#matchVenueLinkInput').value.trim();
  const formatVal = $('#matchVenueFormatSelect').value; // '5' | '6' | '' (미지정)
  if(!dateStr){ statusEl.textContent = '날짜를 선택해 주시기 바랍니다.'; statusEl.style.color='var(--danger)'; return; }
  if(!venueName){ statusEl.textContent = '경기장을 선택해 주시기 바랍니다.'; statusEl.style.color='var(--danger)'; return; }
  let link = '';
  if(linkRaw){
    link = normalizeMatchLink(linkRaw);
    try{ new URL(link); }catch(e){ statusEl.textContent = '경기 링크 형식이 올바르지 않습니다.'; statusEl.style.color='var(--danger)'; return; }
  }
  const guests = [...pendingMatchGuests];
  const preset = findVenuePreset(venueName);
  const isActuallyConfirmed = !!(appData.votes[dateStr] && appData.votes[dateStr].length>0);
  await mutateAppData(data=>{
    data.venues[dateStr] = { name: venueName, address: preset ? preset.address : '', time: timeStr, link, format: formatVal || null };
    if(!data.matchGuests) data.matchGuests = {};
    if(guests.length) data.matchGuests[dateStr] = guests;
    else delete data.matchGuests[dateStr];
  });
  renderCalendar();
  renderMatchStats();
  renderMatchVenueConfirmedHint();
  if(!isActuallyConfirmed){
    statusEl.style.color = 'var(--amber)';
    statusEl.textContent = '저장했지만, 이 날짜는 아직 실제로 확정된 경기일이 아닙니다. 홈 화면에는 표시되지 않을 수 있습니다.';
  } else {
    statusEl.style.color = 'var(--pitch)';
    statusEl.textContent = '저장했습니다.';
  }
  toast('경기장/시간/링크/용병 정보를 저장했습니다.');
});


function hideMap(){
  $('#mapEmpty').style.display='block'; $('#map').style.display='none'; $('#mapFullscreenBtn').style.display='none';
  if(marker){ marker.setMap(null); marker = null; }
}

// TODO: 정식 배포 전 Supabase Auth 및 서버 측 권한 검증으로 이전 필요 (클라이언트에 API 키 노출)
const KAKAO_JS_KEY = '120b5bb6ea3f8f79aa298231e1a6c04e';
let kakaoReady = false;
let kakaoLoadFailed = false;

/* 카카오맵 SDK는 네이버와 달리 인증 실패를 콜백으로 알려주지 않고, 등록되지 않은 도메인에서는
   자체적으로 경고창을 띄우며 로드를 마치지 않습니다. 그래서 일정 시간 안에 로드가 끝나지 않으면
   실패로 간주하는 타임아웃 방식으로 감지합니다. */
function loadKakaoScript(){
  return new Promise((resolve, reject)=>{
    if(window.kakao && window.kakao.maps && window.kakao.maps.Map){ resolve(); return; }
    if(window.kakao && window.kakao.maps && window.kakao.maps.load){ kakao.maps.load(resolve); return; }
    const s = document.createElement('script');
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_JS_KEY)}&autoload=false&libraries=services`;
    s.onload = ()=>{
      try{ kakao.maps.load(resolve); }catch(e){ reject(e); }
    };
    s.onerror = ()=>reject(new Error('스크립트 로드 실패'));
    document.head.appendChild(s);
  });
}
async function ensureKakaoReady(){
  if(kakaoLoadFailed){ $('#mapConfigBox').style.display='block'; return false; }
  if(kakaoReady) return true;
  try{
    await Promise.race([
      loadKakaoScript(),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('타임아웃')), 5000))
    ]);
    kakaoReady = true;
    $('#mapConfigBox').style.display='none';
    return true;
  }catch(e){
    kakaoLoadFailed = true;
    $('#mapConfigBox').style.display='block';
    toast('카카오맵을 불러오지 못했습니다. 등록된 도메인에서 열었는지 확인해 주시기 바랍니다.');
    return false;
  }
}

/* 지도 전체화면 / 축소
   아이폰 사파리(홈 화면 추가 포함)는 임의의 요소에 대한 네이티브 전체화면 API를 지원하지 않아서,
   화면 전체를 덮는 CSS 클래스를 직접 토글하는 방식으로 구현했습니다. 모든 환경에서 동일하게 동작합니다. */
function isMapFullscreen(){
  const el = $('#mapWrap');
  return !!(el && el.classList.contains('map-fullscreen-mode'));
}
function setMapFullscreen(on){
  const el = $('#mapWrap');
  const btn = $('#mapFullscreenBtn');
  if(!el) return;
  el.classList.toggle('map-fullscreen-mode', on);
  document.body.classList.toggle('map-fullscreen-open', on);
  if(btn) btn.textContent = on ? '✕ 닫기' : '⤢ 전체화면';
  setTimeout(()=>{
    try{ if(map) map.relayout(); }catch(e){}
    const focusName = currentExpandedVenue || confirmedVenueName;
    if(map && focusName && venuePinObjects[focusName]){ map.setCenter(venuePinObjects[focusName].pos); }
  }, 100);
}
$('#mapFullscreenBtn').addEventListener('click', ()=>{
  setMapFullscreen(!isMapFullscreen());
});
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape' && isMapFullscreen()) setMapFullscreen(false);
});

/* 주소가 있으면 정확한 주소 검색(Geocoder)을, 없으면 이름으로 장소 검색(Places)을 사용합니다. */
function kakaoGeocode(query, isAddress){
  return new Promise((resolve)=>{
    if(!window.kakao || !kakao.maps || !kakao.maps.services){
      console.error('카카오맵 services 라이브러리가 로드되지 않았습니다. (libraries=services 파라미터 또는 콘솔의 로컬 API 활성화 여부를 확인해주세요)');
      resolve(null);
      return;
    }
    if(isAddress){
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.addressSearch(query, (result, status)=>{
        console.log('[카카오 주소검색]', query, 'status:', status, result);
        if(status === kakao.maps.services.Status.OK && result[0]){
          resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
        } else { resolve(null); }
      });
    } else {
      const places = new kakao.maps.services.Places();
      places.keywordSearch(query, (result, status)=>{
        console.log('[카카오 키워드검색]', query, 'status:', status, result);
        if(status === kakao.maps.services.Status.OK && result[0]){
          resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
        } else { resolve(null); }
      });
    }
  });
}

let adhocVenueOverlay = null; // 목록에 없는 경기장을 직접 검색했을 때 쓰는 임시 핀
async function placeVenueMarker(info){
  // 이전에 열려있던 임시(목록 외 검색) 핀은 정리합니다.
  if(adhocVenueOverlay){ adhocVenueOverlay.setMap(null); adhocVenueOverlay = null; }

  // 목록에 있는 경기장이면, 이미 지도에 찍혀있는 핀을 그대로 펼쳐서 보여줍니다.
  const existing = venuePinObjects[info.name];
  if(existing){
    expandVenuePin(info.name);
    map.setLevel(3);
    return;
  }

  // 목록에 없는 경기장(직접 검색)은 임시 핀을 새로 만듭니다.
  let coords = null;
  // 1) 주소가 있으면 정확한 주소로 먼저 검색합니다.
  if(info.address){
    coords = await kakaoGeocode(info.address, true);
  }
  // 2) 주소 검색이 실패했거나 주소가 없으면, 장소 이름으로 다시 검색합니다.
  //    (등록된 주소 표기가 카카오 주소 데이터와 정확히 일치하지 않아도 이름으로는 찾히는 경우가 많습니다)
  if(!coords){
    coords = await kakaoGeocode(info.name + ' 서울', false);
  }
  // 3) 여전히 실패하면 "서울" 없이 이름 그대로, 그리고 "풋살"을 붙여 한 번씩 더 시도합니다.
  //    (플랩풋볼의 실제 상호명이 프리셋과 다르거나, "서울"이 붙으면 오히려 검색이 안 되는 경우가 있음)
  if(!coords){
    coords = await kakaoGeocode(info.name, false);
  }
  if(!coords){
    coords = await kakaoGeocode(info.name + ' 풋살', false);
  }
  if(!coords){ toast(`'${info.name}' 위치를 찾지 못했습니다. 지도에서 직접 검색해 보시기 바랍니다.`); return; }
  const pos = new kakao.maps.LatLng(coords.lat, coords.lng);
  map.setCenter(pos);
  map.setLevel(3);
  collapseAllVenuePins();
  const el = document.createElement('div');
  el.className = 'venue-pin regular expanded';
  el.innerHTML = `
    <div class="vp-head">📍 <b>${escapeHtml(info.name)}</b></div>
    ${info.address ? `<div class="vp-addr">${escapeHtml(info.address)}</div><button type="button" class="vp-copy">주소 복사</button>` : '<div class="vp-addr">등록된 주소가 없습니다</div>'}
  `;
  const copyBtn = el.querySelector('.vp-copy');
  if(copyBtn) copyBtn.addEventListener('click', (e)=>{ e.stopPropagation(); window.copyVenueAddress(info.address); });
  el.addEventListener('click', (e)=>e.stopPropagation());
  adhocVenueOverlay = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, xAnchor: 0.5, zIndex: 5 });
  adhocVenueOverlay.setMap(map);
}

/* ---------- Init ---------- */
$('#prevMonth').addEventListener('click', ()=>{ if(window.__calWeekMode && selectedDate){ const d=parseYMD(selectedDate); d.setDate(d.getDate()-7); setSelectedDate(fmtDate(d)); return; } viewMonth--; if(viewMonth<0){viewMonth=11; viewYear--;} renderCalendar(); });
$('#nextMonth').addEventListener('click', ()=>{ if(window.__calWeekMode && selectedDate){ const d=parseYMD(selectedDate); d.setDate(d.getDate()+7); setSelectedDate(fmtDate(d)); return; } viewMonth++; if(viewMonth>11){viewMonth=0; viewYear++;} renderCalendar(); });
(function(){
  const b = document.getElementById('calWeekModeBtn');
  if(!b) return;
  b.addEventListener('click', ()=>{
    window.__calWeekMode = !window.__calWeekMode;
    b.classList.toggle('on', !!window.__calWeekMode);
    const span = b.querySelector('span'); if(span) span.textContent = window.__calWeekMode ? '월간보기' : '주간보기';
    if(window.__calWeekMode && !selectedDate) selectedDate = todayStr();
    if(selectedDate) syncCalendarWithDate(selectedDate); else renderCalendar();
  });
})();

function shiftSelectedDate(days){
  const base = selectedDate ? parseYMD(selectedDate) : new Date();
  base.setDate(base.getDate()+days);
  setSelectedDate(fmtDate(base));
}
$('#dateNavPrev').addEventListener('click', ()=>shiftSelectedDate(-1));
$('#dateNavToday').addEventListener('click', ()=>setSelectedDate(todayStr()));
$('#dateNavNext').addEventListener('click', ()=>shiftSelectedDate(1));

$('#logoutBtn').addEventListener('click', async ()=>{
  if(!confirm('로그아웃하시겠습니까?\n자동 로그인은 해제되며, "아이디 및 참석코드 저장"을 체크해 두었다면 아이디와 참석코드는 그대로 유지됩니다.')) return;
  if(myName){
    await mutateAppData(data=>{
      if(!data.members) data.members = {};
      if(data.members[myName]) data.members[myName].status = 'offline';
    });
  }
  try{ clearLoginSessionOnly(); }catch(e){}
  window.location.reload();
});

(async function initLogin(){
  // 저장된 아이디/참석코드를 화면에 먼저 채워둡니다 (자동 로그인 성공 여부와 무관하게 항상 표시)
  const rememberPref = getLocalRememberPref();
  $('#rememberIdChk').checked = rememberPref;
  const savedCode = getLocalCode();
  if(savedCode) $('#loginAccessCode').value = savedCode;
  const stored = getLocalName();
  if(stored) $('#loginId').value = stored;

  const storedBirth = getLocalBirth();
  if(stored && storedBirth){
    const result = await loginOrValidate(stored, storedBirth);
    if(!result.ok){
      $('#loginId').value = stored;
      if(result.pending){
        // 승인 대기 중: 기기에 저장된 정보는 유지하고 안내만 표시
        $('#loginError').style.color = 'var(--amber)';
        $('#loginError').textContent = result.message;
      } else {
        // 저장된 정보가 더 이상 유효하지 않음 → 다시 로그인하도록 안내
        clearLocalLogin();
        $('#loginError').style.color = 'var(--danger)';
        $('#loginError').textContent = '저장된 로그인 정보가 유효하지 않습니다. 다시 로그인해 주십시오.';
      }
      return;
    }
    myName = stored;
    myBirth = storedBirth;
    appData = result.data;
    $('#loginId').value = stored;
    $('#nameTag').textContent = myName;
    $('#birthTag').textContent = `(${myBirth})`;
    $('#adminBadge').style.display = isAdmin() ? 'inline-block' : 'none';
    $('#loginOverlay').classList.add('hidden');
    await initAppUI();
  }
})();

/* ---------- 홈 섹션(모바일 첫 화면) 미니 위젯 렌더링 ---------- */
function renderHomeTab(){
  if(typeof appData==='undefined' || !appData || !myName) return;

  const voteCard = document.getElementById('homeVoteCard');
  if(voteCard){
    const thisWeekKey = getWeekStart(todayStr());
    const weekKey = thisWeekKey;
    const info = getWeekInfo(weekKey);
    const sorted = info.dates.map(d=>({d, c: info.counts[d]||0})).filter(x=>x.c>0).sort((a,b)=>b.c-a.c).slice(0,3);
    const label = getWeekLabel(weekKey);
    let rowsHtml;
    if(!sorted.length){
      rowsHtml = `<div class="rank-empty">아직 ${escapeHtml(label)} 투표가 없습니다.</div>`;
    } else {
      const maxC = sorted[0].c || 1;
      rowsHtml = sorted.map(x=>{
        const o = parseYMD(x.d);
        const isConf = info.confirmedDates.includes(x.d);
        return `<div class="home-vote-row"><span class="hv-date">${o.getMonth()+1}.${o.getDate()}(${weekdayKR[o.getDay()]})${isConf?' 🏆':''}</span><div class="hv-bar-wrap"><div class="hv-bar" style="width:${Math.round(x.c/maxC*100)}%;"></div></div><span class="hv-count">${x.c}표</span></div>`;
      }).join('');
    }
    // 투표 참여율: 그 주에 날짜를 하나라도 고르거나 "불참"을 선언한 사람 / 승인된 선수(관리자·부상 기간 제외)
    const weekAvail = (appData.weekAvailability && appData.weekAvailability[weekKey]) || {};
    const weekAbs = (appData.weekAbsence && appData.weekAbsence[weekKey]) || {};
    const eligible = getApprovedNonAdminNames().filter(n=>!isInjuredDuringWeek(n, weekKey));
    const votedCount = eligible.filter(n=>(weekAvail[n] && weekAvail[n].length>0) || weekAbs[n]).length;
    const ratePct = eligible.length ? Math.round(votedCount/eligible.length*100) : 0;
    let subText;
    const pickDate = info.confirmedDates.length ? [...info.confirmedDates].sort()[0] : (sorted.length ? sorted[0].d : null);
    if(pickDate){
      const o = parseYMD(pickDate);
      const vi = (typeof getVenueInfo==='function') ? getVenueInfo(pickDate) : null;
      subText = `(${weekdayKR[o.getDay()]})${vi && vi.time ? ' '+String(vi.time).slice(0,5) : ''} 경기`;
    } else {
      subText = '아직 투표가 없습니다';
    }
    voteCard.innerHTML = `
      <div class="hv-head">
        <div class="hv-title">
          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.6 2.9-6 6.500-6s6.500 2.4 6.500 6z"/><circle cx="17" cy="9" r="2.6"/><path d="M16.300 14.100c3-.3 5.200 1.600 5.200 5.900h-4.400c0-2.200-.3-4.200-.8-5.900z"/></svg>
          <div><b>이번 주 참석 투표</b><small>${escapeHtml(subText)}</small></div>
        </div>
        <div class="hv-rate"><div class="hv-rate-top"><small>참여율</small><b>${ratePct}%</b></div><div class="hv-progress"><div class="hv-progress-bar" style="width:${ratePct}%;"></div></div><div class="hv-people">${votedCount} / ${eligible.length}명</div></div>
      </div>
      <button class="home-goto-btn" id="homeGotoCalBtn"><span class="gt-chk"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.500 4.500 4.500L19 7.500"/></svg></span>지금 참석 투표하기<span class="gt-arrow">›</span></button>
    `;
    const gotoBtn = document.getElementById('homeGotoCalBtn');
    if(gotoBtn) gotoBtn.addEventListener('click', ()=>{
      const calBtn = document.querySelector('.mobile-tabbar .tab-btn[data-tab="calendar"]');
      if(calBtn) calBtn.click();
      if(typeof setAttendPane==='function') setAttendPane('vote');
      if(typeof setSelectedDate==='function') setSelectedDate(weekKey);
      openVoteSheet();
    });
  }

  const teamStat = document.getElementById('homeTeamStat');
  if(teamStat){
    const st = computeMatchStats();
    const thisMonthKey = todayStr().slice(0,7);
    const thisMonthCount = st.byMonth[thisMonthKey] || 0;
    const rate = (typeof window.__teamAttendanceRate==='number') ? window.__teamAttendanceRate : null;
    const sv = (d)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    teamStat.innerHTML = `
      <div class="hts-title">팀 현황<small>(누적 기준)</small></div>
      <div class="hts-grid">
        <div class="hts-cell"><div class="lb">${sv('<circle cx="12" cy="12" r="9"/><path d="m12 8 3.2 2.3-1.2 3.8H10L8.8 10.3z"/>')}누적 경기</div><div class="v">${st.totalPlayed}<small>회</small></div></div>
        <div class="hts-cell"><div class="lb">${sv('<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>')}이번 달</div><div class="v">${thisMonthCount}<small>회</small></div></div>
        <div class="hts-cell"><div class="lb">${sv('<path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>')}예정 경기</div><div class="v">${st.upcomingCount}<small>회</small></div></div>
        <div class="hts-cell"><div class="lb">${sv('<path d="M5 20V12M12 20V5M19 20v-9"/>')}참가율</div><div class="v">${rate===null?'-':rate+'<small>%</small>'}</div></div>
      </div>
    `;
  }

  const wMini = document.getElementById('homeWeatherMini');
  if(wMini){
    if(typeof weekData!=='undefined' && weekData.thisWeek && weekData.thisWeek.length){
      const today = weekData.thisWeek[0];
      const amIcon = typeof weatherIconFromCode==='function' ? weatherIconFromCode(today.amCode!=null?today.amCode:today.code) : '☀️';
      const pmIcon = typeof weatherIconFromCode==='function' ? weatherIconFromCode(today.pmCode!=null?today.pmCode:today.code) : '☀️';
      wMini.innerHTML = `
        <div class="hm-label">날씨 정보 <span>›</span></div>
        <div class="hm-ampm-row">
          <div class="hm-ampm-col"><span class="hm-ampm-lb">오전</span><span class="hm-ampm-ico">${amIcon}</span><span class="hm-ampm-pop">${today.amPop||0}%</span></div>
          <div class="hm-ampm-col"><span class="hm-ampm-lb">오후</span><span class="hm-ampm-ico">${pmIcon}</span><span class="hm-ampm-pop">${today.pmPop||0}%</span></div>
        </div>
        <div class="hm-sub">${isFinite(today.tmax)?Math.round(today.tmax):'-'}° / ${isFinite(today.tmin)?Math.round(today.tmin):'-'}°</div>
      `;
    } else {
      wMini.innerHTML = `<div class="hm-label">날씨 정보 <span>›</span></div><div class="hm-sub">불러오는 중...</div>`;
    }
    wMini.onclick = ()=>setActiveMobileSection('weather');
  }

  const bMini = document.getElementById('homeBdayMini');
  if(bMini){
    const now = new Date();
    const curMonth = now.getMonth()+1;
    const curDay = now.getDate();
    const approvedNames = Object.keys(appData.members||{}).filter(n=>appData.members[n].approved);
    const monthBdays = approvedNames.map(n=>{
      const b = appData.members[n].birth;
      if(!b || b.length!==6) return null;
      const mm = parseInt(b.slice(2,4),10);
      const dd = parseInt(b.slice(4,6),10);
      if(mm !== curMonth) return null;
      return { n, day: dd };
    }).filter(Boolean).sort((a,b)=>a.day-b.day);

    if(monthBdays.length){
      const upcoming = monthBdays.find(x=>x.day>=curDay) || monthBdays[0];
      const isToday = upcoming.day===curDay;
      bMini.innerHTML = `
        <div class="hm-label">이번 달 생일 <span>›</span></div>
        <div class="hm-main" style="font-size:16px;">🎂🎉 ${escapeHtml(upcoming.n)}</div>
        <div class="hm-sub">${curMonth}.${upcoming.day}${monthBdays.length>1?` 외 ${monthBdays.length-1}명`:''}</div>
        <div class="hm-bday-msg">${isToday?`${escapeHtml(upcoming.n)}님, 생일을 축하합니다! 🎂🎉`:'생일을 축하합니다! 🎉'}</div>
      `;
    } else {
      bMini.innerHTML = `<div class="hm-label">이번 달 생일 <span>›</span></div><div class="hm-sub">이번 달 생일자가 없습니다</div>`;
    }
    bMini.onclick = ()=>setActiveMobileSection('records');
  }

  const recentCard = document.getElementById('homeRecentCard');
  if(recentCard){
    const todayS = todayStr();
    const played = Object.keys(appData.votes||{})
      .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d<=todayS && (appData.votes[d]||[]).length>0)
      .sort().reverse().slice(0,5);
    if(!played.length){
      recentCard.innerHTML = '<div class="rank-empty">아직 진행된 경기가 없습니다.</div>';
    } else {
      recentCard.innerHTML = played.map(d=>{
        const o = parseYMD(d);
        const venue = getVenueInfo(d);
        const venueLabel = venue ? `${escapeHtml(venue.name)}${venue.time?` · ${escapeHtml(venue.time)}`:''}` : '경기장 미등록';
        return `<div class="home-recent-row"><span class="hr-date">${o.getMonth()+1}.${o.getDate()}(${weekdayKR[o.getDay()]})</span><span class="hr-venue" title="${escapeHtml(venueLabel)}">${venueLabel}</span></div>`;
      }).join('');
    }
  }
}
function tryRenderHomeTab(){
  try{ renderHomeTab(); }catch(e){ console.error(e); }
  try{ updateBellState(); updateUserMenuLabel(); }catch(e){ console.error(e); }
}

/* ---------- 홈 상단: 알림 벨 / 내 메뉴 / 퀵 버튼 ---------- */
function updateBellState(){
  const b = document.getElementById('bellBtn');
  if(!b) return;
  b.classList.toggle('on', typeof Notification!=='undefined' && Notification.permission==='granted');
}
function updateUserMenuLabel(){
  const b = document.getElementById('userMenuBtn');
  if(b && myName) b.textContent = myName.charAt(0);
}
(function initHomeHeaderControls(){
  const bell = document.getElementById('bellBtn');
  if(bell) bell.addEventListener('click', ()=>{
    if(typeof Notification==='undefined'){ toast('이 기기에서는 알림을 지원하지 않습니다.'); return; }
    if(Notification.permission==='granted'){ toast('알림이 켜져 있습니다. 경기 확정·투표 마감 소식을 알려드려요.'); }
    else if(Notification.permission==='denied'){ toast('알림이 차단되어 있습니다. 브라우저(앱) 설정에서 허용해 주세요.'); }
    else {
      const en = document.getElementById('notifyEnableBtn');
      if(en) en.click();
      setTimeout(updateBellState, 1500);
      setTimeout(updateBellState, 5000);
    }
  });
  const menuBtn = document.getElementById('userMenuBtn');
  const box = document.getElementById('userBox');
  if(menuBtn && box){
    menuBtn.addEventListener('click', (e)=>{ e.stopPropagation(); box.classList.toggle('open'); });
    box.addEventListener('click', (e)=>{ if(e.target.closest('button')) box.classList.remove('open'); });
    document.addEventListener('click', (e)=>{ if(!box.contains(e.target) && e.target!==menuBtn) box.classList.remove('open'); });
  }
  document.querySelectorAll('.home-quick-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const go = btn.dataset.go;
      if(go==='vote'){
        setActiveMobileSection('calendar');
        if(typeof setAttendPane==='function') setAttendPane('vote');
        if(typeof setSelectedDate==='function') setSelectedDate(getWeekStart(todayStr()));
        openVoteSheet();
      } else {
        setActiveMobileSection(go);
      }
    });
  });
})();

/* ---------- 출석 화면: 세그먼트(출석투표 / 출석현황 / 최근경기) ---------- */
const ATTEND_SUBTITLES = {
  vote: '다음 주 경기가 가능한 날짜를 투표해 주세요!',
  status: '경기 참석 현황을 한눈에 확인하세요!',
  recent: '최근에 진행된 경기를 확인하세요!'
};
let attendPane = 'vote';
let attendRecordFilter = 'all';
function setAttendPane(pane){
  attendPane = pane;
  document.querySelectorAll('#attendSeg .seg-btn').forEach(b=>b.classList.toggle('active', b.dataset.pane===pane));
  document.querySelectorAll('#sectionCalendar .attend-pane').forEach(el=>el.classList.toggle('active', el.dataset.pane===pane));
  const sub = document.getElementById('attendSubtitle');
  if(sub) sub.textContent = ATTEND_SUBTITLES[pane] || '';
  tryRenderAttendPanes();
}
/* 지난 확정 경기 날짜 목록 (최신순) — 기존 투표 데이터에서만 가져옵니다 */
function getPlayedMatchDates(limit){
  const todayS = todayStr();
  const excluded = new Set(appData.excludedWeeks || []);
  return Object.keys(appData.votes||{})
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d<=todayS && (appData.votes[d]||[]).length>0 && !excluded.has(getWeekStart(d)))
    .sort().reverse().slice(0, limit||30);
}
function renderAttendStatus(){
  const el = document.getElementById('attendStatusPane');
  if(!el || !appData || !myName) return;
  if(myName===ADMIN_NAME){
    el.innerHTML = '<div class="rank-empty">관리자 계정은 선수가 아니라 운영 계정이라 출석 집계에서 제외됩니다.</div>';
    return;
  }
  const st = window.__myAttend || {yes:0,no:0,total:0,miss:0};
  const rate = st.total ? Math.round(st.yes/st.total*100) : 0;
  const ic = (d)=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const icYes = '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 9.5"/>';
  const icMiss = '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1.9-1.1 1.8M12 17h.01"/>';
  const icNo = '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>';

  const dates = getPlayedMatchDates(30);
  const rows = [];
  dates.forEach(d=>{
    const bd = getVoteBreakdownForDate(d);
    let status = null;
    if(bd.yesList.includes(myName)) status = 'yes';
    else if(bd.noList.includes(myName)) status = 'no';
    else if(bd.notVotedList.includes(myName)) status = 'miss';
    if(!status) return;
    if(typeof isInjuredOnDate==='function' && isInjuredOnDate(myName, d)) return;
    rows.push({d, status});
  });
  const shown = rows.filter(r=>attendRecordFilter==='all' || r.status===attendRecordFilter);
  const label = {yes:'참석', no:'불참', miss:'미투표'};
  const rowHtml = shown.length ? shown.map(r=>{
    const o = parseYMD(r.d); const v = getVenueInfo(r.d);
    return `<div class="ar-row"><span class="ar-date">${o.getMonth()+1}/${o.getDate()}<small>(${weekdayKR[o.getDay()]})</small></span><span class="ar-name">${escapeHtml(v ? v.name : '경기장 미등록')}</span><span class="ar-badge ${r.status}">${label[r.status]}</span></div>`;
  }).join('') : '<div class="rank-empty">표시할 기록이 없습니다.</div>';

  el.innerHTML = `
    <div class="sec-title"><i></i>내 출석 현황</div>
    <div class="as-cards">
      <div class="as-card yes">${ic(icYes)}<span>참석</span><b>${st.yes}회</b></div>
      <div class="as-card miss">${ic(icMiss)}<span>미투표</span><b>${st.miss}회</b></div>
      <div class="as-card no">${ic(icNo)}<span>불참</span><b>${st.no}회</b></div>
    </div>
    <div class="as-donut-card">
      <div class="as-donut" style="background:conic-gradient(var(--lime) 0% ${rate}%, rgba(255,255,255,.12) ${rate}% 100%);"><div class="as-donut-in"><small>참석률</small><b>${st.total ? rate+'%' : '-'}</b></div></div>
      <div class="as-legend">
        <div><span class="lg">총 일정</span><b>${st.total}회</b></div>
        <div><span class="lg yes">참석</span><b>${st.yes}회</b></div>
        <div><span class="lg miss">미투표</span><b>${st.miss}회</b></div>
        <div><span class="lg no">불참</span><b>${st.no}회</b></div>
      </div>
    </div>
    <div class="sec-title between"><span><i></i>회차별 출석 기록</span>
      <div class="ar-filter" id="attendFilterRow">
        ${[['all','전체'],['yes','참석'],['no','불참'],['miss','미투표']].map(([k,t])=>`<button type="button" class="${attendRecordFilter===k?'active':''}" data-f="${k}">${t}</button>`).join('')}
      </div>
    </div>
    <div class="ar-list">${rowHtml}</div>
  `;
  el.querySelectorAll('#attendFilterRow button').forEach(b=>b.addEventListener('click', ()=>{ attendRecordFilter=b.dataset.f; renderAttendStatus(); }));
}
function renderAttendRecent(){
  const el = document.getElementById('attendRecentPane');
  if(!el || !appData) return;
  const dates = getPlayedMatchDates(15);
  el.innerHTML = `<div class="sec-title"><i></i>최근 경기 일정</div>` + (dates.length ? dates.map(d=>{
    const o = parseYMD(d); const v = getVenueInfo(d);
    return `<div class="rc-item" data-date="${d}">
      <div class="rc-card">
        <div class="rc-date"><span>${o.getMonth()+1}월</span><b>${o.getDate()}일 (${weekdayKR[o.getDay()]})</b></div>
        <div class="rc-info">
          <div class="rc-venue"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>${escapeHtml(v ? v.name : '경기장 미등록')}</div>
          ${v && v.time ? `<div class="rc-time"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${escapeHtml(v.time)}</div>` : ''}
        </div>
        <span class="rc-chev">›</span>
      </div>
      <div class="rc-tactics" style="display:none;"></div>
    </div>`;
  }).join('') : '<div class="rank-empty">아직 진행된 경기가 없습니다.</div>');
  /* 카드를 누르면 그 경기의 전술(포메이션) 미리보기를 펼칩니다 — 기존 기록 탭과 같은 기능 */
  el.querySelectorAll('.rc-item').forEach(item=>{
    item.querySelector('.rc-card').addEventListener('click', ()=>{
      const box = item.querySelector('.rc-tactics');
      const open = box.style.display !== 'none';
      if(open){ box.style.display='none'; item.classList.remove('open'); return; }
      box.style.display='block'; item.classList.add('open');
      try{ renderTacticsMiniForDate(item.dataset.date, box); }catch(e){ console.error(e); }
    });
  });
}
function tryRenderAttendPanes(){
  try{
    if(attendPane==='status') renderAttendStatus();
    if(attendPane==='recent') renderAttendRecent();
  }catch(e){ console.error(e); }
}
document.querySelectorAll('#attendSeg .seg-btn').forEach(b=>b.addEventListener('click', ()=>setAttendPane(b.dataset.pane)));

/* ---------- 더보기 화면 ---------- */
function tryRenderMoreTab(){
  try{
    const me = document.getElementById('moreMeCard');
    if(me && myName){
      const rate = document.getElementById('myRateTag');
      me.innerHTML = `<div class="mm-avatar">${escapeHtml(myName.charAt(0))}</div><div class="mm-tx"><b>${escapeHtml(myName)}${isAdminUser()?' <span class="admin-badge">관리자</span>':''}</b><small>${escapeHtml(rate ? rate.textContent : '')}</small></div>`;
    }
    const adminRow = document.getElementById('moreAdminRow');
    if(adminRow) adminRow.style.display = isAdminUser() ? 'flex' : 'none';
  }catch(e){ console.error(e); }
}
document.querySelectorAll('#sectionMore .more-row').forEach(row=>{
  row.addEventListener('click', ()=>{
    if(row.dataset.go){ setActiveMobileSection(row.dataset.go); return; }
    const act = row.dataset.act;
    const click = (id)=>{ const b=document.getElementById(id); if(b) b.click(); };
    if(act==='members') click('memberViewAllBtn');
    else if(act==='bell') click('bellBtn');
    else if(act==='logout') click('logoutBtn');
    else if(act==='injury'){ click('myInjuryToggleBtn'); window.scrollTo({top:0,behavior:'smooth'}); }
  });
});

/* ---------- 모바일 하단 탭 전환 (768px 이하에서만 시각적으로 의미가 있지만, 클래스 토글 자체는 항상 동작) ---------- */
function setActiveMobileSection(tabKey){
  const tabHi = ['tactics','weather','records','admin'].includes(tabKey) ? 'more' : tabKey;
  document.querySelectorAll('.mobile-tabbar .tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===tabHi));
  document.querySelectorAll('.app-section').forEach(s=>s.classList.remove('mobile-active'));
  const idMap = { home:'sectionHome', weather:'sectionWeather', calendar:'sectionCalendar', matches:'sectionMatches', map:'sectionMap', records:'sectionRecords', admin:'sectionAdmin', tactics:'sectionTactics', more:'sectionMore' };
  const sec = document.getElementById(idMap[tabKey] || '');
  if(sec) sec.classList.add('mobile-active');
  // 상단 헤더(공생관 FS·알림·사용자 버튼)는 홈 화면에서만 보여줍니다.
  document.body.classList.toggle('hide-header', tabKey!=='home');
  window.scrollTo({top:0, behavior:'instant'});
  if(tabKey==='home') tryRenderHomeTab();
  if(tabKey==='more') tryRenderMoreTab();
  if(tabKey==='calendar') tryRenderAttendPanes();
  if(tabKey==='map') loadDefaultMapVenue();
  if(tabKey==='matches') initMatchesTabOnce();
  if(tabKey==='tactics') initTacticsTabOnce();
}
document.querySelectorAll('.mobile-tabbar .tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>setActiveMobileSection(btn.dataset.tab));
});
// 기록/관리자는 하단 탭바가 아니라 헤더의 별도 버튼에서 진입합니다 (같은 화면 전환 방식을 그대로 재사용).
const recordsEntryBtn = $('#recordsEntryBtn');
if(recordsEntryBtn) recordsEntryBtn.addEventListener('click', ()=>setActiveMobileSection('records'));
const adminEntryBtn = $('#adminEntryBtn');
if(adminEntryBtn) adminEntryBtn.addEventListener('click', ()=>setActiveMobileSection('admin'));
document.querySelectorAll('.section-back-btn[data-back-to]').forEach(btn=>{
  btn.addEventListener('click', ()=>setActiveMobileSection(btn.dataset.backTo));
});
setActiveMobileSection('home'); // 모바일 폭에서 기본으로 보일 탭

/* ================= PWA 설치 & 알림 ================= */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(e=>console.error('SW 등록 실패', e));
  });
}

const NOTIFY_DISMISS_KEY = 'futsal-notify-dismissed';
const NOTIFY_LAST_CONFIRMED_KEY = 'futsal-notify-last-confirmed';
const NOTIFY_LAST_VOTE_REMINDER_KEY = 'futsal-notify-last-vote-reminder-date';

function isNotificationSupported(){ return typeof Notification !== 'undefined'; }

async function sendLocalNotification(title, options){
  if(!isNotificationSupported() || Notification.permission !== 'granted') return;
  try{
    if('serviceWorker' in navigator){
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  }catch(e){ console.error(e); }
}

function updateNotifyBanner(){
  const banner = document.getElementById('notifyBanner');
  if(!banner) return;
  if(!isNotificationSupported() || Notification.permission !== 'default' || localStorage.getItem(NOTIFY_DISMISS_KEY)==='1'){
    banner.style.display = 'none';
    return;
  }
  banner.style.display = 'flex';
}

const notifyEnableBtn = document.getElementById('notifyEnableBtn');
if(notifyEnableBtn) notifyEnableBtn.addEventListener('click', async ()=>{
  if(!isNotificationSupported()){ toast('이 브라우저는 알림 기능을 지원하지 않습니다.'); return; }
  const perm = await Notification.requestPermission();
  if(perm === 'granted'){
    toast('알림이 켜졌습니다.');
    sendLocalNotification('공생관 알림이 켜졌습니다', { body:'경기 확정, 투표 마감 소식을 알려드리겠습니다.', icon:'./assets/icon-192.png' });
  } else {
    toast('알림이 차단되었습니다. 브라우저 설정에서 변경할 수 있습니다.');
  }
  updateNotifyBanner();
});
const notifyDismissBtn = document.getElementById('notifyDismissBtn');
if(notifyDismissBtn) notifyDismissBtn.addEventListener('click', ()=>{
  localStorage.setItem(NOTIFY_DISMISS_KEY, '1');
  updateNotifyBanner();
});

/* 경기 확정 알림: 마지막으로 확인했던 확정 경기일과 지금 실제 확정된 경기일이 다르면(=새로 확정됨) 알려줍니다.
   주의: 서버가 없어 실시간 푸시는 아니며, 이 브라우저에서 앱을 열거나 새로고침했을 때만 확인합니다. */
function checkMatchConfirmedNotification(){
  if(!isNotificationSupported() || Notification.permission!=='granted') return;
  if(typeof appData==='undefined' || !appData) return;
  const todayS = todayStr();
  const confirmedDates = Object.keys(appData.votes||{})
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=todayS && (appData.votes[d]||[]).length>0)
    .sort();
  const nearest = confirmedDates[0];
  if(!nearest) return;
  const lastSeen = localStorage.getItem(NOTIFY_LAST_CONFIRMED_KEY);
  if(lastSeen === nearest) return;
  localStorage.setItem(NOTIFY_LAST_CONFIRMED_KEY, nearest);
  if(lastSeen === null) return; // 최초 방문에서는 알리지 않고 기준값만 저장합니다.
  const o = parseYMD(nearest);
  const venue = getVenueInfo(nearest);
  sendLocalNotification('⚽ 경기가 확정되었습니다', {
    body: `${o.getMonth()+1}.${o.getDate()}(${weekdayKR[o.getDay()]})${venue?' · '+venue.name:''}`,
    icon: './assets/icon-192.png',
    tag: 'match-confirmed'
  });
}

/* 투표 마감 리마인드: 이번 주가 아직 확정되지 않았고, 내가 가능일 선택도 불참 선언도 안 했으면
   목요일부터 하루 한 번만 알려줍니다. */
function checkVoteDeadlineReminder(){
  if(!isNotificationSupported() || Notification.permission!=='granted') return;
  if(typeof myName==='undefined' || !myName) return;
  const now = kstNow();
  if(now.getDay() < 4) return; // 목(4)·금(5)·토(6)요일에만 리마인드
  const todayS = todayStr();
  if(localStorage.getItem(NOTIFY_LAST_VOTE_REMINDER_KEY) === todayS) return;

  const weekKey = getWeekStart(todayS);
  const info = getWeekInfo(weekKey);
  if(info.confirmedDates && info.confirmedDates.length) return; // 이미 확정되었으면 리마인드하지 않음
  const myAvail = (info.avail && info.avail[myName]) || [];
  const absenceMap = (appData.weekAbsence && appData.weekAbsence[weekKey]) || {};
  if(myAvail.length>0 || absenceMap[myName]) return; // 이미 응답함

  localStorage.setItem(NOTIFY_LAST_VOTE_REMINDER_KEY, todayS);
  sendLocalNotification('🗳️ 아직 이번 주 투표를 하지 않으셨습니다', {
    body: '경기 날짜 투표 마감이 다가옵니다. 앱을 열어 참석 가능한 날짜를 선택해 주세요.',
    icon: './assets/icon-192.png',
    tag: 'vote-reminder'
  });
}

/* ================= 경기 탭 (플랩풋볼, Supabase public.plab_matches 조회 전용) =================
   ⚠️ 이 섹션은 GitHub Actions/fetch-plab.js/Supabase 테이블 구조를 전혀 건드리지 않고,
   이미 저장되어 있는 plab_matches 테이블을 "읽기 전용"으로 조회만 합니다.
   즐겨찾기는 독립된 favorite_venues 테이블(favoriteVenueSet)을 그대로 사용합니다. */

let selectedMatchDate = null; // YYYY-MM-DD
let matchTimeFilter = 'evening';  // all | morning | afternoon | evening (기본은 저녁 19시 이후)
let matchFavOnly = false;
let matchFormatFilter = 'all'; // all | '5' | '6' (player_count에서 뽑은 인원수 기준)
let matchHideFull = true; // 마감(apply_status==='full') 경기 가리기. 기본값은 가림.
let matchesTabInited = false;
let lastMatchRows = [];
let matchVisibleCount = 10;
const MATCHES_PER_PAGE = 10;

/* player_count는 "6vs6", "6VS6", "6:6" 등 표기가 섞여 들어올 수 있어, 첫 숫자만 뽑아 비교 기준으로 삼습니다. */
function matchFormatNumber(playerCount){
  const m = String(playerCount||'').match(/\d+/);
  return m ? m[0] : null;
}

/* 오늘부터 14일치 날짜 목록 (KST 기준) */
function buildMatchDateList(){
  const base = kstNow();
  const list = [];
  for(let i=0;i<14;i++){
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate()+i);
    list.push(fmtDate(d));
  }
  return list;
}

function renderMatchDateScroller(){
  const el = $('#matchDateScroll');
  if(!el) return;
  const dates = buildMatchDateList();
  const todayS = todayStr();
  el.innerHTML = dates.map(d=>{
    const o = parseYMD(d);
    const isToday = d===todayS;
    const label = isToday ? '오늘' : weekdayKR[o.getDay()];
    return `<div class="match-date-chip ${d===selectedMatchDate?'active':''}" data-date="${d}">
      <span class="md-label">${label}</span>
      <span class="md-date">${o.getMonth()+1}/${o.getDate()}</span>
    </div>`;
  }).join('');
  el.querySelectorAll('.match-date-chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      selectedMatchDate = chip.dataset.date;
      matchVisibleCount = MATCHES_PER_PAGE;
      renderMatchDateScroller();
      loadMatchesForSelectedDate();
    });
  });
}

/* 모집 상태 판정: Supabase의 apply_status는 'available'(모집중) / 'hurry'(마감임박) /
   'full'(마감) 세 가지입니다. (2026-08부터 fetch-plab.js가 hide_soldout 없이 수집해
   마감 경기도 'full'로 저장합니다. 기본은 "마감경기 가리기" 필터로 화면에서 가려집니다.) */
function getMatchStatus(row){
  if(row.apply_status === 'available') return 'open';
  if(row.apply_status === 'hurry') return 'closing';
  return 'full'; // 'full' 또는 예상 밖의 값이 들어온 경우 모두 마감으로 처리
}
function matchStatusLabel(status){
  if(status==='full') return { text:'🔴 마감', cls:'status-full' };
  if(status==='closing') return { text:'🟠 마감임박', cls:'status-closing' };
  return { text:'🟢 모집중', cls:'status-open' };
}
function matchTimePeriod(timeStr){
  if(!timeStr) return null;
  const h = parseInt(String(timeStr).split(':')[0], 10);
  if(isNaN(h)) return null;
  if(h < 12) return 'morning';
  if(h < 19) return 'afternoon';
  return 'evening';
}

async function loadMatchesForSelectedDate(){
  const listEl = $('#matchListContainer');
  const countEl = $('#matchCountText');
  const updatedEl = $('#matchUpdatedText');
  if(!listEl) return;
  if(!supabaseClient){ listEl.innerHTML = '<div class="rank-empty">Supabase에 연결되어 있지 않습니다.</div>'; return; }
  listEl.innerHTML = '<div class="match-loading">경기 정보를 불러오는 중...</div>';

  try{
    // 지역 필터링은 이제 수집(fetch-plab.js) 단계가 아니라 여기(조회 시점)에서 합니다.
    // plab_matches에는 전국 데이터가 다 들어있고, area_group 컬럼으로 서울만 걸러서 보여줍니다.
    const { data, error } = await supabaseClient
      .from('plab_matches')
      .select('*')
      .eq('match_date', selectedMatchDate)
      .eq('area_group', '서울')
      .order('match_time', { ascending: true });
    if(error) throw error;

    lastMatchRows = data || [];
    // 모집 상태 판정 기준이 맞는지 확인할 수 있도록, 실제로 어떤 apply_status 값들이 들어오는지 로그로 남깁니다.
    const uniqueStatuses = [...new Set(lastMatchRows.map(r=>r.apply_status))];
    console.log('[경기 탭] 이 날짜에서 발견된 apply_status 값들:', uniqueStatuses);
    if(updatedEl){
      const latest = lastMatchRows.reduce((acc,r)=> (r.updated_at && (!acc || r.updated_at>acc)) ? r.updated_at : acc, null);
      updatedEl.textContent = latest ? `마지막 업데이트 · ${new Date(latest).toLocaleString('ko-KR')}` : '';
    }
    const syncNote = $('#matchSyncNote');
    if(syncNote){
      // 이 데이터는 실시간이 아니라 주기적으로 동기화된 스냅샷이라, 인기 있는 경기는 그 사이에
      // 마감될 수 있습니다. 신청 전 실제 링크에서 최신 상태를 한 번 더 확인하도록 안내합니다.
      syncNote.style.display = lastMatchRows.length ? 'block' : 'none';
    }
    renderMatchList();
  }catch(e){
    console.error('[경기 탭] plab_matches 조회 실패', e);
    listEl.innerHTML = '<div class="rank-empty">경기 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주시기 바랍니다.</div>';
    if(countEl) countEl.textContent = '-';
    if(updatedEl) updatedEl.textContent = '';
  }
}

/* 경기 탭 카드의 "위치" 버튼: 지도 탭으로 전환하고 그 경기장 위치로 자동 이동/확장합니다.
   플랩풋볼 실제 stadium_name이 프리셋(FUTSAL_VENUES) 이름과 다를 수 있어, 먼저 프리셋 매칭을 시도하고
   없으면 이름만으로 검색해 placeVenueMarker의 "목록에 없는 경기장" 임시 핀 경로를 그대로 재사용합니다. */
async function goToVenueOnMapTab(venueName){
  // setActiveMobileSection('map')가 내부에서 loadDefaultMapVenue()를 별도로(await 없이) 실행시켜,
  // 우리가 지금 보여주려는 경기장과 "기본 경기장 자동 표시" 로직이 동시에 지도를 건드리며 충돌하던
  // 문제가 있었습니다. mapDefaultLoaded를 먼저 true로 만들어 자동 로딩을 건너뛰게 막습니다.
  mapDefaultLoaded = true;
  const mapTabBtn = document.querySelector('.mobile-tabbar .tab-btn[data-tab="map"]');
  if(mapTabBtn) mapTabBtn.click();
  // 탭 전환으로 #sectionMap이 display:none → block으로 바뀐 직후에는 브라우저가 아직 레이아웃을
  // 재계산하지 않은 상태라, 이 시점에 카카오맵을 그리면 지도가 실제 컨테이너 크기/위치를 잘못
  // 인식해 비스듬히 어긋난 곳부터 보이는 문제가 있었습니다. 한 프레임을 기다려 레이아웃이
  // 확정된 뒤에 지도를 그리도록 합니다.
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const preset = findVenuePreset(venueName);
  const info = preset ? { name: preset.name, address: preset.address } : { name: venueName, address: '' };
  const sel = $('#venuePresetSelect');
  const input = $('#venueInput');
  if(sel) sel.value = preset ? preset.name : '';
  if(input) input.value = preset ? preset.name : venueName;
  await showVenueOnMap(info);
  // 지도가 그려진 후에도 컨테이너 크기가 늦게 확정되는 경우가 있어, relayout으로 한 번 더 보정합니다.
  setTimeout(()=>{ try{ if(map) map.relayout(); if(map && currentVenueName && venuePinObjects[currentVenueName]) map.setCenter(venuePinObjects[currentVenueName].pos); }catch(e){} }, 150);
}

/* 경기 탭에서 고른 플랩풋볼 경기를 홈 탭 "확정 경기"로 그대로 가져옵니다.
   - 그 날짜가 아직 확정되지 않았으면(weekOverride에 없고 자동 최다득표일도 아니면) 함께 확정 처리합니다.
   - 경기장/시간/신청 링크를 플랩풋볼 정보 그대로 채워서 관리자가 다시 손으로 입력하지 않아도 되게 합니다.
   - 이미 그 날짜에 저장된 경기장 정보가 있으면 실수로 덮어쓰지 않도록 확인을 먼저 받습니다. */
async function adminAdoptMatchAsConfirmed(row){
  if(!requireAdmin()) return;
  const dateStr = row.match_date;
  if(!dateStr){ toast('경기 날짜 정보가 없습니다.'); return; }

  const weekKey = getWeekStart(dateStr);
  const existingConfirmedDates = getWeekInfo(weekKey).confirmedDates;
  const alreadyConfirmed = existingConfirmedDates.includes(dateStr);
  const existingVenue = getVenueInfo(dateStr);

  let confirmMsg = `${dateStr} 경기를 홈 화면 확정 경기로 등록하시겠습니까?\n\n📍 ${row.stadium_name||'경기장 미정'}\n🕒 ${row.match_time||'-'}`;
  if(!alreadyConfirmed) confirmMsg += `\n\n⚠️ 이 날짜는 아직 확정되지 않았습니다. 이 날짜도 함께 확정 처리됩니다.`;
  if(existingVenue && existingVenue.name) confirmMsg += `\n\n⚠️ 이미 등록된 경기장 정보(${existingVenue.name})를 덮어씁니다.`;
  if(!confirm(confirmMsg)) return;

  const preset = findVenuePreset(row.stadium_name);
  const venueName = preset ? preset.name : (row.stadium_name || '');
  const venueAddress = preset ? preset.address : '';
  const timeStr = row.match_time ? String(row.match_time).slice(0,5) : '';
  const link = row.match_url || '';
  // player_count("6vs6" 등)에서 경기 형식을 뽑아 함께 저장해두면, 전술 탭에서 이 경기의 형식을
  // 관리자가 다시 고르지 않아도 자동으로 알 수 있습니다. 5:5/6:6이 아닌 값이면 저장하지 않습니다.
  const parsedFormat = matchFormatNumber(row.player_count);
  const format = (parsedFormat === '5' || parsedFormat === '6') ? parsedFormat : null;

  await mutateAppData(data=>{
    if(!alreadyConfirmed){
      if(!data.weekOverride) data.weekOverride = {};
      const list = normalizeDateList(data.weekOverride[weekKey], getWeekDates(weekKey));
      if(!list.includes(dateStr)) list.push(dateStr);
      data.weekOverride[weekKey] = list;
      resyncWeekDerivedVotes(data, weekKey);
    }
    data.venues[dateStr] = { name: venueName, address: venueAddress, time: timeStr, link, format };
  });

  renderCalendar();
  await renderMatchPanel();
  computeAttendanceStats();
  renderMatchStats();
  renderMatchVenueConfirmedHint();
  toast('경기를 홈 화면 확정 경기로 등록했습니다.');
}

function renderMatchList(){
  const listEl = $('#matchListContainer');
  const countEl = $('#matchCountText');
  if(!listEl) return;
  const favSet = favoriteVenueSet;

  const favFilterBtn = $('#matchFavFilterBtn');
  if(favFilterBtn){
    favFilterBtn.hidden = !isAdminUser();
    if(!isAdminUser() && matchFavOnly){ matchFavOnly = false; favFilterBtn.classList.remove('active'); }
  }
  let rows = lastMatchRows.filter(r=>{
    if(matchTimeFilter !== 'all' && matchTimePeriod(r.match_time) !== matchTimeFilter) return false;
    if(matchFormatFilter !== 'all' && matchFormatNumber(r.player_count) !== matchFormatFilter) return false;
    if(matchHideFull && getMatchStatus(r) === 'full') return false;
    // 오늘 날짜를 보고 있을 때는, 이미 시작 시각이 지난 경기는 신청해도 소용없으니 목록에서 제외합니다.
    if(selectedMatchDate === todayStr() && r.match_time){
      const now = kstNow();
      const nowHM = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
      if(String(r.match_time).slice(0,5) < nowHM) return false;
    }
    if(matchFavOnly){
      // 즐겨찾기 경기장명과 완전히 일치하지 않을 수 있어(플랩 표기 차이), 공백을 무시하고
      // 부분 포함까지 함께 확인합니다. (예: "가산 벽산디지털밸리" vs "가산벽산디지털밸리")
      const normalize = (s)=> String(s||'').replace(/\s+/g, '');
      const stadiumNorm = normalize(r.stadium_name);
      const hit = [...favSet].some(fav=>{
        const favNorm = normalize(fav);
        return stadiumNorm && favNorm && (stadiumNorm===favNorm || stadiumNorm.includes(favNorm) || favNorm.includes(stadiumNorm));
      });
      if(!hit) return false;
    }
    return true;
  });

  // 화면에 보이는(필터링된) 경기 수를 그대로 표시합니다 — 필터 적용 전 전체 수를 보여주면 실제 목록과 안 맞아 보입니다.
  if(countEl){
    const dObj = selectedMatchDate ? parseYMD(selectedMatchDate) : null;
    const isToday = selectedMatchDate === todayStr();
    const dayLabel = dObj ? (isToday ? '오늘 경기' : `${dObj.getMonth()+1}.${dObj.getDate()}(${weekdayKR[dObj.getDay()]}) 경기`) : '경기';
    countEl.innerHTML = `<span class="mc-count-label">${escapeHtml(dayLabel)}</span><span class="mc-count-num">${rows.length}경기</span>`;
  }

  if(!rows.length){
    listEl.innerHTML = '<div class="rank-empty">오늘은 등록된 경기가 없습니다.</div>';
    return;
  }

  if(matchVisibleCount < MATCHES_PER_PAGE) matchVisibleCount = MATCHES_PER_PAGE;
  const shownRows = rows.slice(0, matchVisibleCount);
  const remaining = rows.length - shownRows.length;

  const cardsHtml = shownRows.map(r=>{
    const status = getMatchStatus(r);
    const label = matchStatusLabel(status);
    const timeStr = r.match_time ? String(r.match_time).slice(0,5) : '-';

    // 경기 형식(player_count, 예: "6vs6")과 실시간 모집 인원(confirm_count/max_player_cnt)을
    // 계산 없이 실제 저장된 값 그대로 하나의 뱃지로 보여줍니다.
    const formatText = r.player_count ? String(r.player_count) : '';
    const countText = (r.confirm_count != null && r.max_player_cnt != null)
      ? `${r.confirm_count}/${r.max_player_cnt}명`
      : '';
    const typeParts = [formatText, countText].filter(Boolean).join(' · ');
    const typeHtml = typeParts ? `<span class="mc-type">👥 ${escapeHtml(typeParts)}</span>` : '';
    // level(급수)·gender(성별)도 저장되어 있으면 보조 정보로 함께 보여줍니다.
    const extraTags = [r.level, r.gender].filter(Boolean);
    const extraTagsHtml = extraTags.length
      ? `<div class="mc-tags-row">${extraTags.map(t=>`<span class="mc-tag">${escapeHtml(String(t))}</span>`).join('')}</div>`
      : '';

    // isFav는 즐겨찾기 필터(matchFavOnly)에서 계속 사용하지만, 즐겨찾기 등록/해제는
    // 이제 지도 탭에서만 할 수 있어 경기 카드에는 별표 버튼을 두지 않습니다.
    const isFav = [...favSet].some(fav=>{
      const normalize = (s)=> String(s||'').replace(/\s+/g, '');
      const a = normalize(r.stadium_name), b = normalize(fav);
      return a && b && (a===b || a.includes(b) || b.includes(a));
    });

    const fmtN = matchFormatNumber(r.player_count);
    const fmtBadge = fmtN ? `${fmtN}:${fmtN}` : (formatText || '');
    const mo = r.match_date ? parseYMD(r.match_date) : (selectedMatchDate ? parseYMD(selectedMatchDate) : null);
    const dateText = mo ? `${mo.getMonth()+1}월 ${mo.getDate()}일 (${weekdayKR[mo.getDay()]})` : '';
    const subParts = [label.text.replace(/^[^\s]+\s/, ''), countText, ...extraTags.map(String)].filter(Boolean);
    const adoptBtnHtml = isAdminUser()
      ? `<button type="button" class="mc-adopt-btn" data-row-id="${escapeHtml(String(r.id))}" title="이 경기를 홈 화면 확정 경기로 등록">🏆 확정 등록</button>`
      : '';
    const pinSvg = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 22s7.500-6.600 7.500-12.300A7.500 7.500 0 0 0 4.500 9.700C4.500 15.400 12 22 12 22z"/><circle cx="12" cy="9.800" r="2.800" fill="#0c1319"/></svg>';
    const calSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15.500 2 2 4-4"/></svg>';
    const clkSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    const starSvg = '<svg viewBox="0 0 24 24" width="22" height="22" fill="'+(isFav?'currentColor':'none')+'" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 2.800 2.800 5.800 6.300.9-4.600 4.400 1.100 6.300L12 17.200l-5.600 3 1.100-6.300L2.900 9.500l6.300-.9z"/></svg>';
    const extSvg = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

    // 경기장명 앞의 "플랩 스타디움"은 작은 태그로 분리해 이름을 한 줄로 보이게 합니다(저장 데이터는 그대로).
    const rawName = r.stadium_name || '경기장 미정';
    const PLAB_PREFIX = /^플랩\s*스타디움\s+/;
    const hasPrefix = PLAB_PREFIX.test(rawName);
    const shortName = hasPrefix ? rawName.replace(PLAB_PREFIX, '') : rawName;
    const statusText = [label.text.replace(/^[^\s]+\s/, ''), countText].filter(Boolean).join(' ');
    const shareSvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="#191919"><path d="M12 3C6.500 3 2 6.500 2 10.800c0 2.800 1.900 5.300 4.700 6.700l-1 3.700c-.1.400.3.600.6.400l4.300-2.900c.5.100.9.100 1.400.1 5.500 0 10-3.500 10-7.800S17.500 3 12 3z"/></svg>';
    const arrowSvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    const pinSm = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 22s7.500-6.600 7.500-12.300A7.500 7.500 0 0 0 4.500 9.700C4.500 15.400 12 22 12 22z"/><circle cx="12" cy="9.800" r="2.800" fill="#0c1319"/></svg>';
    const calSm = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
    const clkSm = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    const starSm = '<svg viewBox="0 0 24 24" width="17" height="17" fill="'+(isFav?'currentColor':'none')+'" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 2.800 2.800 5.800 6.300.9-4.600 4.400 1.100 6.300L12 17.200l-5.600 3 1.100-6.300L2.900 9.500l6.300-.9z"/></svg>';
    const shareText = `${rawName}\n${dateText} ${timeStr}${fmtBadge?' · '+fmtBadge:''}`;

    const adminNow = isAdminUser();
    const subLine = [r.area_group, r.level, r.gender].filter(Boolean).map(String).join(' · ');
    const shareIc = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.8 7.4-4.300M8.3 13.200l7.400 4.300"/></svg>';
    return `
      <div class="mr ${status==='full'?'is-full':''}" data-rid="${escapeHtml(String(r.id))}">
        <div class="mr-main" role="button" tabindex="0">
          <div class="mr-t">${escapeHtml(timeStr)}</div>
          <div class="mr-v"><b title="${escapeHtml(rawName)}">${escapeHtml(shortName)}</b>${subLine?`<small>${escapeHtml(subLine)}</small>`:''}</div>
          <div class="mr-r">${fmtBadge ? `<span class="mt-fmt">${escapeHtml(fmtBadge)}</span>` : ''}${statusText ? `<span class="mt-st ${label.cls}">${escapeHtml(statusText)}</span>` : ''}</div>
        </div>
        <div class="mr-act">
          ${r.stadium_name ? `<button type="button" class="mr-ic mc-loc-btn" data-venue="${escapeHtml(r.stadium_name)}" title="지도에서 위치 보기">${pinSm}</button>` : ''}
          ${adminNow ? `<button type="button" class="mr-ic mt-fav ${isFav?'on':''}" data-venue="${escapeHtml(r.stadium_name||'')}" title="${isFav?'즐겨찾기 해제':'즐겨찾기'}">${starSm}</button>` : ''}
          <button type="button" class="mr-ic mc-share-btn" data-share-text="${escapeHtml(shareText)}" data-url="${escapeHtml(r.match_url||'')}" title="공유">${shareIc}</button>
          <button type="button" class="mr-go mc-apply-btn" data-url="${escapeHtml(r.match_url||'')}" title="플랩풋볼 신청 페이지 열기">신청하기 ${arrowSvg}</button>
          ${adoptBtnHtml ? adoptBtnHtml.replace('class="mc-adopt-btn"','class="mc-adopt-btn mr-ic"').replace('🏆 확정 등록','🏆') : ''}
        </div>
      </div>
    `;
  }).join('');

  const moreHtml = remaining > 0
    ? `<button type="button" class="match-more-btn" id="matchMoreBtn">더 많은 경기 보기 (${remaining}경기 더)</button>`
    : '';

  listEl.innerHTML = cardsHtml + moreHtml;
  listEl.querySelectorAll('.mr-main').forEach(m=>{
    const toggle = ()=>{
      const row = m.parentElement, was = row.classList.contains('open');
      listEl.querySelectorAll('.mr.open').forEach(x=>x.classList.remove('open'));
      if(!was) row.classList.add('open');
    };
    m.addEventListener('click', toggle);
    m.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); toggle(); } });
  });

  listEl.querySelectorAll('.mc-apply-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(btn.dataset.url) window.open(btn.dataset.url, '_blank', 'noopener');
    });
  });
  listEl.querySelectorAll('.mc-share-btn').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      const url = btn.dataset.url;
      const text = btn.dataset.shareText || '';
      if(!url){ toast('공유할 경기 링크가 없습니다.'); return; }
      // 기기의 공유창을 열어 카카오톡을 선택해 보낼 수 있게 합니다.
      if(navigator.share){
        try{ await navigator.share({ title: '풋살 경기 공유', text, url }); }
        catch(err){ if(err && err.name !== 'AbortError') toast('공유하지 못했습니다.'); }
        return;
      }
      // 공유창을 지원하지 않는 브라우저(PC 등)에서는 내용을 복사합니다.
      const full = text + '\n' + url;
      try{ await navigator.clipboard.writeText(full); toast('경기 정보를 복사했습니다. 카카오톡에 붙여넣어 보내세요.'); }
      catch(_){ window.prompt('아래 내용을 복사해 카카오톡에 붙여넣어 보내세요.', full); }
    });
  });
  listEl.querySelectorAll('.mt-fav').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      if(!requireAdmin()) return;
      const name = btn.dataset.venue; if(!name) return;
      const norm = (x)=>String(x||'').replace(/\s+/g,'');
      const matched = [...favoriteVenueSet].filter(f=>norm(f)===norm(name) || norm(f).includes(norm(name)) || norm(name).includes(norm(f)));
      const makeFav = matched.length===0;
      let res = {ok:true};
      if(makeFav) res = await setFavoriteVenueRobust(name, true);
      else for(const f of matched){ res = await setFavoriteVenueRobust(f, false); if(!res.ok) break; }
      if(!res.ok){ toast('즐겨찾기 저장 실패: '+res.reason); return; }
      try{ populateVenuePresetSelect(); }catch(_){}
      renderMatchList();
      toast(makeFav ? '즐겨찾기에 추가했습니다.' : '즐겨찾기에서 해제했습니다.');
    });
  });
  listEl.querySelectorAll('.mc-loc-btn[data-venue]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const venueName = btn.dataset.venue;
      if(venueName) goToVenueOnMapTab(venueName);
    });
  });
  listEl.querySelectorAll('.mc-adopt-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const row = lastMatchRows.find(r=>String(r.id)===btn.dataset.rowId);
      if(row) adminAdoptMatchAsConfirmed(row);
    });
  });
  const moreBtn = $('#matchMoreBtn');
  if(moreBtn) moreBtn.addEventListener('click', ()=>{
    matchVisibleCount += MATCHES_PER_PAGE;
    renderMatchList();
  });
}

function initMatchesTabOnce(){
  if(matchesTabInited) return;
  if(!$('#matchDateScroll')) return; // 아직 로그인 전 등, DOM이 없을 수 있음
  matchesTabInited = true;
  selectedMatchDate = todayStr();
  renderMatchDateScroller();
  loadMatchesForSelectedDate();

  $('#matchFilterRow').querySelectorAll('.mf-chip[data-filter-time]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      matchTimeFilter = btn.dataset.filterTime;
      matchVisibleCount = MATCHES_PER_PAGE;
      $('#matchFilterRow').querySelectorAll('.mf-chip[data-filter-time]').forEach(b=>b.classList.toggle('active', b===btn));
      renderMatchList();
    });
  });
  const timeSel = $('#matchTimeSel');
  if(timeSel) timeSel.addEventListener('change', ()=>{
    matchTimeFilter = timeSel.value; matchVisibleCount = MATCHES_PER_PAGE;
    timeSel.parentElement.classList.toggle('on', timeSel.value!=='all'); renderMatchList();
  });
  const fmtSel = $('#matchFmtSel');
  if(fmtSel) fmtSel.addEventListener('change', ()=>{
    matchFormatFilter = fmtSel.value; matchVisibleCount = MATCHES_PER_PAGE;
    fmtSel.parentElement.classList.toggle('on', fmtSel.value!=='all'); renderMatchList();
  });
  const favBtn = $('#matchFavFilterBtn');
  if(favBtn) favBtn.addEventListener('click', ()=>{
    matchFavOnly = !matchFavOnly;
    matchVisibleCount = MATCHES_PER_PAGE;
    favBtn.classList.toggle('active', matchFavOnly);
    renderMatchList();
  });
  const hideFullBtn = $('#matchHideFullBtn');
  if(hideFullBtn) hideFullBtn.addEventListener('click', ()=>{
    matchHideFull = !matchHideFull;
    matchVisibleCount = MATCHES_PER_PAGE;
    hideFullBtn.classList.toggle('active', matchHideFull);
    hideFullBtn.setAttribute('aria-pressed', String(matchHideFull));
    renderMatchList();
  });
  const formatRow = $('#matchFormatFilterRow');
  if(formatRow) formatRow.querySelectorAll('.mf-chip[data-filter-format]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      matchFormatFilter = btn.dataset.filterFormat;
      matchVisibleCount = MATCHES_PER_PAGE;
      formatRow.querySelectorAll('.mf-chip[data-filter-format]').forEach(b=>b.classList.toggle('active', b===btn));
      renderMatchList();
    });
  });
  const refreshBtn = $('#matchRefreshBtn');
  if(refreshBtn) refreshBtn.addEventListener('click', async ()=>{
    // GitHub Actions를 실행하는 게 아니라, Supabase에 이미 저장된 최신 데이터를 다시 조회만 합니다.
    refreshBtn.disabled = true;
    const orig = refreshBtn.textContent;
    refreshBtn.textContent = '불러오는 중...';
    matchVisibleCount = MATCHES_PER_PAGE;
    await loadMatchesForSelectedDate();
    refreshBtn.disabled = false;
    refreshBtn.textContent = orig;
    toast('최신 경기 정보를 불러왔습니다.');
  });
}

/* ================= 전술 보드 (전술 탭) ================= */
/* 코트는 SVG viewBox 0 0 300 460 기준 좌표계를 씁니다 (세로 방향 풋살 코트, 골대가 위/아래).
   positions는 [{ name, x, y }] 형태로 Supabase tactics_boards 테이블에 저장됩니다. */
const TACTICS_COURT_W = 300, TACTICS_COURT_H = 460, TACTICS_PLAYER_R = 19;
let tacticsTabInited = false;
let tacticsSelectedDate = '';
let tacticsPositions = []; // 현재 편집 중인 배치 [{name, x, y}]
let tacticsRosterAll = [];  // 선택된 날짜의 전체 참석자 이름 목록
let tacticsDirty = false;   // 마지막 저장 이후 변경 여부
let tacticsDragState = null; // { name, svgEl }
let tacticsFormat = '5';     // '5' | '6' (5:5, 6:6)
let tacticsFormation = 'free'; // 'free' 또는 TACTICS_FORMATIONS_BY_FORMAT[tacticsFormat]의 key
let tacticsPendingRosterName = null; // 포메이션 모드에서 "배치 대기 중"인 로스터 선수 이름

/* 경기 형식(5:5/6:6)별로 완전히 다른 포메이션 이름과 필드 플레이어 슬롯 좌표를 씁니다.
   5:5는 필드 플레이어 4명, 6:6은 5명 기준입니다. (골키퍼는 별도 고정 슬롯) */
const TACTICS_FORMATIONS_BY_FORMAT = {
  '5': {
    '2-2':   [ {x:95,y:330}, {x:205,y:330}, {x:95,y:180}, {x:205,y:180} ],
    '1-2-1': [ {x:150,y:360}, {x:80,y:250}, {x:220,y:250}, {x:150,y:150} ],
    '3-1':   [ {x:60,y:320}, {x:150,y:340}, {x:240,y:320}, {x:150,y:170} ]
  },
  '6': {
    '3-2':   [ {x:60,y:340}, {x:150,y:360}, {x:240,y:340}, {x:95,y:180}, {x:205,y:180} ],
    '2-1-2': [ {x:95,y:350}, {x:205,y:350}, {x:150,y:260}, {x:80,y:150}, {x:220,y:150} ],
    '2-3':   [ {x:95,y:340}, {x:205,y:340}, {x:60,y:180}, {x:150,y:160}, {x:240,y:180} ]
  }
};
/* 골키퍼 고정 슬롯 (아래쪽 골문 앞) */
const TACTICS_GK_SLOT = { x:150, y:430 };

/* 지금 선택된 경기 형식(5:5/6:6)에서 고를 수 있는 포메이션 이름 목록입니다. */
function tacticsFormationNamesForFormat(){
  return Object.keys(TACTICS_FORMATIONS_BY_FORMAT[tacticsFormat] || {});
}

function tacticsFormationSlots(){
  if(tacticsFormation === 'free') return null;
  const fieldSlots = (TACTICS_FORMATIONS_BY_FORMAT[tacticsFormat] || {})[tacticsFormation];
  if(!fieldSlots) return null;
  return [ { role:'GK', ...TACTICS_GK_SLOT }, ...fieldSlots.map(s=>({ role:'FIELD', ...s })) ];
}

/* 형식(5:5/6:6)이 바뀔 때마다 포메이션 선택 칩을 그 형식에 맞는 이름들로 다시 그립니다. */
function renderTacticsFormationChips(){
  const wrap = $('#tacticsFormationChips');
  if(!wrap) return;
  const names = tacticsFormationNamesForFormat();
  wrap.innerHTML = names.map(n=>`<button type="button" class="tactics-chip" data-formation="${n}">${n}</button>`).join('')
    + `<button type="button" class="tactics-chip active" data-formation="free">자유 배치</button>`;
  tacticsFormation = 'free';
  wrap.querySelectorAll('.tactics-chip[data-formation]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      if(!requireAdmin()) return;
      if(chip.dataset.formation === tacticsFormation) return;
      if(tacticsPositions.length){
        if(!confirm('포메이션을 바꾸면 지금 배치가 초기화됩니다. 계속하시겠습니까?')) return;
        tacticsPositions = [];
        tacticsDirty = true;
      }
      tacticsFormation = chip.dataset.formation;
      wrap.querySelectorAll('.tactics-chip[data-formation]').forEach(c=>c.classList.toggle('active', c===chip));
      tacticsPendingRosterName = null;
      renderTacticsRoster();
      renderTacticsCourt();
      updateTacticsStatus();
    });
  });
}

/* appData.votes에 기록이 있는 모든 날짜(과거 포함)를 최신순으로 반환합니다.
   findNearestUpcomingConfirmedDate()는 미래 날짜만 보므로, 지난 경기 복기를 위해 별도로 만듭니다. */
function getAllConfirmedDatesDesc(){
  return Object.keys(appData.votes||{})
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && (appData.votes[d]||[]).length>0)
    .sort().reverse();
}

function populateTacticsDateSelect(){
  const sel = $('#tacticsDateSelect');
  if(!sel) return;
  const dates = getAllConfirmedDatesDesc();
  const prevValue = sel.value;
  const todayS = todayStr();
  sel.innerHTML = '<option value="">확정 경기 선택</option>' + dates.map(d=>{
    const tag = d===todayS ? ' (오늘)' : (d>todayS ? ' (예정)' : '');
    return `<option value="${d}">${d}${tag}</option>`;
  }).join('');
  if(prevValue && dates.includes(prevValue)) sel.value = prevValue;
}

async function loadTacticsBoard(dateStr){
  if(!supabaseClient) return [];
  try{
    const { data, error } = await supabaseClient.from('tactics_boards').select('positions').eq('match_date', dateStr).maybeSingle();
    if(error) throw error;
    return (data && Array.isArray(data.positions)) ? data.positions : [];
  }catch(e){
    console.error('[전술 보드] 불러오기 실패:', e);
    return [];
  }
}

async function saveTacticsBoard(dateStr, positions){
  if(!supabaseClient) return { ok:false, reason:'서버에 연결할 수 없습니다.' };
  try{
    const { error } = await supabaseClient.from('tactics_boards').upsert({ match_date: dateStr, positions, updated_at: new Date().toISOString() });
    if(error) throw error;
    return { ok:true };
  }catch(e){
    console.error('[전술 보드] 저장 실패:', e);
    let reason = e && e.message ? e.message : '알 수 없는 오류';
    if(e && e.code === '42P01') reason = 'tactics_boards 테이블이 아직 없습니다. tactics-board-table.sql을 Supabase에서 실행해 주시기 바랍니다.';
    else if(e && e.code === '42501') reason = '저장 권한이 없습니다(RLS 정책 확인 필요). tactics-board-table.sql을 Supabase에서 실행해 주시기 바랍니다.';
    return { ok:false, reason };
  }
}

/* 코트 배경(라인)을 그립니다. 선수 배치와 별개로 한 번만 그려도 되는 정적인 부분입니다. */
function drawTacticsCourtLines(){
  const w = TACTICS_COURT_W, h = TACTICS_COURT_H;
  return `
    <rect x="4" y="4" width="${w-8}" height="${h-8}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
    <line x1="4" y1="${h/2}" x2="${w-4}" y2="${h/2}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
    <circle cx="${w/2}" cy="${h/2}" r="34" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
    <rect x="${w/2-60}" y="4" width="120" height="46" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
    <rect x="${w/2-60}" y="${h-50}" width="120" height="46" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
    <rect x="${w/2-24}" y="4" width="48" height="14" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
    <rect x="${w/2-24}" y="${h-18}" width="48" height="14" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
  `;
}

/* 코트 위 선수 라벨에 성을 빼고 이름만 표시합니다 (예: "김종혁" → "종혁"). 팀원 이름은 항상 성 1글자 + 이름 2글자입니다. */
function tacticsGivenName(fullName){
  const s = String(fullName||'');
  return s.length > 1 ? s.slice(1) : s;
}
function tacticsPlayerNode(p){
  const label = tacticsGivenName(p.name);
  return `
    <g class="tactics-player-node" data-name="${escapeHtml(p.name)}" transform="translate(${p.x},${p.y})">
      <circle class="tactics-player-circle${isAdminUser()?'':' readonly'}" r="${TACTICS_PLAYER_R}"></circle>
      <text class="tactics-player-label" y="4">${escapeHtml(label)}</text>
    </g>
  `;
}

function renderTacticsCourt(){
  const svg = $('#tacticsCourt');
  if(!svg) return;
  const slots = tacticsFormationSlots();
  let slotsHtml = '';
  if(slots){
    const occupiedSlots = new Set();
    // 이미 배치된 선수가 어느 슬롯에 있는지(좌표 일치) 확인해서, 빈 슬롯만 점선으로 그립니다.
    tacticsPositions.forEach(p=>{
      const idx = slots.findIndex(s=>!occupiedSlots.has(s) && s.x===p.x && s.y===p.y);
      if(idx>=0) occupiedSlots.add(slots[idx]);
    });
    slotsHtml = slots.filter(s=>!occupiedSlots.has(s)).map((s,i)=>`
      <circle class="tactics-slot-empty${tacticsPendingRosterName?' pickable':''}" data-slot-x="${s.x}" data-slot-y="${s.y}" cx="${s.x}" cy="${s.y}" r="${TACTICS_PLAYER_R}"></circle>
      <text class="tactics-slot-label" x="${s.x}" y="${s.y+4}" pointer-events="none">${s.role==='GK'?'GK':''}</text>
    `).join('');
  }
  const placedHtml = tacticsPositions.map(p=>tacticsPlayerNode(p)).join('');
  svg.innerHTML = drawTacticsCourtLines() + slotsHtml + placedHtml;
  bindTacticsCourtDrag();
  bindTacticsSlotClicks();
}

/* 포메이션 모드에서, 로스터에서 선수를 고른 뒤(tacticsPendingRosterName) 빈 슬롯을 탭하면 그 자리에 배치합니다. */
function bindTacticsSlotClicks(){
  if(!isAdminUser() || !tacticsPendingRosterName) return;
  const svg = $('#tacticsCourt');
  if(!svg) return;
  svg.querySelectorAll('.tactics-slot-empty.pickable').forEach(slot=>{
    slot.addEventListener('click', ()=>{
      const x = parseFloat(slot.dataset.slotX), y = parseFloat(slot.dataset.slotY);
      tacticsPositions.push({ name: tacticsPendingRosterName, x, y });
      tacticsPendingRosterName = null;
      tacticsDirty = true;
      renderTacticsRoster();
      renderTacticsCourt();
      updateTacticsStatus();
    });
  });
}

function renderTacticsRoster(){
  const rosterEl = $('#tacticsRoster');
  const hintEl = $('#tacticsRosterHint');
  if(!rosterEl) return;
  const placedSet = new Set(tacticsPositions.map(p=>p.name));
  const remaining = tacticsRosterAll.filter(n=>!placedSet.has(n));
  if(hintEl){
    hintEl.style.display = isAdminUser() ? 'block' : 'none';
    hintEl.textContent = tacticsFormation === 'free'
      ? '선수를 눌러 코트에 배치하세요. 코트 위 선수를 드래그해서 위치를 옮길 수 있습니다.'
      : '선수를 먼저 누르고, 이어서 코트의 빈 자리를 눌러 배치하세요.';
  }
  if(!isAdminUser()){
    // 팀원은 배치만 볼 수 있고, 남은 로스터 칩(아직 코트에 없는 사람)은 굳이 조작 대상이 아니므로 숨깁니다.
    rosterEl.innerHTML = remaining.length ? `<div class="tactics-roster-empty">코트에 배치되지 않은 인원: ${remaining.map(escapeHtml).join(', ')}</div>` : '';
    return;
  }
  if(!remaining.length){
    rosterEl.innerHTML = '<div class="tactics-roster-empty">전원 배치 완료</div>';
    return;
  }
  rosterEl.innerHTML = remaining.map(name=>`<button type="button" class="tactics-roster-chip${name===tacticsPendingRosterName?' pending':''}" data-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('');
  rosterEl.querySelectorAll('.tactics-roster-chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const name = chip.dataset.name;
      if(tacticsFormation === 'free'){
        // 자유 배치: 탭하면 바로 코트에 놓습니다. 겹치지 않도록 이미 배치된 인원 수만큼 살짝 어긋나게 둡니다.
        const idx = tacticsPositions.length;
        const col = idx % 3, row = Math.floor(idx/3);
        tacticsPositions.push({ name, x: 70 + col*80, y: 120 + row*80 });
        tacticsDirty = true;
        renderTacticsRoster();
        renderTacticsCourt();
        updateTacticsStatus();
        return;
      }
      // 포메이션 모드: 같은 선수를 다시 누르면 배치 대기를 취소하고, 아니면 이 선수를 배치 대기 상태로 만듭니다.
      tacticsPendingRosterName = (tacticsPendingRosterName === name) ? null : name;
      renderTacticsRoster();
      renderTacticsCourt();
    });
  });
}

function updateTacticsStatus(){
  const el = $('#tacticsStatus');
  if(!el) return;
  if(!isAdminUser()){ el.textContent = ''; return; }
  el.textContent = tacticsDirty ? '변경사항이 있습니다. 저장 버튼을 눌러 반영해 주시기 바랍니다.' : '저장된 배치입니다.';
}

/* 코트 위 선수 아이콘의 드래그 이동을 처리합니다. 관리자만 동작하고, 팀원은 보기 전용입니다. */
function bindTacticsCourtDrag(){
  if(!isAdminUser()) return;
  const svg = $('#tacticsCourt');
  if(!svg) return;
  svg.querySelectorAll('.tactics-player-node').forEach(node=>{
    const name = node.dataset.name;
    const circle = node.querySelector('.tactics-player-circle');
    const startDrag = (clientX, clientY)=>{
      tacticsDragState = { name };
      circle.setAttribute('stroke', 'var(--amber)');
    };
    const moveDrag = (clientX, clientY)=>{
      if(!tacticsDragState || tacticsDragState.name !== name) return;
      const rect = svg.getBoundingClientRect();
      let x = (clientX - rect.left) / rect.width * TACTICS_COURT_W;
      let y = (clientY - rect.top) / rect.height * TACTICS_COURT_H;
      x = Math.max(TACTICS_PLAYER_R, Math.min(TACTICS_COURT_W - TACTICS_PLAYER_R, x));
      y = Math.max(TACTICS_PLAYER_R, Math.min(TACTICS_COURT_H - TACTICS_PLAYER_R, y));
      node.setAttribute('transform', `translate(${x},${y})`);
      const p = tacticsPositions.find(p=>p.name===name);
      if(p){ p.x = Math.round(x); p.y = Math.round(y); }
    };
    const endDrag = ()=>{
      if(tacticsDragState && tacticsDragState.name===name){
        tacticsDragState = null;
        tacticsDirty = true;
        updateTacticsStatus();
      }
      circle.removeAttribute('stroke');
      circle.setAttribute('stroke', '#0b1410');
    };
    // 마우스와 터치를 함께 지원합니다.
    node.addEventListener('mousedown', (e)=>{ e.preventDefault(); startDrag(e.clientX, e.clientY); });
    node.addEventListener('touchstart', (e)=>{ const t=e.touches[0]; startDrag(t.clientX, t.clientY); }, { passive:true });
  });
  // 코트를 벗어나 놓아도 이동이 끝나도록, 이동/종료 리스너는 document에 한 번만 등록합니다.
  if(!svg.dataset.dragBound){
    svg.dataset.dragBound = '1';
    document.addEventListener('mousemove', (e)=>{
      if(!tacticsDragState) return;
      const node = svg.querySelector(`.tactics-player-node[data-name="${CSS.escape(tacticsDragState.name)}"]`);
      if(!node) return;
      const rect = svg.getBoundingClientRect();
      let x = (e.clientX - rect.left) / rect.width * TACTICS_COURT_W;
      let y = (e.clientY - rect.top) / rect.height * TACTICS_COURT_H;
      x = Math.max(TACTICS_PLAYER_R, Math.min(TACTICS_COURT_W - TACTICS_PLAYER_R, x));
      y = Math.max(TACTICS_PLAYER_R, Math.min(TACTICS_COURT_H - TACTICS_PLAYER_R, y));
      node.setAttribute('transform', `translate(${x},${y})`);
      const p = tacticsPositions.find(p=>p.name===tacticsDragState.name);
      if(p){ p.x = Math.round(x); p.y = Math.round(y); }
    });
    document.addEventListener('touchmove', (e)=>{
      if(!tacticsDragState) return;
      const t = e.touches[0];
      const node = svg.querySelector(`.tactics-player-node[data-name="${CSS.escape(tacticsDragState.name)}"]`);
      if(!node) return;
      const rect = svg.getBoundingClientRect();
      let x = (t.clientX - rect.left) / rect.width * TACTICS_COURT_W;
      let y = (t.clientY - rect.top) / rect.height * TACTICS_COURT_H;
      x = Math.max(TACTICS_PLAYER_R, Math.min(TACTICS_COURT_W - TACTICS_PLAYER_R, x));
      y = Math.max(TACTICS_PLAYER_R, Math.min(TACTICS_COURT_H - TACTICS_PLAYER_R, y));
      node.setAttribute('transform', `translate(${x},${y})`);
      const p = tacticsPositions.find(p=>p.name===tacticsDragState.name);
      if(p){ p.x = Math.round(x); p.y = Math.round(y); }
    }, { passive:true });
    const endAll = ()=>{
      if(tacticsDragState){ tacticsDragState = null; tacticsDirty = true; updateTacticsStatus(); }
    };
    document.addEventListener('mouseup', endAll);
    document.addEventListener('touchend', endAll);
  }
}

async function handleTacticsDateChange(dateStr){
  tacticsSelectedDate = dateStr;
  tacticsDirty = false;
  tacticsPendingRosterName = null;
  const emptyEl = $('#tacticsEmpty');
  const boardWrap = $('#tacticsBoardWrap');
  const formatRow = $('#tacticsFormatRow');
  const formationRow = $('#tacticsFormationRow');
  const formatLockedNote = $('#tacticsFormatLockedNote');
  if(!dateStr){
    if(emptyEl) emptyEl.style.display = 'block';
    if(boardWrap) boardWrap.style.display = 'none';
    if(formatRow) formatRow.style.display = 'none';
    if(formationRow) formationRow.style.display = 'none';
    if(formatLockedNote) formatLockedNote.style.display = 'none';
    return;
  }
  if(emptyEl) emptyEl.style.display = 'none';
  if(boardWrap) boardWrap.style.display = 'block';

  // 이 경기에 등록된 경기 형식(5:5/6:6)이 있으면 그대로 고정합니다. 관리자가 형식을 바꿀 필요가
  // 없으므로 형식 선택 칩은 숨기고, 대신 "이 경기는 6:6으로 고정되어 있습니다" 안내만 보여줍니다.
  // 형식 정보가 아직 없는 경기(예전에 확정했거나, 관리자 도구에서 형식을 지정하지 않은 경우)는
  // 기존처럼 관리자가 직접 골라야 합니다.
  const venueInfo = getVenueInfo(dateStr);
  const lockedFormat = venueInfo && venueInfo.format;
  if(lockedFormat === '5' || lockedFormat === '6'){
    tacticsFormat = lockedFormat;
    if(formatRow) formatRow.style.display = 'none';
    if(formatLockedNote){
      formatLockedNote.style.display = 'block';
      formatLockedNote.textContent = `이 경기는 ${lockedFormat}:${lockedFormat} 형식으로 등록되어 있어, 그에 맞는 포메이션만 고를 수 있습니다.`;
    }
  } else {
    if(formatRow) formatRow.style.display = 'flex';
    if(formatLockedNote) formatLockedNote.style.display = 'none';
  }
  if(formationRow) formationRow.style.display = 'flex';
  renderTacticsFormationChips(); // 고정된(또는 선택된) 형식에 맞는 포메이션 이름들을 다시 그립니다.

  const breakdown = getVoteBreakdownForDate(dateStr);
  tacticsRosterAll = breakdown.yesList.slice();
  const saved = await loadTacticsBoard(dateStr);
  // 저장된 배치 중 이제는 그 날짜 참석자가 아닌 이름은 제외합니다 (참석 명단이 나중에 바뀐 경우 대비).
  tacticsPositions = saved.filter(p=>tacticsRosterAll.includes(p.name));
  renderTacticsRoster();
  renderTacticsCourt();
  updateTacticsStatus();
}

function initTacticsTabOnce(){
  populateTacticsDateSelect();
  renderTacticsFormationChips(); // 기본 형식(5:5)에 맞는 포메이션 이름들을 먼저 그립니다.
  const sel = $('#tacticsDateSelect');
  if(sel && !sel.value){
    const dates = getAllConfirmedDatesDesc();
    const todayS = todayStr();
    const defaultDate = dates.find(d=>d<=todayS) || dates[0] || '';
    if(defaultDate){ sel.value = defaultDate; handleTacticsDateChange(defaultDate); }
  }
  const saveBtn = $('#tacticsSaveBtn');
  const resetBtn = $('#tacticsResetBtn');
  if(saveBtn) saveBtn.style.display = isAdminUser() ? 'inline-block' : 'none';
  if(resetBtn) resetBtn.style.display = isAdminUser() ? 'inline-block' : 'none';
  if(tacticsTabInited) return;
  tacticsTabInited = true;

  if(sel) sel.addEventListener('change', ()=>handleTacticsDateChange(sel.value));

  const formatRow = $('#tacticsFormatRow');
  if(formatRow) formatRow.querySelectorAll('.tactics-chip[data-format]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      if(!requireAdmin()) return;
      if(chip.dataset.format === tacticsFormat) return;
      if(tacticsPositions.length && tacticsFormation !== 'free'){
        if(!confirm('경기 형식을 바꾸면 지금 배치가 초기화됩니다. 계속하시겠습니까?')) return;
        tacticsPositions = [];
        tacticsDirty = true;
      }
      tacticsFormat = chip.dataset.format;
      formatRow.querySelectorAll('.tactics-chip[data-format]').forEach(c=>c.classList.toggle('active', c===chip));
      tacticsPendingRosterName = null;
      renderTacticsFormationChips(); // 형식이 바뀌면 포메이션 이름 목록 자체가 달라지므로 다시 그립니다.
      renderTacticsRoster();
      renderTacticsCourt();
      updateTacticsStatus();
    });
  });

  if(saveBtn) saveBtn.addEventListener('click', async ()=>{
    if(!requireAdmin()) return;
    if(!tacticsSelectedDate){ toast('먼저 경기 날짜를 선택해 주시기 바랍니다.'); return; }
    saveBtn.disabled = true;
    const result = await saveTacticsBoard(tacticsSelectedDate, tacticsPositions);
    saveBtn.disabled = false;
    if(result.ok){
      tacticsDirty = false;
      updateTacticsStatus();
      toast('전술 배치를 저장했습니다.');
    } else {
      toast(`전술 저장에 실패했습니다: ${result.reason}`);
    }
  });

  if(resetBtn) resetBtn.addEventListener('click', ()=>{
    if(!requireAdmin()) return;
    if(!tacticsPositions.length){ return; }
    if(!confirm('코트에 배치한 선수를 모두 초기화하시겠습니까? (저장 전까지는 취소할 수 있습니다)')) return;
    tacticsPositions = [];
    tacticsDirty = true;
    renderTacticsRoster();
    renderTacticsCourt();
    updateTacticsStatus();
  });
}

/* 기록 탭에서 지난 경기를 눌렀을 때, 그 날짜에 저장된 전술 배치가 있으면 작은 읽기 전용 코트로 보여줍니다. */
async function renderTacticsMiniForDate(dateStr, containerEl){
  if(!containerEl) return;
  const saved = await loadTacticsBoard(dateStr);
  if(!saved.length){ containerEl.innerHTML = ''; return; }
  const placedHtml = saved.map(p=>`
    <g transform="translate(${p.x},${p.y})">
      <circle r="${TACTICS_PLAYER_R}" fill="var(--pitch)" stroke="#0b1410" stroke-width="2"></circle>
      <text y="4" font-size="9" font-weight="700" fill="#0b1410" text-anchor="middle">${escapeHtml(tacticsGivenName(p.name))}</text>
    </g>
  `).join('');
  containerEl.innerHTML = `
    <div class="tactics-mini-court-wrap">
      <svg class="tactics-mini-court" viewBox="0 0 ${TACTICS_COURT_W} ${TACTICS_COURT_H}" preserveAspectRatio="xMidYMid meet">
        ${drawTacticsCourtLines()}
        ${placedHtml}
      </svg>
    </div>
  `;
}


/* ---------- 홈: 한 화면에 맞추기 (스크롤 없이) ---------- */
function fitHomeToScreen(){
  const sec = document.getElementById('sectionHome');
  if(!sec || !sec.classList.contains('mobile-active')) return;
  sec.style.height = '';
  const tab = document.querySelector('nav.mobile-tabbar');
  const top = sec.getBoundingClientRect().top + window.scrollY;
  const tabH = tab ? tab.offsetHeight + 12 : 80;
  const h = Math.max(320, window.innerHeight - top - tabH);
  sec.style.height = h + 'px';
}
window.addEventListener('resize', fitHomeToScreen);
window.addEventListener('orientationchange', ()=>setTimeout(fitHomeToScreen,200));
setInterval(fitHomeToScreen, 1000); // 탭 전환·데이터 로딩 후 높이 재계산(가벼운 계산)


/* ================= 투표 팝업(바텀시트) & 이번 주 투표 현황 ================= */
function openVoteSheet(){
  const sh = document.getElementById('voteSheet');
  if(!sh) return;
  window.__voteDraft = null;
  sh.hidden = false;
  document.body.classList.add('sheet-open');
  renderMatchPanel();
  requestAnimationFrame(()=>sh.classList.add('open'));
}
function closeVoteSheet(){
  const sh = document.getElementById('voteSheet');
  if(!sh || sh.hidden) return;
  sh.classList.remove('open');
  document.body.classList.remove('sheet-open');
  window.__voteDraft = null;
  setTimeout(()=>{ if(!sh.classList.contains('open')) sh.hidden = true; }, 220);
}
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeVoteSheet(); });
(function(){
  const dim = document.getElementById('voteSheetDim');
  if(dim) dim.addEventListener('click', closeVoteSheet);
  const tg = document.getElementById('wsToggle');
  if(tg) tg.addEventListener('click', ()=>{
    const body = document.getElementById('wsBody');
    if(!body) return;
    body.hidden = !body.hidden;
    tg.classList.toggle('open', !body.hidden);
    const t = tg.querySelector('span'); if(t) t.textContent = body.hidden ? '투표 현황 보기' : '투표 현황 닫기';
    if(!body.hidden) renderWeekStatus();
  });
})();

/* 이번 주(또는 다음 주)의 참여·불참·미투표 명단을 세 칸으로 보여줍니다. 버튼을 눌러 펼친 경우에만 그립니다. */
function renderWeekStatus(){
  const body = document.getElementById('wsBody');
  if(!body || body.hidden || !appData) return;
  const offset = window.__wsWeek === 1 ? 1 : 0;
  const base = parseYMD(getWeekStart(todayStr()));
  base.setDate(base.getDate() + offset*7);
  const weekKey = fmtDate(base);
  const end = new Date(base); end.setDate(end.getDate()+6);
  const names = getApprovedNonAdminNames();
  const avail = (appData.weekAvailability && appData.weekAvailability[weekKey]) || {};
  const absence = (appData.weekAbsence && appData.weekAbsence[weekKey]) || {};
  const yes = [], no = [], none = [];
  names.forEach(n=>{
    const picks = avail[n] || [];
    if(absence[n]) no.push(n);
    else if(picks.length) yes.push(n);
    else none.push(n);
  });
  const total = names.length || 1;
  const pc = (x)=>Math.round(x/total*100);
  const dayLetters = (n)=> (avail[n]||[]).map(d=>weekdayKR[parseYMD(d).getDay()]).join('');
  const col = (cls, title, arr, withDays)=>`
    <div class="ws-col ${cls}"><h4>${title} ${arr.length}</h4>
      ${arr.length ? arr.map(n=>`<div class="ws-nm ${n===myName?'me':''} ${isCurrentlyInjured(n)?'inj':''}"><span>${escapeHtml(n)}${isCurrentlyInjured(n)?' <em class="inj-tag" title="부상">🤕</em>':''}</span>${withDays?`<small>${escapeHtml(dayLetters(n))}</small>`:''}</div>`).join('') : '<div class="ws-empty">없음</div>'}
    </div>`;
  body.innerHTML = `
    <div class="ws-head"><div><b>${offset?'다음 주':'이번 주'} 투표 현황</b><small>${base.getMonth()+1}월 ${base.getDate()}일 ~ ${end.getMonth()+1}월 ${end.getDate()}일</small></div>
      <div class="ws-pills"><button type="button" data-ws="0" class="${offset?'':'on'}">이번 주</button><button type="button" data-ws="1" class="${offset?'on':''}">다음 주</button></div></div>
    <div class="ws-stack"><i style="width:${pc(yes.length)}%;background:var(--lime)"></i><i style="width:${pc(no.length)}%;background:#ff8a8a"></i><i style="width:${pc(none.length)}%;background:#ffc857"></i></div>
    <div class="ws-leg"><span>${names.length}명 중 <b>${yes.length+no.length}명</b> 응답</span><span>미투표 <b>${none.length}명</b></span></div>
    <div class="ws-cols">${col('y','참여',yes,true)}${col('a','불참',no,false)}${col('m','미투표',none,false)}</div>`;
  body.querySelectorAll('.ws-pills button').forEach(b=>b.addEventListener('click', ()=>{ window.__wsWeek = Number(b.dataset.ws); renderWeekStatus(); }));
}
