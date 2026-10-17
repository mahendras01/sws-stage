import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ReceiptExtractionStatus = "complete" | "partial" | "failed";

export type ReceiptExtractionResult = {
  paymentProvider: string | null;
  transactionDate: string | null;
  transactionTime: string | null;
  amount: number | null;
  transactionId: string | null;
  utr: string | null;
  payerName: string | null;
  payeeName: string | null;
  extractionStatus: ReceiptExtractionStatus;
  rawText: string;
  warnings: string[];
};

export const MAX_RECEIPT_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const SUPPORTED_RECEIPT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export function isWorkerBasedReceiptParsingEnabled() {
  return process.env.ENABLE_PDFJS === "true" || process.env.ENABLE_OCR === "true";
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeTextForSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function readFileTypeFromSignature(buffer: Buffer) {
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x25, 0x50, 0x44, 0x46]))) {
    return "application/pdf";
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return "image/jpeg";
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) && buffer.subarray(8, 12).equals(Buffer.from([0x57, 0x45, 0x42, 0x50]))) {
    return "image/webp";
  }
  return null;
}

export async function validateReceiptFile(file: File | Blob, fileName = "receipt") {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || readFileTypeFromSignature(buffer) || "";
  const resolvedFileName = "name" in file ? file.name : fileName;
  const extension = resolvedFileName.split(".").pop()?.toLowerCase() || "";
  const isPdf = mimeType === "application/pdf" || extension === "pdf";
  const allowedMime = isPdf ? mimeType === "application/pdf" : SUPPORTED_RECEIPT_MIME_TYPES.includes(mimeType);

  if (!allowedMime) {
    return { valid: false, error: "Unsupported file type. Please upload a PDF, JPEG, PNG, or WebP image." };
  }

  if (buffer.length === 0) {
    return { valid: false, error: "Uploaded file is empty." };
  }

  if (buffer.length > MAX_RECEIPT_FILE_SIZE_BYTES) {
    return { valid: false, error: `Uploaded file is too large. Maximum supported size is ${MAX_RECEIPT_FILE_SIZE_BYTES / (1024 * 1024)}MB.` };
  }

  const signatureType = readFileTypeFromSignature(buffer);
  if (signatureType && mimeType && signatureType !== mimeType) {
    return { valid: false, error: "The file signature does not match its declared MIME type." };
  }

  if (isPdf && signatureType !== "application/pdf") {
    return { valid: false, error: "The PDF signature looks invalid or the file is malformed." };
  }

  if (!isPdf) {
    const validImageTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validImageTypes.includes(signatureType ?? mimeType)) {
      return { valid: false, error: "The image file is not a valid JPEG, PNG, or WebP image." };
    }
  }

  return { valid: true, buffer, mimeType };
}

async function extractPdfTextWithSystem(buffer: Buffer) {
  const pdftotext = process.env.PDFTOTEXT_PATH || "pdftotext";
  const fs = await import("node:fs/promises");
  try {
    const tempDir = process.env.TMPDIR || "/tmp";
    const inputPath = `${tempDir}/sws-receipt-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`;
    await fs.writeFile(inputPath, buffer);
    const { stdout } = await execFileAsync(pdftotext, [inputPath, "-"], { maxBuffer: 50 * 1024 * 1024 });
    await fs.unlink(inputPath).catch(() => undefined);
    return String(stdout ?? "");
  } catch {
    return "";
  }
}

async function extractPdfTextWithPdfJs(buffer: Buffer) {
  if (process.env.ENABLE_PDFJS !== "true") {
    return "";
  }

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    let text = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => (typeof item.str === "string" ? item.str : ""))
        .join(" ");
      text += `\n${pageText}`;
    }

    return text;
  } catch {
    return "";
  }
}

async function ocrImageBuffer(buffer: Buffer, _mimeType: string) {
  if (process.env.ENABLE_OCR !== "true") {
    return "";
  }

  try {
    const { default: Tesseract } = await import("tesseract.js");
    const result = await Tesseract.recognize(buffer, "eng", {
      logger: () => undefined,
    });
    return result?.data?.text ?? "";
  } catch {
    return "";
  }
}

async function ocrScannedPdf(buffer: Buffer) {
  const pdftoppm = process.env.PDFTOPPM_PATH || "pdftoppm";
  const fsp = await import("node:fs/promises");
  try {
    const tempDir = process.env.TMPDIR || "/tmp";
    const inputPath = `${tempDir}/sws-receipt-${Date.now()}.pdf`;
    const outputPrefix = `${tempDir}/sws-receipt-${Date.now()}`;
    await fsp.writeFile(inputPath, buffer);
    await execFileAsync(pdftoppm, ["-png", "-r", "200", "-singlefile", inputPath, outputPrefix], { maxBuffer: 200 * 1024 * 1024 });
    const generated = await fsp.readdir(tempDir).then((items) => items.filter((item) => item.startsWith("sws-receipt-") && item.endsWith(".png"))).catch(() => []);
    if (generated.length === 0) return "";
    const firstImage = `${tempDir}/${generated[0]}`;
    const firstImageBuffer = await fsp.readFile(firstImage);
    return ocrImageBuffer(firstImageBuffer, "image/png");
  } catch {
    return "";
  }
}

