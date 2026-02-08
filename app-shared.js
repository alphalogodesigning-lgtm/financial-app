(function () {
  const STORAGE_KEY = 'budgetTrackerData';
  const SUPABASE_CONFIG = window.SUPABASE_CONFIG || {};
  const supabaseClient = SUPABASE_CONFIG.supabaseClient || null;
  const STORAGE_TABLE = SUPABASE_CONFIG.STORAGE_TABLE || 'budget_tracker_state';
  const waitForAuthSession = SUPABASE_CONFIG.waitForAuthSession || (async () => null);

  const redirectToAuth = (options = {}) => {
    const shouldReplace = options.replace === true;
    const target = 'auth.html';
    if (shouldReplace) {
      window.location.replace(target);
      return;
    }
    window.location.href = target;
  };

  const resolveAuthSession = async () => {
    if (!supabaseClient) return null;
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (data?.session) return data.session;
    const refreshed = await supabaseClient.auth.refreshSession();
    if (refreshed?.data?.session) return refreshed.data.session;
    return waitForAuthSession();
  };

  const getAuthenticatedUser = async () => {
    if (!supabaseClient) return null;
    const session = await resolveAuthSession();
    return session?.user || null;
  };

  const loadBudgetData = async (options = {}) => {
    const fallback = localStorage.getItem(STORAGE_KEY);
    if (!supabaseClient) {
      return fallback ? JSON.parse(fallback) : null;
    }
    try {
      const user = await getAuthenticatedUser();
      if (!user) {
        if (options.redirect !== false) {
          redirectToAuth(options);
        }
        return fallback ? JSON.parse(fallback) : null;
      }
      const { data, error } = await supabaseClient
        .from(STORAGE_TABLE)
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data?.data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
        return data.data;
      }
    } catch (err) {
      console.warn('Supabase load failed, using local data.', err);
    }
    return fallback ? JSON.parse(fallback) : null;
  };

  const saveBudgetData = async (nextData, options = {}) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
    if (!supabaseClient) return;
    try {
      const user = await getAuthenticatedUser();
      if (!user) {
        if (options.redirect !== false) {
          redirectToAuth(options);
        }
        return;
      }
      const { error } = await supabaseClient
        .from(STORAGE_TABLE)
        .upsert({
          user_id: user.id,
          data: nextData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase save failed, kept local data.', err);
    }
  };

  const CATEGORIES = {
    Food: { color: '#66BB6A' },
    Transport: { color: '#89ABE3' },
    Shopping: { color: '#D4AF37' },
    Entertainment: { color: '#9C27B0' },
    Health: { color: '#FF6B6B' },
    Other: { color: '#888' }
  };

  const CATEGORY_LIST = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Other'];

  const DEFAULT_DATA = {
    income: 5000,
    fixedExpenses: [
      { id: 1, name: 'Rent', amount: 1200, dueDate: 1, category: 'Housing', mood: 'necessary', status: 'pending' },
      { id: 2, name: 'Internet', amount: 60, dueDate: 5, category: 'Utilities', mood: 'necessary', status: 'charged' },
      { id: 3, name: 'Phone', amount: 45, dueDate: 10, category: 'Utilities', mood: 'necessary', status: 'charged' },
      { id: 4, name: 'Gym', amount: 50, dueDate: 15, category: 'Health', mood: 'worth', status: 'pending' },
      { id: 5, name: 'Netflix', amount: 15, dueDate: 20, category: 'Entertainment', mood: 'neutral', status: 'charged' },
      { id: 6, name: 'Spotify', amount: 10, dueDate: 22, category: 'Entertainment', mood: 'worth', status: 'charged' }
    ],
    variableExpenses: [
      { id: 1, name: 'Groceries', amount: 85, date: '2026-02-01', time: '18:00', category: 'Food', merchant: 'Whole Foods', regret: false, notes: '', photo: null },
      { id: 2, name: 'Coffee', amount: 6, date: '2026-01-31', time: '08:30', category: 'Food', merchant: 'Starbucks', regret: false, notes: '', photo: null },
      { id: 3, name: 'Dinner', amount: 45, date: '2026-01-30', time: '19:30', category: 'Food', merchant: 'Restaurant', regret: false, notes: '', photo: null },
      { id: 4, name: 'Gas', amount: 50, date: '2026-01-29', time: '16:00', category: 'Transport', merchant: 'Shell', regret: false, notes: '', photo: null },
      { id: 5, name: 'Shopping', amount: 120, date: '2026-01-28', time: '14:00', category: 'Shopping', merchant: 'Amazon', regret: true, notes: 'Impulse buy', photo: null }
    ],
    streak: 12,
    categoryBudgets: {}
  };

  const CLEAN_STATE = {
    income: 0,
    fixedExpenses: [],
    variableExpenses: [],
    streak: 0,
    categoryBudgets: {}
  };

  const PAGE_DEFAULTS = {
    dashboard: CLEAN_STATE,
    'fixed-expenses': {
      income: 5000,
      fixedExpenses: [],
      variableExpenses: [],
      streak: 0
    },
    'variable-spending': {
      income: 5000,
      fixedExpenses: [],
      variableExpenses: [],
      streak: 0
    },
    projections: {
      income: 5000,
      fixedExpenses: [],
      variableExpenses: [],
      streak: 0
    },
    insights: {
      income: 0,
      fixedExpenses: [],
      variableExpenses: [],
      streak: 0,
      roast_level: 'honest'
    }
  };

  const getInitialData = (pageKey) => {
    const base = PAGE_DEFAULTS[pageKey] || CLEAN_STATE;
    return JSON.parse(JSON.stringify(base));
  };

  const START_MESSAGE = 'Set income to begin';

  const toAmount = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };

  const calculateTotals = (data) => {
    const income = Number.isFinite(data.income) ? data.income : 0;
    const totalFixed = (data.fixedExpenses || []).reduce((sum, exp) => sum + toAmount(exp.amount), 0);
    const totalVariable = (data.variableExpenses || []).reduce((sum, exp) => sum + toAmount(exp.amount), 0);
    const totalSpent = totalFixed + totalVariable;
    const remaining = income - totalSpent;
    return {
      income,
      totalFixed,
      totalVariable,
      totalSpent,
      remaining
    };
  };

  const calculateBurnMetrics = (data, options = {}) => {
    const { income, totalFixed, totalVariable, totalSpent, remaining } = calculateTotals(data);
    const daysInMonth = options.daysInMonth || 30;
    const today = options.today || new Date().getDate();
    const baselineDailyBurn = totalFixed / daysInMonth;
    const activeDailyBurn = today > 0 ? totalVariable / today : 0;
    const dailyBurnRate = baselineDailyBurn + activeDailyBurn;
    const projectedSpend = totalFixed + (activeDailyBurn * daysInMonth);
    const runway = dailyBurnRate > 0 ? remaining / dailyBurnRate : null;
    const incomeSet = income > 0;
    const availablePct = incomeSet ? (remaining / income) * 100 : null;
    const budgetPct = incomeSet ? (totalSpent / income) * 100 : null;

    return {
      income,
      incomeSet,
      totalFixed,
      totalVariable,
      totalSpent,
      remaining,
      daysInMonth,
      today,
      baselineDailyBurn,
      activeDailyBurn,
      dailyBurnRate,
      projectedSpend,
      runway,
      availablePct,
      budgetPct
    };
  };

  const calculateCategorySpending = (expenses) => {
    const categorySpending = {};
    (expenses || []).forEach((exp) => {
      categorySpending[exp.category] = (categorySpending[exp.category] || 0) + exp.amount;
    });
    return categorySpending;
  };

  const calculateFixedSummary = (expenses) => {
    const totalMonthly = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalAnnual = totalMonthly * 12;
    const charged = expenses.filter((exp) => exp.status === 'charged').reduce((sum, exp) => sum + exp.amount, 0);
    const pending = expenses.filter((exp) => exp.status === 'pending').reduce((sum, exp) => sum + exp.amount, 0);
    return { totalMonthly, totalAnnual, charged, pending };
  };

  const calculateVariableSummary = (expenses) => {
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const regretSpent = expenses.filter((exp) => exp.regret).reduce((sum, exp) => sum + exp.amount, 0);
    const avgPerDay = totalSpent / 30;
    const topCategory = CATEGORY_LIST.reduce((top, cat) => {
      const catTotal = expenses.filter((exp) => exp.category === cat).reduce((sum, exp) => sum + exp.amount, 0);
      return catTotal > top.amount ? { name: cat, amount: catTotal } : top;
    }, { name: '', amount: 0 });
    return { totalSpent, regretSpent, avgPerDay, topCategory };
  };

  const calculateProjectionSummary = ({ fixedExpenses, variableExpenses, scenarioIncome, scenarioVariableSpend }) => {
    const totalFixed = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalVariable = variableExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const currentMonthlySpend = totalFixed + totalVariable;
    const projectedVariableSpend = (totalVariable * scenarioVariableSpend) / 100;
    const projectedMonthlySpend = totalFixed + projectedVariableSpend;
    const projectedRemaining = scenarioIncome - projectedMonthlySpend;
    const projectedAnnualSavings = projectedRemaining * 12;
    return {
      totalFixed,
      totalVariable,
      currentMonthlySpend,
      projectedVariableSpend,
      projectedMonthlySpend,
      projectedRemaining,
      projectedAnnualSavings
    };
  };

  const calculateGoalSummary = (savingsGoal, monthlySavings) => {
    const monthsToGoal = savingsGoal / monthlySavings;
    const goalDate = new Date();
    goalDate.setMonth(goalDate.getMonth() + Math.ceil(monthsToGoal));
    const progressPercent = (monthlySavings / (savingsGoal / 12)) * 100;
    return { monthsToGoal, goalDate, progressPercent };
  };

  const buildProjectionTimeline = (fixedExpenses, income, days = 30) => {
    const today = new Date();
    const timelineData = [];
    for (let i = 0; i < days; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const day = date.getDate();
      const dayExpenses = fixedExpenses.filter((exp) => exp.dueDate === day);
      if (dayExpenses.length > 0) {
        const total = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        timelineData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          expenses: dayExpenses,
          total,
          isCluster: dayExpenses.length >= 3 || total > income * 0.3
        });
      }
    }
    return timelineData;
  };

  const buildScenarioDefinitions = ({ totalVariable, income, setScenarioVariableSpend, setScenarioIncome, setActiveScenario }) => [
    {
      id: 'frugal',
      title: '🍜 Frugal Mode',
      description: 'Cut variable spending by 30%',
      action: () => {
        setScenarioVariableSpend(70);
        setActiveScenario('frugal');
      },
      impact: totalVariable * 0.3
    },
    {
      id: 'moderate',
      title: '💰 Moderate Saving',
      description: 'Cut variable spending by 15%',
      action: () => {
        setScenarioVariableSpend(85);
        setActiveScenario('moderate');
      },
      impact: totalVariable * 0.15
    },
    {
      id: 'raise',
      title: '📈 Got a Raise',
      description: 'Income increases by 10%',
      action: () => {
        setScenarioIncome(income * 1.1);
        setActiveScenario('raise');
      },
      impact: income * 0.1
    },
    {
      id: 'splurge',
      title: '🛍️ Splurge Month',
      description: 'Variable spending up 50%',
      action: () => {
        setScenarioVariableSpend(150);
        setActiveScenario('splurge');
      },
      impact: -(totalVariable * 0.5)
    }
  ];

  const ROAST_LEVELS = {
    gentle: {
      id: 'gentle',
      name: 'Gentle Nudge',
      emoji: '😊',
      description: 'Supportive and encouraging. I\'ll be nice about your financial decisions.',
      example: 'You\'re doing your best! Maybe we can find some small areas to improve together?',
      color: '#66BB6A'
    },
    honest: {
      id: 'honest',
      name: 'Honest Friend',
      emoji: '😐',
      description: 'Straight talk without sugar coating. The default balanced approach.',
      example: 'You\'re spending more than you earn. Time for a reality check.',
      color: '#89ABE3'
    },
    harsh: {
      id: 'harsh',
      name: 'Disappointed Parent',
      emoji: '😤',
      description: 'No holds barred. I\'ll tell you exactly what you need to hear.',
      example: 'This is embarrassing. You\'re literally burning money and wondering why you\'re broke.',
      color: '#FF6B6B'
    },
    brutal: {
      id: 'brutal',
      name: 'Drill Sergeant',
      emoji: '🔥',
      description: 'Maximum intensity. Only for those who can handle the absolute truth.',
      example: 'WHAT ARE YOU DOING?! Your financial decisions are a disaster. This is pathetic.',
      color: '#DC143C'
    }
  };

  const calculateInsightsMetrics = (data) => {
    const income = data.income;
    const totalFixedExpenses = data.fixedExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalVariableSpent = data.variableExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalSpent = totalFixedExpenses + totalVariableSpent;
    const savingsAmount = income - totalSpent;
    const savingsRate = income > 0 ? (savingsAmount / income) * 100 : 0;

    const regretExpenses = data.variableExpenses.filter((exp) => exp.is_regret || exp.regret);
    const regretMoney = regretExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const regretRatio = totalVariableSpent > 0 ? regretMoney / totalVariableSpent : 0;

    const weekendExpenses = data.variableExpenses.filter((exp) => {
      const day = new Date(exp.date).getDay();
      return day === 0 || day === 6;
    });
    const weekdayExpenses = data.variableExpenses.filter((exp) => {
      const day = new Date(exp.date).getDay();
      return day !== 0 && day !== 6;
    });
    const avgWeekendSpend = weekendExpenses.length > 0
      ? weekendExpenses.reduce((sum, exp) => sum + exp.amount, 0) / weekendExpenses.length
      : 0;
    const avgWeekdaySpend = weekdayExpenses.length > 0
      ? weekdayExpenses.reduce((sum, exp) => sum + exp.amount, 0) / weekdayExpenses.length
      : 0;
    const weekendWeekdayRatio = avgWeekdaySpend > 0 ? avgWeekendSpend / avgWeekdaySpend : 0;

    const lateNightExpenses = data.variableExpenses.filter((exp) => {
      const hour = new Date(exp.created_at).getHours();
      return hour >= 22 || hour < 4;
    });
    const lateNightSpent = lateNightExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const lateNightSpendRatio = totalVariableSpent > 0 ? lateNightSpent / totalVariableSpent : 0;

    const categoryTotals = {};
    data.variableExpenses.forEach((exp) => {
      const cat = exp.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
    });
    const topCategory = Object.keys(categoryTotals).reduce((a, b) =>
      categoryTotals[a] > categoryTotals[b] ? a : b, 'Food');
    const topCategoryAmount = categoryTotals[topCategory] || 0;
    const topCategoryPercentage = totalVariableSpent > 0 ? (topCategoryAmount / totalVariableSpent) * 100 : 0;

    const merchantVisits = {};
    data.variableExpenses.forEach((exp) => {
      const merchant = exp.merchant || 'Unknown';
      merchantVisits[merchant] = (merchantVisits[merchant] || 0) + 1;
    });
    const topMerchant = Object.keys(merchantVisits).reduce((a, b) =>
      merchantVisits[a] > merchantVisits[b] ? a : b, '7-Eleven');
    const topMerchantVisits = merchantVisits[topMerchant] || 0;

    return {
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
    };
  };

  const calculateHealthScore = ({ savingsRate, regretRatio, lateNightSpendRatio, weekendWeekdayRatio, streak }) => {
    let score = 50;

    if (savingsRate >= 30) score += 30;
    else if (savingsRate >= 20) score += 25;
    else if (savingsRate >= 10) score += 15;
    else if (savingsRate >= 5) score += 5;
    else if (savingsRate >= 0) score -= 5;
    else if (savingsRate < 0) score -= 30;

    if (regretRatio <= 0.1) score += 15;
    else if (regretRatio < 0.4) score += 0;
    else if (regretRatio < 0.5) score -= 30;
    else if (regretRatio < 0.6) score -= 40;
    else if (regretRatio < 0.7) score -= 50;
    else if (regretRatio < 0.8) score -= 60;
    else score -= 70;

    if (lateNightSpendRatio === 0) score += 15;
    else if (lateNightSpendRatio < 0.1) score += 10;
    else if (lateNightSpendRatio < 0.2) score += 3;
    else if (lateNightSpendRatio < 0.3) score -= 5;
    else if (lateNightSpendRatio < 0.4) score -= 15;
    else score -= 20;

    if (weekendWeekdayRatio < 1.2) score += 15;
    else if (weekendWeekdayRatio < 1.5) score += 8;
    else if (weekendWeekdayRatio < 2) score -= 5;
    else if (weekendWeekdayRatio < 3) score -= 10;
    else score -= 20;

    if (streak >= 30) score += 20;
    else if (streak >= 14) score += 15;
    else if (streak >= 7) score += 10;

    return Math.max(0, Math.min(100, score));
  };

  const getGradeInfo = (score) => {
    if (score >= 90) return { grade: 'A', text: 'EXCELLENT', color: '#66BB6A' };
    if (score >= 80) return { grade: 'B', text: 'GOOD', color: '#89ABE3' };
    if (score >= 70) return { grade: 'C', text: 'ROOM FOR IMPROVEMENT', color: '#D4AF37' };
    if (score >= 60) return { grade: 'D', text: 'NEEDS WORK', color: '#FF9800' };
    return { grade: 'F', text: 'CRITICAL', color: '#FF6B6B' };
  };

  const buildBrutalTruthMessages = ({ regretRatio, regretMoney, totalSpent, income, savingsRate, weekendWeekdayRatio, lateNightSpendRatio }) => ({
    gentle: {
      extremeRegret: `You've marked ${(regretRatio * 100).toFixed(0)}% of your purchases as regrets. That's really high - maybe we should talk about what's happening?`,
      overspending: "It looks like you're spending a bit more than you're earning. Let's work together to find a balance!",
      highRegret: `You've had some regrets about RM${regretMoney.toFixed(0)} worth of purchases. Maybe take a moment before buying next time?`,
      lowSavings: 'Your savings could use a little boost. Even small changes can make a big difference over time!',
      weekendSpending: 'Your weekends are a bit pricier than weekdays. Maybe try some free activities on the weekend?',
      lateNight: 'Looks like you shop late at night. Maybe sleep on it before making purchases after 10pm?',
      good: "You're doing really well! Keep up the great work with your finances!"
    },
    honest: {
      extremeRegret: `${(regretRatio * 100).toFixed(0)}% regret ratio. That means you regret 4 out of 5 purchases. This is a serious problem that needs addressing NOW.`,
      overspending: "You're spending more than you earn. That's literally the definition of financial chaos. Time for a reality check.",
      highRegret: `You regret RM${regretMoney.toFixed(0)} worth of purchases. That's ${(regretRatio * 100).toFixed(0)}% of your spending. Maybe pause before clicking 'Buy'?`,
      lowSavings: "You're saving less than 5% of your income. At this rate, any emergency will destroy you. Not trying to be mean, just honest.",
      weekendSpending: `Your weekend spending is ${weekendWeekdayRatio.toFixed(1)}x your weekday spending. Your wallet needs a vacation FROM the weekend.`,
      lateNight: 'You spend 30% of your money after 10pm. Put your phone down and go to sleep. Your wallet will thank you.',
      good: "Actually... you're doing pretty well. Keep it up and you might actually achieve financial freedom. Crazy, right?"
    },
    harsh: {
      extremeRegret: `${(regretRatio * 100).toFixed(0)}% REGRET RATIO?! You literally regret most of what you buy! Do you have ANY self-control? This is beyond pathetic.`,
      overspending: "You're spending MORE than you earn? Really? This isn't sustainable. Your future self is going to hate you for this.",
      highRegret: `RM${regretMoney.toFixed(0)} in regret purchases. That's ${(regretRatio * 100).toFixed(0)}% of your money wasted. Do you even think before buying?`,
      lowSavings: "Less than 5% savings? You're one emergency away from financial ruin. This is embarrassing.",
      weekendSpending: `${weekendWeekdayRatio.toFixed(1)}x more on weekends? You treat weekends like a license to throw money away. Grow up.`,
      lateNight: '30% of your money vanishes after 10pm. Delete those shopping apps from your phone. This is pathetic.',
      good: "Surprisingly, you're not completely hopeless. Don't let it go to your head though."
    },
    brutal: {
      extremeRegret: `${(regretRatio * 100).toFixed(0)}% REGRET?! ARE YOU SERIOUS?! You regret ALMOST EVERYTHING you buy! What the hell is wrong with you?! STOP BUYING THINGS!`,
      overspending: "YOU'RE SPENDING MORE THAN YOU MAKE. What part of 'budget' don't you understand?! This is financial suicide!",
      highRegret: `RM${regretMoney.toFixed(0)} WASTED on regret purchases! That's ${(regretRatio * 100).toFixed(0)}% of your spending! Are you trying to stay poor?!`,
      lowSavings: "LESS THAN 5% SAVINGS?! You're basically financially illiterate. One emergency and you're DONE. This is absolutely pathetic!",
      weekendSpending: `WEEKEND SPENDING IS ${weekendWeekdayRatio.toFixed(1)}X HIGHER?! You're hemorrhaging money like it means nothing! STOP IT!`,
      lateNight: '30% SPENT AFTER 10PM?! What are you doing?! Put down the phone, GO TO BED, and stop destroying your finances!',
      good: "You're actually not terrible. Don't screw it up now. Stay disciplined or you'll end up like everyone else - broke."
    }
  });

  const getBrutalTruth = ({ roastLevel, metrics }) => {
    const messages = buildBrutalTruthMessages(metrics);
    const levelMessages = messages[roastLevel];
    if (metrics.regretRatio >= 0.7) return levelMessages.extremeRegret;
    if (metrics.totalSpent > metrics.income) return levelMessages.overspending;
    if (metrics.regretRatio >= 0.4) return levelMessages.highRegret;
    if (metrics.savingsRate < 5) return levelMessages.lowSavings;
    if (metrics.weekendWeekdayRatio > 3) return levelMessages.weekendSpending;
    if (metrics.lateNightSpendRatio > 0.3) return levelMessages.lateNight;
    return levelMessages.good;
  };

  const getPersonality = (metrics) => {
    if (metrics.regretRatio >= 0.7) {
      return {
        type: 'THE REGRET SPIRAL',
        description: 'Most of your purchases feel like mistakes. Pause, reflect, and set a 24-hour rule.',
        traits: ['🌀 Impulsive', '😬 Regret-Heavy', '🛑 Needs a Reset']
      };
    }
    if (metrics.regretRatio > 0.4 && metrics.lateNightSpendRatio > 0.3) {
      return {
        type: 'THE IMPULSE BUYER',
        description: 'Night shopping is becoming expensive. Save items at night, decide in daylight.',
        traits: ['🎭 Spontaneous', '⚡ Regret-Prone', '🎯 YOLO Spender']
      };
    }
    if (metrics.regretRatio >= 0.4) {
      return {
        type: "THE BUYER'S REMORSE",
        description: 'Regret is eating a big chunk of your spending. Slow down and plan purchases.',
        traits: ['😓 Second-Guesser', '🧠 Overthinker', '🛍️ Impulse-Prone']
      };
    }
    if (metrics.savingsRate >= 20) {
      return {
        type: 'THE DISCIPLINED SAVER',
        description: "You're crushing it! Your future self will thank you.",
        traits: ['💎 Disciplined', '🎯 Goal-Oriented', '📊 Data-Driven']
      };
    }
    if (metrics.weekendWeekdayRatio > 3) {
      return {
        type: 'THE WEEKEND WARRIOR',
        description: 'Weekends drain your wallet. Try free weekend activities.',
        traits: ['🎉 Social Spender', '📅 Weekend Splurger', '💸 FOMO Driven']
      };
    }
    return {
      type: 'THE BALANCED BUDGETER',
      description: "You're finding your rhythm. Keep tracking and adjusting.",
      traits: ['⚖️ Balanced', '📈 Improving', '🎯 Aware']
    };
  };

  const buildAchievements = ({ data, metrics }) => [
    { icon: '🔥', name: '7-Day Streak', description: 'Tracked for 7 days', unlocked: data.streak >= 7 },
    { icon: '📅', name: 'Month Master', description: 'Tracked for 30 days', unlocked: data.streak >= 30 },
    { icon: '💎', name: 'Super Saver', description: 'Save 30% of income', unlocked: metrics.savingsRate >= 30 },
    { icon: '🎯', name: 'Conscious Spender', description: '<10% regret purchases', unlocked: metrics.regretRatio < 0.1 },
    { icon: '👑', name: 'Budget King', description: 'Stay under budget', unlocked: metrics.totalSpent <= metrics.income },
    { icon: '📱', name: 'Organized AF', description: '10+ expenses logged', unlocked: data.variableExpenses.length >= 10 }
  ];

  const calculateTransactionStats = (data, metrics) => {
    const totalTransactions = data.variableExpenses.length;
    const avgTransactionSize = totalTransactions > 0 ? metrics.totalVariableSpent / totalTransactions : 0;
    const uniqueMerchants = new Set(data.variableExpenses.map((exp) => exp.merchant)).size;
    const biggestPurchase = Math.max(...data.variableExpenses.map((exp) => exp.amount || 0), 0);
    const annualSpendingRate = metrics.totalVariableSpent * 12;
    return {
      totalTransactions,
      avgTransactionSize,
      uniqueMerchants,
      biggestPurchase,
      annualSpendingRate
    };
  };

  window.AppShared = {
    supabaseClient,
    STORAGE_TABLE,
    waitForAuthSession,
    redirectToAuth,
    resolveAuthSession,
    getAuthenticatedUser,
    loadBudgetData,
    saveBudgetData,
    CATEGORIES,
    CATEGORY_LIST,
    DEFAULT_DATA,
    CLEAN_STATE,
    getInitialData,
    START_MESSAGE,
    calculateTotals,
    calculateBurnMetrics,
    calculateCategorySpending,
    calculateFixedSummary,
    calculateVariableSummary,
    calculateProjectionSummary,
    calculateGoalSummary,
    buildProjectionTimeline,
    buildScenarioDefinitions,
    ROAST_LEVELS,
    calculateInsightsMetrics,
    calculateHealthScore,
    getGradeInfo,
    getBrutalTruth,
    getPersonality,
    buildAchievements,
    calculateTransactionStats
  };
})();
