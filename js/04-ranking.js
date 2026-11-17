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
function isOwnerUser(){ return myName===ADMIN_NAME && myBirth===ADMIN_BIRTH; }
/* 멤버 등급: 최고 관리자(기존 '관리자' 계정) / 관리자(role==='admin') / 회원 */
function memberRole(name){
  if(name===ADMIN_NAME) return 'owner';
  try{ const m = appData && appData.members && appData.members[name]; return (m && m.role==='admin') ? 'admin' : 'member'; }catch(e){ return 'member'; }
}
function isAdminUser(){
  if(isOwnerUser()) return true;
  try{
    const m = appData && appData.members && appData.members[myName];
    return !!(m && m.approved && m.role==='admin' && String(m.birth||'')===String(myBirth||''));
  }catch(e){ return false; }
}
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
  const fresh = await mutateAppData(data=>{
    if(data.members && data.members[name]){
      data.members[name].injuryStart = startDate || '';
      data.members[name].injuryEnd = endDate || '';
    }
  });
  const ok = (fresh === appData);   // 저장 성공 시에만 appData가 새 데이터로 교체됨
  refreshInjuryViews();
  return ok;
}
/* 부상 설정이 바뀌면 투표·순위·명단 화면을 모두 다시 그립니다. */
function refreshInjuryViews(){
  const run = (fn)=>{ try{ const r = fn(); if(r && r.catch) r.catch(()=>{}); }catch(e){ console.error(e); } };
  run(()=>renderMemberList());
  run(()=>renderAdminMemberTable());
  run(()=>computeAttendanceStats());
  run(()=>renderMatchStats());
  run(()=>renderMembersPage());
  run(()=>renderHomeTab());
  run(()=>renderHeroMatch());
  run(()=>renderWeekStatus());
  run(()=>renderAttendStatus());
  run(()=>renderCalendar());
  run(()=>{ if(selectedDate) return renderMatchPanel(); });
  run(()=>updateInjuryRow());
}
function updateInjuryRow(){
  const sub = document.querySelector('.more-row[data-act="injury"] small');
  if(!sub || !appData || !myName) return;
  const m = (appData.members && appData.members[myName]) || {};
  sub.textContent = isCurrentlyInjured(myName) ? `🤕 부상 중 · ${m.injuryEnd} 복귀 예정` : '부상 기간에는 투표·집계에서 제외';
}

const ROLE_LABEL = { owner:'최고 관리자', admin:'관리자', member:'회원' };
function renderMembersPage(){
  const el = document.getElementById('membersPageList');
  if(!el || !appData) return;
  const names = Object.keys(appData.members||{}).filter(n=>appData.members[n].approved).sort((a,b)=>a.localeCompare(b,'ko'));
  const row = (name)=>{
    const m = appData.members[name] || {};
    const role = memberRole(name);
    const injured = isCurrentlyInjured(name);
    const sub = injured ? `🤕 부상 중 (~${escapeHtml(m.injuryEnd)})` : (m.status==='online' ? '접속 중' : '');
    return `<div class="mp-row"><div class="mp-av">${escapeHtml(name.charAt(0))}</div><div class="mp-n ${name===myName?'me':''}">${escapeHtml(name)}${sub?`<small>${sub}</small>`:''}</div><span class="mp-chip ${role!=='member'?'a':''}">${ROLE_LABEL[role]}</span></div>`;
  };
  const admins = names.filter(n=>memberRole(n)!=='member');
  const members = names.filter(n=>memberRole(n)==='member');
  el.innerHTML = (admins.length?`<div class="mp-lab">관리자 ${admins.length}명</div>${admins.map(row).join('')}`:'')
    + (members.length?`<div class="mp-lab">회원 ${members.length}명</div>${members.map(row).join('')}`:'')
    + (!names.length?'<div class="rank-empty">아직 승인된 멤버가 없습니다.</div>':'');
}
function renderAdminRoleList(){
  const el = document.getElementById('adminRoleList');
  if(!el || !appData) return;
  if(!isAdminUser()){ el.innerHTML=''; return; }
  const names = Object.keys(appData.members||{}).filter(n=>appData.members[n].approved).sort((a,b)=>a.localeCompare(b,'ko'));
  el.innerHTML = names.map(name=>{
    const role = memberRole(name);
    const fixed = role==='owner';
    const self = name===myName;
    const ctl = fixed ? '<span class="mp-chip a">최고 관리자</span>'
      : `<div class="role-seg ${self?'disabled':''}" data-name="${escapeHtml(name)}"><button type="button" data-role="member" class="${role==='member'?'on':''}" ${self?'disabled':''}>회원</button><button type="button" data-role="admin" class="${role==='admin'?'on':''}" ${self?'disabled':''}>관리자</button></div>`;
    return `<div class="mp-row"><div class="mp-av">${escapeHtml(name.charAt(0))}</div><div class="mp-n ${self?'me':''}">${escapeHtml(name)}<small>${fixed?'최고 관리자 · 변경 불가':(self?'내 계정 · 본인 등급은 변경할 수 없습니다':'')}</small></div>${ctl}</div>`;
  }).join('') || '<div class="rank-empty">승인된 회원이 없습니다.</div>';
  el.querySelectorAll('.role-seg button').forEach(b=>b.addEventListener('click', ()=>{
    adminSetMemberRole(b.closest('.role-seg').dataset.name, b.dataset.role);
  }));
}
async function adminSetMemberRole(name, role){
  if(!requireAdmin()) return;
  if(name===ADMIN_NAME){ toast('최고 관리자의 등급은 변경할 수 없습니다.'); return; }
  if(name===myName){ toast('본인 등급은 변경할 수 없습니다.'); return; }
  if(memberRole(name)===role) return;
  const label = role==='admin' ? '관리자' : '회원';
  if(!confirm(`'${name}' 님을 ${label} 등급으로 변경할까요?`)) return;
  await mutateAppData(data=>{
    if(data.members && data.members[name]){
      if(role==='admin') data.members[name].role = 'admin'; else delete data.members[name].role;
    }
  });
  renderMemberList();
  toast(`'${name}' 님을 ${label} 등급으로 변경했습니다.`);
}
const INVITE_MESSAGE = `공생관 FS - 경기운영시스템 초대링크

https://safetybellbeen-eng.github.io/gongsanegwanfssystem/

투표시스템 공지

1. 최초 로그인이 가입
   - 이름 / 생년월일 6자리 / 참석코드 jb0309
2. 투표의 경우, 2-3주차까지 미리 진행 권장.`;
async function shareInviteLink(){
  if(navigator.share){
    try{ await navigator.share({ title:'공생관 FS 초대', text: INVITE_MESSAGE }); }
    catch(err){ if(err && err.name!=='AbortError') toast('공유하지 못했습니다.'); }
    return;
  }
  try{ await navigator.clipboard.writeText(INVITE_MESSAGE); toast('초대 문구를 복사했습니다. 카카오톡에 붙여넣어 보내세요.'); }
  catch(_){ window.prompt('아래 내용을 복사해 카카오톡에 붙여넣어 보내세요.', INVITE_MESSAGE); }
}
let lastAdminState = null;
function renderMemberList(){ try{ updateInjuryRow(); }catch(e){}

  try{ renderMembersPage(); renderAdminRoleList(); }catch(e){ console.error(e); }
  const nowAdmin = isAdminUser();
  if(lastAdminState !== null && lastAdminState !== nowAdmin){ try{ updateAdminVisibility(); tryRenderMoreTab(); }catch(e){ console.error(e); } }
  lastAdminState = nowAdmin;
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

