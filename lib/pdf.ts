import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

type ReceiptData = {
  receipt_number?: string;
  transaction_number?: string;
  transaction_id?: string;
  amount?: number | string;
  created_at?: string;
  id?: string;
  user_id?: string;
};

type UserData = {
  name?: string | null;
  phone_number?: string | null;
  email?: string | null;
};

export async function generateReceiptPdf(receipt: ReceiptData, user: UserData, options?: { logoPath?: string }) {
  const projectRoot = process.cwd();
  const outDir = path.join(projectRoot, "new_payment_recipt");
  await fs.promises.mkdir(outDir, { recursive: true });

  const receiptNumber = String(receipt.receipt_number ?? receipt.transaction_number ?? receipt.transaction_id ?? Date.now());
  const fileName = `SWS-REC-${receiptNumber}.pdf`;
  const outPath = path.join(outDir, fileName);

  // ensure we don't overwrite existing file
  try {
    await fs.promises.access(outPath);
    // file exists — avoid overwrite by appending timestamp
    const altName = `SWS-REC-${receiptNumber}-${Date.now()}.pdf`;
    return await createPdfAtPath(path.join(outDir, altName), receipt, user, options);
  } catch (e) {
    return await createPdfAtPath(outPath, receipt, user, options);
  }
}

function createPdfAtPath(fullPath: string, receipt: ReceiptData, user: UserData, options?: { logoPath?: string }) {
  return new Promise<string>((resolve, reject) => {
    // Ensure pdfkit's AFM data files are available synchronously at runtime
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
            const files = fs.readdirSync(cand);
            for (const f of files) {
              const src = path.join(cand, f);
              const dst = path.join(targetDataDir, f);
              try {
                if (!fs.existsSync(dst)) {
                  fs.copyFileSync(src, dst);
                }
              } catch (copyErr) {
                // ignore individual copy errors
              }
            }
          } catch (e) {
            // ignore candidate dir issues
          }
        }
      } catch (e) {
        // ignore overall copy errors
      }
    } catch (e) {
      // ignore if require.resolve fails
    }

    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const stream = fs.createWriteStream(fullPath, { flags: "wx" });

    stream.on("error", (err) => {
      reject(err);
    });

    stream.on("finish", () => resolve(path.relative(process.cwd(), fullPath)));

    doc.pipe(stream);

    // Border
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    doc.save();
    doc.lineWidth(2).rect(24, 24, pageWidth - 48, pageHeight - 48).stroke();

    // Header: logo (if provided) and organisation name
    if (options?.logoPath) {
      try {
        if (fs.existsSync(options.logoPath)) {
          doc.image(options.logoPath, 60, 60, { width: 80 });
        }
      } catch (e) {
        // ignore logo errors
      }
    }

    doc.fontSize(18).text("Self-Welfare Society", 160, 60, { continued: false });
    doc.fontSize(10).fillColor("#444").text("Helpline: +91 8987898789", 160, 86);
    doc.moveDown(1);

    // Title
    doc.fontSize(14).fillColor("#000").text("Acknowledgement Receipt", { align: "center" });
    doc.moveDown(1);

    // Key fields in two-column layout
    const leftX = 60;
    const rightX = 320;
    let y = 150;

    function labelVal(label: string, val?: any, x = leftX) {
      doc.fontSize(10).fillColor("#333").text(label + ":", x, y);
      doc.fontSize(10).fillColor("#000").text(String(val ?? "-"), x + 120, y);
      y += 18;
    }

    labelVal("Receipt Number", receipt.receipt_number ?? receipt.transaction_id ?? "-");
    labelVal("Transaction Number", receipt.transaction_number ?? "-");
    labelVal("Transaction ID", receipt.transaction_id ?? "-");
    labelVal("Amount", receipt.amount ? String(receipt.amount) : "-");
    labelVal("Payment Date", receipt.created_at ? String(receipt.created_at) : "-");
    labelVal("Paid By", user.name ?? "-");
    labelVal("Mobile", user.phone_number ?? "-");
    labelVal("Email", user.email ?? "-");

    doc.moveDown(2);

    // Sahyog Type placeholder (if stored in receipt record)
    doc.fontSize(11).text("Sahyog Type: " + ( (receipt as any).sahyog_type ?? "-" ), leftX, y + 6);

    // Acknowledgement message at bottom
    doc.fontSize(12).fillColor("#0a6b4a").text("Thank You For Your Contribution", 0, pageHeight - 140, { align: "center" });

    doc.end();
  });
}

export default generateReceiptPdf;
