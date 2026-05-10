import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

interface UserProfile {
  name: string;
  photos: string[];
  verified: boolean;
  mode: string;
  age: number | null;
  gender: string | null;
}

interface UserSubscription {
  plan: string;
}

interface User {
  id: string;
  phone: string;
  role: string;
  isBanned: boolean;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  profile: UserProfile | null;
  subscription: UserSubscription | null;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

interface ConfirmModal {
  title: string;
  message: string;
  action: () => Promise<void>;
  danger?: boolean;
}

export default function Users() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const limit = 20;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(bannedFilter ? { banned: bannedFilter } : {}),
      });
      const result = await api.get<UsersResponse>(`/admin/users?${params}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, bannedFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  function confirm(modal: ConfirmModal) {
    setConfirmModal(modal);
  }

  async function runAction(id: string, action: () => Promise<void>) {
    setActionLoading(id);
    try {
      await action();
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  }

  function handleBan(user: User) {
    confirm({
      title: `Ban ${user.profile?.name ?? user.phone}?`,
      message: 'This user will be immediately banned and unable to use the app.',
      danger: true,
      action: async () => {
        await runAction(user.id, async () => {
          await api.post(`/admin/users/${user.id}/ban`);
          showSuccess(`${user.profile?.name ?? user.phone} has been banned.`);
        });
      },
    });
  }

  function handleUnban(user: User) {
    confirm({
      title: `Unban ${user.profile?.name ?? user.phone}?`,
      message: 'This user will regain access to the app.',
      action: async () => {
        await runAction(user.id, async () => {
          await api.post(`/admin/users/${user.id}/unban`);
          showSuccess(`${user.profile?.name ?? user.phone} has been unbanned.`);
        });
      },
    });
  }

  function handleVerify(user: User) {
    confirm({
      title: `Verify ${user.profile?.name ?? user.phone}?`,
      message: 'This will manually mark the user as verified.',
      action: async () => {
        await runAction(user.id, async () => {
          await api.post(`/admin/users/${user.id}/verify`);
          showSuccess(`${user.profile?.name ?? user.phone} is now verified.`);
        });
      },
    });
  }

  function handleDelete(user: User) {
    confirm({
      title: `Delete ${user.profile?.name ?? user.phone}?`,
      message: 'This will permanently delete the account and all associated data. This cannot be undone.',
      danger: true,
      action: async () => {
        await runAction(user.id, async () => {
          await api.delete(`/admin/users/${user.id}`);
          showSuccess('User account deleted.');
        });
      },
    });
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <>
      <div className="page-header">
        <h1>Users</h1>
        <p>Manage user accounts, bans, and verifications.</p>
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
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="input"
          style={{ width: 140 }}
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select
          className="input"
          style={{ width: 150 }}
          value={bannedFilter}
          onChange={(e) => { setBannedFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="false">Active</option>
          <option value="true">Banned</option>
        </select>
        <button className="btn btn-ghost" onClick={() => { setSearch(''); setRoleFilter(''); setBannedFilter(''); setPage(1); }}>
          Clear
        </button>
      </div>

      {loading ? (
        <div className="loading-wrap"><span>⏳</span> Loading users…</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Status</th>
                <th>Mode</th>
                <th>Plan</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--ink-sec)', padding: '32px' }}>
                    No users found.
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="avatar">
                          {(user.profile?.name ?? user.phone).charAt(0).toUpperCase()}
                        </div>
                        <div className="user-cell-info">
                          <div className="user-cell-name">{user.profile?.name ?? 'No name'}</div>
                          <div className="user-cell-sub">{user.profile?.age ? `${user.profile.age}y` : ''} {user.profile?.gender ?? ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--ink-sec)', fontFamily: 'monospace' }}>{user.phone}</td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-purple' : 'badge-default'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      {user.profile?.verified ? (
                        <span className="badge badge-success">✓ Verified</span>
                      ) : (
                        <span className="badge badge-default">Unverified</span>
                      )}
                    </td>
                    <td>
                      {user.isBanned ? (
                        <span className="badge badge-danger">Banned</span>
                      ) : user.isOnline ? (
                        <span className="badge badge-success">Online</span>
                      ) : (
                        <span className="badge badge-default">Offline</span>
                      )}
                    </td>
                    <td>
                      {user.profile?.mode ? (
                        <span className="chip">{user.profile.mode.replace('_', ' ')}</span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${user.subscription?.plan !== 'free' ? 'badge-warning' : 'badge-default'}`}>
                        {user.subscription?.plan ?? 'free'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--ink-sec)' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="table-actions">
                        {!user.profile?.verified && (
                          <button
                            className="btn btn-success btn-sm"
                            disabled={actionLoading === user.id}
                            onClick={() => handleVerify(user)}
                            title="Verify user"
                          >
                            ✓
                          </button>
                        )}
                        {user.isBanned ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={actionLoading === user.id}
                            onClick={() => handleUnban(user)}
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            className="btn btn-warning btn-sm"
                            disabled={actionLoading === user.id}
                            onClick={() => handleBan(user)}
                          >
                            Ban
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={actionLoading === user.id}
                          onClick={() => handleDelete(user)}
                          title="Delete account"
                        >
                          🗑
                        </button>
                      </div>
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
            {data.total.toLocaleString()} users total
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
                className={`btn ${confirmModal.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={async () => {
                  setConfirmModal(null);
                  await confirmModal.action();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
