/**
 * Parses raw CSV text into a 2D array of string values, correctly handling double-quoted cells and line endings.
 */
export const parseCSV = (rawText: string): string[][] => {
  if (!rawText) return [];
  // Strip UTF-8 Byte Order Mark (BOM)
  const text = rawText.replace(/^\uFEFF/, "");

  // Auto-detect delimiter (comma, semicolon, tab)
  const firstLine = text.split(/\r?\n/)[0] || "";
  let delimiter = ",";
  if (!firstLine.includes(",") && firstLine.includes(";")) {
    delimiter = ";";
  } else if (!firstLine.includes(",") && firstLine.includes("\t")) {
    delimiter = "\t";
  }

  const lines: string[][] = [];
  let row: string[] = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      row.push("");
    } else if ((c === "\r" || c === "\n") && !inQuotes) {
      if (c === "\r" && next === "\n") {
        i++;
      }
      lines.push(row.map((cell) => cell.trim().replace(/^"(.*)"$/, "$1")));
      row = [""];
    } else {
      row[row.length - 1] += c;
    }
  }

  if (row.length > 1 || row[0] !== "") {
    lines.push(row.map((cell) => cell.trim().replace(/^"(.*)"$/, "$1")));
  }
  return lines;
};
