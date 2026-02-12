'use client';

import { useEffect, useState } from 'react';
import { loadBudgetData, supabaseClient } from '../../lib/app-shared';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabaseClient) return;
    supabaseClient.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user || null);
    });
  }, []);

  const setStatusMessage = (message, type = '') => {
    setStatus(message);
    setStatusType(type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!supabaseClient) {
      setStatusMessage('The account service is currently unavailable. Please try again shortly.', 'error');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Just a sec — checking your details...');

    let data;
    let error;

    if (mode === 'login') {
      ({ data, error } = await supabaseClient.auth.signInWithPassword({ email, password }));
    } else {
      ({ data, error } = await supabaseClient.auth.signUp({ email, password }));
    }

    if (error) {
      const message = (error.message || '').toLowerCase();
      const rateLimited = error.status === 429 || message.includes('rate limit');

      if (rateLimited && mode === 'signup') {
        setStatusMessage('Too many signup attempts right now. Please wait a little before trying again.', 'error');
      } else {
        setStatusMessage(error.message || 'Something went wrong. Please try again.', 'error');
      }
      setIsSubmitting(false);
      return;
    }

    setCurrentUser(data.user || null);

    if (mode === 'login') {
      setStatusMessage('Welcome back! Taking you to your dashboard...', 'success');
      const userData = await loadBudgetData({ redirect: false, localFallback: false });
      const hasCompletedOnboarding = Boolean(userData) && userData.onboarding_complete !== false;
      setTimeout(() => {
        window.location.href = hasCompletedOnboarding ? 'index.html' : 'onboarding.html';
      }, 650);
    } else if (data?.session) {
      setStatusMessage('Account created. Let’s set you up in 30 seconds 🚀', 'success');
      setTimeout(() => {
        window.location.href = 'onboarding.html';
      }, 650);
    } else {
      setStatusMessage('Account created successfully! You can now sign in.', 'success');
      setMode('login');
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    setCurrentUser(null);
    setStatusMessage('You’re signed out for now.', 'success');
  };

  return (
    <>
      <div className="fx-layer">
        <div className="beam" />
      </div>

      <div className="wrap">
        <div className="card">
          <span className="brand-chip">Budget Tracker</span>
          <h1>Welcome Back</h1>
          <p>Sign in to continue, or create your account to save your budgets securely across devices.</p>

          <div className="tabs">
            <button
              className={`tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
              disabled={isSubmitting}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => setMode('signup')}
              disabled={isSubmitting}
              type="button"
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <input
              className="field"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <input
              className="field"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <button className="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {currentUser && (
            <div className="account-box">
              <div>
                Signed in as <strong>{currentUser.email}</strong>
              </div>
              <div>
                Member ID: <code>{currentUser.id}</code>
              </div>
              <button className="primary" style={{ marginTop: 10 }} onClick={handleLogout} type="button">
                Sign Out
              </button>
            </div>
          )}

          <div className={`status ${statusType}`}>{status}</div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&display=swap');

        :root {
          --black: #0a0a0a;
          --surface: #141414;
          --surface-2: #1a1a1a;
          --gold-1: #D4AF37;
          --gold-2: #FFD700;
          --text: #f0f0f0;
          --muted: #666;
          --border: rgba(255,255,255,0.07);
          --success: #66BB6A;
          --danger: #FF6B6B;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          min-height: 100vh;
          font-family: 'DM Sans', -apple-system, sans-serif;
          color: var(--text);
          background: var(--black);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(212,175,55,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,175,55,0.03) 1px, transparent 1px);
          background-size: 52px 52px;
          pointer-events: none;
          z-index: 0;
        }

        .fx-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .beam {
          position: absolute;
          top: -10%;
          left: 50%;
          transform: translateX(-50%);
          width: 1px;
          height: 120%;
          background: linear-gradient(180deg, transparent 0%, transparent 15%, rgba(212,175,55,0.6) 40%, rgba(255,215,0,1.0) 50%, rgba(212,175,55,0.6) 60%, transparent 85%, transparent 100%);
          animation: beam-sweep 1.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
        }

        .beam::before {
          content: '';
          position: absolute;
          inset: 0;
          width: 280px;
          left: 50%;
          transform: translateX(-50%);
          background: inherit;
          filter: blur(48px);
          opacity: 0.3;
        }

        @keyframes beam-sweep {
          0% { opacity: 0; transform: translateX(-50%) translateY(-8%) scaleY(0.5); }
          20% { opacity: 1; }
          55% { opacity: 0.9; transform: translateX(-50%) translateY(0%) scaleY(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(4%) scaleY(1.05); }
        }

        .wrap {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px 16px;
        }

        .card {
          width: 100%;
          max-width: 460px;
          padding: 40px 36px 36px;
          border-radius: 24px;
          border: 1px solid var(--border);
          background: linear-gradient(160deg, rgba(26,26,26,0.96) 0%, rgba(14,14,14,0.99) 100%);
          backdrop-filter: blur(24px);
          box-shadow: 0 0 0 1px rgba(212,175,55,0.06), 0 40px 80px rgba(0,0,0,0.7);
          animation: card-rise 0.55s 0.15s cubic-bezier(0.4,0,0.2,1) both;
        }

        @keyframes card-rise {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .card::before {
          content: '';
          display: block;
          height: 1px;
          margin: -40px -36px 36px;
          background: linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent);
          border-radius: 24px 24px 0 0;
        }

        .brand-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #0a0a0a;
          padding: 5px 13px 5px 9px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--gold-1), var(--gold-2));
          margin-bottom: 20px;
          box-shadow: 0 4px 20px rgba(212,175,55,0.35);
          animation: slide-in 0.45s 0.5s cubic-bezier(0.4,0,0.2,1) both;
        }

        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        h1 {
          font-family: 'DM Serif Display', Georgia, serif;
          font-weight: 400;
          font-size: clamp(30px, 4.8vw, 40px);
          letter-spacing: -0.015em;
          line-height: 1.1;
          margin-bottom: 8px;
          color: #fff;
          animation: fade-up 0.45s 0.62s cubic-bezier(0.4,0,0.2,1) both;
        }

        p {
          margin: 10px 0 0;
          color: var(--muted);
          font-size: 14.5px;
          line-height: 1.55;
          font-weight: 500;
          animation: fade-up 0.45s 0.68s cubic-bezier(0.4,0,0.2,1) both;
        }

        @keyframes fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .tabs {
          margin-top: 20px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          padding: 4px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          animation: fade-up 0.45s 0.78s cubic-bezier(0.4,0,0.2,1) both;
        }

        .tab {
          appearance: none;
          border: 0;
          background: transparent;
          color: #9a9a9a;
          padding: 11px 10px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab:hover { color: #d5d5d5; }

        .tab.active {
          background: linear-gradient(135deg, var(--gold-1), var(--gold-2));
          color: #0a0a0a;
          box-shadow: 0 4px 16px rgba(212,175,55,0.28);
        }

        form {
          margin-top: 16px;
          display: grid;
          gap: 12px;
          animation: fade-up 0.45s 0.84s cubic-bezier(0.4,0,0.2,1) both;
        }

        .field {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          color: #fff;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }

        .field::placeholder { color: #6f6f6f; }

        .field:focus {
          border-color: rgba(212,175,55,0.5);
          box-shadow: 0 0 0 4px rgba(212,175,55,0.12);
          background: rgba(255,255,255,0.03);
        }

        .primary {
          margin-top: 3px;
          width: 100%;
          border: 0;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.01em;
          cursor: pointer;
          color: #0a0a0a;
          background: linear-gradient(135deg, var(--gold-1), var(--gold-2));
          box-shadow: 0 8px 24px rgba(212,175,55,0.27);
          transition: transform 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease;
        }

        .primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(212,175,55,0.33);
          filter: saturate(1.03);
        }

        .primary:active { transform: translateY(0); }

        .primary:disabled,
        .tab:disabled,
        .field:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .account-box {
          margin-top: 16px;
          border-radius: 12px;
          padding: 14px 16px;
          border: 1px solid rgba(102,187,106,0.22);
          background: rgba(102,187,106,0.07);
          color: #c5f0c8;
          font-size: 13.5px;
          line-height: 1.55;
          font-weight: 500;
        }

        .account-box code {
          background: rgba(0,0,0,0.3);
          padding: 2px 7px;
          border-radius: 6px;
          color: #a8f0b0;
          font-size: 12.5px;
        }

        .status {
          margin-top: 14px;
          min-height: 20px;
          font-size: 13.5px;
          color: var(--muted);
          font-weight: 500;
        }

        .status.error { color: var(--danger); }
        .status.success { color: var(--success); }

        @media (max-width: 520px) {
          .card {
            padding: 32px 22px 28px;
            border-radius: 20px;
          }

          .card::before {
            margin: -32px -22px 32px;
          }

          h1 { font-size: 28px; }
        }
      `}</style>
    </>
  );
}
