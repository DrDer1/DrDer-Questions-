// ============================================
// DATABASE MANAGER
// ============================================
class Database {
    constructor() { this.name = 'DrDerDB'; this.version = 1; this.db = null; }
    async open() {
        return new Promise((resolve, reject) => {
            const r = indexedDB.open(this.name, this.version);
            r.onupgradeneeded = (e) => {
                const d = e.target.result;
                if (!d.objectStoreNames.contains('q')) d.createObjectStore('q', { keyPath: 'id' });
                if (!d.objectStoreNames.contains('s')) d.createObjectStore('s', { keyPath: 'k' });
                if (!d.objectStoreNames.contains('t')) d.createObjectStore('t', { keyPath: 'k' });
            };
            r.onsuccess = (e) => { this.db = e.target.result; resolve(this.db); };
            r.onerror = (e) => reject(e.target.error);
        });
    }
    async ensure() { if (!this.db) await this.open(); }
    async saveQuestions(qs) {
        await this.ensure();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('q', 'readwrite'); const st = tx.objectStore('q');
            qs.forEach(q => st.put(q)); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
        });
    }
    async loadQuestions() {
        await this.ensure();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('q', 'readonly');
            const r = tx.objectStore('q').getAll(); r.onsuccess = () => resolve(r.result || []); r.onerror = () => reject(r.error);
        });
    }
    async set(k, v) {
        await this.ensure();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('s', 'readwrite'); tx.objectStore('s').put({ k, v });
            tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
        });
    }
    async get(k, def = null) {
        await this.ensure();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('s', 'readonly'); const r = tx.objectStore('s').get(k);
            r.onsuccess = () => resolve(r.result ? r.result.v : def); r.onerror = () => reject(r.error);
        });
    }
    async setStat(k, v) {
        await this.ensure();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('t', 'readwrite'); tx.objectStore('t').put({ k, v });
            tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
        });
    }
    async getStat(k, def = 0) {
        await this.ensure();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('t', 'readonly'); const r = tx.objectStore('t').get(k);
            r.onsuccess = () => resolve(r.result ? r.result.v : def); r.onerror = () => reject(r.error);
        });
    }
    async clear() {
        await this.ensure();
        for (const n of ['q', 's', 't']) {
            await new Promise((resolve, reject) => {
                const tx = this.db.transaction(n, 'readwrite'); tx.objectStore(n).clear();
                tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
            });
        }
    }
}

// ============================================
// UTILS
// ============================================
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => { if (k === 'className') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v); else e.setAttribute(k, v); });
    children.forEach(c => { if (typeof c === 'string') e.appendChild(document.createTextNode(c)); else if (c instanceof Node) e.appendChild(c); });
    return e;
}

