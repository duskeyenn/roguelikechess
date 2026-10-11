const ASSETS={
  pieces:['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'],
  skills:['double','shield','revive','freeze'],
  relics:['purse','armor','hands','radar','heart'],
  ui:['coin','heart','logo']
};
const EXT='svg';
const asset=(g,n)=>`assets/${g}/${n}.${EXT}`;
const pieceImg=p=>asset('pieces',(p<'a'?'w':'b')+p.toLowerCase());

function preload(onProgress){
  const list=[];
  for(const g in ASSETS)for(const n of ASSETS[g])list.push(asset(g,n));
  let done=0;
  return Promise.all(list.map(u=>new Promise(r=>{
    const i=new Image();
    i.onload=i.onerror=()=>{onProgress(++done/list.length);r();};
    i.src=u;
  })));
}
