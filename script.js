// script.js - FINAL FIXED: Running count guess 100% works

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
function getCardImageHTML(card) {
    const suitMap = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
    const rankMap = { 'A': 'ace', 'J': 'jack', 'Q': 'queen', 'K': 'king' };
    
    let rank = card.slice(0, -1);
    const suitIcon = card.slice(-1);
    
    // Convert rank to full name if necessary (e.g., "A" to "ace")
    const rankName = rankMap[rank] || rank;
    const suitName = suitMap[suitIcon];
    
    const fileName = `${rankName}_of_${suitName}.svg`;

    // Assuming your images are in a folder named 'cards'
    return `<img src="cards/${fileName}" class="card-img" alt="${card}">`;
}

const fab4 = {
    17: {'A': 2},
    16: {9: 5, 10: 0, 'A': 1},
    15: {10: 0, 9: 3, 'A': 1},
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
    return Math.round(runningCount / decksLeft * 10) / 10;
}

function updateTrueCount() {
    document.getElementById('true-count').innerText = getCurrentTrueCount();
}

function updateBetSuggestion() {
    const tc = getCurrentTrueCount();
    let units = 1;

    // PROFESSIONAL 1-12 RAMP (6-Deck Optimized)
    // Advantage starts roughly at TC +1 (+0.5% for every point of TC)
    if (tc < 1) {
        units = 1;        // Minimum bet (protect bankroll/avoid heat)
    } else if (tc >= 1 && tc < 2) {
        units = 2;        // Neutral zone
    } else if (tc >= 2 && tc < 3) {
        units = 4;        // Advantage ~0.5%
    } else if (tc >= 3 && tc < 4) {
        units = 8;        // Advantage ~1.0%
    } else if (tc >= 4) {
        units = 12;       // Advantage ~1.5%+ (Max Bet)
    }

    const suggestedAmount = baseUnit * units;
    
    // Safety check: Don't suggest a bet larger than current bankroll
    const finalSuggestion = Math.min(suggestedAmount, bankroll);

    document.getElementById('bet-suggestion').innerHTML = 
        `Suggested Bet: <strong>$${finalSuggestion}</strong> (${units} units)`;
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

    let hideDealer = (gamePhase === 'playing' || gamePhase === 'insurance');

    let dealerStr = hideDealer
        ? cardText(dealerHand[0]) + ' ??'
        : dealerHand.map(cardText).join(' ');
    
    document.getElementById('dealer-cards').innerText = dealerStr;
    document.getElementById('dealer-total').innerText = hideDealer
        ? '?'
        : calculateTotal(dealerHand);

    const hand = playerHands[currentHandIndex] || [];
    document.getElementById('player-cards').innerText = hand.map(cardText).join(' ');
    document.getElementById('player-total').innerText = calculateTotal(hand);

    const dealBtn = document.getElementById('deal-button');
    if (gamePhase === 'betting') {
        dealBtn.style.display = 'inline-block';
    } else {
        dealBtn.style.display = midRoundDealAllowed ? 'inline-block' : 'none';
    }

    updateButtonVisibility();
}

function startHand() {
    currentBet = parseInt(document.getElementById('bet-input').value) || baseUnit;
    if (currentBet > bankroll || currentBet < baseUnit) {
        alert("Invalid bet!");
        return;
    }
    bankroll -= currentBet;
    insuranceTaken = false;
    insuranceBet = 0;

    playerHands = [[]];
    dealerHand = [];
    currentHandIndex = 0;
    gamePhase = 'playing';
    moveJustMade = false;

    document.getElementById('end-round').style.display = 'none';

    dealCard(playerHands[0]);
    dealCard(dealerHand);
    dealCard(playerHands[0]);
    dealCard(dealerHand);

    if (dealerHand[0].startsWith('A')) {
        gamePhase = 'insurance';
        document.getElementById('feedback').innerText = "Insurance offered — decide";
    } else {
        document.getElementById('feedback').innerText = "Make your move...";
    }

    updateDisplay();
}

function takeInsurance() {
    const tc = getCurrentTrueCount();
    document.getElementById('feedback').innerText = tc >= 3 
        ? "✓ Correct — Insurance at TC ≥ +3"
        : "✗ Wrong — Only take insurance at TC ≥ +3";

    insuranceBet = currentBet / 2;
    if (bankroll < insuranceBet) {
        alert("Not enough bankroll for insurance!");
        return;
    }
    bankroll -= insuranceBet;
    insuranceTaken = true;
    proceedAfterInsurance();
}

function declineInsurance() {
    const tc = getCurrentTrueCount();
    document.getElementById('feedback').innerText = tc < 3 
        ? "✓ Correct — Decline below +3"
        : "✗ Wrong — Take insurance at TC ≥ +3";
    proceedAfterInsurance();
}

function proceedAfterInsurance() {
    gamePhase = 'playing';
    if (calculateTotal(dealerHand) === 21) {
        document.getElementById('result').innerText = "Dealer has Blackjack!";
        if (insuranceTaken) {
            bankroll += insuranceBet * 3;
            document.getElementById('result').innerText += " Insurance wins!";
        }
        evaluateResults();
    } else {
        document.getElementById('feedback').innerText = "Make your move...";
        updateDisplay();
    }
}

