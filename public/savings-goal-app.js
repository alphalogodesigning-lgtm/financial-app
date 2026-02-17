const { useEffect, useMemo, useState } = React;

const { loadBudgetData, saveBudgetData, getInitialData, dateTime } = window.AppShared;

const EXAMPLE_GOAL = { name: 'Dream Phone', targetAmount: 5999 };
const DOPAMINE_LINES = [
  'Momentum check: {pct}% closer than yesterday-you.',
  'You are {pct}% closer to this goal.',
  'Tiny steps, big flex — {pct}% complete.',
  'Progress hit: {pct}% done, keep stacking.',
  'Every ringgit counts. You are {pct}% in.',
  '{pct}% conquered. Stay locked in.',
  'Goal energy is real: {pct}% complete.',
  'Discipline meter: {pct}% and climbing.',
  '{pct}% closer to the version of you that planned this.',
  'You built {pct}% of this win already.',
  'Savings streak vibe: {pct}% complete.',
  '{pct}% down. Keep the pressure on.',
  'You are {pct}% into this mission.',
  'This goal is now {pct}% yours.',
  'You pushed this goal to {pct}% complete.'
];

const formatCurrency = (value) => `RM${Number(value || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const toAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getDopamineLine = (goal, progress) => {
  const index = Math.abs(Number(goal.id) || 0) % DOPAMINE_LINES.length;
  return DOPAMINE_LINES[index].replace('{pct}', progress.toFixed(1));
};

function SavingsGoalPage() {
  const [data, setData] = useState(getInitialData('savings-goal'));
  const [isHydrated, setIsHydrated] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');

  useEffect(() => {
    let active = true;
    loadBudgetData().then((saved) => {
      if (!active) return;
      if (saved) {
        setData((prev) => ({
          ...prev,
          ...saved,
          savingsGoals: saved.savingsGoals || [],
          linkedSimulatorGoalId: saved.linkedSimulatorGoalId || null
        }));
      }
      setIsHydrated(true);
    });
    return () => { active = false; };
  }, []);

  const goals = data.savingsGoals || [];
  const linkedSimulatorGoalId = data.linkedSimulatorGoalId || null;

  const totals = useMemo(() => {
    const target = goals.reduce((sum, goal) => sum + (Number(goal.targetAmount) || 0), 0);
    const saved = goals.reduce((sum, goal) => sum + (Number(goal.currentAmount) || 0), 0);
    const remaining = Math.max(0, target - saved);
    const progress = target > 0 ? (saved / target) * 100 : 0;
    return { target, saved, remaining, progress };
  }, [goals]);

  const persist = (nextGoals, nextLinkedSimulatorGoalId = linkedSimulatorGoalId) => {
    const linkedStillValid = nextGoals.some((goal) => goal.id === nextLinkedSimulatorGoalId);
    const next = {
      ...data,
      savingsGoals: nextGoals,
      linkedSimulatorGoalId: linkedStillValid ? nextLinkedSimulatorGoalId : null
    };
    setData(next);
    saveBudgetData(next);
  };

  const createGoal = (event) => {
    event.preventDefault();
    const name = goalName.trim();
    const targetAmount = toAmount(goalTarget);
    if (!name || !targetAmount) return;

    const now = new Date().toISOString();
    const nextGoals = [
      {
        id: Date.now(),
        name,
        targetAmount,
        currentAmount: 0,
        createdAt: now,
        updatedAt: now,
        transactions: []
      },
      ...goals
    ];
    persist(nextGoals);
    setGoalName('');
    setGoalTarget('');
  };

  const createExampleGoal = () => {
    if (goals.some((goal) => goal.name.toLowerCase() === EXAMPLE_GOAL.name.toLowerCase())) return;
    const now = new Date().toISOString();
    persist([
      {
        id: Date.now(),
        name: EXAMPLE_GOAL.name,
        targetAmount: EXAMPLE_GOAL.targetAmount,
        currentAmount: 0,
        createdAt: now,
        updatedAt: now,
        transactions: []
      },
      ...goals
    ]);
  };

  const delayGoal = (goalId) => {
    const goalToDelay = goals.find((goal) => goal.id === goalId);
    if (!goalToDelay) return;
    const confirmed = window.confirm(`Are you sure you want to delay "${goalToDelay.name}"?`);
    if (!confirmed) return;
    persist(goals.filter((goal) => goal.id !== goalId));
  };

  const linkGoalToSimulator = (goalId) => {
    persist(goals, goalId);
    window.alert('Goal linked to Purchase Simulator.');
  };

  const updateGoalBalance = (goalId, type) => {
    const amountRaw = window.prompt(type === 'add' ? 'How much do you want to add? (RM)' : 'How much do you need to deduct? (RM)');
    if (amountRaw === null) return;
    const amount = toAmount(amountRaw);
    if (!amount) {
      window.alert('Please enter a valid amount greater than 0.');
      return;
    }

    const nextGoals = goals.map((goal) => {
      if (goal.id !== goalId) return goal;
      const currentAmount = Number(goal.currentAmount) || 0;
      if (type === 'deduct' && amount > currentAmount) {
        window.alert('Deduction exceeds current savings for this goal.');
        return goal;
      }
      const updatedAmount = type === 'add' ? currentAmount + amount : currentAmount - amount;
      const stamp = dateTime.nowUtcISOString();
      const transactions = [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type,
          amount,
          createdAt: stamp
        },
        ...(goal.transactions || [])
      ].slice(0, 6);

      return {
        ...goal,
        currentAmount: updatedAmount,
        updatedAt: stamp,
        transactions
      };
    });

    persist(nextGoals);
  };

  if (!isHydrated) {
    return (
      <div className="container">
        <div className="empty-state">Loading savings goals...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <nav className="main-nav">
        <a href="index.html" className="nav-link">📊 Dashboard</a>
        <a href="fixed-expenses.html" className="nav-link">⚓ Fixed Expenses</a>
        <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
        <a href="savings-goal.html" className="nav-link active">🎯 Savings Goal</a>
        <a href="projections.html" className="nav-link">🔮 Projections</a>
        <a href="purchase-simulator.html" className="nav-link">🧪 Simulator</a>
        <a href="insights.html" className="nav-link">🧠 Insights</a>
      </nav>

      <header className="page-header">
        <h1>Savings Goals</h1>
        <p>Create clear targets, add or deduct funds anytime, and track exactly how close you are to each goal.</p>
      </header>

      <section className="card" style={{ marginBottom: '16px' }}>
        <h2>Overall Progress</h2>
        <div className="progress-wrap">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.min(100, totals.progress)}%` }} />
          </div>
        </div>
        <div className="metric-grid">
          <div className="metric"><div className="metric-label">Total Target</div><div className="metric-value">{formatCurrency(totals.target)}</div></div>
          <div className="metric"><div className="metric-label">Saved</div><div className="metric-value">{formatCurrency(totals.saved)}</div></div>
          <div className="metric"><div className="metric-label">Remaining</div><div className="metric-value">{formatCurrency(totals.remaining)}</div></div>
        </div>
      </section>

      <div className="layout">
        <section className="card">
          <h2>Create a Goal</h2>
          <form className="form-grid" onSubmit={createGoal}>
            <label htmlFor="goal-name">Goal Name</label>
            <input id="goal-name" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Buying my dream phone" />

            <label htmlFor="goal-target">Target Amount (RM)</label>
            <input id="goal-target" type="number" min="1" step="0.01" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder="5999" />

            <button className="btn" type="submit">Create Savings Goal</button>
            <button className="btn ghost" type="button" onClick={createExampleGoal}>+ Add Example: Dream Phone (RM5,999)</button>
          </form>
          <p className="helper">Tip: Use + when adding money and - when emergencies force you to use part of your savings.</p>
        </section>

        <section className="goals">
          {goals.length === 0 ? (
            <div className="empty-state">No savings goals yet. Create your first goal to start building momentum.</div>
          ) : goals.map((goal) => {
            const targetAmount = Number(goal.targetAmount) || 0;
            const currentAmount = Number(goal.currentAmount) || 0;
            const remaining = Math.max(0, targetAmount - currentAmount);
            const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
            const isLinkedToSimulator = linkedSimulatorGoalId === goal.id;

            return (
              <article key={goal.id} className="card">
                <div className="goal-title">
                  <h3>{goal.name}</h3>
                  <p className="goal-target">Target: {formatCurrency(targetAmount)}</p>
                </div>
                <p className="goal-dopamine-line">{getDopamineLine(goal, progress)}</p>

                <div className="progress-wrap">
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.min(100, progress)}%` }} />
                  </div>
                </div>

                <div className="metric-grid">
                  <div className="metric"><div className="metric-label">Saved</div><div className="metric-value">{formatCurrency(currentAmount)}</div></div>
                  <div className="metric"><div className="metric-label">Remaining</div><div className="metric-value">{formatCurrency(remaining)}</div></div>
                  <div className="metric"><div className="metric-label">Progress</div><div className="metric-value">{progress.toFixed(1)}%</div></div>
                </div>

                <div className="btn-row" style={{ marginTop: '12px' }}>
                  <button type="button" className="btn" onClick={() => updateGoalBalance(goal.id, 'add')}>＋ Add Money</button>
                  <button type="button" className="btn ghost" onClick={() => updateGoalBalance(goal.id, 'deduct')}>－ Deduct</button>
                  <button type="button" className={`btn ghost ${isLinkedToSimulator ? 'linked-goal-btn' : ''}`} onClick={() => linkGoalToSimulator(goal.id)}>
                    {isLinkedToSimulator ? '✅ Linked to Simulator' : '🔗 Link to Simulator'}
                  </button>
                </div>

                <button type="button" className="delay-goal-text" onClick={() => delayGoal(goal.id)}>Delay this goal</button>

                {(goal.transactions || []).length > 0 && (
                  <div className="mini-history">
                    {(goal.transactions || []).slice(0, 3).map((txn) => (
                      <div className="history-row" key={txn.id}>
                        <span className={txn.type === 'add' ? 'add' : 'deduct'}><strong>{txn.type === 'add' ? '+' : '-'}</strong> {formatCurrency(txn.amount)}</span>
                        <span>{new Date(txn.createdAt).toLocaleDateString('en-MY')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

ReactDOM.render(<SavingsGoalPage />, document.getElementById('root'));
