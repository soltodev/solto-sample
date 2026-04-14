import ExcelJS from "exceljs";
import type { ParsedPOFile, ParsedPOLine, POType } from "../types";
import { compactId } from "./format";
import {
  extractDivision,
  normalizeDescription,
  normalizeFactory,
  normalizeSeason,
} from "./normalizers";

type Matrix = unknown[][];

export async function parsePOBuffer(buffer: ArrayBuffer, fileName: string): Promise<ParsedPOFile> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("워크북에 시트가 없습니다.");

  const matrix = worksheetToMatrix(worksheet);
  const poType = detectPOType(matrix, fileName);
  const lines = parseByType(matrix, fileName, poType);
  if (lines.length === 0) {
    throw new Error("파싱 가능한 PO 데이터 행을 찾지 못했습니다.");
  }

  return {
    id: compactId("file", lines.length),
    fileName,
    poType,
    poNumber: lines[0].poNumber,
    issuedDate: lines[0].issuedDate,
    dueDate: lines[0].dueDate,
    factory: lines[0].factoryNormalized,
    lineCount: lines.length,
    totalQuantity: sum(lines.map((line) => line.quantity)),
    totalAmount: sum(lines.map((line) => line.amount)),
    lines,
  };
}

function parseByType(matrix: Matrix, fileName: string, poType: POType) {
  if (poType === "JS_SAMPLE") return parseJSSample(matrix, fileName);
  if (poType === "JS_BULK") return parseJSBulk(matrix, fileName);
  return parseSimone(matrix, fileName);
}

function detectPOType(matrix: Matrix, fileName: string): POType {
  const firstRow = rowText(matrix[0]);
  const allText = matrix.slice(0, 30).map(rowText).join(" ");

  if (firstRow.includes("발주일") && firstRow.includes("품목명")) return "SIMONE";
  if (/MMK\s+FAL|BUYER\s+SEASON|PURCHASE ORDER SHEET/i.test(`${fileName} ${allText}`)) {
    return "JS_BULK";
  }
  if (/JS-OF26|FILE NO|COMMODITY/i.test(`${fileName} ${allText}`)) return "JS_SAMPLE";

  throw new Error("지원하지 않는 PO 양식입니다.");
}

