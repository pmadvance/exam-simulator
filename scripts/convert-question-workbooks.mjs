#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const projectRoot = path.resolve(import.meta.dirname, "..");
const requireFromApi = createRequire(path.join(projectRoot, "apps/api/package.json"));
const XLSX = requireFromApi("xlsx");

const inputDir = path.resolve(process.argv[2] ?? path.join(os.homedir(), "Downloads/PM Exam Pro"));
const outputDir = path.resolve(process.argv[3] ?? path.join(projectRoot, "imports/questions"));

const outputNames = new Map([
  ["CAPM Practice Items for Premier ATPs_Q1 2024.xlsx", "capm-q1-2024.csv"],
  ["CAPM Practice Items for Premier ATPs_Q3 2024.xlsx", "capm-q3-2024.csv"],
  ["CAPM Practice exam questions_Q1 2025.xlsx", "capm-q1-2025.csv"],
  ["FINAL_PMP Practice Exam items_Q1_2023.xlsx", "pmp-q1-2023.csv"],
  ["FINAL_PMP Practice Questions Premier ATPs_Q4 2022.xlsx", "pmp-q4-2022.csv"],
  ["PMP practice exam items_2023_Q4_50 new Qs.xlsx", "pmp-q4-2023.csv"],
  ["Q4 2024_Premier ATP PMP practice exam questions.xlsx", "pmp-q4-2024.csv"],
]);

const csvHeaders = [
  "questionType",
  "prompt",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "optionE",
  "correctAnswer",
  "explanation",
  "ecoDomain",
  "performanceDomain",
  "imageUrl",
  "status",
  "difficulty",
];

function clean(value) {
  let openingQuote = true;
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    // The application's CSV parser does not preserve RFC 4180 escaped quotes.
    // Typographic quotes retain the text while keeping generated CSV import-safe.
    .replace(/"/g, () => {
      const quote = openingQuote ? "“" : "”";
      openingQuote = !openingQuote;
      return quote;
    })
    .trim();
}

function normalizedHeader(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function csvCell(value) {
  return `"${clean(value).replace(/"/g, '""')}"`;
}

function findColumn(headers, predicate, required = true) {
  const index = headers.findIndex((header) => predicate(normalizedHeader(header), clean(header)));
  if (index < 0 && required) {
    throw new Error(`Missing required column in header: ${headers.map(clean).join(" | ")}`);
  }
  return index;
}

function normalizeCorrectAnswer(value) {
  const letters = clean(value).toUpperCase().match(/[A-E]/g) ?? [];
  return [...new Set(letters)].sort().join(",");
}

function inferQuestionType(correctAnswer, options) {
  if (correctAnswer.includes(",")) return "multiple_response";
  if (options[2] === "" && options[3] === "" && options[4] === "") return "true_false";
  return "single_choice";
}

function inferApproach(sourceId, classification) {
  const explicit = clean(classification);
  const explicitCode = explicit.toUpperCase().match(/^(A|H|P|X|AG)$/)?.[1];
  const id = clean(sourceId).toUpperCase();
  const idCode = id.match(/^C([AHPX])/)?.[1] ?? id.match(/^([AHPX])/)?.[1];
  const code = explicitCode === "AG" ? "X" : explicitCode ?? idCode;
  return ({ A: "Agile", H: "Hybrid", P: "Predictive", X: "Agnostic" })[code] ?? explicit;
}

function convertWorkbook(inputPath) {
  const workbook = XLSX.readFile(inputPath, { cellDates: false });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    const headerIndex = rows.findIndex((row) => {
      const headers = row.map(normalizedHeader);
      return headers.some((header) => header.includes("stem"))
        && headers.some((header) => header === "key" || header.includes("answerkey"))
        && headers.includes("optiona")
        && headers.includes("optionb");
    });
    if (headerIndex < 0) continue;

    const headers = rows[headerIndex];
    const columns = {
      sourceId: findColumn(headers, (header) => ["idnumber", "itemidnumber", "itemid"].includes(header), false),
      eco: findColumn(headers, (header) => header.startsWith("eco")),
      classification: findColumn(headers, (header) => header.startsWith("classification"), false),
      prompt: findColumn(headers, (header) => header.includes("stem")),
      key: findColumn(headers, (header) => header === "key" || header.includes("answerkey")),
      optionA: findColumn(headers, (header) => header === "optiona"),
      optionB: findColumn(headers, (header) => header === "optionb"),
      optionC: findColumn(headers, (header) => header === "optionc"),
      optionD: findColumn(headers, (header) => header === "optiond"),
      optionE: findColumn(headers, (header) => header === "optione", false),
      explanation: findColumn(headers, (header) => header.includes("feedback") || header.includes("rationale")),
    };

    const records = [];
    for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const prompt = clean(row[columns.prompt]);
      if (!prompt) continue;

      const options = [
        clean(row[columns.optionA]),
        clean(row[columns.optionB]),
        clean(row[columns.optionC]),
        clean(row[columns.optionD]),
        columns.optionE >= 0 ? clean(row[columns.optionE]) : "",
      ];
      const correctAnswer = normalizeCorrectAnswer(row[columns.key]);
      const missingRequired = !options[0] || !options[1] || !options[2] || !options[3];
      if (missingRequired || !correctAnswer) {
        throw new Error(`${path.basename(inputPath)} row ${rowIndex + 1}: invalid options or answer key`);
      }

      const sourceId = columns.sourceId >= 0 ? row[columns.sourceId] : "";
      const classification = columns.classification >= 0 ? row[columns.classification] : "";
      const values = [
        inferQuestionType(correctAnswer, options),
        prompt,
        ...options,
        correctAnswer,
        clean(row[columns.explanation]),
        clean(row[columns.eco]),
        inferApproach(sourceId, classification),
        "",
        "draft",
        "",
      ];
      records.push(values);
    }

    if (records.length === 0) throw new Error(`${path.basename(inputPath)}: no question rows found`);
    return { sheetName, records };
  }

  throw new Error(`${path.basename(inputPath)}: no question worksheet found`);
}

if (!fs.existsSync(inputDir)) throw new Error(`Input directory not found: ${inputDir}`);
fs.mkdirSync(outputDir, { recursive: true });

const sourceFiles = fs.readdirSync(inputDir)
  .filter((name) => /\.xlsx?$/i.test(name) && !name.startsWith("~$"))
  .sort();

const summaries = [];
for (const sourceName of sourceFiles) {
  const outputName = outputNames.get(sourceName);
  if (!outputName) throw new Error(`No output filename configured for: ${sourceName}`);

  const { sheetName, records } = convertWorkbook(path.join(inputDir, sourceName));
  const csv = [csvHeaders, ...records].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
  fs.writeFileSync(path.join(outputDir, outputName), csv, "utf8");
  summaries.push({ sourceName, sheetName, outputName, questions: records.length });
}

console.table(summaries);
console.log(`Converted ${summaries.reduce((sum, item) => sum + item.questions, 0)} questions into ${outputDir}`);
