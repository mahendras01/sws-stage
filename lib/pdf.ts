import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import crypto from "crypto";

type ReceiptData = {
  receipt_number?: string;
  transaction_number?: string;
  transaction_id?: string;
  transaction_utr?: string;
  payment_provider?: string | null;
  amount?: number | string;
  created_at?: string;
  id?: string;
  user_id?: string;
  transaction_date?: string | null;
  sahyog_type?: string | null;
  paid_by_name?: string | null;
  paid_by_district?: string | null;
  paid_to_name?: string | null;
  paid_to_district?: string | null;
};

type UserData = {
  name?: string | null;
  phone_number?: string | null;
  email?: string | null;
  address?: string | null;
  paid_by_name?: string | null;
  paid_by_district?: string | null;
  paid_to_name?: string | null;
  paid_to_district?: string | null;
};

type PdfOptions = { logoPath?: string; logoBuffer?: Buffer; outputPath?: string };

function normalizeCurrencyAmount(rawValue: unknown): string {
  const text = String(rawValue ?? 0).trim();
  const cleaned = text.replace(/[^\d.\-]/g, "");
  if (!cleaned || cleaned === "." || cleaned === "-") {
    return "0.00";
  }

  const normalized = cleaned.replace(/(?<=\d)-(?=\d)/g, "");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return "0.00";
  }

  return numeric.toFixed(2);
}

function formatCurrencyForPdf(rawValue: unknown): string {
  const amount = normalizeCurrencyAmount(rawValue);
  return `INR ${amount}`;
}

export function ensurePdfKitFontDataFiles(): string[] {
  const sourceDataDir = path.join(process.cwd(), "node_modules", "pdfkit", "js", "data");
  if (!fs.existsSync(sourceDataDir)) {
    return [];
  }

  const targetDirs = new Set<string>([
    path.join(process.cwd(), ".next", "server", "chunks", "data"),
    path.join(process.cwd(), ".next", "server", "data"),
    path.join(process.cwd(), ".next", "server", "vendor-chunks", "data"),
    path.join(process.cwd(), ".next", "standalone", "server", "chunks", "data"),
    path.join(process.cwd(), ".next", "standalone", "server", "data"),
    path.join(process.cwd(), ".next", "standalone", "server", "vendor-chunks", "data"),
  ]);

  const baseDirs = [
    path.join(process.cwd(), ".next", "server"),
    path.join(process.cwd(), ".next", "standalone", "server"),
  ];

  for (const baseDir of baseDirs) {
    if (!fs.existsSync(baseDir)) continue;

    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(baseDir, entry.name, "data");
      if (fs.existsSync(candidate) || candidate.includes("vendor-chunks") || candidate.includes("chunks")) {
        targetDirs.add(candidate);
      }
    }
  }

  const copiedFiles: string[] = [];
  for (const targetDir of Array.from(targetDirs)) {
    fs.mkdirSync(targetDir, { recursive: true });

    for (const fileName of fs.readdirSync(sourceDataDir)) {
      if (!fileName.endsWith(".afm")) continue;

      const sourceFile = path.join(sourceDataDir, fileName);
      const targetFile = path.join(targetDir, fileName);
      if (!fs.existsSync(targetFile) || fs.statSync(sourceFile).mtimeMs > fs.statSync(targetFile).mtimeMs) {
        fs.copyFileSync(sourceFile, targetFile);
      }
      copiedFiles.push(targetFile);
    }
  }

  return copiedFiles;
}

export function resolveDevanagariFontPath(): string | null {
  const customCandidates = [
    process.env.PDF_DEVANAGARI_FONT_PATH,
    path.join(process.cwd(), "public", "fonts", "NotoSansDevanagari-Regular.ttf"),
    path.join(process.cwd(), "public", "fonts", "GotuDevanagari-Regular.ttf"),
    path.join(process.cwd(), "public", "fonts", "Mangal-Regular.ttf"),
  ].filter((value): value is string => Boolean(value));

  const fontFilePattern = /\.(ttf|otf|ttc|otc)$/i;

  for (const candidate of customCandidates) {
    if (fs.existsSync(candidate) && fontFilePattern.test(candidate)) {
      return candidate;
    }
  }

  const searchRoots = [
    "/System/Library/PrivateFrameworks/FontServices.framework/Versions/A/Resources/Fonts/Subsets",
    "/System/Library/Fonts",
    "/System/Library/Fonts/Supplemental",
    "/Library/Fonts",
    "/usr/share/fonts",
    "/usr/local/share/fonts",
    path.join(process.cwd(), "public", "fonts"),
  ];

  const isDevanagariFont = (filePath: string) => {
    const normalized = filePath.toLowerCase();
    return /devanagari/.test(normalized) || /noto.*sans.*devanagari/.test(normalized) || /gotu.*devanagari/.test(normalized) || /jaini.*devanagari/.test(normalized) || /modak.*devanagari/.test(normalized) || /mangal/.test(normalized) || /lohit.*devanagari/.test(normalized);
  };

  const walkForDevanagariFont = (startDir: string): string | null => {
    if (!fs.existsSync(startDir)) return null;

    for (const entry of fs.readdirSync(startDir, { withFileTypes: true })) {
      const fullPath = path.join(startDir, entry.name);
      if (entry.isDirectory()) {
        const nested = walkForDevanagariFont(fullPath);
        if (nested) return nested;
        continue;
      }

      if (fontFilePattern.test(entry.name) && isDevanagariFont(fullPath)) {
        return fullPath;
      }
    }

    return null;
  };

  for (const root of searchRoots) {
    const found = walkForDevanagariFont(root);
    if (found) return found;
  }

  return null;
}

