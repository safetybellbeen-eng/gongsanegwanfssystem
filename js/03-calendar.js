/* ================= 공유 데이터 저장소 (Supabase) ================= */
// TODO: 정식 배포 전 Supabase Auth 및 RLS(행 단위 보안)를 도입해 지금의 "누구나 읽기/쓰기 가능" 정책을 좁혀야 함
const SUPABASE_URL = 'https://ootiqpypoqttjiqjhkio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GY9qgB0wVnh2YmYWO9qrTA_OK-chx5W';
const supabaseClient = (typeof supabase !== 'undefined') ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const SUPABASE_ROW_ID = 1; // app_state 테이블의 고정 행(row) id — 팀 전체가 공유하는 데이터 한 덩어리

function emptyAppData(){ return { venues:{}, votedDates:[], votes:{}, members:{}, weekAvailability:{}, weekAbsence:{}, weekOverride:{}, actualAttendance:{}, matchGuests:{}, excludedWeeks:[], statAdjustments:{}, matchTimeWindow:{startHour:19,endHour:21}, kakaoJsKey:'', notice:{title:'',body:'',updatedAt:null}, kmaApiKey:'', knownAutoVenues:[], venueAddrs:{} }; }
let appData = emptyAppData();

/* 주간 투표 행 비교용 도우미 */
function wvKey(wk, name){ return wk + '\u0001' + name; }
function wvJson(dates, absent){ return JSON.stringify([dates, !!absent]); }
function currentWeekVoteMap(data){
  const m = {};
  const wa = data.weekAvailability || {}, ab = data.weekAbsence || {};
  const weeks = new Set([...Object.keys(wa), ...Object.keys(ab)]);
  weeks.forEach(wk=>{
    const names = new Set([...Object.keys(wa[wk]||{}), ...Object.keys(ab[wk]||{})]);
    names.forEach(n=>{
      const has = wa[wk] && Object.prototype.hasOwnProperty.call(wa[wk], n);
      const abs = !!(ab[wk] && ab[wk][n]);
      if(!has && !abs) return;
      m[wvKey(wk, n)] = { wk, n, json: wvJson(has ? (wa[wk][n]||[]) : null, abs), dates: has ? (wa[wk][n]||[]) : null, absent: abs };
    });
  });
  return m;
}
function blobJson(data){ const d = Object.assign({}, data); delete d.weekAvailability; delete d.weekAbsence; return JSON.stringify(d); }
async function remoteLoad(){
  try{
    if(!supabaseClient) throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    const { data, error } = await supabaseClient
      .from('app_state')
      .select('data, version')
      .eq('id', SUPABASE_ROW_ID)
      .single();
    if(error) throw error;
    const record = (data && data.data) || {};
    // 주간 투표는 week_votes 표(사람·주 단위 행)에서 읽어 기존 모양(weekAvailability / weekAbsence)으로 되돌립니다.
    const wvRes = await supabaseClient.from('week_votes').select('week_key, member_name, dates, absent');
    if(wvRes.error) throw wvRes.error;
    const wa = {}, ab = {}, snap = {};
    (wvRes.data || []).forEach(r=>{
      if(r.dates !== null && r.dates !== undefined){ (wa[r.week_key] = wa[r.week_key] || {})[r.member_name] = Array.isArray(r.dates) ? r.dates : []; }
      if(r.absent){ (ab[r.week_key] = ab[r.week_key] || {})[r.member_name] = true; }
      snap[wvKey(r.week_key, r.member_name)] = wvJson(r.dates === undefined ? null : r.dates, !!r.absent);
    });
    const out = {
      venues: record.venues||{},
      votedDates: record.votedDates||[],
      votes: record.votes||{},
      members: record.members||{},
      weekAvailability: wa,
      weekAbsence: ab,
      weekOverride: record.weekOverride||{},
      actualAttendance: record.actualAttendance||{},
      notice: record.notice || {title:'',body:'',updatedAt:null},
      kmaApiKey: record.kmaApiKey || '',
      matchGuests: record.matchGuests || {},
      excludedWeeks: record.excludedWeeks || [],
      statAdjustments: record.statAdjustments || {},
      matchTimeWindow: record.matchTimeWindow||{startHour:19,endHour:21},
      kakaoJsKey: record.kakaoJsKey || '',
      knownAutoVenues: Array.isArray(record.knownAutoVenues) ? record.knownAutoVenues : [],
      venueAddrs: (record.venueAddrs && typeof record.venueAddrs==='object') ? record.venueAddrs : {}
    };
    Object.defineProperty(out, '__wv', { value: snap, writable:true, enumerable:false });
    Object.defineProperty(out, '__blob', { value: blobJson(out), writable:true, enumerable:false });
    Object.defineProperty(out, '__ver', { value: (data && data.version!=null) ? Number(data.version) : undefined, writable:true, enumerable:false });
    return out;
  }catch(e){
    console.error('remoteLoad 실패', e);
    toast('공유 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주시기 바랍니다.');
    return emptyAppData();
  }
}
/* 저장 규칙(낙관적 잠금): 내가 읽은 version 그대로일 때만 저장합니다.
   그 사이 다른 사람이 저장했다면 'conflict'를 돌려주고, 호출한 쪽(mutateAppData)이 최신본을 다시 받아 재시도합니다.
   불러오기에 실패해서 만든 빈 데이터(version 없음)는 서버를 덮어쓰지 않도록 저장을 거부합니다. */
