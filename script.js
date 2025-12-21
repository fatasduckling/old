// script.js - Final Fixed Version

let deck = [];
let playerHands = [];
let dealerHand = [];
let seenCards = [];
let bankroll = 5000;
let baseUnit = 25;
let currentBet = 25;
let currentHandIndex = 0;
let gamePhase = 'betting';
let moveJustMade = false;
let insuranceTaken = false;
let insuranceBet = 0;

let totalDecisions = 0;
let correctDecisions = 0;
let totalCountGuesses = 0;
let correctCountGuesses = 0;
let previousRunningCount = 0;

let numDecks = 6;
let dasAllowed = true;
let dealerHitsSoft17 = true;
let lateSurrenderAllowed = true;
let midRoundDealAllowed = false;

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

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

function openSettings() {
    document.getElementById('settings-menu').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('num-decks').value = numDecks;
    document.getElementById('das').value = dasAllowed.toString();
    document.getElementById('soft17').value = dealerHitsSoft17.toString();
    document.getElementById('surrender').value = lateSurrenderAllowed.toString();
    document.getElementById('starting-bankroll').value = bankroll;
    document.getElementById('mid-round-deal').value = midRoundDealAllowed.toString();
}

function closeSettings() {
    document.getElementById('settings-menu').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

function applySettings() {
    const oldNumDecks = numDecks;
    numDecks = parseInt(document.getElementById('num-decks').value);
    dasAllowed = document.getElementById('das').value === 'true';
    dealerHitsSoft17 = document.getElementById('soft17').value === 'true';
    lateSurrenderAllowed = document.getElementById('surrender').value === 'true';
    midRoundDealAllowed = document.getElementById('mid-round-deal').value === 'true';

    const newBankroll = parseInt(document.getElementById('starting-bankroll').value);
    if (newBankroll > 0) bankroll = newBankroll;

    if (numDecks !== oldNumDecks) seenCards = [];

    createDeck();
    closeSettings();
    updateDisplay();
}

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
    if (deck.length < 20) createDeck();
    const card = deck.pop();
    toHand.push(card);
    seenCards.push(card);
    updateTrueCount();
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

function isPair(hand) {
    return hand.length === 2 && getValue(hand[0]) === getValue(hand[1]);
}

function getDealerUpVal() {
    if (dealerHand.length === 0) return null;
    const rank = dealerHand[0].slice(0, -1);
    return rank === 'A' ? 'A' : getValue(dealerHand[0]);
}

function getCorrectAction(hand) {
    const total = calculateTotal(hand);
    const tc = getCurrentTrueCount();
    const up = getDealerUpVal();

    // Surrender
    if (lateSurrenderAllowed && hand.length === 2) {
        if (total in fab4 && up in fab4[total] && tc <= fab4[total][up]) return 'surrender';
    }

    // Split 10s
    if (isPair(hand) && getValue(hand[0]) === 10) {
        if (up in illustrious18['10-10'] && tc >= illustrious18['10-10'][up]) return 'split';
    }

    // Standing deviations
    if (total >= 12 && total <= 16) {
        if (total in illustrious18 && up in illustrious18[total] && tc >= illustrious18[total][up]) return 'stand';
    }

    // Doubling deviations
    if (total >= 8 && total <= 11) {
        if (total in illustrious18 && up in illustrious18[total] && tc >= illustrious18[total][up]) return 'double';
    }

    // Basic strategy (accurate for H17/S17, DAS, multi-deck)
    if (isPair(hand)) {
        const r = getValue(hand[0]);
        if (r === 11) return 'split';
        const pairMap = {
            2: 'split', 3: 'split', 4: 'hit', 5: 'double', 6: 'split',
            7: 'split', 8: 'split', 9: 'split', 10: 'stand'
        };
        return pairMap[r] || 'hit';
    }

    if (hand.some(c => c.startsWith('A'))) {
        if (total >= 19) return 'stand';
        if (total === 18) {
            if (up >= 9 || up === 'A') return 'hit';
            if (up <= 6) return 'stand';
            return 'double'; // 18 vs 7-8
        }
        if (total === 17) return up <= 6 ? 'double' : 'hit';
        if (total <= 16) return up <= 6 ? 'double' : 'hit';
    }

    if (total >= 17) return 'stand';
    if (total <= 11) return 'double';
    if (total === 12) return up <= 3 ? 'hit' : 'stand';
    return 'hit'; // 13-16 vs 7+
}

function getCurrentTrueCount() {
    const runningCount = seenCards.reduce((s, c) => s + getHiLoTag(c), 0);
    const decksLeft = Math.max(0.5, deck.length / 52);
    return Math.round(runningCount / decksLeft * 10) / 10;
}

function updateTrueCount() {
    document.getElementById('true-count').innerText = getCurrentTrueCount();
}

function updateBetSuggestion() {
    const tc = getCurrentTrueCount();
    let units = 1;
    if (tc >= 1) units = 2;
    if (tc >= 2) units = 4;
    if (tc >= 3) units = 6;
    if (tc >= 4) units = 8;
    if (tc >= 5) units = 12;

    document.getElementById('bet-suggestion').innerText = `Suggested bet: $${baseUnit * units} (${units} units)`;
}

function updatePlayAccuracy() {
    const pct = totalDecisions === 0 ? 0 : Math.round((correctDecisions / totalDecisions) * 100);
    document.getElementById('play-accuracy').innerText = `Correct plays: ${correctDecisions}/${totalDecisions} (${pct}%)`;
}

function updateCountAccuracy() {
    const pct = totalCountGuesses === 0 ? 0 : Math.round((correctCountGuesses / totalCountGuesses) * 100);
    document.getElementById('count-accuracy').innerText = `${correctCountGuesses}/${totalCountGuesses} (${pct}%)`;
}

function updateButtonVisibility() {
    const hand = playerHands[currentHandIndex] || [];
    const isFirstMove = hand.length === 2;
    const up = getDealerUpVal();
    const tc = getCurrentTrueCount();

    document.getElementById('hit-btn').style.display = 'inline-block';
    document.getElementById('stand-btn').style.display = 'inline-block';
    document.getElementById('double-btn').style.display = isFirstMove ? 'inline-block' : 'none';
    document.getElementById('split-btn').style.display = isFirstMove && isPair(hand) && playerHands.length < 4 ? 'inline-block' : 'none';
    document.getElementById('surrender-btn').style.display = isFirstMove && lateSurrenderAllowed ? 'inline-block' : 'none';

    const insuranceActions = document.getElementById('insurance-actions');
    if (gamePhase === 'insurance') {
        insuranceActions.style.display = 'block';
        document.getElementById('actions').style.display = 'none';
    } else {
        insuranceActions.style.display = 'none';
        document.getElementById('actions').style.display = gamePhase === 'playing' ? 'block' : 'none';
    }
}

function updateDisplay() {
    document.getElementById('bankroll').innerText = bankroll.toLocaleString();
    document.getElementById('decks-left').innerText = (deck.length / 52).toFixed(1);
    updateTrueCount();
    updatePlayAccuracy();
    updateBetSuggestion();

    let dealerStr = gamePhase === 'playing' || gamePhase === 'insurance' ? cardText(dealerHand[0]) + ' ??' : dealerHand.map(cardText).join(' ');
    document.getElementById('dealer-cards').innerText = dealerStr;
    document.getElementById('dealer-total').innerText = gamePhase === 'playing' || gamePhase === 'insurance' ? '?' : calculateTotal(dealerHand);

    const hand = playerHands[currentHandIndex] || [];
    document.getElementById('player-cards').innerText = hand.map(cardText).join(' ');
    document.getElementById('player-total').innerText = calculateTotal(hand);

    // Deal button visibility based on setting
    document.getElementById('deal-button').style.display = (gamePhase === 'betting' || midRoundDealAllowed) ? 'inline-block' : 'none';

    updateButtonVisibility();
}

// ... (rest of the code is the same as previous version: startHand, takeInsurance, declineInsurance, proceedAfterInsurance, playerMove, nextHand, dealerPlay, evaluateResults, checkCount)

createDeck();
updateDisplay();
updateCountAccuracy();
