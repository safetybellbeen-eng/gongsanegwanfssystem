/* ---------- 경기 진행 기록 (월별 확정 횟수 · 누적 진행 횟수) ---------- */
function computeMatchStats(){
  // appData.votes의 키는 (동점이 아닌 한) 확정된 경기 날짜만 존재합니다.
  const confirmedDates = Object.keys(appData.votes||{}).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && (appData.votes[d]||[]).length>0).sort();
  const todayS = todayStr();
  const played = confirmedDates.filter(d=>d<=todayS);
  const upcoming = confirmedDates.filter(d=>d>todayS);
  const byMonth = {};
  const byMonthDates = {};
  played.forEach(d=>{ const key=d.slice(0,7); byMonth[key]=(byMonth[key]||0)+1; (byMonthDates[key]=byMonthDates[key]||[]).push(d); });
  const months = Object.keys(byMonth).sort().reverse();
  Object.keys(byMonthDates).forEach(k=>byMonthDates[k].sort().reverse());
  return { totalPlayed: played.length, upcomingCount: upcoming.length, byMonth, byMonthDates, months };
}
function renderMatchStats(){
  renderHeroMatch();
  renderNoticeCard();
  tryRenderHomeTab();
  try{ const sm = document.getElementById('sectionMap'); if(sm && sm.classList.contains('mobile-active') && typeof loadDefaultMapVenue==='function') loadDefaultMapVenue(); }catch(e){}   // 데이터가 늦게 도착한 경우 지도 탭 기본 경기장 표시를 다시 시도
  try{ if(typeof refreshWeatherVerdict==='function') refreshWeatherVerdict(); }catch(e){}
  checkMatchConfirmedNotification();
  ensurePushSubscription();
  checkVoteDeadlineReminder();
  if(allVenuePinsPlaced) applyConfirmedVenueMarker();
  const el = $('#matchStatsCard');
  if(!el) return;
  const stats = computeMatchStats();
  const now = new Date();
  const thisMonthKey = todayStr().slice(0,7);
  const thisMonthCount = stats.byMonth[thisMonthKey] || 0;
  const bars = [];
  for(let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    bars.push({ key, label:(d.getMonth()+1)+'월', n: stats.byMonth[key]||0 });
  }
  const maxN = Math.max(1, ...bars.map(x=>x.n));
  el.innerHTML = `
    <div class="rec-card">
      <div class="rec-chart-top"><span>월별 진행 횟수</span><span>최근 6개월</span></div>
      <div class="rec-bars" id="recBars">
        ${bars.map(x=>`<div class="rb ${x.key===thisMonthKey?'on':''} ${x.n?'has':''}" data-month="${x.key}"><b>${x.n}</b><i style="height:${x.n? Math.max(10, Math.round(x.n/maxN*100)) : 4}%"></i></div>`).join('')}
      </div>
      <div class="rec-bar-labels">${bars.map(x=>`<span class="${x.key===thisMonthKey?'on':''}">${x.label}</span>`).join('')}</div>
      <div class="rec-stat3">
        <div><b>${stats.totalPlayed}</b><small>총 누적 경기</small></div>
        <div><b>${thisMonthCount}</b><small>이번 달</small></div>
        <div><b class="up">${stats.upcomingCount}</b><small>예정 경기</small></div>
      </div>
      <div class="stats-history" style="margin-top:12px;">
        <div class="stats-history-label">막대를 눌러 경기별 전술 보기</div>
        <div class="stats-history-dates" id="matchStatsDateList" style="display:none;"></div>
        <div id="matchStatsTacticsPreview"></div>
      </div>
    </div>
  `;
  window.__matchStatsData = stats;
  el.querySelectorAll('#recBars .rb').forEach(row=>{
    row.addEventListener('click', ()=>{
      const month = row.dataset.month;
      const dateListEl = $('#matchStatsDateList');
      const previewEl = $('#matchStatsTacticsPreview');
      const dates = stats.byMonthDates[month] || [];
      if(!dates.length){ toast('이 달에는 진행된 경기가 없습니다.'); return; }
      const alreadyOpenForThisMonth = dateListEl.dataset.month === month && dateListEl.style.display !== 'none';
      el.querySelectorAll('#recBars .rb').forEach(r=>r.classList.remove('sel'));
      if(alreadyOpenForThisMonth){
        dateListEl.style.display = 'none';
        previewEl.innerHTML = '';
        return;
      }
      row.classList.add('sel');
      dateListEl.dataset.month = month;
      dateListEl.style.display = 'flex';
      dateListEl.innerHTML = dates.map(d=>`<button type="button" class="smh-date-chip" data-date="${d}">${d}</button>`).join('');
      previewEl.innerHTML = '';
      dateListEl.querySelectorAll('.smh-date-chip').forEach(chip=>{
        chip.addEventListener('click', ()=>{
          dateListEl.querySelectorAll('.smh-date-chip').forEach(c=>c.classList.toggle('active', c===chip));
          renderTacticsMiniForDate(chip.dataset.date, previewEl);
        });
      });
    });
  });
}

