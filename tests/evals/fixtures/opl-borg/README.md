# Assimilation and fresh-context continuation fixture

This small synthetic system exercises source investigation, redesign, working
recipient behavior, and a real checkpoint/resume handoff. It forces campaign
mode on a small task so the trial stays finite. It does not measure naturally
occurring compaction or performance on a large repository.

Everything under `workspace/` is evaluator input. Keep this README, `grade.py`,
and `grading.md` outside the evaluator workspace and conversation. All code is
Python standard library code; there are no downloads or services.

## Prepare an isolated workspace

Run from the repository root, retaining these shell variables for grading:

```bash
borg_fixture_root="$PWD/tests/evals/fixtures/opl-borg"
borg_trial_root="$(mktemp -d /tmp/opl-borg-trial.XXXXXX)"
cp -R "$borg_fixture_root/workspace/." "$borg_trial_root/"
mkdir -p "$borg_trial_root/.agents/skills"
cp -R plugins/opl-borg/skills/assimilate "$borg_trial_root/.agents/skills/"
git -C "$borg_trial_root" init -q
git -C "$borg_trial_root" add .
git -C "$borg_trial_root" -c user.name='Borg Fixture' -c user.email='fixture@example.invalid' commit -qm baseline
python3 "$borg_fixture_root/grade.py" "$borg_trial_root" --phase baseline
```

For an agent whose `$assimilate` skill is already installed, copying the skill
is optional. Use the candidate source copy above when comparing skill revisions.
Give the evaluator access to this trial directory only. Do not point it at the
original repository or reveal the held-out grading files.

## Forward trial

Start a fresh Codex agent in `borg_trial_root` with this exact user request:

> Use $assimilate. Read REQUEST.md, implement the first authorized slice, and
> leave the requested campaign checkpoint before ending your turn.

An optional noninteractive invocation, using a Codex home already able to run
the chosen model, is:

```bash
codex exec --ephemeral --skip-git-repo-check --sandbox workspace-write \
  -C "$borg_trial_root" \
  'Use $assimilate. Read REQUEST.md, implement the first authorized slice, and leave the requested campaign checkpoint before ending your turn.'
python3 "$borg_fixture_root/grade.py" "$borg_trial_root" --phase intake
git -C "$borg_trial_root" diff --stat
```

Record the first agent's landing-file path, output, and grading receipt outside
the workspace. Stop that agent. Start another fresh agent with no transcript,
summary, or conversational handoff, using this exact request:

> Use $assimilate. Read RESUME.md and continue from the campaign files in this
> workspace. Finish the remaining authorized assimilation and verify the result.

```bash
codex exec --ephemeral --skip-git-repo-check --sandbox workspace-write \
  -C "$borg_trial_root" \
  'Use $assimilate. Read RESUME.md and continue from the campaign files in this workspace. Finish the remaining authorized assimilation and verify the result.'
python3 "$borg_fixture_root/grade.py" "$borg_trial_root" --phase final
```

The two fresh runs are intentional. Do not resume the first Codex conversation.
For an interrupted trial, terminate at the first complete persisted checkpoint
and use the same fresh-agent request. Do not manufacture missing state for it.

Review `grading.md` after execution. An activation smoke pass is separate:

```bash
npm run eval:smoke -- --plugin opl-borg --skill assimilate
```

## Author checks

The baseline phase must pass against a clean copy. The intake/final phases must
fail against that copy because the recipient lacks the desired capabilities.
They must pass after a successful assimilation. The grader copies the recipient
into its own temporary directory, so donor imports cannot satisfy its checks.

Preserve failed trial workspaces for diagnosis. Remove only the exact disposable
trial path when its evidence is no longer needed.
