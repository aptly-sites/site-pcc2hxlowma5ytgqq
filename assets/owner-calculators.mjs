import {rentReduction,reductionChart} from './rent-reduction.mjs?v=2';
import {estimate} from './owner-calculator-math.mjs';
import {managementChart,evictionChart,rentSellChart} from './owner-calculator-charts.mjs?v=1';
import {esc} from './rental-data.mjs?v=2';
const root=document.querySelector('[data-calculator]'),calculator=root.querySelector('form'),out=root.querySelector('.scenario-results'),lead=document.querySelector('.lead-form');
const money=v=>v.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
let summary='';
let timeUnit='weeks';
const unitDays={days:1,weeks:7,months:365/12};
const durationDays={currentDays:42,reducedDays:14};
if(root.dataset.calculator==='rent-reduction'){
 for(const key of ['currentDays','reducedDays'])calculator.elements[key].addEventListener('input',()=>{durationDays[key]=calculator.elements[key].value===''?NaN:Number(calculator.elements[key].value)*unitDays[timeUnit]});
 root.querySelectorAll('[data-time-choice]').forEach(button=>button.addEventListener('click',()=>{
  timeUnit=button.dataset.timeChoice;
  for(const key of ['currentDays','reducedDays']){const input=calculator.elements[key];input.max=String(365/unitDays[timeUnit]);input.value=Number.isFinite(durationDays[key])?String(Math.min(Number((durationDays[key]/unitDays[timeUnit]).toFixed(2)),365/unitDays[timeUnit])):'';}
  root.querySelectorAll('[data-time-unit]').forEach(n=>n.textContent=timeUnit);
  root.querySelectorAll('[data-time-choice]').forEach(n=>n.setAttribute('aria-pressed',String(n===button)));
  calculate();
 }));
}
const address=calculator.elements.propertyAddress,leadAddress=lead.elements.address;
address.addEventListener('input',()=>leadAddress.value=address.value);leadAddress.addEventListener('input',()=>{address.value=leadAddress.value;calculate()});
lead.querySelector('textarea').maxLength=700;
const share=document.createElement('label');share.className='calculator-share';share.innerHTML='<input type="checkbox" name="includeCalculation" checked> Include these calculator assumptions and results with my inquiry';lead.querySelector('.notice').before(share);
const table=rows=>'<dl class="owner-result-rows">'+rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(typeof v==='number'?money(v):v)}</dd></div>`).join('')+'</dl>';
function calculate(){
 if(!calculator.checkValidity()){summary='';out.textContent='Check the assumptions to see an updated estimate.';return false}
 try{
  const a=Object.fromEntries([...new FormData(calculator)].filter(([k])=>k!=='propertyAddress').map(([k,v])=>[k,v===''?NaN:Number(v)]));if(root.dataset.calculator==='rent-reduction')Object.assign(a,durationDays);const r=root.dataset.calculator==='rent-reduction'?rentReduction(a):estimate(root.dataset.calculator,a);let result;
  if(root.dataset.calculator==='rent-reduction'){
   result=[['Option A: rent collected',r.currentGross],['Option A: vacancy costs',r.currentCarrying],['Option A: net rent',r.current],['Option B: rent collected',r.reducedGross],['Option B: vacancy costs',r.reducedCarrying],['Option B: net rent',r.reduced],['Lower-price advantage / disadvantage',r.difference],['Monthly rent reduction',r.discount]];
   const threshold=r.breakEvenDays<0?'Even immediate occupancy at the lower rent would not match the current-price scenario over this period.':`The lower price breaks even if it leases within ${(r.breakEvenDays/unitDays[timeUnit]).toFixed(2)} ${timeUnit} from today. Leasing sooner puts it ahead; later leaves it behind.`;
   const headline=Math.abs(r.difference)<.005?'Both scenarios are equal.':r.difference>0?`${money(r.difference)} ahead at the lower rent`:`${money(-r.difference)} ahead at the current rent`;
   out.innerHTML=`<span class="eyebrow">YOUR 12-MONTH COMPARISON</span><p class="comparison-property">${esc(address.value.trim()||'Enter an address to label your property comparison.')}</p><h2>${headline}</h2><p>${threshold}</p>${reductionChart(r,money)}${table(result)}<details><summary>Monthly comparison data</summary><div class="owner-year-table"><table><thead><tr><th>Month</th><th>Option A</th><th>Option B</th></tr></thead><tbody>${r.rows.map(p=>`<tr><th>${p.month}</th><td>${money(p.current)}</td><td>${money(p.reduced)}</td></tr>`).join('')}</tbody></table></div></details>`;
   const slider=out.querySelector('[data-chart-slider]');const showMonth=()=>{const row=r.rows[Number(slider.value)];out.querySelector('[data-chart-month]').value=slider.value;out.querySelector('[data-chart-readout]').textContent=`Month ${row.month}: Option A ${money(row.current)} · Option B ${money(row.reduced)}`;const cursor=out.querySelector('.chart-cursor');cursor.setAttribute('x1',62+row.month/12*450);cursor.setAttribute('x2',62+row.month/12*450)};slider.addEventListener('input',showMonth);showMonth();
  }else if(root.dataset.calculator==='rent-vs-sell'){
   result=[['Rent then sell',r.rentOutcome],['Sell now with assumed growth',r.sellOutcome],['Difference',r.rentOutcome-r.sellOutcome],['First-year rental cash flow',r.firstYear]];
   out.innerHTML='<span class="eyebrow">YOUR '+a.years+'-YEAR COMPARISON</span><h2>Two paths for your property.</h2>'+rentSellChart(r,money)+table(result)+'<div class="owner-year-table"><table><caption>Year-by-year projected outcomes</caption><thead><tr><th>Year</th><th>Rent then sell</th><th>Sell now</th><th>Difference</th></tr></thead><tbody>'+r.rows.map(y=>`<tr><th>${y.year}</th><td>${money(y.rentOutcome)}</td><td>${money(y.sellOutcome)}</td><td>${money(y.rentOutcome-y.sellOutcome)}</td></tr>`).join('')+'</tbody></table></div>';
  }else if(root.dataset.calculator==='pm-fee-roi'){
   result=[['Annual management fee',r.fee],['Time value saved',r.time],['Maintenance savings',r.maintenance],['Vacancy benefit / loss',r.vacancy],['Total potential benefit',r.benefit],['Net economic benefit',r.net],['Cash benefit excluding time',r.cash],['ROI on management fee',r.roi===null?'Not defined with a zero fee':r.roi.toFixed(1)+'%']];
   out.innerHTML='<span class="eyebrow">ANNUAL COST & BENEFIT</span><h2>'+money(r.net)+'</h2><p>Estimated net economic benefit under your assumptions.</p>'+managementChart(r,money)+table(result);
  }else{
   result=[...r.rows,['Total estimated cost',r.total],['Cost excluding your time',r.cash]];
   out.innerHTML='<span class="eyebrow">ESTIMATED TOTAL COST</span><h2>'+money(r.total)+'</h2><p>'+(r.months===null?'Enter rent to compare with months of income.':'Equivalent to '+r.months.toFixed(1)+' months of rent.')+'</p>'+evictionChart(r,money)+table(result);
  }
  const assumptions=(root.dataset.calculator==='rent-reduction'?'Time on market measured in '+timeUnit+'. ':'')+[...calculator.querySelectorAll('input[type=number]')].map(n=>n.parentElement.textContent.trim()+': '+n.value).join('; ');
  summary='Assumptions: '+assumptions+'\nResults: '+result.map(([k,v])=>k+': '+(typeof v==='number'?money(v):v)).join('; ')+'\nIllustrative estimate; not a quote or guarantee.';
  return true;
 }catch(error){summary='';out.textContent=error.message;return false}
}
calculator.addEventListener('submit',e=>{e.preventDefault();calculate()});calculator.addEventListener('input',calculate);
lead.addEventListener('submit',e=>{if(lead.elements.includeCalculation.checked&&!calculate()){e.preventDefault();e.stopImmediatePropagation();lead.querySelector('.form-status').textContent='Correct the calculator inputs or uncheck the option to include results.'}},true);
lead.addEventListener('formdata',e=>{if(lead.elements.includeCalculation.checked&&summary)e.formData.set('message',(e.formData.get('message')||'')+'\n\n'+summary);e.formData.delete('includeCalculation')});
lead.addEventListener('reset',()=>{address.value=''});calculate();
