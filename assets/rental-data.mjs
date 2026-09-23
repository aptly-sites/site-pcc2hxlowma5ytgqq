export const widget='https://portal.getaptly.com/search/PCc2hXLoWma5yTgQQ/';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safe=u=>{try{return new URL(u).protocol==='https:'?u:''}catch{return ''}};
export const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const title=x=>x.marketingName||x.name||x.address?.address||'Home for rent';
export const path=x=>'/properties/'+slug(x.address?.city||'texas')+'-tx/'+slug(x.marketingName||x.name||'home')+'-'+encodeURIComponent(x._id)+'/';
export const photos=x=>[...new Set([...(x.photo||[]),...(x.marketingFiles||[])].filter(u=>typeof u==='string').map(u=>safe(u.startsWith('https://workturbo.net/cdn-cgi/image//https://')?u.split('image//')[1]:u)).filter(Boolean))];
export const amount=n=>Number.isFinite(n)?'$'+(n/100).toLocaleString('en-US',{maximumFractionDigits:0}):'Contact for details';
export const money=x=>amount(x.marketRent?.amount);
export const tour=x=>safe(x.showingUrl)||safe(x.aptlyShowings?.link)||widget;
export const apply=x=>safe(x.applicationUrl)||safe(x.aptlyScreening?.link)||widget;
export const coords=x=>{const p=x.address?.geopoint;return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90&&!(p[0]===0&&p[1]===0)?[p[1],p[0]]:null};
export function filterHomes(items,f={}){return items.filter(x=>x.publishedForRent!==false&&(!f.city||(x.address?.city||'').trim().toLowerCase()===f.city.trim().toLowerCase())&&(!f.search||[x.name,x.marketingName,x.address?.formattedAddress,x.address?.city,x.address?.address].join(' ').toLowerCase().includes(f.search.toLowerCase().trim()))&&(!f.rent||(Number.isFinite(x.marketRent?.amount)&&x.marketRent.amount/100<=Number(f.rent)))&&(!f.beds||x.beds>=Number(f.beds))&&(!f.baths||x.baths>=Number(f.baths))&&(!f.type||x.unitType===f.type))}
export const availability=x=>{const d=new Date(x.availableDate);return Number.isNaN(+d)?'Check availability':d>new Date()?'Available '+d.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'}):'Available now'};
