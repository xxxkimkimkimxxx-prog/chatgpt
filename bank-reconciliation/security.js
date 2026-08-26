(() => {
  'use strict';

  const DB_NAME_SECURITY = 'bank-reconciliation-v2053';
  const DB_STORE_SECURITY = 'months';

  function openSecurityDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME_SECURITY, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE_SECURITY)) db.createObjectStore(DB_STORE_SECURITY);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteMonth(month) {
    const db = await openSecurityDB();
    try {
      const tx = db.transaction(DB_STORE_SECURITY, 'readwrite');
      tx.objectStore(DB_STORE_SECURITY).delete(month);
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('削除処理が中断されました。'));
      });
    } finally {
      db.close();
    }
  }

  async function clearAllMonths() {
    const db = await openSecurityDB();
    try {
      const tx = db.transaction(DB_STORE_SECURITY, 'readwrite');
      tx.objectStore(DB_STORE_SECURITY).clear();
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('削除処理が中断されました。'));
      });
    } finally {
      db.close();
    }
  }

  const monthBtn = document.getElementById('deleteMonthBtn');
  if (monthBtn) {
    monthBtn.addEventListener('click', async () => {
      const month = document.getElementById('targetMonth')?.value || '';
      if (!month) {
        alert('削除する対象月を先に選択してください。');
        return;
      }
      const ok = confirm(`${month} の、この端末・このブラウザに保存された照合データを削除します。\n\n銀行データや当社データがGitHubから削除される操作ではありません。ブラウザ内の月次保存データだけを削除します。\n\n削除後は元に戻せません。実行しますか？`);
      if (!ok) return;
      try {
        await deleteMonth(month);
        alert(`${month} の端末保存データを削除しました。画面を再読み込みします。`);
        location.reload();
      } catch (e) {
        console.error(e);
        alert('端末保存データの削除に失敗しました。ブラウザを閉じずに再度お試しください。');
      }
    });
  }

  const allBtn = document.getElementById('deleteAllLocalBtn');
  if (allBtn) {
    allBtn.addEventListener('click', async () => {
      const ok = confirm('この端末・このブラウザに保存されている銀行入出金照合ツールの月次データを、すべて削除します。\n\n削除後は元に戻せません。実行しますか？');
      if (!ok) return;
      const finalOk = confirm('最終確認です。すべての保存済み月を削除しますか？');
      if (!finalOk) return;
      try {
        await clearAllMonths();
        alert('この端末の保存済み月次データをすべて削除しました。画面を再読み込みします。');
        location.reload();
      } catch (e) {
        console.error(e);
        alert('全端末保存データの削除に失敗しました。ブラウザを閉じずに再度お試しください。');
      }
    });
  }

  // app.js 初期化後、高速化 → 視認性改善 → 読込準備表示の順で読み込む。
  const perf = document.createElement('script');
  perf.src = './performance.js';
  perf.async = false;
  perf.onload = () => {
    const clarity = document.createElement('script');
    clarity.src = './clarity.js';
    clarity.async = false;
    clarity.onload = () => {
      const readiness = document.createElement('script');
      readiness.src = './readiness.js';
      readiness.async = false;
      document.head.appendChild(readiness);
    };
    document.head.appendChild(clarity);
  };
  document.head.appendChild(perf);
})();
