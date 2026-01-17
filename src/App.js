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


useEffect(() => {
  axios
    .get("/auth/status") // baseURL already set
    .then(res => {
      if (res.data.authenticated) {
        setIsAuthenticated(true);
        setAthlete(res.data.athlete);
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
      {view === "home" && (
        <div className="home">
          <h1>FlyRunHub Leaderboard</h1>

          <div className="view-toggle">
            <button onClick={() => {
              if (!isAuthenticated){
                alert("Please connect with Strava first");
                return;
              }
              setView("personal");
              setPage(1);
              loadLeaderboard("weekly",1);
            }}
            >
              My Dashboard
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated){
                  alert("Please connect with Strava first");
                  return;
                }
                setView("community");
                fetchCommunityLeaderboard();
              }}
            >
              Community
            </button>
          </div>

          {!isAuthenticated ? (
  <a href="/auth/strava">
    <button className="start-button">Connect with Strava</button>
  </a>
) : (
  <button className="start-button" disabled>
    ✅ Connected {athlete?.firstname ? `as ${athlete.firstname}` : ""}
  </button>
)}

        </div>
      )}

      {view === "personal" && (
        <div className="leaderboard">
          <h1>{title}</h1>

        <div>
          <button
            onClick={() => {
              setPage(1);
              loadLeaderboard("weekly", 1);
            }}
          >
            Weekly
          </button>

          <button
            onClick={() => {
              setPage(1);
              loadLeaderboard("5k", 1);
            }}
          >
            5K
          </button>

          <button
            onClick={() => {
              setPage(1);
              loadLeaderboard("10k", 1);
            }}
          >
            10K
          </button>

          <button
            onClick={() => {
              setPage(1);
              loadLeaderboard("hm", 1);
            }}
          >
            HM
          </button>

          <button
            onClick={() => {
              setPage(1);
              loadLeaderboard("fm", 1);
            }}
          >
            FM
          </button>
        </div>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="leaderboard-table">
              <thead>
                  <tr>
                    <th>Rank</th>

                    {currentType === "weekly" ? (
                      <>
                        <th>Week</th>
                        <th>Total Distance (km)</th>
                        <th>Total Time</th>
                      </>
                    ) : (
                      <>
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
                    <td>{(page - 1) * 10 + idx + 1}</td>

                    {currentType === "weekly" ? (
                      <>
                        <td>{row.week || "-"}</td>
                        <td>{row.total_km || "-"}</td>
                        <td>{row.total_time || "-"}</td>
                      </>
                    ) : (
                      <>
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
          )}

          <div>
            <button 
             disabled={page === 1} 
             onClick={() => {
              const newPage = page-1;
              setPage(newPage);
              loadLeaderboard(currentType,newPage);
             }}>
              Previous
            </button>
            <span> Page {page} of {totalPages} </span>
            <button
              disabled={page === totalPages}
              onClick={() => {
                const newPage=page+1;
                setPage(newPage);
                loadLeaderboard(currentType,newPage);
              }}
            >
              Next
            </button>
          </div>

          <button onClick={() => setView("home")}>Back</button>
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
                  <td>{row.rank}</td>
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

          <button onClick={() => setView("home")}>Back</button>
        </div>
      )}
    </div>
  );
}

export default App;