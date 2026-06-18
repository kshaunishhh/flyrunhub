require("dotenv").config({ path: __dirname + "/.env" });

const mongoose = require("mongoose");
const Athlete=require("./models/Athlete");
const express = require("express");
const app = express();
const axios = require("axios");

const db = require("./firestore");

app.set("trust proxy",1);
let cachedLeaderboards = {};

if (process.env.NODE_ENV === "production") {
  setInterval(() => {
    axios
      .get("https://flyrunhub.onrender.com/health")
      .then(() => console.log("Pinged self"))
      .catch(() => {});
  }, 1000 * 60 * 5); // every 5 minutes
}


async function refreshStravaToken(athlete) {
  const response = await axios.post(
    "https://www.strava.com/oauth/token",
    {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: athlete.refreshToken,
    }
  );

  const {
    access_token,
    refresh_token,
    expires_at,
  } = response.data;

  athlete.accessToken = access_token;
  athlete.refreshToken = refresh_token;
  athlete.tokenExpiresAt = expires_at;

  await athlete.save();

  return access_token;
}

//Helper functions

function normalizeType(type) {
  // Run group
  if (["Run", "TrailRun"].includes(type)) return "Run";

  // Walk group
  if (["Walk", "Hike"].includes(type)) return "Walk";

  // Ride group
  if (
    [
      "Ride",
      "MountainBikeRide",
      "GravelRide",
      "EBikeRide",
      "EMountainBikeRide",
      "VirtualRide"
    ].includes(type)
  ) return "Ride";

  return null;
}

async function buildWeeklyCommunityLeaderboard() {

  const athletes = await Athlete.find({});
  const { weekStart, weekEnd } = getCurrentWeekRange();

  let leaderboard = [];

  for (const athlete of athletes) {

    try {
      let accessToken = athlete.accessToken;

      if (athlete.tokenExpiresAt * 1000 < Date.now()) {
        accessToken = await refreshStravaToken(athlete);
      }

      const response = await axios.get(
        "https://www.strava.com/api/v3/athlete/activities",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            after: Math.floor(weekStart.getTime() / 1000),
            before: Math.floor(weekEnd.getTime() / 1000),
            per_page: 200,
          },
        }
      );

      const weeklyTotals = {
        Run: 0,
        Walk: 0,
        Ride: 0
      };

      const weeklyCounts = {
        Run: 0,
        Walk: 0,
        Ride: 0
      };

      response.data.forEach(a => {
        const type = normalizeType(a.type);
        if (!type) return;

        weeklyTotals[type] += a.distance / 1000;
        weeklyCounts[type] += 1;
      });

      leaderboard.push({
        athleteId: athlete.athleteId,
        name: `${athlete.firstname} ${athlete.lastname}`,
        weeklyTotals,
        weeklyCounts
      });

    } catch (err) {
  console.log(
    "Skipping athlete:",
    athlete.firstname,
    err.message
  );
  continue;
}
  }

  return leaderboard;
}

async function fetchAllRuns(accessToken, selectedTypes, maxPages = 10) {
  let all = [];
  let page = 1;

  while (page <= maxPages) {
    const res = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { per_page: 100, page },
      }
    );

    if (!res.data || res.data.length === 0) break;

    all.push(...res.data);
    page++;
  }

  return all.filter(a =>
    selectedTypes.includes(normalizeType(a.type))
  );
}


function formatWeekRange(date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const year = start.getFullYear();
  const month = start.toLocaleString("en-US", { month: "short" });

  return `${year}/${month} (${start.getDate()}-${end.getDate()})`;
}

function generateWeeks(count = 12) {
  const weeks = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);

    const weekStart = new Date(d);
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    weeks.push({
      label: formatWeekRange(d),
      total_km: 0,
      total_time_sec: 0,
      startDate: weekStart
    });
  }

  return weeks;
}

