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
      me.innerHTML = `<div class="mm-avatar">${escapeHtml(myName.charAt(0))}</div><div class="mm-tx"><b>${escapeHtml(myName)}${isAdminUser()?` <span class="admin-badge">${isOwnerUser()?'최고 관리자':'관리자'}</span>`:''}</b><small>${escapeHtml(rate ? rate.textContent : '')}</small></div>`;
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
    if(act==='invite') shareInviteLink();
    else if(act==='bell') enableAppNotifications();
    else if(act==='logout') click('logoutBtn');
    else if(act==='injury'){ openInjurySheet(); }
    else if(act==='diag'){ openDiag(); }
    else if(act==='update'){ refreshApp(); }
  });
});

/* ---------- 모바일 하단 탭 전환 (768px 이하에서만 시각적으로 의미가 있지만, 클래스 토글 자체는 항상 동작) ---------- */
function setActiveMobileSection(tabKey){
  const tabHi = ['tactics','weather','records','admin','members'].includes(tabKey) ? 'more' : tabKey;
  document.querySelectorAll('.mobile-tabbar .tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===tabHi));
  document.querySelectorAll('.app-section').forEach(s=>s.classList.remove('mobile-active'));
  const idMap = { home:'sectionHome', weather:'sectionWeather', calendar:'sectionCalendar', matches:'sectionMatches', map:'sectionMap', records:'sectionRecords', admin:'sectionAdmin', tactics:'sectionTactics', more:'sectionMore', members:'sectionMembers' };
  const sec = document.getElementById(idMap[tabKey] || '');
  if(sec) sec.classList.add('mobile-active');
  // 상단 헤더(공생관 FS·알림·사용자 버튼)는 홈 화면에서만 보여줍니다.
  document.body.classList.toggle('hide-header', tabKey!=='home');
  pageScrollTop('instant');
  if(tabKey==='home') tryRenderHomeTab();
  if(tabKey==='more') tryRenderMoreTab();
  try{ fitHomeToScreen(); }catch(e){}   // 첫 화면이 그려지기 전에 높이를 먼저 맞춰, 전환 후 크기가 다시 바뀌는 현상을 막습니다.
  try{ scheduleFit(); }catch(e){}
  if(tabKey==='members'){ try{ renderMembersPage(); }catch(e){ console.error(e); } }
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
document.addEventListener('DOMContentLoaded', ()=>setActiveMobileSection('home')); // 모바일 폭에서 기본으로 보일 탭 (모든 js가 불러와진 뒤 실행)

