import React, { useState, useEffect } from "react";
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [challengeData, setChallengeData] = useState([]);
  const [challengeMetric, setChallengeMetric] = useState("today");
  const [yourRank, setYourRank] = useState(null);

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
  fetchCommunityLeaderboard();
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

}, [view, communityView, selectedTypes]);
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
  `/community/leaderboard/weekly?types=${selectedTypes.join(",")}`
);

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

    let rows = Array.isArray(res.data) ? res.data : [];

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
        <p className="footer-title"> FlyRunHub • v1.0 (Beta)
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
                        <td>{row.total_km || "-"}</td>
                        <td>{row.total_time || "-"}</td>
                      </>
                    ) : (
                      <>
                        <td>{getMedal((page - 1) * 10 + idx + 1)}</td>
                        <td>{row.date || "-"}</td>
                        <td>{row.distance_km || "-"}</td>
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
                <th>Weekly KM</th>
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
                  <td>{row.total_km}</td>
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
              <td>{row.total_km}</td>
            </tr>

          ))}

        </tbody>

      </table>
    </div>

    <button
      className="back-btn"
      onClick={() => navigate("community")}
    >
      ← Back
    </button>

  </div>

)}

{view === "dayDetail" && (

  <div className="leaderboard">

    <h1>🏃 Day {selectedDay} Leaderboard</h1>

    <p className="challenge-tagline">
      RUNFINITY 7×7 Challenge
    </p>


      <div className="table-wrapper">

<table className="leaderboard-table">

<thead>

<tr>

<th>Rank</th>
<th>Athlete</th>
<th>Days</th>
<th>
<select
className="challenge-select"
value={challengeMetric}
onChange={(e)=>setChallengeMetric(e.target.value)}
>

<option value="today">
Day KM
</option>

<option value="total">
Total KM
</option>

<option value="pace">
Avg Pace
</option>

</select>

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
<td>{row.name}</td>
<td>{row.completedDays}/7</td>

<td>
  {challengeMetric === "today" && row.today_km}
  {challengeMetric === "total" && row.total_km}
  {challengeMetric === "pace" && row.avg_pace}
</td>

</tr>

))}

</tbody>

</table>

</div>


    <button
      className="back-btn"
      onClick={() => navigate("sevenForSeven")}
    >
      ← Back
    </button>

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

    fetchChallengeLeaderboard("2026-07-01");

    navigate("dayDetail");

  }}
>
  Day 1 {getDayStatus(1)}
</button>

  <button
  className="history-btn"
  onClick={() => {

    setSelectedDay(2);

    fetchChallengeLeaderboard("2026-07-02");

    navigate("dayDetail");

  }}
>
  Day 2 {getDayStatus(2)}     
</button>

<button
  className="history-btn"
  onClick={() => {

    setSelectedDay(3);

    fetchChallengeLeaderboard("2026-07-03");

    navigate("dayDetail");

  }}
>
  Day 3 {getDayStatus(3)}       
</button>

<button
  className="history-btn"
  onClick={() => {

    setSelectedDay(4);

    fetchChallengeLeaderboard("2026-07-04");

    navigate("dayDetail");

  }}
>
  Day 4 {getDayStatus(4)}
</button>

<button
  className="history-btn"
  onClick={() => {

    setSelectedDay(5);

    fetchChallengeLeaderboard("2026-07-05");

    navigate("dayDetail");

  }}
>
  Day 5 {getDayStatus(5)}     
</button>

<button
  className="history-btn"
  onClick={() => {

    setSelectedDay(6);

    fetchChallengeLeaderboard("2026-07-06");

    navigate("dayDetail");

  }}
>
  Day 6 {getDayStatus(6)}
</button>

<button
  className="history-btn"
  onClick={() => {

    setSelectedDay(7);

    fetchChallengeLeaderboard("2026-07-07");

    navigate("dayDetail");

  }}
>
  Day 7 {getDayStatus(7)}
</button>

</div>

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