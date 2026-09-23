import {esc} from './rental-data.mjs';
const section=document.querySelector('[data-nearby-schools]');
if(section){
 const output=section.querySelector('[data-school-results]');
 const status=section.querySelector('[data-school-status]');
 const retry=section.querySelector('[data-school-retry]');
 let map=null;
 const gradeRange=grades=>{const values=grades.split(',').map(v=>v.trim()).filter(Boolean);return values.length>1?`${values[0]}–${values.at(-1)}`:values[0]||''};
 const location=s=>[s.street,[s.city,s.state].filter(Boolean).join(', '),s.zip].filter(Boolean).join(' ');
 const validPoint=(lat,lon)=>Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
 function showSchools(data){
  if(map){map.remove();map=null}
  const schools=data.schools.filter(s=>validPoint(s.lat,s.lon));
  if(!schools.length){output.innerHTML='';status.textContent=data.reason==='location'?'School search is unavailable until this home’s location is confirmed.':'No nearby schools were returned within 5 miles.';return}
  status.textContent=`${schools.length} nearby ${schools.length===1?'school':'schools'} within 5 miles. Select a numbered pin or school below to explore.`;
  output.innerHTML=`<div class="schools-layout"><div class="school-map" data-school-map role="region" aria-label="Map of nearby schools and this rental home"></div><ol class="school-list" aria-label="Nearby schools">${schools.map((s,i)=>{
   const details=[s.type?`${s.type.charAt(0).toUpperCase()}${s.type.slice(1)} school`:'',gradeRange(s.grades)?`Grades ${gradeRange(s.grades)}`:'',s.distance!==null?`${s.distance.toFixed(1)} miles away`:''].filter(Boolean);
   return `<li class="school-card" data-school-index="${i}"><span class="school-number" aria-hidden="true">${i+1}</span><div><h3><a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.name)} <span aria-hidden="true">↗</span></a></h3><p>${details.map(esc).join(' · ')}</p>${location(s)?`<address>${esc(location(s))}</address>`:''}</div></li>`
  }).join('')}</ol></div>`;
  const mapNode=output.querySelector('[data-school-map]');
  if(!window.L){mapNode.innerHTML='<p class="school-map-fallback">The school map is unavailable. Browse the school list alongside it.</p>';return}
  map=window.L.map(mapNode,{scrollWheelZoom:false,zoomControl:true});
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  const points=[];
  if(data.home&&validPoint(data.home.lat,data.home.lon)){
   const home=[data.home.lat,data.home.lon];points.push(home);
   const homeIcon=window.L.divIcon({className:'school-pin-wrap',html:'<span class="school-home-pin" aria-label="Rental home">⌂</span>',iconSize:[36,36],iconAnchor:[18,18]});
   window.L.marker(home,{icon:homeIcon,zIndexOffset:-500,title:'Rental home'}).bindPopup('<strong>Rental home</strong>').addTo(map);
  }
  schools.forEach((s,i)=>{
   const point=[s.lat,s.lon];points.push(point);
   const icon=window.L.divIcon({className:'school-pin-wrap',html:`<span class="school-map-pin" aria-label="School ${i+1}">${i+1}</span>`,iconSize:[34,34],iconAnchor:[17,17]});
   const marker=window.L.marker(point,{icon,zIndexOffset:100,title:`${i+1}. ${s.name}`}).bindPopup(`<strong>${i+1}. ${esc(s.name)}</strong><br>${esc([s.type?`${s.type} school`:'',gradeRange(s.grades)?`Grades ${gradeRange(s.grades)}`:''].filter(Boolean).join(' · '))}<br><a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">School profile ↗</a>`).addTo(map);
   const card=output.querySelector(`[data-school-index="${i}"]`);
   card.addEventListener('mouseenter',()=>marker.setZIndexOffset(500));
   card.addEventListener('mouseleave',()=>marker.setZIndexOffset(100));
   card.addEventListener('focusin',()=>{marker.openPopup();marker.setZIndexOffset(500)});
   card.addEventListener('focusout',()=>marker.setZIndexOffset(100));
  });
  if(points.length===1)map.setView(points[0],13);else map.fitBounds(points,{padding:[30,30],maxZoom:14});
  requestAnimationFrame(()=>map?.invalidateSize());
 }
 async function load(){
  retry.hidden=true;status.textContent='Finding nearby schools…';section.setAttribute('aria-busy','true');
  try{
   const r=await fetch('/api/nearby-schools?listing='+encodeURIComponent(section.dataset.nearbySchools),{signal:AbortSignal.timeout(25000),cache:'no-store'});
   if(!r.ok)throw Error('schools');const data=await r.json();if(!Array.isArray(data.schools))throw Error('schools');
   showSchools(data);
  }catch{output.innerHTML='';status.textContent='Nearby schools are temporarily unavailable. You can still explore schools on GreatSchools.org.';retry.hidden=false}
  finally{section.removeAttribute('aria-busy')}
 }
 retry.addEventListener('click',load);
 if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){observer.disconnect();load()}},{rootMargin:'250px'});observer.observe(section)}else load();
}
