class Game{
  constructor(fen){this.reset(fen);}

  reset(fen){
    this.state=parseFen(fen||START);
    this.last=null;
    this.history=[];
    this.lost={w:[],b:[]};
    this.keys=[keyOf(this.state)];
    this.refresh();
  }

  refresh(){
    this.moves=legal(this.state);
    const chk=inCheck(this.state);
    this.status=this.moves.length?(chk?'check':this.drawReason()||'ok'):(chk?'mate':'stalemate');
    if(this.status==='check'&&this.drawReason())this.status=this.drawReason();
  }

  drawReason(){
    const s=this.state;
    if(s.half>=100)return'fifty';
    const k=keyOf(s);
    if(this.keys.filter(x=>x===k).length>=3)return'repeat';
    const rest=s.b.filter(p=>p&&p.toLowerCase()!=='k').map(p=>p.toLowerCase());
    if(!rest.length||(rest.length===1&&(rest[0]==='b'||rest[0]==='n')))return'material';
    return null;
  }

  get over(){return this.status!=='ok'&&this.status!=='check';}

  movesFrom(i){return this.moves.filter(m=>m.from===i);}

  play(from,to,promo){
    const m=this.moves.find(x=>x.from===from&&x.to===to&&(!x.promo||x.promo.toLowerCase()===promo));
    if(!m)return null;
    this.state=apply(this.state,m);
    if(this.state.cap)this.lost[colorOf(this.state.cap)].push(this.state.cap);
    this.keys.push(keyOf(this.state));
    this.last=m;
    this.history.push(sqName(from)+sqName(to)+(m.promo?m.promo.toLowerCase():''));
    this.refresh();
    return m;
  }

  again(){
    this.state={...this.state,turn:this.state.turn==='w'?'b':'w',ep:-1};
    this.keys[this.keys.length-1]=keyOf(this.state);
    this.refresh();
  }

  edit(fn){
    const s=this.state;
    this.state=fn({...s,b:s.b.slice(),sh:s.sh.slice()});
    this.keys[this.keys.length-1]=keyOf(this.state);
    this.refresh();
  }
}
