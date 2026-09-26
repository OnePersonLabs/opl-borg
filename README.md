# OPL Borg

Assimilate technological distinctiveness into tools that belong to you.

OPL Borg provides `$assimilate`, a Codex skill for investigating donor systems,
recovering the mechanisms that make them useful, and integrating those
capabilities into your own architecture. Use it with repositories, plugins,
skills, or other inspectable systems. Your request determines whether the work
ends with investigation, design, or implementation.

## Install

Install the marketplace and plugin with the Codex CLI:

```sh
codex plugin marketplace add OnePersonLabs/opl-borg
codex plugin add opl-borg@opl-borg
```

Start a new Codex task after installation so it receives the skill.

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

Read the [skill](plugins/opl-borg/skills/assimilate/SKILL.md),
[campaign protocol](plugins/opl-borg/skills/assimilate/references/campaign-state.md),
and [orchestration protocol](plugins/opl-borg/skills/assimilate/references/orchestration.md)
for the full workflow. Campaign records preserve working evidence.

## Development

This repository contains one shipping plugin under `plugins/opl-borg`. Tests
and evaluation inputs stay under `tests/`; repository drivers stay under
`tools/`.

Repository checks require Node.js 24 or newer. Python is needed for the
continuation fixture; Codex CLI and model access are needed for activation
evaluations and installed-copy checks. Set `CODEX_BIN` or `PYTHON_BIN` when the
executables are not on `PATH`. The evaluation model is configured in
`tools/plugin-matrix.json`.

```sh
npm run test:contract -- --plugin opl-borg
npm run test:unit -- --plugin opl-borg
npm run eval:smoke -- --plugin opl-borg --skill assimilate
npm run test:installed -- --plugin opl-borg
```

`verify` runs the deterministic contract and registered unit checks.
`release:verify` also runs the installed-copy
checkpoint and all activation cases. The installed check uses an isolated,
persistent Codex home and compares all installed files with source. Override its
state directory with `OPL_PLUGIN_DEV_STATE`. Model evaluations save receipts
under `.work/eval-results/`.

The [continuation fixture](tests/evals/fixtures/opl-borg/README.md) checks donor
investigation, recipient behavior, and recovery in a fresh context. Its held-out
grader stays outside the evaluator workspace.

## License

MIT. See [LICENSE](LICENSE).
