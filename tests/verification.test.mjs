import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hook = join(plugin, "hooks/scripts/check-lint-and-review.mjs");
const collector = join(plugin, "skills/reviewer/scripts/collect-review-changes.mjs");
const resultPrefix = "LSTACK_STRUCTURE_REVIEW ";

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", ...options });
}

function runGit(root, ...args) {
  const result = run("git", ["-C", root, ...args]);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

function writeFile(root, file, content) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), content);
}

function createProject(context, overrides = {}) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "lstack-verification-")));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const root = join(directory, "project with space");
  mkdirSync(root);
  runGit(root, "init", "-b", "main");
  const countPath = join(directory, "lint-count");
  const config = { base: "main", include: ["**/*.ts", "agents/*.md", "skills/**/SKILL.md", "hooks/**/*.json"],
    lint: [process.execPath, "-e", `require('node:fs').appendFileSync(${JSON.stringify(countPath)}, 'run\\n')`], review: "enforce", ...overrides };
  writeFile(root, ".lstack.json", JSON.stringify(config));
  writeFile(root, "source.ts", "export const value = 1;\n");
  writeFile(root, "removed.ts", "export const removed = 1;\n");
  writeFile(root, "renamed.ts", "export function runRename() {}\n");
  runGit(root, "add", ".");
  runGit(root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture baseline");
  const env = { ...process.env, LSTACK_SESSION_ID: "session-one", LSTACK_STATE_DIR: join(directory, "state"), CLAUDE_ENV_FILE: join(directory, "session.env") };
  function callHook(event, input = {}) {
    const result = run(process.execPath, [hook], { cwd: root, env,
      input: JSON.stringify({ session_id: env.LSTACK_SESSION_ID, cwd: root, hook_event_name: event, ...input }) });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim() ? JSON.parse(result.stdout) : {};
  }
  function callCli(command, args = [], options = {}) { return run(process.execPath, [hook, command, ...args], { cwd: root, env, ...options }); }
  function beginReview(agentId = "review-one", input = {}) {
    const output = callHook("SubagentStart", { agent_id: agentId, agent_type: "lstack:structure-reviewer", ...input });
    const line = output.hookSpecificOutput?.additionalContext.split("\n").find((line) => line.startsWith(resultPrefix));
    return { agentId, result: line ? JSON.parse(line.slice(resultPrefix.length)) : null };
  }
  function finishReview(review, changes = {}, input = {}) {
    return callHook("SubagentStop", { agent_id: review.agentId, agent_type: "lstack:structure-reviewer",
      agent_transcript_path: join(directory, "subagents", `agent-${review.agentId}.jsonl`),
      last_assistant_message: `검토 완료\n${resultPrefix}${JSON.stringify({ ...review.result, ...changes })}`, ...input });
  }
  return { directory, root, config, env, countPath, callHook, callCli, beginReview, finishReview };
}

function changeSource(project, value = 2) {
  writeFile(project.root, "source.ts", `export const value = ${value};\n`);
}

