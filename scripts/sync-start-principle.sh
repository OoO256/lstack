#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(dirname "$script_dir")
runtime_dir="$repo_root/skills/start/references"

mkdir -p "$runtime_dir"
cp "$repo_root/docs/spec/PRINCIPLE.md" \
  "$runtime_dir/PRINCIPLE.md"
