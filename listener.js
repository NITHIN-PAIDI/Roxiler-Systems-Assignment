const io = require("socket.io")(3000);
const crypto = require("crypto");
const secretKey =
  "b9d6b28693f7f5a16880d3c2ecc306c1beb2cb0717f72fd4930041a0cf1db06f";

io.on("connection", (socket) => {
  console.log("Listener connected to emitter");

  socket.on("data-stream", (messageStream) => {
    const encryptedMessages = messageStream.split("|");

    for (const encryptedMessage of encryptedMessages) {
      const decryptedMessage = decryptMessage(encryptedMessage, secretKey);

      if (!decryptedMessage) {
        console.log("Invalid message, skipping.");
        continue;
      }

      console.log("Decrypted Message:", decryptedMessage);
    }
  });

  socket.on("disconnect", () => {
    console.log("Listener disconnected from emitter");
  });
});

function decryptMessage(encryptedMessage, secretKey) {
  try {
    const iv = Buffer.from(encryptedMessage.slice(0, 32), "hex");
    const encrypted = Buffer.from(encryptedMessage.slice(32), "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-ctr",
      Buffer.from(secretKey, "hex"),
      iv
    );

    let decryptedMessage = decipher.update(encrypted, "hex", "utf8");
    decryptedMessage += decipher.final("utf8");

    const decryptedData = JSON.parse(decryptedMessage);
    return decryptedData;
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}

console.log("Listener server is running on port 3001");
