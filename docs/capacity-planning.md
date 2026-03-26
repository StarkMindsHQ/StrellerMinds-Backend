# Capacity Planning Runbook

## Objective

Keep the platform within safe operating headroom by combining live resource monitoring, forecasted growth, benchmark evidence, and autoscaling guardrails.

## Monitoring Inputs

- Capture CPU, memory, heap, event loop utilization, uptime, and active handle snapshots every 15 minutes.
- Review dashboard data after each deployment and during incident response.
- Maintain at least 30% headroom for CPU and memory during normal load.

## Forecast Review

- Review the capacity forecast weekly.
- Escalate when projected threshold breach is within 72 hours.
- Treat CPU or memory forecasts above 80% as an operational risk that needs mitigation before the next release.

## Autoscaling Strategy

- Scale out when CPU is above 70% for 10 minutes.
- Scale out when memory is above 75% for 15 minutes.
- Scale out when p95 latency exceeds 500ms for 5 minutes.
- Scale in only after sustained recovery below the configured thresholds and after cooldown windows complete.

## Benchmarking

- Run the benchmark endpoint before major releases and after infrastructure changes.
- Compare throughput, p95 latency, error rate, and saturation score with the previous benchmark.
- Update replica limits when benchmark saturation exceeds 75.

## Documentation Expectations

- Keep dashboard screenshots in release notes for production-impacting releases.
- Record any scaling limit changes in the infrastructure change log.
- Review this runbook quarterly with engineering and operations.
