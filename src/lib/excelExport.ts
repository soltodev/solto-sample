import ExcelJS from "exceljs";
import type { PIDocument, WeeklyRow } from "../types";
import { formatDate } from "./format";
import { WEEKLY_COLUMNS } from "./weekly";

export async function exportWeeklyXlsx(rows: WeeklyRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Solto Sample Demo";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("F26 Weekly Demo", {
    views: [{ state: "frozen", ySplit: 1, xSplit: 3 }],
  });

  sheet.addRow(WEEKLY_COLUMNS.map((column) => column.label));
  rows.forEach((row) => {
    sheet.addRow(
      WEEKLY_COLUMNS.map((column) => {
        const value = row[column.key];
        if (column.key === "piSent") return value ? "O" : "X";
        return value;
      }),
    );
  });

  styleHeader(sheet.getRow(1));
  sheet.columns.forEach((column, index) => {
    column.width = index === 3 ? 34 : index === 1 || index === 26 ? 22 : 14;
  });

  await downloadWorkbook(workbook, "solto-weekly-demo.xlsx");
}

export async function exportPIXlsx(pi: PIDocument) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Solto Sample Demo";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("PI");

  const rows: unknown[][] = [
    ["SOLTO INDUSTRIES CO, LTD."],
    ["KIMA BLDG., TEHERANRO 7 GIL 21,"],
    ["GANGNAM-GU, SEOUL, KOREA"],
    ["TEL: 02-553-0747 / FAX: 02-553-0748"],
    [],
    ["PO NO:", pi.poNumber, "", "", "", "DATE:", formatDate(pi.piDate)],
    [],
    ["TO:", pi.toFactory],
    [],
    ["PROFORMA INVOICE (FIRM)"],
    [],
    ["Price term:", pi.priceTerm],
    ["Payment:", pi.paymentTerms],
    ["Validity:", `Good until THE END OF ${new Date().getFullYear()}`],
    ["Packing:", "Standard export packing (Loose packing)"],
    ["Tolerance:", "+2%"],
    [],
    ["Location", "", "Description", "", "Quantity", "Unit Price", "Amount", "X-MILL Date"],
  ];

  pi.items.forEach((item) => {
    rows.push([item.location, "", item.description, "", "", "", "", formatDate(item.xMillDate)]);
    item.colors.forEach((color) => {
      rows.push(["", "", `  ${color.color}`, "", color.quantity, color.unitPrice, color.amount, ""]);
    });
  });

  rows.push([]);
  rows.push(["", "", "TOTAL:", "", pi.totalQuantity, "", pi.totalAmount, ""]);
  rows.push([]);
  rows.push([]);
  rows.push(["INDUSTRIAL BANK OF KOREA (GAYANG-DONG BRANCH)"]);
  rows.push(["A/C NO: 311-062859-56-00015"]);
  rows.push(["SWIFT CODE: IBKOKRSE"]);
  rows.push(["SOLTO INDUSTRIES CO, LTD."]);
  rows.push([]);
  rows.push(["Michael Chang", "", "", "", "", "", "Accepted by ___________"]);
  rows.push(["Managing Director"]);

  rows.forEach((row) => sheet.addRow(row));
  sheet.mergeCells("A1:H1");
  sheet.mergeCells("A10:H10");
  sheet.getRow(1).font = { bold: true, size: 15 };
  sheet.getRow(10).font = { bold: true, size: 16 };
  styleHeader(sheet.getRow(18));
  sheet.columns = [
    { width: 12 },
    { width: 4 },
    { width: 42 },
    { width: 4 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 16 },
  ];

  await downloadWorkbook(workbook, `solto-pi-${pi.poNumber}.xlsx`);
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2F3B2F" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
}
