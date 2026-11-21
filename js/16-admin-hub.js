/* ================= 관리자 허브 (A-2안) =================
   맨 위 "지금 처리할 일" + 6개 메뉴. 메뉴를 누르면 해당 분류의 카드만 보입니다. (기존 카드/기능은 그대로 재사용) */
const ADMIN_CATS = [
  { id:'members', ic:'👥', name:'회원',     titles:['가입 승인 대기','멤버 등급 설정','회원 관리'] },
  { id:'match',   ic:'🏟️', name:'경기',     titles:['경기장·시간·링크·용병 등록','날씨 확인 시간 설정'] },
  { id:'notice',  ic:'📣', name:'공지·알림', titles:['공지사항 관리'] },
  { id:'stats',   ic:'📊', name:'통계',     titles:['미투표 통계 제외 주간','순위 횟수 수동 조정'] },
  { id:'system',  ic:'⚙️', name:'시스템',   titles:['시스템'] },
  { id:'danger',  ic:'⚠️', name:'초기화',   titles:['투표 초기화'], danger:true }
];
let adminHubCat = null;

function adminBlockTitle(b){ const h = b.querySelector('h4'); return h ? h.textContent.replace(/\s+/g,' ').trim() : ''; }
function tagAdminBlocks(){
  document.querySelectorAll('#adminPanel .admin-block').forEach(b=>{
    if(b.dataset.cat) return;
    const t = adminBlockTitle(b);
    const c = ADMIN_CATS.find(c=>c.titles.some(x=>t.startsWith(x)));
    b.dataset.cat = c ? c.id : 'system';
  });
}
function adminTodoItems(){
  const items = [];
  try{
    const pending = Object.keys(appData.members||{}).filter(n=>appData.members[n] && !appData.members[n].approved).length;
    if(pending) items.push({ ic:'👥', text:'가입 승인 대기', right:`${pending}명 ›`, go:()=>openAdminCat('members') });
    const today = todayStr();
    const nd = Object.keys(appData.votes||{}).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=today && (appData.votes[d]||[]).length>0).sort()[0];
    if(nd && !getVenueInfo(nd)){ const o = parseYMD(nd); items.push({ ic:'⚽', text:`${o.getMonth()+1}/${o.getDate()} 경기장 미등록`, right:'등록 ›', go:()=>openAdminCat('match') }); }
    if(typeof getNudgeTargets==='function'){ const n = getNudgeTargets().length; if(n) items.push({ ic:'📣', text:'연속 불참 독려 대상', right:`${n}명 ›`, go:()=>{ if(typeof openNudgeSheet==='function') openNudgeSheet(); } }); }
  }catch(e){ console.warn('[관리자 처리할 일]', e); }
  return items;
}
function renderAdminHub(){
  const sec = document.getElementById('sectionAdmin'); if(!sec) return;
  let hub = document.getElementById('adminHub');
  if(!hub){
    hub = document.createElement('div'); hub.id = 'adminHub'; hub.className = 'ah-hub';
    const panel = document.getElementById('adminPanel'); panel.parentNode.insertBefore(hub, document.getElementById('adminSectionEyebrow') || panel);
    hub.addEventListener('click', (e)=>{
      if(e.target.closest('#ahRfBtn')){ if(typeof sysRefreshNow==='function') sysRefreshNow(); return; }
      const it = e.target.closest('.ah-it'); if(it){ const f = hub.__todo && hub.__todo[Number(it.dataset.i)]; if(f) f.go(); return; }
      const t = e.target.closest('.ah-tile'); if(t) openAdminCat(t.dataset.cat);
    });
  }
  const todo = adminTodoItems(); hub.__todo = todo;
  hub.innerHTML = `<div class="ah-rf"><span class="ah-rfi">🔄</span><span class="ah-rft">마지막 갱신 <b id="ahRfTime">${typeof sysLastRefreshText==='function'?sysLastRefreshText():'-'}</b></span><button type="button" class="ah-rfb" id="ahRfBtn">새로고침</button></div><div class="ah-todo ${todo.length?'':'ok'}"><h5>${todo.length?'🔔 지금 처리할 일':'✅ 지금 처리할 일이 없어요'}</h5>${todo.map((x,i)=>`<button type="button" class="ah-it" data-i="${i}"><span>${x.ic} ${escapeHtml(x.text)}</span><b>${escapeHtml(x.right)}</b></button>`).join('')}</div>
    <div class="ah-sec">관리 메뉴</div>
    <div class="ah-grid">${ADMIN_CATS.map(c=>`<button type="button" class="ah-tile${c.danger?' dg':''}" data-cat="${c.id}"><i>${c.ic}</i><b>${c.name}</b></button>`).join('')}</div>`;
}
function showAdminHub(){
  adminHubCat = null;
  const sec = document.getElementById('sectionAdmin'); if(!sec) return;
  sec.classList.remove('ah-cat'); sec.classList.add('ah-home');
  const bar = document.getElementById('adminCatBar'); if(bar) bar.hidden = true;
  renderAdminHub();
}
function openAdminCat(id){
  tagAdminBlocks();
  adminHubCat = id;
  const sec = document.getElementById('sectionAdmin'); if(!sec) return;
  sec.classList.remove('ah-home'); sec.classList.add('ah-cat');
  const c = ADMIN_CATS.find(x=>x.id===id);
  let bar = document.getElementById('adminCatBar');
  if(!bar){
    bar = document.createElement('div'); bar.id = 'adminCatBar'; bar.className = 'ah-bar';
    const panel = document.getElementById('adminPanel'); panel.parentNode.insertBefore(bar, panel);
    bar.addEventListener('click', (e)=>{ if(e.target.closest('.ah-back')) showAdminHub(); });
  }
  bar.hidden = false;
  bar.innerHTML = `<button type="button" class="ah-back">‹ 관리 메뉴</button><b>${c.ic} ${c.name}</b>`;
  document.querySelectorAll('#adminPanel .admin-block').forEach(b=>{ b.style.display = (b.dataset.cat===id) ? '' : 'none'; });
  // 공지·알림 분류: 참여 독려 알림 바로가기
  const panel = document.getElementById('adminPanel');
  let nb = document.getElementById('adminNudgeBlock');
  if(nb) nb.remove();
  if(id==='notice'){
    nb = document.createElement('div'); nb.id = 'adminNudgeBlock'; nb.className = 'admin-block'; nb.dataset.cat = 'notice';
    nb.innerHTML = `<h4>참여 독려 알림</h4><div class="admin-feed-status">연속 5경기 이상 불참한 회원에게 알림을 보냅니다. (자동 알림과 별개)</div><div class="admin-row"><button type="button" id="adminNudgeOpen">대상 확인 · 보내기</button></div>`;
    panel.appendChild(nb);
    nb.querySelector('#adminNudgeOpen').addEventListener('click', ()=>{ if(typeof openNudgeSheet==='function') openNudgeSheet(); });
  }
  const vis = [...document.querySelectorAll('#adminPanel .admin-block')].filter(b=>b.style.display!=='none');
  document.querySelectorAll('#adminPanel .admin-block').forEach(b=>b.classList.remove('ah-first'));
  if(vis[0]) vis[0].classList.add('ah-first');
  window.scrollTo({ top:0 });
}
(function(){
  const orig = window.setActiveMobileSection;
  if(typeof orig === 'function'){
    window.setActiveMobileSection = function(id){
      const r = orig.apply(this, arguments);
      if(id==='admin'){ try{ tagAdminBlocks(); showAdminHub(); }catch(e){ console.warn(e); } }
      return r;
    };
  }
})();
