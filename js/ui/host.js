class LocalHost{
  constructor(onSnap){
    this.run=new Run();
    this.run.online=[true,false];
    this.onSnap=onSnap;
    this.dead=false;
  }

  begin(){this.send({t:'start'});}

  send(a){
    const ok=this.run.act(0,a);
    this.emit();
    if(ok&&this.run.aiPending)setTimeout(()=>{
      if(this.dead)return;
      this.run.aiMove();
      this.emit();
    },550);
  }

  emit(){this.onSnap(this.run.snapshot(),0);}

  close(){this.dead=true;}
}
