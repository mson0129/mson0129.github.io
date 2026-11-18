import {slideFrame,notation,kiboRows} from './presentation.mjs';
const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d'),status=$('#status');
const worker=new Worker(new URL('./worker.js?v=rust-original-ai-2',import.meta.url),{type:'module'}),pending=new Map();let serial=0,position,selected=-1,targets=[],cursor=58,busy=true,human='8',record=[],active=false,broken=false;
worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;pending.delete(data.id);if(data.error)p.reject(Error(data.error));else {position=data.state;p.resolve(data.result);}};
worker.onerror=()=>{for(const p of pending.values())p.reject(Error('게임 엔진을 시작하지 못했습니다.'));pending.clear();};
function call(cmd,args={}){return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});worker.postMessage({id,cmd,...args});});}
const images=await Promise.all(Array.from({length:22},(_,i)=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('기물 이미지를 불러오지 못했습니다.'));im.src=new URL(`./assets/piece-${i}.png`,import.meta.url).href;}))).catch(showError);
function text(s,x,y,size=12,color='#fff',align='left'){ctx.font=`${size}px monospace`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);}
const masks=new Map();
function drawMask(square){
 const piece=position.board[square]&7,index=piece===7?19:piece>=3?20:21;
 const image=images[index];
 if(!masks.has(index)){
  const layer=document.createElement('canvas');layer.width=image.width;layer.height=image.height;
  const context=layer.getContext('2d');context.drawImage(image,0,0);
  masks.set(index,context.getImageData(0,0,image.width,image.height).data);
 }
 const [x,y]=coords(square),left=x-Math.floor(image.width/2),top=y-Math.floor(image.height/2);
 const pixels=ctx.getImageData(left,top,image.width,image.height),mask=masks.get(index);
 for(let i=0;i<pixels.data.length;i+=4)for(let channel=0;channel<3;channel++)pixels.data[i+channel]&=mask[i+channel];
 ctx.putImageData(pixels,left,top);
}
function coords(square){return [30+(square%9)*57,24+Math.floor(square/9)*47];}
let slide=true,animation=null,lastMoveVisible=true;
try{slide=localStorage.getItem('janggi-slide')!=='off';}catch{}
const slideToggle=$('#slide');
slideToggle.checked=slide;
slideToggle.onchange=()=>{slide=slideToggle.checked;try{localStorage.setItem('janggi-slide',slide?'on':'off');}catch{}};
async function animateMove(before,move){
 lastMoveVisible=true;
 if(!slide||!move||move[0]<0||document.hidden)return;
 const start=performance.now();
 animation={before,from:move[0],to:move[1],...slideFrame(coords(move[0]),coords(move[1]),0)};
 await new Promise(resolve=>{
  function frame(now){
   Object.assign(animation,slideFrame(coords(animation.from),coords(animation.to),now-start));
   render();
   if(!animation.done)requestAnimationFrame(frame);
   else{animation=null;render();resolve();}
  }
  requestAnimationFrame(frame);
 });
}
function render(){
 ctx.imageSmoothingEnabled=false;ctx.fillStyle='#000';ctx.fillRect(0,0,640,480);ctx.fillStyle='#aa5500';ctx.fillRect(0,0,516,474);ctx.strokeStyle='#171000';ctx.lineWidth=1;
 for(let x=0;x<9;x++){ctx.beginPath();ctx.moveTo(30+x*57,24);ctx.lineTo(30+x*57,447);ctx.stroke();}
 for(let y=0;y<10;y++){ctx.beginPath();ctx.moveTo(30,24+y*47);ctx.lineTo(486,24+y*47);ctx.stroke();text(`${(y+1)%10}`,4,28+y*47,9);}
 for(const top of [0,7])for(const rev of [false,true]){ctx.beginPath();ctx.moveTo(rev?315:201,24+top*47);ctx.lineTo(rev?201:315,24+(top+2)*47);ctx.stroke();}
 for(let x=0;x<9;x++)text(`${(x+1)*10}`,30+x*57,477,9,'#fff','center');
 if(!position){text('불러오는 중…',258,245,18,'#fff','center');return;}
 const board=animation?animation.before:position.board;
 for(let sq=0;sq<90;sq++){
  if(animation&&sq===animation.from)continue;
  const p=board[sq],im=images?.[p];if(!p||!im)continue;
  const [x,y]=coords(sq);ctx.drawImage(im,Math.round(x-im.width/2),Math.round(y-im.height/2));
 }
 if(animation){
  const im=images[animation.before[animation.from]],a=coords(animation.from),b=coords(animation.to);
  if(im)ctx.drawImage(im,Math.trunc(animation.x-im.width/2),Math.trunc(animation.y-im.height/2));
 }
 if(!animation){
  for(const sq of new Set([...targets,...(selected>=0?[selected]:[]),(lastMoveVisible?position.to:-1)].filter(sq=>sq>=0))) drawMask(sq);
  if(selected>=0||document.activeElement===canvas){
   const [x,y]=coords(cursor),hand=images?.[0];
   if(hand)ctx.drawImage(hand,x,y-7);
  }
 }
 ctx.strokeStyle='#ddd';ctx.lineWidth=1;ctx.strokeRect(522.5,1.5,111,183);ctx.strokeRect(522.5,190.5,111,283);
 text('< JANG V1.0 >',578,19,11,'#fff','center');
 for(const army of [0,8]){
  const top=army===0?40:116;
  text((army===0?'<CHO> ':'<HAN> ')+(human===String(army)||human==='both'?'HUMAN':'COMPUTER'),530,top,10);
  text('TIME '+formatTime(army),530,top+20,10);
  const rows=kiboRows(record,army,selected,cursor,position.turn);
  rows.forEach((entry,index)=>{
   const y=top+40+index*17;
   text(entry?String(entry.number):'-',530,y,10);
   text(entry?(entry.from<0?'PASS':notation(entry.from)+(entry.current?':':'-')+(entry.current&&!entry.selecting?'--':notation(entry.to))):'-- : --',578,y,10,'#fff','center');
  });
 }
 text('== PLAY ==',578,213,11,'#fff','center');text(position.turn===0?'CHO / 초':'HAN / 한',578,245,13,position.turn===0?'#7777ff':'#ff7777','center');text(`${position.ply} 수`,578,272,12,'#fff','center');
 if(busy&&active)text('생각 중…',578,307,12,'#ffe08a','center');else if(position.winner!==-1)text(`${position.winner===0?'초':'한'} 승리`,578,307,13,'#ffe08a','center');else if(position.check)text('장군!',578,307,14,'#ffe08a','center');

}
let elapsed=[0,0],clockStarted=0;function formatTime(side){let ms=elapsed[side===0?0:1]+(active&&position?.turn===side&&clockStarted?performance.now()-clockStarted:0),s=Math.floor(ms/1000);return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function tickClock(){if(clockStarted&&position){elapsed[position.turn===0?0:1]+=performance.now()-clockStarted;}clockStarted=performance.now();}
function save(){try{localStorage.setItem('janggi-v1-save',JSON.stringify({version:1,human,record,elapsed,seed:position.seed,seeds:position.seeds}));}catch{}}
function refresh(){const myTurn=human==='both'||Number(human)===position?.turn;$('#undo').disabled=busy||!record.length;$('#pass').disabled=busy||!active||!myTurn||position?.check||position?.winner!==-1;$('#new').disabled=busy;
 if(broken)return;status.classList.remove('error');status.textContent=position.winner!==-1?`${position.winner===0?'초':'한'} 승리`:!active?'새 대국을 시작하세요.':busy?'컴퓨터가 생각 중…':`${position.turn===0?'초(파랑)':'한(빨강)'} 차례${position.check?' · 장군!':''}${myTurn?' · 기물을 선택하세요.':''}`;render();}
function showError(e){broken=true;busy=false;status.textContent=e.message||String(e);status.classList.add('error');$('#new').disabled=false;}
async function respond(){if(position.winner!==-1){active=false;clockStarted=0;busy=false;save();refresh();return;}if(!active||human==='both'||Number(human)===position.turn){busy=false;refresh();return;}busy=true;refresh();const previousBoard=position.board.slice();const before=performance.now();const move=await call('ai');elapsed[position.turn===0?1:0]+=performance.now()-before;clockStarted=performance.now();if(move){record.push(move);await animateMove(previousBoard,move);if(position.winner!==-1){active=false;clockStarted=0;}save();}else{active=false;status.textContent='컴퓨터가 둘 수 있는 수가 없습니다. 새 대국 또는 무르기를 선택하세요.';}busy=false;refresh();if(!move)status.textContent='컴퓨터가 둘 수 있는 수가 없습니다. 무르기 또는 새 대국을 선택하세요.';}
async function select(square){if(busy||!active||position.winner!==-1||(human!=='both'&&Number(human)!==position.turn))return;lastMoveVisible=false;cursor=square;
 try{if(selected>=0&&targets.includes(square)){busy=true;tickClock();const from=selected,previousBoard=position.board.slice();selected=-1;targets=[];if(await call('move',{from,to:square})){record.push([from,square]);save();await animateMove(previousBoard,[from,square]);}clockStarted=performance.now();await respond();return;}
 const p=position.board[square];selected=p&&(p>8?8:0)===position.turn?square:-1;targets=selected<0?[]:await call('targets',{from:square});render();}catch(e){showError(e);}}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus({preventScroll:true});const rect=canvas.getBoundingClientRect();/* object-fit contains the 4:3 canvas in landscape fullscreen */const scale=Math.min(rect.width/640,rect.height/480),left=rect.left+(rect.width-640*scale)/2,top=rect.top+(rect.height-480*scale)/2,x=(e.clientX-left)/scale,y=(e.clientY-top)/scale;if(x>516||x<4||y<1||y>470)return;const col=Math.round((x-30)/57),row=Math.round((y-24)/47);if(col>=0&&col<9&&row>=0&&row<10)select(row*9+col);});
