// script2.js
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Настройки сервера - ЗАМЕНИ НА СВОЙ IP
const SERVER_URL = '/api';

class GameState {
    constructor() {
        this.coins = 0;
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
        this.maxEnergy = 50;
        this.currentEnergy = 50;
        this.energyLevel = 1;
        this.energyMultiplier = 2;
        this.minigameAttempts = 1;
        this.minigameLastPlayed = null;
        this.playerName = '';
        this.clickCounter = 0;
        this.allPlayers = [];
        this.gameLevel = 2;
        this.load();
        this.loadRatingFromServer();
    }

    load() {
        const saved = localStorage.getItem('pzkNeonState');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.gameLevel !== 2) {
                    window.location.href = 'index.html';
                    return;
                }
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
                
                this.updateMaxEnergy();
                this.currentEnergy = data.currentEnergy !== undefined ? data.currentEnergy : this.maxEnergy;
            } catch (e) {
                console.error('Load error', e);
            }
        } else {
            this.playerName = this.getTelegramName();
            this.save();
        }
    }


    async loadRatingFromServer() {
        try {
            const response = await fetch(`${SERVER_URL}/top/`);
            if (response.ok) {
                this.allPlayers = await response.json();
                updateRatingUI();
            }
            
            const playerResponse = await fetch(`${SERVER_URL}/player/${encodeURIComponent(this.playerName)}/`);
            if (playerResponse.ok) {
                const playerData = await playerResponse.json();
                window.playerRank = playerData.rank;
            }
        } catch (e) {
            console.error('Failed to load rating:', e);
            this.allPlayers = [];
        }
    }

    async saveToServer() {
        const tg = window.Telegram.WebApp;
        const user = tg.initDataUnsafe?.user;

        const userId = user.id; 

        try {
            const response = await fetch(`${SERVER_URL}/update/`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: this.playerName,
                    telegram_id: userId,
                    coins: this.coins,
                    clicks: this.totalClicks,
                    level: 2
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.top10) {
                    this.allPlayers = data.top10;
                    updateRatingUI();
                }
                console.log('Stats saved to server');
            }
        } catch (e) {
            console.error('Failed to save to server:', e);
        }
    }

    getTelegramName() {
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            return tg.initDataUnsafe.user.first_name || tg.initDataUnsafe.user.username || 'Игрок';
        }
        return 'Игрок';
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
            playerName: this.playerName,
            gameLevel: 2
        };
        localStorage.setItem('pzkNeonState', JSON.stringify(data));
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
        const cost = 390 * Math.pow(2, this.energyLevel - 1);
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

    updateMaxEnergy() {
        this.maxEnergy = 50 * Math.pow(this.energyMultiplier, this.energyLevel - 1);
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
        const cost = 2600;
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

    getMinigameReward() {
        return Math.floor(Math.random() * 1501) + 100;
    }

    async handleClick() {
        this.clickCounter++;
        
        if (this.clickCounter >= 5) {
            this.clickCounter = 0;
            await this.saveToServer();
        }
    }

    getPlayerRank() {
        return window.playerRank || '-';
    }

    getClickGain() {
        let gain = 20 * this.multiplier;
        gain += this.powerBoost;
        return gain;
    }
}

const gameState = new GameState();

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
    setTimeout(() => num.remove(), 1000);
}

function showNoEnergyMessage() {
    if (noEnergyMessage) return;
    
    noEnergyMessage = document.createElement('div');
    noEnergyMessage.className = 'no-energy-message';
    noEnergyMessage.textContent = '⚡ НЕТ ЭНЕРГИИ ⚡';
    ghostWrapper.appendChild(noEnergyMessage);
    
    setTimeout(() => {
        noEnergyMessage?.remove();
        noEnergyMessage = null;
    }, 1500);
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
        
        if (tab === 'minigame') updateMinigameUI();
        else if (tab === 'rating') updateRatingUI();
    });
});

