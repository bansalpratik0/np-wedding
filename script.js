(() => {
  const C = window.WEDDING_CONTENT;
  const $ = (q,p=document)=>p.querySelector(q);
  const $$ = (q,p=document)=>[...p.querySelectorAll(q)];
  const storage={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};


  const menu=$(".menu-toggle"),nav=$("#nav");
  menu?.addEventListener("click",()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open));});
  $$("#nav a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");menu?.setAttribute("aria-expanded","false")}));

  const target=new Date(C.weddingDate).getTime();
  function tick(){
    let d=Math.max(0,target-Date.now());
    const days=Math.floor(d/86400000);d-=days*86400000;
    const h=Math.floor(d/3600000);d-=h*3600000;
    const m=Math.floor(d/60000);d-=m*60000;
    const s=Math.floor(d/1000);
    $("#days").textContent=String(days).padStart(3,"0");
    $("#hours").textContent=String(h).padStart(2,"0");
    $("#minutes").textContent=String(m).padStart(2,"0");
    $("#seconds").textContent=String(s).padStart(2,"0");
  }
  tick();setInterval(tick,1000);

  const eventList=$("#event-list");
  C.events.forEach(e=>{
    const card=document.createElement("article");
    card.className="event-card reveal"+(e.side?" event-card-sided":"");
    const venue = e.venue ? `<span>${e.venue}</span>` : "";
    const side = e.side ? `<span class="event-side">${e.side}</span>` : "";
    card.innerHTML=`<div class="event-index"><strong>${e.number}</strong>${e.date}</div><div class="event-main">${side}<h3>${e.name}</h3><p>${e.description}</p></div><div class="event-meta"><strong>${e.time}</strong>${venue}</div>`;
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
  const labels={india:"From India",usa:"From USA",nigeria:"From Nigeria",elsewhere:"Elsewhere",stay:"Your Stay"};
  const esc=s=>String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const checklistKey="np-india-checklist-v1";
  let completedChecklist=new Set();
  try { const stored=JSON.parse(storage.get(checklistKey)||"[]"); if(Array.isArray(stored)) completedChecklist=new Set(stored.filter(x=>typeof x==="string")); } catch {}
  function renderChecklist(){
    const items=C.firstTimeChecklist.flatMap((group,gi)=>group.items.map((item,ii)=>({id:gi+"-"+ii,item})));
    const checked=items.filter(x=>completedChecklist.has(x.id)).length;
    return `<details class="first-time-checklist"><summary><span class="checklist-symbol" aria-hidden="true">✦</span><span><strong>First-Time India Checklist</strong><small>A practical, optional prep guide · ${checked} of ${items.length} complete</small></span><span class="checklist-chevron" aria-hidden="true">⌄</span></summary>
      <div class="checklist-body"><p>Tick items off as you prepare. Your selections are saved on this device.</p>
      <div class="checklist-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${checked}" aria-label="Travel preparation completed"><span style="width:${checked/items.length*100}%"></span></div>
      ${C.firstTimeChecklist.map((group,gi)=>`<div class="checklist-group"><h4>${esc(group.title)}</h4>${group.items.map(([label,hint],ii)=>`<label class="checklist-item"><input type="checkbox" data-check="${gi}-${ii}" ${completedChecklist.has(gi+"-"+ii)?"checked":""}><span>${esc(label)}<small>${esc(hint)}</small></span></label>`).join("")}</div>`).join("")}
      <div class="checklist-links"><a href="https://indianvisaonline.gov.in/evisa/" target="_blank" rel="noopener noreferrer">Official India e-Visa ↗</a><a href="https://indianvisaonline.gov.in/earrival/" target="_blank" rel="noopener noreferrer">e-Arrival Card ↗</a></div>
      <button class="checklist-reset" type="button">Reset checklist</button></div></details>`;
  }
  function renderTravel(k){
    if(!C.travel[k])k="india";
    const x=C.travel[k];
    $$(".travel-tab").forEach(b=>{b.classList.toggle("active",b.dataset.key===k);b.setAttribute("aria-selected",String(b.dataset.key===k));});
    panel.innerHTML=`<span class="eyebrow">Wedding concierge</span><h3>${esc(x.label)}</h3><p class="lead">${esc(x.intro)}</p>
      <div class="travel-guide-sections">${x.sections.map(([heading,items])=>`<section class="travel-guide-section"><h4>${esc(heading)}</h4><ul>${items.map(t=>`<li>${esc(t)}</li>`).join("")}</ul></section>`).join("")}</div>
      ${k==="usa"?renderChecklist():""}`;
    if(k!=="stay")storage.set("np-origin",k);
    if(k==="usa"){
      panel.querySelectorAll("input[data-check]").forEach(box=>box.addEventListener("change",()=>{
        if(box.checked)completedChecklist.add(box.dataset.check);else completedChecklist.delete(box.dataset.check);
        storage.set(checklistKey,JSON.stringify([...completedChecklist]));
        const details=panel.querySelector(".first-time-checklist");
        const wasOpen=details?.open;
        if(details){const tmp=document.createElement("div");tmp.innerHTML=renderChecklist();details.replaceWith(tmp.firstElementChild);panel.querySelector(".first-time-checklist").open=wasOpen; bindChecklist();}
      }));
      bindChecklist();
    }
  }
  function bindChecklist(){
    panel.querySelectorAll(".first-time-checklist input[data-check]").forEach(box=>{box.onchange=()=>{
      if(box.checked)completedChecklist.add(box.dataset.check);else completedChecklist.delete(box.dataset.check);
      storage.set(checklistKey,JSON.stringify([...completedChecklist]));
      const old=panel.querySelector(".first-time-checklist"),wasOpen=old.open;
      const tmp=document.createElement("div");tmp.innerHTML=renderChecklist();
      old.replaceWith(tmp.firstElementChild);panel.querySelector(".first-time-checklist").open=wasOpen;
      bindChecklist();
    };});
    const reset=panel.querySelector(".checklist-reset");
    if(reset)reset.onclick=()=>{completedChecklist.clear();storage.set(checklistKey,"[]");const old=panel.querySelector(".first-time-checklist");const tmp=document.createElement("div");tmp.innerHTML=renderChecklist();old.replaceWith(tmp.firstElementChild);panel.querySelector(".first-time-checklist").open=true;bindChecklist();};
  }
  Object.keys(labels).forEach(k=>{const b=document.createElement("button");b.type="button";b.className="travel-tab";b.dataset.key=k;b.setAttribute("role","tab");b.textContent=labels[k];b.addEventListener("click",()=>renderTravel(k));tabs.appendChild(b)});
  tabs.setAttribute("role","tablist");
  renderTravel(storage.get("np-origin")||"india");

  const faqList=$("#faq-list"),faqSearch=$("#faq-search"),faqFilters=$("#faq-filters");
  const faqCategories=["All Questions","Wedding Events","Accommodation","Guest Logistics","RSVP & Photos"];
  let faqCategory="All Questions";
  function renderFaqs(){
    const q=faqSearch.value.trim().toLowerCase();faqList.innerHTML="";
    const matches=C.faqs.filter(([cat,question,answer])=>(faqCategory==="All Questions"||cat===faqCategory)&&(!q||(`${question} ${answer}`).toLowerCase().includes(q)));
    if(!matches.length){faqList.innerHTML='<p class="faq-empty">No matching questions. Try another search.</p>';return;}
    matches.forEach(([cat,question,answer])=>{
      const x=document.createElement("article");x.className="faq-item reveal visible";
      x.innerHTML=`<button class="faq-q" type="button" aria-expanded="false"><b>${esc(question)}</b><span class="faq-plus" aria-hidden="true">+</span></button><div class="faq-a" hidden>${esc(answer)}</div>`;
      const b=$(".faq-q",x),a=$(".faq-a",x);
      b.addEventListener("click",()=>{const open=a.hidden;a.hidden=!open;b.setAttribute("aria-expanded",String(open));$(".faq-plus",x).textContent=open?"−":"+";});
      faqList.appendChild(x);
    });
  }
  faqCategories.forEach(cat=>{
    const b=document.createElement("button");b.type="button";b.className="faq-filter";b.textContent=cat;
    b.addEventListener("click",()=>{faqCategory=cat;$$(".faq-filter").forEach(x=>x.classList.toggle("active",x===b));renderFaqs();});
    if(cat===faqCategory)b.classList.add("active");
    faqFilters.appendChild(b);
  });
  faqSearch.addEventListener("input",renderFaqs);renderFaqs();

  const RSVP_API="https://rkglbozacxbiojvnmqyb.supabase.co/functions/v1/wedding-rsvp";
  const form=$("#rsvp-form");
  const rsvpFields=$("#rsvp-fields");
  const rsvpSuccess=$("#rsvp-success");
  const attendingDetails=$("#attending-details");
  const rsvpStatus=$("#rsvp-status");
  const rsvpSubmit=$("#rsvp-submit");
  const rsvpEditLink=$("#rsvp-edit-link");
  const editNow=$("#edit-rsvp");
  const copyLink=$("#copy-rsvp-link");
  const queryToken=new URLSearchParams(location.search).get("rsvp");
  try{localStorage.removeItem("np-rsvp-token")}catch{}
  let rsvpToken=queryToken||"";

  const setRsvpStatus=(message,type="")=>{
    if(!rsvpStatus)return;
    rsvpStatus.textContent=message;
    rsvpStatus.dataset.type=type;
  };

  const updateAttendanceUI=()=>{
    const value=$('input[name="attending"]:checked',form)?.value||"";
    if(attendingDetails)attendingDetails.hidden=value!=="yes";
  };

  $$('input[name="attending"]',form).forEach(input=>input.addEventListener("change",updateAttendanceUI));

  const populateRsvp=(data)=>{
    const map={
      guestName:data.guest_name,
      email:data.email,
      partySize:data.party_size,
      dietary:data.dietary,
      arrivalDate:data.arrival_date,
      travelNumber:data.travel_number,
      notes:data.notes
    };
    Object.entries(map).forEach(([name,value])=>{
      const field=form?.elements.namedItem(name);
      if(field && "value" in field)field.value=value??"";
    });
    const attending=data.attending===true?"yes":"no";
    const radio=form?.querySelector(`input[name="attending"][value="${attending}"]`);
    if(radio)radio.checked=true;
    updateAttendanceUI();
  };

  const buildEditUrl=(token)=>{
    const url=new URL(location.href);
    url.search="";
    url.hash="";
    url.searchParams.set("rsvp",token);
    url.hash="rsvp";
    return url.toString();
  };

  const loadExistingRsvp=async()=>{
    if(!rsvpToken)return;
    setRsvpStatus("Loading your saved RSVP…");
    try{
      const res=await fetch(`${RSVP_API}?token=${encodeURIComponent(rsvpToken)}`,{
        headers:{"accept":"application/json"}
      });
      const payload=await res.json();
      if(!res.ok||!payload.ok)throw new Error(payload.error||"Unable to load RSVP.");
      populateRsvp(payload.rsvp);

      if(rsvpSubmit)rsvpSubmit.textContent="Save changes";
      setRsvpStatus("Your saved RSVP is loaded. Update anything that has changed.","success");
    }catch(err){

      rsvpToken="";
      setRsvpStatus(err.message||"We couldn't load that RSVP. You can submit a new response.","error");
    }
  };

  form?.addEventListener("submit",async e=>{
    e.preventDefault();
    if(!form.reportValidity())return;

    const data=Object.fromEntries(new FormData(form).entries());
    const attending=data.attending==="yes";
    const body={
      async_email:true,
      guest_name:data.guestName,
      email:data.email,
      attending:data.attending,
      party_size:attending?data.partySize:"0",
      arrival_date:attending?data.arrivalDate:"",
      travel_number:attending?data.travelNumber:"",
      dietary:attending?data.dietary:"",
      notes:data.notes||""
    };
    if(rsvpToken)body.edit_token=rsvpToken;

    if(rsvpSubmit){
      rsvpSubmit.disabled=true;
      rsvpSubmit.textContent="Saving…";
    }
    setRsvpStatus("Saving your RSVP…");

    try{
      const res=await fetch(RSVP_API,{
        method:"POST",
        headers:{"content-type":"application/json","accept":"application/json"},
        body:JSON.stringify(body)
      });
      const payload=await res.json();
      if(!res.ok||!payload.ok)throw new Error(payload.error||"Unable to save RSVP.");

      const wasNew=!rsvpToken;
      rsvpToken=payload.rsvp.edit_token;

      const editUrl=buildEditUrl(rsvpToken);

      if(rsvpEditLink){
        rsvpEditLink.href=editUrl;
        rsvpEditLink.textContent=editUrl;
      }

      const successCopy=$("#rsvp-success-copy");
      if(successCopy){
        const base=payload.rsvp.attending
          ?"Your RSVP is saved. You can return later to add or update travel details."
          :"Your response is saved. If your plans change, use your private edit link to update it.";
        const emailNote=payload.email_queued
          ?" We’re sending your private edit link to your email now."
          :(wasNew ? " Your private edit link is available below." : "");
        successCopy.textContent=base+emailNote;
      }

      rsvpFields.hidden=true;
      rsvpSuccess.hidden=false;
      setRsvpStatus("");
    }catch(err){
      setRsvpStatus(err.message||"Something went wrong. Please try again.","error");
      if(rsvpSubmit){
        rsvpSubmit.disabled=false;
        rsvpSubmit.textContent=rsvpToken?"Save changes":"Send RSVP";
      }
    }
  });

  editNow?.addEventListener("click",()=>{
    rsvpSuccess.hidden=true;
    rsvpFields.hidden=false;
    if(rsvpSubmit){
      rsvpSubmit.disabled=false;
      rsvpSubmit.textContent=rsvpToken?"Save changes":"Send RSVP";
    }
    form?.querySelector('input[name="guestName"]')?.focus();
  });

  copyLink?.addEventListener("click",async()=>{
    if(!rsvpToken)return;
    const editUrl=buildEditUrl(rsvpToken);
    try{
      await navigator.clipboard.writeText(editUrl);
      copyLink.textContent="Edit link copied";
      setTimeout(()=>copyLink.textContent="Copy edit link",1800);
    }catch{
      rsvpEditLink?.focus();
    }
  });

  updateAttendanceUI();
  loadExistingRsvp();

  const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");obs.unobserve(e.target)}}),{threshold:.1});
  $$(".reveal").forEach(x=>obs.observe(x));
})();