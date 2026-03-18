const tg = window.Telegram.WebApp;
const user = tg.initDataUnsafe?.user;

tg.ready();
tg.expand();

// GitHub Configuration - имя секрета изменено
const GITHUB_REPO = 'MishaelBoss/test_bot';
const GITHUB_FILE_PATH = 'stats.json';

// Функция для получения токена (будет подменяться при сборке)
async function getGithubToken() {
    // В разработке используем localStorage или prompt
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return localStorage.getItem('pzk_github_token') || prompt('Введите GitHub токен:');
    }
    // На продакшене токен будет вставлен через GitHub Actions
    return '${PZK_TOKEN}'; // Плейсхолдер для замены
}

async function syncProgressWithDatabase(coins) {
    if (!user || coins === undefined) return;

    try {
        const url = 'https://4c5b-50-7-176-138.ngrok-free.app';

        await fetch(`${url}/api/sync-coins/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegram_id: user.id,
                coins: coins
            }),
            mode: 'cors',
            keepalive: true 
        });
    } catch (e) {
        console.log("Sync background...");
    }
}

class GameState {
    constructor() {
        this.coins = 1000;
        this.multiplier = 1;
        this.afkActive = false;
        this.afkLevel = 1;
        this.afkBaseGain = 1;
        this.randomBoostActive = false;
        this.clickCount = 0;
        this.totalClicks = 0;
        this.powerBoost = 0;
        this.luckBoost = 0;
        this.superAfkActive = false;
        this.magnetActive = false;
        this.maxEnergy = 100;
        this.currentEnergy = 100;
        this.energyLevel = 1;
        this.energyMultiplier = 2;
        this.minigameAttempts = 1;
        this.minigameLastPlayed = null;
        this.playerName = '';
        this.clickCounter = 0;
        this.load();
        this.loadStatsFromGitHub();
    }

    load() {
        const saved = localStorage.getItem('pzkNeonState');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.coins = data.coins || 0;
                this.multiplier = data.multiplier || 1;
                this.afkActive = data.afkActive || false;
                this.afkLevel = data.afkLevel || 1;
                this.afkBaseGain = data.afkBaseGain || 1;
                this.randomBoostActive = data.randomBoostActive || false;
                this.clickCount = data.clickCount || 0;
                this.totalClicks = data.totalClicks || 0;
                this.powerBoost = data.powerBoost || 0;
                this.luckBoost = data.luckBoost || 0;
                this.superAfkActive = data.superAfkActive || false;
                this.magnetActive = data.magnetActive || false;
                this.energyLevel = data.energyLevel || 1;
                this.energyMultiplier = data.energyMultiplier || 2;
                this.minigameAttempts = data.minigameAttempts !== undefined ? data.minigameAttempts : 1;
                this.minigameLastPlayed = data.minigameLastPlayed || null;
                this.playerName = data.playerName || this.getTelegramName();
                
                this.checkDailyReset();
                this.updateMaxEnergy();
                this.currentEnergy = data.currentEnergy !== undefined ? data.currentEnergy : this.maxEnergy;
                if (this.currentEnergy > this.maxEnergy) this.currentEnergy = this.maxEnergy;
            } catch (e) {
                console.error('Load error', e);
            }
        } else {
            this.playerName = this.getTelegramName();
            this.save();
        }
    }

    async loadStatsFromGitHub() {
        try {
            const token = await getGithubToken();
            if (!token) return;
            
            const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const content = atob(data.content);
                window.ratingsData = JSON.parse(content);
                updateRatingUI();
            }
        } catch (e) {
            console.error('Failed to load stats from GitHub', e);
            window.ratingsData = [];
        }
    }

    async saveStatsToGitHub() {
        try {
            const token = await getGithubToken();
            if (!token) return;
            
            const getResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            let sha = null;
            if (getResponse.ok) {
                const data = await getResponse.json();
                sha = data.sha;
            }
            
            const stats = window.ratingsData || [];
            
            const existingIndex = stats.findIndex(p => p.name === this.playerName);
            const playerData = {
                name: this.playerName,
                coins: this.coins,
                clicks: this.totalClicks,
                lastUpdate: new Date().toISOString()
            };
            
            if (existingIndex >= 0) {
                stats[existingIndex] = playerData;
            } else {
                stats.push(playerData);
            }
            
            const sortedStats = stats
                .sort((a, b) => b.coins - a.coins)
                .slice(0, 50);
            
            window.ratingsData = sortedStats;
            
            const content = btoa(JSON.stringify(sortedStats, null, 2));
            
            const putResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Update stats for ${this.playerName}`,
                    content: content,
                    sha: sha
                })
            });
            
            if (putResponse.ok) {
                console.log('Stats saved to GitHub');
            } else {
                console.error('Failed to save stats to GitHub');
            }
        } catch (e) {
            console.error('Error saving stats to GitHub', e);
        }
    }

    getTelegramName() {
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            return tg.initDataUnsafe.user.first_name || tg.initDataUnsafe.user.username || 'Игрок';
        }
        return 'Игрок';
    }

    checkDailyReset() {
        if (this.minigameLastPlayed) {
            const lastPlayed = new Date(this.minigameLastPlayed);
            const now = new Date();
            
            if (now.getDate() !== lastPlayed.getDate() || 
                now.getMonth() !== lastPlayed.getMonth() || 
                now.getFullYear() !== lastPlayed.getFullYear()) {
                this.minigameAttempts = 1;
                this.minigameLastPlayed = null;
            }
        }
    }

    save() {
        this.updateMaxEnergy();
        const data = {
            coins: this.coins,
            multiplier: this.multiplier,
            afkActive: this.afkActive,
            afkLevel: this.afkLevel,
            afkBaseGain: this.afkBaseGain,
            randomBoostActive: this.randomBoostActive,
            clickCount: this.clickCount,
            totalClicks: this.totalClicks,
            powerBoost: this.powerBoost,
            luckBoost: this.luckBoost,
            superAfkActive: this.superAfkActive,
            magnetActive: this.magnetActive,
            energyLevel: this.energyLevel,
            energyMultiplier: this.energyMultiplier,
            currentEnergy: this.currentEnergy,
            maxEnergy: this.maxEnergy,
            minigameAttempts: this.minigameAttempts,
            minigameLastPlayed: this.minigameLastPlayed,
            playerName: this.playerName
        };
        localStorage.setItem('pzkNeonState', JSON.stringify(data));

        syncProgressWithDatabase(this.coins);
    }

    useEnergy(amount) {
        if (this.currentEnergy >= amount) {
            this.currentEnergy -= amount;
            this.save();
            return true;
        }
        return false;
    }

    chargeEnergy(percent) {
        const cost = Math.floor(this.maxEnergy * percent * 0.1);
        if (this.coins >= cost) {
            this.coins -= cost;
            this.currentEnergy = Math.min(this.currentEnergy + Math.floor(this.maxEnergy * percent), this.maxEnergy);
            this.save();
            return true;
        }
        return false;
    }

    upgradeEnergy() {
        const cost = this.getEnergyUpgradeCost();
        if (this.coins >= cost && this.energyLevel < 10) {
            this.coins -= cost;
            this.energyLevel++;
            this.updateMaxEnergy();
            this.currentEnergy = this.maxEnergy;
            this.save();
            return true;
        }
        return false;
    }

    getEnergyUpgradeCost() {
        return 300 * Math.pow(2, this.energyLevel - 1);
    }

    updateMaxEnergy() {
        this.maxEnergy = 100 * Math.pow(this.energyMultiplier, this.energyLevel - 1);
    }

    getAfkGain() {
        let gain = this.afkBaseGain;
        if (this.superAfkActive) gain += 3;
        if (this.magnetActive) gain = Math.floor(gain * 1.1);
        return gain * this.afkLevel;
    }

    upgradeAfk() {
        if (this.afkLevel < 10) {
            this.afkLevel++;
            this.save();
            return true;
        }
        return false;
    }

    buyMinigameAttempt() {
        const cost = 2000;
        if (this.coins >= cost && this.minigameAttempts < 2) {
            this.coins -= cost;
            this.minigameAttempts = 2;
            this.save();
            return true;
        }
        return false;
    }

    playMinigame() {
        if (this.minigameAttempts > 0) {
            this.minigameAttempts--;
            this.minigameLastPlayed = new Date().toISOString();
            this.save();
            return true;
        }
        return false;
    }

    async handleClick() {
        this.clickCounter++;
        
        if (this.clickCounter >= 10) {
            this.clickCounter = 0;
            await this.saveStatsToGitHub();
        }
    }

    getPlayerRank() {
        try {
            const ratings = window.ratingsData || [];
            const index = ratings.findIndex(r => r.name === this.playerName);
            return index >= 0 ? index + 1 : '-';
        } catch (e) {
            return '-';
        }
    }
}

