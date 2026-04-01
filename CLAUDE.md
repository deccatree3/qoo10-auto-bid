# 큐텐 자동 입찰 프로젝트

## 프로젝트 개요

QSM(Qoo10 Seller Manager) 플러스 전시 자동 입찰 프로그램.
JavaScript 북마크릿으로 동작 - Chrome 북마크바 클릭 시 패널 표시.

**GitHub**: https://github.com/deccatree3/qoo10-auto-bid

**QSM URL**: https://qsm.qoo10.jp/GMKT.INC.Gsm.Web/ADPlus/ADPlusKeyword.aspx

## 파일 구성

- `qoo10_auto_bid.js` - 메인 자동 입찰 스크립트
- `bookmarklet.html` - 북마크릿 설치 페이지 (드래그 방식)
- `google_apps_script.js` - 구글 시트 자동 기록용 Apps Script

## 입찰 시스템 이해

- 마감 시간 전까지 가장 높은 금액 입찰자가 높은 순위 낙찰
- 입찰 현황(순위/금액)은 공개, 실시간 확인 가능
- 동순위 없음: 같은 금액이라도 순위는 다르게 부여됨 (선입찰 우선 추정)

## 핵심 API

- `GetPlusItemKeywordGroup` - 입찰 현황(순위/금액) 조회
- `PlaceBidKeyword` - 입찰 제출

## 입찰 로직 (확정)

1. **타이밍**: 마감 N초 전 트리거 (기본 3초)
   - 취지: 경쟁사 최종 입찰가 확인 후 최대한 늦게 입찰
2. **입찰가 계산**: 목표 순위의 현재 금액 + 입찰단위
3. **취소 조건**: 계산된 입찰가 > 최대 입찰금액이면 입찰 안 함

## 타이머 아키텍처 (중요)

- **Web Worker**: 100ms 고정 간격으로 tick 실행 (탭 백그라운드에서도 Chrome throttle 없음)
- **API 호출** (`getBiddingList()`): 10 tick마다 1회 = 약 1초 1회 (list_bid 갱신 목적)
- **시간 체크**: 매 tick (100ms)마다 → 입찰 트리거 정밀도 100ms급
- **입찰 리스트**: `ADBidding.plus_items.list_bid`는 갱신 안 됨 → `#tbody_bid_list tr.tr_top` DOM을 직접 읽어 최신 가격 반영

## 시간 계산 아키텍처 (중요)

- **bidEndTime**: 사용자 입력 마감 시각(HH:MM) + serverPcOffset으로 계산한 절대 마감 시각(ms)
- **serverPcOffset**: `ADBidding.server_time - Date.now()`. 모니터링 시작 시 getBiddingList() 응답 후 **1회만** 계산
- **getTrueSecondsLeft()**: `(bidEndTime - (Date.now() + serverPcOffset)) / 1000`
  - `Date.now()`는 실시간 PC 시계 → Throttling 영향 없음
  - `#td_left_time` (QSM DOM 카운트다운) 의존 완전 제거
- **마감 시각 입력**: 패널에 입력란 추가 (기본값 17:50, 변경 시 그 자리에서만 적용, localStorage 저장 안 함)
- **`#td_left_time` 미사용 이유**: QSM 자체 JS 타이머가 Throttling 영향을 받아 탭 이탈 시 부정확해짐

## 구글 시트 자동 기록

- 마감 0초 시점에 자동 실행
- 기록 데이터: 날짜, 시간, 키워드, 내 입찰가, 내 순위, 1~10위 낙찰가
- Google Apps Script 중계 서버 활용 (별도 서버 불필요, 무료)
- image beacon 방식 사용 (QSM CSP로 인해 fetch 불가)
- Apps Script: `db` 시트에 기록, 시트 없으면 자동 생성, 행 부족 시 100행 자동 추가
- 구글 시트: https://docs.google.com/spreadsheets/d/1wsgn4IxFrFc9ubVtmosFy6wDsKqztnUWfy1Jniu7YRU

