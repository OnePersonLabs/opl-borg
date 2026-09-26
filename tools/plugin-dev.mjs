#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { codexCommand, pythonBin } from './runtime.mjs'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const marketplacePath = join(repoRoot, '.agents', 'plugins', 'marketplace.json')
const matrixPath = join(repoRoot, 'tools', 'plugin-matrix.json')
function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

const marketplace = readJson(marketplacePath)
const matrix = readJson(matrixPath)

function option(name, fallback = undefined) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) fail(`--${name} requires a value`)
  return value
}

function flag(name) {
  return process.argv.includes(`--${name}`)
}

function fail(message, status = 1) {
  console.error(`plugin-dev: ${message}`)
  process.exit(status)
}

function pluginEntries() {
  if (!Array.isArray(marketplace.plugins)) fail('marketplace plugins must be an array')
  return marketplace.plugins
}

function selectedPlugins(value = option('plugin', 'all')) {
  const entries = pluginEntries()
  if (value === 'all') return entries
  const entry = entries.find((candidate) => candidate.name === value)
  if (!entry) fail(`unknown plugin: ${value}`)
  return [entry]
}

function pluginRoot(entry) {
  const source = entry.source?.path
  if (typeof source !== 'string') fail(`${entry.name}: source.path is missing`)
  return resolve(repoRoot, source)
}

function manifestFor(entry, root = pluginRoot(entry)) {
  return readJson(join(root, '.codex-plugin', 'plugin.json'))
}

function walk(root) {
  const output = []
  if (!existsSync(root)) return output
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, item.name)
    if (item.isDirectory()) output.push(...walk(path))
    else output.push(path)
  }
  return output
}

function parseSkillFrontmatter(path) {
  const text = readFileSync(path, 'utf8')
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1] ?? ''
  return {
    name: block.match(/^name:\s*["']?([^\r\n"']+)/mu)?.[1]?.trim(),
    description: block.match(/^description:\s*(?:>-?\s*)?([^\r\n]+)/mu)?.[1]?.trim(),
  }
}

function skillsFor(entry, root = pluginRoot(entry)) {
  const manifest = manifestFor(entry, root)
  if (typeof manifest.skills !== 'string') return []
  const skillsRoot = resolve(root, manifest.skills)
  if (!existsSync(skillsRoot)) return []
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((item) => item.isDirectory() && existsSync(join(skillsRoot, item.name, 'SKILL.md')))
    .map((item) => ({ name: item.name, root: join(skillsRoot, item.name) }))
}

function within(root, candidate) {
  const path = relative(root, candidate)
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path))
}

function contractErrors(entry, root = pluginRoot(entry)) {
  const errors = []
  const manifestPath = join(root, '.codex-plugin', 'plugin.json')
  if (!existsSync(manifestPath)) return [`${entry.name}: missing .codex-plugin/plugin.json`]
  let manifest
  try {
    manifest = readJson(manifestPath)
  } catch (error) {
    return [`${entry.name}: invalid plugin manifest: ${error.message}`]
  }

  if (basename(root) !== entry.name) errors.push(`${entry.name}: source folder name differs`)
  if (manifest.name !== entry.name) errors.push(`${entry.name}: manifest name differs`)
  if (typeof manifest.version !== 'string' || !manifest.version) errors.push(`${entry.name}: version is missing`)
  if (typeof manifest.version === 'string' && /\+codex\./u.test(manifest.version)) {
    errors.push(`${entry.name}: timestamp cachebuster versions are forbidden`)
  }
  if (typeof manifest.description !== 'string' || !manifest.description.trim()) {
    errors.push(`${entry.name}: description is missing`)
  }

  for (const field of ['skills', 'mcpServers', 'hooks', 'apps', 'agents']) {
    if (manifest[field] === undefined) continue
    if (typeof manifest[field] !== 'string' || !manifest[field].startsWith('./')) {
      errors.push(`${entry.name}: ${field} must be a ./-relative path`)
      continue
    }
    const target = resolve(root, manifest[field])
    if (!within(root, target)) errors.push(`${entry.name}: ${field} escapes the plugin root`)
    if (!existsSync(target)) errors.push(`${entry.name}: ${field} path does not exist`)
  }

  const polluted = walk(root)
    .map((path) => relative(root, path).split(sep).join('/'))
    .filter((path) => /(^|\/)(?:tests?\/|test_[^/]*[.]py$)|[.]test[.](?:mjs|js|ts)$/u.test(path))
  for (const path of polluted) errors.push(`${entry.name}: non-runtime test file is shipped: ${path}`)

  const nestedManifests = walk(root)
    .filter((path) => path.endsWith(`${sep}.codex-plugin${sep}plugin.json`) && path !== manifestPath)
  for (const path of nestedManifests) {
    errors.push(`${entry.name}: nested plugin manifest is shipped: ${relative(root, path)}`)
  }

  const skills = skillsFor(entry, root)
  const cases = evalCases(entry)
  const skillNames = new Set(skills.map((skill) => skill.name))
  for (const item of cases) {
    if (!skillNames.has(item.skill)) errors.push(`${entry.name}: eval case ${item.id ?? '(missing id)'} targets an unshipped skill`)
    if (typeof item.should_activate !== 'boolean') errors.push(`${entry.name}: eval case ${item.id ?? '(missing id)'} lacks boolean should_activate`)
  }
  for (const skill of skills) {
    const parsed = parseSkillFrontmatter(join(skill.root, 'SKILL.md'))
    if (parsed.name !== skill.name) errors.push(`${entry.name}/${skill.name}: frontmatter name differs`)
    if (!parsed.description) errors.push(`${entry.name}/${skill.name}: description is missing`)
    const openaiPath = join(skill.root, 'agents', 'openai.yaml')
    if (!existsSync(openaiPath)) {
      errors.push(`${entry.name}/${skill.name}: agents/openai.yaml is missing`)
      continue
    }
    const allow = readFileSync(openaiPath, 'utf8').match(/allow_implicit_invocation:\s*(true|false)/u)?.[1]
    if (!allow) errors.push(`${entry.name}/${skill.name}: allow_implicit_invocation must be explicit`)
    const skillCases = cases.filter((item) => item.skill === skill.name)
    for (const kind of ['direct', 'indirect', 'negative']) {
      if (!skillCases.some((item) => item.kind === kind)) {
        errors.push(`${entry.name}/${skill.name}: retained ${kind} eval case is missing`)
      }
    }
  }
  return errors
}

