# OPL Borg

Assimilate technological distinctiveness into tools that belong to you.

OPL Borg provides `$assimilate`, a Codex skill for investigating donor systems,
recovering the mechanisms that make them useful, and integrating those
capabilities into your own architecture. Use it with repositories, plugins,
skills, or other inspectable systems. Your request determines whether the work
ends with investigation, design, or implementation.

## Use

```text
Use $assimilate to extract the useful capabilities from these donor
repositories and integrate them into my system. Choose boundaries that fit.
```

The skill investigates causal value, resolves conflicts, designs native
boundaries, migrates callers, and verifies that the capabilities survived.

For large jobs, the skill maintains a campaign directory with source coverage,
evidence, decisions, work ownership, verification receipts, and a landing file.
Bounded workers can execute independent work. The same work can run serially
when subagents are unavailable. Campaign state supports recovery across context
windows. Continuation uses the host's available session mechanisms.

```text
Use $assimilate to resume /absolute/path/to/campaign/STATE.md.
```

Read the [skill](skills/assimilate/SKILL.md),
[campaign protocol](skills/assimilate/references/campaign-state.md),
and [orchestration protocol](skills/assimilate/references/orchestration.md)
for the full workflow. Campaign records preserve working evidence.

Source and installation: [OnePersonLabs/opl-borg](https://github.com/OnePersonLabs/opl-borg).

MIT. See LICENSE.