// ============================================
// UI
// ============================================
class UI {
    constructor() { this.ct = document.getElementById('content'); this.tc = document.getElementById('toast-container'); }
    clear() { this.ct.innerHTML = ''; }
    menu(total, rem) {
        this.clear(); const m = el('div', { className: 'menu-screen fade-in' });
        m.appendChild(el('div', { className: 'menu-icon' }, '؟'));
        m.appendChild(el('div', { className: 'menu-game-name' }, 'DrDer Questions'));
        m.appendChild(el('div', { className: 'menu-info' }, `إجمالي الأسئلة: ${total}`));
        m.appendChild(el('div', { className: 'menu-info' }, `المتبقية: ${rem}`));
        m.appendChild(el('button', { className: 'btn btn-primary', id: 'btn-new' }, '🎮 لعبة جديدة'));
        m.appendChild(el('button', { className: 'btn', id: 'btn-cont' }, '▶ متابعة'));
        m.appendChild(el('button', { className: 'btn', id: 'btn-stats' }, '📊 إحصائيات'));
        m.appendChild(el('button', { className: 'btn btn-danger', id: 'btn-reset' }, '🔄 إعادة ضبط'));
        this.ct.appendChild(m);
    }
    game(c, w) {
        this.clear(); const g = el('div', { className: 'game-screen fade-in' });
        const s = el('div', { className: 'game-stats' });
        s.innerHTML = `<span class="correct-count">✅ <span id="c-count">${c}</span></span><span class="wrong-count">❌ <span id="w-count">${w}</span></span>`;
        g.appendChild(s); g.appendChild(el('div', { className: 'question-area', id: 'q-text' }));
        g.appendChild(el('div', { className: 'message-area', id: 'msg' }));
        g.appendChild(el('div', { className: 'options-grid', id: 'opts' }));
        g.appendChild(el('button', { className: 'skip-btn', id: 'btn-skip' }, '⏭ تخطي'));
        this.ct.appendChild(g);
    }
    end(c, w) {
        this.clear(); const ed = el('div', { className: 'end-screen fade-in' });
        ed.appendChild(el('div', { className: 'end-title' }, '🎉 تهانينا!'));
        const st = el('div', { className: 'end-stats' });
        st.innerHTML = `<p>لقد أجبت على جميع الأسئلة!</p><p style="color:var(--green);">✅ صواب: ${c}</p><p style="color:var(--red);">❌ خطأ: ${w}</p>`;
        ed.appendChild(st); ed.appendChild(el('button', { className: 'btn btn-primary', id: 'btn-new-end' }, '🔄 لعبة جديدة'));
        this.ct.appendChild(ed);
    }
    stats(c, w, pct, best, plays) {
        this.clear(); const st = el('div', { className: 'stats-screen fade-in' });
        st.appendChild(el('h2', {}, '📊 الإحصائيات')); const d = el('div', { className: 'stats-detail' });
        d.innerHTML = `<p>✅ <span>الصحيحة:</span> <span style="color:var(--green);">${c}</span></p><p>❌ <span>الخاطئة:</span> <span style="color:var(--red);">${w}</span></p><p>📊 <span>النسبة:</span> <span style="color:var(--gold);">${pct}%</span></p><p>🏆 <span>أفضل نتيجة:</span> <span style="color:var(--gold);">${best}</span></p><p>🎮 <span>مرات اللعب:</span> ${plays}</p>`;
        st.appendChild(d); st.appendChild(el('button', { className: 'btn', id: 'btn-back' }, '↩ رجوع للقائمة'));
        this.ct.appendChild(st);
    }
    updateQ(t) { const e = document.getElementById('q-text'); if (e) e.textContent = t; }
    updateOpts(opts, ans) { const g = document.getElementById('opts'); if (!g) return -1; g.innerHTML = ''; const ci = opts.indexOf(ans); opts.forEach((o, i) => g.appendChild(el('button', { className: 'option-btn', 'data-idx': i }, o))); return ci; }
    updateStats(c, w) { const ce = document.getElementById('c-count'); if (ce) ce.textContent = c; const we = document.getElementById('w-count'); if (we) we.textContent = w; }
    msg(t, type) { const e = document.getElementById('msg'); if (e) { e.textContent = t; e.className = `message-area ${type}-msg`; } }
    disableBtns() { document.querySelectorAll('.option-btn').forEach(b => b.disabled = true); }
    markCorrect(i) { document.querySelectorAll('.option-btn').forEach((b, j) => { if (j === i) b.classList.add('correct-btn'); }); }
    markWrong(wi, ci) { document.querySelectorAll('.option-btn').forEach((b, j) => { if (j === wi) b.classList.add('wrong-btn'); if (j === ci) b.classList.add('correct-btn'); }); }
    clearStyles() { document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('correct-btn', 'wrong-btn')); }
    showInstall() {
        const t = el('div', { className: 'install-toast', id: 'install-toast' });
        t.appendChild(el('div', { className: 'toast-text' }, '📲 هل تريد تثبيت DrDer Questions على جهازك؟'));
        const btns = el('div', { className: 'toast-buttons' });
        btns.appendChild(el('button', { className: 'toast-btn toast-btn-install', id: 'toast-install' }, 'تثبيت'));
        btns.appendChild(el('button', { className: 'toast-btn toast-btn-close', id: 'toast-close' }, '✕'));
        t.appendChild(btns); this.tc.appendChild(t);
    }
    removeInstall() { const t = document.getElementById('install-toast'); if (t) t.remove(); }
}

