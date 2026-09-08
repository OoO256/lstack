#!/usr/bin/env node
// 현재 변경의 프로젝트 lint 성공과 실제 structure-reviewer 완료를 확인한다.
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  hashValue,
  readSnapshot,
  resolveWorktree,
} from "../../skills/reviewer/scripts/collect-review-changes.mjs";

const stateDirectory =
  process.env.LSTACK_STATE_DIR ?? join(tmpdir(), `lstack-${process.getuid?.() ?? "local"}`);
const reviewerTypes = new Set(["structure-reviewer", "lstack:structure-reviewer"]);
const resultPrefix = "LSTACK_STRUCTURE_REVIEW ";

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function writeJson(path, value) {
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
  renameSync(temporary, path);
}

function openSessionState(sessionId) {
  if (typeof sessionId !== "string" || !sessionId.trim())
    throw new Error("LSTACK_SESSION_ID/session_id가 없습니다. SessionStart hook를 확인하세요");
  const directory = join(stateDirectory, hashValue(sessionId));
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return { id: sessionId, directory, path: join(directory, "session.json") };
}

function readProjectConfig(root) {
  const path = join(root, ".lstack.json");
  if (!existsSync(path)) return null;
  const config = readJson(path);
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error(".lstack.json 형식 오류: base, include, lint, review를 가진 객체가 필요합니다");
  }
  if (Object.keys(config).some((key) => !["base", "include", "lint", "review"].includes(key))) {
    throw new Error(".lstack.json 형식 오류: base, include, lint, review 외 필드는 지원하지 않습니다");
  }
  if (typeof config.base !== "string" || !config.base.trim() || config.base.startsWith("-")) {
    throw new Error(".lstack.json 형식 오류: base에 비교할 git ref를 명시하세요");
  }
  if (
    !Array.isArray(config.include) ||
    !config.include.length ||
    !config.include.every(
      (pattern) =>
        typeof pattern === "string" &&
        pattern.length > 0 &&
        !pattern.startsWith("/") &&
        !pattern.split("/").includes("..") &&
        !/[\0\\[\]{}]/.test(pattern),
    )
  ) {
    throw new Error(".lstack.json 형식 오류: include에 상대 경로 glob 배열을 명시하세요 (*, **, ? 지원)");
  }
  if (
    !Array.isArray(config.lint) ||
    !config.lint.length ||
    !config.lint.every((argument) => typeof argument === "string" && !argument.includes("\0")) ||
    !config.lint[0].trim()
  ) {
    throw new Error(".lstack.json 형식 오류: lint에 실행할 명령과 인자의 argv 배열을 명시하세요");
  }
  if (!["report", "enforce"].includes(config.review)) {
    throw new Error(".lstack.json 형식 오류: review는 report 또는 enforce여야 합니다");
  }
  return config;
}

function hasProjectConfig(cwd) {
  let directory = resolve(cwd);
  while (true) {
    if (existsSync(join(directory, ".lstack.json"))) return true;
    const parent = dirname(directory);
    if (parent === directory || existsSync(join(directory, ".git"))) return false;
    directory = parent;
  }
}

function loadCheckTarget(session, eventCwd) {
  let registry = readJson(session.path);
  const root = registry?.worktree ?? resolveWorktree(eventCwd);
  const path = join(session.directory, `tree-${hashValue(root)}.json`);
  const state = readJson(path) ?? {
    root,
    turnSnapshot: null,
    acceptedSnapshot: null,
    lintSnapshot: null,
    blockCount: 0,
  };
  const hasConfig = existsSync(join(root, ".lstack.json"));
  if (hasConfig && !registry) {
    registry = { sessionId: session.id, sessionRoot: resolveWorktree(eventCwd), worktree: root };
    writeJson(session.path, registry);
  }
  if (hasConfig && !state.isOptedIn) {
    state.isOptedIn = true;
    writeJson(path, state);
  }
  const config = readProjectConfig(root);
  if (!config && state.isOptedIn)
    throw new Error("등록한 .lstack.json이 사라졌습니다. 검증을 통과한 것으로 처리하지 않습니다");
  return { root, path, state, config, registry };
}

