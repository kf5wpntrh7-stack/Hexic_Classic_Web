(()=>{"use strict";
const cv=document.getElementById("game"),ctx=cv.getContext("2d"),ROWS=9,COLS=9;
const COLORS=["#ef665f","#f2a53b","#63df55","#8d49bd","#2855df","#54c3e7","#f0d532"];
const LEVELS=[
 {kind:"combo",target:10,colors:4,bombs:false,maxCascade:1,cascadeChance:0.02,text:"4 色教學關：完成 10 次主動消除。"},
 {kind:"combo",target:15,colors:5,bombs:false,maxCascade:2,cascadeChance:0.05,text:"增加第 5 色：完成 15 次主動消除。"},
 {kind:"combo",target:20,colors:5,bombs:false,maxCascade:3,cascadeChance:0.10,text:"連鎖教學：完成 20 次主動消除，自然連鎖只加分。"},
 {kind:"star",target:1,colors:5,bombs:false,maxCascade:2,cascadeChance:0.06,text:"製造 1 顆 Starflower：讓 6 顆同色寶石圍住中央。"},
 {kind:"combo",target:25,colors:6,bombs:false,maxCascade:2,cascadeChance:0.08,text:"增加第 6 色：完成 25 次主動消除。"},
 {kind:"star",target:2,colors:6,bombs:true,bombCount:1,bombStart:20,maxCascade:2,cascadeChance:0.08,text:"炸彈登場：製造 2 顆 Starflower；炸彈初始倒數 20。"},
 {kind:"combo",target:30,colors:6,bombs:true,bombCount:2,bombStart:14,maxCascade:3,cascadeChance:0.10,text:"完成 30 次主動消除，注意 2 顆炸彈。"},
 {kind:"pearl",target:1,colors:6,bombs:true,bombCount:2,bombStart:12,maxCascade:2,cascadeChance:0.08,text:"製造 1 顆 Black Pearl。"},
 {kind:"combo",target:35,colors:7,bombs:true,bombCount:3,bombStart:10,maxCascade:3,cascadeChance:0.10,text:"增加第 7 色：完成 35 次主動消除。"},
 {kind:"pearlmatch",target:1,colors:7,bombs:true,bombCount:3,bombStart:9,maxCascade:3,cascadeChance:0.10,text:"讓 3 顆 Black Pearl 相連並消除。"}
];
let board=[],selected=null,busy=false,soundOn=true,currentDir=-1,level=1,score=0,levelStartScore=0,remaining=8,history=[],anim=[],vanish=new Set(),gameOver=false,cascadeGuard=0;
try{
 const saved=Number(localStorage.getItem("hexic_v6_level")||1);
 if(Number.isFinite(saved))level=Math.max(1,Math.min(LEVELS.length,saved));
}catch(e){}
const $=id=>document.getElementById(id),AC=window.AudioContext||window.webkitAudioContext;let ac;
function beep(f=520,d=.06){if(!soundOn)return;try{ac=ac||new AC();if(ac.state==="suspended")ac.resume();const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;g.gain.value=.03;o.connect(g);g.connect(ac.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+d);o.stop(ac.currentTime+d)}catch(e){}}
function cfg(){return LEVELS[level-1]}function rnd(){return Math.floor(Math.random()*cfg().colors)}
function tile(type="normal",color=rnd(),bomb=null){return{type,color,bomb}}function cloneBoard(){return board.map(r=>r.map(t=>t?{...t}:null))}
function geom(){const s=39,dx=1.5*s,dy=Math.sqrt(3)*s,w=dx*(COLS-1)+2*s,h=dy*(ROWS+.5);return{s,dx,dy,ox:(720-w)/2+s,oy:(720-h)/2+s}}
function center(r,c){const g=geom();return{x:g.ox+c*g.dx,y:g.oy+r*g.dy+(c%2)*g.dy/2}}
function hex(x,y,s,k=.91){ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3,px=x+Math.cos(a)*s*k,py=y+Math.sin(a)*s*k;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath()}
function shade(h,n){const v=parseInt(h.slice(1),16),r=Math.max(0,Math.min(255,(v>>16)+n)),g=Math.max(0,Math.min(255,((v>>8)&255)+n)),b=Math.max(0,Math.min(255,(v&255)+n));return`rgb(${r},${g},${b})`}
function starPath(x,y,r1,r2){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?r2:r1,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath()}
function drawTile(x,y,t,alpha=1,scale=1){if(!t)return;const g=geom();ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(scale,scale);ctx.translate(-x,-y);
 if(t.type==="pearl"){ctx.shadowColor="#000";ctx.shadowBlur=10;const gr=ctx.createRadialGradient(x-g.s*.25,y-g.s*.3,3,x,y,g.s);gr.addColorStop(0,"#79808f");gr.addColorStop(.3,"#252936");gr.addColorStop(1,"#05060a");hex(x,y,g.s,.91);ctx.fillStyle=gr;ctx.fill();ctx.lineWidth=5;ctx.strokeStyle="#eaf5ff";ctx.stroke();ctx.beginPath();ctx.arc(x-g.s*.18,y-g.s*.22,7,0,Math.PI*2);ctx.fillStyle="#ffffff99";ctx.fill();}
 else{const col=COLORS[t.color];ctx.shadowColor="#5682a7";ctx.shadowBlur=5;ctx.shadowOffsetY=3;const gr=ctx.createLinearGradient(x-g.s,y-g.s,x+g.s,y+g.s);gr.addColorStop(0,shade(col,72));gr.addColorStop(.23,shade(col,27));gr.addColorStop(.6,col);gr.addColorStop(1,shade(col,-52));hex(x,y,g.s,.91);ctx.fillStyle=gr;ctx.fill();ctx.shadowColor="transparent";ctx.lineWidth=6;ctx.strokeStyle="#f8fdff";ctx.stroke();hex(x,y,g.s,.73);ctx.lineWidth=2;ctx.strokeStyle=shade(col,-55);ctx.stroke();ctx.beginPath();ctx.moveTo(x-g.s*.42,y-g.s*.14);ctx.lineTo(x-g.s*.08,y-g.s*.44);ctx.lineTo(x+g.s*.28,y-g.s*.3);ctx.strokeStyle="#fff";ctx.lineWidth=5;ctx.lineCap="round";ctx.stroke();if(t.type==="star"){starPath(x,y,17,8);ctx.fillStyle="#fff7a5";ctx.strokeStyle="#d89500";ctx.lineWidth=2;ctx.fill();ctx.stroke();}}
 if(t.bomb!=null){ctx.beginPath();ctx.arc(x,y,17,0,Math.PI*2);ctx.fillStyle="#19223d";ctx.fill();ctx.lineWidth=2;ctx.strokeStyle="#fff";ctx.stroke();ctx.fillStyle="#fff";ctx.font="bold 18px Tahoma";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(t.bomb,x,y+1)}ctx.restore()}
function draw(){ctx.clearRect(0,0,720,720);for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const k=`${r},${c}`;if(board[r][c]&&!vanish.has(k)){const p=center(r,c);drawTile(p.x,p.y,board[r][c])}}anim.forEach(p=>drawTile(p.x,p.y,p.t,p.alpha??1,p.scale??1));if(selected&&!busy){const ps=selected.map(v=>center(...v)),x=ps.reduce((s,p)=>s+p.x,0)/3,y=ps.reduce((s,p)=>s+p.y,0)/3;ctx.save();ctx.fillStyle="#fff";ctx.shadowColor="#3154ad";ctx.shadowBlur=13;ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.fill();ctx.fillStyle="#f5d23d";starPath(x,y,16,8);ctx.fill();ctx.restore()}}
function valid(r,c){return r>=0&&r<ROWS&&c>=0&&c<COLS}function neigh(r,c){const d=c%2?[[-1,0],[-1,1],[0,1],[1,0],[0,-1],[-1,-1]]:[[-1,0],[0,1],[1,1],[1,0],[1,-1],[0,-1]];return d.map(([dr,dc])=>[r+dr,c+dc])}
function pick(mx,my){let nearest=[0,0],bd=Infinity;for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const p=center(r,c),d=(p.x-mx)**2+(p.y-my)**2;if(d<bd){bd=d;nearest=[r,c]}}const [r,c]=nearest,n=neigh(r,c),opts=[];for(let i=0;i<6;i++){const t=[[r,c],n[i],n[(i+1)%6]];if(t.every(v=>valid(...v)))opts.push(t)}return opts.sort((a,b)=>{const pa=a.map(v=>center(...v)),pb=b.map(v=>center(...v)),ax=pa.reduce((s,p)=>s+p.x,0)/3,ay=pa.reduce((s,p)=>s+p.y,0)/3,bx=pb.reduce((s,p)=>s+p.x,0)/3,by=pb.reduce((s,p)=>s+p.y,0)/3;return((ax-mx)**2+(ay-my)**2)-((bx-mx)**2+(by-my)**2)})[0]||null}
function order(t){const ps=t.map(v=>({v,...center(...v)})),cx=ps.reduce((s,p)=>s+p.x,0)/3,cy=ps.reduce((s,p)=>s+p.y,0)/3;return ps.sort((a,b)=>Math.atan2(a.y-cy,a.x-cx)-Math.atan2(b.y-cy,b.x-cx)).map(p=>p.v)}
function clusters(){const groups=[],seen=new Set();for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=board[r][c],key=`${r},${c}`;if(!t||seen.has(key))continue;const type=t.type,color=t.color,q=[[r,c]],g=[];seen.add(key);while(q.length){const [rr,cc]=q.shift(),cur=board[rr][cc];g.push([rr,cc]);for(const [nr,nc] of neigh(rr,cc)){if(!valid(nr,nc))continue;const nt=board[nr][nc],nk=`${nr},${nc}`;if(!nt||seen.has(nk))continue;const same=type==="normal"?nt.type==="normal"&&nt.color===color:nt.type===type;if(same){seen.add(nk);q.push([nr,nc])}}}if(g.length>=3)groups.push({type,color,cells:g})}return groups}
function localClusterSize(r,c){
 const start=board[r]?.[c];
 if(!start||start.type!=="normal")return 0;
 const seen=new Set([`${r},${c}`]),q=[[r,c]];
 while(q.length){
  const [rr,cc]=q.shift();
  for(const [nr,nc] of neigh(rr,cc)){
   if(!valid(nr,nc))continue;
   const key=`${nr},${nc}`,t=board[nr][nc];
   if(!seen.has(key)&&t&&t.type==="normal"&&t.color===start.color){
    seen.add(key);q.push([nr,nc]);
   }
  }
 }
 return seen.size;
}
function findFlower(type){for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const centerTile=board[r][c],ring=neigh(r,c);if(!centerTile||!ring.every(v=>valid(...v)))continue;const ts=ring.map(([rr,cc])=>board[rr][cc]);if(type==="normal"&&ts.every(Boolean)&&ts.every(t=>t.type==="normal"&&t.color===ts[0].color))return{r,c,ring,newType:"star",color:centerTile.color};if(type==="star"&&ts.every(Boolean)&&ts.every(t=>t.type==="star"))return{r,c,ring,newType:"pearl",color:0}}return null}
function tween(ms,fn){return new Promise(res=>{const st=performance.now();function f(now){const t=Math.min(1,(now-st)/ms);fn(1-Math.pow(1-t,3));draw();t<1?requestAnimationFrame(f):res()}requestAnimationFrame(f)})}
function ui(){const c=cfg();$("level").textContent=level;$("score").textContent=score.toLocaleString();$("goal").textContent=Math.max(0,remaining);$("goalName").textContent=c.kind==="combo"?"Combos To Go":c.kind==="star"?"Stars To Go":c.kind==="pearl"?"Pearls To Go":"Pearl Match";$("levelText").textContent=c.text;$("introTitle").textContent=`LEVEL ${level}`}
function decrementBombs(){let dead=false;for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=board[r][c];if(t&&t.bomb!=null){t.bomb--;if(t.bomb<=0)dead=true}}if(dead){gameOver=true;$("overLayer").classList.remove("hidden")}}
async function rotate(dir){if(!selected||busy||gameOver)return;history.push({b:cloneBoard(),score,remaining});if(history.length>12)history.shift();busy=true;decrementBombs();if(gameOver){busy=false;return}const tri=order(selected),vals=tri.map(([r,c])=>board[r][c]),pts=tri.map(v=>center(...v)),cx=pts.reduce((s,p)=>s+p.x,0)/3,cy=pts.reduce((s,p)=>s+p.y,0)/3,target=dir>0?[2,0,1]:[1,2,0];tri.forEach(([r,c])=>board[r][c]=null);anim=vals.map((t,i)=>({t,x:pts[i].x,y:pts[i].y}));beep(dir>0?590:440);await tween(170,t=>{const a=(dir>0?1:-1)*Math.PI*2/3*t;anim.forEach((p,i)=>{const ox=pts[i].x-cx,oy=pts[i].y-cy;p.x=cx+ox*Math.cos(a)-oy*Math.sin(a);p.y=cy+ox*Math.sin(a)+oy*Math.cos(a)})});tri.forEach(([r,c],i)=>board[r][c]=vals[target[i]]);anim=[];draw();await resolveBoard();busy=false}
async function resolveBoard(rotatedKeys=new Set()){
 cascadeGuard=0;
 let firstWave=true;

 // Original-style behavior: keep resolving until the board is stable.
 // Safety limit only protects against an accidental infinite loop.
 while(cascadeGuard<40){
  cascadeGuard++;

  const pearlFlower=findFlower("star");
  if(pearlFlower){
   const flowerKeys=new Set(pearlFlower.ring.map(v=>v.join(",")));
   if(firstWave && rotatedKeys.size && !touchesRotatedArea(flowerKeys,rotatedKeys))break;
   await createSpecial(pearlFlower,2500);
   if(cfg().kind==="pearl"&&firstWave)remaining--;
   firstWave=false;
   continue;
  }

  const normalFlower=findFlower("normal");
  if(normalFlower){
   const flowerKeys=new Set(normalFlower.ring.map(v=>v.join(",")));
   if(firstWave && rotatedKeys.size && !touchesRotatedArea(flowerKeys,rotatedKeys))break;
   await createSpecial(normalFlower,1000);
   if(cfg().kind==="star"&&firstWave)remaining--;
   firstWave=false;
   continue;
  }

  const gs=clusters();
  if(!gs.length)break;

  // First wave must be caused by the current rotation.
  const activeGroups=firstWave && rotatedKeys.size
   ? gs.filter(g=>touchesRotatedArea(new Set(g.cells.map(v=>v.join(","))),rotatedKeys))
   : gs;

  if(!activeGroups.length)break;

  const remove=new Set();
  let comboCount=0,pearlMatch=false;
  for(const g of activeGroups){
   g.cells.forEach(v=>remove.add(v.join(",")));
   comboCount++;
   if(g.type==="pearl")pearlMatch=true;
  }

  score+=remove.size*100*Math.max(1,comboCount)*(firstWave?1:Math.min(6,cascadeGuard));

  // Only the player's first wave advances normal combo goals.
  if(firstWave&&cfg().kind==="combo")remaining-=1;
  if(firstWave&&cfg().kind==="pearlmatch"&&pearlMatch)remaining=0;

  await removeAndDrop(remove);
  maybeSpawnBomb();
  firstWave=false;
 }

 // At this point the board should be stable.
 ui();
 if(remaining<=0)await complete();
}
async function createSpecial(f,points){vanish=new Set(f.ring.map(v=>v.join(",")));anim=[...vanish].map(k=>{const[r,c]=k.split(",").map(Number),p=center(r,c);return{t:board[r][c],x:p.x,y:p.y,alpha:1,scale:1}});beep(f.newType==="pearl"?880:760,.13);await tween(210,t=>anim.forEach(p=>{p.alpha=1-t;p.scale=1+.28*t}));f.ring.forEach(([r,c])=>board[r][c]=null);board[f.r][f.c]=tile(f.newType,f.color,null);score+=points;anim=[];vanish.clear();await gravity()}
async function removeAndDrop(set){vanish=new Set(set);anim=[...set].map(k=>{const[r,c]=k.split(",").map(Number),p=center(r,c);return{t:board[r][c],x:p.x,y:p.y,alpha:1,scale:1}});beep(660,.09);await tween(190,t=>anim.forEach(p=>{p.alpha=1-t;p.scale=1+.25*t}));set.forEach(k=>{const[r,c]=k.split(",").map(Number);board[r][c]=null});anim=[];vanish.clear();await gravity()}
function maybeSpawnBomb(){
 if(!cfg().bombs)return;
 const existing=[];
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
  if(board[r][c]&&board[r][c].bomb!=null)existing.push([r,c]);
 }
 if(existing.length>=(cfg().bombCount||1))return;
 const spots=[];
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
  if(board[r][c]&&board[r][c].type==="normal"&&board[r][c].bomb==null)spots.push([r,c]);
 }
 if(!spots.length)return;
 const [r,c]=spots[Math.floor(Math.random()*spots.length)];
 board[r][c].bomb=cfg().bombStart||12;
 showToast("BOMB!",550);
}
function safeSpawnTile(r,c){
 // New top gems are random, but we strongly prefer colors that do not
 // immediately create a match. This keeps long cascades rare, not impossible.
 const safeColors=[];
 const neutralColors=[];

 for(let color=0;color<cfg().colors;color++){
  board[r][c]=tile("normal",color,null);
  const groupSize=localClusterSize(r,c);
  const makesFlower=!!findFlower("normal");

  if(groupSize<3&&!makesFlower){
   safeColors.push(color);
  }else if(groupSize===3&&!makesFlower){
   neutralColors.push(color);
  }
 }

 board[r][c]=null;

 // About 6% chance to allow a natural cascade when a plausible color exists.
 if(Math.random()<0.06 && neutralColors.length){
  return tile("normal",neutralColors[Math.floor(Math.random()*neutralColors.length)],null);
 }

 if(safeColors.length){
  return tile("normal",safeColors[Math.floor(Math.random()*safeColors.length)],null);
 }

 // Fallback when no safe color exists.
 return tile("normal",rnd(),null);
}
async function gravity(){
 const oldBoard=cloneBoard();
 const finalBoard=Array.from({length:ROWS},()=>Array(COLS).fill(null));
 const staticBoard=Array.from({length:ROWS},()=>Array(COLS).fill(null));
 const moves=[];

 // Compact each column vertically. Horizontal coordinate never changes.
 for(let c=0;c<COLS;c++){
  const survivors=[];
  for(let r=ROWS-1;r>=0;r--){
   if(oldBoard[r][c])survivors.push({t:oldBoard[r][c],from:r});
  }

  let dest=ROWS-1;
  for(const s of survivors){
   finalBoard[dest][c]=s.t;
   if(s.from===dest){
    staticBoard[dest][c]=s.t;
   }else{
    moves.push({t:s.t,c,from:s.from,to:dest,spawn:false});
   }
   dest--;
  }

  // Temporarily use finalBoard so safeSpawnTile can inspect nearby placements.
  const previousBoard=board;
  board=finalBoard;
  let spawnOrder=1;
  while(dest>=0){
   const t=safeSpawnTile(dest,c);
   finalBoard[dest][c]=t;
   moves.push({t,c,from:-spawnOrder,to:dest,spawn:true});
   spawnOrder++;
   dest--;
  }
  board=previousBoard;
 }

 // Keep stationary gems visible while only moved/new gems animate.
 board=staticBoard;
 anim=moves.map(m=>{
  const to=center(m.to,m.c);
  const from=m.spawn
   ?{x:to.x,y:center(0,m.c).y-geom().dy*(Math.abs(m.from)+0.5)}
   :center(m.from,m.c);
  return{
   ...m,
   x:from.x,
   y:from.y,
   fromX:from.x,
   fromY:from.y,
   toX:to.x,
   toY:to.y
  };
 });

 if(anim.length){
  await tween(420,t=>{
   anim.forEach(p=>{
    p.x=p.fromX+(p.toX-p.fromX)*t;
    p.y=p.fromY+(p.toY-p.fromY)*t;
   });
  });
 }

 board=finalBoard;
 anim=[];
 draw();
 await new Promise(r=>setTimeout(r,70));
}
function showToast(text,ms=900){$("toast").textContent=text;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),ms)}
async function complete(){busy=true;showToast(`LEVEL ${level} COMPLETE!`,1000);await new Promise(r=>setTimeout(r,1050));if(level<LEVELS.length){level++;try{localStorage.setItem("hexic_v6_level",String(level))}catch(e){}levelStartScore=score;startLevel(true)}else{showToast("ALL LEVELS COMPLETE!",1800);busy=false}}
function hasImmediate(){return clusters().length||findFlower("normal")||findFlower("star")}
function stabilizeInitialBoard(){
 for(let pass=0;pass<200;pass++){
  const gs=clusters();
  const nf=findFlower("normal");
  const sf=findFlower("star");

  if(!gs.length&&!nf&&!sf)return;

  const bad=new Set();
  for(const g of gs){
   if(g.type==="normal")g.cells.forEach(v=>bad.add(v.join(",")));
  }
  if(nf)nf.ring.forEach(v=>bad.add(v.join(",")));
  if(sf)sf.ring.forEach(v=>bad.add(v.join(",")));

  if(!bad.size)return;

  for(const key of bad){
   const [r,c]=key.split(",").map(Number);
   if(!board[r][c]||board[r][c].type!=="normal")continue;

   let placed=false;
   for(let tries=0;tries<30;tries++){
    board[r][c]=tile("normal",rnd(),null);
    if(localClusterSize(r,c)<3&&!findFlower("normal")){
     placed=true;
     break;
    }
   }
   if(!placed){
    board[r][c]=tile("normal",rnd(),null);
   }
  }
 }
}