canvas.addEventListener('keydown',e=>{lastMoveVisible=false;const x=cursor%9,y=Math.floor(cursor/9);if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','Escape'].includes(e.key))e.preventDefault();switch(e.key){case'ArrowLeft':cursor=y*9+Math.max(0,x-1);break;case'ArrowRight':cursor=y*9+Math.min(8,x+1);break;case'ArrowUp':cursor=Math.max(0,y-1)*9+x;break;case'ArrowDown':cursor=Math.min(9,y+1)*9+x;break;case'Enter':case' ':select(cursor);break;case'Escape':selected=-1;targets=[];}render();});canvas.addEventListener('focus',render);canvas.addEventListener('blur',render);
for(let i=0;i<90;i++){const o=document.createElement('option');o.value=i;o.textContent=`${Math.floor(i/9)+1}행 ${i%9+1}열`;$('#accessible-square').append(o);}$('#accessible-select').onclick=()=>select(Number($('#accessible-square').value));
$('#new').onclick=()=>{if(!busy)$('#setup').showModal();};$('#cancel-setup').onclick=()=>$('#setup').close();$('#start').onclick=async()=>{try{busy=true;broken=false;active=false;$('#setup').close();human=$('#mode').value;record=[];elapsed=[0,0];await call('init');selected=-1;targets=[];active=true;clockStarted=performance.now();await respond();canvas.focus({preventScroll:true});}catch(e){showError(e);}};
$('#undo').onclick=async()=>{if(busy||!record.length)return;try{busy=true;active=true;selected=-1;targets=[];await call('undo');record.pop();if(human!=='both'&&Number(human)!==position.turn&&record.length){await call('undo');record.pop();}clockStarted=performance.now();save();busy=false;refresh();}catch(e){showError(e);}};
$('#pass').onclick=async()=>{if(busy)return;try{tickClock();if(await call('pass')){record.push([-1,-1]);save();clockStarted=performance.now();await respond();}}catch(e){showError(e);}};
$('#help').onclick=()=>$('#help-dialog').showModal();$('#about').onclick=()=>$('#about-dialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#screen').requestFullscreen();}catch{status.textContent='이 브라우저는 전체 화면 전환을 지원하지 않습니다.';}};$('#exit-fullscreen').onclick=()=>document.exitFullscreen();document.addEventListener('contextmenu',e=>{if(e.target.closest('canvas,button'))e.preventDefault();});document.addEventListener('selectstart',e=>e.preventDefault());document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){tickClock();save();}});
try{let saved;try{saved=JSON.parse(localStorage.getItem('janggi-v1-save'));}catch{}if(saved?.version===1&&Array.isArray(saved.record)&&['0','8','both'].includes(saved.human)){human=saved.human;record=saved.record;elapsed=Array.isArray(saved.elapsed)?saved.elapsed:[0,0];await call('init',{moves:record,seed:saved.seed,seeds:saved.seeds});active=true;clockStarted=performance.now();await respond();}else{await call('init');busy=false;refresh();$('#setup').showModal();}}catch(e){showError(e);}
setInterval(()=>{if(active&&!document.hidden)render();},1000);
