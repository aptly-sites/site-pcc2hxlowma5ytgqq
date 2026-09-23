export function compareScenarios(a){
 const keys=['value','rent','debt','payment','rate','costs','vacancy','selling','growth','returnRate','years'];
 if(keys.some(k=>!Number.isFinite(a[k])))throw Error('Enter a number for every assumption.');
 if(a.value<=0||['rent','debt','payment','rate','costs','vacancy','selling'].some(k=>a[k]<0)||a.vacancy>100||a.selling>30||a.rate>30||Math.abs(a.growth)>20||Math.abs(a.returnRate)>20||a.years<1||a.years>30||!Number.isInteger(a.years))throw Error('Check the assumptions and use a whole number of years from 1 to 30.');
 if(a.debt>0&&a.payment<=a.debt*a.rate/1200)throw Error('The principal-and-interest payment must exceed monthly interest to pay down this loan.');
 let balance=a.debt,cash=0,firstYear=0;
 for(let month=0;month<a.years*12;month++){const interest=balance*a.rate/1200;const payment=Math.min(a.payment,balance+interest);balance=Math.max(0,balance+interest-payment);const net=a.rent*(1-a.vacancy/100)-a.costs-payment;cash+=net;if(month<12)firstYear+=net;}
 const proceeds=a.value*(1-a.selling/100)-a.debt;
 if(proceeds<0)throw Error('Selling costs and loan payoff exceed the home value. This simple comparison cannot model the extra cash needed to sell.');
 const futureValue=a.value*(1+a.growth/100)**a.years;
 return {firstYear,cash,balance,proceeds,rentOutcome:futureValue*(1-a.selling/100)-balance+cash,sellOutcome:proceeds*(1+a.returnRate/100)**a.years};
}
