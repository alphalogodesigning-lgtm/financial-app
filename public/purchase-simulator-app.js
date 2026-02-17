const { useState, useEffect, useMemo, useRef } = React;

// ─── ROAST DATABASE ─────────────────────────────────────────────────
const ROAST_DATABASE = {
    safe: [
        "✅ You're good bro, this won't even scratch your runway.",
        "Smart move! This purchase keeps you comfortable.",
        "Clean decision, your wallet will thank you.",
        "Respect. You've got plenty of breathing room after this.",
        "This is financially responsible AF. Nice.",
        "Go ahead king, you can afford this easily.",
        "Your future self approves this purchase 👑",
        "Solid choice, won't put a dent in your safety net.",
        "This fits perfectly in your budget, no stress.",
        "Financial discipline on point, buy with confidence.",
        "Your runway stays healthy, proceed without worry.",
        "This won't hurt at all, you're in the clear.",
        "Perfectly safe purchase, your finances stay solid.",
        "Good call, this won't mess with your stability.",
        "You've earned this without compromising anything.",
        "This purchase makes sense, go for it.",
        "Your budget can handle this like a champ.",
        "Zero risk here, your finances are locked in.",
        "This is what financial freedom looks like.",
        "Buy it. Your runway won't even notice.",
    ],
    tight: [
        "⚠️ Possible, but you'll be eating instant noodles for a bit.",
        "You CAN buy this, but it's gonna be tight till payday.",
        "Doable, but your runway just got significantly shorter.",
        "This will work, but you better not have any surprises.",
        "Manageable, if you can survive on rice and eggs.",
        "You can do this, but say goodbye to flexibility.",
        "It's possible, but one emergency and you're cooked.",
        "Technically affordable, but you'll feel it hard.",
        "You have the money, but is it really worth the squeeze?",
        "This cuts it close. Hope nothing unexpected pops up.",
        "You'll survive, but comfort? Not really.",
        "Affordable... barely. Better not go out for the next week.",
        "You can pull this off, but it'll be a struggle.",
        "Tight fit. Your runway is gonna feel cramped.",
        "Possible if you're okay with cutting every corner.",
        "You've got just enough, but no buffer at all.",
        "This works if you can live on instant ramen exclusively.",
        "Doable, but you're walking a financial tightrope now.",
        "You can afford it, but one wrong move and it's over.",
        "Technically yes, but practically? It's gonna hurt.",
    ],
    fucked: [
        "🚨 STOP. You're fucked if you buy this now.",
        "Are you serious? This will drain you in days.",
        "Absolutely NOT. You'll be broke before the week ends.",
        "Hell no. This purchase is financial suicide right now.",
        "Don't even think about it. You can't afford this.",
        "This is how you end up borrowing money from friends.",
        "NOPE. You'll regret this within 48 hours.",
        "You're already on thin ice, this will break you.",
        "This is a terrible idea, you'll run dry immediately.",
        "ABORT MISSION. Your runway can't take this hit.",
        "This is how people end up in debt, don't do it.",
        "You literally cannot afford this, full stop.",
        "Buy this and you're eating air for the rest of the month.",
        "This is financial recklessness, plain and simple.",
        "You'll be negative before your next paycheck, guaranteed.",
        "Absolutely reckless. Your future self will hate you.",
        "This purchase will destroy your runway, stay away.",
        "Don't do this to yourself, you can't recover from this.",
        "This is a one-way ticket to being broke AF.",
        "You're playing with fire, and you WILL get burned.",
    ],
    negative: [
        "💀 You're already fucked. This would make it worse.",
        "Bro, you're in the negative. Why are you even here?",
        "Your balance is already toast, this changes nothing.",
        "You can't afford anything right now, full stop.",
        "Negative runway = you need money IN, not OUT.",
        "This is beyond repair, focus on earning not spending.",
        "You're underwater financially, this won't help.",
        "Stop shopping and start surviving, my guy.",
        "Your finances are on life support, don't pull the plug.",
        "Negative days means you're already late on bills.",
        "You need an income boost, not another purchase.",
        "Your wallet is crying, please don't make it worse.",
        "This is rock bottom territory, avoid all purchases.",
        "You're financially drowning, this is not the move.",
        "Negative balance = emergency mode, not shopping mode.",
        "This would be the final nail in the coffin.",
        "Your runway crashed already, this is just salt in the wound.",
        "You're past the point of no return, focus on recovery.",
        "This purchase is irrelevant, you need cash flow ASAP.",
        "You're already in survival mode, act accordingly.",
    ]
};

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────
function getRandomRoast(category) {
    const roasts = ROAST_DATABASE[category];
    return roasts[Math.floor(Math.random() * roasts.length)];
}

