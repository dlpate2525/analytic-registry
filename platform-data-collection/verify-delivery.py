"""Verify the empty V1 workbook, import contract, and bundled source files. No live connections."""
from pathlib import Path
import csv
import json
import re
import zipfile
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parent
extract = root / "v1-extract"
contract = json.loads((extract / "workbook-contract.json").read_text(encoding="utf8"))
layouts = json.loads((extract / "platform-output-layouts.json").read_text(encoding="utf8"))
ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
assert len(contract) == 9
assert sum(len(table["columns"]) for table in contract) == 117
assert len(layouts) == 3 and sum(len(layout["sections"]) for layout in layouts) == 28

with zipfile.ZipFile(extract / "analytic-registry-v1-extract.xlsx") as workbook:
    assert workbook.testzip() is None
    for name in workbook.namelist():
        if name.endswith(".xml"):
            ET.fromstring(workbook.read(name))
    book = ET.fromstring(workbook.read("xl/workbook.xml"))
    expected = ["Guide", "Source_Map", "Column_Dictionary"]
    expected += [table["sheet"] for table in contract] + [layout["tabName"] for layout in layouts]
    assert [sheet.attrib["name"] for sheet in book.findall("m:sheets/m:sheet", ns)] == expected
    strings = []
    if "xl/sharedStrings.xml" in workbook.namelist():
        strings = ["".join(item.itertext()) for item in ET.fromstring(workbook.read("xl/sharedStrings.xml"))]

    def value(cell):
        entry = cell.find("m:v", ns)
        if cell.get("t") == "s":
            return strings[int(entry.text)]
        if cell.get("t") == "inlineStr":
            return "".join(cell.find("m:is", ns).itertext())
        return entry.text if entry is not None else None

    for index, table in enumerate(contract, 4):
        sheet = ET.fromstring(workbook.read(f"xl/worksheets/sheet{index}.xml"))
        cells = sheet.findall("m:sheetData/m:row/m:c", ns)
        headers = [value(cell) for cell in cells if re.fullmatch("[A-Z]+1", cell.attrib["r"])]
        assert headers == [column["name"] for column in table["columns"]], table["sheet"]
        assert not any(value(cell) for cell in cells if not re.fullmatch("[A-Z]+1", cell.attrib["r"])), table["sheet"]
    for name in workbook.namelist():
        if name.startswith("xl/worksheets/") and name.endswith(".xml"):
            sheet = ET.fromstring(workbook.read(name))
            assert not sheet.findall(".//m:f", ns), name
            assert not any(cell.get("t") == "e" for cell in sheet.findall(".//m:c", ns)), name

with (extract / "column-dictionary.csv").open(encoding="utf8", newline="") as source:
    dictionary = {(row["Table"], row["Column"]): row for row in csv.DictReader(source)}
assert len(dictionary) == 117
for table in contract:
    with (extract / "csv-headers" / table["file"]).open(encoding="utf8", newline="") as source:
        assert next(csv.reader(source)) == [column["name"] for column in table["columns"]]
    for column in table["columns"]:
        row = dictionary[table["sheet"], column["name"]]
        assert row["SQLType"] == column["type"] and row["Purpose"] == column["purpose"]
        assert 0 < len(column["purpose"].split()) < 200

bundle = root / "analytic-registry-platform-data-pack.zip"
files = {str(file.relative_to(root)).replace("\\", "/"): file for file in root.rglob("*")
         if file.is_file() and file != bundle and not any(part.startswith(".") or part == "__pycache__" for part in file.relative_to(root).parts)}
with zipfile.ZipFile(bundle) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == set(files), "Collection ZIP file list differs from source"
    for name, file in files.items():
        assert archive.read(name) == file.read_bytes(), f"Stale collection ZIP member: {name}"
print(f"Delivery verified: 15 sheets, 9 blank tables, 117 columns, 28 output sections; {len(files)} ZIP members match source.")