/* ---------- 팀 기록: 내 기록 + 지표별 순위 카드(옆으로 넘김) ---------- */
function recRows(list, valFn, barFn, color){
  if(!list.length) return '<div class="rank-empty" style="display:block">아직 기록이 없습니다.</div>';
  return list.map((r,i)=>{
    const rk = i+1;
    const cls = rk===1?'g':rk===2?'s':rk===3?'b':'';
    return `<div class="rec-row ${r.name===myName?'me':''}"><span class="rk ${cls}">${rk}</span><span class="av" style="background:${memAvatarColor(r.name)}">${escapeHtml(r.name.charAt(0))}</span><span class="nm">${escapeHtml(r.name)}</span><span class="bar"><i style="width:${barFn(r)}%;${color?`background:${color}`:''}"></i></span><span class="val" ${color?`style="color:${color}"`:''}>${valFn(r)}</span></div>`;
  }).join('');
}
function renderTeamRecords(attendList, missList, noShowList, stats, missCounts){
  const mineEl = $('#recMine'), swipe = $('#recSwipe'), dots = $('#recDots');
  if(!mineEl || !swipe) return;
  const mine = stats[myName];
  const pct = mine && mine.total ? Math.round(mine.yes/mine.total*100) : 0;
  let ty=0, tt=0; Object.keys(stats).forEach(n=>{ ty+=stats[n].yes; tt+=stats[n].total; });
  const teamPct = tt? Math.round(ty/tt*100) : null;
  const myRank = attendList.findIndex(r=>r.name===myName);
  const diff = (mine && teamPct!==null) ? pct-teamPct : null;
  const diffTxt = diff===null ? '' : `팀 평균보다 ${diff>=0?'+':''}${diff}%p`;
  mineEl.innerHTML = `
    <div class="rec-me">
      <div class="rec-ring" style="background:conic-gradient(#b6f23a 0 ${pct}%,#1d2a31 0)"><i>${mine?pct+'%':'-'}</i></div>
      <div class="rec-me-tx">
        <b>${escapeHtml(myName||'')}</b>
        <div>참석 <em class="g">${mine?mine.yes:0}회</em>${myRank>=0?` · 팀 ${myRank+1}위`:''}</div>
        <div>미투표 <em class="y">${(missCounts&&missCounts[myName])||0}회</em> · 불참 <em class="r">${mine?mine.no:0}회</em></div>
        ${diffTxt?`<small>${diffTxt}</small>`:'<small>참석 기록이 아직 없어요</small>'}
      </div>
    </div>`;
  const maxMiss = (missList[0]&&missList[0].missed)||1, maxNo = (noShowList[0]&&noShowList[0].no)||1;
  swipe.innerHTML = `<div class="rec-slide">
    <div class="rec-card rec-pane"><div class="rec-pt g">🏅 참석 순위 <small>· 횟수 · 참석률</small></div>${recRows(attendList, r=>`${r.yes}회<small>${r.total?Math.round(r.yes/r.total*100):0}%</small>`, r=>r.total?Math.round(r.yes/r.total*100):0)}</div></div>
    <div class="rec-slide"><div class="rec-card rec-pane"><div class="rec-pt y">미투표 순위 <small>· 적을수록 좋아요</small></div>${recRows(missList, r=>r.missed+'회', r=>Math.round(r.missed/maxMiss*100), '#ffb020')}</div></div>
    <div class="rec-slide"><div class="rec-card rec-pane"><div class="rec-pt r">불참 순위</div>${recRows(noShowList, r=>r.no+'회', r=>Math.round(r.no/maxNo*100), '#ff8f8f')}</div></div>`;
  dots.innerHTML = '<i class="on"></i><i></i><i></i>';
  const fitSwipe = ()=>{
    const panes = swipe.querySelectorAll('.rec-pane');
    const i = Math.min(panes.length-1, Math.round(swipe.scrollLeft / Math.max(1, swipe.clientWidth)));
    const h = panes[i] ? panes[i].offsetHeight : 0;
    swipe.style.height = h > 0 ? h + 'px' : '';
  };
  swipe.__fit = fitSwipe; fitSwipe(); setTimeout(fitSwipe, 120);
  if(window.ResizeObserver){ if(swipe.__ro) swipe.__ro.disconnect(); swipe.__ro = new ResizeObserver(()=>fitSwipe()); swipe.querySelectorAll('.rec-pane').forEach(p=>swipe.__ro.observe(p)); }
  if(!swipe.__bound){
    swipe.__bound = true;
    swipe.addEventListener('scroll', ()=>{
      const i = Math.round(swipe.scrollLeft / Math.max(1, swipe.clientWidth));
      dots.querySelectorAll('i').forEach((d,k)=>d.classList.toggle('on', k===i));
      if(swipe.__fit) swipe.__fit();
      clearTimeout(swipe.__snapT);
      swipe.__snapT = setTimeout(()=>{ const k = Math.round(swipe.scrollLeft / Math.max(1, swipe.clientWidth)); const target = k*swipe.clientWidth; if(Math.abs(swipe.scrollLeft-target) > 2) swipe.scrollTo({ left: target, behavior:'smooth' }); }, 140);
    }, {passive:true});
    dots.addEventListener('click', e=>{
      const d = e.target.closest('i'); if(!d) return;
      const k = [...dots.children].indexOf(d);
      swipe.scrollTo({ left: k*swipe.clientWidth, behavior:'smooth' });
    });
  }
}

