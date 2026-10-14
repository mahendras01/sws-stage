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

type PdfOptions = { logoPath?: string; logoBuffer?: Buffer };

function asDisplay(value: unknown) {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text || "-";
}

export async function generateReceiptPdf(receipt: ReceiptData, user: UserData, options?: PdfOptions) {
  const outDir = path.join(process.cwd(), "private", "receipts", "pdf");
  await fs.promises.mkdir(outDir, { recursive: true });

  const seed = String(receipt.receipt_number ?? receipt.transaction_number ?? receipt.transaction_id ?? receipt.id ?? crypto.randomUUID());
  const safeName = `SWS-REC-${seed.replace(/[^a-zA-Z0-9._-]/g, "-")}.pdf`;
  const outPath = path.join(outDir, safeName);

  return createPdfAtPath(outPath, receipt, user, options);
}

function createPdfAtPath(fullPath: string, receipt: ReceiptData, user: UserData, options?: PdfOptions) {
  return new Promise<string>((resolve, reject) => {
    try {
      const pdfkitMain = require.resolve("pdfkit");
      const candidateDataDirs = [
        path.join(process.cwd(), "node_modules", "pdfkit", "js", "data"),
        path.join(path.dirname(pdfkitMain), "js", "data"),
        path.join(path.dirname(pdfkitMain), "data"),
      ];

      const targetDataDir = path.join(process.cwd(), ".next", "server", "vendor-chunks", "data");
      try {
        if (!fs.existsSync(targetDataDir)) fs.mkdirSync(targetDataDir, { recursive: true });
        for (const cand of candidateDataDirs) {
          try {
            if (!fs.existsSync(cand)) continue;
            for (const file of fs.readdirSync(cand)) {
              const src = path.join(cand, file);
              const dst = path.join(targetDataDir, file);
              if (!fs.existsSync(dst)) {
                fs.copyFileSync(src, dst);
              }
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }

    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const stream = fs.createWriteStream(fullPath, { flags: "wx" });

    stream.on("error", (err) => reject(err));
    stream.on("finish", () => resolve(path.relative(process.cwd(), fullPath)));
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    doc.save();
    doc.lineWidth(2).rect(24, 24, pageWidth - 48, pageHeight - 48).stroke();

    let logoDrawn = false;
    if (options?.logoBuffer) {
      try {
        doc.image(options.logoBuffer, 60, 60, { fit: [80, 60] });
        logoDrawn = true;
      } catch {
        // ignore
      }
    }
    if (!logoDrawn && options?.logoPath && fs.existsSync(options.logoPath)) {
      try {
        doc.image(options.logoPath, 60, 60, { width: 80 });
      } catch {
        // ignore
      }
    }

    doc.fontSize(18).text("Self-Welfare Society", 160, 60);
    doc.fontSize(10).fillColor("#444").text("Helpline: +91-7080329999", 160, 86);
    doc.fontSize(14).fillColor("#000").text("Acknowledgement Receipt", { align: "center" });
    doc.moveDown(0.5);

    const leftX = 60;
    let y = 160;
    const labelWidth = 150;
    const valueX = leftX + labelWidth + 10;
    const printValue = (label: string, value: unknown) => {
      doc.fontSize(10).fillColor("#333").text(`${label}:`, leftX, y);
      doc.fontSize(9.5).fillColor("#111").text(asDisplay(value), valueX, y, { width: 380, lineGap: 2 });
      y += 20;
    };

    printValue("Receipt Number", receipt.receipt_number ?? receipt.transaction_number ?? receipt.transaction_id ?? "-");
    printValue("Transaction ID", receipt.transaction_id ?? "-");
    printValue("Transaction Number", receipt.transaction_number ?? "-");
    printValue("UTR / Bank Ref", receipt.transaction_utr ?? "-");
    printValue("Payment Provider", receipt.payment_provider ?? "-");
    printValue("Amount", `₹ ${asDisplay(receipt.amount).replace(/^₹\s*/, "")}`);
    printValue("Transaction Date", receipt.transaction_date ?? (receipt.created_at ? new Date(receipt.created_at).toISOString().slice(0, 10) : "-"));
    printValue("Issue Date", receipt.created_at ? new Date(receipt.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    printValue("Paid By", receipt.paid_by_name ?? user.paid_by_name ?? user.name ?? "-");
    printValue("Paid To", receipt.paid_to_name ?? user.paid_to_name ?? "-");
    printValue("District", receipt.paid_by_district ?? user.paid_by_district ?? "-");
    printValue("Member Name", user.name ?? "-");
    printValue("Mobile", user.phone_number ?? "-");
    printValue("Email", user.email ?? "-");
    printValue("Address", user.address ?? "-");
    printValue("Sahyog Type", receipt.sahyog_type ?? "General");

    doc.moveDown(2);
    doc.fontSize(11).fillColor("#0b563d").text("Thank You For Your Contribution", 0, pageHeight - 110, { align: "center" });
    doc.end();
  });
}

export default generateReceiptPdf;
