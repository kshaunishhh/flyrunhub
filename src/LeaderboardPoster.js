import "./LeaderboardPoster.css";

export default function LeaderboardPoster({
  history,
  title = "WEEKLY LEADERBOARD",
  subtitle = "",
  showAthleteCount = true,
  showFooterText = true,
  showTagline = true,
  metric = "total",
  isChallenge = false,
  rankOffset = 0
})  {
  if (!history) return null;

  const renderProgress = (days) => {
  return (
    <div className="progress-wrapper">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${(days / 7) * 100}%`
          }}
        />
      </div>

      <span className="progress-text">
        {days}/7
      </span>
    </div>
  );
};

  return (
    <div className={`poster ${isChallenge ? "challenge-poster" : ""}`}>

      <div className="poster-header">

  <div className="poster-brand">


    <span>FLYRUNHUB</span>

  </div>

 {showTagline && (
  <div className="poster-tagline">
    TRACK • COMPETE • IMPROVE
  </div>
)}
  {subtitle && (

  <div className="poster-subtitle">

    {subtitle}

  </div>

)}

  {title && (

  <h2 className="poster-title">

    {title}

  </h2>

)}

  <div className="poster-week">

    {history.label}

  </div>

  {showAthleteCount && (

  <div className="poster-athletes">

      {history.leaderboard.length} ATHLETES RECORDED

  </div>

)}

</div>
      <table className="poster-table">

        <thead>
  <tr>
    <th>Rank</th>

    <th>Athlete</th>

    {isChallenge && (
      <th style={{ width: "240px" }}>Progress</th>
    )}

    <th>
      {metric === "today"
        ? "DAY KM"
        : metric === "pace"
        ? "PACE"
        : "TOTAL KM"}
    </th>
  </tr>
</thead>

        <tbody>

          {history.leaderboard.map((runner,index)=>(

            <tr key={runner.athleteId || index}>

              <td>
                {rankOffset === 0 && index === 0 ? "🥇" :
 rankOffset === 0 && index === 1 ? "🥈" :
 rankOffset === 0 && index === 2 ? "🥉" :
 rankOffset + index + 1}
              </td>

              <td>{runner.name}</td>

              {isChallenge && (
                <td>{renderProgress(runner.completedDays || 0)}</td>
              )}

              <td>
  {metric === "today"
    ? `${runner.today_km} km`
    : metric === "pace"
    ? runner.avg_pace
    : `${runner.total_km} km`}
</td>

            </tr>

          ))}

        </tbody>

      </table>

      <div className="poster-footer">

  {showFooterText && (
    <>
      <span>EVERY KILOMETER COUNTS.</span>

      <br/>

      <strong>EVERY RUNNER INSPIRES.</strong>

      <br/>
    </>
  )}

  <div className="poster-url">

      flyrunhub.onrender.com

  </div>

</div>
    </div>
  );
}