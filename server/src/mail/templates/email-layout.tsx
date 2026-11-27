import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

export interface EmailLayoutProps {
  preview: string;
  heading: string;
  children: ReactNode;
}

export function EmailLayout({ preview, heading, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brandWordmark}>
              GRID<span style={styles.brandAccent}>AWARE</span>
            </Text>
          </Section>

          <Section style={styles.card}>
            <Heading as="h1" style={styles.heading}>
              {heading}
            </Heading>
            {children}
          </Section>

          <Hr style={styles.divider} />

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              GridAware Identity &amp; Access — Decision-support infrastructure
              monitoring.
            </Text>
            <Text style={styles.footerText}>
              If you did not request this email, you can safely ignore it.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const emailStyles = {
  paragraph: {
    color: '#E9ECF2',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0 0 16px 0',
  },
  muted: {
    color: '#9298A3',
    fontSize: '13px',
    lineHeight: '20px',
    margin: '0 0 12px 0',
  },
  buttonContainer: {
    margin: '24px 0',
  },
  primaryButton: {
    backgroundColor: '#F4E952',
    borderRadius: '10px',
    color: '#080808',
    display: 'inline-block',
    fontSize: '14px',
    fontWeight: 700,
    padding: '13px 24px',
    textDecoration: 'none',
  },
  fallbackLink: {
    color: '#F4E952',
    fontSize: '13px',
    lineHeight: '20px',
    wordBreak: 'break-all' as const,
  },
};

const styles = {
  body: {
    backgroundColor: '#080808',
    color: '#E9ECF2',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    margin: '0',
    padding: '32px 16px',
  },
  container: {
    margin: '0 auto',
    maxWidth: '520px',
    width: '100%',
  },
  header: {
    marginBottom: '20px',
    padding: '0 4px',
  },
  brandWordmark: {
    color: '#FFFFFF',
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    margin: '0',
  },
  brandAccent: {
    color: '#F4E952',
  },
  card: {
    backgroundColor: '#101010',
    border: '1px solid #2A2A2A',
    borderRadius: '14px',
    padding: '32px 28px',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: '22px',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: '30px',
    margin: '0 0 16px 0',
  },
  divider: {
    borderColor: '#2A2A2A',
    margin: '24px 0 16px 0',
  },
  footer: {
    padding: '0 4px',
  },
  footerText: {
    color: '#9298A3',
    fontSize: '12px',
    lineHeight: '18px',
    margin: '0 0 6px 0',
  },
};
