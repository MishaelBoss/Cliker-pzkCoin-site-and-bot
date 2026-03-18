const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

class QuestSystem {
    constructor() {
        this.coins = 0;
        this.quests = [
            {
                id: 1,
                title: 'НОВИЧОК',
                description: 'Сделайте 100 кликов',
                type: 'clicks',
                target: 100,
                progress: 0,
                reward: 50,
                completed: false,
                claimed: false
            },
            {
                id: 2,
                title: 'ЭНЕРГИЯ',
                description: 'Потратьте 500 энергии',
                type: 'energy',
                target: 500,
                progress: 0,
                reward: 100,
                completed: false,
                claimed: false
            },
            {
                id: 3,
                title: 'БОГАТСТВО',
                description: 'Накопите 1000 монет',
                type: 'coins',
                target: 1000,
                progress: 0,
                reward: 200,
                completed: false,
                claimed: false
            },
            {
                id: 4,
                title: 'АЗАРТ',
                description: 'Сыграйте в рулетку 5 раз',
                type: 'roulette',
                target: 5,
                progress: 0,
                reward: 150,
                completed: false,
                claimed: false
            },
            {
                id: 5,
                title: 'УСИЛИТЕЛЬ',
                description: 'Купите 3 буста',
                type: 'boosts',
                target: 3,
                progress: 0,
                reward: 300,
                completed: false,
                claimed: false
            },
            {
                id: 6,
                title: 'МАГНАТ',
                description: 'Накопите 5000 монет',
                type: 'coins',
                target: 5000,
                progress: 0,
                reward: 500,
                completed: false,
                claimed: false
            },
            {
                id: 7,
                title: 'ЭНЕРДЖАЙЗЕР',
                description: 'Зарядите энергию 3 раза',
                type: 'charge',
                target: 3,
                progress: 0,
                reward: 250,
                completed: false,
                claimed: false
            },
            {
                id: 8,
                title: 'КЛИКЕР',
                description: 'Сделайте 1000 кликов',
                type: 'clicks',
                target: 1000,
                progress: 0,
                reward: 400,
                completed: false,
                claimed: false
            }
        ];
        this.lastReset = new Date().toISOString();
        this.load();
        this.checkReset();
    }

