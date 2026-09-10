# KerjaHarian Operational Policy v1

This document turns the trust/safety recommendations into production guardrails without adding unnecessary friction to workers.

## Core principles

1. Database/backend is the source of truth.
2. AI is an assistant: it may detect, explain, rank, and recommend; it must not make irreversible financial, access, safety, or dispute decisions by itself.
3. Worker UX stays simple: no CV, surat lamaran, or unnecessary verification steps.
4. Prices are catalog-based. Supply/demand must not be used to push worker pay below the operational floor.
5. Employer and worker have symmetric incident/reporting channels.
6. Additional work is not silently included in the original job scope.
7. GPS is evidence, not an absolute judge; indoor/dense-area accuracy requires a soft/hard confidence model.

## Pricing and wage floor

- Operational worker minimum: Rp75.000 per transaction/minimum payable floor.
- Existing valid hourly catalog rates are preserved; the floor must not rewrite an hourly rate into Rp75.000.
- Overtime remains server-calculated from timestamps and the configured overtime rate.
- Employer-side platform/protection/tax costs are additive and must not reduce worker earnings.
- Protection/insurance fee remains Rp0 until an actual provider/legal arrangement is configured.

## Cancellation and no-show

- Cancellation and no-show events are recorded as reliability events.
- No-show is not an automatic permanent ban.
- Repeated events escalate from warning to human review using configured thresholds.
- If a worker has already arrived, an employer cancellation can qualify for arrival compensation according to the configured policy.
- The final financial/dispute outcome follows the Resolution Center and human-review rules.

## Safety and incidents

Workers and employers can report injury, threat, violence, unsafe conditions, scope violations, and payment issues against an active job.

A safety incident marks the job as having an open incident and creates a reliability event for operational review. Critical actions remain human-controlled.

## Scope and overtime

The original job scope should be captured when the job is created. Additional work is a separate decision and must be accepted/recorded before it is treated as payable overtime or additional scope.

## GPS

- Soft radius default: 100 m.
- Hard radius default: 250 m.
- A GPS mismatch should be treated as a confidence exception rather than automatic proof of misconduct.
- A future check-in UI can combine GPS, timestamp, job state, and participant confirmation.

## Reliability and dispatch

Reliability history is non-punitive operational evidence. Future dispatch scoring may use distance, availability, skill match, reliability, rating, cancellation history, and recent workload. Rating must not become a permanent caste system and new workers must retain access to opportunities.

## Privacy

Only the minimum personal data needed for the transaction should be shown to the other party. KTP/KYC material is not public profile data. Location and work history require restricted access and appropriate retention/deletion rules.

## Abuse and dispute

The system must detect both worker-side and employer-side abuse. Examples include unsafe work requests, unpaid scope expansion, retaliatory ratings, harassment, repeated cancellation after arrival, and fraudulent activity.

AI can flag patterns. It must not independently ban, suspend, refund, settle, or declare fault.

## Implementation status

The migration `20260911000000_operational_trust_safety_policy.sql` adds the operational policy configuration, cancellation/safety metadata, reliability events, incident intake, RLS protections, and server-side incident recording. AI User now receives the non-sensitive policy context and is explicitly constrained to follow it.

Remaining product work should connect the existing UI actions to these backend primitives and add an Admin Resolution/Operations view for incidents and reliability review before broad production rollout.
