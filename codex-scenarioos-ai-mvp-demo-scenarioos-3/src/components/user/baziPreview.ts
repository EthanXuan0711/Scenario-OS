// 八字/命理预览工具（轻量、确定性）。仅做生肖 / 年柱 / 时辰的近似展示，
// 完整四柱 + 大运 + 真太阳时校正留待后续玄学模块开发。

const ZODIACS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const TIANGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const DIZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const mod = (value: number, n: number) => ((value % n) + n) % n;

export function zodiacOf(year: number): string {
  return ZODIACS[mod(year - 4, 12)];
}

// 年柱天干地支（公历近似，未按立春换年——仅供预览）
export function yearPillar(year: number): string {
  return `${TIANGAN[mod(year - 4, 10)]}${DIZHI[mod(year - 4, 12)]}`;
}

// 时辰：子时 23:00–01:00，丑时 01:00–03:00 …
export function shichenOf(hour: number): string {
  return `${DIZHI[Math.floor(mod(hour + 1, 24) / 2)]}时`;
}
