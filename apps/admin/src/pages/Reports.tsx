import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

interface ReportPhoto {
  id: string;
  url: string;
}

interface ReporterProfile {
  name: string;
  photos: ReportPhoto[];
}

interface Reporter {
  id: string;
  phone: string;
  profile: ReporterProfile | null;
}

interface TargetProfile {
  name: string;
  photos: ReportPhoto[];
}

interface Target {
  id: string;
  phone: string;
  profile: TargetProfile | null;
}

interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  reason: string;
  description: string | null;
  evidence: string[] | null;
  status: string;
  createdAt: string;
  reporter: Reporter;
  target: Target;
}

interface ReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
}

interface ConfirmModal {
  reportId: string;
  title: string;
  message: string;
  actions: Array<{ label: string; action: () => Promise<void>; style?: string }>;
}

const statusColors: Record<string, string> = {
  pending: 'badge-warning',
  resolved: 'badge-success',
};

export default function Reports() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const limit = 20;

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const result = await api.get<ReportsResponse>(`/admin/reports?${params}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  async function runAction(reportId: string, action: () => Promise<void>) {
    setActionLoading(reportId);
    try {
      await action();
      await loadReports();
      setConfirmModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  }

  function handleResolve(report: Report) {
    setConfirmModal({
      reportId: report.id,
      title: `Resolve report from ${report.reporter.profile?.name ?? report.reporter.phone}?`,
      message: `Report reason: "${report.reason}"`,
      actions: [
        {
          label: '⚠️ Warn Target',
          action: async () => {
            await runAction(report.id, async () => {
              await api.post(`/admin/reports/${report.id}/resolve`, { action: 'warn' });
              showSuccess('User warned.');
            });
          },
        },
        {
          label: '🚫 Ban Target',
          action: async () => {
            await runAction(report.id, async () => {
              await api.post(`/admin/reports/${report.id}/resolve`, { action: 'ban' });
              showSuccess(`${report.target.profile?.name ?? report.target.phone} has been banned.`);
            });
          },
          style: 'btn-danger',
        },
        {
          label: '✓ Dismiss',
          action: async () => {
            await runAction(report.id, async () => {
              await api.post(`/admin/reports/${report.id}/resolve`, { action: 'dismiss' });
              showSuccess('Report dismissed.');
            });
          },
        },
      ],
    });
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <>
      <div className="page-header">
        <h1>Reports</h1>
        <p>Review user reports and take moderation actions.</p>
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
        <select
          className="input"
          style={{ width: 180 }}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setStatusFilter('');
            setPage(1);
          }}
        >
          Clear
        </button>
        <span style={{ marginLeft: 'auto', color: 'var(--ink-sec)', fontSize: 13 }}>
          {data ? `${data.total.toLocaleString()} reports` : ''}
        </span>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <span>⏳</span> Loading reports…
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reporter</th>
                <th>Target</th>
                <th>Reason</th>
                <th>Details</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.reports.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-sec)', padding: '32px' }}>
                    No reports found.
                  </td>
                </tr>
              ) : (
                data?.reports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className="user-cell">
                        <div className="avatar">
                          {(report.reporter.profile?.name ?? report.reporter.phone).charAt(0).toUpperCase()}
                        </div>
                        <div className="user-cell-info">
                          <div className="user-cell-name">{report.reporter.profile?.name ?? 'No name'}</div>
                          <div className="user-cell-sub">{report.reporter.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="avatar">
                          {(report.target.profile?.name ?? report.target.phone).charAt(0).toUpperCase()}
                        </div>
                        <div className="user-cell-info">
                          <div className="user-cell-name">{report.target.profile?.name ?? 'No name'}</div>
                          <div className="user-cell-sub">{report.target.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <span className="chip">{report.reason}</span>
                    </td>
                    <td style={{ color: 'var(--ink-sec)', fontSize: 13, maxWidth: 250 }}>
                      {report.description || '—'}
                    </td>
                    <td style={{ color: 'var(--ink-sec)' }}>
                      {new Date(report.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`badge ${statusColors[report.status] ?? 'badge-default'}`}>
                        {report.status}
                      </span>
                    </td>
                    <td>
                      {report.status === 'pending' && (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={actionLoading === report.id}
                          onClick={() => handleResolve(report)}
                          title="Resolve report"
                        >
                          Resolve
                        </button>
                      )}
                      {report.status === 'resolved' && (
                        <span style={{ color: 'var(--ink-sec)', fontSize: 12 }}>Resolved</span>
                      )}
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
            {data.total.toLocaleString()} reports total
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
              {confirmModal.actions.map((action, i) => (
                <button
                  key={i}
                  className={`btn ${action.style ?? 'btn-primary'}`}
                  disabled={actionLoading === confirmModal.reportId}
                  onClick={() => action.action()}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
