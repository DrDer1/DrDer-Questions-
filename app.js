// ============================================
// DATABASE MANAGER
// ============================================
class Database {
    constructor() {
        this.name = 'DrDerDB';
        this.version = 1;
        this.db = null;
    }

    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, this.version);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('questions')) {
                    db.createObjectStore('questions', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('stats')) {
                    db.createObjectStore('stats', { keyPath: 'key' });
                }
            };
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async ensureOpen() {
        if (!this.db) await this.open();
    }

    async saveQuestions(questions) {
        await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('questions', 'readwrite');
            const store = tx.objectStore('questions');
            questions.forEach((q) => store.put(q));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async loadQuestions() {
        await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('questions', 'readonly');
            const store = tx.objectStore('questions');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async setSetting(key, value) {
        await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('settings', 'readwrite');
            const store = tx.objectStore('settings');
            store.put({ key, value });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getSetting(key, defaultValue = null) {
        await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('settings', 'readonly');
            const store = tx.objectStore('settings');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result ? request.result.value : defaultValue);
            request.onerror = () => reject(request.error);
        });
    }

    async setStat(key, value) {
        await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('stats', 'readwrite');
            const store = tx.objectStore('stats');
            store.put({ key, value });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getStat(key, defaultValue = 0) {
        await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('stats', 'readonly');
            const store = tx.objectStore('stats');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result ? request.result.value : defaultValue);
            request.onerror = () => reject(request.error);
        });
    }

    async clearAll() {
        await this.ensureOpen();
        const stores = ['questions', 'settings', 'stats'];
        for (const storeName of stores) {
            await new Promise((resolve, reject) => {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const request = store.clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function createElement(tag, attrs = {}, ...children) {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key.startsWith('on')) {
            element.addEventListener(key.substring(2).toLowerCase(), value);
        } else {
            element.setAttribute(key, value);
        }
    });
    children.forEach((child) => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    });
    return element;
}

// ============================================
// UI MANAGER
// ============================================
class UI {
    constructor() {
        this.content = document.getElementById('content');
        this.toastContainer = document.getElementById('toast-container');
    }

    clearContent() {
        this.content.innerHTML = '';
    }

    showMenu(total, remaining) {
        this.clearContent();
        const menu = createElement('div', { className: 'menu-screen fade-in' });

        const icon = createElement('div', { className: 'menu-icon' }, '؟');
        const name = createElement('div', { className: 'menu-game-name' }, 'DrDer Questions');
        const totalInfo = createElement('div', { className: 'menu-info' }, `إجمالي الأسئلة: ${total}`);
        const remainInfo = createElement('div', { className: 'menu-info' }, `المتبقية: ${remaining}`);

        const newGameBtn = createElement('button', { className: 'btn btn-primary', id: 'btn-new-game' }, '🎮 لعبة جديدة');
        const continueBtn = createElement('button', { className: 'btn', id: 'btn-continue' }, '▶ متابعة');
        const statsBtn = createElement('button', { className: 'btn', id: 'btn-stats' }, '📊 إحصائيات');
        const resetBtn = createElement('button', { className: 'btn btn-danger', id: 'btn-reset' }, '🔄 إعادة ضبط');

        menu.appendChild(icon);
        menu.appendChild(name);
        menu.appendChild(totalInfo);
        menu.appendChild(remainInfo);
        menu.appendChild(newGameBtn);
        menu.appendChild(continueBtn);
        menu.appendChild(statsBtn);
        menu.appendChild(resetBtn);

        this.content.appendChild(menu);
    }

