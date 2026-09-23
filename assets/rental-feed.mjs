let promise;
export function getRentalFeed(){
 if(!promise)promise=fetch('https://app.getaptly.com/api/portal/listings/PCc2hXLoWma5yTgQQ',{signal:AbortSignal.timeout(15000)}).then(async r=>{if(!r.ok)throw Error('Rental feed unavailable');const body=await r.json();if(!Array.isArray(body.data))throw Error('Invalid rental feed');return body}).catch(error=>{promise=null;throw error});
 return promise;
}
export const coreCities=['Dallas','Fort Worth','Plano','Allen','McKinney','Frisco'];
export function rentalCities(data){const names=new Map(coreCities.map(c=>[c.toLowerCase(),c]));for(const x of data){if(x.publishedForRent===false)continue;const city=typeof x.address?.city==='string'?x.address.city.trim():'';if(city&&!names.has(city.toLowerCase()))names.set(city.toLowerCase(),city)}return [...names.values()].filter(c=>!coreCities.includes(c)).sort((a,b)=>a.localeCompare(b))}
