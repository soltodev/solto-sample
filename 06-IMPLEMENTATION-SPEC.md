# 06. 구현 명세

> [INDEX.md](./INDEX.md) > 구현 명세

## 기술 스택

```
Frontend:   Next.js 14+ (App Router) + TypeScript
Styling:    Tailwind CSS + shadcn/ui
Excel:      SheetJS (xlsx) — PO 파싱 + Weekly/PI 생성
DB:         Supabase (기존 solto-ax 프로젝트 공유 또는 독립)
Deploy:     Vercel
```

**solto-ax와의 관계**: 기존 `../solto-ax/` 프로젝트에 기능 추가 또는 독립 프로젝트로 구축.
- **추천: solto-ax에 통합** — DB(products, token_dictionary, product_aliases)를 공유하면 Description 정규화를 재구현 안 해도 됨

## 페이지 구조

```
/demo                   ← 데모 랜딩 (3-step 안내)
/demo/po-upload         ← Step 1: PO 업로드 + 파싱
/demo/weekly            ← Step 2: Weekly 생성 + 편집
/demo/pi                ← Step 3: PI 생성 + 다운로드
```

### Page 1: PO Upload (`/demo/po-upload`)

**기능**:
1. PO xlsx 파일 드래그&드롭 (복수 파일 가능)
2. 양식 자동 감지 (Type A/B/C)
3. 파싱 결과 Preview 테이블
4. Description 정규화 확인 (원문 → Weekly명 매핑)
5. "Weekly에 추가" 버튼

**UI 구조**:
```
┌─────────────────────────────────────┐
│  PO 파일 업로드 (드래그&드롭)          │
│  [파일1.xlsx] [파일2.xlsx]           │
└─────────────────┬───────────────────┘
                  ▼
┌─────────────────────────────────────┐
│  파싱 결과 (파일별 탭)                │
│                                     │
│  파일: (JSB) MMK FAL26 ... .xlsx    │
│  양식: JS 양산 (Type B)              │
│  PO#: 1260131-074                   │
│  공장: PT JS BOYOLALI → JS BOYOLALI │
│                                     │
│  # │ Description (PO)   │ Weekly명   │ Color  │ Qty  │ Price │
│  1 │ (MK) MK SIG COA... │ MK SIG SM │ BLACK  │ 3200 │ 8.15  │
│  2 │ (MK) MK SIG COA... │ MK SIG SM │ BROWN  │ 1800 │ 8.15  │
│  3 │ (MK) SAFFIANO ...  │ SAFF PVC  │ VANILLA│ 2100 │ 4.50  │
│                                     │
│  [Weekly에 추가]                     │
└─────────────────────────────────────┘
```

### Page 2: Weekly View (`/demo/weekly`)

**기능**:
1. PO에서 추가된 행 + 기존 Weekly 데이터 통합 표시
2. 32컬럼 Weekly 테이블 (가로 스크롤)
3. 행 선택 (체크박스) → PI 생성 대상
4. 인라인 편집 (수량, 단가, 날짜 등)
5. Weekly xlsx 다운로드

**UI 구조**:
```
┌──────────────────────────────────────────────────┐
│  Weekly — F26 W                    [다운로드 xlsx] │
│                                                   │
│  ☐ │ TYPE│ FACTORY      │ PO#      │ ARTICLE    │ COLOR │ Q'ty │ ... │
│  ☑ │ HB  │ JS BOYOLALI  │ 126..074 │ MK SIG SM  │ BLACK │ 3200 │ ... │
│  ☑ │ HB  │ JS BOYOLALI  │ 126..074 │ MK SIG SM  │ BROWN │ 1800 │ ... │
│  ☐ │ HB  │ JS BOYOLALI  │ 126..074 │ SAFF PVC   │ VANL  │ 2100 │ ... │
│  ☑ │ HB  │ JS JAKARTA   │ 126..072 │ MK SIG SM  │ BLACK │ 1500 │ ... │
│                                                   │
│  3 rows selected                                  │
│  [선택한 행으로 PI 생성]                             │
└──────────────────────────────────────────────────┘
```

### Page 3: PI Generator (`/demo/pi`)

**기능**:
1. Weekly에서 선택된 행을 기반으로 PI 양식 생성
2. 공장별 자동 그룹핑
3. PI Preview (양식 그대로 렌더링)
4. 편집 가능 (단가, 날짜 등)
5. xlsx 다운로드

