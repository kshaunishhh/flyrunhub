import "./LeaderboardPoster.css";

export default function LeaderboardPoster({ history, title = "WEEKLY LEADERBOARD" }) {
  if (!history) return null;

  return (
    <div className="poster">

      <div className="poster-header">

  <div className="poster-brand">


    <span>FLYRUNHUB</span>

  </div>

  <div className="poster-tagline">

    TRACK • COMPETE • IMPROVE

  </div>

  <h2 className="poster-title">

    {title}

  </h2>

  <div className="poster-week">

    {history.label}

  </div>

  <div className="poster-athletes">

     {history.leaderboard.length} ATHLETES RECORDED

  </div>

</div>
      <table className="poster-table">

        <thead>

          <tr>

            <th>Rank</th>

            <th>Athlete</th>

            <th>KM</th>

          </tr>

        </thead>

        <tbody>

          {history.leaderboard.map((runner,index)=>(

            <tr key={runner.athleteId || index}>

              <td>
                {index === 0 ? "🥇" :
 index === 1 ? "🥈" :
 index === 2 ? "🥉" :
 index + 1}
              </td>

              <td>{runner.name}</td>

              <td>{runner.total_km} km</td>

            </tr>

          ))}

        </tbody>

      </table>

      <div className="poster-footer">

    <span>EVERY KILOMETER COUNTS.</span>

    <br/>

    <strong>EVERY RUNNER INSPIRES.</strong>

    <div className="poster-url">

        flyrunhub.onrender.com

    </div>

</div>

    </div>
  );
}