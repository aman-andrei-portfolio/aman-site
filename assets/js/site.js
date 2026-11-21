/* Limba RO/EN, paginile (#acasa, #despre…), comutatorul Servicii/Pachete, caruselul și animațiile la scroll. */
(function(){
  var btn=document.getElementById('lang'),nodes=document.querySelectorAll('[data-en]'),lang='ro';
  nodes.forEach(function(n){n.dataset.ro=n.innerHTML});
  function set(l){
    lang=l;
    nodes.forEach(function(n){n.innerHTML=l==='en'?n.dataset.en:n.dataset.ro});
    document.documentElement.lang=l;
    btn.textContent=l==='en'?'RO':'EN';
    btn.setAttribute('aria-label',l==='en'?'Schimbă în română':'Switch to English');
    try{localStorage.setItem('lang',l)}catch(e){}
    document.dispatchEvent(new CustomEvent('langchange'));
  }
  btn.addEventListener('click',function(){set(lang==='ro'?'en':'ro')});
  try{if(localStorage.getItem('lang')==='en')set('en')}catch(e){}
  document.getElementById('yr').textContent=new Date().getFullYear();

  /* pagini */
  var h=document.documentElement,VIEWS=['acasa','despre','preturi','contact','cont'];
  // întrebările stau acum jos pe Acasă: linkurile vechi #intrebari duc acolo
  var ALIAS={servicii:'acasa',top:'acasa','':'acasa',intrebari:'acasa'};
  var blocks=document.querySelectorAll('[data-view]'),links=document.querySelectorAll('.tl,.tabbar a');
  function show(first){
    var id=(location.hash||'').slice(1);id=ALIAS[id]!==undefined?ALIAS[id]:id;
    if(VIEWS.indexOf(id)<0)id='acasa';
    blocks.forEach(function(b){b.classList.toggle('on',b.dataset.view===id)});
    links.forEach(function(a){a.classList.toggle('cur',a.getAttribute('href')==='#'+id);if(a.getAttribute('href')==='#'+id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
    var raw=(location.hash||'').slice(1);
    if(raw==='intrebari'){var f=document.getElementById('s-intrebari');if(f)requestAnimationFrame(function(){f.scrollIntoView({block:'start'})});return}
    if(!first)window.scrollTo(0,0);
  }
  h.classList.add('views');show(true);
  addEventListener('hashchange',function(){show(false)});
  if(location.hash&&location.hash!=='#intrebari'){requestAnimationFrame(function(){window.scrollTo(0,0)})}

  /* Servicii / Pachete */
  var tabs=document.querySelectorAll('.seg button[data-tab]'),panes=document.querySelectorAll('[data-pane]');
  function tab(name){
    tabs.forEach(function(t){t.setAttribute('aria-selected',t.dataset.tab===name?'true':'false')});
    panes.forEach(function(p){p.classList.toggle('on',p.dataset.pane===name)});
  }
  h.classList.add('tabs');tab('servicii');
  tabs.forEach(function(t){t.addEventListener('click',function(){tab(t.dataset.tab)})});

  /* puncte pentru carusel */
  var rail=document.getElementById('rail'),dots=document.getElementById('dots');
  if(rail&&dots){
    var items=rail.querySelectorAll('.pack,.subscr');
    items.forEach(function(){dots.appendChild(document.createElement('i'))});
    var ds=dots.children;
    function upd(){
      var best=0,min=1e9,x=rail.getBoundingClientRect().left;
      items.forEach(function(it,i){var d=Math.abs(it.getBoundingClientRect().left-x-22);if(d<min){min=d;best=i}});
      for(var i=0;i<ds.length;i++)ds[i].classList.toggle('on',i===best);
    }
    rail.addEventListener('scroll',function(){requestAnimationFrame(upd)},{passive:true});
    upd();
  }

  if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    var els=document.querySelectorAll('.rv');
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'});
    document.documentElement.classList.add('rv-on');
    els.forEach(function(el){io.observe(el)});
  }
})();

/* Butonul „Copiază adresa” din Contact */
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-copy]');if(!b)return;
  var v=b.getAttribute('data-copy'),old=b.innerHTML,en=document.documentElement.lang==='en';
  function ok(){b.textContent=en?'Copied ✓':'Copiat ✓';setTimeout(function(){b.innerHTML=old},1800)}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(v).then(ok,function(){})}
});

/* Acasă: „De ce ai nevoie?”. Butoanele din plăci aleg categoria și duc la ea. */
(function(){
  var panes=document.querySelectorAll('[data-pane-need]');if(!panes.length)return;
  function pick(k){
    document.querySelectorAll('.need-seg [data-need]').forEach(function(b){b.setAttribute('aria-selected',String(b.dataset.need===k))});
    panes.forEach(function(p){p.hidden=p.dataset.paneNeed!==k});
  }
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-need]');if(!b)return;
    pick(b.dataset.need);
    if(b.hasAttribute('data-go')){var n=document.getElementById('nevoie');if(n)n.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
  });
})();

/* Disponibilitate: câte locuri libere am pe săptămână (setate din panou). Fără date, nu apare nimic. */
(function(){
  var line=document.getElementById('avLine'),cal=document.getElementById('avCal');if(!line&&!cal)return;
  var data=null,M={ro:['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','nov','dec'],en:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']};
  function en(){return document.documentElement.lang==='en'}
  function wk(iso){var a=new Date(iso+'T00:00:00Z'),b=new Date(a.getTime()+6*864e5),m=M[en()?'en':'ro'];return a.getUTCDate()+(a.getUTCMonth()!==b.getUTCMonth()?' '+m[a.getUTCMonth()]:'')+'–'+b.getUTCDate()+' '+m[b.getUTCMonth()]}
  function n(v){return en()?(v===1?'1 spot':v+' spots'):(v===1?'1 loc':v+' locuri')}
  function render(){
    if(!data||!data.weeks.length){if(line)line.hidden=true;if(cal)cal.hidden=true;return}
    var now=data.range[0],cur=data.weeks.filter(function(w){return w.week_start===now})[0],next=data.weeks.filter(function(w){return w.slots>0&&w.week_start!==now})[0];
    if(line){
      if(cur&&cur.slots>0){line.className='av-line';line.innerHTML=(en()?'Free spots this week: ':'Locuri libere săptămâna asta: ')+'<b>'+cur.slots+'</b>';line.hidden=false}
      else if(cur&&next){line.className='av-line full';line.innerHTML=(en()?'This week is full · next free spot: ':'Săptămâna asta e plină · următorul loc liber: ')+'<b>'+wk(next.week_start)+'</b>';line.hidden=false}
      else line.hidden=true;
    }
    if(cal){
      document.getElementById('avWeeks').innerHTML=data.weeks.map(function(w){return '<li class="'+(w.slots?'':'full ')+(w.week_start===now?'now':'')+'"><span>'+(w.week_start===now?(en()?'This week':'Săptămâna asta'):wk(w.week_start))+'</span><b>'+(w.slots?n(w.slots):(en()?'Full':'Complet'))+'</b></li>'}).join('');
      cal.hidden=false;
    }
  }
  fetch('/api/availability').then(function(r){return r.ok?r.json():null}).then(function(j){data=j;render()}).catch(function(){});
  document.addEventListener('langchange',render);
})();
