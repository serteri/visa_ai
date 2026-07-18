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

const BATCH_7_DATA: Record<string, Partial<SearchEntry>> = {
  "149413": {
    title_tr: "Nakliye / Taşımacılık Şirketi Müdürü",
    title_zh: "运输公司经理",
    duties: [
      "Directs, plans and coordinates operations of a transport or logistics company.",
      "Manages transit staff, coordinates vehicle routing, fleet budgets and targets.",
      "Ensures compliance with transport safety laws, licensing codes and freight rules."
    ],
    duties_tr: [
      "Bir nakliye veya lojistik şirketinin operasyonlarını yönlendirir, planlar ve koordine eder.",
      "Transit personelini yönetir, araç güzergahlarını, filo bütçelerini ve hedeflerini koordine eder.",
      "Taşıma güvenliği yasalarına, lisans kodlarına ve navlun kurallarına uyumu sağlar."
    ],
    duties_zh: [
      "指导、规划和协调运输或物流公司的运营。",
      "管理运输员工，协调车辆路线规划、车队预算和业务目标。",
      "确保遵守交通安全法律、许可规范和货运条例。"
    ]
  },
  "142116": {
    title_tr: "Seyahat Acentesi Müdürü",
    title_zh: "旅行社经理",
    duties: [
      "Directs and plans operations of a travel agency branch or office.",
      "Manages travel consultants, coordinates ticket bookings, tour packages and sales.",
      "Oversees client relations, agency budgets, promotions and licensing compliance."
    ],
    duties_tr: [
      "Bir seyahat acentesi şubesinin veya ofisinin operasyonlarını yönlendirir ve planlar.",
      "Seyahat danışmanlarını yönetir, bilet rezervasyonlarını, tur paketlerini ve satışları koordine eder.",
      "Müşteri ilişkilerini, acente bütçelerini, promosyonları ve lisans uyumluluğunu denetler."
    ],
    duties_zh: [
      "指导并规划旅行社分支机构或办公室的运营。",
      "管理旅游顾问，协调机票预订、旅游套餐和销售工作。",
      "监督客户关系、旅行社预算、推广活动并确保符合资质准入规定。"
    ]
  },
  "451799": {
    title_tr: "Diğer Seyahat ve Kabin Görevlileri (bhk)",
    title_zh: "旅行乘务员（其他）",
    duties: [
      "Provides safety, comfort and customer service to passengers in transit not elsewhere classified.",
      "Conducts boarding audits, briefs safety protocols and distributes travel amenities.",
      "Responds to emergency passenger queries, medical events and logs logs."
    ],
    duties_tr: [
      "Transit halindeki yolculara başka yerde sınıflandırılmamış güvenlik, konfor ve müşteri hizmetleri sağlar.",
      "Uçağa/gemiye biniş denetimleri yapar, güvenlik protokolleri hakkında bilgi verir ve seyahat olanaklarını dağıtır.",
      "Acil yolcu taleplerine, tıbbi durumlara müdahale eder ve uçuş/sefer kayıtlarını tutar."
    ],
    duties_zh: [
      "在旅途中向非另分类的乘客提供安全、舒适和客户服务。",
      "执行登机/船审计，简要介绍安全协议并分发旅行用品。",
      "应对乘客的紧急咨询、医疗突发事件并记录运行日志。"
    ]
  },
  "362512": {
    title_tr: "Ağaç Bakım Elemanı (Ağaç Budama/Kesim Görevlisi)",
    title_zh: "树木维护工",
    duties: [
      "Cuts, prunes, trims and maintains trees, working at height with safety rigging.",
      "Identifies tree diseases, performs hazard clearances and operates wood chippers.",
      "Maintains chainsaws, safety harness gear and reviews site safety regulations."
    ],
    duties_tr: [
      "Güvenlik halatları ile yüksekte çalışarak ağaçları keser, budar, düzeltir ve bakımını yapar.",
      "Ağaç hastalıklarını belirler, tehlikeli alan temizliklerini yapar ve ağaç yonga makinelerini çalıştırır.",
      "Motorlu testerelerin, güvenlik emniyet kemerlerinin bakımını yapar ve saha güvenlik kurallarını gözden geçirir."
    ],
    duties_zh: [
      "使用安全索具在高空作业，砍伐、修剪、整平并维护树木。",
      "识别树木病害，进行危险清除，并操作木屑粉碎机。",
      "维护链锯、安全带装备并审查现场安全规程。"
    ]
  },
  "599215": {
    title_tr: "Güven Emini / Mütevelli Heyeti Yetkilisi (Trust Officer)",
    title_zh: "信托专员",
    duties: [
      "Administers trusts, estates and agency accounts on behalf of clients or institutions.",
      "Manages trust assets, coordinates tax returns and prepares financial statements.",
      "Ensures compliance with trust deeds, state estate laws and client instructions."
    ],
    duties_tr: [
      "Müşteriler veya kurumlar adına vakıfları (trust), tereke ve acente hesaplarını yönetir.",
      "Tröst varlıklarını yönetir, vergi beyannamelerini koordine eder ve finansal tablolar hazırlar.",
      "Vakıf senetlerine, eyalet tereke yasalarına ve müşteri talimatlarına uyumu sağlar."
    ],
    duties_zh: [
      "代表客户或机构管理信托、遗产和代理账户。",
      "管理信托资产，协调纳税申报并准备财务报表。",
      "确保符合信托契约、国家遗产法和客户的指示。"
    ]
  },
  "121218": {
    title_tr: "Rulo Çim Yetiştiricisi",
    title_zh: "草皮种植户",
    duties: [
      "Plans, manages and coordinates production of sports or domestic turf in fields.",
      "Oversees soil preparation, seeding, watering, fertilizing and pest control.",
      "Coordinates turf cutting, rolling, transport and marketing to buyers."
    ],
    duties_tr: [
      "Açık alanlarda spor veya evsel kullanım amaçlı çim üretimini planlar, yönetir ve koordine eder.",
      "Toprak hazırlığını, tohumlamayı, sulamayı, gübrelemeyi ve haşere kontrolünü denetler.",
      "Çim kesimini, rulo haline getirilmesini, taşınmasını ve alıcılara pazarlanmasını koordine eder."
    ],
    duties_zh: [
      "规划、管理和协调农田的运动或家用草皮生产。",
      "监督整地、播种、浇水、施肥和病虫害防治。",
      "协调草皮的切割、成卷、运输和向买家的销售工作。"
    ]
  },
  "253518": {
    title_tr: "Üroloji Uzmanı",
    title_zh: "泌尿科医生",
    duties: [
      "Diagnoses and treats disorders of the urinary tract and male reproductive organs.",
      "Performs urological surgeries, lithotripsies, endoscopies and clinical treatments.",
      "Consults with patients, orders diagnostic scans and designs comprehensive care plans."
    ],
    duties_tr: [
      "İdrar yolu ve erkek üreme organları bozukluklarını teşhis ve tedavi eder.",
      "Ürolojik ameliyatlar, taş kırma (litotripsi), endoskopiler ve klinik tedaviler gerçekleştirir.",
      "Hastalarla görüşür, teşhis amaçlı taramalar ister ve kapsamlı bakım planları tasarlar."
    ],
    duties_zh: [
      "诊断和治疗尿路及男性生殖器官疾病。",
      "执行泌尿外科手术、体外碎石术、内窥镜检查和临床治疗。",
      "咨询患者、开具诊断性扫描并设计综合治疗方案。"
    ]
  },
  "253521": {
    title_tr: "Kalp ve Damar Cerrahisi Uzmanı (Damar Cerrahı)",
    title_zh: "血管外科医生",
    duties: [
      "Diagnoses and treats disorders of the vascular system, excluding heart and brain vessels.",
      "Performs vascular surgeries, endovascular interventions, bypasses and angioplasties.",
      "Consults with patients, reviews ultrasound scans and coordinates clinical care plans."
    ],
    duties_tr: [
      "Kalp ve beyin damarları hariç olmak üzere, damar sistemi bozukluklarını teşhis ve tedavi eder.",
      "Damar ameliyatları, endovasküler müdahaleler, bypass ve anjiyoplasti işlemleri gerçekleştirir.",
      "Hastalarla görüşür, ultrason taramalarını inceler ve klinik bakım planlarını koordine eder."
    ],
    duties_zh: [
      "诊断和治疗除心脏和脑血管外的血管系统疾病。",
      "执行血管手术、腔内血管干预、搭桥手术和血管成形术。",
      "咨询患者、审查超声扫描结果并协调临床治疗计划。"
    ]
  },
  "121221": {
    title_tr: "Sebze Yetiştiricisi",
    title_zh: "蔬菜种植户",
    duties: [
      "Plans, manages and coordinates production of vegetables in fields or greenhouses.",
      "Oversees soil preparation, planting, watering, fertilizing and pest control.",
      "Coordinates harvesting, grading, packaging and distribution of vegetables to markets."
    ],
    duties_tr: [
      "Açık alanlarda veya seralarda sebze üretimini planlar, yönetir ve koordine eder.",
      "Toprak hazırlığını, ekimi, sulamayı, gübrelemeyi ve haşere kontrolünü denetler.",
      "Sebzelerin hasadını, derecelendirilmesini, paketlenmesini ve pazarlara dağıtımını koordine eder."
    ],
    duties_zh: [
      "规划、管理和协调农田或温室的蔬菜生产。",
      "监督整地、种植、浇水、施肥和病虫害防治。",
      "协调蔬菜的收获、分级、包装和销售工作。"
    ]
  },
  "361311": {
    title_tr: "Veteriner Hemşiresi / Sağlık Teknisyeni",
    title_zh: "兽医护士",
    duties: [
      "Provides medical nursing care to animals under veterinary surgeon supervision.",
      "Prepares animals for surgery, sterilises instruments, monitors anaesthesia and administers medications.",
      "Maintains clinical logs, assists with diagnostic tests and advises pet owners."
    ],
    duties_tr: [
      "Veteriner hekim gözetiminde hayvanlara tıbbi hemşirelik bakımı sağlar.",
      "Hayvanları ameliyata hazırlar, aletleri sterilize eder, anesteziyi izler ve ilaçları uygular.",
      "Klinik kayıtları tutar, teşhis testlerine yardımcı olur ve evcil hayvan sahiplerine danışmanlık yapar."
    ],
    duties_zh: [
      "在兽医的监督下为动物提供医疗护理。",
      "准备术前动物、消毒手术器械、监测麻醉并给药。",
      "维护临床档案、协助诊断测试并向宠物主人提供建议。"
    ]
  },
  "212318": {
    title_tr: "Video Yapımcısı / Üreticisi",
    title_zh: "视频制片人",
    duties: [
      "Plans, directs and coordinates video production workflows, including staffing and budgets.",
      "Oversees scripting, scheduling, filming and post-production editing reviews.",
      "Liaises with clients, creative staff and ensures compliance with copyright laws."
    ],
    duties_tr: [
      "Personel ve bütçeler dahil olmak üzere video prodüksiyon iş akışlarını planlar, yönlendirir ve koordine eder.",
      "Senaryo yazımını, programlamayı, çekimi ve post-prodüksiyon kurgu incelemelerini denetler.",
      "Müşteriler, yaratıcı personel ile iletişim kurar ve telif hakkı yasalarına uyumu sağlar."
    ],
    duties_zh: [
      "规划、指导和协调视频制作工作流程，包括人员配备和预算。",
      "监督脚本编写、进度排班、拍摄和后期制作剪辑审查。",
      "与客户、创意人员联络并确保符合版权法规。"
    ]
  },
  "211499": {
    title_tr: "Diğer Görsel Sanatlar ve Zanaat Profesyonelleri (bhk)",
    title_zh: "视觉艺术及手工艺专业人员（其他）",
    duties: [
      "Creates visual art or craft objects for specialized fields not elsewhere classified.",
      "Develops design concepts, selects media, prepares surfaces and fabricates items.",
      "Exhibits artworks in galleries, coordinates sales and participates in promotion."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış uzmanlık alanları için görsel sanat veya zanaat eserleri oluşturur.",
      "Tasarım konseptleri geliştirir, ortamları seçer, yüzeyleri hazırlar ve ürünleri imal eder.",
      "Sanat eserlerini galerilerde sergiler, satışları koordine eder ve tanıtımlara katılır."
    ],
    duties_zh: [
      "为未另分类的专业领域创作视觉艺术或手工艺品。",
      "开发设计概念、选择创作介质、处理基底表面并制作物品。",
      "在画廊展出艺术品、协调销售并参与推广活动。"
    ]
  },
  "333411": {
    title_tr: "Duvar ve Yer Döşemecisi / Seramik Ustası",
    title_zh: "墙面和地面贴砖工",
    duties: [
      "Lays ceramic, clay, slate, marble and glass tiles on walls and floors.",
      "Prepares surfaces, cuts tiles, applies adhesives, aligns tiles and seals joints with grout.",
      "Monitors levels, straightens lines, performs tile repairs and checks waterproofing."
    ],
    duties_tr: [
      "Duvarlara ve zeminlere seramik, kil, arduvaz, mermer ve cam karolar döşer.",
      "Yüzeyleri hazırlar, karoları keser, yapıştırıcılar uygular, karoları hizalar ve derzleri derz dolgusu ile kapatır.",
      "Yüzey kodlarını ve terazi seviyelerini izler, çizgileri düzeltir, karo onarımlarını yapar ve su yalıtımını kontrol eder."
    ],
    duties_zh: [
      "在墙面和地面上铺设陶瓷、粘土、石板、大理石和玻璃砖瓦。",
      "准备基层表面、裁剪砖瓦、涂抹粘合剂、对齐砖瓦并用勾缝剂密封缝隙。",
      "监控水平度、调直缝隙、进行瓷砖修复并检查防水性。"
    ]
  },
  "323316": {
    title_tr: "Saat Yapımcısı ve Tamircisi",
    title_zh: "钟表制造工及修理工",
    duties: [
      "Fabricates, alters, repairs and services mechanical or electronic watches and clocks.",
      "Diagnoses mechanical faults, replaces worn gears, hairsprings and runs calibrations.",
      "Conducts testing, aligns dial gears, and verifies acoustic or timing parameters."
    ],
    duties_tr: [
      "Mekanik veya elektronik saatleri imal eder, değiştirir, onarır ve servis hizmeti sunar.",
      "Mekanik arızaları teşhis eder, aşınmış dişlileri, zemberekleri değiştirir ve kalibrasyonları çalıştırır.",
      "Testler gerçekleştirir, kadran dişlilerini hizalar ve akustik veya zamanlama parametrelerini doğrular."
    ],
    duties_zh: [
      "制造、改装、修理和维护机械或电子钟表。",
      "诊断机械故障、更换磨损的齿轮、游丝并运行校准。",
      "进行测试、校准表盘齿轮，并验证声学或走时参数。"
    ]
  },
  "313113": {
    title_tr: "Web Yöneticisi (Web Administrator)",
    title_zh: "网络管理员",
    duties: [
      "Installs, configures, monitors and maintains web servers, websites and database interfaces.",
      "Manages server backups, reviews access permissions and updates security certificates.",
      "Troubleshoots network connectivity faults, server crashes and monitors response times."
    ],
    duties_tr: [
      "Web sunucularını, web sitelerini ve veri tabanı arayüzlerini kurar, yapılandırır, izler ve bakımını yapar.",
      "Sunucu yedeklemelerini yönetir, erişim izinlerini gözden geçirir ve güvenlik sertifikalarını günceller.",
      "Ağ bağlantı arızalarını, sunucu çökmelerini giderir ve yanıt sürelerini izler."
    ],
    duties_zh: [
      "安装、配置、监控并维护Web服务器、网站及数据库接口。",
      "管理服务器备份、审查访问权限并更新安全证书。",
      "排除网络连接故障、服务器崩溃问题并监控响应时间。"
    ]
  },
  "134214": {
    title_tr: "Sosyal Yardım / Refah Merkezi Müdürü",
    title_zh: "福利中心经理",
    duties: [
      "Plans, directs and coordinates operations of a welfare centre, shelter or support hub.",
      "Manages welfare budgets, staffing, client intake systems and coordinates policy outcomes.",
      "Liaises with health departments, community practitioners and social workers."
    ],
    duties_tr: [
      "Bir sosyal yardım merkezinin, sığınma evinin veya destek merkezinin operasyonlarını planlar, yönlendirir ve koordine eder.",
      "Sosyal yardım bütçelerini, personel planlamasını, danışan kabul sistemlerini yönetir ve politika sonuçlarını koordine eder.",
      "Sağlık daireleri, topluluk uygulayıcıları ve sosyal hizmet uzmanlarıyla iletişim kurar."
    ],
    duties_zh: [
      "规划、指导和协调福利中心、收容所或支持机构的运营。",
      "管理福利预算、人员配置、客户接收系统并协调政策实施成果。",
      "与卫生部门、社区从业人员和社工联络。"
    ]
  },
  "133312": {
    title_tr: "Toptancı / Toptan Ticaret Yöneticisi",
    title_zh: "批发商",
    duties: [
      "Plans, directs and coordinates wholesale operations, buying bulk goods for resale to retail.",
      "Negotiates commercial contracts, prices, supplier terms and manages credit systems.",
      "Oversees stock inventory, warehouse logistics, distribution and monitors wholesale sales."
    ],
    duties_tr: [
      "Toptan ticaret operasyonlarını planlar, yönlendirir ve koordine eder; perakendeye satmak üzere toplu mallar satın alır.",
      "Ticari sözleşmeleri, fiyatları, tedarikçi koşullarını müzakere eder ve kredi sistemlerini yönetir.",
      "Stok envanterini, depo lojistiğini, dağıtımı denetler ve toptan satışları izler."
    ],
    duties_zh: [
      "规划、指导和协调批发业务，采购散装货物转售给零售商。",
      "谈判商业合同、价格、供应商条款并管理信用体系。",
      "监督库存、仓库物流、分销网络并监控批发销售额。"
    ]
  },
  "394299": {
    title_tr: "Ağaç İşleme Makineleri Operatörleri ve Diğer Ahşap Zanaatkarları (bhk)",
    title_zh: "木工机械工及其他木材工（其他）",
    duties: [
      "Operates wood milling, cutting and shaping machinery for specialized wood fields not elsewhere classified.",
      "Reads drawings, selects cutters, setups milling jigs and executes calibrations.",
      "Inspects finished parts, performs repairs and monitors safety compliance."
    ],
    duties_tr: [
      "Başka yerde sınıflandırılmamış özel ahşap alanları için ağaç frezeleme, kesme ve şekillendirme makinelerini çalıştırır.",
      "Çizimleri okur, kesicileri seçer, freze aparatlarını kurar ve kalibrasyonları yürütür.",
      "Bitmiş parçaları inceler, onarımları gerçekleştirir ve güvenlik kurallarına uyumu izler."
    ],
    duties_zh: [
      "为未另分类的专业木工领域操作木材铣削、切割和成型机械设备。",
      "阅读图纸、选择刀具、安装铣削夹具并执行校准。",
      "检查成品工件、进行修理并监控安全合规。"
    ]
  },
  "394214": {
    title_tr: "Ağaç Torna Ustası",
    title_zh: "旋木工",
    duties: [
      "Sets up and operates wood lathes to turn, shape and polish wooden components.",
      "Reads sketches, selects chisels, mounts wood blocks and shapes contours.",
      "Monitors lathe speeds, checks dimensions compliance and finishes wooden surfaces."
    ],
    duties_tr: [
      "Ahşap bileşenleri tornalamak, şekillendirmek ve parlatmak için ağaç tornalarını kurar ve çalıştırır.",
      "Taslakları okur, keskileri seçer, ahşap blokları monte eder ve konturları şekillendirir.",
      "Torna hızlarını izler, boyutlara uygunluğu kontrol eder ve ahşap yüzeyleri pürüzsüzleştirir."
    ],
    duties_zh: [
      "设置并操作木工车床以车削、塑造和抛光木制部件。",
      "阅读草图、选择车刀、固定木料并加工出轮廓线。",
      "监控车床转速、检查尺寸符合性并精整木材表面。"
    ]
  },
  "639212": {
    title_tr: "Yün Alıcısı / Eksperi",
    title_zh: "羊毛买手",
    duties: [
      "Selects and purchases wool lots at auctions or farms on behalf of mills.",
      "Assesses wool fleece quality, measures fiber length, yields and estimates limits.",
      "Negotiates prices, shipping terms and coordinates distribution to processing mills."
    ],
    duties_tr: [
      "İmalathaneler adına açık artırmalarda veya çiftliklerde yün partilerini seçer ve satın alır.",
      "Yün post kalitesini değerlendirir, lif uzunluğunu, verimi ölçer ve limitleri tahmin eder.",
      "Fiyatları, nakliye koşullarını müzakere eder ve işleme tesislerine dağıtımı koordine eder."
    ],
    duties_zh: [
      "代表纺织厂在拍卖会或农场选择并采购羊毛批次。",
      "评估羊毛皮品质、测量纤维长度、产出率并估算限值。",
      "谈判价格、装运条款并协调分配给加工厂的运输工作。"
    ]
  },
  "399917": {
    title_tr: "Yün Derecelendirme / Sınıflandırma Uzmanı",
    title_zh: "羊毛分级师",
    duties: [
      "Classifies and grades wool fleeces based on fiber diameter, yield and quality standards.",
      "Monitors shearing sheds, audits wool packaging and logs clip classifications.",
      "Liaises with wool brokers, shearers and ensures compliance with wool codes."
    ],
    duties_tr: [
      "Lif çapı, verim ve kalite standartlarına göre yün postlarını sınıflandırır ve derecelendirir.",
      "Kırkım depolarını izler, yün paketlemesini denetler ve kırkım sınıflandırma kayıtlarını tutar.",
      "Yün brokerleri, kırkımcılarla iletişim kurar ve yün standartlarına uyumu sağlar."
    ],
    duties_zh: [
      "根据纤维直径、产出率和质量标准对羊毛皮进行分类分级。",
      "监控剪毛棚、审计羊毛包装并记录剪毛分类档案。",
      "与羊毛经纪人、剪毛工联络并确保符合羊毛规程要求。"
    ]
  },
  "223113": {
    title_tr: "Endüstriyel İlişkiler / Çalışma İlişkileri Danışmanı",
    title_zh: "工作场所关系顾问",
    duties: [
      "Provides advice on industrial relations, enterprise agreements, awards and employment laws.",
      "Drafts workplace agreements, policies and handles employer-employee dispute resolution.",
      "Represents their organisation in negotiations with trade unions and tribunals."
    ],
    duties_tr: [
      "Endüstriyel ilişkiler, toplu sözleşmeler, sendikal haklar ve iş kanunları hakkında danışmanlık yapar.",
      "İş yeri sözleşmeleri, politikaları tasarlar ve işveren-işçi uyuşmazlığının çözümünü yürütür.",
      "Sendikalar ve hakem heyetleri ile yapılan müzakerelerde kuruluşunu temsil eder."
    ],
    duties_zh: [
      "就劳资关系、企业协议、行业裁决和雇佣法提供建议。",
      "起草工作场所协议、政策并处理雇主与雇员的纠纷解决事宜。",
      "在与工会和法庭的谈判中代表其机构。"
    ]
  },
  "361114": {
    title_tr: "Hayvanat Bahçesi Bakıcısı",
    title_zh: "动物园饲养员",
    duties: [
      "Feeds, grooms, cleans, exercises and cares for animals in zoos or wildlife parks.",
      "Monitors animal behavior, appetite, physical condition and logs health reports.",
      "Cleans and disinfects enclosures, runs, exhibit cages and assists with public talks."
    ],
    duties_tr: [
      "Hayvanat bahçelerindeki veya yaban hayatı parklarındaki hayvanları besler, temizler, gezdirir ve bakımını yapar.",
      "Hayvan davranışlarını, iştahını, fiziksel durumunu izler ve sağlık raporlarını kaydeder.",
      "Barınakları, koşu alanlarını, sergi kafeslerini temizler ve dezenfekte eder; halka açık bilgilendirmelere yardımcı olur."
    ],
    duties_zh: [
      "在动物园或野生动物公园中喂影、清洁、训练和照料动物。",
      "监测动物的行为、食欲、健康状况并记录健康报告。",
      "清洁并消毒兽舍、活动场、展缸，并协助进行公众科普讲解。"
    ]
  }
};

const FILE_PATH = path.join(process.cwd(), "src/data/anzsco-list.json");
const list = JSON.parse(readFileSync(FILE_PATH, "utf8")) as SearchEntry[];

let updatedCount = 0;
for (const entry of list) {
  const batchData = BATCH_7_DATA[entry.code];
  if (batchData) {
    Object.assign(entry, batchData);
    updatedCount += 1;
  }
}

writeFileSync(FILE_PATH, JSON.stringify(list, null, 2));
console.log(`Successfully updated ${updatedCount} entries in anzsco-list.json.`);