class Boost {
    constructor(price, gameState) {
        this.price = price;
        this.gameState = gameState;
    }
    buy() {
        if (this.gameState.coins >= this.price) {
            this.gameState.coins -= this.price;
            const result = this.apply();
            this.gameState.save();
            return result;
        }
        return false;
    }
    apply() {
        throw new Error('Apply method required');
    }
}

class AfkBoost extends Boost {
    constructor(gameState) {
        super(10 * Math.pow(2, gameState.afkLevel - 1), gameState);
    }
    apply() {
        if (!this.gameState.afkActive) {
            this.gameState.afkActive = true;
        }
        const upgraded = this.gameState.upgradeAfk();
        this.startAfkInterval();
        return upgraded;
    }
    startAfkInterval() {
        if (window.afkInterval) {
            clearInterval(window.afkInterval);
        }
        window.afkInterval = setInterval(() => {
            if (this.gameState.afkActive) {
                const gain = this.gameState.getAfkGain();
                this.gameState.coins += gain;
                createFloatingNumber(gain);
                this.gameState.save();
                updateUI();
            }
        }, 1000);
    }
}

class DoubleBoost extends Boost {
    constructor(gameState) {
        super(50, gameState);
    }
    apply() {
        this.gameState.multiplier *= 2;
        return true;
    }
}

