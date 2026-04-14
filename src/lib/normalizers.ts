const FACTORY_PATTERNS: Array<{
  test: RegExp;
  factory: string;
  country: string;
}> = [
  { test: /BOYOLALI|JSB/i, factory: "JS BOYOLALI", country: "INDONESIA" },
  { test: /JAKARTA|JSJ/i, factory: "JS JAKARTA", country: "INDONESIA" },
  { test: /JSDG|DONGGUAN/i, factory: "JS DONGGUAN", country: "CHINA" },
  { test: /SUPERL/i, factory: "SUPERL CAMBODIA", country: "CAMBODIA" },
  { test: /DLUXE/i, factory: "DLUXE CAMBODIA", country: "CAMBODIA" },
  { test: /VIETNAM/i, factory: "SIMONE VIETNAM", country: "VIETNAM" },
  { test: /CAMBODIA/i, factory: "SIMONE CAMBODIA", country: "CAMBODIA" },
  { test: /INDONESIA/i, factory: "SIMONE INDONESIA", country: "INDONESIA" },
  { test: /SIMONE/i, factory: "SIMONE INN", country: "KOREA" },
];

export function normalizeFactory(raw: string) {
  const value = raw.trim();
  const found = FACTORY_PATTERNS.find((pattern) => pattern.test.test(value));
  return {
    factory: found?.factory ?? (value.replace(/\s+/g, " ").trim() || "UNASSIGNED FACTORY"),
    country: found?.country ?? inferCountry(value),
  };
}

export function extractDivision(raw: string) {
  const text = raw.toUpperCase();
  if (text.includes("OUTLET")) return "OUTLET";
  if (text.includes("MAINLINE") || text.includes("MAIN")) return "MAINLINE";
  if (text.includes("CUTUP")) return "CUTUP";
  if (text.includes("SAMPLE")) return "SAMPLE";
  return "MAINLINE";
}

export function normalizeSeason(raw: string) {
  const text = raw.toUpperCase();
  if (text.includes("FAL26") || text.includes("FA26") || text === "FA") return "FAL26";
  if (text.includes("F26")) return "F26";
  return text || "FAL26";
}

export function normalizeDescription(raw: string) {
  const cleaned = cleanDescription(raw);
  const upper = cleaned.toUpperCase();

  if (upper.includes("BIAGIO") || upper.includes("SEMI LUX")) {
    return {
      normalized: "MK SIG SEMI LUX SM",
      note: "BIAGIO/SEMI LUX pattern",
    };
  }

  if (upper.includes("COATED TWILL") || upper.includes("SOLTO SIG COATED TWILL")) {
    if (/\bMD\b/.test(upper)) return { normalized: "MK SIG MD", note: "COATED TWILL MD" };
    return { normalized: "MK SIG SM", note: "COATED TWILL SM" };
  }

  if (upper.includes("DOUBLE SIDED") || upper.includes("DBSD") || upper.includes("DBLSD")) {
    if (upper.includes("NAPPA")) {
      return {
        normalized: "1.6mm DBLSD MK SIG SM / NEW NAPPA PU BACKING",
        note: "double-sided nappa backing",
      };
    }
    if (upper.includes("SAFFIANO")) {
      return { normalized: "DBLSD SAFFIANO PVC", note: "double-sided saffiano" };
    }
    return { normalized: "DBLSD MK SIG SM", note: "double-sided MK signature" };
  }

  if (upper.includes("POP") && upper.includes("PEBBLE")) {
    return { normalized: "POP PEBBLE PVC", note: "POP pebble pattern" };
  }

  if (upper.includes("SAFFIANO")) {
    return { normalized: "MK SOLTO SAFFIANO PVC 1.0mm", note: "SAFFIANO PVC" };
  }

  if (/\bMK SIG\b/.test(upper)) {
    if (/\bMD\b/.test(upper)) return { normalized: "MK SIG MD", note: "MK SIG MD fallback" };
    return { normalized: "MK SIG SM", note: "MK SIG SM fallback" };
  }

  return { normalized: cleaned || "UNMAPPED DESCRIPTION", note: "cleaned text fallback" };
}

export function cleanDescription(raw: string) {
  return raw
    .toUpperCase()
    .replace(/^M\/K\s+/, "MK ")
    .replace(/^\(MK\)\s*/i, "")
    .replace(/\s*-?\s*SOLTO\s*\(A\)\s*$/i, "")
    .replace(/\s*\([^)]*(?:CM|OUTLET|MAIN|THICKNESS|SOLTO|W\.NAPPA)[^)]*\)/gi, " ")
    .replace(/["”“]/g, " ")
    .replace(/[-/]/g, " ")
    .replace(/\s*COATED TWILL\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCountry(raw: string) {
  const text = raw.toUpperCase();
  if (text.includes("CAMBODIA")) return "CAMBODIA";
  if (text.includes("INDONESIA")) return "INDONESIA";
  if (text.includes("VIETNAM")) return "VIETNAM";
  if (text.includes("CHINA")) return "CHINA";
  return "KOREA";
}
