// 브라우저 안에 실제로 저장하는 곳.
// IndexedDB(브라우저 속 작은 데이터베이스)를 먼저 쓰고, 안 되면 localStorage로 대신해.
// 나중에 클라우드 저장을 붙일 땐 같은 모양(get/set/remove)의 CloudStore를 만들어 바꿔 끼우면 돼.
const DB_NAME = 'mongle-village';
const STORE = 'saves';
const LS_PREFIX = 'mongle-village:';

let dbPromise = null;
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) { reject(e); }
  });
  return dbPromise;
}

function idb(mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  }));
}

export const LocalStore = {
  async get(key) {
    try { const v = await idb('readonly', s => s.get(key)); if (v !== undefined) return v; } catch { /* 아래로 */ }
    try { const raw = localStorage.getItem(LS_PREFIX + key); return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  async set(key, value) {
    let ok = false;
    try { await idb('readwrite', s => s.put(value, key)); ok = true; } catch { /* 아래로 */ }
    // 예비로 localStorage에도 한 벌 (용량이 작아서 실패해도 괜찮음)
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); ok = true; } catch { /* 무시 */ }
    return ok;
  },
  async remove(key) {
    try { await idb('readwrite', s => s.delete(key)); } catch { /* 무시 */ }
    try { localStorage.removeItem(LS_PREFIX + key); } catch { /* 무시 */ }
  },
  // 브라우저에게 "이 데이터는 지우지 말아줘" 부탁
  async askPersist() {
    try { return await navigator.storage?.persist?.(); } catch { return false; }
  },
};
