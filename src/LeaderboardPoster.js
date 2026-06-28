import "./LeaderboardPoster.css";

export default function LeaderboardPoster({ history }) {
  if (!history) return null;

  return (
    <div className="poster">

      <div className="poster-header">

        <h1>FLYRUNHUB</h1>

        <p>RUN TOGETHER. RISE TOGETHER.</p>

        <h2>WEEKLY LEADERBOARD</h2>

        <div className="poster-week">
          {history.label}
        </div>

        <div className="poster-athletes">
          👥 {history.leaderboard.length} Athletes Recorded
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
                {index===0?"🥇":
                 index===1?"🥈":
                 index===2?"🥉":
                 index+1}
              </td>

              <td>{runner.name}</td>

              <td>{runner.total_km}</td>

            </tr>

          ))}

        </tbody>

      </table>

      <div className="poster-footer">

        Every step counts.
        Every runner inspires.

      </div>

    </div>
  );
}