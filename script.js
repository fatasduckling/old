let deck = [], playerHands = [], dealerHand = [], seenCards = [];
let bankroll = 5000, currentBet = 25, currentHandIndex = 0;
let gamePhase = 'betting', moveJustMade = false;
let totalDecisions = 0, correctDecisions = 0, totalCountGuesses = 0, correctCountGuesses = 0;

// Settings Variables
let numDecks = 6, dealerHitsSoft17 = true, surrenderEnabled = true, bjPayout = 1.5, dasAllowed = true;

// Strategy Data
const illustrious18 = {
    'insurance': 3,
    16: {10: 0}, 15: {10: 4}, 13: {2: -1},
    12: {3: 2, 2: 3, 4: 0, 5: -2, 6: -1},
    11: {'A': 1}, 10: {10: 4, 'A': 3}, 9: {2: 1, 7: 3}, 8: {6: 2, 5: 4}, '10-10': {5: 5, 6: 4}
};
const fab4 = { 17: {'A': 2}, 16: {9: 5, 10: 0, 'A': 1}, 15: {10: 0, 9: 3, 'A': 1}, 14: {10: 3} };

function getCardImageHTML(card) {
    const suitMap = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
    const rankMap = { 'A': 'ace', 'J': 'jack', 'Q': 'queen', 'K': 'king' };
    const r = card.slice(0, -1);
    const s = card.slice(-1);
    const fileName = `${rankMap[r] || r}_of_${suitMap[s]}.svg`.toLowerCase();
    return `<img src="cards/${fileName}" class="card-img" alt="${card}">`;
}

function createDeck() {
    deck = [];
    for (let d = 0; d < numDecks; d++) {
        ['♠', '♥', '♦', '♣'].forEach(s => ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].forEach(r => deck.push(r + s)));
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
    const rc = seenCards.reduce((s, c) => {
        const r = c.slice(0, -1);
        if (['2','3','4','5','6'].includes(r)) return s + 1;
        if (['10','J','Q','K','A'].includes(r)) return s - 1;
        return s;
    }, 0);
    const decksLeft = Math.max(0.5, deck.length / 52);
    return Math.round(rc / decksLeft * 10) / 10;
}

// Play Checker
function getCorrectAction(hand) {
    const total = calculateTotal(hand);
    const tc = getCurrentTrueCount();
    const up = dealerHand[0].slice(0, -1);
    const upStr = (up === 'J' || up === 'Q' || up === 'K') ? '10' : up;

    if (surrenderEnabled && hand.length === 2) {
        if (fab4[total] && fab4[total][upStr] !== undefined && tc >= fab4[total][upStr]) return 'surrender';
    }

    if (illustrious18[total] && illustrious18[total][upStr] !== undefined && tc >= illustrious18[total][upStr]) {
        if (total >= 12 && total <= 16) return 'stand';
        if (total >= 8 && total <= 11) return 'double';
    }

    if (total >= 17) return 'stand';
    if (total >= 13 && total <= 16 && (upStr <= 6 && upStr >= 2)) return 'stand';
    if (total === 12 && (upStr >= 4 && upStr <= 6)) return 'stand';
    return 'hit';
}