test("changed files include committed, staged, unstaged, untracked, deletion, rename and whitespace paths", (context) => {
  const project = createProject(context);
  runGit(project.root, "switch", "-c", "work");
  writeFile(project.root, "committed.ts", "export const committed = 1;\n");
  runGit(project.root, "add", "committed.ts");
  runGit(project.root, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture change");
  writeFile(project.root, "staged.ts", "export const staged = 1;\n");
  runGit(project.root, "add", "staged.ts");
  changeSource(project);
  writeFile(project.root, "new folder/new\tname\nfile.ts", "export function runNew() {}\n");
  writeFile(project.root, "consumer:with space.ts", "runNew();\n");
  rmSync(join(project.root, "removed.ts"));
  runGit(project.root, "mv", "renamed.ts", "pure rename.ts");
  writeFile(project.root, "agents/reviewer.md", "changed behavior\n");
  writeFile(project.root, "skills/nested/test/SKILL.md", "changed workflow\n");
  writeFile(project.root, "hooks/hooks.json", "{}\n");
  const result = run(process.execPath, [collector, "main"], { cwd: project.root });
  assert.equal(result.status, 0, result.stderr);
  for (const file of ["committed.ts", "staged.ts", "source.ts", "removed.ts", "renamed.ts → pure rename.ts", "new folder/new\\tname\\nfile.ts", "agents/reviewer.md", "skills/nested/test/SKILL.md", "hooks/hooks.json"]) assert.ok(result.stdout.includes(file), file);
  assert.match(result.stdout, /runNew.*호출 후보 1곳/);
  assert.doesNotMatch(result.stdout, /\| value \||\| runRename \|/);
  assert.match(result.stdout, /R100/);
  assert.equal(run(process.execPath, [collector, "missing-base"], { cwd: project.root }).status, 1);
});

test("read-only question skips dirty existing code; changed source runs lint and requires fresh review", (context) => {
  const project = createProject(context);
  changeSource(project);
  project.callHook("SessionStart");
  project.callHook("UserPromptSubmit", { prompt: "이 코드가 뭐야?" });
  assert.deepEqual(project.callHook("Stop"), {});
  assert.throws(() => readFileSync(project.countPath));
  changeSource(project, 3);
  assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
  assert.match(readFileSync(project.countPath, "utf8"), /run/);
  assert.match(readFileSync(project.env.CLAUDE_ENV_FILE, "utf8"), /export LSTACK_SESSION_ID='session-one'/);
});

test("default collector includes mts and cts changes and their export consumers", (context) => {
  const project = createProject(context);
  writeFile(project.root, "module.mts", "export function readModule() {}\nreadCommon();\n");
  writeFile(project.root, "common.cts", "export function readCommon() {}\nreadModule();\n");
  runGit(project.root, "add", "common.cts");
  const result = run(process.execPath, [collector, "main"], { cwd: project.root });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\| A \| module\.mts \|/);
  assert.match(result.stdout, /\| A \| common\.cts \|/);
  assert.match(result.stdout, /readModule.*module\.mts.*호출 후보 1곳/);
  assert.match(result.stdout, /readCommon.*common\.cts.*호출 후보 1곳/);
});

test("successful review and lint reuse only the identical current snapshot", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  changeSource(project);
  const review = project.beginReview();
  project.finishReview(review);
  assert.match(project.callHook("Stop").systemMessage, /완료/);
  assert.match(project.callHook("Stop", { stop_hook_active: true }).systemMessage, /완료/);
  assert.equal(readFileSync(project.countPath, "utf8"), "run\n");
  assert.equal(project.callCli("check").status, 0);
  changeSource(project, 3);
  assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
  assert.equal(project.callCli("check").status, 1);
});

for (const [name, lint] of [
  ["nonzero", [process.execPath, "-e", "console.error('actual lint finding'); process.exit(1)"]],
  ["missing executable", ["lstack-command-does-not-exist"]],
  ["signal", [process.execPath, "-e", "process.kill(process.pid, 'SIGTERM')"]],
]) test(`lint ${name} blocks even with a valid review`, (context) => {
  const project = createProject(context, { lint });
  project.callHook("SessionStart");
  changeSource(project);
  project.finishReview(project.beginReview());
  assert.match(project.callHook("Stop").reason, /lint 실패\/실행 오류/);
  assert.equal(project.callCli("check").status, 1);
});

test("invalid config and git errors never become empty-success results", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  changeSource(project);
  for (const config of [{ ...project.config, lint: "bun lint" }, { ...project.config, base: "missing-base" }, { ...project.config, review: "optional" }]) {
    writeFile(project.root, ".lstack.json", JSON.stringify(config));
    assert.match(JSON.stringify(project.callHook("Stop")), /통과 아님/);
    assert.equal(project.callCli("check").status, 1);
  }
  rmSync(join(project.root, ".lstack.json"));
  assert.match(JSON.stringify(project.callHook("Stop")), /사라졌습니다/);
});

test("report mode exposes semantic findings and enforce mode blocks the confirmed finding", (context) => {
  const finding = { severity: "blocker", location: "source.ts:1", consumer: "runSource", problem: "규칙 원본 중복", change: "기존 스키마에서 가져오세요" };
  const project = createProject(context, { review: "report" });
  project.callHook("SessionStart");
  changeSource(project);
  project.finishReview(project.beginReview(), { findings: [finding] });
  assert.match(project.callHook("Stop").reason, /report 모드.*\n.*source.ts:1/s);
  assert.match(project.callHook("Stop", { stop_hook_active: true }).systemMessage, /규칙 원본 중복/);
  assert.equal(project.callCli("check").status, 0);
  writeFile(project.root, ".lstack.json", JSON.stringify({ ...project.config, review: "enforce" }));
  project.finishReview(project.beginReview("enforce-review"), { findings: [finding] });
  assert.match(project.callHook("Stop").reason, /구조 블로커를 수정/);
  assert.equal(project.callCli("check").status, 1);
});