function registerWorktree(session, root, sessionRoot) {
  const registry = readJson(session.path);
  writeJson(session.path, {
    sessionId: session.id,
    sessionRoot: registry?.sessionRoot ?? sessionRoot,
    worktree: root,
  });
  const previous = readJson(join(session.directory, `tree-${hashValue(root)}.json`));
  const target = loadCheckTarget(session, root);
  if (!previous) {
    const snapshot = target.config ? readSnapshot(root, target.config).snapshot : null;
    Object.assign(target.state, { turnSnapshot: snapshot, isOptedIn: Boolean(target.config) });
    writeJson(target.path, target.state);
  }
  return target;
}

function emitHookContext(event, message) {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: message } }));
}

function recordFailedCheck(target, reason, key) {
  target.state.blockCount = target.state.failureKey === key ? target.state.blockCount + 1 : 1;
  target.state.failureKey = key;
  target.state.unresolvedReason = reason;
  writeJson(target.path, target.state);
  if (target.state.blockCount >= 3) {
    return {
      continue: false,
      stopReason: `lstack 검증 미해결 (통과 아님): ${reason}`,
      systemMessage: `lstack 검증 미해결 (통과 아님): ${reason}`,
    };
  }
  return {
    decision: "block",
    reason: [
      reason,
      "승인된 변경 범위에서 원인을 해결·검토한 뒤 다시 완료하세요. 검사 범위는 수정 권한이 아닙니다.",
      "기존 부채나 범위 밖 문제는 보고하며, 검사 시스템 도입만 승인됐다면 서비스 코드·제품 테스트를 수정하지 마세요.",
      "같은 미해결 상태 3회면 실패를 명시하고 중단합니다.",
    ].join("\n"),
  };
}

function readCompletedReviews(session, root, snapshot) {
  return readdirSync(session.directory)
    .filter((name) => name.startsWith("agent-") && name.endsWith(".json"))
    .map((name) => readJson(join(session.directory, name)))
    .filter(
      (review) =>
        review.sessionId === session.id &&
        review.root === root &&
        review.snapshot === snapshot &&
        review.endSnapshot === snapshot &&
        review.phase === "finished" &&
        !review.isInvalid &&
        reviewerTypes.has(review.agentType) &&
        review.result?.mode === "diff",
    )
    .sort((left, right) => right.finishedAt - left.finishedAt);
}

function formatFindings(review) {
  return review.result.findings
    .map(
      (finding) =>
        `[${finding.severity}] ${finding.location} · 소비자: ${finding.consumer}\n${finding.problem}\n수정: ${finding.change}`,
    )
    .join("\n");
}

