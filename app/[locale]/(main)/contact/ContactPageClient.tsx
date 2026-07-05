"use client";

import { useEffect, useState } from "react";
import { Mail, MessageCircle, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
};

type Toast = { type: "success" | "error"; text: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactPageClient({ locale }: { locale: string }) {
  const isTr = locale === "tr";
  const isZh = locale === "zh-Hans";
  // Matches the tx(tr, en, zh) convention already used across the app
  // (PdfDownloadModal, full-check-waitlist-form, premium-feature-gate).
  const tx = (tr: string, en: string, zh: string) => (isTr ? tr : isZh ? zh : en);

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!form.firstName.trim()) {
      errors.firstName = tx("Ad alanı zorunludur.", "First name is required.", "请填写名字。");
    }
    if (!form.lastName.trim()) {
      errors.lastName = tx("Soyad alanı zorunludur.", "Last name is required.", "请填写姓氏。");
    }
    if (!form.email.trim() || !EMAIL_RE.test(form.email.trim())) {
      errors.email = tx(
        "Lütfen geçerli bir e-posta adresi girin.",
        "Please enter a valid email address.",
        "请输入有效的电子邮箱地址。"
      );
    }
    if (!form.message.trim()) {
      errors.message = tx("Mesaj alanı zorunludur.", "Message is required.", "请填写留言内容。");
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          message: form.message.trim(),
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        fieldErrors?: Record<string, string>;
      };

      if (!res.ok || !data.success) {
        if (data.fieldErrors) {
          // Server-side Zod errors are keyed by full_name/email/phone/message;
          // map full_name back onto the split firstName field so the user
          // sees the error next to a visible input.
          const mapped: Record<string, string> = {};
          for (const [key, value] of Object.entries(data.fieldErrors)) {
            mapped[key === "full_name" ? "firstName" : key] = value;
          }
          setFieldErrors(mapped);
        }
        setToast({
          type: "error",
          text: tx(
            "Bir şeyler yanlış gitti. Lütfen tekrar deneyin.",
            "Something went wrong. Please try again.",
            "出现错误，请重试。"
          ),
        });
        return;
      }

      setToast({
        type: "success",
        text: tx(
          "Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.",
          "Message sent successfully! We'll get back to you soon.",
          "消息发送成功！我们会尽快与您联系。"
        ),
      });
      setForm({ firstName: "", lastName: "", email: "", phone: "", message: "" });
    } catch {
      setToast({
        type: "error",
        text: tx(
          "Bir şeyler yanlış gitti. Lütfen tekrar deneyin.",
          "Something went wrong. Please try again.",
          "出现错误，请重试。"
        ),
      });
    } finally {
      setLoading(false);
    }
  }

  const fieldClassName =
    "h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm transition-all outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20";

  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-24 z-[100] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all sm:right-6 ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.text}
        </div>
      )}

      <section className="section-shell pb-6 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
          {tx("Bize Ulaşın", "Get in Touch", "联系我们")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          {tx(
            "Sorularınız mı var? Ekibimiz size yardımcı olmak için burada.",
            "Have a question? Our team is here to help.",
            "有任何疑问？我们的团队随时为您提供帮助。"
          )}
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          {/* Left column: form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)] sm:p-8">
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-first-name">
                    {tx("Ad", "First Name", "名字")}
                  </Label>
                  <Input
                    id="contact-first-name"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    className={fieldClassName}
                    autoComplete="given-name"
                  />
                  {fieldErrors.firstName && (
                    <p className="text-xs text-red-600">{fieldErrors.firstName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-last-name">
                    {tx("Soyad", "Last Name", "姓氏")}
                  </Label>
                  <Input
                    id="contact-last-name"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    className={fieldClassName}
                    autoComplete="family-name"
                  />
                  {fieldErrors.lastName && (
                    <p className="text-xs text-red-600">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-email">
                  {tx("E-posta", "Email", "邮箱地址")}
                </Label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className={fieldClassName}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
                {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-phone">
                  {tx("Telefon (opsiyonel)", "Phone (optional)", "电话（可选）")}
                </Label>
                <Input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className={fieldClassName}
                  autoComplete="tel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-message">
                  {tx("Mesaj", "Message", "留言内容")}
                </Label>
                <Textarea
                  id="contact-message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={6}
                  className="rounded-lg border-gray-200 shadow-sm focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                  placeholder={tx(
                    "Nasıl yardımcı olabiliriz?",
                    "How can we help?",
                    "我们能为您提供什么帮助？"
                  )}
                />
                {fieldErrors.message && (
                  <p className="text-xs text-red-600">{fieldErrors.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-lg text-base font-semibold"
              >
                {loading ? (
                  tx("Gönderiliyor...", "Sending...", "发送中...")
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {tx("Mesaj Gönder", "Send Message", "发送消息")}
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Right column: info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_70px_-45px_rgba(15,23,42,0.55)] sm:p-8">
              <h2 className="text-2xl font-bold tracking-tight">
                Logi<span className="text-violet-400">Visa</span>
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {tx(
                  "Avustralya PR yolculuğunuzda size yardımcı olmak için buradayız.",
                  "We're here to help with your Australia PR journey.",
                  "我们随时为您的澳大利亚永居之旅提供帮助。"
                )}
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {tx("Genel Sorular", "General Inquiries", "一般咨询")}
                    </p>
                    <a
                      href="mailto:hello@logivisa.com"
                      className="mt-1 block text-sm font-medium text-white hover:text-cyan-300"
                    >
                      hello@logivisa.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {tx("Teknik Destek", "Technical Support", "技术支持")}
                    </p>
                    <a
                      href="mailto:support@logivisa.com"
                      className="mt-1 block text-sm font-medium text-white hover:text-cyan-300"
                    >
                      support@logivisa.com
                    </a>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-xs leading-5 text-slate-400">
                {tx(
                  "Genellikle 1-2 iş günü içinde yanıt veriyoruz.",
                  "We typically respond within 1-2 business days.",
                  "我们通常在1-2个工作日内回复。"
                )}
              </p>
            </div>

            <p className="text-sm leading-6 text-slate-500">
              {tx(
                "Bu form yalnızca genel bilgi taleplerini içindir ve göç tavsiyesi sağlamaz.",
                "This form is for general inquiries only and does not provide migration advice.",
                "本表单仅用于一般咨询，不提供移民建议。"
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
