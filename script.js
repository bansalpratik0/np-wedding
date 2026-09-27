(() => {
  const C = window.WEDDING_CONTENT;
  const $ = (q,p=document)=>p.querySelector(q);
  const $$ = (q,p=document)=>[...p.querySelectorAll(q)];
  const storage={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};

  const menu=$(".menu-toggle"),nav=$("#nav");
  menu?.addEventListener("click",()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open));});
  $$("#nav a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");menu?.setAttribute("aria-expanded","false")}));

  const target=new Date(C.weddingDate).getTime();
  function tick(){let d=Math.max(0,target-Date.now());const days=Math.floor(d/86400000);d-=days*86400000;const h=Math.floor(d/3600000);d-=h*3600000;const m=Math.floor(d/60000);$("#days").textContent=String(days).padStart(3,"0");$("#hours").textContent=String(h).padStart(2,"0");$("#minutes").textContent=String(m).padStart(2,"0");}
  tick();setInterval(tick,30000);

  const eventList=$("#event-list");
  C.events.forEach(e=>{
    const card=document.createElement("article");card.className="event-card reveal";card.style.setProperty("--accent",e.accent);
    card.innerHTML=`<div class="event-index"><strong>${e.number}</strong>${e.date}</div><div class="event-main"><h3>${e.name}</h3><p>${e.description}</p></div><div class="event-meta"><strong>${e.time}</strong><span>${e.venue}</span><div class="mini-palette">${e.palette.map(c=>`<i style="background:${c}"></i>`).join("")}</div></div>`;
    eventList.appendChild(card);
  });

  const paletteGrid=$("#palette-grid");
  C.palettes.forEach(p=>{
    const c=document.createElement("article");c.className="palette-card reveal";
    c.style.setProperty("--c1",p.colors[0][1]);c.style.setProperty("--c2",p.colors[Math.floor(p.colors.length/2)][1]);c.style.setProperty("--c3",p.colors[p.colors.length-1][1]);
    c.innerHTML=`<span class="mood">${p.mood}</span><h3>${p.title}</h3><p>${p.description}</p><div class="swatches">${p.colors.map(([n,v])=>`<div class="swatch" style="background:${v}">${n}</div>`).join("")}</div><p class="palette-note">${p.note}</p>`;
    paletteGrid.appendChild(c);
  });

  const tabs=$("#travel-tabs"),panel=$("#travel-panel");
  const labels={india:"From India",usa:"From USA",nigeria:"From Nigeria",elsewhere:"Elsewhere",stay:"Accommodation"};
  function renderTravel(k){
    const x=C.travel[k];$$(".travel-tab").forEach(b=>b.classList.toggle("active",b.dataset.key===k));
    panel.innerHTML=`<span class="eyebrow">Wedding concierge</span><h3>${x.label}</h3><p class="lead">${x.intro}</p><div class="travel-points">${x.points.map(([a,b])=>`<div class="travel-point"><strong>${a}</strong><span>${b}</span></div>`).join("")}</div>`;
    if(k!=="stay") storage.set("np-origin",k);
  }
  Object.keys(labels).forEach(k=>{const b=document.createElement("button");b.type="button";b.className="travel-tab";b.dataset.key=k;b.textContent=labels[k];b.addEventListener("click",()=>renderTravel(k));tabs.appendChild(b)});
  renderTravel(storage.get("np-origin")||"india");

  const faqList=$("#faq-list"),faqSearch=$("#faq-search");
  function renderFaqs(){
    const q=faqSearch.value.trim().toLowerCase();faqList.innerHTML="";
    C.faqs.filter(x=>!q||`${x[0]} ${x[1]}`.toLowerCase().includes(q)).forEach(([qst,ans])=>{
      const x=document.createElement("article");x.className="faq-item reveal visible";
      x.innerHTML=`<button class="faq-q" type="button" aria-expanded="false"><b>${qst}</b><span class="faq-plus">+</span></button><div class="faq-a" hidden>${ans}</div>`;
      const b=$(".faq-q",x),a=$(".faq-a",x);b.addEventListener("click",()=>{const open=a.hidden;a.hidden=!open;b.setAttribute("aria-expanded",String(open));$(".faq-plus",x).textContent=open?"−":"+"});faqList.appendChild(x);
    });
  }
  faqSearch.addEventListener("input",renderFaqs);renderFaqs();

  const attendance=$("#attendance-options");
  C.events.forEach((e,i)=>attendance.insertAdjacentHTML("beforeend",`<label class="attendance-row"><span><strong>${e.name}</strong><small>${e.date} / ${e.time}</small></span><select name="event_${i}"><option value="yes">Attending</option><option value="no">Not attending</option><option value="unsure">Not sure</option></select></label>`));

  const form=$("#rsvp-form"),steps=$$(".form-step",form);let idx=0;
  const show=i=>{idx=Math.max(0,Math.min(i,steps.length-1));steps.forEach((s,n)=>s.hidden=n!==idx)};
  $$(".next",form).forEach(b=>b.addEventListener("click",()=>{const req=$$("input[required]",steps[idx]);if(req.some(x=>!x.reportValidity()))return;show(idx+1)}));
  $$(".back",form).forEach(b=>b.addEventListener("click",()=>show(idx-1)));
  form.addEventListener("submit",e=>{e.preventDefault();storage.set("np-rsvp",JSON.stringify(Object.fromEntries(new FormData(form).entries())));steps.forEach(s=>s.hidden=true);$("#rsvp-success").hidden=false});
  $("#edit-rsvp").addEventListener("click",()=>{$("#rsvp-success").hidden=true;show(0)});

  const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");obs.unobserve(e.target)}}),{threshold:.1});
  $$(".reveal").forEach(x=>obs.observe(x));
})();