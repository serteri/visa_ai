import { researchText } from "@/lib/marketing/research-journey";

export function AssessmentOverview({ locale }: { locale: string }) {
  const text = (en: string, tr: string, zh: string) => researchText(locale, en, tr, zh);
  return (
    <header data-assessment-overview className="mx-auto max-w-6xl space-y-6 pb-4">
      <p className="text-sm font-semibold text-cyan-900">{text("LogiVisa Assessment", "LogiVisa Değerlendirmesi", "LogiVisa 评估")}</p>
      <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{text("Prepare your Visa Information Report", "Vize Bilgi Raporunuzu hazırlayın", "准备您的签证信息报告")}</h1>
      <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 md:grid-cols-3">
        {[
          [text("What you’ll do", "Ne yapacaksınız?", "您将做什么"), text("Work through three sections about your circumstances, work or family, and study or English. Choose a visa topic to research, or “Not sure”; you do not need to know a migration strategy.", "Durumunuz, işiniz veya aileniz, eğitiminiz veya İngilizceniz hakkında üç bölümü tamamlayın. Araştırmak için bir vize konusu veya “Emin değilim” seçin; göç stratejisi bilmeniz gerekmez.", "填写当前情况、工作或家庭、学习或英语三个部分。选择要研究的签证主题或“不确定”；无需预先了解移民策略。")],
          [text("What you’ll receive", "Ne alacaksınız?", "您将获得什么"), text("A Visa Information Report with your entries, general published requirements, references and source dates. The full content is in the PDF after report access is opened; the result page provides access and research links.", "Girdileriniz, genel yayımlanmış şartlar, kaynaklar ve kaynak tarihlerini içeren Vize Bilgi Raporu. Tam içerik, rapor erişimi açıldıktan sonra PDF'dedir; sonuç sayfası erişim ve araştırma bağlantıları sunar.", "包含填写内容、一般公开要求、参考资料及来源日期的签证信息报告。访问开通后，完整内容在 PDF 中；结果页提供访问入口和研究链接。")],
          [text("What to have ready", "Neler gerekli?", "需要准备什么"), text("Your occupation or work details, broad study and English information, and current circumstances. Your name and email are used for the report and access link. Do not enter passport numbers or upload identity, health or financial documents.", "Meslek veya iş bilgileriniz, genel eğitim ve İngilizce bilgileriniz ve mevcut durumunuz. Adınız ve e-postanız rapor ve erişim bağlantısı için kullanılır. Pasaport numarası girmeyin; kimlik, sağlık veya mali belge yüklemeyin.", "职业或工作情况、学习与英语概况及当前情况。姓名和邮箱用于报告和访问链接。请勿输入护照号码或上传身份、健康或财务文件。")],
        ].map(([title, body]) => <section key={title}><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p></section>)}
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{text("This organises research, not an eligibility decision, best-visa recommendation, success probability or nomination prediction. It does not provide personalised immigration advice. Use Back to review entries; leaving or refreshing can lose unsaved answers.", "Bu, araştırmayı düzenler; uygunluk kararı, en iyi vize önerisi, başarı olasılığı veya adaylık tahmini sunmaz. Kişisel göçmenlik danışmanlığı vermez. Girdileri incelemek için Geri'yi kullanın; sayfadan ayrılmak veya yenilemek kaydedilmemiş yanıtları kaybettirebilir.", "此流程整理研究资料，不作资格判定、最佳签证推荐、成功概率或提名预测，也不提供个性化移民建议。可用“上一步”查看填写内容；离开或刷新可能丢失未保存的答案。")}</p>
    </header>
  );
}
