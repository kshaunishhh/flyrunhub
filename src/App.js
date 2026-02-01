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
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [athlete, setAthlete] = useState(null);
  const [currentType,setCurrentType] = useState(null);
  const [showToast, setShowToast] = useState(false);

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
  const onBack = () => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "personal" || hash === "community") {
      setView(hash);
    } else {
      setView("home");
    }
  };

  window.addEventListener("popstate", onBack);
  return () => window.removeEventListener("popstate", onBack);
}, []);



useEffect(() => {
  window.history.replaceState({ view: "home" }, "", "#home");
}, []);


  const fetchCommunityLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/community/leaderboard/weekly");
      setCommunityData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Community leaderboard error:", err);
      setCommunityData([]);
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
  return <p style={{ textAlign: "center" }}>Checking authentication…</p>;
}



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

  <p className="hero-subtitle">
    Weekly &amp; Race-based leaderboards powered by Strava
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
      fetchCommunityLeaderboard();
    }}
  >
    <span className="card-title">🏆Community Leaderboard</span>
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
    { key: "fm", label: "FM" }
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
          {loading && (
      <p style={{ textAlign: "center", fontWeight: "bold" }}>
        Loading leaderboard...
      </p>
    )}
        <div className="table-wrapper">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Athlete</th>
                <th>Weekly KM</th>
                <th>Runs</th>
              </tr>
            </thead>
            <tbody>
              {safeArray(communityData).map((row, idx) => (
                <tr key={idx}>
                  <td>{getMedal(row.rank)}</td>
                  <td>{row.name}</td>
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
          <button onClick={() => navigate("home")}>Back</button>
        </div>
      )}
    </div>
  );
}

export default App;