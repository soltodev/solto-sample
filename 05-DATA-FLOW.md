# 05. PO → Weekly → PI 데이터 플로우

> [INDEX.md](./INDEX.md) > 데이터 플로우

## 전체 흐름

```
PO장 (3가지 양식)
    │
    │  [Step 1] PO 파싱
    │  - 양식 자동 감지 (Type A/B/C)
    │  - 공통 필드 추출 → ParsedPOLine[]
    │
    ▼
┌─────────────────────────────────────────┐
│            ParsedPOLine                  │
│  po_number, issued_date, description,   │
│  color, quantity, unit_price, factory,   │
│  destination, division, spec            │
└────────────────┬────────────────────────┘
                 │
                 │  [Step 2] Description 정규화
                 │  - PO Description → Weekly MK ARTICLE NAME
                 │  - "(MK) ... -SOLTO (A)" → "MK SIG SM"
                 │
                 ▼
┌─────────────────────────────────────────┐
│           WeeklyRow (32컬럼)             │
│  TYPE, FACTORY, PO#, MK ARTICLE NAME,  │
│  COLOR, Q'ty, ..., Selling Price, ...   │
└────────────────┬────────────────────────┘
                 │
                 │  [Step 3] PI 생성
                 │  - 공장별 그룹핑
                 │  - Description→Color 계층 구조
                 │  - TOTAL 계산
                 │
                 ▼
┌─────────────────────────────────────────┐
│          PI (견적송장)                    │
│  TO(공장), PO NO, Description+Color,    │
│  Quantity, Unit Price, Amount,          │
│  X-MILL Date                            │
└─────────────────────────────────────────┘
```

## Step 1: PO 파싱 — 공통 데이터 모델

모든 PO 양식에서 추출하는 공통 구조:

```typescript
interface ParsedPOLine {
  // PO 메타
  po_number: string;          // "ISO26003", "1260131-074", "JS-OF26-DGML412"
  po_type: "JS_SAMPLE" | "JS_BULK" | "SIMONE";
  issued_date: string;        // ISO date
  due_date?: string;          // ISO date (Type B만)

  // 아이템
  description_raw: string;    // PO 원문 Description
  description_normalized: string; // Weekly용 정규화 이름
  color: string;
  quantity: number;
  unit: string;               // "M"
  unit_price: number;         // USD
  amount: number;             // quantity × unit_price
  spec?: string;              // "134.5CM", "137CM"

  // 목적지
  factory_raw: string;        // PO 원문 공장명
  factory_normalized: string; // Weekly용 공장명
  destination_country: string;
  division?: string;          // "OUTLET", "MAINLINE"

  // 기타
  buyer: string;              // "MK"
  season: string;             // "FAL26"
  payment_terms?: string;     // "CASH60"
}
```

### 양식별 파싱 규칙

| 필드 | Type A (JS 샘플) | Type B (JS 양산) | Type C (시몬느) |
|------|-----------------|-----------------|----------------|
| po_number | row8 col1 | row8 col3 | — (오더번호 사용) |
| issued_date | row6 col2 | row7 col3 | col0 (발주일) |
| description_raw | 데이터행 col0-1 | 데이터행 col4 | col5 (품목명) |
| color | 데이터행 col7 | 데이터행 col11 | col6 (색상명) |
| quantity | 데이터행 col10 | 데이터행 col12 | col7 (미출량) |
| unit_price | — (샘플이라 없음) | 데이터행 col13 | col8 (단가) |
| factory_raw | row10 col7-8 | row8 col13 | col3 (생산지) |

## Step 2: Description 정규화 규칙

### PO → Weekly Description 변환

```
입력:  "(MK) MK SIG COATED TWILL SM (1.2CM/OUTLET)-SOLTO (A)"
                                    ↓
Step 2-1: 접두사 제거              "(MK) " → 삭제
Step 2-2: 접미사 제거              "-SOLTO (A)" → 삭제
Step 2-3: 규격/채널 괄호 제거       "(1.2CM/OUTLET)" → 삭제 (또는 보존)
Step 2-4: 불필요 토큰 정리          "COATED TWILL" → 제거 (Weekly에선 생략)
                                    ↓
출력:  "MK SIG SM"
```

