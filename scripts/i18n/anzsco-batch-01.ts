import { applyBatch, type BatchEntry } from "./apply-anzsco-batch";

// Batch 01 — first 40 newly-added occupations (alphabetical). Professional
// immigration/ANZSCO 2022 terminology. "(bhk)" = başka bir yerde
// kategorilendirilmemiş (nec / not elsewhere classified).
const BATCH_01: BatchEntry[] = [
  {
    code: "141999",
    title_tr: "Konaklama ve Ağırlama Müdürleri (bhk)",
    title_zh: "住宿及酒店经理（其他）",
    skillLevel: "Skill Level 2",
    duties: [
      "Plans, organises and directs the operations of accommodation and hospitality establishments.",
      "Manages staff, budgets, bookings and guest services to meet quality and safety standards.",
      "Ensures compliance with liquor, health and workplace regulations.",
    ],
    duties_tr: [
      "Konaklama ve ağırlama işletmelerinin operasyonlarını planlar, düzenler ve yönetir.",
      "Kalite ve güvenlik standartlarını karşılamak için personeli, bütçeleri, rezervasyonları ve misafir hizmetlerini yönetir.",
      "İçki, sağlık ve iş yeri mevzuatına uyumu sağlar.",
    ],
    duties_zh: [
      "规划、组织和指导住宿及酒店场所的运营。",
      "管理员工、预算、预订和宾客服务，以达到质量与安全标准。",
      "确保遵守酒类、卫生及工作场所相关法规。",
    ],
  },
  {
    code: "211199",
    title_tr: "Aktörler, Dansçılar ve Diğer Sanatçılar (bhk)",
    title_zh: "演员、舞蹈演员及其他表演者（其他）",
    skillLevel: "Skill Level 1",
    duties: [
      "Interprets and performs roles or routines for stage, screen, broadcast or live audiences.",
      "Rehearses and develops technique, timing and characterisation with directors and choreographers.",
      "Adapts performances to the production brief, venue and audience.",
    ],
    duties_tr: [
      "Sahne, ekran, yayın veya canlı izleyiciler için rolleri ya da gösterileri yorumlar ve sergiler.",
      "Yönetmenler ve koreograflarla teknik, zamanlama ve karakterizasyon üzerine prova yapar ve geliştirir.",
      "Gösterileri prodüksiyon brifingine, mekâna ve izleyiciye göre uyarlar.",
    ],
    duties_zh: [
      "为舞台、银幕、广播或现场观众诠释并表演角色或节目。",
      "与导演和编舞排练并提升技巧、节奏与角色塑造。",
      "根据制作要求、场地及观众调整表演。",
    ],
  },
  {
    code: "231199",
    title_tr: "Hava Taşımacılığı Profesyonelleri (bhk)",
    title_zh: "航空运输专业人员（其他）",
    skillLevel: "Skill Level 1",
    duties: [
      "Performs specialised air transport functions supporting flight operations and safety.",
      "Applies aviation regulations, procedures and navigation or dispatch standards.",
      "Coordinates with crew, air traffic and ground services to ensure compliant operations.",
    ],
    duties_tr: [
      "Uçuş operasyonlarını ve güvenliğini destekleyen uzmanlaşmış hava taşımacılığı işlevlerini yürütür.",
      "Havacılık mevzuatını, prosedürlerini ve seyrüsefer veya sevk standartlarını uygular.",
      "Uyumlu operasyonlar için ekip, hava trafiği ve yer hizmetleriyle koordinasyon sağlar.",
    ],
    duties_zh: [
      "执行支持飞行运营与安全的专业航空运输职能。",
      "应用航空法规、程序及导航或签派标准。",
      "与机组、空管和地面服务协调，确保运营合规。",
    ],
  },
  {
    code: "149111",
    title_tr: "Eğlence Merkezi Müdürü",
    title_zh: "娱乐中心经理",
    skillLevel: "Skill Level 2",
    duties: [
      "Directs the daily operation of an amusement or entertainment centre.",
      "Manages staff, attractions, ticketing and customer safety.",
      "Oversees maintenance, compliance and revenue targets.",
    ],
    duties_tr: [
      "Bir eğlence merkezinin günlük işleyişini yönetir.",
      "Personeli, aktiviteleri, biletlemeyi ve müşteri güvenliğini yönetir.",
      "Bakım, mevzuata uyum ve gelir hedeflerini denetler.",
    ],
    duties_zh: [
      "指导游乐或娱乐中心的日常运营。",
      "管理员工、游乐设施、售票及顾客安全。",
      "监督维护、合规及营收目标。",
    ],
  },
  {
    code: "361199",
    title_tr: "Hayvan Bakıcıları ve Eğitmenleri (bhk)",
    title_zh: "动物护理员及训练员（其他）",
    skillLevel: "Skill Level 4",
    duties: [
      "Feeds, cleans and monitors the health and wellbeing of animals.",
      "Trains or conditions animals for handling, work, sport or display.",
      "Maintains enclosures and records and reports signs of illness.",
    ],
    duties_tr: [
      "Hayvanları besler, temizler ve sağlık ile refahını izler.",
      "Hayvanları taşıma, çalışma, spor veya sergi için eğitir ya da alıştırır.",
      "Barınakları bakımlı tutar, kayıt tutar ve hastalık belirtilerini bildirir.",
    ],
    duties_zh: [
      "喂养、清洁并监测动物的健康与福祉。",
      "为搬运、工作、运动或展示训练或调教动物。",
      "维护圈舍、保存记录并报告疾病迹象。",
    ],
  },
  {
    code: "142112",
    title_tr: "Antika Satıcısı",
    title_zh: "古董商",
    skillLevel: "Skill Level 2",
    duties: [
      "Buys, values and sells antiques and collectable items.",
      "Authenticates provenance and condition and sets pricing.",
      "Manages inventory, displays and client relationships.",
    ],
    duties_tr: [
      "Antika ve koleksiyon eşyalarını satın alır, değerler ve satar.",
      "Eserin kökenini ve durumunu doğrular, fiyatlandırmayı belirler.",
      "Stok, teşhir ve müşteri ilişkilerini yönetir.",
    ],
    duties_zh: [
      "收购、估价并销售古董及收藏品。",
      "鉴定来源与品相并制定价格。",
      "管理库存、陈列及客户关系。",
    ],
  },
  {
    code: "121311",
    title_tr: "Arıcı",
    title_zh: "养蜂员",
    skillLevel: "Skill Level 2",
    duties: [
      "Establishes and maintains beehives to produce honey and other bee products.",
      "Monitors colony health, disease and queen breeding.",
      "Extracts, processes and prepares product for sale.",
    ],
    duties_tr: [
      "Bal ve diğer arı ürünlerini üretmek için kovanlar kurar ve bakımını yapar.",
      "Koloni sağlığını, hastalıkları ve ana arı yetiştiriciliğini izler.",
      "Ürünü hasat eder, işler ve satışa hazırlar.",
    ],
    duties_zh: [
      "建立并维护蜂箱以生产蜂蜜及其他蜂产品。",
      "监测蜂群健康、病害及蜂王繁育。",
      "提取、加工并准备产品以供销售。",
    ],
  },
  {
    code: "393211",
    title_tr: "Giysi Kesimcisi",
    title_zh: "服装裁剪工",
    skillLevel: "Skill Level 4",
    duties: [
      "Lays out and cuts fabric to patterns for garment manufacture.",
      "Operates cutting tools and machinery to specification.",
      "Minimises waste and checks cut pieces for accuracy.",
    ],
    duties_tr: [
      "Giysi üretimi için kumaşı kalıplara göre serer ve keser.",
      "Kesim aletlerini ve makinelerini şartnameye uygun kullanır.",
      "Fireyi en aza indirir ve kesilen parçaların doğruluğunu kontrol eder.",
    ],
    duties_zh: [
      "为服装制造按纸样铺布并裁剪面料。",
      "按规格操作裁剪工具及机器。",
      "减少浪费并检查裁片的准确性。",
    ],
  },
  {
    code: "234116",
    title_tr: "Su Ürünleri veya Balıkçılık Bilimcisi",
    title_zh: "水产养殖或渔业科学家",
    skillLevel: "Skill Level 1",
    duties: [
      "Studies aquatic organisms, stocks and ecosystems to support sustainable production.",
      "Designs and conducts research, sampling and data analysis.",
      "Advises on breeding, health, harvesting and environmental management.",
    ],
    duties_tr: [
      "Sürdürülebilir üretimi desteklemek için sucul organizmaları, stokları ve ekosistemleri inceler.",
      "Araştırma, örnekleme ve veri analizini tasarlar ve yürütür.",
      "Üretim, sağlık, hasat ve çevresel yönetim konularında danışmanlık yapar.",
    ],
    duties_zh: [
      "研究水生生物、种群及生态系统，以支持可持续生产。",
      "设计并开展研究、采样及数据分析。",
      "就繁育、健康、捕捞及环境管理提供建议。",
    ],
  },
  {
    code: "362511",
    title_tr: "Ağaç Bakım Uzmanı (Arborist)",
    title_zh: "树艺师",
    skillLevel: "Skill Level 3",
    duties: [
      "Prunes, treats and removes trees to maintain health and public safety.",
      "Assesses tree condition, disease and structural risk.",
      "Operates climbing, rigging and cutting equipment safely.",
    ],
    duties_tr: [
      "Ağaçların sağlığını ve kamu güvenliğini korumak için budama, tedavi ve söküm yapar.",
      "Ağaçların durumunu, hastalığını ve yapısal riskini değerlendirir.",
      "Tırmanma, halatlama ve kesme ekipmanını güvenli biçimde kullanır.",
    ],
    duties_zh: [
      "修剪、处理及移除树木以维护健康与公共安全。",
      "评估树木状况、病害及结构风险。",
      "安全操作攀爬、索具及切割设备。",
    ],
  },
  {
    code: "272414",
    title_tr: "Arkeolog",
    title_zh: "考古学家",
    skillLevel: "Skill Level 1",
    duties: [
      "Investigates past human activity through excavation and analysis of material remains.",
      "Records, dates and interprets sites and artefacts.",
      "Prepares reports and advises on heritage protection.",
    ],
    duties_tr: [
      "Maddi kalıntıların kazısı ve analizi yoluyla geçmiş insan faaliyetlerini araştırır.",
      "Yerleşimleri ve buluntuları kayıt altına alır, tarihler ve yorumlar.",
      "Raporlar hazırlar ve kültürel miras koruması konusunda danışmanlık yapar.",
    ],
    duties_zh: [
      "通过发掘和分析实物遗存研究人类过去的活动。",
      "记录、断代并解读遗址与文物。",
      "编写报告并就遗产保护提供建议。",
    ],
  },
  {
    code: "312111",
    title_tr: "Mimari Teknik Ressam",
    title_zh: "建筑制图员",
    skillLevel: "Skill Level 2",
    duties: [
      "Prepares detailed architectural drawings and plans from designs and specifications.",
      "Uses CAD software to produce construction and presentation documents.",
      "Coordinates revisions with architects and building codes.",
    ],
    duties_tr: [
      "Tasarım ve şartnamelerden ayrıntılı mimari çizimler ve planlar hazırlar.",
      "İnşaat ve sunum belgelerini üretmek için CAD yazılımı kullanır.",
      "Revizyonları mimarlar ve yapı yönetmelikleriyle koordine eder.",
    ],
    duties_zh: [
      "根据设计与规格编制详细的建筑图纸及方案。",
      "使用 CAD 软件制作施工及展示文件。",
      "与建筑师及建筑规范协调修订。",
    ],
  },
  {
    code: "312199",
    title_tr: "Mimari, İnşaat ve Ölçme Teknisyenleri (bhk)",
    title_zh: "建筑、施工及测量技术员（其他）",
    skillLevel: "Skill Level 2",
    duties: [
      "Provides technical support in architecture, building and surveying projects.",
      "Assists with drawings, measurements, testing and site inspections.",
      "Ensures work meets standards, specifications and regulations.",
    ],
    duties_tr: [
      "Mimari, inşaat ve ölçme projelerinde teknik destek sağlar.",
      "Çizimler, ölçümler, testler ve saha denetimlerinde yardımcı olur.",
      "İşlerin standartlara, şartnamelere ve mevzuata uygunluğunu sağlar.",
    ],
    duties_zh: [
      "为建筑、施工及测量项目提供技术支持。",
      "协助绘图、测量、检测及现场检查。",
      "确保工作符合标准、规格及法规。",
    ],
  },
  {
    code: "249211",
    title_tr: "Sanat Öğretmeni (Özel Ders)",
    title_zh: "艺术教师（私人授课）",
    skillLevel: "Skill Level 1",
    duties: [
      "Provides private tuition in visual or performing arts.",
      "Plans lessons and develops students' technique and creativity.",
      "Assesses progress and prepares students for exams or performances.",
    ],
    duties_tr: [
      "Görsel veya sahne sanatlarında özel ders verir.",
      "Ders planlar ve öğrencilerin tekniğini ve yaratıcılığını geliştirir.",
      "İlerlemeyi değerlendirir ve öğrencileri sınavlara ya da gösterilere hazırlar.",
    ],
    duties_zh: [
      "提供视觉或表演艺术的私人授课。",
      "规划课程并培养学生的技巧与创造力。",
      "评估进度并帮助学生备考或准备演出。",
    ],
  },
  {
    code: "611111",
    title_tr: "Müzayede Görevlisi (Mezatçı)",
    title_zh: "拍卖师",
    skillLevel: "Skill Level 3",
    duties: [
      "Conducts auctions and invites and acknowledges bids from buyers.",
      "Values and catalogues goods or property for sale.",
      "Records sales and finalises transactions with buyers and sellers.",
    ],
    duties_tr: [
      "Müzayedeleri yürütür, alıcılardan teklif alır ve teklifleri onaylar.",
      "Satılacak mal veya mülkü değerler ve kataloglar.",
      "Satışları kaydeder ve alıcı ile satıcı arasındaki işlemleri sonuçlandırır.",
    ],
    duties_zh: [
      "主持拍卖，邀请并确认买家的出价。",
      "为待售商品或财产估价并编制目录。",
      "记录成交并与买卖双方完成交易。",
    ],
  },
  {
    code: "141911",
    title_tr: "Pansiyon (B&B) İşletmecisi",
    title_zh: "民宿经营者",
    skillLevel: "Skill Level 2",
    duties: [
      "Operates a bed and breakfast providing short-term guest accommodation.",
      "Manages bookings, housekeeping, catering and guest services.",
      "Maintains health, safety and hospitality standards.",
    ],
    duties_tr: [
      "Kısa süreli konaklama sunan bir pansiyon (B&B) işletir.",
      "Rezervasyonları, temizliği, ikramı ve misafir hizmetlerini yönetir.",
      "Sağlık, güvenlik ve ağırlama standartlarını korur.",
    ],
    duties_zh: [
      "经营提供短期住宿的民宿（B&B）。",
      "管理预订、客房清洁、餐饮及宾客服务。",
      "维护卫生、安全及接待标准。",
    ],
  },
  {
    code: "142113",
    title_tr: "Bahis Ofisi Müdürü",
    title_zh: "博彩代理经理",
    skillLevel: "Skill Level 2",
    duties: [
      "Manages the operation of a betting or wagering agency.",
      "Supervises staff, transactions and responsible-gambling compliance.",
      "Oversees security, cash handling and reporting.",
    ],
    duties_tr: [
      "Bir bahis veya müşterek bahis ofisinin işleyişini yönetir.",
      "Personeli, işlemleri ve sorumlu kumar mevzuatına uyumu denetler.",
      "Güvenliği, nakit işlemlerini ve raporlamayı gözetir.",
    ],
    duties_zh: [
      "管理博彩或投注代理机构的运营。",
      "监督员工、交易及负责任博彩合规。",
      "监督安保、现金处理及报告。",
    ],
  },
  {
    code: "149911",
    title_tr: "Hayvan Pansiyonu İşletmecisi",
    title_zh: "宠物寄养所经营者",
    skillLevel: "Skill Level 2",
    duties: [
      "Operates a boarding kennel or cattery caring for animals.",
      "Manages bookings, feeding, hygiene and animal welfare.",
      "Ensures compliance with animal-care and licensing requirements.",
    ],
    duties_tr: [
      "Hayvanların bakımını üstlenen bir hayvan pansiyonu işletir.",
      "Rezervasyonları, beslemeyi, hijyeni ve hayvan refahını yönetir.",
      "Hayvan bakımı ve ruhsat gerekliliklerine uyumu sağlar.",
    ],
    duties_zh: [
      "经营照护动物的寄养犬舍或猫舍。",
      "管理预订、喂养、卫生及动物福利。",
      "确保符合动物护理及执照要求。",
    ],
  },
  {
    code: "399511",
    title_tr: "Yayın Vericisi Operatörü",
    title_zh: "广播发射机操作员",
    skillLevel: "Skill Level 3",
    duties: [
      "Operates and monitors broadcast transmission equipment.",
      "Maintains signal quality and diagnoses technical faults.",
      "Ensures compliance with broadcasting and safety standards.",
    ],
    duties_tr: [
      "Yayın iletim ekipmanını çalıştırır ve izler.",
      "Sinyal kalitesini korur ve teknik arızaları teşhis eder.",
      "Yayıncılık ve güvenlik standartlarına uyumu sağlar.",
    ],
    duties_zh: [
      "操作并监控广播传输设备。",
      "维持信号质量并诊断技术故障。",
      "确保符合广播及安全标准。",
    ],
  },
  {
    code: "612111",
    title_tr: "İşletme Aracısı (Broker)",
    title_zh: "企业经纪人",
    skillLevel: "Skill Level 3",
    duties: [
      "Arranges the sale and purchase of businesses on behalf of clients.",
      "Values businesses and markets them to prospective buyers.",
      "Negotiates terms and coordinates settlement.",
    ],
    duties_tr: [
      "Müşteriler adına işletmelerin alım ve satımını düzenler.",
      "İşletmeleri değerler ve olası alıcılara pazarlar.",
      "Koşulları müzakere eder ve devir sürecini koordine eder.",
    ],
    duties_zh: [
      "代表客户安排企业的买卖。",
      "对企业估值并向潜在买家推介。",
      "谈判条款并协调交割。",
    ],
  },
  {
    code: "541111",
    title_tr: "Çağrı veya İletişim Merkezi Takım Lideri",
    title_zh: "呼叫或联络中心团队主管",
    skillLevel: "Skill Level 4",
    duties: [
      "Supervises a team of call or contact centre operators.",
      "Monitors service levels, quality and performance targets.",
      "Coaches staff and resolves escalated customer enquiries.",
    ],
    duties_tr: [
      "Çağrı veya iletişim merkezi operatörlerinden oluşan bir ekibi yönetir.",
      "Hizmet düzeylerini, kaliteyi ve performans hedeflerini izler.",
      "Personele koçluk yapar ve üst kademeye taşınan müşteri taleplerini çözer.",
    ],
    duties_zh: [
      "监督呼叫或联络中心话务员团队。",
      "监控服务水平、质量及绩效目标。",
      "辅导员工并处理升级的客户咨询。",
    ],
  },
  {
    code: "141211",
    title_tr: "Karavan Parkı ve Kamp Alanı Müdürü",
    title_zh: "房车营地及露营地经理",
    skillLevel: "Skill Level 2",
    duties: [
      "Manages the operation of a caravan park or camping ground.",
      "Handles bookings, site allocation, facilities and guest services.",
      "Maintains grounds, safety and regulatory compliance.",
    ],
    duties_tr: [
      "Bir karavan parkının veya kamp alanının işleyişini yönetir.",
      "Rezervasyonları, alan tahsisini, tesisleri ve misafir hizmetlerini yürütür.",
      "Alanların bakımını, güvenliği ve mevzuata uyumu sağlar.",
    ],
    duties_zh: [
      "管理房车营地或露营地的运营。",
      "处理预订、营位分配、设施及宾客服务。",
      "维护场地、安全及法规合规。",
    ],
  },
  {
    code: "399211",
    title_tr: "Kimya Tesisi Operatörü",
    title_zh: "化工厂操作员",
    skillLevel: "Skill Level 4",
    duties: [
      "Operates and controls chemical processing plant and equipment.",
      "Monitors reactions, gauges and process parameters.",
      "Follows safety, quality and environmental procedures.",
    ],
    duties_tr: [
      "Kimyasal işleme tesisini ve ekipmanını çalıştırır ve kontrol eder.",
      "Reaksiyonları, göstergeleri ve proses parametrelerini izler.",
      "Güvenlik, kalite ve çevre prosedürlerine uyar.",
    ],
    duties_zh: [
      "操作并控制化工处理装置及设备。",
      "监测反应、仪表及工艺参数。",
      "遵守安全、质量及环境规程。",
    ],
  },
  {
    code: "149912",
    title_tr: "Sinema veya Tiyatro Müdürü",
    title_zh: "电影院或剧院经理",
    skillLevel: "Skill Level 2",
    duties: [
      "Directs the operation of a cinema or theatre venue.",
      "Manages programming, staff, ticketing and patron services.",
      "Oversees safety, maintenance and revenue.",
    ],
    duties_tr: [
      "Bir sinema veya tiyatro mekânının işleyişini yönetir.",
      "Programlamayı, personeli, biletlemeyi ve izleyici hizmetlerini yönetir.",
      "Güvenliği, bakımı ve geliri denetler.",
    ],
    duties_zh: [
      "指导电影院或剧院场馆的运营。",
      "管理节目编排、员工、售票及观众服务。",
      "监督安全、维护及营收。",
    ],
  },
  {
    code: "599211",
    title_tr: "Mahkeme Kâtibi (Baş Kâtip)",
    title_zh: "法院书记官",
    skillLevel: "Skill Level 3",
    duties: [
      "Manages court records, filings and case documentation.",
      "Administers oaths and supports court proceedings.",
      "Ensures compliance with legal procedure and deadlines.",
    ],
    duties_tr: [
      "Mahkeme kayıtlarını, dosyalamaları ve dava belgelerini yönetir.",
      "Yemin ettirir ve mahkeme işlemlerini destekler.",
      "Hukuki usule ve sürelere uyumu sağlar.",
    ],
    duties_zh: [
      "管理法院记录、立案及案件文档。",
      "监誓并支持庭审程序。",
      "确保遵守法律程序及时限。",
    ],
  },
  {
    code: "393212",
    title_tr: "Giysi Kalıpçısı",
    title_zh: "服装制版师",
    skillLevel: "Skill Level 3",
    duties: [
      "Develops and grades patterns for garment production.",
      "Interprets designs into accurate pattern pieces and sizes.",
      "Tests fit and adjusts patterns for manufacture.",
    ],
    duties_tr: [
      "Giysi üretimi için kalıpları geliştirir ve beden serileri oluşturur.",
      "Tasarımları doğru kalıp parçalarına ve bedenlere dönüştürür.",
      "Uyumu test eder ve kalıpları üretim için ayarlar.",
    ],
    duties_zh: [
      "为服装生产开发并放码纸样。",
      "将设计转化为准确的纸样及尺码。",
      "测试合身度并为生产调整纸样。",
    ],
  },
  {
    code: "393299",
    title_tr: "Giyim Sektörü Çalışanları (bhk)",
    title_zh: "服装行业工人（其他）",
    skillLevel: "Skill Level 4",
    duties: [
      "Performs specialised tasks in garment and textile production.",
      "Operates machinery and hand tools to make or finish clothing.",
      "Checks work against quality and specification requirements.",
    ],
    duties_tr: [
      "Giyim ve tekstil üretiminde uzmanlaşmış görevleri yerine getirir.",
      "Kıyafet üretmek veya bitirmek için makine ve el aletleri kullanır.",
      "İşi kalite ve şartname gerekliliklerine göre kontrol eder.",
    ],
    duties_zh: [
      "在服装及纺织生产中执行专业任务。",
      "操作机器及手工工具制作或整理服装。",
      "对照质量与规格要求检查成品。",
    ],
  },
  {
    code: "222111",
    title_tr: "Emtia Tüccarı",
    title_zh: "大宗商品交易员",
    skillLevel: "Skill Level 1",
    duties: [
      "Buys and sells commodities and related contracts on behalf of clients or firms.",
      "Analyses markets, prices and risk to inform trading decisions.",
      "Complies with financial market regulations and reporting.",
    ],
    duties_tr: [
      "Müşteriler veya firmalar adına emtia ve ilgili sözleşmeleri alıp satar.",
      "Alım-satım kararlarına yön vermek için piyasaları, fiyatları ve riski analiz eder.",
      "Finansal piyasa mevzuatına ve raporlamaya uyar.",
    ],
    duties_zh: [
      "代表客户或公司买卖大宗商品及相关合约。",
      "分析市场、价格及风险以支持交易决策。",
      "遵守金融市场法规及报告要求。",
    ],
  },
  {
    code: "272611",
    title_tr: "Toplum Sanatları Çalışanı",
    title_zh: "社区艺术工作者",
    skillLevel: "Skill Level 1",
    duties: [
      "Develops and delivers community arts and cultural programs.",
      "Engages participants and coordinates workshops and events.",
      "Sources funding and evaluates program outcomes.",
    ],
    duties_tr: [
      "Toplum temelli sanat ve kültür programları geliştirir ve uygular.",
      "Katılımcıları dahil eder, atölye ve etkinlikleri koordine eder.",
      "Fon kaynağı bulur ve program sonuçlarını değerlendirir.",
    ],
    duties_zh: [
      "开发并实施社区艺术及文化项目。",
      "吸引参与者并协调工作坊及活动。",
      "筹措资金并评估项目成效。",
    ],
  },
  {
    code: "252299",
    title_tr: "Tamamlayıcı Sağlık Terapistleri (bhk)",
    title_zh: "辅助健康治疗师（其他）",
    skillLevel: "Skill Level 1",
    duties: [
      "Provides complementary or alternative health therapies to clients.",
      "Assesses client needs and develops treatment plans.",
      "Maintains records and adheres to professional and safety standards.",
    ],
    duties_tr: [
      "Danışanlara tamamlayıcı veya alternatif sağlık terapileri sunar.",
      "Danışan ihtiyaçlarını değerlendirir ve tedavi planları oluşturur.",
      "Kayıt tutar; mesleki ve güvenlik standartlarına uyar.",
    ],
    duties_zh: [
      "为客户提供辅助或替代性健康疗法。",
      "评估客户需求并制定治疗方案。",
      "保存记录并遵守专业及安全标准。",
    ],
  },
  {
    code: "149311",
    title_tr: "Konferans ve Etkinlik Organizatörü",
    title_zh: "会议及活动策划人",
    skillLevel: "Skill Level 2",
    duties: [
      "Plans, coordinates and delivers conferences and events.",
      "Manages venues, suppliers, budgets and schedules.",
      "Oversees logistics, registration and on-site operations.",
    ],
    duties_tr: [
      "Konferans ve etkinlikleri planlar, koordine eder ve gerçekleştirir.",
      "Mekânları, tedarikçileri, bütçeleri ve programları yönetir.",
      "Lojistiği, kayıt işlemlerini ve saha operasyonlarını denetler.",
    ],
    duties_zh: [
      "规划、协调并执行会议及活动。",
      "管理场地、供应商、预算及日程。",
      "监督后勤、注册及现场运营。",
    ],
  },
  {
    code: "234911",
    title_tr: "Konservatör (Eser Koruma Uzmanı)",
    title_zh: "文物保护专家",
    skillLevel: "Skill Level 1",
    duties: [
      "Preserves and restores artworks, artefacts and heritage items.",
      "Assesses condition and determines conservation treatments.",
      "Documents work and advises on storage and display.",
    ],
    duties_tr: [
      "Sanat eserlerini, tarihi buluntuları ve kültürel miras nesnelerini korur ve restore eder.",
      "Durumu değerlendirir ve koruma işlemlerini belirler.",
      "Yapılan işi belgeler; depolama ve sergileme konusunda danışmanlık verir.",
    ],
    duties_zh: [
      "保护并修复艺术品、文物及遗产物品。",
      "评估状况并确定保护处理方案。",
      "记录工作并就存储与展示提供建议。",
    ],
  },
  {
    code: "511111",
    title_tr: "Sözleşme Yöneticisi",
    title_zh: "合同管理员",
    skillLevel: "Skill Level 2",
    duties: [
      "Administers contracts through their lifecycle from award to completion.",
      "Monitors obligations, variations, claims and compliance.",
      "Liaises with suppliers, clients and internal teams.",
    ],
    duties_tr: [
      "Sözleşmeleri, ihaleden tamamlanmaya kadar tüm yaşam döngüsü boyunca yönetir.",
      "Yükümlülükleri, değişiklikleri, hak taleplerini ve uyumu izler.",
      "Tedarikçiler, müşteriler ve iç ekiplerle irtibat kurar.",
    ],
    duties_zh: [
      "在合同从授予到完成的整个周期内进行管理。",
      "监督义务、变更、索赔及合规。",
      "与供应商、客户及内部团队联络。",
    ],
  },
  {
    code: "599111",
    title_tr: "Tapu/Devir İşlemleri Uzmanı (Conveyancer)",
    title_zh: "产权转让专员",
    skillLevel: "Skill Level 2",
    duties: [
      "Prepares and processes legal documents for property transfers.",
      "Conducts title searches and liaises with parties and authorities.",
      "Ensures settlements comply with legal requirements.",
    ],
    duties_tr: [
      "Mülk devirleri için hukuki belgeleri hazırlar ve işler.",
      "Tapu araştırması yapar; taraflar ve resmi makamlarla irtibat kurar.",
      "Devir işlemlerinin hukuki gerekliliklere uygunluğunu sağlar.",
    ],
    duties_zh: [
      "为房产转让准备并办理法律文件。",
      "进行产权查询并与各方及主管部门联络。",
      "确保交割符合法律要求。",
    ],
  },
  {
    code: "212411",
    title_tr: "Metin Yazarı (Copywriter)",
    title_zh: "文案撰稿人",
    skillLevel: "Skill Level 1",
    duties: [
      "Writes copy for advertising, marketing and communications.",
      "Develops concepts and messaging for target audiences.",
      "Edits and adapts content across channels and briefs.",
    ],
    duties_tr: [
      "Reklam, pazarlama ve iletişim için metinler yazar.",
      "Hedef kitleler için konsept ve mesaj geliştirir.",
      "İçeriği kanallara ve brifinglere göre düzenler ve uyarlar.",
    ],
    duties_zh: [
      "为广告、营销及传播撰写文案。",
      "为目标受众开发概念及信息。",
      "跨渠道及依简报编辑并调整内容。",
    ],
  },
  {
    code: "221212",
    title_tr: "Kurumsal Hazine Yöneticisi",
    title_zh: "公司财务主管",
    skillLevel: "Skill Level 1",
    duties: [
      "Manages an organisation's funding, cash flow and financial risk.",
      "Oversees investments, banking relationships and treasury policy.",
      "Reports on liquidity, exposure and compliance.",
    ],
    duties_tr: [
      "Bir kuruluşun finansmanını, nakit akışını ve finansal riskini yönetir.",
      "Yatırımları, bankacılık ilişkilerini ve hazine politikasını gözetir.",
      "Likidite, risk maruziyeti ve uyum konularında raporlama yapar.",
    ],
    duties_zh: [
      "管理机构的融资、现金流及财务风险。",
      "监督投资、银行关系及资金管理政策。",
      "就流动性、风险敞口及合规进行报告。",
    ],
  },
  {
    code: "272199",
    title_tr: "Danışmanlar (bhk)",
    title_zh: "咨询师（其他）",
    skillLevel: "Skill Level 1",
    duties: [
      "Provides counselling to individuals, families or groups.",
      "Assesses needs and develops therapeutic strategies.",
      "Maintains confidentiality and professional standards.",
    ],
    duties_tr: [
      "Bireylere, ailelere veya gruplara danışmanlık sağlar.",
      "İhtiyaçları değerlendirir ve terapötik stratejiler geliştirir.",
      "Gizliliği ve mesleki standartları korur.",
    ],
    duties_zh: [
      "为个人、家庭或群体提供咨询。",
      "评估需求并制定治疗策略。",
      "维护保密及专业标准。",
    ],
  },
  {
    code: "599212",
    title_tr: "Mahkeme Mübaşiri veya İcra Memuru",
    title_zh: "法院执达员",
    skillLevel: "Skill Level 3",
    duties: [
      "Serves legal documents and enforces court orders.",
      "Recovers debts or property and maintains order in court.",
      "Records actions and reports outcomes to the court.",
    ],
    duties_tr: [
      "Hukuki belgeleri tebliğ eder ve mahkeme kararlarını icra eder.",
      "Borç veya mal tahsil eder ve mahkemede düzeni sağlar.",
      "İşlemleri kaydeder ve sonuçları mahkemeye bildirir.",
    ],
    duties_zh: [
      "送达法律文书并执行法院命令。",
      "追讨债务或财产并维持法庭秩序。",
      "记录行动并向法院报告结果。",
    ],
  },
  {
    code: "599213",
    title_tr: "Mahkeme Görevlisi",
    title_zh: "法院庭务员",
    skillLevel: "Skill Level 3",
    duties: [
      "Maintains order and supports proceedings in the courtroom.",
      "Assists judicial officers, parties and witnesses.",
      "Handles exhibits, documents and registry tasks.",
    ],
    duties_tr: [
      "Mahkeme salonunda düzeni sağlar ve yargılamayı destekler.",
      "Hâkimlere, taraflara ve tanıklara yardımcı olur.",
      "Delilleri, belgeleri ve kalem işlerini yürütür.",
    ],
    duties_zh: [
      "维持法庭秩序并支持庭审程序。",
      "协助司法官员、当事人及证人。",
      "处理证物、文件及登记事务。",
    ],
  },
  {
    code: "121299",
    title_tr: "Bitkisel Üretim Çiftçileri (bhk)",
    title_zh: "农作物种植户（其他）",
    skillLevel: "Skill Level 1",
    duties: [
      "Plans and manages the production of field or horticultural crops.",
      "Oversees planting, irrigation, pest control and harvesting.",
      "Manages resources, staff and compliance to meet yield and quality targets.",
    ],
    duties_tr: [
      "Tarla veya bahçe bitkilerinin üretimini planlar ve yönetir.",
      "Ekim, sulama, zararlı kontrolü ve hasadı denetler.",
      "Verim ve kalite hedeflerine ulaşmak için kaynakları, personeli ve uyumu yönetir.",
    ],
    duties_zh: [
      "规划并管理大田或园艺作物的生产。",
      "监督种植、灌溉、病虫害防治及收获。",
      "管理资源、人员及合规，以达到产量与质量目标。",
    ],
  },
];

applyBatch(BATCH_01, "batch-01");
