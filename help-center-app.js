const { useState } = React;

const HELP_CATEGORIES = [
  {
    title: 'Getting Started',
    description: 'Core concepts to set up your planning flow correctly.',
    items: ['How to set budget correctly', 'How runway works', 'How to interpret rows']
  },
  {
    title: 'How Premium Works',
    description: 'Understand what Pro unlocks and how billing behaves.',
    items: ['What unlocks', 'Trial explanation', 'Billing clarity']
  },
  {
    title: 'Common Mistakes',
    description: 'Avoid these frequent planning mistakes early on.',
    items: ['Overestimating income', 'Ignoring fixed expenses', 'Not simulating big purchases']
  }
];




function HelpCenterPage() {
  const [activeTab, setActiveTab] = useState('help');
  const [rating, setRating] = useState(3);

  return (
    <div className="container">
      <nav className="main-nav">
        <a href="index.html" className="nav-link">📊 Dashboard</a>
        <a href="fixed-expenses.html" className="nav-link">⚓ Fixed Expenses</a>
        <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
        <a href="savings-goal.html" className="nav-link">🎯 Savings Goal</a>
        <a href="projections.html" className="nav-link">🔮 Projections</a>
        <a href="purchase-simulator.html" className="nav-link">🧪 Simulator</a>
        <a href="insights.html" className="nav-link">🧠 Insights</a>
        <a href="help-center.html" className="nav-link active">🛟 Help Center</a>
      </nav>

      <header className="page-header">
        <h1>Help Center</h1>
        <p>Find quick answers, learn best practices, and reach support when you need it.</p>
      </header>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'help' ? 'active' : ''}`} onClick={() => setActiveTab('help')}>Help Center</button>
        <button className={`tab-btn ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>Support</button>
      </div>

      {activeTab === 'help' ? (
        <section className="help-grid">
          {HELP_CATEGORIES.map((category) => (
            <article key={category.title} className="card category-card">
              <h2>{category.title}</h2>
              <p>{category.description}</p>
              <ul>
                {category.items.map((item) => (
                  <li key={item}>
                    <button type="button" className="article-btn">
                      <span>{item}</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      ) : (
        <section className="support-grid">
          <article className="card support-card" role="button" tabIndex="0">
            <div className="card-icon email">📧</div>
            <h3>Email Support</h3>
            <p>Reach our team directly for account or product questions.</p>
            <button type="button" className="ghost-btn">Email support</button>
          </article>

          <article className="card support-card feedback-card">
            <div className="card-icon feedback">⭐</div>
            <h3>Feedback Form</h3>
            <p>Share a quick experience rating and your feedback.</p>
            <label htmlFor="feedback-message">Your feedback</label>
            <textarea id="feedback-message" placeholder="Tell us what we can improve..." rows="4" />
            <label htmlFor="feedback-rating">Rating (1 = extremely dissatisfied, 5 = extremely satisfied)</label>
            <input
              id="feedback-rating"
              type="range"
              min="1"
              max="5"
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
            />
            <div className="rating-readout">Selected rating: <strong>{rating}</strong></div>
            <button type="button" className="ghost-btn">Send feedback</button>
          </article>

          <article className="card support-card">
            <div className="card-icon bug">🐞</div>
            <h3>Report a Bug</h3>
            <p>Flag issues with steps and context so we can investigate fast.</p>
            <label htmlFor="bug-title">Issue title</label>
            <input id="bug-title" type="text" placeholder="Example: Expense chart not loading" />
            <label htmlFor="bug-description">Description</label>
            <textarea id="bug-description" rows="3" placeholder="What happened and how can we reproduce it?" />
            <button type="button" className="ghost-btn">Report issue</button>
          </article>
        </section>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<HelpCenterPage />);
