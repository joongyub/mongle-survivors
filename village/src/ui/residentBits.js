// 주민 창들이 같이 쓰는 작은 조각: 얼굴 그림, 호감도 하트 막대, 좋아하는 것 이름, 편지, 사진
import { state, emit } from '../state/GameState.js';
import { RESIDENT_BY_ID } from '../data/residents.js';
import { CHARACTER_IMAGES, POSE_IMAGES } from '../data/assets.js';
import { CROP_BY_ID } from '../data/crops.js';
import { ITEMS } from '../data/items.js';
import { FRIEND_TIERS, TIER_REWARDS } from '../data/dialogue.js';
import { tierOf, nextTierNeed } from '../core/residents.js';
import { t, resText, itemName } from '../i18n.js';
import { openPanel, closePanel, el } from './panel.js';
import { toast } from './toast.js';
import { sfx } from '../audio.js';

// 얼굴 그림 주소 (포즈 그림이 있으면 그 그림)
export function faceSrc(id, pose = null) {
  return (pose && POSE_IMAGES[id]?.[pose]) || CHARACTER_IMAGES[id];
}

export const tierName = tier => t('tier.' + tier);
export const colorOf = id => RESIDENT_BY_ID[id]?.color || '#f7a8b8';

// 하트 막대: 지금 단계에서 다음 단계까지 얼마나 왔는지
export function heartGauge(friendship) {
  const tier = tierOf(friendship);
  const next = nextTierNeed(friendship);
  const from = FRIEND_TIERS[tier];
  const pct = next === null ? 100 : Math.round((friendship - from) / (next - from) * 100);
  const label = next === null ? t('resp.max') : t('resp.next', { a: friendship, b: next });
  return `<div class="heart-row"><span class="tag tier t${tier}">♥ ${tierName(tier)}</span><div class="heart-gauge"><i style="width:${pct}%"></i></div><small>${label}</small></div>`;
}

// 좋아하는 것 이름: 'flower' 같은 묶음은 "꽃", 아이템은 이모지 + 이름
export function likeName(token) {
  if (Object.values(CROP_BY_ID).some(c => c.kind === token)) return t('kind.' + token);
  const emo = ITEMS[token]?.emoji;
  return (emo && !token.startsWith('seed_') ? emo : '') + itemName(token);
}

// 생일 "4월 3일"
export function birthdayText(id) {
  const [m, d] = (RESIDENT_BY_ID[id]?.birthday || '01-01').split('-').map(Number);
  return t('date.md', { m, d });
}

// 호감도 단계가 오르면: 코인 선물을 받고 편지가 옴
export function grantTier(id, tier) {
  const reward = TIER_REWARDS[tier];
  if (reward?.coins) state.inventory.coins += reward.coins;
  toast(t('letter.arrived', { name: resText(id, 'short') }));
  emit('change');
  return reward;
}

// 편지 창. reread = 주민 목록에서 다시 읽기 (선물 안내 없음)
export function openLetter(id, tier, { reread = false, onDone } = {}) {
  sfx('letter');
  const reward = TIER_REWARDS[tier];
  openPanel({
    title: t('letter.title', { name: resText(id, 'short') }),
    sub: t('letter.sub', { tier: tierName(tier) }),
    onClose: reason => { if (reason !== 'replace') onDone?.(); },
    render(body) {
      const paper = el('div', 'letter', `
        <img class="letter-face" src="${faceSrc(id, 'happy')}" alt="">
        <p>${t('letter.' + tier, { village: state.village.name })}</p>
        <p class="sign">${t('letter.sign', { name: resText(id, 'short'), cp: resText(id, 'catchphrase') })}</p>`);
      paper.style.setProperty('--c', colorOf(id));
      body.appendChild(paper);
      if (!reread && reward?.coins) body.appendChild(el('p', 'letter-gift', t('letter.reward', { n: reward.coins })));
      if (tier >= 2 && !reread) body.appendChild(el('p', 'set-note', t('letter.photoNote')));
      const ok = el('button', 'btn primary big-ish', t('letter.ok'));
      ok.onclick = () => closePanel();
      body.appendChild(ok);
    },
  });
}

// 친구가 되면 받는 사진 (주민 목록에서 볼 수 있음)
export function openPhoto(id, { onDone } = {}) {
  sfx('open');
  openPanel({
    title: t('photo.title', { name: resText(id, 'short') }),
    onClose: reason => { if (reason !== 'replace') onDone?.(); },
    render(body) {
      const mayor = state.mayor?.residentId;
      const card = el('div', 'polaroid', `
        <div class="shot">
          <img class="p-res" src="${faceSrc(id, 'happy')}" alt="">
          ${mayor ? `<img class="p-mayor" src="${faceSrc(mayor, 'happy')}" alt="">` : ''}
          <span class="p-heart">♥</span>
        </div>
        <p>${t('photo.caption', { name: resText(id, 'short'), village: state.village.name })}</p>`);
      card.style.setProperty('--c', colorOf(id));
      body.appendChild(card);
    },
  });
}

export { tierOf };
