# 03. Weekly 양식 분석

> [INDEX.md](./INDEX.md) > Weekly 구조

**원본 파일**: `AI-SAMPLE용 (MK Weekly 양식).xlsx` (12.6MB, 68시트)

## 시트 구조

### 시즌별 시트 (메인)

| 시트명 | 시즌 | 카테고리 | 행 수 | 비고 |
|--------|------|---------|-------|------|
| F26 W | Fall 2026 | Women | 901 | 최신 시즌 |
| F26 M | Fall 2026 | Men | 952 | |
| F26 S | Fall 2026 | Sample | 861 | 샘플 오더 |
| VIETNAM | Fall 2026 | 베트남 | 185 | 컬럼 구조 약간 다름 |
| F26 CHINA | Fall 2026 | 중국 | 1,465 | |
| T26 W/M/S | Trans 2026 | W/M/S | 각 수백 | |
| S26, R26, F25... | 과거 시즌 | | | ~H23까지 |

### 특수 시트

| 시트명 | 내용 | 행 수 |
|--------|------|-------|
| 입고지 정보 | 공장→목적지→운송→입고주소 매핑 | 56 |
| 보상건 | 보상/교체 건 | 소수 |
| AIR P.P | 항공 선불 건 | 소수 |
| 콜아웃&출고지연 | 출고 지연 이력 | 소수 |
| 3자 가공 | 제3자 가공 건 | 소수 |

## 메인 시트 컬럼 (W/M 공통, 32열)

| Col# | 헤더 | 데이터 타입 | 예시 | PO 대응 |
|------|------|-----------|------|---------|
| 0 | TYPE | String | HB, FW | — |
| 1 | FACTORY NAME | String | DLUXE CAMBODIA, SIMONE INN | PO: Ship To |
| 2 | PO# | String | ISO26003, 1000105385MKTE B | PO: PO NO |
| 3 | **MK ARTICLE NAME** | String | MK SIG SM | PO: Item (정규화 필요) |
| 4 | MATERIAL COLOR | String | BLACK, BROWN/KHAKI | PO: Color |
| 5 | Q'ty | Number | 1200 | PO: Q'ty |
| 6 | Actual ship Q'ty | Number | 0 | (운영 중 업데이트) |
| 7 | Open Q'ty | Formula | =Q'ty - Actual | (자동 계산) |
| 8 | UNIT OF MEASURE | String | M | PO: Unit |
| 9 | PO ISSUED DATE | Date | 2026-01-31 | PO: Issuing Date |
| 10 | 업체 납기 | Date | 2026-03-15 | PO: Due Date |
| 11 | 공장 납기 | Date | 2026-04-01 | (공장 확인 후) |
| 12 | SUPPLIER ACTUAL ETD | Date | — | (출고 시) |
| 13 | INVOICE# | String | ST-26-K267 | (출고 시) |
| 14 | PI 발송여부 | String | O / X | (PI 발행 후) |
| 15 | MATERIAL PAYMENT TERMS | String | FOB, CNF | (계약 조건) |
| 16 | (Selling) Unit Price | Number | 8.80 | PO: U/Price (또는 별도) |
| 17 | (Selling) Total amount | Formula | =Q'ty × Selling Price | (자동 계산) |
| 18 | (Buying) Unit Price | Number | 6.50 | (내부 원가) |
| 19 | (Buying) Total amount | Formula | =Q'ty × Buying Price | (자동 계산) |
| 20 | SHIP TO DESTINATION | String | CAMBODIA, VN LA | PO: Ship To 국가 |
| 21 | SHIP TO METHOD | String | SEA, AIR, COURIER | (계약 조건) |
| 22 | COMMENTS | String | 변경이력 등 | — |
| 23 | DIVISION | String | OUTLET, MAINLINE, CUTUP | PO: Attention 에서 추출 |
| 24~31 | 기타 | | DEV STATUS, TEST RESULT 등 | — |

## VIETNAM 시트 차이점

