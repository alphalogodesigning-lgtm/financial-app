const { useState, useEffect } = React;

const { supabaseClient } = window.AppShared;

        function AuthPage() {
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
                    setTimeout(() => {
                        window.location.href = 'index.html';
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
                                {isSubmitting
                                    ? 'Please wait...'
                                    : (mode === 'login' ? 'Sign In' : 'Create Account')}
                            </button>
                        </form>

                        {currentUser && (
                            <div className="account-box">
                                <div>Signed in as <strong>{currentUser.email}</strong></div>
                                <div>Member ID: <code>{currentUser.id}</code></div>
                                <button className="primary" style={{ marginTop: 10 }} onClick={handleLogout} type="button">Sign Out</button>
                            </div>
                        )}

                        <div className="small"><a href="index.html">Go to Dashboard</a></div>
                        <div className={`status ${statusType}`}>{status}</div>
                    </div>
                </div>
            );
        }

        ReactDOM.createRoot(document.getElementById('root')).render(<AuthPage />);
