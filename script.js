const QUESTIONS = [
  {
    id: "glazing",
    title: "Что нужно остеклить?",
    options: ["квартира", "дом", "балкон / лоджия", "офис"],
  },
  {
    id: "type",
    title: "Тип окон",
    options: ["пластиковые", "алюминиевые", "раздвижные", "нужна консультация"],
  },
  {
    id: "count",
    title: "Сколько окон?",
    options: ["1–2", "3–5", "5+"],
  },
  {
    id: "timing",
    title: "Когда планируете установку?",
    options: ["в ближайший месяц", "в течение 3 месяцев", "просто узнаю цену"],
  },
  {
    id: "location",
    title: "Где находится объект?",
    options: ["Сочи", "Адлер", "Хоста", "Красная Поляна", "другое"],
  },
];

const TOTAL_STEPS = QUESTIONS.length + 1; // + форма

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const modal = $("[data-quiz-modal]");
const modalPanel = modal ? $(".modal__panel", modal) : null;
const quizBody = $("[data-quiz-body]");
const stepText = $("[data-quiz-step]");
const progressBar = $("[data-progress-bar]");
const btnBack = $("[data-quiz-back]");
const btnNext = $("[data-quiz-next]");

let lastActiveEl = null;
let state = null;

function setYear() {
  const year = new Date().getFullYear();
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(year);
}

function lockScroll(locked) {
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

function getFocusable(root) {
  const selectors = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ];
  return $$(selectors.join(","), root).filter((el) => {
    const style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  });
}

function openModal() {
  if (!modal || !modalPanel || !quizBody || !stepText || !progressBar || !btnBack || !btnNext) return;
  lastActiveEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  lockScroll(true);

  startQuiz();

  const focusables = getFocusable(modalPanel);
  (focusables[0] || modalPanel).focus?.();
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  lockScroll(false);
  if (quizBody) quizBody.innerHTML = "";

  if (lastActiveEl) lastActiveEl.focus?.();
  lastActiveEl = null;
}

function startQuiz() {
  state = {
    step: 0, // 0..QUESTIONS.length => форма, "thanks" => экран
    answers: {},
    lead: { name: "", phone: "" },
    sending: false,
  };
  render();
}

function setProgress(stepNumber) {
  const clamped = Math.max(1, Math.min(TOTAL_STEPS, stepNumber));
  const pct = (clamped / TOTAL_STEPS) * 100;
  if (progressBar) progressBar.style.width = `${pct}%`;
  if (stepText) stepText.textContent = `Шаг ${clamped} из ${TOTAL_STEPS}`;
}

function setFooterVisibility(visible) {
  const foot = btnBack?.closest?.(".quiz__foot");
  if (foot) foot.style.display = visible ? "flex" : "none";
}

function setNextState({ disabled, label }) {
  if (!btnNext) return;
  btnNext.disabled = Boolean(disabled);
  btnNext.textContent = label;
}

function setBackState({ disabled }) {
  if (!btnBack) return;
  btnBack.disabled = Boolean(disabled);
}

function render() {
  if (!state || !quizBody || !stepText || !progressBar || !btnBack || !btnNext) return;

  quizBody.innerHTML = "";
  quizBody.classList.add("step-anim");
  window.setTimeout(() => quizBody.classList.remove("step-anim"), 240);

  if (state.step === "thanks") {
    setFooterVisibility(false);
    progressBar.style.width = "100%";
    stepText.textContent = "Готово";
    renderThanks();
    return;
  }

  const isForm = state.step === QUESTIONS.length;
  const stepNumber = isForm ? TOTAL_STEPS : state.step + 1;
  setProgress(stepNumber);
  setFooterVisibility(true);

  setBackState({ disabled: state.step === 0 || state.sending });

  if (isForm) {
    renderForm();
    setNextState({ disabled: state.sending, label: state.sending ? "Отправляем..." : "Получить расчет" });
    return;
  }

  const q = QUESTIONS[state.step];
  renderQuestion(q);

  const selected = state.answers[q.id];
  setNextState({ disabled: !selected, label: "Далее" });
}

function renderQuestion(q) {
  const wrap = document.createElement("div");
  wrap.className = "q";

  const title = document.createElement("div");
  title.className = "q__title";
  title.textContent = q.title;

  const options = document.createElement("div");
  options.className = "options";

  const selected = state.answers[q.id] || null;

  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.setAttribute("data-option", opt);
    btn.setAttribute("aria-pressed", selected === opt ? "true" : "false");

    const left = document.createElement("div");
    left.textContent = opt;

    const check = document.createElement("div");
    check.className = "option__check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = "✓";

    btn.append(left, check);

    if (selected === opt) btn.classList.add("is-selected");

    btn.addEventListener("click", () => {
      state.answers[q.id] = opt;
      render();
      window.setTimeout(() => nextStep(), 180);
    });

    options.appendChild(btn);
  });

  wrap.append(title, options);
  quizBody.appendChild(wrap);
}

