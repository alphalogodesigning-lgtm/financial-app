const { useState, useEffect } = React;

const {
    loadBudgetData,
    readBudgetDataFromLocal,
    saveBudgetData,
    getInitialData,
    ROAST_LEVELS,
    calculateInsightsMetrics,
    calculateHealthScore,
    getGradeInfo,
    getBrutalTruth,
    getPersonality,
    buildAchievements,
    calculateTransactionStats,
    getCurrentUserEntitlements
} = window.AppShared;

        function App() {
            const [data, setData] = useState(() => ({ ...getInitialData('insights'), ...(readBudgetDataFromLocal({ localFallback: true }) || {}) }));
            const [isRefreshing, setIsRefreshing] = useState(true);
            const [showSettings, setShowSettings] = useState(false);
            const [roastLevel, setRoastLevel] = useState('honest');
            const [tempRoastLevel, setTempRoastLevel] = useState('honest');
            const [entitlements, setEntitlements] = useState({ isPremium: false, isFree: true });
            const [isEntitlementsReady, setIsEntitlementsReady] = useState(false);

            const premiumBlurStyle = entitlements.isFree
                ? { filter: 'blur(10px)', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }
                : undefined;
            const premiumOverlayBackdropStyle = {
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '12px 24px 24px',
                background: 'rgba(10, 10, 10, 0.35)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '16px',
                zIndex: 3
            };
            const premiumOverlayCardStyle = {
                width: 'min(560px, 100%)',
                background: 'rgba(17, 17, 17, 0.88)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                borderRadius: '16px',
                padding: '30px 24px',
                textAlign: 'center',
                boxShadow: '0 20px 48px rgba(0, 0, 0, 0.45)'
            }
            const premiumUpgradeButtonStyle = {
                border: 'none',
                borderRadius: '999px',
                padding: '12px 28px',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.01em',
                color: '#0A0A0A',
                background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)',
                boxShadow: '0 8px 22px rgba(212, 175, 55, 0.35)',
                cursor: 'pointer',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease'
            };
