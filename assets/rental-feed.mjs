let promise;
const feedUrl='https://app.getaptly.com/api/portal/listings/PCc2hXLoWma5yTgQQ';
export async function fetchRentalPage(page,fetcher=fetch,timeoutMs=15000){
 const url=page?`${feedUrl}?page=${page}`:feedUrl;
 const response=await fetcher(url,{signal:AbortSignal.timeout(timeoutMs)});
 if(!response.ok)throw Error('Rental feed unavailable');
 const body=await response.json();
 if(!Array.isArray(body.data)||!Number.isSafeInteger(body.total)||body.total<0)throw Error('Invalid rental feed');
 return body;
}
export async function fetchRentalPages(fetcher=fetch,timeoutMs=15000){
 const first=await fetchRentalPage(0,fetcher,timeoutMs),data=[],seen=new Set();
 const add=listings=>{for(const listing of listings)if(!seen.has(listing._id)){seen.add(listing._id);data.push(listing)}};
 add(first.data);
 for(let page=1;data.length<first.total;page++){
  const next=await fetchRentalPage(page,fetcher,timeoutMs),before=data.length;
  add(next.data);
  if(data.length===before)throw Error('Incomplete rental feed');
 }
 return {...first,data};
}
export async function findPublishedRental(id,fetcher=fetch,timeoutMs=10000){
 const first=await fetchRentalPage(0,fetcher,timeoutMs);
 let listing=first.data.find(x=>x._id===id&&x.publishedForRent!==false);
 let checked=first.data.length;
 for(let page=1;!listing&&checked<first.total;page++){
  const next=await fetchRentalPage(page,fetcher,timeoutMs);
  if(!next.data.length)throw Error('Incomplete rental feed');
  checked+=next.data.length;
  listing=next.data.find(x=>x._id===id&&x.publishedForRent!==false);
 }
 return listing||null;
}
export function getRentalFeed(){
 if(!promise)promise=fetchRentalPages().catch(error=>{promise=null;throw error});
 return promise;
}
export const coreCities=['Dallas','Fort Worth','Plano','Allen','McKinney','Frisco'];
export function rentalCities(data){const names=new Map(coreCities.map(c=>[c.toLowerCase(),c]));for(const x of data){if(x.publishedForRent===false)continue;const city=typeof x.address?.city==='string'?x.address.city.trim():'';if(city&&!names.has(city.toLowerCase()))names.set(city.toLowerCase(),city)}return [...names.values()].filter(c=>!coreCities.includes(c)).sort((a,b)=>a.localeCompare(b))}
