(function (root) {
'use strict';
var KEY='tvhome.cameras.v1', server='', feeds={argus2:'sub',e1:'sub'}, refreshSeconds=60, opened=false, configuring=false, view='mosaic', afterClose=null, previous=null;
try { var saved=JSON.parse(localStorage.getItem(KEY)||'{}');server=normalize(saved.server||'');if(saved.feeds){feeds.argus2=saved.feeds.argus2==='main'?'main':'sub';feeds.e1=saved.feeds.e1==='main'?'main':'sub';}refreshSeconds=typeof saved.refreshSeconds==='number'?Math.max(0,Math.min(3600,saved.refreshSeconds)):60; } catch (_) {}
function normalize(value) {
  value=String(value||'').replace(/^\s+|\s+$/g,'').replace(/\/+$/,'');
  if(!value)return '';
  var a=document.createElement('a');a.href=value;
  if(!/^https?:$/.test(a.protocol)||!a.hostname||a.username||a.password||a.search||a.hash||a.pathname!=='/')throw new Error('Usa apenas http://IP:porta, sem credenciais nem caminhos.');
  return value;
}
var panel=document.createElement('section');panel.id='cameraPanel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Câmaras');
panel.innerHTML='<div class="camera-toolbar"><h2>Câmaras</h2><button data-camera="mosaic">Mosaico</button><button data-camera="argus2">Argus 2</button><button data-camera="e1">E1</button><button id="cameraConfigure">Servidor</button><button id="cameraClose">Fechar</button></div><div id="cameraVideoBox"><video id="cameraVideo" autoplay muted playsinline></video></div><div id="cameraSetup" hidden><h3>Servidor das câmaras no NAS</h3><p>Endereço HTTP do servidor de conversão. As credenciais RTSP ficam no NAS.</p><input id="cameraServer" type="url" aria-label="Servidor das câmaras" placeholder="http://NAS_IP:8095"><div class="camera-feed-choice">Argus 2: <button id="cameraArgusFeed">Sub</button> E1: <button id="cameraE1Feed">Sub</button></div><label>Miniaturas: atualizar a cada <input id="cameraInterval" type="number" min="0" max="3600" step="1" value="60" aria-label="Intervalo das miniaturas em segundos"> segundos (0 desliga)</label><div><button id="cameraSave">Guardar e abrir</button></div></div><p id="cameraStatus" role="status"></p>';
document.body.appendChild(panel);
var video=document.getElementById('cameraVideo'),box=document.getElementById('cameraVideoBox'),setup=document.getElementById('cameraSetup'),input=document.getElementById('cameraServer'),status=document.getElementById('cameraStatus');
function message(text){status.textContent=text;}
function stop(){video.pause();video.removeAttribute('src');video.load();}
function select(next){
  if(!opened||document.hidden)return;
  if(!server){configure();return;}
  view=next;configuring=false;setup.hidden=true;box.hidden=false;stop();
  var buttons=panel.querySelectorAll('[data-camera]');
  for(var i=0;i<buttons.length;i++)buttons[i].setAttribute('aria-pressed',String(buttons[i].getAttribute('data-camera')===next));
  message('A ligar às câmaras…');video.src=server+'/hls/'+(next==='mosaic'?'mosaic-'+feeds.argus2+'-'+feeds.e1:next+'-'+feeds[next])+'/index.m3u8';
  try { var p=video.play();if(p&&p.catch)p.catch(function(){if(opened)message('Seleciona uma vista com OK para tentar de novo.');}); } catch (_) { message('Não foi possível iniciar o vídeo.'); }
}
var draftFeeds={argus2:'sub',e1:'sub'};
function feedLabels(){document.getElementById('cameraArgusFeed').textContent=draftFeeds.argus2==='main'?'Main':'Sub';document.getElementById('cameraE1Feed').textContent=draftFeeds.e1==='main'?'Main':'Sub';}
document.getElementById('cameraArgusFeed').onclick=function(){draftFeeds.argus2=draftFeeds.argus2==='sub'?'main':'sub';feedLabels();};
document.getElementById('cameraE1Feed').onclick=function(){draftFeeds.e1=draftFeeds.e1==='sub'?'main':'sub';feedLabels();};
function configure(){draftFeeds={argus2:feeds.argus2,e1:feeds.e1};feedLabels();stop();configuring=true;box.hidden=true;setup.hidden=false;input.value=server;document.getElementById('cameraInterval').value=refreshSeconds;message('Configura o servidor de conversão no NAS e guarda o endereço.');input.focus();}
function close(){
  if(!opened)return;
  opened=false;stop();panel.hidden=true;configuring=false;
  if(root.ThemeRuntime)root.ThemeRuntime.resume('cameras');
  var callback=afterClose;afterClose=null;
  if(callback)callback();else if(previous&&document.body.contains(previous))previous.focus();
}
panel.querySelector('#cameraClose').onclick=close;
panel.querySelector('#cameraConfigure').onclick=configure;
panel.querySelector('#cameraSave').onclick=function(){
  try {var next=normalize(input.value);if(!next)throw new Error('Indica o endereço do NAS.');var seconds=Number(document.getElementById('cameraInterval').value);if(!isFinite(seconds)||seconds<0||seconds>3600||Math.floor(seconds)!==seconds||seconds>0&&seconds<10)throw new Error('Usa 0 ou um intervalo entre 10 e 3600 segundos.');localStorage.setItem(KEY,JSON.stringify({server:next,refreshSeconds:seconds,feeds:draftFeeds}));server=next;refreshSeconds=seconds;feeds={argus2:draftFeeds.argus2,e1:draftFeeds.e1};if(root.HomeCameraThumbs)root.HomeCameraThumbs.refresh(true);select('mosaic');panel.querySelector('[data-camera]').focus();}
  catch(e){message(e.message);}
};
var choices=panel.querySelectorAll('[data-camera]');
for(var i=0;i<choices.length;i++)choices[i].onclick=function(){select(this.getAttribute('data-camera'));};
video.onplaying=function(){if(opened)message(view==='mosaic'?'Argus 2 à esquerda · E1 à direita · OK para abrir uma vista':'Voltar: regressar ao mosaico');};
video.onerror=function(){if(opened&&!configuring)message('Sem vídeo. Confirma o servidor e os feeds no NAS. Seleciona a vista para tentar de novo.');};
function key(event){
  var k=event.keyCode;
  if(!opened||k===36||k===172||k===403)return false;
  var active=document.activeElement;
  if(k===461||k===27){event.preventDefault();if(configuring&&server){select('mosaic');choices[0].focus();}else if(!configuring&&view!=='mosaic'){select('mosaic');choices[0].focus();}else close();return true;}
  if(k===13){if(active===input)return true;event.preventDefault();if(active&&active.tagName==='BUTTON')active.click();return true;}
  if(k>=37&&k<=40){
    if(active===input&&(k===37||k===39))return true;
    var list=Array.prototype.filter.call(panel.querySelectorAll('button,input'),function(el){return !el.disabled&&el.getClientRects().length;});
    var index=list.indexOf(active),step=k===37||k===38?-1:1;
    if(list.length)list[Math.max(0,Math.min(list.length-1,index+step))].focus();event.preventDefault();
  }
  return true;
}
document.addEventListener('visibilitychange',function(){if(document.hidden)close();});
root.addEventListener('pagehide',close);
root.HomeCameras={open:function(callback){if(opened)return;previous=document.activeElement;afterClose=callback||null;opened=true;view='mosaic';panel.hidden=false;if(root.ThemeRuntime)root.ThemeRuntime.suspend('cameras');if(server){select('mosaic');choices[0].focus();}else configure();},getSettings:function(){return {server:server,refreshSeconds:refreshSeconds,feeds:{argus2:feeds.argus2,e1:feeds.e1}};},close:close,key:key,ownsFocus:function(){return opened;}};
})(window);
