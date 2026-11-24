#!/usr/bin/env bash
# Puts acme-support/ back to the state a lesson of the course leaves it in.
#
#   kit/resume.sh <lesson>        for example: kit/resume.sh 09-giving-your-agent-tools
#   kit/resume.sh                 lists the lessons
#   kit/resume.sh <lesson> -y     does not ask first
#
# It replaces the files of the project (Agent.yml, instructions.md, tools/, skills/ and the other convention
# folders) with the checkpoint of that lesson, or of the last lesson before it that changed the project.
# It never touches .build/, lib/, .env's secrets in your data home, or your agent's data home (~/.bxagents).
# Rebuild afterwards: bxAgents build
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project="$(dirname "$here")/acme-support"
order="$here/checkpoints/ORDER"
stem="${1:-}"

if [ -z "$stem" ]; then
	echo "Usage: kit/resume.sh <lesson> [-y]"
	echo "Lessons, in course order:"
	sed 's/^/  /' "$order"
	exit 1
fi
grep -qx -- "$stem" "$order" || { echo "No lesson called '$stem'. Run kit/resume.sh to list them." >&2; exit 1; }

found=""
while IFS= read -r s; do
	[ -d "$here/checkpoints/$s" ] && found="$s"
	[ "$s" = "$stem" ] && break
done < "$order"
[ -n "$found" ] || { echo "No lesson up to '$stem' changes the project, so there is nothing to restore." >&2; exit 1; }

echo "This replaces the project files in $project"
echo "with the state after the lesson '$found'."
if [ "${2:-}" != "-y" ]; then
	read -r -p "Go ahead? [y/N] " answer
	[ "$answer" = "y" ] || { echo "Nothing changed."; exit 0; }
fi

mkdir -p "$project"
dirs="tools skills subagents gateways schedules mcp interceptors extensions tests modules"
for d in $dirs; do rm -rf -- "${project:?}/$d"; done
cp -R "$here/checkpoints/$found/." "$project/"
for d in tools skills subagents gateways schedules mcp interceptors modules; do mkdir -p "$project/$d"; done
echo "Done. Now rebuild: cd acme-support && bxAgents build"
