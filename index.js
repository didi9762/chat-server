const express = require("express");
const { Server } = require("socket.io");
const {
  addPublicMessage,
  addPrivatMessage,
  deletePrivatMessage,
  deletePublicMessage,
  fetchMessages,
  fetchUserChats,
} = require("./handleData");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");

const usersConnected = new Map();
const io = new Server(8080, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
/**
 * @param {express.Request} req
 * @returns {boolean}
 */
function validateConnection(token) {
  if (!token) return null;
  const isValid = validateToken(token);
  return isValid;
}

async function wait(sec) {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}

io.on("connection", function connection(socket) {
  const validUser = socket.handshake.query.userName;
  if (!validUser) {
    console.log("Connection rejected: Invalid request");
    socket.disconnect();
    return;
  }
  socket.id = validUser;
  usersConnected.set(validUser, socket);
  socket.emit("connected", "ok");
  console.log("New connection established:", validUser);

  socket.on("msg", async (msg) => {
    const message = JSON.parse(msg);
    if (!message || !message.content) return;
    message["id"] = uuidv4();
    if (message?.toUser === "") {
      addPublicMessage(message);
      broadcast(message, socket.id, "msg");
    } else {
      if (!usersConnected.has(message.toUser)) {
        addPrivatMessage(message);
      } else {
        try {
          usersConnected
            .get(message.toUser)
            .emit("msg", JSON.stringify(message));
          addPrivatMessage(message);
        } catch (e) {
          console.log("error try send privet message:", e);
        }
      }
    }
    const ack_res = message.toUser ? "msg_ack" : "msg_ack_public";
    socket.emit(
      ack_res,
      JSON.stringify({ messageId: message.id, from: message.from })
    );
  });

  socket.on("delete", (msg) => {
    const message = JSON.parse(msg);
    const { msgId, msgType, toUser } = message;
    if (!msgId && msgType) return;
    if (msgType === "privat") {
      if (!toUser) return;
      deletePrivatMessage(socket.id, toUser, msgId);
      const userToUpdate = usersConnected.get(toUser);
      if (userToUpdate) {
        userToUpdate.emit("delete", JSON.stringify({ msgId: msgId }));
      }
    } else if (msgType === "public") {
      deletePublicMessage(socket.id, msgId);
      broadcast({ msgId: msgId }, socket.id, "delete");
    }
  });

  socket.on("fetch_msgs", (msg) => {
    const message = JSON.parse(msg);
    const { index, chatName } = message;
    if (!index && index !== 0) return;
    if (chatName) {
      const res = fetchMessages(index, chatName, socket.id);
      socket.emit(
        "privat_msgs",
        JSON.stringify({ chatName: chatName, data: res })
      );
    } else {
      const res = fetchMessages(index, null, socket.id);
      socket.emit("public_msgs", JSON.stringify({ data: res }));
    }
  });

  socket.on("fetch_my_chats", () => {
    const res = fetchUserChats(socket.id);
    socket.emit("chats_names", JSON.stringify({ data: res }));
  });

  socket.on("close", (reason) => {
    console.log("Connection closed:", validUser, " - ", reason);
    usersConnected.delete(validUser);
  });
});

function broadcast(msg, id, type) {
  io.sockets.sockets.forEach((socket) => {
    if (socket.connected && socket.id !== id) {
      try {
        socket.emit(`${type}_public`, JSON.stringify(msg));
      } catch (e) {
        console.log(`error try send public message :${e}`);
      }
    }
  });
}

console.log("Server started on port 8080");
