"""Read-only V1.2 workbook verification using the Python standard library."""
from __future__ import annotations

import csv
import hashlib
import json
import posixpath
import re
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

BASE = Path(__file__).resolve().parent
FILE = BASE / "analytic-registry-v1.2-extract.xlsx"
CONTRACT = json.loads((BASE / "contract.json").read_text(encoding="utf-8"))
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
RID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
ERRORS = {"#REF!", "#DIV/0!", "#VALUE!", "#NAME?", "#N/A", "#NUM!", "#NULL!", "#SPILL!", "#CALC!"}


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def letter(index):
    result = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def resolve_part(source, target):
    return target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join(posixpath.dirname(source), target))


def source_url(table, platform):
    if table["sheet"] == "Directory_Users":
        return CONTRACT["sources"]["Directory"]
    if table["sheet"] in ("Run_Context", "Coverage"):
        return "https://github.com/dlpate2525/analytic-registry/tree/main/platform-data-collection/v1.1-extract"
    if platform == "PowerBI":
        return "https://github.com/dlpate2525/analytic-registry/blob/main/platform-data-collection/v1.1-extract/fabric-query-mapping.md"
    return CONTRACT["sources"][platform]


def schema_signature(contract):
    return [(table["sheet"], table["excelTable"], table["rowKey"],
             [(column["name"], column["type"], column["required"]) for column in table["columns"]])
            for table in contract["tables"]]


historical = json.loads((BASE.parent / "v1.1-extract/contract.json").read_text(encoding="utf-8"))
require(CONTRACT["version"] == historical["version"] == "1.1", "Input schema must remain 1.1")
require(schema_signature(CONTRACT) == schema_signature(historical), "Input schema differs from the historical 1.1 contract")
require(len(CONTRACT["tables"]) == 11, "Expected 11 input tables")
require(sum(len(table["columns"]) for table in CONTRACT["tables"]) == 72, "Expected 72 input headers")

dictionary_headers = ["Table", "Column", "SQL type", "Required", "Purpose"]
dictionary_rows = [[table["sheet"], column["name"], column["type"], column["required"], column["purpose"]]
                   for table in CONTRACT["tables"] for column in table["columns"]]
with (BASE / "column-dictionary.csv").open(encoding="utf-8", newline="") as handle:
    require(list(csv.reader(handle)) == [dictionary_headers, *dictionary_rows], "CSV dictionary differs from contract")

