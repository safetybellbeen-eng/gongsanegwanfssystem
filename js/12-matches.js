/* ================= 경기 탭 (플랩풋볼, Supabase public.plab_matches 조회 전용) =================
   ⚠️ 이 섹션은 GitHub Actions/fetch-plab.js/Supabase 테이블 구조를 전혀 건드리지 않고,
   이미 저장되어 있는 plab_matches 테이블을 "읽기 전용"으로 조회만 합니다.
   즐겨찾기는 독립된 favorite_venues 테이블(favoriteVenueSet)을 그대로 사용합니다. */

let selectedMatchDate = null; // YYYY-MM-DD
let matchTimeFilter = 'evening';  // all | morning | afternoon | evening (기본은 저녁 19시 이후)
let matchFavOnly = false;
let matchFormatFilter = 'all'; // all | '5' | '6' (player_count에서 뽑은 인원수 기준)
let matchHideFull = true; // 마감(apply_status==='full') 경기 가리기. 기본값은 가림.
let matchesTabInited = false;
let lastMatchRows = [];
let matchVisibleCount = 10;
const MATCHES_PER_PAGE = 10;

/* player_count는 "6vs6", "6VS6", "6:6" 등 표기가 섞여 들어올 수 있어, 첫 숫자만 뽑아 비교 기준으로 삼습니다. */
function matchFormatNumber(playerCount){
  const m = String(playerCount||'').match(/\d+/);
  return m ? m[0] : null;
}

/* 오늘부터 14일치 날짜 목록 (KST 기준) */
function buildMatchDateList(){
  const base = kstNow();
  const list = [];
  for(let i=0;i<14;i++){
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate()+i);
    list.push(fmtDate(d));
  }
  return list;
}

function renderMatchDateScroller(){
  const el = $('#matchDateScroll');
  if(!el) return;
  const dates = buildMatchDateList();
  const todayS = todayStr();
  el.innerHTML = dates.map(d=>{
    const o = parseYMD(d);
    const isToday = d===todayS;
    const label = isToday ? '오늘' : weekdayKR[o.getDay()];
    return `<div class="match-date-chip ${d===selectedMatchDate?'active':''}" data-date="${d}">
      <span class="md-label">${label}</span>
      <span class="md-date">${o.getMonth()+1}/${o.getDate()}</span>
    </div>`;
  }).join('');
  el.querySelectorAll('.match-date-chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      selectedMatchDate = chip.dataset.date;
      matchVisibleCount = MATCHES_PER_PAGE;
      renderMatchDateScroller();
      loadMatchesForSelectedDate();
    });
  });
}

/* 모집 상태 판정: Supabase의 apply_status는 'available'(모집중) / 'hurry'(마감임박) /
   'full'(마감) 세 가지입니다. (2026-08부터 fetch-plab.js가 hide_soldout 없이 수집해
   마감 경기도 'full'로 저장합니다. 기본은 "마감경기 가리기" 필터로 화면에서 가려집니다.) */
function getMatchStatus(row){
  if(row.apply_status === 'available') return 'open';
  if(row.apply_status === 'hurry') return 'closing';
  return 'full'; // 'full' 또는 예상 밖의 값이 들어온 경우 모두 마감으로 처리
}
function matchStatusLabel(status){
  if(status==='full') return { text:'🔴 마감', cls:'status-full' };
  if(status==='closing') return { text:'🟠 마감임박', cls:'status-closing' };
  return { text:'🟢 모집중', cls:'status-open' };
}
function matchTimePeriod(timeStr){
  if(!timeStr) return null;
  const h = parseInt(String(timeStr).split(':')[0], 10);
  if(isNaN(h)) return null;
  if(h < 12) return 'morning';
  if(h < 19) return 'afternoon';
  return 'evening';
}

