/* Недвижимость Беларуси — клиентская часть. Данные объектов, риелторов и контактов: app/data.json */
(function(){
"use strict";
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const nf = new Intl.NumberFormat('ru-RU');
let RATE = 2.95;
const usd = n => nf.format(Math.round(n)) + ' $';
const byn = n => nf.format(Math.round(n*RATE)) + ' BYN';
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=crypto.getRandomValues(new Uint8Array(1))[0]%16;return (c==='x'?r:(r&3|8)).toString(16)}));
const CITIES = ['Минск','Минский р-н','Минская обл.','Витебская обл.','Брестская обл.','Гродненская обл.','Гомельская обл.','Могилёвская обл.','Брест','Гродно','Гомель','Витебск','Могилёв'];
let SITE = {}, AGENTS = [], L = [], ALL = [];

/* ---------- procedural illustrations (used when a listing has no photos) ---------- */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const WALLS=['#E8E3DA','#DCE3DF','#E3E0E9','#ECE5D8','#D8E1EA','#E7E7E1','#E9DDD4'];
const FLOORS=['#B98E63','#A3785A','#C8A57C','#8C6B52','#D0B38C','#9E8670'];
const ACC=['#3A55BE','#2F6B5A','#B5654A','#C9A24B','#6B4E8C','#4B7C99','#7A3A4E','#3D4F5C'];
let uid=0;
function scene(kind,seed){
  const r=rng(seed*97+kind.length*13), p=a=>a[Math.floor(r()*a.length)], id='s'+(++uid);
  const wall=p(WALLS), floor=p(FLOORS), a1=p(ACC), a2=p(ACC.filter(c=>c!==a1));
  const skyTop=r()>.5?'#9DB9E0':'#C3D4EA', skyBot=r()>.5?'#E8EEF6':'#F5E9D8';
  const defs=`<defs><linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/></linearGradient><linearGradient id="${id}l" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs>`;
  const boards=y=>{let s='';for(let x=-20;x<420;x+=46)s+=`<line x1="${x}" y1="${y}" x2="${x-30}" y2="300" stroke="#000" stroke-opacity=".08"/>`;return s};
  const win=(x,y,w,h)=>`<rect x="${x-6}" y="${y-6}" width="${w+12}" height="${h+12}" fill="#F7F7F4"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}k)"/><path d="M${x} ${y+h*.78} q${w*.25} -${h*.12} ${w*.5} -${h*.04} t${w*.5} -${h*.06} V${y+h} H${x}Z" fill="#8FAE9A" opacity=".7"/><rect x="${x+w/2-2}" y="${y}" width="4" height="${h}" fill="#F7F7F4"/><rect x="${x}" y="${y+h*.42}" width="${w}" height="4" fill="#F7F7F4"/>`;
  const plant=(x,y,s)=>`<rect x="${x-12*s}" y="${y}" width="${24*s}" height="${26*s}" rx="${4*s}" fill="${a2}"/><g fill="#4E7A5A"><ellipse cx="${x}" cy="${y-18*s}" rx="${7*s}" ry="${20*s}"/><ellipse cx="${x-12*s}" cy="${y-10*s}" rx="${6*s}" ry="${16*s}" transform="rotate(-28 ${x-12*s} ${y-10*s})"/><ellipse cx="${x+12*s}" cy="${y-10*s}" rx="${6*s}" ry="${16*s}" transform="rotate(28 ${x+12*s} ${y-10*s})"/></g>`;
  let b='';
  if(kind==='living'){
    b=`<rect width="400" height="300" fill="${wall}"/><rect y="215" width="400" height="85" fill="${floor}"/>${boards(215)}<rect y="215" width="400" height="30" fill="url(#${id}f)"/>
    ${win(255,40,110,130)}<rect x="240" y="30" width="14" height="185" fill="${a2}" opacity=".55"/><rect x="366" y="30" width="14" height="185" fill="${a2}" opacity=".55"/>
    <rect x="58" y="62" width="84" height="58" fill="#fff" stroke="#3a3a3a" stroke-width="3"/><circle cx="86" cy="96" r="14" fill="${a2}" opacity=".8"/><rect x="98" y="78" width="30" height="34" fill="${a1}" opacity=".6"/>
    <ellipse cx="135" cy="262" rx="125" ry="20" fill="${a2}" opacity=".35"/>
    <rect x="30" y="138" width="200" height="40" rx="12" fill="${a1}"/><rect x="22" y="160" width="216" height="48" rx="10" fill="${a1}"/><rect x="22" y="182" width="216" height="26" rx="8" fill="#000" opacity=".12"/>
    <rect x="44" y="150" width="56" height="22" rx="8" fill="#fff" opacity=".35"/><rect x="160" y="150" width="56" height="22" rx="8" fill="#fff" opacity=".25"/>
    <rect x="34" y="208" width="6" height="12" fill="#3a3a3a"/><rect x="220" y="208" width="6" height="12" fill="#3a3a3a"/>
    <ellipse cx="135" cy="240" rx="48" ry="8" fill="#3a3a3a" opacity=".85"/><rect x="132" y="240" width="6" height="18" fill="#3a3a3a"/>
    ${plant(392,190,1)}
    <line x1="16" y1="80" x2="16" y2="215" stroke="#3a3a3a" stroke-width="3"/><path d="M2 80 h28 l-6 -22 h-16z" fill="#F2E3C2"/>`;
  } else if(kind==='kitchen'){
    let tiles='';for(let x=0;x<400;x+=20)for(let y=100;y<150;y+=16)tiles+=`<rect x="${x+((y/16)%2?10:0)}" y="${y}" width="19" height="15" fill="#fff" opacity=".35"/>`;
    b=`<rect width="400" height="300" fill="${wall}"/>${tiles}<rect y="235" width="400" height="65" fill="${floor}"/>${boards(235)}
    ${win(150,26,100,74)}
    <rect x="10" y="26" width="128" height="64" rx="4" fill="${a1}"/><line x1="74" y1="26" x2="74" y2="90" stroke="#000" stroke-opacity=".15"/><rect x="262" y="26" width="128" height="64" rx="4" fill="${a1}"/><line x1="326" y1="26" x2="326" y2="90" stroke="#000" stroke-opacity=".15"/>
    <rect x="0" y="150" width="400" height="10" fill="#E9E9E6"/><rect x="0" y="160" width="400" height="75" fill="${a1}"/><rect x="0" y="160" width="400" height="75" fill="#000" opacity=".08"/>
    ${[0,80,160,240,320].map(x=>`<rect x="${x+6}" y="168" width="68" height="60" rx="3" fill="none" stroke="#000" stroke-opacity=".14"/><rect x="${x+32}" y="174" width="16" height="3" rx="1.5" fill="#d8d8d8"/>`).join('')}
    <rect x="180" y="132" width="44" height="18" rx="3" fill="#cfd2d4"/><path d="M196 132 v-14 h14" fill="none" stroke="#9aa" stroke-width="3"/>
    <rect x="290" y="128" width="20" height="22" rx="3" fill="${a2}"/><circle cx="60" cy="140" r="10" fill="${a2}"/>${plant(355,128,.6)}
    <line x1="120" y1="0" x2="120" y2="8" stroke="#333" stroke-width="2"/>`;
  } else if(kind==='bedroom'){
    b=`<rect width="400" height="300" fill="${wall}"/><rect y="220" width="400" height="80" fill="${floor}"/>${boards(220)}<rect y="220" width="400" height="28" fill="url(#${id}f)"/>
    ${win(290,40,84,120)}<rect x="278" y="32" width="12" height="190" fill="${a2}" opacity=".5"/><rect x="374" y="32" width="12" height="190" fill="${a2}" opacity=".5"/>
    <rect x="70" y="92" width="190" height="80" rx="10" fill="${a1}"/>
    <rect x="62" y="160" width="206" height="62" rx="8" fill="#F4F2EE"/><rect x="62" y="178" width="206" height="48" rx="8" fill="${a2}" opacity=".8"/>
    <rect x="86" y="140" width="66" height="30" rx="10" fill="#fff"/><rect x="178" y="140" width="66" height="30" rx="10" fill="#fff"/>
    <rect x="12" y="170" width="42" height="50" rx="4" fill="#7a6250"/><rect x="276" y="170" width="0" height="0"/>
    <line x1="33" y1="150" x2="33" y2="170" stroke="#3a3a3a" stroke-width="2"/><path d="M20 150 h26 l-5 -18 h-16z" fill="#F2E3C2"/>
    <rect x="120" y="40" width="90" height="40" fill="#fff" stroke="#3a3a3a" stroke-width="2.5"/><path d="M124 76 l26 -20 l20 14 l14 -8 l22 14z" fill="${a1}" opacity=".6"/>`;
  } else if(kind==='office'){
    const blind=(x,y,w,h)=>{let t=`<rect x="${x-5}" y="${y-5}" width="${w+10}" height="${h+10}" fill="#F7F7F4"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}k)"/>`;for(let i=x+2;i<x+w;i+=7)t+=`<rect x="${i}" y="${y}" width="4" height="${h}" fill="#fff" opacity=".7"/>`;return t};
    const desk=(x,y,s2)=>`<rect x="${x}" y="${y}" width="${110*s2}" height="${8*s2}" fill="#B98A5E"/><rect x="${x+4*s2}" y="${y+8*s2}" width="${8*s2}" height="${34*s2}" fill="#9C7450"/><rect x="${x+98*s2}" y="${y+8*s2}" width="${8*s2}" height="${34*s2}" fill="#9C7450"/><rect x="${x+38*s2}" y="${y-30*s2}" width="${36*s2}" height="${24*s2}" rx="${2*s2}" fill="#2A2E36"/><rect x="${x+41*s2}" y="${y-27*s2}" width="${30*s2}" height="${18*s2}" fill="#5B7FB8" opacity=".8"/><rect x="${x+54*s2}" y="${y-6*s2}" width="${4*s2}" height="${6*s2}" fill="#2A2E36"/><path d="M${x+44*s2} ${y+44*s2} h${26*s2} v-${18*s2} h-${26*s2}z" fill="${a1}" opacity=".85"/>`;
    b=`<rect width="400" height="300" fill="${wall}"/><rect y="205" width="400" height="95" fill="${floor}"/>${boards(205)}<rect y="205" width="400" height="26" fill="url(#${id}f)"/>
    <rect x="70" y="8" width="90" height="6" rx="3" fill="#fff"/><rect x="240" y="8" width="90" height="6" rx="3" fill="#fff"/>
    ${blind(40,40,110,120)}${blind(250,40,110,120)}
    ${desk(30,200,1)}${desk(230,214,1.05)}
    <rect x="186" y="120" width="34" height="96" fill="#B98A5E"/><rect x="190" y="128" width="26" height="22" fill="#9C7450"/><rect x="190" y="156" width="26" height="22" fill="#9C7450"/>
    ${plant(372,188,.8)}`;
  } else if(kind==='warehouse'){
    let racks='';[20,150,280].forEach(x=>{racks+=`<rect x="${x}" y="70" width="6" height="170" fill="#2F5DA8"/><rect x="${x+94}" y="70" width="6" height="170" fill="#2F5DA8"/>`;[110,160,210].forEach(y=>{racks+=`<rect x="${x}" y="${y}" width="100" height="6" fill="#E08A2E"/>`;for(let bx=x+8;bx<x+92;bx+=28){const hh=18+Math.floor(r()*14);racks+=`<rect x="${bx}" y="${y-hh}" width="24" height="${hh}" fill="${r()>.5?'#C9A27A':'#B48C63'}"/><rect x="${bx}" y="${y-hh+hh/2-1}" width="24" height="2" fill="#A07850"/>`}})});
    b=`<rect width="400" height="300" fill="#D9DCDF"/><rect y="0" width="400" height="40" fill="#C4C8CD"/>${[60,200,340].map(x=>`<rect x="${x-20}" y="40" width="40" height="5" fill="#fff"/><path d="M${x-30} 45 L${x+30} 45 L${x+60} 240 L${x-60} 240Z" fill="#fff" opacity=".07"/>`).join('')}
    <rect y="240" width="400" height="60" fill="#A9ADB1"/><line x1="0" y1="262" x2="400" y2="262" stroke="#E3C34A" stroke-width="3" stroke-dasharray="18 10"/>${racks}`;
  } else { // facade
    const low=kind==='lowrise', floors=low?2:5+Math.floor(r()*6), cols=low?6:4+Math.floor(r()*3), bw=cols*44+24, bx=(400-bw)/2, fh=24, bh=floors*fh+20, by=262-bh;
    const fac=p(['#E9E4DA','#D9DEE2','#E6D7C7','#CFD6D0','#EDE9E2','#C9CDD6']);
    let w='';for(let f=0;f<floors;f++)for(let c=0;c<cols;c++){const x=bx+16+c*44,y=by+14+f*fh;w+=`<rect x="${x}" y="${y}" width="28" height="15" fill="${r()>.82?'#F4D58A':'#6F8AA6'}" opacity=".9"/>`;if(c%2===1&&f>0&&r()>.4)w+=`<rect x="${x-4}" y="${y+14}" width="36" height="4" fill="#9a9a9a"/>`}
    b=`<rect width="400" height="300" fill="url(#${id}k)"/><circle cx="${60+r()*60}" cy="52" r="20" fill="#fff" opacity=".6"/>
    <rect x="${bx-60}" y="${by+30}" width="70" height="${bh-30}" fill="${p(WALLS)}" opacity=".7"/><rect x="${bx+bw-10}" y="${by+50}" width="80" height="${bh-50}" fill="${p(WALLS)}" opacity=".7"/>
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${fac}"/><rect x="${bx-6}" y="${by-8}" width="${bw+12}" height="10" fill="#8b8f93"/>${w}
    <rect x="${bx+bw/2-16}" y="${262-30}" width="32" height="30" fill="#4a3c33"/><rect x="${bx+bw/2-24}" y="${262-36}" width="48" height="6" fill="#8b8f93"/>
    <rect y="262" width="400" height="38" fill="#9AA79A"/><rect y="272" width="400" height="28" fill="#7F8A80"/>
    <g fill="#4E7A5A"><circle cx="34" cy="222" r="28"/><circle cx="60" cy="236" r="20"/><circle cx="370" cy="226" r="26"/><circle cx="344" cy="242" r="16"/></g>
    <rect x="31" y="244" width="6" height="22" fill="#6b5444"/><rect x="367" y="246" width="6" height="20" fill="#6b5444"/>`;
  }
  const light=(kind==='facade'||kind==='lowrise'||kind==='warehouse')?'':`<rect width="400" height="300" fill="url(#${id}l)"/>`;
  return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${{living:'Гостиная',kitchen:'Кухня',bedroom:'Спальня',facade:'Фасад здания',lowrise:'Здание',office:'Офисное помещение',warehouse:'Складское помещение'}[kind]}">${defs}${b}${light}</svg>`;
}
const isCom = o => o.category==='commercial';
const isHouse = o => o.category==='house';
const catOf = o => o.category||'apartment';
const galleryKinds = o => isHouse(o) ? ['lowrise','living','kitchen','bedroom'] : isCom(o) ? (o.type==='Склад'?['warehouse','facade','office','warehouse']:o.type==='Здание'?['lowrise','office','warehouse','office']:['office','facade','office','warehouse']) : o.rooms===0 ? ['living','kitchen','facade','bedroom'] : (o.n%3===0?['facade','living','kitchen','bedroom']:['living','kitchen','bedroom','facade']);
function avatar(a){return `<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" fill="${/^#[0-9a-f]{6}$/i.test(a.color)?a.color:'#1E2A44'}"/><circle cx="42" cy="34" r="15" fill="#fff" opacity=".2"/><path d="M14 84c3-16 15-24 28-24s25 8 28 24z" fill="#fff" opacity=".2"/><text x="42" y="52" text-anchor="middle" font-family="Unbounded, Arial, sans-serif" font-size="22" font-weight="500" fill="#fff">${esc(a.initials)}</text></svg>`}


