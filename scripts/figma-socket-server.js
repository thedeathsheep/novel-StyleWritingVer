/**
 * Standalone WebSocket server for Talk To Figma MCP Plugin.
 * Same protocol as cursor-talk-to-figma-socket, runs with Node (no Bun required).
 * Usage: node scripts/figma-socket-server.js
 *        or: pnpm run figma-socket
 */

const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.FIGMA_SOCKET_PORT) || 3055;
const channels = new Map();

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Access-Control-Allow-Origin": "*",
  });
  res.end("WebSocket server running");
});

const wss = new WebSocketServer({ server, path: "/" });

wss.on("connection", (ws, req) => {
  console.log("New client connected");

  ws.send(
    JSON.stringify({
      type: "system",
      message: "Please join a channel to start chatting",
    })
  );

  ws.on("close", () => {
    channels.forEach((clients) => clients.delete(ws));
    console.log("Client disconnected");
  });

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      console.log("\n=== Received message from client ===");
      console.log(`Type: ${data.type}, Channel: ${data.channel || "N/A"}`);
      if (data.message?.command) {
        console.log(`Command: ${data.message.command}, ID: ${data.id}`);
      } else if (data.message?.result) {
        console.log(`Response: ID: ${data.id}, Has Result: ${!!data.message.result}`);
      }

      if (data.type === "join") {
        const channelName = data.channel;
        if (!channelName || typeof channelName !== "string") {
          ws.send(JSON.stringify({ type: "error", message: "Channel name is required" }));
          return;
        }
        if (!channels.has(channelName)) {
          channels.set(channelName, new Set());
        }
        const channelClients = channels.get(channelName);
        channelClients.add(ws);
        console.log(`✓ Client joined channel "${channelName}" (${channelClients.size} total clients)`);
        ws.send(
          JSON.stringify({
            type: "system",
            message: `Joined channel: ${channelName}`,
            channel: channelName,
          })
        );
        ws.send(
          JSON.stringify({
            type: "system",
            message: { id: data.id, result: "Connected to channel: " + channelName },
            channel: channelName,
          })
        );
        channelClients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(
              JSON.stringify({
                type: "system",
                message: "A new user has joined the channel",
                channel: channelName,
              })
            );
          }
        });
        return;
      }

      if (data.type === "message") {
        const channelName = data.channel;
        if (!channelName || typeof channelName !== "string") {
          ws.send(JSON.stringify({ type: "error", message: "Channel name is required" }));
          return;
        }
        const channelClients = channels.get(channelName);
        if (!channelClients || !channelClients.has(ws)) {
          ws.send(JSON.stringify({ type: "error", message: "You must join the channel first" }));
          return;
        }
        let broadcastCount = 0;
        channelClients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            broadcastCount++;
            client.send(
              JSON.stringify({
                type: "broadcast",
                message: data.message,
                sender: "peer",
                channel: channelName,
              })
            );
          }
        });
        if (broadcastCount === 0) {
          console.log(`⚠ No other clients in channel "${channelName}" to receive message!`);
        } else {
          console.log(`✓ Broadcast to ${broadcastCount} peer(s) in channel "${channelName}"`);
        }
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`Figma plugin: Connect with port ${PORT}`);
});
