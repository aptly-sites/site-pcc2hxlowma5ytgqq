// Ported verbatim from the source repo's listing-render.mjs (used by its Worker to
// render live/snapshot listing pages) — only this import path changed, adjusted from
// the repo root to this file's location under functions/_lib/.
import {esc as e,title,photos,money,amount,tour,apply,coords,availability,safe,path} from '../../assets/rental-data.mjs';
export function virtualTourSection(x){
 const url=safe(x.virtualTourUrl);if(!url)return '';
 const host=new URL(url).hostname;
 const embed=['www.insidemaps.com','insidemaps.com','my.matterport.com'].includes(host);
 const frameUrl=new URL(url);
 if(['www.insidemaps.com','insidemaps.com'].includes(host)){
  if(frameUrl.pathname==='/app/walkthrough-tour/'&&frameUrl.searchParams.has('p')){
   frameUrl.pathname='/app/walkthrough-v2/';frameUrl.searchParams.set('projectId',frameUrl.searchParams.get('p'));frameUrl.searchParams.delete('p');
  }
  frameUrl.searchParams.set('embedded','true');frameUrl.searchParams.set('openInNewTab','false');
 }
 return `<section class="detail-section virtual-tour-section" id="virtual-tour"><span class="eyebrow">STEP INSIDE</span><h2>Explore the virtual tour</h2><p>Select Play to explore the home here. Drag to look around, use the tour controls to move through rooms, or expand to full screen.</p>${embed?`<iframe class="virtual-tour-frame" src="${e(frameUrl.href)}" title="Virtual tour of ${e(title(x))}" loading="eager" allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`:''}<a class="textlink" href="${e(url)}" target="_blank" rel="noopener">Open virtual tour in a new tab ↗</a></section>`;
}
export function renderListing(template,x,{snapshot=false}={}){
 const name=title(x), images=photos(x), city=x.address?.city||'North Texas', address=x.address?.formattedAddress||x.address?.address||name, point=coords(x);
 const pets=typeof x.petsAllowed==='boolean'?(x.petsAllowed?'Pets allowed; confirm restrictions.':'Contact us about the pet policy.'):(x.petsAllowed||'Contact us for the pet policy.');
 const icons={rent:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01M18 15h.01"/>',beds:'<path d="M3 18v-7h18v7M3 15h18M5 11V6h14v5M8 11V8h8v3"/>',baths:'<path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4ZM5 12V5a2 2 0 0 1 4 0M6 19v2M18 19v2"/>',area:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 17 17 7M7 12v5h5M12 7h5v5"/>'};
 const icon=k=>k?`<svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[k]}</svg>`:'';
 const fact=(label,value,symbol)=>`<div><dt>${e(label)}</dt><dd>${icon(symbol)}${e(value??'Contact for details')}</dd></div>`;
 const gallery=images.slice(0,5).map((u,i)=>`<button class="gallery-photo" data-photo-index="${i}" aria-label="Open photo ${i+1} of ${images.length}"><img src="${e(u)}" alt="${e(name)} — property photo ${i+1}" ${i?'loading="lazy"':'fetchpriority="high"'}>${i===4?`<span>View all ${images.length} photos</span>`:''}</button>`).join('');
 const body=`<main id="main" class="rental-detail" data-snapshot="${snapshot}" data-listing-id="${e(x._id)}"><div class="wrap"><nav class="rental-breadcrumb" aria-label="Breadcrumb"><a href="/properties/">Homes for rent</a><span>›</span><span>${e(city)}, TX</span><span>›</span><span>${e(x.name||name)}</span></nav><div class="rental-gallery ${images.length<5?'few-photos':''}">${gallery||'<p>Property photos coming soon.</p>'}</div>${images.length?`<button class="gallery-all button outline" data-photo-index="0">View all ${images.length} photos</button>`:''}<div data-all-photos hidden>${images.map(u=>`<a href="${e(u)}">Photo</a>`).join('')}</div><p class="results-status" data-detail-status role="status">${snapshot?'September 22, 2026 snapshot · Checking current availability…':''}</p>
<div class="rental-detail-columns"><article><span class="eyebrow">AVAILABLE RENTAL IN ${e(city.toUpperCase())}, TX</span><h1>${e(x.marketingName||`${x.beds===0?'Studio':x.beds?x.beds+'-Bedroom Home':'Home'} for Rent in ${city}`)}</h1><p class="property-address">${e(address)}</p><dl class="rental-stats">${fact('Monthly rent',money(x),'rent')}${fact('Bedrooms',x.beds,'beds')}${fact('Bathrooms',x.baths,'baths')}${fact('Square feet',x.totalArea?.toLocaleString('en-US'),'area')}</dl>
<section id="tour-times" class="detail-section tour-section"><span class="eyebrow">COME TAKE A LOOK</span><h2>Tour your next home.</h2><p>See current tour times and schedule your visit through this home’s showing provider.</p><a class="button" href="${e(tour(x))}">View tour availability ↗</a></section>
<section class="detail-section"><span class="eyebrow">PROPERTY DETAILS</span><h2>Rental features</h2><dl class="rental-features">${fact('Property type',x.unitType)}${fact('Availability',availability(x))}${fact('Address',address)}${fact('Pets',pets)}${fact('Security deposit',amount(x.deposit?.amount))}${Array.isArray(x.petRestrictions)&&x.petRestrictions.length?fact('Pet details',x.petRestrictions.join(' · ')):''}</dl>${Array.isArray(x.unitAmenities)&&x.unitAmenities.length?`<ul class="amenities">${x.unitAmenities.filter(v=>typeof v==='string').map(v=>`<li>${e(v)}</li>`).join('')}</ul>`:''}<h2>About this ${e(city)} rental</h2><p class="description">${e(x.marketingDescription||'Contact Blue Crown for more information about this home.')}</p></section>
${virtualTourSection(x)}
<section class="detail-section"><span class="eyebrow">QUICK ANSWERS</span><h2>Rental questions answered</h2><details open><summary>How much is the monthly rent?</summary><p>${money(x)} is the advertised base rent. Final lease terms and applicable fees control.</p></details><details><summary>How many bedrooms and bathrooms does this home have?</summary><p>${e(x.beds??'Contact for')} bedrooms and ${e(x.baths??'contact for')} bathrooms${x.totalArea?`, with approximately ${e(x.totalArea.toLocaleString('en-US'))} square feet`:''}.</p></details><details><summary>How do I schedule a tour?</summary><p><a class="textlink" href="${e(tour(x))}">View live tour availability and schedule a visit ↗</a></p></details><details><summary>Are pets allowed?</summary><p>${e(pets)} ${e((x.petRestrictions||[]).join?.(' · ')||'')} Confirm pet requirements and any fees before applying.</p></details></section>
<section class="detail-section pricing-breakdown"><span class="eyebrow">PLAN YOUR NEXT MOVE</span><h2>Pricing breakdown</h2><dl>${fact('Monthly rent',money(x))}${fact('Security deposit',amount(x.deposit?.amount))}</dl><p>These advertised amounts are for planning purposes. Additional or conditional fees may apply. Confirm the full costs, availability, and selection criteria before applying.</p><a class="textlink" href="/residents/#selection-criteria">Read tenant selection criteria ↗</a></section></article>
<aside class="rental-cta"><span class="eyebrow">READY TO SEE IT?</span><h2>Make this your<br>next home.</h2><p class="rent">${money(x)} <small>/ month</small></p><p>Schedule a tour or start your application with Blue Crown.</p><div class="actions" data-listing-actions>${safe(x.virtualTourUrl)?'<a class="button outline" href="#virtual-tour">Explore virtual tour ↓</a>':''}<a class="button" href="${e(tour(x))}">View tour times ↗</a><a class="button outline" href="${e(apply(x))}">Apply now ↗</a></div><hr><strong>Blue Crown Properties</strong><a href="tel:+12144324115">214.432.4115</a><a href="mailto:info@bluecrownproperties.com">info@bluecrownproperties.com</a></aside></div>
<section class="detail-section nearby-schools" data-nearby-schools="${e(x._id)}"><span class="eyebrow">LEARN ABOUT THE AREA</span><h2>Nearby schools</h2><p>Explore schools near this home, from elementary through high school.</p><p data-school-status role="status">School information loads as you explore this section.</p><div data-school-results></div><button class="button outline" data-school-retry hidden>Try again</button><div class="schools-footer"><a class="textlink" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(point?point.join(','):address)}" target="_blank" rel="noopener noreferrer">Explore the area in Google Maps ↗</a><div class="schools-credit"><a href="https://www.greatschools.org/" rel="nofollow"><img src="/assets/affiliations/greatschools.png" alt="GreatSchools.org" width="95" loading="lazy"></a><span>School data provided by <a href="https://www.greatschools.org/" rel="nofollow">GreatSchools.org</a> © ${new Date().getFullYear()}. All rights reserved.</span></div></div><noscript><p><a href="https://www.greatschools.org/texas/${e(city.toLowerCase().replace(/[^a-z]+/g,'-'))}/" rel="nofollow">Explore schools in ${e(city)} on GreatSchools.org ↗</a></p></noscript></section><section class="detail-section" data-related-section hidden><span class="eyebrow">KEEP EXPLORING</span><h2>More homes you may like</h2><div class="rental-cards related-homes" data-related></div></section></div></main>`;
 const origin='https://blue-crown-property-management.sshekou.chatgpt.site';
 const url=origin+path(x);
 const seoTitle=`${name} for Rent | Blue Crown Properties`;
 const seoDescription=`${name} in ${city}, Texas — ${money(x)} per month. View photos, details, tours, and application information from Blue Crown.`;
 const socialImage=images[0]||origin+'/assets/story/desktop-poster.webp';
 const schema={
  '@context':'https://schema.org',
  '@graph':[
   {'@type':'Organization','@id':origin+'/#organization',name:'Blue Crown Properties',url:origin+'/'},
   {'@type':'WebSite','@id':origin+'/#website',url:origin+'/',name:'Blue Crown Properties',publisher:{'@id':origin+'/#organization'}},
   {'@type':'WebPage','@id':url+'#webpage',url,name:seoTitle,description:seoDescription,isPartOf:{'@id':origin+'/#website'},about:{'@id':origin+'/#organization'},primaryImageOfPage:{'@type':'ImageObject',url:socialImage},breadcrumb:{'@id':url+'#breadcrumb'}},
   {'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:[
    {'@type':'ListItem',position:1,name:'Home',item:origin+'/'},
    {'@type':'ListItem',position:2,name:'Available homes',item:origin+'/properties/'},
    {'@type':'ListItem',position:3,name:name,item:url}
   ]}
  ]
 };
 const jsonLd=JSON.stringify(schema).replaceAll('<','\\u003c');
 let html=template.replace(/<main\b[\s\S]*?<\/main>/,body)
  .replace(/<title>.*?<\/title>/,`<title>${e(seoTitle)}</title>`)
  .replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${e(seoDescription)}">`)
  .replace(/<link rel="canonical" href="[^"]*">/,`<link rel="canonical" href="${e(url)}">`)
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,`<script type="application/ld+json">${jsonLd}</script>`);
 for(const [key,content] of Object.entries({'og:title':seoTitle,'og:description':seoDescription,'og:url':url,'og:image':socialImage,'og:image:alt':`Photo of ${name}`,'twitter:title':seoTitle,'twitter:description':seoDescription,'twitter:image':socialImage})){
  const attr=key.startsWith('og:')?'property':'name';
  const tag=`<meta ${attr}="${e(key)}" content="${e(content)}">`;
  const pattern=new RegExp(`<meta ${attr}="${key}" content="[^"]*">`);
  html=pattern.test(html)?html.replace(pattern,tag):html.replace('</head>',tag+'</head>');
 }
 return html.replace('</head>','<script type="module" src="/assets/schools.mjs?v=3"></script></head>');
}
