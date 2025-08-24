const socket = io();

// DOM
const messagesEl = document.getElementById("messages");
const typingEl = document.getElementById("typing");
const formEl = document.getElementById("composer");
const inputEl = document.getElementById("input");
const meNameEl = document.getElementById("me-name");
const meAvatarEl = document.getElementById("me-avatar");
const themeBtn = document.getElementById("theme-toggle");

/* ---------- Username ---------- */
let username = localStorage.getItem("chat-username") || prompt("Enter your name");
if (!username || !username.trim()) username = "Guest";
username = username.trim();
localStorage.setItem("chat-username", username);

meNameEl.textContent = username;
meAvatarEl.textContent = initials(username);
meAvatarEl.style.background = gradientFor(username);

// tell server who we are
socket.emit("join", username);

// store my id to style "me" vs "other"
let myId = null;
socket.on("connect", () => { myId = socket.id; });

/* ---------- Theme toggle ---------- */
const savedTheme = localStorage.getItem("chat-theme") || "dark";
if (savedTheme === "light") document.body.classList.add("light");
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("chat-theme", document.body.classList.contains("light") ? "light" : "dark");
});

/* ---------- Typing indicator ---------- */
let typing = false;
let lastTypeAt = 0;
const TYPING_WINDOW_MS = 900;

function emitTyping(state){
  typing = state;
  socket.emit("typing", state);
}
inputEl.addEventListener("input", () => {
  lastTypeAt = Date.now();
  if (!typing) emitTyping(true);
});
setInterval(() => {
  if (typing && Date.now() - lastTypeAt > TYPING_WINDOW_MS) emitTyping(false);
}, 300);

// show others typing (aggregate names)
const typers = new Map(); // senderId -> name
socket.on("typing", ({ user, typing, senderId }) => {
  if (typing) typers.set(senderId, user);
  else typers.delete(senderId);

  const names = [...typers.values()];
  if (names.length === 0) {
    typingEl.classList.add("hidden");
  } else {
    typingEl.classList.remove("hidden");
    typingEl.textContent = names.length === 1 ? `${names[0]} is typing…` : `${names.join(", ")} are typing…`;
  }
});

/* ---------- Send message ---------- */
formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  socket.emit("chat message", { text });
  inputEl.value = "";
  inputEl.focus();
  emitTyping(false);
});

/* ---------- Receive message ---------- */
socket.on("chat message", (data) => {
  renderMessage(data);
});

/* ---------- Rendering ---------- */
function renderMessage({ user, text, time, senderId }) {
  if (senderId === "system") {
    const li = pill(`${text} • ${time}`);
    messagesEl.appendChild(li);
    scrollBottom();
    return;
  }

  const isMe = senderId === myId;

  const row = document.createElement("li");
  row.className = "row " + (isMe ? "right" : "left");

  if (!isMe) {
    const av = document.createElement("div");
    av.className = "small-avatar";
    av.textContent = initials(user);
    av.style.background = gradientFor(user);
    row.appendChild(av);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble " + (isMe ? "me" : "other");

  const meta = document.createElement("div");
  meta.className = "meta";
  const nm = document.createElement("span");
  nm.className = "name";
  nm.textContent = user;
  const tm = document.createElement("span");
  tm.className = "time";
  tm.textContent = time;

  meta.appendChild(nm);
  meta.appendChild(tm);

  const body = document.createElement("div");
  body.textContent = text;

  bubble.appendChild(meta);
  bubble.appendChild(body);
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollBottom();
}

function pill(text){
  const li = document.createElement("li");
  li.className = "row center";
  const p = document.createElement("div");
  p.className = "system";
  p.textContent = text;
  li.appendChild(p);
  return li;
}

function scrollBottom(){ messagesEl.scrollTop = messagesEl.scrollHeight; }
function initials(name){ return (name||"").split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()||"").join(""); }
function gradientFor(seed){
  // deterministic pastel gradient from name
  let hash = 0;
  for (let i=0;i<seed.length;i++) hash = (hash*31 + seed.charCodeAt(i)) >>> 0;
  const h1 = hash % 360;
  const h2 = (hash*7 % 360);
  return `linear-gradient(135deg, hsl(${h1} 70% 60%), hsl(${h2} 70% 65%))`;
}

/* date pill on load */
messagesEl.appendChild(pill(new Date().toLocaleDateString()));
