const express = require("express");
const webpush = require("web-push");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
const PORT = 8090;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Setup database
const db = new sqlite3.Database("./subscriptions.db");
db.run(
  `CREATE TABLE IF NOT EXISTS subscriptions (endpoint TEXT PRIMARY KEY, data TEXT)`
);

// VAPID keys
const vapidKeysPath = "./vapid.json";
let vapidKeys;
if (fs.existsSync(vapidKeysPath)) {
  vapidKeys = JSON.parse(fs.readFileSync(vapidKeysPath));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  fs.writeFileSync(vapidKeysPath, JSON.stringify(vapidKeys));
}

webpush.setVapidDetails(
  "mailto:test@example.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Replace placeholder in main.js
const mainJsPath = path.join(__dirname, "public", "main.js");
let mainJs = fs.readFileSync(mainJsPath, "utf8");
mainJs = mainJs.replace(
  "<REPLACE_WITH_PUBLIC_KEY>",
  JSON.stringify(vapidKeys.publicKey)
);
fs.writeFileSync(mainJsPath, mainJs);

// Routes
app.post("/subscribe", (req, res) => {
  const sub = req.body;
  db.run(
    "INSERT OR REPLACE INTO subscriptions (endpoint, data) VALUES (?, ?)",
    [sub.endpoint, JSON.stringify(sub)]
  );
  res.status(201).json({ message: "Subscribed" });
});

app.post("/send", (req, res) => {
  const { title, body } = req.body;
  db.all("SELECT data FROM subscriptions", [], (err, rows) => {
    if (err) return res.status(500).send(err.message);
    rows.forEach((row) => {
      const subscription = JSON.parse(row.data);
      webpush
        .sendNotification(subscription, JSON.stringify({ title, body }))
        .catch((e) => console.error(e));
    });
    res.json({ message: "Notifications sent" });
  });
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
