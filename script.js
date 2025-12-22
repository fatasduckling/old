// Global State
let deck = [], playerHands = [], dealerHand = [], seenCards = [];
let bankroll = 5000, baseUnit = 25, currentBet = 25, currentHandIndex = 0;
let gamePhase = 'betting', moveJustMade = false;
let totalDecisions = 0, correctDecisions = 0, totalCountGuesses = 0, correctCountGuesses = 0;

// Default Settings
let numDecks = 6, dealerHitsSoft17 = true, surrenderEnabled = true, bjPayout = 1.5;
let countingEnabled = true, guessCountEnabled = true;

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Professional Deviations
const illustrious18 = {
    'insurance': 3,
    16: {10: 0}, 15: {10: 4}, 13: {2: -1},
    12: {3: 2, 2: 3, 4: 0, 5: -2, 6: -1},
    11: {'A': 1}, 10: {10: 4, 'A': 3}, 9: {2: 1, 7: 3}, 8: {6: 2, 5: 4}, '10-10': {5: 5, 6: 4}
};
const fab4 = { 17: {'A': 2}, 16: {9: 5, 10: 0, 'A': 1}, 15: {10: 0, 9: 3, 'A': 1}, 14: {10: 3} };

/** INITIALIZATION & UI **/
function createDeck() {
    deck = [];
    for (let d = 0; d < numDecks; d++) {
        suits.forEach(s => ranks.forEach(r => deck.push(r + s)));
    }
    deck.sort(() => Math.random() - 0.5);
}

function dealCard(toHand) {
    if (deck.length < 20) { createDeck(); seenCards = []; }
    const card = deck.pop();
    toHand.push(card);
    seenCards.push(card);
    return card;
}

function getHiLoTag(card) {
    const r = card.slice(0, -1);
    if (['2','3','4','5','6'].includes(r)) return 1;
    if (['10','J','Q','K','A'].includes(r)) return -1;
    return 0;
}

function calculateTotal(hand) {
    let total = 0, aces = 0;
    hand.forEach(c => {
        let v = c.slice(0, -1);
        v = (['J','Q','K'].includes(v)) ? 10 : (v === 'A' ? 11 : parseInt(v));
        if (v === 11) aces++;
        total += v;
    });
    while (total > 21 && aces--) total -= 10;
    return total;
}

function getCurrentTrueCount() {
    const rc = seenCards.reduce((s, c) => s + getHiLoTag(c), 0);
    const decksLeft = Math.max(0.5, deck.length / 52);
    return Math.round(rc / decksLeft * 10) / 10;
}

function getCardImageHTML(card) {
    const suitMap = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
    const rankMap = { 'A': 'ace', 'J': 'jack', 'Q': 'queen', 'K': 'king' };
    const r = card.slice(0, -1);
    const s = card.slice(-1);
    const fileName = `${rankMap[r] || r}_of_${suitMap[s]}.svg`.toLowerCase();
    return `<img src="cards/${fileName}" class="card-img" alt="${card}">`;
}

/** STRATEGY ENGINE **/
function getCorrectAction(hand) {
    const total = calculateTotal(hand);
    const tc = getCurrentTrueCount();
    const up = dealerHand[0].slice(0, -1);
    const upVal = up === 'A' ? 11 : (['J','Q','K'].includes(up) ? 10 : parseInt(up));
    const upStr = upVal === 11 ? 'A' : upVal.toString();

    // 1. If Counting is disabled, just return Basic Strategy
    if (!countingEnabled) return getBasicStrategy(hand, upVal);

    // 2. Check Surrender Deviations (Fab 4)
    if (surrenderEnabled && hand.length === 2) {
        if (fab4[total] && fab4[total][upStr] !== undefined && tc >= fab4[total][upStr]) return 'surrender';
    }

    // 3. Check Post-Split/Double Deviations (Illustrious 18)
    if (illustrious18[total] && illustrious18[total][upStr] !== undefined && tc >= illustrious18[total][upStr]) {
        if (total >= 12 && total <= 16) return 'stand';
        if (total >= 8 && total <= 11) return 'double';
    }

    // 4. Default to Basic Strategy
    return getBasicStrategy(hand, upVal);
}

