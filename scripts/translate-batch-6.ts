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

const BATCH_6_DATA: Record<string, Partial<SearchEntry>> = {
  "333311": {
    title_tr: "Çatı Kiremitçisi",
    title_zh: "屋顶挂瓦工",
    duties: [
      "Lays clay, concrete and slate tiles on roof structures to provide weatherproofing.",
      "Cuts tiles to fit corners, ridges, hips and aligns structures with roofing paper.",
      "Inspects roofing frames, secures tiles with clips, nails and applies sealing mortars."
    ],
    duties_tr: [
      "Hava geçirmezlik sağlamak amacıyla çatı yapılarına kil, beton ve arduvaz kiremitler döşer.",
      "Köşelere, mahyalara ve eğim hatlarına uyması için kiremitleri keser ve yapıları çatı kaplama kağıdı ile hizalar.",
      "Çatı karkasını inceler, kiremitleri klipslerle, çivilerle sabitler ve sızdırmazlık harcı uygular."
    ],
    duties_zh: [
      "在屋顶结构上铺设粘土、混凝土和石板瓦，以提供防风雨保护。",
      "切割瓦片以适应角落、屋脊、屋谷，并将瓦片与屋顶防水纸对齐。",
      "检查屋顶框架，用卡子、钉子固定瓦片并抹密封砂浆。"
    ]
  },
  "225411": {
    title_tr: "Endüstriyel Ürünler Satış Temsilcisi",
    title_zh: "销售代表（工业产品）",
    duties: [
      "Sells specialized industrial machinery, chemicals, materials and equipment to business clients.",
      "Identifies industrial buyer needs, prepares product proposals, quotes and delivers presentations.",
      "Manages corporate relationships, monitors sales targets and competitor pricing lines."
    ],
    duties_tr: [
      "Kurumsal müşterilere özel endüstriyel makineler, kimyasallar, malzemeler ve ekipmanlar satar.",
      "Endüstriyel alıcıların ihtiyaçlarını belirler, ürün teklifleri ve fiyat teklifleri hazırlar ve sunumlar yapar.",
      "Kurumsal ilişkileri yönetir, satış hedeflerini ve rakip fiyatlandırma politikalarını takip eder."
    ],
    duties_zh: [
      "向企业客户销售专业工业机械、化学品、原材料和设备。",
      "识别工业客户的需求，准备产品建议书、报价并进行产品演示。",
      "管理大客户关系，监控销售目标和竞争对手的定价机制。"
    ]
  },
  "323315": {
    title_tr: "Testere Bakım Ustası (Saw Doctor)",
    title_zh: "锯床修整工",
    duties: [
      "Fabricates, repairs, sharpens and aligns blades for timber saws and mill machinery.",
      "Sets saw teeth, welds cracks, replaces worn guides and runs machine calibrations.",
      "Inspects saw blades for defects, straightens surfaces and monitors safety compliance."
    ],
    duties_tr: [
      "Ahşap testereleri ve hızar makineleri için bıçakları imal eder, onarır, keskinleştirir ve hizalar.",
      "Testere dişlerini ayarlar, çatlakları kaynak yapar, aşınmış kılavuzları değiştirir ve makine kalibrasyonlarını çalıştırır.",
      "Testere bıçaklarını kusurlar açısından inceler, yüzeyleri düzeltir ve güvenlik standartlarına uyumu izler."
    ],
    duties_zh: [
      "制作、修理、磨锐和校准木锯和锯木厂机械的锯条。",
      "拨料整齿、焊接裂纹、更换磨损的导轨并运行机器校准。",
      "检查锯条是否存在缺陷、平整表面并监控安全合规。"
    ]
  },
  "311499": {
    title_tr: "Diğer Fen Bilimleri Teknisyenleri (bhk)",
    title_zh: "科学技术员（其他）",
    duties: [
      "Performs laboratory support and testing tasks for scientific disciplines not elsewhere classified.",
      "Prepares chemical samples, calibrates instruments, records data and aligns with lab protocols.",
      "Ensures laboratory sanitation, safety standards and manages supply inventory logs."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış bilimsel disiplinler için laboratuvar destek ve test görevlerini yerine getirir.",
      "Kimyasal numuneleri hazırlar, cihazları kalibre eder, verileri kaydeder ve laboratuvar protokollerine uyar.",
      "Laboratuvar sanitasyonunu, güvenlik standartlarını sağlar ve malzeme envanter kayıtlarını yönetir."
    ],
    duties_zh: [
      "执行未另分类的科学学科的实验室支持和检测任务。",
      "制备化学样品、校准仪器、记录数据并遵循实验室方案。",
      "确保实验室卫生、安全标准，并管理供应库存日志。"
    ]
  },
  "392112": {
    title_tr: "Serigraf Baskıcı / Elemanı",
    title_zh: "丝网印刷工",
    duties: [
      "Sets up and operates screen printing presses to apply designs to textiles, plastic or paper.",
      "Prepares stencils, screens, aligns print substrates, mixes inks and adjusts presses.",
      "Maintains screen printing machinery, cleans screens, and checks finished print quality."
    ],
    duties_tr: [
      "Tekstil, plastik veya kağıt üzerine tasarımlar uygulamak için serigrafi baskı makinelerini kurar ve çalıştırır.",
      "Şablonları, elekleri hazırlar, baskı alt katmanlarını hizalar, mürekkepleri karıştırır ve makineleri ayarlar.",
      "Serigrafi baskı makinelerinin bakımını yapar, elekleri temizler ve bitmiş baskı kalitesini kontrol eder."
    ],
    duties_zh: [
      "设置并操作丝网印刷机，将设计图案印制到纺织品、塑料或纸张上。",
      "准备网版、对齐印刷承印物、调配油墨并调节印刷机。",
      "维护丝网印刷机械、清洁网版并检查成品印刷质量。"
    ]
  },
  "211413": {
    title_tr: "Heykeltıraş",
    title_zh: "雕塑家",
    duties: [
      "Creates three-dimensional artworks using stone, wood, clay, metal or other media.",
      "Develops design concepts, selects materials, carves, models or casts structures.",
      "Exhibits sculptures in galleries, negotiates sales and participates in promotional events."
    ],
    duties_tr: [
      "Taş, ahşap, kil, metal veya diğer malzemeleri kullanarak üç boyutlu sanat eserleri oluşturur.",
      "Tasarım konseptleri geliştirir, malzemeleri seçer, yapıları yontar, modeller veya döker.",
      "Heykelleri galerilerde sergiler, satışları müzakere eder ve tanıtım etkinliklerine katılır."
    ],
    duties_zh: [
      "使用石头、木头、粘土、金属或其他介质创作三维艺术品。",
      "开发设计概念、选择材料、雕刻、塑造或铸造结构。",
      "在画廊展出雕塑作品、洽谈销售并参与推广活动。"
    ]
  },
  "521211": {
    title_tr: "Sekreter (Genel)",
    title_zh: "秘书（普通）",
    duties: [
      "Provides administrative and clerical support to office teams or departments.",
      "Manages correspondence, files records, answers phones and schedules appointments.",
      "Arranges meeting rooms, types documents, reviews billing and handles post distribution."
    ],
    duties_tr: [
      "Ofis ekiplerine veya departmanlarına idari ve büro desteği sağlar.",
      "Yazışmaları yönetir, kayıtları dosyalar, telefonları yanıtlar ve randevuları planlar.",
      "Toplantı salonlarını düzenler, belgeleri yazar, faturaları inceler ve posta dağıtımını yürütür."
    ],
    duties_zh: [
      "为办公室团队或部门提供行政和文秘支持。",
      "管理日常往来信件、归档记录、接听电话并安排预约。",
      "布置会议室、打印文档、审查账单并处理信件分发。"
    ]
  },
  "361211": {
    title_tr: "Kırkımcı (Hayvan Kırkım Elemanı)",
    title_zh: "剪羊毛工",
    duties: [
      "Shears wool from sheep, goats or llamas using specialized mechanical shears.",
      "Handles animals safely, avoids skin injuries, and grades wool fleeces.",
      "Cleans and sharpens shearing combs, cutters and maintains machinery safety compliance."
    ],
    duties_tr: [
      "Özel mekanik kırkma aletlerini kullanarak koyun, keçi veya lamalardan yün kırkar.",
      "Hayvanları güvenli bir şekilde tutar, cilt yaralanmalarını önler ve yün postları derecelendirir.",
      "Kırkma taraklarını ve bıçaklarını temizler, keskinleştirir ve makine güvenlik kurallarına uyumu sağlar."
    ],
    duties_zh: [
      "使用专业的机械剪毛器剪羊、山羊或美洲驼的毛。",
      "安全地对待动物、避免皮肤受伤，并对羊毛皮进行分级。",
      "清洁并磨锐剪毛梳子、刀片，并保持机械安全合规。"
    ]
  },
  "121322": {
    title_tr: "Koyun Yetiştiricisi",
    title_zh: "养羊户",
    duties: [
      "Breeds, raises and manages sheep for wool, meat or breeding stock.",
      "Monitors sheep health, nutrition, coordinates shearing, drenching and lambing.",
      "Manages farm pasture, fences, equipment and coordinates wool and meat marketing."
    ],
    duties_tr: [
      "Yün, et veya damızlık stok için koyun üretir, yetiştirir ve yönetir.",
      "Koyun sağlığını, beslenmesini izler, kırkım, ilaçlama (drenching) ve kuzulama işlemlerini koordine eder.",
      "Çiftlik merasını, çitleri, ekipmanları yönetir ve yün ile et pazarlamasını koordine eder."
    ],
    duties_zh: [
      "繁育、饲养和管理羊群，以获取羊毛、羊肉或种羊。",
      "监测绵羊健康、营养，协调剪羊毛、驱虫和产羔。",
      "管理农场牧场、围栏、设备并协调羊毛和羊肉销售。"
    ]
  },
  "399611": {
    title_tr: "Tabelacı / Tabela Yazarı",
    title_zh: "广告牌绘写工",
    duties: [
      "Designs, fabricates and paints signs for buildings, vehicles, shops or boards.",
      "Prepares layout stencils, applies paint, gold leaf, vinyl lettering and mounts structures.",
      "Uses design software to draft signs, estimates material costs and checks safety."
    ],
    duties_tr: [
      "Binalar, araçlar, dükkanlar veya panolar için tabelalar tasarlar, imal eder ve boyar.",
      "Düzen şablonlarını hazırlar, boya, altın varak, folyo yazı uygular ve yapıları monte eder.",
      "Tabelaları tasarlamak için tasarım yazılımlarını kullanır, malzeme maliyetlerini tahmin eder ve güvenliği kontrol eder."
    ],
    duties_zh: [
      "为建筑物、车辆、商店或广告牌设计、制作和绘制招牌。",
      "准备布局模板、贴金箔、贴乙烯基字并安装结构件。",
      "使用设计软件草拟招牌、估算材料成本并检查安全。"
    ]
  },
  "392312": {
    title_tr: "Küçük Ofset Baskı Operatörü",
    title_zh: "小型胶印机操作工",
    duties: [
      "Sets up and operates small offset printing presses to print office stationery or booklets.",
      "Prepares paper, plates, monitors ink water balance and checks print quality.",
      "Maintains small offset machinery, cleans plates, and solves paper feed faults."
    ],
    duties_tr: [
      "Ofis kırtasiye malzemelerini veya kitapçıkları basmak için küçük ofset baskı makinelerini kurar ve çalıştırır.",
      "Kağıt ve kalıpları hazırlar, mürekkep-su dengesini izler ve baskı kalitesini kontrol eder.",
      "Küçük ofset makinelerinin bakımını yapar, kalıpları temizler ve kağıt besleme arızalarını çözer."
    ],
    duties_zh: [
      "设置并操作小型胶印机以印刷办公文具或小册子。",
      "准备纸张、印版，监控墨水/水平衡并检查印刷质量。",
      "维护小型胶印设备、清洁印版并解决送纸故障。"
    ]
  },
  "452314": {
    title_tr: "Kayak / Snowboard Eğitmeni",
    title_zh: "滑雪运动教练",
    duties: [
      "Teaches skiing, snowboarding techniques and safety rules to students.",
      "Supervises ski lessons, monitors mountain hazards and checks student equipment.",
      "Prepares students for snowsport assessments, events and monitors safety."
    ],
    duties_tr: [
      "Öğrencilere kayak, snowboard tekniklerini ve güvenlik kurallarını öğretir.",
      "Kayak derslerini denetler, dağ tehlikelerini izler ve öğrenci ekipmanlarını kontrol eder.",
      "Öğrencileri kış sporları değerlendirmelerine, etkinliklerine hazırlar ve güvenliği izler."
    ],
    duties_zh: [
      "向学生教授滑雪、单板滑雪技术和安全规则。",
      "监督滑雪课程、监控山地危险并检查学生装备。",
      "指导学生准备滑雪运动评估、赛事并监控安全。"
    ]
  },
  "272499": {
    title_tr: "Diğer Sosyal Bilim Profesyonelleri (bhk)",
    title_zh: "社会学专业人员（其他）",
    duties: [
      "Performs research, analysis or counselling tasks in social sciences not elsewhere classified.",
      "Conducts social studies, audits policy implications and designs intervention plans.",
      "Ensures compliance with ethical frameworks, standards and logs case records."
    ],
    duties_tr: [
      "Sosyal bilimlerde başka yerde sınıflandırılmamış araştırma, analiz veya danışmanlık görevlerini yerine getirir.",
      "Sosyal çalışmalar yürütür, politika etkilerini denetler ve müdahale planları tasarlar.",
      "Etik çerçevelere, standartlara uyumu sağlar ve vaka kayıtlarını tutar."
    ],
    duties_zh: [
      "执行未另分类的社会科学研究、分析或咨询任务。",
      "开展社会学研究、审计政策影响并设计干预计划。",
      "确保符合道德准则、标准并记录个案档案。"
    ]
  },
  "399516": {
    title_tr: "Ses Teknisyeni",
    title_zh: "音响技术员",
    duties: [
      "Sets up, operates and maintains sound recording and amplification equipment.",
      "Positions microphones, monitors audio levels, adjusts mixing consoles and records tracks.",
      "Collaborates with directors and performers to achieve the sound design specifications."
    ],
    duties_tr: [
      "Ses kayıt ve ses yükseltme (amplifikasyon) ekipmanlarını kurar, çalıştırır ve bakımını yapar.",
      "Mikrofonları konumlandırır, ses seviyelerini izler, miksaj konsollarını ayarlar ve kayıt yapar.",
      "Ses tasarımı spesifikasyonlarını elde etmek için yönetmenler ve icracılarla iş birliği yapar."
    ],
    duties_zh: [
      "安装、操作和维护录音及扩音设备。",
      "摆放麦克风、监控音频电平、调节调音台并录制轨道。",
      "与导演和演员合作，以实现音效设计规范。"
    ]
  },
  "241599": {
    title_tr: "Diğer Özel Eğitim Öğretmenleri (bhk)",
    title_zh: "特殊教育教师（其他）",
    duties: [
      "Teaches students with learning difficulties, physical or cognitive disabilities not elsewhere classified.",
      "Assesses students' learning needs, designs Individual Education Plans (IEPs) and monitors progress.",
      "Collaborates with medical professionals, psychologists, parents and adapts learning curricula."
    ],
    duties_tr: [
      "Öğrenme güçlüğü, fiziksel veya zihinsel engeli olan başka yerde sınıflandırılmamış öğrencilere eğitim verir.",
      "Öğrencilerin öğrenme ihtiyaçlarını değerlendirir, Bireyselleştirilmiş Eğitim Planları (BEP) tasarlar ve ilerlemeyi izler.",
      "Tıp uzmanları, psikologlar, veliler ile iş birliği yapar ve eğitim müfredatını uyarlar."
    ],
    duties_zh: [
      "向有学习困难、身体或认知障碍且未另分类的学生授课。",
      "评估学生的学习需求，设计个别化教育计划（IEP）并监控进度。",
      "与医疗专业人员、心理学家、家长合作并调整教学大纲。"
    ]
  },
  "149113": {
    title_tr: "Spor Merkezi Müdürü",
    title_zh: "体育中心经理",
    duties: [
      "Directs, plans and coordinates daily operations of a sports centre or health complex.",
      "Manages centre staff, coordinates court bookings, leagues and promotional activities.",
      "Oversees facilities maintenance, security policies, budgets and membership sales."
    ],
    duties_tr: [
      "Bir spor merkezinin veya sağlık kompleksinin günlük operasyonlarını yönlendirir, planlar ve koordine eder.",
      "Merkez personelini yönetir, saha/kort rezervasyonlarını, ligleri ve tanıtım faaliyetlerini koordine eder.",
      "Tesislerin bakımını, güvenlik politikalarını, bütçeleri ve üyelik satışlarını denetler."
    ],
    duties_zh: [
      "指导、规划和协调体育中心或康体综合设施的日常运营。",
      "管理中心员工、协调场地预订、联赛及推广活动。",
      "监督设施维护、安全政策、预算和会员销售。"
    ]
  },
  "452321": {
    title_tr: "Spor Geliştirme Sorumlusu",
    title_zh: "体育运动发展专员",
    duties: [
      "Promotes, plans and coordinates sporting activities and programs in a community or region.",
      "Liaises with schools, clubs, government departments and recruits sports volunteers.",
      "Secures funding, manages programs budgets and monitors participation rates."
    ],
    duties_tr: [
      "Bir toplulukta veya bölgede spor faaliyetlerini ve programlarını teşvik eder, planlar ve koordine eder.",
      "Okullar, kulüpler, devlet daireleriyle iletişim kurar ve spor gönüllüleri kazanır.",
      "Finansman sağlar, program bütçelerini yönetir ve katılım oranlarını izler."
    ],
    duties_zh: [
      "在社区或地区推广、规划和协调体育活动和项目。",
      "与学校、俱乐部、政府部门联络并招募体育志愿者。",
      "争取资金支持、管理项目预算并监控参与率。"
    ]
  },
  "452322": {
    title_tr: "Spor Hakemi",
    title_zh: "体育裁判",
    duties: [
      "Enforces rules, regulations and standards during professional sports matches.",
      "Inspects sports fields, playing gear, sports equipment and monitors player safety.",
      "Monitors competitions, declares official decisions and investigates rule breaches."
    ],
    duties_tr: [
      "Profesyonel spor müsabakaları sırasında kuralları, yönetmelikleri ve standartları uygular.",
      "Spor alanlarını, oyun malzemelerini, spor ekipmanlarını denetler ve oyuncu güvenliğini izler.",
      "Müsabakaları izler, resmi kararları verir ve kural ihlallerini araştırır."
    ],
    duties_zh: [
      "在职业体育比赛中执行规则、法规和标准。",
      "检查运动场地、比赛装备、体育设施并监控运动员安全。",
      "监督比赛、宣布官方裁决并调查违规行为。"
    ]
  },
  "452499": {
    title_tr: "Diğer Sporcular (bhk)",
    title_zh: "运动员（其他）",
    duties: [
      "Plays professional sports matches under coach direction for specialized disciplines not elsewhere classified.",
      "Participates in regular training, practice runs and physical conditioning.",
      "Represents sponsors, interacts with media and participates in promotional events."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış özel spor dallarında antrenör yönetiminde profesyonel maçlar/yarışlar yapar.",
      "Düzenli eğitime, pratik turlarına ve fiziksel kondisyona katılır.",
      "Sponsorları temsil eder, medyayla etkileşime girer ve tanıtım etkinliklerine katılır."
    ],
    duties_zh: [
      "在教练指导下参加未另分类的专业体育项目的职业比赛。",
      "参加日常训练、练习赛和体能训练。",
      "代表赞助商、与媒体互动并参加推广活动。"
    ]
  },
  "212316": {
    title_tr: "Sahne Amiri / Yöneticisi",
    title_zh: "舞台监督",
    duties: [
      "Coordinates and manages technical and operational aspects of theatre, stage or performance productions.",
      "Schedules rehearsals, reviews cue sheets, coordinates dressing rooms and stage crew.",
      "Ensures backstage safety, runs prompt books and manages performance transitions."
    ],
    duties_tr: [
      "Tiyatro, sahne veya gösteri yapımlarının teknik ve operasyonel yönlerini koordine eder ve yönetir.",
      "Provaları planlar, işaret (cue) çizelgelerini gözden geçirir, soyunma odalarını ve sahne ekibini koordine eder.",
      "Sahne arkası güvenliğini sağlar, suflör kitaplarını yönetir ve performans geçişlerini idare eder."
    ],
    duties_zh: [
      "协调和管理剧院、舞台或演出制作的技术与运营工作。",
      "安排排练日程、审查提示单、协调化妆间和舞台工作人员。",
      "确保后台安全、管理提示台本并掌控演出转场进度。"
    ]
  },
  "611112": {
    title_tr: "Tarım ve Canlı Hayvan Ticareti Temsilcisi (Stock and Station Agent)",
    title_zh: "牲畜及农场代理",
    duties: [
      "Buys and sells livestock, wool, agricultural products and rural properties on behalf of clients.",
      "Identifies agricultural buyer needs, prepares listings, quotes and negotiates prices.",
      "Arranges livestock transport, insurance, audits sale yards and coordinates settlements."
    ],
    duties_tr: [
      "Müşteriler adına canlı hayvan, yün, tarım ürünleri ve kırsal mülkler alıp satar.",
      "Tarımsal alıcıların ihtiyaçlarını belirler, ilanlar hazırlar, fiyat teklifi sunar ve fiyatları müzakere eder.",
      "Canlı hayvan nakliyesini, sigortasını düzenler, satış alanlarını denetler ve ödemeleri koordine eder."
    ],
    duties_zh: [
      "代表客户买卖牲畜、羊毛、农产品和乡村物业。",
      "确定农业客户需求、准备挂牌信息、报价并协商价格。",
      "安排牲畜运输、保险、审计销售围栏并协调结算。"
    ]
  },
  "222213": {
    title_tr: "Borsa Brokeri / Temsilcisi (Stockbroking Dealer)",
    title_zh: "股票经纪自营商",
    duties: [
      "Buys and sells stocks, shares and securities on behalf of clients or institutions.",
      "Analyses market trends, charts, macroeconomic data and trading patterns.",
      "Formulates trading strategies, quotes pricing and manages financial risk exposure."
    ],
    duties_tr: [
      "Müşteriler veya kurumlar adına hisse senetleri, tahviller ve menkul kıymetler alıp satar.",
      "Piyasa trendlerini, grafikleri, makroekonomik verileri ve işlem kalıplarını analiz eder.",
      "İşlem stratejileri oluşturur, fiyat teklifi sunar ve finansal risk maruziyetini yönetir."
    ],
    duties_zh: [
      "代表客户或机构买卖股票、股份和证券。",
      "分析市场趋势、图表、宏观经济数据和交易模式。",
      "制定交易策略、报出价格并管理财务风险敞口。"
    ]
  },
  "272115": {
    title_tr: "Öğrenci Danışmanı / Rehber Öğretmen",
    title_zh: "学生辅导员",
    duties: [
      "Provides personal, educational and career counselling support to students in schools or universities.",
      "Conducts student assessments, designs behavior plans and monitors progress.",
      "Collaborates with teachers, parents, medical practitioners and coordinates crisis support plans."
    ],
    duties_tr: [
      "Okullarda veya üniversitelerde öğrencilere kişisel, eğitsel ve kariyer danışmanlığı desteği sağlar.",
      "Öğrenci değerlendirmeleri yapar, davranış planları tasarlar ve ilerlemeyi izler.",
      "Öğretmenler, veliler, tıp uzmanları ile iş birliği yapar ve kriz destek planlarını koordine eder."
    ],
    duties_zh: [
      "在学校或大学向学生提供个人、教育和职业咨询支持。",
      "评估学生状况、设计行为引导计划并监控进度。",
      "与教师、家长、医生合作并协调危机干预方案。"
    ]
  },
  "121217": {
    title_tr: "Şeker Kamışı Yetiştiricisi",
    title_zh: "甘蔗种植户",
    duties: [
      "Plans, manages and coordinates production of sugar cane in fields.",
      "Oversees soil preparation, planting, irrigation, fertilizing and pest control.",
      "Coordinates harvesting, transport and marketing of sugar cane to mills."
    ],
    duties_tr: [
      "Açık alanlarda şeker kamışı üretimini planlar, yöneter ve koordine eder.",
      "Toprak hazırlığını, ekimi, sulamayı, gübrelemeyi ve haşere kontrolünü denetler.",
      "Şeker kamışının hasadını, değirmenlere taşınmasını ve pazarlanmasını koordine eder."
    ],
    duties_zh: [
      "规划、管理和协调农田的甘蔗生产。",
      "监督整地、种植、灌溉、施肥和病虫害防治。",
      "协调甘蔗的收获、运输和运往糖厂的销售工作。"
    ]
  },
  "224714": {
    title_tr: "Tedarik Zinciri Analisti",
    title_zh: "供应链分析师",
    duties: [
      "Analyses supply chain workflows, transport logistics and databases to improve efficiency.",
      "Monitors stock levels, calculates delivery times and predicts demand parameters.",
      "Recommends logistics changes, audits vendor contracts and monitors implementation."
    ],
    duties_tr: [
      "Verimliliği artırmak için tedarik zinciri iş akışlarını, nakliye lojistiğini ve veri tabanlarını analiz eder.",
      "Stok seviyelerini izler, teslimat sürelerini hesaplar ve talep parametrelerini tahmin eder.",
      "Lojistik değişiklikler önerir, tedarikçi sözleşmelerini denetler ve uygulamayı izler."
    ],
    duties_zh: [
      "分析供应链流程、运输物流和数据库以提高效率。",
      "监控库存水平、计算交货时间并预测需求参数。",
      "推荐物流改革方案、审计供应商合同并监控实施情况。"
    ]
  },
  "452315": {
    title_tr: "Yüzme Antrenörü veya Eğitmeni",
    title_zh: "游泳教练或导师",
    duties: [
      "Teaches swimming techniques, water safety and physical conditioning to individuals or groups.",
      "Supervises swimming lessons, monitors pool hazards and sets up training aids.",
      "Prepares swimmers for swimming meets, assessments and monitors safety."
    ],
    duties_tr: [
      "Bireylere veya gruplara yüzme tekniklerini, su güvenliğini ve fiziksel kondisyonu öğretir.",
      "Yüzme derslerini denetler, havuz tehlikelerini izler ve eğitim yardımcılarını hazırlar.",
      "Yüzücüleri yüzme yarışlarına, değerlendirmelerine hazırlar ve güvenliği izler."
    ],
    duties_zh: [
      "向个人或团体教授游泳技巧、水上安全和体能训练。",
      "监督游泳课程、监控泳池隐患并设置教学辅助工具。",
      "指导游泳运动员准备游泳比赛、评估并监控安全。"
    ]
  },
  "249311": {
    title_tr: "İkinci Dil Olarak İngilizce Öğretmeni (TESOL)",
    title_zh: "对外英语教师（TESOL）",
    duties: [
      "Teaches English language skills to non-native speakers in classrooms or groups.",
      "Assesses students' language abilities, designs lesson plans and monitors progress.",
      "Prepares students for English examinations, grades tasks and logs records."
    ],
    duties_tr: [
      "Ana dili İngilizce olmayan kişilere sınıflarda veya gruplarda İngilizce dil becerileri öğretir.",
      "Öğrencilerin dil yeteneklerini değerlendirir, ders planları tasarlar ve ilerlemeyi izler.",
      "Öğrencileri İngilizce sınavlarına hazırlar, ödevleri notlandırır ve kayıtları tutar."
    ],
    duties_zh: [
      "在课堂或小组中向非英语母语者教授英语语言技能。",
      "评估学生的语言能力、设计教学计划并监控进度。",
      "指导学生准备英语考试、评改作业并记录学习进度。"
    ]
  },
  "212317": {
    title_tr: "Teknik Yönetmen / Direktör",
    title_zh: "技术总监",
    duties: [
      "Directs and plans technical aspects of television, radio, stage or film productions.",
      "Coordinates camera positions, lighting boards, sound mixing and video signals.",
      "Liaises with directors, producers, technical crew and checks equipment standards."
    ],
    duties_tr: [
      "Televizyon, radyo, sahne veya film yapımlarının teknik yönlerini yönlendirir ve planlar.",
      "Kamera konumlarını, ışık panolarını, ses miksajını ve video sinyallerini koordine eder.",
      "Yönetmenler, yapımcılar, teknik ekip ile iletişim kurar ve ekipman standartlarını kontrol eder."
    ],
    duties_zh: [
      "指导并规划电视、广播、舞台或电影制作的技术工作。",
      "协调机位、灯光控制板、混音和视频信号。",
      "与导演、制作人、技术人员联络并检查设备标准。"
    ]
  },
  "225499": {
    title_tr: "Diğer Teknik Satış Temsilcileri (bhk)",
    title_zh: "技术销售代表（其他）",
    duties: [
      "Sells specialized scientific, medical or technical products and services to business clients.",
      "Identifies customer technical needs, prepares proposals, quotes and delivers presentations.",
      "Manages corporate relationships, monitors sales targets and competitor pricing lines."
    ],
    duties_tr: [
      "Kurumsal müşterilere özel bilimsel, tıbbi veya teknik ürün ve hizmetler satar.",
      "Müşterinin teknik ihtiyaçlarını belirler, teklifler ve fiyat teklifleri hazırlar ve sunumlar yapar.",
      "Kurumsal ilişkileri yönetir, satış hedeflerini ve rakip fiyatlandırma politikalarını takip eder."
    ],
    duties_zh: [
      "向企业客户销售专业科学、医疗或技术产品及服务。",
      "确定客户的技术需求、准备建议书、报价并进行产品演示。",
      "管理客户关系，监控销售目标和竞争对手的定价机制。"
    ]
  },
  "399999": {
    title_tr: "Diğer Teknisyenler ve Esnaf/Zanaat Çalışanları (bhk)",
    title_zh: "技术员及技术工（其他）",
    duties: [
      "Performs technical or trade tasks not elsewhere classified, utilizing specialized machinery.",
      "Reads blueprints, selects tools, builds assemblies and executes calibrations.",
      "Inspects finished parts, performs repairs and monitors safety compliance."
    ],
    duties_tr: [
      "Özel makineler kullanarak başka yerde sınıflandırılmamış teknik veya zanaat görevlerini yerine getirir.",
      "Proje çizimlerini okur, araçları seçer, montajları yapar ve kalibrasyonları yürütür.",
      "Bitmiş parçaları inceler, onarımları gerçekleştirir ve güvenlik kurallarına uyumu izler."
    ],
    duties_zh: [
      "使用专业机械执行未另分类的技术或手工技术任务。",
      "阅读蓝图、选择工具、进行组装并执行校准。",
      "检查成品零件、进行修理并监控安全合规。"
    ]
  },
  "342412": {
    title_tr: "Telekomünikasyon Kablo Bağlantı Elemanı",
    title_zh: "电信电缆接续工",
    duties: [
      "Splices, terminates and repairs telecommunications cables, including copper and fiber optic.",
      "Reads cable maps, installs joint enclosures, seals cables and conducts signal tests.",
      "Monitors signal losses, diagnoses network faults and performs safety checks."
    ],
    duties_tr: [
      "Bakır ve fiber optik dahil olmak üzere telekomünikasyon kablolarını ekler, sonlandırır ve onarır.",
      "Kablo haritalarını okur, bağlantı muhafazalarını kurar, kabloları yalıtır ve sinyal testleri yapar.",
      "Sinyal kayıplarını izler, şebeke arızalarını teşhis eder ve güvenlik kontrollerini gerçekleştirir."
    ],
    duties_zh: [
      "接续、端接和修理电信电缆，包括铜缆和光纤电缆。",
      "阅读电缆线路图、安装接头护套、密封电缆并进行信号测试。",
      "监控信号损耗、诊断网络故障并进行安全检查。"
    ]
  },
  "313212": {
    title_tr: "Telekomünikasyon Saha Mühendisi (Teknisyeni)",
    title_zh: "电信外场工程师",
    duties: [
      "Installs, configures, commissions and maintains telecommunications networks and equipment.",
      "Conducts site surveys, monitors transmission signals, diagnoses faults and replaces parts.",
      "Liaises with network designers, manages technicians and ensures compliance with codes."
    ],
    duties_tr: [
      "Telekomünikasyon ağlarını ve ekipmanlarını kurar, yapılandırır, devreye alır ve bakımını yapar.",
      "Saha araştırmaları yapar, iletim sinyallerini izler, arızaları teşhis eder ve parçaları değiştirir.",
      "Şebeke tasarımcılarıyla iletişim kurar, teknisyenleri yönetir ve kurallara uyumu sağlar."
    ],
    duties_zh: [
      "安装、配置、调试和维护电信网络及设备。",
      "开展现场勘测、监控传输信号、诊断故障并更换部件。",
      "与网络设计师联络、管理技术员并确保符合规程要求。"
    ]
  },
  "313214": {
    title_tr: "Telekomünikasyon Teknik Sorumlusu / Teknoloji Uzmanı",
    title_zh: "电信技术员或技术专家",
    duties: [
      "Designs, plans, monitors and tests telecommunications hardware, networks and software.",
      "Conducts network capacity planning, monitors signal traffic and diagnoses transmission faults.",
      "Collaborates with engineers, writes technical specifications and reviews safety standards."
    ],
    duties_tr: [
      "Telekomünikasyon donanımını, ağlarını ve yazılımlarını tasarlar, planlar, izler ve test eder.",
      "Şebeke kapasite planlaması yapar, sinyal trafiğini izler ve iletim arızalarını teşhis eder.",
      "Mühendislerle iş birliği yapar, teknik şartnameler yazar ve güvenlik standartlarını gözden geçirir."
    ],
    duties_zh: [
      "设计、规划、监控和测试电信硬件、网络及软件。",
      "进行网络容量规划、监控信号流量并诊断传输故障。",
      "与工程师合作、编写技术规范并审查安全标准。"
    ]
  },
  "399517": {
    title_tr: "Televizyon Ekipmanı Operatörü",
    title_zh: "电视设备操作工",
    duties: [
      "Sets up, operates and maintains cameras, recorders and editing equipment in television studios.",
      "Positions cameras, adjusts lenses, setups control boards and records footage.",
      "Collaborates with directors and technical directors to achieve broadcasting specifications."
    ],
    duties_tr: [
      "Televizyon stüdyolarında kameraları, kaydedicileri ve kurgu ekipmanlarını kurar, çalıştırır ve bakımını yapar.",
      "Kameraları konumlandırır, lensleri ayarlar, kontrol panolarını kurar ve görüntüleri kaydeder.",
      "Yayın spesifikasyonlarını elde etmek için yönetmenler ve teknik yönetmenlerle iş birliği yapar."
    ],
    duties_zh: [
      "在电视演播室中安装、操作和维护摄像机、录像机和编辑设备。",
      "摆放摄像机、调整镜头、设置控制面板并录制素材。",
      "与导演和技术总监合作，以达到广播播出技术规范要求。"
    ]
  },
  "212416": {
    title_tr: "Televizyon Muhabiri / Gazetecisi",
    title_zh: "电视新闻记者",
    duties: [
      "Researches, writes and presents news stories and reports for television broadcasts.",
      "Conducts on-camera interviews, attends events, and edits video reports.",
      "Liaises with editors, producers, presenters and presents live or recorded bulletins."
    ],
    duties_tr: [
      "Televizyon yayınları için haberleri ve raporları araştırır, yazar ve sunar.",
      "Kamera karşısında röportajlar yapar, etkinliklere katılır ve görüntülü haberleri kurgular.",
      "Editörlerle, yapımcılarla, sunucularla iletişim kurar ve canlı veya kayıt bültenleri sunar."
    ],
    duties_zh: [
      "为电视节目播报研究、撰写并呈现新闻报道和专题报道。",
      "进行出镜采访、出席活动并编辑视频报道。",
      "与编辑、制作人、主播联络，并播报直播或录播的新闻简报。"
    ]
  },
  "212114": {
    title_tr: "Televizyon Sunucusu",
    title_zh: "电视节目主持人",
    duties: [
      "Presents news, sports, entertainment or talk show programs on television.",
      "Reads scripts, cues teleprompter, conducts interviews and interacts with guests.",
      "Liaises with directors, producers, styling teams and participates in promo events."
    ],
    duties_tr: [
      "Televizyonda haber, spor, eğlence veya talk-show programları sunar.",
      "Senaryoları okur, prompter'ı takip eder, röportajlar yapar ve konuklarla etkileşim kurar.",
      "Yönetmenlerle, yapımcılarla, stil ekipleriyle iletişim kurar ve tanıtım etkinliklerine katılır."
    ],
    duties_zh: [
      "在电视节目中主持新闻、体育、娱乐或脱口秀节目。",
      "阅读稿件、查看提词器提示、进行采访并与嘉宾互动。",
      "与导演、制作人、造型团队联络并参加推广活动。"
    ]
  },
  "452316": {
    title_tr: "Tenis Antrenörü",
    title_zh: "网球教练",
    duties: [
      "Teaches tennis techniques, safety rules and coordinates training for students.",
      "Supervises tennis training sessions, monitors safety and sets up training courts.",
      "Prepares students for tennis matches, assessments and monitors safety."
    ],
    duties_tr: [
      "Öğrencilere tenis tekniklerini, güvenlik kurallarını öğretir ve antrenmanları koordine eder.",
      "Tenis antrenman seanslarını denetler, güvenliği izler ve antrenman kortlarını hazırlar.",
      "Öğrencileri tenis maçlarına, değerlendirmelerine hazırlar ve güvenliği izler."
    ],
    duties_zh: [
      "向学生教授网球技巧、安全规则并协调网球训练。",
      "监督网球训练课、监控安全并布置训练场地。",
      "指导学生准备网球比赛、评估并监控安全。"
    ]
  },
  "323215": {
    title_tr: "Tekstil, Konfeksiyon ve Ayakkabı Makineleri Teknisyeni",
    title_zh: "纺织、服装及鞋类机械修配工",
    duties: [
      "Installs, tests, maintains and repairs industrial textile, clothing and footwear machinery.",
      "Diagnoses mechanical faults, replaces worn needles, hooks, guides and runs calibrations.",
      "Conducts routine machinery maintenance, safety checks and logs service data."
    ],
    duties_tr: [
      "Endüstriyel tekstil, konfeksiyon ve ayakkabı makinelerini kurar, test eder, bakımını yapar ve onarır.",
      "Mekanik arızaları teşhis eder, aşınmış iğneleri, çağanozları, kılavuzları değiştirir ve kalibrasyonları çalıştırır.",
      "Makinelerin rutin bakımlarını, güvenlik kontrollerini gerçekleştirir ve servis verilerini kaydeder."
    ],
    duties_zh: [
      "安装、测试、维护和修理工业纺织、服装及鞋类机械设备。",
      "诊断机械故障、更换磨损的机针、旋梭、导板并运行校准。",
      "进行常规设备维护、安全检查并记录维修数据。"
    ]
  },
  "323412": {
    title_tr: "Kalıpçı / Alet Yapımcısı (Toolmaker)",
    title_zh: "工具和模具制造工",
    duties: [
      "Fabricates, alters, repairs and calibrates specialized tools, dies, molds and jigs.",
      "Works from engineering drawings using CNC or manual machine tools.",
      "Measures finished parts using precision tools to ensure specifications compliance."
    ],
    duties_tr: [
      "Özel aletleri, kalıpları, maşaları ve aparatları imal eder, değiştirir, onarır ve kalibre eder.",
      "CNC veya manuel makine aletlerini kullanarak mühendislik çizimlerine göre çalışır.",
      "Spesifikasyonlara uyumu sağlamak için bitmiş parçaları hassas aletlerle ölçer."
    ],
    duties_zh: [
      "制造、改装、修理和校准专业工具、冲模、模具和夹具。",
      "根据工程图纸作业，操作数控（CNC）或手动切削机床。",
      "使用精密工具测量成品工件，以确保符合技术规范。"
    ]
  },
  "272413": {
    title_tr: "Mütercim / Yazılı Çevirmen",
    title_zh: "笔译员",
    duties: [
      "Translates written documents, texts or records from one language to another.",
      "Ensures accuracy of terminology, tone, context and formatting of translations.",
      "Conducts terminology research, reviews sources and maintains client confidentiality."
    ],
    duties_tr: [
      "Yazılı belgeleri, metinleri veya kayıtları bir dilden diğerine çevirir.",
      "Çevirilerin terminoloji doğruluğunu, tonunu, bağlamını ve biçimlendirmesini sağlar.",
      "Terminoloji araştırmaları yürütür, kaynakları inceler ve müşteri gizliliğini korur."
    ],
    duties_zh: [
      "将书面文件、文本或档案从一种语言翻译成另一种语言。",
      "确保翻译的术语准确性、语气、上下文语境和格式规范。",
      "开展术语研究、审查文献资料并维护客户机密。"
    ]
  }
};

const FILE_PATH = path.join(process.cwd(), "src/data/anzsco-list.json");
const list = JSON.parse(readFileSync(FILE_PATH, "utf8")) as SearchEntry[];

let updatedCount = 0;
for (const entry of list) {
  const batchData = BATCH_6_DATA[entry.code];
  if (batchData) {
    Object.assign(entry, batchData);
    updatedCount += 1;
  }
}

writeFileSync(FILE_PATH, JSON.stringify(list, null, 2));
console.log(`Successfully updated ${updatedCount} entries in anzsco-list.json.`);
