const socket = io();

// Ask for username once when page loads
let username = localStorage.getItem("chat-username") || prompt("Enter your name:");
if (!username || !username.trim()) username = "Anonymous";
username = username.trim();
localStorage.setItem("chat-username", username);

// Show username in header
document.getElementById("username-display").textContent = `You: ${username}`;

// Send to server that we joined
socket.emit("join", username);

// For knowing which messages are mine
let myId = null;
socket.on("connect", () => {
  myId = socket.id;
});

// DOM references
const form = document.getElementById("form");
const input = document.getElementById("msg");
const list = document.getElementById("messages");

// Auto-scroll helper
function scrollToBottom() {
  list.scrollTop = list.scrollHeight;
}

// Render a message bubble
function renderMessage({ user, text, time, senderId }) {
  const isSystem = senderId === "system";
  const isMe = !isSystem && senderId === myId;

  const row = document.createElement("li");
  row.className = "row " + (isSystem ? "center" : isMe ? "right" : "left");

  const bubble = document.createElement("div");
  bubble.className = "msg " + (isSystem ? "system" : isMe ? "me" : "other");

  // content
  const safeUser = (user || "Unknown").toString();
  const safeText = (text || "").toString();

  if (isSystem) {
    bubble.innerHTML = `<strong>${safeUser}</strong> • ${safeText}<span class="meta">${time}</span>`;
  } else {
    bubble.innerHTML = `<strong>${safeUser}</strong><br>${safeText}<span class="meta">${time}</span>`;
  }

  row.appendChild(bubble);
  list.appendChild(row);
  scrollToBottom();
}

// Receive chat messages
socket.on("chat message", (data) => {
  renderMessage(data);
});

// Send a message
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value;
  if (!text || !text.trim()) return;
  socket.emit("chat message", { text });
  input.value = "";
  input.focus();
});
