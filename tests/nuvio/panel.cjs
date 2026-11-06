const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(__dirname+'/../../launcher/nuvio-panel.js','utf8');
const tick=()=>new Promise(r=>setImmediate(r));
test('original launcher integration restores profile, renders real img, falls back and preserves Home',async()=>{
 const dom=new JSDOM('<div id="homeSurface" data-layout="dock-grid"></div>',{url:'https://home.invalid',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem('tvhome.nuvio.options.v1',JSON.stringify({enabled:true,artwork:true,profile:1,profileName:'Casa'}));
 let requests=0,launches=[],episode=2;
 w.QuietNuvio={call:async action=>action==='status'?{connected:true}:action==='progress'?{updated:Date.now(),items:[{id:'tt123:1:'+episode,title:'tt123',type:'series',season:1,episode,progress:45,target:'nuvio://detail/series/tt123'}]}:action==='logout'?{ok:true}:{profiles:[]}};
 w.HomeNuvioHost={launch:(...args)=>launches.push(args),toast:()=>{},focusHeader:()=>{},returnToGrid:()=>{}};
 w.XMLHttpRequest=function(){this.open=()=>{};this.send=()=>{requests++;this.status=200;this.responseText=JSON.stringify({meta:{name:'Example',background:'https://images.invalid/background.jpg',poster:'https://images.invalid/poster.jpg',videos:[{season:1,episode:2,thumbnail:'https://images.invalid/episode.jpg'},{season:1,episode:3,thumbnail:'https://images.invalid/episode-3.jpg'}]}});this.onload();};};
 w.eval(source);await tick();await tick();
 const img=w.document.querySelector('.nuvio-art img');assert.ok(img);assert.match(img.src,/episode.jpg/);
 assert.equal(w.document.querySelector('.nuvio-title').textContent,'Example');
 img.onload();assert.equal(img.parentNode.classList.contains('nuvio-image-loaded'),true);
 img.onerror();assert.match(img.src,/background.jpg/);img.onerror();assert.match(img.src,/poster.jpg/);
 w.document.querySelector('.nuvio-card').click();assert.equal(launches[0][0],'space.nuvio.webos');
 assert.equal(w.HomeNuvio.key({keyCode:172}),false);assert.equal(w.HomeNuvio.key({keyCode:36}),false);
 assert.equal(requests,1);
 episode=3;
 w.document.dispatchEvent(new w.Event('webOSRelaunch'));
 await new Promise(resolve=>w.setTimeout(resolve,300));
 assert.match(w.document.querySelector('.nuvio-art img').src,/episode-3.jpg$/);
 assert.equal(requests,2);
 dom.window.close();
});
test('browser preview never restores or sends real-account requests',async()=>{
 const dom=new JSDOM('<div id="homeSurface"></div>',{url:'https://preview.invalid',runScripts:'outside-only'}),w=dom.window;w.CYTV_BROWSER_PREVIEW=true;
 w.QuietNuvio={call:()=>{throw Error('must not call account in preview');}};w.eval(source);await tick();
 assert.match(w.document.getElementById('nuvioStatus').textContent,/pré-visualização/);
 dom.window.close();
});
test('continue watching belongs to scrolling stage and hides on the first scroll pixel',async()=>{
 const dom=new JSDOM('<style>'+fs.readFileSync(__dirname+'/../../launcher/nuvio-panel.css','utf8')+'</style><div id="homeSurface" data-layout="dock-grid"><div id="stage"></div></div>',{url:'https://home.invalid',runScripts:'outside-only'}),w=dom.window;
 w.CYTV_BROWSER_PREVIEW=true;w.QuietNuvio={call:async()=>({connected:false})};w.eval(source);
 const row=w.document.getElementById('nuvioRow');assert.equal(row.parentNode.id,'stage');assert.equal(row.hidden,false);
 w.HomeNuvio.setScroll(1);assert.equal(row.hidden,true);assert.equal(w.getComputedStyle(row).display,'none');assert.equal(w.document.body.classList.contains('scrolled'),false);
 w.HomeNuvio.setScroll(250);assert.equal(row.hidden,true);w.HomeNuvio.setScroll(0);assert.equal(row.hidden,false);
 dom.window.close();
});
test('OLED hides settled ambient and wallpaper, and changing the option restores appearance',()=>{
 const css=fs.readFileSync(__dirname+'/../../launcher/nuvio-panel.css','utf8');
 const dom=new JSDOM('<style>'+css+'</style><div id="homeSurface" data-layout="dock-grid" style="background-image:url(https://example.invalid/wall.jpg)"><div id="ambientBase" class="ambient-base baked"></div><div id="stage"></div></div>',{url:'https://home.invalid',runScripts:'outside-only'}),w=dom.window;
 w.CYTV_BROWSER_PREVIEW=true;w.QuietNuvio={call:async()=>({connected:false})};w.localStorage.setItem('tvhome.nuvio.options.v1',JSON.stringify({enabled:true,quiet:true,artwork:true}));w.eval(source);
 assert.equal(w.getComputedStyle(w.document.getElementById('ambientBase')).display,'none');
 w.HomeNuvio.open();w.document.querySelectorAll('#nuvioBody input[type=checkbox]')[1].click();
 assert.equal(w.document.getElementById('homeSurface').classList.contains('nuvio-quiet'),false);
 assert.notEqual(w.getComputedStyle(w.document.getElementById('ambientBase')).display,'none');
 dom.window.close();
});
test('Nuvio entry is inside the native settings Home pane, with no header shortcut',()=>{
 const html=fs.readFileSync(__dirname+'/../../launcher/index.html','utf8');assert.equal(html.includes('id="btnNuvio"'),false);
 const dom=new JSDOM('<div id="settings"><div id="card"><h2 class="settings-heading">Settings</h2><div class="settings-footer"><button>Close</button></div></div></div>',{url:'https://home.invalid',runScripts:'outside-only'}),w=dom.window;let opened=0;
 w.RenewalPanel={openNuvio:()=>opened++};w.eval(fs.readFileSync(__dirname+'/../../launcher/settings-categories.js','utf8'));
 w.SettingsCategories.attach(w.document.getElementById('settings'),w.document.getElementById('card'),[{id:'home',label:'Home',elements:[]}]);
 const button=w.document.getElementById('homeNuvioSettings');assert.ok(w.document.getElementById('settings-pane-home').contains(button));button.click();assert.equal(opened,1);
 dom.window.close();
});
