// 用户档案类型。出生信息按命理八字所需采集：年/月/日/时/分 + 历法(公历/农历) + 出生地(真太阳时校正用) + 性别。

export type Gender = "male" | "female" | "other";
export type CalendarType = "solar" | "lunar";

export type BirthInfo = {
  calendar: CalendarType; // 公历 / 农历
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  timeKnown: boolean; // 是否知道出生时间（八字时柱需要）
  hour: number; // 0-23
  minute: number; // 0-59
  province: string; // 出生省/直辖市
  city: string; // 出生城市（用于真太阳时校正）
};

export type UserProfile = {
  id: string;
  nickname: string;
  gender: Gender;
  birth: BirthInfo;
  email: string;
  bio: string;
  createdAt: number;
  updatedAt: number;
};

export const GENDER_LABELS: Record<Gender, string> = { male: "男", female: "女", other: "其他" };
export const CALENDAR_LABELS: Record<CalendarType, string> = { solar: "公历", lunar: "农历" };

export function emptyBirth(): BirthInfo {
  return {
    calendar: "solar",
    year: 2000,
    month: 1,
    day: 1,
    timeKnown: true,
    hour: 12,
    minute: 0,
    province: "",
    city: ""
  };
}