/* 최상단 히어로 카드: 오늘 이후로 가장 가까운 확정 경기를 D-day와 함께 보여줍니다. */
function renderHeroMatch(){
  try{ if(memSheetDate) setTimeout(renderMembersSheet,0); }catch(e){}
  const el = $('#heroMatchCard');
  if(!el) return;
  const todayS = todayStr();
  const confirmedDates = Object.keys(appData.votes||{})
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=todayS && (appData.votes[d]||[]).length>0)
    .sort();
  if(!confirmedDates.length){
    el.className = 'hero-match-card empty';
    el.innerHTML = '아직 확정된 예정 경기가 없습니다.<br>캘린더에서 주간 투표를 진행해 보세요.';
    return;
  }
  const date = confirmedDates[0];
  const dObj = parseYMD(date);
  const diffDays = Math.round((dObj - parseYMD(todayS)) / 86400000);
  const ddayLabel = diffDays===0 ? 'D-DAY' : `D-${diffDays}`;
  // 관리자가 "실제 참석 체크"나 이 카드에서 직접 인원을 추가/제외했으면 그 결과를 우선 사용합니다.
  const effVotes = getEffectiveVotesForDate(date);
  const yesList = effVotes.filter(v=>v.choice==='yes');
  const guestNames = (appData.matchGuests && appData.matchGuests[date]) || [];
  const venue = getVenueInfo(date);
  const approvedTotal = getApprovedNonAdminNames().length;
  const totalAttending = yesList.length + guestNames.length;
  const admin = isAdminUser();

  const avatarPalette = ['#3ddc84','#6db8ff','#ffd76b','#ff8fa3','#c9a0ff','#ff9d5c'];
  const avatarColor = (name)=>{
    let h=0; for(let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) % avatarPalette.length;
    return avatarPalette[h];
  };
  const maxShow = 5;
  const rosterAll = [...yesList.map(v=>({name:v.name,g:false})), ...guestNames.map(n=>({name:n,g:true}))];
  const rosterShow = rosterAll.slice(0,6), rosterMore = rosterAll.length - rosterShow.length;
  const rosterHtml = `<div class="nm3-roster" title="${escapeHtml(rosterAll.map(p=>p.name).join(', '))}">`
    + (rosterAll.length
      ? `<div class="nm3-av">${rosterShow.map(p=>`<span class="${p.g?'g':''}" style="background:${avatarColor(p.name)}">${escapeHtml(p.name.charAt(0))}</span>`).join('')}${rosterMore>0?`<span class="more">+${rosterMore}</span>`:''}</div><b>참석 ${rosterAll.length}명</b>`
      : `<b class="none">아직 참석자가 없어요</b>`)
    + `<button type="button" class="nm3-mb" id="heroMembersBtn">멤버 보기 ›</button></div>`;
  const attendeeChips = [
    ...yesList.map(v=>({ name:v.name, isGuest:false })),
    ...guestNames.map(n=>({ name:n, isGuest:true }))
  ];
  const shown = attendeeChips.slice(0, maxShow);
  const overflow = attendeeChips.length - shown.length;
  const avatarsHtml = shown.map(p=>`<div class="avatar-circle ${p.isGuest?'guest':''}" style="background:${avatarColor(p.name)};" title="${escapeHtml(p.name)}${p.isGuest?' (용병)':''}">${escapeHtml(p.name.charAt(0))}</div>`).join('')
    + (overflow>0 ? `<div class="avatar-circle more">+${overflow}</div>` : '');

  // 관리자만: 참석 인원 옆에 제외(✕) 버튼, 그리고 갑자기 오게 된 사람을 추가하는 선택창을 보여줍니다.
  // 여기서 뺀/더한 결과는 팀 순위(참여횟수)에도 그대로 반영됩니다.
  const attendeeNames = new Set(yesList.map(v=>v.name));
  const notAttendingApproved = getApprovedNonAdminNames().filter(n=>!attendeeNames.has(n));
  const adminAddControl = admin ? `
    <div class="hero-admin-add-row">
      <select id="heroAddAttendeeSelect">
        <option value="">갑자기 오는 인원 추가...</option>
        ${notAttendingApproved.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}
      </select>
      <button id="heroAddAttendeeBtn">추가</button>
    </div>
  ` : '';

  el.className = 'hero-match-card';
  const svgI = (d)=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const timeText = venue && venue.time ? ` ${escapeHtml(String(venue.time).slice(0,5))}` : '';
  el.innerHTML = `
    <div class="nm-body nm-c nm-photo3" id="nmBody">
      <div class="nm3-top">
        <span class="nm3-chip">다음 경기${venue && (venue.format==='5'||venue.format==='6') ? ' · ' + venue.format + ':' + venue.format : ''}</span>
        <span class="nm3-dd">${ddayLabel}</span>
      </div>
      <div class="nm3-main">
        <div class="nm3-date">${dObj.getMonth()+1}월 ${dObj.getDate()}일<em>${weekdayKR[dObj.getDay()]}요일${venue && venue.time ? ' ' + escapeHtml(String(venue.time).slice(0,5)) : ''}</em></div>
        <div class="nm3-venue">${svgI('<path d="M12 22s7.5-6.6 7.5-12.3A7.5 7.5 0 0 0 4.5 9.7C4.5 15.4 12 22 12 22z"/><circle cx="12" cy="9.8" r="2.6"/>')}<span>${venue ? escapeHtml(String(venue.name).replace(/^플랩\s*스타디움\s+/,'')) : '경기장 미등록'}</span></div>
        ${rosterHtml}
        <div class="nm3-act">
          ${venue && venue.link ? `<button type="button" class="hero-link-btn" id="heroLinkBtn" data-link="${escapeHtml(venue.link)}">경기 링크 ›</button>` : ''}
          <button type="button" class="hero-alert-btn" id="heroAlertBtn">${svgI('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>')}경기 알림</button>
          ${venue ? `<button type="button" class="hero-pin-btn" id="heroPinBtn" aria-label="경기장 위치" title="경기장 위치 보기">${svgI('<path d="M12 22s7.5-6.6 7.5-12.3A7.5 7.5 0 0 0 4.5 9.7C4.5 15.4 12 22 12 22z"/><circle cx="12" cy="9.8" r="2.6"/>')}</button>` : ''}
          ${venue ? `<button type="button" class="hero-share-btn" id="heroShareBtn" aria-label="공유" title="공유">${svgI('<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.8 7.4-4.300M8.3 13.200l7.400 4.300"/>')}</button>` : ''}
        </div>
      </div>
    </div>
    ${admin ? `
    <details class="nm-admin">
      <summary>관리자: 참석 인원 관리 (${totalAttending}/${approvedTotal}명)</summary>
      <div class="hero-attendee-list">${attendeeChips.length? attendeeChips.map(p=>`<span class="nv-chip">${escapeHtml(p.name)}${p.isGuest?' <span class="guest-tag">용병</span>':''} <button class="chip-remove-btn" data-name="${escapeHtml(p.name)}" data-guest="${p.isGuest?'1':'0'}" title="제외">✕</button></span>`).join('') : '<span class="nv-empty">아직 참석자가 없습니다</span>'}</div>
      ${adminAddControl}
    </details>` : ''}
  `;
  /* 카드를 누르면 그 경기가 속한 주의 출석 화면으로 이동합니다 */
  const nmBody = document.getElementById('nmBody');
  if(nmBody) nmBody.addEventListener('click', (e)=>{
    if(e.target.closest('#heroLinkBtn, #heroShareBtn, #heroAlertBtn, #heroMembersBtn, .nm3-av')) return;
    setActiveMobileSection('calendar');
    if(typeof setAttendPane==='function') setAttendPane('vote');
    if(typeof setSelectedDate==='function') setSelectedDate(date);
  });
  const linkBtn = $('#heroLinkBtn');
  if(linkBtn){
    linkBtn.addEventListener('click', ()=>{
      window.open(linkBtn.dataset.link, '_blank', 'noopener');
    });
  }
  const alertBtn = $('#heroAlertBtn');
  if(alertBtn){
    alertBtn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      const vn = venue ? String(venue.name).replace(/^플랩\s*스타디움\s+/,'') : '';
      const when = `${dObj.getMonth()+1}월 ${dObj.getDate()}일(${weekdayKR[dObj.getDay()]})${venue && venue.time ? ' ' + String(venue.time).slice(0,5) : ''}`;
      const targets = yesList.map(v=>v.name);
      if(!targets.length){ toast('이 경기 참석자가 아직 없어 알림을 보낼 대상이 없습니다.'); return; }
      if(!confirm(`이 경기 참석자 ${targets.length}명에게 경기 알림을 보낼까요?\n\n${when}\n${vn}\n\n대상: ${targets.join(', ')}`)) return;
      alertBtn.disabled = true;
      try{
        const r = await sendMatchAlert('⚽ 공생관 경기 알림', `${when} · ${vn}${myName ? ' (' + myName + ')' : ''}`, { kind:'match', targets });
        toast(r);
      }finally{ alertBtn.disabled = false; }
    });
  }
  const pinBtn = $('#heroPinBtn');
  if(pinBtn){
    pinBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const vname = venue ? String(venue.name) : '';
      if(!vname) return;
      mapDefaultLoaded = true; // 지도 탭의 기본 경기장 자동 표시와 겹치지 않도록
      setActiveMobileSection('map');
      const inp = $('#venueInput'); if(inp) inp.value = vname;
      const sel = $('#venuePresetSelect'); if(sel) sel.value = findVenuePreset(vname) ? findVenuePreset(vname).name : '';
      lookupVenueOnMap();
    });
  }
  const shareBtn = $('#heroShareBtn');
  if(shareBtn){
    shareBtn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      const vn = venue ? String(venue.name) : '';
      const text = `${vn}\n${dObj.getMonth()+1}월 ${dObj.getDate()}일 (${weekdayKR[dObj.getDay()]})${venue && venue.time ? ' ' + String(venue.time).slice(0,5) : ''}${venue && (venue.format==='5'||venue.format==='6') ? ' · ' + venue.format + ':' + venue.format : ''}`;
      const url = venue && venue.link ? venue.link : '';
      if(navigator.share){
        try{ await navigator.share(url ? { title:'풋살 경기 공유', text, url } : { title:'풋살 경기 공유', text }); }
        catch(err){ if(err && err.name !== 'AbortError') toast('공유하지 못했습니다.'); }
        return;
      }
      const full = url ? text + '\n' + url : text;
      try{ await navigator.clipboard.writeText(full); toast('경기 정보를 복사했습니다. 카카오톡에 붙여넣어 보내세요.'); }
      catch(_){ window.prompt('아래 내용을 복사해 카카오톡에 붙여넣어 보내세요.', full); }
    });
  }
  const memBtn = $('#heroMembersBtn');
  if(memBtn) memBtn.addEventListener('click', ()=>openMembersSheet(date));
  const memAv = el.querySelector('.nm3-av');
  if(memAv){ memAv.style.cursor='pointer'; memAv.addEventListener('click', ()=>openMembersSheet(date)); }
  if(admin){
    el.querySelectorAll('.chip-remove-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if(btn.dataset.guest==='1') adminRemoveMatchGuest(date, btn.dataset.name);
        else adminModifyAttendance(date, btn.dataset.name, 'remove');
      });
    });
    const addBtn = $('#heroAddAttendeeBtn');
    if(addBtn) addBtn.addEventListener('click', ()=>{
      const sel = $('#heroAddAttendeeSelect');
      if(sel && sel.value) adminModifyAttendance(date, sel.value, 'add');
    });
  }
}

