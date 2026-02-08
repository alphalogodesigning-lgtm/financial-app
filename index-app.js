const { useState, useEffect } = React;

const {
  loadBudgetData,
  saveBudgetData,
  CATEGORIES,
  CLEAN_STATE,
  START_MESSAGE,
  calculateBurnMetrics,
  calculateCategorySpending
} = window.AppShared;

function ProgressRing({ progress, size = 120, strokeWidth = 8, color = '#D4AF37' }) {
  const safeProgress = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (safeProgress / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#2a2a2a"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

function BarChart({ data }) {
  const maxValue = Math.max(1, ...data.map((item) => item.amount));

  return (
    <div className="chart-container">
      {data.map((item, index) => (
        <div key={index} className="chart-bar">
          <div
            className="bar"
            style={{
              height: `${(item.amount / maxValue) * 200}px`,
              minHeight: item.amount > 0 ? '20px' : '0px'
            }}
          >
            {item.amount > 0 && (
              <span className="bar-value">RM{item.amount}</span>
            )}
          </div>
          <span className="bar-label">{item.day}</span>
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(CLEAN_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().split('T')[0]
  });
  const userName = '';

  useEffect(() => {
    let isMounted = true;
    loadBudgetData({ replace: true }).then((saved) => {
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
    saveBudgetData(data, { replace: true });
  }, [data, isHydrated]);

  const {
    income,
    incomeSet,
    totalFixed,
    totalVariable,
    totalSpent,
    remaining,
    dailyBurnRate,
    projectedSpend,
    runway,
    availablePct,
    budgetPct
  } = calculateBurnMetrics(data);

  const categorySpending = calculateCategorySpending(data.variableExpenses || []);
  const categoryBudgets = data.categoryBudgets || {};

  const greetingText = (() => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      return 'Get some sleep';
    }
    if (hour < 12) {
      return 'Good Morning';
    }
    if (hour < 17) {
      return 'Good Afternoon';
    }
    if (hour < 21) {
      return 'Good Evening';
    }
    return 'Good Night';
  })();

  const handleBudgetEdit = (category) => {
    const current = categoryBudgets[category] || 0;
    const input = prompt(`Set monthly budget for ${category} (RM):`, current);
    if (input === null) return;

    const value = parseFloat(input);
    if (Number.isNaN(value) || value < 0) return;

    setData((prev) => ({
      ...prev,
      categoryBudgets: {
        ...prev.categoryBudgets,
        [category]: value
      }
    }));
  };

  const spendingTrend = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    const daySpending = (data.variableExpenses || [])
      .filter((exp) => exp.date === dateStr)
      .reduce((sum, exp) => sum + exp.amount, 0);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      amount: daySpending
    };
  });

  const handleIncomeEdit = () => {
    const input = prompt('Enter your new monthly income:', data.income);
    if (input === null) return;

    const value = parseFloat(input);
    if (Number.isNaN(value) || value <= 0) return;

    setData((prev) => ({
      ...prev,
      income: value
    }));
  };

  const handleAddExpense = () => {
    if (!newExpense.name || !newExpense.amount) return;

    const expense = {
      id: Date.now(),
      name: newExpense.name,
      amount: parseFloat(newExpense.amount),
      date: newExpense.date,
      time: new Date().toTimeString().slice(0, 5),
      category: newExpense.category,
      merchant: '',
      regret: false,
      notes: '',
      photo: null
    };

    setData((prev) => ({
      ...prev,
      variableExpenses: [expense, ...prev.variableExpenses],
      streak: prev.streak + 1
    }));

    setNewExpense({ name: '', amount: '', category: 'Food', date: new Date().toISOString().split('T')[0] });
    setModalOpen(false);
  };

  return (
    <div className="container">
      {/* Navigation */}
      <nav className="main-nav">
        <a href="index.html" className="nav-link active">📊 Dashboard</a>
        <a href="fixed-expenses.html" className="nav-link">⚓ Fixed Expenses</a>
        <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
        <a href="projections.html" className="nav-link">🔮 Projections</a>
        <a href="insights.html" className="nav-link">🧠 Insights</a>
      </nav>

      <div className="greeting">
        <p className="greeting-text">
          {greetingText}
          {userName && (
            <>
              {greetingText === 'Get some sleep' ? ', ' : ' '}
              <span className="greeting-name">{userName}</span>
            </>
          )}
        </p>
      </div>

      {/* Header */}
      <div className="header">
        <div>
          <h1 className="header-title">Command Center</h1>
          <p className="header-subtitle">Your financial overview at a glance</p>
        </div>
        <div className="streak-badge">
          🔥 {data.streak} day streak
        </div>
      </div>

      {/* Top Stats */}
      <div className="stats-grid">
        <div
          className="stat-card"
          onClick={handleIncomeEdit}
          style={{ cursor: 'pointer' }}
        >
          <div
            className="metric-value gold-text"
            style={!incomeSet ? { fontSize: '1.25rem', lineHeight: 1.2 } : undefined}
          >
            {incomeSet ? `RM${remaining.toFixed(0)}` : START_MESSAGE}
          </div>
          <div className="metric-label">Available</div>
          <div className="metric-subtext">
            {incomeSet ? `${availablePct.toFixed(1)}% of income` : START_MESSAGE}
          </div>
        </div>

        <div className="stat-card">
          <div
            className="metric-value soft-blue-text"
            style={!incomeSet ? { fontSize: '1.25rem', lineHeight: 1.2 } : undefined}
          >
            {incomeSet ? (runway === null ? '∞' : Math.max(0, Math.floor(runway))) : START_MESSAGE}
          </div>
          <div className="metric-label">Days Runway</div>
          <div className="metric-subtext">
            {incomeSet ? (dailyBurnRate > 0 ? 'At current burn rate' : 'No spending yet') : START_MESSAGE}
          </div>
        </div>

        <div className="stat-card">
          <div className={`metric-value ${projectedSpend > income ? 'red-text' : 'green-text'}`}>
            RM{projectedSpend.toFixed(0)}
          </div>
          <div className="metric-label">Projected Spend</div>
          <div className="metric-subtext">End of month forecast</div>
        </div>

        <div className="stat-card">
          <div className="metric-value green-text">RM{dailyBurnRate.toFixed(2)}</div>
          <div className="metric-label">Daily Burn Rate</div>
          <div className="metric-subtext">Average per day</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="main-grid">
        <div className="card">
          <h2 className="card-title">Category Spending</h2>
          {Object.entries(CATEGORIES).map(([category, config]) => {
            const spent = categorySpending[category] || 0;
            const budget = categoryBudgets[category] || 0;
            const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

            return (
              <div key={category} className="category-item">
                <div className="category-header">
                  <span className="category-name">{category}</span>
                  <span className="category-amount">
                    RM{spent.toFixed(0)} / RM{budget || 0}
                  </span>
                </div>
                <div
                  className="category-bar"
                  onClick={() => handleBudgetEdit(category)}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    className="category-fill"
                    style={{
                      width: `${progress}%`,
                      background: spent > budget && budget > 0 ? '#FF6B6B' : config.color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h2 className="card-title">7-Day Burn Rate</h2>
          <BarChart data={spendingTrend} />
        </div>

        <div className="card">
          <h2 className="card-title">Recent Expenses</h2>
          <div className="expense-list">
            {data.variableExpenses.length === 0 && (
              <div style={{ color: '#888', textAlign: 'center', padding: '24px 0' }}>
                No expenses yet. Good job 👍
              </div>
            )}
            {data.variableExpenses.slice(0, 5).map((exp) => (
              <div key={exp.id} className="expense-item">
                <div>
                  <div className="expense-name">{exp.name}</div>
                  <div className="expense-category">{exp.category}</div>
                </div>
                <div className="expense-amount">
                  RM{exp.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card budget-ring-container">
          <h2 className="card-title">Monthly Budget</h2>
          <div className="ring-wrapper">
            <ProgressRing progress={incomeSet ? budgetPct : 0} size={180} strokeWidth={12} />
            <div className="ring-center">
              <div className="ring-percentage">
                {incomeSet ? `${budgetPct.toFixed(0)}%` : START_MESSAGE}
              </div>
              <div className="ring-label">Used</div>
            </div>
          </div>
          <div className="budget-summary">
            <div className="budget-total">
              {incomeSet ? `RM${totalSpent.toFixed(0)} / RM${income}` : START_MESSAGE}
            </div>
            <div className="budget-remaining">
              {incomeSet ? `RM${remaining.toFixed(0)} remaining` : START_MESSAGE}
            </div>
          </div>
        </div>
      </div>

      <button className="quick-add-btn" onClick={() => setModalOpen(true)}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      <div className={`modal ${modalOpen ? 'active' : ''}`} onClick={(event) => event.target.className.includes('modal') && setModalOpen(false)}>
        <div className="modal-content" onClick={(event) => event.stopPropagation()}>
          <h2 className="modal-title">Add Expense</h2>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              value={newExpense.name}
              onChange={(event) => setNewExpense({ ...newExpense, name: event.target.value })}
              placeholder="Coffee, groceries, etc."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input
              type="number"
              step="0.01"
              value={newExpense.amount}
              onChange={(event) => setNewExpense({ ...newExpense, amount: event.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              value={newExpense.category}
              onChange={(event) => setNewExpense({ ...newExpense, category: event.target.value })}
            >
              {Object.keys(CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="btn-row">
            <button className="btn-primary" onClick={handleAddExpense}>
              Add Expense
            </button>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.render(<Dashboard />, document.getElementById('root'));
