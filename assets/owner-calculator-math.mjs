import {compareScenarios} from './calculator-math.mjs';
export function estimate(kind,a){
 if(Object.values(a).some(v=>!Number.isFinite(v)))throw Error('Enter a valid number for every assumption.');
 if(kind==='rent-vs-sell'){const result=compareScenarios(a);return {rows:Array.from({length:a.years},(_,i)=>({year:i+1,...compareScenarios({...a,years:i+1})})),...result};}
 if(Object.values(a).some(v=>v<0)||a.vacancy>100||a.fee>100)throw Error('Use nonnegative values and percentages from 0 to 100.');
 if(kind==='pm-fee-roi'){
  if(!Number.isInteger(a.units)||a.units<1)throw Error('Enter a whole number of homes.');
  const fee=a.units*a.rent*12*(1-a.vacancy/100)*a.fee/100,time=a.hours*a.hourly*12,maintenance=a.maintenance*12,vacancy=a.units*a.rent/30*(a.selfDays-a.pmDays)*a.turnovers;
  const benefit=time+maintenance+vacancy,net=benefit-fee;return {fee,time,maintenance,vacancy,benefit,net,roi:fee>0?net/fee*100:null,cash:maintenance+vacancy-fee};
 }
 const rows=[['Unpaid rent',a.rent*a.months],['Post-possession vacancy',a.rent/30*a.days],['Court filing',a.filing],['Service of process',a.process],['Attorney fees',a.legal],['Court appearances',a.appearances*a.appearanceCost],['Authorized enforcement',a.enforcement],['Removal/storage',a.storage],['Cleaning',a.cleaning],['Repairs',a.repairs],['Repainting',a.painting],['Marketing/re-leasing',a.marketing],['Value of your time',a.hours*a.hourly]];
 const total=rows.reduce((s,[,v])=>s+v,0);return {rows,total,months:a.rent>0?total/a.rent:null,cash:total-a.hours*a.hourly};
}
