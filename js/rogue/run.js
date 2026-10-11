const shuffle=a=>{
  const r=a.slice();
  for(let i=r.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[r[i],r[j]]=[r[j],r[i]];}
  return r;
};
const sample=(a,n)=>shuffle(a).slice(0,n);

class Run{
  constructor(){
    this.online=[true,false];
    this.phase='lobby';
    this.seq=0;
    this.events=[];
    this.turnCount=0;
    this.aiPending=false;
    this.round=0;
    this.lives=3;
    this.coins=0;
    this.skills={};
    this.relics=[];
    this.uses={};
    this.extra=false;
    this.reward=null;
    this.shop=null;
    this.retryNote='';
    this.stats={plies:0,gain:0};
    this.game=new Game();
  }

  touch(){
    this.seq++;
    this.events=[];
  }

  actor(){
    const on=this.online.map((v,i)=>v?i:-1).filter(i=>i>=0);
    return on.length?on[this.turnCount%on.length]:0;
  }

  begin(){
    this.round=0;
    this.lives=3;
    this.coins=0;
    this.turnCount=0;
    this.skills={...START_SKILLS};
    this.relics=[];
    this.startRound();
  }

  startRound(){
    const r=ROUNDS[this.round],g=new Game();
    const pawns=c=>g.state.b.map((p,i)=>p===c?i:-1).filter(i=>i>=0);
    const sh=[];
    if(r.boss)sh.push(...sample(pawns('p'),r.boss.shields));
    if(this.relics.includes('armor'))sh.push(...sample(pawns('P'),2));
    if(sh.length)g.edit(s=>({...s,sh}));
    this.game=g;
    this.stats={plies:0,gain:0};
    this.uses={};
    for(const k in this.skills)this.uses[k]=this.skills[k]+(this.relics.includes('hands')?1:0);
    this.extra=false;
    this.aiPending=false;
    this.reward=null;
    this.shop=null;
    this.phase='play';
  }

  act(seat,a){
    this.touch();
    const host=seat===0||!this.online[0],P=this.phase;
    if(P==='lobby')return a.t==='start'&&host?(this.begin(),true):false;
    if(P==='over'||P==='win')return a.t==='restart'&&host?(this.begin(),true):false;
    if(P==='retry')return a.t==='retry'?(this.startRound(),true):false;
    if(P==='reward'){
      const it=a.t==='pick'&&this.reward[+a.i];
      if(!it)return false;
      this.grant(it);
      this.reward=null;
      this.makeShop();
      this.phase='shop';
      return true;
    }
    if(P==='shop'){
      if(a.t==='next'){this.round++;this.startRound();return true;}
      const it=a.t==='buy'&&this.shop[+a.i];
      if(!it||it.sold||this.coins<it.cost)return false;
      this.coins-=it.cost;
      it.sold=true;
      this.grant(it);
      return true;
    }
    if(this.aiPending||this.game.state.turn!=='w'||seat!==this.actor())return false;
    if(a.t==='move')return this.playerMove(a);
    if(a.t==='skill')return this.useSkill(a);
    return false;
  }

  playerMove(a){
    const g=this.game;
    if(!g.play(+a.from,+a.to,typeof a.promo==='string'?a.promo:undefined))return false;
    this.stats.plies++;
    const s=g.state;
    if(s.blk)this.events.push('blocked');
    else if(s.cap){
      this.events.push('capture');
      if(this.relics.includes('purse')){this.coins++;this.events.push('coin');}
    }
    if(g.over)return this.finish();
    if(g.status==='check')this.events.push('check');
    if(this.extra){
      this.extra=false;
      g.again();
      this.events.push('extra');
      return g.over?this.finish():true;
    }
    this.turnCount++;
    this.aiPending=true;
    return true;
  }

  aiMove(){
    if(!this.aiPending||this.phase!=='play')return false;
    this.touch();
    const g=this.game,m=pickMove(g,ROUNDS[this.round].elo);
    this.aiPending=false;
    if(!m)return this.finish();
    g.play(m.from,m.to,m.promo&&m.promo.toLowerCase());
    this.stats.plies++;
    if(g.state.blk)this.events.push('blocked');
    if(g.over)return this.finish();
    if(g.status==='check')this.events.push('check');
    return true;
  }

  finish(){
    const g=this.game;
    this.aiPending=false;
    if(g.status==='mate')return g.state.turn==='b'?this.won():this.lostRound();
    this.retryNote='draw';
    this.phase='retry';
    this.events.push('draw');
    return true;
  }

