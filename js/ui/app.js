const EVENT_TEXT={
  blocked:'Perisai menahan serangan!',
  coin:'+1 koin',
  extra:'Jalan sekali lagi!',
  check:'Skak!',
  'skill:double':'Langkah ganda aktif',
  'skill:shield':'Perisai terpasang',
  'skill:freeze':'Bidak lawan membeku',
  'skill:revive':'Bidak bangkit!'
};

class App{
  constructor(){
    this.board=new Board($('board'),i=>this.tap(i));
    this.host=null;
    this.snap=null;
    this.prev=null;
    this.seat=0;
    this.coop=false;
    this.sel=-1;
    this.aim=null;
    this.lock=false;
    this.sheet='';
    this.promoOpen=false;
    this.pending=null;
    $('btnSolo').onclick=()=>this.solo();
    $('btnCoop').onclick=()=>this.openLobby();
    $('btnHow').onclick=()=>this.openSheet(howHtml());
    $('btnJoin').onclick=()=>this.join();
    $('btnStart').onclick=()=>this.send({t:'start'});
    $('btnBack').onclick=()=>this.menu();
    $('btnMenu').onclick=()=>this.confirmMenu();
    $('skills').onclick=e=>{const b=e.target.closest('.skill');if(b)this.useSkill(b.dataset.id);};
    $('relics').onclick=e=>{
      const b=e.target.closest('.relic');
      if(b)this.toast(RELICS[b.dataset.id].name+': '+RELICS[b.dataset.id].desc);
    };
    $('sheet').onclick=e=>this.sheetClick(e);
  }

  solo(){
    this.coop=false;
    this.seat=0;
    this.prev=null;
    this.host=new LocalHost((s,seat)=>this.onSnap(s,seat));
    this.host.begin();
  }

  openLobby(){
    this.coop=true;
    $('joinBox').hidden=false;
    $('players').innerHTML='';
    $('btnStart').hidden=true;
    $('lobbyNote').textContent=location.protocol==='file:'?'Coop butuh server: jalankan node server.js lalu buka alamat servernya.':'';
    go('lobby');
  }

  async join(){
    const room=$('room').value.trim().toLowerCase();
    if(!room)return;
    if(location.protocol==='file:'){
      $('lobbyNote').textContent='Coop butuh server: jalankan node server.js lalu buka alamat servernya.';
      return;
    }
    if(this.host&&this.host.close)this.host.close();
    this.prev=null;
    this.host=new Net((s,seat)=>this.onSnap(s,seat),m=>{
      if(cur==='lobby')$('lobbyNote').textContent=m;
      else if(m)this.toast(m);
    });
    try{
      await this.host.join(room);
      $('lobbyNote').textContent='';
    }catch(e){
      this.host=null;
      $('lobbyNote').textContent=e.message;
    }
  }

  menu(){
    if(this.host&&this.host.close)this.host.close();
    this.host=null;
    this.prev=null;
    this.snap=null;
    this.sheet='';
    this.promoOpen=false;
    this.sel=-1;
    this.aim=null;
    this.closeSheet();
    this.board.reset();
    go('title');
  }

  confirmMenu(){
    const b=$('btnMenu');
    if(b.dataset.ask){
      clearTimeout(this.askT);
      delete b.dataset.ask;
      b.textContent='Menu';
      this.menu();
      return;
    }
    b.dataset.ask=1;
    b.textContent='Yakin?';
    this.askT=setTimeout(()=>{delete b.dataset.ask;b.textContent='Menu';},2000);
  }

  send(a){
    if(!this.host)return;
    this.lock=true;
    const r=this.host.send(a);
    if(r&&r.catch)r.catch(e=>{this.lock=false;this.toast(e.message);});
  }

  mine(){
    const s=this.snap;
    return !!s&&!this.lock&&s.phase==='play'&&!s.thinking&&s.turn==='w'&&s.actor===this.seat;
  }