    showGame(correct, wrong) {
        this.clearContent();
        const game = createElement('div', { className: 'game-screen fade-in' });

        const stats = createElement('div', { className: 'game-stats' });
        const correctSpan = createElement('span', { className: 'correct-count' });
        correctSpan.innerHTML = `✅ <span id="correct-count">${correct}</span>`;
        const wrongSpan = createElement('span', { className: 'wrong-count' });
        wrongSpan.innerHTML = `❌ <span id="wrong-count">${wrong}</span>`;
        stats.appendChild(correctSpan);
        stats.appendChild(wrongSpan);

        const questionArea = createElement('div', { className: 'question-area', id: 'question-text' });
        const messageArea = createElement('div', { className: 'message-area', id: 'message-text' });
        const optionsGrid = createElement('div', { className: 'options-grid', id: 'options-grid' });
        const skipBtn = createElement('button', { className: 'skip-btn', id: 'btn-skip' }, '⏭ تخطي');

        game.appendChild(stats);
        game.appendChild(questionArea);
        game.appendChild(messageArea);
        game.appendChild(optionsGrid);
        game.appendChild(skipBtn);

        this.content.appendChild(game);
    }

    showEnd(correct, wrong) {
        this.clearContent();
        const end = createElement('div', { className: 'end-screen fade-in' });

        const title = createElement('div', { className: 'end-title' }, '🎉 تهانينا!');
        const stats = createElement('div', { className: 'end-stats' });
        stats.innerHTML = `
            <p>لقد أجبت على جميع الأسئلة!</p>
            <p style="color: var(--green);">✅ صواب: ${correct}</p>
            <p style="color: var(--red);">❌ خطأ: ${wrong}</p>
        `;

        const newGameBtn = createElement('button', { className: 'btn btn-primary', id: 'btn-new-game-end' }, '🔄 لعبة جديدة');

        end.appendChild(title);
        end.appendChild(stats);
        end.appendChild(newGameBtn);

        this.content.appendChild(end);
    }

    showStats(correct, wrong, percent, best, plays) {
        this.clearContent();
        const stats = createElement('div', { className: 'stats-screen fade-in' });

        const title = createElement('h2', {}, '📊 الإحصائيات');
        const detail = createElement('div', { className: 'stats-detail' });
        detail.innerHTML = `
            <p>✅ <span>الصحيحة:</span> <span style="color:var(--green);">${correct}</span></p>
            <p>❌ <span>الخاطئة:</span> <span style="color:var(--red);">${wrong}</span></p>
            <p>📊 <span>النسبة:</span> <span style="color:var(--gold);">${percent}%</span></p>
            <p>🏆 <span>أفضل نتيجة:</span> <span style="color:var(--gold);">${best}</span></p>
            <p>🎮 <span>مرات اللعب:</span> ${plays}</p>
        `;

        const backBtn = createElement('button', { className: 'btn', id: 'btn-back-menu' }, '↩ رجوع للقائمة');

        stats.appendChild(title);
        stats.appendChild(detail);
        stats.appendChild(backBtn);

        this.content.appendChild(stats);
    }

    updateQuestion(questionText) {
        const el = document.getElementById('question-text');
        if (el) el.textContent = questionText;
    }

    updateOptions(options, correctAnswer) {
        const grid = document.getElementById('options-grid');
        if (!grid) return -1;
        grid.innerHTML = '';

        const correctIndex = options.indexOf(correctAnswer);

        options.forEach((option, index) => {
            const btn = createElement('button', {
                className: 'option-btn',
                'data-index': index
            }, option);
            grid.appendChild(btn);
        });

        return correctIndex;
    }

    updateStatsDisplay(correct, wrong) {
        const correctEl = document.getElementById('correct-count');
        const wrongEl = document.getElementById('wrong-count');
        if (correctEl) correctEl.textContent = correct;
        if (wrongEl) wrongEl.textContent = wrong;
    }

    showMessage(text, type) {
        const el = document.getElementById('message-text');
        if (el) {
            el.textContent = text;
            el.className = `message-area ${type}-msg`;
        }
    }

    disableOptions() {
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach((btn) => (btn.disabled = true));
    }

    enableOptions() {
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach((btn) => (btn.disabled = false));
    }

    markCorrectOption(index) {
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach((btn, i) => {
            if (i === index) btn.classList.add('correct-btn');
        });
    }

    markWrongOption(wrongIndex, correctIndex) {
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach((btn, i) => {
            if (i === wrongIndex) btn.classList.add('wrong-btn');
            if (i === correctIndex) btn.classList.add('correct-btn');
        });
    }

    clearOptionStyles() {
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach((btn) => {
            btn.classList.remove('correct-btn', 'wrong-btn');
        });
    }

