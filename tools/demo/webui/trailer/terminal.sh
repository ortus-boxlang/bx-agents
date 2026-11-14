#!/bin/bash
# Writes the text the trailer's terminal scene types: the real output of three commands against the seeded demo app.
#   BXAGENTS="bxAgents" BXAGENTS_HOME=<data home> BXAGENTS_DB=<chat.db> URL=http://127.0.0.1:8791 TOKEN=adminsecret ./terminal.sh > out/terminal.txt
# (BXAGENTS is the command that runs bxAgents in the project folder, for example "boxlang module:bxagents" from inside it.)
BX="${BXAGENTS:-bxAgents}"
URL="${URL:-http://127.0.0.1:8791}"
clean() { sed -E 's/\x1b\[[0-9;]*[A-Za-z]//g'; }
echo '$ bxAgents notes list --scope=agent'
$BX notes list --scope=agent 2>&1 | clean | head -6
echo
echo '$ bxAgents routines list --all'
$BX routines list --all 2>&1 | clean | sed -E 's/^[0-9a-f]{8}-[0-9a-f]{4}-//' | head -5
echo
echo '$ curl -s -H "x-bxagents-token: $TOKEN" "$URL/__bxagents/sessions?limit=2"'
curl -s -H "x-bxagents-token: ${TOKEN:-adminsecret}" "$URL/__bxagents/sessions?limit=2&all=1" | python3 -I -c '
import json,sys
d=json.load(sys.stdin)
print(json.dumps({"total":d["total"],"sessions":[{"title":s["title"],"agent":s["agent"],"messages":s["messageCount"]} for s in d["sessions"]]},indent=2))'
