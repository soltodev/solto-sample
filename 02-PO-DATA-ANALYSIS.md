# 02. PO장 데이터 분석

> [INDEX.md](./INDEX.md) > PO 데이터 분석

## PO 양식 3가지 유형

### Type A: JS Corporation 샘플 PO

**파일 예시**: `PO#JS-OF26-DGML412_(SOLTO)_20260224.xlsx`, `PO#JS-OF26-DGGB045_SOLTO)_20260228 (1).xlsx`

**특징**: 소량 샘플 발주 (3~5M/색상), 12열, 양식 상단에 JS Corp 정보

**구조** (고정 위치):

| 위치 | 필드 | 예시 값 |
|------|------|---------|
| row 6, col 2 | Issuing Date | 2026-02-24 |
| row 8, col 1 | PO NO | PO#JS-OF26-DGML412 |
| row 10, col 2 | Supplier | SOLTO |
| row 10, col 7-8 | Ship To | BAROM / JSB Indonesia |
| row 20, col 8 | Shipping Term | SF PREPAID |
| row 24 (헤더) | 데이터 테이블 시작 | FILE NO, ITEM, COLOR, SPEC, UNIT, Q'TY, REMARK |

**데이터 테이블 (row 25+)**:

| Col | 헤더 | 내용 |
|-----|------|------|
| 0-1 | FILE NO / GROUP / ITEM | Description (소재명) |
| 7 | COLOR | 색상 |
| 8 | SPEC | 규격 |
| 9 | UNIT | M (미터) |
| 10 | Q'TY | 수량 |
| 11 | REMARK | 목적지 공장 코드 (JSB, JSDG) |

**PO# 형식**: `JS-OF26-{코드}` (예: JS-OF26-DGML412, JS-OF26-DGGB045)

**Description 예시**:
```
(MK) MK BIAGIO SEMI LUX MK PEBBLE PVC-SM OUTLET BACKING(MAIN)-SOLTO (A)
(MK) METALLIC MK SIG SM POP PEBBLE PVC (OUTLET-137CM)-SOLTO (A)
(MK) MK SIG COATED TWILL SM (1.2CM/OUTLET)-SOLTO (A)
```

---

### Type B: JS Corporation 양산 PO (Purchase Order Sheet)

**파일 예시**: `(JSB) MMK FAL26 OUTLET MAINBUY ORDER SHEET(260131)SOLTO1 (1).xlsx`, `(JSJ) MMK FAL26 ...`

**특징**: 대량 양산 발주 (수백~수천M), 15열, BUYER/SEASON 필드 존재

**구조** (고정 위치):

| 위치 | 필드 | 예시 값 |
|------|------|---------|
| row 7, col 3 | Issuing Date | 2026-01-31 |
| row 7, col 11 | Due Date | 2026-02-28 |
| row 8, col 3 | PO NO | 1260131-074 |
| row 8, col 13 | Ship To (공장) | PT JS BOYOLALI(1265) |
| row 9, col 13 | Currency | USD |
| row 10, col 3 | Supplier | SOLTO INDUSTRIES CO.,LTD |
| row 10, col 13 | Payment Term | CASH60 |
| row 11 | Attention | MMK FAL26 OUTLET MAINBUY ORDER ACC |

**데이터 테이블 (row 13 헤더)**:

| Col | 헤더 | 내용 |
|-----|------|------|
| 0 | BUYER | MK |
| 1 | SEASON | FAL26 |
| 2 | (empty) | |
| 3 | NO | 행번호 |
| 4 | Item | **Description** (핵심) |
| 5 | (empty) | |
| 6 | (empty) | |
| 7 | Spec | 134.5CM, 137CM 등 |
| 8 | (empty) | |
| 9 | Unit | M |
| 10 | (empty) | |
| 11 | Color | 색상 |
| 12 | Q'ty | 수량 |
| 13 | U/Price | 단가 (USD) |
| 14 | Amount | 금액 (수량×단가) |

**PO# 형식**: `1260131-0XX` (날짜 기반 + 순번)

**파일명 규칙**: `({공장코드}) MMK {시즌} {채널} {발주유형}({날짜})SOLTO{순번}`
- `JSB` = PT JS BOYOLALI (인도네시아 보요랄리)
- `JSJ` = PT JS JAKARTA (인도네시아 자카르타)

