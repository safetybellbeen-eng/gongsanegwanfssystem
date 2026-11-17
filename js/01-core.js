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
let toastTimer = null;
function toast(msg, ms){ toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(()=>toastEl.classList.remove('show'), ms || 2200); }
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
    fresh.members[name] = { birth, status:'offline', approved: isAdminAccount, lastSeen: Date.now(), joinedAt: todayStr() };
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
  window.__autoVenuesP = loadAutoVenues();   // 신규 구장 자동 등록(캐시 먼저 적용, 6시간마다 갱신)
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

/* 부상 설정은 관리자뿐 아니라 로그인한 본인도 스스로 할 수 있습니다. (아래에서 올라오는 시트) */
function fmtKDate(s){
  if(!s) return '';
  const o = parseYMD(s);
  return `${o.getMonth()+1}월 ${o.getDate()}일 (${weekdayKR[o.getDay()]})`;
}
function daysBetween(a, b){ return Math.round((parseYMD(b) - parseYMD(a)) / 86400000); }
function addDaysStr(s, n){
  const o = parseYMD(s); o.setDate(o.getDate()+n);
  return `${o.getFullYear()}-${String(o.getMonth()+1).padStart(2,'0')}-${String(o.getDate()).padStart(2,'0')}`;
}
function renderInjurySheet(){
  if(!myName) return;
  const m = (appData.members && appData.members[myName]) || {};
  const st = $('#myInjuryStartInput').value, en = $('#myInjuryEndInput').value;
  $('#injStartTxt').textContent = st ? fmtKDate(st) : '날짜 선택';
  $('#injEndTxt').textContent = en ? fmtKDate(en) : '날짜 선택';
  $('#injStartCard').classList.toggle('on', !!st);
  $('#injEndCard').classList.toggle('on', !!en);
  const box = $('#injStatus'), t = $('#injStatusTitle'), sub = $('#injStatusSub');
  const has = !!(m.injuryStart && m.injuryEnd);
  const now = has && isCurrentlyInjured(myName);
  box.classList.toggle('inj', now);
  if(now){
    const left = daysBetween(todayStr(), m.injuryEnd);
    t.textContent = `🤕 부상 중 · ${left>0?'D-'+left+' ':''}복귀 예정`;
    sub.textContent = `${fmtKDate(m.injuryStart)} ~ ${fmtKDate(m.injuryEnd)} (총 ${daysBetween(m.injuryStart, m.injuryEnd)+1}일)`;
  } else if(has){
    t.textContent = '등록된 부상 기간이 있습니다';
    sub.textContent = `${fmtKDate(m.injuryStart)} ~ ${fmtKDate(m.injuryEnd)} (지금은 해당하지 않음)`;
  } else {
    t.textContent = '현재 등록된 부상 기간이 없습니다';
    sub.textContent = '정상 투표·순위 집계 중';
  }
  $('#myInjurySaveBtn').textContent = has ? '기간 수정 저장' : '부상 등록';
  $('#myInjuryClearBtn').disabled = !has;
}

