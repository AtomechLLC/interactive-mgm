const fs=require('fs'), vm=require('vm');
const out={};
for (const f of process.argv.slice(2)) {
  let src=fs.readFileSync(f,'utf8').replace('const P = {','const P = window.__P = {');
  const ctx={window:{}, Path2D:function(){}}; vm.runInNewContext(src,ctx);
  Object.assign(out, ctx.window.__P);
}
fs.writeFileSync('gi.json', JSON.stringify(out)); console.log(Object.keys(out).length);
