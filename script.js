// script.js - Fully Fixed Version with Proper Event Listeners

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
    17: {'A': 2},  // soft 17 vs A (H17 only)
    16: {9: 5, 10: 0, 'A': 1},
    15: {10: 0, 9: 3, 'A': 1},
    14: {10: 3}
};

// === Game Functions (same as before) ===

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

// ... (All other functions remain exactly the same as in the previous version:
// createDeck, shuffle, dealCard, getHiLoTag, cardText, getValue, calculateTotal,
// isSoft, isPair, getDealerUpVal, getBasicAction, getCorrectAction, getCurrentTrueCount,
// updateTrueCount, updateBetSuggestion, updatePlayAccuracy, updateCountAccuracy,
// updateButtonVisibility, updateDisplay, startHand, takeInsurance, declineInsurance,
// proceedAfterInsurance, playerMove, nextHand, dealerPlay, evaluateResults, checkCount)

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

function isSoft(hand) {
    let total = 0;
    let aces = 0;
    for (let card of hand) {
        let val = getValue(card);
        if (val === 11) aces++;
        total += val;
    }
    return aces > 0 && total - 10 * aces <= 11;
}

function isPair(hand) {
    return hand.length === 2 && getValue(hand[0]) === getValue(hand[1]);
}

function getDealerUpVal() {
    if (dealerHand.length === 0) return null;
    const rank = dealerHand[0].slice(0, -1);
    return rank === 'A' ? 'A' : getValue(dealerHand[0]);
}

function getBasicAction(hand) {
    const total = calculateTotal(hand);
    const up = getDealerUpVal();
    const upVal = up === 'A' ? 11 : up;

    if (isPair(hand)) {
        const r = getValue(hand[0]);
        if (r === 11) return 'split';
        if (r === 10) return 'stand';
        if (r === 9) return upVal <= 9 && up !== 7 ? 'split' : 'stand';
        if (r === 8) return 'split';
        if (r === 7) return upVal <= 7 ? 'split' : 'hit';
        if (r === 6) return upVal <= 6 ? 'split' : 'hit';
        if (r === 5) return 'double';
        if (r === 4) return (upVal === 5 || upVal === 6) ? 'split' : 'hit';
        if (r === 3 || r === 2) return upVal >= 2 && upVal <= 7 ? 'split' : 'hit';
    }

    const soft = isSoft(hand);

    if (soft) {
        if (total >= 20) return 'stand';
        if (total === 19) return upVal === 6 ? 'double' : 'stand';
        if (total === 18) {
            if (upVal <= 6) return 'double';
            if (upVal <= 8) return 'stand';
            return 'hit';
        }
        if (total === 17) {
            if (upVal <= 6) return upVal >= 3 ? 'double' : 'hit';
            return 'hit';
        }
        if (total <= 16) {
            if (upVal <= 6) return upVal >= 4 ? 'double' : 'hit';
            return 'hit';
        }
    }

    if (total >= 17) return 'stand';
    if (total <= 11) return total >= 9 ? 'double' : 'hit';
    if (total === 12) return (upVal >= 4 && upVal <= 6) ? 'stand' : 'hit';
    return (upVal <= 6) ? 'stand' : 'hit';
}

function getCorrectAction(hand) {
    const total = calculateTotal(hand);
    const tc = getCurrentTrueCount();
    const up = getDealerUpVal();
    const upStr = up === 'A' ? 'A' : up.toString();

    if (lateSurrenderAllowed && hand.length === 2) {
        if (total in fab4 && upStr in fab4[total]) {
            const index = fab4[total][upStr];
            if (total === 17 && up === 'A' && dealerHitsSoft17) {
                if (tc >= index) return 'surrender';
            } else if (tc >= index) {
                return 'surrender';
            }
        }
    }

    if (total >= 12 && total <= 16) {
        if (total in illustrious18 && upStr in illustrious18[total]) {
            if (tc >= illustrious18[total][upStr]) return 'stand';
        }
    }

    if (total >= 8 && total <= 11) {
        if (total in illustrious18 && upStr in illustrious18[total]) {
            if (tc >= illustrious18[total][upStr]) return 'double';
        }
    }

    if (isPair(hand) && getValue(hand[0]) === 10) {
        if (upStr in illustrious18['10-10']) {
            if (tc >= illustrious18['10-10'][upStr]) return 'split';
        }
    }

    return getBasicAction(hand);
}

function getCurrentTrueCount() {
    const runningCount = seenCards.reduce((s, c) => s + getHiLoTag(c), 0);
    const decksLeft = Math.max(0.5, deck.length / 52);
    return Math.round
