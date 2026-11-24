#!/usr/bin/env bash
# Zips the course kit (tools/course/kit) into docs/assets/course/bxagents-course-kit.zip, with the folder name `kit`.
# The docs workflow runs it before `bxSites build`; the zip is a build output and is not committed.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
out="$repo/docs/assets/course"
mkdir -p "$out"
rm -f "$out/bxagents-course-kit.zip"
cp "$repo/tools/demo/fakellm.bxs" "$here/kit/fakellm.bxs"
(cd "$here" && zip -qr "$out/bxagents-course-kit.zip" kit -x 'kit/.*')
echo "Wrote $out/bxagents-course-kit.zip"