function checkLintAndReview(session, target, isExplicitCheck) {
  if (!target.config) return { isPassed: true, output: {} };
  const { snapshot, changes } = readSnapshot(target.root, target.config);
  const hasTurnChanges = snapshot !== target.state.turnSnapshot;
  if (!isExplicitCheck && !hasTurnChanges && target.state.acceptedSnapshot !== snapshot) {
    return {
      isPassed: false,
      isSkipped: true,
      output: target.state.unresolvedReason
        ? {
            systemMessage: `이번 턴은 코드 변경 없음. 이전 lstack 검증은 미해결: ${target.state.unresolvedReason}`,
          }
        : {},
    };
  }
  if (!changes.length) return { isPassed: true, output: {} };
  const failCheck = (reason, kind) => ({
    isPassed: false,
    output: recordFailedCheck(target, reason, `${snapshot}:${kind}`),
  });

  if (target.state.lintSnapshot !== snapshot) {
    const [lintCommand, ...lintArgs] = target.config.lint;
    const lintResult = spawnSync(lintCommand, lintArgs, {
      cwd: target.root,
      encoding: "utf8",
      timeout: 120_000,
      maxBuffer: 2 ** 20,
      env: { ...process.env, LSTACK_BASE: target.config.base },
    });
    if (lintResult.error || lintResult.signal || lintResult.status !== 0) {
      const failureReason = lintResult.error?.message ?? lintResult.signal ?? `exit ${lintResult.status}`;
      return failCheck(
        [
          `lint 실패/실행 오류 (${JSON.stringify(target.config.lint)}): ${failureReason}`,
          (lintResult.stdout ?? "").slice(-6000),
          (lintResult.stderr ?? "").slice(-6000),
        ].join("\n"),
        "lint",
      );
    }
    if (readSnapshot(target.root, target.config).snapshot !== snapshot) {
      return failCheck(
        "lint 실행 중 코드가 바뀌었습니다. 현재 코드로 검증을 다시 실행하세요",
        "lint-changed",
      );
    }
    target.state.lintSnapshot = snapshot;
    writeJson(target.path, target.state);
  }

  const latestReview = readCompletedReviews(session, target.root, snapshot)[0];
  if (!latestReview) {
    return failCheck(
      [
        "현재 변경에 대한 fresh structure-reviewer diff 검토 완료가 없습니다.",
        'Agent(subagent_type="lstack:structure-reviewer")를 새 context로 실행하세요.',
        "기존 agent resume와 설계 검토는 인정하지 않습니다.",
        `대상: ${target.root}`,
        `base: ${target.config.base}`,
        `snapshot: ${snapshot}`,
        "사용자 목표·확정 요구와 변경 목록을 전달하고, 실제 파일·소비자를 읽게 하세요.",
      ].join("\n"),
      "review",
    );
  }
  if (readSnapshot(target.root, target.config).snapshot !== snapshot) {
    return failCheck("검증 중 코드가 바뀌었습니다. 현재 변경을 다시 검토하세요", "verification-changed");
  }

  const findings = formatFindings(latestReview);
  if (
    target.config.review === "enforce" &&
    latestReview.result.findings.some((finding) => finding.severity === "blocker")
  ) {
    return failCheck(
      [
        "구조 블로커를 수정하고 새 reviewer로 다시 검토하세요.",
        "수정은 승인된 변경 범위에 한정하며, 범위 밖 문제는 미해결로 보고하세요.",
        findings,
      ].join("\n"),
      "blocker",
    );
  }
  if (findings && target.state.reportedSnapshot !== snapshot) {
    target.state.reportedSnapshot = snapshot;
    writeJson(target.path, target.state);
    return {
      isPassed: true,
      output: {
        decision: "block",
        reason: [
          "구조 검토 결과를 사용자에게 보고하세요.",
          target.config.review === "report"
            ? "report 모드이므로 의미적 지적은 관찰·보고만 합니다. 지적을 근거로 기존 서비스 코드·제품 테스트까지 수정 범위를 넓히지 마세요."
            : "비블로커입니다.",
          findings,
        ].join("\n"),
      },
    };
  }

  Object.assign(target.state, {
    acceptedSnapshot: snapshot,
    blockCount: 0,
    unresolvedReason: null,
    failureKey: null,
  });
  writeJson(target.path, target.state);
  return {
    isPassed: true,
    output: {
      systemMessage: `lstack lint + fresh 구조 diff 검토 완료 (${target.config.review})${findings ? `\n${findings}` : ""}`,
    },
  };
}

function recordReviewStart(session, target, input) {
  if (!target.config || !reviewerTypes.has(input.agent_type)) return;
  if (typeof input.agent_id !== "string" || !input.agent_id) throw new Error("SubagentStart agent_id 누락");
  const hookRoot = resolveWorktree(input.cwd);
  if (![target.root, target.registry?.sessionRoot].includes(hookRoot))
    throw new Error("reviewer가 등록한 작업 tree 밖에서 시작했습니다");
  const path = join(session.directory, `agent-${hashValue(input.agent_id)}.json`);
  if (readJson(path)) {
    writeJson(path, { ...readJson(path), isInvalid: true });
    emitHookContext(
      "SubagentStart",
      "이 agent_id는 이미 사용됐습니다. fresh diff 검토 증거로 인정되지 않습니다. 새 reviewer를 시작하세요.",
    );
    return;
  }
  const current = readSnapshot(target.root, target.config);
  writeJson(path, {
    phase: "started",
    sessionId: session.id,
    agentId: input.agent_id,
    agentType: input.agent_type,
    root: target.root,
    hookRoot,
    snapshot: current.snapshot,
  });
  const example = {
    mode: "diff",
    worktree: target.root,
    snapshot: current.snapshot,
    status: "complete",
    findings: [],
  };
  emitHookContext(
    "SubagentStart",
    [
      `lstack 구조 검토 대상: ${target.root}`,
      `base: ${target.config.base}`,
      `검사 경로: ${JSON.stringify(target.config.include)}`,
      "반드시 이 절대경로의 실제 변경과 소비자를 읽으세요. 구현자의 정당화를 정답으로 취급하지 마세요.",
      "검사 범위는 수정 권한이 아닙니다. 기존 부채는 보고 대상으로 남기고, 현재 변경이 새로 만들거나 악화한 문제만 blocker로 판단하세요.",
      "검사 시스템 도입만 승인됐다면 서비스 코드·제품 테스트 정리를 요구하지 마세요.",
      "마지막 응답에 다음 형식의 한 줄을 포함하세요:",
      `${resultPrefix}${JSON.stringify(example)}`,
      "설계만 검토한 요청이면 mode를 design으로 바꾸세요. diff 검토는 설계를 대체하지 않습니다.",
      'findings 항목은 {severity: "blocker" 또는 "advisory", location: "path:line", consumer: "실제 소비자", problem: "근거", change: "구체적 수정"}입니다.',
      '검토 미완료·오류는 status: "error"로 보고하세요. 파일을 수정하거나 결과 파일을 직접 쓰지 마세요.',
    ].join("\n"),
  );
}