### 정규화 패턴 목록

| PO 패턴 | 처리 | Weekly 결과 |
|---------|------|------------|
| `(MK) ` 접두사 | 제거 | |
| `-SOLTO (A)` 접미사 | 제거 | |
| `-SOLTO(A)` 접미사 | 제거 | |
| `(1.2CM/OUTLET)` | 제거 | |
| `(2CM/OUTLET-137CM)` | 제거 | |
| `(0.9CM/OUTLET-139.5CM)` | 제거 | |
| `(OUTLET-137CM)` | 제거 | |
| `(MAIN)` | 제거 | |
| `COATED TWILL` | 제거 (Weekly에서 생략) | |
| `POP PEBBLE PVC` | 보존 → `POP PEBBLE PVC` | |
| `DOUBLE SIDED` → `DBLSD` | 약어 변환 | |
| `MK BIAGIO SEMI LUX MK PEBBLE PVC-SM OUTLET BACKING` | → `MK SIG SEMI LUX SM` | 복합 변환 |

### solto-ax 매칭엔진 연동

정규화를 직접 구현하는 대신 `../solto-ax/src/lib/matching/` 모듈 활용 가능:
- `preprocessor.ts` → Stage 1 전처리
- `tokenizer.ts` → Stage 2 토큰 분해
- `product_aliases` DB → 기존 매핑 조회

## Step 3: PI 생성 규칙

### 그룹핑

```
WeeklyRows
  │
  ├── Group by FACTORY NAME (공장별 1개 PI)
  │     │
  │     ├── Sub-group by PO# (PO별 섹션)
  │     │     │
  │     │     ├── Group by MK ARTICLE NAME (Description별)
  │     │     │     ├── Color 1: Qty, Price, Amount
  │     │     │     ├── Color 2: Qty, Price, Amount
  │     │     │     └── ...
  │     │     └── ...
  │     └── ...
  └── ...
```

### PI 1건의 데이터 구조

```typescript
interface PIDocument {
  // 헤더
  to_factory: string;        // "SUPERL(CAMBODIA)"
  po_number: string;         // "ISO26003"
  pi_date: string;           // PI 발행일
  price_term: string;        // "FOB"
  payment_terms: string;     // "T/T after shipment within 60 days"

  // 데이터
  items: PIItem[];

  // 합계
  total_quantity: number;
  total_amount: number;
}

interface PIItem {
  location: string;          // "Korea"
  description: string;       // "MK SIG SM"
  x_mill_date: string;       // "2026-03-15"
  colors: PIColorLine[];
}

interface PIColorLine {
  color: string;             // "BLACK"
  quantity: number;          // 500
  unit_price: number;        // 8.15
  amount: number;            // 4075
}
```

## 필드 매핑 종합 테이블

| # | PO 필드 | Weekly 컬럼 | PI 필드 | 변환 |
|---|---------|-----------|---------|------|
| 1 | PO NO | col 2 (PO#) | PO NO | 그대로 |
| 2 | Issuing Date | col 9 (PO ISSUED DATE) | — | — |
| 3 | Due Date | col 10 (업체 납기) | X-MILL Date | 날짜 포맷 |
| 4 | Ship To (공장) | col 1 (FACTORY NAME) | TO (수신자) | 공장명 정규화 |
| 5 | Item (Desc) | col 3 (MK ARTICLE NAME) | Description | **정규화** |
| 6 | Color | col 4 (MATERIAL COLOR) | Color | 그대로 |
| 7 | Q'ty | col 5 (Q'ty) | Quantity | 그대로 |
| 8 | U/Price | col 16 (Selling Price) | Unit Price | 그대로 |
| 9 | Amount | col 17 (Selling Total) | Amount | 자동 계산 |
| 10 | — | col 0 (TYPE) | — | "HB" 기본 |
| 11 | — | col 8 (UNIT) | — | "M" 기본 |
| 12 | Currency | — | — | USD 기본 |
| 13 | Attention | col 23 (DIVISION) | — | 채널 추출 |
| 14 | — | — | Location | "Korea" 고정 |
| 15 | — | — | 은행 정보 | 템플릿 고정 |
