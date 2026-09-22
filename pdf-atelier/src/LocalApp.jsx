import React, { useEffect, useRef, useState } from "react";
import { createWorker, OEM } from "tesseract.js";
import {
  ArrowCounterClockwise, ArrowClockwise, CaretDown, CaretUp, CheckCircle,
  Copy, DownloadSimple, FilePdf, FileXls, FileDoc, Highlighter, Plus,
  ShieldCheck, TextT, Trash, UploadSimple, WarningCircle,
} from "@phosphor-icons/react";
import {
  createDocx, createVisualDocx, createVisualXlsx, createXlsx, editPdf,
  extractPages, extractText, inspectPdf, readFile, renderForOcr,
  renderPagesForOffice, saveBlob,
} from "./localEngine.js";

const initialBox = { x: 48, y: 48, width: 260, height: 80 };

function Button({ icon: Icon, children, ...props }) {
  return <button {...props}>{Icon && <Icon size={18} />}<span>{children}</span></button>;
}

export function LocalApp() {
  const [bytes, setBytes] = useState(null);
  const [name, setName] = useState("document.pdf");
  const [view, setView] = useState(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState([0]);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("PDFはまだ開かれていません");
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [box, setBox] = useState(initialBox);
  const [fontSize, setFontSize] = useState(16);
  const [color, setColor] = useState("#172943");
  const [ocrText, setOcrText] = useState({});
  const fileInput = useRef(null);
  const mergeInput = useRef(null);

  const active = view?.pages?.[page];
  const selection = selected.length ? selected : [page];

  async function work(fn) {
    setBusy(true);
    setError("");
    try { return await fn(); }
    catch (e) { setError(e?.message || "処理に失敗しました。"); return null; }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!bytes) { setView(null); return; }
    let activeRequest = true;
    setBusy(true);
    inspectPdf(bytes, page).then((next) => {
      if (!activeRequest) return;
      setView(next);
      setSelected((list) => list.filter((i) => i < next.pages.length));
      setStatus(`${next.pages.length}ページを端末内で読み込みました`);
    }).catch((e) => activeRequest && setError(`PDFを表示できません：${e.message}`))
      .finally(() => activeRequest && setBusy(false));
    return () => { activeRequest = false; };
  }, [bytes, page]);

  async function openFile(file) {
    await work(async () => {
      const next = await readFile(file);
      await inspectPdf(next, 0);
      setBytes(next);
      setName(file.name);
      setPage(0);
      setSelected([0]);
      setHistory([]);
      setOcrText({});
      setStatus("PDFを端末内で開きました");
    });
  }

  function commit(next, message, nextPage = page) {
    setHistory((items) => [...items.slice(-9), bytes]);
    setBytes(next);
    setPage(Math.max(0, nextPage));
    setStatus(message);
    setOcrText({});
  }

  async function action(kind, args = {}) {
    if (!bytes) return;
    await work(async () => {
      const next = await editPdf(bytes, kind, { page, selected: selection, ...args });
      const remaining = kind === "delete" ? Math.max(0, (view?.pages.length || 1) - selection.length) : view?.pages.length || 1;
      commit(next, "変更を端末内で確定しました", Math.min(page, remaining - 1));
    });
  }

  async function mergeFile(file) {
    if (!file || !bytes) return;
    await work(async () => {
      const other = await readFile(file);
      const next = await editPdf(bytes, "merge", { other, page, selected: selection });
      commit(next, `${file.name}を端末内で結合しました`);
    });
  }

  async function exportOffice(kind, visual = false) {
    if (!bytes) return;
    await work(async () => {
      const native = await extractText(bytes, selection);
      const pages = selection.map((index, i) => [native[i], ocrText[index]].filter(Boolean).join("\n"));
      const base = name.replace(/\.pdf$/i, "");
      if (visual) {
        const images = await renderPagesForOffice(bytes, selection);
        if (kind === "docx") saveBlob(await createVisualDocx(images), `${base}-見た目優先.docx`);
        else saveBlob(await createVisualXlsx(images, pages), `${base}-見た目優先.xlsx`);
        setStatus("見た目優先の変換ファイルを端末内で生成しました");
      } else {
        if (kind === "docx") saveBlob(await createDocx(pages), `${base}-文字抽出.docx`);
        else saveBlob(await createXlsx(pages), `${base}-文字抽出.xlsx`);
        setStatus("文字中心の簡易変換ファイルを保存しました");
      }
    });
  }

  async function runOcr() {
    if (!bytes) return;
    if (selection.length > 5) { setError("iPhoneで安定して処理するため、OCRは一度に5ページまでにしてください。"); return; }
    await work(async () => {
      let worker;
      try {
        worker = await createWorker("jpn+eng", OEM.LSTM_ONLY, {
          workerPath: "/tesseract/worker.min.js",
          langPath: "/tessdata",
          corePath: "/tesseract/core",
          cacheMethod: "none",
          logger: (m) => m.status && setStatus(`OCR：${m.status} ${Math.round((m.progress || 0) * 100)}%`),
        });
        const next = { ...ocrText };
        for (let i = 0; i < selection.length; i += 1) {
          const index = selection[i];
          setStatus(`OCR：${i + 1}/${selection.length}ページを端末内で認識中`);
          const image = await renderForOcr(bytes, index);
          const result = await worker.recognize(image, {}, { text: true, tsv: false, blocks: false, hocr: false, pdf: false });
          next[index] = result.data.text.trim();
        }
        setOcrText(next);
        setStatus("OCR文字を端末内に保持しました。Word／Excel出力に利用できます");
      } finally { if (worker) await worker.terminate(); }
    });
  }

  function reorder(from, to) {
    if (!view || to < 0 || to >= view.pages.length || from === to) return;
    const order = view.pages.map((_, i) => i);
    order.splice(to, 0, order.splice(from, 1)[0]);
    action("reorder", { order });
  }

  const overlay = active ? {
    left: `${box.x / active.width * 100}%`, top: `${box.y / active.height * 100}%`,
    width: `${box.width / active.width * 100}%`, height: `${box.height / active.height * 100}%`,
    fontSize: `${Math.max(8, fontSize * 0.9)}px`, color,
  } : {};

  return <div className="local-app">
    <header className="topbar">
      <div className="logo"><FilePdf size={28} weight="fill" /><strong>PDF Atelier</strong><span>端末内処理版</span></div>
      <div className="privacy-badge"><ShieldCheck size={18} weight="fill" />PDF・入力内容を外部送信しません</div>
      <Button icon={UploadSimple} onClick={() => fileInput.current?.click()} disabled={busy}>PDFを開く</Button>
      <input ref={fileInput} hidden type="file" accept="application/pdf,.pdf" onChange={(e) => openFile(e.target.files?.[0])} />
    </header>

    <div className="privacy-note"><CheckCircle weight="fill" />編集・OCR・保存はブラウザー内で実行します。自動保存・クラウド同期・解析APIは使用しません。</div>

    {!bytes ? <main className="empty-state">
      <ShieldCheck size={56} weight="duotone" />
      <h1>PDFを端末内だけで編集</h1>
      <p>ファイルはこのiPhone・パソコンのブラウザー内で処理されます。</p>
      <Button icon={UploadSimple} onClick={() => fileInput.current?.click()}>PDFを選択</Button>
      <small>初回表示時には編集プログラムやフォントを配信元から取得しますが、選択したPDFは送信しません。</small>
    </main> : <div className="three-pane">
      <aside className="page-panel">
        <div className="panel-title"><div><b>ページ</b><small>{name}</small></div><Button icon={Plus} onClick={() => mergeInput.current?.click()} disabled={busy}>結合</Button></div>
        <input ref={mergeInput} hidden type="file" accept="application/pdf,.pdf" onChange={(e) => mergeFile(e.target.files?.[0])} />
        <label className="select-all"><input type="checkbox" checked={!!view && selected.length === view.pages.length} onChange={(e) => setSelected(e.target.checked ? view.pages.map((_, i) => i) : [])} />{selected.length}ページ選択</label>
        <div className="page-list">{view?.pages.map((item, i) => <div className={`page-card ${page === i ? "active" : ""}`} key={i}>
          <input type="checkbox" checked={selected.includes(i)} onChange={(e) => setSelected((list) => e.target.checked ? [...new Set([...list, i])] : list.filter((n) => n !== i))} />
          <button className="thumbnail" onClick={() => setPage(i)}><img src={item.thumbnail} alt={`ページ${i + 1}`} /></button>
          <div><b>{i + 1}</b><small>{item.rotation}°</small><button onClick={() => reorder(i, i - 1)} disabled={i === 0 || busy}><CaretUp /></button><button onClick={() => reorder(i, i + 1)} disabled={i === view.pages.length - 1 || busy}><CaretDown /></button></div>
        </div>)}</div>
      </aside>

      <main className="preview-panel">
        <div className="toolbar">
          <Button icon={ArrowCounterClockwise} onClick={() => action("rotate", { degrees: -90 })} disabled={busy}>左回転</Button>
          <Button icon={ArrowClockwise} onClick={() => action("rotate", { degrees: 90 })} disabled={busy}>右回転</Button>
          <Button icon={Copy} onClick={() => action("duplicate")} disabled={busy}>複製</Button>
          <Button icon={Plus} onClick={() => action("blank")} disabled={busy}>白紙</Button>
          <Button icon={Trash} className="danger" onClick={() => action("delete")} disabled={busy}>削除</Button>
          <button onClick={() => { if (history.length) { setBytes(history.at(-1)); setHistory((h) => h.slice(0, -1)); setStatus("直前の状態に戻しました"); } }} disabled={!history.length || busy}>元に戻す</button>
        </div>
        <div className="paper-wrap">{view?.preview && <div className="paper" style={{ aspectRatio: `${active.width}/${active.height}` }}>
          <img src={view.preview} alt="PDFプレビュー" />
          {text && <div className="text-overlay" style={overlay}>{text}</div>}
        </div>}</div>
        <div className="status-line">{busy && <span className="spinner" />}{status}</div>
        {error && <div className="error"><WarningCircle size={18} />{error}</div>}
      </main>

      <aside className="property-panel">
        <h2><TextT />文字を追加</h2>
        <label>内容<textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="ここに入力すると中央へ反映" /></label>
        <div className="field-grid">
          {[['X', 'x'], ['Y', 'y'], ['幅', 'width'], ['高さ', 'height']].map(([label, key]) => <label key={key}>{label}<input type="number" min="0" value={Math.round(box[key])} onChange={(e) => setBox((b) => ({ ...b, [key]: Math.max(0, Number(e.target.value)) }))} /></label>)}
        </div>
        <div className="field-grid"><label>文字サイズ<input type="number" min="8" max="72" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} /></label><label>文字色<input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label></div>
        <Button icon={TextT} className="primary" disabled={busy || !text.trim()} onClick={() => action("text", { text, rect: [box.x, box.y, box.x + box.width, box.y + box.height], size: fontSize, color })}>文字を確定</Button>
        <div className="quick-tools"><Button icon={Highlighter} onClick={() => action("highlight", { rect: [box.x, box.y, box.x + box.width, box.y + box.height] })} disabled={busy}>同じ範囲をマーカー</Button></div>

        <h2>OCR・変換</h2>
        <Button onClick={runOcr} disabled={busy}>端末内OCR（最大5ページ）</Button>
        <p className="limit">OCR文字はWord／Excel出力に利用します。検索可能PDFへの埋め込みは日本語精度の検証が終わるまで無効です。</p>
        <div className="export-buttons"><Button icon={FileDoc} onClick={() => exportOffice("docx")} disabled={busy}>Word（文字中心）</Button><Button icon={FileXls} onClick={() => exportOffice("xlsx")} disabled={busy}>Excel（文字中心）</Button></div>
        <div className="export-buttons"><Button icon={FileDoc} onClick={() => exportOffice("docx", true)} disabled={busy}>Word（見た目優先）</Button><Button icon={FileXls} onClick={() => exportOffice("xlsx", true)} disabled={busy}>Excel（見た目優先）</Button></div>
        <Button icon={Copy} onClick={() => work(async () => { const output = await extractPages(bytes, selection); saveBlob(output, name.replace(/\.pdf$/i, "") + "-選択ページ.pdf", "application/pdf"); setStatus("選択ページを端末内で分割保存しました"); })} disabled={busy}>選択ページをPDF保存</Button>
        <Button icon={DownloadSimple} className="save" onClick={() => saveBlob(bytes, name.replace(/\.pdf$/i, "") + "-編集済み.pdf", "application/pdf")} disabled={busy}>編集済みPDFを保存</Button>
        <p className="limit">見た目優先はページ画像を配置するため、本文は直接編集できません。文字中心は編集できますが配置完全一致ではありません。</p>
      </aside>
    </div>}
  </div>;
}