**UI 구조**:
```
┌──────────────────────────────────────────────┐
│  PI Preview                    [다운로드 xlsx] │
│                                               │
│  SOLTO INDUSTRIES CO, LTD.                   │
│  KIMA BLDG., TEHERANRO 7 GIL 21 ...         │
│                                               │
│  TO: JS BOYOLALI                              │
│  PO NO: 1260131-074     DATE: APR. 14, 2026  │
│                                               │
│  PROFORMA INVOICE (FIRM)                      │
│  Price term: FOB                              │
│                                               │
│  Location │ Description  │      │ Qty  │ U/P  │ Amount │ X-MILL │
│  Korea    │ MK SIG SM    │      │      │      │        │ 03-15  │
│           │   BLACK      │      │ 3200 │ 8.15 │ 26,080 │        │
│           │   BROWN      │      │ 1800 │ 8.15 │ 14,670 │        │
│                                               │
│  TOTAL:                    5,000      40,750  │
│                                               │
│  Bank: IBK GAYANG-DONG 311-062859-56-00015   │
│  Michael Chang, Managing Director             │
└──────────────────────────────────────────────┘
```

## Server Actions

```typescript
// PO 파싱
parsePOFile(buffer: ArrayBuffer, fileName: string): Promise<{
  po_type: "JS_SAMPLE" | "JS_BULK" | "SIMONE";
  po_number: string;
  lines: ParsedPOLine[];
}>

// Weekly 생성
addToWeekly(lines: ParsedPOLine[]): Promise<WeeklyRow[]>
getWeeklyRows(): Promise<WeeklyRow[]>
updateWeeklyRow(id: string, updates: Partial<WeeklyRow>): Promise<void>
exportWeeklyXlsx(): Promise<ArrayBuffer>

// PI 생성
generatePI(weeklyRowIds: string[]): Promise<PIDocument>
exportPIXlsx(pi: PIDocument): Promise<ArrayBuffer>
```

## DB 테이블 (추가 필요)

기존 solto-ax DB에 추가하거나, 인메모리로 처리:

### Option A: DB에 저장 (추천 — 데모 데이터 유지)