function updateRatingUI() {
    try {
        const players = gameState.allPlayers || [];
        const top10 = players.slice(0, 10);
        
        if (ratingListEl) {
            if (top10.length === 0) {
                ratingListEl.innerHTML = '<div class="rating-item" style="justify-content: center; padding: 20px;">Пока нет игроков в статистике</div>';
            } else {
                ratingListEl.innerHTML = top10.map((player, index) => {
                    const rankClass = index === 0 ? 'top-1' : index === 1 ? 'top-2' : index === 2 ? 'top-3' : '';
                    const isCurrentPlayer = player.name === gameState.playerName;
                    const levelEmoji = player.level === 2 ? ' 👑' : '';
                    
                    return `
                        <div class="rating-item ${isCurrentPlayer ? 'current-player' : ''}">
                            <span class="rating-rank ${rankClass}">${index + 1}</span>
                            <span class="rating-name">${player.name}${levelEmoji}</span>
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
        minigameAttemptPriceEl.textContent = 2600;
        const buyBtn = minigameAttemptItem.querySelector('.neon-btn');
        if (buyBtn) buyBtn.disabled = gameState.coins < 2600 || gameState.minigameAttempts >= 2;
    }
}

function startMinigame() {
    if (minigameActive) return;
    if (!gameState.playMinigame()) return;
    
    minigameActive = true;
    minigamePreview.style.display = 'none';
    minigameBoard.style.display = 'block';
    
    const values = [];
    for (let i = 0; i < 6; i++) values.push(gameState.getMinigameReward());
    
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
    
    const afkPrice = 13 * Math.pow(2, gameState.afkLevel - 1);
    if (afkPriceEl) afkPriceEl.textContent = afkPrice;
    
    if (doublePriceEl) doublePriceEl.textContent = 65;
    if (randomPriceEl) randomPriceEl.textContent = 130;
    if (powerPriceEl) powerPriceEl.textContent = 260;
    if (luckPriceEl) luckPriceEl.textContent = 390;
    if (superAfkPriceEl) superAfkPriceEl.textContent = 650;
    if (energyLevelEl) energyLevelEl.textContent = gameState.energyLevel;
    if (energyMultEl) energyMultEl.textContent = gameState.energyMultiplier;
    
    const energyUpgradeCost = 390 * Math.pow(2, gameState.energyLevel - 1);
    if (energyUpgradePriceEl) energyUpgradePriceEl.textContent = energyUpgradeCost;
    
    if (magnetPriceEl) magnetPriceEl.textContent = 1950;
    
    buyButtons.forEach(btn => {
        const boostType = btn.dataset.boost;
        if (!boostType) return;
        let price = 0;
        let canBuy = true;
        
        if (boostType === 'afk') {
            price = afkPrice;
            canBuy = true;
        }
        if (boostType === 'double') price = 65;
        if (boostType === 'random') price = 130;
        if (boostType === 'power') price = 260;
        if (boostType === 'luck') price = 390;
        if (boostType === 'superAfk') {
            price = 650;
            canBuy = !gameState.superAfkActive;
        }
        if (boostType === 'energyUpgrade') {
            price = energyUpgradeCost;
            canBuy = gameState.energyLevel < 10;
        }
        if (boostType === 'minigameAttempt') {
            price = 2600;
            canBuy = gameState.minigameAttempts < 2;
        }
        if (boostType === 'magnet') {
            price = 1950;
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

    let gain = gameState.getClickGain();
    
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
        
        gameState.save();
        updateUI();
        
        await gameState.handleClick();
    }
});

buyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const boostType = e.target.dataset.boost;
        if (!boostType) return;
        
        let success = false;
        
        if (boostType === 'afk') {
            if (!gameState.afkActive) gameState.afkActive = true;
            success = gameState.upgradeAfk();
            if (gameState.afkActive && !window.afkInterval) {
                window.afkInterval = setInterval(() => {
                    const gain = gameState.getAfkGain();
                    gameState.coins += gain;
                    createFloatingNumber(gain);
                    gameState.save();
                    updateUI();
                }, 1000);
            }
        }
        else if (boostType === 'double' && gameState.coins >= 65) {
            gameState.coins -= 65;
            gameState.multiplier *= 2;
            success = true;
        }
        else if (boostType === 'random' && gameState.coins >= 130) {
            gameState.coins -= 130;
            gameState.randomBoostActive = true;
            success = true;
        }
        else if (boostType === 'power' && gameState.coins >= 260) {
            gameState.coins -= 260;
            gameState.powerBoost += 2;
            success = true;
        }
        else if (boostType === 'luck' && gameState.coins >= 390) {
            gameState.coins -= 390;
            gameState.luckBoost += 5;
            success = true;
        }
        else if (boostType === 'superAfk' && gameState.coins >= 650 && !gameState.superAfkActive) {
            gameState.coins -= 650;
            gameState.superAfkActive = true;
            success = true;
        }
        else if (boostType === 'energyUpgrade') {
            success = gameState.upgradeEnergy();
        }
        else if (boostType === 'minigameAttempt') {
            success = gameState.buyMinigameAttempt();
        }
        else if (boostType === 'magnet' && gameState.coins >= 1950 && !gameState.magnetActive) {
            gameState.coins -= 1950;
            gameState.magnetActive = true;
            success = true;
        }
        
        if (success) {
            tg.HapticFeedback.notificationOccurred('success');
            gameState.save();
            updateUI();
            if (boostType === 'minigameAttempt') updateMinigameUI();
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
        cost = 195;
        wheel = basicWheel;
        resultEl = basicResult;
    } else {
        cost = 1300;
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
            if (chance < 5 + luckBonus) winAmount = 1300;
            else if (chance < 15 + luckBonus) winAmount = 975;
            else if (chance < 30 + luckBonus) winAmount = 650;
            else if (chance < 50 + luckBonus) winAmount = 390;
            else if (chance < 75 + luckBonus) winAmount = 260;
            else if (chance < 90 + luckBonus) winAmount = 130;
            else winAmount = 65;
        } else {
            if (chance < 5 + luckBonus) winAmount = 6500;
            else if (chance < 15 + luckBonus) winAmount = 5850;
            else if (chance < 30 + luckBonus) winAmount = 5200;
            else if (chance < 50 + luckBonus) winAmount = 4550;
            else if (chance < 70 + luckBonus) winAmount = 3900;
            else if (chance < 85 + luckBonus) winAmount = 3250;
            else winAmount = 2600;
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

if (gameState.afkActive && !window.afkInterval) {
    window.afkInterval = setInterval(() => {
        const gain = gameState.getAfkGain();
        gameState.coins += gain;
        createFloatingNumber(gain);
        gameState.save();
        updateUI();
    }, 1000);
}

setInterval(updateUI, 100);
setInterval(() => {
    updateRatingUI();
    gameState.loadRatingFromServer();
}, 5000);