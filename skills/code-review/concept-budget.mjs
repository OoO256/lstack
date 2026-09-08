#!/usr/bin/env node
// 변경 목록과 새 이름 후보를 수집한다. 사용처 수는 판정이 아니다.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readlinkSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const codePattern = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|py|go|rs|java|kt|rb)$/;
const testPattern = /(?:^|\/)(?:__tests__|tests)\/|\.(test|spec)\.[cm]?[jt]sx?$/;
const exportPattern = /^\s*export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(abstract\s+class|function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm;

export function runGit(cwd, ...args) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"],
  });
}

export function resolveWorktree(cwd) {
  return realpathSync(runGit(cwd, "rev-parse", "--show-toplevel").trim());
}

export function hashValue(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function matchesPath(file, pattern) {
  let expression = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      index += 1;
      if (pattern[index + 1] === "/") { expression += "(?:.*/)?"; index += 1; }
      else expression += ".*";
    } else if (character === "*") expression += "[^/]*";
    else if (character === "?") expression += "[^/]";
    else expression += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${expression}$`, "s").test(file);
}

function isReviewFile(file) {
  return codePattern.test(file) || /^agents\/.*\.md$/s.test(file)
    || /^skills\/(?:.*\/)?SKILL\.md$/s.test(file) || /^hooks\/.*\.json$/s.test(file);
}

function readCurrent(cwd, file) {
  try {
    const path = join(cwd, file);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) return { mode: "symlink", content: readlinkSync(path) };
    if (!stat.isFile()) throw new Error(`검사할 수 없는 파일 종류: ${file}`);
    return { mode: stat.mode & 0o111 ? "executable" : "file", content: readFileSync(path) };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function parseStatus(output) {
  const fields = output.split("\0");
  const changes = [];
  for (let index = 0; index < fields.length - 1;) {
    const status = fields[index++];
    const first = fields[index++];
    if (!status || first === undefined) throw new Error("git 변경 목록 형식 오류");
    const hasSource = /^[RC]/.test(status);
    const file = hasSource ? fields[index++] : first;
    if (file === undefined) throw new Error("git 개명 목록 형식 오류");
    changes.push({ status, file, ...(hasSource ? { oldFile: first } : {}) });
  }
  return changes;
}

export function readChanges(cwd, base = "origin/main", include) {
  const root = resolveWorktree(cwd);
  const from = runGit(root, "merge-base", base, "HEAD").trim();
  const conflicts = runGit(root, "ls-files", "-u", "-z");
  if (conflicts) throw new Error("해결되지 않은 git 충돌이 있습니다");
  const isIncluded = (file) => include ? include.some((pattern) => matchesPath(file, pattern)) : isReviewFile(file);
  const untrackedFiles = runGit(root, "ls-files", "--others", "--exclude-standard", "-z").split("\0").filter(Boolean);
  const stagedChanges = parseStatus(runGit(root, "diff", "--cached", "--name-status", "--no-renames", "-z", "--"));
  const unstagedFiles = new Set([...runGit(root, "diff", "--name-only", "--no-renames", "-z", "--").split("\0").filter(Boolean), ...untrackedFiles]);
  for (const change of stagedChanges) {
    // 삭제 후 복원된 경로는 .gitignore에 걸리면 untracked 목록에도 나오지 않는다.
    if (change.status === "D" && isIncluded(change.file) && readCurrent(root, change.file)) unstagedFiles.add(change.file);
  }
  const partialFiles = stagedChanges.map(({ file }) => file).filter((file) => unstagedFiles.has(file) && isIncluded(file));
  if (partialFiles.length) throw new Error(`검사 범위에 같은 파일의 staged와 unstaged/untracked 변경이 함께 있습니다: ${partialFiles.map((file) => JSON.stringify(file)).join(", ")}. 부분 staged 상태를 직접 정리한 뒤 다시 검사하세요. 인덱스는 자동 수정하지 않습니다`);
  const changes = parseStatus(runGit(root, "diff", "--name-status", "-z", "--find-renames", from, "--"));
  const tracked = new Set(changes.map(({ file }) => file));
  for (const file of untrackedFiles) {
    if (!tracked.has(file)) changes.push({ status: "A", file });
  }
  // git diff는 아직 index에 없는 이동 대상을 모른다. 내용이 같은 삭제+untracked만 순수 개명으로 묶는다.
  const deletions = new Map();
  for (const change of changes.filter(({ status }) => status === "D")) {
    const content = execFileSync("git", ["-C", root, "show", `${from}:${change.file}`], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] });
    const digest = hashValue(content);
    const matches = deletions.get(digest) ?? [];
    matches.push(change);
    deletions.set(digest, matches);
  }
  for (const change of changes.filter(({ status }) => status === "A")) {
    const current = readCurrent(root, change.file);
    const previous = current && deletions.get(hashValue(current.content))?.shift();
    if (previous) {
      change.status = "R100";
      change.oldFile = previous.file;
      previous.status = "renamed";
    }
  }
  const selected = changes.filter(({ status, file, oldFile }) => {
    if (status === "renamed") return false;
    const paths = oldFile ? [file, oldFile] : [file];
    return paths.some(isIncluded);
  }).sort((left, right) => left.file.localeCompare(right.file));
  return { root, from, changes: selected };
}

export function readSnapshot(cwd, config) {
  const result = readChanges(cwd, config.base, [...config.include, ".lstack.json"]);
  const entries = result.changes.map((change) => {
    const current = readCurrent(result.root, change.file);
    return [change, current?.mode ?? null, current ? hashValue(current.content) : null];
  });
  return { ...result, snapshot: hashValue(JSON.stringify([result.from, config, entries])) };
}

function readExports(content) {
  return [...content.toString().matchAll(exportPattern)].map((match) => ({
    kind: match[1].replace("abstract class", "class"), name: match[2],
  }));
}

function readCandidates(result) {
  const rows = [];
  for (const change of result.changes) {
    if (!codePattern.test(change.file) || change.status === "D") continue;
    const current = readCurrent(result.root, change.file);
    if (!current || current.mode === "symlink") continue;
    const previous = change.status === "A" ? "" : runGit(result.root, "show", `${result.from}:${change.oldFile ?? change.file}`);
    const names = new Set(readExports(previous).map(({ name }) => name));
    for (const candidate of readExports(current.content)) {
      if (!names.has(candidate.name)) rows.push({ ...candidate, file: change.file });
    }
  }
  return rows;
}

function countUses(candidate, sources) {
  const hasCalls = ["function", "class"].includes(candidate.kind);
  const name = candidate.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![\\w$])${name}${hasCalls ? "\\s*\\(" : "(?![\\w$])"}`);
  const files = [...sources].filter(([file, source]) => file !== candidate.file && pattern.test(source)).map(([file]) => file);
  return { production: files.filter((file) => !testPattern.test(file)).length,
    test: files.filter((file) => testPattern.test(file)).length, unit: hasCalls ? "호출 후보" : "참조 후보" };
}

function formatCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", "\\n").replaceAll("\r", "\\r").replaceAll("\t", "\\t");
}

function printReport(base) {
  const result = readChanges(process.cwd(), base);
  const files = runGit(result.root, "ls-files", "--cached", "--others", "--exclude-standard", "-z").split("\0").filter(Boolean);
  const sources = new Map();
  for (const file of new Set(files.filter((file) => codePattern.test(file)))) {
    const current = readCurrent(result.root, file);
    if (current && current.mode !== "symlink") sources.set(file, current.content.toString());
  }
  const rows = readCandidates(result).map((candidate) => ({ ...candidate, ...countUses(candidate, sources) }));
  const newFiles = result.changes.filter(({ status }) => status === "A").map(({ file }) => file);
  const baseDirs = new Set(runGit(result.root, "ls-tree", "-r", "--name-only", "-z", result.from).split("\0").filter(Boolean).map(dirname));
  const newDirs = [...new Set(newFiles.map(dirname).filter((dir) => dir !== "." && !baseDirs.has(dir)))];
  console.log(`## 변경과 새 이름 후보 (base: ${base})\n`);
  console.log(`- 변경 파일 ${result.changes.length} · 새 파일 ${newFiles.length} · 새 디렉토리 ${newDirs.length} · 새 export ${rows.length}`);
  console.log("\n| 변경 | 경로 |\n|---|---|");
  for (const change of result.changes) console.log(`| ${change.status} | ${formatCell(change.oldFile ? `${change.oldFile} → ${change.file}` : change.file)} |`);
  if (newDirs.length) console.log(`\n새 디렉토리: ${newDirs.map(formatCell).join(" · ")}`);
  console.log("\n| 이름 | 종류 | 위치 | 프로덕션 | 테스트 |\n|---|---|---|---|---|");
  for (const row of rows) console.log(`| ${row.name} | ${row.kind} | ${formatCell(row.file)} | ${row.unit} ${row.production}곳 | ${row.test}곳 |`);
  console.log("\n사용처 수는 후보이며 결론이 아니다. 삭제·개명·기존 선언 변경과 Markdown/Hook 동작도 직접 읽는다. export 추출과 사용처 검색은 문법·문자열 근사라 재export·구조분해·별칭·동적 호출은 놓칠 수 있다.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { printReport(process.argv[2] ?? "origin/main"); }
  catch (error) { console.error(`변경 수집 실패: ${error.message}`); process.exitCode = 1; }
}
