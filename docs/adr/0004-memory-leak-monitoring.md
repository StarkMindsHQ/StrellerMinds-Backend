# ADR-004: Memory Leak Detection and Monitoring

* **Status**: Accepted
* **Date**: 2026-04-29
* **Deciders**: Engineering Team

## Context and Problem Statement

Long-running services in a Node.js environment are susceptible to memory leaks. We need a way to detect these leaks early in the development lifecycle (during testing).

## Decision Drivers

* Quality: Ensure long-term stability.
* Automation: Detect leaks automatically in CI/CD.

## Decision Outcome

Chosen option: "Custom Jest-based Memory Leak Detector".
- Implement a `MemoryLeakDetector` utility that triggers GC and compares heap snapshots.
- Add specific memory leak test specifications that run many iterations of core logic.
- Integrate with `npm run test:memory` using the `--expose-gc` flag.

### Consequences

* **Good**: High confidence in the memory efficiency of core services.
* **Bad**: Tests are slower due to many iterations and manual GC triggers.