```sql
-- PO 파싱 결과 저장
CREATE TABLE demo_po_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(100),
  po_type VARCHAR(20),
  issued_date DATE,
  due_date DATE,
  description_raw TEXT,
  description_normalized TEXT,
  color VARCHAR(100),
  quantity DECIMAL(12,2),
  unit VARCHAR(5) DEFAULT 'M',
  unit_price DECIMAL(10,4),
  amount DECIMAL(15,2),
  factory_raw VARCHAR(200),
  factory_normalized VARCHAR(200),
  destination_country VARCHAR(50),
  division VARCHAR(50),
  season VARCHAR(20),
  source_file VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly 행 (데모용)
CREATE TABLE demo_weekly_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_line_id UUID REFERENCES demo_po_lines(id),
  type VARCHAR(10) DEFAULT 'HB',
  factory_name VARCHAR(200),
  po_number VARCHAR(100),
  mk_article_name VARCHAR(300),
  material_color VARCHAR(200),
  quantity DECIMAL(12,2),
  actual_ship_qty DECIMAL(12,2) DEFAULT 0,
  unit VARCHAR(5) DEFAULT 'M',
  po_issued_date DATE,
  supplier_confirmed_etd DATE,
  factory_request_etd DATE,
  selling_unit_price DECIMAL(10,4),
  selling_total DECIMAL(15,2),
  buying_unit_price DECIMAL(10,4),
  destination VARCHAR(200),
  ship_method VARCHAR(20),
  division VARCHAR(50),
  pi_sent BOOLEAN DEFAULT false,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Option B: 인메모리 (간단 — 새로고침 시 사라짐)

React state로 관리. DB 저장 없이 세션 동안만 유지. 데모 시연 시 충분할 수 있음.

## PO 파싱 로직 상세

### Type B (JS 양산) 파싱 — 가장 중요

```typescript
function parseJSBulkPO(sheet: XLSX.WorkSheet): ParsedPOLine[] {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // 메타 추출
  const poNumber = String(data[7]?.[3] || "").trim();
  const issuedDate = excelDateToISO(data[6]?.[3]);
  const dueDate = excelDateToISO(data[6]?.[11]);
  const shipTo = String(data[7]?.[13] || "").trim();
  const attention = String(data[10]?.[0] || "").trim();

  // 공장명 정규화
  const factory = normalizeFactory(shipTo);

  // DIVISION 추출
  const division = extractDivision(attention);
  // "MMK FAL26 OUTLET MAINBUY ORDER ACC" → "OUTLET"

  // 데이터 행 파싱 (row 13 이후)
  const lines: ParsedPOLine[] = [];
  let currentDescription = "";

  for (let i = 13; i < data.length; i++) {
    const row = data[i];
    const item = String(row[4] || "").trim();
    const color = String(row[11] || "").trim();
    const qty = Number(row[12]) || 0;
    const price = Number(row[13]) || 0;

    // Description 행 감지 (Item에 값이 있고 Color가 비어있으면)
    if (item && !color) {
      currentDescription = item;
      continue;
    }

    // Color 행 (qty > 0이면 데이터 행)
    if (color && qty > 0) {
      lines.push({
        po_number: poNumber,
        po_type: "JS_BULK",
        issued_date: issuedDate,
        due_date: dueDate,
        description_raw: currentDescription || item,
        description_normalized: normalizeDescription(currentDescription || item),
        color,
        quantity: qty,
        unit: "M",
        unit_price: price,
        amount: qty * price,
        factory_raw: shipTo,
        factory_normalized: factory,
        destination_country: extractCountry(shipTo),
        division,
        buyer: "MK",
        season: "FAL26",
      });
    }
  }

  return lines;
}
```

### Description 정규화 함수

```typescript
function normalizeDescription(raw: string): string {
  let desc = raw;

  // 1. "(MK) " 접두사 제거
  desc = desc.replace(/^\(MK\)\s*/i, "");

  // 2. "-SOLTO (A)" / "-SOLTO(A)" 접미사 제거
  desc = desc.replace(/\s*-?\s*SOLTO\s*\(A\)\s*$/i, "");

  // 3. 규격/채널 괄호 제거: (1.2CM/OUTLET), (OUTLET-137CM), (MAIN) 등
  desc = desc.replace(/\s*\([^)]*(?:CM|OUTLET|MAIN|THICKNESS)[^)]*\)/gi, "");

  // 4. 불필요 수식어 정리
  desc = desc.replace(/\s*COATED TWILL\s*/gi, " ");

  // 5. 약어 변환
  desc = desc.replace(/DOUBLE SIDED/gi, "DBLSD");

  // 6. 연속 공백 정리
  desc = desc.replace(/\s+/g, " ").trim();

  return desc;
}
```

## PI xlsx 생성 로직

```typescript
function generatePIXlsx(pi: PIDocument): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const rows: any[][] = [];

  // 헤더 (row 1-6)
  rows.push(["SOLTO INDUSTRIES CO, LTD."]);
  rows.push(["KIMA BLDG., TEHERANRO 7 GIL 21,"]);
  rows.push(["GANGNAM-GU, SEOUL, KOREA"]);
  rows.push(["TEL: 02-553-0747 / FAX: 02-553-0748"]);
  rows.push([]);

  // 문서 정보
  rows.push(["PO NO:", pi.po_number, "", "", "", "DATE:", formatPIDate(pi.pi_date)]);
  rows.push([]);
  rows.push(["TO:", pi.to_factory]);
  rows.push([]);
  rows.push(["PROFORMA INVOICE (FIRM)"]);
  rows.push([]);

  // 거래 조건
  rows.push(["Price term:", pi.price_term]);
  rows.push(["Payment:", pi.payment_terms]);
  rows.push(["Validity:", `Good until THE END OF ${new Date().getFullYear()}`]);
  rows.push(["Packing:", "Standard export packing (Loose packing)"]);
  rows.push(["Tolerance:", "+2%"]);
  rows.push([]);

  // 데이터 헤더
  rows.push(["Location", "", "Description", "", "Quantity", "Unit Price", "Amount", "X-MILL Date"]);

  // 데이터 행
  for (const item of pi.items) {
    // Description 행
    rows.push(["Korea", "", item.description, "", "", "", "", item.x_mill_date]);
    // Color 행
    for (const color of item.colors) {
      rows.push(["", "", `  ${color.color}`, "", color.quantity, color.unit_price, color.amount, ""]);
    }
  }

  rows.push([]);
  rows.push(["", "", "TOTAL:", "", pi.total_quantity, "", pi.total_amount, ""]);

  // 은행 정보
  rows.push([]); rows.push([]);
  rows.push(["INDUSTRIAL BANK OF KOREA (GAYANG-DONG BRANCH)"]);
  rows.push(["A/C NO: 311-062859-56-00015"]);
  rows.push(["SWIFT CODE: IBKOKRSE"]);
  rows.push(["SOLTO INDUSTRIES CO, LTD."]);
  rows.push([]);
  rows.push(["Michael Chang", "", "", "", "", "", "Accepted by ___________"]);
  rows.push(["Managing Director"]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  // 컬럼 너비
  ws["!cols"] = [
    { wch: 10 }, { wch: 5 }, { wch: 35 }, { wch: 5 },
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "PI");

  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}
```

## 구현 우선순위

| 순서 | 기능 | 소요 |
|------|------|------|
| 1 | PO 파싱 (Type B — JS 양산) | 2시간 |
| 2 | Weekly 생성 + 테이블 UI | 3시간 |
| 3 | PI 생성 + xlsx 출력 | 2시간 |
| 4 | PO 파싱 (Type A — JS 샘플) | 1시간 |
| 5 | PO 파싱 (Type C — 시몬느) | 1시간 |
| 6 | Description 정규화 (solto-ax 연동) | 1시간 |
| 7 | Weekly xlsx 다운로드 | 1시간 |
| **총** | | **~11시간 (CC 기준)** |