/* ---------- 홈 경기카드 "멤버 보기" 시트 (참석 / 불참 / 미투표) ---------- */
let memSheetDate = null, memSheetTab = 'yes';
function memAvatarColor(name){
  const pal = ['#3ddc84','#6db8ff','#ffd76b','#ff8fa3','#c9a0ff','#ff9d5c'];
  let h = 0; for(let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) % pal.length;
  return pal[h];
}
function getMembersSheetData(date){
  const eff = getEffectiveVotesForDate(date).filter(v=>v.choice==='yes').map(v=>v.name);
  const guests = (appData.matchGuests && appData.matchGuests[date]) || [];
  const attendSet = new Set(eff);
  const bd = getVoteBreakdownForDate(date);
  const injured = [];
  const pick = (arr)=>arr.filter(n=>{ if(attendSet.has(n)) return false; if(isCurrentlyInjured(n)){ injured.push(n); return false; } return true; });
  return { yes: eff, guests, no: pick(bd.noList), notVoted: pick(bd.notVotedList), injured: [...new Set(injured)] };
}
function renderMembersSheet(){
  if(!memSheetDate || !appData) return;
  const d = getMembersSheetData(memSheetDate);
  const dObj = parseYMD(memSheetDate);
  $('#memSheetTitle').innerHTML = `${dObj.getMonth()+1}월 ${dObj.getDate()}일 (${weekdayKR[dObj.getDay()]}) 멤버 <em>참석 ${d.yes.length + d.guests.length}명</em>`;
  const tabs = [['yes','참석', d.yes.length + d.guests.length], ['no','불참', d.no.length], ['none','미투표', d.notVoted.length + d.injured.length]];
  $('#memSeg').innerHTML = tabs.map(t=>`<button type="button" data-t="${t[0]}" class="${memSheetTab===t[0]?'on':''}">${t[1]} ${t[2]}</button>`).join('');
  const row = (name, tagCls, tagTxt, sub, guest)=>`<div class="mem-li"><span class="mem-av" style="background:${guest?'#6fd0ff':memAvatarColor(name)}">${escapeHtml(guest?'G':name.charAt(0))}</span><div><b>${escapeHtml(name)}${name===myName?' <i>나</i>':''}</b>${sub?`<small>${sub}</small>`:''}</div><span class="mem-tag ${tagCls}">${tagTxt}</span></div>`;
  let html = '';
  if(memSheetTab==='yes'){
    html += d.yes.length ? `<div class="mem-sec">참석 확정</div>` + d.yes.map(n=>row(n,'tg','참석','')).join('') : '';
    html += d.guests.length ? `<div class="mem-sec">게스트</div>` + d.guests.map(n=>row(n+' (게스트)','tw','게스트','',true)).join('') : '';
    if(!d.yes.length && !d.guests.length) html = '<div class="mem-empty">아직 참석자가 없어요</div>';
  }else if(memSheetTab==='no'){
    html = d.no.length ? d.no.map(n=>row(n,'tb','불참','')).join('') : '<div class="mem-empty">불참한 멤버가 없어요</div>';
  }else{
    html = d.notVoted.length ? d.notVoted.map(n=>row(n,'tw','미투표','아직 투표 안 함')).join('') : '';
    if(d.injured.length){
      html += `<div class="mem-sec">부상 중 · 투표·알림 대상 제외</div>` + d.injured.map(n=>{ const m=(appData.members&&appData.members[n])||{}; return row(n,'tr','🤕 부상', m.injuryEnd ? `${fmtKDate(m.injuryEnd)} 복귀 예정` : ''); }).join('');
    }
    if(!html) html = '<div class="mem-empty">모든 멤버가 투표했어요 👏</div>';
  }
  $('#memList').innerHTML = html;
}
function openMembersSheet(date){
  memSheetDate = date; memSheetTab = 'yes';
  renderMembersSheet();
  $('#memSheetDim').hidden = false; $('#membersSheet').hidden = false;
  $('#memList').scrollTop = 0;
}
function closeMembersSheet(){ $('#memSheetDim').hidden = true; $('#membersSheet').hidden = true; memSheetDate = null; }
(function initMembersSheet(){
  const dim = $('#memSheetDim'), x = $('#memCloseBtn'), seg = $('#memSeg');
  if(!dim) return;
  dim.addEventListener('click', closeMembersSheet);
  x.addEventListener('click', closeMembersSheet);
  seg.addEventListener('click', (e)=>{ const b = e.target.closest('button[data-t]'); if(!b) return; memSheetTab = b.dataset.t; renderMembersSheet(); $('#memList').scrollTop = 0; });
})();

function openInjurySheet(){
  if(!myName){ toast('로그인 후 이용해 주세요.'); return; }
  const m = (appData.members && appData.members[myName]) || {};
  $('#myInjuryStartInput').value = m.injuryStart || '';
  $('#myInjuryEndInput').value = m.injuryEnd || '';
  renderInjurySheet();
  $('#injSheetDim').hidden = false; $('#injurySheet').hidden = false;
}
function closeInjurySheet(){ $('#injSheetDim').hidden = true; $('#injurySheet').hidden = true; }
function renderMyInjuryPanel(){ try{ renderInjurySheet(); }catch(e){} } // 하위 호환
(function initInjurySheet(){
  const startInput = $('#myInjuryStartInput'), endInput = $('#myInjuryEndInput');
  startInput.addEventListener('change', ()=>{
    if(startInput.value && endInput.value && endInput.value < startInput.value) endInput.value = '';
    renderInjurySheet();
  });
  endInput.addEventListener('change', renderInjurySheet);
  document.querySelectorAll('#injurySheet .inj-chips button').forEach(b=>b.addEventListener('click', ()=>{
    const start = startInput.value || todayStr();
    startInput.value = start;
    endInput.value = addDaysStr(start, parseInt(b.dataset.w,10)*7 - 1);
    renderInjurySheet();
  }));
  $('#injCloseBtn').addEventListener('click', closeInjurySheet);
  $('#injSheetDim').addEventListener('click', closeInjurySheet);
  const toggle = $('#myInjuryToggleBtn');
  if(toggle) toggle.addEventListener('click', openInjurySheet);
  $('#myInjurySaveBtn').addEventListener('click', async ()=>{
    const start = startInput.value, end = endInput.value;
    if(!start || !end){ toast('시작일과 종료일을 모두 선택해 주시기 바랍니다.'); return; }
    if(end < start){ toast('종료일이 시작일보다 빠를 수 없습니다.'); return; }
    const ok = await setInjuryPeriod(myName, start, end);
    if(!ok){ toast('저장에 실패했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.'); return; }
    closeInjurySheet();
    toast(isCurrentlyInjured(myName) ? '부상 기간을 등록했습니다. 투표와 순위 집계에서 제외됩니다.' : '부상 기간을 등록했습니다. 시작일부터 투표·순위 집계에서 제외됩니다.');
  });
  $('#myInjuryClearBtn').addEventListener('click', async ()=>{
    if(!confirm('부상 상태를 해제할까요?')) return;
    const ok = await setInjuryPeriod(myName, '', '');
    if(!ok){ toast('저장에 실패했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.'); return; }
    closeInjurySheet();
    toast('부상 상태를 해제했습니다.');
  });
})();

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

