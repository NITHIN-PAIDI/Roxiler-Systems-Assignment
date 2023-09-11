const fs = require("fs");
const crypto = require("crypto");
const io = require("socket.io-client");

const rawData = fs.readFileSync("./node_modules/data.json");
const data = JSON.parse(rawData);

const serverUrl = "http://localhost:3000/";
const socket = io(serverUrl, {
  transports: ["websocket"],
});

function getRandomValue(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

function generateSecretKey(name, origin, destination) {
  const inputString = `${name}-${origin}-${destination}`;
  const hash = crypto.createHash("sha256");
  hash.update(inputString);
  return hash.digest("hex");
}

function encryptMessage(message, secretKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-ctr",
    Buffer.from(secretKey, "hex"),
    iv
  );
  let encryptedMessage = cipher.update(JSON.stringify(message), "utf8", "hex");
  encryptedMessage += cipher.final("hex");
  return iv.toString("hex") + encryptedMessage;
}

function generateRandomMessages() {
  const numMessages = Math.floor(Math.random() * (499 - 49 + 1)) + 49;
  const messages = [];

  for (let i = 0; i < numMessages; i++) {
    const name = getRandomValue(data.names);
    const origin = getRandomValue(data.cities);
    const destination = getRandomValue(data.cities);

    const originalMessage = {
      name,
      origin,
      destination,
    };

    const secretKey = generateSecretKey(name, origin, destination);
    console.log(secretKey);
    const encryptedMessage = encryptMessage(originalMessage, secretKey);

    const messageWithKey = {
      ...originalMessage,
      secret_key: secretKey,
      encrypted_message: encryptedMessage,
    };

    messages.push(messageWithKey);
  }

  return messages;
}

function emitDataStream() {
  const messages = generateRandomMessages();
  const messageStream = messages
    .map((message) => message.encrypted_message)
    .join("|");
  socket.emit("data-stream", messageStream);
  console.log("Emitted Data Stream:", messageStream);
}

socket.on("connect", () => {
  console.log("Emitter connected to listener");
  emitDataStream();
  setInterval(emitDataStream, 10000);
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
});

socket.on("connect_timeout", () => {
  console.error("Connection timeout");
});