  won(){
    const gain=3+this.round+(this.stats.plies<=40?2:0)+(this.game.lost.w.length===0?1:0);
    this.coins+=gain;
    this.stats.gain=gain;
    this.events.push('win');
    if(this.round>=ROUNDS.length-1){this.phase='win';return true;}
    const sk=Object.keys(SKILLS).map(id=>({t:'skill',id}));
    const rl=Object.keys(RELICS).filter(k=>!this.relics.includes(k)).map(id=>({t:'relic',id}));
    this.reward=sample([...sk,...rl],3);
    this.phase='reward';
    return true;
  }

  lostRound(){
    this.lives--;
    this.retryNote='lose';
    this.phase=this.lives>0?'retry':'over';
    this.events.push('lose');
    return true;
  }

  makeShop(){
    const sk=Object.keys(SKILLS);
    const rl=Object.keys(RELICS).filter(k=>!this.relics.includes(k)&&k!=='heart');
    const items=[{t:'life',cost:6},{t:'skill',id:sample(sk,1)[0],cost:4}];
    items.push(rl.length?{t:'relic',id:sample(rl,1)[0],cost:7}:{t:'skill',id:sample(sk,1)[0],cost:4});
    this.shop=items.map(x=>({...x,sold:false}));
  }

  grant(it){
    if(it.t==='life')this.lives=Math.min(5,this.lives+1);
    else if(it.t==='skill')this.skills[it.id]=(this.skills[it.id]||0)+1;
    else{
      this.relics.push(it.id);
      if(it.id==='heart')this.lives=Math.min(5,this.lives+1);
    }
  }

  targets(){
    const g=this.game,b=g.state.b,sh=g.state.sh;
    const t={shield:[],freeze:[],revive:[]};
    b.forEach((p,i)=>{
      if(!p||p.toLowerCase()==='k')return;
      if(p<'a'){if(!sh.includes(i))t.shield.push(i);}
      else t.freeze.push(i);
    });
    const lp=g.lost.w[g.lost.w.length-1];
    if(lp){
      const rows=lp==='P'?[6,5]:[7,6];
      for(const r of rows)for(let c=0;c<8;c++)if(!b[r*8+c])t.revive.push(r*8+c);
    }
    return t;
  }

  useSkill(a){
    const k=a.id,g=this.game,q=+a.sq;
    if(!SKILLS[k]||!(this.uses[k]>0))return false;
    const T=this.targets();
    if(k==='double'){
      if(this.extra)return false;
      this.extra=true;
    }else if(k==='shield'){
      if(!T.shield.includes(q))return false;
      g.edit(s=>({...s,sh:[...s.sh,q]}));
    }else if(k==='freeze'){
      if(!T.freeze.includes(q))return false;
      g.edit(s=>({...s,fz:q,fc:'b'}));
    }else{
      if(!T.revive.includes(q))return false;
      const p=g.lost.w.pop();
      g.edit(s=>{s.b[q]=p;return s;});
    }
    this.uses[k]--;
    this.events.push('skill:'+k);
    return true;
  }

  snapshot(){
    const g=this.game,s=g.state,play=this.phase==='play';
    const mine=play&&s.turn==='w'&&!this.aiPending;
    const rd=ROUNDS[this.round];
    let ck=-1;
    if(play&&(g.status==='check'||g.status==='mate'))ck=s.b.indexOf(s.turn==='w'?'K':'k');
    return{
      phase:this.phase,seq:this.seq,round:this.round,total:ROUNDS.length,
      name:rd.name,boss:rd.boss?rd.boss.name:null,elo:rd.elo,
      lives:this.lives,coins:this.coins,skills:this.skills,relics:this.relics,uses:this.uses,extra:this.extra,
      b:s.b,sh:s.sh,fz:s.fz,turn:s.turn,ck,
      last:g.last?{from:g.last.from,to:g.last.to}:null,plies:g.history.length,
      moves:mine?g.moves.map(m=>[m.from,m.to,m.promo?m.promo.toLowerCase():0]):[],
      targets:mine?this.targets():null,
      thinking:this.aiPending,actor:this.actor(),online:this.online,events:this.events,
      reward:this.reward,shop:this.shop,gain:this.stats.gain,retry:this.retryNote,status:g.status
    };
  }
}