async function extractTextFromFile(file: File | Blob) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || readFileTypeFromSignature(buffer) || "application/octet-stream";

  if (mimeType === "application/pdf") {
    const textFromSystem = await extractPdfTextWithSystem(buffer);
    if (textFromSystem && textFromSystem.trim().length > 40) {
      return textFromSystem;
    }

    const textFromPdfJs = await extractPdfTextWithPdfJs(buffer);
    if (textFromPdfJs && textFromPdfJs.trim().length > 40) {
      return textFromPdfJs;
    }

    const scannedText = await ocrScannedPdf(buffer);
    if (scannedText && scannedText.trim().length > 20) {
      return scannedText;
    }

    return "";
  }

  return ocrImageBuffer(buffer, mimeType);
}

function parseAmountValue(value: string | null) {
  if (!value) return null;
  const cleaned = value.replace(/[₹,\s]/g, "").replace(/inr/i, "").trim();
  const asNumber = Number(cleaned);
  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    return null;
  }
  return Number(asNumber.toFixed(2));
}

function parseDateValue(value: string | null) {
  if (!value) return null;
  const raw = value.trim();
  const match = raw.match(/(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/);
  const candidate = match?.[1] ?? raw;

  if (!candidate) return null;

  try {
    const parts = candidate.split(/[\/\-]/).filter(Boolean).map(Number);
    if (parts.length !== 3) return null;

    const [first, second, third] = parts;

    if (String(first).length >= 4) {
      const [year, month, day] = [first, second, third];
      const date = new Date(Date.UTC(year, month - 1, day));
      return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
    }

    const year = third >= 100 ? third : 2000 + third;
    let day = first;
    let month = second;

    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      day = second;
      month = first;
    } else {
      day = first;
      month = second;
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function parseTimeValue(value: string | null) {
  if (!value) return null;
  const match = value.match(/(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)?)/);
  if (!match) return null;
  return match[1].trim();
}

function cleanReferenceValue(value: string | null) {
  if (!value) return null;
  const cleaned = value
    .replace(/^(txn|transaction|ref|reference|utr|bank ref|rrn)\s*[:=-]?\s*/i, "")
    .replace(/\s+(?:paid by|date|on|time|txn|transaction|utr|reference|ref|order id)\b.*$/i, "")
    .trim();
  return cleaned.replace(/[^A-Za-z0-9\-_/.: ]/g, "").trim() || null;
}

function cleanPersonName(value: string | null) {
  if (!value) return null;
  const cleaned = value
    .replace(/\s+(?:date|on|time|txn|transaction|utr|reference|ref|paid by)\b.*$/i, "")
    .trim();
  return cleaned || null;
}

function findCandidateText(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) return match[1] ?? match[0];
  }
  return null;
}

function extractProvider(text: string) {
  const normalized = text.toLowerCase();
  if (/phonepe/.test(normalized)) return "PhonePe";
  if (/google\s*pay|gpay|googlepay/.test(normalized)) return "Google Pay";
  if (/paytm/.test(normalized)) return "Paytm";
  if (/upi|bhim|bharatpe|amazon pay/.test(normalized)) return "UPI";
  if (/hdfc|icici|sbi|axis|kotak|yes bank|bank transfer|neft|rtgs|imps/.test(normalized)) return "Bank Transfer";
  if (/cashfree|razorpay|instamojo/.test(normalized)) return "Online Payment";
  return null;
}