async function remoteSaveRaw(data){
  try{
    if(!supabaseClient) throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    const ver = data && data.__ver;
    if(typeof ver !== 'number' || isNaN(ver)){ console.error('remoteSave 거부: 불러온 버전 정보가 없습니다.'); return { ok:false, reason:'noversion' }; }
    // 1) 주간 투표 변경분(내 행)만 week_votes에 반영 — 사람마다 행이 달라 서로 충돌하지 않습니다.
    const cur = currentWeekVoteMap(data), snap = data.__wv || {};
    const ups = Object.keys(cur).filter(k=>snap[k] !== cur[k].json).map(k=>({ week_key:cur[k].wk, member_name:cur[k].n, dates:cur[k].dates, absent:cur[k].absent, updated_at:new Date().toISOString() }));
    const dels = Object.keys(snap).filter(k=>!cur[k]).map(k=>k.split('\u0001'));
    // 2) 그 밖의 데이터(blob)는 바뀐 경우에만 버전 검사를 걸어 저장
    const blobNow = blobJson(data);
    if(blobNow !== data.__blob){
      const payload = JSON.parse(blobNow);
      const { data: rows, error } = await supabaseClient
        .from('app_state')
        .update({ data: payload, updated_at: new Date().toISOString() })
        .eq('id', SUPABASE_ROW_ID)
        .eq('version', ver)
        .select('version');
      if(error) throw error;
      if(!rows || rows.length===0) return { ok:false, reason:'conflict' };
      data.__ver = Number(rows[0].version);
      data.__blob = blobNow;
    }
    if(ups.length){ const r = await supabaseClient.from('week_votes').upsert(ups, { onConflict:'week_key,member_name' }); if(r.error) throw r.error; }
    for(const [wk, n] of dels){ const r = await supabaseClient.from('week_votes').delete().eq('week_key', wk).eq('member_name', n); if(r.error) throw r.error; }
    const ns = {}; Object.keys(cur).forEach(k=>{ ns[k] = cur[k].json; }); data.__wv = ns;
    return { ok:true };
  }catch(e){
    console.error('remoteSave 실패', e);
    return { ok:false, reason:'error' };
  }
}
async function remoteSave(data){
  const r = await remoteSaveRaw(data);
  if(!r.ok) toast(r.reason==='conflict' ? '다른 사람이 동시에 저장했습니다. 다시 시도해 주세요.' : '저장에 실패했습니다. 네트워크 상태를 확인해 주시기 바랍니다.');
  return r.ok;
}
/* 저장 직전에 항상 최신 데이터를 다시 받아서 병합 → 다른 팀원의 변경을 덮어쓰지 않도록 함 */
async function mutateAppData(mutator){
  let fresh = null;
  for(let i=0;i<5;i++){
    fresh = await remoteLoad();
    mutator(fresh);
    const r = await remoteSaveRaw(fresh);
    if(r.ok){ appData = fresh; return fresh; }
    if(r.reason!=='conflict'){ toast(r.reason==='noversion' ? '데이터를 불러오지 못해 저장하지 않았습니다. 새로고침 후 다시 시도해 주세요.' : '저장에 실패했습니다. 네트워크 상태를 확인해 주시기 바랍니다.'); return fresh; }
    await new Promise(res=>setTimeout(res, 120 + Math.random()*250));   // 동시에 저장한 경우: 잠깐 쉬고 최신본으로 다시
  }
  toast('저장이 계속 겹쳐서 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.');
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
  head.innerHTML = ['일','월','화','수','목','금','토'].map((d,i)=>`<div class="cal-dow ${i===0?'sun':(i===6?'sat':'')}">${d}</div>`).join('');
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
    const isPastWk = fmtDate(ed) < todayS;
    if(isPastWk) row.classList.add('is-past');
    if(isThis||isNext){
      if(!weekCache[weekStartStr]) weekCache[weekStartStr] = getWeekInfo(weekStartStr);
      const wi = weekCache[weekStartStr];
      const cfd = (wi.confirmedDates||[]).slice().sort()[0];
      let st;
      if(cfd){ const cd = parseYMD(cfd); st = `<b class="wh-cf">${cd.getDate()}일(${weekdayKR[cd.getDay()]}) 확정</b><span class="wh-n">${wi.counts[cfd]||0}명 참석</span>`; }
      else st = '<b class="wh-vt">경기일 투표 중</b>';
      row.innerHTML = `<div class="wk-head"><em class="wh-tag">${isThis?'이번 주':'다음 주'}</em>${st}</div>`;
    } else row.innerHTML = '';
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
      el.className='cal-cell'+(dObj.getMonth()!==viewMonth?' out':'')+(dateStr===todayS?' today':'')+(dateStr===selectedDate?' selected':'')+(isWinner?' confirmed':'')+((isWinner&&dateStr<todayS)?' done':'')+(isPendingTop?' pending':'')+(i===0?' sun':(i===6?' sat':''));
      const dots = Math.min(2, count>=6 ? 2 : (count>0 ? 1 : 0));
      el.innerHTML = `
        <div class="d">${day}</div>
        ${bdayNames.length?`<div class="bday-badge" title="${escapeHtml(bdayNames.join(', '))} 생일">🎂</div>`:''}
        ${isWinner ? `<div class="cf-tag">${dateStr<todayS?'완료':'확정'}</div>` : `<div class="dots" title="${count}명 가능">${'<i></i>'.repeat(dots)}</div>`}
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
  if(document.hidden) return;
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