**Description 예시**:
```
(MK) DOUBLE SIDED MK SIG SM/SAFFIANO PVC BACKING (1.8MM THICKNESS) -SOLTO (A)
(MK) MK SIG COATED TWILL SM (1.2CM/OUTLET)-SOLTO (A)
(MK) MK SIG COATED TWILL MD (2CM/OUTLET-137CM)-SOLTO (A)
(MK) SAFFIANO PVC 10-SOLTO (A)
```

**핵심**: 같은 날짜의 같은 시즌이라도 **공장별로 PO가 분리** (JSB와 JSJ는 별도 PO, 같은 소재 포함 가능)

**금액 규모**: JSB(보요랄리) $618,821 / JSJ(자카르타) $146,961 — 실 양산 물량

---

### Type C: 시몬느 PO SHEET

**파일**: `시몬느 PO SHEET.xlsx`

**특징**: 공장(시몬느) 관점 집계표, 한글 헤더, 오더번호 단위 분해

**컬럼 (11열)**:

| Col | 헤더 | 내용 | 예시 |
|-----|------|------|------|
| 0 | 발주일 | 발주 날짜 | 2026-01-30 |
| 1 | 바이어명 | 브랜드 | MICHAEL KORS |
| 2 | 오더(차수) | 오더번호 | M0097312 |
| 3 | 생산지 | 공장 위치 | CAMBODIA, INDONESIA, VIETNAM TG1 |
| 4 | 생산월 | 생산 예정월 | 202603 |
| 5 | 품목명 | **Description** | M/K SOLTO SIG COATED TWILL SM(OUTLET) 54" |
| 6 | 색상명 | 색상 | BLACK, BROWN |
| 7 | 미출량 | 미출하 수량 (M) | 1200 |
| 8 | 단가 | USD 단가 | 8.15 |
| 9 | 사유내역 | 채널 구분 | MAIN / MARKET/INTERNET |
| 10 | 시몬느시즌 | 시즌 | FA |

**데이터 규모**: 1,022행, 12개 고유 품목명, 42개 색상, 5개 생산지, 총 129,615M

**Description 체계 (시몬느 고유)**:
```
M/K SOLTO SIG COATED TWILL SM(OUTLET) 54"
M/K SOLTO SIG COATED TWILL MD(OUTLET) 54"
M/K SIG PVC DBSD SM(W.NAPPA) 52"(2.1MM)
M/K DBSD FLOATER MK SIG SM(SOLTO)52"
M/K POP MK SIG SM PEBBLE PVC(SOLTO)52"DP
```

**JS PO와의 차이**:
- JS PO: 소재+색상 단위로 합산, PO 1건 = 1파일
- 시몬느: 오더번호×생산지×품목×색상 단위로 분해, 전체가 1파일

---

## 3가지 양식의 동일 소재 네이밍 비교

| JS PO (Type A/B) | Weekly | 시몬느 (Type C) |
|-------------------|--------|----------------|
| `(MK) MK SIG COATED TWILL SM (1.2CM/OUTLET)-SOLTO (A)` | `MK SIG SM` | `M/K SOLTO SIG COATED TWILL SM(OUTLET) 54"` |
| `(MK) DOUBLE SIDED MK SIG SM/SAFFIANO PVC BACKING` | `1.6mm DBLSD MK SIG SM / NEW NAPPA PU BACKING` | `M/K SIG PVC DBSD SM(W.NAPPA) 52"` |
| `(MK) SAFFIANO PVC 10-SOLTO (A)` | `MK SOLTO SAFFIANO PVC 1.0mm` | (해당 없음) |
| `(MK) MK SIG COATED TWILL MD (2CM/OUTLET-137CM)-SOLTO (A)` | `MK SIG MD` | `M/K SOLTO SIG COATED TWILL MD(OUTLET) 54"` |

→ **PO→Weekly 변환 시 Description 정규화가 핵심 과제** (solto-ax 매칭엔진 활용 가능)

---

## PO 파싱 전략

| 양식 | 감지 방법 | 파싱 시작점 |
|------|----------|-----------|
| Type A (JS 샘플) | PO# 형식 `JS-OF26-` 또는 헤더에 "FILE NO" | row 24 이후 데이터 행 |
| Type B (JS 양산) | 파일명에 `MMK FAL` 또는 헤더에 "BUYER" | row 13 이후 데이터 행 |
| Type C (시몬느) | 첫 행에 "발주일" 한글 헤더 | row 1부터 데이터 |

**공통 추출 필드**: PO#, Issuing Date, Description, Color, Quantity, Unit Price, Ship To (공장/목적지)
