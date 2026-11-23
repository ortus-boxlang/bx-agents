#!/usr/bin/env python3
"""Prints the numbers the docs state, counted from the source tree, so a page that says "36 slash
commands" or "82 routes" can be checked again after the code moves.

    python3 tools/docs-counts.py            # a table
    python3 tools/docs-counts.py --json     # the same as JSON

Every count comes from files in this repository, with no build and no runtime needed:

  verbs            a class per verb in models/cli (UserConfig is a helper, not a verb)
  slash commands   the classes in models/chat/commands/builtin (SwitchReport is a helper) plus the two
                   commands the extension system adds (/extensions and /reload, in models/extensions)
  api routes       ApiContract::route( ... ) entries; the two token routes are in the manageTokens block
  admin routes     the routes made with the admin flag set (the last argument is `true`)
  web pages        the page handlers of the ColdBox web app (bxagentsui/handlers, less the base and forwarder)
  gateway types    mock, cli, http plus the push types registered in GatewayTypes
  starters         the --template names in ProjectScaffolder
  connectors       the catalog files in catalog/connectors
  shipped skills   the folders in skills/
  deploy targets   the classes in models/deploy/targets (BaseFtpTarget is a helper)
  examples         the folders in examples/
  lessons          the lessons listed in docs/data/courses.yaml
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BX = ROOT / "src" / "main" / "bx"


def classes(folder, skip=()):
    return sorted(p.stem for p in folder.glob("*.bx") if p.stem not in skip)


def routes():
    """(in_token_block, is_admin) for each route( call"""
    text = (BX / "models" / "api" / "ApiContract.bx").read_text()
    tokens_at = text.index("manageTokens ?: false")
    tokens_end = text.index('ApiContract::route( "/openapi"')
    starts = [m.start() for m in re.finditer(r"ApiContract::route\(", text)]
    found = []
    for i, start in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else len(text)
        found.append((tokens_at < start < tokens_end, bool(re.search(r"false,\s*true\s*\)", text[start:end]))))
    return found


def count():
    found = routes()
    total = len(found)
    without_tokens = sum(1 for t, _ in found if not t)
    admin_total = sum(1 for _, a in found if a)
    admin_without = sum(1 for t, a in found if a and not t)

    template_text = (BX / "models" / "build" / "ProjectScaffolder.bx").read_text()
    templates = re.search(r"TEMPLATES\s*=\s*\[(.*?)\]", template_text, re.S)
    gateways = (BX / "models" / "gateways" / "GatewayTypes.bx").read_text()
    push = re.findall(r"\{\s*type\s*:\s*\"([a-z-]+)\"", gateways)
    push += re.findall(r"type\s*:\s*\"([a-z-]+)\",\s*\n\s*class", gateways)
    lessons = re.findall(r"^\s+- course/\d+", (ROOT / "docs" / "data" / "courses.yaml").read_text(), re.M)

    return {
        "verbs": len(classes(BX / "models" / "cli", skip=("UserConfig",))),
        "slash commands": len(classes(BX / "models" / "chat" / "commands" / "builtin", skip=("SwitchReport",)))
        + len([p for p in ("ExtensionsCommand.bx", "ReloadCommand.bx") if (BX / "models" / "extensions" / p).exists()]),
        "api routes": total,
        "api routes without manageTokens": without_tokens,
        "admin routes": admin_total,
        "admin routes without manageTokens": admin_without,
        "web pages": len(classes(BX / "bxagentsui" / "handlers", skip=("BaseHandler", "Forward"))),
        "gateway types": 3 + len(set(push)),
        "starters": len(re.findall(r"\"[a-z-]+\"", templates.group(1))) if templates else 0,
        "connectors": len(list((BX / "catalog" / "connectors").glob("*.yml"))),
        "shipped skills": len([p for p in (BX / "skills").iterdir() if p.is_dir()]),
        "deploy targets": len(classes(BX / "models" / "deploy" / "targets", skip=("BaseFtpTarget",))),
        "examples": len([p for p in (ROOT / "examples").iterdir() if p.is_dir()]),
        "lessons": len(lessons),
    }


if __name__ == "__main__":
    counts = count()
    if "--json" in sys.argv:
        print(json.dumps(counts, indent=2))
    else:
        width = max(len(k) for k in counts)
        for key, value in counts.items():
            print(f"{key.ljust(width)}  {value}")
