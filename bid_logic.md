# 입찰 로직 및 구현 현황

## 입찰 시스템 이해

- QSM 플러스 전시 입찰: 마감 시간 전까지 가장 높은 금액 입찰자가 높은 순위 낙찰
- 입찰 현황은 공개, 실시간 확인 가능 (조회 버튼 클릭마다 업데이트)
- 동순위 없음: 같은 금액이라도 순위는 다르게 부여됨
- QSM URL: https://qsm.qoo10.jp/GMKT.INC.Gsm.Web/ADPlus/ADPlusKeyword.aspx

## 핵심 API

- GetPlusItemKeywordGroup - 입찰 현황 조회
- PlaceBidKeyword - 입찰 제출

## 입찰 로직 (확정)

1. 타이밍: 마감 N초 전 트리거 (사용자 설정)
2. 입찰가: 목표 순위 현재 금액 + 입찰단위 (동순위 없으므로 +1단위 필수)
3. 취소 조건: 계산된 입찰가 > 최대 입찰금액이면 입찰 안 함

## 실행 방식

- JavaScript 북마크릿 (Chrome 북마크바 저장)
- 다수 키워드: 탭 하나당 키워드 하나로 동시 운영 가능

## 구글 시트 자동 기록

- 마감 0초 시점 자동 실행
- 기록: 날짜, 시간, 키워드, 내 입찰가, 내 순위, 1~10위 낙찰가
- Google Apps Script 중계 활용

## 미완료 항목

- [ ] 입찰가 로직: bids[targetRank-1].price + bidUnit 으로 변경 필요
- [ ] 구글 시트 기록: 1~10위로 확장 (현재 1~5위)
- [ ] 북마크릿 HTML 특수문자 버그 수정
- [ ] bookmarklet.html 드래그 설치 방법만 남기고 단순화

## 기술 스택

- JavaScript (브라우저 실행, 별도 설치 없음)
- 실행: Chrome + 로그인된 QSM 탭
- 저장: 북마크릿
- 기록: Google Apps Script -> Google Sheets
