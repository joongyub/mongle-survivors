// 타이틀 화면: 이어하기 / 촌장 고르기 + 마을 이름
import { RESIDENTS, RESIDENT_BY_ID } from '../data/residents.js';
import { CHARACTER_IMAGES } from '../data/assets.js';
import { t, resText, getLang, setLang, applyI18n } from '../i18n.js';
import { timeAgo } from './time.js';

// saved: 저장된 게임 정보 (없으면 null)
let selected = 'momo';   // 언어를 바꿔도 고른 촌장이 그대로 남게 바깥에 둠
let nameTouched = false;

// onLang: 언어를 바꿨을 때 (게임 그림 속 글자 다시 그리기)
export function showTitle({ saved, onContinue, onNew, onLang }) {
  const $ = id => document.getElementById(id);
  const list = $('mayorList'), info = $('mayorInfo'), nameInput = $('villageName');

  // 언어 국기 버튼
  const langBox = $('langPick');
  langBox.querySelectorAll('button').forEach(b => {
    b.classList.toggle('selected', b.dataset.lang === getLang());
    b.onclick = () => {
      if (b.dataset.lang === getLang()) return;
      setLang(b.dataset.lang);
      applyI18n();
      onLang?.();
      showTitle({ saved, onContinue, onNew, onLang });
    };
  });

  // 이름을 직접 고치지 않았으면 기본 이름도 언어에 맞게
  if (!nameTouched) nameInput.value = t('title.defaultVillage');
  nameInput.oninput = () => { nameTouched = true; };
  list.innerHTML = '';
  for (const r of RESIDENTS) {
    const b = document.createElement('button');
    b.className = 'mayor';
    b.style.setProperty('--c', r.color);
    b.innerHTML = `<img src="${CHARACTER_IMAGES[r.id]}" alt=""><span>${resText(r.id, 'short')}</span>`;
    b.onclick = () => select(r.id);
    b.dataset.id = r.id;
    list.appendChild(b);
  }

  function select(id) {
    selected = id;
    list.querySelectorAll('.mayor').forEach(el => el.classList.toggle('selected', el.dataset.id === id));
    info.innerHTML = t('title.mayorInfo', { name: resText(id, 'name'), animal: resText(id, 'animal'), trait: resText(id, 'trait'), bonus: resText(id, 'bonus') });
  }
  select(selected);

  const hide = () => $('title').classList.add('hidden');

  // 저장된 마을이 있으면: 이어하기 카드를 먼저 보여줌
  const showMode = mode => {
    const hasSave = !!saved;
    $('continueBox').classList.toggle('hidden', !hasSave || mode !== 'continue');
    $('newBox').classList.toggle('hidden', hasSave && mode === 'continue');
    $('newWarn').classList.toggle('hidden', !hasSave);
    $('backBtn').classList.toggle('hidden', !hasSave);
    $('startBtn').textContent = t(hasSave ? 'title.startNew' : 'title.start');
    $('startBtn').classList.toggle('danger', hasSave);
  };
  if (saved) {
    const mayor = RESIDENT_BY_ID[saved.mayor?.residentId] || RESIDENTS[0];
    $('contImg').src = CHARACTER_IMAGES[mayor.id];
    $('contInfo').textContent = t('title.savedInfo', { name: saved.village?.name || '', mayor: resText(mayor.id, 'short'), coins: (saved.inventory?.coins ?? 0).toLocaleString() });
    $('contWhen').textContent = t('title.lastPlayed', { when: timeAgo(saved.lastClockAt) });
    $('continueBtn').onclick = () => { hide(); onContinue(); };
    $('newGameBtn').onclick = () => showMode('new');
    $('backBtn').onclick = () => showMode('continue');
  }
  showMode('continue');

  $('startBtn').onclick = () => {
    const villageName = nameInput.value.trim() || t('title.defaultVillage');
    hide();
    onNew({ mayorId: selected, villageName });
  };
}
