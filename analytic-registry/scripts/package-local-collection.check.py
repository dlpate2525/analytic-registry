"""Exercise packaging and drift checks using an isolated, synthetic collection."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import zipfile

fixture = Path(tempfile.mkdtemp(prefix='registry-pack-'))
script = fixture / 'analytic-registry/scripts/package-local-collection.py'
script.parent.mkdir(parents=True)
shutil.copy2(Path(__file__).with_name('package-local-collection.py'), script)
source = fixture / 'platform-data-collection'
public = fixture / 'analytic-registry/public/resources/platform-data-collection'
current = source / 'v1.2-workbook'
current.mkdir(parents=True)
descriptor = {
    'applicationVersion': '1.2.0-prototype.1', 'publication': 'Prototype release',
    'workbookRevision': '1.2', 'inputSchemaVersion': '1.1',
    'archiveName': 'analytic-registry-v1.2-extract.zip',
    'currentWorkbookDirectory': 'v1.2-workbook',
    'workbookName': 'analytic-registry-v1.2-extract.xlsx',
}
for name in ['analytic-registry-v1.2-extract.xlsx', 'column-dictionary.csv', 'README.md']:
    (current / name).write_text('Synthetic packaging fixture: ' + name, encoding='utf-8')
contract = {'queryProfiles': {'Tableau': {'label': 'Example', 'query': 'queries/test.sql', 'guide': 'test.md', 'preflight': '../tableau/preflight.sql'}}}
(current / 'contract.json').write_text(json.dumps(contract), encoding='utf-8')
for name in ['v1.1-extract/queries/test.sql', 'v1.1-extract/test.md', 'tableau/preflight.sql', *('v1.1-extract/' + name for name in ['README.md', 'source-query-design.md', 'monthly-reconciliation.md', 'sqlserver-staging.sql', 'sqlserver-validation.sql', 'sqlserver-email-match.sql', 'scripts/verify-producer-fixtures.py'])]:
    file = source / name
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text('Current query profile: ' + name, encoding='utf-8')
(source / 'historical.md').write_text('Old source', encoding='utf-8')
public.mkdir(parents=True)
(public / 'historical.md').write_text('Preserved historical browser projection', encoding='utf-8')
(source / 'old.zip').write_bytes(b'Preserved historical archive')
(source / '.private').mkdir()
(source / '.private/secret.txt').write_text('Excluded', encoding='utf-8')
(source / 'analytic-registry-v1.2-extract.zip.preparing').write_text('Failed staging', encoding='utf-8')
checks = []


def run(*args, metadata=None):
    return subprocess.run([sys.executable, str(script), '--descriptor-stdin', *args], input=json.dumps(descriptor if metadata is None else metadata), capture_output=True, text=True)


def check(name, passed):
    if not passed:
        raise AssertionError(name)
    checks.append({'name': name, 'pass': True})


def snapshot():
    return {str(file.relative_to(fixture)): file.read_bytes() for file in fixture.rglob('*') if file.is_file()}


result = run()
check('Initial packaging succeeds', result.returncode == 0)
archive = source / descriptor['archiveName']
check('Descriptor selects the release archive', archive.exists())
first = archive.read_bytes()
with zipfile.ZipFile(archive) as saved:
    check('Private files, archives and stale staging are excluded', not any(name.startswith('.') or name.endswith(('.preparing', '.zip')) for name in saved.namelist()))
    manifest = json.loads(saved.read('v1.2-collection-manifest.json'))
    check('Manifest separates release, workbook and input versions', manifest['applicationVersion'] == descriptor['applicationVersion'] and manifest['workbookRevision'] == '1.2' and manifest['inputSchemaVersion'] == '1.1')
    check('Manifest hashes describe exact entries', all(hashlib.sha256(saved.read(row['path'])).hexdigest() == row['sha256'] for row in manifest['files']))
    check('Every current input has an exact public copy, including query guides', all((public / name).read_bytes() == saved.read(name) for name in manifest['publicFiles']))
    check('Historical browser projections remain unchanged', (public / 'historical.md').read_text(encoding='utf-8') == 'Preserved historical browser projection' and saved.read('historical.md') == b'Old source')
check('Historical archives remain unchanged', (source / 'old.zip').read_bytes() == b'Preserved historical archive')
before = snapshot()
check('Read-only validation succeeds without writes', run('--check').returncode == 0 and snapshot() == before)
check('Repeat packaging preserves exact archive bytes', run().returncode == 0 and archive.read_bytes() == first)
(source / 'v1.1-extract/test.md').write_text('Changed guide', encoding='utf-8')
before = snapshot()
check('Source drift is rejected without writes', run('--check').returncode != 0 and snapshot() == before)
check('Explicit packaging refreshes source drift', run().returncode == 0 and run('--check').returncode == 0)
(public / 'tableau/preflight.sql').write_text('Stale query', encoding='utf-8')
before = snapshot()
check('Public query drift is rejected without writes', run('--check').returncode != 0 and snapshot() == before)
check('Explicit packaging refreshes all public inputs', run().returncode == 0 and run('--check').returncode == 0)
before = snapshot()
check('Descriptor traversal is rejected before writes', run(metadata={**descriptor, 'archiveName': '../escape.zip'}).returncode != 0 and snapshot() == before)
check('Unexpected descriptor fields are rejected before writes', run(metadata={**descriptor, 'outputRoot': 'elsewhere'}).returncode != 0 and snapshot() == before)
contract['queryProfiles']['Tableau']['query'] = '../../escape.sql'
(current / 'contract.json').write_text(json.dumps(contract), encoding='utf-8')
before = snapshot()
check('Query paths outside the collection are rejected before writes', run().returncode != 0 and snapshot() == before)
result = {'checks': checks, 'fixture': str(fixture), 'note': 'Synthetic bytes test packaging behavior, not Excel compatibility.'}
(fixture / 'result.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(f'{len(checks)} collection packaging checks passed. Evidence: {fixture / "result.json"}')
