/* ---------- 지도 화면: 구장 카드 / 길안내 / 즐겨찾는 경기장 목록 / 지도 버튼 ---------- */
function updateVenueCard(name, address){
  const card = $('#venueCard');
  if(!card || !name) return;
  card.hidden = false;
  const _short = (typeof splitVenueName==='function') ? splitVenueName(name)[1] : name;
  $('#vcName').textContent = _short; $('#vcName').title = name;
  $('#vcAddr').textContent = address || '등록된 주소가 없습니다';
  const cp = $('#vcCopyBtn'); if(cp) cp.style.display = address ? '' : 'none';
  syncVenueCardStar();
}
function syncVenueCardStar(){
  const b = $('#vcFavBtn'); if(!b) return;
  if(!isAdminUser() || !currentVenueName){ b.style.display='none'; return; }
  b.style.display = 'inline-grid';
  const on = favoriteVenueSet.has(currentVenueName);
  b.textContent = on ? '★' : '☆';
  b.classList.toggle('on', on);
}
function getCurrentVenueCoords(){
  try{
    const o = venuePinObjects[currentVenueName];
    if(o && o.pos) return { lat:o.pos.getLat(), lng:o.pos.getLng() };
    if(adhocVenueOverlay && adhocVenueOverlay.getPosition){ const p = adhocVenueOverlay.getPosition(); return { lat:p.getLat(), lng:p.getLng() }; }
  }catch(e){}
  return null;
}
function openMapSheet(id){
  const sh = document.getElementById(id), dim = document.getElementById('mapSheetDim');
  if(!sh || !dim) return;
  ['favSheet','navSheet'].forEach(x=>{ const e=document.getElementById(x); if(e && e!==sh) e.hidden = true; });
  dim.hidden = false; sh.hidden = false;
}
function closeMapSheets(){
  ['favSheet','navSheet','mapSheetDim'].forEach(x=>{ const e=document.getElementById(x); if(e) e.hidden = true; });
}
function renderFavSheet(){
  const list = $('#favSheetList'); if(!list) return;
  const names = [...favoriteVenueSet];
  $('#favSheetCnt').textContent = names.length;
  if(!names.length){ list.innerHTML = '<div class="ms-empty">즐겨찾기한 경기장이 아직 없습니다.</div>'; return; }
  list.innerHTML = names.map(n=>{
    const pr = findVenuePreset(n);
    return `<button type="button" class="ms-item" data-name="${escapeHtml(n)}"><span class="ms-ph"></span><span class="ms-tx"><b>${escapeHtml(n)}</b>${pr && pr.address ? `<small>${escapeHtml(pr.address)}</small>` : ''}</span><em>★</em></button>`;
  }).join('');
}
/* 길안내: 앱이 설치되어 있으면 앱이 열리고, 없으면 스토어로 이동합니다. 도착지 좌표가 없으면 이름으로 검색합니다. */
function openNavApp(app){
  const name = currentVenueName || '';
  const c = getCurrentVenueCoords();
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua), isAndroid = /Android/i.test(ua);
  const enc = encodeURIComponent(name);
  const store = {
    naver: isIOS ? 'https://apps.apple.com/kr/app/id311867728' : 'https://play.google.com/store/apps/details?id=com.nhn.android.nmap',
    tmap:  isIOS ? 'https://apps.apple.com/kr/app/id431589174' : 'https://play.google.com/store/apps/details?id=com.skt.tmap.ku'
  };
  if(!isIOS && !isAndroid){
    // PC: 웹 지도로 연결합니다.
    if(app==='naver'){ window.open('https://map.naver.com/p/search/' + enc, '_blank', 'noopener'); }
    else { toast('티맵은 모바일에서만 사용할 수 있습니다.'); }
    return;
  }
  let scheme;
  if(app==='naver'){
    scheme = c ? `nmap://route/car?dlat=${c.lat}&dlng=${c.lng}&dname=${enc}&appname=${encodeURIComponent(location.hostname || 'gongsaengwan')}`
               : `nmap://search?query=${enc}&appname=${encodeURIComponent(location.hostname || 'gongsaengwan')}`;
  } else {
    scheme = c ? `tmap://route?goalname=${enc}&goalx=${c.lng}&goaly=${c.lat}&rGoName=${enc}&rGoX=${c.lng}&rGoY=${c.lat}`
               : `tmap://search?name=${enc}`;
  }
  let left = false;
  const onHide = ()=>{ if(document.hidden) left = true; };
  document.addEventListener('visibilitychange', onHide);
  window.location.href = scheme;
  setTimeout(()=>{
    document.removeEventListener('visibilitychange', onHide);
    if(!left){ // 앱이 열리지 않았으면(미설치) 스토어로 안내합니다.
      if(confirm((app==='naver'?'네이버지도':'티맵') + ' 앱이 열리지 않았습니다.\n설치 화면으로 이동할까요?')) window.location.href = store[app];
    }
  }, 1800);
}
(function initMapUi(){
  const q = (id)=>document.getElementById(id);
  const dim = q('mapSheetDim');
  if(dim) dim.addEventListener('click', closeMapSheets);
  document.querySelectorAll('#favSheet [data-close], #navSheet [data-close]').forEach(b=>b.addEventListener('click', closeMapSheets));
  const favRow = q('mapFavRow');
  if(favRow) favRow.addEventListener('click', ()=>{ renderFavSheet(); openMapSheet('favSheet'); });
  const favList = q('favSheetList');
  if(favList) favList.addEventListener('click', async (e)=>{
    const it = e.target.closest('.ms-item'); if(!it) return;
    closeMapSheets();
    $('#venueInput').value = it.dataset.name;
    const sel = $('#venuePresetSelect'); if(sel) sel.value = findVenuePreset(it.dataset.name) ? it.dataset.name : '';
    await lookupVenueOnMap();
  });
  const navBtn = q('vcNavBtn');
  if(navBtn) navBtn.addEventListener('click', ()=>{
    if(!currentVenueName) return;
    q('navSheetSub').textContent = currentVenueName + ((q('vcAddr').textContent && !/^등록된/.test(q('vcAddr').textContent)) ? ' · ' + q('vcAddr').textContent : '');
    openMapSheet('navSheet');
  });
  document.querySelectorAll('#navSheet .nav-app').forEach(b=>b.addEventListener('click', ()=>{ const a=b.dataset.app; closeMapSheets(); openNavApp(a); }));
  const cp = q('vcCopyBtn');
  if(cp) cp.addEventListener('click', ()=>{ const t=q('vcAddr').textContent; if(t && window.copyVenueAddress) window.copyVenueAddress(t); });
  const card = q('venueCard');
  const pinBtn = q('vcPinBtn');
  if(pinBtn) pinBtn.addEventListener('click', ()=>{
    if(!map){ toast('지도를 불러오는 중입니다. 잠시 후 다시 눌러주세요.'); return; }
    const o = currentVenueName && venuePinObjects[currentVenueName];
    const pos = (o && o.pos) || currentVenuePos;
    if(!pos){ toast('경기장 위치를 찾지 못했습니다.'); return; }
    mapUserMoved = true;
    try{ map.relayout(); map.setLevel(3); map.setCenter(pos); }catch(e){}
    try{
      if(window.__venuePulse) window.__venuePulse.setMap(null);
      const d = document.createElement('div'); d.className='venue-pulse'; d.innerHTML='<i></i><i></i>';
      window.__venuePulse = new kakao.maps.CustomOverlay({ position:pos, content:d, zIndex:9 });
      window.__venuePulse.setMap(map);
      setTimeout(()=>{ try{ window.__venuePulse && window.__venuePulse.setMap(null); }catch(e){} }, 5000);
    }catch(e){}
    toast('📍 경기장 위치로 이동했어요');
  });
  const star = q('vcFavBtn');
  if(star) star.addEventListener('click', ()=>{ const b=q('favVenueBtn'); if(b) b.click(); });
  const sb = q('mapSearchBtn');
  if(sb) sb.addEventListener('click', ()=>{ const p=q('mapSearchPop'); p.hidden = !p.hidden; if(!p.hidden) setTimeout(()=>{ const i=q('venueInput'); if(i) i.focus(); }, 50); });
  const lk = q('lookupVenueBtn');
  if(lk) lk.addEventListener('click', ()=>{ const p=q('mapSearchPop'); if(p) setTimeout(()=>{ p.hidden = true; }, 300); });
  const ps = q('venuePresetSelect');
  if(ps) ps.addEventListener('change', ()=>{ const p=q('mapSearchPop'); if(p && ps.value) setTimeout(()=>{ p.hidden = true; }, 300); });
  const zi = q('mapZoomIn'), zo = q('mapZoomOut');
  if(zi) zi.addEventListener('click', ()=>{ if(map) map.setLevel(Math.max(1, map.getLevel()-1), {animate:true}); });
  if(zo) zo.addEventListener('click', ()=>{ if(map) map.setLevel(map.getLevel()+1, {animate:true}); });
  const lc = q('mapLocBtn');
  if(lc) lc.addEventListener('click', ()=>{
    if(!map || !navigator.geolocation){ toast('이 기기에서는 현재 위치를 사용할 수 없습니다.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos)=>{ map.setCenter(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude)); map.setLevel(4); },
      ()=>toast('현재 위치를 가져오지 못했습니다. 위치 권한을 확인해 주세요.'),
      { enableHighAccuracy:true, timeout:8000 }
    );
  });
})();

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
        if(status === kakao.maps.services.Status.OK && result[0]){
          resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
        } else { resolve(null); }
      });
    } else {
      const places = new kakao.maps.services.Places();
      places.keywordSearch(query, (result, status)=>{
        if(status === kakao.maps.services.Status.OK && result[0]){
          resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x), addr: result[0].road_address_name || result[0].address_name || '' });
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
    currentVenuePos = existing.pos;
    map.setCenter(existing.pos);
    return;
  }

  // 목록에 없는 경기장(직접 검색)은 임시 핀을 새로 만듭니다.
  let coords = null;
  // 1) 주소가 있으면 정확한 주소로 먼저 검색합니다.
  if(info.address){
    coords = await kakaoGeocode(info.address, true);
  }
  // 2) 주소가 없거나 실패하면 장소 이름으로 검색합니다.
  //    "…1구장(블랙)"처럼 세부 구장이 붙은 이름은 검색이 안 되는 경우가 많아, 세부 구장을 뗀 이름을 먼저 시도합니다.
  if(!coords){
    const base = baseVenueName(info.name);
    const noParen = info.name.replace(/\([^)]*\)/g,'').trim();
    const spaced = s=>s.replace(/^플랩\s*스타디움\s*/,'플랩스타디움 ');
    const cands = [...new Set([base, spaced(base), base+' 서울', noParen, spaced(noParen), info.name+' 서울', info.name, base+' 풋살'].filter(Boolean))];
    for(const q of cands){ coords = await kakaoGeocode(q, false); if(coords) break; }
  }
  if(!coords){ toast(`'${info.name}' 위치를 찾지 못했습니다. 지도에서 직접 검색해 보시기 바랍니다.`); return; }
  const pos = new kakao.maps.LatLng(coords.lat, coords.lng);
  currentVenuePos = pos;
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