## 기능 체크리스트 (수정 전 반드시 확인)

> 코드 수정 시 아래 항목이 모두 유지되는지 검토 후 진행할 것.
> 오류 수정 전 반드시 원인을 먼저 확정하고, 추정 상태에서 수정 금지.

| # | 기능 | 상태 | 비고 |
|---|---|---|---|
| 1 | Web Worker 기반 타이머 (탭 백그라운드 100ms 유지) | ✅ | Chrome Tab Throttling 우회 |
| 2 | QSM 서버-PC 시간 오차 보정 (serverPcOffset) | ✅ | 모니터링 시작 시 1회 계산 |
| 3 | 마감 시각 Throttling 영향 없이 계산 | ✅ | Date.now() + serverPcOffset 기반, #td_left_time 미사용 |
| 4 | 탭 복귀 시 즉시 UI 체크 | ✅ | visibilitychange → tick() |
| 5 | 탭 복귀 시 시간 재보정 | ✅ | bidEndTime 고정값, Date.now() 실시간 → 자동 정확 |
| 6 | 입찰가 최신값 읽기 (DOM 직접 읽기) | ✅ | ADBidding.plus_items.list_bid 사용 안 함 |
| 7 | N초 전 정확한 입찰 트리거 | ⚠️ | 신규 방식으로 변경됨, 실전 테스트 필요 |
| 8 | 입찰가 = 목표 순위 현재가 + 입찰단위 | ✅ | calcOptimalBid() |
| 9 | 최대 입찰금액 초과 시 자동 취소 | ✅ | executeBid() 내 체크 |
| 10 | confirm() 자동 승인 | ✅ | window.confirm 임시 교체 |
| 11 | setPlaceKeywordBidding() 직접 호출 (블로킹 방지) | ✅ | setPlaceBidding() 우회 |
| 12 | 구글 시트 자동 기록 | ✅ | image beacon (CSP 우회) |
| 13 | Apps Script URL localStorage 저장 | ✅ | 재시작 후에도 유지 |
| 14 | 로그 타임스탬프 QSM 서버 시간 기준 | ✅ | Date.now() + serverPcOffset |
| 15 | 마감 5초 전 입찰 현황 스냅샷 로그 | ✅ | 입찰 로직 무관, 읽기 전용 |
| 16 | 패널 드래그 이동 | ✅ | |
| 17 | 키워드 미선택 시 시작 차단 | ✅ | ADBidding.bp_plus_id 체크 |

## 미확정 사안 (추정으로 수정 금지)

- **N초 전 입찰 타이밍**: 신규 방식(사용자 입력 마감 시각 기반)으로 변경 후 실전 테스트 미완료

## 수정된 버그 히스토리

- **탭 백그라운드 시 타이머 멈춤** → Web Worker 기반 타이머로 교체
- **입찰가 갱신 안 됨** → `ADBidding.plus_items` 대신 DOM 직접 읽기로 전환
- **입찰 마감 후 도달** → DOM 직접 읽기로 전환 후 대기 시간 전부 제거
- **pollMs/triggerSecs 조합 오류** → API 호출(1초)과 타이머 tick(100ms) 분리
- **N초 전 입찰 타이밍 오차** → `#td_left_time`(Throttling 영향) 및 `ADBidding.server_time`(정수 초 단위 오차) 의존 제거. 사용자 입력 마감 시각 + serverPcOffset + Date.now() 기반으로 전환

## 장기 로드맵

1. (완료) 자동 입찰
2. (중기) 판매 실적 데이터 취합 자동화
3. (중기) 성과 분석 및 통계 대시보드
4. (장기) 입찰가 자동 판단 (데이터 기반 AI 입찰)

## 미완료 / 향후 과제

- [ ] 1초 이하 입찰 검증 (100ms 타이머로 이미 가능, 실전 테스트 필요)
- [ ] 판매 실적 데이터 취합 자동화 (중기 목표)