function calculateSimulation(currentBalance, dailyBurn, purchaseAmount) {
    const safeDailyBurn = Number.isFinite(dailyBurn) ? dailyBurn : 0;

    // Current state
    const currentRunway = safeDailyBurn > 0 ? Math.floor(currentBalance / safeDailyBurn) : 999;

    // After purchase state
    const newBalance = currentBalance - purchaseAmount;
    const newRunway = safeDailyBurn > 0 ? Math.floor(newBalance / safeDailyBurn) : (newBalance < 0 ? -1 : 999);
    
    // Determine status
    let status, roastCategory, emoji;
    
    if (newRunway < 0) {
        status = "YOU'RE FUCKED";
        roastCategory = "negative";
        emoji = "💀";
    } else if (newRunway < 5) {
        status = "YOU'RE FUCKED";
        roastCategory = "fucked";
        emoji = "🚨";
    } else if (newRunway >= 5 && newRunway < 15) {
        status = "IT'S TIGHT";
        roastCategory = "tight";
        emoji = "⚠️";
    } else {
        status = "SAFE";
        roastCategory = "safe";
        emoji = "✅";
    }
    
    const roastText = getRandomRoast(roastCategory);
    
    return {
        currentBalance,
        currentRunway,
        newBalance,
        newRunway,
        status,
        roastCategory,
        emoji,
        roastText
    };
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────
function PurchaseSimulator() {
    const [data, setData] = useState(null);
    const [isHydrated, setIsHydrated] = useState(false);
    const [purchaseAmount, setPurchaseAmount] = useState('');
    const [entitlements, setEntitlements] = useState({ isPremium: false, isFree: true });
    const [isEntitlementsReady, setIsEntitlementsReady] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isGeneratingShare, setIsGeneratingShare] = useState(false);
    const [shareImageBlob, setShareImageBlob] = useState(null);
    const [shareCaption, setShareCaption] = useState('');
    const [shareStatusMessage, setShareStatusMessage] = useState('');
    const [sharePreviewUrl, setSharePreviewUrl] = useState('');
    const [showManualShareOptions, setShowManualShareOptions] = useState(false);
    const shareObjectUrlRef = useRef(null);

    const premiumBlurStyle = entitlements.isFree
        ? { filter: 'blur(10px)', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }
        : undefined;
    const premiumOverlayBackdropStyle = {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '12px 24px 24px',
        background: 'rgba(8, 8, 8, 0.35)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '16px',
        zIndex: 3
    };
    const premiumOverlayCardStyle = {
        width: 'min(560px, 100%)',
        background: 'rgba(17, 17, 17, 0.88)',
        border: '1px solid rgba(212, 175, 55, 0.35)',
        borderRadius: '16px',
        padding: '30px 24px',
        textAlign: 'center',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.45)'
    }
    const premiumUpgradeButtonStyle = {
        border: 'none',
        borderRadius: '999px',
        padding: '12px 28px',
        fontSize: '0.95rem',
        fontWeight: 700,
        letterSpacing: '0.01em',
        color: '#0A0A0A',
        background: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)',
        boxShadow: '0 8px 22px rgba(212, 175, 55, 0.35)',
        cursor: 'pointer',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease'
    };
