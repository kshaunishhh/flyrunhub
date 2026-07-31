import React, { useState, useEffect, useRef } from "react";
import { toPng } from "html-to-image";
import LeaderboardPoster from "./LeaderboardPoster";
import "./App.css";
import axios from "axios";
axios.defaults.withCredentials = true;
const safeArray = (arr) => Array.isArray(arr) ? arr : [];


function App() {
  const [view, setView] = useState("home"); // home | personal | community
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [data, setData] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [communityData, setCommunityData] = useState([]);
  const [communityView, setCommunityView] = useState("current");
  const [historyData, setHistoryData] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [athlete, setAthlete] = useState(null);
  const [currentType,setCurrentType] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [prevCommunity, setPrevCommunity] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState(["Run"]);
  const [distanceView, setDistanceView] = useState("weekly");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [challengeData, setChallengeData] = useState([]);
  const [challengeMetric, setChallengeMetric] = useState("today");
  const [communityUpdatedAt, setCommunityUpdatedAt] = useState(null);
  const [yourRank, setYourRank] = useState(null);
  const posterRef = useRef(null);
  const posterRef1 = useRef(null);
  const posterRef2 = useRef(null);

  const communityPosterRef = useRef(null);
  const communityPosterRef1 = useRef(null);
  const communityPosterRef2 = useRef(null);
  const [challengeUpdatedAt, setChallengeUpdatedAt] = useState(null);
  const [exportType, setExportType] = useState("");

  const [showOverall, setShowOverall] = useState(false);

const [openCategory, setOpenCategory] = useState(null);

const [search,setSearch]=useState("");

const [challengeResults, setChallengeResults] = useState({
  overall: [],
  categories: [],
});
const [genderFilter, setGenderFilter] = useState({});
const [results,setResults]=useState([]);
const [selectedAthlete,setSelectedAthlete]=useState(null);
const [athleteResult,setAthleteResult]=useState(null);



const getMedal = (rank) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank;
};



useEffect(() => {
  axios
    .get("/auth/status")
    .then(res => {
      if (res.data.authenticated) {
        setIsAuthenticated(true);
        setAthlete(res.data.athlete);
        setShowToast(true);   // just trigger toast
      } else {
        setIsAuthenticated(false);
      }
    })
    .catch(() => {
      setIsAuthenticated(false);
    })
    .finally(() => {
      setAuthChecked(true);
    });
}, []);

useEffect(() => {
  if (showToast) {
    const hide = setTimeout(() => {
      setShowToast(false);
    }, 3500);

    return () => clearTimeout(hide);
  }
}, [showToast]);

