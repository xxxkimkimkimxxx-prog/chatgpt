import { PDFDocument, degrees, rgb } from "pdf-lib";
import { Document, HeadingLevel, ImageRun, Packer, Paragraph, PageBreak } from "docx";
import JSZip from "jszip";

const clone = (bytes) => bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes);
const xml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const indexes = (doc, selected, fallback = 0) => {
  const list = [...new Set((selected?.length ? selected : [fallback]).map(Number))].sort((a, b) => a - b);
  if (list.some((i) => !Number.isInteger(i) || i < 0 || i >= doc.getPageCount())) throw new Error("ページ指定が正しくありません。");
  return list;
};

async function rasterText(text, width, height, options) {
  await document.fonts.load(`${options.bold ? 700 : 400} ${Math.max(8, options.size)}px "Noto Sans JP"`);
  const density = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.ceil(width * density));
  canvas.height = Math.max(2, Math.ceil(height * density));
  const ctx = canvas.getContext("2d");
  ctx.scale(density, density);
  ctx.font = `${options.bold ? 700 : 400} ${Math.max(8, options.size)}px "Noto Sans JP", sans-serif`;
  ctx.fillStyle = options.color || "#14243b";
  ctx.textBaseline = "top";
  const lineHeight = Math.max(10, options.size * 1.45);
  let y = 0;
  for (const paragraph of String(text).split(/\r?\n/)) {
    let line = "";
    for (const char of paragraph || " ") {
      if (ctx.measureText(line + char).width > width && line) {
        ctx.fillText(line, 0, y); y += lineHeight; line = char;
      } else line += char;
      if (y + lineHeight > height) break;
    }
    if (y + lineHeight <= height) ctx.fillText(line, 0, y);
    y += lineHeight;
    if (y > height) break;
  }
  const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("文字画像を生成できませんでした。")), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function editPdf(bytes, action, args = {}) {
  const doc = await PDFDocument.load(clone(bytes), { updateMetadata: false });
  const selected = indexes(doc, args.selected, args.page || 0);
  if (action === "rotate") {
    selected.forEach((i) => { const page = doc.getPage(i); page.setRotation(degrees((page.getRotation().angle + Number(args.degrees || 0) + 360) % 360)); });
  } else if (action === "delete") {
    if (selected.length === doc.getPageCount()) throw new Error("全ページは削除できません。");
    [...selected].reverse().forEach((i) => doc.removePage(i));
  } else if (action === "duplicate") {
    for (const i of [...selected].reverse()) { const [copy] = await doc.copyPages(doc, [i]); doc.insertPage(i + 1, copy); }
  } else if (action === "blank") {
    const source = doc.getPage(args.page || 0); doc.insertPage((args.page || 0) + 1, [source.getWidth(), source.getHeight()]);
  } else if (action === "reorder") {
    if (!Array.isArray(args.order) || args.order.length !== doc.getPageCount() || new Set(args.order).size !== doc.getPageCount()) throw new Error("並べ替え指定が正しくありません。");
    const next = await PDFDocument.create(); const copied = await next.copyPages(doc, args.order); copied.forEach((p) => next.addPage(p));
    return new Uint8Array(await next.save());
  } else if (action === "merge") {
    const other = await PDFDocument.load(clone(args.other), { updateMetadata: false }); const copied = await doc.copyPages(other, other.getPageIndices()); copied.forEach((p) => doc.addPage(p));
  } else if (action === "text") {
    if (!String(args.text || "").trim()) throw new Error("追加する文字を入力してください。");
    const page = doc.getPage(args.page || 0);
    if (page.getRotation().angle % 360 !== 0) throw new Error("回転済みページへの文字追加は座標検証中です。先に回転を戻してください。");
    const [x1, y1, x2, y2] = args.rect.map(Number);
    if (![x1, y1, x2, y2].every(Number.isFinite) || x2 <= x1 || y2 <= y1) throw new Error("文字の配置範囲が正しくありません。");
    const png = await rasterText(args.text, x2 - x1, y2 - y1, args); const image = await doc.embedPng(png);
    page.drawImage(image, { x: x1, y: page.getHeight() - y2, width: x2 - x1, height: y2 - y1, opacity: Math.max(0.05, Math.min(1, Number(args.opacity ?? 1))) });
  } else if (action === "image") {
    const page = doc.getPage(args.page || 0);
    if (page.getRotation().angle % 360 !== 0) throw new Error("回転済みページへの画像配置は座標検証中です。先に回転を戻してください。");
    const [x1, y1, x2, y2] = args.rect.map(Number);
    if (![x1, y1, x2, y2].every(Number.isFinite) || x2 <= x1 || y2 <= y1) throw new Error("画像の配置範囲が正しくありません。");
    const imageBytes = clone(args.image);
    const image = args.imageType === "image/jpeg" ? await doc.embedJpg(imageBytes) : await doc.embedPng(imageBytes);
    page.drawImage(image, { x: x1, y: page.getHeight() - y2, width: x2 - x1, height: y2 - y1 });
  } else if (["rectangle", "highlight"].includes(action)) {
    const page = doc.getPage(args.page || 0);
    if (page.getRotation().angle % 360 !== 0) throw new Error("回転済みページへのマーカー追加は座標検証中です。");
    const [x1, y1, x2, y2] = args.rect.map(Number); const color = action === "highlight" ? rgb(1, 0.82, 0.15) : rgb(0.08, 0.16, 0.29);
    page.drawRectangle({ x: x1, y: page.getHeight() - y2, width: x2 - x1, height: y2 - y1, color, opacity: action === "highlight" ? 0.35 : 0.08, borderColor: color, borderWidth: action === "highlight" ? 0 : 1.5 });
  } else throw new Error("この操作は端末内版ではまだ利用できません。");
  return new Uint8Array(await doc.save());
}

