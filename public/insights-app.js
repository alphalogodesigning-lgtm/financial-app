const { useState, useEffect, useRef } = React;

const {
    loadBudgetData,
    saveBudgetData,
    getInitialData,
    ROAST_LEVELS,
    calculateInsightsMetrics,
    calculateHealthScore,
    getGradeInfo,
    getBrutalTruth,
    getPersonality,
    buildAchievements,
    calculateTransactionStats,
    getCurrentUserEntitlements
} = window.AppShared;

        function App() {
            const [data, setData] = useState(getInitialData('insights'));
            const [isHydrated, setIsHydrated] = useState(false);
            const [showSettings, setShowSettings] = useState(false);
            const [roastLevel, setRoastLevel] = useState('honest');
            const [tempRoastLevel, setTempRoastLevel] = useState('honest');
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
                background: 'rgba(10, 10, 10, 0.35)',
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

            useEffect(() => {
                let isMounted = true;
                Promise.all([loadBudgetData(), getCurrentUserEntitlements()]).then(([saved, access]) => {
                    if (!isMounted) return;
                    if (saved) {
                        setData(saved);
                        const savedRoastLevel = saved.roast_level || 'honest';
                        setRoastLevel(savedRoastLevel);
                        setTempRoastLevel(savedRoastLevel);
                    }
                    if (access) {
                        setEntitlements(access);
                    }
                    setIsHydrated(true);
                    setIsEntitlementsReady(true);
                });
                return () => {
                    isMounted = false;
                };
            }, []);

            const handleSaveRoastLevel = async () => {
                const updatedData = {
                    ...data,
                    roast_level: tempRoastLevel
                };
                setData(updatedData);
                setRoastLevel(tempRoastLevel);
                setShowSettings(false);
                await saveBudgetData(updatedData, { redirect: false });
            };

            const brutalSeverity = roastLevel === 'gentle' ? 'light' : roastLevel === 'honest' ? 'medium' : 'brutal';

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

            const handleGenerateShareCard = async () => {
                setShareStatusMessage('');
                setShowManualShareOptions(false);
                setIsShareModalOpen(true);
                setIsGeneratingShare(true);
                try {
                    const caption = window.RoastlyShareUtils.generateCaption({
                        severityLevel: brutalSeverity,
                        amount: regretMoney,
                        bodyText: brutalTruth,
                        runwayDays: Math.max(0, Math.floor(healthScore / 10))
                    });
                    setShareCaption(caption);
                    const blob = await window.RoastlyShareUtils.generateShareImage('insights-share-card-capture');
                    setShareImageBlob(blob);
                } catch (error) {
                    setShareStatusMessage('Could not generate image. Please try again.');
                } finally {
                    setIsGeneratingShare(false);
                }
            };

            const handleNativeShare = async () => {
                if (!shareImageBlob) return;
                const file = window.RoastlyShareUtils.blobToFile(shareImageBlob, 'roastly-insight-roast.png');
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
                        title: 'Roastly Therapy Session'
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
                link.download = 'roastly-insight-roast.png';
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
                const encodedCaption = encodeURIComponent(shareCaption || 'Roastly gave me an expensive truth bomb.');
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
                marginTop: '18px',
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
                transition: 'transform 0.16s ease, background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease'
            };

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

            const metrics = calculateInsightsMetrics(data);
            const {
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
            } = metrics;

            const healthScore = calculateHealthScore({
                savingsRate,
                regretRatio,
                lateNightSpendRatio,
                weekendWeekdayRatio,
                streak: data.streak
            });

            const gradeInfo = getGradeInfo(healthScore);
            const brutalTruth = getBrutalTruth({ roastLevel, metrics });
            const personality = getPersonality(metrics);
            const achievements = buildAchievements({ data, metrics });
            const {
                totalTransactions,
                avgTransactionSize,
                uniqueMerchants,
                biggestPurchase,
                annualSpendingRate
            } = calculateTransactionStats(data, metrics);

            return (
                <div className="container">
                    <nav className="main-nav">
                        <a href="index.html" className="nav-link">📊 Dashboard</a>
                        <a href="fixed-expenses.html" className="nav-link">⚓ Fixed Expenses</a>
                        <a href="variable-spending.html" className="nav-link">💸 Variable Spending</a>
                        <a href="projections.html" className="nav-link">🔮 Projections</a>
                        <a href="purchase-simulator.html" className="nav-link">🧪 Simulator</a>
                        <a href="insights.html" className="nav-link active">🧠 Insights</a>
                        <button className="settings-btn" onClick={() => setShowSettings(true)}>
                            <span>{ROAST_LEVELS[roastLevel].emoji}</span>
                            <span>{ROAST_LEVELS[roastLevel].name}</span>
                        </button>
                    </nav>

                    <div style={{ position: 'relative' }}>
                    <div style={premiumBlurStyle}>
                    <div className="header">
                        <div className="header-left">
                            <h1 className="header-title">The Therapy Session</h1>
                            <p className="header-subtitle">Let's talk about your spending habits... honestly.</p>
                        </div>
                    </div>

                    {/* Financial Health Score */}
                    <div className="health-score-container">
                        <div className="health-score-wrapper">
                            <div className="health-grade" style={{ color: gradeInfo.color }}>
                                {gradeInfo.grade}
                            </div>
                            <div className="health-score-number" style={{ color: gradeInfo.color }}>
                                {healthScore}/100
                            </div>
                            <div className="health-score-label" style={{ color: gradeInfo.color }}>
                                {gradeInfo.text}
                            </div>
                        </div>
                    </div>

                    {/* Brutal Honesty */}
                    <div className="brutal-box">
                        <div className="brutal-title">
                            <span>💀</span>
                            <span>Brutal Honesty Corner</span>
                        </div>
                        <div className="brutal-text">
                            {brutalTruth}
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

                    {/* Spending Personality */}
                    <div className="personality-container">
                        <div className="personality-type">{personality.type}</div>
                        <div className="personality-description">{personality.description}</div>
                        <div className="personality-traits">
                            {personality.traits.map((trait, i) => (
                                <div key={i} className="trait">{trait}</div>
                            ))}
                        </div>
                    </div>

                    {/* Key Insights */}
                    <div className="insights-grid">
                        <div className="insight-card">
                            <div className="insight-icon">📅</div>
                            <div className="insight-title">Weekend vs Weekday</div>
                            <div className="insight-description">
                                You spend an average of <strong style={{ color: '#D4AF37' }}>RM{avgWeekendSpend.toFixed(2)}</strong> per day on weekends
                                vs <strong style={{ color: '#89ABE3' }}>RM{avgWeekdaySpend.toFixed(2)}</strong> on weekdays.
                            </div>
                            <div className="insight-stat">
                                {Number.isFinite(weekendWeekdayRatio) ? `${weekendWeekdayRatio.toFixed(1)}x` : 'N/A'}
                            </div>
                            {weekendWeekdayRatio > 2 && (
                                <div className="insight-recommendation">
                                    💡 Your weekends are expensive. Maybe try a free hobby?
                                </div>
                            )}
                        </div>

                        <div className="insight-card">
                            <div className="insight-icon">🌙</div>
                            <div className="insight-title">Night Owl Analysis</div>
                            <div className="insight-description">
                                You've spent <strong style={{ color: '#FF6B6B' }}>RM{lateNightSpent.toFixed(2)}</strong> between 10pm and 4am.
                                That's <strong>{(lateNightSpendRatio * 100).toFixed(0)}%</strong> of your variable spending.
                            </div>
                            <div className="insight-stat" style={{ color: '#FF6B6B' }}>
                                {(lateNightSpendRatio * 100).toFixed(0)}%
                            </div>
                            {lateNightSpendRatio > 0.3 && (
                                <div className="insight-recommendation" style={{ borderColor: '#FF6B6B', color: '#FF6B6B' }}>
                                    💡 Nothing good happens to your wallet after 10pm. Delete those shopping apps from your home screen.
                                </div>
                            )}
                        </div>

                        <div className="insight-card">
                            <div className="insight-icon">🍔</div>
                            <div className="insight-title">Category Addiction</div>
                            <div className="insight-description">
                                Your top category is <strong style={{ color: '#D4AF37' }}>{topCategory}</strong> at 
                                <strong> RM{topCategoryAmount.toFixed(2)}</strong>. That's 
                                <strong> {topCategoryPercentage.toFixed(0)}%</strong> of your variable spending.
                            </div>
                            <div className="insight-stat">
                                {topCategoryPercentage.toFixed(0)}%
                            </div>
                            {topCategoryPercentage > 60 && (
                                <div className="insight-recommendation">
                                    💡 {topCategory === 'Food' ? 'You might have a Food problem. Or is it a passion? You decide.' : `${topCategoryPercentage.toFixed(0)}% on ${topCategory}? That's a lot.`}
                                </div>
                            )}
                        </div>

                        <div className="insight-card">
                            <div className="insight-icon">😬</div>
                            <div className="insight-title">Regret Money</div>
                            <div className="insight-description">
                                You've marked <strong style={{ color: '#FF6B6B' }}>RM{regretMoney.toFixed(2)}</strong> worth of purchases as regrets.
                                That's money you wish you could take back.
                            </div>
                            <div className="insight-stat" style={{ color: '#FF6B6B' }}>
                                RM{regretMoney.toFixed(2)}
                            </div>
                            {regretMoney > 50 && (
                                <div className="insight-recommendation" style={{ borderColor: '#FF6B6B', color: '#FF6B6B' }}>
                                    💡 Imagine if you had that RM{regretMoney.toFixed(0)} back. Wait 24hrs before big purchases.
                                </div>
                            )}
                        </div>

                        <div className="insight-card">
                            <div className="insight-icon">🏪</div>
                            <div className="insight-title">Merchant Loyalty</div>
                            <div className="insight-description">
                                Your most visited merchant is <strong style={{ color: '#D4AF37' }}>{topMerchant}</strong>{' '}
                                with <strong>{topMerchantVisits}</strong> visits.
                            </div>
                            <div className="insight-stat" style={{ color: '#66BB6A' }}>
                                {topMerchantVisits}
                            </div>
                            {topMerchantVisits >= 7 && (
                                <div className="insight-recommendation">
                                    💡 {topMerchantVisits} visits to {topMerchant}. They should give you a loyalty card at this point.
                                </div>
                            )}
                        </div>

                        <div className="insight-card">
                            <div className="insight-icon">💰</div>
                            <div className="insight-title">Savings Rate</div>
                            <div className="insight-description">
                                You're saving <strong style={{ color: savingsRate >= 20 ? '#66BB6A' : '#FF6B6B' }}>
                                {savingsRate.toFixed(1)}%</strong> of your income. Financial experts recommend 20% minimum.
                            </div>
                            <div className="insight-stat" style={{ color: savingsRate >= 20 ? '#66BB6A' : '#FF6B6B' }}>
                                {savingsRate.toFixed(1)}%
                            </div>
                            <div className="insight-recommendation" style={{ 
                                borderColor: savingsRate >= 20 ? '#66BB6A' : '#FF6B6B',
                                color: savingsRate >= 20 ? '#66BB6A' : '#FF6B6B'
                            }}>
                                {savingsRate >= 20 
                                    ? '💡 Excellent! Keep this up and you\'ll be financially secure.' 
                                    : '💡 Try to increase your savings rate. Future you will be grateful.'}
                            </div>
                        </div>
                    </div>

                    {/* Achievements */}
                    <div className="achievements-section">
                        <h2 className="section-title">Achievements Unlocked</h2>
                        <div className="achievements-grid">
                            {achievements.map((achievement, i) => (
                                <div key={i} className={`achievement ${achievement.unlocked ? 'unlocked' : 'locked'}`}>
                                    <div className="achievement-icon">{achievement.icon}</div>
                                    <div className="achievement-name">{achievement.name}</div>
                                    <div className="achievement-description">{achievement.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Fun Stats */}
                    <div className="fun-stats-section">
                        <h2 className="section-title">Weird Stats That Don't Matter But Are Fun</h2>
                        <div className="fun-stats-grid">
                            <div className="fun-stat">
                                <div className="fun-stat-value gold-text">{totalTransactions}</div>
                                <div className="fun-stat-label">Transactions This Month</div>
                            </div>
                            <div className="fun-stat">
                                <div className="fun-stat-value soft-blue-text">RM{avgTransactionSize.toFixed(2)}</div>
                                <div className="fun-stat-label">Avg Transaction Size</div>
                            </div>
                            <div className="fun-stat">
                                <div className="fun-stat-value purple-text">{uniqueMerchants}</div>
                                <div className="fun-stat-label">Unique Merchants</div>
                            </div>
                            <div className="fun-stat">
                                <div className="fun-stat-value green-text">{data.streak}</div>
                                <div className="fun-stat-label">Day Streak</div>
                            </div>
                            <div className="fun-stat">
                                <div className="fun-stat-value red-text">RM{annualSpendingRate.toFixed(2)}</div>
                                <div className="fun-stat-label">Annual Spending Rate</div>
                            </div>
                            <div className="fun-stat">
                                <div className="fun-stat-value gold-text">RM{biggestPurchase.toFixed(2)}</div>
                                <div className="fun-stat-label">Biggest Single Purchase</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ position: 'fixed', left: '-99999px', top: 0, pointerEvents: 'none' }}>
                        <div
                            id="insights-share-card-capture"
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
                                <p style={{ color: '#D4AF37', fontSize: '30px', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '36px' }}>
                                    Therapy Session
                                </p>
                                <h2 style={{ fontSize: '122px', lineHeight: 0.98, letterSpacing: '-0.05em', marginBottom: '56px' }}>
                                    {gradeInfo.grade} / 100
                                </h2>
                                <p style={{ fontSize: '54px', lineHeight: 1.22, fontWeight: 600, color: '#FFFFFF', maxWidth: '840px' }}>
                                    {brutalTruth}
                                </p>
                            </div>
                            <div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '26px', marginBottom: '56px' }}>
                                    <div>
                                        <p style={{ color: '#8A8A8A', fontSize: '24px', marginBottom: '8px' }}>Savings Rate</p>
                                        <p style={{ fontSize: '58px', lineHeight: 1, fontWeight: 780 }}>{savingsRate.toFixed(1)}%</p>
                                    </div>
                                    <div>
                                        <p style={{ color: '#8A8A8A', fontSize: '24px', marginBottom: '8px' }}>Regret Money</p>
                                        <p style={{ fontSize: '72px', lineHeight: 1, fontWeight: 800 }}>RM{regretMoney.toFixed(0)}</p>
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


                    {/* Settings Modal */}
                    {showSettings && (
                        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h2 className="modal-title">Choose Your Roast Level</h2>
                                    <p className="modal-subtitle">
                                        How honest do you want this app to be about your spending habits?
                                    </p>
                                </div>

                                <div className="roast-levels">
                                    {Object.values(ROAST_LEVELS).map(level => (
                                        <div 
                                            key={level.id}
                                            className={`roast-level-option ${tempRoastLevel === level.id ? 'selected' : ''}`}
                                            onClick={() => setTempRoastLevel(level.id)}
                                        >
                                            <div className="roast-level-header">
                                                <span className="roast-level-emoji">{level.emoji}</span>
                                                <span className="roast-level-name" style={{ color: level.color }}>
                                                    {level.name}
                                                </span>
                                            </div>
                                            <div className="roast-level-description">{level.description}</div>
                                            <div className="roast-level-example">
                                                Example: "{level.example}"
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="modal-actions">
                                    <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>
                                        Cancel
                                    </button>
                                    <button className="btn btn-primary" onClick={handleSaveRoastLevel}>
                                        Save Preference
                                    </button>
                                </div>
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
                    </div>
                </div>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
