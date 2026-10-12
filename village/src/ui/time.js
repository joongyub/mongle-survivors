// "3시간 전" 같은 글자
import { now } from '../core/clock.js';
import { t } from '../i18n.js';
import { formatLeft } from '../core/farm.js';

export function timeAgo(ms) {
  if (!ms) return '-';
  const d = now() - ms;
  if (d < 60000) return t('time.justNow');
  return formatLeft(d) + ' 전';
}
