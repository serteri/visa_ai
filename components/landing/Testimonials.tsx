interface TestimonialsProps {
  locale: string;
}

/** Social proof — 3 testimonials, copy unchanged. */
export function Testimonials({ locale }: TestimonialsProps) {
  const reviews = [
    {
      initials: "DL",
      quote:
        locale === "tr"
          ? "Temmuz kurallarına göre temel uygunluğumu kontrol etmek için bir göç danışmanına 300 dolar ödemek üzereydim. Bu yapay zeka, partnerimin İngilizce puan açığını 2 dakikada yakaladı. Muhteşem bir araç."
          : locale === "zh-Hans"
            ? "我本来打算花300美元请移民顾问帮我核实7月新规下的基本资格。这个AI在2分钟内就发现了我伴侣的英语分数缺口。非常出色的工具。"
            : "I was about to pay a migration agent $300 just to check my basic eligibility for the July rules. This AI caught my partner's English point gap in 2 minutes. Outstanding tool.",
      name: "David L.",
      location: locale === "zh-Hans" ? "悉尼" : "Sydney",
    },
    {
      initials: "EM",
      quote:
        locale === "tr"
          ? "Kanada için NOC kod eşleştirmesi inanılmaz derecede doğru. Her zamanki danışmanlık satış konuşması olmadan Express Entry puanlarımın net bir dökümünü verdi."
          : locale === "zh-Hans"
            ? "加拿大的NOC代码匹配非常精准。它清晰地为我列出了快速通道积分明细，完全没有中介常见的推销套路。"
            : "The NOC code mapping for Canada is incredibly accurate. It gave me a clear breakdown of my Express Entry points without the usual agency sales pitch.",
      name: "Elena M.",
      location: locale === "zh-Hans" ? "温哥华" : "Vancouver",
    },
    {
      initials: "MT",
      quote:
        locale === "tr"
          ? "Kafa karıştırıcı göç forumlarını okumakla geçecek haftaları kurtarıyor. Victoria'nın en güncel eyalet kriterlerine göre tam olarak nerede durduğumu bilmek oyunun kurallarını değiştiriyor."
          : locale === "zh-Hans"
            ? "省去了在令人困惑的移民论坛上阅读数周的时间。清楚了解自己在维多利亚州最新州提名标准下的位置，真正改变了一切。"
            : "Saves weeks of reading confusing immigration forums. Knowing exactly where I stand against Victoria's latest state criteria is a game-changer.",
      name: "Marcus T.",
      location: locale === "zh-Hans" ? "墨尔本" : "Melbourne",
    },
  ];

  return (
    <section className="case-file bg-[var(--cf-bg)] py-24 sm:py-32">
      <div className="section-shell">
        <p className="cf-mono mb-4 text-xs uppercase tracking-[0.14em] text-[var(--cf-accent)]">
          {locale === "tr" ? "Görüşler" : locale === "zh-Hans" ? "评价" : "On the Record"}
        </p>
        <h2 className="cf-serif max-w-[24ch] text-4xl font-extrabold tracking-tight text-[var(--cf-fg)] sm:text-5xl">
          {locale === "tr" ? "Kullanıcılarımız Ne Diyor?" : locale === "zh-Hans" ? "用户评价" : "What Our Users Are Saying"}
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {reviews.map((review) => (
            <div key={review.name} className="flex flex-col gap-5 rounded-2xl bg-[var(--cf-case-bg)] p-8 sm:p-10">
              <div aria-hidden className="text-[#D8A65C]">
                ★★★★★
              </div>
              <p className="flex-1 text-sm leading-relaxed text-[var(--cf-case-fg)]/85">&ldquo;{review.quote}&rdquo;</p>
              <div className="flex items-center gap-3 border-t border-[var(--cf-line)] pt-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--cf-accent-dim)] text-xs font-bold text-[var(--cf-accent)]">
                  {review.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--cf-case-fg)]">{review.name}</p>
                  <p className="cf-mono text-xs text-[var(--cf-case-muted)]">{review.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
