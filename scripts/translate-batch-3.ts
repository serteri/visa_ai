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

const BATCH_3_DATA: Record<string, Partial<SearchEntry>> = {
  "313112": {
    title_tr: "BT Müşteri Destek Görevlisi",
    title_zh: "信息通信技术客户支持人员",
    duties: [
      "Provides first-level support to IT users, resolving hardware and software issues.",
      "Logs and tracks user requests, escalates complex queries, and monitors resolution.",
      "Assists with system updates, user onboarding, and access permissions."
    ],
    duties_tr: [
      "BT kullanıcılarına birinci düzey destek sağlar, donanım ve yazılım sorunlarını çözer.",
      "Kullanıcı taleplerini kaydeder ve izler, karmaşık sorguları yönlendirir ve çözüm sürecini takip eder.",
      "Sistem güncellemelerine, kullanıcı katılımına (onboarding) ve erişim yetkilerine yardımcı olur."
    ],
    duties_zh: [
      "向IT用户提供一级支持，解决硬件和软件问题。",
      "记录并跟踪用户请求，升级复杂查询，并监控解决进度。",
      "协助系统更新、用户入职培训和访问权限管理。"
    ]
  },
  "135199": {
    title_tr: "Bilişim Teknolojileri (BT) Yöneticileri (bhk)",
    title_zh: "信息通信技术经理（其他）",
    duties: [
      "Plans, directs and coordinates IT operations and technology implementations not elsewhere classified.",
      "Manages IT budgets, staffing, vendor relations and project delivery.",
      "Ensures system security, operational efficiency and alignment with business objectives."
    ],
    duties_tr: [
      "Başka bir yerde sınıflandırılmamış BT operasyonlarını ve teknoloji uygulamalarını planlar, yönetir ve koordine eder.",
      "BT bütçelerini, personel alımını, tedarikçi ilişkilerini ve projelerin teslimini yönetir.",
      "Sistem güvenliğini, operasyonel verimliliği ve iş hedefleriyle uyumu sağlar."
    ],
    duties_zh: [
      "规划、指导和协调未另分类的IT运营及技术实施。",
      "管理IT预算、人员配备、供应商关系和项目交付。",
      "确保系统安全、运营效率以及与业务目标的一致性。"
    ]
  },
  "225213": {
    title_tr: "BT Satış Temsilcisi",
    title_zh: "信息通信技术销售代表",
    duties: [
      "Sells hardware, software, cloud services and IT solutions to business clients.",
      "Identifies customer needs, prepares product proposals, quotes and delivers presentations.",
      "Manages client relationships, monitors sales targets and market competitors."
    ],
    duties_tr: [
      "Kurumsal müşterilere donanım, yazılım, bulut hizmetleri ve BT çözümleri satar.",
      "Müşteri ihtiyaçlarını belirler, ürün teklifleri ve fiyat teklifleri hazırlar ve sunumlar yapar.",
      "Müşteri ilişkilerini yönetir, satış hedeflerini ve piyasadaki rakipleri izler."
    ],
    duties_zh: [
      "向企业客户销售硬件、软件、云服务和IT解决方案。",
      "识别客户需求，准备产品提案、报价并进行演示。",
      "管理客户关系，监控销售目标和市场竞争对手。"
    ]
  },
  "313199": {
    title_tr: "BT Destek Teknisyenleri (bhk)",
    title_zh: "信息通信技术支持技术员（其他）",
    duties: [
      "Installs, configures and maintains computer networks, systems and hardware devices.",
      "Diagnoses and troubleshoots technical faults and provides user support.",
      "Maintains hardware inventory, documentation and updates security software."
    ],
    duties_tr: [
      "Bilgisayar ağlarını, sistemlerini ve donanım aygıtlarını kurar, yapılandırır ve bakımını yapar.",
      "Teknik arızaları teşhis eder ve giderir; kullanıcılara destek sağlar.",
      "Donanım envanterini, dokümantasyonunu tutar ve güvenlik yazılımlarını günceller."
    ],
    duties_zh: [
      "安装、配置和维护计算机网络、系统和硬件设备。",
      "诊断和排除技术故障，并提供用户支持。",
      "维护硬件库存、文档，并更新安全软件。"
    ]
  },
  "223211": {
    title_tr: "BT Eğitmeni",
    title_zh: "信息通信技术培训师",
    duties: [
      "Designs and delivers training programs on software applications and IT systems.",
      "Develops training manuals, user guides, online modules and assessments.",
      "Evaluates training effectiveness and supports users with system transitions."
    ],
    duties_tr: [
      "Yazılım uygulamaları ve BT sistemleri hakkında eğitim programları tasarlar ve sunar.",
      "Eğitim kılavuzları, kullanıcı kılavuzları, çevrimiçi modüller ve değerlendirmeler geliştirir.",
      "Eğitimin etkinliğini değerlendirir ve kullanıcılara sisteme geçiş aşamalarında destek olur."
    ],
    duties_zh: [
      "设计并开展针对软件应用和IT系统的培训计划。",
      "开发培训手册、用户指南、在线模块和评估工具。",
      "评估培训效果并支持用户进行系统过渡。"
    ]
  },
  "133311": {
    title_tr: "İthalat veya İhracat Yöneticisi",
    title_zh: "进出口商",
    duties: [
      "Plans, directs and coordinates the international trade of goods and services.",
      "Negotiates commercial contracts, prices, shipping terms and handles trade finance.",
      "Ensures compliance with customs laws, import-export regulations and tariff codes."
    ],
    duties_tr: [
      "Mal ve hizmetlerin uluslararası ticaretini planlar, yönlendirir ve koordine eder.",
      "Ticari sözleşmeleri, fiyatları, nakliye koşullarını müzakere eder ve ticaret finansmanını yürütür.",
      "Gümrük yasalarına, ithalat-ihracat yönetmeliklerine ve tarife kodlarına uyumu sağlar."
    ],
    duties_zh: [
      "规划、指导和协调商品及服务的国际贸易。",
      "谈判商业合同、价格、出运条款并处理贸易融资。",
      "确保符合海关法、进出口法规和税则编码。"
    ]
  },
  "611211": {
    title_tr: "Sigorta Acentesi / Temsilcisi",
    title_zh: "保险代理人",
    duties: [
      "Sells life, property, health or casualty insurance policies to clients.",
      "Identifies client insurance needs, recommends coverages and prepares quotes.",
      "Processes policy renewals, handles client enquiries and assists with claims."
    ],
    duties_tr: [
      "Müşterilere hayat, mülk, sağlık veya kaza sigortası poliçeleri satar.",
      "Müşteri sigorta ihtiyaçlarını belirler, teminatlar önerir ve fiyat teklifleri hazırlar.",
      "Poliçe yenileme işlemlerini yürütür, müşteri taleplerini karşılar ve hasar taleplerine yardımcı olur."
    ],
    duties_zh: [
      "向客户销售人寿、财产、健康或意外保险单。",
      "确定客户的保险需求，推荐承保范围并准备报价。",
      "办理保单续约，处理客户咨询并协助理赔。"
    ]
  },
  "222113": {
    title_tr: "Sigorta Brokeri",
    title_zh: "保险经纪人",
    duties: [
      "Negotiates insurance coverages and placements on behalf of commercial or personal clients.",
      "Assesses client risk exposure and recommends suitable insurance portfolios.",
      "Manages insurance portfolios, policy renewals and assists in negotiating complex claims."
    ],
    duties_tr: [
      "Kurumsal veya bireysel müşteriler adına sigorta teminatları ve plasmanları müzakere eder.",
      "Müşterinin risk maruziyetini değerlendirir ve uygun sigorta portföyleri önerir.",
      "Sigorta portföylerini, poliçe yenilemelerini yönetir ve karmaşık hasar taleplerinin müzakeresine yardımcı olur."
    ],
    duties_zh: [
      "代表商业或个人客户谈判保险承保范围及配置。",
      "评估客户的风险敞口并推荐合适的保险组合。",
      "管理保险组合、保单续签，并协助谈判复杂的理赔。"
    ]
  },
  "599611": {
    title_tr: "Sigorta Hasar Araştırmacısı",
    title_zh: "保险调查员",
    duties: [
      "Investigates suspicious or complex insurance claims to detect fraud or non-disclosure.",
      "Gathers evidence, conducts interviews, reviews documents and performs surveillance.",
      "Prepares investigation reports and recommends action to insurance adjusters."
    ],
    duties_tr: [
      "Dolandırıcılık veya gizleme tespit etmek için şüpheli veya karmaşık sigorta taleplerini araştırır.",
      "Delil toplar, görüşmeler yapar, belgeleri inceler ve gözetim gerçekleştirir.",
      "Araştırma raporları hazırlar ve sigorta eksperlerine işlem önerilerinde bulunur."
    ],
    duties_zh: [
      "调查可疑或复杂的保险索赔，以检测欺诈或瞒报行为。",
      "收集证据、进行访谈、审查文件并进行监视。",
      "编写调查报告并向保险理算员提出处理建议。"
    ]
  },
  "599612": {
    title_tr: "Sigorta Eksperi / Hasar Tasfiye Uzmanı",
    title_zh: "保险公估人",
    duties: [
      "Assesses liability and value of insurance claims, inspecting damaged properties or assets.",
      "Interprets policy wordings, determines coverage limits and negotiates settlements.",
      "Collaborates with engineers, builders, legal teams and writes adjustment reports."
    ],
    duties_tr: [
      "Hasarlı mülkleri veya varlıkları inceleyerek sigorta taleplerinin yükümlülüğünü ve değerini değerlendirir.",
      "Poliçe şartlarını yorumlar, teminat sınırlarını belirler ve tazminat ödemelerini müzakere eder.",
      "Mühendisler, müteahhitler, hukuk ekipleriyle iş birliği yapar ve ekspertiz raporları yazar."
    ],
    duties_zh: [
      "评估保险索赔的责任和价值，检查受损的财产或资产。",
      "解读保单条款，确定承保限额并谈判解决办法。",
      "与工程师、建筑商、法律团队合作，并编写公估报告。"
    ]
  },
  "599613": {
    title_tr: "Sigorta Risk Analisti / Eksperi (Risk Surveyor)",
    title_zh: "保险风险评估员",
    duties: [
      "Inspects properties, equipment and operations to assess risks for insurance underwriting.",
      "Identifies hazards, evaluates safety protocols and recommends risk mitigation measures.",
      "Prepares survey reports, safety ratings and provides technical data to underwriters."
    ],
    duties_tr: [
      "Sigorta kabulü (underwriting) risklerini değerlendirmek için mülkleri, ekipmanları ve operasyonları inceler.",
      "Tehlikeleri belirler, güvenlik protokollerini değerlendirir ve risk azaltma önlemleri önerir.",
      "Saha raporları, güvenlik derecelendirmeleri hazırlar ve teknik verileri sigorta kabul yetkililerine sunur."
    ],
    duties_zh: [
      "检查财产、设备和运营，以评估保险核保的风险。",
      "识别危害，评估安全规程并推荐风险缓解措施。",
      "编写评估报告、安全评级并向核保人提供技术数据。"
    ]
  },
  "271214": {
    title_tr: "Fikri Mülkiyet Hukuku Avukatı",
    title_zh: "知识产权律师",
    duties: [
      "Advises clients on patents, trademarks, copyrights and trade secret protections.",
      "Drafts licensing agreements, contracts and registers intellectual property rights.",
      "Represents clients in litigation, disputes and infringement proceedings."
    ],
    duties_tr: [
      "Müşterilere patentler, ticari markalar, telif hakları ve ticari sır korumaları konusunda danışmanlık yapar.",
      "Lisans sözleşmeleri, kontratlar tasarlar ve fikri mülkiyet haklarını tescil ettirir.",
      "Müşterileri dava, uyuşmazlık ve hak ihlali davalarında temsil eder."
    ],
    duties_zh: [
      "就专利、商标、版权和商业秘密保护向客户提供建议。",
      "起草许可协议、合同并进行知识产权登记。",
      "在诉讼、纠纷和侵权诉讼中代表客户。"
    ]
  },
  "399912": {
    title_tr: "İç Dekorasyoncu",
    title_zh: "室内装饰师",
    duties: [
      "Plans and coordinates interior styling, furnishing, colour schemes and decor elements.",
      "Selects furniture, fabrics, wall coverings, lighting and decorative accessories.",
      "Consults with clients, prepares layouts, mood boards and manages project styling."
    ],
    duties_tr: [
      "İç mekân stilini, döşemeleri, renk şemalarını ve dekor unsurlarını planlar ve koordine eder.",
      "Mobilya, kumaş, duvar kaplamaları, aydınlatma ve dekoratif aksesuarları seçer.",
      "Müşterilerle görüşür, planlar, tasarım panoları (mood board) hazırlar ve proje stilini yönetir."
    ],
    duties_zh: [
      "规划和协调室内风格设计、陈设、色彩方案和装饰元素。",
      "选择家具、面料、墙纸、照明和装饰配件。",
      "咨询客户，准备布局图、情绪板并管理项目风格。"
    ]
  },
  "272412": {
    title_tr: "Tercüman / Sözlü Çevirmen",
    title_zh: "口译员",
    duties: [
      "Translates spoken or sign language from one language to another in real-time.",
      "Provides interpreting services in legal, medical, corporate or community settings.",
      "Maintains cultural context, tone, terminology and professional confidentiality."
    ],
    duties_tr: [
      "Konuşulan dili veya işaret dilini gerçek zamanlı olarak bir dilden diğerine çevirir.",
      "Hukuki, tıbbi, kurumsal veya toplumsal ortamlarda sözlü çeviri hizmetleri sağlar.",
      "Kültürel bağlamı, tonu, terminolojiyi ve mesleki gizliliği korur."
    ],
    duties_zh: [
      "实时将口头语言或手语从一种语言翻译成另一种语言。",
      "在法律、医疗、企业或社区环境中提供口译服务。",
      "维护文化背景、语气、术语以及职业保密性。"
    ]
  },
  "311115": {
    title_tr: "Sulama Sistemleri Tasarımcısı",
    title_zh: "灌溉设计师",
    duties: [
      "Designs and plans irrigation systems for agricultural, landscape or commercial properties.",
      "Calculates water requirements, hydraulic pressure, flow rates and selects components.",
      "Prepares engineering schematics, estimates costs and reviews safety requirements."
    ],
    duties_tr: [
      "Tarımsal, peyzaj veya ticari alanlar için sulama sistemleri tasarlar ve planlar.",
      "Su gereksinimlerini, hidrolik basıncı, akış hızlarını hesaplar ve bileşenleri seçer.",
      "Mühendislik şemaları hazırlar, maliyetleri tahmin eder ve güvenlik gereksinimlerini inceler."
    ],
    duties_zh: [
      "为农业、景观或商业用途设计和规划灌溉系统。",
      "计算水需求、液压、流速并选择系统组件。",
      "准备工程原理图、估算成本并审查安全要求。"
    ]
  },
  "362712": {
    title_tr: "Sulama Teknisyeni",
    title_zh: "灌溉技术员",
    duties: [
      "Installs, tests, maintains and repairs irrigation systems and components.",
      "Digs trenches, lays pipes, installs sprinklers, valves, pumps and controllers.",
      "Troubleshoots water flow faults, electrical controller issues and ensures system efficiency."
    ],
    duties_tr: [
      "Sulama sistemlerini ve bileşenlerini kurar, test eder, bakımını yapar ve onarır.",
      "Hendek kazar, boru döşer, sprinklerleri, vanaları, pompaları ve kontrolörleri kurar.",
      "Su akış arızalarını, elektriksel kontrolör sorunlarını giderir ve sistem verimliliğini sağlar."
    ],
    duties_zh: [
      "安装、测试、维护和修理灌溉系统及组件。",
      "开挖管沟、铺设管道、安装洒水喷头、阀门、水泵和控制器。",
      "排除水流故障、电气控制器问题并确保系统效率。"
    ]
  },
  "399411": {
    title_tr: "Kuyumcu / Mücevher Tasarımcısı",
    title_zh: "珠宝匠",
    duties: [
      "Designs, fabricates, alters and repairs jewellery, rings and decorative items.",
      "Works with precious metals, gemstones, shapes metal, sets stones and engraves details.",
      "Evaluates quality of gems, examines precious metals, and restores vintage items."
    ],
    duties_tr: [
      "Mücevherleri, yüzükleri ve dekoratif eşyaları tasarlar, üretir, değiştirir ve onarır.",
      "Değerli metaller, değerli taşlarla çalışır, metali şekillendirir, taşları yerleştirir ve detayları kazır.",
      "Değerli taşların kalitesini değerlendirir, değerli metalleri inceler ve antika eşyaları restore eder."
    ],
    duties_zh: [
      "设计、制作、修改和修理珠宝首饰、戒指和装饰品。",
      "处理贵金属、宝石，进行金属成型、镶石并雕刻细节。",
      "评估宝石品质、检验贵金属并修复老式珠宝。"
    ]
  },
  "452413": {
    title_tr: "Jokey",
    title_zh: "职业骑师",
    duties: [
      "Rides racehorses in professional race meets and trials under turf rules.",
      "Collaborates with trainers and owners to formulate race tactics and evaluate horses.",
      "Maintains strictly regulated body weight and fitness requirements."
    ],
    duties_tr: [
      "Pist kuralları çerçevesinde profesyonel yarışlarda ve denemelerde yarış atlarına biner.",
      "Yarış taktikleri oluşturmak ve atları değerlendirmek için eğitmenler ve at sahipleriyle iş birliği yapar.",
      "Sıkı bir şekilde düzenlenen vücut ağırlığını ve kondisyon gereksinimlerini korur."
    ],
    duties_zh: [
      "在专业赛马比赛和选拔赛中骑乘赛马并遵守马协规则。",
      "与练马师和马主合作制定比赛战术并评估马批。",
      "保持严格监管的体重和体能要求。"
    ]
  },
  "212499": {
    title_tr: "Gazeteciler ve Diğer Yazarlar (bhk)",
    title_zh: "记者及其他撰稿人（其他）",
    duties: [
      "Researches, writes and edits news, articles, scripts or books not elsewhere classified.",
      "Conducts interviews, reviews secondary sources, and verifies factual accuracy.",
      "Liaises with editors, publishers, producers and adapts content for specific media."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış haberleri, makaleleri, senaryoları veya kitapları araştırır, yazar ve düzenler.",
      "Röportajlar yapar, ikincil kaynakları inceler ve olgusal doğruluğu teyit eder.",
      "Editörler, yayıncılar, yapımcılar ile iletişim kurar ve içeriği belirli medyaya uyarlar."
    ],
    duties_zh: [
      "研究、撰写和编辑未另分类的新闻、文章、脚本或书籍。",
      "进行访谈、审查二手资料并核实事实准确性。",
      "与编辑、出版商、制片人联络并针对特定媒体调整内容。"
    ]
  },
  "271299": {
    title_tr: "Adli ve Diğer Hukuk Meslek Mensupları (bhk)",
    title_zh: "司法及其他法律专业人员（其他）",
    duties: [
      "Performs judicial, legal or administrative roles in courts, tribunals or departments.",
      "Drafts legal judgments, processes court orders, reviews legal precedents and arguments.",
      "Advises judicial officers, administers oaths and ensures compliance with court rules."
    ],
    duties_tr: [
      "Mahkemelerde, hakem heyetlerinde veya idari birimlerde adli, hukuki veya idari roller üstlenir.",
      "Hukuki kararlar yazar, mahkeme emirlerini işler, hukuki emsalleri ve argümanları inceler.",
      "Yargı görevlilerine danışmanlık yapar, yemin işlemlerini yürütür ve mahkeme kurallarına uyumu sağlar."
    ],
    duties_zh: [
      "在法院、法庭或司法部门中履行司法、法律或行政职责。",
      "起草法律判决书、办理法院命令、审查法律先例和论点。",
      "向司法官员提供建议、主持宣誓并确保遵守法院规则。"
    ]
  },
  "361115": {
    title_tr: "Köpek Barınağı Görevlisi",
    title_zh: "犬舍助理",
    duties: [
      "Feeds, grooms, cleans, exercises and cares for dogs in kennels or boarding facilities.",
      "Monitors dog behavior, appetite, physical condition and reports health concerns.",
      "Cleans and disinfects kennels, runs, equipment and assists with intake and releases."
    ],
    duties_tr: [
      "Köpek kulübelerindeki veya pansiyonlardaki köpekleri besler, tıraş eder, temizler, gezdirir ve bakımını yapar.",
      "Köpek davranışlarını, iştahını, fiziksel durumunu izler ve sağlık sorunlarını bildirir.",
      "Köpek kulübelerini, koşu alanlarını, ekipmanları temizler ve dezenfekte eder; kabul ve çıkış işlemlerine yardımcı olur."
    ],
    duties_zh: [
      "在犬舍或寄养设施中喂养、美容、清洁、训练和照料犬只。",
      "监测犬只的行为、食欲、体能状况并报告健康问题。",
      "清洁并消毒犬舍、活动场、设备，并协助犬只接收与领回。"
    ]
  },
  "362711": {
    title_tr: "Peyzaj Bahçıvanı",
    title_zh: "景观园丁",
    duties: [
      "Constructs and installs landscape features, gardens, retaining walls and pathways.",
      "Plants trees, turf, shrubs, prepares soil, sets up irrigation and drainage systems.",
      "Works from landscape plans, operates machinery and coordinates materials supply."
    ],
    duties_tr: [
      "Peyzaj özellikleri, bahçeler, istinat duvarları ve patikalar inşa eder ve kurar.",
      "Ağaç, çim, çalı diker, toprağı hazırlar, sulama ve drenaj sistemlerini kurar.",
      "Peyzaj planlarına göre çalışır, makineleri çalıştırır ve malzeme tedarikini koordine eder."
    ],
    duties_zh: [
      "建造和安装景观设施、花园、挡土墙和通道。",
      "种植树木、草皮、灌木，改良土壤，设置灌溉和排水系统。",
      "根据景观规划图纸进行作业，操作机械并协调材料供应。"
    ]
  },
  "599214": {
    title_tr: "Hukuk Katibi / Yardımcısı",
    title_zh: "律师助理",
    duties: [
      "Assists lawyers with legal research, drafting legal documents and case file preparation.",
      "Liaises with clients, court staff, schedules hearings and files legal motions.",
      "Maintains legal files, databases and records and coordinates settlement documents."
    ],
    duties_tr: [
      "Hukuki araştırma, hukuki belge taslağı hazırlama ve dava dosyası hazırlama konularında avukatlara yardımcı olur.",
      "Müşterilerle, mahkeme personeliyle iletişim kurar, duruşmaları planlar ve yasal önergeleri sunar.",
      "Hukuki dosyaları, veri tabanlarını ve kayıtları tutar; uzlaşma belgelerini koordine eder."
    ],
    duties_zh: [
      "协助律师进行法律研究、起草法律文书和准备案卷。",
      "与客户、法院工作人员联络，安排听证会并提交法律动议。",
      "维护法律档案、数据库和记录，并协调结案文件。"
    ]
  },
  "599112": {
    title_tr: "Hukuk İşleri Yöneticisi / Temsilcisi (Legal Executive)",
    title_zh: "法务主管",
    duties: [
      "Manages legal files and processes under lawyer supervision, specializing in specific areas.",
      "Drafts complex legal documents, contracts, probate applications or conveyancing papers.",
      "Instructs barristers, conducts client interviews and manages minor legal transactions."
    ],
    duties_tr: [
      "Belirli alanlarda uzmanlaşarak, avukat gözetiminde yasal dosyaları ve süreçleri yönetir.",
      "Karmaşık hukuki belgeler, sözleşmeler, veraset başvuruları veya tapu devir belgeleri hazırlar.",
      "Dava avukatlarını (barrister) bilgilendirir, müşteri görüşmeleri yapar ve küçük hukuki işlemleri yönetir."
    ],
    duties_zh: [
      "在律师监督下管理法律档案和程序，并专注于特定法律领域。",
      "起草复杂的法律文件、合同、遗嘱认证申请或过户文件。",
      "委托出庭律师、进行客户访谈并管理次要法律事务。"
    ]
  },
  "521212": {
    title_tr: "Hukuk Sekreteri",
    title_zh: "法律秘书",
    duties: [
      "Provides administrative support to lawyers, preparing correspondence and legal briefs.",
      "Manages calendars, schedules client appointments, court dates and travel arrangements.",
      "Files court documents, maintains filing systems, billing and handles client enquiries."
    ],
    duties_tr: [
      "Yazışmalar ve yasal özetler hazırlayarak avukatlara idari destek sağlar.",
      "Takvimleri yönetir, müşteri randevularını, mahkeme tarihlerini ve seyahat düzenlemelerini planlar.",
      "Mahkeme belgelerini sunar, dosyalama sistemlerini, faturalandırmayı yürütür ve müşteri taleplerini karşılar."
    ],
    duties_zh: [
      "为律师提供行政支持，准备信件和法律简报。",
      "管理日程表、安排客户会面、法庭开庭日期和行程安排。",
      "提交法庭文件、维护档案系统、开具账单并处理客户咨询。"
    ]
  },
  "224912": {
    title_tr: "İrtibat Görevlisi",
    title_zh: "联络官",
    duties: [
      "Facilitates communication and coordinates activities between different organisations or units.",
      "Identifies issues, resolves conflicts and represents their organisation at meetings.",
      "Prepares briefs, reports, updates and monitors the progress of collaborative projects."
    ],
    duties_tr: [
      "Farklı kuruluşlar veya birimler arasındaki iletişimi kolaylaştırır ve faaliyetleri koordine eder.",
      "Sorunları belirler, çatışmaları çözer ve toplantılarda kuruluşunu temsil eder.",
      "Bilgi notları, raporlar, güncellemeler hazırlar ve ortak projelerin ilerlemesini izler."
    ],
    duties_zh: [
      "促进不同机构或部门之间的沟通并协调其活动。",
      "识别问题、解决冲突并代表其机构参加会议。",
      "准备简报、报告、更新信息，并监控合作项目的进展。"
    ]
  },
  "224611": {
    title_tr: "Kütüphaneci",
    title_zh: "图书管理员",
    duties: [
      "Manages library services, collections, digital resources and reference databases.",
      "Selects, acquires and catalogues library books, journals and electronic media.",
      "Assists users with information searches, reference enquiries and designs learning programs."
    ],
    duties_tr: [
      "Kütüphane hizmetlerini, koleksiyonlarını, dijital kaynaklarını ve referans veri tabanlarını yönetir.",
      "Kütüphane kitaplarını, dergilerini ve elektronik medyayı seçer, satın alır ve kataloglar.",
      "Kullanıcılara bilgi aramalarında, referans sorgularında yardımcı olur ve öğrenme programları tasarlar."
    ],
    duties_zh: [
      "管理图书馆服务、馆藏、数字资源和文献数据库。",
      "选择、采购图书馆图书、期刊和电子媒体并进行编目。",
      "协助用户进行信息检索、文献咨询并设计学习项目。"
    ]
  },
  "141411": {
    title_tr: "Ruhsatlı Kulüp / Dernek Yöneticisi",
    title_zh: "持牌俱乐部经理",
    duties: [
      "Directs, plans and coordinates daily operations of a licensed club or association.",
      "Manages staff, coordinates club events, promotional programs and member services.",
      "Oversees bar services, food services, budgets, licensing laws and safety protocols."
    ],
    duties_tr: [
      "Ruhsatlı bir kulüp veya derneğin günlük operasyonlarını yönlendirir, planlar ve koordine eder.",
      "Personeli yönetir, kulüp etkinliklerini, tanıtım programlarını ve üye hizmetlerini koordine eder.",
      "Bar hizmetlerini, yemek hizmetlerini, bütçeleri, lisans yasalarını ve güvenlik protokollerini denetler."
    ],
    duties_zh: [
      "指导、规划和协调持牌俱乐部或协会的日常运营。",
      "管理员工、协调俱乐部活动、推广计划和会员服务。",
      "监督酒吧服务、餐饮服务、预算、许可法规和安全规程。"
    ]
  },
  "452414": {
    title_tr: "Cankurtaran",
    title_zh: "救生员",
    duties: [
      "Monitors beach or pool areas to identify swimmers in distress and prevent accidents.",
      "Performs water rescues, administers first aid, CPR and coordinates emergency responses.",
      "Enforces safety rules, monitors water conditions and maintains safety gear."
    ],
    duties_tr: [
      "Zor durumdaki yüzücüleri belirlemek ve kazaları önlemek için plaj veya havuz alanlarını izler.",
      "Suda kurtarma yapar, ilk yardım ve CPR uygular ve acil durum müdahalelerini koordine eder.",
      "Güvenlik kurallarını uygular, su koşullarını izler ve güvenlik ekipmanlarının bakımını yapar."
    ],
    duties_zh: [
      "监控海滩或泳池区域以识别遇险游泳者并防止事故发生。",
      "进行水上救援、实施急救、心肺复苏并协调紧急响应。",
      "执行安全守则、监控水域状况并维护安全装备。"
    ]
  },
  "399513": {
    title_tr: "Işık Teknisyeni",
    title_zh: "灯光技术员",
    duties: [
      "Sets up, operates and maintains lighting equipment for stage, film or television.",
      "Positions lighting fixtures, adjusts angles, setups control boards and programs cues.",
      "Collaborates with directors and directors of photography to realize the lighting design."
    ],
    duties_tr: [
      "Sahne, film veya televizyon için ışık ekipmanlarını kurar, çalıştırır ve bakımını yapar.",
      "Işık armatürlerini konumlandırır, açıları ayarlar, kontrol panolarını kurar ve programları yönetir.",
      "Işık tasarımını gerçekleştirmek için yönetmenler ve görüntü yönetmenleriyle iş birliği yapar."
    ],
    duties_zh: [
      "为舞台、电影或电视安装、操作和维护照明设备。",
      "摆放照明灯具、调整角度、设置控制面板并编写灯光程序。",
      "与导演和摄影指导合作以实现灯光设计方案。"
    ]
  },
  "121399": {
    title_tr: "Hayvan Yetiştiricileri (bhk)",
    title_zh: "牲畜养殖户（其他）",
    duties: [
      "Plans, manages and coordinates production of livestock not elsewhere classified.",
      "Oversees animal health, nutrition, pasture quality, fencing and farm infrastructure.",
      "Coordinates harvesting, breeding, processing and marketing of livestock products."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış canlı hayvan üretimini planlar, yönetir ve koordine eder.",
      "Hayvan sağlığını, beslenmesini, mera kalitesini, çitleri ve çiftlik altyapısını denetler.",
      "Hayvansal ürünlerin hasadını, üretilmesini, işlenmesini ve pazarlanmasını koordine eder."
    ],
    duties_zh: [
      "规划、管理和协调未另分类的牲畜生产。",
      "监督动物健康、营养、牧草质量、围栏和农场基础设施。",
      "协调畜牧产品的收获、繁育、加工和销售。"
    ]
  },
  "399514": {
    title_tr: "Makyaj Sanatçısı (Make-up Artist)",
    title_zh: "化妆师",
    duties: [
      "Applies makeup and cosmetics to performers, clients or models for productions or events.",
      "Selects cosmetic products, aligns colours, style briefs and creates special effects.",
      "Ensures tools are clean, sanitised and monitors clients' skin sensitivity."
    ],
    duties_tr: [
      "Yapımlar veya etkinlikler için oyunculara, müşterilere veya modellere makyaj ve kozmetik uygular.",
      "Kozmetik ürünlerini seçer, renkleri ve stil özetlerini uyumlu hale getirir ve özel efektler yaratır.",
      "Araçların temiz, sterilize olmasını sağlar ve müşterilerin cilt hassasiyetini izler."
    ],
    duties_zh: [
      "为演出或活动的演员、客户或模特画日常或艺术妆容。",
      "选择化妆品、调配颜色、符合造型简报并制作特效。",
      "确保工具清洁、消毒，并监测客户的皮肤敏感度。"
    ]
  },
  "133411": {
    title_tr: "İmalat / Üretim Müdürü",
    title_zh: "制造商",
    duties: [
      "Plans, directs and coordinates operations of a manufacturing plant or department.",
      "Manages production schedules, quality standards, resources, budgets and safety compliance.",
      "Optimizes manufacturing workflows, upgrades machinery and monitors performance indicators."
    ],
    duties_tr: [
      "Bir imalat tesisinin veya departmanının operasyonlarını planlar, yönlendirir ve koordine eder.",
      "Üretim programlarını, kalite standartlarını, kaynakları, bütçeleri ve güvenlik uyumluluğunu yönetir.",
      "İmalat iş akışlarını optimize eder, makineleri günceller ve performans göstergelerini izler."
    ],
    duties_zh: [
      "规划、指导和协调制造厂或部门的运营。",
      "管理生产计划、质量标准、资源、预算和安全合规性。",
      "优化制造工作流程、升级机械并监控绩效指标。"
    ]
  },
  "231215": {
    title_tr: "Gemi / Deniz Sörveyörü",
    title_zh: "验船师",
    duties: [
      "Inspects and surveys commercial ships, private vessels, cargo and marine equipment.",
      "Assesses vessel seaworthiness, structural integrity, machinery safety and regulatory compliance.",
      "Conducts damage investigations, writes survey reports and certifies cargo stability."
    ],
    duties_tr: [
      "Ticari gemileri, özel tekneleri, kargoları ve denizcilik ekipmanlarını inceler ve denetler.",
      "Geminin denize elverişliliğini, yapısal bütünlüğünü, makine güvenliğini ve mevzuata uygunluğunu değerlendirir.",
      "Hasar araştırmaları yürütür, sörvey raporları yazar ve kargo yükleme dengesini onaylar."
    ],
    duties_zh: [
      "检查和勘测商业船舶、私人船只、货物和船舶设备。",
      "评估船舶适航性、结构完整性、机械安全和法规合规性。",
      "开展事故损失调查、编写验船报告并认证货物稳性。"
    ]
  },
  "231299": {
    title_tr: "Deniz Taşımacılığı Uzmanları (bhk)",
    title_zh: "水上运输专业人员（其他）",
    duties: [
      "Directs, plans and coordinates maritime transport activities and ship operations not elsewhere classified.",
      "Monitors vessel movements, port logistics, safety compliance and crew management.",
      "Ensures compliance with international maritime laws, environmental rules and shipping codes."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış deniz taşımacılığı faaliyetlerini ve gemi operasyonlarını yönlendirir, planlar ve koordine eder.",
      "Gemi hareketlerini, liman lojistiğini, güvenlik uyumluluğunu ve mürettebat yönetimini izler.",
      "Uluslararası denizcilik yasalarına, çevre kurallarına ve nakliye kodlarına uyumu sağlar."
    ],
    duties_zh: [
      "指导、规划和协调未另分类的海洋运输活动和船舶运营。",
      "监控船舶动态、港口物流、安全合规及船员管理。",
      "确保遵守国际海事法律、环保法规和航运守则。"
    ]
  },
  "311312": {
    title_tr: "Et Muayene / Hijyen Denetim Görevlisi",
    title_zh: "肉类检验员",
    duties: [
      "Inspects animal carcasses, organs and processed meat to verify health and hygiene standards.",
      "Identifies diseases, abnormalities, monitors sanitation levels and compliance with meat industry regulations.",
      "Certifies meat products for market distribution or export, grading carcasses."
    ],
    duties_tr: [
      "Sağlık ve hijyen standartlarını doğrulamak için karkasları, organları ve işlenmiş etleri denetler.",
      "Hastalıkları, anormallikleri tanımlar; sanitasyon düzeylerini ve et endüstrisi yönetmeliklerine uyumu izler.",
      "Et ürünlerini pazar dağıtımı veya ihracat için onaylar, karkasları derecelendirir."
    ],
    duties_zh: [
      "检查动物胴体、内脏和加工肉类，以验证卫生和健康标准。",
      "识别疾病、异常情况，监控卫生水平及对肉类行业法规的遵守情况。",
      "对胴体进行分级，认证肉类产品以供市场销售或出口。"
    ]
  },
  "311299": {
    title_tr: "Tıbbi Teknisyenler (bhk)",
    title_zh: "医疗技术员（其他）",
    duties: [
      "Performs diagnostic tests, laboratory procedures or operates medical equipment not elsewhere classified.",
      "Prepares samples, calibrates instruments, records data and aligns with clinical protocols.",
      "Ensures clinic sterilisation, safety standards and ethical patient handling."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış teşhis testlerini, laboratuvar prosedürlerini gerçekleştirir veya tıbbi ekipmanları çalıştırır.",
      "Numuneleri hazırlar, cihazları kalibre eder, verileri kaydeder ve klinik protokollere uyar.",
      "Klinik sterilizasyonunu, güvenlik standartlarını ve etik hasta yönetimini sağlar."
    ],
    duties_zh: [
      "执行未另分类的诊断测试、实验室程序或操作医疗设备。",
      "准备样本、校准仪器、记录数据并遵循临床方案。",
      "确保诊所消毒、安全标准和符合道德的患者看护。"
    ]
  },
  "322114": {
    title_tr: "Dökümcü / Metal Döküm Elemanı",
    title_zh: "金属铸造工",
    duties: [
      "Operates metal casting furnaces, molds and pouring equipment to fabricate metal castings.",
      "Prepares sand molds, cores, pours molten metal and monitors cooling rates.",
      "Cleans castings, cuts risers and repairs imperfections using hand tools."
    ],
    duties_tr: [
      "Metal dökümler üretmek için metal ergitme fırınlarını, kalıpları ve döküm ekipmanlarını çalıştırır.",
      "Kum kalıpları ve maşaları hazırlar, erimiş metali döker ve soğuma hızlarını izler.",
      "Dökümleri temizler, besleyicileri keser ve el aletleri kullanarak kusurları onarır."
    ],
    duties_zh: [
      "操作金属铸造炉、模具和浇注设备以制造金属铸件。",
      "制备砂型、砂芯，浇注熔融金属并监控冷却速度。",
      "使用手工工具清理铸件、切除浇冒口并修复缺陷。"
    ]
  },
  "323214": {
    title_tr: "Birinci Sınıf Metal Torna / Freze Elemanı",
    title_zh: "金属机械加工工（一级）",
    duties: [
      "Sets up and operates CNC or manual machine tools to shape metal components.",
      "Works from engineering drawings, selects tooling and plans machining sequences.",
      "Measures finished parts using precision tools to ensure specifications compliance."
    ],
    duties_tr: [
      "Metal bileşenleri şekillendirmek için CNC veya manuel makine aletlerini kurar ve çalıştırır.",
      "Mühendislik çizimlerine göre çalışır, takımları seçer ve işleme dizilerini planlar.",
      "Spesifikasyonlara uyumu sağlamak için bitmiş parçaları hassas aletlerle ölçer."
    ],
    duties_zh: [
      "设置和操作数控（CNC）或手动切削机床以对金属部件进行切削加工。",
      "根据工程图纸作业，选择刀具并规划加工顺序。",
      "使用精密工具测量成品工件，以确保符合规范。"
    ]
  },
  "322115": {
    title_tr: "Metal Parlatıcı / Cilacı",
    title_zh: "金属抛光工",
    duties: [
      "Polishes, buffs and finishes metal items using polishing wheels, belts or chemicals.",
      "Prepares metal surfaces by sanding, grinding or stripping coatings.",
      "Selects abrasives, polishes metals to meet finish specifications and checks defects."
    ],
    duties_tr: [
      "Parlatma çarkları, bantları veya kimyasallar kullanarak metal eşyaları parlatır ve temizler.",
      "Metal yüzeyleri zımparalayarak, taşlayarak veya kaplamaları soyarak hazırlar.",
      "Aşındırıcıları seçer, cila spesifikasyonlarını karşılamak için metalleri parlatır ve kusurları kontrol eder."
    ],
    duties_zh: [
      "使用抛光轮、抛光带或化学品对金属物品进行抛光、擦亮和饰面加工。",
      "通过打磨、磨削或剥离涂层来准备金属表面。",
      "选择磨料，抛光金属以达到饰面规范，并检查缺陷。"
    ]
  }
};

const FILE_PATH = path.join(process.cwd(), "src/data/anzsco-list.json");
const list = JSON.parse(readFileSync(FILE_PATH, "utf8")) as SearchEntry[];

let updatedCount = 0;
for (const entry of list) {
  const batchData = BATCH_3_DATA[entry.code];
  if (batchData) {
    Object.assign(entry, batchData);
    updatedCount += 1;
  }
}

writeFileSync(FILE_PATH, JSON.stringify(list, null, 2));
console.log(`Successfully updated ${updatedCount} entries in anzsco-list.json.`);