class RandomBoost extends Boost {
    constructor(gameState) {
        super(100, gameState);
    }
    apply() {
        this.gameState.randomBoostActive = true;
        return true;
    }
}

class PowerBoost extends Boost {
    constructor(gameState) {
        super(200, gameState);
    }
    apply() {
        this.gameState.powerBoost += 2;
        return true;
    }
}

class LuckBoost extends Boost {
    constructor(gameState) {
        super(300, gameState);
    }
    apply() {
        this.gameState.luckBoost += 5;
        return true;
    }
}

class SuperAfkBoost extends Boost {
    constructor(gameState) {
        super(500, gameState);
    }
    apply() {
        this.gameState.superAfkActive = true;
        if (this.gameState.afkActive) {
            clearInterval(window.afkInterval);
            window.afkInterval = null;
            new AfkBoost(this.gameState).startAfkInterval();
        }
        return true;
    }
}

class EnergyUpgradeBoost extends Boost {
    constructor(gameState) {
        super(gameState.getEnergyUpgradeCost(), gameState);
    }
    apply() {
        return this.gameState.upgradeEnergy();
    }
}

class MinigameAttemptBoost extends Boost {
    constructor(gameState) {
        super(2000, gameState);
    }
    apply() {
        return this.gameState.buyMinigameAttempt();
    }
}

class MagnetBoost extends Boost {
    constructor(gameState) {
        super(1500, gameState);
    }
    apply() {
        this.gameState.magnetActive = true;
        return true;
    }
}

const gameState = new GameState();

const boosts = {
    afk: new AfkBoost(gameState),
    double: new DoubleBoost(gameState),
    random: new RandomBoost(gameState),
    power: new PowerBoost(gameState),
    luck: new LuckBoost(gameState),
    superAfk: new SuperAfkBoost(gameState),
    energyUpgrade: new EnergyUpgradeBoost(gameState),
    minigameAttempt: new MinigameAttemptBoost(gameState),
    magnet: new MagnetBoost(gameState)
};