async function loadMatchesForSelectedDate(){
  const listEl = $('#matchListContainer');
  const countEl = $('#matchCountText');
  const updatedEl = $('#matchUpdatedText');
  if(!listEl) return;
  if(!supabaseClient){ listEl.innerHTML = '<div class="rank-empty">Supabase에 연결되어 있지 않습니다.</div>'; return; }
  listEl.innerHTML = '<div class="match-loading">경기 정보를 불러오는 중...</div>';

  try{
    // 지역 필터링은 이제 수집(fetch-plab.js) 단계가 아니라 여기(조회 시점)에서 합니다.
    // plab_matches에는 전국 데이터가 다 들어있고, area_group 컬럼으로 서울만 걸러서 보여줍니다.
    const { data, error } = await supabaseClient
      .from('plab_matches')
      .select('*')
      .eq('match_date', selectedMatchDate)
      .eq('area_group', '서울')
      .order('match_time', { ascending: true });
    if(error) throw error;

    lastMatchRows = data || [];
    // 모집 상태 판정 기준이 맞는지 확인할 수 있도록, 실제로 어떤 apply_status 값들이 들어오는지 로그로 남깁니다.
    const uniqueStatuses = [...new Set(lastMatchRows.map(r=>r.apply_status))];
    console.log('[경기 탭] 이 날짜에서 발견된 apply_status 값들:', uniqueStatuses);
    if(updatedEl){
      const latest = lastMatchRows.reduce((acc,r)=> (r.updated_at && (!acc || r.updated_at>acc)) ? r.updated_at : acc, null);
      updatedEl.textContent = latest ? `마지막 업데이트 · ${new Date(latest).toLocaleString('ko-KR')}` : '';
    }
    const syncNote = $('#matchSyncNote');
    if(syncNote){
      // 이 데이터는 실시간이 아니라 주기적으로 동기화된 스냅샷이라, 인기 있는 경기는 그 사이에
      // 마감될 수 있습니다. 신청 전 실제 링크에서 최신 상태를 한 번 더 확인하도록 안내합니다.
      syncNote.style.display = lastMatchRows.length ? 'block' : 'none';
    }
    renderMatchList();
  }catch(e){
    console.error('[경기 탭] plab_matches 조회 실패', e);
    listEl.innerHTML = '<div class="rank-empty">경기 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주시기 바랍니다.</div>';
    if(countEl) countEl.textContent = '-';
    if(updatedEl) updatedEl.textContent = '';
  }
}

/* 경기 탭 카드의 "위치" 버튼: 지도 탭으로 전환하고 그 경기장 위치로 자동 이동/확장합니다.
   플랩풋볼 실제 stadium_name이 프리셋(FUTSAL_VENUES) 이름과 다를 수 있어, 먼저 프리셋 매칭을 시도하고
   없으면 이름만으로 검색해 placeVenueMarker의 "목록에 없는 경기장" 임시 핀 경로를 그대로 재사용합니다. */
async function goToVenueOnMapTab(venueName){
  // setActiveMobileSection('map')가 내부에서 loadDefaultMapVenue()를 별도로(await 없이) 실행시켜,
  // 우리가 지금 보여주려는 경기장과 "기본 경기장 자동 표시" 로직이 동시에 지도를 건드리며 충돌하던
  // 문제가 있었습니다. mapDefaultLoaded를 먼저 true로 만들어 자동 로딩을 건너뛰게 막습니다.
  mapDefaultLoaded = true;
  const mapTabBtn = document.querySelector('.mobile-tabbar .tab-btn[data-tab="map"]');
  if(mapTabBtn) mapTabBtn.click();
  // 탭 전환으로 #sectionMap이 display:none → block으로 바뀐 직후에는 브라우저가 아직 레이아웃을
  // 재계산하지 않은 상태라, 이 시점에 카카오맵을 그리면 지도가 실제 컨테이너 크기/위치를 잘못
  // 인식해 비스듬히 어긋난 곳부터 보이는 문제가 있었습니다. 한 프레임을 기다려 레이아웃이
  // 확정된 뒤에 지도를 그리도록 합니다.
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const preset = findVenuePreset(venueName);
  const info = preset ? { name: preset.name, address: preset.address } : { name: venueName, address: '' };
  const sel = $('#venuePresetSelect');
  const input = $('#venueInput');
  if(sel) sel.value = preset ? preset.name : '';
  if(input) input.value = preset ? preset.name : venueName;
  await showVenueOnMap(info);
  // 지도가 그려진 후에도 컨테이너 크기가 늦게 확정되는 경우가 있어, relayout으로 한 번 더 보정합니다.
  setTimeout(()=>{ try{ if(map) map.relayout(); if(map && currentVenueName && venuePinObjects[currentVenueName]) map.setCenter(venuePinObjects[currentVenueName].pos); }catch(e){} }, 150);
}

