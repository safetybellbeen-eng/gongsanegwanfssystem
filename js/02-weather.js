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

