#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(dirname "$script_dir")
source_file="$repo_root/docs/spec/PRINCIPLE.md"
runtime_file="$repo_root/skills/start/references/PRINCIPLE.md"
skill_file="$repo_root/skills/start/SKILL.md"

if ! cmp -s "$source_file" "$runtime_file"; then
  printf '%s\n' \
    'skills/start/references/PRINCIPLE.md is out of sync.' \
    'Run: npm run sync:start-principle' >&2
  exit 1
fi

if ! grep -Fq 'references/PRINCIPLE.md' "$skill_file"; then
  printf '%s\n' \
    'skills/start/SKILL.md does not load the bundled PRINCIPLE.md.' >&2
  exit 1
fi