/* 경기 탭에서 고른 플랩풋볼 경기를 홈 탭 "확정 경기"로 그대로 가져옵니다.
   - 그 날짜가 아직 확정되지 않았으면(weekOverride에 없고 자동 최다득표일도 아니면) 함께 확정 처리합니다.
   - 경기장/시간/신청 링크를 플랩풋볼 정보 그대로 채워서 관리자가 다시 손으로 입력하지 않아도 되게 합니다.
   - 이미 그 날짜에 저장된 경기장 정보가 있으면 실수로 덮어쓰지 않도록 확인을 먼저 받습니다. */
async function adminAdoptMatchAsConfirmed(row){
  if(!requireAdmin()) return;
  const dateStr = row.match_date;
  if(!dateStr){ toast('경기 날짜 정보가 없습니다.'); return; }

  const weekKey = getWeekStart(dateStr);
  const existingConfirmedDates = getWeekInfo(weekKey).confirmedDates;
  const alreadyConfirmed = existingConfirmedDates.includes(dateStr);
  const existingVenue = getVenueInfo(dateStr);

  let confirmMsg = `${dateStr} 경기를 홈 화면 확정 경기로 등록하시겠습니까?\n\n📍 ${row.stadium_name||'경기장 미정'}\n🕒 ${row.match_time||'-'}`;
  if(!alreadyConfirmed) confirmMsg += `\n\n⚠️ 이 날짜는 아직 확정되지 않았습니다. 이 날짜도 함께 확정 처리됩니다.`;
  if(existingVenue && existingVenue.name) confirmMsg += `\n\n⚠️ 이미 등록된 경기장 정보(${existingVenue.name})를 덮어씁니다.`;
  if(!confirm(confirmMsg)) return;

  const preset = findVenuePreset(row.stadium_name);
  const venueName = preset ? preset.name : (row.stadium_name || '');
  const venueAddress = preset ? preset.address : '';
  const timeStr = row.match_time ? String(row.match_time).slice(0,5) : '';
  const link = row.match_url || '';
  // player_count("6vs6" 등)에서 경기 형식을 뽑아 함께 저장해두면, 전술 탭에서 이 경기의 형식을
  // 관리자가 다시 고르지 않아도 자동으로 알 수 있습니다. 5:5/6:6이 아닌 값이면 저장하지 않습니다.
  const parsedFormat = matchFormatNumber(row.player_count);
  const format = (parsedFormat === '5' || parsedFormat === '6') ? parsedFormat : null;

  await mutateAppData(data=>{
    if(!alreadyConfirmed){
      if(!data.weekOverride) data.weekOverride = {};
      const list = normalizeDateList(data.weekOverride[weekKey], getWeekDates(weekKey));
      if(!list.includes(dateStr)) list.push(dateStr);
      data.weekOverride[weekKey] = list;
      resyncWeekDerivedVotes(data, weekKey);
    }
    data.venues[dateStr] = { name: venueName, address: venueAddress, time: timeStr, link, format };
  });

  renderCalendar();
  await renderMatchPanel();
  computeAttendanceStats();
  renderMatchStats();
  renderMatchVenueConfirmedHint();
  toast('경기를 홈 화면 확정 경기로 등록했습니다.');
}

