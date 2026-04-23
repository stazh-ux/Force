const BASE_STORAGE_KEY = "force_quit_state_v1";
const USERS_KEY = "force_quit_users_v1";
const SESSION_KEY = "force_quit_session_v1";

const motivationQuotes = [
  "Your future self is watching your choices. Make them proud.",
  "A strong mind is built one resisted urge at a time.",
  "Discomfort now, freedom forever.",
  "You are not your cravings. You are your decisions.",
  "When urges rise, breathe, move, and let the wave pass.",
  "Consistency beats intensity. Stay clean today.",
  "Every second of control is a point for your real life.",
  "Energy saved today becomes confidence tomorrow."
];

const taskPool = [
  "Finance: Learn about compound interest and calculate your future wealth.",
  "Tech: Research and write a summary of one emerging technology (AI, Blockchain, etc.).",
  "Science: Watch a 10-minute science video and note 3 key learnings.",
  "Physical: 20 squats + 10 pushups + 10 burpees.",
  "Physical: Go for a 10-minute brisk walk or jog.",
  "Mental: Read 5 pages of a book or article on personal development.",
  "Mental: Write 3 goals for this week with action steps.",
  "Wellness: 4-4-4-4 box breathing for 3 minutes.",
  "Mental: Practice mindfulness meditation for 5 minutes.",
  "Physical: Drink water and do a 5-minute full body stretch.",
  "Finance: Review your spending for the day and categorize expenses.",
  "Tech: Learn one new keyboard shortcut or productivity tool.",
  "Science: Read an interesting science article and share key points.",
  "Physical: Take a cold shower to build mental strength.",
  "Mental: Journal for 3 minutes about your progress today.",
  "Physical: 15 minutes of yoga or mobility work.",
  "Finance: Calculate your daily/weekly spending vs. savings.",
  "Tech: Spend 10 minutes learning a new coding concept or tool.",
  "Science: Explore one scientific breakthrough from the past week.",
  "Wellness: Practice a 3-minute breathing exercise for anxiety relief."
];

const badges = [
  { key: "First Step", check: (s) => s.daysSurvived >= 1 },
  { key: "3-Day Focus", check: (s) => s.daysSurvived >= 3 },
  { key: "Week Warrior", check: (s) => s.daysSurvived >= 7 },
  { key: "Energy 100", check: (s) => s.energy >= 100 },
  { key: "Task Hero", check: (s) => s.totalTasksCompleted >= 10 },
  { key: "Unstoppable", check: (s) => s.daysSurvived >= 30 }
];

let activeStorageKey = `${BASE_STORAGE_KEY}_guest`;
let state = loadState();
let calendarDate = new Date();
let audioCtx;
let tickTimer;