export function extractPaymentFieldsFromText(text: string): Partial<ReceiptExtractionResult> {
  const cleanedText = normalizeWhitespace(text || "");
  const amountPatterns = [
    /(?:inr|rs\.?|₹)\s*[:=]?\s*(\d[\d,]*(?:\.\d{1,2})?)/gi,
    /(?:amount|total amount|payment amount)\s*[:=]?\s*(?:inr\s*)?(\d[\d,]*(?:\.\d{1,2})?)/gi,
    /(?:amount\s*paid|paid\s*amount)\s*[:=]?\s*(?:inr\s*)?(\d[\d,]*(?:\.\d{1,2})?)/gi,
  ];

  const amountCandidate = amountPatterns
    .map((pattern) => {
      pattern.lastIndex = 0;
      const match = pattern.exec(cleanedText);
      return match?.[1] ?? null;
    })
    .find(Boolean) ?? null;

  const dateCandidate = findCandidateText(cleanedText, [
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{2}\/\d{2}\/\d{4})/,
    /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,
  ]);

  const timeCandidate = findCandidateText(cleanedText, [
    /(\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)?)/,
  ]);

  const transactionId = cleanReferenceValue(
    findCandidateText(cleanedText, [
      /(?:transaction\s*id|txn\s*id|transaction\s*reference|ref\s*no|reference\s*no|order\s*id)\s*[:=]\s*([A-Za-z0-9-_/.:]{4,80})(?=\s+(?:paid by|date|on|utr|txn|transaction|reference|ref|$))/i,
      /(?:transaction\s*id|txn\s*id|reference\s*no|ref\s*no|order\s*id)\s*[:=]\s*([A-Za-z0-9-_/.:]{4,80})(?=\s+(?:paid by|date|on|utr|txn|transaction|reference|ref|$))/i,
      /(?:transaction\s*id|txn\s*id|ref\s*no|reference\s*no|order\s*id)\s*[:=]?\s*([A-Z0-9][A-Z0-9-_/.:]{4,80})(?=\s+(?:paid by|date|on|utr|txn|transaction|reference|ref|$))/i,
    ]) || null,
  );

  const utr = cleanReferenceValue(
    findCandidateText(cleanedText, [
      /(?:utr|bank\s*reference|ref\s*no|imps\s*ref|rrn|payment\s*reference)\s*[:=]\s*([A-Za-z0-9-_/.:]{4,80})(?=\s+(?:paid by|date|on|txn|transaction|ref|reference|$))/i,
      /(?:utr|bank\s*reference|imps\s*ref|rrn)\s*[:=]?\s*([A-Z0-9][A-Z0-9-_/.:]{4,80})(?=\s+(?:paid by|date|on|txn|transaction|ref|reference|$))/i,
    ]) || null,
  );

  const payerName = cleanPersonName(findCandidateText(cleanedText, [
    /(?:payer|paid\s*by|from|account\s*holder)\s*[:=]\s*([A-Z][A-Za-z0-9 .,&'-]{2,80})/i,
  ]));

  const payeeName = cleanPersonName(findCandidateText(cleanedText, [
    /(?:payee|merchant|beneficiary|recipient|to)\s*[:=]\s*([A-Z][A-Za-z0-9 .,&'-]{2,80})/i,
  ]));

  const paymentProvider = extractProvider(cleanedText);

  const numericAmount = parseAmountValue(amountCandidate);
  const parsedDate = parseDateValue(dateCandidate);
  const parsedTime = parseTimeValue(timeCandidate);

  return {
    paymentProvider,
    transactionDate: parsedDate,
    transactionTime: parsedTime,
    amount: numericAmount,
    transactionId,
    utr,
    payerName: payerName ? normalizeWhitespace(payerName) : null,
    payeeName: payeeName ? normalizeWhitespace(payeeName) : null,
    rawText: cleanedText.slice(0, 8000),
  };
}

export async function extractPaymentDocumentData(file: File | Blob): Promise<ReceiptExtractionResult> {
  const validation = await validateReceiptFile(file, "name" in file ? file.name : "receipt");
  if (!validation.valid) {
    return {
      paymentProvider: null,
      transactionDate: null,
      transactionTime: null,
      amount: null,
      transactionId: null,
      utr: null,
      payerName: null,
      payeeName: null,
      extractionStatus: "failed",
      rawText: "",
      warnings: [validation.error || "File validation failed."],
    };
  }

  const extractedText = await extractTextFromFile(file);
  const parsed = extractPaymentFieldsFromText(extractedText || "");
  const warnings: string[] = [];

  if (!parsed.amount) warnings.push("Amount could not be read reliably.");
  if (!parsed.transactionId && !parsed.utr) warnings.push("Payment reference could not be read reliably.");
  if (!parsed.transactionDate) warnings.push("Transaction date could not be read reliably.");

  const status: ReceiptExtractionStatus = warnings.length === 0 ? "complete" : parsed.amount || parsed.transactionId || parsed.utr ? "partial" : "failed";

  return {
    paymentProvider: parsed.paymentProvider ?? null,
    transactionDate: parsed.transactionDate ?? null,
    transactionTime: parsed.transactionTime ?? null,
    amount: parsed.amount ?? null,
    transactionId: parsed.transactionId ?? null,
    utr: parsed.utr ?? null,
    payerName: parsed.payerName ?? null,
    payeeName: parsed.payeeName ?? null,
    extractionStatus: status,
    rawText: parsed.rawText ?? "",
    warnings,
  };
}

export function buildProfileAddress(addressParts: Record<string, string | null | undefined>) {
  const values = [
    addressParts.house_flat_no,
    addressParts.street_locality,
    addressParts.landmark,
    addressParts.village_city,
    addressParts.district,
    addressParts.state,
    addressParts.pincode,
    addressParts.country,
  ].filter((value) => value && String(value).trim());

  return values.length > 0 ? values.join(", ") : null;
}

export function canonicalizeReceiptReference(value: string | null, fallbackValue?: string | null) {
  const candidate = (value ?? fallbackValue ?? "").trim();
  return candidate || null;
}

export function normalizeReferenceValue(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  return normalized.toLowerCase();
}

export function normalizeReceiptReference(...values: Array<string | null | undefined>) {
  const normalized = values
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0);

  return normalized.length > 0 ? normalized[0] : null;
}

export function computeFileHash(buffer: Buffer | Uint8Array) {
  return crypto.createHash("sha256").update(Buffer.from(buffer)).digest("hex");
}

export function safeDisplayString(value: string | null | undefined) {
  if (value === null || value === undefined) return "-";
  const trimmed = String(value).trim();
  return trimmed || "-";
}