export function resolveUnicodeCurrencyFontPath(): string | null {
  const customCandidates = [
    process.env.PDF_UNICODE_FONT_PATH,
    process.env.PDF_CURRENCY_FONT_PATH,
    "/System/Library/Fonts/SFNS.ttf",
    "/System/Library/Fonts/SFNSDisplay.ttf",
    "/System/Library/Fonts/SFNSMono.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
    "/System/Library/Fonts/Arial Unicode.ttf",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    path.join(process.cwd(), "public", "fonts", "ArialUnicode.ttf"),
    path.join(process.cwd(), "public", "fonts", "Arial Unicode.ttf"),
  ].filter((value): value is string => Boolean(value));

  const fontFilePattern = /\.(ttf|otf|ttc|otc)$/i;

  for (const candidate of customCandidates) {
    if (fs.existsSync(candidate) && fontFilePattern.test(candidate)) {
      return candidate;
    }
  }

  return null;
}

function asDisplay(value: unknown) {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text || "-";
}

export function getCanonicalReceiptPdfRelativePath(receipt: Partial<ReceiptData>): string {
  const seed = String(receipt.receipt_number ?? receipt.transaction_number ?? receipt.transaction_id ?? receipt.id ?? crypto.randomUUID());
  const safeBaseName = `SWS-REC-${seed.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  return path.join("private", "receipts", "pdf", `${safeBaseName}.pdf`);
}

export function isPdfPath(value?: string | null): boolean {
  if (!value) return false;
  return path.extname(value).toLowerCase() === ".pdf";
}

export async function generateReceiptPdf(receipt: ReceiptData, user: UserData, options?: PdfOptions) {
  ensurePdfKitFontDataFiles();

  const requestedOutputPath = options?.outputPath ? path.resolve(process.cwd(), options.outputPath) : null;
  const outDir = path.join(process.cwd(), "private", "receipts", "pdf");
  await fs.promises.mkdir(requestedOutputPath ? path.dirname(requestedOutputPath) : outDir, { recursive: true });

  if (requestedOutputPath) {
    return createPdfAtPath(requestedOutputPath, receipt, user, options);
  }

  const seed = String(receipt.receipt_number ?? receipt.transaction_number ?? receipt.transaction_id ?? receipt.id ?? crypto.randomUUID());
  const safeBaseName = `SWS-REC-${seed.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const safeName = `${safeBaseName}.pdf`;
  const candidatePath = path.join(outDir, safeName);
  const outPath = fs.existsSync(candidatePath) ? path.join(outDir, `${safeBaseName}-${uniqueSuffix}.pdf`) : candidatePath;

  return createPdfAtPath(outPath, receipt, user, options);
}

export async function regenerateStoredReceiptPdf(receipt: Partial<ReceiptData> & { receipt_file_path?: string | null }, user: UserData, relPath?: string | null) {
  const fallbackPdfPath = getCanonicalReceiptPdfRelativePath(receipt);
  const sanitizedTargetPath = relPath && isPdfPath(relPath)
    ? relPath
    : fallbackPdfPath;
  const targetPath = path.resolve(process.cwd(), sanitizedTargetPath);
  if (!targetPath) {
    return null;
  }

  const normalizedUser = {
    ...user,
    name: user.name ?? receipt.paid_by_name ?? "Donor",
    phone_number: user.phone_number ?? null,
    email: user.email ?? null,
  };

  const refreshedRelativePath = await generateReceiptPdf({
    receipt_number: receipt.receipt_number,
    transaction_number: receipt.transaction_number,
    transaction_id: receipt.transaction_id,
    transaction_utr: receipt.transaction_utr,
    payment_provider: receipt.payment_provider,
    amount: receipt.amount,
    created_at: receipt.created_at,
    id: receipt.id,
    user_id: receipt.user_id,
    transaction_date: receipt.transaction_date,
    sahyog_type: receipt.sahyog_type,
    paid_by_name: receipt.paid_by_name,
    paid_by_district: receipt.paid_by_district,
    paid_to_name: receipt.paid_to_name,
    paid_to_district: receipt.paid_to_district,
  }, normalizedUser, { outputPath: sanitizedTargetPath });

  return refreshedRelativePath;
}

function createPdfAtPath(fullPath: string, receipt: ReceiptData, user: UserData, options?: PdfOptions) {
  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const stream = fs.createWriteStream(fullPath, { flags: "w" });
    const devanagariFontPath = resolveDevanagariFontPath();
    const unicodeFontPath = resolveUnicodeCurrencyFontPath();

    if (devanagariFontPath) {
      try {
        doc.registerFont("DevanagariReceiptFont", devanagariFontPath);
      } catch {
        // Ignore invalid font registrations and fall back to default PDF fonts.
      }
    }

    if (unicodeFontPath) {
      try {
        doc.registerFont("SWSUnicodeFont", unicodeFontPath);
      } catch {
        // Ignore invalid font registrations and fall back to the built-in PDF fonts.
      }
    }

    doc.on("error", (err: Error) => {
      stream.destroy();
      reject(err);
    });
    stream.on("error", (err) => {
      doc.destroy();
      reject(err);
    });
    stream.on("finish", () => resolve(path.relative(process.cwd(), fullPath)));
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const leftX = 70;
    const rightX = pageWidth - 70;
    const contentWidth = pageWidth - 140;
    const textColor = "#0d4d8d";
    const accentColor = "#f28b3a";
    const mutedText = "#4d5d6d";
    const isDevanagariText = (value: string) => /[\u0900-\u097F]/.test(value);

    doc.save();
    doc.lineWidth(1.5).strokeColor(accentColor).dash(1, { space: 4 }).rect(20, 20, pageWidth - 40, pageHeight - 40).stroke();
    doc.undash();

    const donationToName = asDisplay(receipt.paid_to_name ?? user.paid_to_name ?? "Self Welfare Society");
    const donorName = asDisplay(receipt.paid_by_name ?? user.paid_by_name ?? user.name ?? "Donor");
    const donorMobile = asDisplay(user.phone_number ?? "-");
    const donorEmail = asDisplay(user.email ?? "-");
    const donatedAmount = formatCurrencyForPdf(receipt.amount ?? 0);
    const formattedAmount = donatedAmount;
    const donationDate = asDisplay(new Date().toISOString().slice(0, 10));
    const transactionId = asDisplay(receipt.transaction_id ?? receipt.transaction_number ?? receipt.transaction_utr ?? receipt.receipt_number ?? "-");
    const causeForDonation = "VYWASTHA SHULK";

    const lineY = [224, 262, 300, 338, 376, 414];

    const drawWatermark = () => {
      const watermarkText = "SELF WELFARE SOCIETY";
      const watermarkWidth = pageWidth * 1.3;
      const x = (pageWidth - watermarkWidth) / 2;
      const y = (pageHeight - 60) / 2;

      doc.save();
      doc.rotate(-45, { origin: [pageWidth / 2, pageHeight / 2] });
      doc.opacity(0.08);
      doc.fillColor("#0d4d8d");
      doc.font("Helvetica-Bold").fontSize(46).text(watermarkText, x, y, {
        width: watermarkWidth,
        align: "center",
      });
      doc.restore();
    };

    const drawHeader = () => {
      doc.font("Helvetica-Bold").fillColor(accentColor).fontSize(28).text("SELF WELFARE SOCIETY", 0, 52, { align: "center" });
      doc.font("Helvetica").fillColor(textColor).fontSize(10).text("Founded in 2026 under the society registration (Reg. No - LUC/01051/2026-2027)", 0, 88, { align: "center" });
      doc.moveTo(110, 106).lineTo(pageWidth - 110, 106).strokeColor(accentColor).lineWidth(1.4).stroke();
      doc.fillOpacity(1);
    };

    const drawRow = (label: string, value: string, y: number) => {
      const valueFont = devanagariFontPath && isDevanagariText(value)
        ? "DevanagariReceiptFont"
        : unicodeFontPath && /[₹]/.test(value)
          ? "SWSUnicodeFont"
          : "Helvetica";
      doc.font("Helvetica-Bold").fillColor(textColor).fontSize(12).text(`${label}:`, leftX, y, { width: 180, continued: false });
      doc.font(valueFont).fillColor("#1d1d1d").fontSize(12).text(value, 230, y, { width: pageWidth - 280, lineGap: 2 });
      doc.moveTo(leftX, y + 18).lineTo(rightX, y + 18).strokeColor(accentColor).dash(1, { space: 4 }).lineWidth(1).stroke();
      doc.undash();
    };

    drawWatermark();
    drawHeader();

    doc.font("Helvetica-Bold").fillColor(textColor).fontSize(16).text(`Thank You For Donation Sh./Smt./M/S: ${donorName}`, leftX, 130, { width: contentWidth, align: "left" });

    const rows: Array<[string, string]> = [
      ["Mobile", donorMobile],
      ["Email", donorEmail],
      ["Donated Amount", formattedAmount],
      ["Date", donationDate],
      ["Transaction ID", transactionId],
      ["Reason For Donation", causeForDonation],
    ];

    rows.forEach(([label, value], index) => {
      drawRow(label, value, lineY[index]);
    });

    doc.font("Helvetica-Bold").fillColor(accentColor).fontSize(22).text("THANK YOU FOR YOUR DONATION", 0, pageHeight - 86, { align: "center" });
    doc.end();
  });
}

