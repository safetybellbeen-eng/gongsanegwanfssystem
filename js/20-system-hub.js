/* ---------- 관리자 홈: 새로고침 바 / 관리자 > 시스템: 기상청 연동 카드 ---------- */
let sysLastRefreshAt = Date.now();
function sysLastRefreshText(){ const d = new Date(sysLastRefreshAt); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
async function sysRefreshNow(){
  const btn = document.getElementById('ahRfBtn'); if(btn){ btn.disabled = true; btn.textContent = '불러오는 중…'; }
  try{ await refreshAllData(); sysLastRefreshAt = Date.now(); }catch(_){}
  const t = document.getElementById('ahRfTime'); if(t) t.textContent = sysLastRefreshText();
  const b2 = document.getElementById('ahRfBtn'); if(b2){ b2.disabled = false; b2.textContent = '새로고침'; }
  try{ if(typeof renderAdminHub==='function' && document.getElementById('sectionAdmin').classList.contains('ah-home')) renderAdminHub(); }catch(_){}
}
/* 기존 새로고침 카드와 기상청 카드는 숨기고(기능·ID는 유지) 새 화면에서 대신 조작합니다. */
document.querySelectorAll('#adminPanel .admin-block').forEach(b=>{
  if(b.querySelector('#adminRefreshBtn') || b.querySelector('#kmaApiKeyInput')) b.dataset.cat = 'hidden';
});
function sysMask(k){ return '•'.repeat(12) + k.slice(-4); }
function renderSystemHub(){
  const root = document.getElementById('sysHub'); if(!root) return;
  const k = (appData && appData.kmaApiKey) || '';
  root.innerHTML = k
    ? `<div class="sy-card"><div class="sy-t">🌤️ 기상청 날씨 연동 <span class="sy-ok">연결됨</span></div><p>오늘~모레는 기상청 단기예보, 이후 날짜는 Open-Meteo로 보완합니다.</p><div class="sy-key">API 키 · ${escapeHtml(sysMask(k))}</div><div class="sy-row"><button type="button" data-a="edit">키 변경</button><button type="button" class="dn" data-a="del">삭제</button></div></div>`
    : `<div class="sy-card"><div class="sy-t">🌤️ 기상청 날씨 연동 <span class="sy-no">미설정</span></div><p>키가 없으면 Open-Meteo 예보로 표시됩니다.</p><div class="sy-row"><button type="button" class="pr" data-a="edit">키 등록하기</button><button type="button" data-a="help">발급 방법 ›</button></div></div>`;
}
function sysCloseSheet(){ const o = document.getElementById('sysSheet'); if(o) o.remove(); }
function sysOpenSheet(help){
  sysCloseSheet();
  const el = document.createElement('div'); el.id = 'sysSheet'; el.className = 'mh-dim';
  el.innerHTML = `<div class="mh-sheet sh-sheet" role="dialog"><h3>기상청 API 키</h3>
    <div class="sh-sub">${help?'아래 순서로 발급받은 뒤 키를 붙여넣어 주세요.':'발급받은 "일반 인증키(Decoding)"를 붙여넣어 주세요.'}</div>
    ${help?`<div class="sy-help">1. <a href="https://www.data.go.kr/data/15084084/openapi.do" target="_blank" rel="noopener">data.go.kr "기상청_단기예보 조회서비스"</a> 접속<br>2. 무료 활용신청<br>3. "일반 인증키(Decoding)"를 그대로 복사</div>`:''}
    <input type="text" id="sysKeyInput" class="sh-date" placeholder="기상청 API 일반 인증키(Decoding)" autocomplete="off">
    <div class="sh-btns" style="margin-top:12px"><button type="button" class="sh-ghost" data-a="cancel">취소</button><button type="button" class="sh-save" data-a="save">저장</button></div></div>`;
  el.addEventListener('click', async (e)=>{
    if(e.target===el){ sysCloseSheet(); return; }
    const b = e.target.closest('[data-a]'); if(!b) return;
    if(b.dataset.a==='cancel'){ sysCloseSheet(); return; }
    if(b.dataset.a==='save'){
      const v = document.getElementById('sysKeyInput').value.trim();
      if(!v){ toast('키를 입력해 주시기 바랍니다.'); return; }
      document.getElementById('kmaApiKeyInput').value = v; sysCloseSheet();
      document.getElementById('saveKmaKeyBtn').click(); sysWaitRender(v);
    }
  });
  document.body.appendChild(el);
  setTimeout(()=>{ const i = document.getElementById('sysKeyInput'); if(i) i.focus(); }, 50);
}
function sysWaitRender(expect){ let n = 0; const t = setInterval(()=>{ n++; if(((appData.kmaApiKey||'')===expect) || n>20){ clearInterval(t); renderSystemHub(); } }, 150); }
(function(){
  const root = document.getElementById('sysHub'); if(!root) return;
  root.addEventListener('click', (e)=>{
    const b = e.target.closest('[data-a]'); if(!b) return;
    if(!requireAdmin()) return;
    if(b.dataset.a==='edit') sysOpenSheet(false);
    else if(b.dataset.a==='help') sysOpenSheet(true);
    else if(b.dataset.a==='del'){ document.getElementById('clearKmaKeyBtn').click(); sysWaitRender(''); }
  });
  const o = window.openAdminCat;
  if(typeof o==='function') window.openAdminCat = function(id){ const r = o.apply(this, arguments); if(id==='system') renderSystemHub(); return r; };
  renderSystemHub();
})();
