require("dotenv").config({ path: __dirname + "/.env" });

const mongoose = require("mongoose");
const Athlete=require("./models/Athlete");
const express = require("express");
const app = express();
const axios = require("axios");

app.set("trust proxy",1);


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
async function fetchAllRuns(accessToken, maxPages = 10) {
  let allRuns = [];
  let page = 1;

  while (page <= maxPages) {
    const res = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          per_page: 100,
          page,
        },
      }
    );

    if (!res.data || res.data.length === 0) break;

    allRuns.push(...res.data);
    page++;
  }

  // only runs
  return allRuns.filter(activity => activity.type === "Run");
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
  const now = new Date();
  const day = now.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);

  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

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
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = date.toLocaleString("en-US", { month: "short" });

  const day = date.getDate();
  const weekOfMonth = Math.ceil(day / 7);

  return `${year}/${month}/${weekOfMonth}`;
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
  } else if (distanceKm >= 41.0 && distanceKm <= 43.0) {
    raceType = "FM";
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
  console.log("SESSION",req.session);

  if (!req.session.isAuthenticated) {
    return res.json({ authenticated: false });
  }

  const athlete = await Athlete.findOne({
    athleteId: req.session.athleteId,
  });

  res.json({
    authenticated: true,
    athlete,
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
    const runsOnly = response.data.filter(
      (activity) => activity.type === "Run"
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
    const runsOnly = await fetchAllRuns(req.accessToken, 10);

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
    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: { Authorization: `Bearer ${req.accessToken}` },
        params: { per_page: 100 },
      }
    );

    const runsOnly = await fetchAllRuns(req.accessToken, 10);
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
    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: { Authorization: `Bearer ${req.accessToken}` },
        params: { per_page: 100 },
      }
    );

    const runsOnly = await fetchAllRuns(req.accessToken, 10);
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
    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: { Authorization: `Bearer ${req.accessToken}` },
        params: { per_page: 100 },
      }
    );

    const runsOnly = await fetchAllRuns(req.accessToken, 10);
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
    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: { Authorization: `Bearer ${req.accessToken}` },
        params: { per_page: 100 },
      }
    );

    const runsOnly = await fetchAllRuns(req.accessToken, 10);
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

app.get("/community/leaderboard/weekly", requireAuth,async (req, res) => {
  try {
    const athletes = await Athlete.find({});
    const { weekStart, weekEnd } = getCurrentWeekRange();

    let leaderboard = [];

    for (const athlete of athletes) {
      let accessToken = athlete.accessToken;

      if (athlete.tokenExpiresAt * 1000 < Date.now()) {
      accessToken = await refreshStravaToken(athlete);
      }

      const response = await axios.get(
        "https://www.strava.com/api/v3/athlete/activities",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            after: Math.floor(weekStart.getTime() / 1000),
            before: Math.floor(weekEnd.getTime() / 1000),
            per_page: 200,
          },
        }
      );

      const runs = response.data.filter(a => a.type === "Run");

      if (runs.length === 0) continue;

      const totalKm = runs.reduce(
        (sum, run) => sum + run.distance / 1000,
        0
      );

      leaderboard.push({
        athleteId: athlete.athleteId,
        name: `${athlete.firstname} ${athlete.lastname}`,
        total_km: Number(totalKm.toFixed(2)),
        runs: runs.length,
      });
    }

    // sort descending by km
    leaderboard.sort((a, b) => b.total_km - a.total_km);

    // assign rank
    leaderboard = leaderboard.map((a, i) => ({
      rank: i + 1,
      ...a,
    }));

    res.json(leaderboard);
  } catch (err) {
    console.error("Community leaderboard error:", err.message);
    res.status(500).json({ error: "Failed to build community leaderboard" });
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