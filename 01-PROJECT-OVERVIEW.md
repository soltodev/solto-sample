# 01. 프로젝트 개요

> [INDEX.md](./INDEX.md) > 프로젝트 개요

## 목표

**PO장(발주서)을 업로드하면 Weekly(주간 생산일정표)를 자동 생성하고, Weekly 데이터를 바탕으로 PI(Proforma Invoice, 견적송장)를 자동 발행하는 데모 서비스.**

## 왜 만드는가

현재 솔토 오더팀 업무 흐름:

```
1. 업체(JS Corp, 시몬느 등)로부터 PO장 수신 (PDF/xlsx, 주 3~5건)
2. PO장의 아이템을 수동으로 Weekly 엑셀에 입력 (건당 30분~1시간)
3. Weekly 데이터를 바탕으로 PI를 수동 작성하여 공장에 발송

→ 수작업 병목: PO 파싱 + Weekly 입력 + PI 작성 = 일일 3~5시간
```

이 데모 서비스가 보여줄 것:

```
1. PO장(xlsx) 업로드 → 자동 파싱
2. 파싱된 PO 데이터 → Weekly 양식에 자동 배치
3. Weekly 행 선택 → PI 자동 생성 + 다운로드
```

## 데모 시나리오

### Step 1: PO 업로드 + 파싱

사용자가 PO장 xlsx 파일을 업로드하면:
- 업체/양식 자동 감지 (JS샘플 / JS양산 / 시몬느)
- PO#, 발행일, 아이템(Description), 색상, 수량, 단가, 목적지 자동 추출
- 파싱 결과 Preview 테이블로 표시

### Step 2: Weekly 생성

파싱된 PO 데이터를 Weekly 양식에 자동 배치:
- FACTORY NAME, PO#, MK ARTICLE NAME, COLOR, Q'ty, Unit Price 등 32컬럼 매핑
- 기존 Weekly에 추가(append) 또는 신규 Weekly 생성
- 업체 PO의 Description → Weekly의 MK ARTICLE NAME으로 **정규화** (solto-ax 매칭엔진 연동)

### Step 3: PI 생성

Weekly에서 행을 선택하면:
- PI 양식에 자동 채움 (공장명, Description, Color, Q'ty, Unit Price, Amount, X-MILL Date)
- 솔토 회사 정보 + 은행 정보 자동 삽입
- xlsx 또는 PDF로 다운로드

## 전체 데이터 플로우

```
┌──────────────────┐
│    PO장 (xlsx)    │  업체로부터 수신
│  JS샘플 / JS양산   │  PDF는 OCR 필요 (데모에서는 xlsx만)
│  시몬느 PO SHEET  │
└────────┬─────────┘
         │ Step 1: PO 파싱
         ▼
┌──────────────────┐
│  Parsed PO Data   │  정규화된 구조: PO#, Item, Color, Qty, Price, Dest
│  (DB or in-memory) │
└────────┬─────────┘
         │ Step 2: Weekly 생성
         ▼
┌──────────────────┐
│    Weekly 양식     │  32컬럼 MK Weekly 형식
│   (F26 W/M/S)    │  시즌/카테고리별 시트
└────────┬─────────┘
         │ Step 3: PI 생성
         ▼
┌──────────────────┐
│  PI (견적송장)     │  공장별 발행
│   xlsx/PDF 출력   │  솔토→공장 매출 문서
└──────────────────┘
```

## 범위 한정 (데모용)

| 포함 | 제외 |
|------|------|
| xlsx PO 파싱 (3가지 양식) | PDF PO 파싱 (OCR 필요) |
| MK 브랜드 Weekly | Coach 브랜드 Weekly |
| PI xlsx 출력 | PI PDF 출력 (v2) |
| 단일 시즌 (F26) | 멀티 시즌 관리 |
| 기본 Description 정규화 | 풀 매칭엔진 연동 (solto-ax) |
