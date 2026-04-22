export type POType = "JS_SAMPLE" | "JS_BULK" | "SIMONE";

export interface ParsedPOFile {
  id: string;
  fileName: string;
  poType: POType;
  poNumber: string;
  issuedDate: string;
  dueDate?: string;
  factory: string;
  lineCount: number;
  totalQuantity: number;
  totalAmount: number;
  lines: ParsedPOLine[];
}

export interface ParsedPOLine {
  id: string;
  sourceFile: string;
  rowNumber: number;
  poNumber: string;
  poType: POType;
  issuedDate: string;
  dueDate?: string;
  descriptionRaw: string;
  descriptionNormalized: string;
  normalizationNote: string;
  color: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  spec?: string;
  factoryRaw: string;
  factoryNormalized: string;
  destinationCountry: string;
  division: string;
  buyer: string;
  season: string;
  paymentTerms?: string;
}

export interface WeeklyRow {
  id: string;
  sourceLineId: string;
  type: string;
  factoryName: string;
  poNumber: string;
  mkArticleName: string;
  materialColor: string;
  quantity: number;
  actualShipQuantity: number;
  openQuantity: number;
  unit: string;
  poIssuedDate: string;
  supplierConfirmedEtd: string;
  factoryRequestEtd: string;
  supplierActualEtd: string;
  invoiceNumber: string;
  piSent: boolean;
  materialPaymentTerms: string;
  sellingUnitPrice: number;
  sellingTotalAmount: number;
  buyingUnitPrice: number;
  buyingTotalAmount: number;
  destination: string;
  shipMethod: string;
  comments: string;
  division: string;
  devStatus: string;
  testResult: string;
  sourceFile: string;
}

export interface PIDocument {
  id: string;
  toFactory: string;
  poNumber: string;
  piDate: string;
  priceTerm: string;
  paymentTerms: string;
  items: PIItem[];
  totalQuantity: number;
  totalAmount: number;
}

export interface PIItem {
  location: string;
  description: string;
  xMillDate: string;
  colors: PIColorLine[];
}

export interface PIColorLine {
  color: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface SampleFile {
  label: string;
  description: string;
  path: string;
}
