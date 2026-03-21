/**
 * 큐텐 플러스 전시 자동 입찰 스크립트
 *
 * 사용법:
 *   1. QSM 플러스 전시 페이지 열기 (ADPlusKeyword.aspx)
 *   2. 키워드 검색 후 상품 선택까지 완료
 *   3. 북마크릿 클릭 → 패널 열림
 *   4. 시트 URL 입력 후 모니터링 시작
 */

(function () {
  'use strict';

  // ===== 기존 패널 제거 =====
  const existing = document.getElementById('auto-bid-panel');
  if (existing) existing.remove();

  // ===== UI 패널 생성 =====
  const panel = document.createElement('div');
  panel.id = 'auto-bid-panel';
  panel.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 99999;
    background: #1a1a2e; color: #e0e0e0; border-radius: 12px;
    padding: 16px; width: 320px; font-family: 'Malgun Gothic', sans-serif;
    font-size: 13px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    border: 1px solid #16213e;
  `;

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <span style="font-size:15px; font-weight:bold; color:#e94560;">⚡ 자동 입찰</span>
      <button id="ab-close" style="background:none; border:none; color:#aaa; cursor:pointer; font-size:16px;">✕</button>
    </div>

    <div style="background:#16213e; border-radius:8px; padding:10px; margin-bottom:10px;">
      <div style="margin-bottom:8px; color:#a0a0c0; font-size:11px;">▼ 입찰 설정</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
        <label style="font-size:11px;">목표 순위
          <input id="ab-rank" type="number" value="3" min="1" max="16"
            style="width:100%; margin-top:3px; padding:4px; border-radius:4px; border:1px solid #444; background:#1a1a2e; color:#fff; text-align:center;">
        </label>
        <label style="font-size:11px;">최대 입찰금액(¥)
          <input id="ab-max" type="number" value="2000" step="100"
            style="width:100%; margin-top:3px; padding:4px; border-radius:4px; border:1px solid #444; background:#1a1a2e; color:#fff; text-align:center;">
        </label>
        <label style="font-size:11px;">마감 N초 전 입찰
          <input id="ab-timing" type="number" value="3" min="1" max="10"
            style="width:100%; margin-top:3px; padding:4px; border-radius:4px; border:1px solid #444; background:#1a1a2e; color:#fff; text-align:center;">
        </label>
        <label style="font-size:11px;">갱신 주기(ms)
          <input id="ab-poll" type="number" value="1000" step="100" min="500"
            style="width:100%; margin-top:3px; padding:4px; border-radius:4px; border:1px solid #444; background:#1a1a2e; color:#fff; text-align:center;">
        </label>
      </div>
    </div>

    <div style="background:#16213e; border-radius:8px; padding:10px; margin-bottom:10px;">
      <div style="margin-bottom:6px; color:#a0a0c0; font-size:11px;">▼ 구글 시트 자동 기록</div>
      <label style="font-size:11px;">Apps Script URL
        <input id="ab-sheet-url" type="text" placeholder="배포된 웹 앱 URL 붙여넣기"
          style="width:100%; margin-top:3px; padding:4px; border-radius:4px; border:1px solid #444; background:#1a1a2e; color:#fff; font-size:10px; box-sizing:border-box;">
      </label>
      <div style="margin-top:6px; display:flex; align-items:center; gap:6px;">
        <input id="ab-sheet-enable" type="checkbox" checked style="cursor:pointer;">
        <label for="ab-sheet-enable" style="font-size:11px; cursor:pointer;">입찰 마감 후 자동 기록</label>
      </div>
    </div>

    <div style="background:#16213e; border-radius:8px; padding:10px; margin-bottom:10px;">
      <div style="color:#a0a0c0; font-size:11px; margin-bottom:6px;">▼ 실시간 현황</div>
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:#aaa;">남은 시간</span>
        <span id="ab-timeleft" style="font-weight:bold; color:#0f3460;">--:--:--</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:#aaa;">목표순위 현재가</span>
        <span id="ab-current-price" style="font-weight:bold; color:#e94560;">-</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:#aaa;">예상 입찰가</span>
        <span id="ab-planned-price" style="font-weight:bold; color:#00b4d8;">-</span>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span style="color:#aaa;">입찰단위</span>
        <span id="ab-unit">-</span>
      </div>
    </div>

    <div style="background:#16213e; border-radius:8px; padding:8px; margin-bottom:10px; max-height:120px; overflow-y:auto;">
      <div style="color:#a0a0c0; font-size:11px; margin-bottom:4px;">▼ 현재 입찰 리스트</div>
      <div id="ab-bid-list" style="font-size:11px; line-height:1.8;"></div>
    </div>

    <div style="display:flex; gap:6px; margin-bottom:8px;">
      <button id="ab-start" style="flex:1; padding:8px; background:#e94560; border:none; border-radius:6px; color:#fff; cursor:pointer; font-weight:bold;">▶ 모니터링 시작</button>
      <button id="ab-stop" style="flex:1; padding:8px; background:#444; border:none; border-radius:6px; color:#fff; cursor:pointer;" disabled>■ 정지</button>
    </div>

    <div id="ab-status" style="text-align:center; font-size:11px; color:#888; min-height:16px;"></div>
    <div id="ab-log" style="margin-top:8px; font-size:10px; color:#666; max-height:80px; overflow-y:auto; border-top:1px solid #333; padding-top:6px;"></div>
  `;

  document.body.appendChild(panel);

  // ===== 상태 변수 =====
  let pollTimer = null;
  let bidFired = false;
  let myBidPrice = 0;
  let myBidRank = 0;

  // ===== 유틸 함수 =====
  function log(msg) {
    const logEl = document.getElementById('ab-log');
    const time = new Date().toLocaleTimeString('ko-KR');
    logEl.innerHTML = `<div>${time} ${msg}</div>` + logEl.innerHTML;
  }

  function setStatus(msg, color = '#888') {
    const el = document.getElementById('ab-status');
    el.textContent = msg;
    el.style.color = color;
  }

  function getSecondsLeft() {
    const el = document.querySelector('#td_left_time');
    if (!el) return null;
    const parts = el.textContent.trim().split(':');
    if (parts.length !== 3) return null;
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }

  function getCurrentBidList() {
    if (!ADBidding.plus_items || !ADBidding.plus_items.list_bid) return [];
    return ADBidding.plus_items.list_bid.map((b, i) => ({
      rank: i + 1,
      price: b.bid_price,
      is_mine: b.my_gd_no !== '',
    }));
  }

  function getBidUnit() {
    return ADBidding.plus_items ? ADBidding.plus_items.bid_unit : 100;
  }

  // ===== 최적 입찰가 계산 =====
  function calcOptimalBid(targetRank, maxBidPrice) {
    const bids = getCurrentBidList();
    const bidUnit = getBidUnit();

    if (bids.length === 0) {
      const startPrice = ADBidding.plus_items ? ADBidding.plus_items.start_price : 0;
      return Math.min(startPrice, maxBidPrice);
    }

    if (targetRank <= bids.length) {
      // 목표 순위 금액 + 입찰단위 → 동순위 없으므로 반드시 해당 순위 이상 확보
      return bids[targetRank - 1].price + bidUnit;
    } else {
      // 현재 입찰자 수가 목표 순위보다 적으면 시작가로 입찰
      const startPrice = ADBidding.plus_items ? ADBidding.plus_items.start_price : 0;
      return startPrice;
    }
  }

  // ===== UI 업데이트 =====
  function updateUI() {
    const targetRank = parseInt(document.getElementById('ab-rank').value);
    const maxBidPrice = parseInt(document.getElementById('ab-max').value);
    const secsLeft = getSecondsLeft();

    const tlEl = document.getElementById('ab-timeleft');
    if (secsLeft !== null) {
      const h = Math.floor(secsLeft / 3600);
      const m = Math.floor((secsLeft % 3600) / 60);
      const s = secsLeft % 60;
      const timeStr = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      tlEl.textContent = timeStr;
      tlEl.style.color = secsLeft <= 10 ? '#e94560' : secsLeft <= 30 ? '#f4a261' : '#48cae4';
    }

    document.getElementById('ab-unit').textContent = getBidUnit() + '¥';

    const bids = getCurrentBidList();
    const currentPrice = bids.length >= targetRank ? bids[targetRank - 1].price : '-';
    document.getElementById('ab-current-price').textContent =
      currentPrice !== '-' ? currentPrice.toLocaleString() + '¥' : '-';

    const planned = calcOptimalBid(targetRank, maxBidPrice);
    document.getElementById('ab-planned-price').textContent =
      planned.toLocaleString() + '¥';

    const listEl = document.getElementById('ab-bid-list');
    if (bids.length === 0) {
      listEl.innerHTML = '<span style="color:#666;">데이터 없음</span>';
    } else {
      listEl.innerHTML = bids.slice(0, 10).map(b => {
        const isTarget = b.rank === targetRank;
        const isMine = b.is_mine;
        const color = isMine ? '#4CAF50' : isTarget ? '#e94560' : '#aaa';
        const label = isMine ? ' ★내것' : isTarget ? ' ◀목표' : '';
        return `<div style="color:${color};">${b.rank}위: ${b.price.toLocaleString()}¥${label}</div>`;
      }).join('');
    }
  }

  // ===== 구글 시트 기록 =====
  function recordToSheet() {
    const url = document.getElementById('ab-sheet-url').value.trim();
    const enabled = document.getElementById('ab-sheet-enable').checked;

    if (!enabled || !url) return;

    const bids = getCurrentBidList();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const timeStr = now.toLocaleTimeString('ko-KR');
    const keyword = ADBidding.plus_items ? (ADBidding.plus_items.keyword || '') : '';

    // 내 입찰 순위 찾기
    const myBid = bids.find(b => b.is_mine);
    const finalMyRank = myBid ? myBid.rank : myBidRank;
    const finalMyPrice = myBid ? myBid.price : myBidPrice;

    const params = new URLSearchParams({
      date:     dateStr,
      time:     timeStr,
      keyword:  keyword,
      my_bid:   finalMyPrice,
      my_rank:  finalMyRank,
      rank1:    bids[0] ? bids[0].price : '',
      rank2:    bids[1] ? bids[1].price : '',
      rank3:    bids[2] ? bids[2].price : '',
      rank4:    bids[3] ? bids[3].price : '',
      rank5:    bids[4] ? bids[4].price : '',
      rank6:    bids[5] ? bids[5].price : '',
      rank7:    bids[6] ? bids[6].price : '',
      rank8:    bids[7] ? bids[7].price : '',
      rank9:    bids[8] ? bids[8].price : '',
      rank10:   bids[9] ? bids[9].price : '',
    });

    log('📊 시트 기록 중...');
    fetch(url + '?' + params.toString())
      .then(r => r.json())
      .then(data => {
        if (data.status === 'ok') {
          log('✅ 시트 기록 완료');
          setStatus('✅ 시트 기록 완료', '#4CAF50');
        } else {
          log('❌ 시트 오류: ' + (data.message || ''));
        }
      })
      .catch(err => {
        log('❌ 시트 전송 실패: ' + err.message);
      });
  }

  // ===== 자동 입찰 실행 =====
  function executeBid() {
    if (bidFired) return;
    bidFired = true;

    const targetRank = parseInt(document.getElementById('ab-rank').value);
    const maxBidPrice = parseInt(document.getElementById('ab-max').value);
    const bidPrice = calcOptimalBid(targetRank, maxBidPrice);
    const bidUnit = getBidUnit();
    const adjustedPrice = Math.floor(bidPrice / bidUnit) * bidUnit;

    if (adjustedPrice <= 0) {
      setStatus('❌ 입찰가 계산 오류', '#e94560');
      log('입찰가 계산 실패: ' + bidPrice);
      return;
    }

    if (adjustedPrice > maxBidPrice) {
      setStatus(`❌ 최대금액(${maxBidPrice}¥) 초과 - 입찰 취소`, '#e94560');
      log('최대금액 초과로 입찰 취소');
      return;
    }

    myBidPrice = adjustedPrice;
    myBidRank = targetRank;

    log(`🚀 입찰 실행! 가격: ${adjustedPrice}¥ (목표 ${targetRank}위)`);
    setStatus(`🚀 입찰 중... ${adjustedPrice.toLocaleString()}¥`, '#00b4d8');

    const priceInput = document.getElementById('txt_bidding_price');
    if (priceInput) {
      priceInput.value = adjustedPrice;
      priceInput.dispatchEvent(new Event('input', { bubbles: true }));
      priceInput.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      log('⚠️ 입찰가 입력 필드 미발견');
    }

    setTimeout(() => {
      try {
        if (typeof ADBidding.setPlaceBidding === 'function') {
          ADBidding.setPlaceBidding();
          log(`✅ 입찰 제출 완료: ${adjustedPrice}¥`);
          setStatus(`✅ 입찰 완료: ${adjustedPrice.toLocaleString()}¥`, '#4CAF50');
        } else {
          const bidBtn = document.getElementById('btn_place_bid');
          if (bidBtn) {
            bidBtn.click();
            log(`✅ 버튼 클릭으로 입찰 제출: ${adjustedPrice}¥`);
            setStatus(`✅ 입찰 완료: ${adjustedPrice.toLocaleString()}¥`, '#4CAF50');
          } else {
            log('❌ 입찰 버튼 미발견');
            setStatus('❌ 입찰 버튼 미발견', '#e94560');
          }
        }
      } catch (e) {
        log('❌ 입찰 오류: ' + e.message);
        setStatus('❌ 입찰 오류', '#e94560');
      }
    }, 100);
  }

  // ===== 메인 폴링 루프 =====
  function tick() {
    const triggerSecs = parseInt(document.getElementById('ab-timing').value);

    try {
      ADBidding.getBiddingList();
    } catch (e) {
      log('현황 갱신 오류: ' + e.message);
    }

    updateUI();

    const secsLeft = getSecondsLeft();
    if (secsLeft !== null) {
      if (!bidFired && secsLeft <= triggerSecs && secsLeft >= 0) {
        setStatus(`⚡ 마감 ${secsLeft}초! 입찰 실행!`, '#e94560');
        executeBid();
      } else if (secsLeft === 0) {
        // 마감 - 최종 데이터 기록 후 정지
        setTimeout(() => {
          recordToSheet();
          stopMonitoring();
        }, 1500); // 1.5초 후 (최종 데이터 업데이트 대기)
      }
    }
  }

  function startMonitoring() {
    if (pollTimer) return;

    if (!ADBidding.plus_items || !ADBidding.bp_plus_id) {
      alert('키워드를 먼저 검색하고 상품을 선택해 주세요.');
      return;
    }

    bidFired = false;
    myBidPrice = 0;
    myBidRank = 0;
    const pollMs = parseInt(document.getElementById('ab-poll').value);

    document.getElementById('ab-start').disabled = true;
    document.getElementById('ab-stop').disabled = false;
    setStatus('👁 모니터링 중...', '#48cae4');
    log('모니터링 시작 - 키워드: ' + (ADBidding.plus_items.keyword || ''));

    tick();
    pollTimer = setInterval(tick, pollMs);
  }

  function stopMonitoring() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    document.getElementById('ab-start').disabled = false;
    document.getElementById('ab-stop').disabled = true;
    if (!bidFired) setStatus('정지됨', '#888');
    log('모니터링 정지');
  }

  // ===== 이벤트 바인딩 =====
  document.getElementById('ab-start').addEventListener('click', startMonitoring);
  document.getElementById('ab-stop').addEventListener('click', stopMonitoring);
  document.getElementById('ab-close').addEventListener('click', () => {
    stopMonitoring();
    panel.remove();
  });

  // 드래그 이동
  let dragging = false, dragOffX = 0, dragOffY = 0;
  const header = panel.querySelector('div');
  header.style.cursor = 'move';
  header.addEventListener('mousedown', e => {
    dragging = true;
    dragOffX = e.clientX - panel.getBoundingClientRect().left;
    dragOffY = e.clientY - panel.getBoundingClientRect().top;
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    panel.style.left = (e.clientX - dragOffX) + 'px';
    panel.style.top = (e.clientY - dragOffY) + 'px';
    panel.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => { dragging = false; });

  // 초기화
  updateUI();
  log('스크립트 로드 완료');
  setStatus('키워드 검색 후 "모니터링 시작" 클릭', '#888');

})();