const photoOrScene = (o,i,kind) => o.photos && o.photos[i] ? `<img src="/${esc(o.photos[i])}" alt="${esc(roomsTitle(o))}, фото ${i+1}" loading="lazy" decoding="async">` : scene(kind,o.n);
const galleryItems = o => o.photos && o.photos.length ? o.photos.map((_,i)=>i) : galleryKinds(o);

/* ---------- helpers ---------- */
const roomsTitle = o => (isCom(o)||isHouse(o)) ? o.type : o.rooms===0 ? 'Студия' : `${o.rooms}-комнатная квартира`;
const priceLine = o => o.deal==='rent' ? `${usd(o.priceUsd)}<small>в месяц${isCom(o)?`, ${usd(o.priceUsd/o.area).replace(' $','')} $/м²`:''}</small>` : `${usd(o.priceUsd)}${o.area?`<small>${usd(o.priceUsd/o.area)} за м²</small>`:''}`;
const agentOf = o => AGENTS.find(a=>a.id===o.agent) || AGENTS[0];
const tel = p => 'tel:'+String(p).replace(/[^\d+]/g,'');
const districtIn = d => d.toLowerCase().replace(/ий$/,'ом');
const isOff = o => o.status==='withdrawn';
const region = o => /р-н$|обл\.$/.test(o.city);
const inCity = o => region(o) ? `${o.district}, ${o.city.replace('р-н','район').replace('обл.','область')}` : `${districtIn(o.district)} районе, г. ${o.city}`;
const place = o => region(o) ? `${o.city}, ${o.district}, ${o.address}` : `${o.city}, ${o.address}`;
function pmt(loan,rate,years){const m=rate/1200,n=years*12;return m?loan*m/(1-Math.pow(1+m,-n)):loan/n}
function plural(n,f){const m10=n%10,m100=n%100;return f[(m10===1&&m100!==11)?0:(m10>=2&&m10<=4&&(m100<10||m100>=20))?1:2]}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),2800)}

