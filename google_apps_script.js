/**
 * 큐텐 플러스 전시 자동 입찰 - 구글 시트 기록용 Apps Script
 *
 * 설치 방법:
 * 1. 구글 시트 열기
 * 2. 확장 프로그램 → Apps Script
 * 3. 이 코드 전체 붙여넣기 (기존 내용 덮어쓰기)
 * 4. 저장 (Ctrl+S)
 * 5. 배포 → 새 배포 → 웹 앱
 *    - 설명: 자동 입찰 기록
 *    - 다음 사용자로 실행: 나
 *    - 액세스 권한: 모든 사용자
 * 6. 배포 → 웹 앱 URL 복사 → 자동 입찰 패널의 "시트 URL" 칸에 붙여넣기
 */

function doGet(e) {
  try {
    var params = e.parameter;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // 헤더가 없으면 첫 줄에 추가
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        '날짜', '시간', '키워드', '내 입찰가', '내 순위',
        '1위', '2위', '3위', '4위', '5위',
        '6위', '7위', '8위', '9위', '10위'
      ]);
    }

    // 데이터 행 추가
    sheet.appendRow([
      params.date    || '',
      params.time    || '',
      params.keyword || '',
      params.my_bid  ? Number(params.my_bid)  : '',
      params.my_rank ? Number(params.my_rank) : '',
      params.rank1   ? Number(params.rank1)   : '',
      params.rank2   ? Number(params.rank2)   : '',
      params.rank3   ? Number(params.rank3)   : '',
      params.rank4   ? Number(params.rank4)   : '',
      params.rank5   ? Number(params.rank5)   : '',
      params.rank6   ? Number(params.rank6)   : '',
      params.rank7   ? Number(params.rank7)   : '',
      params.rank8   ? Number(params.rank8)   : '',
      params.rank9   ? Number(params.rank9)   : '',
      params.rank10  ? Number(params.rank10)  : '',
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
