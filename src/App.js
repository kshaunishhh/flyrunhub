import React, { useState,useEffect } from 'react';
import './App.css';



function App() {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState([]);
  const [view, setView] = useState('home');
  const [data, setData] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const loadLeaderboard = (type) => {
    setPage(1);    
    let url = "";
    let heading = "";
  
    switch (type) {
      case "weekly":
        url = "http://localhost:5000/leaderboard/weekly";
        heading = "Weekly Leaderboard";
        break;
      case "5k":
        url = "http://localhost:5000/leaderboard/5k";
        heading = "5K Leaderboard";
        break;
      case "10k":
        url = "http://localhost:5000/leaderboard/10k";
        heading = "10K Leaderboard";
        break;
      case "hm":
        url = "http://localhost:5000/leaderboard/hm";
        heading = "Half Marathon Leaderboard";
        break;
      case "fm":
        url = "http://localhost:5000/leaderboard/fm";
        heading = "Full Marathon Leaderboard";
        break;
      default:
        return;
    }
  
    setLoading(true);
    fetch(`${url}?page=${page}`)
    .then(res => res.json())
    .then(res => {
      setData(res.results);
      setTotalPages(res.totalPages);
      setTitle(heading);
      setView("leaderboard");
    })
    .finally(() => setLoading(false));
      
  };
  useEffect(() => {
    if (view === "leaderboard" && title) {
      // Re-fetch current leaderboard when page changes
      loadLeaderboard(
        title.includes("Weekly") ? "weekly" :
        title.includes("5K") ? "5k" :
        title.includes("10K") ? "10k" :
        title.includes("Half") ? "hm" :
        title.includes("Full") ? "fm" : ""
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (view === "weekly") {
      fetch("http://localhost:5000/leaderboard/weekly")
        .then((res) => res.json())
        .then((data) => setWeeklyLeaderboard(data))
        .catch((err) => console.error(err));
    }
  }, [view]);  
  const handleStart = () => {
    setView('leaderboard');
  };
  
  return (
    <div className="App">
      {view === "home" && (
        <div className="home">
          <h1>FlyRunHub Leaderboard</h1>
  
          <a href="http://localhost:5000/auth/strava">
            <button className="start-button">Connect with Strava</button>
          </a>
          <div style={{ marginTop: "30px" }}>
            <button className="tab" onClick={() => loadLeaderboard("weekly")}>
              Weekly
            </button>
            <button className="tab" onClick={() => loadLeaderboard("5k")}>
              5K
            </button>
            <button className="tab" onClick={() => loadLeaderboard("10k")}>
              10K
            </button>
            <button className="tab" onClick={() => loadLeaderboard("hm")}>
              HM
            </button>
            <button className="tab" onClick={() => loadLeaderboard("fm")}>
              FM
            </button>
          </div>

          {loading && <p>Loading…</p>}


          <button
              className="tab"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>

            <span style={{ margin: "0 10px" }}>
              Page {page} of {totalPages}
            </span>

            <button
              className="tab"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
          </button>

          {view === "leaderboard" && (
  <div className="leaderboard">
    <h1>{title}</h1>

    <table className="leaderboard-table">
                      <thead>
                      <tr>
                      <th>Rank</th>
                      <th>Name</th>
                      <th>Date</th>          {/* 👈 THIS LINE */}
                      <th>Distance (km)</th>
                      <th>Time</th>
                      <th>Pace</th>
                    </tr>
                  </thead>
                  <tbody>
                  {data.map((row, index) => (
                    <tr key={index}>
                      <td>{row.rank || index + 1}</td>
                      <td>{row.name}</td>
                      <td>{row.date}</td>        {/* 👈 DATE SHOWN HERE */}
                      <td>{row.distance_km || "-"}</td>
                      <td>{row.time || "-"}</td>
                      <td>{row.pace || "-"}</td>
                    </tr>
                  ))}
                  </tbody>
                  </table>

                <button
                  className="tab"
                  style={{ marginTop: "20px" }}
                  onClick={() => setView("home")}
                              >
                 Back
                </button>
              </div>
            )}

  
          <button
            className="start-button"
            style={{ marginLeft: "15px" }}
            onClick={() => setView("weekly")}
          >
            View Weekly Leaderboard
          </button>
        </div>
      )}
  
      {view === "leaderboard" && (
      <div className="leaderboard">
        <h1>{title}</h1>

        {!Array.isArray(data) ? (
          <p style={{ color: "red" }}>
            Error loading data. Please connect with Strava first.
          </p>
        ) : data.length === 0 ? (
          <p>No data available</p>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name / Week</th>
                <th>Date</th>          
                <th>Distance (km)</th>
                <th>Time</th>
                <th>Pace</th>
              </tr>
            </thead>
            <tbody>
              {title === "Weekly Leaderboard"
                ? data.map((row, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{row.week_start}</td>
                      <td>-</td>               
                      <td>{row.total_km}</td>
                      <td>-</td>
                      <td>-</td>
                    </tr>
                  ))
                : data.map((row, index) => (
                    <tr key={index}>
                      <td>{row.rank ?? index + 1}</td>
                      <td>{row.name}</td>
                      <td>{row.date}</td>
                      <td>{row.distance_km}</td>
                      <td>{row.time}</td>
                      <td>{row.pace}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        )}

        <button
          className="tab"
          style={{ marginTop: "20px" }}
          onClick={() => setView("home")}
        >
          Back
        </button>
      </div>
    )}
        <div style={{ marginTop: "15px" }}>
      <button
        className="tab"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>

      <span style={{ margin: "0 10px" }}>
        Page {page} of {totalPages}
      </span>

      <button
        className="tab"
        disabled={page === totalPages}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>

    </div>
  );  
}

export default App;
