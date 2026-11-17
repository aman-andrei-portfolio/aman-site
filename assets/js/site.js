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
  var h=document.documentElement,VIEWS=['acasa','despre','preturi','intrebari','contact','cont'];
  var ALIAS={servicii:'acasa',top:'acasa','':'acasa'};
  var blocks=document.querySelectorAll('[data-view]'),links=document.querySelectorAll('.tl,.tabbar a');
  function show(first){
    var id=(location.hash||'').slice(1);id=ALIAS[id]!==undefined?ALIAS[id]:id;
    if(VIEWS.indexOf(id)<0)id='acasa';
    blocks.forEach(function(b){b.classList.toggle('on',b.dataset.view===id)});
    links.forEach(function(a){a.classList.toggle('cur',a.getAttribute('href')==='#'+id);if(a.getAttribute('href')==='#'+id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
    if(!first)window.scrollTo(0,0);
  }
  h.classList.add('views');show(true);
  addEventListener('hashchange',function(){show(false)});
  if(location.hash){requestAnimationFrame(function(){window.scrollTo(0,0)})}

  /* Servicii / Pachete */
  var tabs=document.querySelectorAll('.seg button'),panes=document.querySelectorAll('[data-pane]');
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