const els = {
  authGate: document.getElementById("authGate"),
  appShell: document.getElementById("appShell"),
  authGmailInput: document.getElementById("authGmailInput"),
  authPasswordInput: document.getElementById("authPasswordInput"),
  signUpBtn: document.getElementById("signUpBtn"),
  logInBtn: document.getElementById("logInBtn"),
  guestModeBtn: document.getElementById("guestModeBtn"),
  headerSignInBtn: document.getElementById("headerSignInBtn"),
  headerLogInBtn: document.getElementById("headerLogInBtn"),
  stopwatch: document.getElementById("stopwatch"),
  daysSurvived: document.getElementById("daysSurvived"),
  energy: document.getElementById("energy"),
  energyRate: document.getElementById("energyRate"),
  loginDays: document.getElementById("loginDays"),
  loginRewardMessage: document.getElementById("loginRewardMessage"),
  claimBox: document.getElementById("claimBox"),
  claimAmountText: document.getElementById("claimAmountText"),
  claimEnergyBtn: document.getElementById("claimEnergyBtn"),
  notificationSoundToggleBtn: document.getElementById("notificationSoundToggleBtn"),
  quitDateTime: document.getElementById("quitDateTime"),
  startJourneyBtn: document.getElementById("startJourneyBtn"),
  taskList: document.getElementById("taskList"),
  motivationText: document.getElementById("motivationText"),
  newMotivationBtn: document.getElementById("newMotivationBtn"),
  rewardStatus: document.getElementById("rewardStatus"),
  calendarTitle: document.getElementById("calendarTitle"),
  calendarGrid: document.getElementById("calendarGrid"),
  prevMonthBtn: document.getElementById("prevMonthBtn"),
  nextMonthBtn: document.getElementById("nextMonthBtn"),
  offlineGainToast: document.getElementById("offlineGainToast"),
  distractedModal: document.getElementById("distractedModal"),
  distractedYesBtn: document.getElementById("distractedYesBtn"),
  distractedNoBtn: document.getElementById("distractedNoBtn"),
  relapseModal: document.getElementById("relapseModal"),
  relapseYesBtn: document.getElementById("relapseYesBtn"),
  relapseNoBtn: document.getElementById("relapseNoBtn"),
  relapseBtn: document.getElementById("relapseBtn"),
  motivationModal: document.getElementById("motivationModal"),
  motivationPopupText: document.getElementById("motivationPopupText"),
  motivationCloseBtn: document.getElementById("motivationCloseBtn"),
  nameInput: document.getElementById("nameInput"),
  imageInput: document.getElementById("imageInput"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  removeImageBtn: document.getElementById("removeImageBtn"),
  profilePreview: document.getElementById("profilePreview"),
  helpBtn: document.getElementById("helpBtn"),
  helpCloseBtn: document.getElementById("helpCloseBtn")
};

setupAuth();

els.startJourneyBtn.addEventListener("click", () => {
  const picked = els.quitDateTime.value;
  if (!picked) {
    alert("Please choose date and time.");
    return;
  }
  const ts = new Date(picked).getTime();
  if (Number.isNaN(ts)) {
    alert("Invalid date/time.");
    return;
  }
  state.quitTimestamp = ts;
  syncQuitInput();
  saveState();
  renderAll();
});

els.quitDateTime.addEventListener("wheel", (event) => {
  if (document.activeElement !== els.quitDateTime) return;
  event.preventDefault();
  if (!els.quitDateTime.value) return;
  const current = new Date(els.quitDateTime.value);
  if (Number.isNaN(current.getTime())) return;
  const deltaMinutes = event.deltaY > 0 ? -1 : 1;
  current.setMinutes(current.getMinutes() + deltaMinutes);
  els.quitDateTime.value = toLocalInputValue(current);
});

els.newMotivationBtn.addEventListener("click", () => {
  state.motivation = pickRandom(motivationQuotes);
  saveState();
  els.motivationText.textContent = state.motivation;
});

els.claimEnergyBtn.addEventListener("click", () => {
  if (!state.pendingEnergyClaim || state.pendingEnergyClaim <= 0) return;
  const amount = state.pendingEnergyClaim;
  state.energy += amount;
  state.pendingEnergyClaim = 0;
  saveState();
  renderStatsOnly();
  triggerCoinBurst(els.claimEnergyBtn);
  playClaimSoundUi();
  showOfflineGainToast(`Claimed +${amount.toFixed(1)} energy`, false);
});

els.notificationSoundToggleBtn.addEventListener("click", () => {
  state.notificationSoundEnabled = !state.notificationSoundEnabled;
  saveState();
  renderSoundToggles();
});

els.relapseBtn.addEventListener("click", () => {
  openRelapseModal();
});

els.prevMonthBtn.addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

els.nextMonthBtn.addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

els.distractedNoBtn.addEventListener("click", () => {
  closeDistractedModal();
});

els.distractedYesBtn.addEventListener("click", () => {
  closeDistractedModal();
  triggerVolcanoExplosion(() => {
    resetForDistracted();
    saveState();
    renderAll();
  });
});

els.relapseNoBtn.addEventListener("click", () => {
  closeRelapseModal();
});

els.relapseYesBtn.addEventListener("click", () => {
  closeRelapseModal();
  resetForRelapse();
  saveState();
  renderAll();
  showMotivationalPopup();
});

els.motivationCloseBtn.addEventListener("click", () => {
  closeMotivationModal();
});

els.saveProfileBtn.addEventListener("click", () => {
  state.name = (els.nameInput.value || "").trim();
  const file = els.imageInput.files[0];
  if (!file) {
    saveState();
    renderProfile();
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.profileImage = reader.result;
    saveState();
    renderProfile();
  };
  reader.readAsDataURL(file);
});

els.profilePreview.addEventListener("click", () => {
  els.imageInput.click();
});

els.imageInput.addEventListener("change", () => {
  const file = els.imageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.profileImage = reader.result;
    saveState();
    renderProfile();
  };
  reader.readAsDataURL(file);
});

