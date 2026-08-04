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

function initAppUI(){
  const now = new Date();
  viewYear = now.getFullYear(); viewMonth = now.getMonth();
  renderCalendar();
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
  initAppUI();
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

function emptyAppData(){ return { venues:{}, votedDates:[], votes:{}, members:{}, weekAvailability:{}, weekAbsence:{}, weekOverride:{}, actualAttendance:{}, matchGuests:{}, excludedWeeks:[], statAdjustments:{}, favoriteVenues:[], matchTimeWindow:{startHour:19,endHour:21}, kakaoJsKey:'', notice:{title:'',body:'',updatedAt:null}, kmaApiKey:'' }; }
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
      favoriteVenues: record.favoriteVenues || [],
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
let selectedDate = null;
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
  const approvedNames = Object.keys(data.members||{}).filter(n=>data.members[n].approved);
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
  const first = new Date(viewYear, viewMonth, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  $('#monthLabel').textContent = `${viewYear}.${pad(viewMonth+1)}`;
  const grid = $('#calGrid');
  grid.innerHTML='';
  ['일','월','화','수','목','금','토'].forEach(d=>{ const el=document.createElement('div'); el.className='cal-dow'; el.textContent=d; grid.appendChild(el); });
  for(let i=0;i<startDow;i++){ const el=document.createElement('div'); el.className='cal-cell empty'; grid.appendChild(el); }
  const todayS = todayStr();
  const weekCache = {};
  const selectedWeekDates = selectedDate ? getWeekDates(getWeekStart(selectedDate)) : [];
  for(let day=1; day<=daysInMonth; day++){
    const dateStr = fmtDate(new Date(viewYear, viewMonth, day));
    const weekKey = getWeekStart(dateStr);
    if(!weekCache[weekKey]) weekCache[weekKey] = getWeekInfo(weekKey);
    const info = weekCache[weekKey];
    const count = info.counts[dateStr] || 0;
    const isWinner = info.confirmedDates.includes(dateStr);
    const isPendingTop = info.isTie && info.topDates.includes(dateStr);

    const votesForDay = appData.votes[dateStr] || [];
    const myVoteForDay = votesForDay.find(v=>v.name===myName);
    let dotClass = '';
    if(myVoteForDay){ dotClass = myVoteForDay.choice==='yes' ? 'dot-yes' : 'dot-no'; }
    const bdayNames = getBirthdayMembersForDate(viewMonth+1, day);

    const isWeekActive = selectedWeekDates.includes(dateStr);
    const isExactSelected = dateStr === selectedDate;

    const el = document.createElement('div');
    el.className='cal-cell'+(dateStr===todayS?' today':'')+(isWeekActive?' week-active':'')+(isExactSelected?' selected':'')+(isWinner?' confirmed':'')+(isPendingTop?' pending':'');
    el.innerHTML = `
      <div class="d">${day}</div>
      ${bdayNames.length?`<div class="bday-badge" title="${escapeHtml(bdayNames.join(', '))} 생일">🎂</div>`:''}
      ${count>0?`<div class="vote-count ${isWinner?'confirmed':(isPendingTop?'pending':'')}">${count}명${isWinner?' 확정':(isPendingTop?' 예정':'')}</div>`:''}
      ${dotClass?`<div class="dot ${dotClass}"></div>`:''}
    `;
    el.addEventListener('click', ()=>setSelectedDate(dateStr));
    grid.appendChild(el);
  }
}

function pieGradient(yes, no){
  const total = yes+no;
  if(total===0) return null;
  const yesPct = (yes/total)*100;
  return `conic-gradient(var(--pitch) 0% ${yesPct}%, var(--danger) ${yesPct}% 100%)`;
}

let lastVotesJson = null;

/* 캘린더에서 날짜를 클릭하면 그 날짜가 속한 '주' 전체의 가능일 투표 패널을 보여줍니다. */
/* 관리자가 실제 참석을 확정한 날짜는 투표 대신 실제 참석 여부를 기준으로 참석/불참을 판단합니다. */
function getEffectiveVotesForDate(date){
  const actual = appData.actualAttendance && appData.actualAttendance[date];
  if(actual && actual.finalized){
    const approvedNames = getApprovedNonAdminNames();
    const attendSet = new Set(actual.attendees||[]);
    return approvedNames.map(name=>({ name, choice: attendSet.has(name) ? 'yes' : 'no' }));
  }
  return appData.votes[date] || [];
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
  const notVotedHtml = `
    <div class="not-voted-row">
      <span class="label">미투표 인원 (${notVoted.length}명)</span>
      <div class="not-voted-list">${notVoted.length? notVoted.map(n=>`<span class="nv-chip">${escapeHtml(n)}</span>`).join('') : '<span class="nv-empty">모두 투표했어요 🎉</span>'}</div>
    </div>
    <div class="not-voted-row">
      <span class="label">불참자 현황 (${absentNames.length}명)</span>
      <div class="not-voted-list">${absentNames.length? absentNames.map(n=>`<span class="nv-chip">${escapeHtml(n)}</span>`).join('') : '<span class="nv-empty">불참 선언한 인원이 없습니다</span>'}</div>
    </div>
  `;

  const isSelectedConfirmed = confirmedDates.includes(selectedDate);
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

  /* 확정된 경기의 참석률/참석·불참 명단은 그대로 유지 (읽기 전용, 별도 참석/불참 버튼은 없음 — 날짜 선택이 곧 참석 여부입니다) */
  let confirmedSummaryHtml = '';
  if(isSelectedConfirmed){
    const actualRecord = appData.actualAttendance && appData.actualAttendance[selectedDate];
    const isFinalized = actualRecord && actualRecord.finalized;
    const effVotes = getEffectiveVotesForDate(selectedDate);
    const yesList = effVotes.filter(v=>v.choice==='yes');
    const noList = effVotes.filter(v=>v.choice==='no');
    const guests = (isFinalized && actualRecord.guests) || [];
    const grad = pieGradient(yesList.length + guests.length, noList.length);
    const total = yesList.length + guests.length + noList.length;
    const weekRate = total ? Math.round((yesList.length+guests.length)/total*100) : null;
    const noShowSummary = isFinalized ? computeNoShowSummary(selectedDate) : null;
    confirmedSummaryHtml = `
      ${isFinalized ? `<div class="confirm-banner" style="background:rgba(61,220,132,0.1);border-color:rgba(61,220,132,0.4);color:var(--pitch);">✅ 실제 참석 체크 완료</div>` : ''}
      ${weekRate!=null ? `<div class="week-rate-big">${weekLabel} 참석률 <b>${weekRate}%</b> <span class="wr-sub">(${yesList.length+guests.length}/${total}명${isFinalized?' · 실제 참석 기준':' · 투표 기준'})</span></div>` : ''}
      <div class="pie-row">
        ${grad ? `<div class="pie" style="background:${grad};"></div>` : `<div class="pie" style="background:var(--surface-2);"></div>`}
        <div class="pie-legend">
          ${total? `
            <div class="li"><span class="sw yes"></span>참석 ${Math.round((yesList.length+guests.length)/total*100)}% (${yesList.length+guests.length}명)</div>
            <div class="li"><span class="sw no"></span>불참 ${Math.round(noList.length/total*100)}% (${noList.length}명)</div>
          ` : `<div class="pie-empty">아직 투표가 없습니다.</div>`}
        </div>
      </div>
      <div class="voter-lists">
        <div class="voter-col yes"><h4>참석 명단</h4>${(yesList.length||guests.length)? [...yesList.map(v=>`<div class="voter-name">${escapeHtml(v.name)}</div>`), ...guests.map(g=>`<div class="voter-name">${escapeHtml(g)} <span style="color:var(--muted);font-size:10px;">(게스트)</span></div>`)].join('') : '<div class="voter-empty">아직 없음</div>'}</div>
        <div class="voter-col no"><h4>불참 명단</h4>${noList.length? noList.map(v=>`<div class="voter-name">${escapeHtml(v.name)}</div>`).join('') : '<div class="voter-empty">아직 없음</div>'}</div>
      </div>
      ${noShowSummary && (noShowSummary.noShow.length || noShowSummary.suddenAttend.length) ? `
      <div class="noshow-summary">
        ${noShowSummary.noShow.length? `<div class="ns-row"><span class="ns-label noshow">노쇼</span>${noShowSummary.noShow.map(n=>`<span class="nv-chip">${escapeHtml(n)}</span>`).join('')}</div>` : ''}
        ${noShowSummary.suddenAttend.length? `<div class="ns-row"><span class="ns-label sudden">번개참석</span>${noShowSummary.suddenAttend.map(n=>`<span class="nv-chip">${escapeHtml(n)}</span>`).join('')}</div>` : ''}
      </div>` : ''}
    `;
  }

  /* 날짜 선택(가로 요일칩) 대신, 세로로 나열된 날짜 목록에서 직접 선택합니다.
     선택하면 그 날짜의 명단에 본인 이름이 바로 추가 또는 제거됩니다. */
  const myAvail = avail[myName] || [];
  const dayVoteListHtml = dates.map((d,i)=>{
    const dObj = parseYMD(d);
    const isPast = d < todayStr();
    const picked = myAvail.includes(d);
    const isConfirmedDay = confirmedDates.includes(d);
    const isTieTop = isTie && topDates.includes(d);
    const names = Object.keys(avail).filter(n=>(avail[n]||[]).includes(d));
    const disabled = isPast || iAmAbsent || iAmInjured;
    return `
      <div class="da-row ${isConfirmedDay?'confirmed':''} ${isTieTop?'tie':''} ${picked?'picked':''} ${disabled?'disabled':''}" data-date="${d}">
        <div class="da-head">
          <span class="da-date">${dObj.getMonth()+1}.${dObj.getDate()}(${weekdayKR[i]})</span>
          <span class="da-count">${counts[d]}명</span>
          ${isConfirmedDay?'<span class="wbadge">확정</span>':(isTieTop?'<span class="wbadge tie">예정</span>':'')}
        </div>
        <div class="da-names">${names.length? names.map(n=>`<span class="nv-chip ${n===myName?'me':''}">${escapeHtml(n)}</span>`).join('') : '<span class="nv-empty">없음</span>'}</div>
      </div>
    `;
  }).join('');

  const mainHtml = `
    <div class="match-head">
      <div class="match-date">${weekLabel}<span class="sub">${rangeLabel}</span></div>
    </div>
    ${banner}
    ${confirmedSummaryHtml}
    ${iAmInjured ? `<div class="confirm-banner" style="background:rgba(255,93,93,0.1);border-color:rgba(255,93,93,0.4);color:var(--danger);">🤕 부상 중에는 투표할 수 없습니다. (복귀 예정일: ${escapeHtml(appData.members[myName].injuryEnd)})</div>` : ''}
    <div class="week-summary-row">
      <span>참여 의사 ${availableNames.length}명</span><span class="dot-sep">|</span>
      <span>불참 ${absentNames.length}명</span><span class="dot-sep">|</span>
      <span>미투표 ${notVoted.length}명</span>
    </div>
    <button class="absence-btn ${iAmAbsent?'active':''}" id="absenceBtn" ${iAmInjured?'disabled':''}>${iAmAbsent?`✕ ${weekLabel} 불참 취소`:`${weekLabel} 전체 불참`}</button>
    ${notVotedHtml}
    <div class="daily-attend-block">
      <div class="label">날짜 선택(누르면 이름이 추가 또는 제거됩니다)</div>
      <div class="daily-attend-list">${dayVoteListHtml}</div>
    </div>
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

  panel.innerHTML = mainHtml + adminHtml;

  panel.querySelectorAll('.da-row:not(.disabled)').forEach(el=>{
    el.addEventListener('click', ()=>toggleWeekDay(el.dataset.date));
  });
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
  const myRank = attendList.findIndex(r=>r.name===myName);
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
  const tabBtn = $('#adminTabBtn');
  if(badge) badge.style.display = show ? 'inline-block' : 'none';
  if(eyebrow) eyebrow.style.display = show ? 'flex' : 'none';
  if(panel) panel.style.display = show ? 'block' : 'none';
  if(tabBtn) tabBtn.style.display = show ? 'flex' : 'none';
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
  played.forEach(d=>{ const key=d.slice(0,7); byMonth[key]=(byMonth[key]||0)+1; });
  const months = Object.keys(byMonth).sort().reverse();
  return { totalPlayed: played.length, upcomingCount: upcoming.length, byMonth, months };
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
      <div class="stats-history-label">월별 진행 기록</div>
      <div class="stats-history-list">
        ${stats.months.length? stats.months.map(m=>`<div class="smh-row"><span>${m.replace('-','.')}</span><span>${stats.byMonth[m]}회</span></div>`).join('') : '<div class="rank-empty">아직 진행된 경기가 없습니다.</div>'}
      </div>
    </div>
  `;
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
  el.innerHTML = `
    <div class="hero-top">
      <span class="hero-dday">${ddayLabel}</span>
      <span class="hero-label">확정 경기</span>
    </div>
    <div class="hero-main-row">
      <div class="hero-left">
        <div class="hero-date">${dObj.getMonth()+1}.${dObj.getDate()}(${weekdayKR[dObj.getDay()]})</div>
        ${venue && venue.time ? `<div class="hero-time">${escapeHtml(venue.time)}</div>` : ''}
        ${venue ? `<div class="hero-venue">📍 ${escapeHtml(venue.name)}${venue.address?`<div class="addr">${escapeHtml(venue.address)}</div>`:''}</div>` : `<div class="hero-venue" style="color:var(--muted);">경기장 정보가 아직 등록되지 않았습니다</div>`}
      </div>
      <div class="hero-right">
        <div class="hero-count-label">참석 현황</div>
        <div class="hero-count-big">${totalAttending}<span class="of">/${approvedTotal}명</span></div>
        <div class="hero-avatars">${avatarsHtml}</div>
      </div>
    </div>
    <div class="hero-attendee-list">${attendeeChips.length? attendeeChips.map(p=>`<span class="nv-chip">${escapeHtml(p.name)}${p.isGuest?' <span class="guest-tag">용병</span>':''}${admin?` <button class="chip-remove-btn" data-name="${escapeHtml(p.name)}" data-guest="${p.isGuest?'1':'0'}" title="제외">✕</button>`:''}</span>`).join('') : '<span class="nv-empty">아직 참석자가 없습니다</span>'}</div>
    ${adminAddControl}
    ${venue && venue.link ? `<button class="hero-link-btn" id="heroLinkBtn" data-link="${escapeHtml(venue.link)}">🔗 경기 링크</button>` : ''}
  `;
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
    const approvedNames = Object.keys(data.members||{}).filter(n=>data.members[n].approved);
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
    <div class="nc-top"><span class="nc-tag">중요</span><span class="nc-title">${escapeHtml(notice.title||'공지사항')}</span><span class="nc-chevron">›</span></div>
    ${notice.body?`<div class="nc-body">${escapeHtml(notice.body)}</div>`:''}
    ${dateStr?`<div class="nc-date">${dateStr}</div>`:''}
  `;
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
function findVenuePreset(name){ return FUTSAL_VENUES.find(v=>v.name===name); }
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
  const favSet = new Set(appData.favoriteVenues || []);
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
populateVenuePresetSelect();
$('#venuePresetSelect').addEventListener('change', ()=>{
  const name = $('#venuePresetSelect').value;
  if(!name) return;
  $('#venueInput').value = name;
  lookupVenueOnMap();
});

/* 관리자만 볼 수 있는 즐겨찾기(자주 쓰는 경기장) 토글 버튼 */
function updateFavVenueBtn(){
  const btn = $('#favVenueBtn');
  if(!btn) return;
  if(!isAdminUser()){ btn.style.display='none'; return; }
  const name = $('#venueInput').value.trim();
  const preset = findVenuePreset(name);
  if(!preset){ btn.style.display='none'; return; }
  btn.style.display = 'inline-block';
  const isFav = (appData.favoriteVenues||[]).includes(preset.name);
  btn.textContent = isFav ? '★' : '☆';
  btn.classList.toggle('on', isFav);
}
/* 즐겨찾기 저장이 다른 사람의 동시 저장(투표 등)과 겹치면 그 사이에 값이 유실될 수 있어서,
   저장 후 다시 불러와 실제로 반영됐는지 확인하고, 안 됐으면 짧게 기다렸다가 다시 시도합니다. */
async function setFavoriteVenueRobust(name, shouldBeFavorite){
  for(let attempt=0; attempt<3; attempt++){
    await mutateAppData(data=>{
      if(!data.favoriteVenues) data.favoriteVenues = [];
      const has = data.favoriteVenues.includes(name);
      if(shouldBeFavorite && !has) data.favoriteVenues.push(name);
      if(!shouldBeFavorite && has) data.favoriteVenues = data.favoriteVenues.filter(n=>n!==name);
    });
    const check = await remoteLoad();
    const nowHas = (check.favoriteVenues||[]).includes(name);
    if(nowHas === shouldBeFavorite){ appData = check; return true; }
    await new Promise(r=>setTimeout(r, 300 + attempt*300));
  }
  console.error('[즐겨찾기] 3회 재시도에도 반영되지 않았습니다:', name);
  return false;
}
$('#favVenueBtn').addEventListener('click', async ()=>{
  if(!requireAdmin()) return;
  const name = $('#venueInput').value.trim();
  const preset = findVenuePreset(name);
  if(!preset) return;
  const willBeFavorite = !(appData.favoriteVenues||[]).includes(preset.name);
  const ok = await setFavoriteVenueRobust(preset.name, willBeFavorite);
  populateVenuePresetSelect();
  updateFavVenueBtn();
  if(venuePinObjects[preset.name]){
    const isFavNow = (appData.favoriteVenues||[]).includes(preset.name);
    setVenueStarBadge(preset.name, isFavNow);
    refreshVenuePinStyle(preset.name, currentHighlightedVenueName===preset.name);
  }
  if(!ok){
    toast('즐겨찾기 저장에 실패했습니다. 잠시 후 다시 시도해 주시기 바랍니다.');
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
  const info = { name, address: preset ? preset.address : '' };
  await showVenueOnMap(info);
}

/* 지도 렌더링의 핵심 로직 (직접 검색과 "기본 경기장 자동 표시"가 공통으로 사용합니다) */
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
    const isFav = (appData.favoriteVenues||[]).includes(v.name);
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
    prevObj.type = (appData.favoriteVenues||[]).includes(confirmedVenueName) ? 'favorite' : 'regular';
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
    data.venues[dateStr] = { name: venueName, address: preset ? preset.address : '', time: timeStr, link };
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
  if(!coords){ toast('경기장 위치를 찾지 못했습니다. 이름/주소를 확인해 주시기 바랍니다.'); return; }
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
$('#prevMonth').addEventListener('click', ()=>{ viewMonth--; if(viewMonth<0){viewMonth=11; viewYear--;} renderCalendar(); });
$('#nextMonth').addEventListener('click', ()=>{ viewMonth++; if(viewMonth>11){viewMonth=0; viewYear++;} renderCalendar(); });

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
    initAppUI();
  }
})();

/* ---------- 홈 섹션(모바일 첫 화면) 미니 위젯 렌더링 ---------- */
function renderHomeTab(){
  if(typeof appData==='undefined' || !appData || !myName) return;

  const voteCard = document.getElementById('homeVoteCard');
  if(voteCard){
    const thisWeekKey = getWeekStart(todayStr());
    const nextWeekDate = parseYMD(thisWeekKey);
    nextWeekDate.setDate(nextWeekDate.getDate()+7);
    const weekKey = fmtDate(nextWeekDate);
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
    voteCard.innerHTML = `
      <div class="hero-top"><span class="hero-label">${escapeHtml(label)} 투표 현황</span></div>
      ${rowsHtml}
      <button class="home-goto-btn" id="homeGotoCalBtn">투표하러 가기</button>
    `;
    const gotoBtn = document.getElementById('homeGotoCalBtn');
    if(gotoBtn) gotoBtn.addEventListener('click', ()=>{
      const calBtn = document.querySelector('.mobile-tabbar .tab-btn[data-tab="calendar"]');
      if(calBtn) calBtn.click();
      if(typeof setSelectedDate==='function') setSelectedDate(weekKey);
    });
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
    wMini.onclick = ()=>{ const b = document.querySelector('.mobile-tabbar .tab-btn[data-tab="weather"]'); if(b) b.click(); };
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
    bMini.onclick = ()=>{ const b = document.querySelector('.mobile-tabbar .tab-btn[data-tab="records"]'); if(b) b.click(); };
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
}

/* ---------- 모바일 하단 탭 전환 (768px 이하에서만 시각적으로 의미가 있지만, 클래스 토글 자체는 항상 동작) ---------- */
function setActiveMobileSection(tabKey){
  document.querySelectorAll('.mobile-tabbar .tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===tabKey));
  document.querySelectorAll('.app-section').forEach(s=>s.classList.remove('mobile-active'));
  const idMap = { home:'sectionHome', weather:'sectionWeather', calendar:'sectionCalendar', matches:'sectionMatches', map:'sectionMap', records:'sectionRecords', admin:'sectionAdmin' };
  const sec = document.getElementById(idMap[tabKey] || '');
  if(sec) sec.classList.add('mobile-active');
  window.scrollTo({top:0, behavior:'instant'});
  if(tabKey==='home') tryRenderHomeTab();
  if(tabKey==='map') loadDefaultMapVenue();
  if(tabKey==='matches') initMatchesTabOnce();
}
document.querySelectorAll('.mobile-tabbar .tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>setActiveMobileSection(btn.dataset.tab));
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
   즐겨찾기는 지도 탭에서 관리자가 지정한 appData.favoriteVenues(Supabase 공유 데이터)를 그대로 사용합니다. */

let selectedMatchDate = null; // YYYY-MM-DD
let matchTimeFilter = 'evening';  // all | morning | afternoon | evening (기본은 저녁 19시 이후)
let matchFavOnly = false;
let matchesTabInited = false;
let lastMatchRows = [];
let matchVisibleCount = 10;
const MATCHES_PER_PAGE = 10;

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

/* 모집 상태 판정: Supabase에는 apply_status가 'available'(모집중) 또는 'hurry'(마감임박)만
   저장되어 있습니다 ('full'은 fetch-plab.js에서 애초에 저장하지 않습니다). */
function getMatchStatus(row){
  if(row.apply_status === 'available') return 'open';
  if(row.apply_status === 'hurry') return 'closing';
  return 'full'; // 예상 밖의 값이 들어온 경우를 위한 방어적 처리
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
    renderMatchList();
  }catch(e){
    console.error('[경기 탭] plab_matches 조회 실패', e);
    listEl.innerHTML = '<div class="rank-empty">경기 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주시기 바랍니다.</div>';
    if(countEl) countEl.textContent = '-';
    if(updatedEl) updatedEl.textContent = '';
  }
}

function renderMatchList(){
  const listEl = $('#matchListContainer');
  const countEl = $('#matchCountText');
  if(!listEl) return;
  const favSet = new Set(appData.favoriteVenues || []);

  let rows = lastMatchRows.filter(r=>{
    if(matchTimeFilter !== 'all' && matchTimePeriod(r.match_time) !== matchTimeFilter) return false;
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

    const isFav = [...favSet].some(fav=>{
      const normalize = (s)=> String(s||'').replace(/\s+/g, '');
      const a = normalize(r.stadium_name), b = normalize(fav);
      return a && b && (a===b || a.includes(b) || b.includes(a));
    });
    const favBtnHtml = isAdminUser()
      ? `<button type="button" class="mc-fav-btn ${isFav?'on':''}" data-venue="${escapeHtml(r.stadium_name||'')}" title="이 경기장 즐겨찾기">${isFav?'★':'☆'}</button>`
      : '';

    return `
      <div class="match-card">
        <div class="mc-top-row">
          <span class="mc-time">${escapeHtml(timeStr)}</span>
          <span class="mc-venue">📍 ${escapeHtml(r.stadium_name || '경기장 미정')}</span>
          ${favBtnHtml}
        </div>
        ${extraTagsHtml}
        <div class="mc-status-row">
          <span class="mc-status ${label.cls}">${label.text}</span>
          ${typeHtml}
        </div>
        <div class="mc-action-row">
          <button type="button" class="mc-apply-btn" data-url="${escapeHtml(r.match_url||'')}">신청하기 →</button>
        </div>
      </div>
    `;
  }).join('');

  const moreHtml = remaining > 0
    ? `<button type="button" class="match-more-btn" id="matchMoreBtn">더 많은 경기 보기 (${remaining}경기 더)</button>`
    : '';

  listEl.innerHTML = cardsHtml + moreHtml;

  listEl.querySelectorAll('.mc-apply-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(btn.dataset.url) window.open(btn.dataset.url, '_blank', 'noopener');
    });
  });
  listEl.querySelectorAll('.mc-fav-btn').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      const venueName = btn.dataset.venue;
      if(!venueName) return;
      const willBeFavorite = !btn.classList.contains('on');
      btn.disabled = true;
      const ok = await setFavoriteVenueRobust(venueName, willBeFavorite);
      btn.disabled = false;
      if(ok){
        toast(willBeFavorite ? `'${venueName}' 즐겨찾기에 추가했습니다.` : `'${venueName}' 즐겨찾기에서 제거했습니다.`);
        renderMatchList();
      } else {
        toast('즐겨찾기 저장에 실패했습니다. 잠시 후 다시 시도해 주시기 바랍니다.');
      }
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
  const favBtn = $('#matchFavFilterBtn');
  if(favBtn) favBtn.addEventListener('click', ()=>{
    matchFavOnly = !matchFavOnly;
    matchVisibleCount = MATCHES_PER_PAGE;
    favBtn.classList.toggle('active', matchFavOnly);
    renderMatchList();
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
