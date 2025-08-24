const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const timeNow = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

io.on("connection", (socket) => {
  // default until the client sends its name
  socket.data.username = "Guest";

  // client tells us who they are
  socket.on("join", (username) => {
    socket.data.username = (username || "Guest").trim() || "Guest";

    // greet the new user
    socket.emit("chat message", {
      user: "System",
      text: `Welcome, ${socket.data.username}!`,
      time: timeNow(),
      senderId: "system",
    });

    // notify others
    socket.broadcast.emit("chat message", {
      user: "System",
      text: `${socket.data.username} joined the chat`,
      time: timeNow(),
      senderId: "system",
    });
  });

  // typing indicator
  socket.on("typing", (isTyping) => {
    socket.broadcast.emit("typing", {
      user: socket.data.username,
      typing: !!isTyping,
      senderId: socket.id,
    });
  });

  // chat messages
  socket.on("chat message", (payload) => {
    const text = String(payload?.text ?? "").slice(0, 2000);
    if (!text.trim()) return;

    io.emit("chat message", {
      user: socket.data.username,
      text,
      time: timeNow(),
      senderId: socket.id,
    });
  });

  // disconnect
  socket.on("disconnect", () => {
    io.emit("chat message", {
      user: "System",
      text: `${socket.data.username} left the chat`,
      time: timeNow(),
      senderId: "system",
    });
    // also clear any lingering typing state
    socket.broadcast.emit("typing", {
      user: socket.data.username,
      typing: false,
      senderId: socket.id,
    });
  });
});

server.listen(5000, () => {
  console.log("🚀 Server running at http://localhost:5000");
});