function renderMatchList(){
  const listEl = $('#matchListContainer');
  const countEl = $('#matchCountText');
  if(!listEl) return;
  const favSet = favoriteVenueSet;

  const favFilterBtn = $('#matchFavFilterBtn');
  if(favFilterBtn){ favFilterBtn.hidden = false; favFilterBtn.classList.toggle('active', matchFavOnly); }
  let rows = lastMatchRows.filter(r=>{
    if(matchTimeFilter !== 'all' && matchTimePeriod(r.match_time) !== matchTimeFilter) return false;
    if(matchFormatFilter !== 'all' && matchFormatNumber(r.player_count) !== matchFormatFilter) return false;
    if(matchHideFull && getMatchStatus(r) === 'full') return false;
    // 오늘 날짜를 보고 있을 때는, 이미 시작 시각이 지난 경기는 신청해도 소용없으니 목록에서 제외합니다.
    if(selectedMatchDate === todayStr() && r.match_time){
      const now = kstNow();
      const nowHM = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
      if(String(r.match_time).slice(0,5) < nowHM) return false;
    }
    if(matchFavOnly){
      // 즐겨찾기 경기장명과 완전히 일치하지 않을 수 있어(플랩 표기 차이), 공백을 무시하고
      // 부분 포함까지 함께 확인합니다. (예: "가산 벽산디지털밸리" vs "가산벽산디지털밸리")
      const normalize = (s)=> String(s||'').replace(/\s+/g, '');
      const stadiumNorm = normalize(r.stadium_name);
      const hit = [...favSet].some(fav=>{
        const favNorm = normalize(fav);
        return stadiumNorm && favNorm && (stadiumNorm===favNorm || stadiumNorm.includes(favNorm) || favNorm.includes(stadiumNorm));
      });
      if(!hit) return false;
    }
    return true;
  });

  // 화면에 보이는(필터링된) 경기 수를 그대로 표시합니다 — 필터 적용 전 전체 수를 보여주면 실제 목록과 안 맞아 보입니다.
  if(countEl){
    const dObj = selectedMatchDate ? parseYMD(selectedMatchDate) : null;
    const isToday = selectedMatchDate === todayStr();
    const dayLabel = dObj ? (isToday ? '오늘 경기' : `${dObj.getMonth()+1}.${dObj.getDate()}(${weekdayKR[dObj.getDay()]}) 경기`) : '경기';
    countEl.innerHTML = `<span class="mc-count-label">${escapeHtml(dayLabel)}</span><span class="mc-count-num">${rows.length}경기</span>`;
  }

  if(!rows.length){
    listEl.innerHTML = '<div class="rank-empty">오늘은 등록된 경기가 없습니다.</div>';
    return;
  }

  if(matchVisibleCount < MATCHES_PER_PAGE) matchVisibleCount = MATCHES_PER_PAGE;
  const shownRows = rows.slice(0, matchVisibleCount);
  const remaining = rows.length - shownRows.length;

  const cardsHtml = shownRows.map(r=>{
    const status = getMatchStatus(r);
    const label = matchStatusLabel(status);
    const timeStr = r.match_time ? String(r.match_time).slice(0,5) : '-';

    // 경기 형식(player_count, 예: "6vs6")과 실시간 모집 인원(confirm_count/max_player_cnt)을
    // 계산 없이 실제 저장된 값 그대로 하나의 뱃지로 보여줍니다.
    const formatText = r.player_count ? String(r.player_count) : '';
    const countText = (r.confirm_count != null && r.max_player_cnt != null)
      ? `${r.confirm_count}/${r.max_player_cnt}명`
      : '';
    const typeParts = [formatText, countText].filter(Boolean).join(' · ');
    const typeHtml = typeParts ? `<span class="mc-type">👥 ${escapeHtml(typeParts)}</span>` : '';
    // level(급수)·gender(성별)도 저장되어 있으면 보조 정보로 함께 보여줍니다.
    const extraTags = [r.level, r.gender].filter(Boolean);
    const extraTagsHtml = extraTags.length
      ? `<div class="mc-tags-row">${extraTags.map(t=>`<span class="mc-tag">${escapeHtml(String(t))}</span>`).join('')}</div>`
      : '';

    // isFav는 즐겨찾기 필터(matchFavOnly)에서 계속 사용하지만, 즐겨찾기 등록/해제는
    // 이제 지도 탭에서만 할 수 있어 경기 카드에는 별표 버튼을 두지 않습니다.
    const isFav = [...favSet].some(fav=>{
      const normalize = (s)=> String(s||'').replace(/\s+/g, '');
      const a = normalize(r.stadium_name), b = normalize(fav);
      return a && b && (a===b || a.includes(b) || b.includes(a));
    });

    const fmtN = matchFormatNumber(r.player_count);
    const fmtBadge = fmtN ? `${fmtN}:${fmtN}` : (formatText || '');
    const mo = r.match_date ? parseYMD(r.match_date) : (selectedMatchDate ? parseYMD(selectedMatchDate) : null);
    const dateText = mo ? `${mo.getMonth()+1}월 ${mo.getDate()}일 (${weekdayKR[mo.getDay()]})` : '';
    const subParts = [label.text.replace(/^[^\s]+\s/, ''), countText, ...extraTags.map(String)].filter(Boolean);
    const adoptBtnHtml = isAdminUser()
      ? `<button type="button" class="mc-adopt-btn" data-row-id="${escapeHtml(String(r.id))}" title="이 경기를 홈 화면 확정 경기로 등록">🏆 확정 등록</button>`
      : '';
    const pinSvg = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 22s7.500-6.600 7.500-12.300A7.500 7.500 0 0 0 4.500 9.700C4.500 15.400 12 22 12 22z"/><circle cx="12" cy="9.800" r="2.800" fill="#0c1319"/></svg>';
    const calSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15.500 2 2 4-4"/></svg>';
    const clkSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    const starSvg = '<svg viewBox="0 0 24 24" width="22" height="22" fill="'+(isFav?'currentColor':'none')+'" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 2.800 2.800 5.800 6.300.9-4.600 4.400 1.100 6.300L12 17.200l-5.600 3 1.100-6.300L2.900 9.500l6.300-.9z"/></svg>';
    const extSvg = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

    // 경기장명 앞의 "플랩 스타디움"은 작은 태그로 분리해 이름을 한 줄로 보이게 합니다(저장 데이터는 그대로).
    const rawName = r.stadium_name || '경기장 미정';
    const PLAB_PREFIX = /^플랩\s*스타디움\s+/;
    const hasPrefix = PLAB_PREFIX.test(rawName);
    const shortName = hasPrefix ? rawName.replace(PLAB_PREFIX, '') : rawName;
    const statusText = [label.text.replace(/^[^\s]+\s/, ''), countText].filter(Boolean).join(' ');
    const shareSvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="#191919"><path d="M12 3C6.500 3 2 6.500 2 10.800c0 2.800 1.900 5.300 4.700 6.700l-1 3.700c-.1.400.3.600.6.400l4.300-2.900c.5.100.9.100 1.400.1 5.500 0 10-3.500 10-7.800S17.500 3 12 3z"/></svg>';
    const arrowSvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    const pinSm = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 22s7.500-6.600 7.500-12.300A7.500 7.500 0 0 0 4.500 9.700C4.500 15.400 12 22 12 22z"/><circle cx="12" cy="9.800" r="2.800" fill="#0c1319"/></svg>';
    const calSm = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
    const clkSm = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    const starSm = '<svg viewBox="0 0 24 24" width="17" height="17" fill="'+(isFav?'currentColor':'none')+'" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 2.800 2.800 5.800 6.300.9-4.600 4.400 1.100 6.300L12 17.200l-5.600 3 1.100-6.300L2.900 9.500l6.300-.9z"/></svg>';
    const shareText = `${rawName}\n${dateText} ${timeStr}${fmtBadge?' · '+fmtBadge:''}`;

    const adminNow = isAdminUser();
    const subLine = [r.level, r.gender].filter(Boolean).map(String).join(' · ');
    const shareIc = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.8 7.4-4.300M8.3 13.200l7.400 4.300"/></svg>';
    return `
      <div class="mx ${status==='full'?'is-full':''}" data-rid="${escapeHtml(String(r.id))}">
        <div class="mx-main" role="button" tabindex="0">
          <div class="mx-t">${escapeHtml(timeStr)}</div>
          <div class="mx-v"><b title="${escapeHtml(rawName)}">${escapeHtml(shortName)}</b>${subLine?`<small>${escapeHtml(subLine)}</small>`:''}</div>
          <div class="mx-r">${fmtBadge ? `<span class="mt-fmt">${escapeHtml(fmtBadge)}</span>` : ''}${statusText ? `<span class="mt-st ${label.cls}">${escapeHtml(statusText)}</span>` : ''}</div>
        </div>
        <div class="mx-act">
          ${r.stadium_name ? `<button type="button" class="mx-ic mc-loc-btn" data-venue="${escapeHtml(r.stadium_name)}" title="지도에서 위치 보기">${pinSm}</button>` : ''}
          ${adminNow ? `<button type="button" class="mx-ic mt-fav ${isFav?'on':''}" data-venue="${escapeHtml(r.stadium_name||'')}" title="${isFav?'즐겨찾기 해제':'즐겨찾기'}">${starSm}</button>` : ''}
          <button type="button" class="mx-ic mc-share-btn" data-share-text="${escapeHtml(shareText)}" data-url="${escapeHtml(r.match_url||'')}" title="공유">${shareIc}</button>
          <button type="button" class="mx-go mc-apply-btn" data-url="${escapeHtml(r.match_url||'')}" title="플랩풋볼 신청 페이지 열기">신청하기 ${arrowSvg}</button>
          ${adoptBtnHtml ? adoptBtnHtml.replace('class="mc-adopt-btn"','class="mc-adopt-btn mx-ic"').replace('🏆 확정 등록','🏆') : ''}
        </div>
      </div>
    `;
  }).join('');

  const moreHtml = remaining > 0
    ? `<button type="button" class="match-more-btn" id="matchMoreBtn">더 많은 경기 보기 (${remaining}경기 더)</button>`
    : '';

  listEl.innerHTML = cardsHtml + moreHtml;
  listEl.querySelectorAll('.mx-main').forEach(m=>{
    const toggle = ()=>{
      const row = m.parentElement, was = row.classList.contains('open');
      listEl.querySelectorAll('.mx.open').forEach(x=>x.classList.remove('open'));
      if(!was) row.classList.add('open');
    };
    m.addEventListener('click', toggle);
    m.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); toggle(); } });
  });

  listEl.querySelectorAll('.mc-apply-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(btn.dataset.url) window.open(btn.dataset.url, '_blank', 'noopener');
    });
  });
  listEl.querySelectorAll('.mc-share-btn').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      const url = btn.dataset.url;
      const text = btn.dataset.shareText || '';
      if(!url){ toast('공유할 경기 링크가 없습니다.'); return; }
      // 기기의 공유창을 열어 카카오톡을 선택해 보낼 수 있게 합니다.
      if(navigator.share){
        try{ await navigator.share({ title: '풋살 경기 공유', text, url }); }
        catch(err){ if(err && err.name !== 'AbortError') toast('공유하지 못했습니다.'); }
        return;
      }
      // 공유창을 지원하지 않는 브라우저(PC 등)에서는 내용을 복사합니다.
      const full = text + '\n' + url;
      try{ await navigator.clipboard.writeText(full); toast('경기 정보를 복사했습니다. 카카오톡에 붙여넣어 보내세요.'); }
      catch(_){ window.prompt('아래 내용을 복사해 카카오톡에 붙여넣어 보내세요.', full); }
    });
  });
  listEl.querySelectorAll('.mt-fav').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      if(!requireAdmin()) return;
      const name = btn.dataset.venue; if(!name) return;
      const norm = (x)=>String(x||'').replace(/\s+/g,'');
      const matched = [...favoriteVenueSet].filter(f=>norm(f)===norm(name) || norm(f).includes(norm(name)) || norm(name).includes(norm(f)));
      const makeFav = matched.length===0;
      let res = {ok:true};
      if(makeFav) res = await setFavoriteVenueRobust(name, true);
      else for(const f of matched){ res = await setFavoriteVenueRobust(f, false); if(!res.ok) break; }
      if(!res.ok){ toast('즐겨찾기 저장 실패: '+res.reason); return; }
      try{ populateVenuePresetSelect(); }catch(_){}
      renderMatchList();
      toast(makeFav ? '즐겨찾기에 추가했습니다.' : '즐겨찾기에서 해제했습니다.');
    });
  });
  listEl.querySelectorAll('.mc-loc-btn[data-venue]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const venueName = btn.dataset.venue;
      if(venueName) goToVenueOnMapTab(venueName);
    });
  });
  listEl.querySelectorAll('.mc-adopt-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const row = lastMatchRows.find(r=>String(r.id)===btn.dataset.rowId);
      if(row) adminAdoptMatchAsConfirmed(row);
    });
  });
  const moreBtn = $('#matchMoreBtn');
  if(moreBtn) moreBtn.addEventListener('click', ()=>{
    matchVisibleCount += MATCHES_PER_PAGE;
    renderMatchList();
  });
}

