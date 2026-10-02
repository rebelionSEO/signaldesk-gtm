import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=new URL('../',import.meta.url);
const files=['GTM_LIBRARY.md','books/BOOKS_AND_METHODS.md','channels/CHANNELS_AND_GROWTH.md','media/WEBINARS_AND_COURSES.md'];
const entries=[];
const hash=createHash('sha256');
for(const file of files){
 const text=readFileSync(new URL(`docs/references/${file}`,root),'utf8');hash.update(file).update(text);
 const checkedAt=text.match(/20\d{2}-\d{2}-\d{2}/)?.[0];
 if(!checkedAt)throw new Error(`Missing checked date: ${file}`);
 const blocks=[...text.matchAll(/^#{2,3} ([RBCW]\d{2}) — (.+)\n([\s\S]*?)(?=^#{1,3} |$(?![\s\S]))/gm)];
 for(const block of blocks){
  const [,id,title,body]=block;
  const url=body.match(/\]\((https:\/\/[^)]+)\)/)?.[1];
  if(!url||body.length>7000)throw new Error(`Invalid reference ${id}`);
  entries.push({id,title,url,checkedAt,document:`docs/references/${file}`,notes:body.trim(),discoveryOnly:id.startsWith('W')||id==='B15'});
 }
}
if(!entries.length||new Set(entries.map(e=>e.id)).size!==entries.length)throw new Error('Missing or duplicate reference IDs');
const output=JSON.stringify({version:hash.digest('hex'),entries},null,2)+'\n';
const target=new URL('lib/gtm/reference-catalog.json',root);
if(process.argv.includes('--check')){
 if(readFileSync(target,'utf8')!==output)throw new Error('Reference catalog is stale. Run npm run references:build and commit it.');
}else writeFileSync(target,output);
console.log(`${entries.length} reference entries ${process.argv.includes('--check')?'verified':'compiled'} at ${fileURLToPath(target)}`);
