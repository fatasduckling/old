// =======================
// STATE
// =======================

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

// =======================
// CONSTANTS
// =======================

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

const illustrious18 = {
    insurance: 3,
    16: {10: 0},
    15: {10: 4},
    13: {2: -1},
    12: {3: 2, 2: 3, 4: 0, 5: -2, 6: -1},
    11: {A: 1},
    10: {10: 4, A: 3},
    9: {2: 1, 7: 3},
    8: {6: 2, 5: 4},
    '10-10': {5: 5, 6: 4}
};

const fab4 = {
    17: {A: 2},
    16: {9: 5, 10: 0, A: 1},
    15: {10: 0, 9: 3, A: 1},
    14: {10: 3}
};

// =======================
// DECK / COUNT
// =======================

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

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function dealCard(hand) {
    if (deck.length < 20) createDeck();
    const card = deck.pop();
    hand.push(card);
    seenCards.push(card);
    updateTrueCount();
}

function getHiLoTag(card) {
    const r = card.slice(0, -1);
    if (['2','3','4','5','6'].includes(r)) return 1;
    if (['10','J','Q','K','A'].includes(r)) return -1;
    return 0;
}

function getCurrentTrueCount() {
    const rc = seenCards.reduce((s, c) => s + getHiLoTag(c), 0);
    const decksLeft = Math.max(0.5, deck.length / 52);
    return Math.round((rc / decksLeft) * 10) / 10;
}

// =======================
// HAND LOGIC
// =======================

function getValue(card) {
    const r = card.slice(0, -1);
    if (['J','Q','K'].includes(r)) return 10;
    if (r === 'A') return 11;
    return parseInt(r);
}

function calculateTotal(hand) {
    let total = 0, aces = 0;
    for (let c of hand) {
        const v = getValue(c);
        if (v === 11) aces++;
        total += v;
    }
    while (total > 21 && aces--) total -= 10;
    return total;
}

function isSoft(hand) {
    let total = 0, aces = 0;
    for (let c of hand) {
        const v = getValue(c);
        if (v === 11) aces++;
        total += v;
    }
    return aces > 0 && total - aces * 10 <= 11;
}

function isPair(hand) {
    return hand.length === 2 && getValue(hand[0]) === getValue(hand[1]);
}

function getDealerUpVal() {
    if (!dealerHand.length) return null;
    const r = dealerHand[0].slice(0, -1);
    return r === 'A' ? 'A' : getValue(dealerHand[0]);
}

// =======================
// STRATEGY
// =======================

function getBasicAction(hand) {
    const total = calculateTotal(hand);
    const up = getDealerUpVal();
    const upVal = up === 'A' ? 11 : up;

    if (isPair(hand)) {
        const r = getValue(hand[0]);
        if (r === 11 || r === 8) return 'split';
        if (r === 10) return 'stand';
        if (r === 9) return upVal <= 9 && up !== 7 ? 'split' : 'stand';
        if (r === 7) return upVal <= 7 ? 'split' : 'hit';
        if (r === 6) return upVal <= 6 ? 'split' : 'hit';
        if (r === 5) return 'double';
        if (r === 4) return (upVal === 5 || upVal === 6) ? 'split' : 'hit';
        if (r <= 3) return upVal <= 7 ? 'split' : 'hit';
    }

    if (isSoft(hand)) {
        if (total >= 20) return 'stand';
        if (total === 19) return upVal === 6 ? 'double' : 'stand';
        if (total === 18) {
            if (upVal <= 6) return 'double';
            if (upVal <= 8) return 'stand';
            return 'hit';
        }
        if (total <= 17) return upVal <= 6 ? 'double' : 'hit';
    }

    if (total >= 17) return 'stand';
    if (total <= 11) return total >= 9 ? 'double' : 'hit';
    if (total === 12) return (upVal >= 4 && upVal <= 6) ? 'stand' : 'hit';
    return upVal <= 6 ? 'stand' : 'hit';
}

// =======================
// UI UPDATES
// =======================

function updateTrueCount() {
    document.getElementById('true-count').innerText = getCurrentTrueCount();
}

function updateDisplay() {
    document.getElementById('bankroll').innerText = bankroll.toLocaleString();
    document.getElementById('decks-left').innerText = (deck.length / 52).toFixed(1);
    updateTrueCount();
}

// =======================
// GAME FLOW
// =======================

function startHand() {
    currentBet = parseInt(document.getElementById('bet-input').value) || baseUnit;
    bankroll -= currentBet;

    playerHands = [[]];
    dealerHand = [];
    currentHandIndex = 0;
    gamePhase = 'playing';

    dealCard(playerHands[0]);
    dealCard(dealerHand);
    dealCard(playerHands[0]);
    dealCard(dealerHand);

    updateDisplay();
}

// =======================
// INIT (MODULE SAFE)
// =======================

function init() {
    createDeck();
    updateDisplay();

    document.getElementById('deal-button')
        .addEventListener('click', startHand);
}

// 🚨 ONLY ENTRY POINT 🚨
document.addEventListener('DOMContentLoaded', init);
