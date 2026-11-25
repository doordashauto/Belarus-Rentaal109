(function(){
"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KIND={viewing:'Просмотр',owner:'Собственник'};
const DELIVERY={sent:['Отправлено','ok'],pending:['В очереди',''],failed:['Ошибка, повтор',''],not_configured:['Telegram не настроен','']};
const fmt=new Intl.DateTimeFormat('ru-RU',{dateStyle:'short',timeStyle:'short'});
let leads=[];
try{$('#token').value=sessionStorage.getItem('nbel-admin')||''}catch(e){}
const details=l=>l.kind==='viewing'&&l.listing?`${esc(l.listing.id)}, ${esc(l.listing.city)}, ${esc(l.listing.address)}<br><span class="muted">риелтор: ${esc(l.listing.agent)}</span>`
  :`${l.deal==='rent'?'Сдать':'Продать'}${l.city?', '+esc(l.city):''}${l.rooms?', комнат: '+esc(l.rooms):''}${l.message?`<br><span class="muted">${esc(l.message)}</span>`:''}`;
function draw(){
  const k=$('#kind').value, list=leads.filter(l=>!k||l.kind===k);
  $('#count').textContent=`Показано заявок: ${list.length}`;
  $('#rows').innerHTML=list.length?list.map(l=>{const d=DELIVERY[l.delivery]||[l.delivery,''];return `<tr><td class="nowrap">${esc(fmt.format(new Date(l.createdAt)))}</td><td class="nowrap">${esc(l.id)}</td><td>${KIND[l.kind]||esc(l.kind)}</td><td>${esc(l.name)}</td><td class="nowrap"><a href="tel:${esc(String(l.phone).replace(/[^\d+]/g,''))}">${esc(l.phone)}</a></td><td>${details(l)}</td><td><span class="pill ${d[1]}">${d[0]}</span></td></tr>`}).join('')
    :'<tr><td colspan="7" class="muted">Заявок пока нет.</td></tr>';
}
$('#authForm').onsubmit=async e=>{e.preventDefault();const t=$('#token').value.trim();$('#msg').textContent='';
  try{const r=await fetch('/api/admin/leads?limit=1000',{headers:{Authorization:'Bearer '+t}});const b=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(b.error||'Не удалось загрузить заявки.');
    try{sessionStorage.setItem('nbel-admin',t)}catch(e){}
    leads=b.leads||[];$('#csvBtn').disabled=false;draw();
  }catch(ex){$('#msg').textContent=ex.message}};
$('#kind').onchange=draw;
$('#logout').onclick=()=>{try{sessionStorage.removeItem('nbel-admin')}catch(e){};$('#token').value='';leads=[];$('#csvBtn').disabled=true;$('#rows').innerHTML='<tr><td colspan="7" class="muted">Введите ключ доступа, чтобы увидеть заявки.</td></tr>';$('#count').textContent=''};
$('#csvBtn').onclick=()=>{
  const cell=v=>{const s=v==null?'':String(v);return /[";\n]/.test(s)||/^[=+\-@]/.test(s)?'"'+s.replace(/^([=+\-@])/,"'$1").replace(/"/g,'""')+'"':s};
  const head=['Дата','Номер','Тип','Имя','Телефон','Детали','Уведомление'];
  const lines=[head.join(';')].concat(leads.map(l=>[l.createdAt,l.id,KIND[l.kind]||l.kind,l.name,l.phone,l.kind==='viewing'&&l.listing?`${l.listing.id} ${l.listing.city}, ${l.listing.address}`:`${l.deal==='rent'?'Сдать':'Продать'} ${l.city||''} ${l.rooms||''} ${l.message||''}`.trim(),l.delivery].map(cell).join(';')));
  const url=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`nbel-leads-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
})();
