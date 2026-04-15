import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { ParsedPOFile, ParsedPOLine, POType } from "../types";
import { compactId } from "./format";
import { extractDivision, normalizeDescription, normalizeFactory, normalizeSeason } from "./normalizers";

type PdfLine = {
  page: number;
  text: string;
};

export async function parsePDFBuffer(buffer: ArrayBuffer, fileName: string): Promise<ParsedPOFile> {
  const textLines = await extractPdfLines(buffer);
  if (textLines.length < 8) {
    throw new Error("텍스트 레이어가 없는 PDF입니다. 스캔본/OCR PDF는 현재 지원하지 않습니다.");
  }

  const fullText = textLines.map((line) => line.text).join("\n");
  const poType = detectPDFType(fullText);
  const lines = poType === "PDF_MKTE"
    ? parseMKTEPDF(textLines, fileName)
    : parseDegreContractPDF(textLines, fileName);

  if (lines.length === 0) {
    throw new Error("PDF 텍스트는 읽었지만 지원 패턴의 PO 라인을 찾지 못했습니다.");
  }

  return {
    id: compactId("pdf", lines.length),
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

async function extractPdfLines(buffer: ArrayBuffer): Promise<PdfLine[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const lines: PdfLine[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items
      .map((item) => toTextItem(item))
      .filter((item) => item.text.length > 0);
    const rows = groupByBaseline(items);

    rows.forEach((row) => {
      const text = row
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) lines.push({ page: pageNumber, text });
    });
  }

  return lines;
}

function detectPDFType(text: string): POType {
  if (/PONo\.\s*:|SHIP-TO PLANT|Microsoft Reporting Services/i.test(text)) return "PDF_MKTE";
  if (/CONTRACT\s+ISO\d+|合约号|CNDEGRE/i.test(text)) return "PDF_DEGRE";
  throw new Error("지원하지 않는 PDF PO 양식입니다.");
}

function parseMKTEPDF(lines: PdfLine[], fileName: string): ParsedPOLine[] {
  const fullText = lines.map((line) => line.text).join("\n");
  const poNumber = matchText(fullText, /PONo\.\s*:?\s*([A-Z0-9 ]+)\b/i) || fileName.replace(/\.pdf$/i, "");
  const issuedDate = parseDate(matchText(fullText, /Created Date\s*:?\s*([0-9/.-]+)/i));
  const dueDate = parseDate(matchText(fullText, /Revision Date\s*:?\s*([0-9/.-]+)/i));
  const shipTo = matchText(fullText, /SHIP-TO PLANT\s*:?\s*([^\n]+)/i) || "DLUXE Cambodia";
  const factory = normalizeFactory(shipTo);
  const parsedLines: ParsedPOLine[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].text;
    const match = line.match(
      /^(TE\d+)\s+(.+?)\s+(\d{2}-[A-Za-z]{3}-\d{4})\s+([0-9,]+)\s+([0-9.]+)\/M\s+([0-9,]+(?:\.[0-9]+)?)/,
    );
    if (!match) continue;

    const descriptionRaw = collectMKDescription(lines, index);
    const description = normalizeDescription(descriptionRaw);
    const colorSpec = match[2].trim();
    const { color, spec } = splitColorSpec(colorSpec);
    const quantity = toNumber(match[4]);
    const unitPrice = toNumber(match[5]);
    const amount = toNumber(match[6]) || quantity * unitPrice;

    parsedLines.push({
      id: compactId("pdf", index + 1),
      sourceFile: fileName,
      rowNumber: lines[index].page,
      poNumber,
      poType: "PDF_MKTE",
      issuedDate,
      dueDate: parseDate(match[3]) || dueDate,
      descriptionRaw,
      descriptionNormalized: description.normalized,
      normalizationNote: `PDF MKTE: ${description.note}`,
      color,
      quantity,
      unit: "M",
      unitPrice,
      amount,
      spec,
      factoryRaw: shipTo,
      factoryNormalized: factory.factory,
      destinationCountry: factory.country,
      division: extractDivision(descriptionRaw),
      buyer: "MK",
      season: normalizeSeason(descriptionRaw),
      paymentTerms: "Free on Board",
    });
  }

  return parsedLines;
}

