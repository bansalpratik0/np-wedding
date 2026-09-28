(() => {
  const API = "https://rkglbozacxbiojvnmqyb.supabase.co/functions/v1/royal-attire";
  const $ = (q,p=document) => p.querySelector(q);
  const $$ = (q,p=document) => [...p.querySelectorAll(q)];

  const form = $("#attire-form");
  const fields = $("#form-fields");
  const success = $("#success-card");
  const status = $("#form-status");
  const submit = $("#submit-button");
  const femaleFields = $("#female-fields");
  const maleFields = $("#male-fields");
  const measurementArea = $("#measurement-area");
  const topSizeLabel = $("#top-size-label");
  const bottomSizeLabel = $("#bottom-size-label");
  const editLink = $("#edit-link");
  const copyLink = $("#copy-link");
  const editNow = $("#edit-now");
  const queryToken = new URLSearchParams(location.search).get("edit");
  let editToken = queryToken || "";

  const guideModal = $("#guide-modal");
  $("#guide-open")?.addEventListener("click", () => guideModal?.showModal());
  $("#guide-close")?.addEventListener("click", () => guideModal?.close());
  guideModal?.addEventListener("click", (e) => {
    if (e.target === guideModal) guideModal.close();
  });

  const setStatus = (message, type="") => {
    if (!status) return;
    status.textContent = message;
    status.dataset.type = type;
  };

  const currentGender = () => $('input[name="gender"]:checked', form)?.value || "";
  const currentUnits = () => $('input[name="units"]:checked', form)?.value || "";

  const setRequired = (section, enabled) => {
    $$("input", section).forEach((input) => {
      input.required = enabled;
      input.disabled = !enabled;
    });
  };

  const updateUnitLabels = () => {
    const unit = currentUnits();
    $$(".unit-suffix").forEach((el) => el.textContent = unit || "—");
  };

  const updateGenderUI = () => {
    const gender = currentGender();
    measurementArea.hidden = !gender;
    femaleFields.hidden = gender !== "female";
    maleFields.hidden = gender !== "male";
    setRequired(femaleFields, gender === "female");
    setRequired(maleFields, gender === "male");

    ["topSize","trouserSize"].forEach((name) => {
      const control = form?.elements.namedItem(name);
      if (control && "disabled" in control) {
        control.disabled = !gender;
        control.required = Boolean(gender);
      }
    });

    if (gender === "female") {
      topSizeLabel.textContent = "Usual top size";
      bottomSizeLabel.textContent = "Usual skirt / trouser size";
    } else if (gender === "male") {
      topSizeLabel.textContent = "Usual jacket / top size";
      bottomSizeLabel.textContent = "Usual trouser size";
    }
  };

  $$('input[name="gender"]', form).forEach((input) => input.addEventListener("change", updateGenderUI));
  $$('input[name="units"]', form).forEach((input) => input.addEventListener("change", updateUnitLabels));

  const buildEditUrl = (token) => {
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("edit", token);
    return url.toString();
  };

  const value = (name) => form?.elements.namedItem(name)?.value ?? "";

  const populate = (data) => {
    const simple = {
      fullName:data.full_name,
      phone:data.phone,
      topSize:data.top_size,
      trouserSize:data.trouser_size,
      notes:data.notes
    };

    Object.entries(simple).forEach(([name,val]) => {
      const field = form?.elements.namedItem(name);
      if (field && "value" in field) field.value = val ?? "";
    });

    const genderRadio = form?.querySelector(`input[name="gender"][value="${data.gender}"]`);
    if (genderRadio) genderRadio.checked = true;
    const unitsRadio = form?.querySelector(`input[name="units"][value="${data.units}"]`);
    if (unitsRadio) unitsRadio.checked = true;

    updateGenderUI();
    updateUnitLabels();

    const measurementMap = data.gender === "female" ? {
      aboveBust:data.above_bust,
      bust:data.bust,
      belowBust:data.below_bust,
      waist:data.waist,
      shouldersFemale:data.shoulders,
      armHoles:data.arm_holes,
      lengthFromShoulder:data.length_from_shoulder,
      lengthFromWaist:data.length_from_waist,
      crotchFemale:data.crotch
    } : {
      chest:data.chest,
      jacketLength:data.jacket_length_from_shoulder,
      shouldersMale:data.shoulders,
      neck:data.neck,
      trouserWaist:data.trouser_waist,
      trouserLength:data.trouser_length,
      crotchMale:data.crotch,
      thigh:data.thigh
    };

    Object.entries(measurementMap).forEach(([name,val]) => {
      const field = form?.elements.namedItem(name);
      if (field && "value" in field) field.value = val ?? "";
    });
  };

  const loadExisting = async () => {
    if (!editToken) return;
    setStatus("Loading your saved measurements…");
    try {
      const res = await fetch(`${API}?token=${encodeURIComponent(editToken)}`, {
        headers:{"accept":"application/json"}
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error || "Unable to load measurements.");
      populate(payload.measurements);
      submit.textContent = "Save changes →";
      setStatus("Your saved measurements are loaded. Update anything that has changed.", "success");
    } catch (error) {
      editToken = "";
      setStatus(error.message || "We couldn't load that edit link. You can submit a new form.", "error");
    }
  };

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const gender = currentGender();
    const units = currentUnits();
    if (!gender || !units) {
      setStatus("Please select who the measurements are for and choose a unit.", "error");
      return;
    }

    const body = {
      full_name:value("fullName"),
      phone:value("phone"),
      gender,
      units,
      top_size:value("topSize"),
      trouser_size:value("trouserSize"),
      notes:value("notes")
    };

    if (gender === "female") {
      Object.assign(body, {
        above_bust:value("aboveBust"),
        bust:value("bust"),
        below_bust:value("belowBust"),
        waist:value("waist"),
        shoulders:value("shouldersFemale"),
        arm_holes:value("armHoles"),
        length_from_shoulder:value("lengthFromShoulder"),
        length_from_waist:value("lengthFromWaist"),
        crotch:value("crotchFemale")
      });
    } else {
      Object.assign(body, {
        chest:value("chest"),
        jacket_length_from_shoulder:value("jacketLength"),
        shoulders:value("shouldersMale"),
        neck:value("neck"),
        trouser_waist:value("trouserWaist"),
        trouser_length:value("trouserLength"),
        crotch:value("crotchMale"),
        thigh:value("thigh")
      });
    }

    if (editToken) body.edit_token = editToken;

    submit.disabled = true;
    submit.textContent = "Saving…";
    setStatus("Saving your measurements…");

    try {
      const res = await fetch(API, {
        method:"POST",
        headers:{"content-type":"application/json","accept":"application/json"},
        body:JSON.stringify(body)
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error || "Unable to save measurements.");

      editToken = payload.measurements.edit_token;
      const url = buildEditUrl(editToken);
      editLink.href = url;
      editLink.textContent = url;

      $("#success-copy").textContent = payload.created
        ? "Your measurements have been saved for your Royal Events outfit."
        : "Your updated measurements have been saved.";

      fields.hidden = true;
      success.hidden = false;
      setStatus("");
    } catch (error) {
      setStatus(error.message || "Something went wrong. Please try again.", "error");
      submit.disabled = false;
      submit.textContent = editToken ? "Save changes →" : "Submit measurements →";
    }
  });

  editNow?.addEventListener("click", () => {
    success.hidden = true;
    fields.hidden = false;
    submit.disabled = false;
    submit.textContent = editToken ? "Save changes →" : "Submit measurements →";
    form?.querySelector('input[name="fullName"]')?.focus();
  });

  copyLink?.addEventListener("click", async () => {
    if (!editToken) return;
    try {
      await navigator.clipboard.writeText(buildEditUrl(editToken));
      copyLink.textContent = "Link copied";
      setTimeout(() => copyLink.textContent = "Copy private edit link", 1800);
    } catch {
      copyLink.textContent = "Copy the link above";
    }
  });

  updateGenderUI();
  updateUnitLabels();
  loadExisting();
})();