for (const [name, changes, input] of [
  ["design only", { mode: "design" }, {}],
  ["review error", { status: "error" }, {}],
  ["invalid finding", { findings: [{ severity: "blocker" }] }, {}],
  ["different tree", { worktree: "/some/other/tree" }, {}],
  ["different agent", {}, { agent_id: "different" }],
  ["different type", {}, { agent_type: "general-purpose" }],
  ["different session", {}, { session_id: "other-session" }],
  ["missing result", {}, { last_assistant_message: "looks good" }],
  ["missing transcript", {}, { agent_transcript_path: "" }],
]) test(`${name} does not satisfy diff review`, (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  changeSource(project);
  project.finishReview(project.beginReview(), changes, input);
  assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
});

test("main attestation and subagent stop without start cannot satisfy review", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  changeSource(project);
  writeFile(project.root, ".claude/structure-review.json", JSON.stringify({ status: "complete", findings: [] }));
  project.finishReview({ agentId: "never-started", result: {} });
  assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
});

test("edits during review and resuming an existing reviewer require a new reviewer", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  changeSource(project);
  const review = project.beginReview();
  changeSource(project, 3);
  project.finishReview(review);
  assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
  const fresh = project.beginReview("fresh");
  project.finishReview(fresh);
  project.beginReview("fresh");
  assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
});

test("compact and resume preserve a turn's unreviewed changes", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  project.callHook("UserPromptSubmit");
  changeSource(project);
  project.callHook("SessionStart", { source: "compact" });
  project.callHook("SessionStart", { source: "resume" });
  assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
  project.callHook("UserPromptSubmit", { prompt: "지금 뭐가 남았어?" });
  assert.match(project.callHook("Stop").systemMessage, /이번 턴은 코드 변경 없음.*미해결/);
  assert.equal(project.callCli("check").status, 1);
});

test("stop_hook_active never bypasses; repeated failure terminates with unresolved status, CLI still fails", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  changeSource(project);
  assert.equal(project.callHook("Stop", { stop_hook_active: true }).decision, "block");
  assert.equal(project.callHook("Stop", { stop_hook_active: true }).decision, "block");
  const result = project.callHook("Stop", { stop_hook_active: true });
  assert.equal(result.continue, false);
  assert.match(result.stopReason, /검증 미해결 \(통과 아님\)/);
  assert.equal(project.callCli("check").status, 1);
});

test("register switches to /start worktree while hooks retain original cwd, and survives resume", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  const worktree = join(project.directory, "new worktree");
  runGit(project.root, "worktree", "add", "-b", "task", worktree);
  assert.equal(project.callCli("register", [worktree]).status, 0);
  writeFile(worktree, "source.ts", "export const value = 2;\n");
  assert.match(project.callHook("Stop").reason, /new worktree/);
  const review = project.beginReview();
  assert.equal(review.result.worktree, worktree);
  project.finishReview(review);
  assert.match(project.callHook("Stop").systemMessage, /완료/);
  writeFile(worktree, "source.ts", "export const value = 3;\n");
  project.callHook("SessionStart", { source: "resume" });
  assert.equal(project.callCli("register", [worktree]).status, 0);
  assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
});

test("review from a different actual git tree cannot satisfy the registered target", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  changeSource(project);
  const other = join(project.directory, "other-worktree");
  runGit(project.root, "worktree", "add", "-b", "other", other);
  const review = project.beginReview();
  project.finishReview(review, {}, { cwd: other });
  assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
});

test("existing declaration edits, deletion-only and pure rename each require review", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  rmSync(join(project.root, "removed.ts"));
  assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
  project.finishReview(project.beginReview());
  assert.match(project.callHook("Stop").systemMessage, /완료/);
  runGit(project.root, "mv", "renamed.ts", "new name.ts");
  assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
});