function getBasicStrategy(hand, upVal) {
    const total = calculateTotal(hand);
    const isSoft = hand.some(c => c.startsWith('A')) && (total - 10 <= 11);
    const isPair = hand.length === 2 && hand[0].slice(0,-1) === hand[1].slice(0,-1);

    if (isPair) {
        const val = calculateTotal([hand[0]]);
        if (val === 11 || val === 8) return 'split';
        if (val === 10) return 'stand';
        if (val === 9) return (upVal >= 2 && upVal <= 9 && upVal !== 7) ? 'split' : 'stand';
    }
    if (total >= 17) return 'stand';
    if (total >= 13 && total <= 16 && upVal <= 6) return 'stand';
    if (total === 12 && upVal >= 4 && upVal <= 6) return 'stand';
    if (total === 11) return 'double';
    return 'hit';
}

/** GAMEPLAY LOGIC **/
function updateDisplay() {
    document.getElementById('bankroll').innerText = bankroll.toLocaleString();
    document.getElementById('true-count').innerText = countingEnabled ? getCurrentTrueCount() : "N/A";
    document.getElementById('decks-left').innerText = (deck.length / 52).toFixed(1);
    
    const pct = totalDecisions === 0 ? 0 : Math.round((correctDecisions / totalDecisions) * 100);
    document.getElementById('play-accuracy').innerText = `Correct plays: ${correctDecisions}/${totalDecisions} (${pct}%)`;

    if (countingEnabled) {
        const tc = getCurrentTrueCount();
        let units = tc >= 4 ? 12 : (tc >= 2 ? 4 : 1);
        document.getElementById('bet-suggestion').style.display = 'block';
        document.getElementById('bet-suggestion').innerText = `Suggested bet: $${baseUnit * units} (${units} units)`;
    } else {
        document.getElementById('bet-suggestion').style.display = 'none';
    }

    const hideDealer = (gamePhase === 'playing' || gamePhase === 'insurance');
    document.getElementById('dealer-cards').innerHTML = hideDealer 
        ? `<img src="cards/back.svg" class="card-img">` + getCardImageHTML(dealerHand[0])
        : dealerHand.map(getCardImageHTML).join('');
    
    document.getElementById('dealer-total').innerText = hideDealer ? '?' : calculateTotal(dealerHand);
    const hand = playerHands[currentHandIndex] || [];
    document.getElementById('player-cards').innerHTML = hand.map(getCardImageHTML).join('');
    document.getElementById('player-total').innerText = calculateTotal(hand);

    document.getElementById('actions').style.display = (gamePhase === 'playing') ? 'block' : 'none';
    document.getElementById('deal-button').style.display = (gamePhase === 'betting') ? 'inline-block' : 'none';
}

function startHand() {
    currentBet = parseInt(document.getElementById('bet-input').value) || 25;
    if (currentBet > bankroll) { alert("Insufficient funds!"); return; }
    
    bankroll -= currentBet;
    playerHands = [[]]; dealerHand = []; currentHandIndex = 0; gamePhase = 'playing'; moveJustMade = false;
    document.getElementById('end-round').style.display = 'none';
    document.getElementById('result').innerText = '';
    document.getElementById('feedback').innerText = 'Dealer dealt. Your move...';

    dealCard(playerHands[0]); dealCard(dealerHand); dealCard(playerHands[0]); dealCard(dealerHand);
    
    if (dealerHand[0].startsWith('A')) gamePhase = 'insurance';
    updateDisplay();
}

