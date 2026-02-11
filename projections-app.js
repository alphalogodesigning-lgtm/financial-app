const { useState, useEffect } = React;

const {
    loadBudgetData,
    getInitialData,
    START_MESSAGE,
    calculateProjectionSummary,
    calculateGoalSummary,
    buildProjectionTimeline,
    buildScenarioDefinitions
} = window.AppShared;

function Projections() {
    const [data, setData] = useState(getInitialData('projections'));
    const [isHydrated, setIsHydrated] = useState(false);

    const income = Number.isFinite(data.income) ? data.income : 0;
    const incomeSet = income > 0;

    const [scenarioIncome, setScenarioIncome] = useState(incomeSet ? income : 1000);
    const [scenarioVariableSpend, setScenarioVariableSpend] = useState(100);
    const [activeScenario, setActiveScenario] = useState(null);

    const [savingsGoal, setSavingsGoal] = useState(10000);
    const [monthlySavings, setMonthlySavings] = useState(500);

    useEffect(() => {
        let isMounted = true;
        loadBudgetData().then((saved) => {
            if (!isMounted) return;
            if (saved) setData(saved);
            setIsHydrated(true);
        });
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        if (Number.isFinite(data.income) && data.income > 0) setScenarioIncome(data.income);
        const currentVariableTotal = (data.variableExpenses || []).reduce((sum, exp) => sum + exp.amount, 0);
        setScenarioVariableSpend(currentVariableTotal > 0 ? 100 : 100);
    }, [data, isHydrated]);

    /* ── Empty state ─────────────────────────────────────── */
    if (!incomeSet) {
        return (
            <div className="container">
                <nav className="main-nav">
                    <a href="index.html"            className="nav-link">📊 Dashboard</a>
                    <a href="fixed-expenses.html"   className="nav-link">⚓ Fixed Expenses</a>
                    <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
                    <a href="projections.html"      className="nav-link active">🔮 Projections</a>
                    <a href="insights.html"         className="nav-link">🧠 Insights</a>
                </nav>
                <div className="header">
                    <p className="header-eyebrow">Projections</p>
                    <h1 className="header-title">The Crystal <span>Ball</span></h1>
                    <p className="header-subtitle">Play with scenarios and see your financial future</p>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🔮</div>
                    <div style={{ fontFamily: 'Inter, -apple-system, sans-serif', fontSize: '1.25rem', fontWeight: 800, color: '#D4AF37', marginBottom: '8px' }}>
                        {START_MESSAGE}
                    </div>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Set your income on the Dashboard to unlock projections.</p>
                </div>
            </div>
        );
    }

    /* ── Calculations ────────────────────────────────────── */
    const fixedExpenses   = data.fixedExpenses   || [];
    const variableExpenses = data.variableExpenses || [];

    const projectionSummary = calculateProjectionSummary({
        fixedExpenses,
        variableExpenses,
        scenarioIncome,
        scenarioVariableSpend
    });

    const {
        totalFixed, totalVariable, currentMonthlySpend,
        projectedVariableSpend, projectedMonthlySpend,
        projectedRemaining, projectedAnnualSavings
    } = projectionSummary;

    const { monthsToGoal, goalDate, progressPercent } = calculateGoalSummary(savingsGoal, monthlySavings);

    const timelineData = buildProjectionTimeline(fixedExpenses, income, 30);

    const scenarios = buildScenarioDefinitions({
        totalVariable,
        income,
        setScenarioVariableSpend,
        setScenarioIncome,
        setActiveScenario
    });

    const resetScenario = () => {
        setScenarioIncome(data.income);
        setScenarioVariableSpend(100);
        setActiveScenario(null);
    };

    /* ── Scenario emoji map ──────────────────────────────── */
    const scenarioEmojis = ['✂️', '📈', '🎯', '🏡', '💼', '🚀'];

    return (
        <div className="container">
            {/* Navigation */}
            <nav className="main-nav">
                <a href="index.html"            className="nav-link">📊 Dashboard</a>
                <a href="fixed-expenses.html"   className="nav-link">⚓ Fixed Expenses</a>
                <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
                <a href="projections.html"      className="nav-link active">🔮 Projections</a>
                <a href="insights.html"         className="nav-link">🧠 Insights</a>
            </nav>

            {/* Header */}
            <div className="header">
                <p className="header-eyebrow">Projections</p>
                <h1 className="header-title">The Crystal <span>Ball</span></h1>
                <p className="header-subtitle">Play with scenarios and see how they reshape your financial future</p>
            </div>

            {/* ── What-If Scenarios ─────────────────────────── */}
            <div className="card">
                <h2 className="card-title">What-If Scenarios</h2>
                <p className="card-subtitle">Tap a preset to load it instantly, or dial the sliders yourself</p>

                <div className="scenario-grid">
                    {scenarios.map((scenario, i) => (
                        <div
                            key={scenario.id}
                            className={`scenario-card ${activeScenario === scenario.id ? 'active' : ''}`}
                            onClick={scenario.action}
                        >
                            <span className="scenario-emoji">{scenarioEmojis[i] || '💡'}</span>
                            <div className="scenario-title">{scenario.title}</div>
                            <div className="scenario-description">{scenario.description}</div>
                            <div className={`scenario-impact ${scenario.impact < 0 ? 'negative' : ''}`}>
                                {scenario.impact >= 0 ? '+' : ''}RM{scenario.impact.toFixed(0)}/mo
                            </div>
                        </div>
                    ))}
                </div>

                {activeScenario && (
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <button className="reset-btn" onClick={resetScenario}>
                            ↩ Reset to Current
                        </button>
                    </div>
                )}

                {/* Sliders + Impact */}
                <div className="two-col" style={{ marginTop: '24px' }}>
                    <div>
                        <div className="slider-group">
                            <div className="slider-label">
                                <span className="slider-name">Monthly Income</span>
                                <span className="slider-value">RM{scenarioIncome.toFixed(0)}</span>
                            </div>
                            <input
                                type="range"
                                min={100}
                                max={5000}
                                step="100"
                                value={scenarioIncome}
                                onChange={(e) => {
                                    setScenarioIncome(parseFloat(e.target.value));
                                    setActiveScenario('custom');
                                }}
                            />
                        </div>

                        <div className="slider-group">
                            <div className="slider-label">
                                <span className="slider-name">Variable Spending</span>
                                <span className="slider-value">{scenarioVariableSpend.toFixed(0)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="200"
                                step="5"
                                value={scenarioVariableSpend}
                                onChange={(e) => {
                                    setScenarioVariableSpend(parseFloat(e.target.value));
                                    setActiveScenario('custom');
                                }}
                            />
                            <div className="slider-hint">
                                RM{projectedVariableSpend.toFixed(0)} projected / month
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="impact-box">
                            <div className="impact-label">Projected Monthly Savings</div>
                            <div className={`impact-value ${projectedRemaining >= 0 ? 'green-text' : 'red-text'}`}>
                                RM{projectedRemaining.toFixed(0)}
                            </div>
                            <div className="impact-subtext">
                                vs RM{(data.income - currentMonthlySpend).toFixed(0)} currently
                            </div>
                        </div>

                        <div className="impact-box">
                            <div className="impact-label">Projected Annual Savings</div>
                            <div className={`impact-value ${projectedAnnualSavings >= 0 ? 'gold-text' : 'red-text'}`}>
                                RM{projectedAnnualSavings.toFixed(0)}
                            </div>
                            <div className="impact-subtext">
                                {projectedRemaining >= 0
                                    ? `${((projectedRemaining / scenarioIncome) * 100).toFixed(1)}% of your income`
                                    : "You'll be in the red at this rate"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Savings Goal Simulator ──────────────────────── */}
            <div className="card">
                <h2 className="card-title">Savings Goal Simulator</h2>
                <p className="card-subtitle">Set a target and watch the timeline calculate itself</p>

                <div className="goal-inputs">
                    <div className="goal-input-group">
                        <label className="goal-input-label">Savings Goal (RM)</label>
                        <input
                            type="number"
                            value={savingsGoal}
                            onChange={(e) => setSavingsGoal(parseFloat(e.target.value) || 0)}
                            placeholder="10000"
                        />
                    </div>
                    <div className="goal-input-group">
                        <label className="goal-input-label">Monthly Contribution (RM)</label>
                        <input
                            type="number"
                            value={monthlySavings}
                            onChange={(e) => setMonthlySavings(parseFloat(e.target.value) || 0)}
                            placeholder="500"
                        />
                    </div>
                </div>

                <div className="goal-progress-track">
                    <div
                        className="goal-progress-fill"
                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                </div>

                <div className="goal-stats">
                    <div className="goal-stat">
                        <div className="goal-stat-value">{Math.ceil(monthsToGoal)}</div>
                        <div className="goal-stat-label">Months to Goal</div>
                    </div>
                    <div className="goal-stat">
                        <div className="goal-stat-value">
                            {goalDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                        <div className="goal-stat-label">Target Date</div>
                    </div>
                    <div className="goal-stat">
                        <div className="goal-stat-value">RM{(monthlySavings * 12).toFixed(0)}</div>
                        <div className="goal-stat-label">Annual Savings</div>
                    </div>
                </div>

                {progressPercent > 100 && (
                    <div className="alert alert-green">
                        <span className="alert-icon">🎉</span>
                        <span>You're on track! You'll reach your goal even faster than expected.</span>
                    </div>
                )}

                {monthlySavings > projectedRemaining && projectedRemaining > 0 && (
                    <div className="alert alert-gold">
                        <span className="alert-icon">⚠️</span>
                        <span>
                            Your goal needs RM{monthlySavings}/mo but you're currently saving RM{projectedRemaining.toFixed(0)}/mo.
                            Consider adjusting your scenario above.
                        </span>
                    </div>
                )}
            </div>

            {/* ── Upcoming Expense Timeline ───────────────────── */}
            <div className="card">
                <h2 className="card-title">Upcoming Expense Clusters</h2>
                <p className="card-subtitle">
                    Days in the next 30 where multiple fixed expenses hit at once — brace yourself 😅
                </p>

                {timelineData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#555' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📭</div>
                        <p style={{ fontSize: '0.9rem' }}>No fixed expenses scheduled in the next 30 days.</p>
                    </div>
                ) : (
                    <div className="timeline">
                        <div className="timeline-track" />
                        {timelineData.map((item, index) => (
                            <div
                                key={index}
                                className={`timeline-item ${item.isCluster ? 'cluster' : ''}`}
                            >
                                <div className={`timeline-dot ${item.isCluster ? 'cluster' : ''}`} />
                                <div className="timeline-date">
                                    {item.date}
                                    {item.isCluster && (
                                        <span className="cluster-badge">Heavy Day</span>
                                    )}
                                </div>
                                <div className="timeline-expenses">
                                    {item.expenses.map(exp => (
                                        <div key={exp.id} className="timeline-expense">
                                            <span className="timeline-expense-name">{exp.name}</span>
                                            <span className="timeline-expense-amount">RM{exp.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="timeline-total">
                                    <span className="timeline-total-label">Daily Total</span>
                                    <span className="timeline-total-amount">RM{item.total.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

ReactDOM.render(<Projections />, document.getElementById('root'));
