import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface AgentAssignedEmailProps {
  agentName?: string | null;
  leadUrl: string;
}

// Deliberately minimal: NO client details (no name, email, phone), only a link into the
// assigned lead's detail page. Rendered server-side by
// lib/email/agent-notifications.ts and passed to Resend's `react` field.
export function AgentAssignedEmail({ agentName, leadUrl }: AgentAssignedEmailProps) {
  const greetingName = agentName?.trim() || "there";

  return (
    <Html>
      <Head />
      <Preview>A lead has been assigned to you</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>📋 New Lead Assigned</Heading>
          <Text style={text}>Hi {greetingName},</Text>
          <Text style={text}>A lead has been assigned to you in the LogiVisa CRM. Client details are not shown to agents until the client has agreed to share them.</Text>

          <Button style={button} href={leadUrl}>
            View Lead
          </Button>

          <Text style={footer}>LogiVisa Agent Portal</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AgentAssignedEmail;

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
  margin: "0 0 12px",
};

const detailsBox = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "20px 0",
};

const detailLabel = {
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase" as const,
  color: "#71717a",
  margin: "0 0 2px",
};

const detailValue = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#18181b",
  margin: "0 0 14px",
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

const footer = {
  fontSize: "12px",
  color: "#a1a1aa",
  marginTop: "24px",
};
