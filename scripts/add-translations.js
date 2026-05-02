const fs = require('fs');

function addKeys(file, additions) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(data, additions);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

addKeys('public/locales/en.json', {
  'hero.noCreditCard': '🔒 No credit card required for Beta',
  'hero.instantPdf': '⚡️ Instant PDF Delivery',
  'socialProof.dha': 'Based on 2026 DHA Data',
  'socialProof.mara': 'MARA Compliance Checked',
  'socialProof.users': '500+ Beta Users',
  'fullCheck.whatYouGet.title': "What you'll get",
  'fullCheck.whatYouGet.points': 'Points Calculation',
  'fullCheck.whatYouGet.roadmap': 'Actionable Roadmap',
  'fullCheck.whatYouGet.risk': 'Hidden Risk Analysis'
});

addKeys('public/locales/tr.json', {
  'hero.noCreditCard': '🔒 Beta sürümü için kredi kartı gerekmez',
  'hero.instantPdf': '⚡️ Anında PDF Teslimi',
  'socialProof.dha': '2026 DHA Verilerine Dayanır',
  'socialProof.mara': 'MARA Uyum Kontrolünden Geçmiştir',
  'socialProof.users': '500+ Beta Kullanıcısı',
  'fullCheck.whatYouGet.title': 'Ne alacaksınız?',
  'fullCheck.whatYouGet.points': 'Puan Hesaplaması',
  'fullCheck.whatYouGet.roadmap': 'Eylem Planı ve Yol Haritası',
  'fullCheck.whatYouGet.risk': 'Gizli Risk Analizi'
});

addKeys('public/locales/zh-Hans.json', {
  'hero.noCreditCard': '🔒 Beta 测试无需信用卡',
  'hero.instantPdf': '⚡️ 即时生成 PDF',
  'socialProof.dha': '基于 2026 年 DHA 数据',
  'socialProof.mara': '已通过 MARA 合规审查',
  'socialProof.users': '500+ Beta 用户',
  'fullCheck.whatYouGet.title': '你将获得',
  'fullCheck.whatYouGet.points': '积分计算',
  'fullCheck.whatYouGet.roadmap': '可执行的路线图',
  'fullCheck.whatYouGet.risk': '潜在风险分析'
});