function generateBoard(){for(let attempt=0;attempt<80;attempt++){board=Array.from({length:ROWS},()=>Array.from({length:COLS},()=>tile()));let loops=0;while(hasImmediate()&&loops++<300){const gs=clusters();for(const g of gs)for(const[r,c]of g.cells)board[r][c]=tile();const f=findFlower("normal");if(f)for(const[r,c]of f.ring)board[r][c]=tile()}if(!hasImmediate())return}board=Array.from({length:ROWS},()=>Array.from({length:COLS},(_,c)=>tile("normal",(c+Math.floor(Math.random()*3))%cfg().colors,null)))
 stabilizeInitialBoard();
}
function startLevel(showIntro=true){
 remaining=cfg().target;selected=null;busy=false;gameOver=false;history=[];anim=[];vanish.clear();
 $("overLayer").classList.add("hidden");
 $("menuLayer").classList.add("hidden");
 $("introLayer").classList.add("hidden");
 generateBoard();
 if(cfg().bombs){
  for(let i=0;i<(cfg().bombCount||1);i++)maybeSpawnBomb();
 }
 ui();draw();
 if(showIntro)$("introLayer").classList.remove("hidden");
}
cv.addEventListener("pointerdown",e=>{if(busy||gameOver||!$("menuLayer").classList.contains("hidden")||!$("introLayer").classList.contains("hidden"))return;e.preventDefault();const b=cv.getBoundingClientRect();selected=pick((e.clientX-b.left)*720/b.width,(e.clientY-b.top)*720/b.height);draw();if(selected)rotate(currentDir)});
function setDirection(dir){
 currentDir=dir;
 $("leftRotateBtn").classList.toggle("selected",dir===-1);
 $("rightRotateBtn").classList.toggle("selected",dir===1);
 beep(dir===-1?440:590,.045);
}
$("leftRotateBtn").onclick=()=>setDirection(-1);
$("rightRotateBtn").onclick=()=>setDirection(1);
$("undoMenuBtn").onclick=()=>{
 if(busy||!history.length)return;
 const h=history.pop();
 board=h.b;score=h.score;remaining=h.remaining;
 selected=null;gameOver=false;
 $("overLayer").classList.add("hidden");
 $("menuLayer").classList.add("hidden");
 ui();draw();beep(360);
};
$("menuBtn").onclick=()=>{
 if(busy||gameOver)return;
 $("menuLayer").classList.remove("hidden");
};
$("startBtn").onclick=()=>$("introLayer").classList.add("hidden");
$("continueBtn").onclick=()=>$("menuLayer").classList.add("hidden");
$("restartBtn").onclick=()=>{
 score=levelStartScore;
 $("menuLayer").classList.add("hidden");
 startLevel(false);
 showToast("本關已重新開始",700);
};
$("soundBtn").onclick=e=>{
 soundOn=!soundOn;
 e.target.textContent=soundOn?"音效：開啟":"音效：關閉";
};
$("retryBtn").onclick=()=>{
 score=levelStartScore;
 startLevel(false);
};
levelStartScore=score;
startLevel(true);
})();