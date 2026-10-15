import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('src');
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(/\.(tsx?|mjs)$/.test(entry.name))files.push(full);}}
walk(root);
const violations=[];
for(const file of files){const text=fs.readFileSync(file,'utf8'),rel=path.relative(root,file).replaceAll('\\','/');
  if(/(?:from\s*|import\s*\()['"]pixi\.js/.test(text)&&!rel.startsWith('rendering/pixi/'))violations.push(`${rel}: Pixi escaped adapter`);
  if(/(?:from\s*|import\s*\()['"](?:node:)?(?:fs|child_process|net)['"]/.test(text))violations.push(`${rel}: native IO in UI`);
  if(/Microsoft\.Xna\.Framework|Assembly\.Load|\.dll['"]/.test(text))violations.push(`${rel}: runtime dependency`);
  if(/eval\s*\(|new\s+Function\s*\(/.test(text))violations.push(`${rel}: dynamic code execution`);
  if(rel.includes('rendering/')&&/localStorage|sessionStorage|project\/applyCommand|WebSocket\s*\(/.test(text))violations.push(`${rel}: renderer persistence/transport`);
}
for(const file of ['rendering/contracts.ts','rendering/PreviewClock.ts','rendering/scene.ts'])if(/from\s*['"](?:react|zustand|pixi\.js)/.test(fs.readFileSync(path.join(root,file),'utf8')))violations.push(`${file}: portable contract imports UI/backend`);
console.log(`Editorial boundary audit: ${files.length} TypeScript source files checked`);
for(const violation of violations)console.error(`FAIL ${violation}`);
console.log(`${violations.length?'FAIL':'PASS'}: ${violations.length} violations; static checks only, not a C# transitive dependency proof.`);
process.exitCode=violations.length?1:0;
