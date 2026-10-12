// 글자 꺼내 쓰기: t('menu.build') → '건설'
import ko from './data/i18n/ko.js';

const LANGS = { ko };
let current = 'ko';

export function setLang(lang) { if (LANGS[lang]) current = lang; }

export function t(key, vars = {}) {
  let s = LANGS[current][key] ?? LANGS.ko[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// HTML에 data-i18n="키"가 붙은 곳에 글자를 채워 넣음
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
}

// 아이템 이름: 'seed_carrot' → '당근 씨앗'
export function itemName(id) {
  if (id.startsWith('seed_')) return t('item.seed', { name: t('item.' + id.slice(5)) });
  return t('item.' + id);
}
