// script.js - Fully Fixed Blackjack Hi-Lo Trainer (Text Cards)

let deck = [];
let playerHands = [];
let dealerHand = [];
let runningCount = 0;
let seenCards = [];
let bankroll = 5000;
let baseUnit = 25;
let currentBet = 25;
let currentHandIndex = 0;
let gamePhase = 'betting'; // betting, playing, dealer, roundEnd

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const numDecks = 6;

const dasAllowed = true;
const dealerHitsSoft17 = true;
const lateSurrenderAllowed = true;

const illustrious18 = {
    'insurance': 3,
    16: {10: 0},
    15: {10: 4},
    13: {2: -1},
    12: {3: 2, 2: 3, 4: 0, 5: -2, 6: -1},
    11: {'A': 1},
    10: {10: 4, 'A': 3},
    9: {2: 1, 7: 3},
    8: {6: 2, 5: 4},
    '10-10': {5: 5, 6: 4}
};

const fab4 = {
    15: {10: 0, 9: 2, 'A': 1},
    14: {10: 3}
};

function createDeck() {
    deck = [];
    for (let d = 0; d < numDecks; d++) {
        for (let suit of suits) {
            for (let rank of ranks) {
                deck.push(rank + suit);
            }
        }
    }
    shuffle(deck);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function dealCard(toHand) {
    if (deck.length < 20) createDeck(); // Reshuffle when low
    const card = deck.pop();
    toHand.push(card);
    seenCards.push(card);
    return card;
}

function getHiLoTag(card) {
    const rank = card.slice(0, -1);
    if (['2','3','4','5','6'].includes(rank)) return 1;
    if (['10','J','Q','K','A'].includes(rank)) return -1;
    return 0;
}

function cardText(card) {
    return card;
}

function getValue(card) {
    const rank = card.slice(0, -1);
    if (['J','Q','K'].includes(rank)) return 10;
    if (rank === 'A') return 11;
    return parseInt(rank);
}

function calculateTotal(hand) {
    let total = 0;
    let aces = 0;
    for (let card of hand) {
        let val = getValue(card);
        if (val === 11) aces++;
        total += val;
    }
    while (total > 21 && aces--) total -= 10;
    return total;
}

function isSoft(hand) {
    const total = calculateTotal(hand);
    return hand.some(c => c.startsWith('A')) && total <= 21;  // Fixed isSoft
}

function isPair(hand) {
    return hand.length === 2 && getValue(hand[0]) === getValue(hand[1]);
}

function getDealerUpVal() {
    if (dealerHand.length === 0) return null;
    const rank = dealerHand[0].slice(0, -1);
    return rank === 'A' ? 'A' : getValue(dealerHand[0]);
}

function getBestAction(hand) {
    const total = calculateTotal(hand);
    const tc = getCurrentTrueCount();
    const up = getDealerUpVal();

    if (up === 'A' && tc >= illustrious18['insurance']) {
        document.getElementById('best-move').innerText += ' (Insurance advised)';
    }

    if (lateSurrenderAllowed && hand.length === 2) {
        if (total in fab4 && up in fab4[total] && tc <= fab4[total][up]) return 'surrender';
    }

    if (isPair(hand) && getValue(hand[0]) === 10) {
        if (up in illustrious18['10-10'] && tc >= illustrious18['10-10'][up]) return 'split';
    }

    if (!isSoft(hand) && total >= 12 && total <= 16) {
        if (total in illustrious18 && up in illustrious18[total] && tc >= illustrious18[total][up]) return 'stand';
    }

    if (total >= 8 && total <= 11) {
        if (total in illustrious18 && up in illustrious18[total] && tc >= illustrious18[total][up]) return 'double';
    }

    // Basic fallback
    if (isPair(hand)) {
        const r = getValue(hand[0]);
        if (r === 11) return 'split';
        const map = {2:'split',3:'split',4:'hit',5:'double',6:'split',7:'split',8:'split',9:'split',10:'stand'};
        return map[r] || 'hit';
    }
    if (isSoft(hand)) return total >= 18 ? 'stand' : 'hit';  // Simplified soft
    return total >= 17 ? 'stand' : total <= 11 ? 'double' : 'hit';
}

function getCurrentTrueCount() {
    const decksLeft = Math.max(0.5, deck.length / 52);
    return Math.round(runningCount / decksLeft * 10) / 10;
}

function updateDisplay() {
    document.getElementById('bankroll').innerText = bankroll.toLocaleString();
    document.getElementById('decks-left').innerText = (deck.length / 52).toFixed(1);

    // Dealer
    let dealerStr = gamePhase === 'playing' ? cardText(dealerHand[0]) + ' ??' : dealerHand.map(cardText).join(' ');
    document.getElementById('dealer-cards').innerText = dealerStr;
    document.getElementById('dealer-total').innerText = gamePhase === 'playing' ? '?' : calculateTotal(dealerHand);

    // Player current hand
    const hand = playerHands[currentHandIndex] || [];
    document.getElementById('player-cards').innerText = hand.map(cardText).join(' ');
    document.getElementById('player-total').innerText = calculateTotal(hand);

    // Best move
    if (gamePhase === 'playing' && hand.length > 0) {
        document.getElementById('best-move').innerText = getBestAction(hand).toUpperCase();
    } else if (gamePhase === 'betting') {
        document.getElementById('best-move').innerText = 'Ready to deal';
    }

    document.getElementById('actions').style.display = gamePhase === 'playing' ? 'block' : 'none';
    document.getElementById('end-round').style.display = gamePhase === 'roundEnd' ? 'block' : 'none';
    document.getElementById('deal-button').disabled = gamePhase !== 'betting';
    document.getElementById('result').innerHTML = '';
    document.getElementById('count-feedback').innerHTML = '';
}

function startHand() {
    currentBet = parseInt(document.getElementById('bet-input').value) || baseUnit;
    if (currentBet > bankroll || currentBet < baseUnit) {
        alert("Invalid bet!");
        return;
    }
    bankroll -= currentBet;  // Deduct bet upfront

    seenCards = [];
    runningCount = 0;

    playerHands = [[]];
    dealerHand = [];
    currentHandIndex = 0;
    gamePhase = 'playing';

    dealCard(playerHands[0]);
    dealCard(dealerHand);
    dealCard(playerHands[0]);
    dealCard(dealerHand);

    if (calculateTotal(playerHands[0]) === 21) dealerPlay();

    updateDisplay();
}

function hit() {
    dealCard(playerHands[currentHandIndex]);
    if (calculateTotal(playerHands[currentHandIndex]) > 21) nextHand();
    updateDisplay();
}

function stand() { nextHand(); }

function doubleDown() {
    if (playerHands[currentHandIndex].length !== 2) return;
    bankroll -= currentBet;  // Additional bet
    currentBet *= 2;
    dealCard(playerHands[currentHandIndex]);
    nextHand();
    updateDisplay();
}

function split() {
    if (!isPair(playerHands[currentHandIndex]) || playerHands.length >= 4) return;
    const hand = playerHands[currentHandIndex];
    playerHands[currentHandIndex] = [hand[0]];
    playerHands.push([hand[1]]);
    bankroll -= currentBet;  // Additional bet for split
    dealCard(playerHands[currentHandIndex]);
    dealCard(playerHands[playerHands.length - 1]);
    updateDisplay();
}

function surrender() {
    if (playerHands[currentHandIndex].length !== 2 || !lateSurrenderAllowed) return;
    const refund = currentBet / 2;
    bankroll += refund;
    playerHands[currentHandIndex] = [];  // Mark as surrendered
    nextHand();
    updateDisplay();
}

function nextHand() {
    if (currentHandIndex < playerHands.length - 1) {
        currentHandIndex++;
    } else {
        dealerPlay();
    }
}

function dealerPlay() {
    gamePhase = 'dealer';
    updateDisplay();

    while (calculateTotal(dealerHand) < 17 || (calculateTotal(dealerHand) === 17 && dealerHitsSoft17 && isSoft(dealerHand))) {
        dealCard(dealerHand);
    }

    evaluateResults();
}

function evaluateResults() {
    gamePhase = 'roundEnd';
    let result = '';
    let net = 0;

    playerHands.forEach(hand => {
        if (hand.length === 0) {  // Surrendered
            result += 'Surrendered — Lost half<br>';
            return;
        }

        const pTotal = calculateTotal(hand);
        const dTotal = calculateTotal(dealerHand);
        let wager = currentBet;

        if (pTotal > 21) {
            result += 'Bust — Lose<br>';
        } else if (dTotal > 21 || pTotal > dTotal) {
            if (pTotal === 21 && hand.length === 2) {
                net += wager * 1.5;
                result += 'BLACKJACK! +1.5x<br>';
            } else {
                net += wager;
                result += 'Win<br>';
            }
        } else if (pTotal === dTotal) {
            net += wager;  // Push returns bet
            result += 'Push<br>';
        } else {
            result += 'Lose<br>';
        }
    });

    bankroll += net;
    document.getElementById('result').innerHTML = result + `<br>Net: ${net >= 0 ? '+' : ''}$${net}`;
    updateDisplay();
}

function checkCount() {
    const actual = seenCards.reduce((sum, c) => sum + getHiLoTag(c), 0);
    const guess = parseInt(document.getElementById('count-guess').value) || 0;

    document.getElementById('count-feedback').innerHTML =
        guess === actual
            ? `✓ Correct! Running count: ${actual}`
            : `✗ Wrong — Actual: ${actual} (guessed ${guess})`;

    const tcStart = Math.round(actual / numDecks * 10) / 10;
    document.getElementById('count-feedback').innerHTML += `<br>True count at start ≈ ${tcStart}`;
    gamePhase = 'betting';
    updateDisplay();
}

// Initialize
createDeck();
updateDisplay();
