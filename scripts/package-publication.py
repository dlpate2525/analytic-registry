"""Prepare and verify the V1.2 publication artifacts without publishing them."""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import sys
from uuid import uuid4
import zipfile

root = Path(__file__).resolve().parents[1]
preview_name = 'downloads/analytic-registry-v1.2-preview.zip'
baseline_name = 'V1.2-BASELINE.json'
checksum_name = 'ARTIFACTS.sha256'
check_only = '--check' in sys.argv
if any(option != '--check' for option in sys.argv[1:]):
    raise ValueError('Unknown publication packaging option')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def inside(folder, name):
    relative = PurePosixPath(name)
    if relative.is_absolute() or not name or '\\' in name or any(part in {'..', '.'} for part in name.split('/')) or any(character in name for character in '\n\r\0'):
        raise ValueError(f'Invalid artifact path: {name}')
    target = folder.joinpath(*relative.parts)
    if not target.resolve().is_relative_to(folder.resolve()):
        raise ValueError(f'Artifact leaves its root: {name}')
    cursor = folder
    for part in relative.parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise ValueError(f'Symlink is not a publication input: {name}')
    return target


def git_inventory():
    executable = os.environ.get('GIT', 'git')
    listed = subprocess.run([executable, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root, capture_output=True, check=True).stdout
    ignored = subprocess.run([executable, 'check-ignore', '--no-index', '--stdin', '-z'], cwd=root, input=listed, capture_output=True)
    if ignored.returncode not in {0, 1}:
        raise ValueError('Cannot check ignored publication paths: ' + ignored.stderr.decode('utf-8', errors='replace'))
    names = set(listed.decode('utf-8').split('\0')) - set(ignored.stdout.decode('utf-8').split('\0'))
    return sorted(name for name in names if name != checksum_name and not any(part.lower() in {'.git', 'dist', 'node_modules', '.scratch'} for part in PurePosixPath(name).parts))


def build_inputs(release):
    folder = root / 'analytic-registry/dist'
    if not (folder / 'index.html').is_file() or not (folder / 'release.json').is_file():
        raise ValueError('Build missing: run the application build first')
    if (folder / 'release.json').read_bytes() != (root / 'analytic-registry/public/release.json').read_bytes():
        raise ValueError('Built release metadata differs from public metadata')
    found = {}
    for file in sorted(folder.rglob('*'), key=lambda item: item.relative_to(folder).as_posix()):
        name = file.relative_to(folder).as_posix()
        inside(folder, name)
        if file.is_file():
            found[name] = file.read_bytes()
    for artifact in release['artifacts'].values():
        if artifact['path'] not in found or digest(found[artifact['path']]) != artifact['sha256']:
            raise ValueError(f'Built artifact differs: {artifact["path"]}')
    return found


def verify_preview(archive, files):
    with zipfile.ZipFile(archive) as saved:
        names = saved.namelist()
        if len(names) != len(set(names)):
            raise ValueError('Preview ZIP contains duplicate names')
        if set(names) != set(files):
            raise ValueError('Preview ZIP inventory differs from the build')
        for name, data in files.items():
            if saved.read(name) != data:
                raise ValueError(f'Preview ZIP content differs: {name}')


release_file = root / 'analytic-registry/public/release.json'
release = json.loads(release_file.read_text(encoding='utf-8'))
if release.get('version') != '1.2.0-prototype.1' or release.get('tag') != 'v1.2.0-prototype.1' or release.get('publication') != 'Prototype release':
    raise ValueError('Unexpected release identity; expected V1.2 prototype.1')
expected_artifacts = {'workbook', 'collectionPack', 'documentation', 'workflows', 'requirements', 'verification', 'currentBaseline'}
if set(release.get('artifacts', {})) != expected_artifacts:
    raise ValueError('Current release artifact inventory is incomplete or unexpected')
files = build_inputs(release)
artifacts = {}
for key, artifact in release['artifacts'].items():
    served = inside(root / 'analytic-registry/public', artifact['path'])
    source_name = artifact['path'].removeprefix('resources/') if key in {'workbook', 'collectionPack'} else 'analytic-registry/public/' + artifact['path']
    if key in {'workbook', 'collectionPack'} and not artifact['path'].startswith('resources/platform-data-collection/'):
        raise ValueError(f'Unexpected source collection path: {artifact["path"]}')
    source = inside(root, source_name)
    data = source.read_bytes()
    if digest(data) != artifact['sha256'] or served.read_bytes() != data:
        raise ValueError(f'Current source or public artifact differs: {source_name}')
    artifacts[key] = {'path': source_name, 'sha256': digest(data)}

preview = inside(root, preview_name)
if not check_only:
    preview.parent.mkdir(parents=True, exist_ok=True)
    temporary = preview.with_name('.' + preview.name + '.' + str(uuid4()) + '.preparing')
    try:
        with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_DEFLATED) as output:
            for name, data in files.items():
                info = zipfile.ZipInfo(name, date_time=(2026, 10, 21, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                output.writestr(info, data)
        temporary.replace(preview)
    finally:
        temporary.unlink(missing_ok=True)
verify_preview(preview, files)
artifacts['preview'] = {'path': preview_name, 'sha256': digest(preview.read_bytes())}
baseline = {**release, 'artifacts': artifacts, 'baselineDocument': 'analytic-registry/docs/v1.2-release.md'}
baseline_bytes = (json.dumps(baseline, indent=2) + '\n').encode('utf-8')
baseline_file = inside(root, baseline_name)
if check_only:
    if baseline_file.read_bytes() != baseline_bytes:
        raise ValueError('Publication baseline differs from current artifacts')
else:
    baseline_file.write_bytes(baseline_bytes)

inventory = git_inventory()
required = {baseline_name, preview_name, 'scripts/package-publication.py', *(artifact['path'] for artifact in artifacts.values())}
if not required.issubset(inventory):
    raise ValueError('Required publication artifacts are absent from the Git inventory: ' + ', '.join(sorted(required - set(inventory))))
checksum_bytes = ''.join(digest(inside(root, name).read_bytes()) + '  ' + name + '\n' for name in inventory).encode('utf-8')
checksum_file = inside(root, checksum_name)
if check_only:
    if checksum_file.read_bytes() != checksum_bytes:
        raise ValueError('Publication checksum inventory or file hashes differ')
else:
    checksum_file.write_bytes(checksum_bytes)
print(json.dumps({'status': 'verified' if check_only else 'packaged and verified', 'version': release['version'], 'files': len(inventory), 'previewFiles': len(files), 'preview': artifacts['preview'], 'baseline': baseline_name, 'checksums': checksum_name}))
