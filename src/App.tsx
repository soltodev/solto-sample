import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { exportPIXlsx, exportWeeklyXlsx } from "./lib/excelExport";
import { formatMoney, formatNumber } from "./lib/format";
import { generatePIDocuments } from "./lib/pi";
import { parsePOBuffer } from "./lib/poParser";
import { buildWeeklyRows, summarizeWeekly, WEEKLY_COLUMNS } from "./lib/weekly";
import type { ParsedPOFile, SampleFile, WeeklyRow } from "./types";

const SAMPLE_FILES: SampleFile[] = [
  {
    label: "JS 샘플 PO",
    description: "소량 AD 샘플 발주",
    path: "samples/js-sample.xlsx",
  },
  {
    label: "JS 양산 PO",
    description: "FAL26 OUTLET MAINBUY",
    path: "samples/js-bulk.xlsx",
  },
  {
    label: "시몬느 PO SHEET",
    description: "1,000행대 공장 집계표",
    path: "samples/simone.xlsx",
  },
];

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsedFiles, setParsedFiles] = useState<ParsedPOFile[]>([]);
  const [weeklyRows, setWeeklyRows] = useState<WeeklyRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activePI, setActivePI] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("샘플 PO를 불러오거나 실제 xlsx를 올려 시작하세요.");

  const allLines = useMemo(() => parsedFiles.flatMap((file) => file.lines), [parsedFiles]);
  const selectedRows = useMemo(
    () => weeklyRows.filter((row) => selectedIds.has(row.id)),
    [selectedIds, weeklyRows],
  );
  const piDocuments = useMemo(() => generatePIDocuments(selectedRows), [selectedRows]);
  const currentPI = piDocuments[Math.min(activePI, Math.max(piDocuments.length - 1, 0))];
  const weeklySummary = useMemo(() => summarizeWeekly(weeklyRows), [weeklyRows]);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.name.endsWith(".xlsx"));
    if (list.length === 0) {
      setMessage("xlsx 파일만 처리할 수 있습니다.");
      return;
    }

    setIsBusy(true);
    setMessage(`${list.length}개 PO를 읽는 중입니다.`);

    try {
      const parsed = await Promise.all(
        list.map(async (file) => parsePOBuffer(await file.arrayBuffer(), file.name)),
      );
      appendParsed(parsed);
      setMessage(`${parsed.reduce((total, file) => total + file.lineCount, 0)}개 행을 파싱했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "파일을 파싱하지 못했습니다.");
    } finally {
      setIsBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function loadSample(sample: SampleFile) {
    setIsBusy(true);
    setMessage(`${sample.label}를 불러오는 중입니다.`);

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}${sample.path}`);
      const buffer = await response.arrayBuffer();
      const parsed = await parsePOBuffer(buffer, `${sample.label}.xlsx`);
      appendParsed([parsed]);
      setMessage(`${sample.label}: ${parsed.lineCount}개 행을 Weekly로 보냈습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "샘플을 불러오지 못했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  function appendParsed(files: ParsedPOFile[]) {
    setParsedFiles((current) => [...current, ...files]);
    const nextRows = buildWeeklyRows(files.flatMap((file) => file.lines));
    setWeeklyRows((current) => [...current, ...nextRows]);
    setSelectedIds((current) => {
      const next = new Set(current);
      nextRows.slice(0, 12).forEach((row) => next.add(row.id));
      return next;
    });
    setActivePI(0);
  }

  function resetDemo() {
    setParsedFiles([]);
    setWeeklyRows([]);
    setSelectedIds(new Set());
    setActivePI(0);
    setMessage("작업대를 비웠습니다.");
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    void handleFiles(event.dataTransfer.files);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void handleFiles(event.target.files);
  }

  function toggleRow(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActivePI(0);
  }

  function toggleAll() {
    setSelectedIds((current) => {
      if (current.size === weeklyRows.length) return new Set();
      return new Set(weeklyRows.map((row) => row.id));
    });
    setActivePI(0);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SOLTO ORDER AUTOMATION</p>
          <h1>PO장 취합에서 PI 발행까지</h1>
        </div>
        <div className="status-pill" aria-live="polite">
          {isBusy ? "처리 중" : message}
        </div>
      </header>

      <section className="command-band">
        <div className="command-copy">
          <p className="step-label">01 / PO Intake</p>
          <h2>샘플 PO를 읽고, 실제 xlsx도 바로 올립니다.</h2>
          <p>
            JS 샘플, JS 양산, 시몬느 PO SHEET를 같은 데이터 모델로 모아 Weekly와 PI에
            넘깁니다.
          </p>
          <div className="sample-actions">
            {SAMPLE_FILES.map((sample) => (
              <button
                className="sample-button"
                key={sample.path}
                type="button"
                disabled={isBusy}
                onClick={() => void loadSample(sample)}
              >
                <strong>{sample.label}</strong>
                <span>{sample.description}</span>
              </button>
            ))}
          </div>
        </div>

        <section
          className="dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          aria-label="PO xlsx 업로드"
        >
          <img
            src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80"
            alt="정리된 원단 샘플"
          />
          <div>
            <p className="step-label">xlsx upload</p>
            <h2>PO 파일 놓기</h2>
            <p>여러 파일을 한 번에 올릴 수 있습니다.</p>
            <button type="button" onClick={() => inputRef.current?.click()} disabled={isBusy}>
              파일 선택
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              multiple
              onChange={handleInput}
              hidden
            />
          </div>
        </section>
      </section>

      <section className="metrics-strip" aria-label="처리 요약">
        <Metric label="PO 파일" value={parsedFiles.length.toString()} />
        <Metric label="PO 라인" value={formatNumber(allLines.length)} />
        <Metric label="Weekly 수량" value={formatNumber(weeklySummary.totalQuantity)} />
        <Metric label="Selling 금액" value={formatMoney(weeklySummary.totalAmount)} />
        <Metric label="PI 후보" value={piDocuments.length.toString()} />
      </section>

      <section className="workspace">
        <div className="workspace-header">
          <div>
            <p className="step-label">02 / Parsed PO</p>
            <h2>정규화 확인</h2>
          </div>
          <button type="button" className="secondary-button" onClick={resetDemo}>
            초기화
          </button>
        </div>

        <div className="parsed-grid">
          {parsedFiles.length === 0 ? (
            <p className="empty-state">아직 파싱된 PO가 없습니다.</p>
          ) : (
            parsedFiles.map((file) => (
              <article className="file-card" key={file.id}>
                <p className="po-type">{labelPOType(file.poType)}</p>
                <h3>{file.fileName}</h3>
                <dl>
                  <div>
                    <dt>PO#</dt>
                    <dd>{file.poNumber}</dd>
                  </div>
                  <div>
                    <dt>공장</dt>
                    <dd>{file.factory}</dd>
                  </div>
                  <div>
                    <dt>수량</dt>
                    <dd>{formatNumber(file.totalQuantity)} M</dd>
                  </div>
                </dl>
              </article>
            ))
          )}
        </div>

        <div className="table-wrap compact">
          <table>
            <thead>
              <tr>
                <th>Raw Description</th>
                <th>Weekly Name</th>
                <th>Color</th>
                <th>Qty</th>
                <th>Factory</th>
              </tr>
            </thead>
            <tbody>
              {allLines.slice(0, 12).map((line) => (
                <tr key={line.id}>
                  <td>{line.descriptionRaw}</td>
                  <td>
                    <strong>{line.descriptionNormalized}</strong>
                    <span>{line.normalizationNote}</span>
                  </td>
                  <td>{line.color}</td>
                  <td>{formatNumber(line.quantity)}</td>
                  <td>{line.factoryNormalized}</td>
                </tr>
              ))}
              {allLines.length === 0 && (
                <tr>
                  <td colSpan={5}>샘플 또는 xlsx를 올리면 정규화 결과가 표시됩니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="workspace">
        <div className="workspace-header">
          <div>
            <p className="step-label">03 / Weekly</p>
            <h2>PI 발행 대상 선택</h2>
          </div>
          <div className="action-row">
            <button type="button" className="secondary-button" onClick={toggleAll}>
              {selectedIds.size === weeklyRows.length ? "전체 해제" : "전체 선택"}
            </button>
            <button
              type="button"
              disabled={weeklyRows.length === 0}
              onClick={() => void exportWeeklyXlsx(weeklyRows)}
            >
              Weekly xlsx
            </button>
          </div>
        </div>

        <div className="table-wrap weekly-table">
          <table>
            <thead>
              <tr>
                <th className="check-cell">PI</th>
                {WEEKLY_COLUMNS.slice(0, 24).map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeklyRows.slice(0, 80).map((row) => (
                <tr key={row.id} className={selectedIds.has(row.id) ? "selected" : ""}>
                  <td className="check-cell">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      aria-label={`${row.poNumber} ${row.materialColor} 선택`}
                    />
                  </td>
                  {WEEKLY_COLUMNS.slice(0, 24).map((column) => (
                    <td key={column.key}>{renderWeeklyCell(row, column.key)}</td>
                  ))}
                </tr>
              ))}
              {weeklyRows.length === 0 && (
                <tr>
                  <td colSpan={25}>Weekly 행이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {weeklyRows.length > 80 && (
          <p className="table-note">화면에는 80행만 표시하고, xlsx에는 전체 행을 담습니다.</p>
        )}
      </section>

      <section className="workspace invoice-zone">
        <div className="workspace-header">
          <div>
            <p className="step-label">04 / Proforma Invoice</p>
            <h2>공장·PO 단위 PI</h2>
          </div>
          <div className="action-row">
            {piDocuments.map((pi, index) => (
              <button
                key={pi.id}
                type="button"
                className={index === activePI ? "tab-button active" : "tab-button"}
                onClick={() => setActivePI(index)}
              >
                {pi.toFactory} / {pi.poNumber}
              </button>
            ))}
            <button
              type="button"
              disabled={!currentPI}
              onClick={() => currentPI && void exportPIXlsx(currentPI)}
            >
              PI xlsx
            </button>
          </div>
        </div>

        {currentPI ? (
          <article className="invoice-sheet">
            <header>
              <div>
                <h3>SOLTO INDUSTRIES CO, LTD.</h3>
                <p>KIMA BLDG., TEHERANRO 7 GIL 21, GANGNAM-GU, SEOUL, KOREA</p>
                <p>TEL: 02-553-0747 / FAX: 02-553-0748</p>
              </div>
              <dl>
                <div>
                  <dt>PO NO</dt>
                  <dd>{currentPI.poNumber}</dd>
                </div>
                <div>
                  <dt>DATE</dt>
                  <dd>{currentPI.piDate}</dd>
                </div>
                <div>
                  <dt>TO</dt>
                  <dd>{currentPI.toFactory}</dd>
                </div>
              </dl>
            </header>
            <h4>PROFORMA INVOICE (FIRM)</h4>
            <div className="terms-grid">
              <span>Price term: {currentPI.priceTerm}</span>
              <span>Payment: {currentPI.paymentTerms}</span>
              <span>Validity: Good until THE END OF {new Date().getFullYear()}</span>
              <span>Tolerance: +2%</span>
            </div>
            <div className="table-wrap invoice-table">
              <table>
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Description / Color</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Amount</th>
                    <th>X-MILL Date</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPI.items.map((item) => (
                    <FragmentedPIItem key={item.description} item={item} />
                  ))}
                  <tr className="total-row">
                    <td />
                    <td>TOTAL</td>
                    <td>{formatNumber(currentPI.totalQuantity)}</td>
                    <td />
                    <td>{formatMoney(currentPI.totalAmount)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            <footer>
              <p>INDUSTRIAL BANK OF KOREA (GAYANG-DONG BRANCH)</p>
              <p>A/C NO: 311-062859-56-00015 / SWIFT CODE: IBKOKRSE</p>
              <p>Michael Chang, Managing Director</p>
            </footer>
          </article>
        ) : (
          <p className="empty-state">Weekly 행을 선택하면 PI가 생성됩니다.</p>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FragmentedPIItem({ item }: { item: ReturnType<typeof generatePIDocuments>[number]["items"][number] }) {
  return (
    <>
      <tr className="description-row">
        <td>{item.location}</td>
        <td>{item.description}</td>
        <td />
        <td />
        <td />
        <td>{item.xMillDate || "-"}</td>
      </tr>
      {item.colors.map((color, index) => (
        <tr key={`${item.description}-${color.color}-${index}`}>
          <td />
          <td className="color-cell">{color.color}</td>
          <td>{formatNumber(color.quantity)}</td>
          <td>{color.unitPrice ? formatMoney(color.unitPrice) : "-"}</td>
          <td>{formatMoney(color.amount)}</td>
          <td />
        </tr>
      ))}
    </>
  );
}

function renderWeeklyCell(row: WeeklyRow, key: keyof WeeklyRow) {
  const value = row[key];
  if (typeof value === "boolean") return value ? "O" : "X";
  if (typeof value === "number") {
    if (key.toLowerCase().includes("price") || key.toLowerCase().includes("amount")) {
      return value ? formatMoney(value) : "-";
    }
    return formatNumber(value);
  }
  return value || "-";
}

function labelPOType(type: string) {
  if (type === "JS_SAMPLE") return "Type A / JS 샘플";
  if (type === "JS_BULK") return "Type B / JS 양산";
  return "Type C / 시몬느";
}