const fetchChallengeResults = async () => {
  try {
    setLoading(true);

    const res = await axios.get("/challenge/results");

    setChallengeResults({
      overall: res.data.overall,
      categories: res.data.categories,
    });

    setResults(res.data.search);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};
const fetchAthleteResult = async (athleteId) => {
  try {
    setLoading(true);

    const res = await axios.get(
      `/challenge/results/${athleteId}`
    );

    setAthleteResult(res.data);

    navigate("athleteResult");

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};


const exportChallengeLeaderboard = async (type = exportType) => {

  let poster;

  if (type === "full") {

    poster = {
      ref: posterRef,
      file: `challenge-${selectedDay}-full.png`
    };

  } else if (type === "first") {

    poster = {
      ref: posterRef1,
      file: `challenge-${selectedDay}-first-half.png`
    };

  } else {

    poster = {
      ref: posterRef2,
      file: `challenge-${selectedDay}-second-half.png`
    };

  }

  if (!poster.ref.current) return;

  await new Promise(r => requestAnimationFrame(r));

  const dataUrl = await toPng(
    poster.ref.current,
    {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor:"#0b0b14",
      canvasWidth:1080,
      canvasHeight:poster.ref.current.scrollHeight
    }
  );

  const link=document.createElement("a");

  link.download=poster.file;

  link.href=dataUrl;

  link.click();

setExportType("");
};


const exportCommunityLeaderboard = async (type) => {

  let poster;

  if (type === "full") {

    poster = {
      ref: communityPosterRef,
      file: `${selectedHistory.label}-full.png`
    };

  } else if (type === "first") {

    poster = {
      ref: communityPosterRef1,
      file: `${selectedHistory.label}-first-half.png`
    };

  } else {

    poster = {
      ref: communityPosterRef2,
      file: `${selectedHistory.label}-second-half.png`
    };

  }

  if (!poster.ref.current) return;

  await new Promise(r => requestAnimationFrame(r));

  const dataUrl = await toPng(
    poster.ref.current,
    {
      cacheBust:true,
      pixelRatio:2,
      backgroundColor:"#0b0b14",
      canvasWidth:1080,
      canvasHeight:poster.ref.current.scrollHeight
    }
  );

  const link=document.createElement("a");

  link.download=poster.file;

  link.href=dataUrl;

  link.click();
};
  // Load default leaderboard




  const loadLeaderboard = (type,pageParam=1) => {
    setCurrentType(type);
    let url = "";
    let heading = "";

    switch (type) {
      case "weekly":
        url = "/leaderboard/weekly";
        heading = "Weekly Leaderboard";
        break;
      case "5k":
        url = "/leaderboard/5k";
        heading = "5K Leaderboard";
        break;
      case "10k":
        url = "/leaderboard/10k";
        heading = "10K Leaderboard";
        break;
      case "hm":
        url = "/leaderboard/hm";
        heading = "Half Marathon Leaderboard";
        break;
      case "fm":
        url = "/leaderboard/fm";
        heading = "Full Marathon Leaderboard";
        break;
      case "ULTRA":
        url = "/leaderboard/ULTRA";
        heading = "Ultra Leaderboard";
        break;
      default:
        return;
    }

    setLoading(true);
    axios
  .get(`${url}?page=${pageParam}`)
  .then(res => {
    const rows =
      Array.isArray(res.data?.results)
        ? res.data.results
        : Array.isArray(res.data)
        ? res.data
        : [];

    setData(rows);
    setTotalPages(res.data?.totalPages || 1);
    setTitle(heading);
  })
  .catch(err =>{
    console.error("Leaderboard error:",err);
  })

    .finally(() => setLoading(false));
  };

const navigate = (nextView) => {
  if (window.location.hash !== `#${nextView}`) {
    window.history.pushState({ view: nextView }, "", `#${nextView}`);
  }
  setView(nextView);
};

useEffect(() => {

  axios
    .get("/community/my-rank")
    .then(res => {

      setYourRank(res.data.yourRank);

    })
    .catch(() => {

      setYourRank(null);

    });

}, []);

useEffect(() => {
  const onBack = (e) => {
  const state = e.state;

  if (!state) {
    setView("home");
    return;
  }

  setView(state.view);

  if (state.view === "historyDetail") {
    setSelectedHistory(state.history);
  }
};

  window.addEventListener("popstate", onBack);
  return () => window.removeEventListener("popstate", onBack);
}, []);



useEffect(() => {
  window.history.replaceState({ view: "home" }, "", "#home");
}, []);

useEffect(() => {

  if (!selectedDay) return;

  fetchChallengeLeaderboard(
    `2026-07-0${selectedDay}`
  );

}, [challengeMetric, selectedDay]);


useEffect(() => {
  if (view !== "community") return;

  if (communityView === "current") {
    fetchCommunityLeaderboard();

    const interval = setInterval(fetchCommunityLeaderboard, 60000);

    return () => clearInterval(interval);
  }

  if (communityView === "history") {
    fetchHistory();
  }

}, [view, communityView, selectedTypes, distanceView]);
const fetchHistory = async () => {
  try {
    setLoading(true);

    const res = await axios.get("/community/leaderboard/history");

    setHistoryData(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    setHistoryData([]);
  } finally {
    setLoading(false);
  }
};

const fetchCommunityLeaderboard = async () => {
  try {
    setLoading(true);
    const res = await axios.get(
`/community/leaderboard/weekly?types=${selectedTypes.join(",")}&metric=${distanceView}`
    );
setCommunityUpdatedAt(res.data.generatedAt);

    const newData = Array.isArray(res.data.leaderboard)
  ? res.data.leaderboard
  : [];

setYourRank(res.data.yourRank);

    const animated = newData.map(player => {
      const old = prevCommunity?.find(
  p => p.athleteId === player.athleteId
);

      if (old && old.rank > player.rank) {
        return { ...player, climbed: true };
      }

      return player;
    });

    setPrevCommunity(newData);
    setCommunityData(animated);

  } catch (err) {
    setCommunityData([]);
  } finally {
    setLoading(false);
  }
};

  if (!authChecked) {
  return <p style={{ textAlign: "center" }}>Checking authentication…</p>;
}

const fetchChallengeLeaderboard = async (date) => {

  try {

    setLoading(true);
    
const res = await axios.get(`/challenge/${date}`);

setChallengeUpdatedAt(res.data.generatedAt);

let rows = Array.isArray(res.data)
  ? res.data
  : res.data.leaderboard || [];

    if (challengeMetric === "today") {

      rows.sort((a,b)=>{

        if (b.completedDays !== a.completedDays)
          return b.completedDays - a.completedDays;

        return b.today_km - a.today_km;

      });

    }

    if (challengeMetric === "total") {

      rows.sort((a,b)=>{

        if (b.completedDays !== a.completedDays)
          return b.completedDays - a.completedDays;

        return b.total_km - a.total_km;

      });

    }

    if (challengeMetric === "pace") {

      rows.sort((a,b)=>{

        if (b.completedDays !== a.completedDays)
          return b.completedDays - a.completedDays;

        return a.avg_pace_sec - b.avg_pace_sec;

      });

    }

    rows = rows.map((r,i)=>({
      ...r,
      rank:i+1
    }));

    setChallengeData(rows);

  } finally {

    setLoading(false);

  }

};


const isDayUnlocked = (day) => {

  const nowIST = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata"
    })
  );

  const challengeDate = new Date(`2026-07-0${day}T00:00:00`);

  return nowIST >= challengeDate;
};


