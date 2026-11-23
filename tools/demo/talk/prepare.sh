#!/usr/bin/env bash
# Prepares the demo project for the talk, the same way every time, and puts it back the way it was when you want to run the demos again.
#
#   MODEL_A=<first local model> MODEL_B=<second local model> ./prepare.sh [-y]
#
# What it makes, under $TALK_DIR (default ~/talk):
#   support-demo/   the agent for the demos: a web chat, two model profiles (fast and planner), usage recording on, built.
#                   It has no tools/ and no skills/ yet: demo 2 adds them live from demo-files/.
#   demo-files/     the one tool and the one skill that demo 2 copies in
#   live/           an empty folder to run the wizard in for demo 1
#
# What it deletes first: $TALK_DIR/support-demo and the agent's data home (conversations, notes, usage), so every run starts clean.
# It asks before deleting. -y skips the question.
#
# Settings (environment variables):
#   MODEL_A, MODEL_B   required: two models your local server has, the first for "fast" and the second for "planner"
#   PROVIDER           the bx-ai provider of both, default ollama (others: docker-model-runner, openai-compatible)
#   TALK_DIR           where to make things, default ~/talk
#   BXAGENTS_HOME      the agent's data home, if you set it for the agent; default ~/.bxagents/support-demo

set -euo pipefail

: "${MODEL_A:?Set MODEL_A to the first local model, one that supports tool calling}"
: "${MODEL_B:?Set MODEL_B to the second local model, to switch to in demo 1}"
PROVIDER="${PROVIDER:-ollama}"
TALK_DIR="${TALK_DIR:-$HOME/talk}"
NAME="support-demo"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$TALK_DIR/$NAME"
DATA="${BXAGENTS_HOME:-$HOME/.bxagents/$NAME}"

command -v bxAgents >/dev/null 2>&1 || { echo "bxAgents is not on PATH. Install the module first (install-bx-module bx-agents)." >&2; exit 1; }

# Never delete anything that is not clearly the demo's own
case "$TALK_DIR" in ""|"/"|"$HOME") echo "TALK_DIR must be a folder of its own, not '$TALK_DIR'." >&2; exit 1 ;; esac
[ "$(basename "$PROJECT")" = "$NAME" ] || { echo "Refusing to delete '$PROJECT'." >&2; exit 1; }
case "$DATA" in ""|"/"|"$HOME") echo "The data home must be a folder of its own, not '$DATA'." >&2; exit 1 ;; esac

echo "This will delete, if they exist:"
echo "  $PROJECT"
echo "  $DATA"
if [ "${1:-}" != "-y" ]; then
	read -r -p "Go ahead? [y/N] " answer
	[ "$answer" = "y" ] || { echo "Nothing changed."; exit 0; }
fi

rm -rf -- "$PROJECT" "$DATA"
mkdir -p "$TALK_DIR/live"
rm -rf -- "$TALK_DIR/demo-files"
cp -R "$HERE/demo-files" "$TALK_DIR/demo-files"

cd "$TALK_DIR"
bxAgents new "$NAME" --model="$PROVIDER/$MODEL_A" --skipInstall

cd "$PROJECT"
bxAgents add gateway web --auth=open --yes

cat >> Agent.yml <<YAML

# For the demos: the date and time tool, two local models to switch between with /profile, and usage recording for the usage page
tools:
  - now@bxai

profiles:
  fast:
    description: Quick answers
    provider: $PROVIDER
    model: $MODEL_A
  planner:
    description: Careful answers
    provider: $PROVIDER
    model: $MODEL_B
usage: true
YAML

bxAgents build

echo
echo "Ready."
echo "  Demo 1:  cd $TALK_DIR/live && bxAgents new live-demo      (the wizard), then cd $PROJECT && bxAgents chat"
echo "  Demo 2:  cp -R $TALK_DIR/demo-files/. $PROJECT/ && cd $PROJECT && bxAgents build && bxAgents chat"
echo "  Demo 3:  cd $PROJECT && bxAgents serve --port=8080"
