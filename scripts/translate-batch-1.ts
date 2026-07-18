import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type SearchEntry = {
  code: string;
  title: string;
  title_tr?: string;
  title_zh?: string;
  skillLevel?: string;
  duties?: string[];
  duties_tr?: string[];
  duties_zh?: string[];
};

const BATCH_1_DATA: Record<string, Partial<SearchEntry>> = {
  "262114": {
    skillLevel: "Skill Level 1",
    title_tr: "Siber Yönetişim, Risk ve Uyum Uzmanı",
    title_zh: "网络治理、风险与合规专家",
    duties: [
      "Develops, implements and evaluates cyber security governance, risk and compliance frameworks.",
      "Conducts risk assessments and audits to ensure compliance with standards and legislation.",
      "Advises stakeholders on cyber risk mitigation and policy alignment."
    ],
    duties_tr: [
      "Siber güvenlik yönetişimi, risk ve uyum çerçevelerini geliştirir, uygular ve değerlendirir.",
      "Standartlara ve mevzuata uyumu sağlamak için risk değerlendirmeleri ve denetimler yürütür.",
      "Paydaşlara siber risk azaltma ve politika uyumu konularında danışmanlık yapar."
    ],
    duties_zh: [
      "制定、实施和评估网络安全治理、风险与合规框架。",
      "进行风险评估和审计，以确保符合标准和法律法规。",
      "向利益相关者提供网络风险缓解和政策对齐方面的建议。"
    ]
  },
  "262115": {
    skillLevel: "Skill Level 1",
    title_tr: "Siber Güvenlik Danışmanlık ve Değerlendirme Uzmanı",
    title_zh: "网络安全咨询与评估专家",
    duties: [
      "Provides cyber security advice and conducts security assessments on systems and processes.",
      "Identifies vulnerabilities, threats and risks, and recommends security controls.",
      "Evaluates security architecture and compliance against standards."
    ],
    duties_tr: [
      "Siber güvenlik danışmanlığı sağlar ve sistemler ile süreçler üzerinde güvenlik değerlendirmeleri yapar.",
      "Zafiyetleri, tehditleri ve riskleri tanımlar ve güvenlik kontrolleri önerir.",
      "Güvenlik mimarisini ve standartlara uyumluluğu değerlendirir."
    ],
    duties_zh: [
      "提供网络安全建议并对系统和流程进行安全评估。",
      "识别漏洞、威胁和风险，并推荐安全控制措施。",
      "评估安全架构以及对标准的合规性。"
    ]
  },
  "262116": {
    skillLevel: "Skill Level 1",
    title_tr: "Siber Güvenlik Analisti",
    title_zh: "网络安全分析师",
    duties: [
      "Monitors, detects and analyses security events and incidents.",
      "Investigates security breaches and coordinates incident response activities.",
      "Recommends improvements to security systems and monitoring capabilities."
    ],
    duties_tr: [
      "Güvenlik olaylarını ve vakalarını izler, tespit eder ve analiz eder.",
      "Güvenlik ihlallerini araştırır ve vaka müdahale faaliyetlerini koordine eder.",
      "Güvenlik sistemleri ve izleme kabiliyetlerinde iyileştirmeler önerir."
    ],
    duties_zh: [
      "监控、检测和分析安全事件与事故。",
      "调查安全漏洞并协调事故响应活动。",
      "针对安全系统和监控能力提出改进建议。"
    ]
  },
  "262117": {
    skillLevel: "Skill Level 1",
    title_tr: "Siber Güvenlik Mimarı",
    title_zh: "网络安全架构师",
    duties: [
      "Designs and develops secure systems, networks and application architectures.",
      "Establishes security requirements and integrates security controls into designs.",
      "Evaluates new technologies for security alignment and risk mitigation."
    ],
    duties_tr: [
      "Güvenli sistemler, ağlar ve uygulama mimarileri tasarlar ve geliştirir.",
      "Güvenlik gereksinimlerini belirler ve tasarımlara güvenlik kontrollerini entegre eder.",
      "Güvenlik uyumu ve risk azaltma açısından yeni teknolojileri değerlendirir."
    ],
    duties_zh: [
      "设计和开发安全系统、网络及应用程序架构。",
      "建立安全需求并将安全控制措施整合到设计中。",
      "评估新技术以确保安全对齐和风险缓解。"
    ]
  },
  "262118": {
    skillLevel: "Skill Level 1",
    title_tr: "Siber Güvenlik Operasyonları Koordinatörü",
    title_zh: "网络安全运营协调员",
    duties: [
      "Coordinates and manages daily activities of the cyber security operations center.",
      "Oversees incident detection, response, escalation and reporting processes.",
      "Facilitates communication between operations teams and broader business units."
    ],
    duties_tr: [
      "Siber güvenlik operasyonları merkezinin günlük faaliyetlerini koordine eder ve yönetir.",
      "Vaka tespiti, müdahale, yönlendirme ve raporlama süreçlerini denetler.",
      "Operasyon ekipleri ile genel iş birimleri arasındaki iletişimi kolaylaştırır."
    ],
    duties_zh: [
      "协调和管理网络安全运营中心（SOC）的日常活动。",
      "监督事件检测、响应、升级和报告流程。",
      "促进运营团队与更广泛业务部门之间的沟通。"
    ]
  },
  "249212": {
    skillLevel: "Skill Level 1",
    title_tr: "Dans Öğretmeni (Özel Ders)",
    title_zh: "舞蹈教师（私人授课）",
    duties: [
      "Teaches dance technique, choreography and performance skills to individuals or groups.",
      "Assesses students' abilities and prepares tailored lesson plans.",
      "Prepares students for examinations, auditions and performances."
    ],
    duties_tr: [
      "Bireylere veya gruplara dans tekniği, koreografi ve performans becerileri öğretir.",
      "Öğrencilerin yeteneklerini değerlendirir ve özel ders planları hazırlar.",
      "Öğrencileri sınavlara, seçmelere ve performanslara hazırlar."
    ],
    duties_zh: [
      "向个人或团体传授舞蹈技巧、编舞和表演技能。",
      "评估学生的能力并制定量身定制的教学计划。",
      "指导学生准备考试、试镜和演出。"
    ]
  },
  "224114": {
    skillLevel: "Skill Level 1",
    title_tr: "Veri Analisti",
    title_zh: "数据分析师",
    duties: [
      "Collects, cleans and analyses data to extract actionable insights.",
      "Designs and maintains databases, data systems and reporting dashboards.",
      "Presents findings and reports to support business decision-making."
    ],
    duties_tr: [
      "Uygulanabilir içgörüler elde etmek için verileri toplar, temizler ve analiz eder.",
      "Veri tabanları, veri sistemleri ve raporlama panelleri tasarlar ve bakımını yapar.",
      "İş kararlarını desteklemek için bulguları sunar ve raporlar hazırlar."
    ],
    duties_zh: [
      "收集、清洗和分析数据以提取可行性洞察。",
      "设计和维护数据库、数据系统及报告仪表板。",
      "展示发现和报告，以支持商业决策。"
    ]
  },
  "121314": {
    skillLevel: "Skill Level 1",
    title_tr: "Geyik Yetiştiricisi",
    title_zh: "鹿养殖户",
    duties: [
      "Breeds, raises and manages deer for venison, velvet or breeding stock.",
      "Monitors animal health, nutrition, pasture quality and infrastructure.",
      "Plans and coordinates harvesting, processing and marketing of deer products."
    ],
    duties_tr: [
      "Geyik eti, geyik boynuzu (kadife) veya damızlık stok için geyik üretir, yetiştirir ve yönetir.",
      "Hayvan sağlığını, beslenmesini, mera kalitesini ve altyapısını izler.",
      "Geyik ürünlerinin hasadını, işlenmesini ve pazarlanmasını planlar ve koordine eder."
    ],
    duties_zh: [
      "繁育、饲养和管理鹿群，以获取鹿肉、鹿茸或种畜。",
      "监测动物健康、营养、牧草质量和基础设施。",
      "规划并协调鹿副产品的收获、加工和销售。"
    ]
  },
  "411213": {
    skillLevel: "Skill Level 2",
    title_tr: "Diş Teknisyeni",
    title_zh: "牙科技术员",
    duties: [
      "Fabricates, repairs and modifies dental prostheses, crowns, bridges and appliances.",
      "Works from impressions, models and prescriptions provided by dentists.",
      "Uses specialized materials and tools to meet precise specifications."
    ],
    duties_tr: [
      "Diş protezleri, kuronlar, köprüler ve apareyler imal eder, onarır ve modifiye eder.",
      "Diş hekimleri tarafından sağlanan ölçü, model ve reçetelere göre çalışır.",
      "Hassas spesifikasyonları karşılamak için özel malzemeler ve araçlar kullanır."
    ],
    duties_zh: [
      "制作、修理和修改假牙、牙冠、牙桥和矫治器。",
      "根据牙医提供的印模、模型和处方进行工作。",
      "使用专业材料和工具以满足精密的技术要求。"
    ]
  },
  "411214": {
    skillLevel: "Skill Level 1",
    title_tr: "Diş Terapisti",
    title_zh: "牙科治疗师",
    duties: [
      "Provides dental care and treatment to children and adolescents under dentist supervision.",
      "Performs examinations, cleanings, fillings and simple extractions.",
      "Promotes oral health education and preventive care practices."
    ],
    duties_tr: [
      "Diş hekimi gözetiminde çocuklara ve gençlere diş bakımı ve tedavisi sağlar.",
      "Muayene, temizlik, dolgu ve basit diş çekimleri yapar.",
      "Ağız sağlığı eğitimini ve önleyici bakım uygulamalarını teşvik eder."
    ],
    duties_zh: [
      "在牙医监督下为儿童和青少年提供牙科护理和治疗。",
      "进行检查、洗牙、补牙和简单的拔牙。",
      "推广口腔健康教育和预防性护理措施。"
    ]
  },
  "253917": {
    skillLevel: "Skill Level 1",
    title_tr: "Radyoloji ve Girişimsel Radyoloji Uzmanı",
    title_zh: "诊断与介入放射科医生",
    duties: [
      "Interprets medical imaging to diagnose diseases and injuries.",
      "Performs image-guided minimally invasive medical procedures.",
      "Consults with other medical specialists on patient care plans."
    ],
    duties_tr: [
      "Hastalıkları ve yaralanmaları teşhis etmek için tıbbi görüntülemeleri yorumlar.",
      "Görüntüleme kılavuzluğunda minimal invaziv tıbbi prosedürler gerçekleştirir.",
      "Hasta bakım planları üzerinde diğer uzman hekimlerle konsültasyon yapar."
    ],
    duties_zh: [
      "解读医学影像以诊断疾病和损伤。",
      "执行影像引导的微创医疗程序。",
      "就患者治疗计划与其他专科医生进行会诊。"
    ]
  },
  "212312": {
    skillLevel: "Skill Level 1",
    title_tr: "Yönetmen (Film, Televizyon, Radyo veya Sahne)",
    title_zh: "导演（电影、电视、广播或舞台）",
    duties: [
      "Directs and coordinates artistic and technical aspects of performances and productions.",
      "Interprets scripts, directs actors and collaborates with production crew.",
      "Oversees rehearsals, shooting, editing and post-production processes."
    ],
    duties_tr: [
      "Performansların ve yapımların sanatsal ve teknik yönlerini yönetir ve koordine eder.",
      "Senaryoları yorumlar, oyuncuları yönlendirir ve yapım ekibiyle iş birliği yapar.",
      "Provaları, çekimleri, kurguyu ve yapım sonrası (post-prodüksiyon) süreçleri denetler."
    ],
    duties_zh: [
      "指导和协调演出及影视制作的艺术与技术环节。",
      "解读剧本，指导演员，并与制作团队合作。",
      "监督排练、拍摄、剪辑及后期制作过程。"
    ]
  },
  "212313": {
    skillLevel: "Skill Level 1",
    title_tr: "Görüntü Yönetmeni",
    title_zh: "摄影指导",
    duties: [
      "Determines lighting, camera angles, composition and visual style of productions.",
      "Selects cameras, lenses, lighting equipment and coordinates camera operators.",
      "Collaborates with the director to realize the project's visual vision."
    ],
    duties_tr: [
      "Yapımların aydınlatmasını, kamera açılarını, kompozisyonunu ve görsel stilini belirler.",
      "Kameraları, lensleri, aydınlatma ekipmanlarını seçer ve kamera operatörlerini koordine eder.",
      "Projenin görsel vizyonunu gerçekleştirmek için yönetmenle iş birliği yapar."
    ],
    duties_zh: [
      "确定影视制作的光影、相机角度、构图和视觉风格。",
      "选择摄像机、镜头、照明设备并协调摄像师工作。",
      "与导演合作以实现项目的视觉构想。"
    ]
  },
  "411712": {
    skillLevel: "Skill Level 2",
    title_tr: "Engelli Hizmetleri Görevlisi",
    title_zh: "残疾人服务专员",
    duties: [
      "Assesses needs and provides support services to individuals with disabilities.",
      "Assists clients in developing life skills, independence and community access.",
      "Liaises with families, carers and support networks to coordinate care plans."
    ],
    duties_tr: [
      "Engelli bireylerin ihtiyaçlarını değerlendirir ve destek hizmetleri sunar.",
      "Danışanların yaşam becerileri, bağımsızlık ve topluma katılım geliştirmelerine yardımcı olur.",
      "Bakım planlarını koordine etmek için aileler, bakıcılar ve destek ağları ile iletişim kurar."
    ],
    duties_zh: [
      "评估残疾人需求并为其提供支持服务。",
      "协助客户发展生活技能、独立能力以及社区融入。",
      "与家庭、照护者和支持网络联络，以协调服务计划。"
    ]
  },
  "399911": {
    skillLevel: "Skill Level 3",
    title_tr: "Dalgıç",
    title_zh: "潜水员",
    duties: [
      "Performs underwater tasks related to construction, inspection, salvage or research.",
      "Uses specialized diving gear, tools and communication systems.",
      "Adheres to strict safety protocols, depth limits and decompression procedures."
    ],
    duties_tr: [
      "İnşaat, teftiş, kurtarma veya araştırma ile ilgili su altı görevlerini yerine getirir.",
      "Özel dalış ekipmanları, aletleri ve iletişim sistemlerini kullanır.",
      "Sıkı güvenlik protokollerine, derinlik sınırlarına ve dekompresyon prosedürlerine uyar."
    ],
    duties_zh: [
      "执行与施工、检验、打捞或研究相关的地下水/水下任务。",
      "使用专业潜水装备、工具和通信系统。",
      "遵守严格的安全规程、深度限制和减压程序。"
    ]
  },
  "452311": {
    skillLevel: "Skill Level 3",
    title_tr: "Dalış Eğitmeni (Açık Deniz)",
    title_zh: "潜水教练（开放水域）",
    duties: [
      "Teaches open water scuba diving theory, safety and practical skills.",
      "Supervises student divers during training and open water dives.",
      "Ensures all diving equipment is safe, operational and maintained."
    ],
    duties_tr: [
      "Açık deniz tüplü dalış (scuba) teorisini, güvenliğini ve pratik becerilerini öğretir.",
      "Eğitim ve açık deniz dalışları sırasında öğrenci dalgıçları denetler.",
      "Tüm dalış ekipmanlarının güvenli, çalışır durumda ve bakımlı olmasını sağlar."
    ],
    duties_zh: [
      "教授开放水域水肺潜水理论、安全和实用技能。",
      "在培训和开放水域潜水期间监督学员。",
      "确保所有潜水设备安全、可用并得到良好维护。"
    ]
  },
  "361111": {
    skillLevel: "Skill Level 4",
    title_tr: "Köpek Eğitmeni veya Bakıcısı",
    title_zh: "训犬员或驯犬师",
    duties: [
      "Trains dogs for obedience, security, assistance or search and rescue roles.",
      "Feeds, grooms, exercises and cares for dogs in kennels or training facilities.",
      "Teaches owners dog handling techniques and behaviour management."
    ],
    duties_tr: [
      "Köpekleri itaat, güvenlik, yardım veya arama kurtarma rolleri için eğitir.",
      "Köpek kulübelerindeki veya eğitim merkezlerindeki köpekleri besler, tıraş eder, gezdirir ve bakımını yapar.",
      "Köpek sahiplerine köpek yönlendirme teknikleri ve davranış yönetimi öğretir."
    ],
    duties_zh: [
      "训练犬只以执行服从、安保、助残或搜救等任务。",
      "在犬舍或培训设施中喂养、美容、训练和照料犬只。",
      "向犬主教授犬只引导技巧和行为管理。"
    ]
  },
  "452318": {
    skillLevel: "Skill Level 3",
    title_tr: "Tazı veya At Yarışı Hakemi / Resmi Görevlisi",
    title_zh: "赛犬或赛马裁判",
    duties: [
      "Enforces rules, regulations and standards at dog or horse racing events.",
      "Inspects tracks, starting boxes, race equipment and animals.",
      "Monitors races, declares official results and investigates rule breaches."
    ],
    duties_tr: [
      "Tazı veya at yarışı etkinliklerinde kuralları, yönetmelikleri ve standartları uygular.",
      "Pistleri, çıkış kutularını, yarış ekipmanlarını ve hayvanları denetler.",
      "Yarışları izler, resmi sonuçları ilan eder ve kural ihlallerini araştırır."
    ],
    duties_zh: [
      "在赛狗或赛马活动中执行规则、法规和标准。",
      "检查跑道、起跑栏、比赛设备以及参赛动物。",
      "监督比赛，公布官方结果并调查违规行为。"
    ]
  },
  "249213": {
    skillLevel: "Skill Level 1",
    title_tr: "Drama Öğretmeni (Özel Ders)",
    title_zh: "戏剧教师（私人授课）",
    duties: [
      "Teaches acting, voice, movement and dramatic expression to individuals or groups.",
      "Assesses students' abilities and prepares tailored drama activities and scripts.",
      "Prepares students for examinations, auditions and theatrical performances."
    ],
    duties_tr: [
      "Bireylere veya gruplara oyunculuk, ses, hareket ve dramatik ifade öğretir.",
      "Öğrencilerin yeteneklerini değerlendirir, özel drama etkinlikleri ve senaryolar hazırlar.",
      "Öğrencileri sınavlara, seçmelere ve tiyatro performanslarına hazırlar."
    ],
    duties_zh: [
      "向个人或团体教授表演、发声、肢体动作和戏剧表达。",
      "评估学生能力并制定量身定制的戏剧活动和剧本。",
      "指导学生准备考试、试镜和舞台演出。"
    ]
  },
  "393213": {
    skillLevel: "Skill Level 3",
    title_tr: "Terzi veya Kadın Terzisi",
    title_zh: "女装裁缝或男装裁缝",
    duties: [
      "Designs, alters, repairs and fabricates custom garments and clothing items.",
      "Measures clients, drafts patterns and cuts and sews fabrics.",
      "Advises clients on fabric styles, design elements and fit."
    ],
    duties_tr: [
      "Özel dikim giysileri tasarlar, değiştirir, onarır ve üretir.",
      "Müşterilerin ölçülerini alır, kalıp çıkarır, kumaşları keser ve diker.",
      "Müşterilere kumaş stilleri, tasarım öğeleri ve giysi uyumu konularında danışmanlık yapar."
    ],
    duties_zh: [
      "设计、修改、修理和制作定制服装。",
      "量体、制版、裁剪和缝制面料。",
      "就面料款式、设计元素和合身度为客户提供建议。"
    ]
  },
  "272112": {
    skillLevel: "Skill Level 1",
    title_tr: "Alkol ve Madde Bağımlılığı Danışmanı",
    title_zh: "戒毒与戒酒咨询师",
    duties: [
      "Provides counselling and support to individuals and families dealing with substance dependency.",
      "Conducts assessments, develops treatment plans and monitors client progress.",
      "Facilitates support groups and provides referral to medical or rehabilitation services."
    ],
    duties_tr: [
      "Madde bağımlılığı yaşayan bireylere ve ailelerine danışmanlık ve destek sağlar.",
      "Değerlendirmeler yapar, tedavi planları geliştirir ve danışan gelişimini izler.",
      "Destek grupları yönetir; tıbbi hizmetlere veya rehabilitasyon hizmetlerine yönlendirme sağlar."
    ],
    duties_zh: [
      "为应对物质依赖的个人和家庭提供咨询和支持。",
      "进行评估，制定治疗计划并监测客户进度。",
      "主持支持小组并提供向医疗或康复机构的转介。"
    ]
  },
  "249111": {
    skillLevel: "Skill Level 1",
    title_tr: "Eğitim Danışmanı",
    title_zh: "教育顾问",
    duties: [
      "Conducts research and provides advice on educational policies, curricula and resources.",
      "Develops, reviews and evaluates educational programmes and materials.",
      "Provides guidance to educational institutions, teachers and students."
    ],
    duties_tr: [
      "Eğitim politikaları, müfredat ve kaynaklar hakkında araştırmalar yapar ve tavsiyelerde bulunur.",
      "Eğitim programları ve materyalleri geliştirir, inceler ve değerlendirir.",
      "Eğitim kurumlarına, öğretmenlere ve öğrencilere rehberlik sağlar."
    ],
    duties_zh: [
      "开展研究并就教育政策、课程和资源提供建议。",
      "开发、审查和评估教育计划与材料。",
      "向教育机构、教师和学生提供指导。"
    ]
  },
  "134499": {
    skillLevel: "Skill Level 1",
    title_tr: "Eğitim Yöneticileri (bhk)",
    title_zh: "教育经理（其他）",
    duties: [
      "Plans, directs and coordinates administrative and educational aspects of educational institutions.",
      "Manages budgets, staff, facilities and coordinates educational policy implementation.",
      "Liaises with regulatory bodies, parents, community groups and stakeholders."
    ],
    duties_tr: [
      "Eğitim kurumlarının idari ve eğitsel yönlerini planlar, yönetir ve koordine eder.",
      "Bütçeleri, personeli, tesisleri yönetir ve eğitim politikalarının uygulanmasını koordine eder.",
      "Denetleyici kurumlar, veliler, topluluk grupları ve paydaşlarla iletişim kurar."
    ],
    duties_zh: [
      "规划、指导和协调教育机构的行政和教学事务。",
      "管理预算、人员、设施并协调教育政策的实施。",
      "与监管机构、家长、社区团体和利益相关者联络。"
    ]
  },
  "249112": {
    skillLevel: "Skill Level 1",
    title_tr: "Eğitim Denetçisi / Müfettişi",
    title_zh: "教育评审员",
    duties: [
      "Inspects and reviews educational standards, teaching quality and curriculum implementation.",
      "Prepares reports and recommendations on institutional performance and compliance.",
      "Advises educational authorities and institutions on quality assurance and improvement."
    ],
    duties_tr: [
      "Eğitim standartlarını, öğretim kalitesini ve müfredat uygulamalarını denetler ve inceler.",
      "Kurumsal performans ve uyumluluk hakkında raporlar ve öneriler hazırlar.",
      "Eğitim yetkililerine ve kurumlarına kalite güvencesi ve iyileştirme konularında danışmanlık yapar."
    ],
    duties_zh: [
      "检查和评估教育标准、教学质量和课程实施情况。",
      "就机构绩效和合规性编写报告并提出建议。",
      "就质量保证和改进向教育主管部门及机构提供建议。"
    ]
  },
  "224911": {
    skillLevel: "Skill Level 1",
    title_tr: "Milletvekili Seçim Bölgesi Görevlisi",
    title_zh: "选区官员",
    duties: [
      "Supports members of parliament in managing constituent enquiries and electorate tasks.",
      "Liaises with community groups, government agencies and local organizations.",
      "Prepares briefs, speeches, correspondence and coordinates electorate events."
    ],
    duties_tr: [
      "Milletvekillerine, seçmen taleplerinin yönetilmesi ve seçim bölgesi işlerinin yürütülmesinde destek olur.",
      "Topluluk grupları, devlet kurumları ve yerel kuruluşlarla iletişim kurar.",
      "Bilgi notları, konuşmalar, yazışmalar hazırlar ve seçim bölgesi etkinliklerini koordine eder."
    ],
    duties_zh: [
      "协助议员处理选民咨询和选区事务。",
      "与社区团体、政府机构和地方组织联络。",
      "准备简报、发言稿、往来信件并协调选区活动。"
    ]
  },
  "342315": {
    skillLevel: "Skill Level 3",
    title_tr: "Elektronik Enstrümantasyon Teknisyeni (Özel Sınıf)",
    title_zh: "电子仪器行业工人（特级）",
    duties: [
      "Installs, maintains, calibrates and repairs complex electronic instruments and control systems.",
      "Diagnoses faults using specialized electronic test equipment and schematics.",
      "Modifies and programs instrumentation and automation control systems."
    ],
    duties_tr: [
      "Karmaşık elektronik enstrümanları ve kontrol sistemlerini kurar, bakımını yapar, kalibre eder ve onarır.",
      "Özel elektronik test ekipmanları ve şemalar kullanarak arızaları teşhis eder.",
      "Enstrümantasyon ve otomasyon kontrol sistemlerini modifiye eder ve programlar."
    ],
    duties_zh: [
      "安装、维护、校准和修理复杂的电子仪器和控制系统。",
      "使用专业电子测试设备和原理图诊断故障。",
      "修改和编写仪器仪表及自动化控制系统程序。"
    ]
  },
  "253912": {
    skillLevel: "Skill Level 1",
    title_tr: "Acil Tıp Uzmanı",
    title_zh: "急诊医学专科医生",
    duties: [
      "Diagnoses and treats acute illnesses, injuries and life-threatening conditions in emergency departments.",
      "Performs resuscitation, stabilizing procedures and critical care interventions.",
      "Coordinates emergency medical teams and directs patient flow."
    ],
    duties_tr: [
      "Acil servislerde akut hastalıkları, yaralanmaları ve hayati tehlike oluşturan durumları teşhis eder ve tedavi eder.",
      "Yeniden canlandırma (resüsitasyon), stabilizasyon prosedürleri ve yoğun bakım müdahaleleri gerçekleştirir.",
      "Acil tıp ekiplerini koordine eder ve hasta akışını yönlendirir."
    ],
    duties_zh: [
      "在急诊科诊断和治疗急性疾病、外伤及危及生命的状况。",
      "执行心肺复苏、稳定程序和重症监护干预。",
      "协调急诊医疗团队并引导患者分流。"
    ]
  },
  "441211": {
    skillLevel: "Skill Level 3",
    title_tr: "Acil Durum Arama Kurtarma Görevlisi",
    title_zh: "应急服务救援人员",
    duties: [
      "Responds to emergency situations, disasters, rescue calls and public safety incidents.",
      "Uses specialized rescue equipment, first aid and communication systems.",
      "Collaborates with police, fire, ambulance and other emergency agencies."
    ],
    duties_tr: [
      "Acil durumlara, afetlere, kurtarma çağrılarına ve kamu güvenliği olaylarına müdahale eder.",
      "Özel kurtarma ekipmanları, ilk yardım ve iletişim sistemlerini kullanır.",
      "Polis, itfaiye, ambulans ve diğer acil durum kurumlarıyla iş birliği yapar."
    ],
    duties_zh: [
      "应对紧急状况、灾害、救援呼叫 and 公共安全事件。",
      "使用专业救援设备、急救和通信系统。",
      "与警察、消防、救护车和其他应急机构合作。"
    ]
  },
  "323411": {
    skillLevel: "Skill Level 3",
    title_tr: "Mühendislik Modelcisi (Döküm Modelcisi)",
    title_zh: "工程模具工",
    duties: [
      "Designs and fabricates patterns, templates and models for metal castings.",
      "Works from engineering drawings, using timber, plastics, metal or plaster.",
      "Operates woodworking, metalworking tools and CNC machinery."
    ],
    duties_tr: [
      "Metal dökümler için modeller, şablonlar ve kalıplar tasarlar ve üretir.",
      "Ahşap, plastik, metal veya alçı kullanarak mühendislik çizimlerine göre çalışır.",
      "Ağaç işleme, metal işleme aletlerini ve CNC makinelerini çalıştırır."
    ],
    duties_zh: [
      "设计和制作用于金属铸造的模具、样板和模型。",
      "根据工程图纸，使用木材、塑料、金属或石膏进行制作。",
      "操作木工、金属加工工具及数控（CNC）机械。"
    ]
  },
  "323311": {
    skillLevel: "Skill Level 3",
    title_tr: "Gravürcü / Oymacı",
    title_zh: "雕刻工",
    duties: [
      "Engraves designs, text or patterns on metal, glass, plastic or timber items.",
      "Uses hand tools, rotary engravers, pantographs or laser engraving machines.",
      "Prepares layouts, templates and reviews precise alignment specifications."
    ],
    duties_tr: [
      "Metal, cam, plastik veya ahşap eşyalar üzerine tasarımlar, metinler veya desenler kazır/oyar.",
      "El aletleri, döner gravür makineleri, pantograflar veya lazer kazıma makineleri kullanır.",
      "Mizanpajlar, şablonlar hazırlar ve hassas hizalama spesifikasyonlarını inceler."
    ],
    duties_zh: [
      "在金属、玻璃、塑料或木制物品上雕刻设计、文字或图案。",
      "使用手工工具、旋转雕刻机、缩图仪或激光雕刻机。",
      "准备版面、样板并审查精确的对齐规范。"
    ]
  },
  "234521": {
    skillLevel: "Skill Level 1",
    title_tr: "Entomolog (Böcek Bilimci)",
    title_zh: "昆虫学家",
    duties: [
      "Studies insects, their behaviors, habitats, genetics and ecological roles.",
      "Conducts field research, insect collection and laboratory analysis.",
      "Advises on pest management, agricultural protection and biodiversity conservation."
    ],
    duties_tr: [
      "Böcekleri, davranışlarını, yaşam alanlarını, genetiklerini ve ekolojik rollerini inceler.",
      "Arazi araştırmaları yapar, böcek toplar ve laboratuvar analizleri yürütür.",
      "Haşere yönetimi, tarımsal koruma ve biyoçeşitlilik korunması konularında danışmanlık yapar."
    ],
    duties_zh: [
      "研究昆虫及其行为、栖息地、遗传和生态作用。",
      "进行野外研究、昆虫收集和实验室分析。",
      "就害虫防治、农业保护和生物多样性保护提供建议。"
    ]
  },
  "149915": {
    skillLevel: "Skill Level 2",
    title_tr: "Ekipman Kiralama Yöneticisi",
    title_zh: "设备租赁经理",
    duties: [
      "Manages operations of an equipment hire or rental business or department.",
      "Oversees inventory control, maintenance, pricing and customer service.",
      "Ensures compliance with safety regulations, transport laws and commercial contracts."
    ],
    duties_tr: [
      "Bir ekipman kiralama işletmesinin veya departmanının operasyonlarını yönetir.",
      "Envanter kontrolünü, bakımı, fiyatlandırmayı ve müşteri hizmetlerini denetler.",
      "Güvenlik yönetmeliklerine, nakliye kanunlarına ve ticari sözleşmelere uyumu sağlar."
    ],
    duties_zh: [
      "管理设备租借或租赁业务公司或部门的运营。",
      "监督库存控制、维护、定价和客户服务。",
      "确保遵守安全规定、运输法和商业合同。"
    ]
  },
  "149913": {
    skillLevel: "Skill Level 1",
    title_tr: "Tesis Yöneticisi",
    title_zh: "设施经理",
    duties: [
      "Directs, coordinates and plans building maintenance, operations and support services.",
      "Manages service contracts, space allocation, security and safety protocols.",
      "Ensures facilities comply with regulations, environmental targets and budgets."
    ],
    duties_tr: [
      "Bina bakımını, operasyonlarını ve destek hizmetlerini yönlendirir, koordine eder ve planlar.",
      "Hizmet sözleşmelerini, alan tahsisini, güvenlik ve emniyet protokollerini yönetir.",
      "Tesislerin yönetmeliklere, çevre hedeflerine ve bütçelere uygunluğunu sağlar."
    ],
    duties_zh: [
      "指导、协调和规划建筑维护、运营及支持服务。",
      "管理服务合同、空间分配、安保和安全规程。",
      "确保设施符合法规、环境目标和预算要求。"
    ]
  },
  "272113": {
    skillLevel: "Skill Level 1",
    title_tr: "Aile ve Evlilik Danışmanı",
    title_zh: "家庭与婚姻咨询师",
    duties: [
      "Provides counselling to couples and families to resolve relationship and interpersonal issues.",
      "Conducts assessments, facilitates communication and develops therapeutic coping strategies.",
      "Maintains professional case records, confidentiality and ethical standards."
    ],
    duties_tr: [
      "İlişki ve kişilerarası sorunları çözmek için çiftlere ve ailelere danışmanlık sağlar.",
      "Değerlendirmeler yapar, iletişimi kolaylaştırır ve terapötik başa çıkma stratejileri geliştirir.",
      "Profesyonel vaka kayıtlarını, gizliliği ve etik standartları korur."
    ],
    duties_zh: [
      "为夫妻和家庭提供咨询，以解决关系和人际问题。",
      "进行评估，促进沟通并制定治疗性应对策略。",
      "维护专业案例记录、保密性和道德标准。"
    ]
  },
  "411713": {
    skillLevel: "Skill Level 2",
    title_tr: "Aile Destek Görevlisi",
    title_zh: "家庭支持工作者",
    duties: [
      "Provides assistance and support services to families facing crisis or social difficulties.",
      "Helps families develop parenting, household management and life skills.",
      "Liaises with social services, schools and community agencies to coordinate assistance."
    ],
    duties_tr: [
      "Kriz veya sosyal zorluklarla karşılaşan ailelere yardım ve destek hizmetleri sunar.",
      "Ailelerin ebeveynlik, ev yönetimi ve yaşam becerileri geliştirmelerine yardımcı olur.",
      "Yardımları koordine etmek için sosyal hizmetler, okullar ve topluluk kurumlarıyla iletişim kurar."
    ],
    duties_zh: [
      "为面临危机或社会困难的家庭提供援助和支持服务。",
      "帮助家庭培养育儿、家务管理和生活技能。",
      "与社会服务机构、学校和社区机构联络以协调援助。"
    ]
  },
  "212314": {
    skillLevel: "Skill Level 1",
    title_tr: "Film ve Video Kurgu Yönetmeni / Editörü",
    title_zh: "电影和视频剪辑师",
    duties: [
      "Assembles raw footage, audio and graphics into a cohesive and polished final product.",
      "Selects shots, edits scenes, syncs audio and applies pacing and storytelling techniques.",
      "Collaborates with directors, producers and sound designers to realize the creative vision."
    ],
    duties_tr: [
      "Ham görüntüleri, sesleri ve grafikleri tutarlı ve işlenmiş bir nihai ürün haline getirir.",
      "Çekimleri seçer, sahneleri düzenler, sesleri senkronize eder, tempo ve hikaye anlatımı tekniklerini uygular.",
      "Yaratıcı vizyonu gerçekleştirmek için yönetmenler, yapımcılar ve ses tasarımcılarıyla iş birliği yapar."
    ],
    duties_zh: [
      "将原始素材、音频和图形组合成一个连贯且完美的最终作品。",
      "选择镜头、编辑场景、同步音频并应用节奏和叙事技巧。",
      "与导演、制片人和声音设计师合作以实现创意构想。"
    ]
  },
  "212399": {
    skillLevel: "Skill Level 1",
    title_tr: "Film, Televizyon, Radyo ve Sahne Yönetmenleri (bhk)",
    title_zh: "电影、电视、广播和舞台导演（其他）",
    duties: [
      "Directs artistic and technical elements of film, television, radio or stage productions.",
      "Interprets scripts, guides performers and coordinates production teams.",
      "Oversees rehearsals, production scheduling, editing and final review."
    ],
    duties_tr: [
      "Film, televizyon, radyo veya sahne yapımlarının sanatsal ve teknik unsurlarını yönetir.",
      "Senaryoları yorumlar, oyuncuları yönlendirir ve yapım ekiplerini koordine eder.",
      "Provaları, yapım planlamasını, kurguyu ve son değerlendirmeyi denetler."
    ],
    duties_zh: [
      "指导电影、电视、广播或舞台制作的艺术和技术元素。",
      "解读剧本、引导演员并协调制作团队。",
      "监督排练、制作排程、剪辑和最终审查。"
    ]
  },
  "222112": {
    skillLevel: "Skill Level 1",
    title_tr: "Finansal Aracı / Broker",
    title_zh: "融资经纪人",
    duties: [
      "Identifies and negotiates financing and loan options for commercial or personal clients.",
      "Evaluates client financial status and prepares loan applications.",
      "Liaises with banks, financial institutions and monitors market interest rates."
    ],
    duties_tr: [
      "Ticari veya bireysel müşteriler için finansman ve kredi seçeneklerini belirler ve müzakere eder.",
      "Müşteri mali durumunu değerlendirir ve kredi başvurularını hazırlar.",
      "Bankalar ve finansal kuruluşlarla iletişim kurar, piyasa faiz oranlarını izler."
    ],
    duties_zh: [
      "为商业或个人客户寻找并洽谈融资和贷款方案。",
      "评估客户财务状况并准备贷款申请。",
      "与银行、金融机构联络并监控市场利率。"
    ]
  },
  "222199": {
    skillLevel: "Skill Level 1",
    title_tr: "Finansal Aracılar (bhk)",
    title_zh: "金融经纪人（其他）",
    duties: [
      "Arranges and negotiates financial services, insurance, loans or investments for clients.",
      "Assesses client needs and financial situations to recommend appropriate options.",
      "Liaises with underwriters, financial institutions and monitors industry regulations."
    ],
    duties_tr: [
      "Müşteriler için finansal hizmetler, sigorta, krediler veya yatırımlar düzenler ve müzakere eder.",
      "Müşteri ihtiyaçlarını ve mali durumunu değerlendirerek uygun seçenekleri önerir.",
      "Sigorta kabul yetkilileri (underwriter'lar), finansal kuruluşlarla iletişim kurar ve sektör düzenlemelerini izler."
    ],
    duties_zh: [
      "为客户安排和洽谈金融服务、保险、贷款或投资。",
      "评估客户需求和财务状况，以推荐合适的方案。",
      "与核保人、金融机构联络并监督行业法规。"
    ]
  },
  "222299": {
    skillLevel: "Skill Level 1",
    title_tr: "Finansal Yatırım / Alım-Satım Uzmanları (bhk)",
    title_zh: "金融交易商（其他）",
    duties: [
      "Buys and sells financial products, commodities or currencies on behalf of clients or institutions.",
      "Analyses market trends, financial news and monitors trading activities.",
      "Ensures all transactions comply with trading regulations and risk policies."
    ],
    duties_tr: [
      "Müşteriler veya kurumlar adına finansal ürünler, emtialar veya döviz alıp satar.",
      "Piyasa trendlerini, finansal haberleri analiz eder ve ticaret faaliyetlerini izler.",
      "Tüm işlemlerin ticaret düzenlemelerine ve risk politikalarına uygun olmasını sağlar."
    ],
    duties_zh: [
      "代表客户或机构买卖金融产品、大宗商品或货币。",
      "分析市场趋势、财经新闻并监控交易活动。",
      "确保所有交易符合交易法规和风险政策。"
    ]
  }
};

const FILE_PATH = path.join(process.cwd(), "src/data/anzsco-list.json");
const list = JSON.parse(readFileSync(FILE_PATH, "utf8")) as SearchEntry[];

let updatedCount = 0;
for (const entry of list) {
  const batchData = BATCH_1_DATA[entry.code];
  if (batchData) {
    Object.assign(entry, batchData);
    updatedCount += 1;
  }
}

writeFileSync(FILE_PATH, JSON.stringify(list, null, 2));
console.log(`Successfully updated ${updatedCount} entries in anzsco-list.json.`);