// ============================================
// GAME
// ============================================
class Game {
    constructor() {
        this.db = new Database(); this.ui = new UI();
        this.questions = []; this.avail = []; this.correct = 0; this.wrong = 0;
        this.cQ = null; this.cIdx = -1; this.answered = false; this.first = true;
        this.timer = null; this.plays = 0; this.best = 0; this.deferred = null;
    }
    async init() {
        await this.db.open(); let qs = await this.db.loadQuestions();
        if (qs.length === 0) { qs = QUESTIONS; await this.db.saveQuestions(qs); }
        this.questions = qs;
        this.correct = await this.db.get('correct', 0); this.wrong = await this.db.get('wrong', 0);
        this.plays = await this.db.getStat('plays', 0); this.best = await this.db.getStat('best', 0);
        this.avail = await this.db.get('avail', null);
        if (!this.avail || this.avail.length === 0) { this.resetAvail(); }
        else { this.avail = this.avail; }
        this.menu(); this.pwa();
    }
    resetAvail() { this.avail = this.questions.map(q => q.id); shuffle(this.avail); this.saveAvail(); }
    async saveAvail() { await this.db.set('avail', this.avail); }
    pwa() {
        window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.deferred = e; this.ui.showInstall(); document.getElementById('toast-install').onclick = () => this.install(); document.getElementById('toast-close').onclick = () => this.ui.removeInstall(); });
        window.addEventListener('appinstalled', () => { this.ui.removeInstall(); this.deferred = null; });
    }
    async install() { if (this.deferred) { this.deferred.prompt(); await this.deferred.userChoice; this.deferred = null; this.ui.removeInstall(); } }
    menu() { clearTimeout(this.timer); this.ui.menu(this.questions.length, this.avail.length); document.getElementById('btn-new').onclick = () => this.newGame(); document.getElementById('btn-cont').onclick = () => this.cont(); document.getElementById('btn-stats').onclick = () => this.showStats(); document.getElementById('btn-reset').onclick = () => this.reset(); }
    showGame() { this.ui.game(this.correct, this.wrong); document.getElementById('btn-skip').onclick = () => this.skip(); this.next(); }
    showEnd() { clearTimeout(this.timer); this.ui.end(this.correct, this.wrong); document.getElementById('btn-new-end').onclick = () => this.newGame(); }
    showStats() { const done = this.questions.length - this.avail.length; const pct = done > 0 ? Math.round((this.correct / done) * 100) : 0; this.ui.stats(this.correct, this.wrong, pct, this.best, this.plays); document.getElementById('btn-back').onclick = () => this.menu(); }
    newGame() { if (this.avail.length < this.questions.length && !confirm('بدء لعبة جديدة يؤدي لفقدان التقدم. متابعة؟')) return; this.correct = 0; this.wrong = 0; this.resetAvail(); this.plays++; this.save(); this.db.setStat('plays', this.plays); this.showGame(); }
    cont() { if (this.avail.length === 0) this.showEnd(); else this.showGame(); }
    async reset() { if (confirm('إعادة ضبط جميع البيانات؟ لا يمكن التراجع.')) { await this.db.clear(); this.correct = 0; this.wrong = 0; this.plays = 0; this.best = 0; this.questions = QUESTIONS; await this.db.saveQuestions(this.questions); this.resetAvail(); this.menu(); alert('تمت إعادة الضبط بنجاح.'); } }
    next() { clearTimeout(this.timer); if (this.avail.length === 0) { this.showEnd(); return; } const id = this.avail.pop(); this.saveAvail(); this.cQ = this.questions.find(q => q.id === id); this.answered = false; this.first = true; this.ui.updateQ(this.cQ.q); const opts = shuffle([...this.cQ.opts]); this.cIdx = opts.indexOf(this.cQ.ans); this.ui.updateOpts(opts, this.cQ.ans); this.ui.msg('', ''); this.ui.clearStyles(); document.querySelectorAll('.option-btn').forEach(b => { b.onclick = (e) => this.answer(parseInt(e.target.dataset.idx)); }); }
    answer(idx) { if (this.answered) return; this.answered = true; clearTimeout(this.timer); this.ui.disableBtns(); if (idx === this.cIdx) { if (this.first) { this.correct++; if (this.correct > this.best) { this.best = this.correct; this.db.setStat('best', this.best); } } this.ui.markCorrect(idx); this.ui.msg('✅ إجابة صحيحة!', 'correct'); this.save(); this.timer = setTimeout(() => this.next(), 1000); } else { this.wrong++; this.first = false; this.ui.markWrong(idx, this.cIdx); this.ui.msg(`❌ خطأ! الجواب: ${this.cQ.ans}`, 'wrong'); this.save(); this.timer = setTimeout(() => this.next(), 2000); } this.ui.updateStats(this.correct, this.wrong); }
    skip() { if (this.answered) return; clearTimeout(this.timer); this.wrong++; this.save(); this.ui.updateStats(this.correct, this.wrong); this.next(); }
    async save() { await this.db.set('correct', this.correct); await this.db.set('wrong', this.wrong); }
}

// ============================================
// START
// ============================================
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(() => {}); }
document.addEventListener('DOMContentLoaded', () => { const g = new Game(); g.init(); });
