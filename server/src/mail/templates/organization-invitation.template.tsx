import { Button, Link, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './email-layout.js';

export interface OrganizationInvitationTemplateProps {
  organizationName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  expiresInDays: number;
}

const ROLE_DISPLAY: Readonly<
  Record<string, { label: string; summary: string }>
> = {
  OWNER: {
    label: 'Owner',
    summary:
      'Full organization administration, member and role management, audit logs, and operational control.',
  },
  FACILITY_MANAGER: {
    label: 'Facility Manager',
    summary:
      'Manage sites, buildings, assets, sensors, thresholds, incidents, work orders, schedules, and exports.',
  },
  ENGINEER: {
    label: 'Engineer',
    summary:
      'Investigate telemetry and anomalies, configure assets and thresholds, manage incidents, and handle work orders.',
  },
  TECHNICIAN: {
    label: 'Technician',
    summary:
      'Execute assigned work orders, record maintenance findings, and inspect linked equipment and incidents.',
  },
  VIEWER: {
    label: 'Viewer',
    summary:
      'Read-only visibility across permitted organization dashboards, telemetry, incidents, and analytics.',
  },
};

function formatRole(role: string): { label: string; summary: string } {
  const known = ROLE_DISPLAY[role.toUpperCase()];
  if (known) {
    return known;
  }
  const label = role
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return {
    label: label || role,
    summary: 'Role-scoped access enforced server-side for this organization.',
  };
}

export function OrganizationInvitationTemplate({
  organizationName,
  inviterName,
  role,
  acceptUrl,
  expiresInDays,
}: OrganizationInvitationTemplateProps) {
  const roleInfo = formatRole(role);
  const expiryLabel =
    expiresInDays === 1 ? '1 day' : `${expiresInDays} days`;

  return (
    <EmailLayout
      preview={`${inviterName} invited you to join ${organizationName} as ${roleInfo.label} on GridAware`}
      heading={`You're invited to join ${organizationName}`}
    >
      <Text style={emailStyles.paragraph}>
        <strong style={localStyles.strong}>{inviterName}</strong> has invited
        you to join{' '}
        <strong style={localStyles.strong}>{organizationName}</strong> on
        GridAware as a{' '}
        <strong style={localStyles.accentText}>{roleInfo.label}</strong>.
      </Text>

      <Section style={localStyles.detailsBox}>
        <Text style={localStyles.detailLabel}>ORGANIZATION</Text>
        <Text style={localStyles.detailValue}>{organizationName}</Text>

        <Text style={localStyles.detailLabel}>ASSIGNED ROLE</Text>
        <Text style={localStyles.roleBadgeWrap}>
          <span style={localStyles.roleBadge}>{roleInfo.label}</span>
        </Text>
        <Text style={localStyles.roleSummary}>{roleInfo.summary}</Text>

        <Text style={localStyles.detailLabel}>INVITED BY</Text>
        <Text style={localStyles.detailValue}>{inviterName}</Text>

        <Text style={localStyles.detailLabel}>EXPIRATION</Text>
        <Text style={localStyles.detailValueLast}>
          Single-use link · Expires in {expiryLabel}
        </Text>
      </Section>

      <Section style={emailStyles.buttonContainer}>
        <Button href={acceptUrl} style={emailStyles.primaryButton}>
          Accept invitation
        </Button>
      </Section>

      <Text style={emailStyles.muted}>
        Sign in with or create a GridAware account using the email address that
        received this invitation to activate your workspace access.
      </Text>

      <Text style={emailStyles.muted}>
        If the button above does not open, copy and paste this URL into your
        browser:
      </Text>
      <Link href={acceptUrl} style={emailStyles.fallbackLink}>
        {acceptUrl}
      </Link>
    </EmailLayout>
  );
}

const localStyles = {
  strong: {
    color: '#FFFFFF',
    fontWeight: 600,
  },
  accentText: {
    color: '#F4E952',
    fontWeight: 600,
  },
  detailsBox: {
    backgroundColor: '#161616',
    border: '1px solid #2A2A2A',
    borderRadius: '10px',
    margin: '20px 0 4px 0',
    padding: '18px 20px',
  },
  detailLabel: {
    color: '#9298A3',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    lineHeight: '16px',
    margin: '0 0 4px 0',
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '20px',
    margin: '0 0 14px 0',
  },
  detailValueLast: {
    color: '#E9ECF2',
    fontSize: '13px',
    lineHeight: '20px',
    margin: '0',
  },
  roleBadgeWrap: {
    margin: '2px 0 6px 0',
  },
  roleBadge: {
    backgroundColor: '#242214',
    border: '1px solid #59521B',
    borderRadius: '6px',
    color: '#F4E952',
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    padding: '3px 10px',
  },
  roleSummary: {
    color: '#B5BAC4',
    fontSize: '13px',
    lineHeight: '19px',
    margin: '0 0 14px 0',
  },
};
