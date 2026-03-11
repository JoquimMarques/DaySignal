/**
 * Daily Task List PWA - Logic
 */

const app = {
    tasks: JSON.parse(localStorage.getItem('tasks')) || [],
    goals: JSON.parse(localStorage.getItem('goals')) || [],
    studyHistory: JSON.parse(localStorage.getItem('studyHistory')) || [],
    openRouterKey: localStorage.getItem('openRouterKey') || '',
    currentScreen: 'home',

    init() {
        this.cacheDOM();
        this.initTheme(); // Initialize theme before anything else
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
        this.progressDateBadge = document.getElementById('progress-date-badge');
        this.testPushBtn = document.getElementById('test-push');
        this.motivationBanner = document.getElementById('motivation-banner');
        this.taskDateChips = document.querySelectorAll('.task-date-selector .date-chip');

        // Goals DOM
        this.goalModal = document.getElementById('goal-modal');
        this.goalInput = document.getElementById('goal-input');
        this.goalsListContainer = document.getElementById('active-goals-list');
        this.goalsProgressFill = document.getElementById('goals-progress-fill');
        this.goalsProgressPercent = document.getElementById('goals-progress-percent');

        // Study DOM
        this.studyInput = document.getElementById('study-input');
        this.studyBtn = document.getElementById('generate-study-btn');
        this.studyLoading = document.getElementById('study-loading');
        this.studyResult = document.getElementById('study-result');
        this.studyContent = document.getElementById('study-content');
        this.studyHistoryList = document.getElementById('study-history-list');
        this.clearStudyBtn = document.getElementById('clear-study-btn');
        this.openRouterKeyInput = document.getElementById('openrouter-key');
        this.saveOpenRouterKeyBtn = document.getElementById('save-openrouter-key');

        // Multimodal Study DOM
        this.studyImageInput = document.getElementById('study-image-input');
        this.studyMediaPreview = document.getElementById('study-media-preview');
        this.clearMediaBtn = document.getElementById('clear-media-btn');
        this.voiceRecordBtn = document.getElementById('voice-record-btn');
        this.recordingWaves = document.getElementById('recording-waves');
        this.recordingTimer = document.getElementById('recording-timer');

        // Study History Modal DOM
        this.studyHistoryModal = document.getElementById('study-history-modal');
        this.historyModalTitle = document.getElementById('history-modal-title');
        this.historyModalContent = document.getElementById('history-modal-content');
        this.viewAllHistoryBtn = document.getElementById('view-all-history-btn');
        this.studyFullHistoryModal = document.getElementById('study-full-history-modal');
        this.fullHistoryList = document.getElementById('full-history-list');
        this.studyHistoryMiniContainer = document.getElementById('study-history-mini-container');

        this.selectedMedia = []; // Array of { type, data, mimeType }
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordingStartTime = 0;
        this.recordingInterval = null;
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

        // Task Date Selector
        this.taskDateChips.forEach(chip => {
            chip.addEventListener('click', () => {
                this.taskDateChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            });
        });

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

        if (this.testPushBtn) this.testPushBtn.addEventListener('click', () => this.testNotification());

        // Goal Logic
        document.getElementById('add-goal-btn').addEventListener('click', () => this.toggleGoalModal(true));
        document.getElementById('cancel-goal').addEventListener('click', () => this.toggleGoalModal(false));
        document.getElementById('save-goal').addEventListener('click', () => this.addGoal());



        // Close modal on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.toggleModal(false);
        });
        this.goalModal.addEventListener('click', (e) => {
            if (e.target === this.goalModal) this.toggleGoalModal(false);
        });

        // Study Logic
        if (this.studyBtn) this.studyBtn.addEventListener('click', () => this.generateStudy());
        if (this.clearStudyBtn) this.clearStudyBtn.addEventListener('click', () => this.clearStudyResult());
        if (this.openRouterKeyInput) {
            this.openRouterKeyInput.value = this.openRouterKey;

            const saveKey = () => {
                const val = this.openRouterKeyInput.value.trim();
                if (!val) {
                    alert('Por favor, insere uma chave válida.');
                    return;
                }
                this.openRouterKey = val;
                localStorage.setItem('openRouterKey', this.openRouterKey);

                // Visual feedback
                const icon = this.saveOpenRouterKeyBtn.querySelector('i');
                const originalClass = icon.className;
                icon.className = 'fas fa-check-circle';
                this.saveOpenRouterKeyBtn.style.color = 'var(--success)';

                setTimeout(() => {
                    icon.className = originalClass;
                    this.saveOpenRouterKeyBtn.style.color = '';
                }, 2000);
            };

            this.saveOpenRouterKeyBtn.addEventListener('click', saveKey);

            // Still keep the auto-save on input for convenience
            this.openRouterKeyInput.addEventListener('input', (e) => {
                this.openRouterKey = e.target.value.trim();
                localStorage.setItem('openRouterKey', this.openRouterKey);
            });
        }

        // Multimodal Events
        if (this.studyImageInput) this.studyImageInput.addEventListener('change', (e) => this.handleMediaUpload(e, 'image'));
        if (this.voiceRecordBtn) this.voiceRecordBtn.addEventListener('click', () => this.toggleVoiceRecording());
        if (this.clearMediaBtn) this.clearMediaBtn.addEventListener('click', () => this.clearSelectedMedia());
        if (this.viewAllHistoryBtn) this.viewAllHistoryBtn.addEventListener('click', () => this.openFullHistoryModal());
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
            'calendar': 'Relatórios',
            'settings': 'Ajustes',
            'goals': 'Minhas Metas',
            'study': 'Estudo IA'
        };
        this.screenTitle.innerText = titles[screenId] || 'DaySignal';

        this.render();
    },

    toggleModal(show) {
        this.modal.classList.toggle('active', show);
        if (show) this.taskInput.focus();
    },

    addTask() {
        const taskText = this.taskInput.value.trim();
        if (!taskText || taskText.length > 75) {
            return;
        }

        const activeChip = document.querySelector('.task-date-selector .date-chip.active');
        const selection = activeChip ? activeChip.dataset.date : 'today';

        let targetDate = new Date();
        if (selection === 'tomorrow') {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        const dateStr = targetDate.toISOString().split('T')[0];

        const newTask = {
            id: Date.now(),
            text: taskText,
            status: 'pending', // pending, completed, failed
            date: dateStr
        };

        this.tasks.push(newTask);
        this.save();
        this.taskInput.value = '';
        this.toggleModal(false);
        this.render();
        this.updateStats();
    },

    updateTaskStatus(id, status) {
        const taskIndex = this.tasks.findIndex(t => t.id === id);
        if (taskIndex !== -1 && this.tasks[taskIndex].status === 'pending') {
            const task = this.tasks[taskIndex];
            task.status = status;

            // Move to "final da fila" (beginning of array since we reverse)
            this.tasks.splice(taskIndex, 1);
            this.tasks.unshift(task);

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
        localStorage.setItem('goals', JSON.stringify(this.goals));
        localStorage.setItem('studyHistory', JSON.stringify(this.studyHistory));
    },

    // Goal Methods
    toggleGoalModal(show) {
        this.goalModal.classList.toggle('active', show);
        if (show) this.goalInput.focus();
    },

    addGoal() {
        const text = this.goalInput.value.trim();
        const type = 'daily';

        if (!text) return;

        const newGoal = {
            id: Date.now(),
            text: text,
            type: type,
            status: 'pending', // pending, completed, failed
            date: new Date().toISOString().split('T')[0]
        };

        this.goals.push(newGoal);
        this.save();
        this.goalInput.value = '';
        this.toggleGoalModal(false);
        this.render();
        this.updateStats();
    },

    updateGoalStatus(id, status) {
        const goalIndex = this.goals.findIndex(g => g.id === id);
        if (goalIndex !== -1 && this.goals[goalIndex].status === 'pending') {
            const goal = this.goals[goalIndex];
            goal.status = status;

            // Move to "final da fila" (beginning of array since we reverse)
            this.goals.splice(goalIndex, 1);
            this.goals.unshift(goal);

            this.save();
            this.render();
            this.updateStats();
        }
    },

    deleteGoal(id) {
        if (confirm('Eliminar esta meta?')) {
            this.goals = this.goals.filter(g => g.id !== id);
            this.save();
            this.render();
            this.updateStats();
        }
    },

    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const activeTasks = this.tasks.filter(t => !t.archived);
        const todayTasks = activeTasks.filter(t => t.date === today);

        // Update welcome title with day name
        const welcomeDay = document.getElementById('welcome-day');
        if (welcomeDay) {
            const dateObj = new Date();
            const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
            const label = dayName.charAt(0).toUpperCase() + dayName.slice(1).split('-')[0];
            welcomeDay.innerText = label;
        }

        this.updateMotivationBanner();

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
        this.updateProgressCircles(completedCount, failedCount, pendingCount, todayTasks.length);

        // Dynamic Phrase
        this.updateDynamicPhrase(percent, todayTasks.length);

        // Goals Stats
        this.updateGoalsStats();
    },

    updateGoalsStats() {
        if (!this.goalsProgressFill) return;
        const today = new Date().toISOString().split('T')[0];
        const todayGoals = this.goals.filter(g => g.date === today);

        if (todayGoals.length === 0) {
            document.getElementById('goals-progress-container').style.display = 'none';
            return;
        }

        document.getElementById('goals-progress-container').style.display = 'block';
        const completed = todayGoals.filter(g => g.status === 'completed').length;
        const percent = Math.round((completed / todayGoals.length) * 100);

        this.goalsProgressFill.style.width = `${percent}%`;
        this.goalsProgressPercent.innerText = `${percent}%`;
    },

    renderGoals() {
        if (!this.goalsListContainer) return;

        if (this.goals.length === 0) {
            this.goalsListContainer.innerHTML = '<div class="empty-state"><p>Ainda não tens metas definidas. Clica no + para começar!</p></div>';
            return;
        }

        this.goalsListContainer.innerHTML = '';
        const today = new Date().toISOString().split('T')[0];

        // Group goals by date
        const groupedGoals = this.groupItemsByDate(this.goals);

        // Sort dates: today first, then descending
        const sortedDates = Object.keys(groupedGoals).sort((a, b) => {
            if (a === today) return -1;
            if (b === today) return 1;
            return b.localeCompare(a);
        });

        sortedDates.forEach(date => {
            const isToday = date === today;
            const dayGoals = groupedGoals[date];

            // Auto-fail past pending goals
            if (!isToday) {
                dayGoals.forEach(goal => {
                    if (goal.status === 'pending') {
                        goal.status = 'failed';
                    }
                });
                this.save();
            }

            const stats = {
                total: dayGoals.length,
                done: dayGoals.filter(g => g.status === 'completed').length,
                failed: dayGoals.filter(g => g.status === 'failed').length,
                pending: dayGoals.filter(g => g.status === 'pending').length
            };

            const groupDiv = document.createElement('div');
            groupDiv.className = `date-group ${isToday ? 'is-expanded' : 'is-history-group'}`;
            groupDiv.dataset.date = date;

            const headerDiv = document.createElement('div');
            headerDiv.className = `date-group-header ${!isToday ? 'clickable-header' : ''}`;

            headerDiv.innerHTML = `
                <div class="header-main-info">
                    <span class="date-group-title">${this.formatDateLabel(date)}</span>
                    ${!isToday ? `<i class="fas fa-chevron-down expand-icon"></i>` : ''}
                </div>
                <div class="date-group-stats">
                    <span class="stat-pill"><i class="fas fa-bullseye"></i> ${stats.total}</span>
                    <span class="stat-pill done"><i class="fas fa-check"></i> ${stats.done}</span>
                    <span class="stat-pill failed"><i class="fas fa-xmark"></i> ${stats.failed}</span>
                    ${stats.pending > 0 ? `<span class="stat-pill pending"><i class="fas fa-clock"></i> ${stats.pending}</span>` : ''}
                </div>
            `;

            if (!isToday) {
                headerDiv.addEventListener('click', () => {
                    groupDiv.classList.toggle('is-expanded');
                });
            }

            groupDiv.appendChild(headerDiv);

            const listDiv = document.createElement('div');
            listDiv.className = 'goals-group-items date-group-tasks';

            [...dayGoals].reverse().forEach(goal => {
                listDiv.appendChild(this.createGoalElement(goal));
            });

            groupDiv.appendChild(listDiv);
            this.goalsListContainer.appendChild(groupDiv);
        });
    },

    updateProgressCircles(done, failed, pending, total) {
        const doneCircle = document.getElementById('circle-done');
        const failedCircle = document.getElementById('circle-failed');
        const pendingCircle = document.getElementById('circle-pending');
        const doneText = document.getElementById('text-done');
        const failedText = document.getElementById('text-failed');
        const pendingText = document.getElementById('text-pending');

        if (!doneCircle) return;

        const donePercent = total ? (done / total) * 100 : 0;
        const failedPercent = total ? (failed / total) * 100 : 0;
        const pendingPercent = total ? (pending / total) * 100 : 0;

        const circumference = 213.6;

        requestAnimationFrame(() => {
            doneCircle.style.strokeDashoffset = circumference - (donePercent / 100) * circumference;
            failedCircle.style.strokeDashoffset = circumference - (failedPercent / 100) * circumference;
            if (pendingCircle) {
                pendingCircle.style.strokeDashoffset = circumference - (pendingPercent / 100) * circumference;
            }
        });

        doneText.innerText = `${done}`;
        failedText.innerText = `${failed}`;
        if (pendingText) pendingText.innerText = `${pending}`;
    },

    updateDynamicPhrase(percent, total) {
        const phraseContainer = document.getElementById('today-stats');
        if (!phraseContainer) return;

        const phrases = {
            empty: [
                "O dia está à tua espera! Que tal começar com uma pequena meta?",
                "Folha em branco... vamos escrever algo produtivo hoje?",
                "Pronto para dar o primeiro passo? Adiciona a tua primeira tarefa!"
            ],
            zero: [
                "Ainda não começaste? Não faz mal, o importante é começar agora!",
                "Sinto-me um pouco triste por não termos concluído nada ainda... mas acredito em ti!",
                "Vamos lá dar vida a esta lista? Só precisas de um pequeno impulso!"
            ],
            started: [
                "Bom começo! O motor já aqueceu, continua assim!",
                "Um passo de cada vez e chegamos lá. Força nisso!",
                "Já tens movimento! Não pares agora, estás no caminho certo."
            ],
            half: [
                "Já vais a meio caminho! Estás a dominar o dia hoje!",
                "Metade já está! O resto vai ser num piscar de olhos.",
                "Excelente progresso! Estás mais perto do fim do que do início."
            ],
            almost: [
                "Quase lá! Só mais um último esforço para a glória!",
                "Vê só o quanto já fizeste... falta tão pouco!",
                "Estás imparável! Termina isso e celebra o teu sucesso."
            ],
            done: [
                "INCRÍVEL! Completaste tudo! Agora descansa, tu mereces!",
                "Missão Cumprida! O teu eu de amanhã agradece o esforço de hoje.",
                "Perfeição! Limpaste a lista... que sensação maravilhosa, não é?"
            ]
        };

        const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
        let phrase = "";

        if (total === 0) {
            phrase = getRandom(phrases.empty);
        } else if (percent === 0) {
            phrase = "Sinto-me um pouco triste por não termos concluído nada ainda... mas acredito em ti!";
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

    updateMotivationBanner() {
        if (!this.motivationBanner) return;

        const motivationPhrases = [
            "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
            "Não pares até estares orgulhoso de ti mesmo.",
            "Foca no progresso, não na perfeição.",
            "A tua única competição é quem eras ontem.",
            "Grandes coisas nunca vêm de zonas de conforto.",
            "Tudo o que precisas é de um plano e coragem para seguir em frente.",
            "A disciplina é a ponte entre metas e realizações.",
            "Faz hoje o que o teu eu de amanhã vai agradecer.",
            "Acredita que podes e já estás a meio caminho.",
            "O segredo de avançar é começar."
        ];

        // Change motivation once per session or on render?
        // Let's pick a random one if empty or just occasionally
        if (!this.motivationBanner.innerText || this.motivationBanner.innerText === "Tudo o que precisas é de um plano e coragem para seguir em frente.") {
            // Priority to the requested phrase
            this.motivationBanner.innerText = "Tudo o que precisas é de um plano e coragem para seguir em frente.";
        }
    },

    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.setTheme(savedTheme === 'dark');
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark);
        }
    },

    toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        this.setTheme(!isDark);
    },

    setTheme(isDark) {
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        if (this.darkModeCheck) this.darkModeCheck.checked = isDark;

        // Update header icon
        const icon = this.themeToggle ? this.themeToggle.querySelector('i') : null;
        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }

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
                this.showNotification('DaySignal', 'As notificacoes estao ativadas');
            }
        } else if (Notification.permission === 'denied') {
            alert('Por favor, ative as notificações nas definições do seu navegador.');
        }
    },

    startNotificationInterval() {
        // Run every 5 minutes (300,000 ms)
        setInterval(() => {
            const today = new Date().toISOString().split('T')[0];
            const pendingTasks = this.tasks.filter(t => !t.archived && t.date === today && t.status === 'pending');
            const pendingGoals = this.goals.filter(g => g.date === today && g.status === 'pending');
            const totalPending = pendingTasks.length + pendingGoals.length;
            this.checkNotificationTrigger(totalPending, true);
        }, 300000);
    },

    checkNotificationTrigger(pendingCount, fromInterval = false) {
        if (!('serviceWorker' in navigator)) return;

        if (Notification.permission === 'granted' && pendingCount > 2) {
            if (fromInterval) {
                this.showNotification('DaySignal (Lembrete)', `Ainda tens ${pendingCount} tarefas pendentes. Vamos conclui-las?`);
            } else {
                const lastNotify = localStorage.getItem('last_notify_count');
                if (lastNotify !== pendingCount.toString()) {
                    this.showNotification('DaySignal', `Tens ${pendingCount} tarefas pendentes. Vamos focar?`);
                    localStorage.setItem('last_notify_count', pendingCount.toString());
                }
            }
        }
    },

    async testNotification() {
        if (!window.isSecureContext) {
            alert('Aviso: As notificações podem não funcionar em ligações não seguras (HTTP). Tente usar localhost ou HTTPS.');
        }

        if (Notification.permission !== 'granted') {
            alert('Por favor, ative as notificações primeiro.');
            return;
        }

        const originalText = this.testPushBtn.innerText;
        this.testPushBtn.innerText = 'Enviando...';
        this.testPushBtn.disabled = true;

        try {
            await this.showNotification('Teste DaySignal', 'Esta e uma notificacao de teste');
            this.testPushBtn.innerText = 'Enviado!';
            this.testPushBtn.style.color = 'var(--success)';
        } catch (err) {
            console.error('Erro ao enviar notificação:', err);
            this.testPushBtn.innerText = 'Erro!';
            this.testPushBtn.style.color = 'var(--danger)';
        }

        setTimeout(() => {
            this.testPushBtn.innerText = originalText;
            this.testPushBtn.disabled = false;
            this.testPushBtn.style.color = '';
        }, 3000);
    },

    async showNotification(title, body) {
        if (!('serviceWorker' in navigator)) {
            console.error('Service Worker não suportado neste navegador.');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                body: body,
                icon: './android-chrome-192x192.png',
                badge: './favicon-32x32.png',
                vibrate: [100, 50, 100],
                data: { dateOfArrival: Date.now() }
            });
        } catch (err) {
            console.error('Falha ao mostrar notificação via Service Worker:', err);
            throw err;
        }
    },

    render() {
        const today = new Date().toISOString().split('T')[0];
        const activeTasks = this.tasks.filter(t => !t.archived);

        // Home List (Last 3)
        const recent = [...activeTasks].reverse().slice(0, 3);
        this.homeList.innerHTML = recent.length ? '' : '<p class="text-muted">Nenhuma tarefa recente.</p>';
        recent.forEach(t => this.homeList.appendChild(this.createTaskElement(t, true)));

        // Full List - Grouped by Date
        this.fullList.innerHTML = '';
        if (activeTasks.length === 0) {
            this.fullList.innerHTML = '<p class="text-muted">Tudo limpo por aqui! Adicione uma tarefa.</p>';
        } else {
            const groups = this.groupItemsByDate(activeTasks);
            const todayStr = new Date().toISOString().split('T')[0];
            const tomorrowStr = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];

            const sortedDates = Object.keys(groups).sort((a, b) => {
                if (a === todayStr) return -1;
                if (b === todayStr) return 1;
                if (a === tomorrowStr) return -1;
                if (b === tomorrowStr) return 1;
                return b.localeCompare(a);
            });
            sortedDates.forEach(date => {
                const dayTasks = groups[date];
                const stats = {
                    total: dayTasks.length,
                    done: dayTasks.filter(t => t.status === 'completed').length,
                    failed: dayTasks.filter(t => t.status === 'failed').length,
                    pending: dayTasks.filter(t => t.status === 'pending').length
                };

                const isToday = date === todayStr;
                const isTomorrow = date === tomorrowStr;
                const isHistory = !isToday && !isTomorrow;

                const groupDiv = document.createElement('div');
                groupDiv.className = `date-group ${isTomorrow ? 'is-tomorrow-group' : ''} ${isHistory ? 'is-history-group' : 'is-expanded'}`;
                groupDiv.dataset.date = date;

                const headerDiv = document.createElement('div');
                headerDiv.className = `date-group-header ${isHistory ? 'clickable-header' : ''}`;

                let dateLabel = this.formatDateLabel(date);

                headerDiv.innerHTML = `
                    <div class="header-main-info">
                        <span class="date-group-title">${dateLabel}</span>
                        ${isHistory ? `<i class="fas fa-chevron-down expand-icon"></i>` : ''}
                    </div>
                    <div class="date-group-stats">
                        <span class="stat-pill"><i class="fas fa-list"></i> ${stats.total}</span>
                        <span class="stat-pill done"><i class="fas fa-check"></i> ${stats.done}</span>
                        <span class="stat-pill failed"><i class="fas fa-xmark"></i> ${stats.failed}</span>
                        ${stats.pending > 0 ? `<span class="stat-pill pending"><i class="fas fa-clock"></i> ${stats.pending}</span>` : ''}
                    </div>
                `;

                if (isHistory) {
                    headerDiv.addEventListener('click', () => {
                        groupDiv.classList.toggle('is-expanded');
                    });
                }

                groupDiv.appendChild(headerDiv);

                const listDiv = document.createElement('div');
                listDiv.className = 'tasks-mini-list date-group-tasks';

                [...dayTasks].reverse().forEach(t => {
                    listDiv.appendChild(this.createTaskElement(t));
                });

                groupDiv.appendChild(listDiv);
                this.fullList.appendChild(groupDiv);
            });
        }

        // Render Goals in Tasks Screen
        this.renderGoals();

        // Calendar
        if (this.currentScreen === 'calendar') this.renderCalendar();

        // Study
        if (this.currentScreen === 'study') this.renderStudyHistory(false);
    },


    createGoalElement(goal) {
        const div = document.createElement('div');
        const isFinalized = goal.status !== 'pending';
        div.className = `goal-card-premium ${goal.status === 'completed' ? 'completed' : ''} ${goal.status === 'failed' ? 'not-completed' : ''}`;

        let statusIcon = '';
        if (goal.status === 'completed') statusIcon = '<i class="fas fa-check-circle success"></i>';
        else if (goal.status === 'failed') statusIcon = '<i class="fas fa-times-circle danger"></i>';

        div.innerHTML = `
            <div class="goal-card-main">
                <div class="goal-info">
                    <h4 class="goal-title">${goal.text}</h4>
                </div>
                <div class="goal-status-display">
                    ${statusIcon}
                </div>
            </div>
            <div class="goal-controls">
                ${!isFinalized ? `
                    <button class="btn-goal-success-small" onclick="app.updateGoalStatus(${goal.id}, 'completed')" title="Concluir">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-goal-fail-small" onclick="app.updateGoalStatus(${goal.id}, 'failed')" title="Não Fiz Hoje">
                        <i class="fas fa-xmark"></i>
                    </button>
                ` : ''}
                <button class="btn-goal-delete-small" onclick="app.deleteGoal(${goal.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        return div;
    },

    createTaskElement(item, mini = false, isGoal = false) {
        const div = document.createElement('div');
        const isFinalized = item.status !== 'pending';
        const goalTypeClass = isGoal ? `goal-${item.type}` : '';
        div.className = `task-item ${isGoal ? 'goal-style' : ''} ${goalTypeClass} ${item.status === 'completed' ? 'completed' : ''} ${item.status === 'failed' ? 'not-completed' : ''}`;

        const today = new Date().toISOString().split('T')[0];
        const isFuture = item.date > today;

        let actionsHtml = '';
        if (isFinalized) {
            const statusClass = item.status === 'completed' ? 'btn-status-done' : 'btn-status-failed';
            actionsHtml = `
                <div class="task-actions">
                    <button class="btn-action btn-delete ${statusClass}" style="width: 100%" onclick="app.${isGoal ? 'deleteGoal' : 'deleteTask'}(${item.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
        } else if (isFuture && !isGoal) {
            // No completion buttons for future tasks
            actionsHtml = `
                <div class="task-actions">
                    <p class="text-mini-info"><i class="fas fa-lock"></i> Disponível em breve</p>
                </div>
            `;
        } else {
            actionsHtml = `
                <div class="task-actions">
                    <button class="btn-action btn-done" onclick="app.${isGoal ? 'updateGoalStatus' : 'updateTaskStatus'}(${item.id}, 'completed')">
                        <i class="fas fa-check"></i> Concluir
                    </button>
                    <button class="btn-action btn-todo" onclick="app.${isGoal ? 'updateGoalStatus' : 'updateTaskStatus'}(${item.id}, 'failed')">
                        <i class="fas fa-xmark"></i> Não Concluir
                    </button>
                </div>
            `;
        }

        const typeLabel = (isGoal && item.type) ? `<span class="goal-type-badge">${item.type === 'daily' ? 'Diária' : 'Semanal'}</span>` : '';

        div.innerHTML = `
            <div class="task-content">
                <span class="task-text">
                    ${typeLabel} ${item.text}
                </span>
                <div class="task-meta-actions">
                    <span class="task-date">${this.formatRelativeDate(item.date)}</span>
                    ${(!mini && !isFinalized && !isGoal) ? `
                        <button class="btn-action btn-move-up" onclick="app.moveTaskUp(${item.id})">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                    ` : ''}
                    ${(!mini && !isFinalized) ? `<button class="btn-action btn-delete" onclick="app.${isGoal ? 'deleteGoal' : 'deleteTask'}(${item.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
            ${actionsHtml}
        `;

        return div;
    },

    renderCalendar() {
        this.calendarContainer.innerHTML = `
            <div class="calendar-header-box">
                <h3 class="premium-title">O Teu Histórico</h3>
                <p class="premium-subtitle">Produtividade (Tarefas + Metas)</p>
            </div>
            <div class="cal-grid-premium"></div>
            <div class="cal-legend-premium">
                <span>Baixa</span>
                <div class="legend-scale-premium">
                    <div class="scale-box" style="background: rgba(255, 107, 0, 0.1)"></div>
                    <div class="scale-box" style="background: rgba(255, 107, 0, 0.4)"></div>
                    <div class="scale-box" style="background: rgba(255, 107, 0, 0.7)"></div>
                    <div class="scale-box" style="background: rgba(255, 107, 0, 1.0)"></div>
                </div>
                <span>Alta</span>
            </div>
            <div class="calendar-footer-premium">
                <p><i class="fas fa-circle-info"></i> O histórico inclui Tarefas e Metas Diárias.</p>
            </div>
        `;
        const grid = this.calendarContainer.querySelector('.cal-grid-premium');

        // Show last 6 days + Today + Tomorrow (8 slots)
        for (let i = 6; i >= -1; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const isToday = i === 0;
            const isTomorrow = i === -1;

            const dayTasks = this.tasks.filter(t => t.date === dateStr && !t.archived);
            const dayGoals = this.goals.filter(g => g.date === dateStr);

            const totalItems = dayTasks.length + dayGoals.length;
            const completedItems = dayTasks.filter(t => t.status === 'completed').length +
                dayGoals.filter(g => g.status === 'completed').length;

            let percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

            const dayEl = document.createElement('div');
            dayEl.className = `cal-day-premium ${isToday ? 'is-today' : ''} ${isTomorrow ? 'is-tomorrow' : ''}`;

            // Background intensity
            let intensity = 0;
            if (totalItems > 0) {
                if (isTomorrow) intensity = 0.2; // Preview style for tomorrow
                else if (percent === 0) intensity = 0.1;
                else if (percent < 50) intensity = 0.4;
                else if (percent < 100) intensity = 0.7;
                else intensity = 1.0;
            } else {
                intensity = 0.05;
            }

            dayEl.style.setProperty('--intensity', intensity);

            let labelText = '';
            if (isToday) labelText = 'Hoje';
            else if (isTomorrow) labelText = 'Amanhã';
            else {
                const dayShort = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                labelText = dayShort.charAt(0).toUpperCase() + dayShort.slice(1);
            }

            dayEl.innerHTML = `
                <span class="cal-label-premium">${labelText}</span>
                <span class="cal-date-premium">${d.getDate()}</span>
                <div class="cal-indicator-premium" style="opacity: ${totalItems ? 1 : 0.3}"></div>
                <div class="cal-tooltip-premium">
                    <span class="tooltip-title">${isTomorrow ? 'Planeado' : 'Concluído'}</span>
                    <span class="tooltip-val">${percent}%</span>
                    <div class="tooltip-details">
                        <span>${dayTasks.length} Tarefas</span>
                        <span>${dayGoals.length} Metas</span>
                    </div>
                </div>
            `;
            grid.appendChild(dayEl);
        }
    },

    formatRelativeDate(dateStr) {
        const today = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        if (dateStr === today) return 'Hoje';
        if (dateStr === yesterday) return 'Ontem';

        const date = new Date(dateStr);
        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
        return dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('.', '');
    },

    formatDateLabel(dateStr) {
        const today = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        if (dateStr === today) return 'Hoje';
        if (dateStr === yesterday) return 'Ontem';

        const date = new Date(dateStr);
        const day = date.getDate();
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${day} de ${monthNames[date.getMonth()]} `;
    },

    groupItemsByDate(items) {
        const groups = {};
        items.forEach(item => {
            if (!groups[item.date]) groups[item.date] = [];
            groups[item.date].push(item);
        });
        return groups;
    },

    // Study Methods
    async generateStudy() {
        const input = this.studyInput.value.trim();
        if (!input && this.selectedMedia.length === 0) {
            alert('Por favor, escreve algo ou carrega uma imagem/áudio para estudar.');
            return;
        }

        if (!this.openRouterKey) {
            alert('Por favor, define a tua chave API do OpenRouter nas Configurações.');
            this.navigateTo('settings');
            return;
        }

        this.studyBtn.disabled = true;
        this.studyLoading.style.display = 'flex';
        this.studyResult.style.display = 'none';

        try {
            // Prepare messages for multimodal API
            let content = [];

            // Add media FIRST
            if (this.selectedMedia.length > 0) {
                this.selectedMedia.forEach(media => {
                    if (media.type === 'image') {
                        content.push({
                            type: 'image_url',
                            image_url: { url: `data:${media.mimeType};base64,${media.data}` }
                        });
                    } else if (media.type === 'audio') {
                        // OpenRouter/OpenAI compatible audio format
                        content.push({
                            type: 'input_audio',
                            input_audio: {
                                data: media.data,
                                format: media.mimeType.split('/')[1] || 'webm'
                            }
                        });
                    }
                });
            }

            // Add text or fallback prompt
            if (input) {
                content.push({ type: 'text', text: input });
            } else if (this.selectedMedia.length > 0) {
                content.push({ type: 'text', text: 'Analisa este ficheiro e ajuda-me a estudar.' });
            }

            // Simple text-only structure if no media
            if (this.selectedMedia.length === 0) {
                content = input;
            }

            const callAPI = async (modelId) => {
                const body = JSON.stringify({
                    model: modelId,
                    messages: [
                        {
                            role: 'system',
                            content: `És um professor assistente especializado em ajudar alunos a estudar. 
                            IMPORTANTE: 
                            1. Responde SEMPRE em Português de Portugal.
                            2. NÃO uses blocos de código markdown (como \`\`\`html). 
                            3. Usa HTML rico para a estrutura: <h4> para títulos, <p> para explicações, <ul>/<li> para listas.
                            4. Para fórmulas matemáticas, usa a tag <code> ou <mark> para destaque, ou coloca-as em parágrafos separados para leitura fácil.
                            5. Divide a resposta em 3 secções claras: <h4>Explicação</h4>, <h4>Exercícios</h4> e <h4>Soluções</h4>.`
                        },
                        {
                            role: 'user',
                            content: content
                        }
                    ]
                });

                console.log(`DaySignal: Tentando com o modelo ${modelId}...`);
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.openRouterKey.trim()}`,
                        'HTTP-Referer': 'https://daysignal.app',
                        'X-Title': 'DaySignalStudy'
                    },
                    body: body
                });

                if (!response.ok) {
                    const errJson = await response.json().catch(() => ({}));
                    console.error(`API Error (${modelId}):`, JSON.stringify(errJson, null, 2));
                    throw { status: response.status, data: errJson };
                }
                return await response.json();
            };

            let data;
            try {
                // Primary: Gemini 2.0 Flash (Stable)
                data = await callAPI('google/gemini-2.0-flash-001');
            } catch (err) {
                if (err.status === 401) throw err; // Don't fallback on auth errors
                // Secondary: Gemini 1.5 Flash (Most reliable fallback)
                console.warn('DaySignal: Falha com 2.0. Tentando fallback para 1.5...');
                data = await callAPI('google/gemini-flash-1.5');
            }

            if (data.choices && data.choices[0]) {
                const aiResponse = data.choices[0].message.content;
                this.displayStudyResult(aiResponse, input || 'Análise de Media');
                this.clearSelectedMedia(); // Clear after success
            } else {
                throw new Error(data.error?.message || 'Resposta inválida da API');
            }
        } catch (error) {
            console.error('Erro ao gerar estudo:', error);

            let finalMsg = "Erro ao gerar estudo. ";
            if (error.status === 401) {
                finalMsg += "Verifica se a tua chave API do OpenRouter e valida e se tens saldo.";
            } else if (error.status === 500) {
                finalMsg += "O servidor do OpenRouter falhou. Tenta novamente mais tarde.";
            } else {
                finalMsg += error.data?.error?.message || error.message || "Erro desconhecido.";
            }

            alert(finalMsg);
        } finally {
            this.studyBtn.disabled = false;
            this.studyLoading.style.display = 'none';
        }
    },

    handleMediaUpload(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        // Visual limit
        const hasAudio = this.selectedMedia.some(m => m.type === 'audio');
        if (type === 'audio' && hasAudio) {
            alert('Podes carregar apenas 1 ficheiro de áudio por pedido.');
            return;
        }
        if (this.selectedMedia.length >= 2) {
            alert('Podes carregar no máximo 2 ficheiros por pedido.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target.result.split(',')[1];
            const mediaItem = {
                id: Date.now(),
                type: type,
                data: base64Data,
                mimeType: file.type,
                previewUrl: type === 'image' ? e.target.result : null
            };

            this.selectedMedia.push(mediaItem);
            this.renderMediaPreviews();
        };
        reader.readAsDataURL(file);
    },

    async toggleVoiceRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    },

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const base64Data = await this.blobToBase64(audioBlob);

                const hasAudio = this.selectedMedia.some(m => m.type === 'audio');
                if (hasAudio) {
                    alert('Já tens um ficheiro de áudio. Remove-o antes de gravar um novo.');
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                this.selectedMedia.push({
                    id: Date.now(),
                    type: 'audio',
                    data: base64Data,
                    mimeType: 'audio/webm',
                    previewUrl: null
                });

                this.renderMediaPreviews();
                stream.getTracks().forEach(track => track.stop()); // Stop mic
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.updateRecordingUI(true);

            this.recordingInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
                const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
                const secs = String(elapsed % 60).padStart(2, '0');
                this.recordingTimer.innerText = `${mins}:${secs}`;
            }, 1000);

        } catch (err) {
            console.error('Erro ao aceder ao microfone:', err);
            alert('Não foi possível aceder ao microfone. Verifica as permissões.');
        }
    },

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            clearInterval(this.recordingInterval);
            this.updateRecordingUI(false);
        }
    },

    updateRecordingUI(active) {
        if (active) {
            this.voiceRecordBtn.classList.add('recording');
            this.recordingWaves.style.display = 'flex';
        } else {
            this.voiceRecordBtn.classList.remove('recording');
            this.recordingWaves.style.display = 'none';
            this.recordingTimer.innerText = '00:00';
        }
    },

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    renderMediaPreviews() {
        this.studyMediaPreview.innerHTML = '';
        this.studyMediaPreview.style.display = this.selectedMedia.length > 0 ? 'flex' : 'none';
        this.clearMediaBtn.style.display = this.selectedMedia.length > 0 ? 'block' : 'none';

        this.selectedMedia.forEach((media) => {
            const div = document.createElement('div');
            div.className = `preview-item ${media.type}-preview`;

            if (media.type === 'image') {
                div.innerHTML = `<img src="${media.previewUrl}">`;
            } else {
                div.innerHTML = `<i class="fas fa-file-audio"></i><span>Áudio</span>`;
            }

            // Remove option
            div.onclick = () => {
                this.selectedMedia = this.selectedMedia.filter(m => m.id !== media.id);
                this.renderMediaPreviews();
            };

            this.studyMediaPreview.appendChild(div);
        });
    },

    clearSelectedMedia() {
        this.selectedMedia = [];
        this.renderMediaPreviews();
        if (this.studyImageInput) this.studyImageInput.value = '';
        if (this.studyAudioInput) this.studyAudioInput.value = '';
    },

    displayStudyResult(content, originalInput) {
        this.studyContent.innerHTML = content;
        this.studyResult.style.display = 'block';

        // Add to history
        const newItem = {
            id: Date.now(),
            input: originalInput,
            result: content,
            timestamp: new Date().toISOString()
        };

        this.studyHistory.unshift(newItem);
        if (this.studyHistory.length > 20) this.studyHistory.pop(); // Keep last 20
        this.save();
        this.renderStudyHistory();
    },

    clearStudyResult() {
        this.studyResult.style.display = 'none';
        this.studyContent.innerHTML = '';
        this.studyInput.value = '';
    },

    renderStudyHistory() {
        if (!this.studyHistoryMiniContainer) return;

        if (this.studyHistory.length === 0) {
            this.studyHistoryMiniContainer.innerHTML = '<p class="text-muted">Ainda não tens histórico.</p>';
            return;
        }

        this.studyHistoryMiniContainer.innerHTML = '';

        // Show only last 2 items on the main study screen
        const itemsToRender = this.studyHistory.slice(0, 2);

        itemsToRender.forEach(item => {
            const card = document.createElement('div');
            card.className = 'history-item-card';

            const title = item.input || item.title || 'Sem título';
            const timestamp = item.timestamp || item.date;

            card.innerHTML = `
                <div class="history-item-info">
                    <h5>${title}</h5>
                    <small>${this.formatStudyDate(timestamp)}</small>
                </div>
                <i class="fas fa-chevron-right"></i>
            `;

            card.onclick = () => this.openStudyHistoryModal(item);
            this.studyHistoryMiniContainer.appendChild(card);
        });

        if (this.viewAllHistoryBtn) {
            this.viewAllHistoryBtn.style.display = this.studyHistory.length > 2 ? 'block' : 'none';
        }
    },

    formatStudyDate(isoString) {
        if (!isoString) return 'Data desconhecida';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return 'Data inválida';

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const dateStr = date.toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (dateStr === todayStr) return 'Hoje';
        if (dateStr === yesterdayStr) return 'Ontem';

        return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
    },

    openFullHistoryModal() {
        if (!this.studyFullHistoryModal) return;
        this.renderFullHistoryList();
        this.studyFullHistoryModal.style.display = 'flex';

        // Close on overlay click
        this.studyFullHistoryModal.onclick = (e) => {
            if (e.target === this.studyFullHistoryModal) this.closeFullHistoryModal();
        };
    },

    closeFullHistoryModal() {
        if (this.studyFullHistoryModal) {
            this.studyFullHistoryModal.style.display = 'none';
        }
    },

    renderFullHistoryList() {
        if (!this.fullHistoryList) return;
        this.fullHistoryList.innerHTML = '';

        if (this.studyHistory.length === 0) {
            this.fullHistoryList.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">Ainda não tens histórico.</p>';
            return;
        }

        this.studyHistory.forEach(item => {
            const card = document.createElement('div');
            card.className = 'history-item-card';

            const title = item.input || item.title || 'Sem título';
            const timestamp = item.timestamp || item.date;

            card.innerHTML = `
                <div class="history-item-info">
                    <h5>${title}</h5>
                    <small>${this.formatStudyDate(timestamp)}</small>
                </div>
                <div class="history-item-actions">
                    <button class="btn-delete-history" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                    <i class="fas fa-chevron-right"></i>
                </div>
            `;

            // Separate clicks
            const info = card.querySelector('.history-item-info');
            const delBtn = card.querySelector('.btn-delete-history');

            info.onclick = (e) => {
                e.stopPropagation();
                this.openStudyHistoryModal(item);
            };

            delBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteStudyHistoryItem(item.id);
            };

            card.onclick = () => this.openStudyHistoryModal(item);

            this.fullHistoryList.appendChild(card);
        });
    },

    deleteStudyHistoryItem(id) {
        if (!confirm('Eliminar esta conversa do histórico?')) return;

        this.studyHistory = this.studyHistory.filter(item => item.id !== id);
        this.save();
        this.renderStudyHistory();
        this.renderFullHistoryList(); // Update the modal list

        if (this.studyHistory.length === 0) {
            this.closeFullHistoryModal();
        }
    },

    openStudyHistoryModal(item) {
        if (!this.studyHistoryModal) return;

        const title = item.input || item.title || 'Sem título';
        const result = item.result || item.content || 'Sem conteúdo';

        this.historyModalTitle.innerText = title;
        this.historyModalContent.innerHTML = result;
        this.studyHistoryModal.style.display = 'flex';

        // Close on overlay click
        this.studyHistoryModal.onclick = (e) => {
            if (e.target === this.studyHistoryModal) this.closeStudyHistoryModal();
        };
    },

    closeStudyHistoryModal() {
        if (this.studyHistoryModal) {
            this.studyHistoryModal.style.display = 'none';
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
