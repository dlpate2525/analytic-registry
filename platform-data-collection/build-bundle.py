"""Rebuild the downloadable collection ZIP from this folder using Python 3."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent
target = root / "analytic-registry-platform-data-pack.zip"
files = sorted(file for file in root.rglob("*") if file.is_file() and file != target
               and not any(part.startswith(".") or part == "__pycache__" for part in file.relative_to(root).parts))
with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for file in files:
        entry = zipfile.ZipInfo(file.relative_to(root).as_posix(), date_time=(2026, 10, 8, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        archive.writestr(entry, file.read_bytes())
print(f"Built {target.name}: {len(files)} source files.")