    load() {
        const saved = localStorage.getItem('pzkQuests');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.quests = data.quests || this.quests;
                this.lastReset = data.lastReset || new Date().toISOString();
                this.coins = data.coins || 0;
            } catch (e) {
                console.error('Load error', e);
            }
        }
        this.syncWithMainGame();
    }

    save() {
        const data = {
            quests: this.quests,
            lastReset: this.lastReset,
            coins: this.coins
        };
        localStorage.setItem('pzkQuests', JSON.stringify(data));
    }

    syncWithMainGame() {
        const mainState = localStorage.getItem('pzkNeonState');
        if (mainState) {
            try {
                const data = JSON.parse(mainState);
                this.coins = data.coins || 0;
                
                // Обновляем прогресс заданий на основе данных из mainState
                this.quests.forEach(quest => {
                    if (!quest.completed && !quest.claimed) {
                        switch(quest.type) {
                            case 'clicks':
                                quest.progress = Math.min(data.clickCount || 0, quest.target);
                                break;
                            case 'energy':
                                const energySpent = (data.maxEnergy || 100) - (data.currentEnergy || 0);
                                quest.progress = Math.min(energySpent, quest.target);
                                break;
                            case 'coins':
                                quest.progress = Math.min(data.coins || 0, quest.target);
                                break;
                            // Другие типы обновляются при событиях
                        }
                        
                        if (quest.progress >= quest.target) {
                            quest.completed = true;
                        }
                    }
                });
            } catch (e) {
                console.error('Sync error', e);
            }
        }
    }

    checkReset() {
        const last = new Date(this.lastReset);
        const now = new Date();
        
        // Сброс каждый день в 00:00
        if (now.getDate() !== last.getDate() || 
            now.getMonth() !== last.getMonth() || 
            now.getFullYear() !== last.getFullYear()) {
            this.resetQuests();
        }
    }

    resetQuests() {
        this.quests.forEach(quest => {
            quest.progress = 0;
            quest.completed = false;
            quest.claimed = false;
        });
        this.lastReset = new Date().toISOString();
        this.save();
    }

    updateProgress(type, amount = 1) {
        let updated = false;
        this.quests.forEach(quest => {
            if (!quest.completed && !quest.claimed && quest.type === type) {
                quest.progress = Math.min(quest.progress + amount, quest.target);
                if (quest.progress >= quest.target) {
                    quest.completed = true;
                }
                updated = true;
            }
        });
        if (updated) {
            this.save();
            this.render();
        }
    }

    claimReward(questId) {
        const quest = this.quests.find(q => q.id === questId);
        if (quest && quest.completed && !quest.claimed) {
            quest.claimed = true;
            this.coins += quest.reward;
            
            // Обновляем монеты в главной игре
            const mainState = localStorage.getItem('pzkNeonState');
            if (mainState) {
                try {
                    const data = JSON.parse(mainState);
                    data.coins = (data.coins || 0) + quest.reward;
                    localStorage.setItem('pzkNeonState', JSON.stringify(data));
                } catch (e) {
                    console.error('Update main game error', e);
                }
            }
            
            this.save();
            this.render();
            return true;
        }
        return false;
    }

    getTimeUntilReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const diff = tomorrow - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    render() {
        const activeQuestsEl = document.getElementById('activeQuests');
        const completedQuestsEl = document.getElementById('completedQuests');
        const coinBalanceEl = document.getElementById('coinBalance');
        const resetTimerEl = document.getElementById('resetTimer');
        
        if (coinBalanceEl) {
            coinBalanceEl.textContent = this.coins;
        }
        
        if (resetTimerEl) {
            resetTimerEl.textContent = this.getTimeUntilReset();
            setInterval(() => {
                resetTimerEl.textContent = this.getTimeUntilReset();
            }, 1000);
        }
        
        if (activeQuestsEl) {
            const activeQuests = this.quests.filter(q => !q.claimed);
            activeQuestsEl.innerHTML = activeQuests.map(quest => this.renderQuest(quest)).join('');
        }
        
        if (completedQuestsEl) {
            const completedQuests = this.quests.filter(q => q.claimed);
            completedQuestsEl.innerHTML = completedQuests.map(quest => this.renderQuest(quest, true)).join('');
        }
    }

    renderQuest(quest, isCompleted = false) {
        const progressPercent = (quest.progress / quest.target) * 100;
        
        return `
            <div class="quest-item ${quest.claimed ? 'completed' : ''}">
                <div class="quest-title">${quest.title}</div>
                <div class="quest-description">${quest.description}</div>
                
                ${!quest.claimed ? `
                    <div class="quest-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="progress-text">${quest.progress}/${quest.target}</div>
                    </div>
                ` : ''}
                
                <div class="quest-reward">
                    <span class="reward-icon">💰</span>
                    <span class="reward-amount">+${quest.reward} PZK</span>
                </div>
                
                ${!quest.claimed && quest.completed ? `
                    <button class="quest-button" onclick="window.questSystem.claimReward(${quest.id})">
                        ПОЛУЧИТЬ НАГРАДУ
                    </button>
                ` : ''}
                
                ${!quest.claimed && !quest.completed ? `
                    <button class="quest-button" disabled>
                        В ПРОЦЕССЕ
                    </button>
                ` : ''}
                
                ${quest.claimed ? `
                    <button class="quest-button completed" disabled>
                        ВЫПОЛНЕНО
                    </button>
                ` : ''}
            </div>
        `;
    }
}

// Инициализация
const questSystem = new QuestSystem();

// Делаем глобально доступным для кнопок
window.questSystem = questSystem;

// Обработчики вкладок
document.getElementById('activeTab').addEventListener('click', () => {
    document.getElementById('activeTab').classList.add('active');
    document.getElementById('completedTab').classList.remove('active');
    document.getElementById('activeQuests').style.display = 'flex';
    document.getElementById('completedQuests').style.display = 'none';
});

document.getElementById('completedTab').addEventListener('click', () => {
    document.getElementById('completedTab').classList.add('active');
    document.getElementById('activeTab').classList.remove('active');
    document.getElementById('completedQuests').style.display = 'flex';
    document.getElementById('activeQuests').style.display = 'none';
});

// Первоначальный рендер
questSystem.render();

// Синхронизация с главной игрой каждые 2 секунды
setInterval(() => {
    questSystem.syncWithMainGame();
    questSystem.save();
    questSystem.render();
}, 2000);
