import React, { useEffect, useRef, useState } from "react";
import { createWorker, OEM } from "tesseract.js";
import {
  FilePdf,
  Plus,
  ArrowCounterClockwise,
  ArrowClockwise,
  Trash,
  Copy,
  TextT,
  Cursor,
  Image as ImageIcon,
  Highlighter,
  Rectangle,
  ArrowUpRight,
  Note,
  Signature,
  ShieldCheck,
  DownloadSimple,
  Check,
  ListChecks,
  DotsSixVertical,
  ArrowsOut,
  MagnifyingGlass,
  FloppyDisk,
  Scissors,
  Lock,
  X,
  CaretUp,
  CaretDown,
  UploadSimple,
  Warning,
  CircleNotch,
} from "@phosphor-icons/react";

async function api(path, body) {
  throw new Error("文書保護のためサーバー処理を停止しています。端末内処理版は未完成です。");
}
const b64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
function download(data, name, type = "application/octet-stream") {
  try {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const previous = document.querySelector(".download-ready");
    if (previous) {
      URL.revokeObjectURL(previous.href);
      previous.remove();
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.className = "download-ready";
    a.textContent = "保存用リンク：" + name;
    a.setAttribute("aria-label", "生成ファイルを保存");
    document.body.append(a);
    a.click();
  } catch (e) {
    window.alert("保存データの準備に失敗しました：" + e.message);
  }
}
const tools = [
  ["select", "選択", Cursor],
  ["text", "テキスト", TextT],
  ["image", "画像", ImageIcon],
  ["rectangle", "図形", Rectangle],
  ["arrow", "矢印", ArrowUpRight],
  ["highlight", "マーカー", Highlighter],
  ["note", "付箋", Note],
  ["redact", "墨消し", ShieldCheck],
  ["signature", "署名", Signature],
];
const defaults = {
  text: "",
  size: 14,
  color: "#15243d",
  font: "noto-sans",
  align: 0,
  opacity: 1,
};
const fontFamilies = {
  "noto-sans": "Noto Sans JP",
  "noto-sans-bold": "Noto Sans JP",
  "noto-serif": "Noto Serif JP",
  "noto-serif-bold": "Noto Serif JP",
  japan: "sans-serif",
  "japan-s": "serif",
  helv: "Arial",
  tiro: "Times New Roman",
};
const imageSize = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
    image.onerror = () =>
      reject(new Error("OCR用画像を読み込めませんでした。"));
    image.src = src;
  });
function parseTsv(tsv, width, height) {
  return String(tsv || "")
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split("\t"))
    .filter((c) => c.length >= 12 && c[11].trim() && Number(c[10]) >= 0)
    .map((c) => ({
      text: c.slice(11).join("\t").trim(),
      confidence: Number(c[10]),
      box: [
        Number(c[6]) / width,
        Number(c[7]) / height,
        (Number(c[6]) + Number(c[8])) / width,
        (Number(c[7]) + Number(c[9])) / height,
      ],
    }))
    .filter((w) => w.box.every(Number.isFinite));
}
function Btn({ icon: Icon, children, ...props }) {
  return (
    <button {...props}>
      {Icon && <Icon size={18} />}
      <span>{children}</span>
    </button>
  );
}

