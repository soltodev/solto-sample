import type { PIDocument, PIItem, WeeklyRow } from "../types";
import { todayISO } from "./format";

export function generatePIDocuments(rows: WeeklyRow[]): PIDocument[] {
  const byFactoryAndPo = new Map<string, WeeklyRow[]>();

  rows.forEach((row) => {
    const key = `${row.factoryName}__${row.poNumber}`;
    const group = byFactoryAndPo.get(key) ?? [];
    group.push(row);
    byFactoryAndPo.set(key, group);
  });

  return Array.from(byFactoryAndPo.entries()).map(([key, group]) => {
    const [toFactory, poNumber] = key.split("__");
    const items = buildPIItems(group);

    return {
      id: `pi-${slug(toFactory)}-${slug(poNumber)}`,
      toFactory,
      poNumber,
      piDate: todayISO(),
      priceTerm: "FOB",
      paymentTerms: "T/T after shipment within 60 days",
      items,
      totalQuantity: group.reduce((total, row) => total + row.quantity, 0),
      totalAmount: group.reduce((total, row) => total + row.sellingTotalAmount, 0),
    };
  });
}

function buildPIItems(rows: WeeklyRow[]): PIItem[] {
  const byDescription = new Map<string, WeeklyRow[]>();

  rows.forEach((row) => {
    const group = byDescription.get(row.mkArticleName) ?? [];
    group.push(row);
    byDescription.set(row.mkArticleName, group);
  });

  return Array.from(byDescription.entries()).map(([description, group]) => ({
    location: "Korea",
    description,
    xMillDate: group.find((row) => row.supplierConfirmedEtd)?.supplierConfirmedEtd ?? "",
    colors: group.map((row) => ({
      color: row.materialColor,
      quantity: row.quantity,
      unitPrice: row.sellingUnitPrice,
      amount: row.sellingTotalAmount,
    })),
  }));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
