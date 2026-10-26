/* ===== Config ===== */
// scikit-learn sorts classes alphabetically, so this order matches model.classes_
// for the NYC Airbnb room_type target. Edit if your model's classes differ.
const CLASS_LABELS = ["Entire home/apt", "Private room", "Shared room"];

// Mirrors the Pydantic Features model so bad input is caught before the request.
const NUMERIC_RULES = {
  latitude:                     { int: false, min: -90,  max: 90 },
  longitude:                    { int: false, min: -180, max: 180 },
  price:                        { int: false, min: 0 },
  minimum_nights:               { int: true,  min: 1,    max: 365 },
  number_of_reviews:            { int: true,  min: 0 },
  reviews_per_month:            { int: false, min: 0 },
  calculated_host_listing_count:{ int: true,  min: 0 },
  availability_365:             { int: true,  min: 0,    max: 365 },
};

const TEXT_FIELDS = ["neighbourhood_group", "neighbourhood"];

const SAMPLE = {
  neighbourhood_group: "Manhattan",
  neighbourhood: "Harlem",
  latitude: 40.8107,
  longitude: -73.9437,
  price: 150,
  minimum_nights: 2,
  number_of_reviews: 45,
  reviews_per_month: 1.2,
  calculated_host_listing_count: 1,
  availability_365: 200,
};

const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ===== Animated starfield background ===== */
(function starfield() {
  const canvas = $("particles");
  const ctx = canvas.getContext("2d");
  let dots = [];

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const count = Math.min(70, Math.floor((innerWidth * innerHeight) / 22000));
    dots = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * (reduceMotion ? 0 : 0.3),
      vy: (Math.random() - 0.5) * (reduceMotion ? 0 : 0.3),
      r: Math.random() * 1.6 + 0.4,
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const d of dots) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
      if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(167, 139, 250, 0.5)";
      ctx.fill();
    }

    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const a = dots[i], b = dots[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 120) {
          ctx.strokeStyle = `rgba(124, 92, 255, ${0.15 * (1 - dist / 120)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(frame);
  }

  addEventListener("resize", resize);
  resize();
  frame();
})();

/* ===== 3D tilt on hover (pointer devices only) ===== */
if (matchMedia("(hover: hover)").matches && !reduceMotion) {
  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-y * 3}deg) rotateY(${x * 3}deg)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

/* ===== Helpers ===== */
const API_BASE_URL = "https://nyc-airbnb-room-type-predictor-r0qa.onrender.com";

function apiBase() {
  return API_BASE_URL.replace(/\/+$/, "");
}

function showError(message) {
  const box = $("formError");
  box.textContent = message;
  box.hidden = false;
}

function clearError() {
  $("formError").hidden = true;
}

function setLoading(isLoading) {
  const btn = $("submitBtn");
  btn.disabled = isLoading;
  btn.classList.toggle("loading", isLoading);
}

function animateNumber(el, to, duration = 1000) {
  if (reduceMotion) {
    el.textContent = `${to.toFixed(1)}%`;
    return;
  }
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = `${(to * eased).toFixed(1)}%`;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ===== Validation ===== */
function readForm() {
  const errors = [];
  const data = {};

  for (const name of TEXT_FIELDS) {
    const el = $(name);
    el.classList.remove("invalid");
    const value = el.value.trim();
    if (!value) {
      el.classList.add("invalid");
      errors.push(name.replace(/_/g, " "));
    } else {
      data[name] = value;
    }
  }

  for (const [name, rule] of Object.entries(NUMERIC_RULES)) {
    const el = $(name);
    el.classList.remove("invalid");
    const raw = el.value.trim();
    const num = raw === "" ? NaN : Number(raw);

    let ok = Number.isFinite(num);
    if (ok && rule.int) ok = Number.isInteger(num);
    if (ok && rule.min !== undefined) ok = num >= rule.min;
    if (ok && rule.max !== undefined) ok = num <= rule.max;

    if (ok) {
      data[name] = num;
    } else {
      el.classList.add("invalid");
      errors.push(name.replace(/_/g, " "));
    }
  }

  return { data, errors };
}

function fillSample() {
  for (const [name, value] of Object.entries(SAMPLE)) {
    const el = $(name);
    el.value = value;
    el.classList.remove("invalid");
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 600);
  }
  clearError();
}

/* ===== API ===== */
function formatApiError(json, status) {
  // FastAPI 422 responses: detail is an array of { loc, msg, ... }
  if (Array.isArray(json.detail)) {
    return json.detail
      .map((d) => `${String(d.loc.slice(-1)[0]).replace(/_/g, " ")}: ${d.msg}`)
      .join(" · ");
  }
  return json.detail || `Request failed with status ${status}.`;
}

async function predict(event) {
  event.preventDefault();
  clearError();

  const { data, errors } = readForm();
  if (errors.length) {
    showError(`Please fix: ${errors.join(", ")}`);
    return;
  }

  setLoading(true);
  try {
    const res = await fetch(`${apiBase()}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(formatApiError(json, res.status));
    renderResult(json);
  } catch (err) {
    const unreachable = err instanceof TypeError;
    showError(
      unreachable
        ? "Can't reach the API. Check that uvicorn is running and the URL above is correct."
        : err.message
    );
  } finally {
    setLoading(false);
  }
}

/* ===== Result rendering ===== */
function renderResult(json) {
  const probs = json.Probability[0];
  const topIndex = probs.indexOf(Math.max(...probs));
  const topConfidence = probs[topIndex] * 100;

  $("idle").hidden = true;
  $("result").hidden = false;

  // Restart the pop-in animation on repeat predictions
  const result = $("result");
  result.style.animation = "none";
  void result.offsetWidth;
  result.style.animation = "";

  $("resultLabel").textContent = json.Predicted_room_type;
  animateNumber($("confidence"), topConfidence);

  const bars = $("bars");
  bars.innerHTML = "";
  probs.forEach((p, i) => {
    const label = CLASS_LABELS[i] ?? `Class ${i}`;
    const pct = p * 100;

    const li = document.createElement("li");
    if (i === topIndex) li.classList.add("top");
    li.innerHTML = `
      <div class="bar-head"><strong>${label}</strong><span>${pct.toFixed(1)}%</span></div>
      <div class="bar-track"><div class="bar-fill"></div></div>`;
    bars.appendChild(li);

    // Grow bars after the browser paints them at width 0
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        li.querySelector(".bar-fill").style.width = `${pct}%`;
      })
    );
  });
}

/* ===== Wire up ===== */
$("predictForm").addEventListener("submit", predict);
$("fillSample").addEventListener("click", fillSample);

// Clear red borders as the user fixes a field
document.querySelectorAll("#predictForm input").forEach((input) => {
  input.addEventListener("input", () => input.classList.remove("invalid"));
});
