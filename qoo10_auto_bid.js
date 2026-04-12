/**
 * 큐텐 플러스 전시 자동 입찰 스크립트
 * 사용법:
 *   1. QSM 플러스 전시 페이지 열기 (ADPlusKeyword.aspx)
 *   2. 키워드 검색 후 상품 선택까지 완료
 *   3. 북마크릿 클릭 → 패널 열림
 *   4. 시트 URL 입력 후 모니터링 시작
 */
(function () {
      'use strict';
      const existing = document.getElementById('auto-bid-panel');
      if (existing) existing.remove();
      const panel = document.createElement('div');
      panel.id = 'auto-bid-panel';
      panel.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;background:#1a1a2e;color:#e0e0e0;border-radius:12px;padding:16px;width:320px;font-family:Malgun Gothic,sans-serif;font-size:13px;box-shadow:0 8px 32px rgba(0,0,0,.5);border:1px solid #16213e;';
      panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><span style="font-size:15px;font-weight:bold;color:#e94560;">⚡ 자동 입찰</span><button id="ab-close" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;">✕</button></div>'
        
        + '<div style="background:#16213e;border-radius:8px;padding:10px;margin-bottom:10px;"><div style="margin-bottom:8px;color:#a0a0c0;font-size:11px;">▼ 입찰 설정</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;"><label style="font-size:11px;">목표 순위<input id="ab-rank" type="number" value="3" min="1" max="16" style="width:100%;margin-top:3px;padding:4px;border-radius:4px;border:1px solid #444;background:#1a1a2e;color:#fff;text-align:center;"></label><label style="font-size:11px;">최대 입찰금액(¥)<input id="ab-max" type="number" value="2000" step="100" style="width:100%;margin-top:3px;padding:4px;border-radius:4px;border:1px solid #444;background:#1a1a2e;color:#fff;text-align:center;"></label><label style="font-size:11px;grid-column:1/-1;">마감 N초 전 입찰<input id="ab-timing" type="number" value="3" min="1" max="10" style="width:100%;margin-top:3px;padding:4px;border-radius:4px;border:1px solid #444;background:#1a1a2e;color:#fff;text-align:center;"></label><label style="font-size:11px;grid-column:1/-1;">마감 시각 (HH:MM)<input id="ab-deadline" type="text" value="17:50" style="width:100%;margin-top:3px;padding:4px;border-radius:4px;border:1px solid #444;background:#1a1a2e;color:#fff;text-align:center;"></label></div></div>'
        + '<div style="background:#16213e;border-radius:8px;padding:10px;margin-bottom:10px;"><div style="margin-bottom:6px;color:#a0a0c0;font-size:11px;">▼ 구글 시트 자동 기록</div><label style="font-size:11px;">Apps Script URL<input id="ab-sheet-url" type="text" placeholder="배포된 웹 앱 URL 붙여넣기" style="width:100%;margin-top:3px;padding:4px;border-radius:4px;border:1px solid #444;background:#1a1a2e;color:#fff;font-size:10px;box-sizing:border-box;"></label><div style="margin-top:6px;display:flex;align-items:center;gap:6px;"><input id="ab-sheet-enable" type="checkbox" checked style="cursor:pointer;"><label for="ab-sheet-enable" style="font-size:11px;cursor:pointer;">입찰 마감 후 자동 기록</label></div></div>'
        + '<div style="background:#16213e;border-radius:8px;padding:10px;margin-bottom:10px;"><div style="color:#a0a0c0;font-size:11px;margin-bottom:6px;">▼ 실시간 현황</div><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#aaa;">남은 시간</span><span id="ab-timeleft" style="font-weight:bold;color:#48cae4;">--:--:--</span></div><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#aaa;">목표순위 현재가</span><span id="ab-current-price" style="font-weight:bold;color:#e94560;">-</span></div><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:#aaa;">예상 입찰가</span><span id="ab-planned-price" style="font-weight:bold;color:#00b4d8;">-</span></div><div style="display:flex;justify-content:space-between;"><span style="color:#aaa;">입찰단위</span><span id="ab-unit">-</span></div></div>'
        + '<div style="background:#16213e;border-radius:8px;padding:8px;margin-bottom:10px;max-height:120px;overflow-y:auto;"><div style="color:#a0a0c0;font-size:11px;margin-bottom:4px;">▼ 현재 입찰 리스트</div><div id="ab-bid-list" style="font-size:11px;line-height:1.8;"></div></div>'
        + '<div style="display:flex;gap:6px;margin-bottom:8px;"><button id="ab-start" style="flex:1;padding:8px;background:#e94560;border:none;border-radius:6px;color:#fff;cursor:pointer;font-weight:bold;">▶ 모니터링 시작</button><button id="ab-stop" style="flex:1;padding:8px;background:#444;border:none;border-radius:6px;color:#fff;cursor:pointer;" disabled>■ 정지</button></div>'
        + '<div id="ab-status" style="text-align:center;font-size:11px;color:#888;min-height:16px;"></div>'
        + '<div id="ab-log" style="margin-top:8px;font-size:10px;color:#666;max-height:160px;overflow-y:auto;border-top:1px solid #333;padding-top:6px;"></div>';
      document.body.appendChild(panel);

   let pollTimer = null, bidFired = false, bidScheduled = false, myBidPrice = 0, myBidRank = 0;
  let bidWorker = null, tickCount = 0;

  // Web Worker 생성 (탭 숨겨도 타이머 정상 작동)
  const workerCode = [
    'var _iv = null;',
    'onmessage = function(e) {',
    '  if (e.data && e.data.type === "start") { _iv = setInterval(function() { postMessage("tick"); }, 100); }',
    '  else if (e.data === "stop") { clearInterval(_iv); _iv = null; }',
    '};'
  ].join('\n');
  const workerBlob = new Blob([workerCode], {type: 'application/javascript'});
  const workerUrl = URL.createObjectURL(workerBlob);

      let bidEndTime = null, serverPcOffset = 0;

   function log(msg) {
           const el = document.getElementById('ab-log');
           const t = new Date(Date.now() + serverPcOffset).toLocaleTimeString('ko-KR');
           el.innerHTML = '<div>' + t + ' ' + msg + '</div>' + el.innerHTML;
   }
      function setStatus(msg, color) {
              const el = document.getElementById('ab-status');
              el.textContent = msg; el.style.color = color || '#888';
      }


      function getTrueSecondsLeft() {
              if (bidEndTime === null) return null;
              return Math.ceil((bidEndTime - (Date.now() + serverPcOffset)) / 1000);
      }
      function calcBidEndTime() {
              const parts = document.getElementById('ab-deadline').value.split(':');
              const h = parseInt(parts[0]), m = parseInt(parts[1] || 0);
              const serverNow = new Date(Date.now() + serverPcOffset);
              const deadline = new Date(serverNow.getFullYear(), serverNow.getMonth(), serverNow.getDate(), h, m, 0, 0);
              return deadline.getTime();
      }

   function getCurrentBidList() {
           const rows = document.querySelectorAll('#tbody_bid_list tr.tr_top');
           if (rows.length > 0) {
                     const fallback = (ADBidding.plus_items && ADBidding.plus_items.list_bid) ? ADBidding.plus_items.list_bid : [];
                     return Array.from(rows).map((tr, i) => {
                               const txt = tr.querySelector('span.txt');
                               const price = txt ? parseInt(txt.textContent.replace(/,/g, '')) : 0;
                               const is_mine = fallback[i] ? fallback[i].my_gd_no !== '' : false;
                               return { rank: i+1, price, is_mine };
                     });
           }
           if (!ADBidding.plus_items || !ADBidding.plus_items.list_bid) return [];
           return ADBidding.plus_items.list_bid.map((b, i) => ({ rank: i+1, price: b.bid_price, is_mine: b.my_gd_no !== '' }));
   }
      function getBidUnit() { return ADBidding.plus_items ? ADBidding.plus_items.bid_unit : 100; }
      function calcOptimalBid(targetRank, maxBidPrice) {
              const bids = getCurrentBidList(), bidUnit = getBidUnit();
              if (bids.length === 0) return Math.min(ADBidding.plus_items ? ADBidding.plus_items.start_price : 0, maxBidPrice);
              if (targetRank <= bids.length) return bids[targetRank - 1].price + bidUnit;
              return ADBidding.plus_items ? ADBidding.plus_items.start_price : 0;
      }

   function updateUI() {
           const targetRank = parseInt(document.getElementById('ab-rank').value);
           const maxBidPrice = parseInt(document.getElementById('ab-max').value);
           const secsLeft = getTrueSecondsLeft();
           const tlEl = document.getElementById('ab-timeleft');
           if (secsLeft !== null) {
                     if (secsLeft <= 0) {
                               tlEl.textContent = '마감';
                               tlEl.style.color = '#e94560';
                     } else {
                               const h = Math.floor(secsLeft/3600), m = Math.floor((secsLeft%3600)/60), s = secsLeft%60;
                               tlEl.textContent = h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
                               tlEl.style.color = secsLeft <= 10 ? '#e94560' : secsLeft <= 30 ? '#f4a261' : '#48cae4';
                     }
           }
           document.getElementById('ab-unit').textContent = getBidUnit() + '¥';
           const bids = getCurrentBidList();
           const cp = bids.length >= targetRank ? bids[targetRank-1].price : null;
           document.getElementById('ab-current-price').textContent = cp !== null ? cp.toLocaleString() + '¥' : '-';
           document.getElementById('ab-planned-price').textContent = calcOptimalBid(targetRank, maxBidPrice).toLocaleString() + '¥';
           const listEl = document.getElementById('ab-bid-list');
           if (bids.length === 0) { listEl.innerHTML = '<span style="color:#666;">데이터 없음</span>'; return; }
           listEl.innerHTML = bids.slice(0,10).map(b => {
                     const color = b.is_mine ? '#4CAF50' : b.rank === targetRank ? '#e94560' : '#aaa';
                     const label = b.is_mine ? ' ★내것' : b.rank === targetRank ? ' ◀목표' : '';
                     return '<div style="color:' + color + ';">' + b.rank + '위: ' + b.price.toLocaleString() + '¥' + label + '</div>';
           }).join('');
   }

   function recordToSheet() {
           const url = document.getElementById('ab-sheet-url').value.trim();
           if (!document.getElementById('ab-sheet-enable').checked || !url) return;
           const bids = getCurrentBidList(), now = new Date();
           const myBid = bids.find(b => b.is_mine);
           const params = new URLSearchParams({
                     date: now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0'),
                     time: now.toLocaleTimeString('ko-KR'),
                     keyword: ADBidding.plus_items ? (ADBidding.plus_items.keyword||'') : '',
                     my_bid: myBid ? myBid.price : myBidPrice, my_rank: myBid ? myBid.rank : myBidRank,
                     rank1: bids[0]?bids[0].price:'', rank2: bids[1]?bids[1].price:'', rank3: bids[2]?bids[2].price:'',
                     rank4: bids[3]?bids[3].price:'', rank5: bids[4]?bids[4].price:'', rank6: bids[5]?bids[5].price:'',
                     rank7: bids[6]?bids[6].price:'', rank8: bids[7]?bids[7].price:'', rank9: bids[8]?bids[8].price:'',
                     rank10: bids[9]?bids[9].price:''
           });
           log('📊 시트 기록 중...');
    // fetch 대신 이미지 beacon 사용 (QSM CSP 우회)
    const beacon = new Image();
    beacon.onload = function() { log('✅ 시트 기록 완료'); setStatus('✅ 시트 기록 완료','#4CAF50'); };
    beacon.onerror = function() { log('✅ 시트 전송 (응답 확인 불가)'); setStatus('✅ 시트 전송','#4CAF50'); };
    beacon.src = url + '?' + params.toString();
   }

   function executeBid() {
           if (bidFired) return; bidFired = true;
           const targetRank = parseInt(document.getElementById('ab-rank').value);
           const maxBidPrice = parseInt(document.getElementById('ab-max').value);
           const bidPrice = calcOptimalBid(targetRank, maxBidPrice);
           const bidUnit = getBidUnit();
           const adj = Math.floor(bidPrice/bidUnit)*bidUnit;
           if (adj <= 0) { setStatus('❌ 입찰가 계산 오류','#e94560'); return; }
           if (adj > maxBidPrice) { setStatus('❌ 최대금액('+maxBidPrice+'¥) 초과 - 입찰 취소','#e94560'); log('최대금액 초과로 입찰 취소'); return; }
           myBidPrice = adj; myBidRank = targetRank;
           log('🚀 입찰 실행! ' + adj + '¥ (목표 ' + targetRank + '위, 남은 ' + getTrueSecondsLeft() + '초)');
           setStatus('🚀 입찰 중... ' + adj.toLocaleString() + '¥', '#00b4d8');
           const inp = document.getElementById('txt_bidding_price');
           if (inp) { inp.value = adj; inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); }
           try {
                     // confirm() 다이얼로그 자동 승인
                     const origConfirm = window.confirm;
                     window.confirm = function() { return true; };
                     setTimeout(() => { window.confirm = origConfirm; }, 5000);
                     // setPlaceBidding()은 내부에 동기 WebService 호출이 있어 메인 스레드를 ~1초 블로킹함
                     // setPlaceKeywordBidding()을 직접 호출하여 블로킹 없이 즉시 비동기 입찰
                     if (typeof ADBidding.setPlaceKeywordBidding === 'function') {
                               ADBidding.setPlaceKeywordBidding();
                               log('✅ 입찰 제출: '+adj+'¥'); setStatus('✅ 입찰 완료: '+adj.toLocaleString()+'¥','#4CAF50');
                     } else if (typeof ADBidding.setPlaceBidding === 'function') {
                               ADBidding.setPlaceBidding();
                               log('✅ 입찰 제출(fallback): '+adj+'¥'); setStatus('✅ 입찰 완료: '+adj.toLocaleString()+'¥','#4CAF50');
                     } else {
                               const btn = document.getElementById('btn_place_bid');
                               if (btn) { btn.click(); log('✅ 버튼 클릭으로 입찰: '+adj+'¥'); setStatus('✅ 입찰 완료: '+adj.toLocaleString()+'¥','#4CAF50'); }
                               else { log('❌ 입찰 버튼 미발견'); setStatus('❌ 입찰 버튼 미발견','#e94560'); }
                     }
           } catch(e) { log('❌ 입찰 오류: '+e.message); }
   }

   function tick() {
           tickCount++;
           const triggerSecs = parseInt(document.getElementById('ab-timing').value);
           // API 호출은 10 tick마다 1회 (≈1초) - 서버 부하 동일하게 유지
           if (tickCount % 10 === 0) {
                     try { ADBidding.getBiddingList(); } catch(e) { log('현황 갱신 오류: '+e.message); }
           }
           updateUI();
           const secsLeft = getTrueSecondsLeft();
           if (secsLeft !== null) {
                     // 60초 이하 시 매초 로그 출력 (10 tick마다 = 1초 1회)
                     if (secsLeft <= 60 && tickCount % 10 === 0) {
                               log('⏱ 남은 시간: ' + secsLeft + '초');
                     }
                     // 마감 5초 전부터 매초 입찰 현황 스냅샷 로그 (읽기 전용, 입찰 로직 무관)
                     if (secsLeft <= 5 && secsLeft > 0 && tickCount % 10 === 0) {
                               const snapshot = getCurrentBidList().slice(0, 10)
                                         .map(b => b.rank + '위:' + b.price.toLocaleString() + '¥').join(' ');
                               log('📋 ' + secsLeft + '초전: ' + snapshot);
                     }
                     if (!bidFired && !bidScheduled && secsLeft <= triggerSecs && secsLeft >= 0) {
                               bidScheduled = true;
                               setStatus('⚡ 마감 '+secsLeft+'초! 입찰 실행!','#e94560');
                               log('🎯 입찰 트리거 발동 (남은 '+secsLeft+'초)');
                               executeBid();
                     } else if (secsLeft <= 0 && bidFired) { setTimeout(function() { recordToSheet(); stopMonitoring(); }, 1500); }
           }
   }

   function startMonitoring() {
           if (pollTimer) return;
           if (!ADBidding.plus_items || !ADBidding.bp_plus_id) { alert('키워드를 먼저 검색하고 상품을 선택해 주세요.'); return; }
           bidFired = false; bidScheduled = false; myBidPrice = 0; myBidRank = 0; bidEndTime = null; serverPcOffset = 0; tickCount = 0;
           setStatus('🔄 데이터 갱신 중...', '#f4a261');
           try { ADBidding.getBiddingList(); } catch(e) {}
           setTimeout(function() {
                     try {
                               serverPcOffset = ADBidding.server_time.getTime() - Date.now();
                     } catch(e) {
                               serverPcOffset = 0;
                               log('⚠️ 서버 시간 없음 - PC 시간 기준으로 대체');
                     }
                     bidEndTime = calcBidEndTime();
                     log('⏱ 보정 완료 - 마감: ' + new Date(bidEndTime).toLocaleTimeString('ko-KR') + ' (offset: ' + serverPcOffset + 'ms)');
           }, 1000);
           document.getElementById('ab-start').disabled = true;
           document.getElementById('ab-stop').disabled = false;
           setStatus('👁 모니터링 중...','#48cae4');
           log('모니터링 시작 - ' + (ADBidding.plus_items.keyword||''));
           tick();
    // Web Worker로 타이머 실행 (탭 숨겨도 throttle 없음)
    bidWorker = new Worker(workerUrl);
    bidWorker.onmessage = function() { tick(); };
    bidWorker.postMessage({ type: 'start' });
    pollTimer = true; // 모니터링 중 플래그
   }

   function stopMonitoring() {
           if (bidWorker) { bidWorker.postMessage('stop'); bidWorker.terminate(); bidWorker = null; }
    pollTimer = null;
           document.getElementById('ab-start').disabled = false;
           document.getElementById('ab-stop').disabled = true;
           if (!bidFired) setStatus('정지됨','#888');
           log('모니터링 정지');
            }

   // 탭 복귀 시 즉시 tick() 실행 (다수 키워드 탭 전환 대응)
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && pollTimer) {
      tick();
      log('👁️ 탭 복귀 - 즉시 시간 체크');
    }
  });

  document.getElementById('ab-start').addEventListener('click', startMonitoring);
      document.getElementById('ab-stop').addEventListener('click', stopMonitoring);

  // 모니터링 시작 전에도 카운트다운 표시 (PC 시간 기반, 1초 갱신)
  const uiClock = setInterval(function() {
    if (bidEndTime !== null) return; // 모니터링 중이면 tick()이 담당
    const tlEl = document.getElementById('ab-timeleft');
    if (!tlEl) { clearInterval(uiClock); return; }
    const parts = (document.getElementById('ab-deadline').value || '17:50').split(':');
    const h = parseInt(parts[0]) || 17, m = parseInt(parts[1] || 50);
    const serverNow = Date.now() + serverPcOffset;
    const nowDate = new Date(serverNow);
    const deadline = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), h, m, 0, 0);
    if (deadline.getTime() <= serverNow) deadline.setDate(deadline.getDate() + 1);
    const secsLeft = Math.ceil((deadline.getTime() - serverNow) / 1000);
    if (secsLeft <= 0) {
      tlEl.textContent = '마감'; tlEl.style.color = '#e94560';
    } else {
      const hh = Math.floor(secsLeft/3600), mm = Math.floor((secsLeft%3600)/60), ss = secsLeft%60;
      tlEl.textContent = hh + ':' + String(mm).padStart(2,'0') + ':' + String(ss).padStart(2,'0');
      tlEl.style.color = secsLeft <= 10 ? '#e94560' : secsLeft <= 30 ? '#f4a261' : '#48cae4';
    }
  }, 1000);

      document.getElementById('ab-close').addEventListener('click', () => { clearInterval(uiClock); stopMonitoring(); panel.remove(); });

   let dragging = false, dragOffX = 0, dragOffY = 0;
      const header = panel.querySelector('div');
      header.style.cursor = 'move';
      header.addEventListener('mousedown', e => { dragging=true; dragOffX=e.clientX-panel.getBoundingClientRect().left; dragOffY=e.clientY-panel.getBoundingClientRect().top; });
      document.addEventListener('mousemove', e => { if(!dragging)return; panel.style.left=(e.clientX-dragOffX)+'px'; panel.style.top=(e.clientY-dragOffY)+'px'; panel.style.right='auto'; });
      document.addEventListener('mouseup', () => { dragging=false; });

  // localStorage에서 Apps Script URL 복원
  const savedUrl = localStorage.getItem('qoo10_ab_sheet_url');
  if (savedUrl) document.getElementById('ab-sheet-url').value = savedUrl;

  // URL 변경 시 자동 저장
  document.getElementById('ab-sheet-url').addEventListener('input', function() {
    const v = this.value.trim();
    if (v) localStorage.setItem('qoo10_ab_sheet_url', v);
    else localStorage.removeItem('qoo10_ab_sheet_url');
  });

  // 패널 열릴 때 서버 시간 1회 동기화 (uiClock에 serverPcOffset 반영용)
  try { ADBidding.getBiddingList(); } catch(e) {}
  setTimeout(function() {
    try { serverPcOffset = ADBidding.server_time.getTime() - Date.now(); } catch(e) {}
  }, 1000);

       updateUI();
      log('스크립트 로드 완료');
      setStatus('키워드 검색 후 "모니터링 시작" 클릭','#888');

})();