function getCurrentWeekRange() {
  const nowUTC = new Date();

  // IST = UTC + 5h 30m
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;

  const nowIST = new Date(nowUTC.getTime() + IST_OFFSET);

  const day = nowIST.getUTCDay(); // use UTC methods
  const diff = day === 0 ? -6 : 1 - day;

  const weekStartIST = new Date(nowIST);
  weekStartIST.setUTCDate(nowIST.getUTCDate() + diff);
  weekStartIST.setUTCHours(0, 0, 0, 0);

  const weekEndIST = new Date(weekStartIST);
  weekEndIST.setUTCDate(weekStartIST.getUTCDate() + 7);

  // Convert back to real UTC timestamps
  const weekStart = new Date(weekStartIST.getTime() - IST_OFFSET);
  const weekEnd = new Date(weekEndIST.getTime() - IST_OFFSET);

  return { weekStart, weekEnd };
}

function getWeekKey(dateString) {
  const date = new Date(dateString);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));

  return monday.toISOString().split("T")[0]; // YYYY-MM-DD
}

function getWeekLabel(dateString) {
  const start = new Date(dateString);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const month = start.toLocaleString("en-US", {
    month: "short"
  });

  return `${month} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
}


function formatSecondsToHHMMSS(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}


function paginate(array, page = 1, limit = 10) {
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    page,
    limit,
    total: array.length,
    totalPages: Math.ceil(array.length / limit),
    results: array.slice(start, end),
  };
}

function formatRun(run) {
  const distanceKm = run.distance / 1000;

  // race detection
  let raceType = "OTHER";
  if (distanceKm >= 4.5 && distanceKm <= 5.5) {
    raceType = "5K";
  } else if (distanceKm >= 9.7 && distanceKm <= 10.5) {
    raceType = "10K";
  } else if (distanceKm >= 20.0 && distanceKm <= 22.0) {
    raceType = "HM";
  } else if (distanceKm >= 40.0 && distanceKm <= 43.0) {
    raceType = "FM";
  }
    else if (distanceKm >= 49.0) {
    raceType = "ULTRA";
  }

  // ✅ DATE FORMATTING (CORRECT PLACE)
  const raceDate = new Date(run.start_date_local).toLocaleDateString(
    "en-GB",
    { day: "2-digit", month: "short", year: "numeric" }
  );

  // time formatting
  const totalSeconds = run.moving_time;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const timeFormatted = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // pace
  const paceSecondsPerKm = totalSeconds / distanceKm;
  const paceMin = Math.floor(paceSecondsPerKm / 60);
  const paceSec = Math.round(paceSecondsPerKm % 60);
  const paceFormatted = `${paceMin}:${paceSec
    .toString()
    .padStart(2, "0")} min/km`;

  // ✅ SINGLE RETURN (IMPORTANT)
  return {
    id: run.id,
    name: run.name,
    date: raceDate,
    distance_km: distanceKm.toFixed(2),
    time_seconds: totalSeconds,
    time: timeFormatted,
    pace: paceFormatted,
    raceType,
  };
}



mongoose
  .connect(process.env.MONGO_URI,{
    tls:true,
    tlsAllowInvalidCertificates:true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("Mongo error", err));



app.use(express.json());
app.use(express.urlencoded({extended:true}));


const session = require("express-session");
const MongoStore = require("connect-mongo");


//middleware
app.use(
  session({
    name: "flyrunhub.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
    }),
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

const path = require("path");


const requireAuth = async (req, res, next) => {
  if (!req.session.isAuthenticated) {
    return res.status(401).json({ error: "Not authenticated with Strava" });
  }

  const athlete = await Athlete.findOne({
    athleteId: req.session.athleteId,
  });

  if (!athlete) {
    return res.status(401).json({ error: "Athlete not found" });
  }

  if (athlete.tokenExpiresAt * 1000 < Date.now()) {
    await refreshStravaToken(athlete);
  }

  req.accessToken = athlete.accessToken;
  next();
};


app.get("/auth/status", async (req, res) => {
  console.log("SESSION", req.session);

  // ❌ No session → not authenticated
  if (!req.session.isAuthenticated || !req.session.athleteId) {
    return res.json({ authenticated: false });
  }

  const athlete = await Athlete.findOne({
    athleteId: req.session.athleteId,
  });

  // ❌ Athlete deleted from DB → destroy session
  if (!athlete) {
    console.log("Athlete not found. Destroying session.");

    req.session.destroy(() => {
      res.clearCookie("flyrunhub.sid");
      return res.json({ authenticated: false });
    });

    return;
  }

  // ✅ Valid session + valid athlete
  res.json({
    authenticated: true,
    athlete: {
      firstname: athlete.firstname,
      lastname: athlete.lastname,
      athleteId: athlete.athleteId,
    },
  });
});



// Step 1: Redirect user to Strava login
app.get("/auth/strava", (req, res) => {
  const stravaAuthUrl =
    "https://www.strava.com/oauth/authorize" +
    `?client_id=${process.env.STRAVA_CLIENT_ID}` +
    "&response_type=code" +
    "&redirect_uri=https://flyrunhub.onrender.com/callback" +
    "&scope=read,profile:read_all,activity:read_all" +
    "&approval_prompt=force";


  res.redirect(stravaAuthUrl);
});

// Step 2: Strava redirects back here with code
app.get("/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error("Strava auth error:", error);
    return res.redirect("/");
  }

  if (!code) {
    return res.status(400).send("No authorization code");
  }

  try {
    const tokenResponse = await axios.post(
      "https://www.strava.com/oauth/token",
      {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }
    );

    const {
      access_token,
      refresh_token,
      expires_at,
      athlete,
    } = tokenResponse.data;

    await Athlete.findOneAndUpdate(
      { athleteId: athlete.id },
      {
        athleteId: athlete.id,
        username: athlete.username,
        firstname: athlete.firstname,
        lastname: athlete.lastname,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expires_at,
      },
      { upsert: true, new: true }
    );


    // 🔥 SAVE PUBLIC ATHLETE DATA TO FIRESTORE (SAFE)
await db
  .collection("athletes_public")
  .doc(String(athlete.id)) // athleteId = documentId
  .set(
    {
      firstname: athlete.firstname,
      lastname: athlete.lastname,
      username: athlete.username || null,
      joinedAt: new Date(),
    },
    { merge: true }
  );


    // ✅ SINGLE regenerate (ONLY ONCE)
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regenerate failed:", err);
        return res.status(500).send("Session error");
      }

      req.session.athleteId = athlete.id;
      req.session.isAuthenticated = true;

      req.session.save((err) => {
        if (err) {
          console.error("Session save failed:", err);
          return res.status(500).send("Session save error");
        }

        // ✅ FRONTEND REDIRECT (CORRECT)
        res.redirect("/");
      });
    });

  } catch (err) {
    console.error("OAuth callback failed:", err.response?.data || err.message);
    res.status(500).send("Authentication failed");
  }
});



app.get("/activities", requireAuth,async (req, res) => {
  try {
    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
        },
        params: {
          per_page: 50,
        },
      }
    );

    // STEP A: only RUNS
    const runsOnly = response.data.filter(activity =>
  ["Run", "Walk", "Ride"].includes(
    normalizeType(activity.type)
  )
);

    const formattedRuns = runsOnly.map((run) => {
      // distance in km (number)
      const distanceKm = run.distance / 1000;
    
      // 🅲 STEP C: race detection with tolerance
      let raceType = "OTHER";
      if (distanceKm >= 4.5 && distanceKm <= 5.5) {
        raceType = "5K";
      } else if (distanceKm >= 9.7 && distanceKm <= 10.5) {
        raceType = "10K";
      }
    
      // time formatting
      const raceDate = run.start_date_local.split("T")[0];
      const totalSeconds = run.moving_time;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
    
      const timeFormatted = `${hours
        .toString()
        .padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    
      // pace calculation (min/km)
      const paceSecondsPerKm = totalSeconds / distanceKm;
      const paceMin = Math.floor(paceSecondsPerKm / 60);
      const paceSec = Math.round(paceSecondsPerKm % 60);
    
      const paceFormatted = `${paceMin}:${paceSec
        .toString()
        .padStart(2, "0")} min/km`;
    
      // ✅ single clean return
      return {
        id: run.id,
        name: run.name,
        date: raceDate,
        distance_km: distanceKm.toFixed(2),
        time: timeFormatted,
        pace: paceFormatted,
        raceType: raceType,
      };
    });
    

    res.json(formattedRuns);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});



