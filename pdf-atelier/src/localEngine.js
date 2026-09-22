import * as pdfjs from "pdfjs-dist/build/pdf.mjs";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
export { createDocx, createXlsx, editPdf } from "./localCore.js";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const clone = (bytes) => bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes);
const safeName = (value) => String(value || "document").replace(/[\\/:*?"<>|\r\n]/g, "_").slice(0, 120);

export async function readFile(file) {
  if (!file || file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("PDFファイルを選択してください。");
  if (file.size > 40 * 1024 * 1024) throw new Error("iPhoneで安定して扱うため、PDFは40MB以内にしてください。");
  return new Uint8Array(await file.arrayBuffer());
}

async function open(bytes) {
  return pdfjs.getDocument({
    data: clone(bytes), disableAutoFetch: true, disableStream: true,
    isEvalSupported: false, useWorkerFetch: false,
  }).promise;
}

async function renderPage(page, scale, mime = "image/png", quality) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const context = canvas.getContext("2d", { alpha: false });
  await page.render({ canvasContext: context, viewport }).promise;
  return { dataUrl: canvas.toDataURL(mime, quality), width: viewport.width / scale, height: viewport.height / scale };
}

export async function inspectPdf(bytes, activeIndex = 0) {
  const doc = await open(bytes);
  try {
    if (!doc.numPages) throw new Error("ページのないPDFです。");
    const pages = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const thumb = await renderPage(page, Math.min(0.24, 180 / Math.max(viewport.width, viewport.height)), "image/jpeg", 0.72);
      pages.push({ width: viewport.width, height: viewport.height, rotation: viewport.rotation, thumbnail: thumb.dataUrl });
    }
    const activePage = await doc.getPage(Math.max(1, Math.min(doc.numPages, activeIndex + 1)));
    const preview = await renderPage(activePage, Math.min(2, 1300 / Math.max(pages[activeIndex]?.width || 1, pages[activeIndex]?.height || 1)));
    return { pages, preview: preview.dataUrl };
  } finally { await doc.destroy(); }
}

export async function renderForOcr(bytes, pageIndex) {
  const doc = await open(bytes);
  try { return (await renderPage(await doc.getPage(pageIndex + 1), 2)).dataUrl; }
  finally { await doc.destroy(); }
}

export async function extractText(bytes, indexes) {
  const doc = await open(bytes);
  try {
    const selected = indexes?.length ? indexes : Array.from({ length: doc.numPages }, (_, i) => i);
    const output = [];
    for (const index of selected) {
      const content = await (await doc.getPage(index + 1)).getTextContent();
      output.push(content.items.map((item) => item.str || "").join(" ").replace(/\s+/g, " ").trim());
    }
    return output;
  } finally { await doc.destroy(); }
}

export function saveBlob(data, name, type = "application/octet-stream") {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = safeName(name); link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
