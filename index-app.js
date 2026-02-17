const { useState, useEffect } = React;

const {
  loadBudgetData,
  saveBudgetData,
  CATEGORIES,
  CLEAN_STATE,
  START_MESSAGE,
  calculateBurnMetrics,
  calculateCategorySpending,
  calculateExpenseStreak,
  dateTime
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

const STATUS_LABELS = {
  inactive: 'Free',
  trialing: 'Trial',
  active: 'Pro',
  past_due: 'Past due',
  canceled: 'Canceled',
  unpaid: 'Unpaid',
  incomplete: 'Incomplete',
  incomplete_expired: 'Incomplete expired',
  paused: 'Paused'
};

const resolvePlanLabel = (status) => {
  if (status === 'trialing') return 'Trial';
  if (status === 'active') return 'Pro';
  return 'Free';
};

const formatStatusLabel = (status) => STATUS_LABELS[status] || 'Free';

const formatDateLabel = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getTrialCountdownLabel = (trialEnd) => {
  if (!trialEnd) return null;
  const trialDate = new Date(trialEnd);
  if (Number.isNaN(trialDate.getTime())) return null;
  const now = new Date();
  const msRemaining = trialDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  if (daysRemaining <= 0) return 'Trial ends today';
  if (daysRemaining === 1) return '1 day left in trial';
  return `${daysRemaining} days left in trial`;
};

const getStatusTone = (status) => {
  if (status === 'active') return 'success';
  if (status === 'trialing') return 'info';
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete' || status === 'incomplete_expired') return 'warning';
  if (status === 'canceled' || status === 'paused') return 'neutral';
  return 'neutral';
};

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
const CRITICAL_BANNER_DISMISS_KEY = 'criticalBannerDismissed';

const getCriticalAlert = ({ runway, categorySpending, categoryBudgets }) => {
  const categoryEntries = Object.entries(categorySpending || {}).reduce((acc, [category, spent]) => {
    const budget = categoryBudgets?.[category] || 0;
    if (budget <= 0) return acc;
    const usagePct = budget > 0 ? (spent / budget) * 100 : 0;
    acc.push({
      category,
      spent,
      budget,
      usagePct
    });
    return acc;
  }, []);

  const overLimitCategory = categoryEntries
    .filter((item) => item.usagePct >= 90)
    .sort((a, b) => b.usagePct - a.usagePct)[0] || null;

  const lowRunway = Number.isFinite(runway) && runway < 10;

  if (!lowRunway && !overLimitCategory) return null;

  if (lowRunway && overLimitCategory) {
    return {
      severity: 'double',
      headline: `Runway low, ${Math.max(0, Math.floor(runway))} days left.`,
      subline: `${overLimitCategory.category} is at ${Math.round(overLimitCategory.usagePct)}%. One more move and you are bleeding.`
    };
  }

  if (lowRunway) {
    return {
      severity: 'runway',
      headline: `Runway low, ${Math.max(0, Math.floor(runway))} days left.`,
      subline: 'Your margin is thin. Lock in discipline before this spirals.'
    };
  }

  return {
    severity: 'category',
    headline: `${overLimitCategory.category} spending at ${Math.round(overLimitCategory.usagePct)}%.`,
    subline: 'You are crossing your line. Review your latest expenses now.'
  };
};

const getStreakMilestones = (streak) => {
  const safeStreak = Number.isFinite(streak) ? Math.max(0, streak) : 0;
  return STREAK_MILESTONES.map((days) => {
    const unlocked = safeStreak >= days;
    return {
      days,
      unlocked,
      label: `${days}d`,
      name: `${days}-day streak`
    };
  });
};

const getNextMilestone = (streak) => {
  const safeStreak = Number.isFinite(streak) ? Math.max(0, streak) : 0;
  return STREAK_MILESTONES.find((days) => safeStreak < days) || null;
};

function Dashboard() {
  const [data, setData] = useState(CLEAN_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('account');
  const [profile, setProfile] = useState({
    fullName: 'You',
    email: 'Not connected',
    avatarUrl: ''
  });
  const [accountForm, setAccountForm] = useState({
    fullName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [accountStatus, setAccountStatus] = useState({
    type: '',
    message: ''
  });
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState({
    status: 'inactive',
    trialEnd: null,
    renewalDate: null,
    endDate: null,
    stripeCustomerId: ''
  });
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    category: 'Food'
  });
  const [newIncome, setNewIncome] = useState({
    title: '',
    amount: '',
    date: dateTime.getTodayDateKey()
  });
  const [quickAddMode, setQuickAddMode] = useState('expense');
  const [isCriticalBannerCollapsed, setIsCriticalBannerCollapsed] = useState(false);
  const [isCriticalBannerDismissed, setIsCriticalBannerDismissed] = useState(false);
  const userName = profile.fullName || '';
  const safeStreak = Number.isFinite(data.streak) ? Math.max(0, data.streak) : 0;
  const streakMilestones = getStreakMilestones(safeStreak);
  const unlockedMilestones = streakMilestones.filter((milestone) => milestone.unlocked).length;
  const nextMilestone = getNextMilestone(safeStreak);
  const nextMilestoneIndex = nextMilestone ? STREAK_MILESTONES.indexOf(nextMilestone) : -1;
  const previousMilestone = nextMilestoneIndex > 0 ? STREAK_MILESTONES[nextMilestoneIndex - 1] : 0;
  const streakProgress = nextMilestone
    ? ((safeStreak - previousMilestone) / (nextMilestone - previousMilestone)) * 100
    : 100;

  useEffect(() => {
    let active = true;
    const supabaseClient = window.SUPABASE_CONFIG?.supabaseClient;
    if (!supabaseClient) return () => {
      active = false;
    };

    supabaseClient.auth.getUser().then(({ data: authData }) => {
      if (!active || !authData?.user) return;
      const user = authData.user;
      setProfile({
        fullName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'You',
        email: user.email || 'Not connected',
        avatarUrl: user.user_metadata?.avatar_url || ''
      });
      setAccountForm((prev) => ({
        ...prev,
        fullName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'You'
      }));
    }).catch(() => {
      if (!active) return;
      setProfile((prev) => ({
        ...prev,
        fullName: prev.fullName || 'You',
        email: prev.email || 'Not connected'
      }));
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadBudgetData({ replace: true }).then((saved) => {
      if (!isMounted) return;
      if (!saved || saved.onboarding_complete === false) {
        window.location.replace('onboarding.html');
        return;
      }
      if (saved) {
        const normalizedSaved = {
          ...CLEAN_STATE,
          ...saved,
          fixedExpenses: Array.isArray(saved.fixedExpenses) ? saved.fixedExpenses : [],
          variableExpenses: Array.isArray(saved.variableExpenses) ? saved.variableExpenses : [],
          categoryBudgets: saved.categoryBudgets && typeof saved.categoryBudgets === 'object' ? saved.categoryBudgets : {},
          incomeEntries: Array.isArray(saved.incomeEntries) ? saved.incomeEntries : []
        };

        setData({
          ...normalizedSaved,
          streak: calculateExpenseStreak(normalizedSaved.variableExpenses)
        });
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

  const variableExpenses = data.variableExpenses || [];
  const categorySpending = calculateCategorySpending(variableExpenses);
  const categoryBudgets = data.categoryBudgets || {};
  const criticalAlert = getCriticalAlert({ runway, categorySpending, categoryBudgets });
  const shouldShowCriticalBanner = Boolean(criticalAlert) && !isCriticalBannerDismissed;

  useEffect(() => {
    const dismissed = sessionStorage.getItem(CRITICAL_BANNER_DISMISS_KEY) === '1';
    setIsCriticalBannerDismissed(dismissed);
  }, []);

  useEffect(() => {
    if (criticalAlert) {
      setIsCriticalBannerCollapsed(false);
      return;
    }
    setIsCriticalBannerDismissed(false);
    sessionStorage.removeItem(CRITICAL_BANNER_DISMISS_KEY);
  }, [criticalAlert]);

  const handleDismissCriticalBanner = () => {
    setIsCriticalBannerDismissed(true);
    sessionStorage.setItem(CRITICAL_BANNER_DISMISS_KEY, '1');
  };

  const greetingText = (() => {
    const hour = dateTime.getCurrentHour();
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
    const dateStr = dateTime.getDateKeyDaysAgo(6 - i);
    const daySpending = variableExpenses
      .filter((exp) => exp.date === dateStr)
      .reduce((sum, exp) => sum + exp.amount, 0);
    return {
      day: dateTime.getWeekdayShortFromDateKey(dateStr),
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
      date: dateTime.getTodayDateKey(),
      time: dateTime.getCurrentTime(),
      created_at: dateTime.nowUtcISOString(),
      category: newExpense.category,
      merchant: '',
      regret: false,
      notes: '',
      photo: null
    };

    setData((prev) => {
      const variableExpenses = [expense, ...prev.variableExpenses];
      return {
        ...prev,
        variableExpenses,
        streak: calculateExpenseStreak(variableExpenses)
      };
    });

    setNewExpense({ name: '', amount: '', category: 'Food' });
    setModalOpen(false);
  };

  const handleAddIncome = () => {
    if (!newIncome.title || !newIncome.amount) return;

    const amount = parseFloat(newIncome.amount);
    if (Number.isNaN(amount) || amount <= 0) return;

    const incomeEntry = {
      id: Date.now(),
      title: newIncome.title,
      amount,
      date: newIncome.date,
      time: dateTime.getCurrentTime(),
      created_at: dateTime.nowUtcISOString()
    };

    setData((prev) => ({
      ...prev,
      income: (Number(prev.income) || 0) + amount,
      incomeEntries: [incomeEntry, ...(prev.incomeEntries || [])]
    }));

    setNewIncome({ title: '', amount: '', date: dateTime.getTodayDateKey() });
    setModalOpen(false);
  };

  const openSettings = () => {
    setProfileMenuOpen(false);
    setAccountStatus({ type: '', message: '' });
    setAccountForm((prev) => ({
      ...prev,
      fullName: profile.fullName || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));
    setSettingsOpen(true);
  };

  const fetchSubscriptionData = async () => {
    if (isSubscriptionLoading) return;

    const supabaseClient = window.SUPABASE_CONFIG?.supabaseClient;
    if (!supabaseClient) {
      setSubscriptionError('Subscription service is unavailable right now.');
      return;
    }

    setIsSubscriptionLoading(true);
    setSubscriptionError('');

    try {
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error('Please sign in again to view subscription details.');
      }

      const response = await fetch('/api/create-portal-session', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load subscription details.');
      }

      setSubscriptionData({
        status: payload.subscription_status || 'inactive',
        trialEnd: payload.trial_end || null,
        renewalDate: payload.renewal_date || null,
        endDate: payload.end_date || null,
        stripeCustomerId: payload.stripe_customer_id || ''
      });
    } catch (error) {
      setSubscriptionError(error?.message || 'Unable to load subscription details.');
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    if (!settingsOpen || activeSettingsTab !== 'subscription') return;
    fetchSubscriptionData();
  }, [settingsOpen, activeSettingsTab]);

  const openBillingPortal = async (flow = 'manage') => {
    if (isPortalLoading) return;

    const supabaseClient = window.SUPABASE_CONFIG?.supabaseClient;
    if (!supabaseClient) {
      setSubscriptionError('Subscription service is unavailable right now.');
      return;
    }

    setIsPortalLoading(true);
    setSubscriptionError('');

    try {
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error('Please sign in again to manage your subscription.');
      }

      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({ flow })
      });

      const payload = await response.json();
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Unable to open billing portal.');
      }

      setIsPortalLoading(false);
      window.location.href = payload.url;
    } catch (error) {
      setSubscriptionError(error?.message || 'Unable to open billing portal.');
      setIsPortalLoading(false);
    }
  };

  const handleAccountFieldChange = (field, value) => {
    setAccountForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNameSave = async () => {
    if (isSavingName) return;

    const nextName = accountForm.fullName.trim();
    if (!nextName) {
      setAccountStatus({ type: 'error', message: 'Name cannot be empty.' });
      return;
    }

    if (nextName === profile.fullName) {
      setAccountStatus({ type: 'info', message: 'No name change detected.' });
      return;
    }

    const supabaseClient = window.SUPABASE_CONFIG?.supabaseClient;
    if (!supabaseClient) {
      setAccountStatus({ type: 'error', message: 'Account service is unavailable. Please try again shortly.' });
      return;
    }

    setIsSavingName(true);
    setAccountStatus({ type: 'info', message: 'Saving your display name...' });

    try {
      const { data: updatedUser, error } = await supabaseClient.auth.updateUser({
        data: {
          full_name: nextName,
          name: nextName
        }
      });

      if (error) {
        setAccountStatus({ type: 'error', message: error.message || 'Unable to update your name.' });
        return;
      }

      const updatedFullName = updatedUser?.user?.user_metadata?.full_name
        || updatedUser?.user?.user_metadata?.name
        || nextName;

      setProfile((prev) => ({ ...prev, fullName: updatedFullName }));
      setAccountForm((prev) => ({ ...prev, fullName: updatedFullName }));
      setAccountStatus({ type: 'success', message: 'Name updated successfully.' });
    } finally {
      setIsSavingName(false);
    }
  };

  const handlePasswordSave = async () => {
    if (isSavingPassword) return;

    const currentPassword = accountForm.currentPassword;
    const newPassword = accountForm.newPassword;
    const confirmPassword = accountForm.confirmPassword;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setAccountStatus({ type: 'error', message: 'Fill in current password, new password, and confirmation.' });
      return;
    }

    if (newPassword.length < 8) {
      setAccountStatus({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setAccountStatus({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    const supabaseClient = window.SUPABASE_CONFIG?.supabaseClient;
    if (!supabaseClient) {
      setAccountStatus({ type: 'error', message: 'Account service is unavailable. Please try again shortly.' });
      return;
    }

    setIsSavingPassword(true);
    setAccountStatus({ type: 'info', message: 'Verifying current password...' });

    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const email = authData?.user?.email;

      if (!email) {
        setAccountStatus({ type: 'error', message: 'Unable to verify account email. Please sign in again.' });
        return;
      }

      const { error: verifyError } = await supabaseClient.auth.signInWithPassword({
        email,
        password: currentPassword
      });

      if (verifyError) {
        setAccountStatus({ type: 'error', message: 'Current password is incorrect.' });
        return;
      }

      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setAccountStatus({ type: 'error', message: updateError.message || 'Unable to update password.' });
        return;
      }

      setAccountForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setAccountStatus({ type: 'success', message: 'Password changed successfully.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    const supabaseClient = window.SUPABASE_CONFIG?.supabaseClient;
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    window.location.href = 'auth.html';
  };

  const handleDeleteAllData = async () => {
    const confirmed = window.confirm('This will clear all your budget data for this account and this browser. Continue?');
    if (!confirmed) return;

    const resetData = {
      ...CLEAN_STATE,
      categoryBudgets: {}
    };

    setData(resetData);
    localStorage.removeItem('budgetTrackerData');

    try {
      await saveBudgetData(resetData, { redirect: false });
      window.alert('Budget data cleared.');
    } catch (error) {
      window.alert('Local data was cleared, but cloud sync may still contain older data.');
    }

    setSettingsOpen(false);
  };

  const handleDeleteAccount = async () => {
    const firstConfirm = window.confirm('Delete your account permanently? This removes your login + all budget data.');
    if (!firstConfirm) return;

    const secondConfirm = window.confirm('Final confirmation: this cannot be undone. Proceed?');
    if (!secondConfirm) return;

    const supabaseClient = window.SUPABASE_CONFIG?.supabaseClient;
    if (!supabaseClient) {
      window.alert('Supabase is not connected. Account deletion requires Supabase configuration.');
      return;
    }

    const { error } = await supabaseClient.rpc('delete_my_account');

    if (error) {
      window.alert(
        'Account deletion requires a Supabase RPC named delete_my_account. Please add it in Supabase SQL editor (details shared in PR notes).'
      );
      return;
    }

    localStorage.removeItem('budgetTrackerData');
    await supabaseClient.auth.signOut();
    window.location.href = 'auth.html';
  };

  return (
    <div className="container">
      {/* Navigation */}
      <nav className="main-nav">
        <a href="index.html" className="nav-link active">📊 Dashboard</a>
        <a href="fixed-expenses.html" className="nav-link">⚓ Fixed Expenses</a>
        <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
        <a href="projections.html" className="nav-link">🔮 Projections</a>
        <a href="purchase-simulator.html" className="nav-link">🧪 Simulator</a>
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
        <div className="header-copy">
          <h1 className="header-title">Command Center</h1>
          <p className="header-subtitle">Your financial overview at a glance</p>
        </div>
        <div className="header-actions">
          <div className="profile-menu-wrapper">
            <button
              className="profile-button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              aria-label="Open profile and settings"
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" className="profile-avatar" />
              ) : (
                <span>{(profile.fullName || 'Y').slice(0, 1).toUpperCase()}</span>
              )}
            </button>
            {profileMenuOpen && (
              <div className="profile-menu-dropdown">
                <button className="profile-menu-item" onClick={openSettings}>⚙️ Settings & profile</button>
                <button className="profile-menu-item" onClick={handleLogout}>↩ Log out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {shouldShowCriticalBanner && (
        <section className={`critical-banner ${isCriticalBannerCollapsed ? 'collapsed' : ''}`} role="alert" aria-live="assertive">
          <div className="critical-banner-header">
            <div>
              <p className="critical-banner-kicker">Critical signal</p>
              <h2 className="critical-banner-title">{criticalAlert.headline}</h2>
              {!isCriticalBannerCollapsed && <p className="critical-banner-subline">{criticalAlert.subline}</p>}
            </div>
            <div className="critical-banner-controls">
              <button
                className="critical-banner-control"
                onClick={() => setIsCriticalBannerCollapsed((prev) => !prev)}
                aria-label={isCriticalBannerCollapsed ? 'Expand critical warning' : 'Collapse critical warning'}
              >
                {isCriticalBannerCollapsed ? 'Expand' : 'Collapse'}
              </button>
              <button
                className="critical-banner-control"
                onClick={handleDismissCriticalBanner}
                aria-label="Dismiss critical warning for this session"
              >
                Dismiss
              </button>
            </div>
          </div>

          {!isCriticalBannerCollapsed && (
            <div className="critical-banner-actions">
              <a href="variable-spending.html" className="critical-banner-btn primary">Review expense</a>
              <a href="purchase-simulator.html" className="critical-banner-btn secondary">Simulate purchase</a>
            </div>
          )}
        </section>
      )}

      <section className="streak-hub card" aria-label="Streak and milestone progress">
        <div className="streak-hub-main">
          <div className="streak-fire-wrap" aria-hidden="true">
            <span className="streak-flame-emoji">🔥</span>
          </div>
          <div>
            <p className="streak-kicker">Focus streak</p>
            <div className="streak-value-row">
              <span className="streak-value">{safeStreak}</span>
              <span className="streak-days">days</span>
            </div>
            <p className="streak-description">
              {nextMilestone
                ? `${Math.max(0, nextMilestone - safeStreak)} days to unlock your ${nextMilestone}-day badge`
                : 'Legend status unlocked. Keep the fire alive.'}
            </p>
          </div>
        </div>

        <div className="streak-progress">
          <div className="streak-progress-meta">
            <span>Badge progress</span>
            <span>{unlockedMilestones}/{STREAK_MILESTONES.length} unlocked</span>
          </div>
          <div className="streak-progress-track" role="progressbar" aria-valuenow={Math.min(100, Math.max(0, streakProgress))} aria-valuemin="0" aria-valuemax="100">
            <div className="streak-progress-fill" style={{ width: `${Math.min(100, Math.max(0, streakProgress))}%` }} />
          </div>
          <div className="streak-badges">
            {streakMilestones.map((milestone) => (
              <div
                key={milestone.days}
                className={`streak-milestone ${milestone.unlocked ? 'unlocked' : ''}`}
                title={milestone.name}
              >
                <span className="streak-milestone-icon">{milestone.unlocked ? '🏆' : '🔒'}</span>
                <span>{milestone.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      <div className={`modal ${settingsOpen ? 'active settings-active' : ''}`} onClick={(e) => { if (e.target.classList.contains('modal')) setSettingsOpen(false); }}>
        <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>

          {/* ── Fixed header: title + tabs ── */}
          <div className="settings-modal-header">
            <h2 className="modal-title">Settings &amp; profile</h2>
            <div className="settings-tabs">
              <button
                className={`settings-tab ${activeSettingsTab === 'account' ? 'active' : ''}`}
                onClick={() => setActiveSettingsTab('account')}
              >
                Account
              </button>
              <button
                className={`settings-tab ${activeSettingsTab === 'subscription' ? 'active' : ''}`}
                onClick={() => setActiveSettingsTab('subscription')}
              >
                Subscription
              </button>
              <button
                className={`settings-tab ${activeSettingsTab === 'danger' ? 'active' : ''}`}
                onClick={() => setActiveSettingsTab('danger')}
              >
                Danger zone
              </button>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="settings-modal-body">
            <div className="settings-panel">
              {activeSettingsTab === 'account' && (
                <div>
                  <div className="account-summary">
                    <div className="profile-button profile-button-large" aria-hidden="true">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="Profile" className="profile-avatar" />
                      ) : (
                        <span>{(profile.fullName || 'Y').slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <div className="account-name">{profile.fullName}</div>
                      <div className="account-email">{profile.email}</div>
                    </div>
                  </div>
                  <div className="account-editor">
                    <div className="account-field">
                      <label className="form-label" htmlFor="account-name-input">Name</label>
                      <input
                        id="account-name-input"
                        type="text"
                        value={accountForm.fullName}
                        onChange={(event) => handleAccountFieldChange('fullName', event.target.value)}
                        placeholder="Enter your display name"
                        autoComplete="name"
                        maxLength={80}
                      />
                      <button className="btn-primary account-action-btn" onClick={handleNameSave} disabled={isSavingName || isSavingPassword}>
                        {isSavingName ? 'Saving...' : 'Save name'}
                      </button>
                    </div>

                    <div className="account-field">
                      <label className="form-label" htmlFor="account-email-input">Email</label>
                      <input id="account-email-input" type="email" value={profile.email} disabled readOnly aria-readonly="true" />
                      <p className="account-help-text">Email changes are disabled to protect your login and billing identity.</p>
                    </div>

                    <div className="account-field">
                      <label className="form-label" htmlFor="account-current-password-input">Current password</label>
                      <input
                        id="account-current-password-input"
                        type="password"
                        value={accountForm.currentPassword}
                        onChange={(event) => handleAccountFieldChange('currentPassword', event.target.value)}
                        placeholder="Enter current password"
                        autoComplete="current-password"
                      />

                      <label className="form-label" htmlFor="account-new-password-input">New password</label>
                      <input
                        id="account-new-password-input"
                        type="password"
                        value={accountForm.newPassword}
                        onChange={(event) => handleAccountFieldChange('newPassword', event.target.value)}
                        placeholder="Minimum 8 characters"
                        autoComplete="new-password"
                      />

                      <label className="form-label" htmlFor="account-confirm-password-input">Confirm new password</label>
                      <input
                        id="account-confirm-password-input"
                        type="password"
                        value={accountForm.confirmPassword}
                        onChange={(event) => handleAccountFieldChange('confirmPassword', event.target.value)}
                        placeholder="Retype new password"
                        autoComplete="new-password"
                      />

                      <button className="btn-primary account-action-btn" onClick={handlePasswordSave} disabled={isSavingName || isSavingPassword}>
                        {isSavingPassword ? 'Updating...' : 'Change password'}
                      </button>
                    </div>

                    {accountStatus.message && (
                      <p className={`account-status account-status-${accountStatus.type || 'info'}`}>
                        {accountStatus.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeSettingsTab === 'subscription' && (
                <div className="settings-panel subscription-panel">
                  <div className="subscription-card">
                    <div className="subscription-card-header">
                      <div>
                        <p className="subscription-label">Current plan</p>
                        <h3>{resolvePlanLabel(subscriptionData.status)}</h3>
                      </div>
                      <span className={`subscription-status-badge ${getStatusTone(subscriptionData.status)}`}>
                        {formatStatusLabel(subscriptionData.status)}
                      </span>
                    </div>

                    <div className="subscription-details-grid">
                      <div>
                        <p className="subscription-detail-label">Subscription Status</p>
                        <p className="subscription-detail-value">{subscriptionData.status || 'inactive'}</p>
                      </div>
                      {subscriptionData.status === 'trialing' && formatDateLabel(subscriptionData.trialEnd) && (
                        <div>
                          <p className="subscription-detail-label">Trial end date</p>
                          <p className="subscription-detail-value">{formatDateLabel(subscriptionData.trialEnd)}</p>
                        </div>
                      )}
                      {subscriptionData.status === 'active' && formatDateLabel(subscriptionData.renewalDate) && (
                        <div>
                          <p className="subscription-detail-label">Renewal date</p>
                          <p className="subscription-detail-value">{formatDateLabel(subscriptionData.renewalDate)}</p>
                        </div>
                      )}
                      {subscriptionData.status === 'canceled' && formatDateLabel(subscriptionData.endDate) && (
                        <div>
                          <p className="subscription-detail-label">End date</p>
                          <p className="subscription-detail-value">{formatDateLabel(subscriptionData.endDate)}</p>
                        </div>
                      )}
                    </div>

                    {subscriptionData.status === 'trialing' && getTrialCountdownLabel(subscriptionData.trialEnd) && (
                      <p className="subscription-note">{getTrialCountdownLabel(subscriptionData.trialEnd)}</p>
                    )}

                    {subscriptionData.status === 'active' && formatDateLabel(subscriptionData.renewalDate) && (
                      <p className="subscription-note">Renews on {formatDateLabel(subscriptionData.renewalDate)}.</p>
                    )}

                    {subscriptionData.status === 'past_due' && (
                      <p className="subscription-note warning">Payment issue detected. Please update your payment method.</p>
                    )}

                    {subscriptionData.status === 'canceled' && formatDateLabel(subscriptionData.endDate) && (
                      <p className="subscription-note">Your plan will end on {formatDateLabel(subscriptionData.endDate)}.</p>
                    )}

                    <div className="subscription-actions">
                      {subscriptionData.status === 'inactive' && (
                        <button className="btn-primary" onClick={() => openBillingPortal('upgrade')} disabled={isPortalLoading}>
                          Upgrade to Pro
                        </button>
                      )}

                      {subscriptionData.status === 'trialing' && (
                        <button className="btn-secondary" onClick={() => openBillingPortal('cancel')} disabled={isPortalLoading}>Cancel Trial</button>
                      )}

                      {subscriptionData.status === 'active' && (
                        <>
                          <button className="btn-primary" onClick={() => openBillingPortal('manage')} disabled={isPortalLoading}>Manage Subscription</button>
                          <button className="btn-secondary" onClick={() => openBillingPortal('cancel')} disabled={isPortalLoading}>Cancel</button>
                        </>
                      )}

                      {subscriptionData.status === 'past_due' && (
                        <button className="btn-primary" onClick={() => openBillingPortal('update_payment')} disabled={isPortalLoading}>
                          Update Payment Method
                        </button>
                      )}

                      {subscriptionData.status === 'canceled' && (
                        <button className="btn-primary" onClick={() => openBillingPortal('reactivate')} disabled={isPortalLoading}>Reactivate</button>
                      )}
                    </div>

                    {isSubscriptionLoading && <p className="subscription-feedback">Loading subscription details...</p>}
                    {subscriptionError && <p className="subscription-feedback error">{subscriptionError}</p>}
                  </div>
                </div>
              )}

              {activeSettingsTab === 'danger' && (
                <div className="settings-placeholder">
                  <h3>Danger zone</h3>
                  <p>These actions are permanent. Be careful.</p>
                  <div className="danger-actions">
                    <button className="btn-secondary danger-btn" onClick={handleDeleteAllData}>Clear all budget data</button>
                    <button className="btn-secondary danger-btn danger-btn-destructive" onClick={handleDeleteAccount}>Delete account</button>
                    <button className="btn-secondary danger-btn" onClick={handleLogout}>Log out</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Fixed footer: close ── */}
          <div className="settings-modal-footer">
            <button className="btn-secondary" onClick={() => setSettingsOpen(false)}>Close</button>
          </div>

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
            {variableExpenses.length === 0 && (
              <div style={{ color: '#888', textAlign: 'center', padding: '24px 0' }}>
                No expenses yet. Good job 👍
              </div>
            )}
            {variableExpenses.slice(0, 5).map((exp) => (
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

      <button
        className="quick-add-btn"
        onClick={() => {
          setQuickAddMode('expense');
          setModalOpen(true);
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      <div className={`modal ${modalOpen ? 'active' : ''}`} onClick={(event) => event.target.className.includes('modal') && setModalOpen(false)}>
        <div className="modal-content" onClick={(event) => event.stopPropagation()}>
          {quickAddMode === 'expense' ? (
            <>
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
              <button className="modal-switch-link" onClick={() => setQuickAddMode('income')}>
                Add Bonus Pay
              </button>
            </>
          ) : (
            <>
              <h2 className="modal-title">Add Bonus Pay</h2>
              <div className="form-group">
                <label className="form-label">Bonus title</label>
                <input
                  type="text"
                  value={newIncome.title}
                  onChange={(event) => setNewIncome({ ...newIncome, title: event.target.value })}
                  placeholder="Debt Return - Arvin"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={newIncome.amount}
                  onChange={(event) => setNewIncome({ ...newIncome, amount: event.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="btn-row">
                <button className="btn-primary" onClick={handleAddIncome}>
                  Add Income
                </button>
                <button className="btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
              </div>
              <button className="modal-switch-link" onClick={() => setQuickAddMode('expense')}>
                Add Quick Expense
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.render(<Dashboard />, document.getElementById('root'));
