from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROUTERS = ROOT / "server" / "routers.ts"
OUT = ROOT / "review_artifacts" / "api_inventory.json"

text = ROUTERS.read_text(encoding="utf-8", errors="replace")
lines = text.splitlines()

namespaces = []
current = None
for i, line in enumerate(lines, 1):
    m = re.match(r"^  ([A-Za-z][A-Za-z0-9_]*): router\(\{", line)
    if m:
        current = {"namespace": m.group(1), "line": i, "procedures": []}
        namespaces.append(current)
        continue
    if current and line.startswith("  ") and not line.startswith("    ") and line.strip() in {"}),", "})"}:
        current = None
        continue
    if current:
        p = re.match(r"^    ([A-Za-z][A-Za-z0-9_]*): (publicProcedure|protectedProcedure|adminProcedure)", line)
        if p:
            kind = "unknown"
            input_hint = "none shown"
            for follow in lines[i:min(i + 40, len(lines))]:
                km = re.search(r"\.(query|mutation|subscription)\b", follow)
                if km:
                    kind = km.group(1)
                    break
            for follow in lines[i:min(i + 20, len(lines))]:
                if ".input(" in follow:
                    input_hint = "zod input"
                    break
            current["procedures"].append({"name": p.group(1), "guard": p.group(2), "kind": kind, "input": input_hint, "line": i})

frontend_calls = []
for p in (ROOT / "client" / "src").rglob("*"):
    if p.suffix not in {".ts", ".tsx"}:
        continue
    t = p.read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(r"trpc\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)", t):
        frontend_calls.append({
            "namespace": m.group(1),
            "procedure": m.group(2),
            "file": p.relative_to(ROOT).as_posix(),
            "line": t.count("\n", 0, m.start()) + 1,
        })

http_endpoints = []
for p in [ROOT / "server" / "_core" / "index.ts", ROOT / "server" / "_core" / "oauth.ts"]:
    t = p.read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(r"app\.(get|post|put|patch|delete)\(\s*[\"'`]([^\"'`]+)", t, re.I):
        http_endpoints.append({
            "method": m.group(1).upper(),
            "path": m.group(2),
            "file": p.relative_to(ROOT).as_posix(),
            "line": t.count("\n", 0, m.start()) + 1,
        })

out = {"namespaces": namespaces, "frontend_calls": frontend_calls, "http_endpoints": http_endpoints}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"namespaces={len(namespaces)} procedures={sum(len(n['procedures']) for n in namespaces)} frontend_calls={len(frontend_calls)} http_endpoints={len(http_endpoints)}")
for n in namespaces:
    print(f"{n['namespace']}: {len(n['procedures'])} procedures")
