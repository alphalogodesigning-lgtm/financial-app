const { useState, useEffect } = React;

const {\n    loadBudgetData,\n    saveBudgetData,\n    getInitialData,\n    CATEGORY_LIST,\n    calculateVariableSummary\n} = window.AppShared;

        function VariableSpending() {
            const [data, setData] = useState(getInitialData('variable-spending'));
            const [isHydrated, setIsHydrated] = useState(false);
            const expenses = data.variableExpenses || [];
            const [modalOpen, setModalOpen] = useState(false);
            const [editingExpense, setEditingExpense] = useState(null);
            const [newExpense, setNewExpense] = useState({
                name: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                time: new Date().toTimeString().slice(0, 5),
                category: 'Food',
                merchant: '',
                notes: '',
                regret: false,
                photo: null
            });
            const [viewMode, setViewMode] = useState('all'); // 'all', 'heatmap', 'merchants', 'regrets', 'compare'
            const [filterCategory, setFilterCategory] = useState('all');
            const [photoPreview, setPhotoPreview] = useState(null);

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

            const { totalSpent, regretSpent, avgPerDay, topCategory } = calculateVariableSummary(expenses);

            // Filter expenses
            const filteredExpenses = filterCategory === 'all' 
                ? expenses 
                : expenses.filter(e => e.category === filterCategory);

            // Sort by date (newest first)
            const sortedExpenses = [...filteredExpenses].sort((a, b) => {
                const dateA = new Date(`RM{a.date} RM{a.time}`);
                const dateB = new Date(`RM{b.date} RM{b.time}`);
                return dateB - dateA;
            });

            // Heatmap data (last 30 days)
            const heatmapData = Array.from({ length: 30 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (29 - i));
                const dateStr = date.toISOString().split('T')[0];
                const dayExpenses = expenses.filter(e => e.date === dateStr);
                const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                return { date: dateStr, day: dayName, total, count: dayExpenses.length };
            });

            // Determine heatmap levels
            const maxSpending = Math.max(...heatmapData.map(d => d.total));
            const getHeatLevel = (amount) => {
                if (amount === 0) return 0;
                if (amount < maxSpending * 0.2) return 1;
                if (amount < maxSpending * 0.4) return 2;
                if (amount < maxSpending * 0.6) return 3;
                if (amount < maxSpending * 0.8) return 4;
                return 5;
            };

            // Merchant frequency
            const merchantData = {};
            expenses.forEach(exp => {
                if (!merchantData[exp.merchant]) {
                    merchantData[exp.merchant] = { count: 0, total: 0 };
                }
                merchantData[exp.merchant].count++;
                merchantData[exp.merchant].total += exp.amount;
            });
            const merchantList = Object.entries(merchantData)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.total - a.total);

            // Comparison data (This week vs Last week)
            const today = new Date();
            const thisWeekStart = new Date(today);
            thisWeekStart.setDate(today.getDate() - today.getDay());
            const lastWeekStart = new Date(thisWeekStart);
            lastWeekStart.setDate(thisWeekStart.getDate() - 7);

            const thisWeekExpenses = expenses.filter(e => {
                const expDate = new Date(e.date);
                return expDate >= thisWeekStart;
            });
            const lastWeekExpenses = expenses.filter(e => {
                const expDate = new Date(e.date);
                return expDate >= lastWeekStart && expDate < thisWeekStart;
            });

            const thisWeekTotal = thisWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
            const lastWeekTotal = lastWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
            const weekDiff = thisWeekTotal - lastWeekTotal;
            const weekDiffPercent = lastWeekTotal > 0 ? ((weekDiff / lastWeekTotal) * 100) : 0;

            const handleAddExpense = () => {
                if (!newExpense.name || !newExpense.amount) return;

                if (editingExpense) {
                    setData(prev => ({
                        ...prev,
                        variableExpenses: prev.variableExpenses.map(exp =>
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
                        variableExpenses: [expense, ...prev.variableExpenses],
                        streak: prev.streak + 1
                    }));
                }

                setNewExpense({
                    name: '',
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toTimeString().slice(0, 5),
                    category: 'Food',
                    merchant: '',
                    notes: '',
                    regret: false,
                    photo: null
                });
                
                setModalOpen(false);
            };

            const handleEditExpense = (expense) => {
                setEditingExpense(expense);
                setNewExpense({
                    name: expense.name,
                    amount: expense.amount.toString(),
                    date: expense.date,
                    time: expense.time,
                    category: expense.category,
                    merchant: expense.merchant,
                    notes: expense.notes || '',
                    regret: expense.regret,
                    photo: expense.photo
                });
                setPhotoPreview(expense.photo);
                setModalOpen(true);
            };

            const handleDeleteExpense = (id) => {
                if (confirm('Delete this expense?')) {
                    setData(prev => ({
                        ...prev,
                        variableExpenses: prev.variableExpenses.filter(exp => exp.id !== id)
                    }));
                }
            };

            const toggleRegret = (id) => {
                setData(prev => ({
                    ...prev,
                    variableExpenses: prev.variableExpenses.map(exp =>
                        exp.id === id ? { ...exp, regret: !exp.regret } : exp
                    )
                }));
            };

            const handlePhotoUpload = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setPhotoPreview(reader.result);
                        setNewExpense({ ...newExpense, photo: reader.result });
                    };
                    reader.readAsDataURL(file);
                }
            };

            return (
                <div className="container">
                    {/* Navigation */}
                    <nav className="main-nav">
                        <a href="index.html" className="nav-link">📊 Dashboard</a>
                        <a href="fixed-expenses.html" className="nav-link">⚓ Fixed Expenses</a>
                        <a href="variable-spending.html" className="nav-link active">💸 Variable Spending</a>
                        <a href="projections.html" className="nav-link">🔮 Projections</a>
                        <a href="insights.html" className="nav-link">🧠 Insights</a>
                    </nav>

                    {/* Header */}
                    <div className="header">
                        <div>
                            <h1 className="header-title">The Chaos Zone</h1>
                            <p className="header-subtitle">Track your daily spending habits</p>
                        </div>
                    </div>

                    {/* View Mode Tabs */}
                    <div className="nav-tabs">
                        <button className={`nav-tab RM{viewMode === 'all' ? 'active' : ''}`} onClick={() => setViewMode('all')}>
                            📋 All Expenses
                        </button>
                        <button className={`nav-tab RM{viewMode === 'heatmap' ? 'active' : ''}`} onClick={() => setViewMode('heatmap')}>
                            🔥 Spending Heatmap
                        </button>
                        <button className={`nav-tab RM{viewMode === 'merchants' ? 'active' : ''}`} onClick={() => setViewMode('merchants')}>
                            🏪 Merchant Frequency
                        </button>
                        <button className={`nav-tab RM{viewMode === 'regrets' ? 'active' : ''}`} onClick={() => setViewMode('regrets')}>
                            😬 Regret Tracker
                        </button>
                        <button className={`nav-tab RM{viewMode === 'compare' ? 'active' : ''}`} onClick={() => setViewMode('compare')}>
                            📊 Comparison
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="metric-value gold-text">RM{totalSpent.toFixed(0)}</div>
                            <div className="metric-label">Total Spent</div>
                        </div>
                        <div className="stat-card">
                            <div className="metric-value red-text">RM{regretSpent.toFixed(0)}</div>
                            <div className="metric-label">Regret Money</div>
                        </div>
                        <div className="stat-card">
                            <div className="metric-value soft-blue-text">RM{avgPerDay.toFixed(2)}</div>
                            <div className="metric-label">Avg Per Day</div>
                        </div>
                        <div className="stat-card">
                            <div className="metric-value green-text">{topCategory.name}</div>
                            <div className="metric-label">Top Category</div>
                        </div>
                    </div>

                    {/* ALL EXPENSES VIEW */}
                    {viewMode === 'all' && (
                        <>
                            <div className="category-pills">
                                <button 
                                    className={`category-pill RM{filterCategory === 'all' ? 'active' : ''}`}
                                    onClick={() => setFilterCategory('all')}
                                >
                                    All
                                </button>
                                {CATEGORY_LIST.map(cat => (
                                    <button 
                                        key={cat}
                                        className={`category-pill RM{filterCategory === cat ? 'active' : ''}`}
                                        onClick={() => setFilterCategory(cat)}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div className="card">
                                <h2 className="card-title">Recent Purchases</h2>
                                {sortedExpenses.length === 0 ? (
                                    <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
                                        No expenses yet. Click the + button to add one.
                                    </p>
                                ) : (
                                    sortedExpenses.map(expense => (
                                        <div 
                                            key={expense.id}
                                            className={`expense-item RM{expense.regret ? 'regret' : ''}`}
                                            onClick={() => handleEditExpense(expense)}
                                        >
                                            {expense.photo ? (
                                                <img src={expense.photo} alt="Receipt" className="expense-photo" />
                                            ) : (
                                                <div className="expense-photo">📄</div>
                                            )}
                                            <div className="expense-content">
                                                <div className="expense-header-row">
                                                    <div className="expense-name">{expense.name}</div>
                                                    <div className="expense-amount">RM{expense.amount.toFixed(2)}</div>
                                                </div>
                                                <div className="expense-meta">
                                                    <span>📅 {expense.date}</span>
                                                    <span>🕐 {expense.time}</span>
                                                    <span>📂 {expense.category}</span>
                                                    {expense.merchant && <span>🏪 {expense.merchant}</span>}
                                                </div>
                                                {expense.notes && (
                                                    <p style={{ fontSize: '0.875rem', color: '#888', marginTop: '8px' }}>
                                                        {expense.notes}
                                                    </p>
                                                )}
                                                <div className="expense-tags">
                                                    {expense.regret && <span className="tag regret">😬 Regret</span>}
                                                </div>
                                            </div>
                                            <button 
                                                className={`regret-toggle RM{expense.regret ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleRegret(expense.id);
                                                }}
                                            >
                                                😬
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}

                    {/* HEATMAP VIEW */}
                    {viewMode === 'heatmap' && (
                        <div className="card">
                            <h2 className="card-title">30-Day Spending Heatmap</h2>
                            <p style={{ color: '#888', marginBottom: '20px' }}>
                                Darker cells = more spending that day
                            </p>
                            <div className="heatmap-grid">
                                {heatmapData.map((day, index) => (
                                    <div 
                                        key={index}
                                        className={`heatmap-cell level-RM{getHeatLevel(day.total)}`}
                                    >
                                        <div className="day-label">{day.day}</div>
                                        {day.total > 0 && (
                                            <div className="day-amount">RM{day.total.toFixed(0)}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MERCHANTS VIEW */}
                    {viewMode === 'merchants' && (
                        <div className="card">
                            <h2 className="card-title">Merchant Frequency</h2>
                            <p style={{ color: '#888', marginBottom: '20px' }}>
                                Which places are eating your money?
                            </p>
                            {merchantList.map(merchant => (
                                <div key={merchant.name} className="merchant-item">
                                    <div>
                                        <div className="merchant-name">{merchant.name}</div>
                                        <div className="merchant-count">{merchant.count} purchases</div>
                                    </div>
                                    <div className="merchant-stats">
                                        <div className="merchant-total">RM{merchant.total.toFixed(2)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* REGRETS VIEW */}
                    {viewMode === 'regrets' && (
                        <div className="card">
                            <h2 className="card-title">Regret Tracker</h2>
                            <p style={{ color: '#888', marginBottom: '20px' }}>
                                Expenses you wish you could take back
                            </p>
                            {expenses.filter(e => e.regret).length === 0 ? (
                                <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
                                    No regrets yet! (That's good... or you're in denial 😅)
                                </p>
                            ) : (
                                expenses.filter(e => e.regret).map(expense => (
                                    <div key={expense.id} className="expense-item regret">
                                        {expense.photo ? (
                                            <img src={expense.photo} alt="Receipt" className="expense-photo" />
                                        ) : (
                                            <div className="expense-photo">📄</div>
                                        )}
                                        <div className="expense-content">
                                            <div className="expense-header-row">
                                                <div className="expense-name">{expense.name}</div>
                                                <div className="expense-amount">RM{expense.amount.toFixed(2)}</div>
                                            </div>
                                            <div className="expense-meta">
                                                <span>📅 {expense.date}</span>
                                                <span>🏪 {expense.merchant}</span>
                                            </div>
                                            {expense.notes && (
                                                <p style={{ fontSize: '0.875rem', color: '#FF6B6B', marginTop: '8px' }}>
                                                    "{expense.notes}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* COMPARISON VIEW */}
                    {viewMode === 'compare' && (
                        <div className="card">
                            <h2 className="card-title">This Week vs Last Week</h2>
                            <div className="comparison-grid">
                                <div className="comparison-card">
                                    <div className="comparison-title">This Week</div>
                                    <div className="comparison-stat">
                                        <span className="comparison-label">Total Spent</span>
                                        <span className="comparison-value">RM{thisWeekTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="comparison-stat">
                                        <span className="comparison-label">Transactions</span>
                                        <span className="comparison-value">{thisWeekExpenses.length}</span>
                                    </div>
                                    <div className="comparison-stat">
                                        <span className="comparison-label">Avg per Transaction</span>
                                        <span className="comparison-value">
                                            RM{thisWeekExpenses.length > 0 ? (thisWeekTotal / thisWeekExpenses.length).toFixed(2) : '0.00'}
                                        </span>
                                    </div>
                                </div>

                                <div className="comparison-card">
                                    <div className="comparison-title">Last Week</div>
                                    <div className="comparison-stat">
                                        <span className="comparison-label">Total Spent</span>
                                        <span className="comparison-value">RM{lastWeekTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="comparison-stat">
                                        <span className="comparison-label">Transactions</span>
                                        <span className="comparison-value">{lastWeekExpenses.length}</span>
                                    </div>
                                    <div className="comparison-stat">
                                        <span className="comparison-label">Avg per Transaction</span>
                                        <span className="comparison-value">
                                            RM{lastWeekExpenses.length > 0 ? (lastWeekTotal / lastWeekExpenses.length).toFixed(2) : '0.00'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ 
                                marginTop: '24px', 
                                padding: '20px', 
                                background: '#0a0a0a', 
                                borderRadius: '12px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: '8px' }}>
                                    Difference
                                </div>
                                <div style={{ 
                                    fontSize: '2rem', 
                                    fontWeight: '800',
                                    color: weekDiff > 0 ? '#FF6B6B' : '#66BB6A'
                                }}>
                                    {weekDiff > 0 ? '+' : ''}{weekDiff >= 0 ? 'RM' : '-RM'}{Math.abs(weekDiff).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '1rem', color: '#888', marginTop: '4px' }}>
                                    ({weekDiffPercent > 0 ? '+' : ''}{weekDiffPercent.toFixed(1)}%)
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Add Button */}
                    <button className="quick-add-btn" onClick={() => {
                        setEditingExpense(null);
                        setNewExpense({
                            name: '',
                            amount: '',
                            date: new Date().toISOString().split('T')[0],
                            time: new Date().toTimeString().slice(0, 5),
                            category: 'Food',
                            merchant: '',
                            notes: '',
                            regret: false,
                            photo: null
                        });
                        
                        setModalOpen(true);
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>

                    {/* Add/Edit Expense Modal */}
                    <div className={`modal ${modalOpen ? 'active' : ''}`} onClick={(e) => e.target.className.includes('modal') && setModalOpen(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <h2 className="modal-title">
                                {editingExpense ? 'Edit Expense' : 'Add Expense'}
                            </h2>

                            

                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input 
                                    type="text" 
                                    value={newExpense.name}
                                    onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                                    placeholder="Coffee, lunch, etc."
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
                                <label className="form-label">Date</label>
                                <input 
                                    type="date"
                                    value={newExpense.date}
                                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Time</label>
                                <input 
                                    type="time"
                                    value={newExpense.time}
                                    onChange={(e) => setNewExpense({ ...newExpense, time: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select 
                                    value={newExpense.category}
                                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                                >
                                    {CATEGORY_LIST.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Merchant (Optional)</label>
                                <input 
                                    type="text"
                                    value={newExpense.merchant}
                                    onChange={(e) => setNewExpense({ ...newExpense, merchant: e.target.value })}
                                    placeholder="Starbucks, Amazon, etc."
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes (Optional)</label>
                                <textarea
                                    value={newExpense.notes}
                                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                                    placeholder="Why did you buy this?"
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox"
                                        checked={newExpense.regret}
                                        onChange={(e) => setNewExpense({ ...newExpense, regret: e.target.checked })}
                                        style={{ width: 'auto' }}
                                    />
                                    <span style={{ color: '#FF6B6B', fontSize: '1rem' }}>😬 I regret this purchase</span>
                                </label>
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
                            {editingExpense && (
                                <button 
                                    className="btn-secondary"
                                    style={{ width: '100%', marginTop: '12px', borderColor: '#FF6B6B', color: '#FF6B6B' }}
                                    onClick={() => {
                                        handleDeleteExpense(editingExpense.id);
                                        setModalOpen(false);
                                        setEditingExpense(null);
                                    }}
                                >
                                    Delete Expense
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        ReactDOM.render(<VariableSpending />, document.getElementById('root'));