    showInstallToast() {
        const toast = createElement('div', { className: 'install-toast', id: 'install-toast' });
        const text = createElement('div', { className: 'toast-text' }, '📲 هل تريد تثبيت DrDer Questions على جهازك؟');
        const buttons = createElement('div', { className: 'toast-buttons' });

        const installBtn = createElement('button', { className: 'toast-btn toast-btn-install', id: 'toast-install-btn' }, 'تثبيت');
        const closeBtn = createElement('button', { className: 'toast-btn toast-btn-close', id: 'toast-close-btn' }, '✕');

        buttons.appendChild(installBtn);
        buttons.appendChild(closeBtn);
        toast.appendChild(text);
        toast.appendChild(buttons);
        this.toastContainer.appendChild(toast);
    }

    removeInstallToast() {
        const toast = document.getElementById('install-toast');
        if (toast) toast.remove();
    }
}

// ============================================
// GAME CONTROLLER
// ============================================
class Game {
    constructor() {
        this.db = new Database();
        this.ui = new UI();
        this.questions = [];
        this.availableIds = [];
        this.currentQuestion = null;
        this.correctAnswerIndex = -1;
        this.correct = 0;
        this.wrong = 0;
        this.isAnswered = false;
        this.isFirstAttempt = true;
        this.timer = null;
        this.totalPlays = 0;
        this.bestScore = 0;
        this.deferredPrompt = null;
    }

    async init() {
        try {
            await this.db.open();

            let questions = await this.db.loadQuestions();
            if (questions.length === 0) {
                questions = QUESTIONS;
                await this.db.saveQuestions(questions);
            }
            this.questions = questions;

            this.correct = await this.db.getSetting('correct', 0);
            this.wrong = await this.db.getSetting('wrong', 0);
            this.availableIds = await this.db.getSetting('availableIds', null);
            this.totalPlays = await this.db.getStat('plays', 0);
            this.bestScore = await this.db.getStat('best', 0);

            if (!this.availableIds || this.availableIds.length === 0) {
                this.resetAvailableIds();
            }

            this.showMenu();
            this.setupPWA();

            console.log(`✅ ${this.questions.length} questions loaded`);
        } catch (error) {
            console.error('Init error:', error);
            this.questions = QUESTIONS;
            this.resetAvailableIds();
            this.showMenu();
        }
    }

    resetAvailableIds() {
        this.availableIds = this.questions.map((q) => q.id);
        shuffleArray(this.availableIds);
        this.saveAvailableIds();
    }

    async saveAvailableIds() {
        await this.db.setSetting('availableIds', this.availableIds);
    }

    async saveSettings() {
        await this.db.setSetting('correct', this.correct);
        await this.db.setSetting('wrong', this.wrong);
    }

