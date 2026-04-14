import type { ParsedPOLine, WeeklyRow } from "../types";

export const WEEKLY_COLUMNS: Array<{ key: keyof WeeklyRow; label: string }> = [
  { key: "type", label: "TYPE" },
  { key: "factoryName", label: "FACTORY NAME" },
  { key: "poNumber", label: "PO#" },
  { key: "mkArticleName", label: "MK ARTICLE NAME" },
  { key: "materialColor", label: "MATERIAL COLOR" },
  { key: "quantity", label: "Q'ty" },
  { key: "actualShipQuantity", label: "Actual ship Q'ty" },
  { key: "openQuantity", label: "Open Q'ty" },
  { key: "unit", label: "UNIT OF MEASURE" },
  { key: "poIssuedDate", label: "PO ISSUED DATE" },
  { key: "supplierConfirmedEtd", label: "업체 납기" },
  { key: "factoryRequestEtd", label: "공장 납기" },
  { key: "supplierActualEtd", label: "SUPPLIER ACTUAL ETD" },
  { key: "invoiceNumber", label: "INVOICE#" },
  { key: "piSent", label: "PI 발송여부" },
  { key: "materialPaymentTerms", label: "MATERIAL PAYMENT TERMS" },
  { key: "sellingUnitPrice", label: "(Selling) Unit Price" },
  { key: "sellingTotalAmount", label: "(Selling) Total amount" },
  { key: "buyingUnitPrice", label: "(Buying) Unit Price" },
  { key: "buyingTotalAmount", label: "(Buying) Total amount" },
  { key: "destination", label: "SHIP TO DESTINATION" },
  { key: "shipMethod", label: "SHIP TO METHOD" },
  { key: "comments", label: "COMMENTS" },
  { key: "division", label: "DIVISION" },
  { key: "devStatus", label: "DEV STATUS" },
  { key: "testResult", label: "TEST RESULT" },
  { key: "sourceFile", label: "SOURCE FILE" },
];

export function buildWeeklyRows(lines: ParsedPOLine[]): WeeklyRow[] {
  return lines.map((line, index) => {
    const sellingTotal = line.amount || line.quantity * line.unitPrice;
    const buyingUnitPrice = line.unitPrice > 0 ? round(line.unitPrice * 0.82, 4) : 0;

    return {
      id: `weekly-${line.id}-${index}`,
      sourceLineId: line.id,
      type: "HB",
      factoryName: line.factoryNormalized,
      poNumber: line.poNumber,
      mkArticleName: line.descriptionNormalized,
      materialColor: line.color,
      quantity: line.quantity,
      actualShipQuantity: 0,
      openQuantity: line.quantity,
      unit: line.unit || "M",
      poIssuedDate: line.issuedDate,
      supplierConfirmedEtd: line.dueDate || "",
      factoryRequestEtd: "",
      supplierActualEtd: "",
      invoiceNumber: "",
      piSent: false,
      materialPaymentTerms: line.paymentTerms || "FOB",
      sellingUnitPrice: line.unitPrice,
      sellingTotalAmount: sellingTotal,
      buyingUnitPrice,
      buyingTotalAmount: round(line.quantity * buyingUnitPrice, 2),
      destination: line.destinationCountry,
      shipMethod: line.poType === "JS_SAMPLE" ? "COURIER" : "SEA",
      comments: line.normalizationNote,
      division: line.division,
      devStatus: line.poType === "JS_SAMPLE" ? "SAMPLE" : "BULK",
      testResult: "",
      sourceFile: line.sourceFile,
    };
  });
}

export function summarizeWeekly(rows: WeeklyRow[]) {
  const totalQuantity = rows.reduce((total, row) => total + row.quantity, 0);
  const totalAmount = rows.reduce((total, row) => total + row.sellingTotalAmount, 0);
  const factories = new Set(rows.map((row) => row.factoryName)).size;
  const descriptions = new Set(rows.map((row) => row.mkArticleName)).size;

  return { totalQuantity, totalAmount, factories, descriptions };
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
