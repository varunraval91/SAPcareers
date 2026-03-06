/**
 * ═══════════════════════════════════════════════════════════════
 * QUOTES MODULE — Motivational Quotes for Job Hunters
 * ═══════════════════════════════════════════════════════════════
 */

(() => {
  const QUOTES_STORAGE_KEY = 'job_hunt_hq_quote_index';

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage may be unavailable in some browser contexts.
    }
  }

  const QUOTES_DB = [
    { text: 'Every application is a step closer to your dream role.', tag: 'Motivation' },
    { text: 'Rejection is redirection. The right opportunity is waiting.', tag: 'Resilience' },
    { text: 'This job hunt won\'t last forever. Your breakthrough is coming.', tag: 'Hope' },
    { text: 'You are more prepared than you think you are.', tag: 'Confidence' },
    { text: 'One \'yes\' is all you need. Keep going.', tag: 'Persistence' },
    { text: 'Track your progress. You\'re doing better than yesterday.', tag: 'Progress' },
    { text: 'The companies that say no are just clearing the path to the one that says yes.', tag: 'Optimism' },
    { text: 'Your experience matters. Your skills are valuable.', tag: 'Self-Worth' },
    { text: 'Great hiring managers recognize great potential.', tag: 'Belief' },
    { text: 'Every interview is practice for the one that counts.', tag: 'Growth' },
    { text: 'You belong in the role you\'re pursuing.', tag: 'Affirmation' },
    { text: 'The waiting is temporary. The success is permanent.', tag: 'Perspective' },
    { text: 'Your effort today is your advantage tomorrow.', tag: 'Action' },
    { text: 'Don\'t be discouraged by the numbers. Your match is out there.', tag: 'Reality Check' },
    { text: 'You\'ve overcome challenges before. You\'ll do it again.', tag: 'Strength' },
    { text: 'Applying for jobs is brave. Keep being brave.', tag: 'Courage' },
    { text: 'Your network is your net-worth. Build it thoughtfully.', tag: 'Strategy' },
    { text: 'The job market rewards persistence and polish.', tag: 'Wisdom' },
    { text: 'You\'re not competing with everyone else. You\'re competing with yesterday\'s you.', tag: 'Focus' },
    { text: 'Good things come to those who hustle. You\'ve got this.', tag: 'Hustle' },
    { text: 'Your story is unique. Tell it with confidence.', tag: 'Authenticity' },
    { text: 'Every "no" is a learning opportunity. Keep learning.', tag: 'Learning' },
    { text: 'The hardest part is starting. You\'ve already done that.', tag: 'Momentum' },
    { text: 'Your inbox will fill up with opportunities. Be patient.', tag: 'Patience' },
    { text: 'You are not defined by one application. You are defined by all of them.', tag: 'Perspective' }
  ];

  // ═════════════════════════════════════════════════════════════
  // STATE & DOM
  // ═════════════════════════════════════════════════════════════
  let currentQuoteIndex = parseInt(safeStorageGet(QUOTES_STORAGE_KEY), 10) || 0;
  let currentQuote = QUOTES_DB[currentQuoteIndex];

  const quoteElements = {
    text: document.getElementById('quote-text'),
    tag: document.getElementById('quote-tag'),
    shuffleBtn: document.getElementById('quote-shuffle-btn')
  };

  // ═════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═════════════════════════════════════════════════════════════
  function init() {
    if (!quoteElements.text || !quoteElements.tag || !quoteElements.shuffleBtn) {
      console.warn('Quote elements not found in DOM');
      return;
    }

    renderQuote();
    quoteElements.shuffleBtn.addEventListener('click', shuffleQuote);

    // Expose shuffle to global scope for onclick handlers
    window.shuffleQuote = shuffleQuote;

    // Auto-rotate quote every 24 hours
    const hoursUntilNextRotation = getHoursUntilMidnight();
    setTimeout(() => {
      rotateToNextQuote();
      setInterval(rotateToNextQuote, 24 * 60 * 60 * 1000);
    }, hoursUntilNextRotation * 60 * 60 * 1000);
  }

  // ═════════════════════════════════════════════════════════════
  // QUOTE MANAGEMENT
  // ═════════════════════════════════════════════════════════════
  function renderQuote() {
    quoteElements.text.textContent = currentQuote.text;
    quoteElements.tag.textContent = currentQuote.tag;
  }

  function shuffleQuote() {
    const randomIndex = Math.floor(Math.random() * QUOTES_DB.length);
    currentQuoteIndex = randomIndex;
    currentQuote = QUOTES_DB[randomIndex];
    safeStorageSet(QUOTES_STORAGE_KEY, randomIndex);
    renderQuote();

    // Optional: Add animation
    quoteElements.text.style.opacity = '0';
    setTimeout(() => {
      renderQuote();
      quoteElements.text.style.opacity = '1';
    }, 200);
  }

  function rotateToNextQuote() {
    currentQuoteIndex = (currentQuoteIndex + 1) % QUOTES_DB.length;
    currentQuote = QUOTES_DB[currentQuoteIndex];
    safeStorageSet(QUOTES_STORAGE_KEY, currentQuoteIndex);
    renderQuote();
  }

  function getHoursUntilMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diffMs = tomorrow - now;
    return Math.floor(diffMs / (1000 * 60 * 60));
  }

  // ═════════════════════════════════════════════════════════════
  // ADD SMOOTH TRANSITION
  // ═════════════════════════════════════════════════════════════
  function setupTransition() {
    if (quoteElements.text) {
      quoteElements.text.style.transition = 'opacity 200ms ease';
    }
  }

  setupTransition();

  // ═════════════════════════════════════════════════════════════
  // BOOTSTRAP
  // ═════════════════════════════════════════════════════════════
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose public API
  window.QuotesModule = {
    shuffle: shuffleQuote,
    next: rotateToNextQuote,
    getCurrent: () => currentQuote,
    getAll: () => [...QUOTES_DB]
  };
})();
