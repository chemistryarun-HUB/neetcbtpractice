import fs from 'fs';
const L=JSON.parse(fs.readFileSync('scripts/chem-upload/urls.json','utf8'));
fs.mkdirSync('scripts/chem-upload/dump',{recursive:true});
for (const [n,u] of Object.entries(L)) {
  const r=await fetch(u); const b=Buffer.from(await r.arrayBuffer());
  fs.writeFileSync('scripts/chem-upload/dump/'+n,b); console.log(n,r.status,b.length);
}