/* 확정 경기에서 관리자가 인원을 직접 추가/제외합니다 (선수가 갑자기 못 오거나, 갑자기 오게 된 경우).
   내부적으로는 "실제 참석 체크"와 같은 데이터(actualAttendance)를 사용해서, 팀 순위의 참여횟수 집계에도
   바로 반영됩니다. */
async function adminModifyAttendance(date, name, action){
  if(!requireAdmin()) return;
  await mutateAppData(data=>{
    const approvedNames = Object.keys(data.members||{}).filter(n=>data.members[n].approved && n!==ADMIN_NAME);
    const existing = data.actualAttendance && data.actualAttendance[date];
    let current = (existing && existing.finalized)
      ? [...existing.attendees]
      : (data.votes[date]||[]).filter(v=>v.choice==='yes').map(v=>v.name).filter(n=>approvedNames.includes(n));
    const existingGuests = (existing && existing.finalized) ? (existing.guests||[]) : ((data.matchGuests && data.matchGuests[date]) || []);
    if(action==='remove'){ current = current.filter(n=>n!==name); }
    else if(!current.includes(name)){ current.push(name); }
    if(!data.actualAttendance) data.actualAttendance = {};
    data.actualAttendance[date] = { attendees: current, guests: existingGuests, finalized: true, savedAt: Date.now() };
  });
  renderMatchStats();
  computeAttendanceStats();
  toast(action==='remove' ? `'${name}' 님을 참석 명단에서 제외했습니다.` : `'${name}' 님을 참석 명단에 추가했습니다.`);
}
/* 홈 카드에서 용병을 바로 제외할 때 사용 (사전 등록된 용병 명단과 확정된 실제 참석 명단 둘 다 갱신) */
async function adminRemoveMatchGuest(date, name){
  if(!requireAdmin()) return;
  await mutateAppData(data=>{
    if(data.matchGuests && data.matchGuests[date]){
      data.matchGuests[date] = data.matchGuests[date].filter(n=>n!==name);
      if(!data.matchGuests[date].length) delete data.matchGuests[date];
    }
    const existing = data.actualAttendance && data.actualAttendance[date];
    if(existing && existing.finalized){
      existing.guests = (existing.guests||[]).filter(n=>n!==name);
    }
  });
  renderMatchStats();
  toast(`'${name}' 님(용병)을 참석 명단에서 제외했습니다.`);
}