export async function extractPages(bytes, selected) {
  const source = await PDFDocument.load(clone(bytes), { updateMetadata: false });
  const list = indexes(source, selected, 0);
  const output = await PDFDocument.create();
  const pages = await output.copyPages(source, list);
  pages.forEach((page) => output.addPage(page));
  return new Uint8Array(await output.save());
}

export async function createDocx(textPages) {
  const children = [];
  textPages.forEach((text, i) => {
    if (i) children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({ text: `ページ ${i + 1}`, heading: HeadingLevel.HEADING_1 }));
    for (const line of (text || "（文字を抽出できませんでした）").split(/\r?\n/)) children.push(new Paragraph(line));
  });
  return Packer.toBlob(new Document({ sections: [{ properties: {}, children }] }));
}

export async function createVisualDocx(renderedPages) {
  const children = [];
  renderedPages.forEach((item, i) => {
    if (i) children.push(new Paragraph({ children: [new PageBreak()] }));
    const maxWidth = 680;
    const width = Math.min(maxWidth, Math.round(item.width));
    const height = Math.round(item.height * width / item.width);
    children.push(new Paragraph({ children: [new ImageRun({ data: item.bytes, type: "png", transformation: { width, height } })] }));
  });
  return Packer.toBlob(new Document({ sections: [{ properties: { page: { margin: { top: 360, right: 360, bottom: 360, left: 360 } } }, children }] }));
}

export async function createXlsx(textPages) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${textPages.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`);
  zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.folder("xl").file("workbook.xml", `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${textPages.map((_, i) => `<sheet name="ページ${i + 1}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`);
  zip.folder("xl").folder("_rels").file("workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${textPages.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`);
  const sheets = zip.folder("xl").folder("worksheets");
  textPages.forEach((text, i) => { const rows = (text || "").split(/\r?\n/).flatMap((line) => line.split(/\s{2,}|\t/)).slice(0, 5000); sheets.file(`sheet${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((value, row) => `<row r="${row + 1}"><c r="A${row + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c></row>`).join("")}</sheetData></worksheet>`); });
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", compression: "DEFLATE" });
}

export async function createVisualXlsx(renderedPages, textPages = []) {
  const zip = new JSZip();
  const drawingOverrides = renderedPages.map((_, i) => `<Override PartName="/xl/drawings/drawing${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join("");
  const sheetOverrides = renderedPages.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetOverrides}${drawingOverrides}</Types>`);
  zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.folder("xl").file("workbook.xml", `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${renderedPages.map((_, i) => `<sheet name="ページ${i + 1}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`);
  zip.folder("xl").folder("_rels").file("workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${renderedPages.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`);
  const worksheets = zip.folder("xl").folder("worksheets");
  const worksheetRels = worksheets.folder("_rels");
  const drawings = zip.folder("xl").folder("drawings");
  const drawingRels = drawings.folder("_rels");
  const media = zip.folder("xl").folder("media");
  renderedPages.forEach((item, i) => {
    const rows = (textPages[i] || "").split(/\r?\n/).slice(0, 5000);
    const rowXml = rows.map((value, row) => `<row r="${row + 1}"><c r="N${row + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c></row>`).join("");
    worksheets.file(`sheet${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData>${rowXml}</sheetData><drawing r:id="rId1"/></worksheet>`);
    worksheetRels.file(`sheet${i + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${i + 1}.xml"/></Relationships>`);
    const cx = Math.max(1, Math.round(item.width * 9525));
    const cy = Math.max(1, Math.round(item.height * 9525));
    drawings.file(`drawing${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i + 1}" name="PDF page ${i + 1}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`);
    drawingRels.file(`drawing${i + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${i + 1}.png"/></Relationships>`);
    media.file(`image${i + 1}.png`, item.bytes);
  });
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", compression: "DEFLATE" });
}