els.removeImageBtn.addEventListener("click", () => {
  state.profileImage = "";
  els.imageInput.value = "";
  saveState();
  renderProfile();
});

function loadState() {
  const raw = localStorage.getItem(activeStorageKey);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error("Failed to parse saved state", err);
    }
  }
  return createInitialState();
}

function saveState() {
  localStorage.setItem(activeStorageKey, JSON.stringify(state));
}

function renderAll() {
  renderStatsOnly();
  renderTasks();
  renderRewards();
  renderCalendar();
  renderProfile();
  renderSoundToggles();
  els.motivationText.textContent = state.motivation;
}

function renderStatsOnly() {
  const now = Date.now();
  const elapsedMs = Math.max(0, now - state.quitTimestamp);
  state.daysSurvived = Math.floor(elapsedMs / 86400000);
  els.stopwatch.textContent = formatDuration(elapsedMs);
  els.daysSurvived.textContent = String(state.daysSurvived);
  els.energy.textContent = state.energy.toFixed(1);
  els.energyRate.textContent = state.energyPerSecond.toFixed(1);
  els.loginDays.textContent = String(state.loginDays);
  renderClaimBox();
}

function ensureDailyTasks() {
  const today = todayKey();
  if (!state.dailyTasks.length || state.dailyTasks[0].date !== today) {
    const picked = pickThreeTasks(today);
    state.dailyTasks = picked.map((text, idx) => ({
      id: `${today}-${idx}`,
      date: today,
      text,
      done: false
    }));
    saveState();
  }
}

function pickThreeTasks(seedSource) {
  const arr = [...taskPool];
  let seed = hashCode(seedSource);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 3);
}

