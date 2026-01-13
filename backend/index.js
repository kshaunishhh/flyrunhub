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



let ACCESS_TOKEN = null;

const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

// Step 1: Redirect user to Strava login
app.get("/auth/strava", (req, res) => {
  const stravaAuthUrl =
    "https://www.strava.com/oauth/authorize" +
    `?client_id=${process.env.CLIENT_ID}` +
    "&response_type=code" +
    "&redirect_uri=http://localhost:5000/callback" +
    "&scope=read,profile:read_all,activity:read_all";
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
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
      }
    );

    ACCESS_TOKEN = tokenResponse.data.access_token;

// redirect back to React app
    res.redirect("http://localhost:3000");


  } catch (error) {
    res.status(500).json({ error: "Strava auth failed" });
  }
});


app.listen(5000, () => {
  console.log("FlyRunHub backend running on http://localhost:5000");
});





app.get("/activities", async (req, res) => {
  if (!ACCESS_TOKEN) {
    return res.status(401).json({ error: "Not authenticated with Strava" });
  }

  try {
    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
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




app.get("/leaderboard/weekly", async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    if (!ACCESS_TOKEN) {
    return res.status(401).json({ error: "Not authenticated with Strava" });
  }

  try {
    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
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





app.get("/leaderboard/5k", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  if (!ACCESS_TOKEN) {
    return res.status(401).json({ error: "Not authenticated with Strava" });
  }

  try {
    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
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

app.get("/leaderboard/10k", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  if (!ACCESS_TOKEN) {
    return res.status(401).json({ error: "Not authenticated with Strava" });
  }

  try {
    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
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





app.get("/leaderboard/hm", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  if (!ACCESS_TOKEN) {
    return res.status(401).json({ error: "Not authenticated with Strava" });
  }

  try {
    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
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




app.get("/leaderboard/fm", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  if (!ACCESS_TOKEN) {
    return res.status(401).json({ error: "Not authenticated with Strava" });
  }

  try {
    const response = await axios.get(
      "https://www.strava.com/api/v3/athlete/activities",
      {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
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