/* 경기탭 필터 바: index.html이 예전 버전이어도 새 1줄 필터가 나오도록, 없으면 여기서 만들어 교체합니다. */
function ensureMatchFilterBar(){
  if(document.getElementById('matchTimeSel')) return;
  const old1 = document.getElementById('matchFilterRow');
  if(!old1) return;
  const bar = document.createElement('div');
  bar.className = 'mf2'; bar.id = 'matchFilterRow';
  bar.innerHTML = `
    <label class="mf2-sel ${matchTimeFilter!=='all'?'on':''}"><select id="matchTimeSel" aria-label="시간대"><option value="all">전체 시간</option><option value="morning">오전</option><option value="afternoon">오후</option><option value="evening">저녁</option></select></label>
    <label class="mf2-sel ${matchFormatFilter!=='all'?'on':''}"><select id="matchFmtSel" aria-label="경기 형식"><option value="all">전체</option><option value="5">5:5</option><option value="6">6:6</option></select></label>
    <button type="button" class="mf2-fav" id="matchFavFilterBtn" title="관리자가 즐겨찾기한 경기장만 보기"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="m12 2.800 2.800 5.800 6.300.9-4.600 4.400 1.100 6.300L12 17.200l-5.600 3 1.100-6.300L2.900 9.500l6.300-.9z"/></svg></button>
    <span class="mf2-sp"></span>
    <button type="button" class="mf2-tg ${matchHideFull?'on':''}" id="matchHideFullBtn" aria-pressed="${matchHideFull}"><span>마감숨김</span><i></i></button>`;
  bar.querySelector('#matchTimeSel').value = matchTimeFilter;
  bar.querySelector('#matchFmtSel').value = matchFormatFilter;
  old1.replaceWith(bar);
  const old2 = document.getElementById('matchFormatFilterRow'); if(old2) old2.remove();
  document.querySelectorAll('.mt-meta .mf-hide-full').forEach(b=>b.remove());
}

