(() => {
  const content = window.WEDDING_CONTENT;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const storage = {
    get(key) {
      try { return window.localStorage.getItem(key); }
      catch { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); }
      catch { /* The site remains functional when storage is blocked. */ }
    }
  };

  // Mobile navigation
  const menuToggle = $(".menu-toggle");
  const nav = $(".primary-navigation");
  menuToggle?.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("menu-open", isOpen);
  });
  $$(".primary-navigation a").forEach(link => link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }));

  // Countdown
  const weddingTime = new Date(content.weddingDate).getTime();
  const countdownEls = {
    days: $("#days"), hours: $("#hours"), minutes: $("#minutes"), seconds: $("#seconds")
  };
  function updateCountdown() {
    let diff = Math.max(0, weddingTime - Date.now());
    const days = Math.floor(diff / 86400000); diff -= days * 86400000;
    const hours = Math.floor(diff / 3600000); diff -= hours * 3600000;
    const minutes = Math.floor(diff / 60000); diff -= minutes * 60000;
    const seconds = Math.floor(diff / 1000);
    countdownEls.days.textContent = String(days).padStart(3, "0");
    countdownEls.hours.textContent = String(hours).padStart(2, "0");
    countdownEls.minutes.textContent = String(minutes).padStart(2, "0");
    countdownEls.seconds.textContent = String(seconds).padStart(2, "0");
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Events
  const eventsGrid = $("#events-grid");
  content.events.forEach((event, index) => {
    const card = document.createElement("article");
    card.className = "event-card reveal";
    card.style.setProperty('--event-glow', `${event.palette[1]}30`);
    card.innerHTML = `
      <div>
        <span class="event-number">${event.number}</span>
        <p class="event-date">${event.date}</p>
        <h3>${event.title}</h3>
        <p>${event.description}</p>
        <div class="event-meta">
          <span>${event.time}</span>
          <span>${event.venue}</span>
          <span>${event.attire}</span>
        </div>
      </div>
      <div class="event-links">
        <a class="text-button" href="#wear">View dress guide</a>
        <button class="text-button calendar-button" data-event-index="${index}" type="button">Add to calendar</button>
      </div>`;
    eventsGrid.appendChild(card);
  });

  function downloadICS(event) {
    const safe = value => String(value).replace(/[,\n;]/g, " ");
    const blob = new Blob([[
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Nishika and Pratik Wedding//EN",
      "BEGIN:VEVENT",
      `UID:${Date.now()}@nishikapratik.com`,
      "DTSTAMP:20260726T190000Z",
      "DTSTART;VALUE=DATE:20270128",
      "DTEND;VALUE=DATE:20270130",
      `SUMMARY:${safe(event.title)} — Nishika & Pratik`,
      `LOCATION:${safe(content.eventLocation)}`,
      `DESCRIPTION:${safe(event.description)} Final timing to be confirmed.`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }
  eventsGrid.addEventListener("click", e => {
    const button = e.target.closest(".calendar-button");
    if (button) downloadICS(content.events[Number(button.dataset.eventIndex)]);
  });

  // Mood boards
  const moodGrid = $("#mood-grid");
  content.moods.forEach((mood) => {
    const card = document.createElement("article");
    card.className = "mood-card reveal";
    card.innerHTML = `
      <div class="mood-art" style="--m1:${mood.colors[0]};--m2:${mood.colors[1]};--m3:${mood.colors[2]};--m4:${mood.colors[3]}"></div>
      <p class="section-label">${mood.event}</p>
      <h3>${mood.title}</h3>
      <p>${mood.description}</p>
      <div class="palette" aria-label="${mood.title} palette">
        ${mood.colors.map(color => `<span class="swatch" style="background:${color}" title="${color}"></span>`).join("")}
      </div>
      <p class="mood-note">${mood.note}</p>`;
    moodGrid.appendChild(card);
  });

  // Travel personalization
  const travelPanel = $("#travel-panel");
  const originButtons = $$(".origin-button");
  const travelTabs = $$(".travel-tab");

  function renderTravel(key) {
    const item = content.travel[key];
    travelPanel.innerHTML = `
      <p class="section-label">${key === "stay" || key === "essentials" ? "Wedding guide" : "Personalized route"}</p>
      <h3>${item.label}</h3>
      <p class="panel-intro">${item.intro}</p>
      <div class="travel-points">
        ${item.points.map(([title, text]) => `<div class="travel-point"><strong>${title}</strong><span>${text}</span></div>`).join("")}
      </div>`;
    travelTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.travel === key));
    if (["india","usa","nigeria","elsewhere"].includes(key)) {
      originButtons.forEach(button => button.classList.toggle("active", button.dataset.origin === key));
      storage.set("np-origin", key);
    }
  }

  const savedOrigin = storage.get("np-origin") || "india";
  renderTravel(savedOrigin);

  originButtons.forEach(button => button.addEventListener("click", () => {
    renderTravel(button.dataset.origin);
    $("#travel").scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  travelTabs.forEach(tab => tab.addEventListener("click", () => renderTravel(tab.dataset.travel)));

  // FAQs
  const categories = ["All", ...new Set(content.faqs.map(item => item[0]))];
  const faqFilters = $("#faq-filters");
  const faqList = $("#faq-list");
  const faqSearch = $("#faq-search");
  let activeCategory = "All";

  categories.forEach(category => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `faq-filter${category === "All" ? " active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      activeCategory = category;
      $$(".faq-filter", faqFilters).forEach(item => item.classList.toggle("active", item === button));
      renderFAQs();
    });
    faqFilters.appendChild(button);
  });

  function renderFAQs() {
    const search = faqSearch.value.trim().toLowerCase();
    const filtered = content.faqs.filter(([category, question, answer]) => {
      const categoryMatch = activeCategory === "All" || category === activeCategory;
      const searchMatch = !search || `${question} ${answer} ${category}`.toLowerCase().includes(search);
      return categoryMatch && searchMatch;
    });
    faqList.innerHTML = "";
    $("#faq-empty").hidden = filtered.length !== 0;
    filtered.forEach(([category, question, answer]) => {
      const item = document.createElement("article");
      item.className = "faq-item reveal visible";
      item.innerHTML = `
        <button class="faq-question" type="button" aria-expanded="false">
          <span>${question}</span><span aria-hidden="true">+</span>
        </button>
        <div class="faq-answer" hidden><strong>${category}</strong><br />${answer}</div>`;
      const button = $(".faq-question", item);
      const answerEl = $(".faq-answer", item);
      button.addEventListener("click", () => {
        const open = item.classList.toggle("open");
        button.setAttribute("aria-expanded", String(open));
        answerEl.hidden = !open;
      });
      faqList.appendChild(item);
    });
  }
  faqSearch.addEventListener("input", renderFAQs);
  renderFAQs();

  // RSVP
  const attendanceOptions = $("#attendance-options");
  content.events.forEach((event, i) => {
    attendanceOptions.insertAdjacentHTML("beforeend", `
      <label class="attendance-row">
        <span><strong>${event.title}</strong><span>${event.date}</span></span>
        <select name="event_${i}">
          <option value="yes">Attending</option>
          <option value="no">Not attending</option>
          <option value="unsure">Not sure</option>
        </select>
      </label>`);
  });

  const rsvpForm = $("#rsvp-form");
  const steps = $$(".form-step", rsvpForm);
  let currentStep = 0;
  function showStep(index) {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, i) => step.hidden = i !== currentStep);
  }
  $$(".form-next", rsvpForm).forEach(button => button.addEventListener("click", () => {
    const visible = steps[currentStep];
    const fields = $$("input[required], select[required], textarea[required]", visible);
    if (fields.some(field => !field.reportValidity())) return;
    showStep(currentStep + 1);
  }));
  $$(".form-back", rsvpForm).forEach(button => button.addEventListener("click", () => showStep(currentStep - 1)));

  rsvpForm.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(rsvpForm).entries());
    data.submittedAt = new Date().toISOString();
    storage.set("np-rsvp", JSON.stringify(data));

    if (content.rsvpEndpoint) {
      try {
        await fetch(content.rsvpEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      } catch (error) {
        console.warn("RSVP endpoint unavailable; response remains stored locally.", error);
      }
    }

    steps.forEach(step => step.hidden = true);
    $("#rsvp-success").hidden = false;
  });

  $("#edit-rsvp").addEventListener("click", () => {
    $("#rsvp-success").hidden = true;
    showStep(0);
  });

  const savedRSVP = storage.get("np-rsvp");
  if (savedRSVP) {
    try {
      const data = JSON.parse(savedRSVP);
      Object.entries(data).forEach(([name, value]) => {
        const field = rsvpForm.elements.namedItem(name);
        if (field && name !== "submittedAt") field.value = value;
      });
    } catch {}
  }

  // Contacts
  const contactGrid = $("#contact-grid");
  content.contacts.forEach(([initials, title, text]) => {
    contactGrid.insertAdjacentHTML("beforeend", `
      <article class="contact-card reveal">
        <div class="contact-icon">${initials}</div>
        <h3>${title}</h3>
        <p>${text}</p>
        <span class="locked-contact">Available to confirmed guests</span>
      </article>`);
  });

  // Wedding mode preview dialog
  const dialog = $("#announcement-dialog");
  $("#demo-announcement")?.addEventListener("click", () => dialog.showModal());
  $(".dialog-close", dialog)?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", e => {
    if (e.target === dialog) dialog.close();
  });

  // Reveal animation
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  $$(".reveal").forEach(el => observer.observe(el));
})();