// script.js - Blackjack Trainer: No upfront best move, feedback after move, true count always visible

let deck = [];
let playerHands = [];
let dealerHand = [];
let seenCards = [];
let bankroll = 5000;
let baseUnit = 25;
let currentBet = 25;
let currentHandIndex = 0;
let gamePhase = 'betting';
let moveJustMade = false; // To give feedback only on first move

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const numDecks = 6;

const dasAllowed = true;
const dealerHitsSoft17 = true;
const lateSurrenderAllowed = true;

// Full Illustrious 18 + Fab 4
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

    // Standing
    if (total >= 12 && total <= 16) {
        if (total in illustrious18 && up in illustrious18[total] && tc >= illustrious18[total][up]) return 'stand';
    }

    // Doubling
    if (total >= 8 && total <= 11) {
        if (total in illustrious18 && up in illustrious18[total] && tc >= illustrious18[total][up]) return 'double';
    }

    // Basic strategy
    if (isPair(hand)) {
        const r = getValue(hand[0]);
        if (r === 11) return 'split';
        const map = {2:'split',3:'split',4:'hit',5:'double',6:'split',7:'split',8:'split',9:'split',10:'stand'};
        return map[r] || 'hit';
    }

    if (hand.some(c => c.startsWith('A'))) {
        return total >= 19 ? 'stand' : 'hit';
    }

    return total >= 17 ? 'stand' : total <= 11 ? 'double' : 'hit';
}

function getCurrentTrueCount() {
    const decksLeft = Math.max(0.5, deck.length / 52);
    const rc = seenCards.reduce((s, c) => s + getHiLoTag(c), 0);
    return Math.round(rc / decksLeft * 10) / 10;
}

function updateTrueCount() {
    document.getElementById('true-count').innerText = getCurrentTrueCount();
}

function updateDisplay() {
    document.getElementById('bankroll').innerText = bankroll.toLocaleString();
    document.getElementById('decks-left').innerText = (deck.length / 52).toFixed(1);
    updateTrueCount();

    let dealerStr = gamePhase === 'playing' ? cardText(dealerHand[0]) + ' ??' : dealerHand.map(cardText).join(' ');
    document.getElementById('dealer-cards').innerText = dealerStr;
    document.getElementById('dealer-total').innerText = gamePhase === 'playing' ? '?' : calculateTotal(dealerHand);

    const hand = playerHands[currentHandIndex] || [];
    document.getElementById('player-cards').innerText = hand.map(cardText).join(' ');
    document.getElementById('player-total').innerText = calculateTotal(hand);

    document.getElementById('actions').style.display = gamePhase === 'playing' ? 'block' : 'none';
    document.getElementById('end-round').style.display = gamePhase === 'roundEnd' ? 'block' : 'none';
    document.getElementById('deal-button').disabled = gamePhase !== 'betting';
}

function startHand() {
    currentBet = parseInt(document.getElementById('bet-input').value) || baseUnit;
    if (currentBet > bankroll || currentBet < baseUnit) {
        alert("Invalid bet!");
        return;
    }
    bankroll -= currentBet;

    seenCards = [];
    playerHands = [[]];
    dealerHand = [];
    currentHandIndex = 0;
    gamePhase = 'playing';
    moveJustMade = false;

    dealCard(playerHands[0]);
    dealCard(dealerHand);
    dealCard(playerHands[0]);
    dealCard(dealerHand);

    document.getElementById('feedback').innerText = "Make your move...";
    updateDisplay();
}

function playerMove(action) {
    const hand = playerHands[currentHandIndex];

    // Give feedback only on first decision
    if (hand.length === 2 && !moveJustMade) {
        const correct = getCorrectAction(hand);
        if (action === correct) {
            document.getElementById('feedback').innerText = "✓ Correct play!";
        } else {
            document.getElementById('feedback').innerText = `✗ Wrong — correct was: ${correct.toUpperCase()}`;
        }
        moveJustMade = true;
    }

    if (action === 'hit') {
        dealCard(hand);
        if (calculateTotal(hand) > 21) nextHand();
    } else if (action === 'stand') {
        nextHand();
    } else if (action === 'double') {
        if (hand.length === 2) {
            bankroll -= currentBet;
            currentBet *= 2;
            dealCard(hand);
            nextHand();
        }
    } else if (action === 'split') {
        if (isPair(hand) && playerHands.length < 4) {
            bankroll -= currentBet;
            const card = hand.pop();
            playerHands.push([card]);
            dealCard(hand);
            dealCard(playerHands[playerHands.length - 1]);
            moveJustMade = false; // New hand, new first move
        }
    } else if (action === 'surrender') {
        if (hand.length === 2 && lateSurrenderAllowed) {
            bankroll += currentBet / 2;
            document.getElementById('result').innerText = "Surrendered — lost half bet";
            nextHand();
        }
    }

    updateDisplay();
}

function nextHand() {
    if (currentHandIndex < playerHands.length - 1) {
        currentHandIndex++;
        moveJustMade = false;
        document.getElementById('feedback').innerText = "Make your move...";
    } else {
        dealerPlay();
    }
    updateDisplay();
}

function dealerPlay() {
    gamePhase = 'dealer';
    updateDisplay();

    while (calculateTotal(dealerHand) < 17 ||
           (calculateTotal(dealerHand) === 17 && dealerHitsSoft17 && dealerHand.some(c => c.startsWith('A')))) {
        dealCard(dealerHand);
    }

    evaluateResults();
}

function evaluateResults() {
    gamePhase = 'roundEnd';
    let result = '';
    let net = 0;

    playerHands.forEach(hand => {
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
            net += wager;
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
    const actualRC = seenCards.reduce((s, c) => s + getHiLoTag(c), 0);
    const guess = parseInt(document.getElementById('count-guess').value) || 0;

    document.getElementById('count-feedback').innerHTML =
        guess === actualRC
            ? `✓ Correct! Running count was ${actualRC}`
            : `✗ Wrong — Running count was ${actualRC} (you guessed ${guess})`;

    gamePhase = 'betting';
    document.getElementById('feedback').innerText = "Ready for next hand";
    updateDisplay();
}

// Init
createDeck();
updateDisplay();