export function App() {
  const [pdf, setPdf] = useState(""),
    [view, setView] = useState(null),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState([0]);
  const [name, setName] = useState("サンプル請求書.pdf"),
    [history, setHistory] = useState([]),
    [future, setFuture] = useState([]);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [tool, setTool] = useState("select");
  const [edit, setEdit] = useState(defaults),
    [rect, setRect] = useState(null),
    [original, setOriginal] = useState(null),
    [imageData, setImageData] = useState("");
  const [zoom, setZoom] = useState(100),
    [modal, setModal] = useState(""),
    [step, setStep] = useState(2),
    [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState(false),
    [search, setSearch] = useState(""),
    [diff, setDiff] = useState([]),
    [password, setPassword] = useState("");
  const [bulkText, setBulkText] = useState("社外秘"),
    [angle, setAngle] = useState(0),
    [lang, setLang] = useState("jpn+eng"),
    [lossy, setLossy] = useState(false);
  const [compareMode, setCompareMode] = useState("compare"),
    [candidates, setCandidates] = useState([]),
    [batchAction, setBatchAction] = useState("compress");
  const [ocrProgress, setOcrProgress] = useState(""),
    [ocrReport, setOcrReport] = useState(null),
    [layoutReport, setLayoutReport] = useState(null);
  const batchInput = useRef(null);
  useEffect(() => {
    if (modal === "more") setCompareMode("compare");
  }, [modal]);
  const input = useRef(null),
    imageInput = useRef(null),
    compareInput = useRef(null),
    draftInput = useRef(null),
    sig = useRef(null),
    drag = useRef(null),
    request = useRef(0),
    area = useRef(null);
  const [areaSize, setAreaSize] = useState({ width: 700, height: 850 });
  const active = view?.pages[page];
  const paperWidth = active
    ? (Math.max(
        180,
        Math.min(
          active.width,
          areaSize.width - 42,
          ((areaSize.height - 42) * active.width) / active.height,
        ),
      ) *
        zoom) /
      100
    : 595;
  const isDirty = !!rect && tool !== "select";
  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  function record(next, label = "変更を保存しました", nextPage = page) {
    setHistory((h) => {
      const items = [...h, pdf];
      while (
        items.length > 1 &&
        items.reduce((a, b) => a + b.length, 0) > 70_000_000
      )
        items.shift();
      return items.slice(-30);
    });
    setFuture([]);
    setPdf(next);
    setPage(nextPage);
    setRect(null);
    setOriginal(null);
    setTool("select");
    setMessage(label);
  }
  useEffect(() => {
    let live = true;
    api("sample")
      .then((d) => {
        if (live) setPdf(d.pdf);
      })
      .catch((e) => setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!area.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setAreaSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(area.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!pdf) return;
    const id = ++request.current;
    setBusy(true);
    api("inspect", { pdf, args: { page } })
      .then((v) => {
        if (id === request.current) {
          setView(v);
          setSelected((s) => s.filter((i) => i < v.pages.length));
        }
      })
      .catch((e) => {
        if (id === request.current) setError(e.message);
      })
      .finally(() => {
        if (id === request.current) setBusy(false);
      });
  }, [pdf, page]);
  useEffect(() => {
    if (!pdf || !draft) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          "atelier-draft",
          JSON.stringify({ pdf, name, page, version: 1 }),
        );
        setMessage("このブラウザに下書きを保存しました");
      } catch {
        setError("自動保存の容量不足です。下書きファイルを保存してください。");
        setDraft(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [pdf, draft, name, page]);
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
  useEffect(() => {
    if (!modal) return;
    const box = document.querySelector("[role=dialog]"),
      prior = document.activeElement;
    box?.querySelector("button")?.focus();
    const handler = (e) => {
      if (e.key === "Escape" && !busy) {
        setModal("");
        return;
      }
      if (e.key === "Tab") {
        const list = [
          ...box.querySelectorAll(
            "button:not(:disabled),input:not(:disabled),textarea,select,a[href]",
          ),
        ].filter((x) => x.offsetParent !== null);
        if (!list.length) return;
        const first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      prior?.focus();
    };
  }, [modal, busy]);
  async function perform(action, args = {}) {
    if (
      isDirty &&
      ![
        "text",
        "replace",
        "image",
        "rectangle",
        "arrow",
        "highlight",
        "note",
        "redact",
        "field",
        "checkbox",
        "crop",
      ].includes(action)
    ) {
      setError("先に右側の編集を確定または取消してください。");
      return;
    }
    await run(async () => {
      const d = await api("apply", {
        pdf,
        action,
        args: { page, selected: selected.length ? selected : [page], ...args },
      });
      if (action === "encrypt") {
        download(
          d.pdf,
          name.replace(/\.pdf$/i, "") + "-保護.pdf",
          "application/pdf",
        );
        setMessage("暗号化したPDFを書き出しました");
        setModal("");
        return;
      }
      let next = page;
      if (action === "delete")
        next = Math.max(
          0,
          Math.min(page, view.pages.length - (selected.length || 1) - 1),
        );
      record(d.pdf, "変更を確定しました", next);
    });
  }
  function selectPage(i) {
    if (isDirty) {
      setError("編集中の内容を確定または取消してください。");
      return;
    }
    setPage(i);
    setRect(null);
    setOriginal(null);
  }
  function chooseTool(t) {
    if (isDirty) {
      setError("先に編集中の内容を確定または取消してください。");
      return;
    }
    setTool(t);
    setOriginal(null);
    setRect(
      t === "text" && active
        ? [
            40,
            40,
            Math.min(340, active.width - 20),
            Math.min(140, active.height - 20),
          ]
        : null,
    );
    setEdit({ ...defaults, color: t === "highlight" ? "#ffcf45" : "#15243d" });
    setMessage("右側の位置入力、またはPDF上のドラッグで範囲を調整できます");
    if (t === "signature") setModal("signature");
  }
  function selectSpan(s) {
    if (isDirty) {
      setError("先に編集中の内容を確定または取消してください。");
      return;
    }
    setRect([
      s.rect[0],
      s.rect[1],
      Math.min(active.width, s.rect[2] + 30),
      Math.min(active.height, s.rect[3] + 20),
    ]);
    setOriginal(s.rect);
    setEdit({
      ...defaults,
      text: s.text,
      size: Math.round(s.size),
      color: s.color,
    });
    setTool("replace");
  }
  function point(e) {
    const b = e.currentTarget.getBoundingClientRect();
    return [
      Math.max(
        0,
        Math.min(active.width, ((e.clientX - b.left) / b.width) * active.width),
      ),
      Math.max(
        0,
        Math.min(
          active.height,
          ((e.clientY - b.top) / b.height) * active.height,
        ),
      ),
    ];
  }
  function down(e) {
    if (tool === "select" || tool === "replace" || !active || busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = point(e);
    setRect(null);
  }
  function move(e) {
    if (!drag.current || !active) return;
    const [x, y] = point(e),
      [a, b] = drag.current;
    setRect([Math.min(a, x), Math.min(b, y), Math.max(a, x), Math.max(b, y)]);
  }
  function up() {
    if (drag.current) {
      drag.current = null;
      if (rect && (rect[2] - rect[0] < 8 || rect[3] - rect[1] < 8))
        setRect(null);
    }
  }
  function cancel() {
    setRect(null);
    setOriginal(null);
    setTool("select");
    setEdit(defaults);
    setError("");
  }
  async function commit() {
    if (!rect) {
      setError("PDF上で範囲を指定してください。");
      return;
    }
    if (
      tool === "redact" &&
      !window.confirm(
        "選択範囲の内容を削除します。安全のため、全ページの注釈・フォーム・添付・メタデータも削除します。元に戻す履歴には変更前のPDFが残ります。続けますか？",
      )
    )
      return;
    if (["image", "signature"].includes(tool) && !imageData) {
      setError("画像または署名を登録してください。");
      return;
    }
    if (["image", "signature"].includes(tool) && !consent) {
      setError(
        "画像・署名もサーバーで処理します。先にファイル送信への同意を確認してください。",
      );
      setModal("import");
      return;
    }
    await perform(tool === "signature" ? "image" : tool, {
      rect,
      originalRect: original || rect,
      ...edit,
      image: imageData,
    });
  }
  async function importFiles(files) {
    files = Array.from(files || []);
    if (!files?.length) return;
    if (!consent) {
      setError("読込前に、処理場所についての確認欄にチェックしてください。");
      setModal("import");
      return;
    }
    if (isDirty) {
      setError("先に編集を確定または取消してください。");
      return;
    }
    await run(async () => {
      let merged = pdf;
      for (const file of files) {
        if (file.size > 25 * 1024 * 1024)
          throw new Error("25MB以内のファイルを選択してください。");
        const kind = file.name.split(".").pop().toLowerCase();
        if (
          ["docx", "xlsx"].includes(kind) &&
          !window.confirm(
            "Office読込は内容の簡易変換です。元のレイアウト・書式・グラフは再現しません。続けますか？",
          )
        )
          return;
        const imp = await api("import", {
          pdf: await b64(file),
          kind,
          args: { password },
        });
        if (modal === "replaceFile" && files.length === 1) {
          merged = imp.pdf;
          setName(file.name.replace(/\.[^.]+$/, ".pdf"));
        } else
          merged = (
            await api("apply", {
              pdf: merged,
              action: "merge",
              args: { other: imp.pdf },
            })
          ).pdf;
      }
      record(merged, "ファイルを読み込みました", 0);
      setSelected([0]);
      setModal("");
      setPassword("");
    });
  }
  function undo() {
    if (!history.length || busy) return;
    if (isDirty) {
      setError("先に編集を確定または取消してください。");
      return;
    }
    setFuture((f) => [...f, pdf]);
    setPdf(history.at(-1));
    setHistory((h) => h.slice(0, -1));
    setPage(0);
    setSelected([0]);
    cancel();
    setMessage("前の状態に戻しました");
  }
  function redo() {
    if (!future.length || busy) return;
    setHistory((h) => [...h, pdf]);
    setPdf(future.at(-1));
    setFuture((f) => f.slice(0, -1));
    setPage(0);
    setSelected([0]);
    cancel();
  }
  async function exportAs(kind) {
    await run(async () => {
      if (isDirty) throw new Error("書き出す前に編集を確定してください。");
      const d = await api("export", {
        pdf,
        kind,
        args: { selected: selected.length ? selected : [page] },
      });
      download(d.data, name.replace(/\.pdf$/i, "") + "." + d.ext);
      setMessage("書き出しました");
    });
  }
  async function openExport() {
    await run(async () => {
      if (isDirty) throw new Error("書き出す前に編集を確定してください。");
      setLayoutReport(await api("layout-report", { pdf }));
      setModal("export");
    });
  }
  async function browserOcr() {
    await run(async () => {
      if (isDirty) throw new Error("先に編集中の内容を確定してください。");
      const pages = selected.length ? selected : [page];
      const diagnostics = await api("layout-report", { pdf });
      const alreadySearchable = diagnostics.pages.filter(
        (item) => pages.includes(item.page - 1) && item.textLines > 0,
      ).length;
      if (
        alreadySearchable &&
        !window.confirm(
          `${alreadySearchable}ページには既に検索可能な文字があります。OCR文字が重複する可能性があります。続けますか？`,
        )
      )
        return;
      let worker;
      try {
        worker = await createWorker(lang, OEM.LSTM_ONLY, {
          workerPath: "/tesseract/worker.min.js",
          langPath: "/tessdata",
          corePath: "/tesseract/core",
          logger: (m) => {
            if (m.status)
              setOcrProgress(
                `${m.status} ${Math.round((m.progress || 0) * 100)}%`,
              );
          },
        });
        const results = [];
        let all = [];
        for (let position = 0; position < pages.length; position++) {
          const index = pages[position];
          setOcrProgress(`${position + 1}/${pages.length}ページを認識中`);
          const inspected = await api("ocr-image", {
            pdf,
            args: { page: index },
          });
          const src = "data:image/png;base64," + inspected.preview;
          const [width, height] = await imageSize(src);
          const recognized = await worker.recognize(
            src,
            {},
            { text: true, tsv: true, blocks: false, hocr: false, pdf: false },
          );
          const words = parseTsv(recognized.data.tsv, width, height);
          results.push({ page: index, words });
          all = all.concat(words);
        }
        const changed = await api("apply", {
          pdf,
          action: "ocr-overlay",
          args: { page, selected: pages, pages: results },
        });
        const average = all.length
          ? all.reduce((sum, w) => sum + w.confidence, 0) / all.length
          : 0;
        setOcrReport({
          words: all.length,
          average: Math.round(average),
          low: all.filter((w) => w.confidence < 60).length,
        });
        record(
          changed.pdf,
          `OCR完了：${all.length}語、平均信頼度${Math.round(average)}%`,
        );
        setModal("");
      } finally {
        if (worker) await worker.terminate();
        setOcrProgress("");
      }
    });
  }
  function savePDF() {
    if (isDirty) {
      setError("書き出す前に編集を確定してください。");
      return;
    }
    download(
      pdf,
      name.replace(/\.pdf$/i, "") + "-編集済み.pdf",
      "application/pdf",
    );
    setMessage("PDFを書き出しました");
  }
  function saveDraft() {
    const text = JSON.stringify({ pdf, name, page, version: 1 });
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    download(btoa(binary), "PDF-Atelier-draft.json");
    setMessage("確定済みのPDFを下書きファイルに保存しました");
  }
  async function loadDraft(file) {
    await run(async () => {
      if (file.size > 38_000_000)
        throw new Error("下書きファイルが大きすぎます");
      const d = JSON.parse(await file.text());
      if (d.version !== 1 || typeof d.pdf !== "string")
        throw new Error("対応する下書きではありません");
      await api("inspect", { pdf: d.pdf, args: { page: 0 } });
      record(d.pdf, "下書きを復元しました", 0);
      setName(typeof d.name === "string" ? d.name : "復元.pdf");
      setModal("");
    });
  }
  function reorder(from, to) {
    if (from === to || to < 0 || to >= view.pages.length) return;
    const order = view.pages.map((_, i) => i);
    order.splice(to, 0, order.splice(from, 1)[0]);
    perform("reorder", { order });
  }
  async function batchFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    await run(async () => {
      if (!consent) throw new Error("先にファイル送信に同意してください");
      if (
        list.length > 10 ||
        list.reduce((sum, f) => sum + f.size, 0) > 25 * 1024 * 1024
      )
        throw new Error("10文書・合計25MB以内にしてください");
      const files = await Promise.all(
        list.map(async (f) => ({ name: f.name, pdf: await b64(f) })),
      );
      const result = await api("batch", {
        files,
        action: batchAction,
        args: { text: bulkText, degrees: 90 },
      });
      download(result.data, "PDF-Atelier-batch.zip", "application/zip");
      setMessage(
        "一括処理したZIPを生成しました。現在の文書は変更していません。",
      );
    });
  }
  const selectionStyle =
    rect && active
      ? {
          left: (rect[0] / active.width) * 100 + "%",
          top: (rect[1] / active.height) * 100 + "%",
          width: ((rect[2] - rect[0]) / active.width) * 100 + "%",
          height: ((rect[3] - rect[1]) / active.height) * 100 + "%",
        }
      : {};
  const primary = (t, action, Icon = Check) => (
    <Btn className="primary" icon={Icon} onClick={action} disabled={busy}>
      {t}
    </Btn>
  );
  return (
    <div className="app">
      <header>
        <div className="brand">
          <FilePdf size={29} weight="fill" />
          <strong>PDF Atelier</strong>
          <span>Document Flow</span>
        </div>
        <div className="privacy">
          <ShieldCheck size={18} />
          検証用サーバー処理 · ファイルの永続保存なし
        </div>
        <Btn icon={ListChecks} onClick={() => setModal("help")}>
          機能と制限
        </Btn>
      </header>
      <nav className="steps" aria-label="編集手順">
        {["ページを整える", "内容を編集", "確認して出力"].map((s, i) => (
          <button
            key={s}
            className={step === i + 1 ? "current" : ""}
            onClick={() => {
              setStep(i + 1);
              if (i === 2) openExport();
            }}
          >
            <b>{i + 1}</b>
            <span>
              {s}
              <small>
                {
                  [
                    "並べ替え・結合",
                    "右側で入力・即時プレビュー",
                    "仕上がりを確認・書き出し",
                  ][i]
                }
              </small>
            </span>
          </button>
        ))}
      </nav>
      <div className="workspace">
        <aside className="pages">
          <div className="panel-heading">
            <h2>ページと文書</h2>
            <Btn icon={Plus} onClick={() => setModal("import")} disabled={busy}>
              追加
            </Btn>
          </div>
          <button className="filename" onClick={() => setModal("replaceFile")}>
            {name}
            <small>別のファイルを開く</small>
          </button>
          <div className="page-actions">
            <Btn icon={Copy} onClick={() => setModal("import")} disabled={busy}>
              結合
            </Btn>
            <Btn
              icon={ArrowCounterClockwise}
              onClick={() => perform("rotate", { degrees: -90 })}
              disabled={busy}
            >
              左回転
            </Btn>
            <Btn
              icon={ArrowClockwise}
              onClick={() => perform("rotate", { degrees: 90 })}
              disabled={busy}
            >
              右回転
            </Btn>
            <Btn icon={Trash} onClick={() => perform("delete")} disabled={busy}>
              削除
            </Btn>
          </div>
          <div className="selection-count">
            <label>
              <input
                type="checkbox"
                aria-label="全ページを選択"
                checked={!!view && selected.length === view.pages.length}
                onChange={(e) =>
                  setSelected(
                    e.target.checked ? view.pages.map((_, i) => i) : [],
                  )
                }
              />{" "}
              {selected.length}ページ選択中
            </label>
            <button onClick={() => setSelected([])}>解除</button>
          </div>
          <div className="thumbnails">
            {view?.pages.map((p, i) => (
              <div
                className={"thumb " + (i === page ? "active" : "")}
                key={i}
                draggable={!busy && !isDirty}
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/plain", String(i))
                }
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = Number(e.dataTransfer.getData("text/plain"));
                  if (Number.isInteger(from)) reorder(from, i);
                }}
              >
                <DotsSixVertical size={17} />
                <input
                  type="checkbox"
                  aria-label={`ページ${i + 1}を選択`}
                  checked={selected.includes(i)}
                  onChange={(e) =>
                    setSelected((s) =>
                      e.target.checked ? [...s, i] : s.filter((n) => n !== i),
                    )
                  }
                />
                <button
                  className="thumb-preview"
                  aria-label={`ページ${i + 1}を表示`}
                  onClick={() => selectPage(i)}
                >
                  <img
                    src={"data:image/png;base64," + p.thumbnail}
                    alt={`ページ${i + 1}のサムネイル`}
                  />
                </button>
                <div>
                  <b>{i + 1}</b>
                  <small>{p.rotation}°</small>
                  <button
                    aria-label={`ページ${i + 1}を上へ`}
                    disabled={busy || i === 0}
                    onClick={() => reorder(i, i - 1)}
                  >
                    <CaretUp />
                  </button>
                  <button
                    aria-label={`ページ${i + 1}を下へ`}
                    disabled={busy || i === view.pages.length - 1}
                    onClick={() => reorder(i, i + 1)}
                  >
                    <CaretDown />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="page-bottom">
            <Btn
              icon={Copy}
              disabled={busy}
              onClick={() => perform("duplicate")}
            >
              複製
            </Btn>
            <Btn icon={Plus} disabled={busy} onClick={() => perform("blank")}>
              白紙
            </Btn>
            <Btn
              icon={Scissors}
              disabled={busy}
              onClick={() => exportAs("split")}
            >
              分割
            </Btn>
          </div>
        </aside>
        <main>
          <div className="toolbar">
            {tools.map(([id, label, Icon]) => (
              <Btn
                key={id}
                icon={Icon}
                className={tool === id ? "chosen" : ""}
                disabled={busy}
                onClick={() => chooseTool(id)}
              >
                {label}
              </Btn>
            ))}
            <div className="divider" />
            <Btn
              icon={ArrowCounterClockwise}
              disabled={!history.length || busy}
              onClick={undo}
            >
              戻す
            </Btn>
            <Btn
              icon={ArrowClockwise}
              disabled={!future.length || busy || isDirty}
              onClick={redo}
            >
              進む
            </Btn>
          </div>
          <div className="canvas-controls">
            <span>
              {view ? `${page + 1} / ${view.pages.length} ページ` : "読込中"}
            </span>
            <label>
              表示倍率{" "}
              <select
                aria-label="表示倍率"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              >
                {[75, 100, 125, 150].map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </select>
            </label>
            <Btn icon={ArrowsOut} onClick={() => setZoom(100)}>
              全体
            </Btn>
            <Btn icon={MagnifyingGlass} onClick={() => setModal("search")}>
              検索
            </Btn>
            <Btn icon={ListChecks} onClick={() => setModal("more")}>
              その他の機能
            </Btn>
          </div>
          <div
            className="canvas-area"
            ref={area}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length) {
                if (!consent) {
                  setModal("import");
                  setError(
                    "処理場所の確認後、追加ボタンからファイルを選択してください。",
                  );
                } else importFiles(e.dataTransfer.files);
              }
            }}
          >
            {view && active && (
              <div
                className={"paper tool-" + tool}
                style={{
                  width: paperWidth,
                  aspectRatio: `${active.width} / ${active.height}`,
                }}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={() => {
                  drag.current = null;
                }}
              >
                <img
                  className="document"
                  src={"data:image/png;base64," + view.preview}
                  alt="現在のPDFページ"
                  draggable="false"
                />
                {tool === "select" &&
                  view.spans.map((s, i) => (
                    <button
                      key={i}
                      aria-label={"編集: " + s.text}
                      className="text-hit"
                      style={{
                        left: (s.rect[0] / active.width) * 100 + "%",
                        top: (s.rect[1] / active.height) * 100 + "%",
                        width:
                          ((s.rect[2] - s.rect[0]) / active.width) * 100 + "%",
                        height:
                          ((s.rect[3] - s.rect[1]) / active.height) * 100 + "%",
                      }}
                      onClick={() => selectSpan(s)}
                    />
                  ))}
                {rect && (
                  <div
                    className={
                      "edit-preview " +
                      (tool === "redact"
                        ? "redaction"
                        : tool === "highlight"
                          ? "highlight"
                          : "")
                    }
                    style={{
                      ...selectionStyle,
                      background:
                        tool === "replace"
                          ? "white"
                          : tool === "highlight"
                            ? edit.color + "66"
                            : undefined,
                      color: edit.color,
                      opacity: edit.opacity,
                    }}
                  >
                    {["text", "replace"].includes(tool) && (
                      <div
                        style={{
                          fontFamily: fontFamilies[edit.font],
                          fontWeight: edit.font.endsWith("bold") ? 700 : 400,
                          fontSize: (edit.size / active.width) * paperWidth,
                          lineHeight: 1.5,
                          textAlign: ["left", "center", "right"][edit.align],
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {edit.text}
                      </div>
                    )}
                    {["image", "signature"].includes(tool) && imageData && (
                      <img
                        src={"data:image/png;base64," + imageData}
                        alt="挿入する画像"
                      />
                    )}
                    {tool === "arrow" && <ArrowUpRight size={40} />}
                  </div>
                )}
              </div>
            )}
          </div>
          <footer aria-live="polite">
            {busy ? (
              <>
                <CircleNotch className="spinner" />
                処理中…
              </>
            ) : (
              <>
                <Check size={16} />
                {message || "架空のサンプルで機能をお試しいただけます"}
              </>
            )}
            <span>
              {pdf ? Math.round((pdf.length * 0.75) / 1024) + " KB" : ""}
            </span>
          </footer>
        </main>
        <aside className="inspector">
          <h2>
            {tool === "select"
              ? "編集する場所を選択"
              : tool === "replace"
                ? "既存テキストを編集"
                : "選択範囲を編集"}
          </h2>
          <p className="hint">
            {tool === "select"
              ? "PDFの文字をクリック、またはツールを選んで範囲をドラッグ。"
              : "右側で入力すると中央に仮表示。確定でPDFに反映します。"}
          </p>
          {error && (
            <div role="alert" className="error">
              <Warning size={18} />
              <span>{error}</span>
              <button aria-label="エラーを閉じる" onClick={() => setError("")}>
                <X />
              </button>
            </div>
          )}
          {tool !== "select" && (
            <>
              {["text", "replace", "note", "field", "checkbox"].includes(
                tool,
              ) && (
                <label className="field">
                  {["field", "checkbox"].includes(tool)
                    ? "フィールド名"
                    : "テキスト"}
                  <textarea
                    aria-label="テキスト"
                    value={edit.text}
                    onChange={(e) => setEdit({ ...edit, text: e.target.value })}
                    rows={5}
                  />
                </label>
              )}
              {["text", "replace"].includes(tool) && (
                <>
                  <p className="live">
                    <Check size={16} />
                    入力内容をプレビューに反映
                  </p>
                  <label className="field-row">
                    フォント
                    <select
                      value={edit.font}
                      onChange={(e) =>
                        setEdit({ ...edit, font: e.target.value })
                      }
                    >
                      <option value="noto-sans">Noto Sans JP</option>
                      <option value="noto-sans-bold">Noto Sans JP Bold</option>
                      <option value="noto-serif">Noto Serif JP</option>
                      <option value="noto-serif-bold">
                        Noto Serif JP Bold
                      </option>
                      <option value="japan">標準 日本語ゴシック</option>
                      <option value="japan-s">標準 日本語明朝</option>
                      <option value="helv">Helvetica（英数）</option>
                      <option value="tiro">Times（英数）</option>
                    </select>
                  </label>
                  <label className="field-row">
                    サイズ
                    <input
                      aria-label="文字サイズ"
                      type="number"
                      min="4"
                      max="160"
                      value={edit.size}
                      onChange={(e) =>
                        setEdit({ ...edit, size: Number(e.target.value) })
                      }
                    />
                    <span>pt</span>
                  </label>
                  <label className="field-row">
                    配置
                    <select
                      value={edit.align}
                      onChange={(e) =>
                        setEdit({ ...edit, align: Number(e.target.value) })
                      }
                    >
                      <option value="0">左揃え</option>
                      <option value="1">中央揃え</option>
                      <option value="2">右揃え</option>
                    </select>
                  </label>
                </>
              )}
              {!["redact", "crop", "image", "signature"].includes(tool) && (
                <label className="field-row">
                  色
                  <input
                    aria-label="文字・図形の色"
                    type="color"
                    value={edit.color}
                    onChange={(e) =>
                      setEdit({ ...edit, color: e.target.value })
                    }
                  />
                  <code>{edit.color}</code>
                </label>
              )}
              {["text", "replace"].includes(tool) && (
                <label className="field">
                  不透明度 {Math.round(edit.opacity * 100)}%
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={edit.opacity}
                    onChange={(e) =>
                      setEdit({ ...edit, opacity: Number(e.target.value) })
                    }
                  />
                </label>
              )}
              {["image", "signature"].includes(tool) && (
                <Btn
                  icon={UploadSimple}
                  onClick={() => imageInput.current.click()}
                >
                  画像・印影を選択
                </Btn>
              )}
              {tool === "redact" && (
                <p className="warning">
                  対象の文字・画像・図形を削除します。確定時に全ページの注釈・フォーム・添付情報も除去します。
                </p>
              )}
              {tool === "replace" && (
                <p className="hint">
                  文字領域を削除して置換します。元フォント・背景の完全再現や段落組み直しではありません。
                </p>
              )}
              {rect && (
                <>
                  <h3>位置・サイズ（pt）</h3>
                  <div className="coordinates">
                    {["左", "上", "幅", "高さ"].map((label, i) => (
                      <label key={label}>
                        {label}
                        <input
                          type="number"
                          aria-label={label}
                          value={Math.round(
                            i < 2 ? rect[i] : rect[i] - rect[i - 2],
                          )}
                          onChange={(e) => {
                            const r = [...rect],
                              v = Number(e.target.value);
                            if (i < 2) {
                              const delta = v - r[i];
                              r[i] = v;
                              r[i + 2] += delta;
                            } else r[i] = r[i - 2] + v;
                            setRect(r);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </>
              )}
              <div className="commit-actions">
                {primary("変更を確定", commit)}
                <Btn onClick={cancel} disabled={busy}>
                  取消
                </Btn>
              </div>
            </>
          )}
          {tool === "select" && (
            <div className="inspector-empty">
              <Cursor size={36} />
              <h3>選んで、右側で編集</h3>
              <p>
                文字の追記や置換、画像の配置を
                <br />
                プレビューしながら調整できます。
              </p>
              <Btn
                icon={TextT}
                onClick={() => chooseTool("text")}
                disabled={busy}
              >
                テキストを追加
              </Btn>
            </div>
          )}
          {view?.widgets.length > 0 && (
            <details>
              <summary>入力フォーム（{view.widgets.length}）</summary>
              {view.widgets.map((w) => (
                <div key={w.name}>
                  <label className="field">
                    {w.name}
                    <input
                      defaultValue={w.value}
                      type={w.type === 2 ? "checkbox" : "text"}
                      onBlur={(e) =>
                        perform("fill", {
                          name: w.name,
                          value:
                            w.type === 2 ? e.target.checked : e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              ))}
            </details>
          )}
          <div className="inspector-bottom">
            <Btn icon={ListChecks} onClick={() => setModal("help")}>
              対応範囲・注意事項
            </Btn>
            {primary(
              "確認して書き出す",
              () => {
                setStep(3);
                openExport();
              },
              DownloadSimple,
            )}
            <Btn
              icon={FloppyDisk}
              onClick={() => setModal("draft")}
              disabled={busy}
            >
              下書きを保存・復元
            </Btn>
          </div>
        </aside>
      </div>
      <input
        type="file"
        ref={input}
        hidden
        accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
        multiple={modal !== "replaceFile"}
        onChange={(e) => {
          importFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        type="file"
        ref={imageInput}
        hidden
        accept="image/png,image/jpeg"
        onChange={async (e) => {
          const f = e.target.files[0];
          if (f) {
            if (f.size > 5_000_000) setError("画像は5MB以内にしてください");
            else setImageData(await b64(f));
          }
          e.target.value = "";
        }}
      />
      <input
        type="file"
        ref={draftInput}
        hidden
        accept=".json"
        onChange={(e) => {
          if (e.target.files[0]) loadDraft(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <input
        type="file"
        ref={compareInput}
        hidden
        accept=".pdf"
        onChange={(e) => {
          const f = e.target.files[0];
          if (f)
            run(async () => {
              if (f.size > 25 * 1024 * 1024)
                throw new Error("25MB以内にしてください");
              const d = await api(compareMode, { pdf, other: await b64(f) });
              setDiff(d.results);
              setModal(compareMode);
            });
          e.target.value = "";
        }}
      />
      <input
        type="file"
        ref={batchInput}
        hidden
        accept=".pdf"
        multiple
        onChange={(e) => {
          batchFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setModal("");
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="PDFツール"
          >
            <button
              className="close"
              aria-label="ダイアログを閉じる"
              disabled={busy}
              onClick={() => setModal("")}
            >
              <X size={22} />
            </button>
            {["import", "replaceFile"].includes(modal) && (
              <>
                <h2>
                  {modal === "replaceFile" ? "PDFを開く" : "文書を追加・結合"}
                </h2>
                <p>
                  PDF・画像・Word・Excelに対応。1ファイル25MB、合計150ページまで。
                </p>
                <p className="warning">
                  このプレビューでは選択ファイルを検証用サーバーへ送って処理します。機密書類は使用しないでください。PC版を端末で起動した場合は、PC内で処理できます。
                </p>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  処理場所を理解し、このセッションで選択するファイルの送信に同意する
                </label>
                <label className="field">
                  開くためのパスワード（必要な場合）
                  <input
                    type="password"
                    value={password}
                    autoComplete="off"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                {primary(
                  "ファイルを選ぶ",
                  () => input.current.click(),
                  UploadSimple,
                )}
              </>
            )}
            {modal === "export" && (
              <>
                <h2>確認して書き出す</h2>
                <p>
                  現在の文書：{view?.pages.length}
                  ページ。未確定の入力はPDFに含まれません。
                </p>
                {layoutReport && (
                  <p className="conversion-score">
                    文字レイヤーあり {layoutReport.nativeTextPages}/
                    {layoutReport.pages.length}ページ · スキャン候補{" "}
                    {layoutReport.scannedPages}ページ · 検出表{" "}
                    {layoutReport.tables}件
                  </p>
                )}
                <p className="hint">
                  元ファイルとは別名で保存します。署名画像は電子証明書による署名ではありません。
                </p>
                {primary("PDFをダウンロード", savePDF, DownloadSimple)}
                <h3>Word / Excel</h3>
                <div className="tool-grid">
                  {[
                    ["docx-layout", "Word 見た目優先"],
                    ["docx-edit", "Word 編集優先"],
                    ["xlsx-layout", "Excel 見た目＋編集"],
                    ["xlsx-table", "Excel 表抽出"],
                  ].map(([id, label]) => (
                    <Btn
                      key={id}
                      disabled={busy}
                      onClick={() => exportAs(id)}
                      icon={DownloadSimple}
                    >
                      {label}
                    </Btn>
                  ))}
                </div>
                <p className="warning">
                  見た目優先Wordはページ画像なので忠実ですが本文編集不可。編集優先は文字位置を近似します。Excelは参照画像と編集用セルを併設します。完全一致と完全編集性の同時保証はできません。
                </p>
                <h3>その他の形式</h3>
                <div className="tool-grid">
                  {[
                    ["split", "選択ページを個別PDF"],
                    ["png", "選択ページをPNG"],
                    ["jpeg", "選択ページをJPEG"],
                    ["txt", "全文テキスト"],
                  ].map(([id, label]) => (
                    <Btn
                      key={id}
                      disabled={busy}
                      onClick={() => exportAs(id)}
                      icon={DownloadSimple}
                    >
                      {label}
                    </Btn>
                  ))}
                </div>
              </>
            )}
            {modal === "draft" && (
              <>
                <h2>下書き・復元</h2>
                <p>
                  確定済みの状態を保存します。操作履歴と未確定の入力は含みません。
                </p>
                <div className="tool-grid">
                  <Btn icon={FloppyDisk} onClick={saveDraft}>
                    下書きファイル保存
                  </Btn>
                  <Btn
                    icon={UploadSimple}
                    onClick={() => {
                      if (!consent) {
                        setError(
                          "先にファイル読込で送信について確認してください",
                        );
                        setModal("import");
                        return;
                      }
                      draftInput.current.click();
                    }}
                  >
                    下書きファイル読込
                  </Btn>
                </div>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={draft}
                    onChange={(e) => setDraft(e.target.checked)}
                  />
                  このブラウザに自動保存する（共有端末では使わない）
                </label>
                <Btn
                  onClick={() => {
                    const saved = localStorage.getItem("atelier-draft");
                    if (!saved) {
                      setError("保存済み下書きがありません");
                      return;
                    }
                    const d = JSON.parse(saved);
                    record(d.pdf, "自動保存から復元", 0);
                    setName(d.name);
                    setModal("");
                  }}
                >
                  ブラウザの下書きから復元
                </Btn>
                <Btn
                  onClick={() => {
                    localStorage.removeItem("atelier-draft");
                    setDraft(false);
                    setMessage("ブラウザの保存済み下書きを消去しました");
                  }}
                >
                  ブラウザの下書きを消去
                </Btn>
              </>
            )}
            {modal === "more" && (
              <>
                <h2>文書を仕上げる</h2>
                <p>
                  対象：{selected.length || 1}
                  ページ。操作後は「戻す」で復元できます。
                </p>
                <div className="tool-grid">
                  <Btn
                    onClick={() => {
                      chooseTool("crop");
                      setModal("");
                    }}
                  >
                    範囲を指定してトリミング
                  </Btn>
                  <Btn
                    onClick={() => {
                      perform("a4");
                      setModal("");
                    }}
                  >
                    A4に統一（フォームは平坦化）
                  </Btn>
                  <Btn
                    onClick={() => {
                      chooseTool("field");
                      setModal("");
                    }}
                  >
                    入力フォームを作成
                  </Btn>
                  <Btn
                    onClick={() => {
                      chooseTool("checkbox");
                      setEdit({ ...defaults, text: "Check_" + Date.now() });
                      setModal("");
                    }}
                  >
                    チェックボックス作成
                  </Btn>
                  <Btn onClick={() => setModal("ocr")}>文字認識 OCR</Btn>
                  <Btn onClick={() => setModal("security")}>パスワード保護</Btn>
                  <Btn onClick={() => setModal("compress")}>PDFを圧縮</Btn>
                  <Btn
                    onClick={() => {
                      if (!consent) {
                        setModal("import");
                        setError("ファイル送信の確認が必要です");
                      } else compareInput.current.click();
                    }}
                  >
                    PDF差分比較（文字）
                  </Btn>
                </div>
                <h3>一括挿入</h3>
                <input
                  aria-label="一括挿入する文字"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                />
                <div className="tool-grid">
                  {[
                    ["number", "ページ番号"],
                    ["header", "ヘッダー"],
                    ["footer", "フッター"],
                    ["watermark", "透かし"],
                  ].map(([id, t]) => (
                    <Btn
                      key={id}
                      disabled={busy}
                      onClick={() => perform(id, { text: bulkText })}
                    >
                      {t}
                    </Btn>
                  ))}
                </div>
                <h3>傾き補正（指定角度・画像化）</h3>
                <label className="field-row">
                  角度
                  <input
                    type="number"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={angle}
                    onChange={(e) => setAngle(Number(e.target.value))}
                  />
                </label>
                <p className="hint">
                  文字・フォームの編集性が失われます。自動検出ではありません。
                </p>
                <Btn
                  disabled={busy}
                  onClick={() => perform("deskew", { angle })}
                >
                  補正する
                </Btn>
              </>
            )}
            {modal === "security" && (
              <>
                <h2>パスワード保護</h2>
                <p>
                  AES-256で暗号化したコピーを書き出します。パスワードを忘れると復元できません。
                </p>
                <label className="field">
                  パスワード
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </label>
                {primary(
                  "暗号化して書き出す",
                  () => perform("encrypt", { password }),
                  Lock,
                )}
                <p className="hint">
                  保護解除は正しいパスワードで読込後、通常のPDFとして書き出してください。
                </p>
              </>
            )}
            {modal === "ocr" && (
              <>
                <h2>文字認識 OCR</h2>
                <p>
                  ブラウザ内で選択ページを認識し、元の見た目を維持したまま検索可能な透明文字層を追加します。認識画像は外部OCRサービスへ送りません。
                </p>
                <label className="field">
                  言語
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                  >
                    <option value="jpn+eng">日本語・英語</option>
                    <option value="jpn_vert+eng">日本語 縦書き・英語</option>
                    <option value="eng">英語</option>
                  </select>
                </label>
                {ocrProgress && (
                  <p className="live">
                    <CircleNotch className="spinner" />
                    {ocrProgress}
                  </p>
                )}
                {ocrReport && (
                  <p className="conversion-score">
                    前回：{ocrReport.words}語 · 平均信頼度 {ocrReport.average}%
                    · 低信頼 {ocrReport.low}語
                  </p>
                )}
                {primary("選択ページをOCR処理", browserOcr, TextT)}
                <p className="warning">
                  表・縦書き・小文字・数字は誤認識があり得ます。検索・コピー結果を必ず目視確認してください。
                </p>
              </>
            )}
            {modal === "compress" && (
              <>
                <h2>PDFを圧縮</h2>
                <p>
                  通常は画質を変えずに構造を最適化。ファイルによってサイズが変わらない場合があります。
                </p>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={lossy}
                    onChange={(e) => setLossy(e.target.checked)}
                  />
                  全ページを画像化して強圧縮（文字検索・フォーム・リンクが失われます）
                </label>
                {primary("圧縮する", () =>
                  perform("compress", { raster: lossy, dpi: 120 }),
                )}
              </>
            )}
            {modal === "search" && (
              <>
                <h2>文字を検索</h2>
                <input
                  placeholder="検索語を入力"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <p className="hint">
                  現在のページ内を検索。スキャンPDFは先にOCRを実行してください。
                </p>
                {view?.spans
                  .filter((s) => search && s.text.includes(search))
                  .map((s, i) => (
                    <button
                      className="search-result"
                      key={i}
                      onClick={() => {
                        selectSpan(s);
                        setModal("");
                      }}
                    >
                      {s.text}
                    </button>
                  ))}
              </>
            )}
            {modal === "compare" && (
              <>
                <h2>文字の差分</h2>
                <p className="hint">
                  画像・レイアウト・書式の差分は「見た目の比較」を使用してください。
                </p>
                {diff.map((d) => (
                  <div key={d.page}>
                    <h3>ページ{d.page}</h3>
                    <pre>{d.diff || "文字の差分なし"}</pre>
                  </div>
                ))}
              </>
            )}
            {modal === "compare-visual" && (
              <>
                <h2>見た目の差分</h2>
                <p>
                  異なる画素を赤で表示します。最大900pxでの比較であり、微細な差・非表示情報の完全検出ではありません。
                </p>
                {diff.map((d) => (
                  <div key={d.page}>
                    <h3>
                      ページ{d.page} · 差分 {d.percent}%{" "}
                      {d.dimensionsChanged
                        ? "（サイズ・ページ有無の違い）"
                        : ""}
                    </h3>
                    <img
                      style={{ maxWidth: "100%" }}
                      src={"data:image/png;base64," + d.image}
                      alt={"ページ" + d.page + "の画像差分"}
                    />
                  </div>
                ))}
              </>
            )}
            {modal === "sensitive" && (
              <>
                <h2>個人情報の候補</h2>
                <p className="warning">
                  メール・ハイフン付き電話番号・郵便番号のパターン検出です。氏名・住所・画像内の情報は網羅しません。AI判定ではなく、見落としと誤検出があります。
                </p>
                {candidates.length === 0 ? (
                  <p>候補がありません。安全を保証する結果ではありません。</p>
                ) : (
                  candidates.map((c, i) => (
                    <button
                      className="search-result"
                      key={i}
                      onClick={() => {
                        if (isDirty) {
                          setError("先に編集を確定または取消してください");
                          return;
                        }
                        setPage(c.page);
                        setRect(c.rect);
                        setOriginal(null);
                        setTool("redact");
                        setModal("");
                      }}
                    >
                      {c.page + 1}ページ · {c.kind}：{c.text} — 墨消し範囲へ
                    </button>
                  ))
                )}
              </>
            )}
            {modal === "batch" && (
              <>
                <h2>複数PDFの一括処理</h2>
                <p>
                  10文書・合計25MBまで。同じ処理を各文書の全ページに適用し、ZIPに保存します。1件でも失敗した場合は出力せず、元の文書は変更しません。
                </p>
                <label className="field">
                  処理
                  <select
                    value={batchAction}
                    onChange={(e) => setBatchAction(e.target.value)}
                  >
                    <option value="compress">可逆圧縮</option>
                    <option value="rotate">右90度回転</option>
                    <option value="number">ページ番号</option>
                    <option value="watermark">透かし</option>
                  </select>
                </label>
                {batchAction === "watermark" && (
                  <label className="field">
                    透かし文字
                    <input
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                    />
                  </label>
                )}
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  選択ファイルを検証用サーバーで処理することに同意する（機密書類は使用しない）
                </label>
                {primary("PDFを選んで一括処理", () =>
                  batchInput.current.click(),
                )}
              </>
            )}
            {modal === "signature" && (
              <>
                <h2>手書き署名</h2>
                <p>
                  署名を描いて登録後、PDF上で配置範囲を指定してください。証明書署名ではありません。
                </p>
                <canvas
                  ref={sig}
                  width="600"
                  height="200"
                  className="signature-pad"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const b = e.currentTarget.getBoundingClientRect(),
                      c = e.currentTarget.getContext("2d");
                    c.beginPath();
                    c.moveTo(
                      ((e.clientX - b.left) * 600) / b.width,
                      ((e.clientY - b.top) * 200) / b.height,
                    );
                    drag.current = "sig";
                  }}
                  onPointerMove={(e) => {
                    if (drag.current !== "sig") return;
                    const b = e.currentTarget.getBoundingClientRect(),
                      c = e.currentTarget.getContext("2d");
                    c.lineWidth = 2.5;
                    c.strokeStyle = "#15243d";
                    c.lineTo(
                      ((e.clientX - b.left) * 600) / b.width,
                      ((e.clientY - b.top) * 200) / b.height,
                    );
                    c.stroke();
                  }}
                  onPointerUp={() => {
                    drag.current = null;
                  }}
                />
                {primary("署名を登録", () => {
                  setImageData(
                    sig.current.toDataURL("image/png").split(",")[1],
                  );
                  setModal("");
                })}
                <Btn
                  onClick={() =>
                    sig.current.getContext("2d").clearRect(0, 0, 600, 200)
                  }
                >
                  描き直す
                </Btn>
              </>
            )}
            {modal === "help" && (
              <>
                <h2>対応範囲と制限</h2>
                <p>
                  検証用です。重要書類はコピーを使い、出力後に別のPDFビューアでも確認してください。
                </p>
                <dl>
                  <dt>ページ・編集</dt>
                  <dd>
                    結合、分割、回転、削除、並べ替え、複製、白紙、追記、選択文字置換、画像・署名、図形、付箋、マーカー、ページ番号、透かし。
                  </dd>
                  <dt>プレビューと確定</dt>
                  <dd>
                    入力は即時仮表示。「変更を確定」でPDFを生成し直します。フォント・改行は確定後の表示を正としてください。
                  </dd>
                  <dt>履歴・保存</dt>
                  <dd>
                    最大30操作、履歴容量約50MB。自動保存は任意。ブラウザを閉じると操作履歴は失われます。
                  </dd>
                  <dt>墨消し</dt>
                  <dd>
                    元の文字・画像・図形を削除。注釈・フォーム・リンク・添付・メタデータも除去。元ファイルと履歴には元の内容が残るので、共有するのは書出し済みPDFのみ。
                  </dd>
                  <dt>Noto日本語フォント</dt>
                  <dd>
                    Noto Sans JP／Noto Serif JPの標準・太字をPDFへ埋め込みます。プレビューと確定PDFの両方で選択できます。
                  </dd>
                  <dt>OCR</dt>
                  <dd>
                    日本語・英語・縦書きをブラウザ内で認識し、元の見た目を維持して透明な検索文字層を追加します。数字や表は必ず確認してください。
                  </dd>
                  <dt>Word／Excel変換</dt>
                  <dd>
                    Wordは見た目優先（ページ画像）と編集優先（文字再配置）を選択できます。Excelは見た目参照シート＋編集シート、または表抽出です。完全一致と完全編集性は同時には保証できません。
                  </dd>
                  <dt>未搭載・対象外</dt>
                  <dd>
                    証明書署名、AIによる網羅的な個人情報検出、Officeの段落・グラフ・数式・マクロの完全再構築は対象外。署名済みPDFは編集を拒否します。
                  </dd>
                  <dt>容量と処理場所</dt>
                  <dd>
                    25MB/ファイル、150ページ。PDF編集は検証用サーバー処理、OCR認識はブラウザ内処理です。配布コードをPC内で動かす場合はPC内処理。外部AIへの送信はありません。
                  </dd>
                </dl>
              </>
            )}
            {modal === "more" && (
              <>
                <h3>検出・比較・バッチ</h3>
                <div className="tool-grid">
                  <Btn
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const result = await api("sensitive", { pdf });
                        setCandidates(result.results);
                        setModal("sensitive");
                      })
                    }
                  >
                    個人情報候補を検出
                  </Btn>
                  <Btn
                    disabled={busy}
                    onClick={() => {
                      if (!consent) {
                        setModal("import");
                        return;
                      }
                      setCompareMode("compare-visual");
                      compareInput.current.click();
                    }}
                  >
                    見た目の比較（画像差分）
                  </Btn>
                  <Btn onClick={() => setModal("batch")}>複数PDFを一括処理</Btn>
                  <Btn disabled={busy} onClick={() => perform("deskew-auto")}>
                    自動傾き補正（横書き）
                  </Btn>
                </div>
                <p className="hint">
                  自動傾き補正は±5度の横書き印刷文書向け試験機能です。ページを画像化します。写真・縦書き・表では手動補正を使用し、出力を確認してください。
                </p>
              </>
            )}
            {modal === "signature" && (
              <>
                <h3>このブラウザの署名登録</h3>
                <p className="warning">
                  登録は暗号化されません。共有端末では保存しないでください。外部画像も含め、PDFへの配置時はサーバー処理されます。
                </p>
                <div className="tool-grid">
                  <Btn
                    onClick={() => {
                      try {
                        localStorage.setItem(
                          "atelier-signature",
                          sig.current.toDataURL("image/png").split(",")[1],
                        );
                        setMessage("このブラウザに署名画像を登録しました");
                      } catch {
                        setError("保存できませんでした");
                      }
                    }}
                  >
                    描いた署名を保存
                  </Btn>
                  <Btn
                    onClick={() => {
                      const saved = localStorage.getItem("atelier-signature");
                      if (!saved) {
                        setError("登録済み署名がありません");
                        return;
                      }
                      setImageData(saved);
                      setModal("");
                    }}
                  >
                    登録署名を使う
                  </Btn>
                  <Btn
                    onClick={() => {
                      localStorage.removeItem("atelier-signature");
                      setMessage("登録済み署名を削除しました");
                    }}
                  >
                    登録署名を削除
                  </Btn>
                </div>
              </>
            )}
            {busy && (
              <p className="live">
                <CircleNotch className="spinner" />
                処理しています…
              </p>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
