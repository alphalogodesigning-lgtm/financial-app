const { useState, useEffect } = React;

const {
    loadBudgetData,
    saveBudgetData,
    getInitialData,
    ROAST_LEVELS,
    calculateInsightsMetrics,
    calculateHealthScore,
    getGradeInfo,
    getBrutalTruth,
    getPersonality,
    buildAchievements,
    calculateTransactionStats
} = window.AppShared;

        function App() {
            const [data, setData] = useState(getInitialData('insights'));
            const [isHydrated, setIsHydrated] = useState(false);
            const [showSettings, setShowSettings] = useState(false);
            const [roastLevel, setRoastLevel] = useState('honest');
            const [tempRoastLevel, setTempRoastLevel] = useState('honest');

            useEffect(() => {
                let isMounted = true;
                loadBudgetData().then((saved) => {
                    if (!isMounted) return;
                    if (saved) {
                        setData(saved);
                        const savedRoastLevel = saved.roast_level || 'honest';
                        setRoastLevel(savedRoastLevel);
                        setTempRoastLevel(savedRoastLevel);
                    }
                    setIsHydrated(true);
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

            const metrics = calculateInsightsMetrics(data);
            const {
                income,
                totalFixedExpenses,
                totalVariableSpent,
                totalSpent,
                savingsAmount,
                savingsRate,
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
                        <div className="nav-links">
                            <a href="index.html" className="nav-link">📊 Dashboard</a>
                            <a href="fixed-expenses.html" className="nav-link">⚓ Fixed Expenses</a>
                            <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
                            <a href="projections.html" className="nav-link">🔮 Projections</a>
                            <a href="insights.html" className="nav-link active">🧠 Insights</a>
                        </div>
                        <div className="current-roast-indicator">
                            <span>{ROAST_LEVELS[roastLevel].emoji}</span>
                            <span>{ROAST_LEVELS[roastLevel].name}</span>
                        </div>
                        <button className="settings-btn" onClick={() => setShowSettings(true)}>
                            <span>⚙️</span>
                            <span>Roast Level</span>
                        </button>
                    </nav>

                    <div className="header">
                        <h1 className="header-title">The Therapy Session</h1>
                        <p className="header-subtitle">Let's talk about your spending habits... honestly.</p>
                    </div>

                    {/* Financial Health Score */}
                    <div className="health-score-container">
                        <div className="health-grade" style={{ color: gradeInfo.color }}>
                            {gradeInfo.grade}
                        </div>
                        <div className="health-score-label">{gradeInfo.text}</div>
                        <div style={{ fontSize: '1.25rem', color: '#888', marginTop: '12px' }}>
                            Financial Health Score: <span style={{ color: gradeInfo.color, fontWeight: '700' }}>{healthScore}/100</span>
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
                                Your most visited merchant is <strong style={{ color: '#D4AF37' }}>{topMerchant}</strong> 
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
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
