# Planning Template

## Input Context

The planner receives:
- **Jira ticket**: Title, description, acceptance criteria, priority, labels, linked issues
- **Confluence docs**: Related design documents, architecture specs, API docs, existing patterns

## Planning Output Structure

### 1. Requirements Summary
- Restate ticket requirements in clear, actionable terms
- Identify acceptance criteria
- Note any ambiguities requiring clarification

### 2. Technical Approach
- Architecture decisions and rationale
- Technology/library selections
- Integration points with existing systems
- Data model changes (if any)

### 3. Task Breakdown

#### Frontend Tasks
- UI components to create/modify
- State management changes
- API integration points
- Responsive/accessibility considerations

#### Backend Tasks
- API endpoints to create/modify
- Business logic implementation
- Database schema/migration changes
- Validation and error handling

#### Infrastructure Tasks
- IaC definitions (Terraform, CDK, etc.)
- CI/CD pipeline changes
- Environment configuration
- Monitoring and alerting setup

### 4. Dependencies
- Inter-task dependencies (what blocks what)
- External dependencies (APIs, services, teams)
- Execution order recommendations

### 5. Risks and Mitigations
- Technical risks with severity assessment
- Mitigation strategies for each risk
- Fallback plans if primary approach fails
