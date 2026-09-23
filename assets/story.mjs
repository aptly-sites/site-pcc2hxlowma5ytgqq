import {clamp,storyState,validateTimeline} from './story-math.mjs?v=2';
const root=document.querySelector('[data-story]');
if(root){
 const stage=root.querySelector('.story-stage'),video=root.querySelector('video'),chapters=[...root.querySelectorAll('[data-chapter]')],progress=root.querySelector('[data-story-progress]');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobileQuery=matchMedia('(max-width: 700px)'),shortQuery=matchMedia('(max-height: 500px)');
 let timeline,manifest,variant,mobile,enabled=false,ready=false,stopped=false,visible=true,raf=0,scrollDirty=true,p=0,lastChapter=-1,lastCopy=false,lastTime=0,displayTime=0,goal=0,generation=0,controller,objectURL;
 const allowed=()=>!stopped&&!reduced.matches&&!shortQuery.matches&&!navigator.connection?.saveData;
 const active=()=>enabled&&visible&&!document.hidden&&allowed();
 function release(){generation++;controller?.abort();ready=false;video.pause();video.removeAttribute('src');video.load();if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;video.style.opacity='0';lastTime=0}
 function fallback(){enabled=false;release();root.classList.remove('motion-ready');root.style.removeProperty('--story-travel');chapters.forEach((c,i)=>{c.hidden=i!==0;c.inert=i!==0});lastChapter=-1;progress.style.transform='scaleX(0)'}
 function schedule(){if(!raf&&active())raf=requestAnimationFrame(tick)}
 function tick(time){
  raf=0;if(!active())return;
  if(scrollDirty){const r=root.getBoundingClientRect(),top=parseFloat(getComputedStyle(stage).top)||0;p=clamp((top-r.top)/Math.max(1,root.offsetHeight-stage.offsetHeight));scrollDirty=false}
  const state=storyState(p,timeline.beats,mobile);
  if(lastChapter!==state.chapter||lastCopy!==state.copyVisible){chapters.forEach((c,i)=>{const show=i===state.chapter&&state.copyVisible;c.hidden=!show;c.inert=!show});lastChapter=state.chapter;lastCopy=state.copyVisible;root.dataset.chapter=state.id}
  progress.style.transform='scaleX('+p+')';root.dataset.targetFrame=String(state.frame);
  if(!ready)return;
  const end=Math.max(0,video.duration-1/variant.fps);goal=state.framePosition/(variant.frameCount-1)*end;
  // One in-flight seek, always followed by the latest scroll position; never queue obsolete seeks.
  if(video.seeking){lastTime=0;return}
  const dt=lastTime?Math.min(64,time-lastTime):16;lastTime=time;
  displayTime+=(goal-displayTime)*(1-Math.exp(-dt/55));if(Math.abs(goal-displayTime)<1/variant.fps)displayTime=goal;
  if(Math.abs(video.currentTime-displayTime)>=1/(variant.fps*2))video.currentTime=displayTime;
  if(Math.abs(goal-displayTime)>.001)schedule();else lastTime=0;
 }
 video.addEventListener('seeked',()=>{if(!ready)return;video.style.opacity='1';root.dataset.frame=String(Math.round(video.currentTime/Math.max(.01,video.duration-1/variant.fps)*(variant.frameCount-1)));schedule()});
 video.addEventListener('loadeddata',()=>{if(!enabled)return;ready=true;displayTime=video.currentTime;video.style.opacity='1';root.dataset.frame='0';root.dataset.mediaReady='true';schedule()});
 video.addEventListener('error',()=>{if(enabled)fallback()});
 function configure(){
  if(!timeline||!video)return;if(!allowed()){fallback();return}
  const next=mobileQuery.matches;if(enabled&&mobile===next){scrollDirty=true;schedule();return}
  release();mobile=next;variant=manifest.variants[mobile?'mobile':'desktop'];
  try{validateTimeline(timeline,variant);if(!variant.video)throw Error('Missing video')}catch{fallback();return}
  enabled=true;lastChapter=-1;scrollDirty=true;root.dataset.mediaReady='false';root.classList.add('motion-ready');root.style.setProperty('--story-travel',timeline.beats.reduce((n,b)=>n+b[mobile?'mobileVh':'desktopVh'],0)+'svh');schedule();
  // Download only the selected variant once. A local Blob lets the decoder seek without network round trips.
  const current=generation;controller=new AbortController();
  fetch(variant.video,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(45000)])}).then(r=>{if(!r.ok)throw Error('Video unavailable');return r.blob()}).then(blob=>{if(current!==generation||!enabled)return;objectURL=URL.createObjectURL(blob);video.src=objectURL;video.load()}).catch(error=>{if(current===generation&&error.name!=='AbortError')fallback()});
 }
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;lastTime=0;if(visible){scrollDirty=true;schedule()}},{rootMargin:'100px'}).observe(root);
 addEventListener('scroll',()=>{scrollDirty=true;schedule()},{passive:true});addEventListener('resize',()=>{scrollDirty=true;configure()},{passive:true});
 document.addEventListener('visibilitychange',()=>{lastTime=0;if(!document.hidden){scrollDirty=true;schedule()}});
 for(const q of [reduced,mobileQuery,shortQuery])q.addEventListener('change',configure);
 root.querySelector('[data-skip-story]').addEventListener('click',event=>{event.preventDefault();stopped=true;fallback();const main=document.querySelector('#main');main.focus({preventScroll:true});main.scrollIntoView({behavior:'instant'});history.replaceState(null,'','#main')});
 if(location.hash)stopped=true;
 addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0});addEventListener('pageshow',()=>{scrollDirty=true;schedule()});
 if(allowed())Promise.all([fetch('/assets/story/timeline.json?v=4').then(r=>{if(!r.ok)throw Error();return r.json()}),fetch('/assets/story/manifest.json?v=4').then(r=>{if(!r.ok)throw Error();return r.json()})]).then(([t,m])=>{timeline=t;manifest=m;configure()}).catch(fallback);
}
