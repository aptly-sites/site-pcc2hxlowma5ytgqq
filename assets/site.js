const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#main-nav');
function closeMenu(focus=false){nav?.classList.remove('open');menu?.setAttribute('aria-expanded','false');if(focus)menu.focus()}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')==='true';nav.classList.toggle('open',!open);menu.setAttribute('aria-expanded',String(!open))});
nav?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(nav?.classList.contains('open'))closeMenu(true);document.querySelectorAll('details.login[open]').forEach(d=>d.open=false)}});
document.querySelectorAll('.lead-form').forEach(form=>form.addEventListener('submit',async e=>{e.preventDefault();if(form.dataset.preview==='true')return;if(!form.reportValidity())return;const status=form.querySelector('.form-status'),button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Sending your request…';const data=Object.fromEntries(new FormData(form));Object.assign(data,{formSource:form.dataset.source,pageTitle:document.title,pageUrl:location.origin+location.pathname});try{const r=await fetch('/api/owner-lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(25000)});let body={};try{body=await r.json()}catch{}if(!r.ok||body.success!==true)throw Error(body.message||'Your request could not be sent. Please call 214.432.4115 or email info@bluecrownproperties.com.');status.textContent='Thank you. Your request has been sent to Blue Crown. Our team will be in touch.';form.reset()}catch(error){status.textContent=error.message}finally{button.disabled=false}}));

// Accessible homepage audience tabs; existing content and live listings stay intact.
const audienceTabs=[...document.querySelectorAll('.audience-tabs [role="tab"]')];
function selectAudience(tab,focus=false){
 audienceTabs.forEach(item=>{const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!selected});
 if(focus)tab.focus();
}
audienceTabs.forEach((tab,index)=>{
 tab.addEventListener('click',()=>selectAudience(tab));
 tab.addEventListener('keydown',event=>{
  let next;if(event.key==='ArrowRight')next=(index+1)%audienceTabs.length;else if(event.key==='ArrowLeft')next=(index+audienceTabs.length-1)%audienceTabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=audienceTabs.length-1;else return;
  event.preventDefault();selectAudience(audienceTabs[next],true);
 });
});

// Tenant resources open on Future Residents; direct links can select the current-resident panel.
const residentTabs=[...document.querySelectorAll('.resident-tabs [role="tab"]')];
function selectResidentTab(tab,focus=false){
 residentTabs.forEach(item=>{const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;document.getElementById(item.getAttribute('aria-controls')).hidden=!selected});
 if(focus)tab.focus();
}
residentTabs.forEach((tab,index)=>{
 tab.addEventListener('click',()=>selectResidentTab(tab));
 tab.addEventListener('keydown',event=>{
  let next;if(event.key==='ArrowRight')next=(index+1)%residentTabs.length;else if(event.key==='ArrowLeft')next=(index+residentTabs.length-1)%residentTabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=residentTabs.length-1;else return;
  event.preventDefault();selectResidentTab(residentTabs[next],true);
 });
});
if(residentTabs.length){
 const selectFromHash=()=>{if(['#current-residents','#current-residents-panel'].includes(location.hash))selectResidentTab(residentTabs[1]);else if(['#future-residents','#selection-criteria'].includes(location.hash))selectResidentTab(residentTabs[0])};
 selectFromHash();window.addEventListener('hashchange',selectFromHash);
}