function marketplaceErrors() {
  const errors = []
  if (matrix.schemaVersion !== 1) errors.push('plugin matrix schemaVersion must be 1')
  if (typeof marketplace.name !== 'string' || !marketplace.name) errors.push('marketplace name is missing')
  const seen = new Set()
  for (const entry of pluginEntries()) {
    if (seen.has(entry.name)) errors.push(`duplicate marketplace plugin: ${entry.name}`)
    seen.add(entry.name)
    if (entry.source?.source !== 'local') errors.push(`${entry.name}: marketplace source must be local`)
    if (entry.source?.path !== `./plugins/${entry.name}`) errors.push(`${entry.name}: marketplace source path differs`)
    if (!entry.policy?.installation || !entry.policy?.authentication || !entry.category) {
      errors.push(`${entry.name}: marketplace policy/category is incomplete`)
    }
    if (!matrix.plugins?.[entry.name]) errors.push(`${entry.name}: missing plugin matrix entry`)
  }
  for (const name of Object.keys(matrix.plugins ?? {})) {
    if (!seen.has(name)) errors.push(`${name}: stale plugin matrix entry`)
  }
  return errors
}

function runContract(entries = selectedPlugins()) {
  const errors = [...marketplaceErrors()]
  for (const entry of entries) errors.push(...contractErrors(entry))
  if (errors.length) {
    for (const error of errors) console.error(`ERROR ${error}`)
    fail(`${errors.length} contract violation(s)`)
  }
  console.log(`Contract checks passed for ${entries.length} plugin(s).`)
}

function run(arguments_, options = {}) {
  const result = spawnSync(arguments_[0], arguments_.slice(1), {
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  })
  if (result.error) fail(`${arguments_[0]} failed to start: ${result.error.message}`)
  if (result.status !== 0) {
    if (options.capture) {
      if (result.stdout) process.stdout.write(result.stdout)
      if (result.stderr) process.stderr.write(result.stderr)
    }
    fail(`${arguments_.join(' ')} exited with ${result.status}`, result.status || 1)
  }
  return result.stdout?.trim() ?? ''
}

function unitFiles(root) {
  return walk(root).filter((path) => /[.]test[.]mjs$/u.test(path) || /^test_[^/]+[.]py$/u.test(basename(path)))
}

