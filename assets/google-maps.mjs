let mapsPromise;

export function loadGoogleMaps(){
 if(mapsPromise)return mapsPromise;
 mapsPromise=fetch('/assets/config.json',{headers:{accept:'application/json'}})
  .then(response=>{if(!response.ok)throw new Error('Map configuration is unavailable.');return response.json()})
  .then(config=>new Promise((resolve,reject)=>{
   if(window.google?.maps){resolve(window.google.maps);return}
   if(!config.googleMapsApiKey)throw new Error('Google Maps is not configured.');
   const callback='blueCrownGoogleMapsReady';
   window[callback]=()=>{delete window[callback];resolve(window.google.maps)};
   const script=document.createElement('script');
   script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.googleMapsApiKey)}&loading=async&v=weekly&callback=${callback}`;
   script.async=true;
   script.onerror=()=>{delete window[callback];reject(new Error('Google Maps could not load.'))};
   document.head.append(script);
  }))
  .catch(error=>{mapsPromise=undefined;throw error});
 return mapsPromise;
}

export function pillIcon(maps,color='#142653',width=82,height=34){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="1.5" y="1.5" width="${width-3}" height="${height-3}" rx="${height/2}" fill="${color}" stroke="white" stroke-width="3"/><path d="M${width/2-7} ${height-2}h14L${width/2} ${height+5}z" fill="${color}"/></svg>`;
 return {url:`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,scaledSize:new maps.Size(width,height),anchor:new maps.Point(width/2,height/2)};
}
