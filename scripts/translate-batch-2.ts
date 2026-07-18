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

const BATCH_2_DATA: Record<string, Partial<SearchEntry>> = {
  "149914": {
    title_tr: "Finans Kuruluşu Şube Müdürü",
    title_zh: "金融机构分支机构经理",
    duties: [
      "Directs and coordinates the operations of a financial institution branch.",
      "Manages branch staff, customer relations, budgets and financial targets.",
      "Ensures compliance with financial regulations, security policies and operational standards."
    ],
    duties_tr: [
      "Bir finans kuruluşu şubesinin operasyonlarını yönetir ve koordine eder.",
      "Şube personelini, müşteri ilişkilerini, bütçeleri ve finansal hedefleri yönetir.",
      "Finansal düzenlemelere, güvenlik politikalarına ve operasyonel standartlara uyumu sağlar."
    ],
    duties_zh: [
      "指导并协调金融机构分支机构的运营。",
      "管理分支机构员工、客户关系、预算及财务目标。",
      "确保遵守金融法规、安全政策和运营标准。"
    ]
  },
  "222311": {
    title_tr: "Finansal Yatırım Danışmanı",
    title_zh: "金融投资顾问",
    duties: [
      "Assesses clients' financial status and investment objectives to recommend suitable strategies.",
      "Analyses financial market trends, investment portfolios and tax implications.",
      "Monitors portfolio performance and advises clients on asset allocation and wealth management."
    ],
    duties_tr: [
      "Uygun stratejiler önermek için müşterilerin finansal durumunu ve yatırım hedeflerini değerlendirir.",
      "Finansal piyasa trendlerini, yatırım portföllerini ve vergi etkilerini analiz eder.",
      "Portföy performansını izler ve varlık dağılımı ile varlık yönetimi konularında müşterilere danışmanlık yapar."
    ],
    duties_zh: [
      "评估客户的财务状况和投资目标，以推荐合适的策略。",
      "分析金融市场趋势、投资组合及税务影响。",
      "监控投资组合表现，并就资产配置和财富管理向客户提供建议。"
    ]
  },
  "222312": {
    title_tr: "Finansal Yatırım Yöneticisi",
    title_zh: "金融投资经理",
    duties: [
      "Manages investment portfolios and funds on behalf of clients or institutions.",
      "Formulates investment strategies and selects assets to maximize returns and mitigate risk.",
      "Monitors market conditions, evaluates investment opportunities and reports on performance."
    ],
    duties_tr: [
      "Müşteriler veya kurumlar adına yatırım portföylerini ve fonlarını yönetir.",
      "Getirileri en üst düzeye çıkarmak ve riski azaltmak için yatırım stratejileri belirler ve varlıkları seçer.",
      "Piyasa koşullarını izler, yatırım fırsatlarını değerlendirir ve performans hakkında rapor hazırlar."
    ],
    duties_zh: [
      "代表客户或机构管理投资组合和基金。",
      "制定投资策略并选择资产，以实现收益最大化并缓解风险。",
      "监控市场状况，评估投资机会并报告业绩。"
    ]
  },
  "399918": {
    title_tr: "Yangından Koruma Ekipmanları Teknisyeni",
    title_zh: "消防设备技术员",
    duties: [
      "Installs, tests, maintains and repairs fire protection systems and equipment.",
      "Inspects fire alarms, sprinklers, extinguishers and emergency lighting for safety compliance.",
      "Maintains service records and reports faults or non-compliance to property managers."
    ],
    duties_tr: [
      "Yangından korunma sistemlerini ve ekipmanlarını kurar, test eder, bakımını yapar ve onarır.",
      "Güvenlik uyumluluğu için yangın alarmlarını, sprinklerleri, söndürücüleri ve acil durum aydınlatmalarını denetler.",
      "Servis kayıtlarını tutar ve arızaları veya uygunsuzlukları mülk yöneticilerine rapor eder."
    ],
    duties_zh: [
      "安装、测试、维护和修理消防系统及设备。",
      "检查火灾报警器、洒水装置、灭火器和应急照明以确保符合安全标准。",
      "维护服务记录并向物业经理报告故障或违规行为。"
    ]
  },
  "451815": {
    title_tr: "İlk Yardım Eğitmeni",
    title_zh: "急救培训师",
    duties: [
      "Teaches first aid techniques, CPR and emergency medical response procedures.",
      "Assesses students' practical competencies and knowledge in medical emergencies.",
      "Maintains training materials, equipment and ensures compliance with certification standards."
    ],
    duties_tr: [
      "İlk yardım tekniklerini, CPR (kalp masajı) ve acil tıbbi müdahale prosedürlerini öğretir.",
      "Tıbbi acil durumlarda öğrencilerin pratik yetkinliklerini ve bilgilerini değerlendirir.",
      "Eğitim materyallerini, ekipmanlarını korur ve sertifikasyon standartlarına uyumu sağlar."
    ],
    duties_zh: [
      "传授急救技术、心肺复苏（CPR）和紧急医疗响应程序。",
      "评估学生在医疗紧急情况下的实际操作能力和知识。",
      "维护培训材料、设备，并确保符合认证标准。"
    ]
  },
  "311311": {
    title_tr: "Balıkçılık Denetim Görevlisi",
    title_zh: "渔业局官员",
    duties: [
      "Enforces laws, regulations and policies regarding commercial and recreational fishing.",
      "Inspects fishing vessels, catches, gear and aquaculture establishments.",
      "Conducts patrols, investigates illegal fishing activities and promotes conservation education."
    ],
    duties_tr: [
      "Ticari ve rekreasyonel balıkçılıkla ilgili yasaları, yönetmelikleri ve politikaları uygular.",
      "Balıkçı teknelerini, avları, ekipmanları ve su ürünleri yetiştiriciliği tesislerini denetler.",
      "Devriyeler yürütür, yasa dışı balıkçılık faaliyetlerini araştırır ve koruma eğitimlerini teşvik eder."
    ],
    duties_zh: [
      "执行有关商业和休闲捕鱼的法律、法规和政策。",
      "检查渔船、渔获物、渔具及水产养殖场。",
      "开展巡逻，调查非法捕鱼活动并推广保育教育。"
    ]
  },
  "149112": {
    title_tr: "Spor Salonu / Fitness Merkezi Yöneticisi",
    title_zh: "健身中心经理",
    duties: [
      "Directs, plans and coordinates operations of a fitness centre or health club.",
      "Manages staff, coordinates group classes, schedules and promotional activities.",
      "Oversees equipment maintenance, safety compliance, budgets and membership sales."
    ],
    duties_tr: [
      "Bir fitness merkezinin veya sağlık kulübünün operasyonlarını yönlendirir, planlar ve koordine eder.",
      "Personeli yönetir, grup derslerini, programları ve tanıtım faaliyetlerini koordine eder.",
      "Ekipman bakımını, güvenlik uyumluluğunu, bütçeleri ve üyelik satışlarını denetler."
    ],
    duties_zh: [
      "指导、规划和协调健身中心或健康俱乐部的运营。",
      "管理员工、协调团体课程、排班以及推广活动。",
      "监督设备维护、安全合规、预算和会员销售。"
    ]
  },
  "149411": {
    title_tr: "Araç Filosu Yöneticisi",
    title_zh: "车队经理",
    duties: [
      "Directs, coordinates and plans acquisition, maintenance and disposal of an organisation's vehicles.",
      "Monitors vehicle usage, fuel efficiency, driver schedules and compliance with transport regulations.",
      "Manages fleet budgets, insurance, registration and maintenance contracts."
    ],
    duties_tr: [
      "Bir kuruluşun araçlarının satın alınmasını, bakımını ve elden çıkarılmasını yönlendirir, koordine eder ve planlar.",
      "Araç kullanımını, yakıt verimliliğini, sürücü programlarını ve nakliye düzenlemelerine uyumu izler.",
      "Filo bütçelerini, sigortayı, ruhsat işlemlerini ve bakım sözleşmelerini yönetir."
    ],
    duties_zh: [
      "指导、协调和规划机构车辆的购置、维护和处置。",
      "监控车辆使用情况、燃油效率、驾驶员排班以及对交通法规的遵守情况。",
      "车队预算、保险、登记和维护合同管理。"
    ]
  },
  "362111": {
    title_tr: "Çiçekçi",
    title_zh: "花艺师",
    duties: [
      "Designs and fabricates floral arrangements, bouquets and wreaths.",
      "Selects, prepares and cares for flowers, foliage and florist materials.",
      "Advises clients on design options, pricing, and coordinates deliveries."
    ],
    duties_tr: [
      "Çiçek aranjmanları, buketler ve çelenkler tasarlar ve üretir.",
      "Çiçekleri, yaprakları ve çiçekçilik malzemelerini seçer, hazırlar ve bakımını yapar.",
      "Müşterilere tasarım seçenekleri, fiyatlandırma konularında danışmanlık yapar ve teslimatları koordine eder."
    ],
    duties_zh: [
      "设计和制作花艺陈设、花束和花圈。",
      "选择、准备并照料鲜花、绿植和花艺材料。",
      "就设计方案、价格向客户提供建议，并协调配送事宜。"
    ]
  },
  "121611": {
    title_tr: "Çiçek Yetiştiricisi (Üreticisi)",
    title_zh: "花卉种植户",
    duties: [
      "Plans, manages and coordinates production of flowers in fields or greenhouses.",
      "Oversees soil preparation, planting, watering, fertilizing and pest control.",
      "Coordinates harvesting, grading, packaging and distribution of flowers to markets."
    ],
    duties_tr: [
      "Açık alanlarda veya seralarda çiçek üretimini planlar, yönetir ve koordine eder.",
      "Toprak hazırlığını, ekimi, sulamayı, gübrelemeyi ve haşere kontrolünü denetler.",
      "Çiçeklerin hasadını, derecelendirilmesini, paketlenmesini ve pazarlara dağıtımını koordine eder."
    ],
    duties_zh: [
      "规划、管理和协调露地或温室的花卉生产。",
      "监督整地、种植、浇水、施肥和病虫害防治。",
      "协调花卉的收获、分级、包装和销售分配。"
    ]
  },
  "452411": {
    title_tr: "Futbolcu (Profesyonel)",
    title_zh: "足球运动员",
    duties: [
      "Plays professional football matches under coach and manager direction.",
      "Participates in regular training sessions, physical conditioning and team tactics.",
      "Represents the club or national team in promotional events and media sessions."
    ],
    duties_tr: [
      "Antrenör ve menajer yönetiminde profesyonel football maçlarında oynar.",
      "Düzenli antrenman seanslarına, fiziksel kondisyona ve takım taktiklerine katılır.",
      "Tanıtım etkinliklerinde ve medya oturumlarında kulübü veya milli takımı temsil eder."
    ],
    duties_zh: [
      "在教练和经理的指导下参加职业足球比赛。",
      "参加日常训练、体能训练和团队战术演练。",
      "在推广活动和媒体会议中代表俱乐部或国家队。"
    ]
  },
  "451399": {
    title_tr: "Cenaze Hizmetleri Görevlileri (bhk)",
    title_zh: "殡葬从业人员（其他）",
    duties: [
      "Performs administrative, operational and ceremonial tasks for funeral services.",
      "Prepares deceased persons, sets up chapel settings and coordinates funeral processions.",
      "Assists bereaved families with arrangements, paperwork and service details."
    ],
    duties_tr: [
      "Cenaze hizmetleri için idari, operasyonel ve törensel görevleri yerine getirir.",
      "Vefat eden kişileri hazırlar, şapel düzenlemelerini yapar ve cenaze törenlerini koordine eder.",
      "Yaslı ailelere düzenlemeler, belgeler ve hizmet detayları konusunda yardımcı olur."
    ],
    duties_zh: [
      "执行殡葬服务的行政、运营和仪式任务。",
      "准备逝者遗体、布置礼堂并协调送葬队伍。",
      "协助丧亲家庭处理安排、文书工作和服务细节。"
    ]
  },
  "394211": {
    title_tr: "Mobilya Cilacısı",
    title_zh: "家具饰面工",
    duties: [
      "Applies finishes, stains, lacquers or polishes to timber and metal furniture.",
      "Prepares surfaces by sanding, stripping or repairing imperfections.",
      "Matches paint colours or timber stains, and applies coatings using spray guns or brushes."
    ],
    duties_tr: [
      "Ahşap ve metal mobilyalara cila, ahşap boyası, vernik veya parlatıcı uygular.",
      "Yüzeyleri zımparalayarak, soyarak veya kusurları onararak hazırlar.",
      "Boya renklerini veya ahşap lekelerini eşleştirir ve püskürtme tabancaları ya da fırçalarla kaplama uygular."
    ],
    duties_zh: [
      "对木制和金属家具进行饰面、着色、上漆或抛光。",
      "通过打磨、剥离或修复缺陷来准备表面。",
      "调配油漆颜色或木材着色剂，并使用喷枪或刷子进行涂装。"
    ]
  },
  "222212": {
    title_tr: "Vadeli İşlemler (Futures) Brokeri / Trader",
    title_zh: "期货交易员",
    duties: [
      "Buys and sells futures contracts and commodities options on behalf of clients or institutions.",
      "Analyses market trends, charts, macroeconomic data and trading patterns.",
      "Formulates trading strategies and manages financial risk exposure."
    ],
    duties_tr: [
      "Müşteriler veya kurumlar adına vadeli işlem (futures) sözleşmeleri ve emtia opsiyonları alıp satar.",
      "Piyasa trendlerini, grafikleri, makroekonomik verileri ve ticaret kalıplarını analiz eder.",
      "Ticaret stratejileri oluşturur ve finansal risk maruziyetini yönetir."
    ],
    duties_zh: [
      "代表客户或机构买卖期货合约和大宗商品期权。",
      "分析市场趋势、图表、宏观经济数据和交易模式。",
      "制定交易策略并管理财务风险敞口。"
    ]
  },
  "224212": {
    title_tr: "Galeri veya Müze Küratörü",
    title_zh: "美术馆或博物馆策展人",
    duties: [
      "Manages collections of art, historical artifacts, specimens or archive materials.",
      "Plans, develops and coordinates exhibitions, public programs and publications.",
      "Conducts research, acquires new items and ensures proper preservation and security."
    ],
    duties_tr: [
      "Sanat, tarihi eserler, örnekler veya arşiv malzemelerinden oluşan koleksiyonları yönetir.",
      "Sergileri, kamu programlarını ve yayınları planlar, geliştirir ve koordine eder.",
      "Araştırma yapar, yeni eserler edinir, uygun koruma ve güvenliği sağlar."
    ],
    duties_zh: [
      "管理艺术品、历史文物、标本或档案材料的收藏。",
      "规划、开发和协调展览、公共项目和出版物。",
      "开展研究、购置新藏品并确保妥善保护与安全。"
    ]
  },
  "399311": {
    title_tr: "Galeri veya Müze Teknisyeni",
    title_zh: "美术馆或博物馆技术员",
    duties: [
      "Constructs, installs and maintains displays and exhibitions in museums or galleries.",
      "Handles, packs, stores and assists in preserving art or historical artifacts.",
      "Assists with lighting, mounting, sign writing and audiovisual equipment."
    ],
    duties_tr: [
      "Müze veya galerilerdeki sergileri ve stantları inşa eder, kurar ve bakımını yapar.",
      "Sanat veya tarihi eserleri taşır, paketler, depolar ve korunmalarına yardımcı olur.",
      "Aydınlatma, montaj, tabela yazımı ve görsel-işitsel ekipmanlara yardımcı olur."
    ],
    duties_zh: [
      "在博物馆或美术馆中搭建、安装和维护展陈及展览。",
      "搬运、包装、储存并协助保护艺术品或历史文物。",
      "协助处理照明、装裱、标牌绘制及视听设备。"
    ]
  },
  "362211": {
    title_tr: "Bahçıvan (Genel)",
    title_zh: "园丁（普通）",
    duties: [
      "Plants, cultivates and maintains lawns, gardens, trees and shrubs.",
      "Controls weeds, pests, waters plants, applies fertilizers and soil conditioners.",
      "Operates gardening machinery and maintains pathways, boundaries and structures."
    ],
    duties_tr: [
      "Çimleri, bahçeleri, ağaçları ve çalıları diker, yetiştirir ve bakımını yapar.",
      "Yabani otları, haşereleri kontrol eder, bitkileri sular, gübre ve toprak düzenleyiciler uygular.",
      "Bahçe makinelerini çalıştırır ve yolları, sınırları ve yapıları korur."
    ],
    duties_zh: [
      "种植、栽培和维护草坪、花园、树木和灌木。",
      "控制杂草、病虫害、浇水、施肥和施用土壤改良剂。",
      "操作园艺机械并维护通道、边界和设施结构。"
    ]
  },
  "399212": {
    title_tr: "Gaz veya Petrol Tesisi Operatörü",
    title_zh: "天然气或石油操作员",
    duties: [
      "Operates plant, machinery and equipment to extract, process and refine gas or petroleum.",
      "Monitors control panels, pressure gauges and adjusts flow rates.",
      "Performs routine maintenance, safety checks and logs production data."
    ],
    duties_tr: [
      "Gaz veya petrol çıkarmak, işlemek ve rafine etmek için tesis, makine ve ekipmanları çalıştırır.",
      "Kontrol panellerini, basınç göstergelerini izler ve akış hızlarını ayarlar.",
      "Rutin bakımları, güvenlik kontrollerini yapar ve üretim verilerini kaydeder."
    ],
    duties_zh: [
      "操作厂房、机械和设备以开采、加工和精炼天然气或石油。",
      "监控控制面板、压力表并调节流速。",
      "进行常规维护、安全检查并记录数据。"
    ]
  },
  "121315": {
    title_tr: "Keçi Yetiştiricisi",
    title_zh: "山羊养殖户",
    duties: [
      "Breeds, raises and manages goats for milk, meat, fiber or breeding stock.",
      "Monitors animal health, nutrition, coordinates milking and shearing.",
      "Manages farm pasture, fences, equipment and coordinates product marketing."
    ],
    duties_tr: [
      "Süt, et, lif veya damızlık stok için keçi üretir, yetiştirir ve yönetir.",
      "Hayvan sağlığını, beslenmesini izler, sağım ve kırkım işlemlerini koordine eder.",
      "Çiftlik merasını, çitleri, ekipmanları yönetir ve ürün pazarlamasını koordine eder."
    ],
    duties_zh: [
      "繁育、饲养和管理山羊，以获取奶、肉、纤维或种畜。",
      "监测动物健康、营养，协调挤奶和剪毛。",
      "管理农场牧场、围栏、设备并协调产品销售。"
    ]
  },
  "452412": {
    title_tr: "Golfçü (Profesyonel)",
    title_zh: "高尔夫球运动员",
    duties: [
      "Plays professional golf tournaments under sporting regulations.",
      "Participates in regular training, practice rounds and physical conditioning.",
      "Represents sponsors, interacts with media and participates in promotional events."
    ],
    duties_tr: [
      "Spor kuralları çerçevesinde profesyonel golf turnuvalarında oynar.",
      "Düzenli eğitime, pratik turlarına ve fiziksel kondisyona katılır.",
      "Sponsorları temsil eder, medyayla etkileşime girer ve tanıtım etkinliklerine katılır."
    ],
    duties_zh: [
      "根据体育规则参加职业高尔夫球锦标赛。",
      "参加日常训练、练习赛和体能训练。",
      "代表赞助商，与媒体互动并参加推广活动。"
    ]
  },
  "121215": {
    title_tr: "Bağcı (Üzüm Yetiştiricisi)",
    title_zh: "葡萄种植户",
    duties: [
      "Plans, manages and coordinates production of grapes for wine, table use or drying.",
      "Oversees soil preparation, planting, pruning, irrigation and pest control.",
      "Coordinates harvesting, grading, transport and marketing of grape products."
    ],
    duties_tr: [
      "Şaraplık, sofralık veya kurutmalık üzüm üretimini planlar, yönetir ve koordine eder.",
      "Toprak hazırlığını, ekimi, budamayı, sulamayı ve haşere kontrolünü denetler.",
      "Üzüm ürünlerinin hasadını, derecelendirilmesini, taşınmasını ve pazarlamasını koordine eder."
    ],
    duties_zh: [
      "规划、管理和协调用于酿酒、鲜食或干制的葡萄生产。",
      "监督整地、种植、修剪、灌溉和病虫害防治。",
      "协调葡萄产品的收获、分级、运输和销售。"
    ]
  },
  "392211": {
    title_tr: "Baskı Öncesi (Pre-press) Hazırlık Elemanı",
    title_zh: "图文印前制作工",
    duties: [
      "Prepares text, images and layouts for commercial printing and publication.",
      "Reviews proofs, checks formatting, colour separation and image quality.",
      "Operates computer-to-plate systems, digital image setters and prepress software."
    ],
    duties_tr: [
      "Ticari baskı ve yayın için metin, resim ve düzenleri hazırlar.",
      "Provaları inceler, biçimlendirmeyi, renk ayrımını ve görüntü kalitesini kontrol eder.",
      "Bilgisayardan kalıba (CTP) sistemlerini, dijital görüntü kaydedicileri ve baskı öncesi yazılımları çalıştırır."
    ],
    duties_zh: [
      "为商业印刷和出版准备文本、图像和版面。",
      "审查样张，检查格式、分色和图像质量。",
      "操作电脑直接制版（CTP）系统、数码照排机和印前软件。"
    ]
  },
  "362311": {
    title_tr: "Çim Alan Sorumlusu (Greenkeeper)",
    title_zh: "草坪维护工",
    duties: [
      "Establishes and maintains sports turf, greens and fairways for golf courses or sports fields.",
      "Mows, rolls, waters, aerates, fertilizes and applies pest control to turf.",
      "Operates specialized turf machinery and maintains irrigation systems."
    ],
    duties_tr: [
      "Golf sahaları veya spor alanları için spor çimlerini, yeşil alanları ve oyun yollarını kurar ve bakımını yapar.",
      "Çimleri biçer, silindirler, sular, havalandırır, gübreler ve haşere kontrolü uygular.",
      "Özel çim makinelerini çalıştırır ve sulama sistemlerinin bakımını yapar."
    ],
    duties_zh: [
      "为高尔夫球场或运动场铺设并维护运动草坪、果岭和球道。",
      "对草坪进行修剪、碾压、浇水、打孔、施肥和病虫害防治。",
      "操作专业草坪机械并维护灌溉系统。"
    ]
  },
  "323312": {
    title_tr: "Silah Ustası / Tamircisi",
    title_zh: "枪械工",
    duties: [
      "Repairs, alters, restores and maintains firearms according to safety regulations.",
      "Diagnoses mechanical faults, replaces worn parts and fabricates custom components.",
      "Conducts test firings and verifies compliance with legal and safety specifications."
    ],
    duties_tr: [
      "Ateşli silahları güvenlik yönetmeliklerine uygun olarak onarır, değiştirir, restore eder ve bakımını yapar.",
      "Mekanik arızaları teşhis eder, aşınmış parçaları değiştirir ve özel bileşenler üretir.",
      "Test atışları gerçekleştirir ve yasal ve güvenlik spesifikasyonlarına uygunluğu doğrular."
    ],
    duties_zh: [
      "根据安全规定修理、改装、恢复和维护枪支。",
      "诊断机械故障，更换磨损部件并制作定制组件。",
      "进行试射并验证是否符合法律和安全规范。"
    ]
  },
  "452312": {
    title_tr: "Jimnastik Antrenörü veya Eğitmeni",
    title_zh: "体操教练或导师",
    duties: [
      "Teaches gymnastics techniques, safety and physical conditioning to students.",
      "Supervises training sessions, monitors safety and sets up equipment.",
      "Prepares students for gymnastics competitions, assessments and grading."
    ],
    duties_tr: [
      "Öğrencilere jimnastik tekniklerini, güvenliğini ve fiziksel kondisyonunu öğretir.",
      "Antrenman seanslarını denetler, güvenliği izler ve ekipmanları kurar.",
      "Öğrencileri jimnastik müsabakalarına, değerlendirmelerine ve derecelendirmelerine hazırlar."
    ],
    duties_zh: [
      "向学生教授体操技巧、安全和体能训练。",
      "监督训练课程、监控安全并安装设备。",
      "指导学生准备体操比赛、评估和分级。"
    ]
  },
  "142114": {
    title_tr: "Kuaför veya Güzellik Salonu Yöneticisi",
    title_zh: "美发或美容沙龙经理",
    duties: [
      "Directs, plans and coordinates operations of a hair or beauty salon.",
      "Manages salon staff, coordinates schedules, client bookings and service quality.",
      "Oversees product inventory, marketing, health compliance, budgets and sales."
    ],
    duties_tr: [
      "Bir kuaför veya güzellik salonunun operasyonlarını yönlendirir, planlar ve koordine eder.",
      "Salon personelini yönetir, programları, müşteri rezervasyonlarını ve hizmet kalitesini koordine eder.",
      "Ürün envanterini, pazarlamayı, sağlık kurallarına uyumu, bütçeleri ve satışları denetler."
    ],
    duties_zh: [
      "指导、规划和协调美发或美容沙龙的运营。",
      "管理沙龙员工、协调排班、客户预订和服务质量。",
      "监督产品库存、营销、卫生合规、预算和销售。"
    ]
  },
  "313111": {
    title_tr: "Donanım Teknisyeni",
    title_zh: "硬件技术员",
    duties: [
      "Installs, tests, maintains and repairs computer hardware and peripheral devices.",
      "Diagnoses hardware faults and replaces defective components.",
      "Assists with hardware upgrades, installations, network connectivity and security setups."
    ],
    duties_tr: [
      "Bilgisayar donanımını ve çevre birimlerini kurar, test eder, bakımını yapar ve onarır.",
      "Donanım arızalarını teşhis eder ve arızalı bileşenleri değiştirir.",
      "Donanım yükseltmeleri, kurulumları, ağ bağlantısı ve güvenlik kurulumlarına yardımcı olur."
    ],
    duties_zh: [
      "安装、测试、维护和修理计算机硬件及外围设备。",
      "诊断硬件故障并更换有缺陷的部件。",
      "协助硬件升级、安装、网络连接和安全设置。"
    ]
  },
  "134299": {
    title_tr: "Sağlık ve Sosyal Yardım Hizmetleri Yöneticileri (bhk)",
    title_zh: "医疗及福利服务经理（其他）",
    duties: [
      "Plans, directs and coordinates operations of health and welfare service organisations.",
      "Manages budgets, staff, resources and coordinates policy implementation.",
      "Liaises with health authorities, community groups and stakeholders."
    ],
    duties_tr: [
      "Sağlık ve sosyal yardım hizmeti kuruluşlarının operasyonlarını planlar, yönlendirir ve koordine eder.",
      "Bütçeleri, personeli, kaynakları yönetir ve politika uygulamasını koordine eder.",
      "Sağlık otoriteleri, topluluk grupları ve paydaşlarla iletişim kurar."
    ],
    duties_zh: [
      "规划、指导和协调医疗和福利服务机构的运营。",
      "管理预算、员工、资源并协调政策实施。",
      "与卫生部门、社区团体和利益相关者联络。"
    ]
  },
  "251999": {
    title_tr: "Sağlık Teşhis ve Tanıtım Profesyonelleri (bhk)",
    title_zh: "健康诊断及推广专业人员（其他）",
    duties: [
      "Performs diagnostic tests, promotes health education or coordinates health campaigns.",
      "Conducts health risk assessments and develops public health interventions.",
      "Ensures compliance with healthcare regulations, clinical standards and ethical frameworks."
    ],
    duties_tr: [
      "Teşhis testleri gerçekleştirir, sağlık eğitimini teşvik eder veya sağlık kampanyalarını koordine eder.",
      "Sağlık riski değerlendirmeleri yapar ve halk sağlığı müdahaleleri geliştirir.",
      "Sağlık düzenlemelerine, klinik standartlara ve etik çerçevelere uyumu sağlar."
    ],
    duties_zh: [
      "执行诊断测试、推广健康教育或协调健康活动。",
      "开展健康风险评估并制定公共卫生干预措施。",
      "确保符合医疗法规、临床标准和道德准则。"
    ]
  },
  "224213": {
    title_tr: "Sağlık Bilgi Yöneticisi",
    title_zh: "健康信息经理",
    duties: [
      "Manages health information systems, medical records and clinical data compliance.",
      "Oversees data collection, processing, reporting and ensures privacy protection.",
      "Collaborates with clinical teams to improve data quality and support healthcare decisions."
    ],
    duties_tr: [
      "Sağlık bilgi sistemlerini, tıbbi kayıtları ve klinik veri uyumluluğunu yönetir.",
      "Veri toplamayı, işlemeyi, raporlamayı denetler ve gizliliğin korunmasını sağlar.",
      "Veri kalitesini iyileştirmek ve sağlık kararlarını desteklemek için klinik ekiplerle iş birliği yapar."
    ],
    duties_zh: [
      "管理健康信息系统、病历和临床数据合规性。",
      "监督数据收集、处理、报告并确保隐私保护。",
      "与临床团队合作以提高数据质量并支持医疗决策。"
    ]
  },
  "512211": {
    title_tr: "Sağlık Ocağı / Klinik Yöneticisi",
    title_zh: "诊所主管",
    duties: [
      "Manages administrative and daily operations of a medical or healthcare clinic.",
      "Oversees reception staff, patient billing, appointment scheduling and record systems.",
      "Ensures clinic compliance with health regulations, safety protocols and practice standards."
    ],
    duties_tr: [
      "Bir tıp veya sağlık kliniğinin idari ve günlük operasyonlarını yönetir.",
      "Resepsiyon personelini, hasta faturalandırmasını, randevu planlamasını ve kayıt sistemlerini denetler.",
      "Kliniğin sağlık düzenlemelerine, güvenlik protokollerine ve uygulama standartlarına uyumunu sağlar."
    ],
    duties_zh: [
      "管理医疗或保健诊所的行政及日常运营。",
      "监督接待员工、患者计费、预约排班和档案系统。",
      "确保诊所符合卫生法规、安全规程和执业标准。"
    ]
  },
  "272411": {
    title_tr: "Tarihçi",
    title_zh: "历史学家",
    duties: [
      "Conducts research into past events, eras, societies and personalities.",
      "Analyses historical records, letters, archives, archaeological finds and sources.",
      "Writes reports, books, articles and presents historical findings to the public."
    ],
    duties_tr: [
      "Geçmiş olaylar, dönemler, toplumlar ve şahsiyetler üzerine araştırmalar yürütür.",
      "Tarihi kayıtları, mektupları, arşivleri, arkeolojik buluntuları ve kaynakları analiz eder.",
      "Raporlar, kitaplar, makaleler yazar ve tarihi bulguları kamuoyuna sunar."
    ],
    duties_zh: [
      "对过去的事件、时代、社会和人物展开研究。",
      "分析历史记录、书信、档案、考古发现和文献。",
      "撰写报告、书籍、文章并向公众展示历史发现。"
    ]
  },
  "121316": {
    title_tr: "At Yetiştiricisi",
    title_zh: "马匹育种员",
    duties: [
      "Breeds, raises and manages horses for racing, showing, working or pleasure.",
      "Monitors horse health, bloodlines, coordinates veterinary care, feeding and training.",
      "Manages breeding facilities, stud books, pasture and coordinates sales."
    ],
    duties_tr: [
      "Yarış, gösteri, iş veya hobi amaçlı atlar üretir, yetiştirir ve yönetir.",
      "At sağlığını, soy hatlarını izler, veteriner bakımını, beslemeyi ve eğitimi koordine eder.",
      "Yetiştirme tesislerini, hara kayıt defterlerini (stud book), merayı yönetir ve satışları koordine eder."
    ],
    duties_zh: [
      "繁育、饲养和管理马匹，以用于赛马、展览、工作或娱乐。",
      "监测马匹健康、血统，协调兽医护理、喂养和训练。",
      "管理繁育设施、马匹登记簿、牧场并协调销售。"
    ]
  },
  "452313": {
    title_tr: "Binicilik Antrenörü veya Eğitmeni",
    title_zh: "马术教练",
    duties: [
      "Teaches horse riding techniques, equestrian safety and stable management.",
      "Supervises riding lessons, assesses student skills and plans training programs.",
      "Ensures horses are fit, suitable and riding equipment is safe and maintained."
    ],
    duties_tr: [
      "Binicilik tekniklerini, binicilik güvenliğini ve ahır yönetimini öğretir.",
      "Binicilik derslerini denetler, öğrenci becerilerini değerlendirir ve antrenman programları planlar.",
      "Atların sağlıklı ve uygun olmasını, binicilik ekipmanlarının güvenli ve bakımlı olmasını sağlar."
    ],
    duties_zh: [
      "教授骑马技术、马术安全和马房管理。",
      "监督骑马课程，评估学生技能并制定训练计划。",
      "确保马匹健康、合适，且骑行装备安全并得到良好维护。"
    ]
  },
  "361112": {
    title_tr: "At Eğitmeni",
    title_zh: "驯马师",
    duties: [
      "Trains horses for racing, showing, working or riding using safe techniques.",
      "Monitors horse behavior, conditioning, feeding and coordinates health care.",
      "Liaises with owners, veterinarians, farriers and plans training schedules."
    ],
    duties_tr: [
      "Atları yarış, gösteri, iş veya binicilik için güvenli teknikler kullanarak eğitir.",
      "At davranışlarını, kondisyonunu, beslenmesini izler ve sağlık bakımını koordine eder.",
      "At sahipleriyle, veterinerlerle, nallayıcılarla iletişim kurar ve antrenman programlarını planlar."
    ],
    duties_zh: [
      "使用安全技术训练马匹以进行比赛、展览、工作或骑行。",
      "监测马匹行为、体能、喂养并协调医疗保健。",
      "与马主、兽医、蹄铁匠联络并制定训练计划。"
    ]
  },
  "149999": {
    title_tr: "Ağırlama, Perakende ve Hizmet Yöneticileri (bhk)",
    title_zh: "酒店、零售及服务经理（其他）",
    duties: [
      "Plans, directs and coordinates operations of hospitality, retail or service establishments.",
      "Manages staff, budgets, inventory and coordinates customer service quality.",
      "Ensures compliance with health regulations, safety policies and licensing laws."
    ],
    duties_tr: [
      "Ağırlama, perakende veya hizmet kuruluşlarının operasyonlarını planlar, yönetir ve koordine eder.",
      "Personeli, bütçeleri, envanteri yönetir ve müşteri hizmetleri kalitesini koordine eder.",
      "Sağlık yönetmeliklerine, güvenlik politikalarına ve ruhsat yasalarına uyumu sağlar."
    ],
    duties_zh: [
      "规划、指导和协调酒店、零售或服务机构的运营。",
      "管理员工、预算、库存并协调客户服务质量。",
      "确保符合卫生法规、安全政策和许可法律要求。"
    ]
  },
  "141311": {
    title_tr: "Otel veya Motel Yöneticisi",
    title_zh: "酒店或汽车旅馆经理",
    duties: [
      "Directs and plans operations of a hotel, motel or guest house.",
      "Manages staff, coordinates front office, housekeeping, bookings and budgets.",
      "Ensures compliance with health, liquor, security and safety regulations."
    ],
    duties_tr: [
      "Bir otel, motel veya konukevinin operasyonlarını yönlendirir ve planlar.",
      "Personeli yönetir, resepsiyonu, kat hizmetlerini, rezervasyonları ve bütçeleri koordine eder.",
      "Sağlık, alkol satışı, güvenlik ve emniyet yönetmeliklerine uyumu sağlar."
    ],
    duties_zh: [
      "指导并规划酒店、汽车旅馆或招待所的运营。",
      "管理员工、协调前厅、客房、预订和预算。",
      "确保符合卫生、酒类、保卫和安全规定。"
    ]
  },
  "431411": {
    title_tr: "Otel Hizmetleri Yöneticisi",
    title_zh: "酒店服务经理",
    duties: [
      "Coordinates support services in a hotel such as laundry, maintenance or valet.",
      "Supervises service staff, schedules shifts and ensures service standards.",
      "Liaises with suppliers, handles client complaints and assists with facility inspections."
    ],
    duties_tr: [
      "Çamaşırhane, bakım veya vale gibi otel destek hizmetlerini koordine eder.",
      "Hizmet personelini denetler, vardiyaları planlar ve hizmet standartlarını sağlar.",
      "Tedarikçilerle iletişim kurar, müşteri şikayetlerini ele alır ve tesis denetimlerine yardımcı olur."
    ],
    duties_zh: [
      "协调酒店的支助服务，如洗衣、维护或代客泊车。",
      "监督服务员工、安排轮班并确保服务标准。",
      "与供应商联络，处理客户投诉并协助设施检查。"
    ]
  },
  "234413": {
    title_tr: "Hidrojeolog",
    title_zh: "水文地质学家",
    duties: [
      "Studies distribution, movement and quality of groundwater in relation to geological structures.",
      "Conducts field surveys, water sampling, aquifer tests and resource modeling.",
      "Advises on groundwater management, environmental protection and drilling programs."
    ],
    duties_tr: [
      "Jeolojik yapılara bağlı olarak yeraltı suyunun dağılımını, hareketini ve kalitesini inceler.",
      "Saha araştırmaları, su numunesi alımı, akifer testleri ve kaynak modellemesi yapar.",
      "Yeraltı suyu yönetimi, çevre koruma ve sondaj programları konularında danışmanlık yapar."
    ],
    duties_zh: [
      "研究与地质结构相关的地下水分布、运动和质量。",
      "开展野外调查、水样采集、含水层测试和资源建模。",
      "就地下水管理、环境保护和钻探计划提供建议。"
    ]
  },
  "311415": {
    title_tr: "Hidrograf (Su Ölçüm Teknikeri)",
    title_zh: "水文测绘工",
    duties: [
      "Measures, analyses and maps physical features of water bodies and groundwater resources.",
      "Operates monitoring equipment, water samplers and telemetric systems.",
      "Calculates flow rates, records data and maps changes to water resources."
    ],
    duties_tr: [
      "Su kütlelerinin ve yeraltı su kaynaklarının fiziksel özelliklerini ölçer, analiz eder ve haritalandırır.",
      "İzleme ekipmanlarını, su numunesi alıcılarını ve telemetrik sistemleri çalıştırır.",
      "Akış hızlarını hesaplar, verileri kaydeder ve su kaynaklarındaki değişiklikleri haritalandırır."
    ],
    duties_zh: [
      "测量、分析和绘制水体及地下水资源的物理特征图。",
      "操作监测设备、水样采集器和遥测系统。",
      "计算流速、记录数据并绘制水资源变化图。"
    ]
  }
};

const FILE_PATH = path.join(process.cwd(), "src/data/anzsco-list.json");
const list = JSON.parse(readFileSync(FILE_PATH, "utf8")) as SearchEntry[];

let updatedCount = 0;
for (const entry of list) {
  const batchData = BATCH_2_DATA[entry.code];
  if (batchData) {
    Object.assign(entry, batchData);
    updatedCount += 1;
  }
}

writeFileSync(FILE_PATH, JSON.stringify(list, null, 2));
console.log(`Successfully updated ${updatedCount} entries in anzsco-list.json.`);
