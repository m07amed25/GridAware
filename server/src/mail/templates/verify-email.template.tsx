import { Button, Link, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './email-layout.js';

export interface VerifyEmailTemplateProps {
  displayName: string;
  verificationUrl: string;
  expiresInHours: number;
}

export function VerifyEmailTemplate({
  displayName,
  verificationUrl,
  expiresInHours,
}: VerifyEmailTemplateProps) {
  const expiryLabel =
    expiresInHours === 1 ? '1 hour' : `${expiresInHours} hours`;

  return (
    <EmailLayout
      preview={`Verify your GridAware email address (valid for ${expiryLabel})`}
      heading="Verify your email address"
    >
      <Text style={emailStyles.paragraph}>Hello {displayName},</Text>
      <Text style={emailStyles.paragraph}>
        Confirm your email address to activate your GridAware account. This
        single-use verification link expires in {expiryLabel}.
      </Text>

      <Section style={emailStyles.buttonContainer}>
        <Button href={verificationUrl} style={emailStyles.primaryButton}>
          Verify email address
        </Button>
      </Section>

      <Text style={emailStyles.muted}>
        If the button above does not open, copy and paste this URL into your
        browser:
      </Text>
      <Link href={verificationUrl} style={emailStyles.fallbackLink}>
        {verificationUrl}
      </Link>
    </EmailLayout>
  );
}