const getDayStatus = (day) => {

  const today = new Date();

  const challengeDate = new Date(
    `2026-07-0${day}`
  );

  if (today < challengeDate) {
    return "🔒";
  }

  if (today.toDateString() === challengeDate.toDateString()) {
    return "🔴 Live";
  }

  return "✅ Finished";

};

const challengeDateLabel = selectedDay
  ? `DAY ${selectedDay} • ${new Date(
      `2026-07-${String(selectedDay).padStart(2, "0")}`
    ).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).toUpperCase()}`
  : "";


const splitIndex = Math.ceil(challengeData.length / 2);

const firstHalf = {
  label: challengeDateLabel,
  leaderboard: challengeData.slice(0, splitIndex),
};


const secondHalf = {
  label: challengeDateLabel,
  leaderboard: challengeData.slice(splitIndex),
};

const fullLeaderboard = {
  label: challengeDateLabel,
  leaderboard: challengeData,
};

const communitySplitIndex = Math.ceil(
  selectedHistory?.leaderboard.length / 2
);

const communityFirstHalf = {
  ...selectedHistory,
  leaderboard: selectedHistory?.leaderboard.slice(
    0,
    communitySplitIndex
  )
};

const communitySecondHalf = {
  ...selectedHistory,
  leaderboard: selectedHistory?.leaderboard.slice(
    communitySplitIndex
  )
};



  return (
    <div className="App">
      {showToast && athlete && (
  <div className="toast">
    Connected as {athlete.firstname}
  </div>
)}


      {view === "home" && (

  <>
  <div className="home">
  <div className="hero">
  <h1 className="hero-title">FlyRunHub</h1>

  <p className="hero-tagline">
    Track <span>•</span> Compete <span>•</span> Improve
  </p>

</div>
      {/* 🔗 CONNECT WITH STRAVA */}
{!isAuthenticated && (
  <div style={{ margin: "28px 0" }}>
    <button
      className="connect-btn"
      onClick={() => {
        window.location.href = "/auth/strava";
      }}
    >
      🔗 Connect with Strava
    </button>
  </div>
)}
  <div className="home-actions">

 <div className="card-container">

  <button
    className="card-btn challenge-home"
    onClick={() => {
      navigate("challenges");
    }}
  >
    <span className="card-title">🔥Challenges</span>
    <span className="card-sub">
    </span>
  </button>


  <button
    className="card-btn"
    onClick={() => {
      if (!isAuthenticated){
        alert("Please connect with Strava first");
        return;
      }
      navigate("personal");
      setPage(1);
      loadLeaderboard("weekly", 1);
    }}
  >
    <span className="card-title">🏃Personal Dashboard</span>
    <span className="card-sub">
      
    </span>
  </button>

  <button
    className="card-btn"
    onClick={() => {
      if (!isAuthenticated){
        alert("Please connect with Strava first");
        return;
      }
      navigate("community");
    }}
  >
    <span className="card-title">🏆Community Leaderboard</span>
   <span className="card-sub">
  Your Rank: {yourRank ? `#${yourRank}` : "—"}
</span>
  </button>


</div>

</div>
<div className="app-wrapper">
  <div className="content">
    {/* hero + cards */}
  </div>
</div>
  <footer className="footer">
    ...
  </footer>
</div>


    {/* ✅ FOOTER ONLY ON HOME */}
    <footer className="app-footer">
      <div className="footer-content">
        <p className="footer-title"> FlyRunHub • (Beta)
</p>

        <p className="footer-text">
          FlyRunHub is currently in <strong>beta phase</strong>.  
          Please feel free to give feedback.
        </p>

        <div className="footer-links">
  {/* Email */}
  <a href="mailto:kshaunishgupta1@gmail.com" aria-label="Email">
    <img
      src="/gmail.png"
      alt="Email"
      className="footer-icon"
    />
  </a>

  {/* GitHub */}
  <a
    href="https://github.com/kshaunishhh/flyrunhub"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="GitHub"
  >
    <img
      src="/Github.png"
      alt="GitHub"
      className="footer-icon"
    />
  </a>

  {/* WhatsApp */}
  <a
    href="https://wa.me/919717538449"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="WhatsApp"
  >
    <img
      src="/whatsapp.png"
      alt="WhatsApp"
      className="footer-icon"
    />
  </a>
</div>
    <p className="footer-author">
      Developed by <strong>Kshaunish Gupta</strong>
    </p>


        <p className="footer-version">
          Built with Strava API
        </p>
      </div>
    </footer>
  </>
)}


      {view === "personal" && (
        <div className="leaderboard">
          <h1>{title}</h1>

        <div className="tabs">
  {[
    { key: "weekly", label: "Weekly" },
    { key: "5k", label: "5K" },
    { key: "10k", label: "10K" },
    { key: "hm", label: "HM" },
    { key: "fm", label: "FM" },
    { key: "ULTRA", label: "ULTRA" }

  ].map(tab => (
    <button
      key={tab.key}
      className={`tab ${currentType === tab.key ? "active" : ""}`}
      onClick={() => {
        setPage(1);
        loadLeaderboard(tab.key, 1);
      }}
    >
      {tab.label}
    </button>
  ))}
</div>


          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="table-wrapper">
            <table className="leaderboard-table">
              <thead>
                  <tr>

                    {currentType === "weekly" ? (
                      <>
                        <th>Year/month/Week</th>
                        <th>Total Distance (km)</th>
                        <th>Total Time</th>
                      </>
                    ) : (
                      <>
                        <th>Rank</th>
                        <th>Date</th>
                        <th>Distance (km)</th>
                        <th>Time</th>
                        <th>Pace</th>
                      </>
                    )}
                  </tr>
              </thead>

              <tbody>

                {safeArray(data).map((row, idx) => (
                  <tr key={idx}>

                    {currentType === "weekly" ? (
                      <>
                        <td>{row.week || "-"}</td>
                        <td>{row.total_km || "-"} km</td>
                        <td>{row.total_time || "-"}</td>
                      </>
                    ) : (
                      <>
                        <td>{getMedal((page - 1) * 10 + idx + 1)}</td>
                        <td>{row.date || "-"}</td>
                        <td>{row.distance_km || "-"} km</td>
                        <td>{row.time || "-"}</td>
                        <td>{row.pace || "-"}</td>
                      </>
                    )}
                  </tr>

                ))}
                {safeArray(data).length === 0 && !loading && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center" }}>
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}

         <div className="leaderboard-actions">
  <div className="pagination">
    <button
      disabled={page === 1}
      onClick={() => {
        const newPage = page - 1;
        setPage(newPage);
        loadLeaderboard(currentType, newPage);
      }}
    >
      Previous
    </button>

    <span>Page {page} of {totalPages}</span>

    <button
      disabled={page === totalPages}
      onClick={() => {
        const newPage = page + 1;
        setPage(newPage);
        loadLeaderboard(currentType, newPage);
      }}
    >
      Next
    </button>
  </div>

  <button className="back-btn" onClick={() => navigate("home")}>
    ← Back
  </button>
</div>

        </div>
      )}

      {view === "community" && (
        
        <div className="leaderboard">
          <h1>Community Weekly Leaderboard</h1>
          {communityUpdatedAt && (
  <p className="challenge-updated">
    Last updated:{" "}
    {new Date(communityUpdatedAt).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}{" "}
    IST
  </p>
)}
          <div className="tabs">
  <button
    className={`tab ${communityView === "current" ? "active" : ""}`}
    onClick={() => setCommunityView("current")}
  >
    Live
  </button>

  <button
    className={`tab ${communityView === "history" ? "active" : ""}`}
    onClick={() => setCommunityView("history")}
  >
    History
  </button>
</div>
          {loading && communityView === "current" && (
      <p style={{ textAlign: "center", fontWeight: "bold" }}>
        Loading leaderboard...
      </p>
    )}
    {loading && communityView === "history" && (
  <p style={{ textAlign: "center", fontWeight: "bold" }}>
    Loading history...
  </p>
)}
    {communityView === "current" && (
        <div className="table-wrapper">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Athlete</th>
                <th>
  <div className="challenge-select-wrapper">
    <select
      className="challenge-select"
      value={distanceView}
      onChange={(e) => setDistanceView(e.target.value)}
    >
      <option value="weekly">Weekly KM</option>
      <option value="monthly">Monthly KM</option>
    </select>

    <span className="challenge-arrow">▼</span>
  </div>
</th>
                <th>
  <div className="activity-filter">
    <div
  className="activity-header"
  onClick={() => setShowDropdown(prev => !prev)}
>
  {selectedTypes.length === 1
    ? selectedTypes[0] + "s"
    : "Activities"}

  <span className={`arrow ${showDropdown ? "open" : ""}`}>
    ▾
  </span>
</div>

    {showDropdown && (
      <div className="checkbox-dropdown">
        {["Run", "Walk", "Ride"].map(type => (
          <label key={type}>
            <input
              type="checkbox"
              checked={selectedTypes.includes(type)}
              onChange={(e) => {
                let updated = [...selectedTypes];

                if (e.target.checked) {
                  updated.push(type);
                } else {
                  updated = updated.filter(t => t !== type);
                }

                if (updated.length === 0) {
                  updated = ["Run"]; // fallback
                }

                setSelectedTypes(updated);
              }}
            />
            {type}
          </label>
        ))}
      </div>
    )}
  </div>
</th>
              </tr>
            </thead>
            <tbody>
              {safeArray(communityData).map((row, idx) => (
                <tr
                  key={row.athleteId}
                  className={`leaderboard-row ${row.climbed ? "rank-up" : ""}`}
                >
                  <td>{getMedal(row.rank)}</td>
                  <td>
  <a 
    href={row.stravaUrl} 
    target="_blank" 
    rel="noopener noreferrer"
    style={{ color: "#fc4c02", fontWeight: "600", textDecoration: "none" }}
  >
    {row.name}
  </a>
</td>
                  <td>{row.total_km} km</td>
                  <td>{row.runs}</td>
                </tr>
              ))}
              {safeArray(communityData).length === 0 && !loading && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center" }}>
                      No data available
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
        )}

        {communityView === "history" && (
  <div className="history-list">
    {safeArray(historyData).length === 0 && !loading && (
  <p style={{ textAlign: "center" }}>
    No historical leaderboards yet.
  </p>
)}

    {safeArray(historyData).map(week => (
  <button
    key={week.weekKey}
    className="history-btn"
   onClick={() => {
  setSelectedHistory(week);
  window.history.pushState(
    { view: "historyDetail", history: week },
    "",
    "#historyDetail"
  );
  setView("historyDetail");
}}
  >
    🏆 {week.label}
  </button>
))}

  </div>
)}

          <button onClick={() => navigate("home")}>Back</button>
        </div>
      )}

      {view === "challenges" && (

  <div className="leaderboard">

    <h1>🔥Community Challenges</h1>

    <button
      className="card-btn challenge-card"
      onClick={() => {
        navigate("sevenForSeven");
      }}
    >
      <span className="card-title">
        RUNFINITY 7X7 CHALLENGE
      </span>
    </button>

    <button
      className="back-btn"
      onClick={() => navigate("home")}
    >
      ← Back
    </button>

  </div>

)}



      {view === "historyDetail" && selectedHistory && (

  <div className="leaderboard">

    <h1>{selectedHistory.label}</h1>
    <p className="snapshot-info">
  {selectedHistory.leaderboard.length} athletes recorded
</p>


    <div className="table-wrapper">
      <table className="leaderboard-table">

        <thead>
          <tr>
            <th>Rank</th>
            <th>Athlete</th>
            <th>KM</th>
          </tr>
        </thead>

        <tbody>

          {safeArray(selectedHistory.leaderboard).map(row => (

            <tr key={row.athleteId}>
              <td>{getMedal(row.rank)}</td>
              <td>{row.name}</td>
              <td>{row.total_km} km</td>
            </tr>

          ))}

        </tbody>

      </table>
    </div>
    <hr style={{ margin: "40px 0" }} />

<div
  style={{
    position: "fixed",
    left: "-99999px",
    top: 0,
  }}
>


  <div ref={communityPosterRef}>
  <LeaderboardPoster
    history={selectedHistory}
    title="WEEKLY LEADERBOARD"
  />
</div>

<div ref={communityPosterRef1}>
  <LeaderboardPoster
    history={communityFirstHalf}
    title="WEEKLY LEADERBOARD"
    rankOffset={0}
  />
</div>

<div ref={communityPosterRef2}>
  <LeaderboardPoster
    history={communitySecondHalf}
    title="WEEKLY LEADERBOARD"
    rankOffset={communitySplitIndex}
  />
</div>
</div>

<div className="bottom-actions">

  <button
    className="back-btn"
    onClick={() => navigate("community")}
  >
    ← Back
  </button>

  <div className="export-wrapper">

    <select
      className="export-select"
      defaultValue=""
      onChange={(e) => {

          exportCommunityLeaderboard(e.target.value);

        e.target.value = "";

      }}
    >

      <option value="" disabled>
        Export
      </option>

      <option value="full">
Full Leaderboard
</option>

<option value="first">
Ranks 1–{communitySplitIndex}
</option>

<option value="second">
Ranks {communitySplitIndex + 1}–
{selectedHistory.leaderboard.length}
</option>
    </select>

    <span className="export-arrow">▼</span>

  </div>

</div>

  </div>

)}

{view === "dayDetail" && (

  <div className="leaderboard">

    <h1>🏃 Day {selectedDay} Leaderboard</h1>


    <p className="challenge-tagline">
      RUNFINITY 7×7 Challenge
    </p>

    
    {challengeUpdatedAt && (
  <p className="challenge-updated">
    Last updated:{" "}
    {new Date(challengeUpdatedAt).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}{" "}
    IST
  </p>
)}


      <div className="table-wrapper">

<table className="leaderboard-table">

<thead>

<tr>

<th>Rank</th>
<th>Athlete</th>
<th>Days</th>

<th>
<div className="challenge-select-wrapper">
  <select
    className="challenge-select"
    value={challengeMetric}
    onChange={(e)=>setChallengeMetric(e.target.value)}
  >
    <option value="today">Day KM</option>
    <option value="total">Total KM</option>
    <option value="pace">Avg Pace</option>
  </select>

  <span className="challenge-arrow">▼</span>
</div>

</th>

</tr>

</thead>

<tbody>

{!loading && safeArray(challengeData).length === 0 && (
  <tr>
    <td
      colSpan="4"
      style={{
        textAlign: "center",
        padding: "30px",
        color: "#bbb",
        fontWeight: "600"
      }}
    >
      Not started yet
    </td>
  </tr>
)}

{safeArray(challengeData).map(row => (

<tr key={row.athleteId}>

<td>{getMedal(row.rank)}</td>
<td>
  <a
    href={`https://www.strava.com/athletes/${row.athleteId}`}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color:"#FFB347",
      textDecoration:"none",
      fontWeight:"650"
    }}
  >
    {row.name}
  </a>
</td>
<td>{row.completedDays}/7</td>

<td
  style={{
    color:"#ff007f",
    fontWeight:"700"
  }}
>
  {challengeMetric === "today" && `${row.today_km} km`}
  {challengeMetric === "total" && `${row.total_km} km`}
  {challengeMetric === "pace" && row.avg_pace}
</td>

</tr>

))}

</tbody>

</table>

</div>


<div
  style={{
    position: "fixed",
    left: "-99999px",
    top: 0,
  }}
>

  <div ref={posterRef}>
  <LeaderboardPoster
      history={fullLeaderboard}
      title=""
      subtitle="RUNFINITY 7×7 CHALLENGE"
      showAthleteCount={false}
      showFooterText={false}
      showTagline={false}
      metric={challengeMetric}
      isChallenge={true}
      rankOffset={0}
  />
</div>


  <div ref={posterRef1}>
    <LeaderboardPoster
      history={firstHalf}
      title=""
      subtitle="RUNFINITY 7×7 CHALLENGE"
      showAthleteCount={false}
      showFooterText={false}
      showTagline={false}
      metric={challengeMetric}
      isChallenge={true}
      rankOffset={0}
    />
  </div>

  <div ref={posterRef2}>
    <LeaderboardPoster
      history={secondHalf}
      title=""
      subtitle="RUNFINITY 7×7 CHALLENGE"
      showAthleteCount={false}
      showFooterText={false}
      showTagline={false}
      metric={challengeMetric}
      isChallenge={true}
      rankOffset={splitIndex}
    />
  </div>
</div>


    <div className="bottom-actions">

  <button
    className="back-btn"
    onClick={() => navigate("sevenForSeven")}
  >
    ← Back
  </button>

  <div className="export-wrapper">

    <select
      className="export-select"
      value={exportType}
      onChange={(e) => {
        setExportType(e.target.value);
        exportChallengeLeaderboard(e.target.value);
      }}
    >

      <option value="" disabled>
        Export
      </option>

      <option value="full">
        Full Leaderboard
      </option>

      <option value="first">
        Ranks 1–{splitIndex}
      </option>

      <option value="second">
        Ranks {splitIndex + 1}–{challengeData.length}
      </option>

    </select>

    <span className="export-arrow">▼</span>

  </div>

</div>

  </div>

)}

