#!/bin/sh
# Retakes the terminal screenshots and GIFs in docs/assets/tui from the current terminal chat and wizard, in one command:
#
#   tools/demo/terminal/docs-shots.sh [scene,scene]     from the repository root, after ./gradlew downloadBoxLang shadowJar
#
# It records docs-scenes.json under a pseudo terminal with the scripted model (trailer/record.bxs --cast-only), then draws the stills and
# GIFs from the recordings (docs-shots.bxs). Port 8080 and 9300 must be free. The work folder is ui/.stack/tui-shots, with a short
# home (/tmp/dev-home) so the prompt and the paths on screen read ~/acme-support and not a path of this machine. `bxAgents inspect` and
# `doctor` for the two SVGs are made by tools/demo/terminal/cli-svgs.py.
set -e
root=$(cd "$(dirname "$0")/../../.." && pwd)
jar=$(ls "$root"/src/test/resources/libs/boxlang-[0-9]*.jar | tail -1)
work="$root/ui/.stack/tui-shots"
home=${DOCSHOTS_HOME:-/tmp/dev-home}
only=${1:+--only=$1}
case "$home" in */dev-home) ;; *) echo "DOCSHOTS_HOME must end in /dev-home (it is deleted first)"; exit 1;; esac
# a run of some scenes keeps the recordings of the others
[ -z "$1" ] && rm -rf "$work"
rm -rf "$home"
mkdir -p "$work" "$home"
boxlang() { java -cp "$jar" ortus.boxlang.runtime.BoxRunner "$@"; }
boxlang "$root/tools/demo/terminal/trailer/record.bxs" --boxlang-jar="$jar" --module="$root/build/modules/bx-agents" \
	--out="$work" --home="$home" --scenes="$root/tools/demo/terminal/docs-scenes.json" --cast-only --mail=9300 $only
boxlang "$root/tools/demo/terminal/docs-shots.bxs" --casts="$work/scenes" --out="$root/docs/assets/tui" --boxlang-jar="$jar" $only
# the two SVGs of the quick start and doctor, from the real output of bxAgents (not for a run of some scenes)
if [ -z "$1" ]; then python3 -I "$root/tools/demo/terminal/cli-svgs.py" "$home/bin/bxAgents" "$root/docs/assets"; fi
