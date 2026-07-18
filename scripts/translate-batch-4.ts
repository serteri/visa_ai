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

const BATCH_4_DATA: Record<string, Partial<SearchEntry>> = {
  "234912": {
    title_tr: "Metalurji Mühendisi",
    title_zh: "冶金学家",
    duties: [
      "Studies properties of metals and alloys, and designs extraction and processing workflows.",
      "Monitors metal casting, forging, heat treatment and checks quality specifications.",
      "Conducts failure analysis, audits corrosion issues and recommends improvements."
    ],
    duties_tr: [
      "Metallerin ve alaşımların özelliklerini inceler; özütleme ve işleme iş akışlarını tasarlar.",
      "Metal dökümünü, dövmesini, ısıl işlemini izler ve kalite spesifikasyonlarını kontrol eder.",
      "Hata analizleri yürütür, korozyon sorunlarını denetler ve iyileştirmeler önerir."
    ],
    duties_zh: [
      "研究金属和合金的特性，设计提取和加工工作流程。",
      "监控金属铸造、锻造、热处理并检查质量规范。",
      "进行失效分析、审计腐蚀问题并提出改进建议。"
    ]
  },
  "224913": {
    title_tr: "Göçmenlik Danışmanı (Avustralya/Yeni Zelanda)",
    title_zh: "移民代理（澳）/ 移民顾问（新）",
    duties: [
      "Advises clients on visa eligibility, immigration laws, regulations and procedures.",
      "Prepares, reviews and submits visa applications, appeals and supporting documents.",
      "Represents clients in dealings with immigration authorities and tribunals."
    ],
    duties_tr: [
      "Müşterilere vize uygunluğu, göçmenlik yasaları, yönetmelikleri ve prosedürleri hakkında danışmanlık yapar.",
      "Vize başvurularını, itirazları ve destekleyici belgeleri hazırlar, inceler ve sunar.",
      "Göçmenlik makamları ve hakem heyetleri nezdindeki işlemlerde müşterileri temsil eder."
    ],
    duties_zh: [
      "就签证符合性、移民法、法规和程序向客户提供建议。",
      "准备、审查并提交签证申请、上诉及支持文件。",
      "在与移民局和法庭的业务往来中代表客户。"
    ]
  },
  "272211": {
    title_tr: "Din Görevlisi / Din Adamı",
    title_zh: "宗教神职人员",
    duties: [
      "Performs religious rites, ceremonies and directs spiritual or moral education.",
      "Provides pastoral care, counselling and support to members of the community.",
      "Delivers sermons, coordinates religious events and community outreach programs."
    ],
    duties_tr: [
      "Dini törenleri, merasimleri yönetir; manevi veya ahlaki eğitime yön verir.",
      "Topluluk üyelerine manevi bakım (pastoral care), danışmanlık ve destek sağlar.",
      "Vaazlar verir, dini etkinlikleri ve toplumsal sosyal yardım programlarını koordine eder."
    ],
    duties_zh: [
      "主持宗教仪式、典礼并指导精神或道德教育。",
      "向社区成员提供牧灵关怀、咨询和支持。",
      "布道、协调宗教活动和社区外展计划。"
    ]
  },
  "121411": {
    title_tr: "Karma Tarım ve Hayvancılık Çiftçisi",
    title_zh: "混合农作物及牲畜养殖户",
    duties: [
      "Plans, directs and coordinates production of both agricultural crops and livestock.",
      "Oversees soil preparation, planting, irrigation, animal breeding, feeding and health.",
      "Manages farm resources, budgets, machinery, staff and marketing of farm products."
    ],
    duties_tr: [
      "Hem tarımsal ürünlerin hem de canlı hayvanların üretimini planlar, yönlendirir ve koordine eder.",
      "Toprak hazırlığını, ekimi, sulamayı, hayvan yetiştiriciliğini, beslemeyi ve sağlığı denetler.",
      "Çiftlik kaynaklarını, bütçelerini, makinelerini, personelini ve çiftlik ürünlerinin pazarlamasını yönetir."
    ],
    duties_zh: [
      "规划、指导和协调农作物和牲畜的生产。",
      "监督整地、种植、灌溉、动物育种、喂养和健康。",
      "管理农场资源、预算、机械、员工和农产品销售。"
    ]
  },
  "121317": {
    title_tr: "Karma Hayvancılık Çiftçisi",
    title_zh: "混合牲畜养殖户",
    duties: [
      "Plans, directs and coordinates breeding and raising of different livestock types.",
      "Monitors animal health, nutrition, pasture quality, fencing and farm structures.",
      "Coordinates shearing, milking, harvesting and marketing of diverse animal products."
    ],
    duties_tr: [
      "Farklı türdeki canlı hayvanların yetiştirilmesini ve üretilmesini planlar, yönlendirir ve koordine eder.",
      "Hayvan sağlığını, beslenmesini, mera kalitesini, çitleri ve çiftlik yapılarını izler.",
      "Çeşitli hayvansal ürünlerin kırkılmasını, sağılmasını, hasadını ve pazarlanmasını koordine eder."
    ],
    duties_zh: [
      "规划、指导和协调不同类型牲畜的繁育与饲养。",
      "监测动物健康、营养、牧草质量、围栏和农场结构。",
      "协调各种动物产品的剪毛、挤奶、收获和销售。"
    ]
  },
  "232413": {
    title_tr: "Multimedya Tasarımcısı",
    title_zh: "多媒体设计师",
    duties: [
      "Creates and designs digital content, animations, audio, video and interactive media.",
      "Develops design concepts, storyboards, layouts and aligns with project briefs.",
      "Uses design software to code, animate and optimize assets across digital channels."
    ],
    duties_tr: [
      "Dijital içerikler, animasyonlar, ses, video ve etkileşimli medya oluşturur ve tasarlar.",
      "Tasarım konseptleri, görsel senaryolar (storyboard), düzenler geliştirir ve proje brifingleriyle uyumlu hale getirir.",
      "Dijital kanallarda varlıkları kodlamak, canlandırmak ve optimize etmek için tasarım yazılımlarını kullanır."
    ],
    duties_zh: [
      "创建和设计数字内容、动画、音频、视频和交互式媒体。",
      "开发设计概念、故事板、布局并符合项目简报要求。",
      "使用设计软件进行编码、制作动画并在数字渠道优化资产。"
    ]
  },
  "211212": {
    title_tr: "Müzik Direktörü / Şefi",
    title_zh: "音乐总监",
    duties: [
      "Directs, conducts and coordinates performances of musical groups, choirs or orchestras.",
      "Selects musical repertoire, schedules rehearsals, guides musicians and interprets scores.",
      "Collaborates with producers, designers and manages artistic aspects of productions."
    ],
    duties_tr: [
      "Müzik gruplarının, koroların veya orkestraların performanslarını yönlendirir, yönetir (şeflik yapar) ve koordine eder.",
      "Müzikal repertuvarı seçer, provaları planlar, müzisyenleri yönlendirir ve notaları yorumlar.",
      "Yapımcılar ve tasarımcılarla iş birliği yapar, yapımların sanatsal yönlerini yönetir."
    ],
    duties_zh: [
      "指导、指挥和协调乐团、合唱团或管弦乐队的演出。",
      "选择音乐曲目、安排排练、指导乐手并解读乐谱。",
      "与制作人、设计师合作，并管理演出的艺术环节。"
    ]
  },
  "211299": {
    title_tr: "Müzik Profesyonelleri (bhk)",
    title_zh: "音乐专业人员（其他）",
    duties: [
      "Performs music-related professional tasks not elsewhere classified, such as composing or arranging.",
      "Creates musical scores, structures, melodies and collaborates with performers.",
      "Maintains artistic standards, directs recordings, and conducts music research."
    ],
    duties_tr: [
      "Beste yapma veya aranjörlük gibi başka yerde sınıflandırılmamış müzikle ilgili profesyonel görevleri yerine getirir.",
      "Müzik notaları, yapıları, melodiler oluşturur ve icracılarla iş birliği yapar.",
      "Sanatsal standartları korur, kayıtları yönetir ve müzik araştırmaları yürütür."
    ],
    duties_zh: [
      "执行未另分类的音乐相关专业任务，如作曲或编曲。",
      "创作乐谱、结构、旋律并与演奏者合作。",
      "维护艺术标准、指导录音并开展音乐研究。"
    ]
  },
  "249214": {
    title_tr: "Müzik Öğretmeni (Özel Ders)",
    title_zh: "音乐教师（私人授课）",
    duties: [
      "Teaches musical theory, instrument techniques or vocal skills to individuals or groups.",
      "Assesses students' abilities, sets practice goals and prepares tailored lesson plans.",
      "Prepares students for music examinations, auditions and public performances."
    ],
    duties_tr: [
      "Bireylere veya gruplara müzik teorisi, enstrüman teknikleri veya şan becerileri öğretir.",
      "Öğrencilerin yeteneklerini değerlendirir, pratik hedefleri belirler ve özel ders planları hazırlar.",
      "Öğrencileri müzik sınavlarına, seçmelere ve halka açık performanslara hazırlar."
    ],
    duties_zh: [
      "向个人或团体教授音乐理论、乐器技巧或声乐技能。",
      "评估学生能力、设定练习目标并准备量身定制的教案。",
      "指导学生准备音乐考试、试镜和公开演出。"
    ]
  },
  "399515": {
    title_tr: "Müzik Aletleri Yapımcısı veya Tamircisi",
    title_zh: "乐器制造工或修理工",
    duties: [
      "Fabricates, alters, repairs and tunes string, wind, percussion or electronic musical instruments.",
      "Restores vintage instruments, replaces worn parts, and uses specialized wood or metalworking tools.",
      "Conducts testing, aligns components, and verifies acoustic or electrical parameters."
    ],
    duties_tr: [
      "Telli, üflemeli, vurmalı veya elektronik müzik aletlerini imal eder, değiştirir, onarır ve akort eder.",
      "Antika enstrümanları restore eder, aşınmış parçaları değiştirir ve özel ahşap veya metal işleme aletleri kullanır.",
      "Testler gerçekleştirir, bileşenleri hizalar ve akustik veya elektriksel parametreleri doğrular."
    ],
    duties_zh: [
      "制作、改装、修理和调试弦乐、管乐、打击乐或电子乐器。",
      "修复老式乐器，更换磨损部件，并使用专业的木工或金属加工工具。",
      "进行测试、对齐组件并验证声学或电气参数。"
    ]
  },
  "211213": {
    title_tr: "Müzisyen (Enstrümantalist)",
    title_zh: "乐器演奏家",
    duties: [
      "Plays musical instruments in performances, recitals, concerts or recording sessions.",
      "Practices repertoire, collaborates with conductors, composers and other musicians.",
      "Represents their ensemble in promotional events and records studio tracks."
    ],
    duties_tr: [
      "Performanslarda, resitallerde, konserlerde veya kayıt oturumlarında müzik aletleri çalar.",
      "Repertuvar pratiği yapar, şeflerle, bestecilerle ve diğer müzisyenlerle iş birliği yapar.",
      "Tanıtım etkinliklerinde topluluklarını temsil eder ve stüdyo kayıtları gerçekleştirir."
    ],
    duties_zh: [
      "在演出、独奏会、音乐会或录音会议中演奏乐器。",
      "练习曲目，与指挥、作曲家和其他乐手合作。",
      "在推广活动中代表其乐团并录制录音室单曲。"
    ]
  },
  "212412": {
    title_tr: "Gazete veya Dergi Editörü / Genel Yayın Yönetmeni",
    title_zh: "报纸或期刊编辑",
    duties: [
      "Directs, plans and coordinates editorial policies and content of newspapers or periodicals.",
      "Assigns stories, reviews drafts, edits articles and manages layout design.",
      "Liaises with journalists, writers, production staff and ensures compliance with publishing laws."
    ],
    duties_tr: [
      "Gazete veya dergilerin editoryal politikalarını ve içeriğini yönlendirir, planlar ve koordine eder.",
      "Haber görevleri verir, taslakları inceler, makaleleri düzenler ve sayfa düzeni tasarımını yönetir.",
      "Gazetecilerle, yazarlarla, yapım personeliyle iletişim kurar ve yayıncılık yasalarına uyumu sağlar."
    ],
    duties_zh: [
      "指导、规划和协调报纸或期刊的编辑方针和内容。",
      "派发报道任务、审查草稿、编辑文章并管理版面设计。",
      "与记者、撰稿人、制作人员联络并确保符合出版法律。"
    ]
  },
  "362411": {
    title_tr: "Fidancı (Bitki Yetiştiricisi)",
    title_zh: "苗圃工",
    duties: [
      "Plants, propagates and cultivates trees, shrubs, seeds and ornamental plants.",
      "Monitors plant health, manages watering, fertilizing, weeding and pest control.",
      "Prepares soil, potting mixes, operates greenhouse systems and assists customers."
    ],
    duties_tr: [
      "Ağaçları, çalıları, tohumları ve süs bitkilerini diker, çoğaltır ve yetiştirir.",
      "Bitki sağlığını izler, sulamayı, gübrelemeyi, yabani ot kontrolünü ve haşere mücadelesini yöneter.",
      "Toprağı ve saksı karışımlarını hazırlar, sera sistemlerini çalıştırır ve müşterilere yardımcı olur."
    ],
    duties_zh: [
      "种植、繁殖和培育树木、灌木、种子和观赏植物。",
      "监测植物健康，管理浇水、施肥、除草和病虫害防治。",
      "准备土壤、盆栽混合土，操作温室系统并协助客户。"
    ]
  },
  "134212": {
    title_tr: "Klinik Hemşirelik Direktörü",
    title_zh: "护理临床总监",
    duties: [
      "Plans, directs and coordinates nursing clinical services and operational standards.",
      "Manages clinical nursing budgets, staffing, training and quality improvement programs.",
      "Ensures clinic compliance with health regulations, safety protocols and care policies."
    ],
    duties_tr: [
      "Klinik hemşirelik hizmetlerini ve operasyonel standartları planlar, yönlendirir ve koordine eder.",
      "Klinik hemşirelik bütçelerini, personel planlamasını, eğitimi ve kalite iyileştirme programlarını yönetir.",
      "Kliniğin sağlık düzenlemelerine, güvenlik protokollerine ve bakım politikalarına uyumunu sağlar."
    ],
    duties_zh: [
      "规划、指导和协调护理临床服务和运营标准。",
      "管理临床护理预算、人员配备、培训和质量改进计划。",
      "确保门诊合规性符合卫生法规、安全协议和护理政策。"
    ]
  },
  "253913": {
    title_tr: "Kadın Hastalıkları ve Doğum Uzmanı",
    title_zh: "妇产科医生",
    duties: [
      "Provides medical care to pregnant women, delivers babies and treats female reproductive disorders.",
      "Performs surgical procedures, prenatal assessments and gynaecological treatments.",
      "Consults with patients, orders diagnostic tests and develops comprehensive treatment plans."
    ],
    duties_tr: [
      "Hamile kadınlara tıbbi bakım sağlar, doğum yaptırır ve kadın üreme sistemi bozukluklarını tedavi eder.",
      "Cerrahi prosedürler, doğum öncesi değerlendirmeler ve jinekolojik tedaviler gerçekleştirir.",
      "Hastalarla görüşür, teşhis testleri ister ve kapsamlı tedavi planları geliştirir."
    ],
    duties_zh: [
      "为孕妇提供医疗照护、接生，并治疗女性生殖系统疾病。",
      "执行外科手术、产前评估和妇科治疗。",
      "咨询患者，开具诊断测试并制定综合治疗计划。"
    ]
  },
  "251312": {
    title_tr: "İş Sağlığı ve Güvenliği (İSG) Uzmanı / Danışmanı",
    title_zh: "职业健康与安全顾问",
    duties: [
      "Develops, implements and audits occupational health and safety policies and procedures.",
      "Conducts workplace risk assessments, hazard investigations and training sessions.",
      "Ensures compliance with health and safety legislation and logs incident reports."
    ],
    duties_tr: [
      "İş sağlığı ve güvenliği politikalarını ve prosedürlerini geliştirir, uygular ve denetler.",
      "İş yeri risk değerlendirmeleri, tehlike araştırmaları ve eğitim oturumları düzenler.",
      "İş sağlığı ve güvenliği mevzuatına uyumu sağlar ve vaka raporlarını kaydeder."
    ],
    duties_zh: [
      "制定、实施和审核职业健康与安全政策及程序。",
      "进行工作场所风险评估、危害调查和培训会议。",
      "确保遵守健康与安全法规，并记录事故报告。"
    ]
  },
  "512111": {
    title_tr: "Ofis / Büro Yöneticisi",
    title_zh: "办公室经理",
    duties: [
      "Coordinates and manages administrative and daily operations of an office.",
      "Oversees reception staff, office supplies, file systems and scheduling.",
      "Liaises with vendors, handles correspondence and ensures facility safety compliance."
    ],
    duties_tr: [
      "Bir ofisin idari ve günlük operasyonlarını koordine eder ve yönetir.",
      "Resepsiyon personelini, ofis malzemelerini, dosya sistemlerini ve programlamayı denetler.",
      "Tedarikçilerle iletişim kurar, yazışmaları yürütür ve tesis güvenlik kurallarına uyumu sağlar."
    ],
    duties_zh: [
      "协调和管理办公室的行政和日常运营。",
      "监督接待员工、办公用品、档案系统和日常排班。",
      "与供应商联络，处理往来信件并确保场所安全合规。"
    ]
  },
  "253914": {
    title_tr: "Göz Hastalıkları Uzmanı (Oftalmolog)",
    title_zh: "眼科医生",
    duties: [
      "Diagnoses and treats diseases, injuries and structural disorders of the eye.",
      "Performs ophthalmic surgeries, laser treatments and prescribes corrective lenses.",
      "Consults with patients, reviews scans and collaborates with optometrists."
    ],
    duties_tr: [
      "Göz hastalıklarını, yaralanmalarını ve yapısal bozukluklarını teşhis ve tedavi eder.",
      "Göz ameliyatları, lazer tedavileri gerçekleştirir ve düzeltici cam/lens reçete eder.",
      "Hastalarla görüşür, taramaları inceler ve optisyenlerle/optometristlerle iş birliği yapar."
    ],
    duties_zh: [
      "诊断和治疗眼睛的疾病、损伤和结构障碍。",
      "执行眼科手术、激光治疗并开具矫正眼镜处方。",
      "咨询患者、审查扫描结果并与验光师合作。"
    ]
  },
  "399913": {
    title_tr: "Gözlükçü / Optisyen (Optik Dispanser)",
    title_zh: "眼镜配镜师（澳）/ 配镜师（新）",
    duties: [
      "Interprets optical prescriptions, measures clients and fits spectacle lenses and frames.",
      "Advises clients on lens types, frame styles, coatings and contact lenses.",
      "Verifies compliance of finished products against optical specifications and fits adjustments."
    ],
    duties_tr: [
      "Optik reçeteleri yorumlar, müşterilerin ölçülerini alır; gözlük camlarını ve çerçevelerini uyarlar.",
      "Müşterilere cam türleri, çerçeve stilleri, kaplamalar ve kontakt lensler hakkında danışmanlık yapar.",
      "Bitmiş ürünlerin optik spesifikasyonlara uygunluğunu doğrular ve ayarlamalar yapar."
    ],
    duties_zh: [
      "解读光学处方，测量客户尺寸并装配眼镜片和镜框。",
      "就镜片类型、镜框款式、涂层和隐形眼镜向客户提供建议。",
      "验证成品是否符合光学规范并进行适配调整。"
    ]
  },
  "399914": {
    title_tr: "Gözlük Camı Teknisyeni / Mekanikeri",
    title_zh: "配镜机械工",
    duties: [
      "Grinds, polishes, cuts and shapes optical glass or plastic lenses to prescriptions.",
      "Operates lens surfacing, edging machinery and verifies optical power parameters.",
      "Mounts lenses into frames, performs repairs and maintains optical workshop equipment."
    ],
    duties_tr: [
      "Optik cam veya plastik lensleri reçetelere göre taşlar, parlatır, keser ve şekillendirir.",
      "Lens yüzey işleme ve kenar kesme makinelerini çalıştırır; optik güç parametrelerini doğrular.",
      "Lensleri çerçevelere monte eder, onarımları yapar ve optik atölye ekipmanlarının bakımını yürütür."
    ],
    duties_zh: [
      "根据处方研磨、抛光、切割和塑造光学玻璃或塑料镜片。",
      "操作镜片表面加工、磨边机械并验证光焦度参数。",
      "将镜片装配到镜框中，进行修理并维护光学车间设备。"
    ]
  },
  "224712": {
    title_tr: "Organizasyon ve Metot Analisti",
    title_zh: "组织和方法分析师",
    duties: [
      "Studies organisational structures, workflows and methods to improve efficiency.",
      "Conducts time and motion studies, audits workflows and designs procedural manuals.",
      "Recommends structural changes, automation options and monitors implementation."
    ],
    duties_tr: [
      "Verimliliği artırmak için organizasyonel yapıları, iş akışlarını ve yöntemleri inceler.",
      "Zaman ve hareket etütleri yapar, iş akışlarını denetler ve prosedür kılavuzları tasarlar.",
      "Yapısal değişiklikler, otomasyon seçenekleri önerir ve uygulamayı izler."
    ],
    duties_zh: [
      "研究组织结构、工作流程和方法以提高效率。",
      "开展时间和动作研究，审计工作流程并设计程序手册。",
      "推荐结构变革、自动化方案并监控实施情况。"
    ]
  },
  "312914": {
    title_tr: "Diğer Teknik Ressamlar (bhk)",
    title_zh: "其他绘图员",
    duties: [
      "Prepares technical drawings, schematics and maps for specialized fields not elsewhere classified.",
      "Works from engineering notes and sketches using CAD systems.",
      "Ensures drawing compliance with industry standards, symbols and specifications."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış uzmanlık alanları için teknik çizimler, şemalar ve haritalar hazırlar.",
      "Mühendislik notlarından ve taslaklarından yola çıkarak CAD sistemlerini kullanarak çalışır.",
      "Çizimlerin sektör standartlarına, sembollerine ve spesifikasyonlarına uygunluğunu sağlar."
    ],
    duties_zh: [
      "为未另分类的专业领域准备技术图纸、原理图和地图。",
      "根据工程笔记和草图，使用CAD系统进行绘图。",
      "确保图纸符合行业标准、符号和规范。"
    ]
  },
  "452317": {
    title_tr: "Diğer Spor Antrenörleri veya Eğitmenleri (bhk)",
    title_zh: "其他体育教练或导师",
    duties: [
      "Teaches sporting techniques, safety rules and coordinates training for specialized sports.",
      "Supervises training sessions, monitors safety and sets up training facilities.",
      "Prepares athletes or teams for sporting events, assessments and grading."
    ],
    duties_tr: [
      "Özel spor dalları için spor tekniklerini, güvenlik kurallarını öğretir ve antrenmanları koordine eder.",
      "Antrenman seanslarını denetler, güvenliği izler ve antrenman tesislerini kurar.",
      "Sporcuları veya takımları spor etkinliklerine, değerlendirmelerine ve derecelendirmelerine hazırlar."
    ],
    duties_zh: [
      "向学生传授体育技巧、安全规则并协调专业体育训练。",
      "监督训练课程、监控安全并布置训练设施。",
      "指导运动员或团队准备体育赛事、评估和分级。"
    ]
  },
  "452323": {
    title_tr: "Diğer Spor Hakemleri / Görevlileri (bhk)",
    title_zh: "其他体育官员",
    duties: [
      "Enforces rules, regulations and standards at sporting events not elsewhere classified.",
      "Inspects sports fields, playing gear, sports equipment and monitors player safety.",
      "Monitors competitions, declares official results and investigates rule breaches."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış spor etkinliklerinde kuralları, yönetmelikleri ve standartları uygular.",
      "Spor alanlarını, oyun malzemelerini, spor ekipmanlarını denetler ve oyuncu güvenliğini izler.",
      "Müsabakaları izler, resmi sonuçları ilan eder ve kural ihlallerini araştırır."
    ],
    duties_zh: [
      "在未另分类的体育赛事中执行规则、法规和标准。",
      "检查运动场地、比赛用具、体育设备并监控运动员安全。",
      "监督比赛，公布官方结果并调查违规行为。"
    ]
  },
  "253515": {
    title_tr: "Kulak Burun Boğaz (KBB) Hastalıkları Uzmanı",
    title_zh: "耳鼻喉科医生",
    duties: [
      "Diagnoses and treats diseases and disorders of the ear, nose, throat, head and neck.",
      "Performs surgical procedures, scopes and specialized ENT clinical interventions.",
      "Consults with patients, orders diagnostic scans and designs care plans."
    ],
    duties_tr: [
      "Kulak, burun, boğaz, baş ve boyun hastalıklarını ve bozukluklarını teşhis ve tedavi eder.",
      "Cerrahi prosedürler, endoskopik incelemeler ve özel KBB klinik müdahaleleri gerçekleştirir.",
      "Hastalarla görüşür, teşhis amaçlı taramalar ister ve bakım planları tasarlar."
    ],
    duties_zh: [
      "诊断和治疗耳、鼻、喉、头颈部的疾病与障碍。",
      "执行外科手术、内窥镜检查和专业的耳鼻喉科临床干预。",
      "咨询患者，开具诊断性扫描并设计治疗计划。"
    ]
  },
  "253516": {
    title_tr: "Çocuk Cerrahisi Uzmanı",
    title_zh: "小儿外科医生",
    duties: [
      "Performs surgical procedures on fetuses, infants, children and adolescents.",
      "Diagnoses congenital anomalies, injuries, tumors and develops pediatric care plans.",
      "Consults with families, pediatricians and manages post-operative recovery."
    ],
    duties_tr: [
      "Fetüsler, bebekler, çocuklar ve ergenler üzerinde cerrahi prosedürler gerçekleştirir.",
      "Doğuştan gelen anomalileri, yaralanmaları, tümörleri teşhis eder ve pediyatrik bakım planları geliştirir.",
      "Ailelerle, çocuk doktorlarıyla görüşür ve ameliyat sonrası iyileşme sürecini yönetir."
    ],
    duties_zh: [
      "对胎儿、婴儿、儿童和青少年执行外科手术。",
      "诊断先天性畸形、损伤、肿瘤并制定儿科护理计划。",
      "咨询患者家属、儿科医生并管理术后康复。"
    ]
  },
  "211411": {
    title_tr: "Ressam (Görsel Sanatlar)",
    title_zh: "画家（视觉艺术）",
    duties: [
      "Creates visual artworks using paints, oils, watercolours or other media.",
      "Develops design concepts, selects surfaces, prepares canvasses and applies paints.",
      "Exhibits artworks in galleries, negotiates sales and participates in promotion."
    ],
    duties_tr: [
      "Boyalar, yağlı boyalar, sulu boyalar veya diğer ortamları kullanarak görsel sanat eserleri oluşturur.",
      "Tasarım konseptleri geliştirir, yüzeyleri seçer, tuvalleri hazırlar ve boya uygular.",
      "Sanat eserlerini galerilerde sergiler, satışları müzakere eder ve tanıtımlara katılır."
    ],
    duties_zh: [
      "使用油漆、油画颜料、水彩或其他介质创作视觉艺术作品。",
      "开发设计概念、选择载体表面、准备画布并进行涂绘。",
      "在画廊展出艺术品、洽谈销售并参与推广活动。"
    ]
  },
  "224914": {
    title_tr: "Patent Uzmanı / İncelemecisi",
    title_zh: "专利审查员",
    duties: [
      "Investigates patent applications to verify compliance with laws and regulations.",
      "Conducts searches of patent databases and technical literature to verify novelty.",
      "Prepares reports, grants patents or issues reasons for rejection."
    ],
    duties_tr: [
      "Yasalara ve yönetmeliklere uygunluğunu doğrulamak için patent başvurularını araştırır.",
      "Yeniliği doğrulamak için patent veri tabanlarında ve teknik literatürde araştırmalar yapar.",
      "Raporlar hazırlar, patentleri onaylar veya ret gerekçelerini düzenler."
    ],
    duties_zh: [
      "审查专利申请以验证其是否符合法律法规。",
      "检索专利数据库和技术文献以核实新颖性。",
      "编写报告，授予专利权或说明驳回理由。"
    ]
  },
  "261317": {
    title_tr: "Sızma Testi Uzmanı (Penetration Tester)",
    title_zh: "渗透测试员",
    duties: [
      "Conducts authorized security tests on systems, networks and application interfaces.",
      "Identifies cyber security vulnerabilities, designs threat vectors and exploits faults.",
      "Prepares pentest reports, safety ratings and recommends remediation guidelines."
    ],
    duties_tr: [
      "Sistemler, ağlar ve uygulama arayüzleri üzerinde yetkili güvenlik testleri gerçekleştirir.",
      "Siber güvenlik açıklarını tanımlar, tehdit vektörleri tasarlar ve hatalardan yararlanır (exploit).",
      "Sızma testi raporları, güvenlik derecelendirmeleri hazırlar ve iyileştirme yönergeleri önerir."
    ],
    duties_zh: [
      "对系统、网络和应用程序接口进行授权安全测试。",
      "识别网络安全漏洞、设计威胁向量并利用漏洞。",
      "编写渗透测试报告、安全评级并推荐修复指南。"
    ]
  },
  "399599": {
    title_tr: "Sahne Sanatları Teknisyenleri (bhk)",
    title_zh: "表演艺术技术员（其他）",
    duties: [
      "Performs technical tasks for stage, film or television not elsewhere classified.",
      "Sets up props, stage dressings, handles scenery and coordinates production crew.",
      "Operates stage machinery, visual cues and assists with facility safety compliance."
    ],
    duties_tr: [
      "Sahne, film veya televizyon için başka yerde sınıflandırılmamış teknik görevleri yerine getirir.",
      "Aksesuarları, sahne dekorlarını kurar, dekoru taşır ve yapım ekibini koordine eder.",
      "Sahne makinelerini, görsel işaretleri çalıştırır ve tesis güvenlik kurallarına uyuma yardımcı olur."
    ],
    duties_zh: [
      "为舞台、电影或电视执行未另分类的技术任务。",
      "布置道具、舞台陈设、搬运布景并协调制作人员。",
      "操作舞台机械、视觉信号并协助场所安全合规。"
    ]
  },
  "521111": {
    title_tr: "Kişisel Asistan / Özel Kalem",
    title_zh: "个人助理",
    duties: [
      "Provides administrative, operational and scheduling support to managers or executives.",
      "Manages diaries, emails, arranges appointments, travel and coordinates meetings.",
      "Prepares briefs, correspondence, logs expenses and coordinates office files."
    ],
    duties_tr: [
      "Yöneticilere idari, operasyonel ve takvim planlama desteği sağlar.",
      "Günlükleri, e-postaları yönetir, randevuları, seyahatleri ayarlar ve toplantıları koordine eder.",
      "Bilgi notları, yazışmalar hazırlar, giderleri kaydeder ve ofis dosyalarını koordine eder."
    ],
    duties_zh: [
      "为经理或高管提供行政、运营和日程排班支持。",
      "管理日程、电子邮件，安排会面、行程并协调会议。",
      "准备简报、往来信件、记录费用并协调办公室档案。"
    ]
  },
  "361113": {
    title_tr: "Evcil Hayvan Kuaförü (Pet Groomer)",
    title_zh: "宠物美容师",
    duties: [
      "Cuts, grooms, bathes and styles coats of domestic pets, primarily dogs.",
      "Inspects pets for skin issues, cuts nails, cleans ears and monitors health issues.",
      "Cleans and disinfects grooming tools, styling tables and salon infrastructure."
    ],
    duties_tr: [
      "Başta köpekler olmak üzere evcil hayvanların tüylerini keser, bakımını yapar, yıkar ve şekillendirir.",
      "Evcil hayvanları cilt sorunları açısından inceler, tırnaklarını keser, kulaklarını temizler ve sağlık sorunlarını izler.",
      "Tıraş/bakım aletlerini, şekillendirme masalarını ve salon altyapısını temizler ve dezenfekte eder."
    ],
    duties_zh: [
      "为家养宠物（主要是犬只）进行剪毛、美容、洗澡和造型。",
      "检查宠物是否有皮肤问题、剪指甲、清理耳朵并监测健康状况。",
      "清洁并消毒美容工具、造型台和沙龙设施。"
    ]
  },
  "399915": {
    title_tr: "Fotoğrafçı Asistanı",
    title_zh: "摄影师助理",
    duties: [
      "Sets up and positions cameras, lights, reflectors and backdrops for photo shoots.",
      "Handles, packs, stores and assists in maintaining photography equipment.",
      "Assists with lighting adjustments, visual cues and basic image processing."
    ],
    duties_tr: [
      "Fotoğraf çekimleri için kameraları, ışıkları, reflektörleri ve fonları kurar ve konumlandırır.",
      "Fotoğraf ekipmanlarını taşır, paketler, depolar ve bakımına yardımcı olur.",
      "Işık ayarlarına, görsel ipuçlarına ve temel görüntü işlemeye yardımcı olur."
    ],
    duties_zh: [
      "为照片拍摄安装和摆放相机、灯光、反光板和背景幕。",
      "搬运、包装、储存并协助维护摄影设备。",
      "协助调整灯光、视觉信号和基础图像处理。"
    ]
  },
  "394212": {
    title_tr: "Resim Çerçevecisi",
    title_zh: "画框制作工",
    duties: [
      "Fabricates, alters, repairs and installs custom frames for pictures or art.",
      "Measures pictures, cuts mountboards, glass, backings and joins frame moldings.",
      "Mounts pictures, seals backings and fits adjustments using specialized hand tools."
    ],
    duties_tr: [
      "Resimler veya sanat eserleri için özel çerçeveler imal eder, değiştirir, onarır ve kurar.",
      "Resimleri ölçer, mukavvaları, camları, arkalıkları keser ve çerçeve çıtalarını birleştirir.",
      "Resimleri monte eder, arkalıkları kapatır ve özel el aletleri kullanarak ayarlamalar yapar."
    ],
    duties_zh: [
      "为照片或艺术品制作、改装、修理和安装定制画框。",
      "测量照片、裁剪卡纸、玻璃、背板并拼接框架线条。",
      "使用专业手工工具装裱图片、密封背板并进行微调。"
    ]
  },
  "121318": {
    title_tr: "Domuz Yetiştiricisi",
    title_zh: "生猪养殖户",
    duties: [
      "Breeds, raises and manages pigs for pork, bacon or breeding stock.",
      "Monitors pig health, nutrition, coordinates feeding and veterinary care.",
      "Manages farm waste systems, fences, equipment and coordinates product marketing."
    ],
    duties_tr: [
      "Domuz eti, pastırma veya damızlık stok için domuz üretir, yetiştirir ve yönetir.",
      "Domuz sağlığını, beslenmesini izler, beslemeyi ve veteriner bakımını koordine eder.",
      "Çiftlik atık sistemlerini, çitleri, ekipmanları yönetir ve ürün pazarlamasını koordine eder."
    ],
    duties_zh: [
      "繁育、饲养和管理生猪，以获取猪肉、培根或种猪。",
      "监测猪只健康、营养，协调喂养和兽医护理。",
      "管理农场排污系统、围栏、设备并协调产品销售。"
    ]
  },
  "253517": {
    title_tr: "Plastik, Rekonstrüktif ve Estetik Cerrahi Uzmanı",
    title_zh: "整形与重建外科医生",
    duties: [
      "Performs surgical procedures to reconstruct or restore physical form and function.",
      "Diagnoses tissue anomalies, injuries, burns, deformities and designs care plans.",
      "Consults with patients, performs aesthetic surgeries and manages post-operative recovery."
    ],
    duties_tr: [
      "Fiziksel form ve fonksiyonu yeniden yapılandırmak veya geri kazandırmak için cerrahi prosedürler gerçekleştirir.",
      "Doku anomalilerini, yaralanmaları, yanıkları, deformiteleri teşhis eder ve bakım planları tasarlar.",
      "Hastalarla görüşür, estetik ameliyatlar gerçekleştirir ve ameliyat sonrası iyileşme sürecini yönetir."
    ],
    duties_zh: [
      "执行外科手术以重建或恢复身体外形和功能。",
      "诊断组织异常、损伤、烧伤、畸形并制定治疗计划。",
      "咨询患者，进行美容外科手术并管理术后康复。"
    ]
  },
  "399916": {
    title_tr: "Plastik Teknisyeni",
    title_zh: "塑料技术员",
    duties: [
      "Operates plastics manufacturing machinery to fabricate and shape plastic items.",
      "Sets up injection molding, extrusion tools and monitors process parameters.",
      "Inspects finished parts, checks dimensions compliance and repairs imperfections."
    ],
    duties_tr: [
      "Plastik ürünleri üretmek ve şekillendirmek için plastik imalat makinelerini çalıştırır.",
      "Enjeksiyon kalıplama, ekstrüzyon aletlerini kurar ve işlem parametrelerini izler.",
      "Bitmiş parçaları inceler, boyutlara uygunluğu kontrol eder ve kusurları onarır."
    ],
    duties_zh: [
      "操作塑料制造机械以制造和塑造塑料物品。",
      "设置注塑、挤出模具并监控工艺参数。",
      "检查成品、检查尺寸符合性并修复缺陷。"
    ]
  },
  "312115": {
    title_tr: "Tesisat Denetçisi / Müfettişi",
    title_zh: "管道检查员",
    duties: [
      "Inspects and reviews plumbing installations to verify compliance with laws and codes.",
      "Conducts site audits, reviews schematics, blueprints and performs pressure tests.",
      "Prepares inspection reports, logs breaches and certifies system compliance."
    ],
    duties_tr: [
      "Yasalara ve kurallara uygunluğu doğrulamak için sıhhi tesisat kurulumlarını denetler ve inceler.",
      "Saha denetimleri yürütür, şemaları, projeleri inceler ve basınç testleri gerçekleştirir.",
      "Denetim raporları hazırlar, ihlalleri kaydeder ve sistem uygunluğunu onaylar."
    ],
    duties_zh: [
      "检查和评估管道安装，以验证其是否符合法律和规范。",
      "进行现场审计、审查原理图、蓝图并进行压力测试。",
      "编写检查报告、记录违规行为并认证系统合规性。"
    ]
  },
  "224412": {
    title_tr: "Politika Analisti",
    title_zh: "政策分析师",
    duties: [
      "Conducts research and provides advice on government policies, laws and programs.",
      "Develops, reviews and evaluates policy frameworks, options and strategic plans.",
      "Liaises with government departments, community groups and stakeholders."
    ],
    duties_tr: [
      "Devlet politikaları, yasaları ve programları hakkında araştırmalar yapar ve tavsiyelerde bulunur.",
      "Politika çerçevelerini, seçeneklerini ve stratejik planları geliştirir, inceler ve değerlendirir.",
      "Devlet daireleri, topluluk grupları ve paydaşlarla iletişim kurar."
    ],
    duties_zh: [
      "开展研究并就政府政策、法律和项目提供建议。",
      "制定、审查和评估政策框架、可选方案和战略规划。",
      "与政府部门、社区团体和利益相关者联络。"
    ]
  },
  "132411": {
    title_tr: "Politika ve Planlama Müdürü",
    title_zh: "政策和规划经理",
    duties: [
      "Plans, directs and coordinates policy development and strategic planning of organisations.",
      "Manages policy budgets, staff, resources and coordinates program implementation.",
      "Liaises with government, community groups and stakeholders."
    ],
    duties_tr: [
      "Kuruluşların politika geliştirmesini ve stratejik planlamasını planlar, yönlendirir ve koordine eder.",
      "Politika bütçelerini, personelini, kaynaklarını yönetir ve program uygulamasını koordine eder.",
      "Hükümet, topluluk grupları ve paydaşlarla iletişim kurar."
    ],
    duties_zh: [
      "规划、指导和协调机构的政策制定及战略规划。",
      "管理政策预算、人员、资源并协调项目实施。",
      "与政府、社区团体和利益相关者联络。"
    ]
  }
};

const FILE_PATH = path.join(process.cwd(), "src/data/anzsco-list.json");
const list = JSON.parse(readFileSync(FILE_PATH, "utf8")) as SearchEntry[];

let updatedCount = 0;
for (const entry of list) {
  const batchData = BATCH_4_DATA[entry.code];
  if (batchData) {
    Object.assign(entry, batchData);
    updatedCount += 1;
  }
}

writeFileSync(FILE_PATH, JSON.stringify(list, null, 2));
console.log(`Successfully updated ${updatedCount} entries in anzsco-list.json.`);