reference_cells = 0
input_headers = 0
with ZipFile(FILE) as archive:
    require(archive.testzip() is None, "Workbook ZIP integrity failure")
    names = set(archive.namelist())
    strings = []
    if "xl/sharedStrings.xml" in names:
        strings = ["".join(node.itertext()) for node in ET.fromstring(archive.read("xl/sharedStrings.xml"))]

    def cell_value(cell):
        if cell.attrib.get("t") == "inlineStr":
            return "".join(cell.find("s:is", NS).itertext())
        value = cell.findtext("s:v", default="", namespaces=NS)
        return strings[int(value)] if cell.attrib.get("t") == "s" and value else value

    def relationships(part):
        rel_part = posixpath.join(posixpath.dirname(part), "_rels", posixpath.basename(part) + ".rels")
        if rel_part not in names:
            return {}
        return {rel.attrib["Id"]: resolve_part(part, rel.attrib["Target"])
                for rel in ET.fromstring(archive.read(rel_part))}

    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    workbook_rels = relationships("xl/workbook.xml")
    sheets = {}
    tables = {}
    for sheet in workbook.find("s:sheets", NS):
        name = sheet.attrib["name"]
        part = workbook_rels[sheet.attrib[RID]]
        content = ET.fromstring(archive.read(part))
        cells = {cell.attrib["r"]: cell_value(cell) for cell in content.findall(".//s:sheetData/s:row/s:c", NS)}
        sheets[name] = cells
        for cell in content.findall(".//s:sheetData/s:row/s:c", NS):
            require(cell.attrib.get("t") != "e" and cell_value(cell) not in ERRORS, f"{name}!{cell.attrib['r']}: formula error")
            require(cell.find("s:f", NS) is None, f"{name}!{cell.attrib['r']}: unexpected formula in blank-input reference template")
        sheet_rels = relationships(part)
        for table_part in content.findall("s:tableParts/s:tablePart", NS):
            table = ET.fromstring(archive.read(sheet_rels[table_part.attrib[RID]]))
            table_name = table.attrib["name"]
            require(table_name not in tables, f"Duplicate named table {table_name}")
            tables[table_name] = (name, table)

    expected_sheets = ["Guide", "Column_Dictionary"] + [table["sheet"] for table in CONTRACT["tables"]] + ["Tableau_Output", "PowerBI_Output", "Alteryx_Output"]
    require(list(sheets) == expected_sheets, "Sheet names or order differ")
    require(len(sheets) == len(tables) == 16, "Expected 16 sheets and 16 named tables")
    require({name for name in tables if name.startswith("Tbl_")} == {table["excelTable"] for table in CONTRACT["tables"]}, "Unexpected input table names")

    def verify_table(name, sheet_name, header_row, headers, rows):
        global reference_cells
        owner, table = tables[name]
        require(owner == sheet_name, f"{name} is on the wrong sheet")
        saved_headers = [column.attrib["name"] for column in table.find("s:tableColumns", NS)]
        require(saved_headers == headers, f"{name}: table headers differ")
        expected_ref = f"A{header_row}:{letter(len(headers))}{header_row + len(rows)}"
        require(table.attrib["ref"] == expected_ref, f"{name}: expected range {expected_ref}")
        require(table.find("s:autoFilter", NS) is not None, f"{name}: missing table filter")
        for row_number, values in enumerate([headers, *rows], start=header_row):
            for column_number, expected in enumerate(values, start=1):
                address = f"{letter(column_number)}{row_number}"
                require(sheets[sheet_name].get(address, "") == str(expected), f"{sheet_name}!{address}: value differs from contract")
                reference_cells += 1
        for address, value in sheets[sheet_name].items():
            if int(re.sub(r"[A-Z]+", "", address)) > header_row + len(rows):
                require(value == "", f"{sheet_name}!{address}: unexpected extra content")

    for table in CONTRACT["tables"]:
        headers = [column["name"] for column in table["columns"]]
        verify_table(table["excelTable"], table["sheet"], 1, headers, [[""] * len(headers) for _ in range(5)])
        input_headers += len(headers)
        for address, value in sheets[table["sheet"]].items():
            if not re.fullmatch(r"[A-Z]+1", address):
                require(value == "", f"{table['sheet']}!{address}: input template must remain blank")
    verify_table("Ref_Column_Dictionary", "Column_Dictionary", 5, dictionary_headers, dictionary_rows)
    mapping_headers = ["Table", "Output column", "SQL type", "Collection rule", "Source", "Value rule", "Null rule", "Reference"]
    for platform in CONTRACT["platforms"]:
        rows = []
        for table in CONTRACT["tables"]:
            for column in table["columns"]:
                rule = column["platforms"][platform]
                rows.append([table["sheet"], column["name"], column["type"], rule["status"], rule["source"], rule["valueRule"], rule["nullRule"], source_url(table, platform)])
        verify_table(f"Ref_{platform}_Output", f"{platform}_Output", 5, mapping_headers, rows)
    require(sheets["Guide"]["A1"] == "Analytic Registry workbook V1.2", "Guide workbook version differs")
    require("schema 1.1" in sheets["Guide"]["A2"], "Guide must retain input schema 1.1")

print(json.dumps({"passed": True, "file": FILE.name, "sha256": hashlib.sha256(FILE.read_bytes()).hexdigest(),
                  "sheets": len(sheets), "namedTables": len(tables), "inputTables": 11, "inputHeaders": input_headers,
                  "blankInputRowsPerTable": 5, "dictionaryRows": len(dictionary_rows), "mappingRowsPerPlatform": 72,
                  "exactCellsCompared": reference_cells, "formulaErrors": 0, "historicalInputSchemaPreserved": True}, indent=2))
