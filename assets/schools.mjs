import {esc} from './rental-data.mjs';
import {loadGoogleMaps,pillIcon} from './google-maps.mjs?v=1';
const section=document.querySelector('[data-nearby-schools]');
if(section){
 const output=section.querySelector('[data-school-results]');
 const status=section.querySelector('[data-school-status]');
 const retry=section.querySelector('[data-school-retry]');
 let map=null,mapMarkers=[];
 const gradeRange=grades=>{const values=grades.split(',').map(v=>v.trim()).filter(Boolean);return values.length>1?`${values[0]}–${values.at(-1)}`:values[0]||''};
 const location=s=>[s.street,[s.city,s.state].filter(Boolean).join(', '),s.zip].filter(Boolean).join(' ');
 const validPoint=(lat,lon)=>Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
 async function showSchools(data){
  if(map){mapMarkers.forEach(marker=>marker.setMap(null));mapMarkers=[];map=null}
  const schools=data.schools.filter(s=>validPoint(s.lat,s.lon));
  if(!schools.length){output.innerHTML='';status.textContent=data.reason==='location'?'School search is unavailable until this home’s location is confirmed.':'No nearby schools were returned within 5 miles.';return}
  status.textContent=`${schools.length} nearby ${schools.length===1?'school':'schools'} within 5 miles. Select a numbered pin or school below to explore.`;
  output.innerHTML=`<div class="schools-layout"><div class="school-map" data-school-map role="region" aria-label="Map of nearby schools and this rental home"></div><ol class="school-list" aria-label="Nearby schools">${schools.map((s,i)=>{
   const details=[s.type?`${s.type.charAt(0).toUpperCase()}${s.type.slice(1)} school`:'',gradeRange(s.grades)?`Grades ${gradeRange(s.grades)}`:'',s.distance!==null?`${s.distance.toFixed(1)} miles away`:''].filter(Boolean);
   return `<li class="school-card" data-school-index="${i}"><span class="school-number" aria-hidden="true">${i+1}</span><div><h3><a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">${esc(s.name)} <span aria-hidden="true">↗</span></a></h3><p>${details.map(esc).join(' · ')}</p>${location(s)?`<address>${esc(location(s))}</address>`:''}</div></li>`
  }).join('')}</ol></div>`;
  const mapNode=output.querySelector('[data-school-map]');let maps;
  try{maps=await loadGoogleMaps()}catch{mapNode.innerHTML='<p class="school-map-fallback">The school map is unavailable. Browse the school list alongside it.</p>';return}
  map=new maps.Map(mapNode,{center:{lat:32.9,lng:-96.9},zoom:12,scrollwheel:false,mapTypeControl:false,streetViewControl:false,fullscreenControl:false});
  const bounds=new maps.LatLngBounds(),points=[],info=new maps.InfoWindow();
  if(data.home&&validPoint(data.home.lat,data.home.lon)){
   const home={lat:data.home.lat,lng:data.home.lon};points.push(home);bounds.extend(home);
   const homeMarker=new maps.Marker({map,position:home,title:'Rental home',label:{text:'⌂',color:'#fff',fontSize:'18px',fontWeight:'700'},icon:pillIcon(maps,'#345ce5',38,38),zIndex:1});
   homeMarker.addListener('click',()=>{info.setContent('<strong>Rental home</strong>');info.open({map,anchor:homeMarker})});mapMarkers.push(homeMarker);
  }
  schools.forEach((s,i)=>{
   const point={lat:s.lat,lng:s.lon};points.push(point);bounds.extend(point);
   const marker=new maps.Marker({map,position:point,title:`${i+1}. ${s.name}`,label:{text:String(i+1),color:'#fff',fontSize:'12px',fontWeight:'700'},icon:pillIcon(maps,'#142653',36,36),zIndex:100});mapMarkers.push(marker);
   const open=()=>{info.setContent(`<strong>${i+1}. ${esc(s.name)}</strong><br>${esc([s.type?`${s.type} school`:'',gradeRange(s.grades)?`Grades ${gradeRange(s.grades)}`:''].filter(Boolean).join(' · '))}<br><a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">School profile ↗</a>`);info.open({map,anchor:marker})};marker.addListener('click',open);
   const card=output.querySelector(`[data-school-index="${i}"]`);
   card.addEventListener('mouseenter',()=>marker.setZIndex(500));
   card.addEventListener('mouseleave',()=>marker.setZIndex(100));
   card.addEventListener('focusin',()=>{open();marker.setZIndex(500)});
   card.addEventListener('focusout',()=>marker.setZIndex(100));
  });
  if(points.length===1){map.setCenter(points[0]);map.setZoom(13)}else{map.fitBounds(bounds,30);maps.event.addListenerOnce(map,'idle',()=>{if(map.getZoom()>14)map.setZoom(14)})}
 }
 async function load(){
  retry.hidden=true;status.textContent='Finding nearby schools…';section.setAttribute('aria-busy','true');
  try{
   const query='?listing='+encodeURIComponent(section.dataset.nearbySchools);
   const r=await fetch('/api/nearby-schools'+query,{signal:AbortSignal.timeout(25000),cache:'no-store'});
   if(!r.ok)throw Error('schools');const data=await r.json();if(!Array.isArray(data.schools))throw Error('schools');
   await showSchools(data);
  }catch{output.innerHTML='';status.textContent='Nearby schools are temporarily unavailable. You can still explore schools on GreatSchools.org.';retry.hidden=false}
  finally{section.removeAttribute('aria-busy')}
 }
 retry.addEventListener('click',load);
 if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){observer.disconnect();load()}},{rootMargin:'250px'});observer.observe(section)}else load();
}
