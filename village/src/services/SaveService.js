// ★ 저장/불러오기는 반드시 여기를 통해서만 해.
// 지금은 브라우저 저장(LocalStore), 나중엔 클라우드 저장으로 바꿔 끼우기만 하면 돼.
import { LocalStore } from './LocalStore.js';
import { migrate } from './migrations.js';
import { state, loadState, SAVE_VERSION } from '../state/GameState.js';
import { now } from '../core/clock.js';

const KEY = 'save-slot-1';
const APP = 'mongle-village';
let store = LocalStore;
let saving = null;

export const SaveService = {
  useStore(s) { store = s; },                  // 나중에 CloudStore로 교체할 때

  async hasSave() { return !!(await store.get(KEY)); },

  async peek() { return await store.get(KEY); },   // 이어하기 화면에 보여줄 정보

  async save() {
    if (!state.playerId) return false;           // 아직 게임 시작 전
    const t = now();
    state.lastClockAt = t;
    state.lastSavedAt = new Date(t).toISOString();
    state.version = SAVE_VERSION;
    const data = JSON.parse(JSON.stringify(state));
    saving = store.set(KEY, data);
    const ok = await saving;
    saving = null;
    return ok;
  },

  // 저장된 게임을 불러와서 state에 넣음. 없으면 false
  async load() {
    const raw = await store.get(KEY);
    if (!raw) return false;
    loadState(migrate(raw));
    return true;
  },

  async clear() { await store.remove(KEY); },

  // ---- 백업 ----
  exportJson() {
    return JSON.stringify({ app: APP, ...JSON.parse(JSON.stringify(state)) }, null, 1);
  },
  // 짧은 글자(코드)로: 복사해서 메모장 등에 보관
  exportCode() {
    return 'MV1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ app: APP, ...state }))));
  },
  // 파일 내용이나 코드를 받아서 확인 후 저장 (불러오기는 새로고침 때)
  async importText(text) {
    text = String(text).trim();
    let data;
    try {
      data = text.startsWith('MV1:') ? JSON.parse(decodeURIComponent(escape(atob(text.slice(4))))) : JSON.parse(text);
    } catch { return { ok: false, reason: 'broken' }; }
    if (data.app !== APP || !data.playerId || !data.farm) return { ok: false, reason: 'notOurs' };
    delete data.app;
    try { data = migrate(data); } catch { return { ok: false, reason: 'newer' }; }
    const ok = await store.set(KEY, data);
    return ok ? { ok: true } : { ok: false, reason: 'storage' };
  },

  // 파일 다운로드 (자기 사이트에서는 잘 되고, 미리보기 창 등에서는 막힐 수 있음)
  downloadFile() {
    try {
      const blob = new Blob([this.exportJson()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `몽글숲마을_${state.village.name}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      return true;
    } catch { return false; }
  },

  askPersist() { return store.askPersist?.(); },
};

// 자동 저장: 바뀐 뒤 1초 뒤 + 30초마다 + 화면을 떠날 때
export function startAutoSave(onSaved) {
  let timer = null;
  const soon = () => { clearTimeout(timer); timer = setTimeout(() => SaveService.save().then(ok => ok && onSaved?.()), 1000); };
  setInterval(() => SaveService.save().then(ok => ok && onSaved?.()), 30000);
  const flush = () => { clearTimeout(timer); SaveService.save(); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
  return soon;
}
