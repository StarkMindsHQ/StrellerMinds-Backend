# ADR-005: Secure Logging and Sanitization

* **Status**: Accepted
* **Date**: 2026-04-28
* **Deciders**: Engineering Team

## Context and Problem Statement

Logging sensitive information (passwords, tokens, PII) is a significant security risk and often a compliance violation (GDPR, SOC2).

## Decision Drivers

* Security: Prevent credential leakage in logs.
* Compliance: Meet regulatory requirements for data handling.

## Decision Outcome

Chosen option: "Global Secure Logger Interceptor and Service".
- Implement `SecureLoggerService` that recursively sanitizes objects.
- Use a predefined list of sensitive fields (regex-based).
- Integrate globally via `SecureLoggingInterceptor`.

### Consequences

* **Good**: Centralized security policy for logs, reduced risk of data exposure.
* **Bad**: Minor CPU overhead for deep object sanitization.
