import { useEffect, useState } from "react";
import { getActivityLogs } from "../services/auditService";

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await getActivityLogs();
        setLogs(data);
      } catch (error) {
        console.error("Failed to load activity logs", error);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  const formatTime = (log) => {
    const value = log.clientTime || log.createdAt?.toDate?.()?.toISOString();
    if (!value) return "-";
    return new Date(value).toLocaleString("en-IN");
  };

  const formatAction = (action) =>
    action
      ?.replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "-";

  return (
    <div className="page-panel">
      <div className="panel-header">
        <p className="eyebrow">System Activity</p>
        <h2>Activity Logs</h2>
        <p>Track admin and member login times plus important actions performed in the system.</p>
      </div>

      {loading ? (
        <p>Loading activity...</p>
      ) : logs.length === 0 ? (
        <p>No activity recorded yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td data-label="Time">{formatTime(log)}</td>
                  <td data-label="User">{log.actorEmail || "-"}</td>
                  <td data-label="Role">{log.actorRole || "-"}</td>
                  <td data-label="Action">{formatAction(log.action)}</td>
                  <td data-label="Details">
                    {Object.keys(log.details || {}).length > 0
                      ? JSON.stringify(log.details)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ActivityLogs;