;

            useEffect(() => {
                let isMounted = true;
                Promise.all([
                    loadBudgetData({
                        onRemoteData: (saved) => {
                            if (!isMounted || !saved) return;
                            setData(saved);
                            const savedRoastLevel = saved.roast_level || 'honest';
                            setRoastLevel(savedRoastLevel);
                            setTempRoastLevel(savedRoastLevel);
                            setIsRefreshing(false);
                        }
                    }),
                    getCurrentUserEntitlements()
                ]).then(([saved, access]) => {
                    if (!isMounted) return;
                    if (saved) {
                        setData(saved);
                        const savedRoastLevel = saved.roast_level || 'honest';
                        setRoastLevel(savedRoastLevel);
                        setTempRoastLevel(savedRoastLevel);
                    }
                    if (access) {
                        setEntitlements(access);
                    }
                    setIsRefreshing(false);
                    setIsEntitlementsReady(true);
                });
                return () => {
                    isMounted = false;
                };
            }, []);

            const handleSaveRoastLevel = async () => {
                const updatedData = {
                    ...data,
                    roast_level: tempRoastLevel
                };
                setData(updatedData);
                setRoastLevel(tempRoastLevel);
                setShowSettings(false);
                await saveBudgetData(updatedData, { redirect: false });
            };

            if (!isEntitlementsReady) {
                return (
                    <div className="container">
                        <div className="empty-state">
                            <div className="empty-emoji">⏳</div>
                            <div className="empty-title">Checking access...</div>
                        </div>
                    </div>
                );
            }

            const metrics = calculateInsightsMetrics(data);
            const {
                income,
                totalFixedExpenses,
                totalVariableSpent,
                totalSpent,
                savingsAmount,
                netWorth,
                savingsRate,
                lifetimeIncomeAdded,
                regretMoney,
                regretRatio,
                avgWeekendSpend,
                avgWeekdaySpend,
                weekendWeekdayRatio,
                lateNightSpent,
                lateNightSpendRatio,
                topCategory,
                topCategoryAmount,
                topCategoryPercentage,
                topMerchant,
                topMerchantVisits
            } = metrics;

            const healthScore = calculateHealthScore({
                savingsRate,
                regretRatio,
                lateNightSpendRatio,
                weekendWeekdayRatio,
                streak: data.streak
            });

            const gradeInfo = getGradeInfo(healthScore);
            const brutalTruth = getBrutalTruth({ roastLevel, metrics });
            const personality = getPersonality(metrics);
            const achievements = buildAchievements({ data, metrics });
            const {
                totalTransactions,
                avgTransactionSize,
                uniqueMerchants,
                biggestPurchase,
                annualSpendingRate
            } = calculateTransactionStats(data, metrics);

            return (
                <div className="container">
                    <nav className="main-nav">
                        <a href="index.html" className="nav-link">📊 Dashboard</a>
                        <a href="fixed-expenses.html" className="nav-link">⚓ Fixed Expenses</a>
                        <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
        <a href="savings-goal.html" className="nav-link">🎯 Savings Goal</a>
                        <a href="projections.html" className="nav-link">🔮 Projections</a>
                        <a href="purchase-simulator.html" className="nav-link">🧪 Simulator</a>
                        <a href="insights.html" className="nav-link active">🧠 Insights</a>
                        <button className="settings-btn" onClick={() => setShowSettings(true)}>
                            <span>{ROAST_LEVELS[roastLevel].emoji}</span>
                            <span>{ROAST_LEVELS[roastLevel].name}</span>
                        </button>
                    </nav>

                    {isRefreshing ? <p className="helper" style={{ marginBottom: "12px" }}>Showing cached data while syncing…</p> : null}
                    <div style={{
                        marginBottom: '24px',
                        padding: '18px 20px',
                        borderRadius: '14px',
                        border: `1px solid ${netWorth >= 0 ? 'rgba(102, 187, 106, 0.45)' : 'rgba(255, 107, 107, 0.45)'}`,
                        background: netWorth >= 0 ? 'rgba(102, 187, 106, 0.08)' : 'rgba(255, 107, 107, 0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem' }}>💀 Net Worth</div>
                        <div style={{
                            fontWeight: 900,
                            fontSize: '1.5rem',
                            color: netWorth >= 0 ? '#66BB6A' : '#FF6B6B'
                        }}>
                            RM{netWorth.toFixed(2)}
                        </div>
                        <div style={{ width: '100%', color: '#bbb', fontSize: '0.92rem' }}>
                            Income - total spent. {netWorth >= 0 ? 'You're in the green.' : 'You're in the red.'}
                        </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                    <div style={premiumBlurStyle}>
                    <div className="header">
                        <div className="header-left">
                            <h1 className="header-title">The Therapy Session</h1>
                            <p className="header-subtitle">Let's talk about your spending habits... honestly.</p>
                        </div>
                    </div>

                    {/* Financial Health Score */}
                    <div className="health-score-container">
                        <div className="health-score-wrapper">
                            <div className="health-grade" style={{ color: gradeInfo.color }}>
                                {gradeInfo.grade}
                            </div>
                            <div className="health-score-number" style={{ color: gradeInfo.color }}>
                                {healthScore}/100
                            </div>
                            <div className="health-score-label" style={{ color: gradeInfo.color }}>
                                {gradeInfo.text}
                            </div>
                        </div>
                    </div>

                    {/* Brutal Honesty */}
                    <div className="brutal-box">
                        <div className="brutal-title">
                            <span>💀</span>
                            <span>Brutal Honesty Corner</span>
                        </div>
                        <div className="brutal-text">
                            {brutalTruth}
                        </div>
                    </div>

                    {/* Spending Personality */}
                    <div className="personality-container">
                        <div className="personality-type">{personality.type}</div>
                        <div className="personality-description">{personality.description}</div>
                        <div className="personality-traits">
                            {personality.traits.map((trait, i) => (
                                <div key={i} className="trait">{trait}</div>
                            ))}
                        </div>
                    </div>

                    {/* Key Insights */}
                    <div className="insights-grid">
                        <div className="insight-card">
                            <div className="insight-icon">📅</div>
                            <div className="insight-title">Weekend vs Weekday</div>
                            <div className="insight-description">
                                You spend an average of <strong style={{ color: '#D4AF37' }}>RM{avgWeekendSpend.toFixed(2)}</strong> per day on weekends
                                vs <strong style={{ color: '#89ABE3' }}>RM{avgWeekdaySpend.toFixed(2)}</strong> on weekdays.
                            </div>
                            <div className="insight-stat">
                                {Number.isFinite(weekendWeekdayRatio) ? `${weekendWeekdayRatio.toFixed(1)}x` : 'N/A'}
                            </div>
                            {weekendWeekdayRatio > 2 && (
                                <div className="insight-recommendation">
                                    💡 Your weekends are expensive. Maybe try a free hobby?
                                </div>
                            )}
                        </div>

                        <div className="insight-card">
                            <div className="insight-icon">🌙</div>
                            <div className="insight-title">Night Owl Analysis</div>
                            <div className="insight-description">
                                You've spent <strong style={{ color: '#FF6B6B' }}>RM{lateNightSpent.toFixed(2)}</strong> between 10pm and 4am.
                                That's <strong>{(lateNightSpendRatio * 100).toFixed(0)}%</strong> of your variable spending.
                            </div>
                            <div className="insight-stat" style={{ color: '#FF6B6B' }}>
                                {(lateNightSpendRatio * 100).toFixed(0)}%
                            </div>
                            {lateNightSpendRatio > 0.3 && (
                                <div className="insight-recommendation" style={{ borderColor: '#FF6B6B', color: '#FF6B6B' }}>
                                    💡 Nothing good happens to your wallet after 10pm. Delete those shopping apps from your home screen.
                                </div>
                            )}
                        </div>

                        <div className="insight-card">
                            <div className="insight-icon">🍔</div>
                            <div className="insight-title">Category Addiction</div>
                            <div className="insight-description">
                                Your top category is <strong style={{ color: '#D4AF37' }}>{topCategory}</strong> at 
                                <strong> RM{topCategoryAmount.toFixed(2)}</strong>. That's 
                                <strong> {topCategoryPercentage.toFixed(0)}%</strong> of your variable spending.
                            </div>
                            <div className="insight-stat">
                                {topCategoryPercentage.toFixed(0)}%
                            </div>
                            {topCategoryPercentage > 60 && (
                                <div className="insight-recommendation">
                                    💡 {topCategory === 'Food' ? 'You might have a Food problem. Or is it a passion? You decide.' : `${topCategoryPercentage.toFixed(0)}% on ${topCategory}? That's a lot.`}
                                </div>
                            )}
                        </div>

                        <div className="insight-card">
                            <div className="insight-icon">😬</div>
                            <div className="insight-title">Regret Money</div>
                            <div className="insight-description">
                                You've marked <strong style={{ color: '#FF6B6B' }}>RM{regretMoney.toFixed(2)}</strong> worth of purchases as regrets.
                                That's money you wish you could take back.
                            </div>
                            <div className="insight-stat" style={{ color: '#FF6B6B' }}>
                                RM{regretMoney.toFixed(2)}
                            </div>
                            {regretMoney > 50 && (
                                <div className="insight-recommendation" style={{ borderColor: '#FF6B6B', color: '#FF6B6B' }}>
                                    💡 Imagine if you had that RM{regretMoney.toFixed(0)} back. Wait 24hrs before big purchases.
                                </div>
                            )}
                        </div>

                        <div className="insight-card">
                            <div className="insight-icon">🏪</div>
                            <div className="insight-title">Merchant Loyalty</div>
                            <div className="insight-description">
                                Your most visited merchant is <strong style={{ color: '#D4AF37' }}>{topMerchant}</strong>{' '}
                                with <strong>{topMerchantVisits}</strong> visits.
                            </div>
                            <div className="insight-stat" style={{ color: '#66BB6A' }}>
                                {topMerchantVisits}
                            </div>
                            {topMerchantVisits >= 7 && (
                                <div className="insight-recommendation">
                                    💡 {topMerchantVisits} visits to {topMerchant}. They should give you a loyalty card at this point.
                                </div>
                            )}
                        </div>

                        <div className="insight-card">
                            <div className="insight-icon">💰</div>
                            <div className="insight-title">Savings Rate</div>
                            <div className="insight-description">
                                You're saving <strong style={{ color: savingsRate >= 20 ? '#66BB6A' : '#FF6B6B' }}>
                                {savingsRate.toFixed(1)}%</strong> of your income. Financial experts recommend 20% minimum.
                            </div>
                            <div className="insight-stat" style={{ color: savingsRate >= 20 ? '#66BB6A' : '#FF6B6B' }}>
                                {savingsRate.toFixed(1)}%
                            </div>
                            <div className="insight-recommendation" style={{ 
                                borderColor: savingsRate >= 20 ? '#66BB6A' : '#FF6B6B',
                                color: savingsRate >= 20 ? '#66BB6A' : '#FF6B6B'
                            }}>
                                {savingsRate >= 20 
                                    ? '💡 Excellent! Keep this up and you\'ll be financially secure.' 
                                    : '💡 Try to increase your savings rate. Future you will be grateful.'}
                            </div>
                        </div>

                    </div>

                    {/* Achievements */}
                    <div className="achievements-section">
                        <h2 className="section-title">Achievements Unlocked</h2>
                        <div className="achievements-grid">
                            {achievements.map((achievement, i) => (
                                <div key={i} className={`achievement ${achievement.unlocked ? 'unlocked' : 'locked'}`}>
                                    <div className="achievement-icon">{achievement.icon}</div>
                                    <div className="achievement-name">{achievement.name}</div>
                                    <div className="achievement-description">{achievement.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Fun Stats */}
                    <div className="fun-stats-section">
                        <h2 className="section-title">Weird Stats That Don't Matter But Are Fun</h2>
                        <div className="fun-stats-grid">
                            <div className="fun-stat">
                                <div className="fun-stat-value gold-text">{totalTransactions}</div>
                                <div className="fun-stat-label">Transactions This Month</div>
                            </div>
                            <div className="fun-stat">
                                <div className="fun-stat-value soft-blue-text">RM{avgTransactionSize.toFixed(2)}</div>
                                <div className="fun-stat-label">Avg Transaction Size</div>
                            </div>
                            <div className="fun-stat">
                                <div className="fun-stat-value purple-text">{uniqueMerchants}</div>
                                <div className="fun-stat-label">Unique Merchants</div>
                            </div>
                            <div className="fun-stat">
                                <div className="fun-stat-value green-text">{data.streak}</div>
                                <div className="fun-stat-label">Day Streak</div>
                            </div>
                            <div className="fun-stat">
                                <div className="fun-stat-value red-text">RM{annualSpendingRate.toFixed(2)}</div>
                                <div className="fun-stat-label">Annual Spending Rate</div>
                            </div>
                            <div className="fun-stat">
                                <div className="fun-stat-value gold-text">RM{biggestPurchase.toFixed(2)}</div>
                                <div className="fun-stat-label">Biggest Single Purchase</div>
                            </div>
                            <div className="fun-stat">
                                <div className="fun-stat-value" style={{ color: '#D4AF37' }}>RM{lifetimeIncomeAdded.toFixed(2)}</div>
                                <div className="fun-stat-label">Net Worth</div>
                            </div>
                        </div>
                    </div>

                    {/* Settings Modal */}
                    {showSettings && (
                        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h2 className="modal-title">Choose Your Roast Level</h2>
                                    <p className="modal-subtitle">
                                        How honest do you want this app to be about your spending habits?
                                    </p>
                                </div>

                                <div className="roast-levels">
                                    {Object.values(ROAST_LEVELS).map(level => (
                                        <div 
                                            key={level.id}
                                            className={`roast-level-option ${tempRoastLevel === level.id ? 'selected' : ''}`}
                                            onClick={() => setTempRoastLevel(level.id)}
                                        >
                                            <div className="roast-level-header">
                                                <span className="roast-level-emoji">{level.emoji}</span>
                                                <span className="roast-level-name" style={{ color: level.color }}>
                                                    {level.name}
                                                </span>
                                            </div>
                                            <div className="roast-level-description">{level.description}</div>
                                            <div className="roast-level-example">
                                                Example: "{level.example}"
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="modal-actions">
                                    <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>
                                        Cancel
                                    </button>
                                    <button className="btn btn-primary" onClick={handleSaveRoastLevel}>
                                        Save Preference
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                    {entitlements.isFree && (
                        <div style={premiumOverlayBackdropStyle}>
                            <div style={premiumOverlayCardStyle}>
                                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔒</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#D4AF37', lineHeight: 1.15, marginBottom: '12px' }}>
                                    Locked behind Premium 💀
                                </div>
                                <p style={{ color: '#CFCFCF', fontSize: '1.1rem', marginBottom: '20px' }}>
                                    Want the full access? Upgrade now. Cancel Anytime 😏
                                </p>
                                <button style={premiumUpgradeButtonStyle} onClick={() => { window.location.href = 'https://buy.stripe.com/3cI14ggg3dxa1Xe7tm8g000'; }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 26px rgba(212, 175, 55, 0.45)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(212, 175, 55, 0.35)'; }}>
                                    7-day Trial
                                </button>
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
