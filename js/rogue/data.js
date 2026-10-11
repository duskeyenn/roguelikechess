const SKILLS={
  double:{name:'Langkah Ganda',desc:'Langkah berikutnya jadi dua kali jalan.',target:null},
  shield:{name:'Nyawa Ganda',desc:'Satu bidakmu selamat dari satu tangkapan.',target:'shield'},
  revive:{name:'Bangkitkan',desc:'Hidupkan bidakmu yang terakhir tertangkap.',target:'revive'},
  freeze:{name:'Beku',desc:'Satu bidak lawan tidak bisa jalan satu giliran.',target:'freeze'}
};
const RELICS={
  purse:{name:'Dompet Koin',desc:'Dapat 1 koin tiap kamu menangkap bidak.'},
  armor:{name:'Jimat Baja',desc:'Tiap ronde, dua pionmu mulai dengan perisai.'},
  hands:{name:'Tangan Cepat',desc:'Semua skill dapat 1 pemakaian ekstra tiap ronde.'},
  radar:{name:'Radar',desc:'Menandai bidakmu yang sedang terancam.'},
  heart:{name:'Hati Cadangan',desc:'Langsung dapat 1 nyawa tambahan.'}
};
const ROUNDS=[
  {name:'Ronde 1',elo:300},
  {name:'Ronde 2',elo:500},
  {name:'Ronde 3',elo:800,boss:{name:'Penjaga Gerbang',shields:3}},
  {name:'Ronde 4',elo:1100},
  {name:'Ronde 5',elo:1400},
  {name:'Ronde 6',elo:1700,boss:{name:'Raja Perisai',shields:6}}
];
const START_SKILLS={double:1,shield:1};
