import { spawnSync } from "node:child_process";
import { buildProject, root } from "./build.mjs";
await buildProject();
const script = String.raw`
import sys,json,hashlib,zipfile,stat
from pathlib import Path
root=Path(sys.argv[1]);manifest=json.loads((root/'manifest.json').read_text())
files={'manifest.json':(root/'manifest.json').read_bytes()}
paths=sorted((root/'assets').rglob('*'))+[root/manifest['entrypoints']['ui']['entry'],root/manifest['entrypoints']['backend']['executable']]
for p in paths:
 if p.is_symlink():raise ValueError('Symlinks are not allowed')
 if p.is_file():files[p.relative_to(root).as_posix()]=p.read_bytes()
for required in [manifest['icon'],manifest['entrypoints']['ui']['entry'],manifest['entrypoints']['backend']['executable']]:
 assert required in files,'Missing package entry: '+required
checksums={'algorithm':'sha256','files':{name:hashlib.sha256(data).hexdigest() for name,data in sorted(files.items())}}
files['checksums.json']=json.dumps(checksums,indent=2,ensure_ascii=False).encode()
out=root/'dist';out.mkdir(exist_ok=True)
target=out/(manifest['id']+'-'+manifest['version']+'-darwin-arm64.dbxp')
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,data in sorted(files.items()):
  info=zipfile.ZipInfo(name,date_time=(2026,10,20,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.create_system=3
  info.external_attr=(stat.S_IFREG|(0o755 if name.startswith('bin/') else 0o644))<<16
  z.writestr(info,data)
with zipfile.ZipFile(target) as z:
 assert z.testzip() is None
 check=json.loads(z.read('checksums.json'))
 assert set(z.namelist())==set(check['files'])|{'checksums.json'}
 for name,digest in check['files'].items():assert hashlib.sha256(z.read(name)).hexdigest()==digest
digest=hashlib.sha256(target.read_bytes()).hexdigest()
(out/(target.name+'.sha256')).write_text(digest+'  '+target.name+'\n')
print(str(target));print('Verified ZIP, '+str(len(files)-1)+' payload files, '+str(target.stat().st_size)+' bytes, SHA-256 '+digest)
`;
const result = spawnSync("python3", ["-c", script, root], { stdio: "inherit" });
if (result.status !== 0) throw result.error || Error("Package verification failed");