const coinBalanceEl = document.getElementById('coinBalance');
const clickableGhost = document.getElementById('clickableGhost');
const ghostWrapper = document.getElementById('ghostWrapper');
const floatingContainer = document.getElementById('floatingNumbers');
const energyDisplay = document.getElementById('energyDisplay');
const energyFill = document.getElementById('energyFill');
const afkLevelEl = document.getElementById('afkLevel');
const afkIncomeEl = document.getElementById('afkIncome');
const multiplierDisplay = document.getElementById('multiplierDisplay');
const afkGainEl = document.getElementById('afkGain');
const afkPriceEl = document.getElementById('afkPrice');
const doublePriceEl = document.getElementById('doublePrice');
const randomPriceEl = document.getElementById('randomPrice');
const powerPriceEl = document.getElementById('powerPrice');
const luckPriceEl = document.getElementById('luckPrice');
const superAfkPriceEl = document.getElementById('superAfkPrice');
const energyLevelEl = document.getElementById('energyLevel');
const energyMultEl = document.getElementById('energyMult');
const energyUpgradePriceEl = document.getElementById('energyUpgradePrice');
const minigameAttemptPriceEl = document.getElementById('minigameAttemptPrice');
const minigameAttemptItem = document.getElementById('minigameAttemptItem');
const magnetPriceEl = document.getElementById('magnetPrice');
const buyButtons = document.querySelectorAll('.neon-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const basicWheel = document.getElementById('basicWheel');
const vipWheel = document.getElementById('vipWheel');
const spinBasicBtn = document.getElementById('spinBasic');
const spinVipBtn = document.getElementById('spinVip');
const basicResult = document.getElementById('basicResult');
const vipResult = document.getElementById('vipResult');
const chargeHalfBtn = document.getElementById('chargeHalf');
const chargeFullBtn = document.getElementById('chargeFull');
const startMinigameBtn = document.getElementById('startMinigame');
const minigamePreview = document.getElementById('minigamePreview');
const minigameBoard = document.getElementById('minigameBoard');
const minigameOverlay = document.getElementById('minigameOverlay');
const winAmountEl = document.getElementById('winAmount');
const minigameCards = document.querySelectorAll('.minigame-card');
const minigameStatus = document.getElementById('minigameStatus');
const totalClicksEl = document.getElementById('totalClicks');
const ratingListEl = document.getElementById('ratingList');
const playerNameEl = document.getElementById('playerName');
const playerCoinsEl = document.getElementById('playerCoins');
const playerClicksEl = document.getElementById('playerClicks');
const playerRankEl = document.getElementById('playerRank');

let noEnergyMessage = null;
let minigameActive = false;

function createFloatingNumber(value) {
    const num = document.createElement('div');
    num.className = 'floating-number';
    num.textContent = `+${value}`;
    
    const x = Math.random() * 80 + 10 + '%';
    const y = Math.random() * 50 + 25 + '%';
    
    num.style.left = x;
    num.style.top = y;
    
    floatingContainer.appendChild(num);
    
    setTimeout(() => {
        num.remove();
    }, 1000);
}

function showNoEnergyMessage() {
    if (noEnergyMessage) return;
    
    noEnergyMessage = document.createElement('div');
    noEnergyMessage.className = 'no-energy-message';
    noEnergyMessage.textContent = '⚡ НЕТ ЭНЕРГИИ ⚡';
    ghostWrapper.appendChild(noEnergyMessage);
    
    setTimeout(() => {
        if (noEnergyMessage) {
            noEnergyMessage.remove();
            noEnergyMessage = null;
        }
    }, 1500);
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
        
        if (tab === 'minigame') {
            updateMinigameUI();
        } else if (tab === 'rating') {
            updateRatingUI();
        }
    });
});

