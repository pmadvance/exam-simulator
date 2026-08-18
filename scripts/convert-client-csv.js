const fs = require('fs');
const path = require('path');

// Read client CSV
const clientCsvPath = path.join(__dirname, '../sample/PMP Practice Exam Question Bank_2nd 50.csv');
const outputPath = path.join(__dirname, '../sample/client-questions-converted.csv');

const csvText = fs.readFileSync(clientCsvPath, 'utf-8');

// Parse CSV handling quoted fields with newlines
const rows = [];
let currentRow = [];
let currentField = "";
let inQuotes = false;

for (let i = 0; i < csvText.length; i++) {
  const char = csvText[i];
  const nextChar = csvText[i + 1];

  if (char === '"') {
    if (inQuotes && nextChar === '"') {
      currentField += '"';
      i++;
    } else {
      inQuotes = !inQuotes;
    }
  } else if (char === ',' && !inQuotes) {
    currentRow.push(currentField.trim());
    currentField = "";
  } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
    if (char === '\r') i++;
    currentRow.push(currentField.trim());
    if (currentRow.length > 1 || currentRow[0]) {
      rows.push(currentRow);
    }
    currentRow = [];
    currentField = "";
  } else {
    currentField += char;
  }
}

if (currentField || currentRow.length > 0) {
  currentRow.push(currentField.trim());
  rows.push(currentRow);
}

// Find header row
let headerRowIndex = 0;
let headerRow = [];
for (let i = 0; i < Math.min(10, rows.length); i++) {
  const row = rows[i];
  const rowText = row.join(",").toLowerCase();
  if (rowText.includes("stem") || rowText.includes("option a") || rowText.includes("key")) {
    headerRow = row;
    headerRowIndex = i;
    break;
  }
}

if (headerRow.length === 0) {
  console.error("Could not find header row");
  process.exit(1);
}

// Map column indices
const getIndex = (names) => {
  for (const name of names) {
    const idx = headerRow.findIndex(h => h.toLowerCase().trim() === name.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
};

const colMap = {
  stem: getIndex(["stem"]),
  key: getIndex(["key"]),
  optionA: getIndex(["option a"]),
  optionB: getIndex(["option b"]),
  optionC: getIndex(["option c"]),
  optionD: getIndex(["option d"]),
  optionE: getIndex(["option e"]),
  feedback: getIndex(["feedback"]),
  eco: getIndex(["eco (domain.task)", "eco", "eco domain"]),
  classification: getIndex(["classification"]),
};

console.log("Column mapping:", colMap);

// Encode CSV cell
function encodeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  const text = String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return `"${text}"`;
}

// Generate output CSV
const outputLines = [
  "prompt,optionA,optionB,optionC,optionD,optionE,correctAnswer,explanation,ecoDomain,performanceDomain"
];

let imported = 0;
let skipped = 0;

for (let i = headerRowIndex + 1; i < rows.length; i++) {
  const row = rows[i];
  
  if (row.length < 3) continue;
  
  const stem = row[colMap.stem] || "";
  const key = row[colMap.key] || "";
  const optionA = row[colMap.optionA] || "";
  const optionB = row[colMap.optionB] || "";
  const optionC = row[colMap.optionC] || "";
  const optionD = row[colMap.optionD] || "";
  const optionE = row[colMap.optionE] || "";
  const feedback = row[colMap.feedback] || "";
  const eco = row[colMap.eco] || "";
  const classification = row[colMap.classification] || "";

  if (!stem || !optionA || !optionB || !key) {
    skipped++;
    continue;
  }

  // Clean up the text - replace newlines with spaces
  const cleanStem = stem.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanOptionA = optionA.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanOptionB = optionB.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanOptionC = optionC.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanOptionD = optionD.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanOptionE = optionE.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanFeedback = feedback.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();

  outputLines.push([
    encodeCsvCell(cleanStem),
    encodeCsvCell(cleanOptionA),
    encodeCsvCell(cleanOptionB),
    encodeCsvCell(cleanOptionC),
    encodeCsvCell(cleanOptionD),
    encodeCsvCell(cleanOptionE),
    encodeCsvCell(key),
    encodeCsvCell(cleanFeedback),
    encodeCsvCell(eco),
    encodeCsvCell(classification),
  ].join(","));
  
  imported++;
}

fs.writeFileSync(outputPath, outputLines.join("\n"));
console.log(`Converted ${imported} questions, skipped ${skipped}`);
console.log(`Output saved to: ${outputPath}`);