function runUnit(entries = selectedPlugins()) {
  if (entries.length === pluginEntries().length) {
    const rootFiles = (matrix.rootUnitRoots ?? []).flatMap((root) => unitFiles(resolve(repoRoot, root)))
    const node = rootFiles.filter((path) => path.endsWith('.mjs'))
    const python = rootFiles.filter((path) => path.endsWith('.py'))
    if (node.length) run([process.execPath, '--test', ...node])
    for (const path of python) run([pythonBin(), path])
    console.log(`repository tools: unit checks passed (${rootFiles.length} test files).`)
  }
  for (const entry of entries) {
    const config = matrix.plugins[entry.name]
    const files = (config.unitRoots ?? []).flatMap((root) => unitFiles(resolve(repoRoot, root)))
    const node = files.filter((path) => path.endsWith('.mjs'))
    const python = files.filter((path) => path.endsWith('.py'))
    if (node.length) run([process.execPath, '--test', ...node])
    for (const path of python) run([pythonBin(), path])
    for (const command of config.commands ?? []) run([command.command, ...command.args], { cwd: resolve(repoRoot, command.cwd) })
    console.log(`${entry.name}: unit checks passed (${files.length} test files, ${(config.commands ?? []).length} native commands).`)
  }
}

function runFocus() {
  const file = option('file')
  if (!file) fail('focus requires --file <test>')
  const path = resolve(repoRoot, file)
  if (!existsSync(path)) fail(`focused test does not exist: ${file}`)
  if (path.endsWith('.mjs')) {
    const args = [process.execPath, '--test']
    const name = option('name')
    if (name) args.push('--test-name-pattern', name)
    args.push(path)
    run(args)
  } else if (path.endsWith('.py')) {
    run([pythonBin(), path])
  } else {
    fail('focused tests must be .test.mjs or test_*.py; use the native package runner for other files')
  }
}

function stateRoot() {
  return resolve(process.env.OPL_PLUGIN_DEV_STATE ?? join(homedir(), '.local', 'state', 'opl-borg', 'codex'))
}

function prepareSkillHost(entry) {
  const work = resolve(repoRoot, '.work', 'dev-hosts', entry.name)
  rmSync(work, { recursive: true, force: true })
  const target = join(work, '.agents', 'skills')
  mkdirSync(target, { recursive: true })
  for (const skill of skillsFor(entry)) symlinkSync(skill.root, join(target, skill.name), process.platform === 'win32' ? 'junction' : 'dir')
  return work
}

function evalCases(entry) {
  const path = resolve(repoRoot, 'tests', 'evals', 'cases', `${entry.name}.jsonl`)
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8').split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line))
}

