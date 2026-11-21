/* ================= 관리자 > 회원 화면 (M-1 + 상단 숫자 필터) =================
   기존 승인·거절·등급·부상·삭제 함수(adminApproveMember 등)를 그대로 재사용하고, 화면만 새로 구성했습니다. */
const MH = { filter:'all', q:'', sel:null, birth:false, injMode:null };

function mhNames(){ return Object.keys((appData&&appData.members)||{}); }
function mhApproved(){ return mhNames().filter(n=>appData.members[n].approved).sort((a,b)=>a.localeCompare(b,'ko')); }
function mhPending(){ return mhNames().filter(n=>!appData.members[n].approved).sort((a,b)=>a.localeCompare(b,'ko')); }
function mhIsAdmin(n){ const r = memberRole(n); return r==='owner' || r==='admin'; }
function mhRoleLabel(n){ const r = memberRole(n); return r==='owner' ? '최고 관리자' : r==='admin' ? '관리자' : '일반 회원'; }
function mhInjuryTag(n){ const m = appData.members[n]||{}; return isCurrentlyInjured(n) ? `<span class="mh-tg in">🤕 부상 ~${escapeHtml(String(m.injuryEnd||'').slice(5).replace('-','/'))}</span>` : ''; }
function mhDaysLeft(end){ try{ return Math.ceil((parseYMD(end) - parseYMD(todayStr()))/86400000); }catch(e){ return null; } }