function parseDegreContractPDF(lines: PdfLine[], fileName: string): ParsedPOLine[] {
  const fullText = lines.map((line) => line.text).join("\n");
  const poNumber = matchText(fullText, /CONTRACT\s+(ISO\d+)/i) || fileName.replace(/\.pdf$/i, "");
  const issuedDate = parseDate(matchText(fullText, /Date:\s*([0-9-]+)/i));
  const attention = matchText(fullText, /(MK\s+(?:MEN|WOMEN)\s+F26\s+[^\n]+)/i) || "";
  const shipTo = matchText(fullText, /(DEGRE\s+CAMBODIA)/i) || "DEGRE CAMBODIA";
  const factory = normalizeFactory(shipTo);
  const parsedLines: ParsedPOLine[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].text;
    if (!/\bMeter\b/.test(line)) continue;

    const match = line.match(
      /(.+?)\s+([0-9,]+)\s+Meter\s+([0-9.]+)\s+([0-9,]+(?:\.[0-9]+)?)\s+(\d{4}[/-]\d{1,2}[/-]\d{1,2})\s+([A-Z0-9]+)\b/,
    );
    if (!match) continue;

    const quantity = toNumber(match[2]);
    const unitPrice = toNumber(match[3]);
    const amount = toNumber(match[4]) || quantity * unitPrice;
    const context = collectDegreContext(lines, index);
    const descriptionRaw = inferDegreDescription(context, unitPrice);
    const description = normalizeDescription(descriptionRaw);
    const color = inferDegreColor(match[1]);

    parsedLines.push({
      id: compactId("pdf", index + 1),
      sourceFile: fileName,
      rowNumber: lines[index].page,
      poNumber,
      poType: "PDF_DEGRE",
      issuedDate,
      dueDate: parseDate(match[5]),
      descriptionRaw,
      descriptionNormalized: description.normalized,
      normalizationNote: `PDF DEGRE: ${description.note}`,
      color,
      quantity,
      unit: "M",
      unitPrice,
      amount,
      spec: inferSpec(context),
      factoryRaw: shipTo,
      factoryNormalized: factory.factory,
      destinationCountry: factory.country,
      division: extractDivision(attention),
      buyer: "MK",
      season: normalizeSeason(attention),
      paymentTerms: "30 DAYS TT AFTER SHIPMENT",
    });
  }

  return parsedLines;
}

function collectMKDescription(lines: PdfLine[], startIndex: number) {
  const fragments: string[] = [];
  for (let i = startIndex + 1; i < Math.min(startIndex + 7, lines.length); i += 1) {
    const line = lines[i].text;
    if (/^TE\d+/.test(line) || /^Page\s+\d+/i.test(line)) break;
    if (/^(S-\d{2}-\d{4}|MK SIG|SAFFIANO|DOUBLE|SOLID|PEBBLE)/i.test(line)) {
      fragments.push(line);
      continue;
    }
    if (fragments.length && !/^(INVOICE NAME|FA26|MK WOMEN|MK MEN)/i.test(line)) {
      fragments.push(line);
    }
    if (/INVOICE NAME|FA26|MK WOMEN|MK MEN/i.test(line)) break;
  }
  return fragments.join(" ").replace(/\s+/g, " ").trim() || lines[startIndex].text;
}

function collectDegreContext(lines: PdfLine[], index: number) {
  return lines
    .slice(Math.max(0, index - 5), index + 1)
    .map((line) => line.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferDegreDescription(context: string, unitPrice: number) {
  if (/MK SIG SM|MK印刷小|号字母/i.test(context) || unitPrice >= 8) return "MK SIG SM (OUTLET)";
  if (/SOLID\s+PEBBLE|PEBBLE PVC|SOLID PEBBLE/i.test(context) || unitPrice <= 6.5) {
    return "SOLID PEBBLE PVC";
  }
  if (/SAFFIANO/i.test(context)) return "SAFFIANO PVC";
  return context.slice(0, 180);
}

function inferDegreColor(raw: string) {
  const text = raw.replace(/\s+/g, " ").trim();
  const known = [
    "BLACK",
    "BROWN",
    "LUGGAGE",
    "LODEN",
    "NICKEL/DARK TONAL",
    "LODEN/LIGHT TONAL",
    "VANILLA",
  ];
  const found = known.find((color) => text.toUpperCase().includes(color));
  if (found) return found;
  const englishTail = text.match(/([A-Z]+(?:\/[A-Z]+)*(?:\s+[A-Z]+)?)$/);
  return englishTail?.[1]?.trim() || text;
}

function inferSpec(context: string) {
  return context.match(/\b\d{3,4}\*[\d.]+m?m?\b/i)?.[0] || "";
}

function splitColorSpec(value: string) {
  const [color, ...specParts] = value.split(/\s+\/\s+/);
  return {
    color: color.trim(),
    spec: specParts.join(" / ").trim(),
  };
}

function toTextItem(value: unknown) {
  const item = value as { str?: string; transform?: number[] };
  return {
    text: (item.str ?? "").trim(),
    x: item.transform?.[4] ?? 0,
    y: item.transform?.[5] ?? 0,
  };
}

function groupByBaseline(items: Array<{ text: string; x: number; y: number }>) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Array<Array<{ text: string; x: number; y: number }>> = [];

  sorted.forEach((item) => {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - item.y) < 2.4);
    if (row) row.push(item);
    else rows.push([item]);
  });

  return rows;
}

function matchText(text: string, pattern: RegExp) {
  return text.match(pattern)?.[1]?.trim() ?? "";
}

function parseDate(value: string) {
  if (!value) return "";
  const isoDate = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoDate) return `${isoDate[1]}-${pad(isoDate[2])}-${pad(isoDate[3])}`;
  const slashDate = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashDate) return `${slashDate[3]}-${pad(slashDate[1])}-${pad(slashDate[2])}`;
  const monthDate = value.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (monthDate) {
    const month = monthNumber(monthDate[2]);
    if (month) return `${monthDate[3]}-${month}-${monthDate[1]}`;
  }
  return value;
}

function toNumber(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function pad(value: string) {
  return value.padStart(2, "0");
}

function monthNumber(value: string) {
  const index = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].indexOf(
    value.toUpperCase(),
  );
  return index >= 0 ? String(index + 1).padStart(2, "0") : "";
}
