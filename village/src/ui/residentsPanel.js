// 주민 목록: 호감도, 오늘 대화·선물 했는지, 생일, 좋아하는 것, 편지·사진 다시 보기
import { state } from '../state/GameState.js';
import { RESIDENTS, RESIDENT_BY_ID } from '../data/residents.js';
import { rel, tierOf, isBirthday } from '../core/residents.js';
import { now, dayKey } from '../core/clock.js';
import { t, resText } from '../i18n.js';
import { openPanel, closePanel, el } from './panel.js';
import { faceSrc, heartGauge, likeName, birthdayText, openLetter, openPhoto, colorOf } from './residentBits.js';
import { questOf } from './questPanel.js';

const check = on => (on ? '✅' : '⬜');

export function openResidentsPanel(scene) {
  const ids = RESIDENTS.map(r => r.id).filter(id => id !== state.mayor?.residentId);
  const living = ids.filter(id => state.residents[id]);
  openPanel({
    title: t('resp.title'),
    sub: t('resp.sub', { n: living.length }),
    render(body) {
      const list = el('div', 'shop-list');
      for (const id of living) list.appendChild(row(scene, id));
      for (const id of ids.filter(id => !state.residents[id])) list.appendChild(lockedRow(id));
      body.appendChild(list);
    },
  });
}

function row(scene, id) {
  const r = rel(state.residents, id), tier = tierOf(r.friendship), today = dayKey();
  const p = RESIDENT_BY_ID[id];
  const bd = isBirthday(id, now());
  const likes = tier >= 1 ? t('resp.likes', { list: p.likes.map(likeName).join(', ') }) : t('resp.likesHidden');
  const dislikes = tier >= 2 ? t('resp.dislikes', { list: p.dislikes.map(likeName).join(', ') }) : '';
  const box = el('div', 'shop-row res-row', `
    <img class="q-face" src="${faceSrc(id)}" alt="">
    <div class="shop-text"><b>${resText(id, 'short')}</b><span class="soft">${resText(id, 'animal')} · ${resText(id, 'trait')}</span>
      ${heartGauge(r.friendship)}
      <small>${check(r.talkedDay === today)} ${t('resp.talked')} · ${check(r.giftDay === today)} ${t('resp.gifted')}${questOf(id) ? ' · 📜 ' + t('resp.hasQuest') : ''}</small>
      <small>🎂 ${birthdayText(id)}${bd ? ` <b class="bd">${t('resp.bdToday')}</b>` : ''}</small>
      <small>${likes}</small>
      ${dislikes ? `<small>${dislikes}</small>` : ''}
    </div>`);
  box.querySelector('.q-face').style.background = `color-mix(in srgb, ${colorOf(id)} 30%, #fff)`;
  const btns = el('div', 'shop-btns col');
  const find = el('button', 'btn small primary', t('resp.find'));
  find.onclick = () => {
    const ch = scene.residents.find(c => c.id === id);
    closePanel();
    if (ch) scene.talkTo(ch);
  };
  btns.appendChild(find);
  const back = () => openResidentsPanel(scene);
  if (tier >= 1) {
    const letter = el('button', 'btn small', t('resp.letter'));
    letter.onclick = () => openLetter(id, tier, { reread: true, onDone: back });
    btns.appendChild(letter);
  }
  if (tier >= 2) {
    const photo = el('button', 'btn small', t('resp.photo'));
    photo.onclick = () => openPhoto(id, { onDone: back });
    btns.appendChild(photo);
  }
  box.appendChild(btns);
  return box;
}

// 아직 이사 오지 않은 주민 (그림자만)
function lockedRow(id) {
  return el('div', 'shop-row res-row off locked', `
    <img class="q-face shadowed" src="${faceSrc(id)}" alt="">
    <div class="shop-text"><b>???</b><small>${t('resp.locked')}</small></div>`);
}