app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});


app.get("/leaderboard/weekly", requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    // 1️⃣ Fetch ALL runs (important for old data)
    const runsOnly = await fetchAllRuns(
  req.accessToken,
  ["Run", "Walk", "Ride"],
  10
);

    // 2️⃣ Generate weeks (even empty ones)
    const weeks = generateWeeks(30);

    // 3️⃣ Add runs into weeks
    runsOnly.forEach(run => {
      const runDate = new Date(run.start_date_local);

      weeks.forEach(week => {
        const start = new Date(week.startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        if (runDate >= start && runDate <= end) {
          week.total_km += run.distance / 1000;
          week.total_time_sec += run.moving_time;
        }

      });
    });

    // 4️⃣ Format output (NO rank, 0 stays 0)
    const weeklyData = weeks.map(w => ({
      week: w.label,
      total_km: w.total_km === 0 ? "0" : w.total_km.toFixed(2),
      total_time:
        w.total_time_sec === 0
          ? "0"
          : formatSecondsToHHMMSS(w.total_time_sec)
    }));

    // 5️⃣ Paginate
    res.json(paginate(weeklyData, page, limit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate weekly leaderboard" });
  }
});





app.get("/leaderboard/5k",requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;


  try {

     const runsOnly = await fetchAllRuns(
  req.accessToken,
  ["Run", "Walk", "Ride"],
  10
);
    const formatted = runsOnly.map(formatRun);

    // keep only 5K by tolerance
    const fiveKs = formatted.filter(r => r.raceType === "5K");

    // sort by fastest time
    fiveKs.sort((a, b) => a.time_seconds - b.time_seconds);

    // rank
    const leaderboard = fiveKs.map((r, idx) => ({
      rank: idx + 1,
      name: r.name,
      date: r.date,
      distance_km: r.distance_km,
      time: r.time,
      pace: r.pace,
    }));

    res.json(paginate(leaderboard, page, limit));
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to generate 5K leaderboard" });
  }
});

