const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const DB_FILE = "./db.json";

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      users: {},
      total: 0,
      today: 0,
      newToday: 0,
      lastDay: new Date().toDateString(),
      logs: []
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/* RESET DIARIO */
function checkDay(db) {
  const today = new Date().toDateString();
  if (db.lastDay !== today) {
    db.today = 0;
    db.newToday = 0;
    db.lastDay = today;
  }
}

/* ENDPOINT PRINCIPAL */
app.post("/ping", (req, res) => {
  try {
    const { userId, username } = req.body;
    if (!userId) return res.status(400).json({ error: "No userId" });

    const db = loadDB();
    checkDay(db);

    const isNewUser = !db.users[userId];

    if (isNewUser) {
      db.users[userId] = {
        username: username || "Unknown",
        firstSeen: Date.now(),
        lastSeen: Date.now()
      };
      db.newToday++;
    } else {
      db.users[userId].lastSeen = Date.now();
    }

    db.total++;
    db.today++;

    db.logs.unshift({
      type: "EXEC",
      userId,
      username,
      time: Date.now(),
      newUser: isNewUser
    });

    if (db.logs.length > 200) db.logs.pop();

    saveDB(db);

    res.json({
      ok: true,
      total: db.total,
      today: db.today,
      newToday: db.newToday
    });

  } catch (e) {
    res.status(500).json({ error: "server error" });
  }
});

/* ENDPOINT PARA EL PANEL */
app.get("/stats", (req, res) => {
  const db = loadDB();
  checkDay(db);

  res.json({
    total: db.total,
    today: db.today,
    newToday: db.newToday,
    online: true,
    logs: db.logs
  });
});

app.listen(PORT, () => {
  console.log("API running on port", PORT);
});
