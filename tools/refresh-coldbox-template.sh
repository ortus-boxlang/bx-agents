#!/usr/bin/env bash
# Re-vendors the ColdBox BoxLang application template into src/main/bx/templates/coldbox-boxlang
# and shows what changed. The build copies from that folder, never from the network; this script is the
# only thing that reaches upstream, and it is run by a person who then reviews the diff.
#
#   tools/refresh-coldbox-template.sh [--ref <branch|tag|commit>]     (default: development)
#
# Only the runtime-relevant files are vendored (see FILES). The one change made to what upstream ships is
# the whitespace line of runtime/boxlang.json (see PATCH_FROM / PATCH_TO); the script refuses to continue
# unless that line exists exactly once, and prints the diff against upstream so the patch stays visible.
set -euo pipefail

REPO_URL="https://github.com/coldbox-templates/boxlang"
REF="development"
while [ $# -gt 0 ]; do
	case "$1" in
		--ref) REF="$2"; shift 2 ;;
		-h|--help) sed -n 2,12p "$0"; exit 0 ;;
		*) echo "unknown argument: $1" >&2; exit 2 ;;
	esac
done

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$HERE/src/main/bx/templates/coldbox-boxlang"
FILES=(
	app/Application.bx
	public/Application.bx
	public/index.bxm
	public/favicon.ico
	public/robots.txt
	public/includes/images/ColdBoxLogo2015_300.png
	public/includes/i18n/i18n_goes_here.txt
	runtime/boxlang.json
)
PATCH_FILE="runtime/boxlang.json"
PATCH_FROM='"whitespaceCompressionEnabled": true,'
PATCH_TO='"whitespaceCompressionEnabled": false,'

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone --quiet "$REPO_URL" "$WORK/upstream"
git -C "$WORK/upstream" checkout --quiet "$REF"
COMMIT="$(git -C "$WORK/upstream" rev-parse HEAD)"
TAG="$(git -C "$WORK/upstream" describe --tags --exact-match HEAD 2>/dev/null || true)"
LATEST_TAG="$(git -C "$WORK/upstream" tag --sort=-v:refname | head -n 1)"
UPSTREAM_VERSION="$(sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$WORK/upstream/box.json" | head -n 1)"

for f in "${FILES[@]}"; do
	[ -f "$WORK/upstream/$f" ] || { echo "upstream no longer has $f: update FILES in this script and the build that reads it" >&2; exit 1; }
done
[ "$(grep -cF "$PATCH_FROM" "$WORK/upstream/$PATCH_FILE")" = "1" ] || { echo "upstream $PATCH_FILE no longer has the line [$PATCH_FROM] exactly once: re-check the patch" >&2; exit 1; }

BEFORE="$WORK/before"
mkdir -p "$BEFORE"
[ -d "$DEST" ] && cp -a "$DEST/." "$BEFORE/"

for f in "${FILES[@]}"; do
	mkdir -p "$DEST/$(dirname "$f")"
	cp "$WORK/upstream/$f" "$DEST/$f"
done
# one line, so the engine's output filter never touches a hand-written event stream (see AGENTS.md, Server-Sent Events)
sed -i "s|$PATCH_FROM|$PATCH_TO|" "$DEST/$PATCH_FILE"
diff -u "$WORK/upstream/$PATCH_FILE" "$DEST/$PATCH_FILE" > "$WORK/patch.diff" || true
[ "$(grep -c '^[-+][^-+]' "$WORK/patch.diff")" = "2" ] || { echo "the patch changed more than one line:" >&2; cat "$WORK/patch.diff" >&2; exit 1; }

cat > "$DEST/VERSION" <<VER
source:   $REPO_URL
version:  ${UPSTREAM_VERSION:-unknown} (box.json of the vendored commit)
tag:      ${TAG:-none (this commit carries no tag; the latest tag upstream is ${LATEST_TAG:-none})}
commit:   $COMMIT
ref:      $REF
patch:    $PATCH_FILE, one line: $PATCH_FROM -> $PATCH_TO
refresh:  tools/refresh-coldbox-template.sh
VER

echo "vendored $REPO_URL @ $COMMIT (version ${UPSTREAM_VERSION:-unknown}, tag ${TAG:-none}) into ${DEST#"$HERE/"}"
echo
echo "--- change to the vendored folder (empty means nothing changed upstream) ---"
diff -ru "$BEFORE" "$DEST" || true
echo
echo "--- the one patched line, against upstream ---"
cat "$WORK/patch.diff"
