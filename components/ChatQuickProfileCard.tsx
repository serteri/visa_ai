"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLocalizedAnzscoTitle, resolveAnzscoEntry, searchAnzsco, type AnzscoEntry } from "@/lib/intake/anzsco-search";
import {
  AU_ENGLISH_LEVEL_OPTIONS,
  AU_STATE_CODES,
  CURRENT_VISA_OPTIONS,
  EDUCATION_OPTIONS,
  INTAKE_COUNTRIES,
  optionLabel,
} from "@/lib/intake/fields";
import type { QuickProfileFields } from "@/lib/chat/quick-profile";

/**
 * In-chat quick profile card (premium visitor, no linked report): the key intake fields, with the intake form's own
 * options (lib/intake/fields.ts) and occupation search (lib/intake/anzsco-search.ts). Saved through /api/chat/profile,
 * which validates with the intake rules, runs the report engine and stores the result against the visitor.
 */

type L = { en: string; tr: string; zh: string };
const TXT = {
  title: { en: "Personalise your answers", tr: "Yanıtlarınızı kişiselleştirin", zh: "个性化您的回答" },
  intro: {
    en: "Answer a few questions and the assistant will use the same points, visa requirements and state results as the full LogiVisa report.",
    tr: "Birkaç soruyu yanıtlayın; asistan tam LogiVisa raporuyla aynı puan, vize şartı ve eyalet sonuçlarını kullanacak.",
    zh: "回答几个问题，助手将使用与完整 LogiVisa 报告相同的分数、签证要求和州结果。",
  },
  age: { en: "Age", tr: "Yaş", zh: "年龄" },
  occupation: { en: "Occupation", tr: "Meslek", zh: "职业" },
  selected: { en: "Selected:", tr: "Seçildi:", zh: "已选：" },
  english: { en: "English level", tr: "İngilizce seviyesi", zh: "英语水平" },
  qualification: { en: "Highest qualification", tr: "En yüksek eğitim", zh: "最高学历" },
  inAu: { en: "Completed in Australia?", tr: "Avustralya'da mı tamamlandı?", zh: "是否在澳大利亚完成？" },
  offshore: { en: "Years of skilled work outside Australia", tr: "Avustralya dışında nitelikli iş deneyimi (yıl)", zh: "澳大利亚境外技术工作年限" },
  onshore: { en: "Years of skilled work in Australia", tr: "Avustralya'da nitelikli iş deneyimi (yıl)", zh: "澳大利亚境内技术工作年限" },
  skills: { en: "Positive skills assessment?", tr: "Olumlu beceri değerlendirmesi var mı?", zh: "是否已获得正面技能评估？" },
  country: { en: "Current country", tr: "Bulunduğunuz ülke", zh: "当前国家" },
  state: { en: "State or territory you live in", tr: "Yaşadığınız eyalet veya bölge", zh: "您居住的州或领地" },
  visa: { en: "Current visa", tr: "Mevcut vize", zh: "当前签证" },
  yes: { en: "Yes", tr: "Evet", zh: "是" },
  no: { en: "No", tr: "Hayır", zh: "否" },
  select: { en: "Select", tr: "Seçin", zh: "请选择" },
  save: { en: "Save and personalise", tr: "Kaydet ve kişiselleştir", zh: "保存并个性化" },
  saving: { en: "Saving...", tr: "Kaydediliyor...", zh: "正在保存..." },
  cancel: { en: "Cancel", tr: "Vazgeç", zh: "取消" },
  error: { en: "The profile could not be saved. Please try again.", tr: "Profil kaydedilemedi. Lütfen tekrar deneyin.", zh: "无法保存资料，请重试。" },
} satisfies Record<string, L>;