function recordReviewResult(session, target, input) {
  if (!target.config || !reviewerTypes.has(input.agent_type)) return;
  if (typeof input.agent_id !== "string" || !input.agent_id) throw new Error("SubagentStop agent_id 누락");
  const path = join(session.directory, `agent-${hashValue(input.agent_id)}.json`);
  const review = readJson(path);
  if (!review) return;
  try {
    if (
      review.isInvalid ||
      review.phase !== "started" ||
      review.sessionId !== session.id ||
      review.agentId !== input.agent_id ||
      review.agentType !== input.agent_type ||
      review.root !== target.root ||
      review.hookRoot !== resolveWorktree(input.cwd) ||
      typeof input.agent_transcript_path !== "string" ||
      !input.agent_transcript_path ||
      typeof input.last_assistant_message !== "string"
    )
      throw new Error("reviewer 시작/종료 이벤트 불일치");
    const lines = input.last_assistant_message.split(/\r?\n/).filter((line) => line.startsWith(resultPrefix));
    if (lines.length !== 1) throw new Error("구조 리뷰 결과 한 줄이 없거나 중복됐습니다");
    const result = JSON.parse(lines[0].slice(resultPrefix.length));
    const endSnapshot = readSnapshot(target.root, target.config).snapshot;
    if (
      !["design", "diff"].includes(result.mode) ||
      result.status !== "complete" ||
      result.worktree !== review.root ||
      result.snapshot !== review.snapshot ||
      endSnapshot !== review.snapshot ||
      !Array.isArray(result.findings) ||
      !result.findings.every(
        (finding) =>
          finding &&
          ["blocker", "advisory"].includes(finding.severity) &&
          ["location", "consumer", "problem", "change"].every(
            (key) => typeof finding[key] === "string" && finding[key].trim(),
          ),
      )
    ) {
      throw new Error("구조 리뷰 미완료·형식 오류 또는 검토 중 코드 변경");
    }
    writeJson(path, {
      ...review,
      phase: "finished",
      endSnapshot,
      result,
      finishedAt: Date.now(),
      transcript: input.agent_transcript_path,
    });
  } catch (error) {
    writeJson(path, { ...review, isInvalid: true, error: error.message });
    console.log(JSON.stringify({ systemMessage: `lstack 구조 검토 증거 무효: ${error.message}` }));
  }
}

function handleSessionStart(session, registry, input) {
  if (process.env.CLAUDE_ENV_FILE) {
    appendFileSync(
      process.env.CLAUDE_ENV_FILE,
      `export LSTACK_SESSION_ID='${session.id.replaceAll("'", "'\\''")}'\n`,
    );
  }
  if (!registry && !hasProjectConfig(input.cwd)) return;
  const target = registerWorktree(
    session,
    registry?.worktree ?? resolveWorktree(input.cwd),
    resolveWorktree(input.cwd),
  );
  if (!target.config) return;
  const snapshot = readSnapshot(target.root, target.config).snapshot;
  if (target.state.turnSnapshot !== snapshot && target.state.acceptedSnapshot !== snapshot) {
    target.state.unresolvedReason ??= "이전 턴의 코드 변경이 아직 검증되지 않았습니다";
    writeJson(target.path, target.state);
  }
  emitHookContext(
    "SessionStart",
    [
      `lstack lint·구조 리뷰 확인: ${target.root}.`,
      '/start 후 새 worktree에서는 node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/check-lint-and-review.mjs" register "<절대경로>"를 구현 전에 실행하세요.',
      "compact/resume는 기존 검사 기준을 유지합니다.",
    ].join("\n"),
  );
}

