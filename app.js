/**
 * Daily Task List PWA - Logic
 */

const app = {
    tasks: JSON.parse(localStorage.getItem('tasks')) || [],
    currentScreen: 'home',

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.render();
        this.updateStats();
        this.initPush();
        this.startNotificationInterval();
    },

    cacheDOM() {
        this.screens = document.querySelectorAll('.screen');
        this.navItems = document.querySelectorAll('.nav-item');
        this.screenTitle = document.getElementById('screen-title');
        this.homeList = document.getElementById('home-tasks-list');
        this.fullList = document.getElementById('full-tasks-list');
        this.modal = document.getElementById('task-modal');
        this.taskInput = document.getElementById('task-input');
        this.statsText = document.getElementById('today-stats');
        this.calendarContainer = document.getElementById('calendar-view');
        this.themeToggle = document.getElementById('theme-toggle');
        this.darkModeCheck = document.getElementById('dark-mode-check');
        this.resetBtn = document.getElementById('reset-data');
        this.pushToggle = document.getElementById('push-toggle');
        this.pushPrompt = document.getElementById('push-prompt');
        this.activatePushBtn = document.getElementById('activate-push-btn');
        this.closePushPrompt = document.getElementById('close-push-prompt');
    },

    bindEvents() {
        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const screen = item.dataset.screen;
                this.navigateTo(screen);
            });
        });

        // Add Task Logic
        document.getElementById('add-task-btn').addEventListener('click', () => this.toggleModal(true));
        document.getElementById('cancel-task').addEventListener('click', () => this.toggleModal(false));
        document.getElementById('save-task').addEventListener('click', () => this.addTask());

        // Theme
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.darkModeCheck.addEventListener('change', (e) => this.setTheme(e.target.checked));

        // Reset
        this.resetBtn.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja apagar todos os dados?')) {
                this.tasks = [];
                this.save();
                this.render();
            }
        });

        // Push Toggle
        this.pushToggle.addEventListener('click', () => this.togglePush());

        // Push Prompt Interaction
        this.activatePushBtn.addEventListener('click', () => {
            this.togglePush();
            this.pushPrompt.style.display = 'none';
        });

        this.closePushPrompt.addEventListener('click', () => {
            this.pushPrompt.style.display = 'none';
            localStorage.setItem('push_prompt_dismissed', 'true');
        });

        // Close modal on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.toggleModal(false);
        });
    },

    navigateTo(screenId) {
        this.currentScreen = screenId;

        // Update Screens
        this.screens.forEach(s => s.classList.toggle('active', s.id === `screen-${screenId}`));

        // Update Nav
        this.navItems.forEach(n => n.classList.toggle('active', n.dataset.screen === screenId));

        // Update Header Title
        const titles = {
            'home': 'Início',
            'tasks': 'Minhas Tarefas',
            'calendar': 'Calendário',
            'settings': 'Ajustes'
        };
        this.screenTitle.innerText = titles[screenId];

        this.render();
    },

    toggleModal(show) {
        this.modal.classList.toggle('active', show);
        if (show) this.taskInput.focus();
    },

    addTask() {
        const text = this.taskInput.value.trim();
        if (!text) return;

        const newTask = {
            id: Date.now(),
            text,
            status: 'pending', // pending, completed, failed
            date: new Date().toISOString().split('T')[0]
        };

        this.tasks.push(newTask);
        this.save();
        this.taskInput.value = '';
        this.toggleModal(false);
        this.render();
        this.updateStats();
    },

    updateTaskStatus(id, status) {
        const task = this.tasks.find(t => t.id === id);
        if (task && task.status === 'pending') {
            task.status = status;
            this.save();
            this.render();
            this.updateStats();
        }
    },

    moveTaskUp(id) {
        const index = this.tasks.findIndex(t => t.id === id);
        if (index === -1) return;

        // Visual "Up" in reversed list means moving closer to the end of the array
        let nextIndex = -1;
        for (let i = index + 1; i < this.tasks.length; i++) {
            if (!this.tasks[i].archived) {
                nextIndex = i;
                break;
            }
        }

        if (nextIndex !== -1) {
            const temp = this.tasks[index];
            this.tasks[index] = this.tasks[nextIndex];
            this.tasks[nextIndex] = temp;

            this.save();
            this.render();
        }
    },

    deleteTask(id) {
        if (confirm('Eliminar esta tarefa?')) {
            const task = this.tasks.find(t => t.id === id);
            if (task) {
                task.archived = true;
                this.save();
                this.render();
                this.updateStats();
            }
        }
    },

    save() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    },

    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const activeTasks = this.tasks.filter(t => !t.archived);
        const todayTasks = activeTasks.filter(t => t.date === today);

        let completedCount = 0;
        let pendingCount = 0;
        let failedCount = 0;
        let percent = 0;

        if (todayTasks.length > 0) {
            completedCount = todayTasks.filter(t => t.status === 'completed').length;
            failedCount = todayTasks.filter(t => t.status === 'failed').length;
            pendingCount = todayTasks.length - completedCount - failedCount;
            percent = Math.round((completedCount / todayTasks.length) * 100);
        }

        // Check for notification trigger
        this.checkNotificationTrigger(pendingCount);

        // Circular Progress Update
        this.updateProgressCircles(completedCount, failedCount, todayTasks.length);

        // Dynamic Phrase
        this.updateDynamicPhrase(percent, todayTasks.length);
    },

    updateProgressCircles(done, failed, total) {
        const doneCircle = document.getElementById('circle-done');
        const failedCircle = document.getElementById('circle-failed');
        const doneText = document.getElementById('text-done');
        const failedText = document.getElementById('text-failed');

        if (!doneCircle) return;

        const donePercent = total ? (done / total) * 100 : 0;
        const failedPercent = total ? (failed / total) * 100 : 0;

        // SVG dasharray logic: circumference is 2 * PI * r (r=45 -> 282.7)
        const circumference = 282.7;
        doneCircle.style.strokeDashoffset = circumference - (donePercent / 100) * circumference;
        failedCircle.style.strokeDashoffset = circumference - (failedPercent / 100) * circumference;

        doneText.innerText = `${done}`;
        failedText.innerText = `${failed}`;
    },

    updateDynamicPhrase(percent, total) {
        const phraseContainer = document.getElementById('today-stats');
        if (!phraseContainer) return;

        const phrases = {
            empty: [
                "O dia está à tua espera! Que tal começar com uma pequena meta? ✨",
                "Folha em branco... vamos escrever algo produtivo hoje? ✍️",
                "Pronto para dar o primeiro passo? Adiciona a tua primeira tarefa! 🚀"
            ],
            zero: [
                "Ainda não começaste? Não faz mal, o importante é começar agora! 💪",
                "Sinto-me um pouco triste por não termos concluído nada ainda... mas acredito em ti! ❤️",
                "Vamos lá dar vida a esta lista? Só precisas de um pequeno impulso! 🔥"
            ],
            started: [
                "Bom começo! O motor já aqueceu, continua assim! ⚙️",
                "Um passo de cada vez e chegamos lá. Força nisso! 🧗",
                "Já tens movimento! Não pares agora, estás no caminho certo. 🌟"
            ],
            half: [
                "Já vais a meio caminho! Estás a dominar o dia hoje! 😎",
                "Metade já está! O resto vai ser num piscar de olhos. ✨",
                "Excelente progresso! Estás mais perto do fim do que do início. 🏁"
            ],
            almost: [
                "Quase lá! Só mais um último esforço para a glória! 🏆",
                "Vê só o quanto já fizeste... falta tão pouco! ⚡",
                "Estás imparável! Termina isso e celebra o teu sucesso. 🎇"
            ],
            done: [
                "INCRÍVEL! Completaste tudo! Agora descansa, tu mereces! 🎉",
                "Missão Cumprida! O teu eu de amanhã agradece o esforço de hoje. 🔥",
                "Perfeição! Limpaste a lista... que sensação maravilhosa, não é? 🌈"
            ]
        };

        const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
        let phrase = "";

        if (total === 0) {
            phrase = getRandom(phrases.empty);
        } else if (percent === 0) {
            phrase = getRandom(phrases.zero);
        } else if (percent < 40) {
            phrase = getRandom(phrases.started);
        } else if (percent < 75) {
            phrase = getRandom(phrases.half);
        } else if (percent < 100) {
            phrase = getRandom(phrases.almost);
        } else {
            phrase = getRandom(phrases.done);
        }

        phraseContainer.innerText = phrase;
    },

    toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        this.setTheme(!isDark);
    },

    setTheme(isDark) {
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        this.darkModeCheck.checked = isDark;
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    },

    initPush() {
        if (!('Notification' in window)) {
            this.pushToggle.disabled = true;
            this.pushToggle.innerText = 'Não Suportado';
            return;
        }

        this.updatePushUI();
    },

    updatePushUI() {
        const isGranted = Notification.permission === 'granted';
        const isDenied = Notification.permission === 'denied';
        const isDismissed = localStorage.getItem('push_prompt_dismissed') === 'true';

        if (isGranted) {
            this.pushToggle.innerText = 'Ativado';
            this.pushToggle.classList.add('btn-status-done');
            this.pushPrompt.style.display = 'none';
        } else if (isDenied) {
            this.pushToggle.innerText = 'Bloqueado';
            this.pushToggle.classList.add('btn-status-failed');
            this.pushPrompt.style.display = 'none';
        } else {
            this.pushToggle.innerText = 'Ativar';
            // Show prompt only on home screen, if not dismissed and permission is default
            this.pushPrompt.style.display = (this.currentScreen === 'home' && !isDismissed) ? 'flex' : 'none';
        }
    },

    async togglePush() {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            this.updatePushUI();
            if (permission === 'granted') {
                new Notification('DaySignal', { body: 'As notificações estão ativadas!' });
            }
        } else if (Notification.permission === 'denied') {
            alert('Por favor, ative as notificações nas definições do seu navegador.');
        }
    },

    startNotificationInterval() {
        // Run every 2 minutes (120,000 ms)
        setInterval(() => {
            const today = new Date().toISOString().split('T')[0];
            const pendingTasks = this.tasks.filter(t => !t.archived && t.date === today && t.status === 'pending');
            this.checkNotificationTrigger(pendingTasks.length, true);
        }, 120000);
    },

    checkNotificationTrigger(pendingCount, fromInterval = false) {
        if (Notification.permission === 'granted' && pendingCount > 2) {
            if (fromInterval) {
                // Interval reminder: Always send if count > 2
                new Notification('DaySignal (Lembrete)', {
                    body: `Ainda tens ${pendingCount} tarefas pendentes! Vamos conclui-las? ⏳`,
                    icon: './android-chrome-192x192.png'
                });
            } else {
                // Manual update: Only send if count changed to avoid spam on every render
                const lastNotify = localStorage.getItem('last_notify_count');
                if (lastNotify !== pendingCount.toString()) {
                    new Notification('DaySignal', {
                        body: `Tens ${pendingCount} tarefas pendentes! Vamos focar? 🚀`,
                        icon: './android-chrome-192x192.png'
                    });
                    localStorage.setItem('last_notify_count', pendingCount.toString());
                }
            }
        }
    },

    render() {
        const today = new Date().toISOString().split('T')[0];
        const activeTasks = this.tasks.filter(t => !t.archived);

        // Home List (Last 3)
        const recent = [...activeTasks].reverse().slice(0, 3);
        this.homeList.innerHTML = recent.length ? '' : '<p class="text-muted">Nenhuma tarefa recente.</p>';
        recent.forEach(t => this.homeList.appendChild(this.createTaskElement(t, true)));

        // Full List
        this.fullList.innerHTML = activeTasks.length ? '' : '<p class="text-muted">Tudo limpo por aqui! Adicione uma tarefa.</p>';
        // Sort by date then status? Let's just do reverse chronological
        [...activeTasks].reverse().forEach(t => this.fullList.appendChild(this.createTaskElement(t)));

        // Calendar
        if (this.currentScreen === 'calendar') this.renderCalendar();
    },

    createTaskElement(task, mini = false) {
        const div = document.createElement('div');
        const isFinalized = task.status !== 'pending';
        div.className = `task-item ${task.status === 'completed' ? 'completed' : ''} ${task.status === 'failed' ? 'not-completed' : ''}`;

        let actionsHtml = '';
        if (isFinalized) {
            const statusClass = task.status === 'completed' ? 'btn-status-done' : 'btn-status-failed';
            actionsHtml = `
                <div class="task-actions">
                    <button class="btn-action btn-delete ${statusClass}" style="width: 100%" onclick="app.deleteTask(${task.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
        } else {
            actionsHtml = `
                <div class="task-actions">
                    <button class="btn-action btn-done" onclick="app.updateTaskStatus(${task.id}, 'completed')">
                        <i class="fas fa-check"></i> Concluir
                    </button>
                    <button class="btn-action btn-todo" onclick="app.updateTaskStatus(${task.id}, 'failed')">
                        <i class="fas fa-xmark"></i> Não Concluir
                    </button>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="task-content">
                <span class="task-text">
                    ${task.text}
                </span>
                <div class="task-meta-actions">
                    ${(!mini && !isFinalized) ? `
                        <button class="btn-action btn-move-up" onclick="app.moveTaskUp(${task.id})">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                    ` : ''}
                    ${!mini ? `<button class="btn-action btn-delete" onclick="app.deleteTask(${task.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            ${actionsHtml}
        `;

        return div;
    },

    renderCalendar() {
        this.calendarContainer.innerHTML = `
            <div class="calendar-header-box">
                <h3>O Teu Histórico</h3>
                <p class="text-muted">Últimos 7 dias de produtividade</p>
            </div>
            <div class="cal-grid"></div>
            <div class="cal-legend">
                <span>Pouco</span>
                <div class="legend-scale">
                    <div class="scale-box" style="background: rgba(255,107,0, 0.1)"></div>
                    <div class="scale-box" style="background: rgba(255,107,0, 0.4)"></div>
                    <div class="scale-box" style="background: rgba(255,107,0, 0.7)"></div>
                    <div class="scale-box" style="background: rgba(255,107,0, 1.0)"></div>
                </div>
                <span>Muito</span>
            </div>
        `;
        const grid = this.calendarContainer.querySelector('.cal-grid');

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).split('.')[0];
            const isToday = i === 0;

            const dayTasks = this.tasks.filter(t => t.date === dateStr);
            let percent = 0;
            if (dayTasks.length > 0) {
                const completed = dayTasks.filter(t => t.status === 'completed').length;
                percent = Math.round((completed / dayTasks.length) * 100);
            }

            const dayEl = document.createElement('div');
            dayEl.className = `cal-day ${isToday ? 'is-today' : ''}`;

            // Background intensity based on percentage and presence of tasks
            let intensity = 0;
            if (dayTasks.length > 0) {
                if (percent === 0) intensity = 0.1;
                else if (percent < 50) intensity = 0.4;
                else if (percent < 100) intensity = 0.7;
                else intensity = 1.0;
            } else {
                intensity = 0.05;
            }

            dayEl.style.setProperty('--intensity', intensity);
            if (dayTasks.length > 0) {
                dayEl.classList.add('has-tasks');
            }

            dayEl.innerHTML = `
                <span class="cal-label">${dayName}</span>
                <span class="cal-date">${d.getDate()}</span>
                <div class="cal-progress-dot" style="opacity: ${dayTasks.length ? 1 : 0}"></div>
                <div class="cal-tooltip">
                    <strong>${dayTasks.length} tarefas</strong><br>
                    ${percent}% concluído
                </div>
            `;
            grid.appendChild(dayEl);
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    app.init();
    // Load theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) app.setTheme(savedTheme === 'dark');
});
