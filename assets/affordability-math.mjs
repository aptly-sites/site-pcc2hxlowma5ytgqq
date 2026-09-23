export function rentBudget(income,period='monthly',multiple=2.5){
 if(typeof income!=='number'||!Number.isFinite(income)||income<0||income>12000000)throw Error('Enter net household income from $0 to $12,000,000.');
 if(!['monthly','annual'].includes(period))throw Error('Choose monthly or annual income.');
 if(!Number.isFinite(multiple)||multiple<=0)throw Error('Income rule is unavailable.');
 return Math.floor(((period==='annual'?income/12:income)/multiple)*100)/100;
}
export function withinBudget(homes,budget,city=''){
 return homes.filter(x=>x.publishedForRent!==false&&typeof x.marketRent?.amount==='number'&&Number.isFinite(x.marketRent.amount)&&x.marketRent.amount>=0&&x.marketRent.amount<=Math.round(budget*100)&&(!city||(x.address?.city||'').trim().toLowerCase()===city.trim().toLowerCase()));
}