/* ---------- 돋보기: 경기장 검색 + 목록 (이름 전체 표시, 이번 경기/즐겨찾기 표시, 입력하면 바로 필터) ---------- */
let venueListChip = 'all';
function vlHighlight(text, q){
  const t = escapeHtml(text);
  if(!q) return t;
  const i = String(text).toLowerCase().indexOf(q.toLowerCase());
  if(i < 0) return t;
  return escapeHtml(text.slice(0,i)) + '<mark>' + escapeHtml(text.slice(i,i+q.length)) + '</mark>' + escapeHtml(text.slice(i+q.length));
}
function renderVenueList(){
  const list = document.getElementById('vlList'), chipsEl = document.getElementById('vlChips'), hint = document.getElementById('vlHint');
  if(!list || !chipsEl) return;
  const q = (document.getElementById('venueInput').value || '').trim();
  const all = (typeof FUTSAL_VENUES !== 'undefined' ? FUTSAL_VENUES : []).slice();
  const isFav = v=>favoriteVenueSet.has(v.name);
  const isFlap = v=>/^플랩\s*스타디움\s*가산/.test(v.name);
  const chips = [['all','전체'],['fav','★ 즐겨찾기']];
  chipsEl.innerHTML = chips.map(([k,t])=>`<button type="button" class="vl-chip${k===venueListChip?' on':''}" data-k="${k}">${t}</button>`).join('');
  let items = all.filter(v=>{
    if(venueListChip==='fav' && !isFav(v)) return false;
    if(q){ const s = (v.name+' '+(v.address||'')).toLowerCase().replace(/\s+/g,''); if(!s.includes(q.toLowerCase().replace(/\s+/g,''))) return false; }
    return true;
  });
  const rank = v=> v.name===confirmedVenueName ? 0 : (isFav(v) ? 1 : 2);
  items.sort((a,b)=>rank(a)-rank(b) || a.name.localeCompare(b.name,'ko'));
  hint.textContent = q ? `"${q}" 검색 결과 ${items.length}곳` : '탭하면 해당 경기장으로 이동합니다';
  const admin = typeof isAdminUser==='function' && isAdminUser();
  let html = items.map(v=>{
    const [co, nm] = splitVenueName(v.name);
    const next = v.name===confirmedVenueName;
    const fav = isFav(v);
    return `<div class="vl-item${next?' next':''}" data-name="${escapeHtml(v.name)}">
      <span class="vl-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg></span>
      <span class="vl-tx"><b>${co?escapeHtml(co)+'<br>':''}${vlHighlight(nm,q)}</b>
      <small>${next?'<em class="vl-tag">이번 경기</em>':''}${v.address?escapeHtml(v.address):'등록된 주소가 없습니다'}</small></span>
      <button type="button" class="vl-star${fav?' on':''}${admin?'':' ro'}" data-fav="${escapeHtml(v.name)}" aria-label="즐겨찾기">${fav?'★':'☆'}</button></div>`;
  }).join('');
  if(!items.length) html = '<div class="vl-empty">일치하는 경기장이 없습니다</div>';
  if(q) html += `<button type="button" class="vl-direct" data-direct="1">+ "${escapeHtml(q)}" 주소로 직접 찾기</button>`;
  list.innerHTML = html;
}
(function(){
  const pop = document.getElementById('mapSearchPop'); if(!pop) return;
  const inp = document.getElementById('venueInput');
  if(inp) inp.addEventListener('input', renderVenueList);
  pop.addEventListener('click', (e)=>{
    const chip = e.target.closest('.vl-chip');
    if(chip){ venueListChip = chip.dataset.k; renderVenueList(); return; }
    const star = e.target.closest('.vl-star');
    if(star){ e.stopPropagation(); if(star.classList.contains('ro')){ toast('즐겨찾기는 관리자만 바꿀 수 있습니다.'); return; } toggleFavoriteVenue(star.dataset.fav); return; }
    if(e.target.closest('[data-direct]')){ lookupVenueOnMap(); setTimeout(()=>{ pop.hidden = true; }, 200); return; }
    const it = e.target.closest('.vl-item');
    if(it){
      const name = it.dataset.name;
      inp.value = name;
      const sel = document.getElementById('venuePresetSelect'); if(sel) sel.value = name;
      lookupVenueOnMap();
      setTimeout(()=>{ pop.hidden = true; }, 200);
    }
  });
  const sb = document.getElementById('mapSearchBtn');
  if(sb) sb.addEventListener('click', ()=>{ if(!pop.hidden){ inp.value=''; venueListChip='all'; renderVenueList(); } });
})();