app.get("/leaderboard/10k",requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;


  try {
    

     const runsOnly = await fetchAllRuns(
  req.accessToken,
  ["Run", "Walk", "Ride"],
  10
);
    const formatted = runsOnly.map(formatRun);

    // keep only 10K by tolerance
    const tenKs = formatted.filter(r => r.raceType === "10K");

    // sort by fastest time
    tenKs.sort((a, b) => a.time_seconds - b.time_seconds);

    // rank
    const leaderboard = tenKs.map((r, idx) => ({
      rank: idx + 1,
      name: r.name,
      date: r.date,
      distance_km: r.distance_km,
      time: r.time,
      pace: r.pace,
    }));

    res.json(paginate(leaderboard, page, limit));
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to generate 10K leaderboard" });
  }
});





app.get("/leaderboard/hm",requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;



  try {
    

     const runsOnly = await fetchAllRuns(
  req.accessToken,
  ["Run", "Walk", "Ride"],
  10
);
    const formatted = runsOnly.map(formatRun);

    const halfMarathons = formatted
      .filter(r => r.raceType === "HM")
      .sort((a, b) => a.time_seconds - b.time_seconds)
      .map((r, idx) => ({
        rank: idx + 1,
        name: r.name,
        date: r.date,
        distance_km: r.distance_km,
        time: r.time,
        pace: r.pace,
      }));

    res.json(paginate(halfMarathons, page, limit));
  } catch (err) {
    res.status(500).json({ error: "Failed to generate HM leaderboard" });
  }
});




