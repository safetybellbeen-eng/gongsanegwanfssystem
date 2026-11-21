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

async function initLogin(){
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
}
/* 모든 js 파일이 불러와진 뒤(DOMContentLoaded)에 시작해야, 뒤쪽 파일의 함수를 앞쪽 코드가 부를 때 오류가 나지 않습니다. */
document.addEventListener('DOMContentLoaded', initLogin);

/* ---------- 홈 섹션(모바일 첫 화면) 미니 위젯 렌더링 ---------- */
function renderHomeTab(){
  if(typeof appData==='undefined' || !appData || !myName) return;

  const voteCard = document.getElementById('homeVoteCard');
  if(voteCard){
    const thisWeekKey = getWeekStart(todayStr());
    // 이번 주 확정 경기일이 모두 지났으면(주 1회 경기라 의미가 없어지므로) 다음 주 투표 기준으로 넘깁니다.
    let weekKey = thisWeekKey;
    const thisInfo = getWeekInfo(thisWeekKey);
    const isNextWeek = !!(thisInfo.confirmedDates.length && [...thisInfo.confirmedDates].sort().pop() < todayStr());
    if(isNextWeek){ const nb = parseYMD(thisWeekKey); nb.setDate(nb.getDate()+7); weekKey = fmtDate(nb); }
    const info = isNextWeek ? getWeekInfo(weekKey) : thisInfo;
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
    // 투표율: 그 주에 날짜를 하나라도 고르거나 "불참"을 선언한 사람 / 승인된 선수(관리자·부상 기간 제외)
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
          <b>${isNextWeek?'다음':'이번'} 주 참석 투표</b>
        </div>
        <div class="hv-rate"><div class="hv-rate-top"><small>투표율</small><b>${ratePct}%</b></div><div class="hv-progress"><div class="hv-progress-bar" style="width:${ratePct}%;"></div></div><div class="hv-people">${votedCount} / ${eligible.length}명</div></div>
      </div>
      <button class="home-goto-btn" id="homeGotoCalBtn"><span class="gt-chk"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.500 4.500 4.500L19 7.500"/></svg></span>지금 참석 투표하기<span class="gt-arrow">›</span></button>
    `;
    const gotoBtn = document.getElementById('homeGotoCalBtn');
    if(gotoBtn && isCurrentlyInjured(myName)){
      const end = (appData.members[myName]||{}).injuryEnd || '';
      gotoBtn.disabled = true; gotoBtn.classList.add('is-injured');
      gotoBtn.innerHTML = '🤕 부상 중 · ' + escapeHtml(end ? fmtKDate(end) : '') + ' 복귀 예정';
    }
    if(gotoBtn && !gotoBtn.disabled) gotoBtn.addEventListener('click', ()=>{
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
/* 홈 '알림 설정' 타일: 알림 허용 + 푸시 구독 등록 */
const NOTIFY_OFF_KEY = 'gsg-notify-off';
const BELL_ON_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
const BELL_OFF_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13.7 21a2 2 0 0 1-3.4 0"/><path d="M18.6 14.6C18 13 18 10 18 8a6 6 0 0 0-9.9-4.6"/><path d="M6 8c0 7-3 9-3 9h13"/><path d="M2 2l20 20"/></svg>';
/* 알림 상태: 기기 알림 허용 + 앱에서 끄지 않음 */
function notifyIsOn(){
  try{ return typeof Notification!=='undefined' && Notification.permission==='granted' && localStorage.getItem(NOTIFY_OFF_KEY)!=='1'; }catch(e){ return false; }
}
function updateNotifyTile(){
  const on = notifyIsOn();
  const b=document.getElementById('homeNotifyBtn'), lb=document.getElementById('homeNotifyLb');
  if(b && lb){
    b.classList.toggle('notify-on', on);
    b.classList.toggle('notify-off', !on);
    lb.textContent = on ? '알림 켜짐' : '알림 꺼짐';
    const ic = b.querySelector('svg'); if(ic){ const t=document.createElement('div'); t.innerHTML = on ? BELL_ON_SVG : BELL_OFF_SVG; const n=t.firstChild; n.setAttribute('width','30'); n.setAttribute('height','30'); ic.replaceWith(n); }
  }
  const bs = document.getElementById('moreBellSub'); if(bs) bs.textContent = (on ? '켜짐' : '꺼짐') + ' · 눌러서 ' + (on ? '끄기' : '켜기');
}
async function disablePushSubscription(){
  try{
    if(!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if(sub){
      try{ if(supabaseClient) await supabaseClient.rpc('unregister_push', { p_endpoint: sub.endpoint }); }catch(e){ console.error(e); }
      try{ await sub.unsubscribe(); }catch(e){}
    }
    pushEnsuredFor = null;
  }catch(e){ console.error('push unsubscribe', e); }
}
/* 홈 '알림' 타일 / 더보기 '알림 설정': 눌러서 켜기 ↔ 끄기 */
async function enableAppNotifications(){
  if(typeof Notification==='undefined'){
    const ua=navigator.userAgent||'';
    if(/iPhone|iPad|iPod/i.test(ua) && !isStandaloneApp()){
      toast('아이폰은 홈 화면에 추가한 앱에서만 알림을 켤 수 있습니다.');
      showInstallGuide();
    } else toast('이 기기·브라우저에서는 알림을 지원하지 않습니다.');
    return;
  }
  if(Notification.permission==='denied'){
    alert('알림이 차단되어 있습니다.\n\n[아이폰] 설정 → 알림 → 공생관 → 알림 허용\n[안드로이드] 앱 길게 누르기 → 앱 정보 → 알림 허용\n\n허용한 뒤 앱을 다시 열어 주세요.');
    updateNotifyTile();
    return;
  }
  if(notifyIsOn()){            // 켜져 있음 → 끄기
    try{ localStorage.setItem(NOTIFY_OFF_KEY,'1'); }catch(e){}
    updateNotifyTile(); updateBellState();
    await disablePushSubscription();
    toast('알림을 껐습니다. 경기·투표 알림이 오지 않습니다.');
    return;
  }
  let perm = Notification.permission;   // 꺼져 있음 → 켜기
  if(perm==='default'){
    try{ perm = await Notification.requestPermission(); }catch(e){ console.error(e); }
  }
  if(perm==='granted'){
    try{ localStorage.removeItem(NOTIFY_OFF_KEY); }catch(e){}
    updateNotifyTile(); updateBellState();
    await ensurePushSubscription();
    toast('알림을 켰습니다. 경기 알림·투표 알림을 받을 수 있어요.');
  } else if(perm==='denied'){
    toast('알림이 차단되었습니다. 기기 설정에서 허용해 주세요.');
  }
  updateNotifyTile(); updateBellState();
  if(typeof updateNotifyBanner==='function') updateNotifyBanner();
}
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) try{ updateNotifyTile(); }catch(e){} });
window.addEventListener('focus', ()=>{ try{ updateNotifyTile(); }catch(e){} });
function updateBellState(){
  const b = document.getElementById('bellBtn');
  if(!b) return;
  b.classList.toggle('on', notifyIsOn());
  try{ updateNotifyTile(); }catch(e){}
  try{ updateBellBirthday(); }catch(e){}
}
function updateUserMenuLabel(){
  const b = document.getElementById('userMenuBtn');
  if(b && myName) b.textContent = myName.charAt(0);
}
(function initHomeHeaderControls(){
  const bell = document.getElementById('bellBtn');
  if(bell) bell.addEventListener('click', openBdaySheet);
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
      } else if(go==='notify'){
        enableAppNotifications();
      } else if(go==='install'){
        installToHomeScreen();
      } else {
        setActiveMobileSection(go);
      }
    });
  });
})();

/* ---------- 홈 화면 추가 (PWA 설치) ---------- */
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredInstallPrompt = e; });
window.addEventListener('appinstalled', ()=>{ deferredInstallPrompt = null; try{ toast('홈 화면에 추가되었습니다.'); }catch(_){} });
function isStandaloneApp(){
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}
/* ---------- 홈 화면 추가 튜토리얼 (첫 로그인 1회 + 더보기 > 홈화면 매뉴얼) ---------- */
const INSTALL_TUT_KEY = 'gsw_install_tut_seen';
function getInstallEnv(){
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints>1);
  const android = /Android/i.test(ua);
  const kakao = /KAKAOTALK/i.test(ua);
  const inApp = kakao || /NAVER\(inapp|NAVER|Line\/|FBAN|FBAV|Instagram|DaumApps/i.test(ua);
  const iosOtherBrowser = ios && /CriOS|FxiOS|EdgiOS|NAVER|DaumApps/i.test(ua);
  return { ua, ios, android, kakao, inApp, iosOtherBrowser, mobile: ios||android };
}
function openInExternalBrowser(env){
  const url = location.href.split('#')[0];
  if(env.kakao){ location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url); return; }
  if(env.android){
    const u = new URL(url);
    location.href = 'intent://' + u.host + u.pathname + u.search + '#Intent;scheme=https;package=com.android.chrome;end';
    return;
  }
  try{ navigator.clipboard.writeText(url); toast('주소를 복사했어요. 사파리에 붙여넣어 열어주세요.'); }catch(_){ toast('우측 하단 메뉴에서 Safari로 열기를 눌러주세요.'); }
}
function buildInstallSlides(env, forced){
  const ball = '<div class="it-icon">⚽</div>';
  const S = [];
  if(env.inApp){
    S.push({ warn:true, tag:'필수', title:`지금은 <em>${env.kakao?'카카오톡':'앱'} 안</em>이라<br>홈 화면에 추가할 수 없어요`,
      big: env.ios ? '사파리(Safari)로<br>다시 열어야 해요' : '크롬 등 기본 브라우저로<br>다시 열어야 해요',
      desc:'아래 버튼을 누르면 자동으로 이동해요', vis:'', btn: env.ios?'🧭 사파리로 열기':'🌐 브라우저로 열기', act:'external', sub:'버튼이 안 되면? 수동으로 열기' });
    S.push({ warn:true, tag:'방법', title:`오른쪽 아래 <em>⋯</em> →<br><em>'${env.ios?'Safari로 열기':'다른 브라우저로 열기'}'</em>`,
      desc:'카카오톡 화면 하단의 ⋯ 또는 공유 버튼', vis:'<div class="it-kb"><div class="it-kh"><span>공생관 FS</span><span>✕</span></div><div class="it-kc">(앱 화면)</div><div class="it-kf"><span>‹</span><span>›</span><b>⋯</b></div></div>', btn:'확인했어요', act:'close' });
    return S;
  }
  if(env.ios || (!env.android)){
    if(env.iosOtherBrowser){
      S.push({ warn:true, tag:'먼저 확인', title:'<em>사파리</em>로<br>열어주세요', desc:'아이폰은 사파리에서만 홈 화면에 추가할 수 있어요', vis:'<div class="it-big">주소를 복사해 사파리에 붙여넣거나<br>메뉴에서 "Safari로 열기"를 눌러주세요</div>', btn:'알겠어요', act:'close' });
    }
    S.push({ tag:'사파리에서 시작', title:'홈 화면에 추가하면<br><em>앱처럼</em> 쓸 수 있어요', desc:'주소창 없이 전체 화면으로 열리고<br>경기 알림도 받을 수 있어요', vis:ball, btn:'시작하기 (30초)', act:'next' });
    S.push({ tag:'STEP 1', title:'사파리 하단의<br><em>공유 버튼</em>을 누르세요', desc:'화면 아래 가운데 □↑ 모양입니다', vis:'<div class="it-safari"><div class="it-bar">🔒 주소창</div><div class="it-tb"><span></span><span></span><b>↑</b><span></span><span></span></div></div>', btn:'다음', act:'next' });
    S.push({ tag:'STEP 2~3', title:"'홈 화면에 추가' →<br><em>오른쪽 위 '추가'</em>", desc:'이후 홈 화면의 ⚽ 아이콘으로 접속하세요', vis:'<div class="it-menu"><div>북마크 추가 <span>☆</span></div><div class="hi">홈 화면에 추가 <span>＋</span></div><div>페이지 내 찾기 <span>🔍</span></div></div>', btn:'확인했어요', act:'close' });
    return S;
  }
  /* 안드로이드(크롬) */
  S.push({ tag:'시작', title:'버튼 한 번으로<br><em>바로 설치</em>돼요', desc:'설치하면 홈 화면에 아이콘이 생기고<br>앱처럼 열려요', vis:ball,
    btn: deferredInstallPrompt ? '지금 설치하기' : '설치 방법 보기', act:'install', sub:'다음에 할게요' });
  return S;
}
function openInstallTutorial(forced){
  const env = getInstallEnv();
  const old = document.getElementById('installTut'); if(old) old.remove();
  const slides = buildInstallSlides(env, forced);
  let i = 0;
  const el = document.createElement('div');
  el.id = 'installTut'; el.className = 'install-tut';
  const close = ()=>{ try{ localStorage.setItem(INSTALL_TUT_KEY,'1'); }catch(_){} el.remove(); };
  const render = ()=>{
    const s = slides[i];
    el.innerHTML = `<div class="it-ph${s.warn?' warn':''}" role="dialog" aria-label="홈 화면 추가 안내">
      <div class="it-top"><span>${slides.length>1?`${i+1} / ${slides.length}`:''}</span><button type="button" class="it-skip">${forced?'닫기':'건너뛰기'}</button></div>
      <div class="it-body"><span class="it-step">${s.tag||''}</span><h2>${s.title}</h2>
        ${s.big?`<div class="it-bigtxt">${s.big}</div>`:''}
        <div class="it-d">${s.desc||''}</div><div class="it-vis">${s.vis||''}</div></div>
      ${slides.length>1?`<div class="it-dots">${slides.map((_,k)=>`<i class="${k===i?'on':''}"></i>`).join('')}</div>`:''}
      <button type="button" class="it-btn${s.warn?' y':''}">${s.btn}</button>
      ${s.sub?`<button type="button" class="it-btn g">${s.sub}</button>`:''}</div>`;
    el.querySelector('.it-skip').onclick = close;
    el.querySelector('.it-btn:not(.g)').onclick = async ()=>{
      if(s.act==='next'){ i++; render(); }
      else if(s.act==='external'){ openInExternalBrowser(env); }
      else if(s.act==='install'){
        if(deferredInstallPrompt){ const dp=deferredInstallPrompt; deferredInstallPrompt=null; close(); try{ dp.prompt(); await dp.userChoice; }catch(e){ console.error(e); } }
        else { slides[0] = { tag:'방법', title:'크롬 메뉴 <em>⋮</em> →<br><em>\'홈 화면에 추가\'</em>', desc:'오른쪽 위 ⋮ 를 누른 뒤 "홈 화면에 추가" 또는 "앱 설치"를 선택하고 "설치"를 누르세요', vis:'', btn:'확인했어요', act:'close' }; render(); }
      } else close();
    };
    const g = el.querySelector('.it-btn.g');
    if(g) g.onclick = ()=>{ if(s.act==='external' && slides[1]){ i=1; render(); } else close(); };
  };
  document.body.appendChild(el);
  render();
}
function showInstallGuide(){ openInstallTutorial(true); }
function maybeShowInstallTutorial(){
  try{
    if(isStandaloneApp()) return;
    const env = getInstallEnv();
    if(!env.mobile) return;
    if(localStorage.getItem(INSTALL_TUT_KEY)) return;
    const lo = document.getElementById('loginOverlay');
    if(lo && !lo.classList.contains('hidden')) return;
    openInstallTutorial(false);
  }catch(e){ console.error(e); }
}
(function(){
  const orig = initAppUI;
  initAppUI = async function(){ const r = await orig.apply(this, arguments); setTimeout(maybeShowInstallTutorial, 900); return r; };
})();
async function installToHomeScreen(){
  if(isStandaloneApp()){ toast('이미 홈 화면에서 실행 중입니다.'); return; }
  if(deferredInstallPrompt){
    const dp = deferredInstallPrompt; deferredInstallPrompt = null;
    try{ dp.prompt(); await dp.userChoice; }catch(e){ console.error(e); showInstallGuide(); }
    return;
  }
  showInstallGuide();
}


/* ---------- 생일 (종 아이콘) ---------- */
let bdayTab = 0; // 0=이번 달, 1=다음 달
function bellNotifyAction(){
  if(typeof Notification==='undefined'){ toast('이 기기에서는 알림을 지원하지 않습니다.'); return; }
  if(Notification.permission==='granted'){ toast('알림이 켜져 있습니다. 경기 확정·투표 마감 소식을 알려드려요.'); }
  else if(Notification.permission==='denied'){ toast('알림이 차단되어 있습니다. 브라우저(앱) 설정에서 허용해 주세요.'); }
  else {
    const en = document.getElementById('notifyEnableBtn');
    if(en) en.click();
    setTimeout(updateBellState, 1500);
    setTimeout(updateBellState, 5000);
  }
}
/* birth는 YYMMDD 6자리. monthOffset 0=이번 달, 1=다음 달 */
function getBirthdayList(monthOffset){
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth()+monthOffset, 1);
  const mon = target.getMonth()+1;
  const out = [];
  Object.keys((appData && appData.members) || {}).forEach(n=>{
    const m = appData.members[n];
    if(!m || !m.approved || n===ADMIN_NAME) return;
    const b = String(m.birth||'');
    if(!/^\d{6}$/.test(b)) return;
    const mm = +b.slice(2,4), dd = +b.slice(4,6);
    if(mm!==mon || dd<1 || dd>31) return;
    out.push({ name:n, month:mm, day:dd });
  });
  out.sort((a,b)=>a.day-b.day || a.name.localeCompare(b.name,'ko'));
  return { month: mon, list: out };
}
function updateBellBirthday(){
  const el = document.getElementById('bellBday');
  if(!el) return;
  const has = getBirthdayList(0).list.length > 0;
  el.hidden = !has;
  const bell = document.getElementById('bellBtn');
  if(bell) bell.setAttribute('aria-label', has ? '알림 · 이번 달 생일이 있어요' : '알림');
}
function renderBdaySheet(){
  const cur = getBirthdayList(0), nxt = getBirthdayList(1);
  const d = bdayTab===0 ? cur : nxt;
  document.getElementById('bdayTitle').innerHTML = `🎂 ${d.month}월 생일`;
  document.getElementById('bdaySeg').innerHTML =
    `<button type="button" data-t="0" class="${bdayTab===0?'on':''}">이번 달 ${cur.month}월 · ${cur.list.length}명</button>`+
    `<button type="button" data-t="1" class="${bdayTab===1?'on':''}">다음 달 ${nxt.month}월 · ${nxt.list.length}명</button>`;
  const today = new Date(); const tm = today.getMonth()+1, td = today.getDate();
  const box = document.getElementById('bdayList');
  if(!d.list.length){ box.innerHTML = `<div class="mem-empty">${d.month}월에 생일인 팀원이 없어요</div>`; }
  else box.innerHTML = d.list.map(x=>{
    let tag = '', cls = 'tb';
    if(bdayTab===0){
      if(x.day===td && x.month===tm){ tag='🎉 오늘!'; cls='tg'; }
      else if(x.day>td){ tag=`D-${x.day-td}`; cls='tw'; }
      else { tag='지남'; cls='tr'; }
    }
    return `<div class="mem-li"><span class="mem-av" style="background:${memAvatarColor(x.name)}">${escapeHtml(x.name.charAt(0))}</span><div><b>${escapeHtml(x.name)}</b><small>${x.month}월 ${x.day}일</small></div>${tag?`<span class="mem-tag ${cls}">${tag}</span>`:''}</div>`;
  }).join('');
  const nb = document.getElementById('bdayNotifyBtn');
  nb.hidden = notifyIsOn();
}
function openBdaySheet(){
  bdayTab = 0; renderBdaySheet();
  document.getElementById('bdaySheetDim').hidden = false; document.getElementById('bdaySheet').hidden = false;
  document.getElementById('bdayList').scrollTop = 0;
}
function closeBdaySheet(){ document.getElementById('bdaySheetDim').hidden = true; document.getElementById('bdaySheet').hidden = true; }
(function initBdaySheet(){
  const dim = document.getElementById('bdaySheetDim'); if(!dim) return;
  dim.addEventListener('click', closeBdaySheet);
  document.getElementById('bdayCloseBtn').addEventListener('click', closeBdaySheet);
  document.getElementById('bdaySeg').addEventListener('click', e=>{ const b=e.target.closest('button[data-t]'); if(!b) return; bdayTab=+b.dataset.t; renderBdaySheet(); });
  document.getElementById('bdayNotifyBtn').addEventListener('click', ()=>{ bellNotifyAction(); });
})();

/* ---------- 앱 업데이트 (캐시 비우고 최신 파일로 다시 시작) ---------- */
async function refreshApp(){
  toast('최신 버전으로 업데이트 중입니다…', 4000);
  try{
    if('serviceWorker' in navigator){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.update().catch(()=>{})));
    }
    if(window.caches){
      const keys = await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
    await Promise.all(['./index.html','./manifest.json','./sw.js'].map(u=>fetch(u,{cache:'reload'}).catch(()=>{})));
  }catch(e){ console.error('앱 업데이트 오류', e); }
  try{ sessionStorage.removeItem('gsgSplashSeen'); }catch(e){}
  location.replace(location.pathname + '?u=' + Date.now());
}