| 차이 | W/M 시트 | VIETNAM 시트 |
|------|---------|-------------|
| col 5 | Q'ty | MATERIAL ORDER QUANTITY |
| col 10 | 업체 납기 | SUPPLIER CONFIRMED ETD |
| col 13 | INVOICE# | # PRODUCTION WEEKS (→ INVOICE는 col 22) |
| col 23 | DIVISION | SIMONE PDT MONTH |

→ **데모에서는 W/M 시트 구조를 기본으로 사용**, VIETNAM은 별도 매핑 필요 시 확장

## PO → Weekly 매핑 (핵심)

### PO Type B (JS 양산) → Weekly

| PO 필드 (Type B) | PO 위치 | Weekly 컬럼 | 변환 규칙 |
|-----------------|---------|------------|----------|
| PO NO | row 8, col 3 | col 2 (PO#) | 그대로 |
| Issuing Date | row 7, col 3 | col 9 (PO ISSUED DATE) | 날짜 포맷 변환 |
| Due Date | row 7, col 11 | col 10 (업체 납기) | 날짜 포맷 변환 |
| Ship To | row 8, col 13 | col 1 (FACTORY NAME) | 공장코드→공장명 변환 |
| Item (Description) | col 4 | col 3 (MK ARTICLE NAME) | **Description 정규화** |
| Color | col 11 | col 4 (MATERIAL COLOR) | 그대로 |
| Q'ty | col 12 | col 5 (Q'ty) | 그대로 |
| U/Price | col 13 | col 16 (Selling Unit Price) | 그대로 (또는 마진 적용) |
| Amount | col 14 | col 17 (Selling Total) | 자동 계산 |
| — | — | col 0 (TYPE) | "HB" 고정 (또는 PO에서 추출) |
| — | — | col 8 (UNIT) | "M" 고정 |
| Attention | row 11 | col 23 (DIVISION) | "OUTLET MAINBUY" → "OUTLET" 추출 |
| Ship To 국가 | row 8, col 13 | col 20 (DESTINATION) | 공장코드→국가 변환 |

### Description 정규화 규칙

PO의 Description을 Weekly의 MK ARTICLE NAME으로 변환:

```
PO: "(MK) MK SIG COATED TWILL SM (1.2CM/OUTLET)-SOLTO (A)"
  → 접두사 "(MK)" 제거
  → 접미사 "-SOLTO (A)" 제거
  → 괄호 내 규격/채널 정보 제거 또는 보존
  → Weekly: "MK SIG SM"  (또는 "MK SIG COATED TWILL SM")
```

**정규화 수준 결정 필요**:
- 간략형: `MK SIG SM` (Weekly 실제 사용형)
- 상세형: `MK SIG COATED TWILL SM` (PO 원문에 가까움)

→ **solto-ax 매칭엔진의 product_aliases 테이블 참조** (`../solto-ax/supabase/seed.sql`)

### 공장코드 → 공장명 매핑

| PO의 Ship To | Weekly의 FACTORY NAME |
|-------------|---------------------|
| PT JS BOYOLALI(1265) | JS BOYOLALI |
| PT JS JAKARTA(1041) | JS JAKARTA |
| SUPERL(CAMBODIA) | SUPERL CAMBODIA |
| SIMONE INN | SIMONE INN |
| DLUXE CAMBODIA | DLUXE CAMBODIA |

→ `../solto-ax/supabase/migrations/00004_factories.sql`의 factories 테이블과 연동

## Weekly에서 자동 채울 수 없는 필드 (수동 입력 필요)

| Weekly 컬럼 | 이유 |
|------------|------|
| col 6 (Actual ship Q'ty) | 출고 후 업데이트 |
| col 11 (공장 납기) | 공장 확인 후 |
| col 12 (SUPPLIER ACTUAL ETD) | 실 출고 후 |
| col 13 (INVOICE#) | PI/인보이스 발행 후 |
| col 15 (PAYMENT TERMS) | 계약 조건 (PO에서 일부 추출 가능) |
| col 18 (Buying Unit Price) | 내부 원가 (PO에 없음) |
| col 21 (SHIP TO METHOD) | 물류 결정 후 |
