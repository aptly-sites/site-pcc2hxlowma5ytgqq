export function rentReduction(a){
 const keys=['currentRent','reducedRent','currentDays','reducedDays','lawn','utilities'];
 if(keys.some(k=>!Number.isFinite(a[k])||a[k]<0))throw Error('Enter a nonnegative number for every assumption.');
 if(a.currentRent<=0||a.reducedRent<=0)throw Error('Both monthly rents must be greater than zero.');
 if(a.reducedRent>a.currentRent)throw Error('The proposed rent must be equal to or lower than the current rent.');
 if(a.currentDays>365||a.reducedDays>365)throw Error('Use vacancy estimates between 0 and 365 days.');
 const carrying=(a.lawn+a.utilities)*12/365;
 const income=(rent,vacant,day)=>Math.max(0,day-vacant)*rent*12/365-Math.min(day,vacant)*carrying;
 const current=income(a.currentRent,a.currentDays,365),reduced=income(a.reducedRent,a.reducedDays,365);
 const breakEvenDays=(a.reducedRent*12-current)/(a.reducedRent*12/365+carrying);
 const rows=Array.from({length:13},(_,month)=>({month,current:income(a.currentRent,a.currentDays,month*365/12),reduced:income(a.reducedRent,a.reducedDays,month*365/12)}));
 const points=[...new Set([0,a.currentDays,a.reducedDays,...rows.map(r=>r.month*365/12),365])].sort((x,y)=>x-y).map(day=>({month:day*12/365,current:income(a.currentRent,a.currentDays,day),reduced:income(a.reducedRent,a.reducedDays,day)}));
 return {current,reduced,difference:reduced-current,discount:a.currentRent-a.reducedRent,breakEvenDays,rows,points,currentGross:a.currentRent*12*(365-a.currentDays)/365,reducedGross:a.reducedRent*12*(365-a.reducedDays)/365,currentCarrying:a.currentDays*carrying,reducedCarrying:a.reducedDays*carrying};
}
export function reductionChart(r,money){
 const lo=Math.min(0,...r.points.flatMap(p=>[p.current,p.reduced])),hi=Math.max(1,...r.points.flatMap(p=>[p.current,p.reduced]));
 const x=m=>62+m/12*450,y=v=>220-(v-lo)/(hi-lo)*180;
 const line=k=>r.points.map(p=>`${x(p.month)},${y(p[k])}`).join(' ');
 return `<figure class="reduction-chart"><figcaption>Cumulative rent after vacancy costs</figcaption><div class="chart-legend"><span>━ Option A · Current price</span><span>┄ Option B · Lower price</span></div><svg viewBox="0 0 540 260" role="img" aria-label="Current rent and reduced rent income over 12 months. Detailed values in the table below.">${[0,.5,1].map(f=>{const v=lo+(hi-lo)*f;return `<line x1="62" x2="512" y1="${y(v)}" y2="${y(v)}" stroke="#dde3ed"/><text x="55" y="${y(v)+4}" text-anchor="end">${money(v)}</text>`}).join('')}<polyline points="${line('current')}" fill="none" stroke="#142653" stroke-width="3"/><polyline points="${line('reduced')}" fill="none" stroke="#345ce5" stroke-width="3" stroke-dasharray="7 4"/>${[0,3,6,9,12].map(m=>`<text x="${x(m)}" y="245" text-anchor="middle">${m===0?'Now':m+' mo'}</text>`).join('')}<line class="chart-cursor" x1="512" x2="512" y1="35" y2="222" stroke="#657087" stroke-dasharray="3 3"/></svg><label>Explore month <output data-chart-month>12</output><input data-chart-slider type="range" min="0" max="12" value="12" step="1" aria-label="Explore comparison month"></label><p data-chart-readout role="status"></p></figure>`;
}
