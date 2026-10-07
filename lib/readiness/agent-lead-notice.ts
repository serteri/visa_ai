/**
 * The label on the agent lead report (portal card and PDF): the report is generated from what the visitor typed into the
 * form and has not been reviewed or assessed by a migration agent. One source for the portal and the PDF.
 */
export const AGENT_LEAD_NOTICE: Record<"en" | "tr" | "zh-Hans", string> = {
  en: "Automated information summary based on user-entered details — not reviewed or assessed by a migration agent",
  tr: "Kullanıcının girdiği bilgilere dayanan otomatik bilgi özeti — bir göçmenlik danışmanı tarafından incelenmemiş veya değerlendirilmemiştir",
  "zh-Hans": "根据用户填写的信息自动生成的信息摘要——未经移民代理审阅或评估",
};
