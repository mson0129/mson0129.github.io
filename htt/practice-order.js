'use strict';
/* A shuffled bag avoids immediate repeats and visits every sentence before reuse. */
function createSentencePicker(random=Math.random){
 const bags=new Map();
 return function pick(language,items){
  if(!items.length)return '';
  let bag=bags.get(language);
  if(!bag||bag.items!==items){bag={items,order:[],last:-1};bags.set(language,bag);}
  if(!bag.order.length){
   bag.order=Array.from({length:items.length},(_,i)=>i);
   for(let i=bag.order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag.order[i],bag.order[j]]=[bag.order[j],bag.order[i]];}
   if(bag.order.length>1&&bag.order.at(-1)===bag.last)[bag.order[0],bag.order[bag.order.length-1]]=[bag.order.at(-1),bag.order[0]];
  }
  bag.last=bag.order.pop();return items[bag.last];
 };
}
