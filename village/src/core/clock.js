// ★ 게임 안의 "지금 시각"은 반드시 여기서만 가져와.
// 나중에 온라인 기능이 생기면 now()만 서버 시간으로 바꾸면 돼.

const DAY = 24 * 60 * 60 * 1000;
export const SEASON_DAYS = 7;           // 현실 7일마다 계절이 바뀜
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
// 계절 계산 기준일 (2026-10-12 월요일 = 봄 첫날)
const SEASON_EPOCH = Date.UTC(2026, 9, 12) + new Date().getTimezoneOffset() * 60000;

let offset = 0;                          // 테스트용 시간 이동 (밀리초)

export function now() { return Date.now() + offset; }
export function debugShift(ms) { offset += ms; }

// 오늘 날짜 문자열 "2026-10-12" (일일 의뢰 등에 사용)
export function dayKey(t = now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function seasonOf(t = now()) {
  const days = Math.floor((t - SEASON_EPOCH) / DAY);
  const idx = Math.floor(days / SEASON_DAYS);
  return SEASONS[((idx % 4) + 4) % 4];
}

// 하루 중 몇 시인지 (0~24, 소수점 포함)
export function hourOf(t = now()) {
  const d = new Date(t);
  return d.getHours() + d.getMinutes() / 60;
}

// 시간대별 화면 색 (낮엔 투명, 저녁엔 주황, 밤엔 파랑)
export function skyTint(t = now()) {
  const h = hourOf(t);
  if (h >= 7 && h < 17) return { color: 0xffffff, alpha: 0 };
  if (h >= 17 && h < 19) return { color: 0xffa060, alpha: 0.12 * (h - 17) / 2 + 0.04 };
  if (h >= 19 && h < 20) return { color: 0x6070c0, alpha: 0.16 + 0.06 * (h - 19) };
  if (h >= 5 && h < 7) return { color: 0xffc0a0, alpha: 0.18 * (7 - h) / 2 };
  return { color: 0x3a4a9a, alpha: 0.24 };
}

export function clockText(t = now()) {
  const d = new Date(t);
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  return `${ampm} ${((h + 11) % 12) + 1}:${m}`;
}
