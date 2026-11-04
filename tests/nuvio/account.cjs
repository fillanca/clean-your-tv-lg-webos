const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname+'/../../launcher/nuvio-account.js','utf8');
function setup(storage) {
 const root={crypto:require('node:crypto').webcrypto};
 vm.runInNewContext(source,{window:root,URL,Uint8Array,Date,Promise,Number,Object,Array,Error,encodeURIComponent});
 let time=1000000,calls=[],block=false,release;
 const request=async (url,body,headers)=>{
  calls.push({url,body,headers});
  if(url.endsWith('/signup'))return {access_token:'anonymous',refresh_token:'anon',expires_in:3600};
  if(url.endsWith('start_device_login_session'))return [{device_code:'private',user_code:'ABC123',verification_uri_complete:'https://nuvio.tv/link?code=ABC123',poll_interval_seconds:3}];
  if(url.endsWith('poll_tv_login_session'))return [{status:'approved'}];
  if(url.endsWith('tv-logins-exchange'))return {access_token:'secret',refresh_token:'refresh',expires_in:3600};
  if(url.endsWith('grant_type=refresh_token'))return {access_token:'new',refresh_token:'new-refresh',expires_in:3600};
  if(url.endsWith('sync_pull_profiles'))return [{profile_index:1,name:'Casa'},{profile_index:2,name:'PIN'}];
  if(url.endsWith('sync_pull_profile_locks'))return [{profile_index:2,pin_enabled:true}];
  if(url.endsWith('sync_pull_watch_progress')){if(block) await new Promise(r=>{release=r;});return [{profile_id:1,content_id:'tt123',position:40,duration:100}];}
  throw Error('Unexpected '+url);
 };
 const api=root.QuietNuvioFactory({NUVIO_SUPABASE_URL:'https://example.invalid',NUVIO_SUPABASE_ANON_KEY:'public'},request,()=>time,storage);
 return {api,calls,setTime:n=>time=n,block:()=>block=true,release:()=>release()};
}
async function login(s){const start=await s.api.call('start');assert.equal(start.code,'ABC123');assert.equal(start.access_token,undefined);assert.equal((await s.api.call('poll')).status,'connected');}
test('pairing, profiles, protected profiles, read-only progress and cache',async()=>{
 const s=setup();await login(s);
 const list=await s.api.call('profiles');assert.equal(list.profiles[1].locked,true);
 await assert.rejects(s.api.call('progress',{profile:2}),/protegido/);
 const data=await s.api.call('progress',{profile:1});assert.equal(data.items[0].progress,40);
 assert.equal(data.items[0].target,'nuvio://detail/movie/tt123');
 await s.api.call('progress',{profile:1});
 assert.equal(s.calls.filter(c=>c.url.endsWith('sync_pull_watch_progress')).length,1);
 assert.equal(s.calls.some(c=>/push_|delete_|set_profile/.test(c.url)),false);
});
test('refreshes session once for concurrent profile calls',async()=>{
 const s=setup();await login(s);s.setTime(5000000);await Promise.all([s.api.call('profiles'),s.api.call('profiles')]);
 assert.equal(s.calls.filter(c=>c.url.endsWith('grant_type=refresh_token')).length,1);
});
test('logout cannot be undone by in-flight progress',async()=>{
 const s=setup();await login(s);s.block();const pending=s.api.call('progress',{profile:1});
 await new Promise(r=>setImmediate(r));await s.api.call('logout');s.release();
 await assert.rejects(pending,/cancelado/);assert.equal((await s.api.call('status')).connected,false);
});
test('filters completed, unstarted, foreign profile; deduplicates latest series',()=>{
 const s=setup();const data=s.api.normalize([
 {content_id:'a',content_type:'series',position:40,duration:100,updated_at:1,episode:1},
 {content_id:'a',content_type:'series',position:50,duration:100,updated_at:2,episode:2},
 {content_id:'b',position:90,duration:100}, {content_id:'c',position:1,duration:100},
 {content_id:'d',progress_percent:50,profile_id:2}, {content_id:'e',progress_percent:85,source:'simkl_playback'},
 {content_id:'f',progress_percent:45,source:'trakt_history'}],1);
 assert.equal(data.length,1);assert.equal(data[0].episode,2);assert.equal(data[0].progress,50);
});

test('session survives reload and rotated tokens are saved; logout removes saved state',async()=>{
 const s=setup();const values={};const storage={getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v,removeItem:k=>delete values[k]};
 const root={crypto:require('node:crypto').webcrypto};
 vm.runInNewContext(source,{window:root,URL,Uint8Array,Date,Promise,Number,Object,Array,Error,encodeURIComponent});
 let now=1000000;
 const transport=async(url,body)=>{
  if(url.endsWith('/signup'))return {access_token:'anon',refresh_token:'anon-r',expires_in:3600};
  if(url.endsWith('start_device_login_session'))return [{device_code:'private',user_code:'ABC123',verification_uri_complete:'https://nuvio.tv/link?code=ABC123'}];
  if(url.endsWith('poll_tv_login_session'))return [{status:'approved'}];
  if(url.endsWith('tv-logins-exchange'))return {access_token:'saved',refresh_token:'saved-r',expires_in:3600};
  if(url.endsWith('grant_type=refresh_token'))return {access_token:'rotated',refresh_token:'rotated-r',expires_in:3600};
  if(url.endsWith('sync_pull_profiles'))return [];
  if(url.endsWith('sync_pull_profile_locks'))return [];
  throw Error(url);
 };
 const config={NUVIO_SUPABASE_URL:'https://example.invalid',NUVIO_SUPABASE_ANON_KEY:'public'};
 let first=root.QuietNuvioFactory(config,transport,()=>now,storage);await first.call('start');await first.call('poll');
 assert.equal(JSON.parse(values['tvhome.nuvio.session.v1']).session.refresh,'saved-r');
 let second=root.QuietNuvioFactory(config,transport,()=>now,storage);assert.equal((await second.call('status')).connected,true);
 now+=4000000;await second.call('profiles');assert.equal(JSON.parse(values['tvhome.nuvio.session.v1']).session.refresh,'rotated-r');
 await second.call('logout');assert.equal(values['tvhome.nuvio.session.v1'],undefined);
 assert.equal((await root.QuietNuvioFactory(config,transport,()=>now,storage).call('status')).connected,false);
});

test('storage failure is visible and corrupted saved sessions do not authenticate',async()=>{
 const blocked={getItem:()=>null,setItem:()=>{throw Error('quota');},removeItem:()=>{throw Error('quota');}};
 const s=setup(blocked);await login(s);assert.equal((await s.api.call('status')).persistenceError,true);
 assert.equal((await s.api.call('logout')).ok,false);
 const bad=setup({getItem:()=>'{bad json',setItem:()=>{},removeItem:()=>{}});
 assert.equal((await bad.api.call('status')).connected,false);
});