function renderMembersHub(){
  const host = document.getElementById('adminMembersHub'); if(!host || !appData) return;
  const approved = mhApproved(), pending = mhPending();
  const admins = approved.filter(mhIsAdmin), injured = approved.filter(isCurrentlyInjured);
  const q = MH.q.trim();
  const match = n=> !q || n.includes(q);
  let list = approved;
  if(MH.filter==='admin') list = admins; else if(MH.filter==='injured') list = injured; else if(MH.filter==='pending') list = [];
  list = list.filter(match);
  const showPending = (MH.filter==='all' || MH.filter==='pending') && pending.filter(match).length;
  const stat = (k, n, label, cls)=>`<button type="button" class="mh-st ${cls||''} ${MH.filter===k?'on':''}" data-f="${k}"><b>${n}</b><small>${label}</small></button>`;
  host.innerHTML = `
    <div class="mh-stats">${stat('all',approved.length,'전체')}${stat('pending',pending.length,'승인 대기', pending.length?'hot':'')}${stat('admin',admins.length,'관리자')}${stat('injured',injured.length,'부상')}</div>
    <input class="mh-search" type="search" placeholder="🔍 이름 검색" value="${escapeHtml(MH.q)}" autocomplete="off">
    ${showPending ? `<div class="mh-pend"><h5>⏳ 승인 대기 ${pending.length}명</h5>${pending.filter(match).map(n=>`<div class="mh-pr"><span class="mh-av">${escapeHtml(n.charAt(0))}</span><span class="mh-pn">${escapeHtml(n)}</span><span class="mh-pa"><button type="button" class="mh-ok" data-ap="${escapeHtml(n)}">승인</button><button type="button" class="mh-no" data-rj="${escapeHtml(n)}">거절</button></span></div>`).join('')}</div>` : ''}
    <div class="mh-list">${list.map(n=>{
      const m = appData.members[n]||{}; const inj = isCurrentlyInjured(n);
      const sub = (MH.filter==='injured' && inj) ? `<small>${escapeHtml(m.injuryStart||'')} ~ ${escapeHtml(m.injuryEnd||'')}${mhDaysLeft(m.injuryEnd)!=null?' · D-'+Math.max(0,mhDaysLeft(m.injuryEnd)):''}</small>` : '';
      return `<button type="button" class="mh-li" data-n="${escapeHtml(n)}"><span class="mh-av">${escapeHtml(n.charAt(0))}</span><span class="mh-nm">${escapeHtml(n)}${mhIsAdmin(n)?'<span class="mh-tg ad">관리자</span>':''}${mhInjuryTag(n)}${sub}</span><span class="mh-ch">›</span></button>`;
    }).join('') || `<div class="rank-empty">${MH.filter==='pending'&&!pending.length?'승인 대기 중인 가입 신청이 없습니다.':'해당하는 회원이 없습니다.'}</div>`}</div>`;
}
function openMemberSheet(name){
  MH.sel = name; MH.birth = false;
  const m = appData.members[name]||{}; MH.injMode = isCurrentlyInjured(name) ? 'injured' : 'normal';
  closeMemberSheet(true);
  const el = document.createElement('div'); el.id = 'mhSheet'; el.className = 'mh-dim';
  el.innerHTML = `<div class="mh-sheet" role="dialog" aria-label="${escapeHtml(name)} 회원 정보"></div>`;
  el.addEventListener('click', onMemberSheetClick);
  document.body.appendChild(el);
  renderMemberSheet();
}
function closeMemberSheet(silent){ const o = document.getElementById('mhSheet'); if(o) o.remove(); if(!silent) MH.sel = null; }
function renderMemberSheet(){
  const el = document.querySelector('#mhSheet .mh-sheet'); const n = MH.sel; if(!el || !n || !appData.members[n]){ closeMemberSheet(); return; }
  const m = appData.members[n]; const role = memberRole(n); const owner = role==='owner', self = n===myName;
  const inj = isCurrentlyInjured(n); const left = inj ? mhDaysLeft(m.injuryEnd) : null;
  const injMode = MH.injMode;
  el.innerHTML = `<div class="mh-grip"></div>
    <div class="mh-hd"><span class="mh-av big">${escapeHtml(n.charAt(0))}</span><div><b>${escapeHtml(n)}</b><small>${mhRoleLabel(n)}${m.joinedAt?' · 가입 '+escapeHtml(m.joinedAt):''}</small></div><button type="button" class="mh-eye" data-act="birth">${MH.birth ? escapeHtml(m.birth||'-') : '생일 보기 👁'}</button></div>
    ${inj ? `<div class="mh-inj">🤕 현재 부상 중 · ${escapeHtml(m.injuryEnd)}까지${left!=null?` (${Math.max(0,left)}일 남음)`:''}</div>` : ''}
    <div class="mh-lab">부상 설정</div>
    <div class="mh-chips"><button type="button" data-inj="normal" class="${injMode==='normal'?'on':''}">정상</button><button type="button" data-inj="injured" class="${injMode==='injured'?'on red':''}">🤕 부상 중</button></div>
    ${injMode==='injured' ? `<div class="mh-dr"><input type="date" id="mhInjStart" value="${escapeHtml(m.injuryStart||'')}"><span>~</span><input type="date" id="mhInjEnd" value="${escapeHtml(m.injuryEnd||'')}"></div><div class="mh-hint">부상 기간의 경기는 연속 불참·출석 통계에서 제외됩니다.</div>` : ''}
    <div class="mh-btns"><button type="button" class="mh-save" data-act="inj-save">저장</button>${inj?'<button type="button" class="mh-ghost" data-act="inj-clear">부상 해제</button>':''}</div>
    <div class="mh-lab">등급</div>
    ${owner ? '<div class="mh-hint">최고 관리자의 등급은 변경할 수 없습니다.</div>' : `<div class="mh-chips"><button type="button" data-role="member" class="${role==='member'?'on':''}" ${self?'disabled':''}>일반</button><button type="button" data-role="admin" class="${role==='admin'?'on':''}" ${self?'disabled':''}>관리자</button></div>${self?'<div class="mh-hint">본인 등급은 변경할 수 없습니다.</div>':''}`}
    <button type="button" class="mh-del" data-act="del" ${self||owner?'disabled':''}>회원 삭제</button>`;
}
async function onMemberSheetClick(e){
  const el = document.getElementById('mhSheet'); if(!el) return;
  if(e.target===el){ closeMemberSheet(); return; }
  const n = MH.sel; if(!n) return;
  const inj = e.target.closest('[data-inj]');
  if(inj){ MH.injMode = inj.dataset.inj; renderMemberSheet(); return; }
  const rb = e.target.closest('[data-role]');
  if(rb && !rb.disabled){ await adminSetMemberRole(n, rb.dataset.role); renderMemberSheet(); renderMembersHub(); return; }
  const a = e.target.closest('[data-act]'); if(!a) return;
  const act = a.dataset.act;
  if(act==='birth'){ MH.birth = !MH.birth; renderMemberSheet(); return; }
  if(act==='inj-save'){
    if(MH.injMode==='normal'){ await setInjuryPeriod(n, '', ''); toast(`'${n}' 님을 정상으로 설정했습니다.`); }
    else{
      const s = document.getElementById('mhInjStart').value, en = document.getElementById('mhInjEnd').value;
      if(!s || !en){ toast('시작일과 종료일을 모두 선택해 주시기 바랍니다.'); return; }
      if(en < s){ toast('종료일이 시작일보다 빠를 수 없습니다.'); return; }
      await setInjuryPeriod(n, s, en); toast(`'${n}' 님의 부상 기간을 설정했습니다.`);
    }
    MH.injMode = isCurrentlyInjured(n) ? 'injured' : 'normal'; renderMemberSheet(); renderMembersHub(); return;
  }
  if(act==='inj-clear'){ await setInjuryPeriod(n, '', ''); toast(`'${n}' 님의 부상 상태를 해제했습니다.`); MH.injMode = 'normal'; renderMemberSheet(); renderMembersHub(); return; }
  if(act==='del'){ if(a.disabled) return; await adminDeleteMember(n); if(!appData.members[n]){ closeMemberSheet(); } renderMembersHub(); return; }
}
function mountMembersHub(){
  const panel = document.getElementById('adminPanel'); if(!panel) return null;
  let host = document.getElementById('adminMembersHub');
  if(!host){
    host = document.createElement('div'); host.id = 'adminMembersHub'; host.className = 'mh-wrap';
    panel.parentNode.insertBefore(host, panel);
    host.addEventListener('click', async (e)=>{
      const st = e.target.closest('.mh-st'); if(st){ MH.filter = st.dataset.f; renderMembersHub(); return; }
      const ap = e.target.closest('[data-ap]'); if(ap){ await adminApproveMember(ap.dataset.ap); renderMembersHub(); return; }
      const rj = e.target.closest('[data-rj]'); if(rj){ await adminRejectMember(rj.dataset.rj); renderMembersHub(); return; }
      const li = e.target.closest('.mh-li'); if(li){ openMemberSheet(li.dataset.n); }
    });
    host.addEventListener('input', (e)=>{
      if(e.target.classList.contains('mh-search')){ MH.q = e.target.value; const pos = e.target.selectionStart; renderMembersHub(); const i = host.querySelector('.mh-search'); if(i){ i.focus(); try{ i.setSelectionRange(pos,pos); }catch(_){} } }
    });
  }
  return host;
}
/* 분류 화면 연결: '회원' 분류를 열면 이 화면을, 다른 분류에서는 숨깁니다. */
(function(){
  const orig = window.openAdminCat;
  if(typeof orig !== 'function') return;
  window.openAdminCat = function(id){
    const r = orig.apply(this, arguments);
    const host = mountMembersHub();
    if(host){
      if(id==='members'){
        document.querySelectorAll('#adminPanel .admin-block').forEach(b=>{ b.style.display = 'none'; });
        host.style.display = 'block'; document.getElementById('sectionAdmin').classList.add('ah-members'); MH.filter = 'all'; MH.q = ''; renderMembersHub();
      } else { host.style.display = 'none'; document.getElementById('sectionAdmin').classList.remove('ah-members'); }
    }
    return r;
  };
  const origHub = window.showAdminHub;
  if(typeof origHub === 'function') window.showAdminHub = function(){ const h = document.getElementById('adminMembersHub'); if(h) h.style.display = 'none'; document.getElementById('sectionAdmin').classList.remove('ah-members'); closeMemberSheet(); return origHub.apply(this, arguments); };
})();
