from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
text = (root / "docs" / "reverse_engineering.md").read_text(encoding="utf-8")
blocks = re.findall(r"```mermaid\n(.*?)\n```", text, flags=re.S)
out = root / "review_artifacts" / "mermaid_blocks"
out.mkdir(parents=True, exist_ok=True)
for i, block in enumerate(blocks, 1):
    (out / f"block_{i:02d}.mmd").write_text(block + "\n", encoding="utf-8")
print(f"extracted={len(blocks)} directory={out}")
