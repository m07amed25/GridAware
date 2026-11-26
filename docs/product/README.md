# GridAware Product Documentation

**Documentation set:** Product Discovery & Requirements  
**Baseline:** v1.1 (expanded supporting specifications)  
**Status:** Product direction approved; market assumptions remain subject to validation  
**Last updated:** 2026-11-26

---

## 1. Purpose

This folder is the product-level source of truth for GridAware. It explains why the product exists, whom it serves, what the first release is expected to do, how success will be measured, and which assumptions remain unverified.

The PRD is the consolidated product baseline. The supporting documents are standalone specifications, not short summaries. They provide the detail required by product, UX, engineering, QA, and operations to make consistent decisions.

## 2. Approved product decisions

| Decision                  | Approved baseline                  | Implication                                                                                           |
| ------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Initial operating mode    | Simulator only                     | The first release uses generated telemetry; physical device onboarding is outside scope.              |
| Target markets            | Factories and commercial buildings | The product model must support both, but equipment coverage is introduced incrementally.              |
| Product model             | Multi-tenant B2B SaaS              | Multiple customer organizations use one platform with strict tenant isolation.                        |
| First end-to-end scenario | Generator monitoring               | The initial workflow follows a simulated generator from telemetry to maintenance closure.             |
| Backend                   | NestJS + TypeScript                | NestJS owns product business logic, APIs, authorization, and orchestration.                           |
| Database                  | Neon PostgreSQL + Prisma ORM       | PostgreSQL is the transactional system of record; Prisma is the typed data-access and migration tool. |
| Frontend                  | Next.js + TypeScript               | The browser application is the primary user interface.                                                |
| AI services               | Python-based                       | Python is used for data preparation, model development, evaluation, and inference where justified.    |

## 3. Document map

| File                             | Purpose                                                                                   | Primary readers                       |
| -------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------- |
| `PRD.md`                         | Consolidated product requirements, scope, workflows, and acceptance baseline              | Product, design, engineering, QA      |
| `problem-statement.md`           | Problem context, consequences, hypotheses, evidence needs, and research plan              | Product, research, stakeholders       |
| `product-vision.md`              | Long-term direction, positioning, principles, value proposition, and strategic boundaries | Product, design, engineering          |
| `target-users.md`                | Customer segments, personas, jobs-to-be-done, roles, permissions, and journeys            | Product, UX, engineering              |
| `user-stories.md`                | Epics, stories, acceptance scenarios, and story priorities                                | Product, engineering, QA              |
| `functional-requirements.md`     | Detailed functional behavior and testable acceptance criteria                             | Engineering, QA                       |
| `non-functional-requirements.md` | Security, performance, reliability, scalability, usability, and operational quality       | Architecture, engineering, QA, DevOps |
| `mvp-scope.md`                   | Included/excluded features, release slices, dependencies, and release gate                | Product, project lead, engineering    |
| `success-metrics.md`             | Product, operational, platform, and ML metric definitions                                 | Product, data/ML, engineering         |
| `discovery-assumptions.md`       | Open assumptions, confidence, risks, validation methods, and decisions                    | Product, research, stakeholders       |
| `use-cases.md`                   | Actors, triggers, preconditions, main flows, alternate paths, and postconditions          | Product, design, engineering, QA      |
| `requirements-traceability.md`   | Links product goals to requirements, stories, tests, and release gates                    | Product, engineering, QA              |

## 4. How to use these documents

1. Read `PRD.md` for the complete product baseline.
2. Use the relevant supporting document during design or implementation.
3. Convert an approved requirement into an engineering issue only after its acceptance criteria are understood.
4. Link code changes and tests to requirement IDs such as `FR-TLM-004`.
5. Update the relevant source document when behavior or scope changes. Do not silently change product behavior in code only.
6. Record uncertain claims as assumptions until validated. Do not present hypotheses as customer research findings.

## 5. Requirement language and priority

The words **MUST**, **SHOULD**, and **MAY** are normative:

- **MUST:** Required for the stated release or requirement to be considered satisfied.
- **SHOULD:** Strongly recommended; a deviation requires a recorded reason.
- **MAY:** Optional or future capability.

Priority labels:

- **P0 / Must:** Required for the MVP's core workflow or its security and reliability.
- **P1 / Should:** Important for a usable pilot, but may follow the core workflow.
- **P2 / Could:** Valuable enhancement that is not required to prove the MVP.
- **Later:** Explicitly outside the MVP baseline.

## 6. Source-of-truth rules

- `PRD.md` is the consolidated baseline if a summary conflicts with another file.
- A supporting document may add detail but must not contradict approved product decisions.
- If a conflict is discovered, record a change proposal and update the PRD and affected supporting documents together.
- Architecture decisions such as queue topology, telemetry partitioning, authentication implementation, and hosting provider belong in architecture documents or technical decision records.
- Commercial pricing, legal compliance claims, physical device protocols, and customer commitments are not approved by this document set.

## 7. Product boundaries

GridAware is a monitoring, analytics, and maintenance decision-support platform. The first release uses simulated data. It does not control equipment, issue commands to PLCs, change setpoints, replace protective systems, or certify that an asset is safe to operate.

The first workflow is a simulated generator. The domain model should be extensible to other equipment. A second validation scenario, such as HVAC for commercial buildings, should be added before claiming that both market segments have been validated. This does not imply that every equipment category is supported in v1.

## 8. Product Discovery completion criteria

Discovery is sufficiently complete to enter detailed UX design when:

- The problem and customer hypotheses are documented.
- Initial customer segments and primary roles are defined.
- MVP boundaries are approved.
- The first end-to-end use case is documented.
- Functional and non-functional requirements have IDs and acceptance criteria.
- Success metrics have definitions and measurement methods.
- Unvalidated assumptions have validation approaches.
- No unresolved decision blocks the information architecture or core user flows.

This documentation does **not** prove product-market fit. Customer interviews and pilot observations remain necessary.