    setupPWA() {
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            this.deferredPrompt = event;
            this.ui.showInstallToast();
            document.getElementById('toast-install-btn').onclick = () => this.installApp();
            document.getElementById('toast-close-btn').onclick = () => this.ui.removeInstallToast();
        });

        window.addEventListener('appinstalled', () => {
            this.ui.removeInstallToast();
            this.deferredPrompt = null;
        });

        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.ui.removeInstallToast();
        }
    }

    async installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const result = await this.deferredPrompt.userChoice;
            if (result.outcome === 'accepted') {
                console.log('App installed');
            }
            this.deferredPrompt = null;
            this.ui.removeInstallToast();
        }
    }

    showMenu() {
        this.clearTimer();
        this.ui.showMenu(this.questions.length, this.availableIds.length);

        document.getElementById('btn-new-game').onclick = () => this.startNewGame();
        document.getElementById('btn-continue').onclick = () => this.continueGame();
        document.getElementById('btn-stats').onclick = () => this.showStatsScreen();
        document.getElementById('btn-reset').onclick = () => this.resetAll();
    }

    showGame() {
        this.ui.showGame(this.correct, this.wrong);
        document.getElementById('btn-skip').onclick = () => this.skipQuestion();
        this.loadNextQuestion();
    }

    showEndScreen() {
        this.clearTimer();
        this.ui.showEnd(this.correct, this.wrong);
        document.getElementById('btn-new-game-end').onclick = () => this.startNewGame();
    }

    showStatsScreen() {
        const done = this.questions.length - this.availableIds.length;
        const percent = done > 0 ? Math.round((this.correct / done) * 100) : 0;
        this.ui.showStats(this.correct, this.wrong, percent, this.bestScore, this.totalPlays);
        document.getElementById('btn-back-menu').onclick = () => this.showMenu();
    }

    startNewGame() {
        if (this.availableIds.length < this.questions.length) {
            if (!confirm('بدء لعبة جديدة يؤدي لفقدان التقدم الحالي. هل تريد المتابعة؟')) {
                return;
            }
        }
        this.correct = 0;
        this.wrong = 0;
        this.resetAvailableIds();
        this.totalPlays++;
        this.saveSettings();
        this.db.setStat('plays', this.totalPlays);
        this.showGame();
    }

    continueGame() {
        if (this.availableIds.length === 0) {
            this.showEndScreen();
        } else {
            this.showGame();
        }
    }

    async resetAll() {
        if (confirm('هل أنت متأكد من إعادة ضبط جميع البيانات؟ لا يمكن التراجع.')) {
            await this.db.clearAll();
            this.correct = 0;
            this.wrong = 0;
            this.totalPlays = 0;
            this.bestScore = 0;
            this.questions = QUESTIONS;
            await this.db.saveQuestions(this.questions);
            this.resetAvailableIds();
            this.showMenu();
            alert('تمت إعادة الضبط بنجاح.');
        }
    }

    clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    loadNextQuestion() {
        this.clearTimer();

        if (this.availableIds.length === 0) {
            this.showEndScreen();
            return;
        }

        const nextId = this.availableIds.pop();
        this.saveAvailableIds();

        const question = this.questions.find((q) => q.id === nextId);
        if (!question) {
            this.loadNextQuestion();
            return;
        }

        this.currentQuestion = question;
        this.isAnswered = false;
        this.isFirstAttempt = true;

        this.ui.updateQuestion(question.q);

        const shuffledOptions = shuffleArray([...question.opts]);
        this.correctAnswerIndex = shuffledOptions.indexOf(question.ans);

        this.ui.updateOptions(shuffledOptions, question.ans);
        this.ui.showMessage('', '');
        this.ui.clearOptionStyles();

        this.bindOptionButtons();
    }

    bindOptionButtons() {
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach((btn) => {
            btn.onclick = (event) => {
                const index = parseInt(event.target.dataset.index);
                this.handleAnswer(index);
            };
        });
    }

    handleAnswer(selectedIndex) {
        if (this.isAnswered) return;
        this.isAnswered = true;
        this.clearTimer();

        this.ui.disableOptions();

        if (selectedIndex === this.correctAnswerIndex) {
            if (this.isFirstAttempt) {
                this.correct++;
                if (this.correct > this.bestScore) {
                    this.bestScore = this.correct;
                    this.db.setStat('best', this.bestScore);
                }
            }
            this.ui.markCorrectOption(selectedIndex);
            this.ui.showMessage('✅ إجابة صحيحة!', 'correct');
            this.saveSettings();
            this.timer = setTimeout(() => this.loadNextQuestion(), 1000);
        } else {
            this.wrong++;
            this.isFirstAttempt = false;
            this.ui.markWrongOption(selectedIndex, this.correctAnswerIndex);
            this.ui.showMessage(`❌ خطأ! الجواب: ${this.currentQuestion.ans}`, 'wrong');
            this.saveSettings();
            this.timer = setTimeout(() => this.loadNextQuestion(), 2000);
        }

        this.ui.updateStatsDisplay(this.correct, this.wrong);
    }

    skipQuestion() {
        if (this.isAnswered) return;
        this.clearTimer();
        this.wrong++;
        this.saveSettings();
        this.ui.updateStatsDisplay(this.correct, this.wrong);
        this.loadNextQuestion();
    }
}

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
        console.warn('Service Worker registration failed:', error);
    });
}

// ============================================
// START APPLICATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});