export type UserIdCardPdfData = {
  user: {
    name?: string | null;
    email?: string | null;
    ehrms_code?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    phone_number?: string | null;
    phone_home?: string | null;
    blood_group?: string | null;
  };
  swsId?: string | null;
};

export function formatUserIdCardValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return "—";
  }

  return String(value).trim();
}

export function formatUserIdCardDate(value: unknown) {
  const formatted = formatUserIdCardValue(value);
  if (formatted === "—") {
    return "—";
  }

  const asDate = new Date(String(value));
  if (Number.isNaN(asDate.getTime())) {
    return formatted;
  }

  return asDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function generateUserIdCardPdfBuffer({ user, swsId }: UserIdCardPdfData): Promise<Buffer> {
  ensurePdfKitFontDataFiles();

  return new Promise((resolve, reject) => {
    const cardWidth = 300;
    const cardHeight = 500;
    const doc = new PDFDocument({ size: [cardWidth, cardHeight], margin: 0, layout: "portrait" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer | Uint8Array | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const fieldRows = [
      { key: "ehrms_code", label: "EHRMS Code", value: user.ehrms_code },
      { key: "swsId", label: "SWSID", value: swsId },
      { key: "email", label: "Email", value: user.email },
      { key: "gender", label: "Gender", value: user.gender },
      { key: "date_of_birth", label: "DOB", value: formatUserIdCardDate(user.date_of_birth) },
      { key: "phone_number", label: "Mobile", value: user.phone_number },
      { key: "phone_home", label: "Mobile (Home)", value: user.phone_home },
      { key: "blood_group", label: "Blood Group", value: user.blood_group },
    ];

    doc.fillColor("#0f172a").fill("#0f172a");
    doc.rect(0, 0, cardWidth, cardHeight).fill("#ffffff");
    doc.fillColor("#ffffff").rect(0, 0, cardWidth, 92).fill("#0f172a");
    doc.fillColor("#f8fafc").roundedRect(12, 12, cardWidth - 24, cardHeight - 24, 12).fillOpacity(0.98).fillAndStroke("#E2E8F0", "#E2E8F0");
    doc.fillOpacity(1);
    doc.fillColor("#f8fafc").rect(0, 0, cardWidth, 92).fill("#0f172a");
    doc.fillColor("#f8fafc").font("Helvetica-Bold").fontSize(10).text("SELF WELFARE SOCIETY", 0, 18, { align: "center" });
    doc.fillColor("#f8fafc").font("Helvetica-Bold").fontSize(17).text(user.name || "Member", 0, 38, { align: "center" });
    doc.fillColor("#f8fafc").font("Helvetica").fontSize(8).text("MEMBER ID CARD", 0, 68, { align: "center" });

    const badgeY = 106;
    doc.fillColor("#ffffff").roundedRect(170, 100, 110, 26, 12).fill("#f59e0b");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9).text(formatUserIdCardValue(swsId), 175, 108, { width: 96, align: "center" });

    const rows = fieldRows.map((item, index) => ({ ...item, y: 145 + index * 40 }));
    rows.forEach(({ label, value, y }) => {
      const textValue = label === "DOB" ? formatUserIdCardDate(value) : formatUserIdCardValue(value);
      doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(7).text(label, 18, y, { width: 90, align: "left" });
      doc.fillColor("#0f172a").font("Helvetica").fontSize(8).text(textValue, 18, y + 12, { width: 250, align: "left" });
      doc.strokeColor("#E2E8F0").moveTo(18, y + 26).lineTo(282, y + 26).stroke();
    });

    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(7).text("AM Verified Member", 18, cardHeight - 30, { lineBreak: false });
    doc.fillColor("#f59e0b").font("Helvetica-Bold").fontSize(7).text("PDF", 250, cardHeight - 30, { lineBreak: false });

    doc.end();
  });
}

export default generateReceiptPdf;
