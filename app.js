"use strict";

const pages = {
  step1: document.querySelector("#page-step1"),
  step2: document.querySelector("#page-step2"),
  result: document.querySelector("#page-result"),
};

const optionalFields = [
  "gender",
  "bpl_card",
  "insurance_type",
  "total_cost_inr",
  "govt_subsidy_inr",
  "cost_category",
];

const optionalFieldLabels = {
  gender: "gender",
  bpl_card: "BPL card status",
  insurance_type: "insurance type",
  total_cost_inr: "total cost",
  govt_subsidy_inr: "government subsidy",
  cost_category: "cost category",
};

const integerFields = new Set([
  "age",
  "bpl_card",
  "comorbidity_count",
  "prev_admissions",
  "num_procedures",
  "charlson_index",
  "beds",
  "teaching",
]);

const floatFields = new Set([
  "total_cost_inr",
  "govt_subsidy_inr",
  "hba1c",
  "creatinine",
  "haemoglobin",
  "systolic_bp",
]);

let optionalData = {};
let lastPayload = null;

function startBackgroundSlideshow() {
  const slides = Array.from(document.querySelectorAll(".background-slide"));
  if (slides.length < 2) return;
  let activeIndex = 0;
  window.setInterval(() => {
    slides[activeIndex].classList.remove("active");
    activeIndex = (activeIndex + 1) % slides.length;
    slides[activeIndex].classList.add("active");
  }, 5000);
}

