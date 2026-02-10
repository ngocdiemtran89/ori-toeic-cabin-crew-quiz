import React, { useState, useEffect, useRef, useCallback } from 'react';
import TEST_DB from './testData.js';

// --- SVG ICONS (small inline components) ---
const PlaneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
const ChevronUp = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>;

// --- FORMAT HELPER ---
const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

// ═══════════════════════════════════════════════════
// MAIN QUIZ APP — ALL BUGS FIXED
// ═══════════════════════════════════════════════════
const QuizApp = () => {
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedTestId, setSelectedTestId] = useState(null);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // ══ BUG FIX #1 & #2: useRef to avoid stale closure in timer ══
    const answersRef = useRef(answers);
    const selectedTestIdRef = useRef(selectedTestId);

    // Keep refs in sync with state
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { selectedTestIdRef.current = selectedTestId; }, [selectedTestId]);

    const currentTest = TEST_DB.find(t => t.id === selectedTestId);

    // ══ BUG FIX #1 & #2: Stable submit using refs ══
    const doSubmit = useCallback(() => {
        const test = TEST_DB.find(t => t.id === selectedTestIdRef.current);
        if (!test) return; // BUG FIX #7: null guard
        const currentAnswers = answersRef.current;
        let calcScore = 0;
        test.questions.forEach(q => {
            if (currentAnswers[q.id] === q.correctIndex) calcScore++;
        });
        setScore(calcScore);
        setIsSubmitted(true);
        setCurrentView('result');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // ══ BUG FIX #2: Timer with stable doSubmit (no stale deps) ══
    useEffect(() => {
        if (currentView !== 'quiz' || isSubmitted) return;
        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    // Use setTimeout to avoid state update inside state updater
                    setTimeout(() => doSubmit(), 0);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerId);
    }, [currentView, isSubmitted, doSubmit]);

    // Scroll-to-top button visibility
    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // --- ACTIONS ---
    const startTest = (testId) => {
        const test = TEST_DB.find(t => t.id === testId);
        if (!test) return;
        setSelectedTestId(testId);
        setAnswers({});
        answersRef.current = {};
        selectedTestIdRef.current = testId;
        setIsSubmitted(false);
        setScore(0);
        setTimeLeft(test.timeLimit);
        setCurrentView('quiz');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleOptionSelect = (qId, optionIndex) => {
        if (isSubmitted) return;
        setAnswers(prev => ({ ...prev, [qId]: optionIndex }));
    };

    // ══ BUG FIX #6: Confirmation before submit ══
    const handleSubmitClick = () => setShowConfirm(true);
    const confirmSubmit = () => { setShowConfirm(false); doSubmit(); };
    const cancelSubmit = () => setShowConfirm(false);

    const goHome = () => { setCurrentView('dashboard'); setSelectedTestId(null); };
    const retryTest = () => startTest(selectedTestId);

    // Timer style
    const getTimerClass = () => {
        if (timeLeft < 60) return 'timer-badge timer-danger';
        if (timeLeft < 180) return 'timer-badge timer-warning';
        return 'timer-badge timer-normal';
    };

    // ═══ RENDER ═══
    return (
        <div style={{ minHeight: '100vh' }}>
            {/* NAVBAR */}
            <nav className="navbar">
                <div className="navbar-inner">
                    <div className="navbar-brand" onClick={goHome}>
                        <span className="navbar-logo">ORI</span>
                        <span className="navbar-title">TOEIC AVIATION</span>
                    </div>
                    {currentView === 'quiz' && !isSubmitted && (
                        <div className={getTimerClass()}>
                            <ClockIcon />
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                    )}
                </div>
            </nav>

            {/* ══ DASHBOARD ══ */}
            {currentView === 'dashboard' && (
                <div className="container view-enter">
                    <div className="dashboard-hero">
                        <h2>ORI TOEIC — TEST BANK</h2>
                        <p className="subtitle">"Chắp cánh giấc mơ bay – Vươn tầm cao mới"</p>
                        <p className="description">Ngân hàng đề thi thử Cabin Crew Emirates (5 Tests × 25 Questions)</p>
                    </div>
                    <div className="test-grid">
                        {TEST_DB.map(test => (
                            <div key={test.id} className="test-card">
                                <div className="test-card-header">
                                    <span className="test-badge">TEST {test.id}</span>
                                    <span className="test-time"><ClockIcon /> {Math.floor(test.timeLimit / 60)} mins</span>
                                </div>
                                <h3>{test.title.replace(`TEST ${test.id}: `, '')}</h3>
                                <p className="test-desc">{test.description}</p>
                                <button className="btn btn-start" onClick={() => startTest(test.id)}>
                                    <PlaneIcon /> Bắt đầu làm bài ({test.questions.length} câu)
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ══ QUIZ ══ */}
            {currentView === 'quiz' && currentTest && (
                <div className="container-narrow view-enter">
                    {/* Sticky header */}
                    <div className="quiz-header">
                        <div className="quiz-header-inner">
                            <div>
                                <h2>{currentTest.title}</h2>
                                <div className="quiz-progress-text">
                                    Đã làm: <strong>{Object.keys(answers).length}</strong> / {currentTest.questions.length}
                                </div>
                            </div>
                            <button className="btn btn-primary" onClick={handleSubmitClick}>
                                Nộp bài
                            </button>
                        </div>
                        {/* Progress bar */}
                        <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${(Object.keys(answers).length / currentTest.questions.length) * 100}%` }} />
                        </div>
                        {/* Quick nav */}
                        <div className="question-nav">
                            {currentTest.questions.map(q => (
                                <button
                                    key={q.id}
                                    className={`question-nav-btn ${answers[q.id] !== undefined ? 'answered' : ''}`}
                                    onClick={() => document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                >
                                    {q.id}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Questions */}
                    <div>
                        {currentTest.questions.map(q => (
                            <div key={q.id} id={`q-${q.id}`}>
                                {q.sectionTitle && <h3 className="section-title">{q.sectionTitle}</h3>}
                                <div className="question-card">
                                    {q.passageContent && (
                                        <div className="passage-box">
                                            <div className="passage-label">{q.passageTitle}</div>
                                            {q.passageContent}
                                        </div>
                                    )}
                                    <div className="question-header">
                                        <span className="question-number">Q{q.id}</span>
                                        <p className="question-text">{q.question}</p>
                                    </div>
                                    <div className="options-grid">
                                        {q.options.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                className={`option-btn ${answers[q.id] === idx ? 'selected' : ''}`}
                                                onClick={() => handleOptionSelect(q.id, idx)}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ══ RESULT & REVIEW ══ */}
            {currentView === 'result' && currentTest && (
                <div className="container-narrow view-enter">
                    {/* Score hero */}
                    <div className="result-hero">
                        <h2>{currentTest.title}</h2>
                        <p className="result-subtitle">Kết quả bài làm của bạn</p>
                        <div className="score-circle">
                            <span className="score-number">{score}</span>
                            <span className="score-total">/ {currentTest.questions.length}</span>
                        </div>
                        <div className={`score-percentage ${score >= currentTest.questions.length * 0.6 ? 'score-pass' : 'score-fail'}`}>
                            {Math.round((score / currentTest.questions.length) * 100)}% — {score >= currentTest.questions.length * 0.6 ? '🎉 Đạt' : '📚 Cần luyện thêm'}
                        </div>
                        <div className="result-actions" style={{ marginTop: 20 }}>
                            <button className="btn btn-secondary" onClick={goHome}><HomeIcon /> Chọn đề khác</button>
                            <button className="btn btn-primary" onClick={retryTest}>🔄 Làm lại</button>
                        </div>
                    </div>

                    {/* Review section — BUG FIX #4: Review always shown */}
                    <div className="review-header">
                        <h3>Chi tiết đáp án & Giải thích</h3>
                        <span className="review-mode-badge">Review Mode</span>
                    </div>
                    <div>
                        {currentTest.questions.map(q => {
                            const userAns = answers[q.id];
                            const isCorrect = userAns === q.correctIndex;
                            return (
                                <div key={q.id} className={`review-card ${isCorrect ? 'is-correct' : 'is-incorrect'}`}>
                                    <div className="review-card-header">
                                        <span className="q-label">Question {q.id}</span>
                                        {isCorrect
                                            ? <span className="status-correct"><CheckIcon /> Đúng</span>
                                            : <span className="status-incorrect"><XIcon /> Sai</span>
                                        }
                                    </div>
                                    <p className="review-question">{q.question}</p>
                                    <div className="review-options">
                                        {q.options.map((opt, idx) => {
                                            let cls = 'review-option';
                                            if (idx === q.correctIndex) cls += ' correct';
                                            else if (idx === userAns && !isCorrect) cls += ' user-wrong';
                                            return (
                                                <div key={idx} className={cls}>
                                                    {opt} {idx === q.correctIndex && ' ✓'}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="explanation-box">
                                        <span className="explanation-label">Giải thích: </span>{q.explanation}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ══ CONFIRM DIALOG — BUG FIX #6 ══ */}
            {showConfirm && (
                <div className="dialog-overlay" onClick={cancelSubmit}>
                    <div className="dialog-box" onClick={e => e.stopPropagation()}>
                        <h3>✈️ Nộp bài?</h3>
                        <p>
                            Bạn đã trả lời <strong>{Object.keys(answers).length}</strong> / {currentTest?.questions.length || 25} câu.
                            {Object.keys(answers).length < (currentTest?.questions.length || 25) && <><br /><span style={{ color: 'var(--warning)' }}>⚠️ Vẫn còn câu chưa trả lời!</span></>}
                        </p>
                        <div className="dialog-actions">
                            <button className="btn btn-secondary" onClick={cancelSubmit}>Quay lại</button>
                            <button className="btn btn-primary" onClick={confirmSubmit}>Nộp bài</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scroll to top */}
            <button
                className={`scroll-top-btn ${showScrollTop ? 'visible' : ''}`}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
                <ChevronUp />
            </button>

            {/* FOOTER */}
            <footer className="footer">
                © 2024 ORI TOEIC. Designed for Future Cabin Crews. ✈️
            </footer>
        </div>
    );
};

export default QuizApp;
