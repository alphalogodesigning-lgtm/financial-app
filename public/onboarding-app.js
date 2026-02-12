const { useEffect, useMemo, useState } = React;

const {
  supabaseClient,
  getAuthenticatedUser,
  loadBudgetData,
  saveBudgetData,
  ROAST_LEVELS,
  CLEAN_STATE
} = window.AppShared;

function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [roastLevel, setRoastLevel] = useState('honest');
  const [income, setIncome] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const roastOptions = useMemo(() => Object.values(ROAST_LEVELS), []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const user = await getAuthenticatedUser();
        if (!user) {
          window.location.replace('auth.html');
          return;
        }

        const saved = await loadBudgetData({ redirect: false, localFallback: false });
        if (!active) return;

        if (saved?.onboarding_complete === true) {
          window.location.replace('index.html');
          return;
        }

        setName(saved?.user_name || user.user_metadata?.full_name || user.user_metadata?.name || '');
        if (saved?.roast_level) {
          setRoastLevel(saved.roast_level);
        }
        if (saved?.income > 0) {
          setIncome(String(saved.income));
        }
      } catch (err) {
        setError('Could not load onboarding right now. Please refresh and try again.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const validateCurrentStep = () => {
    if (step === 1) {
      if (!name.trim()) {
        setError('Drop your name so we know what to call the legend in this dashboard.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!ROAST_LEVELS[roastLevel]) {
        setError('Pick a roast level. We promise it is for your own financial good.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      const amount = Number(income);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError('Please enter your monthly income or budget as a number above 0.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    setError('');
    if (!validateCurrentStep()) return;
    setStep((prev) => Math.min(3, prev + 1));
  };

  const handleBack = () => {
    setError('');
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleFinish = async () => {
    setError('');
    if (!validateCurrentStep() || isSubmitting) return;

    const amount = Number(income);
    setIsSubmitting(true);

    try {
      const currentData = await loadBudgetData({ redirect: false, localFallback: false }) || {};
      const normalizedData = {
        ...CLEAN_STATE,
        ...currentData,
        fixedExpenses: Array.isArray(currentData.fixedExpenses) ? currentData.fixedExpenses : [],
        variableExpenses: Array.isArray(currentData.variableExpenses) ? currentData.variableExpenses : [],
        categoryBudgets: currentData.categoryBudgets && typeof currentData.categoryBudgets === "object" ? currentData.categoryBudgets : {},
        incomeEntries: Array.isArray(currentData.incomeEntries) ? currentData.incomeEntries : []
      };

      await saveBudgetData({
        ...normalizedData,
        income: amount,
        roast_level: roastLevel,
        user_name: name.trim(),
        onboarding_complete: true
      }, { redirect: false });

      if (supabaseClient) {
        await supabaseClient.auth.updateUser({
          data: {
            full_name: name.trim(),
            name: name.trim(),
            roast_level: roastLevel,
            onboarding_complete: true
          }
        });
      }

      window.location.replace('index.html');
    } catch (err) {
      setError('We hit a snag saving your setup. Please try once more.');
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <>
          <h1 className="title">First up — what should we call you?</h1>
          <p className="subtitle">No pressure, but this is how we avoid calling you "Spreadsheet Warrior #427".</p>
          <label className="field-label" htmlFor="name">Your name</label>
          <input
            id="name"
            type="text"
            maxLength={40}
            placeholder="e.g. Alex"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <h1 className="title">How spicy should the money truth be?</h1>
          <p className="subtitle">Pick your roast level. You can change this later in Insights when you feel brave (or soft).</p>
          <div className="option-grid">
            {roastOptions.map((level) => (
              <button
                key={level.id}
                type="button"
                className={`option ${roastLevel === level.id ? 'selected' : ''}`}
                onClick={() => setRoastLevel(level.id)}
              >
                <div className="option-top">
                  <span>{level.emoji}</span>
                  <span>{level.name}</span>
                </div>
                <p className="option-text">{level.description}</p>
              </button>
            ))}
          </div>
        </>
      );
    }

    return (
      <>
        <h1 className="title">Last one — monthly income or budget</h1>
        <p className="subtitle">Give us your monthly amount so projections and dashboards start with useful numbers.</p>
        <label className="field-label" htmlFor="income">Monthly income / budget (RM)</label>
        <input
          id="income"
          type="number"
          inputMode="decimal"
          min="1"
          step="0.01"
          placeholder="e.g. 5000"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
        />
        <p className="helper">Your monthly income or budget will be able to be changed later too.</p>
      </>
    );
  };

  if (isLoading) {
    return (
      <main className="card">
        <span className="chip">Budget Tracker Setup</span>
        <p className="subtitle">Loading your setup wizard...</p>
      </main>
    );
  }

  return (
    <main className="card">
      <span className="chip">Budget Tracker Setup</span>

      <div className="progress">
        {[1, 2, 3].map((value) => (
          <div key={value} className={`dot ${step >= value ? 'active' : ''}`} />
        ))}
      </div>

      {renderStep()}

      <p className="error">{error}</p>

      <div className="footer">
        <button type="button" className="btn btn-secondary" disabled={step === 1 || isSubmitting} onClick={handleBack}>
          Back
        </button>
        {step < 3 ? (
          <button type="button" className="btn btn-primary" onClick={handleNext}>
            Next
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={isSubmitting} onClick={handleFinish}>
            {isSubmitting ? 'Saving...' : 'Finish Setup'}
          </button>
        )}
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<OnboardingPage />);
