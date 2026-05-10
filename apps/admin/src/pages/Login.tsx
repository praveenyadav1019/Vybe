import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Please enter an admin token.');
      return;
    }

    setLoading(true);

    try {
      // Verify the token works by calling the stats endpoint
      const res = await fetch('http://localhost:4010/admin/stats', {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 403) {
        setError('Access denied. This token does not have admin privileges.');
        setLoading(false);
        return;
      }

      if (!res.ok && res.status !== 200) {
        // For dev-access-token, accept even if server is offline
        if (token.trim() === 'dev-access-token') {
          localStorage.setItem('admin_token', token.trim());
          navigate('/dashboard');
          return;
        }
        setError('Could not verify token. Check that the API server is running.');
        setLoading(false);
        return;
      }

      localStorage.setItem('admin_token', token.trim());
      navigate('/dashboard');
    } catch {
      // Network error — allow dev token offline
      if (token.trim() === 'dev-access-token') {
        localStorage.setItem('admin_token', token.trim());
        navigate('/dashboard');
        return;
      }
      setError('Could not connect to the API server at http://localhost:4010. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <h1>VYBE</h1>
          <p>Admin Dashboard</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="token">Admin Token</label>
            <input
              id="token"
              type="password"
              className="input"
              placeholder="Enter your admin JWT token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="error-wrap" style={{ marginBottom: 0 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button type="submit" className="btn btn-login" disabled={loading}>
            {loading ? 'Verifying…' : 'Sign In'}
          </button>
        </form>

        <p className="login-note">
          In production, use your admin JWT token.<br />
          For local development, use <strong>dev-access-token</strong>.
        </p>
      </div>
    </div>
  );
}
