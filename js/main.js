const TIPS=[
  'Nyawa Ganda membuat satu bidak selamat dari satu tangkapan.',
  'Langkah Ganda bisa dipakai untuk skakmat kilat.',
  'Menang cepat dan tanpa kehilangan bidak memberi bonus koin.',
  'Bos membawa banyak perisai. Pakai Beku dan sabar.',
  'Coop: dua pemain bergantian jalan melawan komputer.'
];

(async()=>{
  const app=new App();
  window.app=app;
  const fill=$('barFill'),tip=$('tip'),t0=Date.now();
  let k=0;
  tip.textContent=TIPS[0];
  const tt=setInterval(()=>{tip.textContent=TIPS[++k%TIPS.length];},1500);
  await preload(p=>{fill.style.width=(p*100)+'%';});
  await new Promise(r=>setTimeout(r,Math.max(0,1800-(Date.now()-t0))));
  clearInterval(tt);
  go('title');
})();