app.get("/leaderboard/fm",requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;


  try {
    

     const runsOnly = await fetchAllRuns(
  req.accessToken,
  ["Run", "Walk", "Ride"],
  10
);
    const formatted = runsOnly.map(formatRun);

    const fullMarathons = formatted
      .filter(r => r.raceType === "FM")
      .sort((a, b) => a.time_seconds - b.time_seconds)
      .map((r, idx) => ({
        rank: idx + 1,
        name: r.name,
        date: r.date,
        distance_km: r.distance_km,
        time: r.time,
        pace: r.pace,
      }));

      res.json(paginate(fullMarathons, page, limit));

  } catch (err) {
    res.status(500).json({ error: "Failed to generate FM leaderboard" });
  }
});


app.get("/leaderboard/ULTRA",requireAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;


  try {


     const runsOnly = await fetchAllRuns(
  req.accessToken,
  ["Run", "Walk", "Ride"],
  10
);
    const formatted = runsOnly.map(formatRun);

    const fullMarathons = formatted
      .filter(r => r.raceType === "ULTRA")
      .sort((a, b) => a.time_seconds - b.time_seconds)
      .map((r, idx) => ({
        rank: idx + 1,
        name: r.name,
        date: r.date,
        distance_km: r.distance_km,
        time: r.time,
        pace: r.pace,
      }));

      res.json(paginate(fullMarathons, page, limit));

  } catch (err) {
    res.status(500).json({ error: "Failed to generate ULTRA leaderboard" });
  }
});

app.get("/community/leaderboard/weekly", async (req, res) => {
  try {

    const typesQuery = req.query.types;
    let selectedTypes = ["Run"];

    if (typesQuery) {
      selectedTypes = typesQuery.split(",");
    }

    const now = Date.now();

    // STEP 3: CACHE BASE LEADERBOARD
    if (
      !cachedLeaderboards["base"] ||
      now - cachedLeaderboards["base"].generatedAt > 300000 // 5 minutes
    ) {
      const baseData = await buildWeeklyCommunityLeaderboard();

      cachedLeaderboards["base"] = {
        data: baseData,
        generatedAt: now
      };
    }

    // ✅ THIS IS WHERE YOU PUT const baseData
    const baseData = cachedLeaderboards["base"].data;

    // ✅ THIS IS WHERE YOU PUT const filtered
    const filtered = baseData.map(a => {

      let totalKm = 0;
      let totalCount = 0;

      selectedTypes.forEach(type => {
        totalKm += a.weeklyTotals[type] || 0;
        totalCount += a.weeklyCounts[type] || 0;
      });

return {
  athleteId: a.athleteId,
  name: a.name,
  total_km: Number(totalKm.toFixed(2)),
  runs: totalCount,
  stravaUrl: `https://www.strava.com/athletes/${a.athleteId}`
};

    }).filter(a => a.total_km > 0);

    // SORT + RANK
    filtered.sort((a, b) => b.total_km - a.total_km);

    const ranked = filtered.map((a, i) => ({
      rank: i + 1,
      ...a
    }));

    const weekKey = getWeekKey(new Date());

const snapshotDoc = await db
  .collection("weekly_snapshots")
  .doc(weekKey)
  .get();

if (!snapshotDoc.exists) {
   await db.collection("weekly_snapshots")
      .doc(weekKey)
      .set({
         leaderboard: ranked,
         generatedAt: new Date()
      });
}

    

    res.json(ranked);

  } catch (err) {
    console.error("Community leaderboard error:", err.message);
    res.status(500).json({ error: "Failed to generate leaderboard" });
  }
});

app.get("/community/leaderboard/history", async (req, res) => {
  try {

    const snapshotRef = await db
      .collection("weekly_snapshots")
      .orderBy("generatedAt", "desc")
      .get();

    const history = [];

    snapshotRef.forEach(doc => {
      const data = doc.data();
      history.push({
    weekKey: doc.id,
    label: getWeekLabel(doc.id),
    leaderboard: Array.isArray(data.leaderboard)
      ? data.leaderboard
      : []
});
    });

    res.json(history);

  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// Serve React build
app.use(express.static(path.join(__dirname, "..", "build")));

// ✅ SAFE SPA fallback (Express v5 compatible)
app.use((req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "build", "index.html")
  );
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FlyRunHub backend running on port ${PORT}`);
});