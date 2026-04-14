# 04. PI (Proforma Invoice) 양식 분석

> [INDEX.md](./INDEX.md) > PI 구조

**원본 파일**: `PI 형식.xlsx`

## PI란?

**Proforma Invoice (견적송장)**: 솔토(공급자)가 공장(수신자)에게 발행하는 매출 문서.
"이 소재를 이 가격에 이 날짜에 보낸다"는 사전 확인서.

```
솔토 → PI 발행 → 공장 (SUPERL Cambodia, SIMONE INN 등)
```

## 양식 구조

### 헤더 영역 (row 1~6)

```
SOLTO INDUSTRIES CO, LTD.
KIMA BLDG., TEHERANRO 7 GIL 21,
GANGNAM-GU, SEOUL, KOREA
TEL: 02-553-0747 / FAX: 02-553-0748
```

### 문서 정보 (row 7~12)

| 필드 | 위치 | 예시 | 데이터 소스 |
|------|------|------|-----------|
| PO NO | row 7 | EH-202504/00220 | Weekly의 PO# |
| Date | row 7 (우측) | APR. 30th, 2025 | PI 발행일 |
| TO (수신자) | row 9 | SUPERL(CAMBODIA) | Weekly의 FACTORY NAME |
| PROFORMA INVOICE | row 11-12 | (FIRM) | 고정 텍스트 |

### 거래 조건 (row 15~24)

| 필드 | 값 | 소스 |
|------|-----|------|
| Price term | FOB | Weekly의 PAYMENT TERMS 또는 고정 |
| Payment | T/T after shipment within 60 days | 계약 조건 (공장별 다를 수 있음) |
| Validity | Good until THE END OF 2026 | 고정 (연말) |
| Packing | Standard export packing (Loose packing) | 고정 |
| Tolerance | +2% | 고정 |

### 데이터 테이블 (row 25~85)

**헤더 (row 25)**:

| Col | 헤더 | 내용 | Weekly 대응 |
|-----|------|------|------------|
| 0 | Location | 출하지 | "Korea" 고정 |
| 2 | Description | 소재명 | col 3 (MK ARTICLE NAME) |
| — | (Color 하위행) | 색상 | col 4 (MATERIAL COLOR) |
| 4 | Quantity | 수량 (M) | col 5 (Q'ty) |
| 5 | Unit Price | 단가 (USD) | col 16 (Selling Unit Price) |
| 6 | Amount | 금액 | col 17 (Selling Total) = Q'ty × Price |
| 7 | X-MILL Date | 출하 예정일 | col 10 (업체 납기) |

**데이터 구조** (Description + Color 2행 패턴):

```
Row 27: | Korea | MK SIG SEMI LUX SM |         |    |      |       | 2025-05-19 |
Row 28: |       |   BLACK            |         | 77 | 8.80 | 677.6 |            |
```

- Description 행: Location + Description + X-MILL Date
- Color 행: Color + Quantity + Unit Price + Amount
- 하나의 Description에 여러 Color 행 가능

### TOTAL (row 86)

```
TOTAL: 77 (수량) / 677.6 (금액)
```

### 은행 정보 (row 91~96)

```
INDUSTRIAL BANK OF KOREA (GAYANG-DONG BRANCH)
A/C NO: 311-062859-56-00015
SWIFT CODE: IBKOKRSE
SOLTO INDUSTRIES CO, LTD.
```

### 서명란 (row 92, 98)

```
Michael Chang                    Accepted by ________________
Managing Director
SOLTO INDUSTRIES CO, LTD.
```

## Weekly → PI 매핑

### 자동 채울 수 있는 필드

| PI 필드 | Weekly 소스 | 변환 |
|---------|-----------|------|
| PO NO | col 2 (PO#) | 그대로 |
| TO (수신자) | col 1 (FACTORY NAME) | 그대로 |
| Description | col 3 (MK ARTICLE NAME) | 그대로 |
| Color | col 4 (MATERIAL COLOR) | 그대로 |
| Quantity | col 5 (Q'ty) | 그대로 |
| Unit Price | col 16 (Selling Unit Price) | 그대로 |
| Amount | col 17 (Selling Total) | = Q'ty × Unit Price |
| X-MILL Date | col 10 (업체 납기) | 날짜 포맷 변환 |
| Location | — | "Korea" 고정 |

### 고정값 (템플릿에서)

| PI 필드 | 값 |
|---------|-----|
| 솔토 회사 정보 | KIMA BLDG., TEHERANRO 7 GIL 21... |
| Price term | FOB (또는 Weekly col 15에서) |
| Payment | T/T after shipment within 60 days |
| Validity | Good until THE END OF {현재연도} |
| Packing | Standard export packing |
| Tolerance | +2% |
| 은행 정보 | IBK 가양동 311-062859-56-00015 |
| 서명 | Michael Chang, Managing Director |

### PI 생성 로직

```
1. Weekly에서 공장(FACTORY NAME)이 같은 행을 그룹핑
2. 그룹 내에서 PO#이 같은 행을 서브그룹
3. 서브그룹 내 Description별로 묶고, 하위에 Color 행 나열
4. TOTAL = 전체 Quantity 합 + Amount 합
5. PI 1건 = 1공장의 1PO에 대한 견적
```

**예시**: Weekly에서 아래 3행을 선택하면:

| FACTORY | PO# | MK ARTICLE NAME | COLOR | Q'ty | Selling Price |
|---------|-----|----------------|-------|------|--------------|
| SUPERL CAM | ISO26003 | MK SIG SM | BLACK | 500 | 8.15 |
| SUPERL CAM | ISO26003 | MK SIG SM | BROWN | 300 | 8.15 |
| SUPERL CAM | ISO26003 | MK SIG MD | BLACK | 200 | 8.35 |

생성되는 PI:

```
TO: SUPERL(CAMBODIA)
PO NO: ISO26003

Location | Description        |          | Quantity | U/Price | Amount  | X-MILL
Korea    | MK SIG SM          |          |          |         |         | 2026-03-15
         |   BLACK            |          | 500      | 8.15    | 4,075   |
         |   BROWN            |          | 300      | 8.15    | 2,445   |
Korea    | MK SIG MD          |          |          |         |         | 2026-03-15
         |   BLACK            |          | 200      | 8.35    | 1,670   |

TOTAL:                                    1,000              8,190
```
