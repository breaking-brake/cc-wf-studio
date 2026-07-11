---
name: code-review
description: WHEN conducting a code review in this repository, THEN evaluate the change for architectural fit, maintainability, test adequacy, and robustness beyond automated checks.
---

This skill guides an agent through a comprehensive code review focusing on qualitative and cross-cutting concerns that complement automated checks.

## Workflow
1.  **Understand the Change and Intent**: Go beyond reading the diff to grasp the core *problem* being solved, the *design choices* made, and the *intended behavior* of the change.
2.  **Evaluate Architectural Fit**: Assess if the solution aligns with established architectural patterns and system design principles. Identify potential for introducing technical debt or anti-patterns, and consider broader system impacts (e.g., scalability, integration with other components).
3.  **Assess Maintainability and Readability**: Review code clarity, naming conventions, and logical structure for human understanding. Verify adherence to less formal, team-specific coding style preferences (beyond automated linting rules), and check for unnecessary complexity or over-engineering.
4.  **Review Test Adequacy**: Determine if new or changed logic is sufficiently covered by tests (unit, integration, end-to-end as applicable). Evaluate test quality: Are tests clear, concise, robust, and do they cover relevant edge cases and error paths? Confirm that tests reflect the intended behavior and do not merely pass due to trivial assertions.
5.  **Examine Cross-cutting Concerns**: Identify deeper issues related to:
    *   **Performance**: Potential bottlenecks in critical paths (e.g., inefficient algorithms, excessive resource consumption, large data transfers).
    *   **Security**: Logical vulnerabilities (e.g., access control issues, privilege escalation, insecure deserialization) that static analysis might miss, beyond basic input validation.
    *   **Error Handling and Resilience**: The completeness and gracefulness of error handling; confirming that failures are handled robustly and provide useful diagnostics.
6.  **Formulate Actionable Feedback**: Provide specific, constructive suggestions for improvements, justifying them with principles from the above steps. Avoid simply re-stating issues that automated tools would typically catch.
