"""Verify publication packaging with synthetic artifacts in a temporary Git repository."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import warnings
import zipfile

fixture = Path(tempfile.mkdtemp(prefix='registry-publication-'))
script = fixture / 'scripts/package-publication.py'
script.parent.mkdir()
source_script = Path(__file__).with_name('package-publication.py')
if source_script.exists():
    shutil.copy2(source_script, script)
git = os.environ.get('GIT', 'git')
subprocess.run([git, 'init', '--quiet', str(fixture)], check=True, capture_output=True)
checks = []


def write(name, value):
    target = fixture / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(value.encode('utf-8') if isinstance(value, str) else value)


def run(*args):
    return subprocess.run([sys.executable, str(script), *args], capture_output=True, text=True)


def check(name, passed):
    if not passed:
        raise AssertionError(name)
    checks.append(name)


def snapshot():
    return {file.relative_to(fixture).as_posix(): file.read_bytes() for file in fixture.rglob('*') if file.is_file() and '.git' not in file.relative_to(fixture).parts}


def digest(value):
    return hashlib.sha256(value).hexdigest()


write('.gitignore', '**/dist/\n**/node_modules/\n**/.scratch/\nignored.txt\n')
write('.gitattributes', '* text=auto eol=lf\n*.zip -text\n*.xlsx -text\n')
write('README.md', '# Synthetic publication\n')
write('V1.1-BASELINE.json', '{"historical":true}\n')
write('downloads/old.zip', b'Historical archive')
write('ignored.txt', 'Tracked but ignored secret fixture')
subprocess.run([git, '-C', str(fixture), 'add', '-f', 'ignored.txt'], check=True, capture_output=True)
write('analytic-registry/node_modules/secret.js', 'Excluded dependency')
write('analytic-registry/.scratch/private.md', 'Excluded scratch')
release = {
    'version': '1.2.0-prototype.1', 'tag': 'v1.2.0-prototype.1', 'series': 'V1.2',
    'publication': 'Prototype release', 'workbookRevision': '1.2', 'collectionContract': '1.1',
    'artifacts': {}, 'github': 'https://github.com/example/registry/tree/v1.2.0-prototype.1',
}
paths = {
    'workbook': 'resources/platform-data-collection/v1.2-workbook/analytic-registry-v1.2-extract.xlsx',
    'collectionPack': 'resources/platform-data-collection/analytic-registry-v1.2-extract.zip',
    'documentation': 'guide.html', 'workflows': 'v1.2-guide.md', 'requirements': 'v1.2-requirements.md',
    'verification': 'v1.2-publication-verification.md', 'currentBaseline': 'v1.2-release.md',
}
for key, name in paths.items():
    content = ('Synthetic artifact: ' + key).encode()
    release['artifacts'][key] = {'path': name, 'sha256': digest(content)}
    write('analytic-registry/public/' + name, content)
    write('analytic-registry/dist/' + name, content)
    if name.startswith('resources/platform-data-collection/'):
        write(name.removeprefix('resources/'), content)
metadata = (json.dumps(release, indent=2) + '\n').encode()
write('analytic-registry/public/release.json', metadata)
write('analytic-registry/dist/release.json', metadata)
write('analytic-registry/dist/index.html', '<html>Fixture build</html>\n')
write('analytic-registry/dist/assets/app.js', 'console.log("Synthetic build");\n')
for name in ['ordering/a.txt', 'ordering/Z.txt', 'ordering/nested/entry.txt', 'ordering/nested.txt']:
    write('analytic-registry/dist/' + name, 'Ordering fixture: ' + name)
before = snapshot()
check('Check mode rejects absent package without writes', run('--check').returncode != 0 and snapshot() == before)
result = run()
check('Initial publication packaging succeeds', result.returncode == 0)
archive = fixture / 'downloads/analytic-registry-v1.2-preview.zip'
baseline_file = fixture / 'V1.2-BASELINE.json'
checksums = fixture / 'ARTIFACTS.sha256'
baseline = json.loads(baseline_file.read_text())
check('Baseline keeps schema and workbook versions separate', baseline['collectionContract'] == '1.1' and baseline['workbookRevision'] == '1.2')
check('Baseline maps current source artifact paths', baseline['artifacts']['workbook']['path'] == paths['workbook'].removeprefix('resources/') and baseline['artifacts']['collectionPack']['path'] == paths['collectionPack'].removeprefix('resources/'))
check('Baseline records exact preview hash', baseline['artifacts']['preview']['sha256'] == digest(archive.read_bytes()))
entries = checksums.read_text().splitlines()
names = [line.split('  ', 1)[1] for line in entries]
check('Inventory includes the baseline and packer but excludes itself', 'V1.2-BASELINE.json' in names and 'scripts/package-publication.py' in names and 'ARTIFACTS.sha256' not in names)
check('Inventory excludes ignored files even when tracked', 'ignored.txt' not in names and not any('/dist/' in name or '/node_modules/' in name or '/.scratch/' in name for name in names))
check('Every inventory hash describes the current file', all(digest((fixture / name).read_bytes()) == line.split('  ', 1)[0] for line, name in zip(entries, names)))
with zipfile.ZipFile(archive) as saved:
    check('Preview has build-relative paths and exact content', 'index.html' in saved.namelist() and saved.read('assets/app.js') == (fixture / 'analytic-registry/dist/assets/app.js').read_bytes())
    check('Preview orders mixed-case and nested paths by portable archive name',
          [name for name in saved.namelist() if name.startswith('ordering/')] ==
          ['ordering/Z.txt', 'ordering/a.txt', 'ordering/nested.txt', 'ordering/nested/entry.txt'])
before = snapshot()
check('Read-only validation succeeds without changes', run('--check').returncode == 0 and snapshot() == before)
check('Repeated packaging is byte-identical', run().returncode == 0 and snapshot() == before)
check('Historical artifacts remain unchanged', (fixture / 'V1.1-BASELINE.json').read_text() == '{"historical":true}\n' and (fixture / 'downloads/old.zip').read_bytes() == b'Historical archive')
write('new-document.md', 'New untracked release material\n')
before = snapshot()
check('Inventory additions fail read-only verification', run('--check').returncode != 0 and snapshot() == before)
check('Repackaging incorporates current inventory', run().returncode == 0 and run('--check').returncode == 0)
saved_archive = archive.read_bytes()
with warnings.catch_warnings():
    warnings.simplefilter('ignore')
    with zipfile.ZipFile(archive, 'a') as output:
        output.writestr('index.html', '<html>Fixture build</html>\n')
before = snapshot()
result = run('--check')
check('Duplicate ZIP entries fail without writes', result.returncode != 0 and 'duplicate' in result.stderr.lower() and snapshot() == before)
archive.write_bytes(saved_archive)
write('analytic-registry/dist/assets/app.js', 'Changed build\n')
before = snapshot()
check('Build drift fails read-only verification', run('--check').returncode != 0 and snapshot() == before)
write('analytic-registry/dist/assets/app.js', 'console.log("Synthetic build");\n')
write('README.md', '# Changed source\n')
before = snapshot()
check('Source drift fails read-only verification', run('--check').returncode != 0 and snapshot() == before)
write('README.md', '# Synthetic publication\n')
source_workbook = fixture / paths['workbook'].removeprefix('resources/')
original_workbook = source_workbook.read_bytes()
source_workbook.write_bytes(b'Changed source workbook')
before = snapshot()
check('Source workbook drift fails before package writes', run().returncode != 0 and snapshot() == before)
source_workbook.write_bytes(original_workbook)
bad_metadata = json.dumps({**release, 'version': '1.2.0-prototype.1-local', 'tag': None})
write('analytic-registry/public/release.json', bad_metadata)
before = snapshot()
check('Unexpected identity fails before writes', run().returncode != 0 and snapshot() == before)
write('analytic-registry/public/release.json', metadata)
(fixture / 'analytic-registry/dist/index.html').unlink()
before = snapshot()
check('Missing build fails before writes', run().returncode != 0 and snapshot() == before)
write('analytic-registry/dist/index.html', '<html>Fixture build</html>\n')
before = snapshot()
check('Invalid command options fail before writes', run('--invalid').returncode != 0 and snapshot() == before)
result_file = fixture.parent / (fixture.name + '-result.json')
result_file.write_text(json.dumps({'checks': checks, 'fixture': str(fixture), 'note': 'Synthetic files validate packaging only, not app behavior or workbook compatibility.'}, indent=2) + '\n', encoding='utf-8')
print(f'{len(checks)} publication packaging checks passed. Evidence: {result_file}')
