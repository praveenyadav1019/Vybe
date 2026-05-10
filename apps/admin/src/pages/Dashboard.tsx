import { useEffect, useState } from 'react';
import { api } from '../api';

interface Stats {
  totalUsers: number;
  activeToday: number;
  totalParties: number;
  activeParties: number;
  totalConnections: number;
  pendingReports: number;
  totalMessages: number;
  bannedUsers: number;
}

interface ConnectionStats {
  total: number;
  byType: {
    matched: number;
    met_at_venue: number;
    met_at_party: number;
    stranger_chat: number;
  };
}

const statCards = [
  { key: 'totalUsers', label: 'Total Users', icon: '👥' },
  { key: 'activeToday', label: 'Active Today', icon: '🟢' },
  { key: 'totalParties', label: 'Total Parties', icon: '🎉' },
  { key: 'activeParties', label: 'Active Parties', icon: '🔥' },
  { key: 'totalConnections', label: 'Connections', icon: '🤝' },
  { key: 'pendingReports', label: 'Pending Reports', icon: '🚩' },
  { key: 'totalMessages', label: 'Messages Sent', icon: '💬' },
  { key: 'bannedUsers', label: 'Banned Users', icon: '🚫' },
];

const recentActivity = [
  { icon: '👤', title: 'New user registered', sub: 'via OTP verification', time: 'Just now' },
  { icon: '🎉', title: 'Party created in Bengaluru', sub: 'Rooftop vibes • 30 max attendees', time: '2m ago' },
  { icon: '🤝', title: 'New connection formed', sub: 'Met at venue • Koramangala', time: '5m ago' },
  { icon: '🚩', title: 'Report submitted', sub: 'Harassment report pending review', time: '12m ago' },
  { icon: '✅', title: 'User verified', sub: 'Liveness check passed', time: '18m ago' },
  { icon: '💬', title: 'Stranger chat session ended', sub: 'Duration: 4m 32s', time: '25m ago' },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [connStats, setConnStats] = useState<ConnectionStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [s, c] = await Promise.all([
          api.get<Stats>('/admin/stats'),
          api.get<ConnectionStats>('/admin/connections'),
        ]);
        setStats(s);
        setConnStats(c);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome to the VYBE admin panel. Here's what's happening right now.</p>
      </div>

      {error && (
        <div className="error-wrap">
          <span>⚠️</span>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-wrap">
          <span>⏳</span> Loading stats…
        </div>
      ) : (
        <>
          <div className="stat-grid">
            {statCards.map((card) => (
              <div key={card.key} className="stat-card">
                <div className="stat-card-icon">{card.icon}</div>
                <div className="stat-value">
                  {stats ? (stats[card.key as keyof Stats] ?? 0).toLocaleString() : '—'}
                </div>
                <div className="stat-label">{card.label}</div>
              </div>
            ))}
          </div>

          {connStats && (
            <div className="section-card">
              <h3>Connections by Type</h3>
              <div className="conn-grid">
                <div className="conn-card">
                  <div className="conn-card-value">{connStats.byType.matched.toLocaleString()}</div>
                  <div className="conn-card-label">Matched</div>
                </div>
                <div className="conn-card">
                  <div className="conn-card-value">{connStats.byType.met_at_venue.toLocaleString()}</div>
                  <div className="conn-card-label">Met at Venue</div>
                </div>
                <div className="conn-card">
                  <div className="conn-card-value">{connStats.byType.met_at_party.toLocaleString()}</div>
                  <div className="conn-card-label">Met at Party</div>
                </div>
                <div className="conn-card">
                  <div className="conn-card-value">{connStats.byType.stranger_chat.toLocaleString()}</div>
                  <div className="conn-card-label">Stranger Chat</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="dashboard-section">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {recentActivity.map((item, i) => (
            <div key={i} className="activity-item">
              <div className="activity-icon">{item.icon}</div>
              <div className="activity-info">
                <div className="activity-title">{item.title}</div>
                <div className="activity-sub">{item.sub}</div>
              </div>
              <div className="activity-time">{item.time}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
