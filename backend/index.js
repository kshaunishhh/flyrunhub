require("dotenv").config();
const mongoose = require("mongoose");
const Athlete=require("./models/Athlete");
const express = require("express");
const app = express();
const axios = require("axios");
const cors = require("cors");
app.use(
  cors({
    origin:"https://flyrunhub-1.onrender.com",
    credentials:true,
    methods:["GET","POST"],
  })
);




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

const session = require("express-session");
const MongoStore = require("connect-mongo");


app.set("trust proxy",1);

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
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

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
  const code = req.query.code;

  try {
    const tokenResponse = await axios.post(
      "https://www.strava.com/oauth/token",
      {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
      }
    );



    
  const {
  access_token,
  refresh_token,
  expires_at,
  athlete
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


    req.session.athleteId = athlete.id;
    req.session.isAuthenticated = true;


    req.session.save(()=>{
      res.redirect("https://flyrunhub-1.onrender.com");
    });


  } catch (error) {
    console.error("Strava OAuth Error:", error);
    res.status(500).json({ 
    error: "Strava auth failed",
    details: error.message,
    });
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




app.get("/leaderboard/weekly",requireAuth, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;



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

    // Only RUNS
    const runsOnly = response.data.filter(
      (activity) => activity.type === "Run"
    );

    // Group by week
    const weeklyTotals = {};

    runsOnly.forEach((run) => {
      const weekKey = getWeekKey(run.start_date_local);
      const distanceKm = run.distance / 1000;

      if (!weeklyTotals[weekKey]) {
        weeklyTotals[weekKey] = 0;
      }

      weeklyTotals[weekKey] += distanceKm;
    });

    // Convert to leaderboard array
    const leaderboard = Object.keys(weeklyTotals)
      .map((week) => ({
        week_start: week,
        total_km: weeklyTotals[week].toFixed(2),
      }))
      .sort((a, b) => new Date(b.week_start) - new Date(a.week_start));

    res.json(paginate(leaderboard, page, limit));
    } catch (error) {
    console.error(error.response?.data || error.message);
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

    const runsOnly = response.data.filter(a => a.type === "Run");
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

    const runsOnly = response.data.filter(a => a.type === "Run");
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

    const runsOnly = response.data.filter(a => a.type === "Run");
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

    const runsOnly = response.data.filter(a => a.type === "Run");
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



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FlyRunHub backend running on port ${PORT}`);
});