function initMatchesTabOnce(){
  if(matchesTabInited) return;
  if(!$('#matchDateScroll')) return; // 아직 로그인 전 등, DOM이 없을 수 있음
  ensureMatchFilterBar();
  matchesTabInited = true;
  selectedMatchDate = todayStr();
  renderMatchDateScroller();
  loadMatchesForSelectedDate();

  $('#matchFilterRow').querySelectorAll('.mf-chip[data-filter-time]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      matchTimeFilter = btn.dataset.filterTime;
      matchVisibleCount = MATCHES_PER_PAGE;
      $('#matchFilterRow').querySelectorAll('.mf-chip[data-filter-time]').forEach(b=>b.classList.toggle('active', b===btn));
      renderMatchList();
    });
  });
  const timeSel = $('#matchTimeSel');
  if(timeSel) timeSel.addEventListener('change', ()=>{
    matchTimeFilter = timeSel.value; matchVisibleCount = MATCHES_PER_PAGE;
    timeSel.parentElement.classList.toggle('on', timeSel.value!=='all'); renderMatchList();
  });
  const fmtSel = $('#matchFmtSel');
  if(fmtSel) fmtSel.addEventListener('change', ()=>{
    matchFormatFilter = fmtSel.value; matchVisibleCount = MATCHES_PER_PAGE;
    fmtSel.parentElement.classList.toggle('on', fmtSel.value!=='all'); renderMatchList();
  });
  const favBtn = $('#matchFavFilterBtn');
  if(favBtn) favBtn.addEventListener('click', ()=>{
    matchFavOnly = !matchFavOnly;
    matchVisibleCount = MATCHES_PER_PAGE;
    favBtn.classList.toggle('active', matchFavOnly);
    renderMatchList();
  });
  const hideFullBtn = $('#matchHideFullBtn');
  if(hideFullBtn) hideFullBtn.addEventListener('click', ()=>{
    matchHideFull = !matchHideFull;
    matchVisibleCount = MATCHES_PER_PAGE;
    hideFullBtn.classList.toggle('active', matchHideFull);
    hideFullBtn.setAttribute('aria-pressed', String(matchHideFull));
    renderMatchList();
  });
  const formatRow = $('#matchFormatFilterRow');
  if(formatRow) formatRow.querySelectorAll('.mf-chip[data-filter-format]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      matchFormatFilter = btn.dataset.filterFormat;
      matchVisibleCount = MATCHES_PER_PAGE;
      formatRow.querySelectorAll('.mf-chip[data-filter-format]').forEach(b=>b.classList.toggle('active', b===btn));
      renderMatchList();
    });
  });
  const refreshBtn = $('#matchRefreshBtn');
  if(refreshBtn) refreshBtn.addEventListener('click', async ()=>{
    // GitHub Actions를 실행하는 게 아니라, Supabase에 이미 저장된 최신 데이터를 다시 조회만 합니다.
    refreshBtn.disabled = true;
    const orig = refreshBtn.textContent;
    refreshBtn.textContent = '불러오는 중...';
    matchVisibleCount = MATCHES_PER_PAGE;
    await loadMatchesForSelectedDate();
    refreshBtn.disabled = false;
    refreshBtn.textContent = orig;
    toast('최신 경기 정보를 불러왔습니다.');
  });
}