function renderTasks() {
  els.taskList.innerHTML = "";
  state.dailyTasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-item ${task.done ? "done" : ""}`;
    const span = document.createElement("span");
    span.textContent = task.text;
    const btn = document.createElement("button");
    btn.textContent = task.done ? "Completed" : "Done + Upgrade";
    btn.disabled = task.done;
    btn.addEventListener("click", (e) => {
      task.done = true;
      state.totalTasksCompleted += 1;
      state.energyPerSecond += 0.1;
      state.energy += 5;
      saveState();
      renderAll();
    });
    li.appendChild(span);
    li.appendChild(btn);
    els.taskList.appendChild(li);
  });
}

function renderRewards() {
  const earned = badges.filter((b) => b.check(state)).map((b) => b.key);
  if (!earned.length) {
    els.rewardStatus.innerHTML = "<span class='badge'>Keep going for your first badge</span>";
    return;
  }
  els.rewardStatus.innerHTML = earned
    .map((name) => `<span class="badge">${name}</span>`)
    .join("");
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long"
  });
  els.calendarTitle.textContent = monthName;
  els.calendarGrid.innerHTML = "";

  const weekHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  weekHeaders.forEach((h) => {
    const cell = document.createElement("div");
    cell.className = "day-cell header";
    cell.textContent = h;
    els.calendarGrid.appendChild(cell);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const now = new Date();
  const quitDate = new Date(state.quitTimestamp);

  for (let i = 0; i < firstDay; i += 1) {
    const blank = document.createElement("div");
    blank.className = "day-cell";
    blank.textContent = "";
    els.calendarGrid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const cell = document.createElement("div");
    cell.className = "day-cell";
    cell.textContent = String(day);

    if (isDateInRange(date, quitDate, now)) cell.classList.add("survived");
    if (sameDate(date, now)) cell.classList.add("today");

    els.calendarGrid.appendChild(cell);
  }
}

function renderProfile() {
  els.nameInput.value = state.name || "";
  const placeholder =
    "https://api.dicebear.com/9.x/thumbs/svg?seed=ForceQuit&backgroundColor=1e293b";
  els.profilePreview.src = state.profileImage || placeholder;
  
  if (state.profileImage) {
    els.removeImageBtn.classList.remove("app-hidden");
  } else {
    els.removeImageBtn.classList.add("app-hidden");
  }
}

function handleDailyLogin() {
  const today = todayKey();
  if (state.lastLoginDate === today) return;
  state.loginDays += 1;
  const loginReward = state.loginDays;
  state.energy += loginReward;
  state.lastLoginDate = today;
  const survivalDay = getSurvivalDayNumber();
  els.loginRewardMessage.textContent = `Daily login reward: +${loginReward} energy`;
  showOfflineGainToast(`Daily bonus received - Day ${survivalDay}`);
}

function accrueEnergyFromElapsed(creditToEnergy) {
  const now = Date.now();
  const last = state.lastEnergyUpdate || now;
  const elapsedSeconds = Math.floor((now - last) / 1000);
  let gained = 0;
  if (elapsedSeconds > 0) {
    gained = elapsedSeconds * state.energyPerSecond;
    if (creditToEnergy) {
      state.energy += gained;
    } else {
      state.pendingEnergyClaim = (state.pendingEnergyClaim || 0) + gained;
    }
    state.lastEnergyUpdate = last + elapsedSeconds * 1000;
  } else {
    state.lastEnergyUpdate = now;
  }
  return gained;
}

function syncQuitInput() {
  if (!state.quitTimestamp) return;
  els.quitDateTime.value = toLocalInputValue(new Date(state.quitTimestamp));
}

function toLocalInputValue(dateObj) {
  const offset = dateObj.getTimezoneOffset();
  const localDate = new Date(dateObj.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function showOfflineGainToast(text, withSound = true) {
  els.offlineGainToast.textContent = text;
  els.offlineGainToast.classList.add("show");
  if (withSound) {
    playNotificationSound();
  }
  setTimeout(() => {
    els.offlineGainToast.classList.remove("show");
  }, 3200);
}

function renderClaimBox() {
  const amount = state.pendingEnergyClaim || 0;
  if (amount <= 0) {
    els.claimBox.classList.remove("show");
    return;
  }
  els.claimAmountText.textContent = `${amount.toFixed(1)} energy waiting`;
  els.claimBox.classList.add("show");
}

function getSurvivalDayNumber() {
  const elapsedMs = Math.max(0, Date.now() - state.quitTimestamp);
  return Math.floor(elapsedMs / 86400000) + 1;
}

function triggerCoinBurst(sourceEl) {
  const rect = sourceEl.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  const layer = document.createElement("div");
  layer.className = "coin-burst-layer";
  document.body.appendChild(layer);

  for (let i = 0; i < 14; i += 1) {
    const coin = document.createElement("span");
    coin.className = "coin-particle";
    coin.textContent = i % 2 === 0 ? "🪙" : "✨";
    coin.style.left = `${originX}px`;
    coin.style.top = `${originY}px`;
    const angle = (Math.PI * 2 * i) / 14;
    const distance = 28 + Math.random() * 48;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 15;
    coin.style.setProperty("--x", `${dx}px`);
    coin.style.setProperty("--y", `${dy}px`);
    coin.style.animationDelay = `${Math.random() * 100}ms`;
    layer.appendChild(coin);
  }

  setTimeout(() => {
    layer.remove();
  }, 1000);
}

function renderSoundToggles() {
  els.notificationSoundToggleBtn.textContent = `Notifications: ${
    state.notificationSoundEnabled ? "On" : "Off"
  }`;
}

function playClaimSoundUi() {
  if (!state.uiSoundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const now = audioCtx.currentTime;
    playTone(784, now, 0.08, 0.07);
    playTone(988, now + 0.09, 0.11, 0.09);
  } catch (err) {
    console.error("Sound playback unavailable", err);
  }
}

function playNotificationSound() {
  if (!state.notificationSoundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const now = audioCtx.currentTime;
    playTone(660, now, 0.07, 0.05);
    playTone(740, now + 0.08, 0.08, 0.06);
  } catch (err) {
    console.error("Notification sound unavailable", err);
  }
}

function playTone(freq, start, duration, gainLevel) {
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(gainLevel, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function isDateInRange(date, start, end) {
  const d = stripTime(date).getTime();
  return d >= stripTime(start).getTime() && d <= stripTime(end).getTime();
}

function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function createInitialState() {
  return {
    name: "",
    profileImage: "",
    quitTimestamp: Date.now(),
    energy: 0,
    energyPerSecond: 0.1,
    loginDays: 0,
    lastLoginDate: "",
    lastEnergyUpdate: Date.now(),
    pendingEnergyClaim: 0,
    uiSoundEnabled: true,
    notificationSoundEnabled: true,
    daysSurvived: 0,
    dailyTasks: [],
    totalTasksCompleted: 0,
    motivation: pickRandom(motivationQuotes)
  };
}

function resetForDistracted() {
  state.quitTimestamp = Date.now();
  state.energy = 0;
  state.pendingEnergyClaim = 0;
  state.lastEnergyUpdate = Date.now();
  syncQuitInput();
}

function resetForRelapse() {
  state.quitTimestamp = Date.now();
  state.energy = 0;
  state.energyPerSecond = 0.1;
  state.pendingEnergyClaim = 0;
  state.lastEnergyUpdate = Date.now();
  state.dailyTasks = [];
  state.motivation = pickRandom(motivationQuotes);
  syncQuitInput();
}

function openDistractedModal() {
  els.distractedModal.classList.remove("app-hidden");
}

function closeDistractedModal() {
  els.distractedModal.classList.add("app-hidden");
}

function openRelapseModal() {
  els.relapseModal.classList.remove("app-hidden");
}

function closeRelapseModal() {
  els.relapseModal.classList.add("app-hidden");
}

function showMotivationalPopup() {
  const quote = pickRandom(motivationQuotes);
  els.motivationPopupText.textContent = quote;
  els.motivationModal.classList.remove("app-hidden");
  playNotificationSound();
}

function closeMotivationModal() {
  els.motivationModal.classList.add("app-hidden");
}

function triggerVolcanoExplosion(onDone) {
  const layer = document.createElement("div");
  layer.className = "explosion-layer";
  const flash = document.createElement("div");
  flash.className = "explosion-flash";
  layer.appendChild(flash);

  for (let i = 0; i < 36; i += 1) {
    const p = document.createElement("div");
    p.className = "blast-particle";
    const spreadX = (Math.random() - 0.5) * 420;
    const riseY = -(120 + Math.random() * 360);
    p.style.setProperty("--dx", `${spreadX}px`);
    p.style.setProperty("--dy", `${riseY}px`);
    p.style.animationDelay = `${Math.random() * 120}ms`;
    layer.appendChild(p);
  }

  document.body.appendChild(layer);
  setTimeout(() => {
    layer.remove();
    onDone();
  }, 950);
}

function setupAuth() {
  els.signUpBtn.addEventListener("click", () => authenticate("signup"));
  els.logInBtn.addEventListener("click", () => authenticate("login"));
  els.guestModeBtn.addEventListener("click", () => {
    const guestSession = { mode: "guest" };
    localStorage.setItem(SESSION_KEY, JSON.stringify(guestSession));
    startAppForSession(guestSession);
  });

  if (els.headerSignInBtn) {
    els.headerSignInBtn.addEventListener("click", () => {
      els.authGate.classList.remove("app-hidden");
      els.appShell.classList.add("app-hidden");
      els.authGmailInput.value = "";
      els.authPasswordInput.value = "";
    });
  }

  if (els.headerLogInBtn) {
    els.headerLogInBtn.addEventListener("click", () => {
      els.authGate.classList.remove("app-hidden");
      els.appShell.classList.add("app-hidden");
      els.authGmailInput.value = "";
      els.authPasswordInput.value = "";
    });
  }

  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) {
    try {
      startAppForSession(JSON.parse(existing));
    } catch (err) {
      console.error("Invalid saved session", err);
    }
  }
}

function authenticate(mode) {
  const email = (els.authGmailInput.value || "").trim().toLowerCase();
  const password = (els.authPasswordInput.value || "").trim();
  if (!/@gmail\.com$/i.test(email)) {
    alert("Use a valid Gmail address.");
    return;
  }
  if (password.length < 4) {
    alert("Password must be at least 4 characters.");
    return;
  }

  const users = loadUsers();
  if (mode === "signup") {
    if (users[email]) {
      alert("Account already exists. Please log in.");
      return;
    }
    users[email] = { password };
    saveUsers(users);
  } else {
    if (!users[email] || users[email].password !== password) {
      alert("Invalid Gmail or password.");
      return;
    }
  }

  const session = { mode: "user", email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  startAppForSession(session);
}

function loadUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse users", err);
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function startAppForSession(session) {
  if (session.mode === "user" && session.email) {
    activeStorageKey = `${BASE_STORAGE_KEY}_${session.email.replace(/[^a-z0-9]/gi, "_")}`;
  } else {
    activeStorageKey = `${BASE_STORAGE_KEY}_guest`;
  }

  state = loadState();
  handleDailyLogin();
  ensureDailyTasks();
  if (!state.motivation) {
    state.motivation = pickRandom(motivationQuotes);
  }
  if (!state.quitTimestamp) {
    state.quitTimestamp = Date.now();
  }
  if (!state.lastEnergyUpdate) {
    state.lastEnergyUpdate = Date.now();
  }
  if (typeof state.uiSoundEnabled !== "boolean") {
    state.uiSoundEnabled = typeof state.soundEnabled === "boolean" ? state.soundEnabled : true;
  }
  if (typeof state.notificationSoundEnabled !== "boolean") {
    state.notificationSoundEnabled = typeof state.soundEnabled === "boolean" ? state.soundEnabled : true;
  }

  syncQuitInput();
  const offlineGain = accrueEnergyFromElapsed(false);
  saveState();
  renderAll();
  if (offlineGain > 0) {
    showOfflineGainToast(`+${offlineGain.toFixed(1)} energy ready to claim`);
  }

  els.authGate.classList.add("app-hidden");
  els.appShell.classList.remove("app-hidden");

  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    accrueEnergyFromElapsed(true);
    saveState();
    renderStatsOnly();
  }, 1000);
}

// Add event listener for Help button
document.getElementById('helpBtn').addEventListener('click', () => {
  document.getElementById('helpModal').classList.remove('app-hidden');
});

// Add event listener for closing Help modal
document.getElementById('helpCloseBtn').addEventListener('click', () => {
  document.getElementById('helpModal').classList.add('app-hidden');
});