test("opt-in scope includes harness behavior and ignores non-selected notes", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  writeFile(project.root, "notes.md", "read-only notes\n");
  assert.deepEqual(project.callHook("Stop"), {});
  writeFile(project.root, "skills/start/SKILL.md", "change behavior\n");
  assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
});

test("pure rename without git add does not introduce an existing export again", (context) => {
  const project = createProject(context);
  writeFile(project.root, "untracked rename.ts", readFileSync(join(project.root, "renamed.ts")));
  rmSync(join(project.root, "renamed.ts"));
  const result = run(process.execPath, [collector, "main"], { cwd: project.root });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /R100.*renamed.ts → untracked rename.ts/);
  assert.doesNotMatch(result.stdout, /\| runRename \|/);
  assert.match(result.stdout, /새 파일 0/);
});

test("lint changing the source cannot validate its previous snapshot", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  writeFile(project.root, ".lstack.json", JSON.stringify({ ...project.config,
    lint: [process.execPath, "-e", "require('node:fs').appendFileSync('source.ts', '\\n// changed by lint')"] }));
  project.finishReview(project.beginReview());
  assert.match(project.callHook("Stop").reason, /lint 실행 중 코드가 바뀌었습니다/);
});

test("repeated execution errors stop with an explicit failure and never make PR check pass", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  writeFile(project.root, ".lstack.json", "invalid JSON");
  assert.equal(project.callHook("Stop").decision, "block");
  assert.equal(project.callHook("Stop", { stop_hook_active: true }).decision, "block");
  assert.match(project.callHook("Stop", { stop_hook_active: true }).stopReason, /검증 미해결/);
  assert.equal(project.callCli("check").status, 1);
});

test("resume followed by a read-only prompt reports interrupted unverified code", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  changeSource(project);
  project.callHook("SessionStart", { source: "resume" });
  project.callHook("UserPromptSubmit", { prompt: "상태가 뭐야?" });
  assert.match(project.callHook("Stop").systemMessage, /이전 턴의 코드 변경이 아직 검증되지/);
  assert.equal(project.callCli("check").status, 1);
});

test("a project opting in during the session cannot bypass by deleting its config", (context) => {
  const project = createProject(context);
  rmSync(join(project.root, ".lstack.json"));
  assert.deepEqual(project.callHook("SessionStart"), {});
  assert.deepEqual(project.callHook("Stop"), {});
  writeFile(project.root, ".lstack.json", JSON.stringify(project.config));
  changeSource(project);
  assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
  rmSync(join(project.root, ".lstack.json"));
  assert.match(project.callHook("Stop").reason, /사라졌습니다/);
  assert.equal(project.callCli("check").status, 1);
});

test("unconfigured git and non-git sessions leave the hooks inert", (context) => {
  const project = createProject(context);
  rmSync(join(project.root, ".lstack.json"));
  for (const cwd of [project.root, project.directory]) {
    for (const event of ["SessionStart", "UserPromptSubmit", "SubagentStart", "SubagentStop", "Stop"]) {
      assert.deepEqual(project.callHook(event, { cwd, session_id: `unconfigured-${cwd}` }), {});
    }
  }
});

test("null or malformed first opt-in remains failed even if the config is removed", (context) => {
  const project = createProject(context);
  rmSync(join(project.root, ".lstack.json"));
  project.callHook("SessionStart");
  writeFile(project.root, ".lstack.json", "null");
  assert.match(project.callHook("Stop").reason, /형식 오류/);
  rmSync(join(project.root, ".lstack.json"));
  assert.match(project.callHook("Stop").reason, /사라졌습니다/);
  assert.equal(project.callCli("check").status, 1);
});

test("user steering before Stop preserves unverified changes without blocking a read-only question", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  project.callHook("UserPromptSubmit");
  changeSource(project);
  const prompt = project.callHook("UserPromptSubmit", { prompt: "지금 상태만 알려줘" });
  assert.match(prompt.hookSpecificOutput.additionalContext, /검증 미해결.*check/);
  const result = project.callHook("Stop");
  assert.equal(result.decision, undefined);
  assert.match(result.systemMessage, /이전 lstack 검증은 미해결/);
  assert.throws(() => readFileSync(project.countPath));
  project.callHook("UserPromptSubmit", { prompt: "남은 작업이 뭐야?" });
  assert.match(project.callHook("Stop").systemMessage, /검증은 미해결/);
  assert.equal(project.callCli("check").status, 1);
  project.finishReview(project.beginReview());
  assert.equal(project.callCli("check").status, 0);
  project.callHook("UserPromptSubmit", { prompt: "결과를 설명해줘" });
  assert.match(project.callHook("Stop").systemMessage, /검토 완료/);
  assert.doesNotMatch(project.callHook("Stop").systemMessage, /미해결/);
});