function playerMove(action) {
    const hand = playerHands[currentHandIndex];

    if (hand.length === 2 && !moveJustMade) {
        totalDecisions++;
        const correct = getCorrectAction(hand);
        const basic = getBasicAction(hand);
        if (action === correct) {
            correctDecisions++;
            document.getElementById('feedback').innerText = action === basic 
                ? "✓ Correct basic strategy!" 
                : "✓ Correct — Count deviation!";
        } else {
            document.getElementById('feedback').innerText = `✗ Wrong — correct was ${correct.toUpperCase()}${correct !== basic ? ' (deviation)' : ''}`;
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
            moveJustMade = false;
        }
    } else if (action === 'surrender') {
        if (hand.length === 2 && lateSurrenderAllowed) {
            bankroll += currentBet / 2;
            document.getElementById('result').innerText = "Surrendered — lost half";
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
        const allBust = playerHands.every(h => calculateTotal(h) > 21);
        if (allBust) {
            document.getElementById('result').innerText = "All hands bust — you lose";
            // Important: Change phase to dealer so cards are revealed even on a bust
            gamePhase = 'dealer';
            updateDisplay();
            evaluateResults();
        } else {
            dealerPlay();
        }
    }
    updateDisplay();
}

// Logic Fix: Use a timeout loop so we can see the cards being dealt
function dealerPlay() {
    gamePhase = 'dealer';
    updateDisplay(); // Reveal hole card immediately
    setTimeout(dealerHitStep, 800);
}

function dealerHitStep() {
    const total = calculateTotal(dealerHand);
    const soft = isSoft(dealerHand);

    if (total < 17 || (total === 17 && dealerHitsSoft17 && soft)) {
        dealCard(dealerHand);
        updateDisplay();
        setTimeout(dealerHitStep, 800);
    } else {
        evaluateResults();
    }
}

function evaluateResults() {
    let result = '';
    let net = 0;

    const dealerBJ = calculateTotal(dealerHand) === 21 && dealerHand.length === 2;

    playerHands.forEach(hand => {
        const pTotal = calculateTotal(hand);
        const dTotal = calculateTotal(dealerHand);

        if (pTotal > 21) {
            result += 'Bust — Lose<br>';
        } else if (dealerBJ && pTotal === 21 && hand.length === 2) {
            net += currentBet;
            result += 'Push (both Blackjack)<br>';
        } else if (dealerBJ) {
            result += 'Dealer Blackjack — Lose<br>';
        } else if (dTotal > 21 || pTotal > dTotal) {
            if (pTotal === 21 && hand.length === 2) {
                net += currentBet * 1.5;
                result += 'BLACKJACK! +1.5x<br>';
            } else {
                net += currentBet;
                result += 'Win<br>';
            }
        } else if (pTotal === dTotal) {
            net += currentBet;
            result += 'Push<br>';
        } else {
            result += 'Lose<br>';
        }
    });

    if (insuranceTaken && dealerBJ) {
        net += insuranceBet * 3;
        result += '<br>Insurance wins!';
    }

    bankroll += net;
    document.getElementById('result').innerHTML = result + `<br>Net: ${net >= 0 ? '+' : ''}$${net}`;

    // Show the guess section
    document.getElementById('end-round').style.display = 'block';
    // Ensure the submit button is visible for the new guess
    document.getElementById('check-count-btn').style.display = 'inline-block'; 
    document.getElementById('feedback').innerText = "Round over — guess the running count!";

    updateDisplay();
}

function checkCount() {
    // Hide the button immediately so it can't be pressed twice
    document.getElementById('check-count-btn').style.display = 'none';

    const actualRC = seenCards.reduce((s, c) => s + getHiLoTag(c), 0);
    const guess = parseInt(document.getElementById('count-guess').value) || 0;

    totalCountGuesses++;
    if (guess === actualRC) {
        correctCountGuesses++;
        document.getElementById('count-feedback').innerHTML = `<strong style="color:lime">✓ CORRECT!</strong> Running count was ${actualRC}`;
    } else {
        document.getElementById('count-feedback').innerHTML = `<strong style="color:red">✗ WRONG</strong> — Running count was ${actualRC} (you guessed ${guess})`;
    }

    previousRunningCount = actualRC;
    document.getElementById('previous-rc').innerText = previousRunningCount;
    updateCountAccuracy();

    setTimeout(() => {
        // Full clean reset for the UI, but we NO LONGER reset seenCards here
        document.getElementById('end-round').style.display = 'none';
        document.getElementById('count-feedback').innerHTML = '';
        document.getElementById('result').innerHTML = '';
        document.getElementById('dealer-cards').innerText = '?';
        document.getElementById('dealer-total').innerText = '?';
        document.getElementById('player-cards').innerText = '?';
        document.getElementById('player-total').innerText = '?';
        document.getElementById('feedback').innerText = "Ready — press Deal to start";
        document.getElementById('count-guess').value = '';

        // Reset hands for the next round
        playerHands = [];
        dealerHand = [];
        // seenCards = [];  <-- THIS LINE REMOVED to keep count between rounds

        gamePhase = 'betting';
        updateDisplay(); 
        updateBetSuggestion();
    }, 4000);
}

// Initialize
createDeck();
updateDisplay();
updateCountAccuracy();

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('apply-settings-btn').addEventListener('click', applySettings);
    document.getElementById('overlay').addEventListener('click', closeSettings);

    document.getElementById('deal-button').addEventListener('click', startHand);

    document.getElementById('hit-btn').addEventListener('click', () => playerMove('hit'));
    document.getElementById('stand-btn').addEventListener('click', () => playerMove('stand'));
    document.getElementById('double-btn').addEventListener('click', () => playerMove('double'));
    document.getElementById('split-btn').addEventListener('click', () => playerMove('split'));
    document.getElementById('surrender-btn').addEventListener('click', () => playerMove('surrender'));

    document.getElementById('insurance-btn').addEventListener('click', takeInsurance);
    document.getElementById('no-insurance-btn').addEventListener('click', declineInsurance);

    document.getElementById('check-count-btn').addEventListener('click', checkCount);
});
