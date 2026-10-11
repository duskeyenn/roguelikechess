class Board{
  constructor(root,onSquare){
    this.sq=root.querySelector('#squares');
    this.pc=root.querySelector('#pieces');
    this.cells=[];
    this.sprites=new Map();
    for(let i=0;i<64;i++){
      const d=document.createElement('div');
      d.dataset.i=i;
      this.sq.appendChild(d);
      this.cells.push(d);
    }
    this.sq.addEventListener('click',e=>{
      const t=e.target.closest('[data-i]');
      if(t)onSquare(+t.dataset.i);
    });
  }

  reset(){
    this.pc.innerHTML='';
    this.sprites=new Map();
  }

  place(el,i){el.style.transform=`translate(${(i&7)*100}%,${(i>>3)*100}%)`;}

  make(p,i,pop){
    const el=document.createElement('div');
    const img=document.createElement('img');
    el.className='pc'+(pop?' pop':'');
    img.src=pieceImg(p);
    img.alt='';
    img.draggable=false;
    el.appendChild(img);
    this.place(el,i);
    this.pc.appendChild(el);
    return{el,img,p};
  }

  out(el){
    el.classList.add('die');
    setTimeout(()=>el.remove(),450);
  }

  sync(b,hint){
    const old=this.sprites,next=new Map(),want=new Map();
    b.forEach((p,i)=>{if(p)want.set(i,p);});
    if(hint&&old.has(hint.from)&&want.has(hint.to)&&!want.has(hint.from)){
      const sp=old.get(hint.from),np=want.get(hint.to);
      old.delete(hint.from);
      sp.el.style.zIndex=3;
      if(sp.p!==np){sp.p=np;sp.img.src=pieceImg(np);}
      this.place(sp.el,hint.to);
      next.set(hint.to,sp);
      want.delete(hint.to);
      setTimeout(()=>{sp.el.style.zIndex='';},400);
    }
    for(const[i,p]of want){
      const sp=old.get(i);
      if(sp&&sp.p===p){next.set(i,sp);old.delete(i);want.delete(i);}
    }
    for(const[i,p]of want){
      let best=-1,bd=99;
      for(const[j,sp]of old){
        if(sp.p!==p)continue;
        const d=Math.max(Math.abs((i>>3)-(j>>3)),Math.abs((i&7)-(j&7)));
        if(d<bd){bd=d;best=j;}
      }
      if(best>=0){
        const sp=old.get(best);
        old.delete(best);
        this.place(sp.el,i);
        next.set(i,sp);
        want.delete(i);
      }
    }
    for(const[i,p]of want)next.set(i,this.make(p,i,true));
    for(const sp of old.values())this.out(sp.el);
    this.sprites=next;
  }

  mark(sh,fz){
    this.sprites.forEach((sp,i)=>{
      sp.el.classList.toggle('sh',sh.includes(i));
      sp.el.classList.toggle('fz',i===fz);
    });
  }

  bump(i){
    const sp=this.sprites.get(i);
    if(!sp)return;
    sp.el.classList.remove('bump');
    void sp.el.offsetWidth;
    sp.el.classList.add('bump');
    setTimeout(()=>sp.el.classList.remove('bump'),500);
  }

  paint(o){
    for(let i=0;i<64;i++){
      const k=['sq',((i>>3)+(i&7))%2?'dark':'light'];
      if(o.last&&(i===o.last.from||i===o.last.to))k.push('last');
      if(o.thr&&o.thr.has(i))k.push('thr');
      if(i===o.sel)k.push('sel');
      if(i===o.ck)k.push('check');
      if(o.targets.has(i))k.push(o.aim?'aim':o.b[i]?'cap':'tgt');
      this.cells[i].className=k.join(' ');
    }
  }
}