  onSnap(s,seat){
    const p=this.prev;
    this.lock=false;
    this.snap=s;
    this.seat=seat;
    if(s.phase==='lobby'){
      this.renderLobby(s);
      go('lobby');
      this.prev=s;
      return;
    }
    const fresh=!p||p.phase==='lobby'||p.round!==s.round||(p.phase!=='play'&&s.phase==='play')||s.plies<p.plies;
    const hint=!fresh&&s.plies>p.plies?s.last:null;
    const changed=!p||p.seq!==s.seq;
    if(fresh){
      this.board.reset();
      this.sel=-1;
      this.aim=null;
      if(s.phase==='play')this.banner(s.name+(s.boss?' · BOSS '+s.boss:''));
    }
    if(changed&&(s.plies!==(p?p.plies:-1)||s.phase!=='play'))this.sel=-1;
    if(s.phase!=='play'||s.thinking||s.actor!==seat)this.aim=null;
    go('game');
    this.board.sync(s.b,hint);
    this.board.mark(s.sh,s.fz);
    this.updateHud(s,p);
    this.refresh();
    this.sheets(s,p);
    if(p&&changed){
      s.events.forEach((ev,i)=>{if(EVENT_TEXT[ev])setTimeout(()=>this.toast(EVENT_TEXT[ev]),i*250);});
      if(s.events.includes('blocked')&&s.last)setTimeout(()=>this.board.bump(s.last.to),300);
    }
    this.prev=s;
  }

  renderLobby(s){
    $('joinBox').hidden=true;
    $('players').innerHTML=[0,1].map(i=>`<li class="${s.online[i]?'on':''}">P${i+1}${i===this.seat?' (kamu)':''}: ${s.online[i]?'terhubung':'menunggu...'}</li>`).join('');
    $('btnStart').hidden=this.seat!==0;
    $('lobbyNote').textContent=this.seat===0?'Kamu host. Mulai kapan saja.':'Menunggu host memulai run.';
  }

