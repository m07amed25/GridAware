import { Button, Link, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './email-layout.js';

export interface PasswordResetTemplateProps {
  displayName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function PasswordResetTemplate({
  displayName,
  resetUrl,
  expiresInMinutes,
}: PasswordResetTemplateProps) {
  const expiryLabel =
    expiresInMinutes === 1 ? '1 minute' : `${expiresInMinutes} minutes`;

  return (
    <EmailLayout
      preview={`Reset your GridAware passphrase (valid for ${expiryLabel})`}
      heading="Reset your passphrase"
    >
      <Text style={emailStyles.paragraph}>Hello {displayName},</Text>
      <Text style={emailStyles.paragraph}>
        We received a request to reset the passphrase for your GridAware
        account. This single-use recovery link expires in {expiryLabel} and will
        sign out all active sessions once completed.
      </Text>

      <Section style={emailStyles.buttonContainer}>
        <Button href={resetUrl} style={emailStyles.primaryButton}>
          Choose a new passphrase
        </Button>
      </Section>

      <Text style={emailStyles.muted}>
        If the button above does not open, copy and paste this URL into your
        browser:
      </Text>
      <Link href={resetUrl} style={emailStyles.fallbackLink}>
        {resetUrl}
      </Link>
    </EmailLayout>
  );
}
