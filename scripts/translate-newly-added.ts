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

const NEW_TRANSLATIONS: Record<string, Partial<SearchEntry>> = {
  "121312": {
    title_tr: "Besi Sığırı Yetiştiricisi",
    title_zh: "肉牛养殖户",
    duties: [
      "Plans, organizes and controls agricultural operations to breed and raise beef cattle.",
      "Monitors pasture growth, feeds livestock, and manages animal health treatments.",
      "Coordinates the sale and transport of cattle to market or abattoirs."
    ],
    duties_tr: [
      "Besi sığırı yetiştirmek ve büyütmek için tarımsal faaliyetleri planlar, organize eder ve kontrol eder.",
      "Mera büyümesini izler, çiftlik hayvanlarını besler ve hayvan sağlığı tedavilerini yönetir.",
      "Sığırların pazara veya mezbahalara satışını ve nakliyesini koordine eder."
    ],
    duties_zh: [
      "规划、组织和控制农业运营以繁育和饲养肉牛。",
      "监测牧草生长、喂养牲畜，并管理动物健康防疫治疗。",
      "协调将牛只出售和运输至市场或屠宰场。"
    ]
  },
  "224311": {
    title_tr: "İktisatçı / Ekonomist",
    title_zh: "经济学家",
    duties: [
      "Conducts research, monitors data and analyzes economic policies and trends.",
      "Prepares reports and forecasts on market patterns, inflation, and fiscal policies.",
      "Advises government departments, corporations or clients on economic strategy."
    ],
    duties_tr: [
      "Araştırmalar yürütür, verileri izler ve ekonomik politikaları ile eğilimleri analiz eder.",
      "Pazar örüntüleri, enflasyon ve mali politikalar hakkında raporlar ve tahminler hazırlar.",
      "Kamu kurumlarına, şirketlere veya müşterilere ekonomik strateji konusunda danışmanlık yapar."
    ],
    duties_zh: [
      "开展研究、监测数据并分析经济政策和趋势。",
      "准备关于市场格局、通货膨胀和财政政策的报告和预测。",
      "就经济战略向政府部门、企业或客户提供咨询建议。"
    ]
  },
  "394113": {
    title_tr: "Mobilya İmalatçısı / Ustası",
    title_zh: "家具制造工",
    duties: [
      "Fabricates, assembles and finishes wooden furniture items using hand and power tools.",
      "Reads drawings and specifications, cuts wood components and fits joints.",
      "Applies veneers, stains, polishes and installs hardware fittings."
    ],
    duties_tr: [
      "El ve elektrikli aletleri kullanarak ahşap mobilya ürünlerini imal eder, monte eder ve cilalar.",
      "Çizimleri ve teknik özellikleri okur, ahşap bileşenleri keser ve ek yerlerini birleştirir.",
      "Kaplama, boya, cila uygular ve hırdavat aksesuarlarını monte eder."
    ],
    duties_zh: [
      "使用手工和电动工具制造、组装和精整木制家具物品。",
      "阅读图纸和规格说明，切割木材部件并进行接头装配。",
      "涂抹贴面板、着色剂、进行抛光并安装五金配件。"
    ]
  },
  "225212": {
    title_tr: "BİT (ICT) İş Geliştirme Müdürü",
    title_zh: "信息通信技术业务开发经理",
    duties: [
      "Identifies and develops new business opportunities for ICT products and services.",
      "Manages client relationships, prepares proposals and negotiates contract terms.",
      "Collaborates with technical teams to ensure alignment with client requirements."
    ],
    duties_tr: [
      "BİT (ICT) ürün ve hizmetleri için yeni iş fırsatlarını belirler ve geliştirir.",
      "Müşteri ilişkilerini yönetir, teklifler hazırlar ve sözleşme koşullarını müzakere eder.",
      "Müşteri gereksinimleriyle uyumu sağlamak için teknik ekiplerle iş birliği yapar."
    ],
    duties_zh: [
      "为信息通信技术（ICT）产品和服务寻找并开发新的业务增长机会。",
      "管理客户关系、准备项目提案并谈判合同条款。",
      "与技术团队协作以确保方案符合客户的技术和业务需求。"
    ]
  },
  "222313": {
    title_tr: "Yatırım Danışmanı",
    title_zh: "投资顾问",
    duties: [
      "Provides financial advice to clients on investment strategies, stocks, and bonds.",
      "Analyzes market trends, evaluates risk profiles and manages investment portfolios.",
      "Ensures compliance with financial regulations and client investment mandates."
    ],
    duties_tr: [
      "Müşterilere yatırım stratejileri, hisse senetleri ve tahviller konusunda finansal danışmanlık sağlar.",
      "Pazar eğilimlerini analiz eder, risk profillerini değerlendirir ve yatırım portföylerini yönetir.",
      "Finansal düzenlemelere ve müşteri yatırım yetkilerine uyumu sağlar."
    ],
    duties_zh: [
      "就投资策略、股票和债券向客户提供财务咨询建议。",
      "分析市场趋势、评估风险画像并管理投资组合。",
      "确保符合金融监管法规 and 客户的投资授权要求。"
    ]
  },
  "271211": {
    title_tr: "Hâkim / Yargıç",
    title_zh: "法官",
    duties: [
      "Presides over trials and hearings in courts of law to administer justice.",
      "Interprets laws, evaluates evidence and rules on legal procedures and arguments.",
      "Pronounces judgments, sentences and determines civil liability or damages."
    ],
    duties_tr: [
      "Adaleti tesis etmek amacıyla mahkemelerdeki duruşmalara ve yargılamalara başkanlık eder.",
      "Kanunları yorumlar, delilleri değerlendirir ve yasal prosedürler ile iddialar hakkında karar verir.",
      "Hüküm ve cezaları açıklar, hukuki sorumluluğu veya tazminatları belirler."
    ],
    duties_zh: [
      "主持法庭审判和听证会以执行司法公正。",
      "解释法律、评估证据并就法律程序和辩论做出裁决。",
      "宣判判决、刑罚并确定民事责任或损害赔偿。"
    ]
  },
  "232214": {
    title_tr: "Harita Mühendisi / Kadastro Ölçüm Uzmanı",
    title_zh: "土地测量师",
    duties: [
      "Surveys land surface parameters to determine boundaries, topography and features.",
      "Operates geodetic instruments, GPS systems and aerial mapping tools.",
      "Prepares official survey plans, reports and cadastral data registers."
    ],
    duties_tr: [
      "Sınırları, topografyayı ve özellikleri belirlemek için arazi yüzey parametrelerini ölçer.",
      "Jeodezik aletleri, GPS sistemlerini ve havadan haritalama araçlarını çalıştırır.",
      "Resmi harita planlarını, raporları ve kadastro veri kayıtlarını hazırlar."
    ],
    duties_zh: [
      "测量土地表面参数以确定边界、地形和特征。",
      "操作大地测量仪器、GPS系统和航空测绘工具。",
      "准备官方测量图纸、报告和地籍数据登记册。"
    ]
  },
  "271312": {
    title_tr: "Hukuk Müşaviri",
    title_zh: "法律顾问",
    duties: [
      "Provides legal advice and representation to corporations, organizations or agencies.",
      "Drafts and reviews contracts, legal briefs, policies and transaction terms.",
      "Manages litigation, regulatory compliance risks and dispute resolutions."
    ],
    duties_tr: [
      "Şirketlere, kuruluşlara veya kurumlara hukuki danışmanlık ve temsil sağlar.",
      "Sözleşmeleri, hukuki özetleri, politikaları ve işlem koşullarını tasarlar ve inceler.",
      "Dava süreçlerini, mevzuata uyum risklerini ve uyuşmazlık çözümlerini yönetir."
    ],
    duties_zh: [
      "向公司、组织或机构提供法律咨询和代理服务。",
      "起草和审查合同、法律文书、政策和交易条款。",
      "管理诉讼、合规风险和争议解决。"
    ]
  },
  "271313": {
    title_tr: "Hukuk Bürosu Yöneticisi / Direktörü",
    title_zh: "法律执业总监",
    duties: [
      "Directs, plans and manages the operations of a legal practice or law firm.",
      "Supervises lawyers, reviews caseloads, and directs legal strategy.",
      "Manages firm budgets, compliance, billing and client relationship development."
    ],
    duties_tr: [
      "Bir hukuk uygulamasının veya hukuk firmasının operasyonlarını yönlendirir, planlar ve yönetir.",
      "Avukatları denetler, dava yüklerini gözden geçirir ve hukuki stratejiyi yönlendirir.",
      "Firma bütçelerini, uyumluluğu, faturalandırmayı ve müşteri ilişkileri geliştirmeyi yönetir."
    ],
    duties_zh: [
      "指导、规划和管理律师事务所或法律执业机构的运营。",
      "监督律师、审查案卷负载并指导法律战略。",
      "管理事务所预算、合规性、计费和客户关系开发。"
    ]
  },
  "441111": {
    title_tr: "Kütüphane Yardımcısı / Asistanı",
    title_zh: "图书管理员助理",
    duties: [
      "Assists patrons in locating books, resources and database materials.",
      "Shelves books, registers new members and manages circulation transactions.",
      "Performs administrative tasks, cataloging checks and monitors quiet study zones."
    ],
    duties_tr: [
      "Kütüphane kullanıcılarına kitapları, kaynakları ve veri tabanı materyallerini bulmada yardımcı olur.",
      "Kitapları raflara dizer, yeni üyeleri kaydeder ve ödünç verme işlemlerini yönetir.",
      "İdari görevleri, katalog kontrollerini yürütür ve sessiz çalışma alanlarını denetler."
    ],
    duties_zh: [
      "协助读者查找图书、资源和数据库资料。",
      "上架图书、登记新会员并管理借还书流通事务。",
      "执行行政任务、目录检查并监控安静学习区域。"
    ]
  },
  "733113": {
    title_tr: "Şehirlerarası / Hat Ağır Vasıta Kamyon Şoförü",
    title_zh: "干线卡车司机",
    duties: [
      "Operates heavy trucks or multi-trailer rigs to transport goods between cities.",
      "Performs pre-trip vehicle checks, secures freight loads and logs driving hours.",
      "Adheres to road transit safety codes, load weights and driving break policies."
    ],
    duties_tr: [
      "Şehirler arasında mal taşımak için ağır kamyonları veya çok römorklu çekicileri çalıştırır.",
      "Sefer öncesi araç kontrollerini gerçekleştirir, yükleri emniyete alır ve sürüş saatlerini kaydeder.",
      "Karayolu geçiş güvenliği kurallarına, yük ağırlıklarına ve sürüş molası politikalarına uyar."
    ],
    duties_zh: [
      "驾驶重型卡车或多挂车车辆在城市之间运输货物。",
      "进行行车前车辆检查、固定货运载荷并记录驾驶时间。",
      "遵守道路运输安全规范、载荷重量和驾驶休息政策。"
    ]
  },
  "591111": {
    title_tr: "Lojistik Görevlisi / Memuru",
    title_zh: "物流文员",
    duties: [
      "Coordinates and logs the routing, dispatch and receipt of incoming and outgoing goods.",
      "Prepares shipping documentation, invoices, customs papers and transit schedules.",
      "Liaises with transport firms, warehouse crews and resolves delivery delays."
    ],
    duties_tr: [
      "Gelen ve giden malların yönlendirilmesini, sevk edilmesini ve teslim alınmasını koordine eder ve kaydeder.",
      "Nakliye belgelerini, faturaları, gümrük kağıtlarını ve transit programlarını hazırlar.",
      "Nakliye firmaları, depo ekipleri ile iletişim kurar ve teslimat gecikmelerini çözer."
    ],
    duties_zh: [
      "协调并记录进出货物的路线规划、派遣和接收。",
      "准备装运单据、发票、报关单和运输日程表。",
      "与运输公司、仓库人员联络并解决送货延迟问题。"
    ]
  },
  "733112": {
    title_tr: "Uzun Yol Kamyon Şoförü",
    title_zh: "长途卡车司机",
    duties: [
      "Drives heavy vehicles over long distances to transport freight and goods.",
      "Secures vehicle loads, reviews route logistics and monitors fuel usage.",
      "Maintains log books tracking travel times, rest periods and vehicle maintenance."
    ],
    duties_tr: [
      "Navlun ve malları taşımak için ağır taşıtları uzun mesafelerde sürer.",
      "Araç yüklerini emniyete alır, güzergah lojistiğini inceler ve yakıt kullanımını izler.",
      "Seyahat sürelerini, dinlenme sürelerini ve araç bakımını takip eden kayıt defterlerini tutar."
    ],
    duties_zh: [
      "长途驾驶重型车辆以运输货运和货物。",
      "固定车辆载荷、审查路线物流并监控燃油使用情况。",
      "维护记录出行时间、休息期间和车辆保养的日志簿。"
    ]
  },
  "263114": {
    title_tr: "Ağ (Network) Mühendisi",
    title_zh: "网络工程师",
    duties: [
      "Designs, builds, configures and optimizes local and wide area network infrastructure.",
      "Monitors network performance, resolves outages and configures firewall rules.",
      "Installs network routers, switches, optical links and evaluates hardware load."
    ],
    duties_tr: [
      "Yerel ve geniş alan ağı altyapısını tasarlar, kurar, yapılandırır ve optimize eder.",
      "Ağ performansını izler, kesintileri giderir ve güvenlik duvarı kurallarını yapılandırır.",
      "Ağ yönlendiricilerini, anahtarları, optik bağlantıları kurar ve donanım yükünü değerlendirir."
    ],
    duties_zh: [
      "设计、构建、配置和优化局域网和广域网基础设施。",
      "监控网络性能、解决网络中断并配置防火墙规则。",
      "安装网络路由器、交换机、光纤链路并评估硬件负载。"
    ]
  },
  "411215": {
    title_tr: "Ağız ve Diş Sağlığı Terapisti",
    title_zh: "口腔健康治疗师",
    duties: [
      "Provides oral health care, dental cleanings, and preventive treatments.",
      "Performs routine dental fillings, extractions for children and takes radiographs.",
      "Educates patients on oral hygiene practices and coordinates specialist referrals."
    ],
    duties_tr: [
      "Ağız sağlığı bakımı, diş temizliği ve koruyucu tedaviler sağlar.",
      "Rutin diş dolguları yapar, çocuklar için diş çekimi gerçekleştirir ve röntgen çeker.",
      "Hastaları ağız hijyeni uygulamaları konusunda eğitir ve uzman sevklerini koordine eder."
    ],
    duties_zh: [
      "提供口腔健康护理、洗牙和预防性治疗。",
      "为儿童进行常规牙齿填充、拔牙并拍摄放射片。",
      "向患者科普口腔卫生习惯并协调专科转诊事宜。"
    ]
  },
  "452912": {
    title_tr: "Açık Hava Macera / Doğa Sporları Rehberi",
    title_zh: "户外探险导游",
    duties: [
      "Leads individuals or groups in outdoor adventure activities like trekking or rafting.",
      "Briefs safety protocols, monitors weather trends and manages emergency gear.",
      "Maintains active first aid credentials, updates site navigation logs and maps."
    ],
    duties_tr: [
      "Trekking veya rafting gibi açık hava macera aktivitelerinde bireylere veya gruplara liderlik eder.",
      "Güvenlik protokolleri hakkında bilgi verir, hava durumu eğilimlerini izler ve acil durum ekipmanlarını yönetir.",
      "Aktif ilk yardım belgelerini korur, saha navigasyon kayıtlarını ve haritalarını günceller."
    ],
    duties_zh: [
      "带领个人或团体进行徒步旅行或漂流等户外探险活动。",
      "简要介绍安全规程、监测天气趋势并管理应急装备。",
      "维持有效的急救资质证书，更新现场导航日志和地图。"
    ]
  },
  "332299": {
    title_tr: "Diğer Boyama Ustaları ve Zanaatkarları (bhk)",
    title_zh: "油漆工及相关工（其他）",
    duties: [
      "Applies paint, coatings, and finishes to surfaces not elsewhere classified.",
      "Prepares walls, sandpapers materials, and applies protective primers.",
      "Maintains spray guns, brushes, rollers and follows site safety codes."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış yüzeylere boya, kaplama ve cila uygular.",
      "Duvarları hazırlar, malzemeleri zımparalar ve koruyucu astarlar uygular.",
      "Püskürtme tabancalarının, fırçaların, ruloların bakımını yapar ve saha güvenlik kurallarına uyar."
    ],
    duties_zh: [
      "向未另分类的表面涂刷油漆、涂料和精整面漆。",
      "处理墙体基面、打磨材料，并涂刷防护底漆。",
      "保养喷枪、刷子、滚筒并遵守现场安全规范。"
    ]
  },
  "599311": {
    title_tr: "Avukat Yardımcısı / Adli Katip / Paralegal",
    title_zh: "律师助理",
    duties: [
      "Assists lawyers by conducting legal research, drafting documents and organizing files.",
      "Prepares contracts, affidavits, legal briefs and schedules court filings.",
      "Liaises with clients, court staff and coordinates evidentiary materials."
    ],
    duties_tr: [
      "Hukuki araştırmalar yürüterek, belgeler hazırlayarak ve dosyaları düzenleyerek avukatlara yardımcı olur.",
      "Sözleşmeleri, yeminli ifadeleri, hukuki özetleri hazırlar ve mahkeme başvurularını programlar.",
      "Müşterilerle, mahkeme personeliyle iletişim kurar ve kanıt niteliğindeki materyalleri koordine eder."
    ],
    duties_zh: [
      "通过开展法律研究、起草文件和整理案卷来协助律师工作。",
      "准备合同、宣誓书、法律文书并排定法庭申报进度。",
      "与客户、法庭工作人员联络并协调证据材料。"
    ]
  },
  "411714": {
    title_tr: "Emekli ve Yaşlı Sosyal Yardım Görevlisi",
    title_zh: "退休人员福利专员",
    duties: [
      "Assists pensioners in accessing social security benefits, housing and medical services.",
      "Evaluates support needs, drafts welfare plans and organizes community visits.",
      "Liaises with welfare departments, aged care providers and health teams."
    ],
    duties_tr: [
      "Emeklilerin sosyal güvenlik yardımlarına, barınma ve tıbbi hizmetlere erişmelerine yardımcı olur.",
      "Destek ihtiyaçlarını değerlendirir, yardım planları hazırlar ve topluluk ziyaretleri organize eder.",
      "Sosyal yardım daireleri, yaşlı bakım sağlayıcıları ve sağlık ekipleriyle iletişim kurar."
    ],
    duties_zh: [
      "协助退休人员获取社会保障福利、住房和医疗服务。",
      "评估支持需求、起草福利计划并组织社区探访。",
      "与福利部门、养老服务提供商和医疗团队联络。"
    ]
  },
  "423311": {
    title_tr: "Kişisel Bakım Yardımcısı / Refakatçi",
    title_zh: "个人护理助理",
    duties: [
      "Provides daily living support, personal hygiene and care tasks to elderly or disabled individuals.",
      "Assists with mobility, meals, medication reminders and keeps daily logs.",
      "Monitors patient conditions, logs deviations and coordinates with clinical staff."
    ],
    duties_tr: [
      "Yaşlı veya engelli bireylere günlük yaşam desteği, kişisel hijyen ve bakım görevleri sağlar.",
      "Hareket kabiliyetine, yemeklere, ilaç hatırlatmalarına yardımcı olur ve günlük kayıtlar tutar.",
      "Hasta durumlarını izler, sapmaları kaydeder ve klinik personel ile koordine çalışır."
    ],
    duties_zh: [
      "为老年人或残疾人提供日常生活支持、个人卫生和护理任务。",
      "协助活动、用餐、用药提醒并记录日常日志。",
      "监测患者状况、记录异常并与临床工作人员协调。"
    ]
  },
  "234518": {
    title_tr: "Farmakolog",
    title_zh: "药理学家",
    duties: [
      "Researches and analyzes the effects of drugs and chemical substances on biological systems.",
      "Conducts clinical trials, tests toxic levels and develops medical formulations.",
      "Prepares drug safety profiles, reports and checks regulatory standards compliance."
    ],
    duties_tr: [
      "İlaçların ve kimyasal maddelerin biyolojik sistemler üzerindeki etkilerini araştırır ve analiz eder.",
      "Klinik araştırmalar yürütür, toksik seviyeleri test eder ve tıbbi formülasyonlar geliştirir.",
      "İlaç güvenliği profilleri ile raporları hazırlar ve yasal standartlara uyumu kontrol eder."
    ],
    duties_zh: [
      "研究和分析药物及化学物质对生物系统的影响。",
      "进行临床试验、测试毒性水平并开发医药制剂。",
      "准备药物安全概况、报告并检查监管标准的合规情况。"
    ]
  },
  "441312": {
    title_tr: "Polis Müfettişi / Başkomiser",
    title_zh: "警督",
    duties: [
      "Directs, plans and coordinates law enforcement operations within a police district.",
      "Supervises junior police officers, manages criminal investigations and budgets.",
      "Liaises with community groups, courts and handles public safety reports."
    ],
    duties_tr: [
      "Bir polis bölgesindeki kolluk kuvvetleri operasyonlarını yönlendirir, planlar ve koordine eder.",
      "Ast polis memurlarını denetler, cezai soruşturmaları ve bütçeleri yönetir.",
      "Topluluk gruplarıyla, mahkemelerle iletişim kurar ve kamu güvenliği raporlarını yürütür."
    ],
    duties_zh: [
      "指导、规划和协调辖区内的执法行动。",
      "监督下级警员、管理刑事侦查工作并管控预算。",
      "与社区团体、法庭联络并处理公共安全报告。"
    ]
  },
  "441311": {
    title_tr: "Polis Memuru",
    title_zh: "警员",
    duties: [
      "Maintains public order, enforces laws, and patrols assigned sectors.",
      "Responds to emergency calls, arrests offenders, and gathers witness evidence.",
      "Prepares crime reports, presents evidence in court and directs traffic."
    ],
    duties_tr: [
      "Kamu düzenini korur, yasaları uygular ve atanan sektörlerde devriye gezer.",
      "Acil çağrılara yanıt verir, suçluları tutuklar ve tanık delillerini toplar.",
      "Suç raporları hazırlar, mahkemede delil sunar ve trafiği yönlendirir."
    ],
    duties_zh: [
      "维护公共秩序、执行法律并巡逻指定防区。",
      "应对紧急呼叫、逮捕违法者并收集证人证据。",
      "准备犯罪报告、在法庭上出示证据并指挥交通。"
    ]
  },
  "839911": {
    title_tr: "Montaj / Ürün Montaj Elemanı",
    title_zh: "产品装配工",
    duties: [
      "Assembles components to fabricate finished goods or parts in a manufacturing plant.",
      "Operates basic assembly machinery, hand tools, and monitors quality specs.",
      "Cleans work bays, maintains equipment, and files product counts logs."
    ],
    duties_tr: [
      "Bir üretim tesisinde bitmiş ürünleri veya parçaları imal etmek için bileşenleri birleştirir.",
      "Temel montaj makinelerini, el aletlerini çalıştırır ve kalite özelliklerini izler.",
      "Çalışma alanlarını temizler, ekipman bakımını yapar ve ürün adet kayıtlarını dosyalar."
    ],
    duties_zh: [
      "在制造厂组装零部件以制造成品货物或零件。",
      "操作基本装配机械、手工工具并监控质量规格。",
      "清洁工作舱、维护设备并归档产品计数日志。"
    ]
  },
  "591114": {
    title_tr: "Satın Alma Sorumlusu / Görevlisi",
    title_zh: "采购员",
    duties: [
      "Purchases goods, materials and services for commercial or industrial firms.",
      "Negotiates supplier contract terms, price limits and reviews shipping times.",
      "Audits inventory levels, manages purchase orders and evaluates supplier ratings."
    ],
    duties_tr: [
      "Ticari veya endüstriyel firmalar için mal, malzeme ve hizmet satın alır.",
      "Tedarikçi sözleşme koşullarını, fiyat sınırlarını müzakere eder ve sevkiyat sürelerini inceler.",
      "Stok seviyelerini denetler, satın alma siparişlerini yönetir ve tedarikçi derecelendirmelerini değerlendirir."
    ],
    duties_zh: [
      "为商业或工业公司采购货物、材料和服务。",
      "谈判供应商合同条款、价格限制并审查发货时间。",
      "审计库存水平、管理采购订单并评估供应商评级。"
    ]
  },
  "821611": {
    title_tr: "Demiryolu Hat Bakım ve Yapım İşçisi",
    title_zh: "铁路轨道工",
    duties: [
      "Lays, repairs, tests and maintains railway tracks, sleepers and ballast.",
      "Operates heavy drills, cutting tools and monitors track alignments.",
      "Places warning markers, secures work zones and reports track faults."
    ],
    duties_tr: [
      "Demiryolu raylarını, traversleri ve balastları döşer, onarır, test eder ve bakımını yapar.",
      "Ağır matkapları, kesme aletlerini çalıştırır ve ray hizalamalarını izler.",
      "Uyarı işaretleri yerleştirir, çalışma alanlarını emniyete alır ve ray arızalarını bildirir."
    ],
    duties_zh: [
      "铺设、修理、测试和维护铁路轨道、轨枕和道砟。",
      "操作重型钻机、切割工具并监控轨道对齐情况。",
      "放置警告标志、确保工作区安全并报告轨道故障。"
    ]
  },
  "542111": {
    title_tr: "Resepsiyonist / Danışma Görevlisi (Genel)",
    title_zh: "接待员",
    duties: [
      "Welcomes visitors, answers telephone calls, and manages client queries.",
      "Schedules appointments, updates calendars and sorts incoming mail.",
      "Performs general administration, runs office machines and maintains logs."
    ],
    duties_tr: [
      "Ziyaretçileri karşılar, telephone aramalarını yanıtlar ve müşteri taleplerini yönetir.",
      "Randevuları planlar, takvimleri günceller ve gelen postaları tasnif eder.",
      "Genel ofis yönetimini yürütür, ofis makinelerini çalıştırır ve kayıtları tutar."
    ],
    duties_zh: [
      "接待访客、接听电话并管理客户咨询。",
      "安排预约、更新日历并分类整理来信。",
      "执行通用行政事务、操作办公设备并维护日志记录。"
    ]
  },
  "253327": {
    title_tr: "Nefroloji Uzmanı (Böbrek Hastalıkları Uzmanı)",
    title_zh: "肾脏科医生",
    duties: [
      "Diagnoses, treats and manages disorders and diseases of the kidneys.",
      "Manages dialysis programs, renal biopsies and coordinates transplants care.",
      "Consults with patients, orders diagnostic scans and reviews lab tests."
    ],
    duties_tr: [
      "Böbrek bozukluklarını ve hastalıklarını teşhis eder, tedavi eder ve yönetir.",
      "Diyalis programlarını, böbrek biyopsilerini yönetir ve nakil bakım süreçlerini koordine eder.",
      "Hastalarla görüşür, teşhis amaçlı taramalar ister ve laboratuvar testlerini inceler."
    ],
    duties_zh: [
      "诊断、治疗和管理肾脏疾病及功能障碍。",
      "管理透析方案、肾活检并协调移植护理。",
      "咨询患者、开具诊断性扫描并审查实验室测试结果。"
    ]
  },
  "272415": {
    title_tr: "Sosyolog",
    title_zh: "社会学家",
    duties: [
      "Researches and analyzes social behaviors, institutions, cultures and structures.",
      "Designs surveys, gathers qualitative datasets and conducts statistical audits.",
      "Prepares academic reports, policy reviews and advises government programs."
    ],
    duties_tr: [
      "Sosyal davranışları, kurumları, kültürleri ve yapıları araştırır ve analiz eder.",
      "Anketler tasarlar, nitel veri setleri toplar ve istatistiksel denetimler yürütür.",
      "Akademik raporlar, politika incelemeleri hazırlar ve kamu programlarına danışmanlık yapar."
    ],
    duties_zh: [
      "研究和分析社会行为、机构、文化和结构。",
      "设计问卷调查、收集定性数据集并开展统计审计。",
      "准备学术报告、政策审查并向政府项目提供咨询建议。"
    ]
  },
  "252999": {
    title_tr: "Diğer Terapistler ve Sağlık Uygulayıcıları (bhk)",
    title_zh: "治疗师（其他）",
    duties: [
      "Provides therapeutic treatments and health care services not elsewhere classified.",
      "Assesses patient conditions, plans custom therapy programs and reviews outcomes.",
      "Educates patients on recovery routines, exercise targets and home care."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış terapötik tedaviler ve sağlık hizmetleri sağlar.",
      "Hasta durumlarını değerlendirir, özel terapi programları planlar ve sonuçları inceler.",
      "Hastaları iyileşme rutinleri, egzersiz hedefleri ve evde bakım konusunda eğitir."
    ],
    duties_zh: [
      "提供未另分类的治疗和保健服务。",
      "评估患者状况、制定个性化治疗方案并审查效果。",
      "指导患者康复常规、锻炼目标和家庭护理。"
    ]
  },
  "821111": {
    title_tr: "Zanaatkar Yardımcısı / Çırak",
    title_zh: "行业助理",
    duties: [
      "Assists tradespersons by carrying materials, holding components and cleaning sites.",
      "Operates basic hand tools, prepares surfaces and sets up scaffolding.",
      "Performs heavy lifting, loads transport trucks and maintains store inventories."
    ],
    duties_tr: [
      "Malzemeleri taşıyarak, parçaları tutarak ve çalışma sahasını temizleyerek zanaatkarlara yardımcı olur.",
      "Temel el aletlerini çalıştırır, yüzeyleri hazırlar ve iskeleleri kurar.",
      "Ağır kaldırma işlerini gerçekleştirir, taşıma kamyonlarını yükler ve depo envanterlerini korur."
    ],
    duties_zh: [
      "通过搬运材料、固定工件和清洁现场来协助技术工人工作。",
      "操作基本手工工具、处理基底表面并搭建脚手架。",
      "执行重物搬运、装载运输卡车并维护仓库库存。"
    ]
  },
  "733111": {
    title_tr: "Kamyon Şoförü (Genel)",
    title_zh: "卡车司机",
    duties: [
      "Drives heavy trucks to transport goods, freight and equipment locally.",
      "Secures vehicle cargo, checks road permits and routes transit schedules.",
      "Logs travel distances, fuel stops and performs basic vehicle maintenance."
    ],
    duties_tr: [
      "Malları, navlunları ve ekipmanları yerel olarak taşımak için ağır kamyonlar sürer.",
      "Araç kargolarını emniyete alır, yol izinlerini kontrol eder ve transit programlarını belirler.",
      "Seyahat mesafelerini, yakıt duraklarını kaydeder ve temel araç bakımını gerçekleştirir."
    ],
    duties_zh: [
      "驾驶重型卡车在本地运输货物、货运和设备。",
      "固定车辆货物、检查路网许可证并规划运输日程。",
      "记录行驶里程、加油站点并进行基本车辆维护。"
    ]
  },
  "542211": {
    title_tr: "Daktilograf / Klavye Operatörü / Sekreter",
    title_zh: "打字员",
    duties: [
      "Types and formats correspondence, reports and documents from rough drafts.",
      "Enters data into electronic systems, reviews spelling and catalog registers.",
      "Performs general filing, photocopying and manages clerical document routing."
    ],
    duties_tr: [
      "Müsveddelerden yazışmaları, raporları ve belgeleri yazar ve biçimlendirir.",
      "Verileri elektronik sistemlere girer, imlayı ve katalog kayıtlarını inceler.",
      "Genel dosyalama, fotokopi işlemlerini yürütür ve büro içi evrak yönlendirmesini yönetir."
    ],
    duties_zh: [
      "根据草稿打印并格式化信件、报告和文件。",
      "将数据录入电子系统、审查拼写并核对目录登记册。",
      "执行常规文件归档、复印并管理文书文件传阅工作。"
    ]
  }
};

const SEARCH_PATH = path.join(process.cwd(), "src/data/anzsco-list.json");
const list = JSON.parse(readFileSync(SEARCH_PATH, "utf8")) as SearchEntry[];

let updatedCount = 0;
for (const entry of list) {
  const batchData = NEW_TRANSLATIONS[entry.code];
  if (batchData) {
    Object.assign(entry, batchData);
    updatedCount += 1;
  }
}

writeFileSync(SEARCH_PATH, JSON.stringify(list, null, 2));
console.log(`Successfully updated ${updatedCount} entries in anzsco-list.json.`);
