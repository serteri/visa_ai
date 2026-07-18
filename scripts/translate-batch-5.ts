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

const BATCH_5_DATA: Record<string, Partial<SearchEntry>> = {
  "142115": {
    title_tr: "Postane Müdürü",
    title_zh: "邮局经理",
    duties: [
      "Directs and plans operations of a post office branch or retail outlet.",
      "Manages postal staff, coordinates retail sales, mail delivery and budgets.",
      "Ensures compliance with postal regulations, security standards and customer service policies."
    ],
    duties_tr: [
      "Bir postane şubesinin veya perakende satış noktasının operasyonlarını yönlendirir ve planlar.",
      "Posta personelini yönetir, perakende satışları, posta dağıtımını ve bütçeleri koordine eder.",
      "Posta yönetmeliklerine, güvenlik standartlarına ve müşteri hizmetleri politikalarına uyumu sağlar."
    ],
    duties_zh: [
      "指导并规划邮局分支机构或零售网点的运营。",
      "管理邮政员工，协调零售业务、邮件寄递和预算。",
      "确保遵守邮政法规、安全标准和客户服务政策。"
    ]
  },
  "211412": {
    title_tr: "Seramik Sanatçısı / Çömlekçi",
    title_zh: "陶艺家或陶瓷艺术家",
    duties: [
      "Designs and fabricates ceramic wares, pottery and sculptures using clay.",
      "Prepares clay bodies, shapes items on pottery wheels, applies glazes and operates kilns.",
      "Exhibits artworks in galleries, coordinates sales and demonstrates pottery techniques."
    ],
    duties_tr: [
      "Kil kullanarak seramik eşyalar, çömlekler ve heykeller tasarlar ve üretir.",
      "Kil çamurunu hazırlar, çömlekçi çarkında eşyalara şekil verir, sır uygular ve fırınları çalıştırır.",
      "Sanat eserlerini galerilerde sergiler, satışları koordine eder ve çömlekçilik tekniklerini gösterir."
    ],
    duties_zh: [
      "使用粘土设计和制作陶瓷器皿、陶器和雕塑。",
      "制备泥料、在陶轮上拉坯成型、上釉并操作烧成窑。",
      "在画廊展出艺术品、协调销售并演示制陶技术。"
    ]
  },
  "121321": {
    title_tr: "Kümes Hayvanları Yetiştiricisi",
    title_zh: "家禽养殖户",
    duties: [
      "Breeds, raises and manages poultry for meat, egg production or breeding stock.",
      "Monitors poultry health, nutrition, egg collection and coordinates veterinary care.",
      "Manages farm biosecurity, housing systems, equipment and product marketing."
    ],
    duties_tr: [
      "Et, yumurta üretimi veya damızlık stok için kümes hayvanları üretir, yetiştirir ve yönetir.",
      "Kümes hayvanlarının sağlığını, beslenmesini, yumurta toplamayı izler ve veteriner bakımını koordine eder.",
      "Çiftlik biyogüvenliğini, barınak sistemlerini, ekipmanlarını ve ürün pazarlamasını yönetir."
    ],
    duties_zh: [
      "繁育、饲养和管理家禽，以获取禽肉、禽蛋或种禽。",
      "监测家禽健康、营养、集蛋并协调兽医护理。",
      "管理农场生物安全、禽舍系统、设备和产品销售。"
    ]
  },
  "399213": {
    title_tr: "Enerji Santrali Operatörü",
    title_zh: "发电厂操作员",
    duties: [
      "Operates boilers, turbines, generators and auxiliary equipment in a power plant.",
      "Monitors control panels, regulates power output and performs system safety checks.",
      "Conducts routine maintenance, logs operational data and responds to electrical faults."
    ],
    duties_tr: [
      "Bir enerji santralindeki kazanları, türbinleri, jeneratörleri ve yardımcı ekipmanları çalıştırır.",
      "Kontrol panellerini izler, güç çıkışını düzenler ve sistem güvenlik kontrollerini gerçekleştirir.",
      "Rutin bakımları yapar, operasyonel verileri kaydeder ve elektriksel arızalara müdahale eder."
    ],
    duties_zh: [
      "操作发电厂的锅炉、汽轮机、发电机及辅助设备。",
      "监控控制面板、调节电力输出并执行系统安全检查。",
      "进行常规维护、记录运行数据并应对电气故障。"
    ]
  },
  "512299": {
    title_tr: "Diğer Muayenehane / Ofis Yöneticileri (bhk)",
    title_zh: "事务所经理（其他）",
    duties: [
      "Manages administrative and daily operations of professional practices not elsewhere classified.",
      "Supervises administrative staff, manages client billing, scheduling and file systems.",
      "Ensures practice compliance with regulations, safety protocols and operational standards."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış mesleki muayenehanelerin veya büroların idari ve günlük operasyonlarını yönetir.",
      "İdari personeli denetler, müşteri faturalandırmasını, programlamayı ve dosya sistemlerini yönetir.",
      "Ofisin yönetmeliklere, güvenlik protokollerine ve operasyonel standartlara uygunluğunu sağlar."
    ],
    duties_zh: [
      "管理未另分类的专业事务所的行政和日常运营。",
      "监督行政员工、管理客户开账单、日程排班和档案系统。",
      "确保事务所符合法规、安全规程和运营标准。"
    ]
  },
  "323314": {
    title_tr: "Hassas Aletler Yapımcısı ve Tamircisi",
    title_zh: "精密仪器制造及修理工",
    duties: [
      "Fabricates, calibrates, repairs and maintains precision instruments and apparatus.",
      "Assembles optical, medical, scientific or navigational tools and checks calibration.",
      "Uses precision engineering machinery, measuring tools and diagnoses component faults."
    ],
    duties_tr: [
      "Hassas aletleri ve cihazları imal eder, kalibre eder, onarır ve bakımını yapar.",
      "Optik, tıbbi, bilimsel veya navigasyonel aletleri monte eder ve kalibrasyonunu kontrol eder.",
      "Hassas mühendislik makinelerini, ölçüm aletlerini kullanır ve bileşen arızalarını teşhis eder."
    ],
    duties_zh: [
      "制造、校准、修理和维护精密仪器和装置。",
      "组装光学、医疗、科学或导航工具并检查校准。",
      "使用精密工程机械、测量工具并诊断组件故障。"
    ]
  },
  "322312": {
    title_tr: "Basınçlı Kap / Boru Kaynakçısı",
    title_zh: "压力容器焊工",
    duties: [
      "Welds pressure vessels, boilers, pipelines and structures to high quality specifications.",
      "Selects welding techniques, prepares joints, monitors parameters and performs stress reliefs.",
      "Conducts non-destructive testing (NDT) audits and verifies weld integrity compliance."
    ],
    duties_tr: [
      "Basınçlı kapları, kazanları, boru hatlarını ve yapıları yüksek kalite spesifikasyonlarına göre kaynaklar.",
      "Kaynak tekniklerini seçer, derzleri hazırlar, parametreleri izler ve gerilim giderme işlemlerini gerçekleştirir.",
      "Tahribatsız muayene (NDT) denetimleri yürütür ve kaynak bütünlüğü uygunluğunu doğrular."
    ],
    duties_zh: [
      "按照高品质规范焊接压力容器、锅炉、管道和结构件。",
      "选择焊接工艺、准备接头、监控焊接参数并进行应力消除。",
      "进行无损检测（NDT）审计并验证焊缝完整性合规。"
    ]
  },
  "134213": {
    title_tr: "Birinci Basamak Sağlık Kuruluşu Yöneticisi",
    title_zh: "基层医疗机构经理",
    duties: [
      "Plans, directs and coordinates operations of a primary health organisation or network.",
      "Manages public health budgets, staffing, community programs and policy outcomes.",
      "Liaises with health departments, medical practitioners and community stakeholders."
    ],
    duties_tr: [
      "Bir birinci basamak sağlık kuruluşunun veya ağının operasyonlarını planlar, yönlendirir ve koordine eder.",
      "Halk sağlığı bütçelerini, personelini, topluluk programlarını ve politika sonuçlarını yönetir.",
      "Sağlık daireleri, pratisyen hekimler ve topluluk paydaşlarıyla iletişim kurar."
    ],
    duties_zh: [
      "规划、指导和协调基层医疗机构或网络的运营。",
      "管理公共卫生预算、人员配置、社区项目和政策成果。",
      "与卫生部门、开业医生和社区利益相关者联络。"
    ]
  },
  "311399": {
    title_tr: "Tarım Ürünleri Güvence ve Denetim Görevlileri (bhk)",
    title_zh: "初级产品质量保证和检验员（其他）",
    duties: [
      "Performs assurance, inspection or grading tasks for agricultural products not elsewhere classified.",
      "Inspects storage facilities, logs compliance issues and checks sanitation levels.",
      "Verifies product quality certificates, grades products and logs audit records."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış tarım ürünleri için güvence, denetim veya derecelendirme görevlerini yerine getirir.",
      "Depolama tesislerini inceler, uygunsuzluk sorunlarını kaydeder ve sanitasyon düzeylerini kontrol eder.",
      "Ürün kalite sertifikalarını doğrular, ürünleri derecelendirir ve denetim kayıtlarını tutar."
    ],
    duties_zh: [
      "执行未另分类的农产品质量保证、检验或分级任务。",
      "检查储存设施、记录违规问题并检查卫生水平。",
      "验证产品质量证书、对产品进行分级并记录审计日志。"
    ]
  },
  "311314": {
    title_tr: "Tarım Ürünleri Kalite Güvence Görevlisi",
    title_zh: "初级产品质量保证员",
    duties: [
      "Develops and implements quality assurance programs for agricultural or primary products.",
      "Monitors harvesting, packaging, storage and tests products for quality standards.",
      "Audits supply chain logs, records quality breaches and designs remedial updates."
    ],
    duties_tr: [
      "Tarımsal veya birincil ürünler için kalite güvence programları geliştirir ve uygular.",
      "Hasadı, paketlemeyi, depolamayı izler ve ürünleri kalite standartlarına göre test eder.",
      "Tedarik zinciri kayıtlarını denetler, kalite ihlallerini kaydeder ve düzeltici güncellemeler tasarlar."
    ],
    duties_zh: [
      "制定并实施农产品或初级产品的质量保证计划。",
      "监控收获、包装、储存并测试产品以确保符合质量标准。",
      "审计供应链记录、记录质量违规行为并设计整改方案。"
    ]
  },
  "392111": {
    title_tr: "Matbaa Mücelliti / Ciltleme ve Baskı Sonrası Elemanı",
    title_zh: "印刷装订工",
    duties: [
      "Sets up and operates bindery and finishing machinery to assemble printed items.",
      "Performs folding, cutting, stitching, binding, laminating and embossing tasks.",
      "Maintains bindery tools, checks finished products quality and prepares items for transport."
    ],
    duties_tr: [
      "Basılı ürünleri bir araya getirmek için ciltleme ve baskı sonrası makinelerini kurar ve çalıştırır.",
      "Katlama, kesme, dikiş, ciltleme, laminasyon ve kabartma işlemlerini gerçekleştirir.",
      "Ciltleme aletlerinin bakımını yapar, bitmiş ürünlerin kalitesini kontrol eder ve ürünleri nakliyeye hazırlar."
    ],
    duties_zh: [
      "设置并操作装订和后加工机械，以组装印刷品。",
      "执行折页、模切、订书、装订、覆膜和压花任务。",
      "维护装订工具、检查成品质量并准备物品以供运输。"
    ]
  },
  "212413": {
    title_tr: "Yazılı Basın Gazetecisi",
    title_zh: "纸媒记者",
    duties: [
      "Researches, writes and edits news stories and articles for newspapers or magazines.",
      "Conducts interviews, attends events, reviews public records and verifies facts.",
      "Liaises with editors, photographers and coordinates file submissions."
    ],
    duties_tr: [
      "Gazeteler veya dergiler için haberleri ve makaleleri araştırır, yazar ve düzenler.",
      "Röportajlar yapar, etkinliklere katılır, kamu kayıtlarını inceler ve gerçekleri doğrular.",
      "Müşterilerle, editörlerle, fotoğrafçılarla iletişim kurar ve dosya teslimlerini koordine eder."
    ],
    duties_zh: [
      "为报纸或杂志研究、撰写和编辑新闻报道和文章。",
      "进行采访、出席活动、审查公共记录并核实事实。",
      "与编辑、摄影师联络并协调文件交寄。"
    ]
  },
  "392311": {
    title_tr: "Matbaa Baskı Operatörü / Makinisti",
    title_zh: "印刷机操作工",
    duties: [
      "Sets up and operates digital, lithographic, flexographic or gravure printing presses.",
      "Prepares plates, loads paper, mixes inks, adjusts presses and monitors print quality.",
      "Maintains printing machinery, troubleshoots mechanical faults and checks alignment."
    ],
    duties_tr: [
      "Dijital, litografik (ofset), fleksografik veya tifdruk baskı makinelerini kurar ve çalıştırır.",
      "Kalıpları hazırlar, kağıt yükler, mürekkepleri karıştırır, makineleri ayarlar ve baskı kalitesini izler.",
      "Baskı makinelerinin bakımını yapar, mekanik arızaları giderir ve hizalamayı kontrol eder."
    ],
    duties_zh: [
      "设置并操作数字、平版（胶印）、柔版或凹版印刷机。",
      "制备印版、装载纸张、调配油墨、调节印刷机并监控印刷质量。",
      "维护印刷机械、排除机械故障并检查对齐情况。"
    ]
  },
  "249299": {
    title_tr: "Diğer Özel Ders Öğretmenleri ve Eğitmenler (bhk)",
    title_zh: "私人教师及导师（其他）",
    duties: [
      "Teaches academic or practical subjects to individuals or groups outside formal school systems.",
      "Assesses students' learning needs, designs lesson programs and monitors progress.",
      "Prepares students for examinations, grades work and logs progress records."
    ],
    duties_tr: [
      "Resmi okul sistemleri dışında, bireylere veya gruplara akademik ya da pratik dersler öğretir.",
      "Öğrencilerin öğrenme ihtiyaçlarını değerlendirir, ders programları tasarlar ve ilerlemeyi izler.",
      "Öğrencileri sınavlara hazırlar, ödevleri notlandırır ve ilerleme kayıtlarını tutar."
    ],
    duties_zh: [
      "在正规学校系统之外向个人或团体教授学术或实用科目。",
      "评估学生的学习需求，设计教学大纲并监控进度。",
      "指导学生准备考试、评改作业并记录学习进度。"
    ]
  },
  "133612": {
    title_tr: "Satın Alma Müdürü",
    title_zh: "采购经理",
    duties: [
      "Plans, directs and coordinates purchasing and supply activities of organisations.",
      "Negotiates commercial contracts, vendor agreements, monitors budgets and inventory.",
      "Optimizes procurement workflows, upgrades supply chains and monitors performance."
    ],
    duties_tr: [
      "Kuruluşların satın alma ve tedarik faaliyetlerini planlar, yönlendirir ve koordine eder.",
      "Ticari sözleşmeleri, tedarikçi anlaşmalarını müzakere eder, bütçeleri ve envanteri izler.",
      "Satın alma iş akışlarını optimize eder, tedarik zincirlerini yükseltir ve performansı izler."
    ],
    duties_zh: [
      "规划、指导和协调机构的采购与供应活动。",
      "谈判商业合同、供应商协议，监控预算和库存。",
      "优化采购工作流程、升级供应链并监控业绩指标。"
    ]
  },
  "133511": {
    title_tr: "Ormancılık Üretim Müdürü",
    title_zh: "林业生产经理",
    duties: [
      "Plans, directs and coordinates operations of a forestry production facility or department.",
      "Manages harvesting schedules, quality standards, resources, budgets and safety compliance.",
      "Optimizes forestry workflows, upgrades machinery and monitors performance indicators."
    ],
    duties_tr: [
      "Bir ormancılık üretim tesisinin veya departmanının operasyonlarını planlar, yönlendirir ve koordine eder.",
      "Hasat programlarını, kalite standartlarını, kaynakları, bütçeleri ve güvenlik uyumluluğunu yönetir.",
      "Ormancılık iş akışlarını optimize eder, makineleri yükseltir ve performans göstergelerini izler."
    ],
    duties_zh: [
      "规划、指导和协调林业生产设施或部门 of 运营。",
      "管理采伐计划、质量标准、资源、预算和安全合规性。",
      "优化林业工作流程、升级机械并监控绩效指标。"
    ]
  },
  "133512": {
    title_tr: "İmalat Üretim Müdürü",
    title_zh: "制造生产经理",
    duties: [
      "Plans, directs and coordinates manufacturing production activities and schedules.",
      "Manages production resources, quality standards, budgets and safety compliance.",
      "Optimizes manufacturing workflows, upgrades machinery and monitors performance indicators."
    ],
    duties_tr: [
      "İmalat üretim faaliyetlerini ve programlarını planlar, yönlendirir ve koordine eder.",
      "Üretim kaynaklarını, kalite standartlarını, bütçeleri ve güvenlik uyumluluğunu yönetir.",
      "İmalat iş akışlarını optimize eder, makineleri yükseltir ve performans göstergelerini izler."
    ],
    duties_zh: [
      "规划、指导和协调制造生产活动及进度计划。",
      "管理生产资源、质量标准、预算和安全合规性。",
      "优化制造工作流程、升级机械并监控绩效指标。"
    ]
  },
  "133513": {
    title_tr: "Maden Üretim Müdürü",
    title_zh: "矿业生产经理",
    duties: [
      "Plans, directs and coordinates mining and extraction activities and schedules.",
      "Manages mining resources, quality standards, budgets and safety compliance.",
      "Optimizes mining workflows, upgrades machinery and monitors performance indicators."
    ],
    duties_tr: [
      "Madencilik ve çıkarma faaliyetlerini ve programlarını planlar, yönlendirir ve koordine eder.",
      "Madencilik kaynaklarını, kalite standartlarını, bütçeleri ve güvenlik uyumluluğunu yönetir.",
      "Madencilik iş akışlarını optimize eder, makineleri yükseltir ve performans göstergelerini izler."
    ],
    duties_zh: [
      "规划、指导和协调采矿及开采活动与进度计划。",
      "管理采矿资源、质量标准、预算和安全合规性。",
      "优化采矿工作流程、升级机械并监控绩效指标。"
    ]
  },
  "212315": {
    title_tr: "Yayın / Program Yönetmeni (TV veya Radyo)",
    title_zh: "节目总监（电视或广播）",
    duties: [
      "Directs, plans and coordinates television or radio programs and schedules.",
      "Selects program content, directs program hosts and monitors broadcasting quality.",
      "Liaises with producers, writers and ensures compliance with broadcasting laws."
    ],
    duties_tr: [
      "Televizyon veya radyo programlarını ve yayın akışlarını yönlendirir, planlar ve koordine eder.",
      "Program içeriğini seçer, program sunucularını yönlendirir ve yayın kalitesini izler.",
      "Yapımcılar, yazarlar ile iletişim kurar ve yayıncılık yasalarına uyumu sağlar."
    ],
    duties_zh: [
      "指导、规划和协调电视或广播节目及播出日程安排。",
      "选择节目内容、指导节目主持人并监控播出质量。",
      "与制作人、撰稿人联络并确保符合广播电视法律。"
    ]
  },
  "133112": {
    title_tr: "Proje Müteahhidi / Yapı Yüklenicisi",
    title_zh: "工程项目营造商",
    duties: [
      "Plans, directs and coordinates construction of residential or commercial buildings.",
      "Manages building budgets, schedules, sub-contractors, materials and permits.",
      "Ensures building compliance with construction regulations, plans and safety standards."
    ],
    duties_tr: [
      "Konut veya ticari binaların inşaatını planlar, yönlendirir ve koordine eder.",
      "İnşaat bütçelerini, programlarını, alt yüklenicileri, malzemeleri ve izinleri yönetir.",
      "İnşaat düzenlemelerine, planlara ve güvenlik standartlarına uygunluğu sağlar."
    ],
    duties_zh: [
      "规划、指导和协调住宅或商业建筑的建造。",
      "管理建筑预算、进度、分包商、材料和许可证。",
      "确保建筑符合建筑法规、设计图纸和安全标准。"
    ]
  },
  "272399": {
    title_tr: "Diğer Psikologlar (bhk)",
    title_zh: "心理学家（其他）",
    duties: [
      "Performs psychological assessments, research or counselling tasks not elsewhere classified.",
      "Conducts cognitive tests, gathers client histories, and designs behavioral therapy programs.",
      "Ensures compliance with ethical clinical frameworks and logs client records."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış psikolojik değerlendirmeler, araştırmalar veya danışmanlık görevlerini yerine getirir.",
      "Bilişsel testler yapar, danışan geçmişlerini toplar ve davranışçı terapi programları tasarlar.",
      "Etik klinik çerçevelere uyumu sağlar ve danışan kayıtlarını tutar."
    ],
    duties_zh: [
      "执行未另分类的心理学评估、研究或咨询任务。",
      "进行认知测试、收集客户病史，并设计行为治疗方案。",
      "确保符合临床道德准则，并记录客户档案。"
    ]
  },
  "131114": {
    title_tr: "Halkla İlişkiler (PR) Müdürü",
    title_zh: "公关经理",
    duties: [
      "Plans, directs and coordinates public relations and communications activities.",
      "Manages PR budgets, staff, media relations and coordinates media campaigns.",
      "Ensures communication compliance with corporate guidelines, policies and logs press releases."
    ],
    duties_tr: [
      "Halkla ilişkiler ve iletişim faaliyetlerini planlar, yönlendirir ve koordine eder.",
      "PR bütçelerini, personelini, medya ilişkilerini yönetir ve medya kampanyalarını koordine eder.",
      "İletişimin kurumsal yönergelere, politikalara uygunluğunu sağlar ve basın bültenlerini kaydeder."
    ],
    duties_zh: [
      "规划、指导和协调公共关系与宣传沟通活动。",
      "管理公关预算、员工、媒体关系并协调媒体活动。",
      "确保沟通符合企业指南和政策，并记录新闻发布日志。"
    ]
  },
  "311313": {
    title_tr: "Karantina / Biyogüvenlik Denetim Görevlisi",
    title_zh: "检疫官员",
    duties: [
      "Enforces laws, regulations and policies regarding quarantine and biosecurity.",
      "Inspects imported goods, passengers, luggage, vessels and aircraft for biosecurity hazards.",
      "Conducts tests, manages treatment of infested products and logs inspection records."
    ],
    duties_tr: [
      "Karantina ve biyogüvenlik ile ilgili yasaları, yönetmelikleri ve politikaları uygular.",
      "Biyogüvenlik tehlikeleri açısından ithal edilen malları, yolcuları, bagajları, gemileri ve uçakları denetler.",
      "Testler gerçekleştirir, istila edilmiş ürünlerin tedavisini yönetir ve denetim kayıtlarını tutar."
    ],
    duties_zh: [
      "执行有关检疫和生物安全的法律、法规 and 政策。",
      "检查进口货物、旅客、行李、船舶和飞机是否存在生物安全隐患。",
      "进行检测、管理受污染产品的处理并记录检查档案。"
    ]
  },
  "253918": {
    title_tr: "Radyasyon Onkolojisi Uzmanı",
    title_zh: "放射肿瘤科医生",
    duties: [
      "Diagnoses and treats cancer using radiation therapy techniques.",
      "Designs, simulates and reviews radiation treatment plans and doses.",
      "Consults with patients, oncology teams and monitors post-treatment recovery."
    ],
    duties_tr: [
      "Radyasyon terapisi tekniklerini kullanarak kanseri teşhis ve tedavi eder.",
      "Radyasyon tedavisi planlarını ve dozlarını tasarlar, simüle eder ve inceler.",
      "Hastalarla, onkoloji ekipleriyle görüşür ve tedavi sonrası iyileşme sürecini izler."
    ],
    duties_zh: [
      "使用放射治疗技术诊断和治疗癌症。",
      "设计、模拟并审查放疗计划和剂量。",
      "咨询患者、肿瘤学团队并监测治疗后的康复情况。"
    ]
  },
  "212414": {
    title_tr: "Radyo Muhabiri / Gazetecisi",
    title_zh: "广播电台记者",
    duties: [
      "Researches, writes and presents news stories for radio broadcasts.",
      "Conducts interviews, attends events, records audio and edits reports.",
      "Liaises with editors, producers and presents live or recorded bulletins."
    ],
    duties_tr: [
      "Radyo yayınları için haberleri araştırır, yazar ve sunar.",
      "Röportajlar yapar, etkinliklere katılır, ses kaydeder ve haberleri düzenler.",
      "Editörlerle, yapımcılarla iletişim kurar ve canlı veya kayıt bültenleri sunar."
    ],
    duties_zh: [
      "为广播电台节目研究、撰写并播报新闻报道。",
      "进行采访、出席活动、录制音频并编辑报道。",
      "与编辑、制作人联络并播报直播或录播的新闻简报。"
    ]
  },
  "149412": {
    title_tr: "Tren İstasyonu Müdürü",
    title_zh: "火车站站长",
    duties: [
      "Directs, plans and coordinates daily operations of a railway station.",
      "Manages station staff, schedules passenger services and coordinates security.",
      "Oversees facilities maintenance, ticketing systems and passenger safety compliance."
    ],
    duties_tr: [
      "Bir demiryolu istasyonunun günlük operasyonlarını yönlendirir, planlar ve koordine eder.",
      "İstasyon personelini yönetir, yolcu seferlerini programlar ve güvenliği koordine eder.",
      "Tesis bakımını, biletleme sistemlerini ve yolcu güvenliği uyumluluğunu denetler."
    ],
    duties_zh: [
      "指导、规划和协调火车站的日常运营。",
      "管理车站员工、安排客运班次并协调安全保卫。",
      "监督设施维护、票务系统和旅客安全合规性。"
    ]
  },
  "612113": {
    title_tr: "Gayrimenkul Acentesi Sahibi / Yetkili Lisans Sahibi",
    title_zh: "房地产代理公司负责人（澳）/ 房地产代理持牌人（新）",
    duties: [
      "Directs, plans and coordinates operations of a real estate agency business.",
      "Manages agency staff, real estate transactions, trust accounts and licensing laws.",
      "Ensures compliance with property regulations, fair trading laws and code of ethics."
    ],
    duties_tr: [
      "Bir gayrimenkul acentesi işletmesinin operasyonlarını yönlendirir, planlar ve koordine eder.",
      "Acente personelini, gayrimenkul işlemlerini, emanet hesaplarını (trust account) ve lisans yasalarını yönetir.",
      "Mülkiyet yönetmeliklerine, adil ticaret yasalarına ve etik kurallara uyumu sağlar."
    ],
    duties_zh: [
      "指导、规划和协调房地产中介机构的运营。",
      "管理机构员工、房地产交易、信托账户及执业许可法律事务。",
      "确保符合房地产法规、公平交易法和道德准则要求。"
    ]
  },
  "612115": {
    title_tr: "Gayrimenkul Temsilcisi / Danışmanı",
    title_zh: "房地产销售代表",
    duties: [
      "Assists clients with buying, selling or renting residential or commercial properties.",
      "Conducts property inspections, prepares listing agreements and coordinates marketing.",
      "Liaises with buyers, sellers, legal teams and assists with contract negotiations."
    ],
    duties_tr: [
      "Konut veya ticari mülklerin satın alınması, satılması veya kiralanması konularında müşterilere yardımcı olur.",
      "Mülk incelemeleri yapar, listeleme sözleşmeleri hazırlar ve pazarlamayı koordine eder.",
      "Alıcılar, satıcılar, hukuk ekipleriyle iletişim kurar ve sözleşme müzakerelerine yardımcı olur."
    ],
    duties_zh: [
      "协助客户购买、出售或出租住宅及商业地产。",
      "进行房产检查、准备挂牌协议并协调推广营销。",
      "与买家、卖家、法律团队联络，并协助合同谈判。"
    ]
  },
  "224214": {
    title_tr: "Kayıt / Arşiv Yöneticisi",
    title_zh: "档案记录经理",
    duties: [
      "Manages records systems, archives and information databases of organisations.",
      "Develops records classification, index systems and coordinates privacy protections.",
      "Liaises with IT teams, audits records disposal and ensures compliance with records laws."
    ],
    duties_tr: [
      "Kuruluşların kayıt sistemlerini, arşivlerini ve bilgi veri tabanlarını yönetir.",
      "Kayıt sınıflandırma, indeks sistemleri geliştirir ve gizlilik korumalarını koordine eder.",
      "BT ekipleriyle iletişim kurar, kayıtların imha edilmesini denetler ve arşiv yasalarına uyumu sağlar."
    ],
    duties_zh: [
      "管理机构的档案系统、历史文献和信息数据库。",
      "制定档案分类、索引系统并协调隐私保护机制。",
      "与IT团队沟通、审计档案销毁并确保符合档案法律要求。"
    ]
  },
  "223112": {
    title_tr: "İşe Alım / İK Danışmanı",
    title_zh: "招聘顾问",
    duties: [
      "Matches candidates with job openings, liaising with client organisations.",
      "Sources candidates, conducts interviews, tests skills and performs reference checks.",
      "Prepares candidate profiles, schedules client interviews and assists with job offers."
    ],
    duties_tr: [
      "Müşteri kuruluşlarla iletişim kurarak adayları açık iş pozisyonlarıyla eşleştirir.",
      "Aday bulur, mülakatlar yapar, becerileri test eder ve referans kontrollerini gerçekleştirir.",
      "Aday profilleri hazırlar, müşteri görüşmelerini planlar ve iş tekliflerine yardımcı olur."
    ],
    duties_zh: [
      "使候选人与工作空缺相匹配，并与客户机构联络。",
      "寻找候选人、进行面试、测试技能并开展背景调查。",
      "准备候选人档案、安排客户面试并协助发放录取通知。"
    ]
  },
  "134412": {
    title_tr: "Bölgesel Eğitim Müdürü",
    title_zh: "区域教育经理",
    duties: [
      "Plans, directs and coordinates educational services and operational standards in a region.",
      "Manages educational budgets, staffing, schools resources and coordinates program outcomes.",
      "Liaises with education departments, school principals and community stakeholders."
    ],
    duties_tr: [
      "Bir bölgedeki eğitim hizmetlerini ve operasyonel standartları planlar, yönlendirir ve koordine eder.",
      "Eğitim bütçelerini, personel planlamasını, okul kaynaklarını yönetir ve program sonuçlarını koordine eder.",
      "Eğitim müdürlükleri, okul müdürleri ve topluluk paydaşlarıyla iletişim kurar."
    ],
    duties_zh: [
      "规划、指导和协调区域内的教育服务及运营标准。",
      "管理教育预算、人员配置、学校资源并协调项目成果。",
      "与教育部门、学校校长和社区利益相关者联络。"
    ]
  },
  "254417": {
    title_tr: "Kayıtlı Hemşire (Engelli Bakımı ve Rehabilitasyon)",
    title_zh: "注册护士（残疾与康复）",
    duties: [
      "Provides nursing care to patients with physical or intellectual disabilities, coordinating rehabilitation programs.",
      "Assesses patient health, administers medications, monitors therapy progress and logs records.",
      "Collaborates with medical practitioners, occupational therapists and designs support plans."
    ],
    duties_tr: [
      "Fiziksel veya zihinsel engelli hastalara hemşirelik bakımı sağlar, rehabilitasyon programlarını koordine eder.",
      "Hasta sağlığını değerlendirir, ilaçları uygular, terapi ilerlemesini izler ve kayıtları tutar.",
      "Hekimler, ergoterapistler (iş-uğraşı terapistleri) ile iş birliği yapar ve destek planları tasarlar."
    ],
    duties_zh: [
      "为身体或智力残疾患者提供护理，协调康复计划。",
      "评估患者健康、给药、监控治疗进度并记录档案。",
      "与医生、作业治疗师合作并设计支持计划。"
    ]
  },
  "139917": {
    title_tr: "Mevzuat ve Uyumluluk Müdürü (Regulatory Affairs Manager)",
    title_zh: "法规事务经理",
    duties: [
      "Plans, directs and coordinates regulatory compliance and licensing processes of organisations.",
      "Manages compliance budgets, staff, audits and coordinates policy implementation.",
      "Liaises with regulatory authorities, handles legal filings and monitors standards updates."
    ],
    duties_tr: [
      "Kuruluşların mevzuat uyumluluğunu ve ruhsatlandırma süreçlerini planlar, yönlendirir ve koordine eder.",
      "Uyumluluk bütçelerini, personelini, denetimleri yönetir ve politika uygulamasını koordine eder.",
      "Düzenleyici kurumlarla iletişim kurar, yasal başvuruları yürütür ve standart güncellemelerini izler."
    ],
    duties_zh: [
      "规划、指导和协调机构的法规合规性与许可准入程序。",
      "管理合规预算、人员、审计并协调政策实施。",
      "与监管部门联络、处理法律文件申报并监控标准更新。"
    ]
  },
  "272114": {
    title_tr: "Rehabilitasyon Danışmanı",
    title_zh: "康复顾问",
    duties: [
      "Provides counselling and vocational support to assist individuals recovering from injury or illness.",
      "Conducts vocational assessments, designs rehabilitation programs and monitors progress.",
      "Collaborates with insurers, medical practitioners, employers and coordinates return-to-work plans."
    ],
    duties_tr: [
      "Yaralanma veya hastalıktan iyileşme sürecindeki bireylere yardımcı olmak için danışmanlık ve mesleki destek sağlar.",
      "Mesleki değerlendirmeler yapar, rehabilitasyon programları tasarlar ve ilerlemeyi izler.",
      "Sigortacılar, hekimler, işverenler ile iş birliği yapar ve işe dönüş planlarını koordine eder."
    ],
    duties_zh: [
      "提供咨询和职业支持，以协助因伤病康复的个人。",
      "进行职业评估、设计康复计划并监控进度。",
      "与保险公司、医生、雇主合作，并协调复工计划。"
    ]
  },
  "411715": {
    title_tr: "Yatılı Bakım Görevlisi",
    title_zh: "住家照护员",
    duties: [
      "Provides daily care and support to residents in group homes, hostels or shelter homes.",
      "Assists residents with hygiene, meals, mobility and coordinates recreational activities.",
      "Monitors resident behavior, wellbeing, administers medications and logs daily reports."
    ],
    duties_tr: [
      "Grup evleri, pansiyonlar veya sığınma evlerindeki sakinlere günlük bakım ve destek sağlar.",
      "Sakinlerin hijyen, yemek, hareket etme ihtiyaçlarına yardımcı olur ve rekreasyonel etkinlikleri koordine eder.",
      "Sakinlerin davranışlarını, iyi olma durumlarını izler, ilaçlarını verir ve günlük raporları tutar."
    ],
    duties_zh: [
      "为寄养家庭、宿舍或收容所的居民提供日常照料和支持。",
      "协助居民的个人卫生、饮食、起居并协调娱乐活动。",
      "监测居民的行为和身心状况、给药并记录日常报告。"
    ]
  },
  "234612": {
    title_tr: "Solunum Bilimci (Fizyologu)",
    title_zh: "呼吸系统科学家",
    duties: [
      "Performs diagnostic tests and research on patients' respiratory systems.",
      "Operates spirometers, gas analyzers, logs data and checks calibration.",
      "Collaborates with respiratory physicians, records clinical logs and ensures safety."
    ],
    duties_tr: [
      "Hastaların solunum sistemleri üzerinde teşhis testleri ve araştırmalar gerçekleştirir.",
      "Spirometreleri, gas analizörlerini çalıştırır, verileri kaydeder ve kalibrasyonu kontrol eder.",
      "Göğüs hastalıkları hekimleriyle iş birliği yapar, klinik kayıtları tutar ve güvenliği sağlar."
    ],
    duties_zh: [
      "对患者的呼吸系统执行诊断测试和研究。",
      "操作肺活量计、气体分析仪、记录数据并检查校准。",
      "与呼吸科医生合作、记录临床档案并确保安全。"
    ]
  },
  "639211": {
    title_tr: "Perakende Satın Alma Uzmanı (Kategori Alıcısı)",
    title_zh: "零售买手",
    duties: [
      "Selects and purchases product ranges for retail establishments to sell to consumers.",
      "Analyses market trends, negotiates prices, delivery terms and coordinates advertising.",
      "Monitors sales targets, inventory levels and competitor product lines."
    ],
    duties_tr: [
      "Perakende kuruluşlarının tüketicilere satması için ürün yelpazesini seçer ve satın alır.",
      "Piyasa trendlerini analiz eder, fiyatları, teslimat koşullarını müzakere eder ve reklamları koordine eder.",
      "Satış hedeflerini, envanter seviyelerini ve rakip ürün gruplarını izler."
    ],
    duties_zh: [
      "为零售机构选择并采购商品类别，以便向消费者销售。",
      "分析市场趋势、谈判价格、交货条件并协调广告宣传。",
      "监控销售目标、库存水平和竞争对手的产品线。"
    ]
  },
  "142111": {
    title_tr: "Mağaza / Perakende Yöneticisi (Genel)",
    title_zh: "零售经理（普通）",
    duties: [
      "Directs, plans and coordinates daily operations of a retail store or outlet.",
      "Manages retail staff, coordinates schedules, visual merchandising and budgets.",
      "Oversees stock inventory, security standards, customer service and monitors sales."
    ],
    duties_tr: [
      "Bir perakende mağazasının veya satış noktasının günlük operasyonlarını yönlendirir, planlar ve koordine eder.",
      "Perakende personelini yönetir, programları, görsel düzenlemeyi (merchandising) ve bütçeleri koordine eder.",
      "Stok envanterini, güvenlik standartlarını, müşteri hizmetlerini denetler ve satışları izler."
    ],
    duties_zh: [
      "指导、规划和协调零售商店或网点的日常运营。",
      "管理零售员工、协调排班、视觉陈列和预算。",
      "监督库存、安全标准、客户服务并监控销售额。"
    ]
  },
  "251513": {
    title_tr: "Eczane Eczacısı",
    title_zh: "零售药剂师",
    duties: [
      "Dispenses medications and provides health advice to customers in a community pharmacy.",
      "Reviews prescriptions for accuracy, dosage, contraindications and logs records.",
      "Manages pharmacy staff, inventory control, safety and drug regulations compliance."
    ],
    duties_tr: [
      "Bir serbest eczanede ilaçları hazırlar/dağıtır ve müşterilere sağlık tavsiyeleri sunar.",
      "Reçeteleri doğruluk, dozaj, kontrendikasyonlar açısından inceler ve kayıtları tutar.",
      "Eczane personelini, envanter kontrolünü, güvenliği ve ilaç yönetmeliklerine uyumu yönetir."
    ],
    duties_zh: [
      "在社区药房配药并向客户提供健康建议。",
      "审查处方的准确性、剂量、禁忌症并记录档案。",
      "管理药房员工、库存控制、安全以及对药品法规的合规性。"
    ]
  },
  "141912": {
    title_tr: "Huzurevi / Emeklilik Köyü Yöneticisi",
    title_zh: "退休村经理",
    duties: [
      "Directs, plans and coordinates daily operations of a retirement village or facility.",
      "Manages facility staff, coordinates resident services, bookings and budgets.",
      "Ensures compliance with health regulations, safety protocols and care policies."
    ],
    duties_tr: [
      "Bir emeklilik köyünün veya tesisinin günlük operasyonlarını yönlendirir, planlar ve koordine eder.",
      "Tesis personelini yönetir, sakinlerin hizmetlerini, rezervasyonlarını ve bütçelerini koordine eder.",
      "Sağlık yönetmeliklerine, güvenlik protokollerine ve bakım politikalarına uyumu sağlar."
    ],
    duties_zh: [
      "指导、规划和协调退休村或养老设施的日常运营。",
      "管理设施员工、协调居民服务、预订和预算。",
      "确保符合卫生法规、安全规程和照护政策要求。"
    ]
  }
};

const FILE_PATH = path.join(process.cwd(), "src/data/anzsco-list.json");
const list = JSON.parse(readFileSync(FILE_PATH, "utf8")) as SearchEntry[];

let updatedCount = 0;
for (const entry of list) {
  const batchData = BATCH_5_DATA[entry.code];
  if (batchData) {
    Object.assign(entry, batchData);
    updatedCount += 1;
  }
}

writeFileSync(FILE_PATH, JSON.stringify(list, null, 2));
console.log(`Successfully updated ${updatedCount} entries in anzsco-list.json.`);