function updateRatingUI() {
    try {
        const ratings = window.ratingsData || [];
        const top10 = ratings.slice(0, 10);
        
        if (ratingListEl) {
            if (top10.length === 0) {
                ratingListEl.innerHTML = '<div class="rating-item" style="justify-content: center; padding: 20px;">Пока нет игроков в рейтинге</div>';
            } else {
                ratingListEl.innerHTML = top10.map((player, index) => {
                    const rankClass = index === 0 ? 'top-1' : index === 1 ? 'top-2' : index === 2 ? 'top-3' : '';
                    const isCurrentPlayer = player.name === gameState.playerName;
                    
                    return `
                        <div class="rating-item ${isCurrentPlayer ? 'current-player' : ''}">
                            <span class="rating-rank ${rankClass}">${index + 1}</span>
                            <span class="rating-name">${player.name}</span>
                            <span class="rating-coins">${player.coins}</span>
                            <span class="rating-clicks">${player.clicks}</span>
                        </div>
                    `;
                }).join('');
            }
        }
        
        if (playerNameEl) playerNameEl.textContent = gameState.playerName;
        if (playerCoinsEl) playerCoinsEl.textContent = gameState.coins;
        if (playerClicksEl) playerClicksEl.textContent = gameState.totalClicks;
        if (playerRankEl) playerRankEl.textContent = gameState.getPlayerRank();
    } catch (e) {
        console.error('Rating UI update error', e);
    }
}

function updateMinigameUI() {
    if (minigameStatus) {
        if (gameState.minigameAttempts > 0) {
            minigameStatus.innerHTML = `🎮 Доступно попыток: ${gameState.minigameAttempts}`;
            if (startMinigameBtn) startMinigameBtn.disabled = false;
        } else {
            minigameStatus.innerHTML = '❌ Сегодня уже играли. Купите попытку в магазине!';
            if (startMinigameBtn) startMinigameBtn.disabled = true;
        }
    }
    
    if (minigameAttemptItem && minigameAttemptPriceEl) {
        minigameAttemptPriceEl.textContent = boosts.minigameAttempt.price;
        const buyBtn = minigameAttemptItem.querySelector('.neon-btn');
        if (buyBtn) {
            buyBtn.disabled = gameState.coins < boosts.minigameAttempt.price || gameState.minigameAttempts >= 2;
        }
    }
}

function startMinigame() {
    if (minigameActive) return;
    if (!gameState.playMinigame()) return;
    
    minigameActive = true;
    minigamePreview.style.display = 'none';
    minigameBoard.style.display = 'block';
    
    const values = [];
    for (let i = 0; i < 6; i++) {
        values.push(Math.floor(Math.random() * 3701) + 300);
    }
    
    minigameCards.forEach((card, index) => {
        card.classList.remove('disabled');
        card.dataset.value = values[index];
    });
    
    updateMinigameUI();
}

minigameCards.forEach(card => {
    card.addEventListener('click', () => {
        if (!minigameActive || card.classList.contains('disabled')) return;
        
        const winValue = parseInt(card.dataset.value);
        
        minigameCards.forEach(c => c.classList.add('disabled'));
        
        winAmountEl.textContent = `+${winValue}`;
        minigameOverlay.style.display = 'flex';
        
        gameState.coins += winValue;
        gameState.save();
        updateUI();
        
        setTimeout(() => {
            minigameOverlay.style.display = 'none';
            minigameBoard.style.display = 'none';
            minigamePreview.style.display = 'block';
            minigameActive = false;
            
            document.querySelector('[data-tab="clicker"]').click();
            
            updateMinigameUI();
        }, 2000);
    });
});