function playerMove(action) {
    const hand = playerHands[currentHandIndex];
    if (!moveJustMade) {
        totalDecisions++;
        const correct = getCorrectAction(hand);
        if (action === correct) {
            correctDecisions++;
            document.getElementById('feedback').innerText = "✓ Correct!";
            document.getElementById('feedback').style.color = "lime";
        } else {
            document.getElementById('feedback').innerText = `✗ Wrong - correct was ${correct.toUpperCase()}`;
            document.getElementById('feedback').style.color = "red";
        }
        moveJustMade = true;
    }

    if (action === 'hit') { dealCard(hand); if (calculateTotal(hand) > 21) nextHand(); }
    else if (action === 'stand') nextHand();
    else if (action === 'surrender') { bankroll += currentBet / 2; nextHand(); }
    else if (action === 'double') { bankroll -= currentBet; currentBet *= 2; dealCard(hand); nextHand(); }
    
    updateDisplay();
}

function nextHand() {
    if (currentHandIndex < playerHands.length - 1) { currentHandIndex++; moveJustMade = false; }
    else dealerPlay();
}

function dealerPlay() {
    gamePhase = 'dealer-turn';
    updateDisplay();
    const step = () => {
        const total = calculateTotal(dealerHand);
        const isSoft17 = total === 17 && dealerHand.some(c => c.startsWith('A')) && (total - 10 <= 11);
        if (total < 17 || (isSoft17 && dealerHitsSoft17)) {
            dealCard(dealerHand); updateDisplay(); setTimeout(step, 600);
        } else evaluateResults();
    };
    setTimeout(step, 600);
}

function evaluateResults() {
    const dTotal = calculateTotal(dealerHand);
    playerHands.forEach(h => {
        const pTotal = calculateTotal(h);
        if (pTotal <= 21) {
            if (pTotal === 21 && h.length === 2 && dTotal !== 21) bankroll += currentBet * (1 + bjPayout);
            else if (dTotal > 21 || pTotal > dTotal) bankroll += currentBet * 2;
            else if (pTotal === dTotal) bankroll += currentBet;
        }
    });

    if (guessCountEnabled) {
        document.getElementById('end-round').style.display = 'block';
        document.getElementById('feedback').innerText = "Round over. Guess the count!";
    } else {
        gamePhase = 'betting';
    }
    updateDisplay();
}

/** SETTINGS & EVENTS **/
function applySettings() {
    numDecks = parseInt(document.getElementById('num-decks').value);
    dealerHitsSoft17 = document.getElementById('soft17').value === 'true';
    surrenderEnabled = document.getElementById('surrender').value === 'true';
    bjPayout = parseFloat(document.getElementById('bj-payout').value);
    countingEnabled = document.getElementById('counting-on').value === 'true';
    guessCountEnabled = document.getElementById('guess-count-on').value === 'true';
    bankroll = parseInt(document.getElementById('starting-bankroll').value);

    document.getElementById('settings-menu').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    createDeck();
    updateDisplay();
}

document.getElementById('settings-btn').onclick = () => {
    document.getElementById('settings-menu').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
};

document.getElementById('apply-settings-btn').onclick = applySettings;

document.getElementById('check-count-btn').onclick = () => {
    const actual = seenCards.reduce((s, c) => s + getHiLoTag(c), 0);
    const guess = parseInt(document.getElementById('count-guess').value) || 0;
    totalCountGuesses++;
    if (guess === actual) {
        correctCountGuesses++;
        document.getElementById('count-feedback').innerText = "✓ Correct!";
        document.getElementById('count-feedback').style.color = "lime";
    } else {
        document.getElementById('count-feedback').innerText = `✗ Wrong: was ${actual}`;
        document.getElementById('count-feedback').style.color = "red";
    }
    setTimeout(() => { 
        document.getElementById('end-round').style.display = 'none'; 
        gamePhase = 'betting'; 
        document.getElementById('feedback').innerText = "Ready — press Deal";
        updateDisplay(); 
    }, 2000);
};

document.getElementById('deal-button').onclick = startHand;
document.getElementById('hit-btn').onclick = () => playerMove('hit');
document.getElementById('stand-btn').onclick = () => playerMove('stand');
document.getElementById('surrender-btn').onclick = () => playerMove('surrender');
document.getElementById('double-btn').onclick = () => playerMove('double');

createDeck();
updateDisplay();
