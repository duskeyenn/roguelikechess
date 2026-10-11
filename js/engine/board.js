const inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const at=(b,r,c)=>inside(r,c)?b[r*8+c]:undefined;
const colorOf=p=>p<'a'?'w':'b';
const sqName=i=>FILES[i&7]+(8-(i>>3));
const sqIndex=s=>(8-+s[1])*8+FILES.indexOf(s[0]);
const keyOf=s=>s.b.map(p=>p||'1').join('')+s.turn+s.castle+s.ep+s.sh.join('.')+s.fz;
const mvSh=(sh,a,b)=>sh.includes(a)?sh.map(x=>x===a?b:x):sh;

function parseFen(fen){
  const[pos,turn,castle,ep,half]=fen.split(' ');
  const b=[];
  for(const ch of pos.replace(/\//g,''))
    if(ch>='1'&&ch<='8')b.push(...Array(+ch).fill(null));
    else b.push(ch);
  return{b,turn,castle,ep:ep==='-'?-1:sqIndex(ep),half:+half||0,sh:[],fz:-1,fc:'',cap:null,blk:false};
}

function apply(s,m){
  const w=s.turn==='w',v=m.f==='ep'?m.to+(w?8:-8):m.to,hit=s.b[v]||null;
  const fz=s.fz>=0&&s.fc!==s.turn&&v!==s.fz?s.fz:-1,fc=fz>=0?s.fc:'';
  const turn=w?'b':'w';
  if(hit&&s.sh.includes(v))
    return{b:s.b,turn,castle:s.castle,ep:-1,half:s.half+1,sh:s.sh.filter(x=>x!==v),fz,fc,cap:null,blk:true};
  const b=s.b.slice(),rook=w?'R':'r',reset=hit||m.p.toLowerCase()==='p';
  b[m.from]=null;
  b[m.to]=m.promo||m.p;
  if(m.f==='ep')b[v]=null;
  let sh=mvSh(s.sh,m.from,m.to);
  if(m.f==='ck'){b[m.to+1]=null;b[m.to-1]=rook;sh=mvSh(sh,m.to+1,m.to-1);}
  if(m.f==='cq'){b[m.to-2]=null;b[m.to+1]=rook;sh=mvSh(sh,m.to-2,m.to+1);}
  const lost=(RIGHTS[m.from]||'')+(RIGHTS[m.to]||'');
  const castle=[...s.castle].filter(x=>!lost.includes(x)).join('')||'-';
  return{b,turn,castle,ep:m.f==='dp'?(m.from+m.to)>>1:-1,half:reset?0:s.half+1,sh,fz,fc,cap:hit,blk:false};
}
