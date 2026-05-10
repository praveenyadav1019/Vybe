import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

interface PartyHost {
  id: string;
  profile: { name: string } | null;
}

interface Party {
  id: string;
  title: string;
  city: string;
  state: string | null;
  vibeType: string;
  musicType: string | null;
  status: string;
  visibility: string;
  startsAt: string;
  endsAt: string | null;
  maxAttendees: number;
  isPaid: boolean;
  entryFee: number | null;
  createdAt: string;
  host: PartyHost;
  _count: { attendees: number };
}

interface PartiesResponse {
  parties: Party[];
  total: number;
  page: number;
  limit: number;
}

interface ConfirmModal {
  title: string;
  message: string;
  action: () => Promise<void>;
}

const statusColors: Record<string, string> = {
  active: 'badge-success',
  cancelled: 'badge-danger',
  ended: 'badge-default',
  full: 'badge-warning',
};

export default function Parties() {
  const [data, setData] = useState<PartiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const limit = 20;

  const loadParties = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(cityFilter ? { city: cityFilter } : {}),
      });
      const result = await api.get<PartiesResponse>(`/admin/parties?${params}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load parties');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, cityFilter]);

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  function handleDelete(party: Party) {
    setConfirmModal({
      title: `Delete "${party.title}"?`,
      message: `This will permanently delete this party hosted in ${party.city}. All join requests and attendee records will also be removed. This cannot be undone.`,
      action: async () => {
        setActionLoading(party.id);
        try {
          await api.delete(`/admin/parties/${party.id}`);
          showSuccess(`Party "${party.title}" has been deleted.`);
          await loadParties();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to delete party');
        } finally {
          setActionLoading(null);
        }
      },
    });
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <>
      <div className="page-header">
        <h1>Parties</h1>
        <p>Browse and manage all house parties on VYBE.</p>
      </div>

      {error && (
        <div className="error-wrap">
          <span>⚠️</span> {error}
        </div>
      )}

      {successMsg && (
        <div className="error-wrap" style={{ background: '#D1FAE5', borderColor: '#A7F3D0', color: '#065F46' }}>
          <span>✅</span> {successMsg}
        </div>
      )}

      <div className="search-bar">
        <input
          className="input"
          placeholder="Filter by city..."
          value={cityFilter}
          onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
          style={{ maxWidth: 220 }}
        />
        <select
          className="input"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="full">Full</option>
          <option value="ended">Ended</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          className="btn btn-ghost"
          onClick={() => { setCityFilter(''); setStatusFilter(''); setPage(1); }}
        >
          Clear
        </button>
        <span style={{ marginLeft: 'auto', color: 'var(--ink-sec)', fontSize: 13 }}>
          {data ? `${data.total.toLocaleString()} parties` : ''}
        </span>
      </div>

      {loading ? (
        <div className="loading-wrap"><span>⏳</span> Loading parties…</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Host</th>
                <th>Location</th>
                <th>Vibe</th>
                <th>Date</th>
                <th>Attendees</th>
                <th>Entry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.parties.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--ink-sec)', padding: '32px' }}>
                    No parties found.
                  </td>
                </tr>
              ) : (
                data?.parties.map((party) => (
                  <tr key={party.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)', maxWidth: 200 }}>
                        {party.title}
                      </div>
                      {party.musicType && (
                        <div style={{ fontSize: 11, color: 'var(--ink-sec)', marginTop: 2 }}>
                          🎵 {party.musicType}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                          {(party.host?.profile?.name ?? 'U').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>
                          {party.host?.profile?.name ?? 'Unknown Host'}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--ink-sec)' }}>
                      {party.city}{party.state ? `, ${party.state}` : ''}
                    </td>
                    <td>
                      <span className="chip">{party.vibeType}</span>
                    </td>
                    <td style={{ color: 'var(--ink-sec)', fontSize: 13 }}>
                      {new Date(party.startsAt).toLocaleDateString()}<br />
                      <span style={{ fontSize: 11 }}>
                        {new Date(party.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{party._count.attendees}</span>
                      <span style={{ color: 'var(--ink-sec)' }}>/{party.maxAttendees}</span>
                    </td>
                    <td>
                      {party.isPaid ? (
                        <span className="badge badge-warning">
                          ₹{party.entryFee ?? 0}
                        </span>
                      ) : (
                        <span className="badge badge-success">Free</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${statusColors[party.status] ?? 'badge-default'}`}>
                        {party.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={actionLoading === party.id}
                        onClick={() => handleDelete(party)}
                        title="Delete party"
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            );
          })}
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
          <span className="pagination-info">
            {data.total.toLocaleString()} parties total
          </span>
        </div>
      )}

      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{confirmModal.title}</h2>
            <p>{confirmModal.message}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  setConfirmModal(null);
                  await confirmModal.action();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
