# Bounded orchestration and baton passes

Use when a campaign needs delegation or a change of context. The coordinator
retains the mission, comparison across donors, architecture, and integration.
Workers receive enough context for a bounded result, not the entire mission.

## Decompose by the decision being made

Use a coverage graph for research and a dependency graph for delivery. Track
cross-cutting dependencies explicitly rather than treating folders as independent.

- **Reconnaissance:** partition large inventories by source surface. Ask scouts
  for coverage and candidate causal mechanisms, not a generic donor summary.
- **Comparison:** group findings by capability across donors. Give a synthesizer
  the relevant source-backed records and a concrete unresolved decision. Do not
  let isolated donor specialists each invent a destination architecture.
- **Delivery:** partition by coherent slices with settled interfaces and exclusive
  write ownership. Serialize shared registries, entrypoints, and migrations.
- **Verification:** give an independent evaluator the capability contract and
  minimum raw artifacts needed to exercise it. Withhold the implementor's desired
  conclusion; inspect produced behavior, not just a favorable review.

Use only stages that repay their cost. A scout can continue as a specialist when
its context remains useful. Reuse agents for related bounded follow-ups; replace
them when unrelated history or saturation defeats the benefit. Keep the tightly
coupled architecture loop in the coordinator.

## Dispatch a work packet

Store a packet before delegating substantial work. Adapt this compact template:

```text
Work ID and campaign generation:
Purpose: one question or deliverable; definition of done
Scope: source IDs/revisions, capability IDs, exclusions
Read: mission excerpt, relevant decisions/interfaces, exact files or index slices
Own: exclusive output paths and permitted implementation paths
Dependencies: accepted prerequisites; what to report if they are contradicted
Verify: required experiment/check and evidence location
Return: result path, findings, changed paths, checks, unresolved risks, next action
Bounds: authorized side effects; supplied resource limits; stopping condition
```

State that the workspace is shared and other agents' changes must be preserved.
Workers do not edit the shared campaign indexes or expand their own scope. They
report discovered dependencies and blocking questions to the coordinator.
The coordinator may delegate a bounded subgraph to a specialist coordinator
when scale warrants it; assign its subtree and join contract explicitly, with
one owner per path and a single top-level integration owner.

Prefer fresh, task-local context for independent work; include conversation
history only when necessary. Choose concurrency and available models according
to local policy, complexity, overlap, monetary cost, and duplicated context.
More agents do not compensate for an undefined join contract. When delegation
is unavailable, execute the same bounded packets serially and checkpoint between
them; do not make subagent tools a requirement for completing the assimilation.

Ask for a compact return, normally at most 300 words, linking a detailed artifact
where needed. Each finding should carry evidence, confidence, and the decision it
enables. Preserve exceptional and conflicting findings instead of averaging them
away. The coordinator reads raw source selectively for disputes or integration
decisions, rather than importing every worker transcript.

## Integrate and recover workers

Accept a result only after checking its assigned coverage, evidence locations,
scope, and effect on shared contracts. Run the relevant checks on the integrated
state before accepting an implementation. If a packet is too large or a result is
weak, narrow the question and reuse its useful evidence.

If a worker stalls, fails, or loses context, inspect its artifacts and workspace
changes before reassigning. Retain partial findings as partial, stop or reconcile
the previous writer, then give the remaining scope to a new owner/generation.
Never dispatch a second writer to the same paths just because the first has not
replied. Reject or reconcile late results against the current source and interface
versions; never let them overwrite accepted work silently.

## Pass the baton

A baton pass transfers a recoverable work state, not a story about the session.

1. Stop dispatching new work. Have active writers finish a bounded slice or stop
   and record partial changes. Verify quiescence before transferring their paths.
   If live work cannot stop, record it explicitly and keep its ownership reserved.
2. Publish a coherent checkpoint using the campaign-state reference. Write a
   `HANDOFF.md` containing the original mission and user corrections by reference,
   authorized endpoint, workspace/state identity, accepted decisions, incomplete
   work and live owners, exact checks and results, and the next executable action.
3. Include a short restart prompt, for example:
   `Use $assimilate to resume <absolute STATE.md path>. Read the linked handoff,
   reconcile current files and live owners, then execute <next work ID>.`
4. Exercise a cold read when practical: a fresh agent gets only the restart prompt
   and referenced workspace. Ask it to recover the next action and missing facts
   without editing. Repair gaps it actually finds; a cold-read check is not proof
   that the entire campaign has been completed.
5. Use the host's available continuation/handoff mechanism. A coordinator may
   compact or start a successor only when the host supports it. A spawned worker
   is not automatically a new root and does not inherit root-only authority. For
   delegated phase continuation, give it a bounded phase and keep root ownership.

If a fresh session requires user action, supply the exact restart prompt and
landing path. Do not promise automatic continuation that the host cannot perform.
If the current context is still usable, continue ready work instead of ending
merely because a handoff file exists. A checkpoint is progress, not completion.
