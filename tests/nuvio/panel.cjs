const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(__dirname+'/../../launcher/nuvio-panel.js','utf8');
const tick=()=>new Promise(r=>setImmediate(r));
test('original launcher integration restores profile, renders real img, falls back and preserves Home',async()=>{
 const dom=new JSDOM('<div id="homeSurface" data-layout="dock-grid"></div>',{url:'https://home.invalid',runScripts:'outside-only'}),w=dom.window;
 w.localStorage.setItem('tvhome.nuvio.options.v1',JSON.stringify({enabled:true,artwork:true,profile:1,profileName:'Casa'}));
 let requests=0,launches=[];
 w.QuietNuvio={call:async action=>action==='status'?{connected:true}:action==='progress'?{updated:Date.now(),items:[{id:'tt123:1:2',title:'tt123',type:'series',season:1,episode:2,progress:45,target:'nuvio://detail/series/tt123'}]}:action==='logout'?{ok:true}:{profiles:[]}};
 w.HomeNuvioHost={launch:(...args)=>launches.push(args),toast:()=>{},focusHeader:()=>{},returnToGrid:()=>{}};
 w.XMLHttpRequest=function(){this.open=()=>{};this.send=()=>{requests++;this.status=200;this.responseText=JSON.stringify({meta:{name:'Example',background:'https://images.invalid/background.jpg',poster:'https://images.invalid/poster.jpg',videos:[{season:1,episode:2,thumbnail:'https://images.invalid/episode.jpg'}]}});this.onload();};};
 w.eval(source);await tick();await tick();
 const img=w.document.querySelector('.nuvio-art img');assert.ok(img);assert.match(img.src,/episode.jpg/);
 assert.equal(w.document.querySelector('.nuvio-title').textContent,'Example');
 img.onload();assert.equal(img.parentNode.classList.contains('nuvio-image-loaded'),true);
 img.onerror();assert.match(img.src,/background.jpg/);img.onerror();assert.match(img.src,/poster.jpg/);
 w.document.querySelector('.nuvio-card').click();assert.equal(launches[0][0],'space.nuvio.webos');
 assert.equal(w.HomeNuvio.key({keyCode:172}),false);assert.equal(w.HomeNuvio.key({keyCode:36}),false);
 assert.equal(requests,1);
 dom.window.close();
});
test('browser preview never restores or sends real-account requests',async()=>{
 const dom=new JSDOM('<div id="homeSurface"></div>',{url:'https://preview.invalid',runScripts:'outside-only'}),w=dom.window;w.CYTV_BROWSER_PREVIEW=true;
 w.QuietNuvio={call:()=>{throw Error('must not call account in preview');}};w.eval(source);await tick();
 assert.match(w.document.getElementById('nuvioStatus').textContent,/pré-visualização/);
 dom.window.close();
});
