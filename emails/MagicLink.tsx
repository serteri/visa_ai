import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";

export interface MagicLinkEmailProps {
  url: string;
}

// Deliberately minimal, same style as AgentAssigned.tsx -- a single link,
// nothing else. Rendered server-side by lib/email/magic-link.ts and passed
// to Resend's `react` field.
export function MagicLinkEmail({ url }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your secure sign-in link for LogiVisa</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>🔐 Sign in to LogiVisa</Heading>
          <Text style={text}>
            Click the button below to securely sign in to your Visa Vault. This link expires in 10 minutes and
            can only be used once.
          </Text>

          <Button style={button} href={url}>
            Sign in securely
          </Button>

          <Text style={fallback}>
            Or copy and paste this URL into your browser:
            <br />
            {url}
          </Text>

          <Text style={footer}>
            If you did not request this email, you can safely ignore it -- no account changes were made.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default MagicLinkEmail;

const main = {
  backgroundColor: "#f8fafc",
  fontFamily: "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "480px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
};

const heading = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#18181b",
  margin: "0 0 16px",
};

const text = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#3f3f46",
  margin: "0 0 20px",
};

const button = {
  backgroundColor: "#4f46e5",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "8px",
  fontWeight: 700,
  fontSize: "14px",
  textDecoration: "none",
  display: "inline-block",
};

const fallback = {
  fontSize: "12px",
  lineHeight: "1.6",
  color: "#71717a",
  margin: "20px 0 0",
  wordBreak: "break-all" as const,
};

const footer = {
  fontSize: "12px",
  color: "#a1a1aa",
  marginTop: "24px",
};
