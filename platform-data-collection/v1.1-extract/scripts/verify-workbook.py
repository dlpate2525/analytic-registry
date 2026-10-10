"""Read-only verification of the saved V1.1 workbook against its JSON contract."""
from __future__ import annotations

import hashlib
import json
import posixpath
import re
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

base = Path(__file__).resolve().parents[1]
file = base / 'analytic-registry-v1.1-extract.xlsx'
contract = json.loads((base / 'contract.json').read_text(encoding='utf-8'))
migration = json.loads((base / 'migration-map.json').read_text(encoding='utf-8'))
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
rels_ns = {'p': 'http://schemas.openxmlformats.org/package/2006/relationships'}
checks = []
with ZipFile(file) as archive:
    assert archive.testzip() is None, 'ZIP integrity failure'
    workbook = ET.fromstring(archive.read('xl/workbook.xml'))
    rels = {rel.attrib['Id']: rel.attrib['Target'] for rel in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
    string_part = ET.fromstring(archive.read('xl/sharedStrings.xml')) if 'xl/sharedStrings.xml' in archive.namelist() else None
    strings = [''.join(node.itertext()) for node in string_part] if string_part is not None else []

    def cell_value(cell):
        if cell.attrib.get('t') == 'inlineStr':
            return ''.join(cell.find('s:is', ns).itertext())
        value = cell.findtext('s:v', default='', namespaces=ns)
        return strings[int(value)] if cell.attrib.get('t') == 's' and value else value

    sheets = {}
    table_total = 0
    formula_total = 0
    for sheet in workbook.find('s:sheets', ns):
        target = rels[sheet.attrib['{'+ns['r']+'}id']]
        sheet_path = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/' + target)
        content = ET.fromstring(archive.read(sheet_path))
        sheets[sheet.attrib['name']] = content
        formula_total += len(content.findall('.//s:f', ns))
        table_total += len(content.findall('.//s:tablePart', ns))
    expected_names = ['Guide', 'Column_Dictionary', 'Migration_Map'] + [table['sheet'] for table in contract['tables']] + ['Tableau_Output', 'PowerBI_Output', 'Alteryx_Output']
    assert list(sheets) == expected_names, list(sheets)
    assert len(sheets) == 17 and table_total == 17
    all_tables = {table.attrib['name']: table for name in archive.namelist() if re.fullmatch(r'xl/tables/table\d+\.xml', name) for table in [ET.fromstring(archive.read(name))]}
    assert len(all_tables) == 17
    populated_input_cells = 0
    header_count = 0
    for table in contract['tables']:
        saved_table = all_tables[table['excelTable']]
        headers = [column.attrib['name'] for column in saved_table.find('s:tableColumns', ns)]
        assert headers == [column['name'] for column in table['columns']], table['sheet']
        assert saved_table.find('s:autoFilter', ns) is not None, table['sheet']
        header_count += len(headers)
        content = sheets[table['sheet']]
        for cell in content.findall('.//s:sheetData/s:row/s:c', ns):
            row = int(re.sub(r'[A-Z]+', '', cell.attrib['r']))
            if row > 1 and cell_value(cell) != '':
                populated_input_cells += 1
        assert content.find('s:sheetViews/s:sheetView/s:pane', ns) is not None, table['sheet']
        checks.append({'sheet': table['sheet'], 'table': table['excelTable'], 'headers': len(headers), 'range': saved_table.attrib['ref']})
    assert header_count == 72
    assert populated_input_cells == 0
    assert formula_total == 0
    def column_letter(index):
        result = ''
        while index:
            index, remainder = divmod(index - 1, 26)
            result = chr(65 + remainder) + result
        return result

    def source_url(table, platform):
        if table['sheet'] == 'Directory_Users':
            return contract['sources']['Directory']
        if table['sheet'] in ('Run_Context', 'Coverage'):
            return 'https://github.com/dlpate2525/analytic-registry/tree/main/platform-data-collection/v1.1-extract'
        return contract['sources'][platform]

    compared_cells = 0

    def assert_reference_rows(sheet_name, headers, expected_rows):
        """Compare every exported cell exactly, including rule text and source URLs."""
        global compared_cells
        saved_table = all_tables[f'Ref_{sheet_name}']
        expected_ref = f'A5:{column_letter(len(headers))}{5 + len(expected_rows)}'
        assert saved_table.attrib['ref'] == expected_ref, sheet_name
        saved_headers = [column.attrib['name'] for column in saved_table.find('s:tableColumns', ns)]
        assert saved_headers == headers, f'{sheet_name}: table headers differ'
        cells = {cell.attrib['r']: cell_value(cell) for cell in sheets[sheet_name].findall('.//s:sheetData/s:row/s:c', ns)}
        for row_number, expected_row in enumerate([headers, *expected_rows], start=5):
            for column_number, expected in enumerate(expected_row, start=1):
                address = f'{column_letter(column_number)}{row_number}'
                actual = cells.get(address, '')
                assert actual == str(expected), f'{sheet_name}!{address}: expected {expected!r}, found {actual!r}'
                compared_cells += 1
        # Catch accidental extra mapping rows outside the declared table range.
        for address, value in cells.items():
            if int(re.sub(r'[A-Z]+', '', address)) > 5 + len(expected_rows):
                assert value == '', f'{sheet_name}!{address}: unexpected extra content'

    dictionary_rows = []
    platform_rows = {platform: [] for platform in contract['platforms']}
    for table in contract['tables']:
        for column in table['columns']:
            for platform in contract['platforms']:
                rule = column['platforms'][platform]
                dictionary_rows.append([table['sheet'], column['name'], column['type'], column['required'], column['purpose'], platform, rule['status'], rule['source'], rule['valueRule'], rule['nullRule'], source_url(table, platform)])
                platform_rows[platform].append([table['sheet'], column['name'], column['type'], rule['status'], rule['source'], rule['valueRule'], rule['nullRule'], source_url(table, platform)])
    assert len(dictionary_rows) == 216
    assert_reference_rows('Column_Dictionary', ['Table', 'Column', 'SQL type', 'Required', 'Purpose', 'Platform', 'Collection rule', 'Source', 'Value rule', 'Null rule', 'Reference'], dictionary_rows)
    for platform, rows in platform_rows.items():
        assert len(rows) == 72, platform
        assert_reference_rows(f'{platform}_Output', ['Table', 'Output column', 'SQL type', 'Collection rule', 'Source', 'Value rule', 'Null rule', 'Reference'], rows)
    assert_reference_rows('Migration_Map', ['Table', 'Previous column', 'Action', 'V1.1 target', 'Reason'], [[row['Table'], row['Column'], row['Action'], row['Target'], row['Reason']] for row in migration])
    guide_cells = {cell.attrib['r']: cell_value(cell) for cell in sheets['Guide'].findall('.//s:sheetData/s:row/s:c', ns)}
    assert guide_cells['A23'] == 'Migration'
    assert guide_cells['B23'] == 'Migration_Map explains all 117 previous dataset fields. Review every field disposition and validate before combining deliveries.'

report = {'passed': True, 'file': file.name, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'bytes': file.stat().st_size, 'sheets': 17, 'namedTables': 17, 'inputTables': 11, 'inputHeaders': header_count, 'populatedInputDataCells': populated_input_cells, 'formulas': formula_total, 'dictionaryRows': 216, 'migrationRows': 117, 'mappingRowsPerPlatform': 72, 'exactReferenceCellsCompared': compared_cells, 'contractSha256': hashlib.sha256((base / 'contract.json').read_bytes()).hexdigest(), 'migrationSha256': hashlib.sha256((base / 'migration-map.json').read_bytes()).hexdigest(), 'tables': checks}
print(json.dumps(report, indent=2))
