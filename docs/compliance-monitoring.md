# Compliance Monitoring Runbook

## Objective

Provide ongoing visibility into GDPR-related handling, security control status, data access activity, and audit evidence required for compliance reviews.

## Core Controls

- Log all personal-data access events with actor, resource, action, lawful basis, and outcome.
- Maintain an automated audit trail for access and security-check activity.
- Review GDPR status and unresolved violations daily.
- Generate a formal compliance report at least once per day and before audits.

## GDPR Monitoring

- Track personal-data access volume and denied access attempts.
- Require a lawful basis for each personal-data operation.
- Escalate any repeated denied access events or missing lawful-basis metadata.

## Security Compliance Checks

- Verify JWT secret configuration.
- Verify secure database configuration is present.
- Confirm data access logs and audit trails are receiving events.
- Review warning and failure counts during weekly compliance review.

## Reporting And Evidence

- Store the generated report ID in audit preparation notes.
- Export the latest audit trail during regulator, customer, or internal review requests.
- Re-run the report generation endpoint after major security or policy changes.