function renderForm() {
  const wrap = document.createElement("div");
  wrap.className = "q";

  const title = document.createElement("div");
  title.className = "q__title";
  title.textContent = "Получите расчет стоимости";

  const form = document.createElement("form");
  form.className = "form";
  form.noValidate = true;

  const nameField = document.createElement("div");
  nameField.className = "field";
  const nameLabel = document.createElement("div");
  nameLabel.className = "label";
  nameLabel.textContent = "Имя";
  const nameInput = document.createElement("input");
  nameInput.className = "input";
  nameInput.name = "name";
  nameInput.autocomplete = "name";
  nameInput.placeholder = "Введите имя";
  nameInput.value = state.lead.name;
  nameInput.required = true;
  nameInput.addEventListener("input", () => {
    state.lead.name = nameInput.value;
  });
  nameField.append(nameLabel, nameInput);

  const phoneField = document.createElement("div");
  phoneField.className = "field";
  const phoneLabel = document.createElement("div");
  phoneLabel.className = "label";
  phoneLabel.textContent = "Телефон";
  const phoneInput = document.createElement("input");
  phoneInput.className = "input";
  phoneInput.name = "phone";
  phoneInput.autocomplete = "tel";
  phoneInput.inputMode = "tel";
  phoneInput.placeholder = "+7 (___) ___-__-__";
  phoneInput.value = state.lead.phone;
  phoneInput.required = true;
  phoneInput.addEventListener("input", () => {
    phoneInput.value = formatPhone(phoneInput.value);
    state.lead.phone = phoneInput.value;
    setNextState({ disabled: state.sending, label: state.sending ? "Отправляем..." : "Получить расчет" });
  });
  phoneField.append(phoneLabel, phoneInput);

  const helper = document.createElement("p");
  helper.className = "helper";
  helper.textContent = "Мы перезвоним и уточним детали. Никакого спама.";

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("aria-live", "polite");
  toast.textContent = "Заполните имя и телефон, чтобы отправить заявку.";

  form.append(nameField, phoneField, helper, toast);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitLead({ toast, nameInput, phoneInput });
  });

  wrap.append(title, form);
  quizBody.appendChild(wrap);

  window.setTimeout(() => nameInput.focus(), 0);
}

function renderThanks() {
  const wrap = document.createElement("div");
  wrap.className = "screen";

  const title = document.createElement("div");
  title.className = "screen__title";
  title.textContent = "Спасибо за заявку.";

  const text = document.createElement("p");
  text.className = "screen__text";
  text.textContent = "Наш менеджер свяжется с вами в течение 10 минут.";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "10px";
  actions.style.flexWrap = "wrap";

  const btnClose = document.createElement("button");
  btnClose.type = "button";
  btnClose.className = "btn btn--primary";
  btnClose.textContent = "Закрыть";
  btnClose.addEventListener("click", closeModal);

  const btnRestart = document.createElement("button");
  btnRestart.type = "button";
  btnRestart.className = "btn btn--ghost";
  btnRestart.textContent = "Пройти квиз заново";
  btnRestart.addEventListener("click", startQuiz);

  actions.append(btnClose, btnRestart);

  const summary = document.createElement("div");
  summary.className = "toast";
  summary.innerHTML = `<strong>Ваши ответы:</strong><br>${buildSummaryHtml()}`;

  wrap.append(title, text, actions, summary);
  quizBody.appendChild(wrap);
  window.setTimeout(() => btnClose.focus(), 0);
}

function buildSummaryHtml() {
  const lines = QUESTIONS.map((q) => {
    const a = state.answers[q.id] || "—";
    return `${escapeHtml(q.title)}: <span style="color: var(--text)">${escapeHtml(a)}</span>`;
  });
  const name = state.lead.name?.trim() || "—";
  const phone = state.lead.phone?.trim() || "—";
  lines.push(`Имя: <span style="color: var(--text)">${escapeHtml(name)}</span>`);
  lines.push(`Телефон: <span style="color: var(--text)">${escapeHtml(phone)}</span>`);
  return lines.join("<br>");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isPhoneValid(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 11;
}

function formatPhone(value) {
  let digits = String(value).replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (!digits.startsWith("7")) digits = "7" + digits;

  const d = digits.slice(0, 11);
  const p1 = d.slice(1, 4);
  const p2 = d.slice(4, 7);
  const p3 = d.slice(7, 9);
  const p4 = d.slice(9, 11);

  let out = "+7";
  if (p1) out += ` (${p1}`;
  if (p1.length === 3) out += ")";
  if (p2) out += ` ${p2}`;
  if (p3) out += `-${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

function submitLead({ toast, nameInput, phoneInput }) {
  const name = state.lead.name.trim();
  const phone = state.lead.phone.trim();

  if (!name) {
    toast.textContent = "Введите имя.";
    nameInput.focus();
    return;
  }
  if (!isPhoneValid(phone)) {
    toast.textContent = "Введите корректный телефон.";
    phoneInput.focus();
    return;
  }

  state.sending = true;
  render();

  window.setTimeout(() => {
    state.sending = false;
    state.step = "thanks";
    render();
  }, 650);
}

function nextStep() {
  if (!state || state.step === "thanks" || state.sending) return;

  if (state.step < QUESTIONS.length) {
    const q = QUESTIONS[state.step];
    if (!state.answers[q.id]) return;
    state.step += 1;
    render();
    return;
  }

  if (state.step === QUESTIONS.length) {
    const form = $("form", quizBody);
    form?.requestSubmit?.();
  }
}

function prevStep() {
  if (!state || state.step === "thanks" || state.sending) return;
  if (typeof state.step !== "number") return;
  if (state.step === 0) return;
  state.step -= 1;
  render();
}

function bindEvents() {
  $$("[data-open-quiz]").forEach((btn) => btn.addEventListener("click", openModal));
  $$("[data-close-quiz]").forEach((btn) => btn.addEventListener("click", closeModal));

  modal?.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.matches("[data-close-quiz]")) closeModal();
  });

  btnNext?.addEventListener("click", nextStep);
  btnBack?.addEventListener("click", prevStep);

  document.addEventListener("keydown", (e) => {
    if (!modal?.classList.contains("is-open")) return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
      return;
    }

    if (e.key === "Enter") {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.closest(".options")) {
        e.preventDefault();
        nextStep();
      }
    }

    if (e.key !== "Tab") return;
    const focusables = getFocusable(modalPanel);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || active === modalPanel) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

setYear();
bindEvents();

