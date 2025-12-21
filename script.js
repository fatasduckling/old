// script.js - Full Blackjack Hi-Lo Trainer (Text Cards Version)

let deck = [];
let playerHands = [];  // Array of hands (supports splitting)
let dealerHand = [];
let runningCount = 0;
let seenCards = [];
let bankroll = 5000;
let baseUnit = 25;
let currentBet = 25;
let currentHandIndex = 0;  // For playing multiple split hands
let gamePhase = 'betting'; // betting, playing, dealer, roundEnd

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
let numDecks = 6; // Change if needed

// Settings (match your rules)
const dasAllowed = true;
const dealerHitsSoft17 = true;
const lateSurrenderAllowed = true;

// Illustrious 18 + Fab 4
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
    if (deck.length < 10) {
        createDeck(); // Reshuffle when low
    }
    const card = deck.pop();
    toHand.push(card);
    seenCards.push(card);
    runningCount += getHiLoTag(card);
    return card;
}

function getHiLoTag(card) {
    const rank = card.slice(0, -1);
    if (['2','3','4','5','6'].includes(rank)) return 1;
    if (['10','J','Q','K','A'].includes(rank)) return -1;
    return 0;
}

function cardText(card) {
    return card; // e.g., "A♠", "10♥"
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
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
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
    return aces > 0 && total - 10 <= 21;
}

function isPair(hand) {
    return hand.length === 2 && getValue(hand[0]) === getValue(hand[1]);
}

function getDealerUpcardVal() {
    if (dealerHand.length === 0) return null;
    const rank = dealerHand[0].slice(0, -1);
    return rank === 'A' ? 'A' : getValue(dealerHand[0]);
}

function getBestAction(hand, dealerUp) {
    const total = calculateTotal(hand);
    const tc = getCurrentTrueCount();

    // Insurance
    if (dealerUp === 'A' && tc >= illustrious18['insurance']) {
        document.getElementById('best-move').innerText = 'Insurance recommended!';
    }

    // Surrender
    if (lateSurrenderAllowed && hand.length === 2) {
        if (total in fab4 && dealerUp in fab4[total] && tc <= fab4[total][dealerUp]) {
            return 'surrender';
        }
    }

    // Split 10s
    if (isPair(hand) && getValue(hand[0]) === 10) {
        const key = '10-10';
        if (dealerUp in illustrious18[key] && tc >= illustrious18[key][dealerUp]) {
            return 'split';
        }
    }

    // Standing deviations
    if (!isSoft(hand) && total >= 12 && total <= 16) {
        if (total in illustrious18 && dealerUp in illustrious18[total] && tc >= illustrious18[total][dealerUp]) {
            return 'stand';
        }
    }

    // Doubling deviations
    if (total >= 8 && total <= 11) {
        if (total in illustrious18 && dealerUp in illustrious18[total] && tc >= illustrious18[total][dealerUp]) {
            return 'double';
        }
    }

    // Basic strategy fallback
    if (isPair(hand)) {
        const rank = getValue(hand[0]);
        if (rank === 11) return 'split';
        const pairMap = {2:'split',3:'split',4:'hit',5:'double',6:'split',7:'split',8:'split',9:'split',10:'stand'};
        return pairMap[rank] || 'hit';
    }

    if (isSoft(hand)) {
        const softMap = {13:'hit',14:'hit',15:'hit',16:'hit',17:'hit',18:'stand',19:'stand',20:'stand'};
        return softMap[total] || 'hit';
    }

    const hardMap = {8:'hit',9:'hit',10:'double',11:'double',12:'hit',13:'stand',14:'stand',15:'stand',16:'stand',17:'stand'};
    return hardMap[total] || 'hit';
}

function getCurrentTrueCount() {
    const decksLeft = Math.max(0.5, deck.length / 52);
    return Math.round(runningCount / decksLeft * 10) / 10;
}

