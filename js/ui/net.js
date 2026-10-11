class Net{
  constructor(onSnap,onNote){
    this.onSnap=onSnap;
    this.onNote=onNote;
    this.es=null;
  }

  async post(url,body){
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const j=await res.json();
    if(!res.ok)throw new Error(j.error);
    return j;
  }

  async join(room){
    const key='rogue:'+room;
    const r=await this.post('/api/join',{room,token:sessionStorage.getItem(key)});
    sessionStorage.setItem(key,r.token);
    this.room=room;
    this.token=r.token;
    this.es=new EventSource(`/api/events?room=${encodeURIComponent(room)}&token=${r.token}`);
    this.es.onopen=()=>this.onNote('');
    this.es.onmessage=e=>{const d=JSON.parse(e.data);this.onSnap(d.snap,d.seat);};
    this.es.onerror=()=>this.onNote('Koneksi terputus, mencoba menyambung lagi.');
  }

  send(a){return this.post('/api/act',{room:this.room,token:this.token,a});}

  close(){
    if(this.es)this.es.close();
    this.es=null;
  }
}
