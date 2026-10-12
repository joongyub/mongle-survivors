// 글자 꺼내 쓰기: t('menu.build') → '건설' (일본어면 '建設')
// 언어는 기기마다 기억해 (localStorage). 처음엔 브라우저 언어를 보고 정함.
import ko from './data/i18n/ko.js';
import ja from './data/i18n/ja.js';
import { RESIDENT_BY_ID } from './data/residents.js';

export const LANGS = { ko, ja };
export const LANG_LIST = ['ko', 'ja'];
const KEY = 'mongle-village:lang';

// 게임 안 글씨(캔버스)에 쓰는 글꼴: 한글은 Jua, 일본어는 M PLUS Rounded 1c
export const FONT = 'Jua, "M PLUS Rounded 1c", sans-serif';

function firstLang() {
  try { const v = localStorage.getItem(KEY); if (LANGS[v]) return v; } catch { /* 저장 못 하는 브라우저 */ }
  return (navigator.language || '').toLowerCase().startsWith('ja') ? 'ja' : 'ko';
}
let current = firstLang();

export function getLang() { return current; }

export function setLang(lang) {
  if (!LANGS[lang]) return;
  current = lang;
  try { localStorage.setItem(KEY, lang); } catch { /* 무시 */ }
}

export function t(key, vars = {}) {
  let s = LANGS[current][key] ?? LANGS.ko[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// HTML에 data-i18n="키"가 붙은 곳에 글자를 채워 넣음 (data-i18n-aria는 화면 읽기용 이름)
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  if (root === document) {
    document.documentElement.lang = current;
    document.title = t('title.logo');
  }
}

// 아이템 이름: 'seed_carrot' → '당근 씨앗'
export function itemName(id) {
  if (id.startsWith('seed_')) return t('item.seed', { name: t('item.' + id.slice(5)) });
  return t('item.' + id);
}

// 주민 글자 (이름, 동물, 성격, 보너스, 말버릇). 번역이 없으면 residents.js의 한국어
export function resText(id, field) {
  return LANGS[current][`res.${id}.${field}`] ?? RESIDENT_BY_ID[id]?.[field] ?? id;
}

// "1시간 5분" 같은 남은 시간 글자
export function formatLeft(ms) {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return t('time.s', { n: s });
  const m = Math.ceil(s / 60);
  if (m < 60) return t('time.m', { n: m });
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? t('time.hm', { h, m: mm }) : t('time.h', { n: h });
}
