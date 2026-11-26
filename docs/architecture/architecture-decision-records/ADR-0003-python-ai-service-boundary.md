# ADR-0003: Keep AI/ML Workloads in a Separate Python Service

- **Status:** Proposed for approval
- **Date:** 2026-11-26
- **Decision owners:** GridAware engineering / AI engineering
- **Related:** PRD v1.0; ARC-C4-002; Phase 8 AI/ML Engineering

## Context

GridAware's application backend is NestJS + TypeScript. Machine learning development and model execution require a Python ecosystem including libraries such as PyTorch, scikit-learn, XGBoost, pandas, NumPy, and model-evaluation/experiment tools.

The product must not allow AI runtime dependencies or failures to disrupt authentication, asset management, telemetry persistence, or deterministic threshold-based monitoring. The PRD also specifies that advanced AI is introduced after the basic data pipeline and rules are reliable.

## Decision

Keep model training, preprocessing pipelines, evaluation, and inference implementation in a **separate Python service/runtime**. FastAPI is the proposed inference interface when an HTTP API is appropriate.

NestJS remains the product authority and owns:

- Authentication and user authorization.
- Tenant and asset scope resolution.
- Request orchestration.
- Product-level validation of AI responses.
- Persistence of predictions, risk assessments, and user-facing records.
- Incident and maintenance business rules.

The Python service owns:

- Model preprocessing required by the model.
- Model loading and inference.
- Model artifact/version identification.
- Inference-specific quality checks.
- Model output and explanation metadata.

The AI service should not independently decide which tenant a user/device belongs to, nor own incident/work-order state. It should not connect directly to the customer-facing database in the initial design unless a later ADR justifies and constrains such access.

## Invocation model

For heavier or non-interactive inference, prefer an asynchronous queue-driven request/result workflow. For bounded operations that must return quickly, internal authenticated HTTP may be considered. The exact choice is open until model latency and payload size are measured.

Every request/response contract must be versioned and include enough context to associate the result with the asset and telemetry window. Model outputs should include a model name/version and prediction timestamp. Confidence/probability fields must not be presented as calibrated failure likelihood unless validated.

## Alternatives considered

### A. Implement AI logic inside NestJS

**Advantages:** One runtime and deployment; simpler service calls.  
**Disadvantages:** Python ML libraries and training workflows do not fit naturally; model dependencies and runtime concerns would complicate the main backend.

### B. Keep model execution in a separate Python service — selected

**Advantages:** Native ML ecosystem, independent dependencies and scaling, clearer training/inference lifecycle, failure isolation.  
**Disadvantages:** Adds a network/queue boundary, serialization and versioned contracts, monitoring, and deployment work.

### C. Separate microservice for every model

**Advantages:** Individual model deployment and scaling.  
**Disadvantages:** Premature operational complexity; model families can initially share one inference service with internal model adapters.

## Consequences

### Positive

- NestJS remains focused on product workflows.
- Python remains the natural environment for model engineering.
- Model dependencies do not contaminate the main backend runtime.
- AI inference can be scaled or disabled independently.
- Training and inference release cycles can evolve separately.

### Negative / risks

- Inter-service request failures and timeouts must be handled.
- Feature schemas and model versions require strict compatibility management.
- Observability must correlate a product event to an inference job and result.
- The Python service must not become an alternate source of truth for product state.

## Guardrails

- AI is not required for the first telemetry persistence and threshold-alert vertical slice.
- A model failure must never map to a healthy/low-risk result by default.
- Every result must identify the model/version and relevant time window.
- NestJS validates asset/tenant association before persisting outputs.
- Use bounded timeouts, retries where safe, idempotency, and explicit pending/failed states.
- Maintain offline evaluation, model registry metadata, and rollback capability.
- Document feature and label provenance; do not mix unrelated datasets without justified mapping.
- Explainability output is supporting evidence, not proof of physical root cause.

## Review triggers

Revisit this decision if:

- Model serving latency requires a different inference topology.
- Workloads require GPUs or specialized hardware.
- Multiple model teams require independent deployments.
- A batch analytics architecture becomes necessary.

## Implementation status

Not implemented yet. AI service contracts and deployment are deferred until the intelligence increment after telemetry and deterministic alerting are reliable.