function updateUI() {
    coinBalanceEl.textContent = gameState.coins;
    
    gameState.updateMaxEnergy();
    const energyPercent = (gameState.currentEnergy / gameState.maxEnergy) * 100;
    energyDisplay.textContent = `${Math.floor(gameState.currentEnergy)}/${Math.floor(gameState.maxEnergy)}`;
    energyFill.style.width = `${energyPercent}%`;
    
    if (gameState.currentEnergy <= 0) {
        ghostWrapper.classList.add('disabled');
    } else {
        ghostWrapper.classList.remove('disabled');
    }
    
    if (afkLevelEl) afkLevelEl.textContent = gameState.afkLevel;
    if (afkIncomeEl) afkIncomeEl.textContent = `${gameState.getAfkGain()}/сек`;
    if (multiplierDisplay) multiplierDisplay.textContent = `${gameState.multiplier}x`;
    if (afkGainEl) afkGainEl.textContent = gameState.getAfkGain();
    if (totalClicksEl) totalClicksEl.textContent = gameState.totalClicks;
    
    boosts.afk.price = 10 * Math.pow(2, gameState.afkLevel - 1);
    boosts.energyUpgrade.price = gameState.getEnergyUpgradeCost();
    
    if (afkPriceEl) afkPriceEl.textContent = boosts.afk.price;
    if (doublePriceEl) doublePriceEl.textContent = boosts.double.price;
    if (randomPriceEl) randomPriceEl.textContent = boosts.random.price;
    if (powerPriceEl) powerPriceEl.textContent = boosts.power.price;
    if (luckPriceEl) luckPriceEl.textContent = boosts.luck.price;
    if (superAfkPriceEl) superAfkPriceEl.textContent = boosts.superAfk.price;
    if (energyLevelEl) energyLevelEl.textContent = gameState.energyLevel;
    if (energyMultEl) energyMultEl.textContent = gameState.energyMultiplier;
    if (energyUpgradePriceEl) energyUpgradePriceEl.textContent = boosts.energyUpgrade.price;
    if (minigameAttemptPriceEl) minigameAttemptPriceEl.textContent = boosts.minigameAttempt.price;
    if (magnetPriceEl) magnetPriceEl.textContent = boosts.magnet.price;
    
    buyButtons.forEach(btn => {
        const boostType = btn.dataset.boost;
        if (!boostType) return;
        let price = 0;
        let canBuy = true;
        
        if (boostType === 'afk') {
            price = boosts.afk.price;
            canBuy = true;
        }
        if (boostType === 'double') price = boosts.double.price;
        if (boostType === 'random') price = boosts.random.price;
        if (boostType === 'power') price = boosts.power.price;
        if (boostType === 'luck') price = boosts.luck.price;
        if (boostType === 'superAfk') {
            price = boosts.superAfk.price;
            canBuy = !gameState.superAfkActive;
        }
        if (boostType === 'energyUpgrade') {
            price = boosts.energyUpgrade.price;
            canBuy = gameState.energyLevel < 10;
        }
        if (boostType === 'minigameAttempt') {
            price = boosts.minigameAttempt.price;
            canBuy = gameState.minigameAttempts < 2;
        }
        if (boostType === 'magnet') {
            price = boosts.magnet.price;
            canBuy = !gameState.magnetActive;
        }
        
        btn.disabled = gameState.coins < price || !canBuy;
    });

    if (chargeHalfBtn) {
        const halfCost = Math.floor(gameState.maxEnergy * 0.5 * 0.1);
        chargeHalfBtn.textContent = `🔋 ЗАРЯДИТЬ 50% (${halfCost} PZK)`;
    }
    if (chargeFullBtn) {
        const fullCost = Math.floor(gameState.maxEnergy * 0.1);
        chargeFullBtn.textContent = `⚡ ЗАРЯДИТЬ 100% (${fullCost} PZK)`;
    }
}

clickableGhost.addEventListener('click', async () => {
    if (gameState.currentEnergy <= 0) {
        showNoEnergyMessage();
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }
    
    clickableGhost.classList.add('ghost-animate');
    setTimeout(() => clickableGhost.classList.remove('ghost-animate'), 300);

    let gain = 1 * gameState.multiplier;
    gain += gameState.powerBoost;
    
    if (gameState.useEnergy(1)) {
        gameState.coins += gain;
        gameState.totalClicks++;
        createFloatingNumber(gain);
        
        if (gameState.randomBoostActive) {
            gameState.clickCount++;
            if (gameState.clickCount >= 50) {
                const bonus = Math.floor(Math.random() * 21) + 5;
                gameState.coins += bonus;
                createFloatingNumber(bonus);
                gameState.clickCount = 0;
                tg.HapticFeedback.impactOccurred('medium');
            }
        }
    }

    gameState.save();
    updateUI();
    
    await gameState.handleClick();
});

buyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const boostType = e.target.dataset.boost;
        if (!boostType) return;
        const boost = boosts[boostType];
        if (boost && boost.buy()) {
            tg.HapticFeedback.notificationOccurred('success');
            updateUI();
            if (boostType === 'minigameAttempt') {
                updateMinigameUI();
            }
        } else {
            tg.HapticFeedback.notificationOccurred('error');
        }
    });
});

if (chargeHalfBtn) {
    chargeHalfBtn.addEventListener('click', () => {
        if (gameState.chargeEnergy(0.5)) {
            tg.HapticFeedback.notificationOccurred('success');
            updateUI();
        } else {
            tg.HapticFeedback.notificationOccurred('error');
        }
    });
}

if (chargeFullBtn) {
    chargeFullBtn.addEventListener('click', () => {
        if (gameState.chargeEnergy(1)) {
            tg.HapticFeedback.notificationOccurred('success');
            updateUI();
        } else {
            tg.HapticFeedback.notificationOccurred('error');
        }
    });
}

if (startMinigameBtn) {
    startMinigameBtn.addEventListener('click', startMinigame);
}

function spinRoulette(type) {
    let cost, wheel, resultEl;
    const luckBonus = gameState.luckBoost;
    
    if (type === 'basic') {
        cost = 150;
        wheel = basicWheel;
        resultEl = basicResult;
    } else {
        cost = 1000;
        wheel = vipWheel;
        resultEl = vipResult;
    }

    if (gameState.coins < cost) {
        if (resultEl) resultEl.textContent = '❌ НЕДОСТАТОЧНО МОНЕТ';
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    gameState.coins -= cost;
    updateUI();
    
    wheel.style.transform = 'rotate(0deg)';
    setTimeout(() => {
        const spins = Math.floor(Math.random() * 5) + 8;
        const degrees = spins * 360 + Math.floor(Math.random() * 360);
        wheel.style.transform = `rotate(${degrees}deg)`;
    }, 10);

    setTimeout(() => {
        let winAmount;
        const chance = Math.random() * 100;
        
        if (type === 'basic') {
            if (chance < 5 + luckBonus) winAmount = 1000;
            else if (chance < 15 + luckBonus) winAmount = 750;
            else if (chance < 30 + luckBonus) winAmount = 500;
            else if (chance < 50 + luckBonus) winAmount = 300;
            else if (chance < 75 + luckBonus) winAmount = 200;
            else if (chance < 90 + luckBonus) winAmount = 100;
            else winAmount = 50;
        } else {
            if (chance < 5 + luckBonus) winAmount = 5000;
            else if (chance < 15 + luckBonus) winAmount = 4500;
            else if (chance < 30 + luckBonus) winAmount = 4000;
            else if (chance < 50 + luckBonus) winAmount = 3500;
            else if (chance < 70 + luckBonus) winAmount = 3000;
            else if (chance < 85 + luckBonus) winAmount = 2500;
            else winAmount = 2000;
        }

        gameState.coins += winAmount;
        gameState.save();
        
        if (resultEl) resultEl.textContent = `🎉 ВЫ ВЫИГРАЛИ ${winAmount} PZK!`;
        createFloatingNumber(winAmount);
        tg.HapticFeedback.notificationOccurred('success');
        updateUI();
    }, 3100);
}

if (spinBasicBtn) {
    spinBasicBtn.addEventListener('click', () => spinRoulette('basic'));
}

if (spinVipBtn) {
    spinVipBtn.addEventListener('click', () => spinRoulette('vip'));
}

updateUI();
updateMinigameUI();
updateRatingUI();

if (gameState.afkActive) {
    new AfkBoost(gameState).startAfkInterval();
}

setInterval(() => {
    updateUI();
}, 100);

setInterval(() => {
    updateRatingUI();
}, 5000);

gameState.loadStatsFromGitHub();