  html(id,h){
    const el=$(id);
    if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h;}
  }

  flash(id,cls){
    const el=$(id);
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  updateHud(s,p){
    $('hudRound').textContent=`${s.name} · Elo ${s.elo}`+(s.boss?` · BOSS ${s.boss}`:'');
    this.html('hudLives',`<img class="ic" src="${asset('ui','heart')}" alt="">`.repeat(Math.max(0,s.lives)));
    this.html('hudCoins',`<img class="ic" src="${asset('ui','coin')}" alt=""> ${s.coins}`);
    if(p&&s.lives<p.lives)this.flash('hudLives','shake');
    if(p&&s.coins>p.coins)this.flash('hudCoins','bump');
  }

  refresh(){
    const s=this.snap;
    if(!s)return;
    this.paint();
    this.renderSkills();
    $('status').textContent=this.statusText();
  }

  paint(){
    const s=this.snap,my=this.mine(),targets=new Set();
    if(this.aim)this.aim.sq.forEach(i=>targets.add(i));
    else if(my&&this.sel>=0)s.moves.filter(m=>m[0]===this.sel).forEach(m=>targets.add(m[1]));
    let thr=null;
    if(s.phase==='play'&&s.relics.includes('radar')){
      thr=new Set();
      s.b.forEach((p,i)=>{if(p&&p<'a'&&attacked({b:s.b},i,'b'))thr.add(i);});
    }
    this.board.paint({sel:this.sel,targets,aim:!!this.aim,last:s.last,ck:s.ck,thr,b:s.b});
  }

  renderSkills(){
    const s=this.snap,my=this.mine(),bonus=s.relics.includes('hands')?1:0;
    this.html('skills',Object.keys(s.skills).map(id=>{
      const n=s.uses[id]||0,d=SKILLS[id];
      return `<button class="skill${this.aim&&this.aim.id===id?' on':''}" data-id="${id}"${my&&n>0?'':' disabled'}><img src="${asset('skills',id)}" alt=""><span>${d.name}</span><i>${n}/${s.skills[id]+bonus}</i></button>`;
    }).join(''));
    this.html('relics',s.relics.map(id=>`<button class="relic" data-id="${id}"><img src="${asset('relics',id)}" alt=""></button>`).join(''));
  }

  statusText(){
    const s=this.snap;
    if(s.phase!=='play')return '';
    if(this.aim)return `Pilih target untuk ${SKILLS[this.aim.id].name}. Ketuk skill lagi untuk batal.`;
    if(s.thinking)return 'Lawan berpikir...';
    if(s.actor===this.seat)return 'Giliranmu'+(s.extra?' (langkah ganda aktif)':'')+(s.ck>=0?', skak!':'');
    return `Giliran P${s.actor+1}`;
  }

  tap(i){
    const s=this.snap;
    if(!s||s.phase!=='play'||this.lock)return;
    if(this.aim){
      const a=this.aim;
      this.aim=null;
      if(a.sq.includes(i))this.send({t:'skill',id:a.id,sq:i});
      else this.refresh();
      return;
    }
    if(!this.mine())return;
    if(this.sel>=0){
      const ms=s.moves.filter(m=>m[0]===this.sel&&m[1]===i);
      if(ms.length){
        if(ms[0][2]){this.pending={from:this.sel,to:i};this.promo();return;}
        const from=this.sel;
        this.sel=-1;
        this.send({t:'move',from,to:i});
        return;
      }
    }
    this.sel=s.moves.some(m=>m[0]===i)&&i!==this.sel?i:-1;
    this.refresh();
  }

  useSkill(id){
    const s=this.snap;
    if(!this.mine()||!(s.uses[id]>0))return;
    if(this.aim&&this.aim.id===id){this.aim=null;this.refresh();return;}
    const t=SKILLS[id].target;
    if(!t){this.send({t:'skill',id});return;}
    const sq=s.targets[t];
    if(!sq.length){this.toast('Tidak ada target yang cocok');return;}
    this.aim={id,sq};
    this.sel=-1;
    this.refresh();
  }

  promo(){
    this.promoOpen=true;
    this.openSheet(`<h2>Promosi pion</h2><div class="cards">${['q','r','b','n'].map((t,i)=>`<button class="card" data-promo="${t}" style="--d:${i*70}ms"><img src="${asset('pieces','w'+t)}" alt=""></button>`).join('')}</div><button data-act="cancelPromo">Batal</button>`);
  }

  sheets(s,p){
    const html=sheetHtml(s);
    if(!html){
      if(this.sheet&&!this.promoOpen){this.closeSheet();this.sheet='';}
      return;
    }
    const late=s.phase!=='shop'&&p&&p.phase==='play';
    this.sheet=s.phase;
    setTimeout(()=>{if(this.snap===s)this.openSheet(html);},late?900:0);
  }

  openSheet(html){
    const m=$('modal');
    $('sheet').innerHTML=html;
    if(m.hidden){m.hidden=false;void m.offsetWidth;}
    m.classList.add('on');
  }

  closeSheet(){
    const m=$('modal');
    m.classList.remove('on');
    setTimeout(()=>{if(!m.classList.contains('on'))m.hidden=true;},380);
  }

  sheetClick(e){
    const t=e.target.closest('button');
    if(!t||t.disabled)return;
    const d=t.dataset;
    if(d.pick!==undefined)this.send({t:'pick',i:+d.pick});
    else if(d.buy!==undefined)this.send({t:'buy',i:+d.buy});
    else if(d.promo){
      const{from,to}=this.pending;
      this.promoOpen=false;
      this.closeSheet();
      this.sel=-1;
      this.send({t:'move',from,to,promo:d.promo});
    }
    else if(d.act==='cancelPromo'){this.promoOpen=false;this.closeSheet();}
    else if(d.act==='close')this.closeSheet();
    else if(d.act==='menu')this.menu();
    else if(d.act)this.send({t:d.act});
  }

  toast(text){
    const d=document.createElement('div');
    d.className='toast';
    d.textContent=text;
    $('toasts').appendChild(d);
    setTimeout(()=>d.remove(),2100);
  }

  banner(text){
    const b=$('banner');
    b.textContent=text;
    b.classList.remove('on');
    void b.offsetWidth;
    b.classList.add('on');
  }
}
