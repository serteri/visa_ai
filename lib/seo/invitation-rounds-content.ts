interface PageContent {
  toolLabel: string;
  aboutTitle: string;
  intro: string;
  sections: { heading: string; body: string }[];
  faqs: { q: string; a: string }[];
  faqTitle: string;
}

const content: Record<string, PageContent> = {
  en: {
    toolLabel: "SkillSelect Guide",
    aboutTitle: "About Australian SkillSelect Invitation Rounds",
    intro:
      "SkillSelect is the Australian Government's online service that manages Expressions of Interest (EOIs) for skilled migration visas. It is the gateway through which most points-tested skilled visas — subclass 189, 190, and 491 — are processed. Understanding how invitation rounds work and how points cutoffs are determined will help you plan the timing and strategy of your Australian visa application with much greater precision.",
    sections: [
      {
        heading: "What Is SkillSelect?",
        body: "SkillSelect is an online system operated by the Department of Home Affairs that allows potential skilled migrants to register their interest in applying for an Australian skilled visa. Rather than submitting a full visa application immediately, applicants lodge an Expression of Interest (EOI) outlining their skills, qualifications, work experience, and other details. The system then ranks EOIs by points score, and the Department periodically invites the highest-scoring applicants to lodge a formal visa application. This competitive selection process ensures that the visa program attracts the most skilled candidates.",
      },
      {
        heading: "How the EOI Process Works",
        body: "To enter the SkillSelect pool, you must first lodge an EOI through ImmiAccount. Your EOI will be ranked against others with the same occupation code and visa subclass preference. You do not need to have your skills assessment completed before lodging an EOI, but you must have it before lodging the actual visa application. Once invited, you typically have 60 days to lodge your visa application. If you are not invited within two years, your EOI expires and you must submit a new one. You can update your EOI at any time without losing your submission date.",
      },
      {
        heading: "What Invitation Rounds Mean",
        body: "Invitation rounds are the periodic events when the Department of Home Affairs selects and invites the highest-ranking EOIs to apply for a visa. Each round specifies a visa subclass, the number of invitations issued, and the lowest points score that received an invitation — commonly called the 'points cutoff'. Rounds for subclass 189 and state-nominated 491 are generally held monthly. Subclass 190 invitations are issued directly by each state or territory government on their own schedule, not through federal invitation rounds.",
      },
      {
        heading: "How Points Cutoffs Are Determined",
        body: "The points cutoff in any given round is not set in advance — it is simply the score of the lowest-ranked applicant who was invited. The cutoff reflects the balance between the number of invitations available and the pool of applicants. When the pool is large relative to the number of available invitations, the cutoff rises. Occupations on the priority occupation list may have higher invitation numbers, which can lower their effective cutoff. Cutoff scores have generally trended upward over the past several years as competition increases.",
      },
      {
        heading: "Tips for Using Invitation Round Data",
        body: "Historical invitation round data can help you understand whether your current points score is competitive for your occupation. Look for the trend in cutoff scores over the last 6–12 rounds to gauge whether they are rising or stable. If cutoffs for your occupation have been consistently above 85, achieving that score before lodging your EOI is advisable. Be aware that cutoffs can change significantly from round to round — a single change in English score or the addition of state nomination can make a material difference to your chances of being invited.",
      },
    ],
    faqs: [
      {
        q: "What is the difference between a subclass 189 and 190 invitation round?",
        a: "Subclass 189 (Skilled Independent) invitation rounds are managed by the federal Department of Home Affairs and are held roughly monthly. Subclass 190 (State Nominated) is managed separately by each state and territory government, which each issue invitations on their own timeline. To receive a 190 invitation, you must first receive a state nomination offer, which is separate from the SkillSelect federal round process.",
      },
      {
        q: "Can I hold more than one EOI at a time?",
        a: "You can hold one EOI per nominated occupation. If you are eligible under multiple occupations, you can submit an EOI for each one. Having multiple EOIs can increase your chances if different occupations have different cutoff trends. However, you must have the appropriate skills assessment for each occupation.",
      },
      {
        q: "What happens to my EOI after I receive an invitation?",
        a: "Once you receive an invitation to apply, your EOI is marked as 'Invited'. You then have 60 days to lodge your visa application through ImmiAccount. If you do not lodge within 60 days, your invitation lapses and you will need to wait for another invitation. Your EOI is not automatically withdrawn after an invitation — it remains in the pool if you do not lodge.",
      },
      {
        q: "Are the points cutoffs the same for all occupations?",
        a: "No. Invitation rounds often select applicants across all eligible occupations together, so a single cutoff score applies across all occupations in that subclass for that round. However, some rounds have been occupation-specific, and some states issue 190 nominations for specific occupations at different thresholds. Always check the latest round data for your specific occupation and visa subclass.",
      },
      {
        q: "How do I know what score I need to be invited?",
        a: "There is no guaranteed score that ensures an invitation in a future round. The best approach is to review historical cutoff data for your occupation and aim to achieve a score comfortably above recent cutoffs. Using this tracker, you can review the last 12 months of rounds to identify the trend. A registered migration agent can also provide strategic advice on timing your EOI and optimising your score.",
      },
    ],
    faqTitle: "Frequently Asked Questions — Invitation Rounds",
  },

  tr: {
    toolLabel: "SkillSelect Rehberi",
    aboutTitle: "Avustralya SkillSelect Davet Rauntları Hakkında",
    intro:
      "SkillSelect, Avustralya Hükümeti'nin yetenekli göçmenlik vizelerinin EOI'lerini yönettiği çevrimiçi hizmetidir. 189, 190 ve 491 alt sınıfları dahil olmak üzere çoğu puana dayalı yetenekli vizeler bu sistem aracılığıyla işlenmektedir.",
    sections: [
      {
        heading: "SkillSelect Nedir?",
        body: "SkillSelect, İçişleri Bakanlığı tarafından işletilen ve potansiyel yetenekli göçmenlerin Avustralya yetenekli vizesi başvurusuna ilgilerini kaydetmelerine olanak tanıyan çevrimiçi bir sistemdir. Başvuranlar, eksiksiz bir vize başvurusu hemen sunmak yerine becerilerini, niteliklerini ve iş deneyimlerini özetleyen bir EOI sunarlar.",
      },
      {
        heading: "EOI Süreci Nasıl Çalışır?",
        body: "SkillSelect havuzuna girmek için önce ImmiAccount üzerinden bir EOI sunmanız gerekir. EOI'niz, aynı meslek kodu ve vize alt sınıfı tercihi olan diğerleriyle karşılaştırılarak sıralanır. EOI sunmadan önce beceri değerlendirmenizin tamamlanmış olması gerekmez, ancak gerçek vize başvurusunu sunmadan önce tamamlanmış olması gerekir.",
      },
      {
        heading: "Davet Rauntları Ne Anlama Gelir?",
        body: "Davet rauntları, İçişleri Bakanlığı'nın vize başvurmak için en yüksek sıradaki EOI'leri seçip davet ettiği periyodik olaylardır. Her raut, bir vize alt sınıfını, verilen davet sayısını ve davet alan en düşük puan puanını — genellikle 'puan kesim noktası' olarak adlandırılan — belirtir.",
      },
      {
        heading: "Puan Kesim Noktaları Nasıl Belirlenir?",
        body: "Herhangi bir rauttaki puan kesim noktası önceden belirlenmez — basitçe davet edilen en düşük sıradaki başvuranın puanıdır. Kesim noktası, mevcut davet sayısı ile başvuranlar havuzu arasındaki dengeyi yansıtır.",
      },
      {
        heading: "Davet Raunt Verilerini Kullanma İpuçları",
        body: "Geçmiş davet raunt verileri, mevcut puan puanınızın mesleğiniz için rekabetçi olup olmadığını anlamanıza yardımcı olabilir. Raunt başına davetlerin sayısına ve son 6-12 rauttaki kesim puanları trendine bakın.",
      },
    ],
    faqs: [
      {
        q: "189 ve 190 alt sınıfı davet rauntu arasındaki fark nedir?",
        a: "189 (Bağımsız Yetenekli) davet rauntları federal İçişleri Bakanlığı tarafından yönetilir ve yaklaşık aylık olarak düzenlenir. 190 (Devlet Adaylığı), her devlet ve bölge hükümeti tarafından ayrı ayrı yönetilir.",
      },
      {
        q: "Aynı anda birden fazla EOI tutabilir miyim?",
        a: "Aday gösterilen meslek başına bir EOI tutabilirsiniz. Birden fazla meslek için uygunsanız, her biri için bir EOI sunabilirsiniz.",
      },
      {
        q: "Davet aldıktan sonra EOI'me ne olur?",
        a: "Başvuru daveti aldıktan sonra, EOI'niz 'Davet Edildi' olarak işaretlenir. Ardından ImmiAccount üzerinden vize başvurunuzu sunmak için 60 gününüz olur.",
      },
      {
        q: "Puan kesim noktaları tüm meslekler için aynı mı?",
        a: "Hayır. Davet rauntları genellikle tüm uygun meslekler arasında başvuranları birlikte seçer, bu nedenle o raut için o alt sınıftaki tüm meslekler için tek bir kesim puanı uygulanır.",
      },
      {
        q: "Davet edilmek için hangi puana ihtiyacım olduğunu nasıl bilebilirim?",
        a: "Gelecekteki bir raunta davet garantisi veren bir puan yoktur. En iyi yaklaşım, mesleğiniz için geçmiş kesim verilerini incelemek ve son kesim noktalarının rahatça üzerinde bir puan elde etmeyi hedeflemektir.",
      },
    ],
    faqTitle: "Sıkça Sorulan Sorular — Davet Rauntları",
  },

  "zh-Hans": {
    toolLabel: "SkillSelect指南",
    aboutTitle: "关于澳大利亚SkillSelect邀请轮次",
    intro:
      "SkillSelect是澳大利亚政府管理技术移民签证意向申请（EOI）的在线服务。包括189、190和491子类在内的大多数积分测试技术签证都通过该系统处理。了解邀请轮次的运作方式以及积分截止线的确定方式，将帮助您以更高的精准度规划澳大利亚签证申请的时间和策略。",
    sections: [
      {
        heading: "什么是SkillSelect？",
        body: "SkillSelect是内政部运营的在线系统，允许潜在技术移民登记申请澳大利亚技术签证的意向。申请人提交意向申请（EOI），概述其技能、资格、工作经验和其他详情，而不是立即提交完整的签证申请。",
      },
      {
        heading: "EOI流程如何运作",
        body: "要进入SkillSelect池，您必须首先通过ImmiAccount提交EOI。您的EOI将与具有相同职业代码和签证子类偏好的其他人一起按积分排名。提交EOI之前不需要完成技能评估，但在提交实际签证申请之前必须完成。",
      },
      {
        heading: "邀请轮次意味着什么",
        body: "邀请轮次是内政部选择并邀请排名最高的EOI申请签证的定期事件。每轮指定签证子类、发出的邀请数量以及获得邀请的最低积分——通常称为'积分截止线'。",
      },
      {
        heading: "积分截止线如何确定",
        body: "任何给定轮次的积分截止线不是预先设定的——它只是被邀请的排名最低的申请人的分数。截止线反映了可用邀请数量与申请人池之间的平衡。",
      },
      {
        heading: "使用邀请轮次数据的技巧",
        body: "历史邀请轮次数据可以帮助您了解您当前的积分是否对您的职业具有竞争力。查看过去6-12轮的截止分数趋势，以判断它们是在上升还是保持稳定。",
      },
    ],
    faqs: [
      {
        q: "189和190子类邀请轮次有什么区别？",
        a: "189（独立技术）邀请轮次由联邦内政部管理，大约每月举行一次。190（州提名）由每个州和领地政府单独管理，各自按照自己的时间表发出邀请。",
      },
      {
        q: "我可以同时持有多个EOI吗？",
        a: "每个提名职业可以持有一个EOI。如果您符合多个职业的条件，可以为每个职业提交一个EOI。但您必须拥有每个职业的适当技能评估。",
      },
      {
        q: "收到邀请后我的EOI会怎样？",
        a: "一旦收到申请邀请，您的EOI将被标记为'已邀请'。然后您有60天时间通过ImmiAccount提交签证申请。如果您在60天内未提交，邀请将失效。",
      },
      {
        q: "积分截止线对所有职业都相同吗？",
        a: "不同。邀请轮次通常在所有符合条件的职业中共同选择申请人，因此该轮次中该子类的所有职业适用单一截止分数。但某些轮次针对特定职业，某些州对特定职业的190提名门槛不同。",
      },
      {
        q: "如何知道我需要多少分才能被邀请？",
        a: "没有保证在未来轮次中获得邀请的分数。最好的方法是查看您职业的历史截止数据，并争取达到比最近截止线明显高的分数。",
      },
    ],
    faqTitle: "常见问题——邀请轮次",
  },
};

export function getInvitationRoundsSeoContent(locale: string): PageContent {
  return content[locale] ?? content.en;
}

export function buildInvitationRoundsSchema(locale: string): string {
  const c = getInvitationRoundsSeoContent(locale);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  });
}