;

    // Load data from shared functions
    useEffect(() => {
        let isMounted = true;
        const loadFn = window.AppShared?.loadBudgetData;
        const entitlementFn = window.AppShared?.getCurrentUserEntitlements;

        Promise.all([
            loadFn ? loadFn() : Promise.resolve(null),
            entitlementFn ? entitlementFn() : Promise.resolve({ isPremium: false, isFree: true })
        ]).then(([saved, access]) => {
            if (!isMounted) return;
            if (saved) {
                setData(saved);
            }
            if (access) {
                setEntitlements(access);
            }
            setIsHydrated(true);
            setIsEntitlementsReady(true);
        });

        return () => { isMounted = false; };
    }, []);

    // Calculate current financial state
    const financialState = useMemo(() => {
        if (!data) {
            return {
                currentBalance: 0,
                dailyBurnRate: 0,
                daysRunway: 0
            };
        }

        const sharedCalculateBurnMetrics = window.AppShared?.calculateBurnMetrics;

        if (sharedCalculateBurnMetrics) {
            const { remaining, dailyBurnRate, runway } = sharedCalculateBurnMetrics(data);
            return {
                currentBalance: remaining,
                dailyBurnRate,
                daysRunway: runway === null ? null : Math.floor(runway)
            };
        }

        // Fallback when centralized helpers are unavailable.
        const income = data.income || 0;
        const fixedExpenses = (data.fixedExpenses || []).reduce((sum, exp) => sum + exp.amount, 0);
        const variableExpenses = (data.variableExpenses || []).reduce((sum, exp) => sum + exp.amount, 0);
        const monthlySpend = fixedExpenses + variableExpenses;
        const dailyBurnRate = monthlySpend / 30;
        const currentBalance = income - monthlySpend;
        const daysRunway = dailyBurnRate > 0 ? Math.floor(currentBalance / dailyBurnRate) : 0;

        return {
            currentBalance,
            dailyBurnRate,
            daysRunway
        };
    }, [data]);

    // Calculate simulation when purchase amount changes
    const simulation = useMemo(() => {
        const amount = parseFloat(purchaseAmount) || 0;
        if (amount <= 0) return null;

        return calculateSimulation(
            financialState.currentBalance,
            financialState.dailyBurnRate,
            amount
        );
    }, [purchaseAmount, financialState]);

    useEffect(() => {
        if (!shareImageBlob) {
            if (shareObjectUrlRef.current) {
                URL.revokeObjectURL(shareObjectUrlRef.current);
                shareObjectUrlRef.current = null;
            }
            setSharePreviewUrl('');
            return;
        }

        if (shareObjectUrlRef.current) {
            URL.revokeObjectURL(shareObjectUrlRef.current);
        }
        const nextUrl = URL.createObjectURL(shareImageBlob);
        shareObjectUrlRef.current = nextUrl;
        setSharePreviewUrl(nextUrl);
    }, [shareImageBlob]);

    useEffect(() => () => {
        if (shareObjectUrlRef.current) {
            URL.revokeObjectURL(shareObjectUrlRef.current);
        }
    }, []);

    const severityLevel = simulation?.roastCategory === 'safe'
        ? 'light'
        : simulation?.roastCategory === 'tight'
            ? 'medium'
            : 'brutal';

    const handleGenerateShareCard = async () => {
        if (!simulation) return;
        setShareStatusMessage('');
        setShowManualShareOptions(false);
        setIsShareModalOpen(true);
        setIsGeneratingShare(true);
        try {
            const caption = window.RoastlyShareUtils.generateCaption({
                severityLevel,
                amount: parseFloat(purchaseAmount || '0'),
                bodyText: simulation.roastText,
                runwayDays: simulation.newRunway < 0 ? 0 : simulation.newRunway
            });
            setShareCaption(caption);
            const blob = await window.RoastlyShareUtils.generateShareImage('purchase-share-card-capture');
            setShareImageBlob(blob);
        } catch (error) {
            setShareStatusMessage('Could not generate image. Please try again.');
        } finally {
            setIsGeneratingShare(false);
        }
    };

    const handleNativeShare = async () => {
        if (!shareImageBlob) return;

        const file = window.RoastlyShareUtils.blobToFile(shareImageBlob, 'roastly-purchase-roast.png');
        const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
        const supportsFiles = hasNativeShare && (!navigator.canShare || navigator.canShare({ files: [file] }));

        if (!supportsFiles) {
            setShowManualShareOptions(true);
            setShareStatusMessage('Direct sharing is unavailable on this device.');
            return;
        }

        try {
            await navigator.share({
                files: [file],
                text: shareCaption,
                title: 'Roastly Reality Check'
            });
        } catch (error) {
            if (error?.name !== 'AbortError') {
                setShareStatusMessage('Share failed. Use download instead.');
            }
        }
    };

    const handleDownloadShare = () => {
        if (!sharePreviewUrl) return;
        const link = document.createElement('a');
        link.href = sharePreviewUrl;
        link.download = 'roastly-purchase-roast.png';
        link.click();
    };

    const handleCopyCaption = async () => {
        try {
            await navigator.clipboard.writeText(shareCaption);
            setShareStatusMessage('Caption copied.');
        } catch (error) {
            setShareStatusMessage('Copy failed.');
        }
    };

    const openShareLink = (platform) => {
        const encodedCaption = encodeURIComponent(shareCaption || 'Roastly just saved my wallet.');
        if (platform === 'whatsapp') {
            window.open(`https://wa.me/?text=${encodedCaption}`, '_blank', 'noopener,noreferrer');
            return;
        }
        if (platform === 'x') {
            window.open(`https://twitter.com/intent/tweet?text=${encodedCaption}`, '_blank', 'noopener,noreferrer');
            return;
        }
        if (platform === 'instagram') {
            setShareStatusMessage('Instagram Stories: upload from camera roll.');
            return;
        }
        if (platform === 'tiktok') {
            setShareStatusMessage('TikTok: upload from camera roll.');
        }
    };

    const shareButtonStyle = {
        border: '2px solid rgba(212, 175, 55, 0.58)',
        borderRadius: '999px',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.26) 0%, rgba(212,175,55,0.12) 100%)',
        color: '#F5D87A',
        padding: '13px 22px',
        fontSize: '1rem',
        fontWeight: 800,
        letterSpacing: '0.01em',
        boxShadow: '0 8px 20px rgba(212, 175, 55, 0.24)',
        cursor: 'pointer',
        transition: 'transform 0.16s ease, background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease',
        marginTop: '18px'
    };

    // Empty state if no data
    if (!isHydrated || !isEntitlementsReady) {
        return (
            <div className="container">
                <div className="empty-state">
                    <div className="empty-emoji">⏳</div>
                    <div className="empty-title">Loading...</div>
                </div>
            </div>
        );
    }

    if ((!data || !data.income) && !entitlements.isFree) {
        return (
            <div className="container">
                <nav className="main-nav">
                    <a href="index.html" className="nav-link">📊 Dashboard</a>
                    <a href="fixed-expenses.html" className="nav-link">⚓ Fixed Expenses</a>
                    <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
                    <a href="projections.html" className="nav-link">🔮 Projections</a>
                    <a href="purchase-simulator.html" className="nav-link active">🧪 Simulator</a>
                    <a href="insights.html" className="nav-link">🧠 Insights</a>
                </nav>
                
                <div className="header">
                    <p className="header-eyebrow">Purchase Simulator</p>
                    <h1 className="header-title">Reality <span>Check</span></h1>
                    <p className="header-subtitle">Think before you buy</p>
                </div>
                
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-emoji">💰</div>
                        <div className="empty-title">Set Up Your Finances First</div>
                        <p className="empty-text">
                            Go to the Dashboard and set your income to start simulating purchases.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            {/* Navigation */}
            <nav className="main-nav">
                <a href="index.html" className="nav-link">📊 Dashboard</a>
                <a href="fixed-expenses.html" className="nav-link">⚓ Fixed Expenses</a>
                <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
                <a href="projections.html" className="nav-link">🔮 Projections</a>
                <a href="purchase-simulator.html" className="nav-link active">🧪 Simulator</a>
                <a href="insights.html" className="nav-link">🧠 Insights</a>
            </nav>

            <div style={{ position: 'relative' }}>
            <div style={premiumBlurStyle}>
            {/* Header */}
            <div className="header">
                <p className="header-eyebrow">Purchase Simulator</p>
                <h1 className="header-title">Reality <span>Check</span></h1>
                <p className="header-subtitle">
                    Simulate the real impact of a purchase before you sign that receipt
                </p>
            </div>

            {/* Current Financial State */}
            <div className="card">
                <h2 className="card-title">Your Current Financial State</h2>
                <p className="card-subtitle">This is where you stand right now</p>
                
                <div className="state-grid">
                    <div className="state-box">
                        <div className="state-label">Available Balance</div>
                        <div className="state-value">RM{financialState.currentBalance.toFixed(0)}</div>
                        <div className="state-hint">What you have now</div>
                    </div>
                    
                    <div className="state-box">
                        <div className="state-label">Daily Burn Rate</div>
                        <div className="state-value">RM{financialState.dailyBurnRate.toFixed(0)}</div>
                        <div className="state-hint">Per day spending</div>
                    </div>
                    
                    <div className="state-box">
                        <div className="state-label">Days Runway</div>
                        <div className="state-value">{financialState.daysRunway === null ? "∞" : financialState.daysRunway}</div>
                        <div className="state-hint">Days till broke</div>
                    </div>
                </div>
            </div>

            {/* Purchase Input */}
            <div className="card">
                <h2 className="card-title">What If I Spend...</h2>
                <p className="card-subtitle">
                    Enter the amount and see what happens to your runway
                </p>
                
                <div className="input-section">
                    <div className="input-wrapper">
                        <span className="currency-symbol">RM</span>
                        <input
                            type="number"
                            className="purchase-input"
                            placeholder="250"
                            value={purchaseAmount}
                            onChange={(e) => setPurchaseAmount(e.target.value)}
                            min="0"
                            step="1"
                        />
                    </div>
                    <div className="input-hint">
                        How much are those sneakers? That new gadget?
                    </div>
                </div>
            </div>

            {/* Comparison & Roast */}
            {simulation && (
                <>
                    <div className="card">
                        <h2 className="card-title">Before vs After</h2>
                        <p className="card-subtitle">
                            See the impact on your financial runway
                        </p>
                        
                        <div className="comparison">
                            {/* BEFORE */}
                            <div className="comparison-card before">
                                <span className="comparison-badge before">NOW</span>
                                
                                <div className="comparison-stat">
                                    <div className="comparison-stat-label">Balance</div>
                                    <div className="comparison-stat-value big">
                                        RM{simulation.currentBalance.toFixed(0)}
                                    </div>
                                </div>
                                
                                <div className="comparison-stat">
                                    <div className="comparison-stat-label">Days Runway</div>
                                    <div className="comparison-stat-value">
                                        {simulation.currentRunway} days
                                    </div>
                                </div>
                            </div>

                            {/* AFTER */}
                            <div className="comparison-card after">
                                <span className="comparison-badge after">IF YOU BUY</span>
                                
                                <div className="comparison-stat">
                                    <div className="comparison-stat-label">New Balance</div>
                                    <div className="comparison-stat-value big">
                                        RM{simulation.newBalance.toFixed(0)}
                                    </div>
                                </div>
                                
                                <div className="comparison-stat">
                                    <div className="comparison-stat-label">New Runway</div>
                                    <div className="comparison-stat-value">
                                        {simulation.newRunway < 0 ? '0' : simulation.newRunway} days
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Roast Card */}
                    <div className="card">
                        <div className={`roast-card ${simulation.roastCategory}`}>
                            <span className="roast-emoji">{simulation.emoji}</span>
                            <div className={`roast-status ${simulation.roastCategory}`}>
                                {simulation.status}
                            </div>
                            <div className="roast-text">
                                {simulation.roastText}
                            </div>
                            <div className="roast-days">
                                You'll have <strong>{simulation.newRunway < 0 ? 0 : simulation.newRunway} days</strong> of runway left
                                {simulation.newRunway < simulation.currentRunway && (
                                    <> (down from <strong>{simulation.currentRunway} days</strong>)</>
                                )}
                            </div>
                            <button
                                style={shareButtonStyle}
                                onClick={handleGenerateShareCard}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,175,55,0.34) 0%, rgba(212,175,55,0.16) 100%)';
                                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.8)';
                                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(212, 175, 55, 0.28)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,175,55,0.26) 0%, rgba(212,175,55,0.12) 100%)';
                                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.58)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(212, 175, 55, 0.24)';
                                }}
                            >
                                🔥 Share
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Empty state when no amount entered */}
            {!simulation && (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-emoji">👆</div>
                        <div className="empty-title">Enter an Amount Above</div>
                        <p className="empty-text">
                            Type in how much you want to spend and see if you can actually afford it
                        </p>
                    </div>
                </div>
            )}
            </div>
            {entitlements.isFree && (
                <div style={premiumOverlayBackdropStyle}>
                    <div style={premiumOverlayCardStyle}>
                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔒</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#D4AF37', lineHeight: 1.15, marginBottom: '12px' }}>
                            Locked behind Premium 💀
                        </div>
                        <p style={{ color: '#CFCFCF', fontSize: '1.1rem', marginBottom: '20px' }}>
                            Want the full access? Upgrade now. Cancel Anytime 😏
                        </p>
                        <button style={premiumUpgradeButtonStyle} onClick={() => { window.location.href = 'https://buy.stripe.com/3cI14ggg3dxa1Xe7tm8g000'; }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 26px rgba(212, 175, 55, 0.45)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 22px rgba(212, 175, 55, 0.35)'; }}>
                            7-day Trial
                        </button>
                    </div>
                </div>
            )}

            <div style={{ position: 'fixed', left: '-99999px', top: 0, pointerEvents: 'none' }}>
                <div
                    id="purchase-share-card-capture"
                    style={{
                        width: '1080px',
                        height: '1080px',
                        background: '#0A0A0A',
                        color: '#F2F2F2',
                        padding: '150px 92px 120px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                        border: '1px solid rgba(255,255,255,0.08)'
                    }}
                >
                    <div>
                        <p style={{ color: '#D4AF37', fontSize: '32px', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '38px' }}>
                            Reality Check
                        </p>
                        <h2 style={{ fontSize: '128px', lineHeight: 0.98, letterSpacing: '-0.05em', marginBottom: '56px' }}>
                            {simulation?.status || 'ROAST READY'}
                        </h2>
                        <p style={{ fontSize: '54px', lineHeight: 1.22, fontWeight: 600, color: '#FFFFFF', maxWidth: '840px' }}>
                            {simulation?.roastText || 'Roastly called out this purchase before I made the mistake.'}
                        </p>
                    </div>
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '26px', marginBottom: '56px' }}>
                            <div>
                                <p style={{ color: '#8A8A8A', fontSize: '24px', marginBottom: '8px' }}>Purchase</p>
                                <p style={{ fontSize: '72px', lineHeight: 1, fontWeight: 800 }}>RM{(parseFloat(purchaseAmount || '0') || 0).toFixed(0)}</p>
                            </div>
                            <div>
                                <p style={{ color: '#8A8A8A', fontSize: '24px', marginBottom: '8px' }}>Runway Left</p>
                                <p style={{ fontSize: '52px', lineHeight: 1, fontWeight: 760 }}>{simulation ? (simulation.newRunway < 0 ? 0 : simulation.newRunway) : 0} days</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', opacity: entitlements.isPremium ? 0 : 0.62 }}>
                            <span style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '0.02em' }}>Roastly</span>
                            <span style={{ width: '30px', height: '30px', borderRadius: '8px', border: '2px solid rgba(212,175,55,0.8)', display: 'inline-block' }} />
                        </div>
                    </div>
                </div>
            </div>

            {isShareModalOpen && (
                <div className="modal-overlay" onClick={() => setIsShareModalOpen(false)}>
                    <div className="modal-content" style={{ maxWidth: '720px', width: 'calc(100% - 24px)' }} onClick={(e) => e.stopPropagation()}>
                        {isGeneratingShare && <p style={{ color: '#A8A8A8', marginBottom: '14px' }}>Generating image…</p>}

                        {sharePreviewUrl && (
                            <img src={sharePreviewUrl} alt="Share preview" style={{ width: '100%', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', marginBottom: '14px' }} />
                        )}

                        {shareStatusMessage && <p style={{ color: '#D4AF37', marginBottom: '10px', fontSize: '0.9rem' }}>{shareStatusMessage}</p>}

                        <button className="btn btn-primary" style={{ width: '100%', marginBottom: '12px', minHeight: '52px', fontSize: '1.02rem', fontWeight: 800, borderRadius: '14px', background: 'linear-gradient(135deg, #D4AF37 0%, #E8C75A 100%)', color: '#111', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 10px 26px rgba(212,175,55,0.28)' }} onClick={handleNativeShare} disabled={!shareImageBlob || isGeneratingShare}>🔥 Share</button>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: showManualShareOptions ? '10px' : 0 }}>
                            <button className="btn btn-secondary" style={{ padding: '10px 14px', minHeight: '42px', fontSize: '0.88rem', fontWeight: 700, borderRadius: '12px', color: '#E8D7A2', border: '1px solid rgba(212,175,55,0.34)', background: 'rgba(212,175,55,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }} onClick={handleDownloadShare} disabled={!shareImageBlob}>Download</button>
                            <button className="btn btn-secondary" style={{ padding: '10px 14px', minHeight: '42px', fontSize: '0.88rem', fontWeight: 700, borderRadius: '12px', color: '#E8D7A2', border: '1px solid rgba(212,175,55,0.34)', background: 'rgba(212,175,55,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }} onClick={handleCopyCaption}>Copy caption</button>
                        </div>

                        {showManualShareOptions && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.82rem' }} onClick={() => openShareLink('whatsapp')}>WhatsApp</button>
                                <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.82rem' }} onClick={() => openShareLink('instagram')}>Instagram</button>
                                <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.82rem' }} onClick={() => openShareLink('x')}>X</button>
                                <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.82rem' }} onClick={() => openShareLink('tiktok')}>TikTok</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

ReactDOM.render(<PurchaseSimulator />, document.getElementById('root'));
