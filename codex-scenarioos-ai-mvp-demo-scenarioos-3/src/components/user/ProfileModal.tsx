"use client";

// 用户档案编辑：基本信息 + 出生年月日时 + 出生地 + 历法。
// 出生信息按命理八字所需采集，并给出生肖/年柱/时辰预览，为后续玄学模块打基础。

import { useEffect, useState, type ReactNode } from "react";
import { Sparkles, X } from "lucide-react";
import { CALENDAR_LABELS, GENDER_LABELS, type BirthInfo, type CalendarType, type Gender, type UserProfile } from "./userTypes";
import { shichenOf, yearPillar, zodiacOf } from "./baziPreview";

type Props = {
  open: boolean;
  onClose: () => void;
  user: UserProfile;
  onSave: (partial: Partial<UserProfile>) => void;
};

type FormState = Pick<UserProfile, "nickname" | "gender" | "email" | "bio"> & { birth: BirthInfo };

const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, index) => start + index);

export default function ProfileModal({ open, onClose, user, onSave }: Props) {
  const [form, setForm] = useState<FormState>(() => initForm(user));

  useEffect(() => {
    if (open) setForm(initForm(user));
  }, [open, user]);

  if (!open) return null;

  const setBirth = (partial: Partial<BirthInfo>) => setForm((current) => ({ ...current, birth: { ...current.birth, ...partial } }));

  const save = () => {
    onSave({ nickname: form.nickname.trim() || "用户", gender: form.gender, email: form.email, bio: form.bio, birth: form.birth });
    onClose();
  };

  const { birth } = form;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl border border-white/12"
        style={{ background: "rgba(12,14,24,0.97)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
      >
        <header className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <h2 className="text-base font-medium text-zinc-100">个人档案</h2>
          <button onClick={onClose} className="text-zinc-500 transition-colors hover:text-zinc-200" aria-label="关闭">
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <Section title="基本信息">
            <Field label="昵称">
              <input
                value={form.nickname}
                onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="性别">
              <div className="flex gap-2">
                {(Object.keys(GENDER_LABELS) as Gender[]).map((gender) => (
                  <Chip key={gender} active={form.gender === gender} onClick={() => setForm((current) => ({ ...current, gender }))}>
                    {GENDER_LABELS[gender]}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label="邮箱（可选）">
              <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={inputClass} />
            </Field>
          </Section>

          <Section title="出生信息（用于命理八字）">
            <Field label="历法">
              <div className="flex gap-2">
                {(Object.keys(CALENDAR_LABELS) as CalendarType[]).map((calendar) => (
                  <Chip key={calendar} active={birth.calendar === calendar} onClick={() => setBirth({ calendar })}>
                    {CALENDAR_LABELS[calendar]}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="出生日期">
              <div className="grid grid-cols-3 gap-2">
                <NumberBox value={birth.year} min={1900} max={2100} onChange={(year) => setBirth({ year })} suffix="年" />
                <SelectBox value={birth.month} options={range(1, 12)} onChange={(month) => setBirth({ month })} suffix="月" />
                <SelectBox value={birth.day} options={range(1, 31)} onChange={(day) => setBirth({ day })} suffix="日" />
              </div>
            </Field>

            <Field label="出生时间">
              <label className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
                <input type="checkbox" checked={birth.timeKnown} onChange={(event) => setBirth({ timeKnown: event.target.checked })} className="accent-amber-500" />
                知道准确出生时间（八字时柱需要）
              </label>
              {birth.timeKnown && (
                <div className="grid grid-cols-2 gap-2">
                  <SelectBox value={birth.hour} options={range(0, 23)} onChange={(hour) => setBirth({ hour })} suffix="时" />
                  <SelectBox value={birth.minute} options={range(0, 59)} onChange={(minute) => setBirth({ minute })} suffix="分" />
                </div>
              )}
            </Field>

            <Field label="出生地（用于真太阳时校正，可选）">
              <div className="grid grid-cols-2 gap-2">
                <input value={birth.province} onChange={(event) => setBirth({ province: event.target.value })} placeholder="省 / 直辖市" className={inputClass} />
                <input value={birth.city} onChange={(event) => setBirth({ city: event.target.value })} placeholder="城市" className={inputClass} />
              </div>
            </Field>

            {/* 八字预览 */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs text-amber-300/90">
                <Sparkles size={13} />
                命理预览
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-zinc-200">
                <span>
                  生肖 <span className="font-medium text-amber-200">{zodiacOf(birth.year)}</span>
                </span>
                <span>
                  年柱 <span className="font-medium text-amber-200">{yearPillar(birth.year)}</span>
                </span>
                <span>
                  时辰 <span className="font-medium text-amber-200">{birth.timeKnown ? shichenOf(birth.hour) : "未知"}</span>
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                完整四柱、大运、真太阳时校正将由后续玄学模块计算。当前为公历近似预览。
              </p>
            </div>
          </Section>

          <Section title="简介">
            <textarea
              value={form.bio}
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              rows={2}
              placeholder="一句话介绍自己…"
              className={`${inputClass} resize-none`}
            />
          </Section>
        </div>

        <footer className="flex justify-end gap-2 border-t border-white/8 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200">
            取消
          </button>
          <button onClick={save} className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400">
            保存档案
          </button>
        </footer>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-[#0c0c16] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none";

function initForm(user: UserProfile): FormState {
  return { nickname: user.nickname, gender: user.gender, email: user.email, bio: user.bio, birth: { ...user.birth } };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        active ? "border-amber-500/60 bg-amber-500/15 text-amber-100" : "border-white/10 text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function NumberBox({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (value: number) => void; suffix: string }) {
  return (
    <div className="flex items-center rounded-lg border border-white/10 bg-[#0c0c16] pr-2">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))}
        className="w-full bg-transparent px-3 py-2 text-sm text-zinc-200 focus:outline-none"
      />
      <span className="text-xs text-zinc-600">{suffix}</span>
    </div>
  );
}

function SelectBox({ value, options, onChange, suffix }: { value: number; options: number[]; onChange: (value: number) => void; suffix: string }) {
  return (
    <div className="flex items-center rounded-lg border border-white/10 bg-[#0c0c16] pr-2">
      <select value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full bg-transparent px-2 py-2 text-sm text-zinc-200 focus:outline-none">
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#0c0c16]">
            {option}
          </option>
        ))}
      </select>
      <span className="text-xs text-zinc-600">{suffix}</span>
    </div>
  );
}