{view === "challengeResults" && (

<div className="leaderboard">

<h1>🏆 Challenge Results</h1>

<p className="challenge-tagline">

RUNFINITY 7×7 Challenge

</p>

<h3 className="challenge-section-title">
🔍 Search Athlete
</h3>

<input
  className="results-search"
  type="text"
  placeholder="Search by athlete name..."
  value={search}
  onChange={(e)=>setSearch(e.target.value)}
/>


{search.trim() !== "" && (
<div className="search-results">

{results
.filter(r=>
r.name.toLowerCase()
.includes(search.toLowerCase())
)
.slice(0,8)
.map(r=>(

<button
key={r.athleteId}
className="search-result-card"

onClick={async () => {
  try {

    const res = await axios.get(
      `/challenge/results/${r.athleteId}`
    );

    setAthleteResult(res.data);

    setSelectedAthlete(r);
    setSearch("");
    navigate("athleteResult");

  } catch (err) {
    console.error(err);
  }
}}

>

{r.name}

<span>

#{r.overallRank}

</span>

</button>

))}

</div>
)}
  

<button
className="history-btn"
onClick={() =>
setShowOverall(!showOverall)
}
>

🏆 Overall Winners

{showOverall ? " ▲" : " ▼"}

</button>

{showOverall && (

<div className="table-wrapper">

<table className="leaderboard-table">

<thead>

<tr>

<th>Rank</th>

<th>Athlete</th>

<th>Total KM</th>

</tr>

</thead>

<tbody>

{challengeResults.overall.map(w=>(
<tr key={w.rank}>

<td>{getMedal(w.rank)}</td>

<td
    className="clickable-athlete"
    onClick={() => fetchAthleteResult(w.athleteId)}
>
    {w.name}
</td>

<td>{w.total} km</td>

</tr>

))}

</tbody>

</table>

</div>

)}

{challengeResults.categories.map(category=>(

<div key={category.title}>

<div

className="history-btn"

onClick={()=>

setOpenCategory(

openCategory===category.title

?

null

:

category.title

)

}

>

<div className="category-header">

  <h3>{category.title}</h3>

  <div className="category-actions">

  <div className="gender-toggle">

    <button
      className={
        (genderFilter[category.title] || "M") === "M"
          ? "toggle-btn male active"
          : "toggle-btn male"
      }
      onClick={(e) => {
        e.stopPropagation();

        setGenderFilter({
          ...genderFilter,
          [category.title]: "M",
        });
      }}
    >
      M
    </button>

    <button
      className={
        (genderFilter[category.title] || "M") === "F"
          ? "toggle-btn female active"
          : "toggle-btn female"
      }
      onClick={(e) => {
        e.stopPropagation();

        setGenderFilter({
          ...genderFilter,
          [category.title]: "F",
        });
      }}
    >
      F
    </button>

  </div>
<span className="category-arrow">
{openCategory===category.title

?

"▲"

:

"▼"}
</span>
</div>
</div>
</div>

{openCategory===category.title && (

<div className="table-wrapper">

<table className="leaderboard-table">

<thead>

<tr>

<th>Rank</th>

<th>Athlete</th>

<th>Total KM</th>

</tr>

</thead>

<tbody>

{(
  (genderFilter[category.title] || "M") === "M"
    ? category.male
    : category.female).map(w=>(

<tr key={w.rank}>

<td>{getMedal(w.rank)}</td>

<td
    className="clickable-athlete"
    onClick={() => fetchAthleteResult(w.athleteId)}
>
    {w.name}
</td>

<td>{w.total} km</td>

</tr>

))}

</tbody>

</table>

</div>

)}


</div>

))}

<div className="bottom-actions">

  <button
    className="back-btn"
    onClick={() => navigate("sevenForSeven")}
  >
    ← Back
  </button>

</div>
</div>

)}
{view === "athleteResult" && (



<div className="leaderboard">
  {loading ? (
  <p style={{ textAlign: "center", padding: "40px" }}>
    Loading athlete...
  </p>
) : athleteResult && (
  <>

<h1>🏃 Athlete Result</h1>

<p className="challenge-tagline">
RUNFINITY 7×7 Challenge
</p>

<div className="athlete-card">

<h2>{athleteResult.name}</h2>

<div className="athlete-stats">

<div className="athlete-stat">
<span>🏆 Overall Rank</span>
<strong>
#{athleteResult.overallRank}
</strong>
</div>

<div className="athlete-stat">
<span>👤 Gender Rank</span>
<strong>
#{athleteResult.genderRank}
</strong>
</div>

<div className="athlete-stat">
<span>🎂 Age Category</span>
<strong>
{athleteResult.category}
</strong>
</div>

<div className="athlete-stat">
<span>🥇 Category Rank</span>
<strong>
#{athleteResult.categoryRank}
</strong>
</div>

<div className="athlete-stat">
<span>🔥 Completed</span>
<strong>
{athleteResult.completedDays}/7
</strong>
</div>

<div className="athlete-stat">
<span>📏 Total Distance</span>
<strong>
{athleteResult.totalKm} km
</strong>
</div>

<div className="athlete-stat">
<span>⚡ Avg Pace</span>
<strong>
{athleteResult.avgPace}
</strong>
</div>

</div>

</div>

<h3 className="challenge-section-title">

Daily Progress

</h3>

<div className="table-wrapper">

<table className="leaderboard-table">

<thead>

<tr>

<th>Day</th>

<th>Distance</th>

</tr>

</thead>

<tbody>

{(athleteResult.days || []).map(day=>(

<tr key={day.day}>

<td>

Day {day.day}

</td>

<td>

{day.km} km

</td>

</tr>

))}

</tbody>

</table>

</div>

<div className="bottom-actions">

<button
className="back-btn"
onClick={()=>navigate("challengeResults")}
>

← Back

</button>

</div>
 </>

)}
</div>

)}