function updateDisplay() {
    document.getElementById('bankroll').innerText = bankroll.toLocaleString();
    document.getElementById('decks-left').innerText = Math.round(deck.length / 52 * 10) / 10;

    // Dealer
    let dealerHTML = cardText(dealerHand[0]);
    if (gamePhase === 'playing') dealerHTML += ' ??';
    else dealerHTML += dealerHand.slice(1).map(cardText).join(' ');
    document.getElementById('dealer-cards').innerHTML = dealerHTML;
    document.getElementById('dealer-total').innerText = gamePhase === 'playing' ? '?' : calculateTotal(dealerHand);

    // Player current hand
    const hand = playerHands[currentHandIndex];
    document.getElementById('player-cards').innerHTML = hand.map(cardText).join(' ');
    document.getElementById('player-total').innerText = calculateTotal(hand);

    // Best move
    const dealerUp = getDealerUpcardVal();
    const best = getBestAction(hand, dealerUp);
    document.getElementById('best-move').innerText = best.toUpperCase();

    // Actions visibility
    document.getElementById('actions').style.display = gamePhase === 'playing' ? 'block' : 'none';
    document.getElementById('end-round').style.display = gamePhase === 'roundEnd' ? 'block' : 'none';
}

function startHand() {
    currentBet = parseInt(document.getElementById('bet-input').value) || baseUnit;
    if (currentBet > bankroll) {
        alert("Not enough bankroll!");
        return;
    }

    seenCards = [];
    runningCount = 0; // Will be recalculated at end

    playerHands = [[]];
    dealerHand = [];
    currentHandIndex = 0;
    gamePhase = 'playing';

    dealCard(playerHands[0]);
    dealCard(dealerHand);
    dealCard(playerHands[0]);
    dealCard(dealerHand); // Hole card

    if (calculateTotal(playerHands[0]) === 21) {
        endPlayerTurn();
    }

    updateDisplay();
}

function hit() {
    dealCard(playerHands[currentHandIndex]);
    if (calculateTotal(playerHands[currentHandIndex]) > 21) {
        nextHandOrDealer();
    }
    updateDisplay();
}

function stand() {
    nextHandOrDealer();
}

function doubleDown() {
    if (playerHands[currentHandIndex].length !== 2) return;
    currentBet *= 2; // Double the bet for this hand
    dealCard(playerHands[currentHandIndex]);
    nextHandOrDealer();
    updateDisplay();
}

function split() {
    if (!isPair(playerHands[currentHandIndex]) || playerHands.length >= 4) return;
    const hand = playerHands[currentHandIndex];
    playerHands[currentHandIndex] = [hand[0]];
    playerHands.push([hand[1]]);
    dealCard(playerHands[currentHandIndex]);
    dealCard(playerHands[playerHands.length-1]);
    updateDisplay();
}

function surrender() {
    if (playerHands[currentHandIndex].length !== 2 || !lateSurrenderAllowed) return;
    bankroll -= currentBet / 2;
    document.getElementById('result').innerText = `Surrendered - Lost $${currentBet/2}`;
    endRound();
}

function nextHandOrDealer() {
    if (currentHandIndex < playerHands.length - 1) {
        currentHandIndex++;
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
    let resultText = '';
    let net = 0;

    for (let hand of playerHands) {
        const pTotal = calculateTotal(hand);
        const dTotal = calculateTotal(dealerHand);
        const wager = currentBet; // Simplified - assumes no double tracking per hand

        if (pTotal > 21) {
            net -= wager;
            resultText += 'Bust - Lose<br>';
        } else if (dTotal > 21 || pTotal > dTotal) {
            if (hand.length === 2 && pTotal === 21 && !dealerHand.some(c => calculateTotal([c, dealerHand[1]]) === 21)) {
                net += wager * 1.5;
                resultText += 'BLACKJACK! +1.5x<br>';
            } else {
                net += wager;
                resultText += 'Win<br>';
            }
        } else if (pTotal === dTotal) {
            resultText += 'Push<br>';
        } else {
            net -= wager;
            resultText += 'Lose<br>';
        }
    }

    bankroll += net;
    document.getElementById('result').innerHTML = resultText + `<br>Net: $${net > 0 ? '+' : ''}${net}`;
    updateDisplay();
}

function checkCount() {
    const actual = sum(getHiLoTag(c) for (let c of seenCards));
    const guess = parseInt(document.getElementById('count-guess').value);

    document.getElementById('count-feedback').innerHTML = 
        guess === actual 
            ? `✓ Correct! Running count: ${actual}`
            : `✗ Wrong. Actual: ${actual} (you guessed ${guess})`;

    const decksAtStart = numDecks - Math.round((52*numDecks - deck.length - seenCards.length) / 52);
    const trueCountStart = Math.round(actual / decksAtStart * 10) / 10;
    document.getElementById('count-feedback').innerHTML += `<br>True count at start: ~${trueCountStart}`;
}

// Initial setup
createDeck();
updateDisplay();
