const http=require('http'),fs=require('fs'),path=require('path'),vm=require('vm'),os=require('os'),crypto=require('crypto');
const root=__dirname,port=+process.env.PORT||+process.argv[2]||3000;
const files=['engine/constants','engine/board','engine/moves','engine/eval','engine/ai','engine/game','rogue/data','rogue/run'];
const src=files.map(f=>fs.readFileSync(path.join(root,'js',f+'.js'),'utf8')).join('\n');
const Run=vm.runInNewContext(src+'\nRun;');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const rooms=new Map();

const seatOf=(r,t)=>t?r.tokens.indexOf(t):-1;

function room(code){
  let r=rooms.get(code);
  if(!r){
    r={run:new Run(),tokens:[null,null],clients:new Set(),seen:Date.now(),ai:null};
    rooms.set(code,r);
  }
  return r;
}

function push(r){
  r.run.online=[0,1].map(i=>[...r.clients].some(c=>r.tokens[i]&&c.token===r.tokens[i]));
  const snap=r.run.snapshot();
  for(const c of r.clients)c.res.write('data: '+JSON.stringify({seat:seatOf(r,c.token),snap})+'\n\n');
  r.seen=Date.now();
}

function schedule(r){
  if(!r.run.aiPending||r.ai)return;
  r.ai=setTimeout(()=>{
    r.ai=null;
    if(r.run.aiPending){
      r.run.aiMove();
      push(r);
    }
  },550);
}

function send(res,code,obj){
  res.writeHead(code,{'Content-Type':'application/json'});
  res.end(JSON.stringify(obj));
}

function body(req,cb){
  let d='';
  req.on('data',c=>{d+=c;if(d.length>2048)req.destroy();});
  req.on('end',()=>{
    try{cb(JSON.parse(d||'{}'));}
    catch{cb(null);}
  });
}

function api(name,b,res){
  const code=String(b.room||'').toLowerCase();
  if(!/^[a-z0-9]{1,12}$/.test(code))return send(res,400,{error:'Kode ruangan hanya huruf dan angka, maksimal 12 karakter.'});
  const r=room(code);
  if(name==='/api/join'){
    let s=seatOf(r,b.token),t=b.token;
    if(s<0){
      s=r.tokens[0]?r.tokens[1]?-1:1:0;
      if(s<0)return send(res,409,{error:'Ruangan sudah penuh.'});
      t=crypto.randomBytes(8).toString('hex');
      r.tokens[s]=t;
    }
    return send(res,200,{token:t,seat:s});
  }
  const s=seatOf(r,b.token);
  if(s<0)return send(res,403,{error:'Belum bergabung.'});
  if(name==='/api/act'&&b.a&&typeof b.a==='object'){
    if(!r.run.act(s,b.a)){
      push(r);
      return send(res,400,{error:'Aksi ditolak.'});
    }
    push(r);
    schedule(r);
    return send(res,200,{ok:true});
  }
  send(res,404,{error:'Tidak ditemukan.'});
}

function events(u,req,res){
  const r=rooms.get((u.searchParams.get('room')||'').toLowerCase()),token=u.searchParams.get('token');
  if(!r||seatOf(r,token)<0){res.writeHead(403);return res.end();}
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});
  const c={res,token};
  r.clients.add(c);
  push(r);
  const hb=setInterval(()=>res.write(':\n\n'),20000);
  req.on('close',()=>{
    clearInterval(hb);
    r.clients.delete(c);
    push(r);
  });
}

function serve(req,res){
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/')p='/index.html';
  const ok=p==='/index.html'||(/^\/(css|js|assets)\/[\w/.-]+$/.test(p)&&!p.includes('..'));
  const f=path.join(root,p),t=types[path.extname(f)];
  if(!ok||!t||!fs.existsSync(f)){res.writeHead(404);return res.end('404');}
  res.writeHead(200,{'Content-Type':t,'Cache-Control':'no-store'});
  fs.createReadStream(f).pipe(res);
}

http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x');
  if(req.method==='GET'&&u.pathname==='/api/events')return events(u,req,res);
  if(req.method==='POST'&&u.pathname.startsWith('/api/'))return body(req,b=>b?api(u.pathname,b,res):send(res,400,{error:'Data rusak.'}));
  serve(req,res);
}).listen(port,'0.0.0.0',()=>{
  const ips=Object.values(os.networkInterfaces()).flat().filter(i=>i&&(i.family==='IPv4'||i.family===4)&&!i.internal).map(i=>i.address);
  console.log('Server jalan. Buka salah satu alamat ini:');
  console.log('  http://localhost:'+port+'  (HP yang menjalankan server)');
  for(const ip of ips)console.log('  http://'+ip+':'+port+'  (HP teman, satu hotspot)');
});

setInterval(()=>{
  for(const[k,r]of rooms)if(!r.clients.size&&Date.now()-r.seen>36e5)rooms.delete(k);
},6e5);
