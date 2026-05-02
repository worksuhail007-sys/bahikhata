'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      // Force a hard redirect to bypass Next.js client-side cache staleness
      // This ensures the middleware sees the newly set cookie immediately
      window.location.href = '/';
    } else {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '1rem',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📔</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--primary)' }}>BahiKhata</h1>
          <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '0.25rem' }}>Smart Labour & Construction Ledger</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#aaa' }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#aaa' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in...' : '🔐 Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#555', fontSize: '0.8rem', marginTop: '1.5rem' }}>
          🔒 Private access only. Authorized family members.
        </p>
      </div>
    </div>
  );
}