{view === "sevenForSeven" && (

  <div className="leaderboard">

    <h1>RUNFINITY 7X7</h1>

    <p className="challenge-tagline">
      7 Days. 7 Kilometres. 1 Community.
    </p>

   <div className="challenge-info-card">

  <h3>About the Event</h3>

  <p>📅 1st - 7th July 2026</p>
  <p>🌍 Venue: Anywhere in the world</p>
  <p>🎯 Run/Walk 7 km for 7 consecutive days</p>
  <p>💰 Contribution: ₹400</p>

</div>

<div className="history-list">
  <h3> Daily Leaderboards</h3>

  <button
  className="history-btn"
  onClick={() => {

    setSelectedDay(1);


    navigate("dayDetail");

  }}
>
  Day 1 {getDayStatus(1)}
</button>

  <button
  className="history-btn"
  onClick={() => {

    setSelectedDay(2);


    navigate("dayDetail");

  }}
>
  Day 2 {getDayStatus(2)}     
</button>

<button
  className="history-btn"
  disabled={!isDayUnlocked(3)}
  onClick={() => {
    
    if (!isDayUnlocked(3)) return;

    setSelectedDay(3);

    navigate("dayDetail");

  }}
>
  Day 3 {getDayStatus(3)}
  
</button>

<button
  className="history-btn"
  disabled={!isDayUnlocked(4)}
  onClick={() => {
    
    if (!isDayUnlocked(4)) return;

    setSelectedDay(4);

    navigate("dayDetail");

  }}
>
  Day 4 {getDayStatus(4)}
  
</button>

<button
  className="history-btn"
  disabled={!isDayUnlocked(5)}
  onClick={() => {

    if (!isDayUnlocked(5)) return;
    setSelectedDay(5);

    navigate("dayDetail");

  }}
>
  Day 5 {getDayStatus(5)}     
</button>

<button
  className="history-btn"
  disabled={!isDayUnlocked(6)}
  onClick={() => {

    if (!isDayUnlocked(6)) return;
    setSelectedDay(6);


    navigate("dayDetail");

  }}
>
  Day 6 {getDayStatus(6)}
</button>

<button
  className="history-btn"
  disabled={!isDayUnlocked(7)}
  onClick={() => {

    if (!isDayUnlocked(7)) return;
    setSelectedDay(7);


    navigate("dayDetail");

  }}
>
  Day 7 {getDayStatus(7)}
</button>

</div>

<h3 className="challenge-section-title">
  Results
</h3>

<button
  className="history-btn"
  onClick={() => {
  fetchChallengeResults();
  navigate("challengeResults");
}}
>
  🏆 Final Results
</button>

<h3 className="challenge-section-title">
  Links & Contact
</h3>

<p>
  📝{" "}
  <a
    href="https://docs.google.com/forms/d/e/1FAIpQLSffOL_YGVBjI04HFllFB_c2s33q_uyxeKWW9_52Gqiwm_raLQ/viewform?pli=1"
    target="_blank"
    rel="noopener noreferrer"
    className="challenge-link"
  >
    Register for the Challenge
  </a>
</p>

<p>
  🏃{" "}
  <a
    href="https://chat.whatsapp.com/L4ce3kfTeDfINxM0QnfCQo?s=qt&p=a&mlu=1K"
    target="_blank"
    rel="noopener noreferrer"
    className="challenge-link"
  >
    Join Runfinity Community
  </a>
</p>

<p>
  💬{" "}
  <a
    href="https://wa.me/919717538449"
    target="_blank"
    rel="noopener noreferrer"
    className="challenge-link"
  >
    Technical issues?
  </a>
</p>

    <button className="back-btn"
      onClick={() => navigate("challenges")}
    >
      ← Back
    </button>
  </div>
)}
   

    </div>
  );
}

export default App;