/* ---------- sending requests to the server ---------- */
async function sendLead(payload){
  if(window.__NBEL_PREVIEW__) return {id:'ДЕМО (в демо-версии заявка не отправляется)'};
  const res = await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'same-origin'});
  let body={};try{body=await res.json()}catch(e){}
  if(!res.ok) throw new Error(body.error||'Не удалось отправить заявку.');
  return body;
}
const callUs = () => SITE.telegram?`Напишите нам в Telegram (${SITE.telegram.replace('https://','')}) или позвоните: ${SITE.phone||''}`:`Позвоните нам: ${SITE.phone||''}`;

/* ---------- state ---------- */
let favs = new Set(store.get('nbel-favs',[]));
const st = {cat:'all',deal:'all',act:false,city:'',rooms:new Set(),min:'',max:'',amin:'',amax:'',q:'',metro:false,pets:false,fav:false,sort:'new',shown:9};

function skyline(){
  const svg=$('#skyline'), r=rng(7); let x=-20, out=''; const wins=[];
  while(x<1460){
    const w=60+Math.floor(r()*90), h=70+Math.floor(r()*140), cls=['ba','bb','bc'][Math.floor(r()*3)], y=230-h;
    out+=`<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
    if(r()>.6)out+=`<rect class="${cls}" x="${x+w/2-3}" y="${y-18}" width="6" height="18"/>`;
    for(let yy=y+14;yy<222;yy+=20)for(let xx=x+10;xx<x+w-14;xx+=18)wins.push([xx,yy]);
    x+=w+4;
  }
  wins.forEach(([xx,yy])=>{const lit=r()>.78;const d=Math.min(9,Math.floor(xx/1440*8+r()*2));out+=`<rect class="w${lit?' lit d'+d:''}" x="${xx}" y="${yy}" width="8" height="10"/>`});
  svg.innerHTML=out;
}

function applySite(){
  $$('[data-site]').forEach(el=>{const v=SITE[el.dataset.site];if(v)el.textContent=v});
  $$('[data-site-tel]').forEach(el=>{const v=SITE[el.dataset.siteTel];if(!v)return;el.href=tel(v);el.textContent=el.dataset.label||((el.dataset.prefix||'')+v)});
  $$('[data-site-mail]').forEach(el=>{const v=SITE[el.dataset.siteMail];if(!v)return;el.href='mailto:'+v;el.textContent=v});
  $$('[data-site-link]').forEach(el=>{const v=SITE[el.dataset.siteLink];if(!v){el.closest('li,div')&&(el.closest('li,div').hidden=true);return}el.href=v;if(el.textContent.trim().startsWith('t.me'))el.textContent=v.replace('https://','')});
  $$('[data-optional]').forEach(el=>{el.hidden=!SITE[el.dataset.optional]});
  const bot=SITE.bot?String(SITE.bot).replace(/^@/,''):'';
  $$('[data-bot-row]').forEach(el=>{el.hidden=!bot});
  $$('[data-site-bot]').forEach(el=>{el.hidden=!bot;if(!bot)return;el.href='https://t.me/'+bot;el.textContent=el.dataset.label||('@'+bot)});
  $('#year').textContent=new Date().getFullYear();
  $('#rateNote').textContent=String(RATE).replace('.',',')+' BYN за 1 $';
}

/* ---------- filtering ---------- */
const num = v => {const n=parseInt(String(v).replace(/\D/g,''),10);return isNaN(n)?null:n};
function filtered(){
  const q=st.q.trim().toLowerCase(), mn=num(st.min), mx=num(st.max), amn=num(st.amin), amx=num(st.amax);
  const a=L.filter(o=>
    (st.deal==='all'||o.deal===st.deal) && (st.cat==='all'||catOf(o)===st.cat) && (!st.city||o.city===st.city) &&
    (!st.rooms.size||(catOf(o)==='apartment'&&st.rooms.has(String(Math.min(o.rooms,4))))) &&
    (mn==null||o.priceUsd>=mn) && (mx==null||o.priceUsd<=mx) && (amn==null||(o.area||0)>=amn) && (amx==null||(o.area&&o.area<=amx)) &&
    (!st.act||!isOff(o)) && (!st.metro||o.metro) && (!st.pets||o.pets) && (!st.fav||favs.has(o.id)) &&
    (!q||[o.address,o.district,o.city,o.metro||'',o.type||'',(o.tags||[]).join(' ')].join(' ').toLowerCase().includes(q)));
  const s={new:(x,y)=>(isOff(x)-isOff(y))||(x.daysOnSite-y.daysOnSite),pa:(x,y)=>x.priceUsd-y.priceUsd,pd:(x,y)=>y.priceUsd-x.priceUsd,ad:(x,y)=>y.area-x.area}[st.sort];
  return a.sort(s);
}
function specs(o){
  if(isHouse(o)) return `${o.area?`<span>${nf.format(o.area)} м²</span>`:''}${o.rooms?`<span>${o.rooms} комн.</span>`:''}<span>${o.floors}-этажный</span>${o.landSotka?`<span>${nf.format(o.landSotka)} сот.</span>`:''}`;
  if(isCom(o)) return `<span>${nf.format(o.area)} м²</span><span>${o.rooms} ${plural(o.rooms,['помещение','помещения','помещений'])}</span><span>${o.type==='Здание'?o.floors+'-этажное':o.floor+'/'+o.floors+' этаж'}</span>${o.landSotka?`<span>${nf.format(o.landSotka)} сот.</span>`:''}`;
  return `<span>${o.rooms===0?'Студия':o.rooms+' комн.'}</span><span>${nf.format(o.area)} м²</span><span>${o.floor}/${o.floors} этаж</span>`;
}
function card(o){
  const fav=favs.has(o.id), kinds=galleryKinds(o), tag=(o.tags||[])[0];
  return `<article class="card${isOff(o)?' off':''}" data-id="${esc(o.id)}" tabindex="0" aria-label="${esc(roomsTitle(o))}, ${esc(place(o))}">
    <div class="card-media">${photoOrScene(o,0,kinds[0])}
      <div class="badge">${isOff(o)?'<span class="off">Снято с продажи</span>':`<span class="${o.deal}">${o.deal==='sale'?'Продажа':'Аренда'}</span>`}${(isCom(o)||isHouse(o))?`<span>${esc(o.type)}</span>`:''}${(isCom(o)||isHouse(o))?'':(o.daysOnSite<=2?'<span>Новое</span>':(tag?`<span>${esc(tag)}</span>`:''))}</div>
      <button class="heart" data-fav="${esc(o.id)}" aria-pressed="${fav}" aria-label="${fav?'Убрать из избранного':'Добавить в избранное'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z"/></svg></button>
    </div>
    <div class="card-body">
      <div class="price">${priceLine(o)}</div>
      <div class="specs">${specs(o)}</div>
      <div class="addr">${esc(place(o))}</div>
      ${o.metro?`<span class="metro"><i class="${esc(o.metroLine||'r')}"></i>${esc(o.metro)}</span>`:region(o)?'':`<span class="metro">${esc(o.district)} район</span>`}
    </div></article>`;
}
function render(){
  const list=filtered(), cards=$('#cards');
  const none=!L.length; $('#catalogGrid').classList.toggle('no-items',none); $('#filters').hidden=none; $('.toolbar').hidden=none;
  if(none){
    cards.innerHTML=`<div class="empty"><h3>Каталог обновляется</h3><p>Новые объекты появятся здесь в ближайшее время. Расскажите, что вы ищете, — подберём варианты из нашей базы.</p><div class="obj-acts"><a class="btn btn-primary btn-sm" href="${tel(SITE.phone)}">Позвонить: ${esc(SITE.phone)}</a>${SITE.telegram?`<a class="btn btn-ghost btn-sm" href="${esc(SITE.telegram)}" target="_blank" rel="noopener">Написать в Telegram</a>`:''}</div></div>`;
    $('#moreBtn').hidden=true; return;
  }
  $('#count').innerHTML = `Найдено <b>${list.length}</b> ${plural(list.length,['объект','объекта','объектов'])}`;
  if(!list.length){
    cards.innerHTML=`<div class="empty"><h3>По этим условиям объектов нет</h3><p>${st.fav?'Вы ещё не добавили квартиры в избранное. Нажмите на сердечко на карточке, чтобы сохранить её.':'Попробуйте изменить тип недвижимости, цену или город. Или позвоните нам — подберём объект из базы, которой ещё нет на сайте.'}</p><button class="btn btn-primary btn-sm" data-reset>Сбросить фильтры</button></div>`;
    $('#moreBtn').hidden=true; $('#showAll').hidden=false; return;
  }
  cards.innerHTML=list.slice(0,st.shown).map(card).join('');
  $('#moreBtn').hidden = list.length<=st.shown;
  const active=(st.deal!=='all')+(st.cat!=='all')+!!st.city+(st.rooms.size>0)+!!(st.min||st.max)+!!(st.amin||st.amax)+!!st.q+st.metro+st.pets+st.fav+st.act;
  $('#fOpen').textContent = active?`Фильтры (${active})`:'Фильтры';
  $('#showAll').hidden=!active;
}
function renderRecent(){}
function syncUI(){
  $$('#fCat [data-cat]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.cat===st.cat));
  $('#roomsGroup').hidden=st.cat==='commercial'||st.cat==='house'; $('#fPets').closest('label').hidden=st.cat==='commercial';
  $$('#filters [data-deal]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.deal===st.deal));
  $('#fCity').value=st.city; $('#fMin').value=st.min; $('#fMax').value=st.max; $('#fAmin').value=st.amin; $('#fAmax').value=st.amax; $('#fQ').value=st.q;
  $('#fMetro').checked=st.metro; $('#fPets').checked=st.pets; $('#fFav').checked=st.fav; $('#fAct').checked=st.act; $('#sort').value=st.sort;
  $$('#fRooms .chip').forEach(c=>c.setAttribute('aria-pressed',st.rooms.has(c.dataset.r)));
  $$('#cityStrip .city').forEach(c=>c.setAttribute('aria-pressed',c.dataset.city===st.city));
}
function update(){st.shown=9;syncUI();render()}
function reset(){Object.assign(st,{act:false,cat:'all',deal:'all',city:'',rooms:new Set(),min:'',max:'',amin:'',amax:'',q:'',metro:false,pets:false,fav:false});update()}

/* ---------- favourites ---------- */
function setFavCount(){const n=favs.size,b=$('#favNum');b.textContent=n;b.hidden=!n}
function toggleFav(id){favs.has(id)?favs.delete(id):favs.add(id);store.set('nbel-favs',[...favs]);setFavCount();toast(favs.has(id)?'Добавлено в избранное':'Удалено из избранного');
  $$('[data-fav]').filter(b=>b.dataset.fav===id).forEach(b=>{b.setAttribute('aria-pressed',favs.has(id));b.setAttribute('aria-label',favs.has(id)?'Убрать из избранного':'Добавить в избранное')});
  const mf=$('#objFav');if(mf&&mf.dataset.id===id)mf.textContent=favs.has(id)?'В избранном':'В избранное';
  if(st.fav)render()}

/* ---------- modals ---------- */
let lastFocus=null;
function openModal(m){lastFocus=document.activeElement;m.hidden=false;document.documentElement.style.overflow='hidden';setTimeout(()=>$('.modal-close',m).focus(),30)}
function closeModal(m){if(m.hidden)return;m.hidden=true;if($$('.modal').every(x=>x.hidden))document.documentElement.style.overflow='';if(lastFocus&&lastFocus.focus)lastFocus.focus()}
function clearObjHash(){if(/^#obj-/.test(location.hash))history.replaceState(null,'',location.pathname+location.search)}

function openObj(id){
  const o=ALL.find(x=>x.id===id);if(!o)return; const off=isOff(o);
  const a=agentOf(o), items=galleryItems(o), fav=favs.has(o.id);
  const mp=pmt(o.priceUsd*.7,11,20);
  const com=isCom(o), hs=isHouse(o);
  const rows=hs?[['Тип сделки',o.deal==='sale'?'Продажа':'Аренда'],['Тип объекта',o.type],...(o.area?[['Общая площадь',nf.format(o.area)+' м²']]:[]),...(o.livingArea?[['Жилая площадь',nf.format(o.livingArea)+' м²']]:[]),...(o.kitchen?[['Кухня',nf.format(o.kitchen)+' м²']]:[]),...(o.rooms?[['Комнат',o.rooms]]:[]),['Этажность',o.floors],...(o.house?[['Материал стен',o.house]]:[]),...(o.year?[['Год постройки',o.year]]:[]),['Состояние',o.renovation],['Расположение',o.district]]
    :com?[['Тип сделки',o.deal==='sale'?'Продажа':'Аренда'],['Тип объекта',o.type],['Общая площадь',nf.format(o.area)+' м²'],['Помещений',o.rooms],[o.type==='Здание'?'Этажность':'Этаж',o.type==='Здание'?o.floors:`${o.floor} из ${o.floors}`],['Здание',o.house],...(o.year?[['Год постройки',o.year]]:[]),['Состояние',o.renovation],[region(o)?'Расположение':'Район',o.district]]
    :[['Тип сделки',o.deal==='sale'?'Продажа':'Долгосрочная аренда'],['Общая площадь',nf.format(o.area)+' м²'],['Кухня',o.kitchen?o.kitchen+' м²':'Кухня-гостиная'],['Этаж',`${o.floor} из ${o.floors}`],['Тип дома',o.house],...(o.year?[['Год постройки',o.year]]:[]),['Ремонт',o.renovation],['Район',o.district]];
  if((com||hs)&&o.landSotka)rows.push(['Участок',nf.format(o.landSotka)+' сот.']);
  if(o.deal==='rent'&&!com)rows.push(['Депозит',usd(o.priceUsd)],['Животные',o.pets?'Можно':'По договорённости']);
  if(o.deal==='rent'&&com)rows.push(['Ставка',usd(o.priceUsd/o.area)+' за м² в месяц']);
  const amen=o.amenities||[];
  $('#objBody').innerHTML=`<div class="obj">
    <div><div class="gal-main" id="galMain">${photoOrScene(o,0,items[0])}</div>
      <div class="thumbs">${items.map((k,i)=>`<button data-i="${i}" aria-current="${i===0}" aria-label="Фото ${i+1}">${photoOrScene(o,i,k)}</button>`).join('')}</div></div>
    <div>
      <h2 id="objTitle">${esc(roomsTitle(o))}${o.area?`, ${nf.format(o.area)} м²`:''}</h2>
      <p class="sub">${esc(place(o))}${o.metro?', метро «'+esc(o.metro)+'»':''}</p>
      <div class="price">${usd(o.priceUsd)}${o.deal==='rent'?'<small>в месяц</small>':''}</div>
      <p class="sub">${o.priceByn?nf.format(o.priceByn)+' BYN':'≈ '+byn(o.priceUsd)}${o.deal==='rent'?' в месяц':o.area?`, ${usd(o.priceUsd/o.area)} за м²`:''}</p>
      ${off?`<div class="mini-calc"><b>Объект снят с продажи.</b> Оставьте телефон — подберём похожий вариант в этом районе и бюджете.</div>`:com?`<div class="mini-calc">${o.deal==='sale'?'Продажа юридическим и физическим лицам. Условия оплаты и возможность рассрочки уточняйте у риелтора.':'Арендная ставка без учёта коммунальных платежей. Условия договора и срок аренды обсуждаются с собственником.'}</div>`:o.deal==='sale'?`<div class="mini-calc">В ипотеку от <b>${usd(mp)}</b> в месяц при взносе 30% на 20 лет. <a href="#services">Рассчитать свой вариант</a></div>`:`<div class="mini-calc">Оплата помесячно, коммунальные платежи — по счётчикам. Комиссия агентства — <b>${usd(o.priceUsd/2)}</b> один раз.</div>`}
      <div class="tbl">${rows.map(([k,v])=>`<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>
      <div class="obj-acts">${SITE.telegram?`<a class="btn btn-primary" href="${esc(SITE.telegram)}" target="_blank" rel="noopener">Написать в Telegram</a>`:''}<a class="btn ${SITE.telegram?'btn-ghost':'btn-primary'}" href="${tel(a.phone)}">${off?'Позвонить в агентство':'Позвонить риелтору'}</a><button class="btn btn-ghost" id="objFav" data-id="${esc(o.id)}">${fav?'В избранном':'В избранное'}</button><button class="btn btn-ghost" id="objShare">Поделиться</button></div>
    </div>
    <div class="obj-desc">
      <div><h3>Описание</h3><p class="mt10 muted">${(com||hs)?`${esc(o.type)}${o.area?` площадью ${nf.format(o.area)} м²`:''} в ${esc(inCity(o))}. ${esc(o.description)} ${o.year?`Год постройки — ${o.year}, с`:'С'}остояние: ${esc(String(o.renovation).toLowerCase())}.`:`${esc(roomsTitle(o))} площадью ${nf.format(o.area)} м² в ${esc(inCity(o))}. ${esc(o.description)} ${esc(o.house)} дом${o.year?` ${o.year} года`:''}, ${esc(String(o.renovation).toLowerCase())}. ${off?'':o.deal==='sale'?'Документы проверены, возможна покупка в кредит.':'Заключаем договор с регистрацией в исполкоме.'}`}</p>
        ${amen.length?`<h3 class="mt22">${(com||hs)?'Особенности':'В квартире и доме'}</h3><div class="amen">${amen.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}
        <p class="mt16 muted">Код объекта: ${esc(o.id)}</p></div>
      <div class="agent-card"><div class="top">${avatar(a)}<div><b>${esc(a.name)}</b><div class="role">${a.team===false?esc(a.phone):`${esc(a.role)}, опыт ${a.years} ${plural(a.years,['год','года','лет'])}`}</div></div></div>
        <form id="viewForm" class="stack10" novalidate>
          <label class="sr" for="vName">Имя</label><input class="inp" id="vName" placeholder="Ваше имя" autocomplete="name" maxlength="80" required>
          <label class="sr" for="vPhone">Телефон</label><input class="inp" id="vPhone" type="tel" placeholder="+375 (__) ___-__-__" autocomplete="tel" maxlength="30" required>
          <label class="check"><input type="checkbox" id="vAgree"> <span>Согласен на обработку персональных данных согласно <a href="#" data-policy="privacy">политике конфиденциальности</a></span></label>
          <p class="err" id="vErr" role="alert"></p>
          <button class="btn btn-primary" type="submit">${off?'Подобрать похожий объект':'Записаться на просмотр'}</button>
        </form></div>
    </div></div>`;
  $$('.thumbs button',$('#objBody')).forEach(b=>b.onclick=()=>{const i=+b.dataset.i;$('#galMain').innerHTML=photoOrScene(o,i,items[i]);$$('.thumbs button').forEach(x=>x.setAttribute('aria-current',x===b))});
  $('#objFav').onclick=()=>toggleFav(o.id);
  $('#objShare').onclick=async()=>{const url=location.origin+location.pathname+'#obj-'+o.id;try{if(navigator.share){await navigator.share({title:roomsTitle(o),url})}else{await navigator.clipboard.writeText(url);toast('Ссылка скопирована')}}catch(e){}};
  const key=uuid();
  $('#viewForm').onsubmit=async e=>{e.preventDefault();const f=e.target,btn=$('button[type=submit]',f),err=$('#vErr');
    const name=$('#vName').value.trim(),phone=$('#vPhone').value.trim();
    if(!name){err.textContent='Укажите имя.';return} if(phone.replace(/\D/g,'').length<9){err.textContent='Укажите телефон, например +375 29 123-45-67.';return}
    if(!$('#vAgree').checked){err.textContent='Отметьте согласие на обработку персональных данных.';return}
    err.textContent='';btn.disabled=true;
    try{const r=await sendLead({kind:'viewing',listingId:o.id,name,phone,consent:true,requestKey:key});
      f.outerHTML=off?`<p class="note-ok">Заявка принята, номер ${esc(r.id)}. Мы перезвоним и предложим похожие объекты.</p>`:`<p class="note-ok">Вы записаны на просмотр, номер заявки ${esc(r.id)}. ${a.team===false?'Мы перезвоним':esc(a.name.split(' ')[0])+' перезвонит'}, чтобы согласовать время.</p>`}
    catch(ex){err.textContent=`${ex.message} ${callUs()}`;btn.disabled=false}};
  const m=$('#objModal');if(m.hidden)openModal(m);else $('.modal-panel',m).scrollTop=0;
}
function route(){const m=/^#obj-([A-Za-z0-9-]+)$/.exec(location.hash);if(m)openObj(m[1]);else closeModal($('#objModal'))}

/* ---------- policies ---------- */
function policies(){
  const who=`агентство недвижимости ${esc(SITE.legalName)} (УНП ${esc(SITE.unp)}, ${esc(SITE.address)})`, mail=SITE.email?esc(SITE.email):'', tg=SITE.telegram?`<a href="${esc(SITE.telegram)}" target="_blank" rel="noopener">${esc(SITE.telegram.replace('https://',''))}</a>`:'';
  return {
 privacy:`<h2 id="polTitle">Политика конфиденциальности</h2>
 <p>Политика описывает, как ${who} (далее — агентство, оператор) обрабатывает персональные данные посетителей сайта. Политика разработана в соответствии с Законом Республики Беларусь от 7 мая 2021 г. № 99-З «О защите персональных данных».</p>
 <h3>1. Какие данные мы обрабатываем</h3>
 <p>Только данные, которые вы сами указываете в формах сайта: имя, номер телефона, город, тип объекта и комментарий (в заявке собственника), а также код объекта, на просмотр или подбор похожего варианта которого вы оставили заявку. Мы не собираем паспортные данные, не используем счётчики посещаемости и рекламные системы и не создаём профили посетителей.</p>
 <p>IP-адрес используется сервером только в момент отправки заявки для защиты от массовых рассылок и не сохраняется вместе с заявкой.</p>
 <h3>2. Цели и основание обработки</h3>
 <p>Данные обрабатываются, чтобы связаться с вами по вашей заявке, организовать просмотр, подобрать объект и подготовить договор на оказание риэлтерских услуг. Основание — ваше согласие, которое вы даёте, отмечая соответствующее поле в форме. Без согласия заявку отправить нельзя; вы можете связаться с нами напрямую в Telegram или по телефону.</p>
 <h3>3. Кто получает доступ к данным</h3>
 <p>Доступ к заявкам имеют только уполномоченные сотрудники агентства. Для работы сайта и уведомлений используются:</p>
 <ul><li>хостинг-провайдер Railway Corporation (США) — хранение базы заявок и её резервных копий на сервере;</li><li>мессенджер Telegram — уведомление сотрудника агентства о новой заявке.</li></ul>
 <p>Отмечая согласие в форме, вы соглашаетесь на трансграничную передачу указанных данных этим поставщикам. Мы не продаём и не передаём данные третьим лицам для рекламы.</p>
 <h3>4. Сколько мы храним данные</h3>
 <p>Заявки хранятся не дольше одного года с момента последнего обращения, если более длительный срок не требуется для исполнения заключённого с вами договора или по законодательству. Резервные копии базы обновляются ежедневно и перезаписываются в течение 14 дней. После истечения срока данные удаляются.</p>
 <h3>5. Ваши права</h3>
 <p>Вы вправе в любой момент: отозвать согласие; получить информацию о своих данных и порядке их обработки; потребовать изменить, прекратить обработку или удалить свои данные; получить сведения о передаче данных третьим лицам. Мы ответим в течение 15 дней.</p>
 <p>Для этого напишите нам в Telegram ${tg}, позвоните по телефону ${esc(SITE.phone)}${mail?` или напишите на ${mail}`:''}, либо направьте письменное заявление по адресу: ${esc(SITE.address)}.</p>
 <p>Если вы считаете, что ваши права нарушены, вы можете обратиться в Национальный центр защиты персональных данных Республики Беларусь (cpd.by).</p>
 <h3>6. Защита данных</h3>
 <p>Сайт работает по защищённому протоколу HTTPS. Доступ к списку заявок защищён ключом доступа, база данных и резервные копии не публикуются в интернете.</p>
 <p class="muted">Редакция от ${new Date().getFullYear()} года.</p>`,
 terms:`<h2 id="polTitle">Пользовательское соглашение</h2><p>Информация на сайте носит справочный характер и не является публичной офертой. Цена, наличие и характеристики объекта подтверждаются риелтором перед сделкой.</p><p>Цены указаны в долларах США для удобства сравнения; расчёты по сделкам производятся в белорусских рублях в соответствии с законодательством Республики Беларусь.</p><h3>Сведения об исполнителе</h3><p>Риэлтерские услуги оказывает ${esc(SITE.legalName)}, УНП ${esc(SITE.unp)}. Лицензия ${esc(SITE.license)}. Страховое свидетельство ${esc(SITE.insurance)}.</p><h3>Авторские права</h3><p>Все материалы сайта — тексты, фотографии, иллюстрации, дизайн и логотип — принадлежат ${esc(SITE.legalName)} или используются с разрешения правообладателей. Копирование, переработка и распространение материалов без письменного разрешения запрещены. Шрифты Unbounded и Golos Text распространяются по лицензии SIL Open Font License 1.1.</p>`,
 cookies:`<h2 id="polTitle">Использование cookie</h2><p>Сайт сохраняет в браузере только служебные данные: список избранных квартир, выбранную тему оформления и отметку о том, что вы ознакомились с этим уведомлением. Эти данные не передаются на сервер и не используются для рекламы.</p><p>Сторонние счётчики посещаемости и рекламные сервисы не подключены. Шрифты загружаются с нашего сервера, а не со сторонних сайтов. Ссылки на Telegram открывают внешний сервис только по вашему нажатию. Если вы открываете сайт внутри Telegram (как мини-приложение), дополнительно загружается официальная библиотека Telegram Web App, которая работает по правилам Telegram.</p><p>Очистить сохранённые данные можно в настройках браузера.</p>`
  };
}

/* ---------- init ---------- */
function bind(){
  CITIES.forEach(c=>{['#hCity','#fCity','#oCity'].forEach(s=>{const o=document.createElement('option');o.value=c;o.textContent=c;$(s).appendChild(o)})});
  const usedCities=CITIES.filter(c=>L.some(o=>o.city===c));
  $('#cityStrip').closest('.cities').hidden=!usedCities.length;
  $('#cityStrip').innerHTML = `<button class="city" data-city="" aria-pressed="true">Все города <span>${L.length}</span></button>` + usedCities.map(c=>`<button class="city" data-city="${c}" aria-pressed="false">${c} <span>${L.filter(o=>o.city===c).length}</span></button>`).join('');
  $('#heroNote').hidden=!L.length;
  {const act=L.filter(o=>!isOff(o)),off=L.length-act.length,parts=[act.length?`<strong>${act.length}</strong> ${act.length===1?'актуальный':'актуальных'}`:'',off?`<strong>${off}</strong> ${plural(off,['снят','снято','снято'])} с продажи`:''].filter(Boolean).join(', ');$('#heroNote').innerHTML=`На сайте <strong>${L.length}</strong> ${plural(L.length,['объект','объекта','объектов'])}: ${parts}.`;}

  $$('#filters [data-deal]').forEach(b=>b.onclick=()=>{st.deal=b.dataset.deal;update()});
  $$('#fCat [data-cat]').forEach(b=>b.onclick=()=>{st.cat=b.dataset.cat;if(st.cat!=='apartment'&&st.cat!=='all'){st.rooms=new Set()}if(st.cat==='commercial')st.pets=false;update()});
  $('#fCity').onchange=e=>{st.city=e.target.value;update()};
  $$('#fRooms .chip').forEach(c=>c.onclick=()=>{const r=c.dataset.r;st.rooms.has(r)?st.rooms.delete(r):st.rooms.add(r);update()});
  [['#fMin','min'],['#fMax','max'],['#fAmin','amin'],['#fAmax','amax'],['#fQ','q']].forEach(([s,k])=>$(s).addEventListener('input',e=>{st[k]=e.target.value;st.shown=9;render()}));
  [['#fMetro','metro'],['#fPets','pets'],['#fFav','fav'],['#fAct','act']].forEach(([s,k])=>$(s).onchange=e=>{st[k]=e.target.checked;update()});
  $('#sort').onchange=e=>{st.sort=e.target.value;update()};
  $('#fReset').onclick=reset;
  $('#showAll').onclick=()=>{reset();$('#catalog').scrollIntoView()};
  $('#moreBtn').onclick=()=>{st.shown+=9;render()};
  $('#cityStrip').onclick=e=>{const b=e.target.closest('.city');if(!b)return;st.city=b.dataset.city;update();$('#catalog').scrollIntoView()};

  const openF=()=>{$('#filters').classList.add('open');$('#scrim').classList.add('on')};
  const closeF=()=>{$('#filters').classList.remove('open');$('#scrim').classList.remove('on')};
  $('#fOpen').onclick=openF; $('#fclose').onclick=closeF; $('#fApply').onclick=closeF; $('#scrim').onclick=closeF;

  let hdeal='sale';
  $$('[data-hdeal]').forEach(b=>b.onclick=()=>{hdeal=b.dataset.hdeal;$$('[data-hdeal]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#hMax').placeholder=hdeal==='rent'?'Например, 600':'Любая'});
  $('#heroSearch').onsubmit=e=>{e.preventDefault();
    const hr=$('#hRooms').value;st.deal=hdeal;st.city=$('#hCity').value;st.cat=hr==='com'?'commercial':hr==='house'?'house':hr?'apartment':'all';st.rooms=new Set(hr&&hr!=='com'&&hr!=='house'?[hr]:[]);st.max=$('#hMax').value;st.min='';st.q=$('#hQ').value;st.fav=false;
    update();$('#catalog').scrollIntoView()};

  const burger=$('#burger');
  const closeMenu=()=>{$('#mnav').classList.remove('open');burger.setAttribute('aria-expanded','false')};
  burger.onclick=()=>{$('#mnav').classList.add('open');burger.setAttribute('aria-expanded','true');$('#mclose').focus()};
  $('#mclose').onclick=closeMenu; $$('#mnav a').forEach(a=>a.addEventListener('click',closeMenu));
  $$('a[data-deal]').forEach(a=>a.addEventListener('click',()=>{st.deal=a.dataset.deal;st.cat='all';update();closeMenu()}));
  $$('a[data-cat]').forEach(a=>a.addEventListener('click',()=>{st.cat=a.dataset.cat;st.deal='all';st.rooms=new Set();st.pets=false;update();closeMenu()}));

  $('#favBtn').onclick=()=>{st.fav=true;update();$('#catalog').scrollIntoView();if(!favs.size)toast('В избранном пока пусто')};
  $('#cards').addEventListener('click',e=>{
    if(e.target.closest('[data-reset]'))return reset();
    const h=e.target.closest('[data-fav]');if(h){e.stopPropagation();return toggleFav(h.dataset.fav)}
    const c=e.target.closest('.card');if(c)location.hash='obj-'+c.dataset.id});
  $('#cards').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('card')){e.preventDefault();location.hash='obj-'+e.target.dataset.id}});

  $$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target.closest('[data-close]')){if(m.id==='objModal')clearObjHash();closeModal(m)}}));
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const p=$('#polModal'),o=$('#objModal');if(!p.hidden)closeModal(p);else if(!o.hidden){clearObjHash();closeModal(o)}else{closeF();closeMenu()}});
  addEventListener('hashchange',route);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-policy]');if(!b)return;e.preventDefault();$('#polBody').innerHTML=policies()[b.dataset.policy];openModal($('#polModal'))});

  let odeal='sale'; const okey=uuid();
  $$('[data-odeal]').forEach(b=>b.onclick=()=>{odeal=b.dataset.odeal;$$('[data-odeal]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
  $('#ownerForm').onsubmit=async e=>{e.preventDefault();const f=e.target,err=$('#ownerErr'),btn=$('#ownerSubmit');
    if(!f.name.value.trim())return err.textContent='Укажите ваше имя.';
    if(f.phone.value.replace(/\D/g,'').length<9)return err.textContent='Укажите телефон, например +375 29 123-45-67.';
    if(!f.agree.checked)return err.textContent='Отметьте согласие на обработку персональных данных.';
    err.textContent='';btn.disabled=true;
    try{const r=await sendLead({kind:'owner',deal:odeal,name:f.name.value.trim(),phone:f.phone.value.trim(),city:f.city.value,rooms:f.rooms.value,message:f.msg.value.trim(),consent:true,requestKey:okey});
      $('#ownerId').textContent=r.id;f.classList.add('sent');toast('Заявка отправлена')}
    catch(ex){err.textContent=`${ex.message} ${callUs()}`;btn.disabled=false}};

  function calc(){const P=+$('#cPrice').value,d=+$('#cDown').value,y=+$('#cYears').value,r=+$('#cRate').value,loan=P*(1-d/100),m=pmt(loan,r,y);
    $('#cPriceV').textContent=usd(P);$('#cDownV').textContent=`${d}%, ${usd(P*d/100)}`;$('#cYearsV').textContent=y+' '+plural(y,['год','года','лет']);$('#cRateV').textContent=r.toFixed(1).replace('.',',')+'%';
    $('#cPay').textContent=usd(m);$('#cLoan').textContent=usd(loan);$('#cOver').textContent=usd(m*y*12-loan)}
  $$('.calc input').forEach(i=>i.addEventListener('input',calc)); calc();

  const team=AGENTS.filter(a=>a.team!==false); $('#agents').hidden=!team.length; $$('[data-team-link]').forEach(l=>{(l.closest('li')||l).hidden=!team.length});
  $('#agentList').innerHTML=team.map(a=>{const n=L.filter(o=>o.agent===a.id).length;return `<article class="agent">${avatar(a)}<div><h3>${esc(a.name)}</h3><p class="role">${esc(a.role)}</p><div class="meta"><span><b>${a.years}</b> ${plural(a.years,['год','года','лет'])} опыта</span><span><b>${a.deals}</b> сделок</span><span><b>${n}</b> в каталоге</span></div><div class="acts"><a class="btn btn-primary btn-sm" href="${tel(a.phone)}">${esc(a.phone)}</a></div></div></article>`}).join('');

  const root=document.documentElement;
  $('#themeBtn').onclick=()=>{const dark=root.dataset.theme==='dark';root.dataset.theme=dark?'light':'dark';store.set('nbel-theme',root.dataset.theme)};
  if(!store.get('nbel-cookie',false))$('#cookie').hidden=false;
  $('#cookieOk').onclick=()=>{store.set('nbel-cookie',true);$('#cookie').hidden=true};
}

/* ---------- Telegram Mini App ---------- */
function telegramMiniApp(){
  if(!/tgWebApp(Data|Version|Platform)/.test(location.hash+location.search))return;
  const sc=document.createElement('script');sc.src='https://telegram.org/js/telegram-web-app.js';
  sc.onload=()=>{try{const tg=window.Telegram&&Telegram.WebApp;if(!tg)return;tg.ready();tg.expand();if(tg.setHeaderColor)tg.setHeaderColor('#F9F5EC');if(tg.setBackgroundColor)tg.setBackgroundColor('#F9F5EC');document.documentElement.classList.add('in-telegram')}catch(e){}
    try{if(/tgWebApp/.test(location.hash))history.replaceState(null,'',location.pathname+location.search)}catch(e){}};
  document.head.appendChild(sc);
}
async function init(){
  telegramMiniApp();
  skyline(); let loaded=false;
  try{
    let d=window.__NBEL_DATA__;
    if(!d){const res=await fetch('/data.json',{cache:'no-cache'});if(!res.ok)throw new Error();d=await res.json();}SITE=d.site||{};AGENTS=d.agents||[];
    ALL=(d.listings||[]).map(o=>Object.assign({},o,{n:parseInt(String(o.id).replace(/\D/g,''),10)||1}));L=ALL;
    if(Number(SITE.bynPerUsd)>0)RATE=Number(SITE.bynPerUsd); loaded=true;
  }catch(e){
    $('#cards').innerHTML='<div class="empty"><h3>Каталог не загрузился</h3><p>Обновите страницу. Если ошибка повторится, позвоните нам — подберём квартиру по телефону.</p></div>';
  }
  applySite(); bind(); setFavCount(); if(loaded){update(); renderRecent(); route();}
}
init();
})();
