// "다녀왔어요!" 창: 게임을 꺼둔 사이 마을에서 생긴 일
import { t } from '../i18n.js';
import { formatLeft } from '../core/farm.js';
import { openPanel, closePanel, el } from './panel.js';

export function showAway({ awayMs, ripe, thirsty, growing, built = 0 }) {
  openPanel({
    title: t('away.title'),
    sub: t('away.time', { time: formatLeft(awayMs) }),
    render(body) {
      const list = el('div', 'away-list');
      if (built) list.appendChild(el('div', '', t('away.built', { n: built })));
      if (ripe) list.appendChild(el('div', '', t('away.ripe', { n: ripe })));
      if (thirsty) list.appendChild(el('div', '', t('away.thirsty', { n: thirsty })));
      if (growing) list.appendChild(el('div', '', t('away.growing', { n: growing })));
      if (!ripe && !thirsty && !growing && !built) list.appendChild(el('div', '', t('away.none')));
      body.appendChild(list);
      const ok = el('button', 'btn primary big-ish', t('away.ok'));
      ok.onclick = closePanel;
      body.appendChild(ok);
    },
  });
}