/* 관리자가 등록한 공지사항 1건을 표시합니다. */
function renderNoticeCard(){
  const el = $('#noticeCard');
  if(!el) return;
  const notice = appData.notice;
  if(!notice || (!notice.title && !notice.body)){
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  const dateStr = notice.updatedAt ? new Date(notice.updatedAt).toLocaleDateString('ko-KR').replace(/\. /g,'.').replace(/\.$/,'') : '';
  el.innerHTML = `
    <div class="nc-top"><span class="nc-tag"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M3 10v4a1 1 0 0 0 1 1h2l5 4V5L6 9H4a1 1 0 0 0-1 1z"/><path d="M14 8.500a4.500 4.500 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>공지사항</span><span class="nc-title">${escapeHtml(notice.title||'공지사항')}</span><span class="nc-chevron">›</span></div>
    ${notice.body?`<div class="nc-body">${escapeHtml(notice.body)}</div>`:''}
    ${dateStr?`<div class="nc-date">${dateStr}</div>`:''}
  `;
  // 모바일에서는 제목 한 줄만 보이고, 카드를 누르면 본문이 펼쳐집니다.
  el.onclick = ()=>el.classList.toggle('open');
}

function renderGenericRankList(listSel, emptySel, list, metricKey, unit){
  const rankList = $(listSel);
  const rankEmpty = $(emptySel);
  if(!rankList) return;
  if(!list.length){ if(rankEmpty) rankEmpty.style.display='block'; rankList.innerHTML=''; return; }
  if(rankEmpty) rankEmpty.style.display='none';
  const maxV = list[0][metricKey] || 1;
  const rest = list.slice(3);
  if(!rest.length){ rankList.innerHTML = '<div class="rank-empty">4위 이하 기록이 아직 없습니다.</div>'; return; }
  rankList.innerHTML = rest.map((r,i)=>`
    <div class="rank-row">
      <div class="no">${i+4}</div>
      <div class="name">${escapeHtml(r.name)}</div>
      <div class="bar-wrap"><div class="bar" style="width:${Math.round((r[metricKey]/maxV)*100)}%;"></div></div>
      <div class="pct">${r[metricKey]}${unit||''}</div>
    </div>
  `).join('');
}
function renderGenericPodium(sel, list, metricKey, metricLabel, unit){
  const podium = $(sel);
  if(!podium) return;
  if(!list.length){ podium.innerHTML=''; return; }
  const order = [1,0,2]; // 2등-1등-3등 순서로 배치
  const classes = ['silver','gold','bronze'];
  const medals = ['🥈','🥇','🥉'];
  podium.innerHTML = order.map((idx,pos)=>{
    const r = list[idx];
    if(!r) return '';
    return `
      <div class="podium-col ${classes[pos]}">
        <div class="medal">${medals[pos]}</div>
        <div class="pname">${escapeHtml(r.name)}</div>
        <div class="prate">${metricLabel} ${r[metricKey]}${unit||''}</div>
        <div class="bar">${idx+1}위</div>
      </div>
    `;
  }).join('');
}
$('#rankRefresh').addEventListener('click', async ()=>{
  const btn = $('#rankRefresh');
  btn.classList.add('spinning');
  await loadAppData();
  computeAttendanceStats();
  renderMatchStats();
  btn.classList.remove('spinning');
  toast('참석 횟수 순위를 새로고침했습니다.');
});


(function(){ const b=document.getElementById('recBackBtn'); if(b) b.addEventListener('click', ()=>setActiveMobileSection('home')); })();