function updateDisplay() {
    document.getElementById('bankroll').innerText = bankroll.toLocaleString();
    document.getElementById('true-count').innerText = getCurrentTrueCount();
    document.getElementById('decks-left').innerText = (deck.length / 52).toFixed(1);
    document.getElementById('play-accuracy').innerText = `Correct plays: ${correctDecisions}/${totalDecisions} (${totalDecisions === 0 ? 0 : Math.round(correctDecisions/totalDecisions*100)}%)`;

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

function playerMove(action) {
    const hand = playerHands[currentHandIndex];
    if (!moveJustMade) {
        totalDecisions++;
        const correct = getCorrectAction(hand);
        if (action === correct) { correctDecisions++; document.getElementById('feedback').innerText = "✓ Correct Play!"; }
        else { document.getElementById('feedback').innerText = `✗ Wrong - Correct was ${correct.toUpperCase()}`; }
        moveJustMade = true;
    }
    if (action === 'hit') { dealCard(hand); if (calculateTotal(hand) > 21) nextHand(); }
    else if (action === 'stand') nextHand();
    else if (action === 'surrender') { bankroll += currentBet / 2; nextHand(); }
    updateDisplay();
}

function dealerPlay() {
    gamePhase = 'dealer-turn';
    updateDisplay();
    const step = () => {
        const total = calculateTotal(dealerHand);
        const isSoft17 = total === 17 && dealerHand.some(c => c.startsWith('A')) && (total - 10 <= 11);
        if (total < 17 || (isSoft17 && dealerHitsSoft17)) {
            dealCard(dealerHand); updateDisplay(); setTimeout(step, 800);
        } else evaluateResults();
    };
    setTimeout(step, 800);
}

function evaluateResults() {
    const dTotal = calculateTotal(dealerHand);
    playerHands.forEach(h => {
        const pTotal = calculateTotal(h);
        if (pTotal <= 21) {
            if (pTotal === 21 && h.length === 2) bankroll += currentBet * (1 + bjPayout);
            else if (dTotal > 21 || pTotal > dTotal) bankroll += currentBet * 2;
            else if (pTotal === dTotal) bankroll += currentBet;
        }
    });
    document.getElementById('end-round').style.display = 'block';
    updateDisplay();
}

function startHand() {
    currentBet = parseInt(document.getElementById('bet-input').value) || 25;
    bankroll -= currentBet;
    playerHands = [[]]; dealerHand = []; currentHandIndex = 0; gamePhase = 'playing'; moveJustMade = false;
    document.getElementById('end-round').style.display = 'none';
    dealCard(playerHands[0]); dealCard(dealerHand); dealCard(playerHands[0]); dealCard(dealerHand);
    updateDisplay();
}

function nextHand() {
    if (currentHandIndex < playerHands.length - 1) currentHandIndex++;
    else dealerPlay();
}

// Initial Events
createDeck();
updateDisplay();
document.getElementById('deal-button').onclick = startHand;
document.getElementById('hit-btn').onclick = () => playerMove('hit');
document.getElementById('stand-btn').onclick = () => playerMove('stand');
document.getElementById('surrender-btn').onclick = () => playerMove('surrender');
document.getElementById('settings-btn').onclick = () => { document.getElementById('settings-menu').style.display='block'; document.getElementById('overlay').style.display='block'; };
document.getElementById('apply-settings-btn').onclick = () => { 
    numDecks = parseInt(document.getElementById('num-decks').value);
    dealerHitsSoft17 = document.getElementById('soft17').value === 'true';
    surrenderEnabled = document.getElementById('surrender').value === 'true';
    bjPayout = parseFloat(document.getElementById('bj-payout').value);
    dasAllowed = document.getElementById('das').value === 'true';
    document.getElementById('settings-menu').style.display='none'; 
    document.getElementById('overlay').style.display='none'; 
    updateDisplay(); 
};
document.getElementById('check-count-btn').onclick = () => {
    const actual = seenCards.reduce((s, c) => {
        const r = c.slice(0, -1);
        if (['2','3','4','5','6'].includes(r)) return s + 1;
        if (['10','J','Q','K','A'].includes(r)) return s - 1;
        return s;
    }, 0);
    const guess = parseInt(document.getElementById('count-guess').value) || 0;
    if (guess === actual) { correctCountGuesses++; document.getElementById('count-feedback').innerText = "✓ Correct Count!"; }
    else document.getElementById('count-feedback').innerText = `✗ Wrong: was ${actual}`;
    setTimeout(() => { document.getElementById('end-round').style.display = 'none'; gamePhase = 'betting'; updateDisplay(); }, 2000);
};