function showPage(name) {
  Object.entries(pages).forEach(([key, page]) => {
    page.classList.toggle("active", key === name);
  });
  const currentStep = { step1: 1, step2: 2, result: 3 }[name];
  document.querySelectorAll(".step").forEach((step) => {
    const number = Number(step.dataset.step);
    step.classList.toggle("active", number === currentStep);
    step.classList.toggle("done", number < currentStep);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function valueOf(id) {
  return document.getElementById(id).value.trim();
}

function parseValue(name, value) {
  if (value === "") return null;
  if (integerFields.has(name)) return Number.parseInt(value, 10);
  if (floatFields.has(name)) return Number.parseFloat(value);
  return value;
}

function toApiDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function collectOptionalData() {
  return Object.fromEntries(
    optionalFields.map((name) => [name, parseValue(name, valueOf(name))])
  );
}

function collectPayload() {
  const diagnoses = Array.from(
    document.querySelectorAll('input[name="diag_category"]:checked'),
    (checkbox) => checkbox.value
  );
  return {
    age: parseValue("age", valueOf("age")),
    gender: optionalData.gender,
    bpl_card: optionalData.bpl_card,
    insurance_type: optionalData.insurance_type,
    comorbidity_count: parseValue("comorbidity_count", valueOf("comorbidity_count")),
    prev_admissions: parseValue("prev_admissions", valueOf("prev_admissions")),
    admit_date: toApiDate(valueOf("admit_date")),
    discharge_date: toApiDate(valueOf("discharge_date")),
    admit_type: valueOf("admit_type"),
    ward_type: valueOf("ward_type"),
    discharge_type: valueOf("discharge_type"),
    num_procedures: parseValue("num_procedures", valueOf("num_procedures")),
    charlson_index: parseValue("charlson_index", valueOf("charlson_index")),
    hba1c: parseValue("hba1c", valueOf("hba1c")),
    creatinine: parseValue("creatinine", valueOf("creatinine")),
    haemoglobin: parseValue("haemoglobin", valueOf("haemoglobin")),
    systolic_bp: parseValue("systolic_bp", valueOf("systolic_bp")),
    tier: valueOf("tier"),
    beds: parseValue("beds", valueOf("beds")),
    teaching: parseValue("teaching", valueOf("teaching")),
    total_cost_inr: optionalData.total_cost_inr,
    govt_subsidy_inr: optionalData.govt_subsidy_inr,
    cost_category: optionalData.cost_category,
    diag_category: diagnoses,
  };
}

function validateRequiredForm() {
  const form = document.querySelector("#form-step2");
  const invalid = Array.from(form.querySelectorAll("[required]")).filter((field) => {
    field.classList.toggle("invalid", !field.checkValidity());
    return !field.checkValidity();
  });
  const diagnoses = document.querySelectorAll('input[name="diag_category"]:checked');
  const consent = document.querySelector("#prediction_consent");
  const error = document.querySelector("#form-error");

  if (invalid.length || diagnoses.length === 0) {
    const messages = [];
    if (invalid.some((field) => field.id !== "prediction_consent")) {
      messages.push("Complete all required fields using the allowed ranges.");
    }
    if (diagnoses.length === 0) messages.push("Select at least one diagnosis category.");
    if (!consent.checked) messages.push("Consent is required before generating a prediction.");
    error.textContent = messages.join(" ");
    error.classList.add("show");
    invalid[0]?.focus();
    return false;
  }

  const admission = new Date(valueOf("admit_date"));
  const discharge = new Date(valueOf("discharge_date"));
  if (discharge < admission) {
    error.textContent = "Discharge date cannot be before the admission date.";
    error.classList.add("show");
    document.querySelector("#discharge_date").classList.add("invalid");
    return false;
  }
  error.classList.remove("show");
  return true;
}

function apiErrorMessage(body, status) {
  if (Array.isArray(body?.detail)) {
    return body.detail
      .map((item) => `${item.loc?.at(-1) ?? "field"}: ${item.msg}`)
      .join(" • ");
  }
  return body?.detail || body?.message || `Prediction request failed (${status}).`;
}

function predictionEndpoints() {
  const endpoints = [];
  if (window.location.protocol.startsWith("http")) {
    endpoints.push(new URL("/predict", window.location.origin).href);
  }
  const apiHost = window.location.hostname || "127.0.0.1";
  endpoints.push(`http://${apiHost}:8000/predict`);
  if (apiHost !== "127.0.0.1") endpoints.push("http://127.0.0.1:8000/predict");
  return [...new Set(endpoints)];
}

async function requestPrediction(payload) {
  const endpoints = predictionEndpoints();
  let connectionError = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (
        (response.status === 404 || response.status === 405) &&
        endpoint !== endpoints.at(-1)
      ) {
        continue;
      }
      return response;
    } catch (error) {
      connectionError = error;
    }
  }
  throw connectionError || new Error("Unable to connect to the prediction API.");
}

document.querySelector("#form-step1").addEventListener("submit", (event) => {
  event.preventDefault();
  optionalData = collectOptionalData();
  showPage("step2");
});

document.querySelector("#btn-back").addEventListener("click", () => showPage("step1"));

document.querySelector("#form-step2").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateRequiredForm()) return;

  const button = document.querySelector("#btn-predict");
  const error = document.querySelector("#form-error");
  lastPayload = collectPayload();
  button.disabled = true;
  button.classList.add("loading");

  try {
    const response = await requestPrediction(lastPayload);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(apiErrorMessage(body, response.status));

    document.querySelector("#result-value").textContent =
      body.prediction ?? body.result ?? JSON.stringify(body);
    document.querySelector("#result-payload").textContent =
      JSON.stringify(lastPayload, null, 2);

    const missingFields = optionalFields
      .filter((field) => optionalData[field] === null)
      .map((field) => optionalFieldLabels[field]);
    const warning = document.querySelector("#missing-warning");
    if (missingFields.length) {
      warning.textContent =
        `The result may vary because the following information was not provided: ${missingFields.join(", ")}.`;
      warning.classList.add("show");
    } else {
      warning.textContent = "";
      warning.classList.remove("show");
    }
    showPage("result");
  } catch (errorObject) {
    error.textContent =
      errorObject.message === "Failed to fetch"
        ? "Cannot reach FastAPI. Start it with: uvicorn model:app --reload"
        : errorObject.message;
    error.classList.add("show");
    error.scrollIntoView({ behavior: "smooth", block: "center" });
  } finally {
    button.disabled = false;
    button.classList.remove("loading");
  }
});

document.querySelector("#form-step2").addEventListener("input", (event) => {
  event.target.classList?.remove("invalid");
  document.querySelector("#form-error").classList.remove("show");
});

document.querySelector("#btn-copy").addEventListener("click", async (event) => {
  if (!lastPayload) return;
  await navigator.clipboard.writeText(JSON.stringify(lastPayload, null, 2));
  const button = event.currentTarget;
  button.textContent = "Copied";
  window.setTimeout(() => { button.textContent = "Copy information"; }, 1200);
});

document.querySelector("#btn-restart").addEventListener("click", () => {
  document.querySelector("#form-step1").reset();
  document.querySelector("#form-step2").reset();
  optionalData = {};
  lastPayload = null;
  showPage("step1");
});

document.body.classList.add("theme-light");
showPage("step1");
startBackgroundSlideshow();

/* ─── Init ──────────────────────────────────────────────────────── */
