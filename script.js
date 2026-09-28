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
    card.className="event-card reveal";
    const venue = e.venue ? `<span>${e.venue}</span>` : "";
    card.innerHTML=`<div class="event-index"><strong>${e.number}</strong>${e.date}</div><div class="event-main"><h3>${e.name}</h3><p>${e.description}</p></div><div class="event-meta"><strong>${e.time}</strong>${venue}</div>`;
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

  const sendEditEmail=async({token,email,guestName,attending})=>{
    const editUrl=buildEditUrl(token);
    const res=await fetch("/.netlify/functions/rsvp-email",{
      method:"POST",
      headers:{"content-type":"application/json","accept":"application/json"},
      body:JSON.stringify({token,email,guestName,attending,editUrl})
    });
    const payload=await res.json().catch(()=>({}));
    return {ok:res.ok&&payload.ok===true,error:payload.error||""};
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
      rsvpSubmit.textContent=rsvpToken?"Saving…":"Sending…";
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

      let emailResult={ok:true,error:""};
      if(wasNew){
        emailResult=await sendEditEmail({
          token:rsvpToken,
          email:payload.rsvp.email,
          guestName:payload.rsvp.guest_name,
          attending:payload.rsvp.attending
        });
      }

      const successCopy=$("#rsvp-success-copy");
      if(successCopy){
        const base=payload.rsvp.attending
          ?"Your RSVP is saved. You can return later to add or update travel details."
          :"Your response is saved. If your plans change, use your private edit link to update it.";
        const emailNote=wasNew
          ?(emailResult.ok
            ?" We also emailed your private edit link."
            :" Your RSVP is saved, but the email could not be sent yet—please keep the private link below.")
          :"";
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