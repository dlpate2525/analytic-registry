"""Package configured collection inputs and verify source, ZIP, and public parity."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from uuid import uuid4
import zipfile

app = Path(__file__).resolve().parents[1]
source = app.parent / 'platform-data-collection'
public = app / 'public/resources/platform-data-collection'
manifest_name = 'v1.2-collection-manifest.json'
check_only = '--check' in sys.argv
if any(option not in {'--check', '--descriptor-stdin'} for option in sys.argv[1:]):
    raise ValueError('Unknown collection packaging option')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def contained(root, name):
    target = (root / name).resolve()
    if not target.is_relative_to(root.resolve()):
        raise ValueError(f'Path leaves collection root: {name}')
    return target


def descriptor():
    if '--descriptor-stdin' in sys.argv:
        raw = sys.stdin.read(8193)
        if len(raw) > 8192:
            raise ValueError('Collection descriptor exceeds 8192 characters')
        value = json.loads(raw)
    else:
        # Direct local packaging reads the same TypeScript authority as the release driver.
        result = subprocess.run(['node', '--import', 'tsx', str(app / 'scripts/prepare-release.mjs'), '--collection-descriptor'], cwd=app, capture_output=True, text=True, check=True)
        value = json.loads(result.stdout)
    expected = {'applicationVersion', 'publication', 'workbookRevision', 'inputSchemaVersion', 'archiveName', 'currentWorkbookDirectory', 'workbookName'}
    if not isinstance(value, dict) or set(value) != expected or not all(isinstance(item, str) and item for item in value.values()):
        raise ValueError('Collection descriptor has unexpected or missing fields')
    if not re.fullmatch(r'\d+\.\d+\.\d+-prototype\.\d+(?:-local)?', value['applicationVersion']):
        raise ValueError('Invalid prototype version')
    is_local = value['applicationVersion'].endswith('-local')
    if value['publication'] != ('Local working draft' if is_local else 'Prototype release'):
        raise ValueError('Version and publication state disagree')
    for key in ['archiveName', 'currentWorkbookDirectory', 'workbookName']:
        if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', value[key]) or value[key] in {'.', '..'}:
            raise ValueError(f'Invalid collection filename: {key}')
    if not value['archiveName'].endswith('.zip') or not value['workbookName'].endswith('.xlsx'):
        raise ValueError('Collection archive and workbook extensions are required')
    for key in ['workbookRevision', 'inputSchemaVersion']:
        if not re.fullmatch(r'\d+\.\d+', value[key]):
            raise ValueError(f'Invalid collection version: {key}')
    return value


def inputs(current, workbook):
    found = {}
    for file in sorted(source.rglob('*'), key=lambda item: item.relative_to(source).as_posix()):
        relative = file.relative_to(source)
        if any(part.startswith('.') or part in {'node_modules', '__pycache__'} for part in relative.parts):
            continue
        if file.is_symlink():
            raise ValueError(f'Symlink is not a collection input: {relative}')
        if file.is_file() and file.suffix not in {'.zip', '.preparing'} and relative.as_posix() != manifest_name:
            found[relative.as_posix()] = file.read_bytes()
    for name in [workbook, 'contract.json', 'column-dictionary.csv', 'README.md']:
        if f'{current}/{name}' not in found:
            raise ValueError(f'Missing current collection input: {current}/{name}')
    contract = json.loads(found[f'{current}/contract.json'])
    current_copies = {name for name in found if name.startswith(current + '/')}
    current_copies.update('v1.1-extract/' + name for name in ['README.md', 'source-query-design.md', 'monthly-reconciliation.md', 'sqlserver-staging.sql', 'sqlserver-validation.sql', 'sqlserver-email-match.sql', 'scripts/verify-producer-fixtures.py'])
    for profile in contract['queryProfiles'].values():
        for kind, name in profile.items():
            if kind == 'label':
                continue
            if not isinstance(name, str):
                raise ValueError('Query profile paths must be strings')
            target = contained(source, 'v1.1-extract/' + name)
            if target.relative_to(source.resolve()).as_posix() not in found:
                raise ValueError(f'Missing query profile input: {name}')
            current_copies.add(target.relative_to(source.resolve()).as_posix())
    for name in current_copies:
        if name not in found:
            raise ValueError(f'Missing current handoff input: {name}')
        contained(public, name)
    return found, sorted(current_copies)


metadata = descriptor()
current = metadata['currentWorkbookDirectory']
files, current_copies = inputs(current, metadata['workbookName'])
archive_name = metadata['archiveName']
manifest = {
    'status': metadata['publication'] + '; installed-source execution remains unverified',
    'applicationVersion': metadata['applicationVersion'],
    'workbookRevision': metadata['workbookRevision'],
    'inputSchemaVersion': metadata['inputSchemaVersion'],
    'startHere': f'{current}/README.md',
    'workbook': f'{current}/{metadata["workbookName"]}',
    'historicalMaterial': 'Earlier workbooks and descriptions remain for comparison. Use startHere for current delivery guidance.',
    'publicFiles': current_copies,
    'files': [{'path': name, 'bytes': len(data), 'sha256': digest(data)} for name, data in files.items()],
}
manifest_bytes = (json.dumps(manifest, indent=2) + '\n').encode('utf-8')
archive = contained(source, archive_name)
contained(public, archive_name)
contained(public, manifest_name)

if not check_only:
    temporary = source / f'.{archive_name}.{uuid4()}.preparing'
    try:
        with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED) as output:
            for name, data in {**files, manifest_name: manifest_bytes}.items():
                info = zipfile.ZipInfo(name, date_time=(2026, 10, 20, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                output.writestr(info, data)
        temporary.replace(archive)
    finally:
        temporary.unlink(missing_ok=True)
    (source / manifest_name).write_bytes(manifest_bytes)
    for name in current_copies:
        target = contained(public, name)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(files[name])
    shutil.copy2(archive, public / archive_name)
    (public / manifest_name).write_bytes(manifest_bytes)

with zipfile.ZipFile(archive) as saved:
    expected = set(files) | {manifest_name}
    if set(saved.namelist()) != expected or len(saved.namelist()) != len(expected):
        raise ValueError('Archive inventory differs from source inputs')
    if saved.read(manifest_name) != manifest_bytes:
        raise ValueError('Archive manifest differs from current sources')
    for name, data in files.items():
        if saved.read(name) != data:
            raise ValueError(f'Archive content differs: {name}')
        if name in current_copies and (public / name).read_bytes() != data:
            raise ValueError(f'Public collection resource differs: {name}')
if (public / archive_name).read_bytes() != archive.read_bytes():
    raise ValueError('Public archive differs from source archive')
if (source / manifest_name).read_bytes() != manifest_bytes or (public / manifest_name).read_bytes() != manifest_bytes:
    raise ValueError('Saved manifest differs')
print(json.dumps({'status': 'verified' if check_only else 'packaged and verified', 'files': len(files), 'archive': archive_name, 'sha256': digest(archive.read_bytes()), 'inputSchemaVersion': metadata['inputSchemaVersion'], 'workbookRevision': metadata['workbookRevision']}))
