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

            // What-if scenario state
            const [scenarioIncome, setScenarioIncome] = useState(incomeSet ? income : 1000);
            const [scenarioVariableSpend, setScenarioVariableSpend] = useState(100);
            const [activeScenario, setActiveScenario] = useState(null);

            // Goal state
            const [savingsGoal, setSavingsGoal] = useState(10000);
            const [monthlySavings, setMonthlySavings] = useState(500);

            useEffect(() => {
                let isMounted = true;
                loadBudgetData().then((saved) => {
                    if (!isMounted) return;
                    if (saved) {
                        setData(saved);
                    }
                    setIsHydrated(true);
                });
                return () => {
                    isMounted = false;
                };
            }, []);

            useEffect(() => {
                if (!isHydrated) return;
                if (Number.isFinite(data.income) && data.income > 0) setScenarioIncome(data.income);
            const currentVariableTotal = (data.variableExpenses || []).reduce((sum, exp) => sum + exp.amount, 0);
            setScenarioVariableSpend(currentVariableTotal > 0 ? 100 : 100);
            }, [data, isHydrated]);

            if (!incomeSet) {
                return (
                    <div className="container">
                        {/* Navigation */}
                        <nav className="main-nav">
                            <a href="index.html" className="nav-link">📊 Dashboard</a>
                            <a href="fixed-expenses.html" className="nav-link">⚓ Fixed Expenses</a>
                            <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
                            <a href="projections.html" className="nav-link active">🔮 Projections</a>
                            <a href="insights.html" className="nav-link">🧠 Insights</a>
                        </nav>

                        {/* Header */}
                        <div className="header">
                            <div>
                                <h1 className="header-title">The Crystal Ball</h1>
                                <p className="header-subtitle">Play with scenarios and see your financial future</p>
                            </div>
                        </div>

                        <div className="card" style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#D4AF37' }}>
                            {START_MESSAGE}
                        </div>
                    </div>
                );
            }

            // Calculations
            const fixedExpenses = data.fixedExpenses || [];
            const variableExpenses = data.variableExpenses || [];
            
            const projectionSummary = calculateProjectionSummary({
                fixedExpenses,
                variableExpenses,
                scenarioIncome,
                scenarioVariableSpend
            });

            const { totalFixed, totalVariable, currentMonthlySpend, projectedVariableSpend, projectedMonthlySpend, projectedRemaining, projectedAnnualSavings } = projectionSummary;

            const { monthsToGoal, goalDate, progressPercent } = calculateGoalSummary(savingsGoal, monthlySavings);

            // Expense timeline - next 30 days
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

            return (
                <div className="container">
                    {/* Navigation */}
                    <nav className="main-nav">
                        <a href="index.html" className="nav-link">📊 Dashboard</a>
                        <a href="fixed-expenses.html" className="nav-link">⚓ Fixed Expenses</a>
                        <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
                        <a href="projections.html" className="nav-link active">🔮 Projections</a>
                        <a href="insights.html" className="nav-link">🧠 Insights</a>
                    </nav>

                    {/* Header */}
                    <div className="header">
                        <div>
                            <h1 className="header-title">The Crystal Ball</h1>
                            <p className="header-subtitle">Play with scenarios and see your financial future</p>
                        </div>
                    </div>

                    {/* What-If Scenarios */}
                    <div className="card">
                        <h2 className="card-title">What-If Scenarios</h2>
                        <p style={{ color: '#888', marginBottom: '20px' }}>
                            Try different financial scenarios and see how they impact your savings
                        </p>

                        <div className="scenario-grid">
                            {scenarios.map(scenario => (
                                <div 
                                    key={scenario.id}
                                    className={`scenario-card RM{activeScenario === scenario.id ? 'active' : ''}`}
                                    onClick={scenario.action}
                                >
                                    <div className="scenario-title">{scenario.title}</div>
                                    <div className="scenario-description">{scenario.description}</div>
                                    <div className={`scenario-impact RM{scenario.impact < 0 ? 'negative' : ''}`}>
                                        {scenario.impact >= 0 ? '+' : ''}RM{scenario.impact.toFixed(0)}/mo
                                    </div>
                                </div>
                            ))}
                        </div>

                        {activeScenario && (
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <button 
                                    onClick={resetScenario}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid #2a2a2a',
                                        color: '#888',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontFamily: 'Inter, sans-serif',
                                        fontWeight: '600'
                                    }}
                                >
                                    Reset to Current
                                </button>
                            </div>
                        )}

                        <div className="two-col" style={{ marginTop: '32px' }}>
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
                                    <div style={{ fontSize: '0.875rem', color: '#888', marginTop: '8px' }}>
                                        RM{projectedVariableSpend.toFixed(0)} per month
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="impact-box">
                                    <div className="impact-title">Projected Monthly Savings</div>
                                    <div className={`impact-value RM{projectedRemaining >= 0 ? 'green-text' : 'red-text'}`}>
                                        RM{projectedRemaining.toFixed(0)}
                                    </div>
                                    <div className="impact-subtext">
                                        vs RM{(data.income - currentMonthlySpend).toFixed(0)} currently
                                    </div>
                                </div>

                                <div className="impact-box">
                                    <div className="impact-title">Projected Annual Savings</div>
                                    <div className={`impact-value RM{projectedAnnualSavings >= 0 ? 'gold-text' : 'red-text'}`}>
                                        RM{projectedAnnualSavings.toFixed(0)}
                                    </div>
                                    <div className="impact-subtext">
                                        That's {projectedRemaining >= 0 ? 
                                            `${((projectedRemaining / scenarioIncome) * 100).toFixed(1)}% of your income` :
                                            "you'll be in the red"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Savings Goal */}
                    <div className="card">
                        <h2 className="card-title">Savings Goal Simulator</h2>
                        <p style={{ color: '#888', marginBottom: '20px' }}>
                            Set a goal and see when you'll reach it
                        </p>

                        <div className="two-col">
                            <div>
                                <label style={{ fontSize: '0.875rem', color: '#888', display: 'block', marginBottom: '8px' }}>
                                    SAVINGS GOAL
                                </label>
                                <input 
                                    type="number"
                                    value={savingsGoal}
                                    onChange={(e) => setSavingsGoal(parseFloat(e.target.value) || 0)}
                                    placeholder="10000"
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.875rem', color: '#888', display: 'block', marginBottom: '8px' }}>
                                    MONTHLY CONTRIBUTION
                                </label>
                                <input 
                                    type="number"
                                    value={monthlySavings}
                                    onChange={(e) => setMonthlySavings(parseFloat(e.target.value) || 0)}
                                    placeholder="500"
                                />
                            </div>
                        </div>

                        <div className="goal-progress-bar">
                            <div 
                                className="goal-progress-fill"
                                style={{ width: `RM{Math.min(progressPercent, 100)}%` }}
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
                                <div className="goal-stat-value">
                                    RM{(monthlySavings * 12).toFixed(0)}
                                </div>
                                <div className="goal-stat-label">Annual Savings</div>
                            </div>
                        </div>

                        {progressPercent > 100 && (
                            <div style={{ 
                                marginTop: '16px', 
                                padding: '12px', 
                                background: 'linear-gradient(135deg, rgba(102, 187, 106, 0.1) 0%, rgba(76, 175, 80, 0.1) 100%)',
                                border: '1px solid #66BB6A',
                                borderRadius: '8px',
                                color: '#66BB6A',
                                textAlign: 'center',
                                fontWeight: '600'
                            }}>
                                🎉 You're on track! You'll reach your goal even faster than expected!
                            </div>
                        )}

                        {monthlySavings > projectedRemaining && projectedRemaining > 0 && (
                            <div style={{ 
                                marginTop: '16px', 
                                padding: '12px', 
                                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(212, 175, 55, 0.1) 100%)',
                                border: '1px solid #D4AF37',
                                borderRadius: '8px',
                                color: '#D4AF37',
                                textAlign: 'center',
                                fontWeight: '600'
                            }}>
                                ⚠️ Your goal requires RM{monthlySavings}/mo but you're only saving RM{projectedRemaining.toFixed(0)}/mo
                            </div>
                        )}
                    </div>

                    {/* Upcoming Expense Timeline */}
                    <div className="card">
                        <h2 className="card-title">Upcoming Expense Clusters</h2>
                        <p style={{ color: '#888', marginBottom: '20px' }}>
                            Days when multiple fixed expenses hit (brace yourself 😅)
                        </p>

                        {timelineData.length === 0 ? (
                            <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
                                No fixed expenses scheduled in the next 30 days.
                            </p>
                        ) : (
                            <div className="timeline">
                                <div className="timeline-line"></div>
                                {timelineData.map((item, index) => (
                                    <div 
                                        key={index}
                                        className={`timeline-item RM{item.isCluster ? 'cluster' : ''}`}
                                    >
                                        <div className={`timeline-dot RM{item.isCluster ? 'cluster' : ''}`}></div>
                                        <div className="timeline-date">
                                            {item.date}
                                            {item.isCluster && <span style={{ marginLeft: '8px', color: '#FF6B6B' }}>⚠️ Heavy Day</span>}
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