function activationEvidence(text, skill) {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const plain = text.replace(/[*_`]/gu, '')
  return new RegExp(`\\b(?:using|invoking|loaded|applying|I(?:['’](?:d|ll)|\\s+(?:would|will))\\s+use)\\s+(?:(?:the|requested|manual-only|explicitly\\s+(?:selected|requested))\\s+)*\\$?(?:[a-z0-9][a-z0-9-]*:)?${escaped}(?![a-z0-9_-])`, 'iu').test(plain)
}

function runEval(entries = selectedPlugins()) {
  const requestedSkill = option('skill')
  const requestedCase = option('case')
  const authoringHome = join(stateRoot(), 'authoring')
  mkdirSync(authoringHome, { recursive: true })
  const resultRoot = resolve(repoRoot, '.work', 'eval-results')
  mkdirSync(resultRoot, { recursive: true })
  for (const entry of entries) {
    const host = prepareSkillHost(entry)
    let cases = evalCases(entry)
    if (requestedSkill) cases = cases.filter((item) => item.skill === requestedSkill)
    if (requestedCase) cases = cases.filter((item) => item.id === requestedCase)
    if (!cases.length) {
      console.log(`${entry.name}: no matching skill eval cases.`)
      continue
    }
    const receipts = []
    for (const item of cases) {
      const output = run(codexCommand([
        'exec',
        '--ephemeral',
        '--json',
        '--ignore-user-config',
        '--sandbox',
        'read-only',
        ...(process.platform === 'win32' ? ['-c', 'windows.sandbox="unelevated"'] : []),
        '-m',
        matrix.evaluation.model,
        '-c',
        `model_reasoning_effort=\"${matrix.evaluation.reasoningEffort}\"`,
        '-C',
        host,
        item.prompt,
      ]), { env: { ...process.env, CODEX_HOME: authoringHome }, capture: true })
      const events = output.split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line))
      writeFileSync(join(resultRoot, `${entry.name}-${item.id.replace(/[^a-z0-9_-]/giu, '-')}.events.json`), `${JSON.stringify(events, null, 2)}\n`)
      const text = events
        .filter((event) => event.type === 'item.completed' && event.item?.type === 'agent_message')
        .map((event) => event.item.text ?? '')
        .join('\n')
      const activated = activationEvidence(text, item.skill)
      const pass = activated === item.should_activate
      receipts.push({ ...item, activated, pass, model: matrix.evaluation.model, reasoningEffort: matrix.evaluation.reasoningEffort, response: text })
      console.log(`${pass ? 'PASS' : 'FAIL'} ${item.id}`)
    }
    const path = join(resultRoot, `${entry.name}.json`)
    writeFileSync(path, `${JSON.stringify(receipts, null, 2)}\n`)
    if (receipts.some((item) => !item.pass)) fail(`${entry.name}: behavioral eval failures; see ${relative(repoRoot, path)}`)
  }
}

function jsonCommand(arguments_, env) {
  const output = run(arguments_, { env, capture: true })
  try {
    return JSON.parse(output || '{}')
  } catch (error) {
    fail(`${arguments_.join(' ')} returned invalid JSON: ${error.message}`)
  }
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function inventory(root) {
  const map = new Map()
  for (const path of walk(root)) {
    const rel = relative(root, path)
    if (rel.includes(`${sep}__pycache__${sep}`) || rel.includes(`${sep}node_modules${sep}`)) continue
    const stat = lstatSync(path)
    map.set(rel, stat.isSymbolicLink() ? `link:${readlinkSync(path)}` : sha256(path))
  }
  return map
}

function compareInventory(sourceRoot, installedRoot, name) {
  const source = inventory(sourceRoot)
  const installed = inventory(installedRoot)
  const differences = []
  for (const [path, digest] of source) {
    if (installed.get(path) !== digest) differences.push(`${path}: source and installed copy differ`)
  }
  for (const path of installed.keys()) if (!source.has(path)) differences.push(`${path}: unexpected installed file`)
  if (differences.length) {
    for (const difference of differences) console.error(`ERROR ${name}: ${difference}`)
    fail(`${name}: installed inventory mismatch`)
  }
}

function configuredMarketplace(payload, name) {
  return (payload.marketplaces ?? []).some((item) => item.name === name)
}

function installCandidate(entry, targetHome) {
  const env = { ...process.env, CODEX_HOME: targetHome }
  mkdirSync(targetHome, { recursive: true })
  const listed = jsonCommand(codexCommand(['plugin', 'list', '--json'], { env }), env)
  const installed = listed.installed ?? []
  const unrelated = installed.filter((item) => item.marketplaceName !== marketplace.name)
  if (unrelated.length) fail(`black-box home contains unrelated plugins: ${unrelated.map((item) => item.pluginId).join(', ')}`)
  for (const item of installed) {
    jsonCommand(codexCommand(['plugin', 'remove', item.pluginId, '--json'], { env }), env)
  }
  const sources = jsonCommand(codexCommand(['plugin', 'marketplace', 'list', '--json'], { env }), env)
  if (configuredMarketplace(sources, marketplace.name)) {
    jsonCommand(codexCommand(['plugin', 'marketplace', 'remove', marketplace.name, '--json'], { env }), env)
  }
  jsonCommand(codexCommand(['plugin', 'marketplace', 'add', repoRoot, '--json'], { env }), env)
  const result = jsonCommand(codexCommand(['plugin', 'add', `${entry.name}@${marketplace.name}`, '--json'], { env }), env)
  if (typeof result.installedPath !== 'string' || !existsSync(result.installedPath)) {
    fail(`${entry.name}: install did not return a usable installedPath`)
  }
  return { env, installedPath: realpathSync(result.installedPath), pluginId: `${entry.name}@${marketplace.name}` }
}

async function runInstalled(entries = selectedPlugins()) {
  const packageOnly = flag('package-only')
  if (entries.length !== 1) {
    if (!packageOnly) fail('test:installed requires exactly one --plugin (except --plugin all --package-only)')
    for (const entry of entries) await runInstalled([entry])
    return
  }
  const entry = entries[0]
  runContract(entries)
  if (!packageOnly) runUnit(entries)
  const blackboxHome = join(stateRoot(), 'blackbox', entry.name)
  const installed = installCandidate(entry, blackboxHome)
  compareInventory(pluginRoot(entry), installed.installedPath, entry.name)
  console.log(`${entry.name}: clean installed-copy checkpoint passed at ${installed.installedPath}${packageOnly ? ' (package/discovery only)' : ''}`)
}

function runVerify() {
  const entries = selectedPlugins('all')
  runContract(entries)
  runUnit(entries)
}

async function runRelease() {
  runVerify()
  for (const entry of pluginEntries()) await runInstalled([entry])
  runEval(pluginEntries())
}

const command = process.argv[2]
if (command === 'focus') runFocus()
else if (command === 'unit') runUnit()
else if (command === 'contract') runContract()
else if (command === 'eval') runEval()
else if (command === 'installed') await runInstalled()
else if (command === 'verify') runVerify()
else if (command === 'release') await runRelease()
else fail(`unknown command: ${command ?? '(missing)'}`)
