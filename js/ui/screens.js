const $=id=>document.getElementById(id);
let cur='loading';

function go(id){
  if(cur===id)return;
  $(cur).className='screen left';
  $(id).className='screen show';
  cur=id;
}

const defOf=it=>it.t==='skill'?SKILLS[it.id]:it.t==='relic'?RELICS[it.id]:{name:'Nyawa +1',desc:'Tambah satu nyawa (maksimal 5).'};
const iconOf=it=>it.t==='skill'?asset('skills',it.id):it.t==='relic'?asset('relics',it.id):asset('ui','heart');
const kindOf=it=>it.t==='skill'?'Skill':it.t==='relic'?'Relic':'Item';

function card(it,i,attr,note,off){
  const d=defOf(it);
  return `<button class="card" ${attr}="${i}" style="--d:${i*90}ms"${off?' disabled':''}><img src="${iconOf(it)}" alt=""><b>${d.name}</b><small>${kindOf(it)}${note||''}</small><span>${d.desc}</span></button>`;
}

function sheetHtml(s){
  const P=s.phase;
  if(P==='reward')
    return `<h2>Menang! +${s.gain} koin</h2><p>Pilih satu hadiah.</p><div class="cards">${s.reward.map((it,i)=>card(it,i,'data-pick')).join('')}</div>`;
  if(P==='shop')
    return `<h2>Toko</h2><p><img class="ic" src="${asset('ui','coin')}" alt=""> ${s.coins} koin</p><div class="cards">${s.shop.map((it,i)=>card(it,i,'data-buy',it.sold?' · terjual':' · '+it.cost+' koin',it.sold||s.coins<it.cost)).join('')}</div><button data-act="next">Lanjut ke ronde berikutnya</button>`;
  if(P==='retry')
    return s.retry==='draw'
      ?`<h2>Seri</h2><p>Ronde diulang, nyawa aman.</p><button data-act="retry">Ulangi ronde</button>`
      :`<h2>Kalah</h2><p>Nyawa berkurang. Sisa ${s.lives}.</p><button data-act="retry">Ulangi ronde</button>`;
  if(P==='over')
    return `<h2>Run berakhir</h2><p>Kamu tumbang di ${s.name}.</p><button data-act="restart">Main lagi</button><button data-act="menu">Menu</button>`;
  if(P==='win')
    return `<h2>Kamu menang!</h2><p>Semua ronde selesai. Koin akhir: ${s.coins}.</p><button data-act="restart">Main lagi</button><button data-act="menu">Menu</button>`;
  return '';
}

const howHtml=()=>`<h2>Cara bermain</h2><p>Menangkan ronde dengan skakmat. Tiap ronde lawannya makin kuat.</p><p>Skill dipakai gratis, tidak memakai giliran, jumlahnya terbatas per ronde. Setelah menang pilih hadiah lalu belanja di toko.</p><p>Kalah = nyawa berkurang. Nyawa habis = run selesai.</p><p>Coop: dua pemain satu tim, bergantian jalan melawan komputer.</p><button data-act="close">Tutup</button>`;