test("restoring reviewed worktree content cannot hide a different staged version or reuse approval", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  changeSource(project);
  project.finishReview(project.beginReview());
  assert.match(project.callHook("Stop").systemMessage, /검토 완료/);
  changeSource(project, 999);
  runGit(project.root, "add", "source.ts");
  changeSource(project);
  const index = runGit(project.root, "show", ":source.ts");
  const collection = run(process.execPath, [collector, "main"], { cwd: project.root });
  assert.equal(collection.status, 1);
  assert.match(collection.stderr, /부분 staged.*인덱스는 자동 수정하지 않습니다/);
  assert.match(project.callHook("Stop").reason, /부분 staged/);
  assert.equal(project.callCli("check").status, 1);
  const review = project.beginReview("partial-review");
  assert.equal(review.result, null);
  assert.equal(runGit(project.root, "show", ":source.ts"), index);
  assert.equal(readFileSync(project.countPath, "utf8"), "run\n");
});

for (const isIgnored of [false, true]) test(`staged deletion followed by ${isIgnored ? "ignored" : "untracked"} restoration fails before lint or review`, (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  runGit(project.root, "rm", "source.ts");
  if (isIgnored) writeFile(project.root, ".gitignore", "source.ts\n");
  changeSource(project, 1);
  const collection = run(process.execPath, [collector, "main"], { cwd: project.root });
  assert.equal(collection.status, 1);
  assert.match(collection.stderr, /source.ts.*부분 staged/);
  assert.match(project.callHook("Stop").reason, /부분 staged/);
  assert.equal(project.callCli("check").status, 1);
  assert.equal(runGit(project.root, "ls-files", "--stage", "--", "source.ts"), "");
  assert.throws(() => readFileSync(project.countPath));
});

test("staged and unstaged changes in different files still collect and verify", (context) => {
  const project = createProject(context);
  project.callHook("SessionStart");
  changeSource(project);
  runGit(project.root, "add", "source.ts");
  writeFile(project.root, "removed.ts", "export const removed = 2;\n");
  const index = runGit(project.root, "diff", "--cached");
  const collection = run(process.execPath, [collector, "main"], { cwd: project.root });
  assert.equal(collection.status, 0, collection.stderr);
  assert.match(collection.stdout, /source.ts/);
  assert.match(collection.stdout, /removed.ts/);
  project.finishReview(project.beginReview());
  assert.match(project.callHook("Stop").systemMessage, /검토 완료/);
  assert.equal(project.callCli("check").status, 0);
  assert.equal(runGit(project.root, "diff", "--cached"), index);
});

test("partially staged files outside the configured scope do not block that scope", (context) => {
  const project = createProject(context, { include: ["scripts/**"] });
  project.callHook("SessionStart");
  changeSource(project, 999);
  runGit(project.root, "add", "source.ts");
  changeSource(project, 1);
  writeFile(project.root, "scripts/new.ts", "export const amount = 1;\n");
  project.finishReview(project.beginReview());
  assert.match(project.callHook("Stop").systemMessage, /검토 완료/);
  assert.equal(project.callCli("check").status, 0);
  assert.match(runGit(project.root, "show", ":source.ts"), /999/);
});

for (const [pattern, file] of [["scripts/**", "scripts/new\nfile.ts"], ["scripts/**/*.ts", "scripts/new\nfolder/file.ts"]]) {
  test(`${pattern} includes newline paths in actual Stop and review snapshots`, (context) => {
    const project = createProject(context, { include: [pattern] });
    project.callHook("SessionStart");
    writeFile(project.root, file, "export const amount = 1;\n");
    assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
    const review = project.beginReview();
    project.finishReview(review);
    assert.match(project.callHook("Stop").systemMessage, /검토 완료/);
    writeFile(project.root, file, "export const amount = 2;\n");
    assert.match(project.callHook("Stop").reason, /fresh structure-reviewer/);
  });
}