function recordTurnStart(target) {
  if (!target.config) return;
  const snapshot = readSnapshot(target.root, target.config).snapshot;
  if (target.state.turnSnapshot !== snapshot && target.state.acceptedSnapshot !== snapshot) {
    target.state.unresolvedReason ??= "이전 턴의 코드 변경이 아직 검증되지 않았습니다";
  }
  target.state.turnSnapshot = snapshot;
  target.state.blockCount = 0;
  target.state.failureKey = null;
  writeJson(target.path, target.state);
  if (target.state.unresolvedReason) {
    emitHookContext(
      "UserPromptSubmit",
      [
        `lstack 검증 미해결: ${target.state.unresolvedReason}.`,
        "구현 완료를 보고하려면 check-lint-and-review.mjs check로 현재 변경을 검증하세요.",
        "읽기전용 질문이면 미해결 사실을 유지해서 설명하세요.",
      ].join(" "),
    );
  }
}

function handleHookEvent(input) {
  const session = openSessionState(input.session_id);
  const registry = readJson(session.path);
  if (input.hook_event_name === "SessionStart") return handleSessionStart(session, registry, input);
  if (!registry && !hasProjectConfig(input.cwd)) return;
  const target = loadCheckTarget(session, input.cwd);
  switch (input.hook_event_name) {
    case "UserPromptSubmit":
      return recordTurnStart(target);
    case "SubagentStart":
      return recordReviewStart(session, target, input);
    case "SubagentStop":
      return recordReviewResult(session, target, input);
    case "Stop":
      console.log(JSON.stringify(checkLintAndReview(session, target, false).output));
  }
}

function runCliCommand(command) {
  if (command === "register") {
    if (!process.argv[3]) throw new Error("register <worktree 절대경로>가 필요합니다");
    const session = openSessionState(process.env.LSTACK_SESSION_ID);
    const target = registerWorktree(
      session,
      resolveWorktree(process.argv[3]),
      resolveWorktree(process.cwd()),
    );
    console.log(
      `lstack 검사 대상 등록: ${target.root}${target.config ? "" : " (.lstack.json 없음, opt-in 전)"}`,
    );
  } else if (command === "check") {
    const session = openSessionState(process.env.LSTACK_SESSION_ID);
    const result = checkLintAndReview(session, loadCheckTarget(session, process.cwd()), true);
    console.log(JSON.stringify(result.output));
    if (!result.isPassed) process.exitCode = 1;
  } else {
    throw new Error(`알 수 없는 명령: ${command}`);
  }
}

function reportExecutionFailure(error, hookInput) {
  const reason = `lstack 검증 실행 오류 (통과 아님): ${error.message}`;
  if (process.argv[2]) {
    console.error(reason);
    process.exitCode = 1;
  } else if (hookInput?.hook_event_name === "Stop") {
    try {
      const session = openSessionState(hookInput.session_id);
      const root = readJson(session.path)?.worktree ?? resolveWorktree(hookInput.cwd);
      const path = join(session.directory, `tree-${hashValue(root)}.json`);
      const state = readJson(path) ?? { root, blockCount: 0 };
      console.log(JSON.stringify(recordFailedCheck({ path, state }, reason, "execution-error")));
    } catch {
      console.log(JSON.stringify({ continue: false, stopReason: reason, systemMessage: reason }));
    }
  } else if (hookInput?.hook_event_name) {
    // SessionStart/SubagentStart는 block을 지원하지 않는다. 오류를 드러내고 Stop이 재검증한다.
    emitHookContext(hookInput.hook_event_name, reason);
  } else console.log(JSON.stringify({ continue: false, stopReason: reason, systemMessage: reason }));
}

let hookInput;
try {
  const command = process.argv[2];
  if (command) runCliCommand(command);
  else {
    hookInput = JSON.parse(readFileSync(0, "utf8"));
    handleHookEvent(hookInput);
  }
} catch (error) {
  reportExecutionFailure(error, hookInput);
}