export function ChatQuickProfileCard({
  locale,
  initial,
  onSaved,
  onCancel,
}: {
  locale: string;
  initial?: Partial<QuickProfileFields> | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const tx = (m: L) => (locale === "tr" ? m.tr : locale === "zh-Hans" ? m.zh : m.en);
  const initialEntry = resolveAnzscoEntry(initial?.occupation);
  const [f, setF] = useState<Record<string, string>>({
    age: initial?.age ?? "",
    englishLevel: initial?.englishLevel ?? "",
    qualificationLevel: initial?.qualificationLevel ?? "",
    qualificationAwardedInAustralia: initial?.qualificationAwardedInAustralia ?? "",
    offshoreExperienceYears: initial?.offshoreExperienceYears !== undefined ? String(initial.offshoreExperienceYears) : "",
    onshoreExperienceYears: initial?.onshoreExperienceYears !== undefined ? String(initial.onshoreExperienceYears) : "",
    skillsAssessment: initial?.skillsAssessment ?? "",
    currentCountry: initial?.currentCountry ?? "",
    residenceState: initial?.residenceState ?? "",
    currentVisa: initial?.currentVisa ?? "",
  });
  const [occSearch, setOccSearch] = useState(initialEntry ? getLocalizedAnzscoTitle(initialEntry, locale) : initial?.occupation ?? "");
  const [occCode, setOccCode] = useState(initialEntry?.code ?? "");
  const [occResults, setOccResults] = useState<AnzscoEntry[]>([]);
  const [occOpen, setOccOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const set = (k: string) => (e: { target: { value: string } }) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const resolved = resolveAnzscoEntry(occCode || occSearch);
  const select = "h-10 w-full rounded-md border border-input bg-background px-2 text-sm";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFailed(false);
    try {
      const res = await fetch("/api/chat/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, fields: { ...f, occupation: resolved?.code ?? occSearch } }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; errors?: Record<string, string> };
      if (res.ok && data.ok) {
        onSaved();
        return;
      }
      setErrors(data.errors ?? {});
      if (!data.errors) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="text-xs text-red-600">{errors[k]}</p> : null);
  const YesNo = ({ k }: { k: string }) => (
    <select id={`qp-${k}`} value={f[k]} onChange={set(k)} className={select}>
      <option value="">{tx(TXT.select)}</option>
      <option value="yes">{tx(TXT.yes)}</option>
      <option value="no">{tx(TXT.no)}</option>
    </select>
  );

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-primary/30 bg-card p-4 text-sm" data-testid="chat-quick-profile-card">
      <div>
        <p className="font-semibold">{tx(TXT.title)}</p>
        <p className="text-xs text-muted-foreground">{tx(TXT.intro)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="qp-age">{tx(TXT.age)}</Label>
          <Input id="qp-age" type="number" min={16} max={80} value={f.age} onChange={set("age")} />
          <Err k="age" />
        </div>
        <div className="relative space-y-1">
          <Label htmlFor="qp-occupation">{tx(TXT.occupation)}</Label>
          <Input
            id="qp-occupation"
            value={occSearch}
            autoComplete="off"
            onChange={(e) => {
              setOccSearch(e.target.value);
              setOccCode("");
              setOccResults(searchAnzsco(e.target.value, locale));
              setOccOpen(true);
            }}
            onBlur={() => setTimeout(() => setOccOpen(false), 150)}
          />
          {resolved && <p className="text-xs text-emerald-700">{tx(TXT.selected)} {resolved.code} · {getLocalizedAnzscoTitle(resolved, locale)}</p>}
          {occOpen && occResults.length > 0 && (
            <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-card shadow-lg">
              {occResults.map((entry) => (
                <li
                  key={entry.code}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setOccSearch(getLocalizedAnzscoTitle(entry, locale));
                    setOccCode(entry.code);
                    setOccOpen(false);
                  }}
                  className="flex cursor-pointer justify-between gap-2 px-3 py-2 hover:bg-muted"
                >
                  <span className="truncate">{getLocalizedAnzscoTitle(entry, locale)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{entry.code}</span>
                </li>
              ))}
            </ul>
          )}
          <Err k="occupation" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qp-englishLevel">{tx(TXT.english)}</Label>
          <select id="qp-englishLevel" value={f.englishLevel} onChange={set("englishLevel")} className={select}>
            <option value="">{tx(TXT.select)}</option>
            {AU_ENGLISH_LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{optionLabel(o, locale)}</option>)}
          </select>
          <Err k="englishLevel" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qp-qualificationLevel">{tx(TXT.qualification)}</Label>
          <select id="qp-qualificationLevel" value={f.qualificationLevel} onChange={set("qualificationLevel")} className={select}>
            <option value="">{tx(TXT.select)}</option>
            {EDUCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{optionLabel(o, locale)}</option>)}
          </select>
          <Err k="qualificationLevel" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qp-qualificationAwardedInAustralia">{tx(TXT.inAu)}</Label>
          <YesNo k="qualificationAwardedInAustralia" />
          <Err k="qualificationAwardedInAustralia" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qp-skillsAssessment">{tx(TXT.skills)}</Label>
          <YesNo k="skillsAssessment" />
          <Err k="skillsAssessment" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qp-offshore">{tx(TXT.offshore)}</Label>
          <Input id="qp-offshore" type="number" min={0} step="0.5" value={f.offshoreExperienceYears} onChange={set("offshoreExperienceYears")} />
          <Err k="offshoreExperienceYears" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qp-onshore">{tx(TXT.onshore)}</Label>
          <Input id="qp-onshore" type="number" min={0} step="0.5" value={f.onshoreExperienceYears} onChange={set("onshoreExperienceYears")} />
          <Err k="onshoreExperienceYears" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qp-currentCountry">{tx(TXT.country)}</Label>
          <select id="qp-currentCountry" value={f.currentCountry} onChange={set("currentCountry")} className={select}>
            <option value="">{tx(TXT.select)}</option>
            {INTAKE_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{(c.label as Record<string, string>)[locale] ?? c.label.en}</option>)}
          </select>
          <Err k="currentCountry" />
        </div>
        {f.currentCountry === "AU" && (
          <div className="space-y-1">
            <Label htmlFor="qp-residenceState">{tx(TXT.state)}</Label>
            <select id="qp-residenceState" value={f.residenceState} onChange={set("residenceState")} className={select}>
              <option value="">{tx(TXT.select)}</option>
              {AU_STATE_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Err k="residenceState" />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="qp-currentVisa">{tx(TXT.visa)}</Label>
          <select id="qp-currentVisa" value={f.currentVisa} onChange={set("currentVisa")} className={select}>
            <option value="">{tx(TXT.select)}</option>
            {CURRENT_VISA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{optionLabel(o, locale)}</option>)}
          </select>
          <Err k="currentVisa" />
        </div>
      </div>
      {failed && <p className="text-xs text-red-600">{tx(TXT.error)}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>{saving ? tx(TXT.saving) : tx(TXT.save)}</Button>
        {onCancel && <Button type="button" size="sm" variant="ghost" onClick={onCancel}>{tx(TXT.cancel)}</Button>}
      </div>
    </form>
  );
}