function parseJSSample(matrix: Matrix, fileName: string): ParsedPOLine[] {
  const poNumber = text(cell(matrix, 8, 2)).replace(/^PO#/, "");
  const issuedDate = toISODate(cell(matrix, 6, 2));
  const shipTo = text(cell(matrix, 10, 8)) || text(cell(matrix, 10, 7));
  const headerIndex = matrix.findIndex((row) => rowText(row).includes("FILE NO"));
  const lines: ParsedPOLine[] = [];

  for (let i = headerIndex + 1; i < matrix.length; i += 1) {
    const row = matrix[i];
    if (rowText(row).includes("SHIPPING DATE")) break;

    const descriptionRaw = text(row[1]);
    const color = text(row[7]);
    const quantity = number(row[10]);
    if (!descriptionRaw || !color || quantity <= 0) continue;

    const factoryRaw = text(row[11]) || shipTo || "JS SAMPLE";
    const factory = normalizeFactory(factoryRaw);
    const description = normalizeDescription(descriptionRaw);

    lines.push({
      id: compactId("po", i + 1),
      sourceFile: fileName,
      rowNumber: i + 1,
      poNumber: poNumber || fileName.replace(/\.xlsx$/i, ""),
      poType: "JS_SAMPLE",
      issuedDate,
      dueDate: "",
      descriptionRaw,
      descriptionNormalized: description.normalized,
      normalizationNote: description.note,
      color,
      quantity,
      unit: text(row[9]) || "M",
      unitPrice: 0,
      amount: 0,
      spec: text(row[8]),
      factoryRaw,
      factoryNormalized: factory.factory,
      destinationCountry: factory.country,
      division: "SAMPLE",
      buyer: "MK",
      season: "FAL26",
      paymentTerms: "SF PREPAID",
    });
  }

  return lines;
}

function parseJSBulk(matrix: Matrix, fileName: string): ParsedPOLine[] {
  const poNumber = text(cell(matrix, 8, 3));
  const issuedDate = toISODate(cell(matrix, 7, 3));
  const dueDate = toISODate(cell(matrix, 7, 11));
  const shipTo = text(cell(matrix, 8, 11));
  const paymentTerms = text(cell(matrix, 10, 11)) || "CASH60";
  const attention = text(cell(matrix, 11, 3));
  const factory = normalizeFactory(shipTo);
  const headerIndex = matrix.findIndex((row) => {
    const joined = rowText(row);
    return joined.includes("BUYER") && joined.includes("ITEM") && joined.includes("COLOR");
  });
  const lines: ParsedPOLine[] = [];

  for (let i = headerIndex + 1; i < matrix.length; i += 1) {
    const row = matrix[i];
    const descriptionRaw = text(row[4]);
    const color = text(row[11]);
    const quantity = number(row[12]);
    const unitPrice = number(row[13]);
    if (!descriptionRaw || !color || quantity <= 0) continue;

    const description = normalizeDescription(descriptionRaw);
    const amount = number(row[14]) || quantity * unitPrice;

    lines.push({
      id: compactId("po", i + 1),
      sourceFile: fileName,
      rowNumber: i + 1,
      poNumber,
      poType: "JS_BULK",
      issuedDate,
      dueDate,
      descriptionRaw,
      descriptionNormalized: description.normalized,
      normalizationNote: description.note,
      color,
      quantity,
      unit: text(row[9]) || "M",
      unitPrice,
      amount,
      spec: text(row[7]),
      factoryRaw: shipTo,
      factoryNormalized: factory.factory,
      destinationCountry: factory.country,
      division: extractDivision(attention),
      buyer: text(row[0]) || "MK",
      season: normalizeSeason(text(row[1])),
      paymentTerms,
    });
  }

  return lines;
}

function parseSimone(matrix: Matrix, fileName: string): ParsedPOLine[] {
  const lines: ParsedPOLine[] = [];

  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i];
    const issuedDate = toISODate(row[0]);
    const poNumber = text(row[2]);
    const factoryRaw = text(row[3]);
    const descriptionRaw = text(row[5]);
    const color = text(row[6]);
    const quantity = number(row[7]);
    const unitPrice = number(row[8]);
    if (!poNumber || !descriptionRaw || !color || quantity <= 0) continue;

    const factory = normalizeFactory(factoryRaw);
    const description = normalizeDescription(descriptionRaw);

    lines.push({
      id: compactId("po", i + 1),
      sourceFile: fileName,
      rowNumber: i + 1,
      poNumber,
      poType: "SIMONE",
      issuedDate,
      dueDate: productionMonthToDate(text(row[4])),
      descriptionRaw,
      descriptionNormalized: description.normalized,
      normalizationNote: description.note,
      color,
      quantity,
      unit: "M",
      unitPrice,
      amount: quantity * unitPrice,
      factoryRaw,
      factoryNormalized: factory.factory,
      destinationCountry: factory.country,
      division: extractDivision(text(row[9])),
      buyer: text(row[1]) || "MICHAEL KORS",
      season: normalizeSeason(text(row[10])),
      paymentTerms: "T/T after shipment within 60 days",
    });
  }

  return lines;
}

function worksheetToMatrix(worksheet: ExcelJS.Worksheet): Matrix {
  const matrix: Matrix = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cellValue, columnNumber) => {
      values[columnNumber - 1] = cellValue.value;
    });
    matrix[rowNumber - 1] = values;
  });
  return matrix;
}

function cell(matrix: Matrix, rowOneBased: number, colZeroBased: number) {
  return matrix[rowOneBased - 1]?.[colZeroBased];
}

function rowText(row?: unknown[]) {
  return (row ?? []).map(text).join(" ").toUpperCase();
}

function text(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const maybe = value as {
      text?: string;
      result?: unknown;
      formula?: string;
      richText?: Array<{ text: string }>;
      hyperlink?: string;
    };
    if (maybe.text) return maybe.text.trim();
    if (maybe.result != null) return text(maybe.result);
    if (maybe.richText) return maybe.richText.map((part) => part.text).join("").trim();
    if (maybe.hyperlink) return maybe.hyperlink.trim();
  }
  const stringValue = String(value).replace(/<phoneticPr[^>]*\/>/g, "").trim();
  return stringValue.replace(/\s+/g, " ");
}

function number(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(text(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toISODate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && value > 20000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + value * 86400000).toISOString().slice(0, 10);
  }
  const raw = text(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  return raw;
}

function productionMonthToDate(value: string) {
  const compact = value.match(/^(\d{4})(\d{2})$/);
  if (!compact) return "";
  return `${compact[1]}-${compact[2]}-01`;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
