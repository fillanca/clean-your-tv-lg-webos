(function(root){
'use strict';
var lastAttempt=0, generation=0, probes=[], timers=[], pending=false;
function visible(el){if(!el.getClientRects().length)return false;var r=el.getBoundingClientRect();return r.bottom>0&&r.right>0&&r.top<root.innerHeight&&r.left<root.innerWidth;}
function cancel(){generation++;for(var t=0;t<timers.length;t++)clearTimeout(timers[t]);timers=[];for(var i=0;i<probes.length;i++){probes[i].onload=probes[i].onerror=null;probes[i].removeAttribute('src');}probes=[];pending=false;}
function add(target,camera){
 var span=document.createElement('span');span.className='camera-thumb';span.setAttribute('data-camera-thumb',camera);
 var image=document.createElement('img');image.alt=camera==='argus2'?'Argus 2':'E1';
 var label=document.createElement('small');label.textContent=image.alt+' · sem imagem';span.appendChild(image);span.appendChild(label);target.appendChild(span);
}
function bind(){
 var card=document.querySelector('.item[data-app-id="quiet.cameras"] .card');
 if(card&&!card.querySelector('.camera-live-thumbs')){var host=document.createElement('div');host.className='camera-live-thumbs';add(host,'argus2');add(host,'e1');card.appendChild(host);}
 var choices=document.querySelectorAll('#cameraPanel [data-camera]');
 for(var i=0;i<choices.length;i++){var camera=choices[i].getAttribute('data-camera');if(camera!=='mosaic'&&!choices[i].querySelector('[data-camera-thumb]'))add(choices[i],camera);}
}
function refresh(force){
 if(force){cancel();lastAttempt=0;}
 bind();
 if(!root.HomeCameras||document.hidden||pending)return;
 var settings=root.HomeCameras.getSettings(),now=Date.now();
 if(!settings.server||!settings.refreshSeconds||now-lastAttempt<settings.refreshSeconds*1000)return;
 var targets=Array.prototype.filter.call(document.querySelectorAll('[data-camera-thumb]'),function(el){
   if(el.parentNode.className==='camera-live-thumbs'&&root.HomeCameras.ownsFocus())return false;
   return visible(el);
 });
 if(!targets.length)return;
 lastAttempt=now;pending=true;var epoch=++generation,left=0;
 ['argus2','e1'].forEach(function(camera){
   var selected=targets.filter(function(el){return el.getAttribute('data-camera-thumb')===camera;});if(!selected.length)return;
   left++;var image=new Image(),done=false;probes.push(image);
   var timer=setTimeout(failure,18000);timers.push(timer);
   function finish(){if(done)return false;done=true;clearTimeout(timer);left--;if(epoch===generation&&!left){pending=false;probes=[];timers=[];}return epoch===generation&&!document.hidden;}
   function failure(){if(!finish())return;selected.forEach(function(el){var label=el.querySelector('small');label.textContent=(camera==='argus2'?'Argus 2':'E1')+' · sem atualização';el.classList.add('stale');});}
   image.onerror=failure;
   image.onload=function(){if(!finish())return;selected.forEach(function(el){el.querySelector('img').src=image.src;el.querySelector('small').textContent=(camera==='argus2'?'Argus 2':'E1')+' · '+new Date().toLocaleTimeString();el.classList.add('loaded');el.classList.remove('stale');});};
   image.src=settings.server+'/snapshot/'+camera+'-'+(settings.feeds&&settings.feeds[camera]==='main'?'main':'sub')+'.jpg?t='+now;
 });
 if(!left)pending=false;
}
root.HomeCameraThumbs={refresh:refresh};
setInterval(function(){refresh(false);},5000);
document.addEventListener('visibilitychange',function(){if(document.hidden)cancel();else refresh(true);});
root.addEventListener('pagehide',cancel);
var queued=false;
new MutationObserver(function(){if(!queued){queued=true;setTimeout(function(){queued=false;refresh(false);},100);}}).observe(document.body,{childList:true,subtree:true});
refresh(false);
})(window);
