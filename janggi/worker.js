let game;
const state = () => ({board:Array.from({length:90},(_,i)=>game.board(i)),turn:game.current_turn(),winner:game.result(),ply:game.move_number(),check:!!game.in_check(),from:game.previous_from(),to:game.previous_to(),seeds:Array.from({length:game.move_number()},(_,i)=>game.rng_before_move(i)>>>0),seed:game.rng_state()>>>0,error:game.error_code()});
self.onmessage = async ({data:{id,cmd,from,to,moves,seed,seeds}}) => {
 try {
  let result;
  if(cmd==='init') {
   if(!game){const response=await fetch(new URL('./janggi.wasm?v=ai-material-order-2',import.meta.url));if(!response.ok)throw Error('WASM 파일을 불러오지 못했습니다.');const {instance}=await WebAssembly.instantiate(await response.arrayBuffer(),{});game=instance.exports;}
   game.init();for(const [i,m] of (moves||[]).entries()){if(Number.isInteger(seeds?.[i]))game.set_seed(seeds[i]);if(m[0]===-1?!game.ai_pass_turn():!game.move(m[0],m[1]))throw Error('저장된 대국을 복원하지 못했습니다.');}if(Number.isInteger(seed))game.set_seed(seed);
  } else if(cmd==='targets'){result=Array.from({length:90},(_,i)=>i).filter(i=>game.legal(from,i));}
  else if(cmd==='move'){result=!!game.move(from,to);}
  else if(cmd==='undo'){result=!!game.undo();}
  else if(cmd==='pass'){result=!!game.pass_turn();}
  else if(cmd==='ai'){const move=game.choose_move();if(game.error_code())throw Error(`컴퓨터 수 탐색 오류 (${game.error_code()})`);if(move===-2){if(!game.ai_pass_turn())throw Error('한 수 쉼을 적용하지 못했습니다.');result=[-1,-1];}else if(move<0){result=null;}else {from=Math.floor(move/90);to=move%90;if(!game.move(from,to))throw Error('컴퓨터가 고른 수를 적용하지 못했습니다.');result=[from,to];}}
  else throw Error('알 수 없는 명령입니다.');
  self.postMessage({id,result,state:state()});
 } catch(error){self.postMessage({id,error:error.message});}
};
