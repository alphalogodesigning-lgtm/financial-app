const { useState, useEffect } = React;

const {
    loadBudgetData,
    saveBudgetData,
    getInitialData,
    calculateFixedSummary
} = window.AppShared;

const formatCurrency = (value) => {
    const amount = Number.parseFloat(value);
    if (Number.isNaN(amount)) {
        return '0.00';
    }
    return amount.toFixed(2);
};

        function FixedExpenses() {
            const [data, setData] = useState(getInitialData('fixed-expenses'));
            const [isHydrated, setIsHydrated] = useState(false);
            const [modalOpen, setModalOpen] = useState(false);
            const [editingExpense, setEditingExpense] = useState(null);
            const [newExpense, setNewExpense] = useState({
                name: '',
                amount: '',
                dueDate: 1,
                category: 'Utilities',
                mood: 'neutral',
                status: 'pending'
            });
            const [draggedItem, setDraggedItem] = useState(null);
            const [viewMode, setViewMode] = useState('list');
            const [selectedDay, setSelectedDay] = useState(null);

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
                saveBudgetData(data);
            }, [data, isHydrated]);

            useEffect(() => {
                document.body.setAttribute('data-tab', viewMode);
                return () => {
                    document.body.removeAttribute('data-tab');
                };
            }, [viewMode]);

            const expenses = data.fixedExpenses || [];
            const { totalMonthly, totalAnnual, charged, pending } = calculateFixedSummary(expenses);

            const handleAddExpense = () => {
                if (!newExpense.name || !newExpense.amount) return;

                if (editingExpense) {
                    setData(prev => ({
                        ...prev,
                        fixedExpenses: prev.fixedExpenses.map(exp => 
                            exp.id === editingExpense.id 
                                ? { ...editingExpense, ...newExpense, amount: parseFloat(newExpense.amount) }
                                : exp
                        )
                    }));
                    setEditingExpense(null);
                } else {
                    const expense = {
                        id: Date.now(),
                        ...newExpense,
                        amount: parseFloat(newExpense.amount)
                    };
                    setData(prev => ({
                        ...prev,
                        fixedExpenses: [...prev.fixedExpenses, expense]
                    }));
                }

                setNewExpense({ name: '', amount: '', dueDate: 1, category: 'Utilities', mood: 'neutral', status: 'pending' });
                setModalOpen(false);
            };

            const handleEditExpense = (expense) => {
                setEditingExpense(expense);
                setNewExpense({
                    name: expense.name,
                    amount: expense.amount.toString(),
                    dueDate: expense.dueDate,
                    category: expense.category,
                    mood: expense.mood,
                    status: expense.status
                });
                setModalOpen(true);
            };

            const handleDeleteExpense = (id) => {
                if (confirm('Delete this expense?')) {
                    setData(prev => ({
                        ...prev,
                        fixedExpenses: prev.fixedExpenses.filter(exp => exp.id !== id)
                    }));
                }
            };

            const updateExpenseMood = (id, mood) => {
                setData(prev => ({
                    ...prev,
                    fixedExpenses: prev.fixedExpenses.map(exp => exp.id === id ? { ...exp, mood } : exp)
                }));
            };

            const updateExpenseStatus = (id, status) => {
                setData(prev => ({
                    ...prev,
                    fixedExpenses: prev.fixedExpenses.map(exp => exp.id === id ? { ...exp, status } : exp)
                }));
            };

            const handleDragStart = (e, expense) => {
                setDraggedItem(expense);
                e.currentTarget.classList.add('dragging');
            };

            const handleDragEnd = (e) => {
                e.currentTarget.classList.remove('dragging');
                setDraggedItem(null);
            };

            const handleDragOver = (e) => {
                e.preventDefault();
            };

            const handleDrop = (e, targetExpense) => {
                e.preventDefault();
                if (!draggedItem || draggedItem.id === targetExpense.id) return;

                const draggedIndex = expenses.findIndex(exp => exp.id === draggedItem.id);
                const targetIndex = expenses.findIndex(exp => exp.id === targetExpense.id);

                const newExpenses = [...expenses];
                newExpenses.splice(draggedIndex, 1);
                newExpenses.splice(targetIndex, 0, draggedItem);

                setData(prev => ({
                    ...prev,
                    fixedExpenses: newExpenses
                }));
            };

            const daysInMonth = 31;
            const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dayExpenses = expenses.filter(exp => exp.dueDate === day);
                const total = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                return { day, expenses: dayExpenses, total };
            });

            const chopList = [...expenses].sort((a, b) => b.amount - a.amount);

            return (
                <div className="container">
                    {/* Navigation */}
                    <nav className="main-nav">
                        <a href="index.html" className="nav-link">📊 Dashboard</a>
                        <a href="fixed-expenses.html" className="nav-link active">⚓ Fixed Expenses</a>
                        <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
                        <a href="projections.html" className="nav-link">🔮 Projections</a>
                        <a href="insights.html" className="nav-link">🧠 Insights</a>
                    </nav>

                    <div className="header">
                        <div>
                            <h1 className="header-title">The Anchors</h1>
                            <p className="header-subtitle">Your fixed monthly expenses</p>
                        </div>
                    </div>

                    <div className="nav-tabs">
                        <button className={`nav-tab ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                            📋 List View
                        </button>
                        <button className={`nav-tab ${viewMode === 'calendar' ? 'active' : ''}`} onClick={() => setViewMode('calendar')}>
                            📅 Calendar
                        </button>
                        <button className={`nav-tab ${viewMode === 'chop' ? 'active' : ''}`} onClick={() => setViewMode('chop')}>
                            🪓 Chop Block
                        </button>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="metric-value gold-text">RM{formatCurrency(totalMonthly)}</div>
                            <div className="metric-label">Monthly Total</div>
                        </div>
                        <div className="stat-card">
                            <div className="metric-value" style={{ color: '#FF6B6B' }}>RM{formatCurrency(totalAnnual)}</div>
                            <div className="metric-label">Annual Damage</div>
                        </div>
                        <div className="stat-card">
                            <div className="metric-value" style={{ color: '#66BB6A' }}>RM{formatCurrency(charged)}</div>
                            <div className="metric-label">Charged</div>
                        </div>
                        <div className="stat-card">
                            <div className="metric-value" style={{ color: '#89ABE3' }}>RM{formatCurrency(pending)}</div>
                            <div className="metric-label">Pending</div>
                        </div>
                    </div>

                    {viewMode === 'list' && (
                        <div className="card">
                            <h2 className="card-title">All Expenses (Drag to reorder by priority)</h2>
                            {expenses.length === 0 ? (
                                <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
                                    No fixed expenses yet. Click the + button to add one.
                                </p>
                            ) : (
                                expenses.map(expense => (
                                    <div 
                                        key={expense.id}
                                        className="expense-card"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, expense)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, expense)}
                                        onClick={() => handleEditExpense(expense)}
                                    >
                                        <button 
                                            className="delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteExpense(expense.id);
                                            }}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                        <div className="expense-header">
                                            <div className="expense-name">{expense.name}</div>
                                            <div className="expense-amount">RM{formatCurrency(expense.amount)}</div>
                                        </div>
                                        <div className="expense-details">
                                            <div className="expense-detail">
                                                <span>📅 Due: Day {expense.dueDate}</span>
                                            </div>
                                            <div className="expense-detail">
                                                <span>📂 {expense.category}</span>
                                            </div>
                                            <div className="expense-detail">
                                                <span>💰 Annual: RM{formatCurrency(expense.amount * 12)}</span>
                                            </div>
                                        </div>
                                        <div className="mood-selector" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                className={`mood-btn ${expense.mood === 'necessary' ? 'active necessary' : ''}`}
                                                onClick={() => updateExpenseMood(expense.id, 'necessary')}
                                            >
                                                😤 Necessary Evil
                                            </button>
                                            <button 
                                                className={`mood-btn ${expense.mood === 'worth' ? 'active worth' : ''}`}
                                                onClick={() => updateExpenseMood(expense.id, 'worth')}
                                            >
                                                ✨ Worth It
                                            </button>
                                            <button 
                                                className={`mood-btn ${expense.mood === 'neutral' ? 'active neutral' : ''}`}
                                                onClick={() => updateExpenseMood(expense.id, 'neutral')}
                                            >
                                                😐 Neutral
                                            </button>
                                        </div>
                                        <div className="status-toggle" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                className={`status-btn ${expense.status === 'charged' ? 'active charged' : ''}`}
                                                onClick={() => updateExpenseStatus(expense.id, 'charged')}
                                            >
                                                ✓ Charged
                                            </button>
                                            <button 
                                                className={`status-btn ${expense.status === 'pending' ? 'active pending' : ''}`}
                                                onClick={() => updateExpenseStatus(expense.id, 'pending')}
                                            >
                                                ⏳ Pending
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {viewMode === 'calendar' && (
                        <div className="card">
                            <h2 className="card-title">Monthly Payment Calendar</h2>
                            <div className="calendar">
                                {calendarDays.map(({ day, expenses: dayExpenses, total }) => {
                                    const isSelected = selectedDay === day;
                                    return (
                                    <div 
                                        key={day}
                                        className={`calendar-day ${dayExpenses.length > 0 ? 'has-expense' : ''} ${isSelected ? 'is-selected' : ''}`}
                                        onClick={() => setSelectedDay(isSelected ? null : day)}
                                    >
                                        <div className="day-number">{day}</div>
                                        {dayExpenses.length > 0 && isSelected && (
                                            <div className="day-expenses">
                                                {dayExpenses.map(exp => (
                                                    <div key={exp.id} style={{ fontSize: '0.65rem', marginBottom: '2px' }}>
                                                        {exp.name}: RM{formatCurrency(exp.amount)}
                                                    </div>
                                                ))}
                                                <div className="day-total" style={{ fontWeight: '700', marginTop: '4px' }}>
                                                    Total: RM{formatCurrency(total)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                                })}
                            </div>
                        </div>
                    )}

                    {viewMode === 'chop' && (
                        <div className="card">
                            <h2 className="card-title">🪓 Chop Block Analysis</h2>
                            <p style={{ color: '#888', marginBottom: '20px' }}>
                                See which subscriptions you could cut to save money each month
                            </p>
                            {chopList.map((expense, index) => {
                                const monthlySavings = expense.amount;
                                const annualSavings = monthlySavings * 12;
                                return (
                                    <div key={expense.id} className="chop-item">
                                        <div>
                                            <div className="chop-name">
                                                #{index + 1} - {expense.name}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: '#888', marginTop: '4px' }}>
                                                RM{formatCurrency(monthlySavings)}/mo • RM{formatCurrency(annualSavings)}/yr
                                            </div>
                                        </div>
                                        <div className="chop-savings">
                                            Save RM{formatCurrency(monthlySavings)}/mo
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <button className="quick-add-btn" onClick={() => {
                        setEditingExpense(null);
                        setNewExpense({ name: '', amount: '', dueDate: 1, category: 'Utilities', mood: 'neutral', status: 'pending' });
                        setModalOpen(true);
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>

                    <div className={`modal ${modalOpen ? 'active' : ''}`} onClick={(e) => e.target.className.includes('modal') && setModalOpen(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <h2 className="modal-title">
                                {editingExpense ? 'Edit Expense' : 'Add Fixed Expense'}
                            </h2>
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input 
                                    type="text" 
                                    value={newExpense.name}
                                    onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                                    placeholder="Rent, Netflix, etc."
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Amount</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={newExpense.amount}
                                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Due Date (Day of Month)</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    max="31"
                                    value={newExpense.dueDate}
                                    onChange={(e) => setNewExpense({ ...newExpense, dueDate: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select 
                                    value={newExpense.category}
                                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                >
                                    <option value="Housing">Housing</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Health">Health</option>
                                    <option value="Entertainment">Entertainment</option>
                                    <option value="Transportation">Transportation</option>
                                    <option value="Insurance">Insurance</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="btn-row">
                                <button className="btn-primary" onClick={handleAddExpense}>
                                    {editingExpense ? 'Update' : 'Add'} Expense
                                </button>
                                <button className="btn-secondary" onClick={() => {
                                    setModalOpen(false);
                                    setEditingExpense(null);
                                }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        ReactDOM.render(<FixedExpenses />, document.getElementById('root'));
