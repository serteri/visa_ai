import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

export const RESTORE_EMAIL_COPY = {
  en: {
    subject: "Restore your LogiVisa AI Assistant credits",
    heading: "Restore your credits",
    body: "Open the link below on the device where you want to use your credits. It expires in 30 minutes and works once.",
    button: "Restore my credits",
    fallback: "Or copy and paste this URL into your browser:",
    footer: "If you did not request this, ignore this email. Nothing changes unless the link is opened.",
  },
  tr: {
    subject: "LogiVisa AI Asistan kredilerinizi geri yükleyin",
    heading: "Kredilerinizi geri yükleyin",
    body: "Kredilerinizi kullanmak istediğiniz cihazda aşağıdaki bağlantıyı açın. Bağlantı 30 dakika geçerlidir ve yalnızca bir kez çalışır.",
    button: "Kredilerimi geri yükle",
    fallback: "Veya bu adresi tarayıcınıza yapıştırın:",
    footer: "Bunu siz istemediyseniz bu e-postayı yok sayın. Bağlantı açılmadıkça hiçbir şey değişmez.",
  },
  "zh-Hans": {
    subject: "恢复您的 LogiVisa AI 助手额度",
    heading: "恢复您的额度",
    body: "请在您想使用额度的设备上打开下面的链接。链接 30 分钟内有效，且只能使用一次。",
    button: "恢复我的额度",
    fallback: "或将此网址复制到浏览器中：",
    footer: "如果这不是您本人的操作，请忽略此邮件。链接未被打开时不会有任何变化。",
  },
} as const;

export type RestoreEmailLocale = keyof typeof RESTORE_EMAIL_COPY;

export function RestoreCreditsEmail({ url, locale }: { url: string; locale: RestoreEmailLocale }) {
  const c = RESTORE_EMAIL_COPY[locale];
  return (
    <Html>
      <Head />
      <Preview>{c.subject}</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", margin: "40px auto", padding: "32px", maxWidth: "520px", borderRadius: "8px" }}>
          <Heading style={{ fontSize: "22px", color: "#111827" }}>{c.heading}</Heading>
          <Text style={{ fontSize: "15px", lineHeight: "22px", color: "#374151" }}>{c.body}</Text>
          <Button href={url} style={{ backgroundColor: "#53917E", color: "#ffffff", padding: "12px 20px", borderRadius: "6px", fontSize: "15px" }}>
            {c.button}
          </Button>
          <Text style={{ fontSize: "12px", color: "#6b7280", wordBreak: "break-all" }}>
            {c.fallback}
            <br />
            {url}
          </Text>
          <Text style={{ fontSize: "12px", color: "#6b7280" }}>{c.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
