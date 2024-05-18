const fs = require("fs");
const path = require("path");

const privateMessagesFilePath = path.join(__dirname, "privatMessages.json");
const usersMsgsKeysFilePath = path.join(__dirname, "usersMsgsKeys.json");
const publicMessagesFilePath = path.join(__dirname, "publicMessages.json");

const initializeJSONFiles = () => {
  if (!fs.existsSync(privateMessagesFilePath)) {
    fs.writeFileSync("privatMessages.json", "{}");
    console.log("privatMessages.json created.");
  }

  if (!fs.existsSync(usersMsgsKeysFilePath)) {
    fs.writeFileSync("usersMsgsKeys.json", "{}");
    console.log("usersMsgsKeys.json created.");
  }
};

function addPublicMessage(message) {
  if (!message.id || !message.from) return;
  try {
    let publicMessages;
    if (fs.existsSync(publicMessagesFilePath)) {
      const data = fs.readFileSync(publicMessagesFilePath, "utf8");
      publicMessages = JSON.parse(data);
    } else {
      publicMessages = {};
    }
    if(Object.values(publicMessages).length>=6){
      const listMsgs = Object.values(publicMessages)
      Array(listMsgs).sort(([, a], [, b]) => new Date(a.timestamp) -new Date(b.timestamp));
      const oldMsg = listMsgs[0]
      delete publicMessages[oldMsg.id]
    }
    publicMessages[message.id] = message;
    fs.writeFileSync(
      publicMessagesFilePath,
      JSON.stringify(publicMessages),
      "utf8"
    );
  } catch (error) {
    console.error("Error adding public message:", error);
  }
}



function addPrivatMessage(message) {
  if (!message.id || !message.from || !message.toUser) return;
  initializeJSONFiles();
  let privetMessages = JSON.parse(
    fs.readFileSync(privateMessagesFilePath, "utf-8")
  );
  privetMessages[message.id] = message;
  fs.writeFileSync(
    privateMessagesFilePath,
    JSON.stringify(privetMessages, null, 2)
  );

  let usersMsgsKeys = JSON.parse(
    fs.readFileSync(usersMsgsKeysFilePath, "utf-8")
  );
  if (!usersMsgsKeys[message.from]) {
    usersMsgsKeys[message.from] = [];
  }
  if (!usersMsgsKeys[message.toUser]) {
    usersMsgsKeys[message.toUser] = [];
  }
  usersMsgsKeys[message.from].push(message.id);
  usersMsgsKeys[message.toUser].push(message.id);
  fs.writeFileSync(
    usersMsgsKeysFilePath,
    JSON.stringify(usersMsgsKeys, null, 2)
  );
}

function deletePrivatMessage(from, toUser, messageId) {
  if (
    !fs.existsSync(privateMessagesFilePath) ||
    !fs.existsSync(publicMessagesFilePath)
  )
    return;
  let privetMessages = JSON.parse(
    fs.readFileSync(privateMessagesFilePath, "utf-8")
  );
  if (!privetMessages[messageId] || privetMessages[messageId].from !== from)
    return;
  delete privetMessages[messageId];
  fs.writeFileSync(
    privateMessagesFilePath,
    JSON.stringify(privetMessages, null, 2)
  );

  let usersMsgsKeys = JSON.parse(
    fs.readFileSync(usersMsgsKeysFilePath, "utf-8")
  );
  if (usersMsgsKeys[from]) {
    usersMsgsKeys[from].filter((key) => key !== messageId);
  }
  if (usersMsgsKeys[toUser]) {
    usersMsgsKeys[toUser].filter((key) => key !== messageId);
  }
  fs.writeFileSync(
    usersMsgsKeysFilePath,
    JSON.stringify(usersMsgsKeys, null, 2)
  );
}



function deletePublicMessage(from, messageId) {
  if (!from || !messageId) return;
  if (!fs.existsSync(publicMessagesFilePath)) return;
  let publicMessages = JSON.parse(
    fs.readFileSync(publicMessagesFilePath, "utf-8")
  );
  if (!publicMessages || !publicMessages[messageId]) {
    console.log("public msg not found");
    return;
  }
  if (publicMessages[messageId].from !== from) {
    return;
  }
  delete publicMessages[messageId];
  fs.writeFileSync(
    publicMessagesFilePath,
    JSON.stringify(publicMessages),
    null,
    2
  );
}


function fetchMessages(index, privetChatName, user) {
  let res = [];
  try {
    if (!privetChatName && fs.existsSync(publicMessagesFilePath)) {
      const allPublicMessaegs = JSON.parse(
        fs.readFileSync(publicMessagesFilePath, "utf8")
      );
      if (!allPublicMessaegs) return [];
      Object.values(allPublicMessaegs).forEach((msg) => res.push(msg));
    } else {
      const usersMsgsKeys = JSON.parse(
        fs.readFileSync(usersMsgsKeysFilePath, "utf-8")
      );
      if (!usersMsgsKeys[user]) return [];
      const allPrivateMessages = JSON.parse(
        fs.readFileSync(privateMessagesFilePath, "utf8")
      );
      if (!allPrivateMessages) return [];
      usersMsgsKeys[user].map((key) => {
        const msg = allPrivateMessages[key];
        if (msg&&(msg.toUser === privetChatName || msg.from === privetChatName))
          res.push(msg);
      });
    }
    Array(res).sort(([, a], [, b]) => new Date(a.timestamp) -new Date(b.timestamp));
    if (index) return res.slice(index, index + 30);
    return res;
  } catch (e) {
    console.log(`error try get ${privetChatName?privetChatName: "public"} messages:`, e);
  }
}



function fetchUserChats(user) {
  initializeJSONFiles();
  const chatsNames = new Set();
  const allUserMsgs = [];
  try {
    const usersMsgsKeys = JSON.parse(
      fs.readFileSync(usersMsgsKeysFilePath, "utf-8")
    );
    if (!usersMsgsKeys[user]) return [];
    const allPrivateMessages = JSON.parse(
      fs.readFileSync(privateMessagesFilePath, "utf8")
    );
    if (!allPrivateMessages) return [];
    usersMsgsKeys[user].map((key) => allUserMsgs.push(allPrivateMessages[key]));
    allUserMsgs.map((msg) => {
      if (msg&&msg.from === user) chatsNames.add(msg.toUser);
      else if (msg&&msg.toUser === user) chatsNames.add(msg.from);
    });
    const res = [];
    chatsNames.forEach((chat) => res.push(chat));
    return res;
  } catch (e) {
    console.log("error try get chats names:", e);
  }
}


module.exports = {
  addPublicMessage,
  fetchMessages,
  addPrivatMessage,
  deletePrivatMessage,
  deletePublicMessage,
  fetchUserChats,
};
