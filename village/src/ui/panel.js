// 화면 가운데 뜨는 창 (가방, 가게 등). 한 번에 하나만 열림.
import { t } from '../i18n.js';
import { sfx } from '../audio.js';

let current = null;

export function openPanel({ title, sub = '', render, onClose, extra }) {
  closePanel();
  const wrap = document.createElement('div');
  wrap.className = 'panel-wrap';
  wrap.innerHTML = `
    <div class="panel" role="dialog" aria-label="${title}">
      <header><div><h3>${title}</h3><p class="panel-sub">${sub}</p></div>
      <div class="head-btns">${extra ? `<button class="btn small extra">${extra.label}</button>` : ''}<button class="btn icon close" aria-label="${t('common.close')}">✕</button></div></header>
      <div class="panel-body"></div>
    </div>`;
  wrap.addEventListener('pointerdown', e => { if (e.target === wrap) closePanel(); });
  wrap.querySelector('.close').onclick = closePanel;
  if (extra) wrap.querySelector('.extra').onclick = extra.onClick;
  document.getElementById('ui').appendChild(wrap);
  const body = wrap.querySelector('.panel-body');
  current = { wrap, body, render, onClose, setSub: s => { wrap.querySelector('.panel-sub').textContent = s; } };
  render(body, current);
  sfx('open');
  return current;
}

export function refreshPanel() { if (current) { current.body.innerHTML = ''; current.render(current.body, current); } }

export function closePanel() {
  if (!current) return;
  current.wrap.remove();
  const cb = current.onClose;
  current = null;
  cb?.();
}

export function isPanelOpen() { return !!current; }

// 작은 도우미: HTML 글자 만들기
export function el(tag, cls, html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.innerHTML = html;
  return e;
}
