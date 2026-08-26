from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "review_artifacts" / "reverse_engineering_inventory.json"

TEXT_EXTS = {".ts", ".tsx", ".js", ".mjs", ".json", ".sql", ".md", ".css", ".html"}
EXCLUDE_PARTS = {"node_modules", ".git", "dist", "coverage"}


def files():
    for p in ROOT.rglob("*"):
        if p.is_file() and not (set(p.parts) & EXCLUDE_PARTS) and p.suffix in TEXT_EXTS:
            yield p


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def read(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""


def line_no(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


all_files = list(files())
by_ext = Counter(p.suffix or "[no extension]" for p in all_files)
by_top = Counter(rel(p).split("/", 1)[0] for p in all_files)

routes = []
for p in all_files:
    if p.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
        continue
    t = read(p)
    for m in re.finditer(r"<Route\s+path=\{?[\"']([^\"']+)[\"']\}?", t):
        routes.append({"path": m.group(1), "file": rel(p), "line": line_no(t, m.start())})

trpc = []
for p in all_files:
    if p.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
        continue
    t = read(p)
    for m in re.finditer(r"(?:trpc|api)\.([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)", t):
        trpc.append({"symbol": m.group(1), "file": rel(p), "line": line_no(t, m.start())})

procedures = []
for p in all_files:
    if p.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
        continue
    t = read(p)
    for m in re.finditer(r"([A-Za-z][A-Za-z0-9_]*)\s*:\s*(publicProcedure|protectedProcedure|adminProcedure)(?:\.input\([^\n]*\))?\.(query|mutation|subscription)", t):
        procedures.append({"name": m.group(1), "guard": m.group(2), "kind": m.group(3), "file": rel(p), "line": line_no(t, m.start())})

schema_tables = []
schema = ROOT / "drizzle" / "schema.ts"
schema_text = read(schema)
for m in re.finditer(r"export\s+const\s+(\w+)\s*=\s*mysqlTable\(", schema_text):
    schema_tables.append({"name": m.group(1), "line": line_no(schema_text, m.start())})

schema_enums = []
for m in re.finditer(r"export\s+const\s+(\w+)\s*=\s*mysqlEnum\(", schema_text):
    schema_enums.append({"name": m.group(1), "line": line_no(schema_text, m.start())})

env_vars = defaultdict(list)
for p in all_files:
    if p.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
        continue
    t = read(p)
    for m in re.finditer(r"process\.env\.([A-Z][A-Z0-9_]*)", t):
        env_vars[m.group(1)].append({"file": rel(p), "line": line_no(t, m.start())})
    for m in re.finditer(r"process\.env\[['\"]([A-Z][A-Z0-9_]*)['\"]\]", t):
        env_vars[m.group(1)].append({"file": rel(p), "line": line_no(t, m.start())})

imports = defaultdict(list)
for p in all_files:
    if p.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
        continue
    t = read(p)
    for m in re.finditer(r"import\s+(?:[\s\S]*?)?\s+from\s+[\"']([^\"']+)[\"']", t):
        imports[rel(p)].append(m.group(1))
    for m in re.finditer(r"import\s*[\(]?\s*[\"']([^\"']+)[\"']", t):
        imports[rel(p)].append(m.group(1))

exports = defaultdict(list)
for p in all_files:
    if p.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
        continue
    t = read(p)
    for m in re.finditer(r"export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+(\w+)", t):
        exports[rel(p)].append(m.group(1))

components = []
for p in all_files:
    if p.suffix not in {".tsx", ".jsx"}:
        continue
    t = read(p)
    names = sorted(set(re.findall(r"(?:export\s+(?:default\s+)?)?(?:function|const)\s+([A-Z][A-Za-z0-9_]*)", t)))
    if names:
        components.append({"file": rel(p), "symbols": names})

api_endpoints = []
for p in all_files:
    if p.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
        continue
    t = read(p)
    for m in re.finditer(r"app\.(get|post|put|patch|delete)\(\s*[\"'`]([^\"'`]+)", t, re.I):
        api_endpoints.append({"method": m.group(1).upper(), "path": m.group(2), "file": rel(p), "line": line_no(t, m.start())})
    for m in re.finditer(r"(?:router|expressRouter)\.(get|post|put|patch|delete)\(\s*[\"'`]([^\"'`]+)", t, re.I):
        api_endpoints.append({"method": m.group(1).upper(), "path": m.group(2), "file": rel(p), "line": line_no(t, m.start())})

statuses = []
for p in all_files:
    if p.suffix not in {".ts", ".tsx", ".js", ".mjs"}:
        continue
    t = read(p)
    for m in re.finditer(r"(?:status|stage|role)\s*[:=]\s*[\"']([a-zA-Z0-9_-]+)[\"']", t):
        statuses.append({"value": m.group(1), "file": rel(p), "line": line_no(t, m.start())})

out = {
    "root": str(ROOT),
    "file_count": len(all_files),
    "by_extension": dict(by_ext),
    "by_top_level": dict(by_top),
    "routes": routes,
    "trpc_references": trpc,
    "procedures": procedures,
    "schema_tables": schema_tables,
    "schema_enums": schema_enums,
    "env_vars": {k: v for k, v in sorted(env_vars.items())},
    "imports": dict(imports),
    "exports": dict(exports),
    "components": components,
    "api_endpoints": api_endpoints,
    "status_literals": statuses,
}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {OUT}")
print(json.dumps({k: out[k] for k in ["file_count", "by_extension", "by_top_level"]}, ensure_ascii=False, indent=2))
print(f"routes={len(routes)} procedures={len(procedures)} tables={len(schema_tables)} components_files={len(components)} env_vars={len(env_vars)}")
