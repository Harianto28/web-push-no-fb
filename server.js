const express = require("express");
const webpush = require("web-push");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8090;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Setup database
const db = new sqlite3.Database("./subscriptions.db");
db.run(
  `CREATE TABLE IF NOT EXISTS subscriptions (endpoint TEXT PRIMARY KEY, data TEXT)`
);

// VAPID from vapid.json file
let vapidPublicKey, vapidPrivateKey;
try {
  const vapidKeys = JSON.parse(fs.readFileSync("./vapid.json", "utf8"));
  vapidPublicKey = vapidKeys.publicKey;
  vapidPrivateKey = vapidKeys.privateKey;
} catch (error) {
  console.error("❌ Error reading vapid.json file:", error.message);
  process.exit(1);
}

const vapidEmail =
  process.env.VAPID_EMAIL || "mailto:jeremytelegram11@gmail.com";

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error("❌ Missing VAPID keys in vapid.json file.");
  process.exit(1);
}

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

// Routes
app.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

app.get("/count", (req, res) => {
  db.get("SELECT COUNT(*) AS count FROM subscriptions", (err, row) => {
    if (err) return res.status(500).send(err.message);
    res.json({ count: row.count });
  });
});

app.post("/subscribe", (req, res) => {
  const sub = req.body;
  db.run(
    "INSERT OR REPLACE INTO subscriptions (endpoint, data) VALUES (?, ?)",
    [sub.endpoint, JSON.stringify(sub)]
  );
  res.status(201).json({ message: "Subscribed" });
});

app.post("/send", (req, res) => {
  const { title, body, url } = req.body; // <- ADD url
  db.all("SELECT data FROM subscriptions", [], (err, rows) => {
    if (err) return res.status(500).send(err.message);
    rows.forEach((row) => {
      const subscription = JSON.parse(row.data);
      webpush
        .sendNotification(subscription, JSON.stringify({ title, body, url })) // <- INCLUDE url
        .catch((e) => console.error(e));
    });
    res.json({ message: "Notifications sent" });
  });
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
