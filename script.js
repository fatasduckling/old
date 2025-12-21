// script.js - FINAL FIXED: Running count guess works perfectly

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
    17: {'A': 2},
    16: {9: 5, 10: 0, 'A': 1},
    15: {10: 0, 9: 3, 'A': 1},
    14: {10: 3}
};

// === All functions unchanged until checkCount ===
// (openSettings, closeSettings, applySettings, createDeck, shuffle, dealCard,
// getHiLoTag, cardText, getValue, calculateTotal, isSoft, isPair, getDealerUpVal,
// getBasicAction, getCorrectAction, getCurrentTrueCount, updateTrueCount,
// updateBetSuggestion, updatePlayAccuracy, updateCountAccuracy,
// updateButtonVisibility, updateDisplay, startHand, takeInsurance, declineInsurance,
// proceedAfterInsurance, playerMove, nextHand, dealerPlay, evaluateResults)

// ... [keep all those functions exactly as in the last version I sent] ...

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

    // Show running count guess section
    document.getElementById('end-round').style.display = 'block';
    document.getElementById('feedback').innerText = "Round over — guess the running count!";

    updateDisplay();
}

function checkCount() {
    // *** CRITICAL FIX: Calculate actual RC BEFORE resetting seenCards ***
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

    // Reset for next hand after delay
    setTimeout(() => {
        // Clear UI
        document.getElementById('end-round').style.display = 'none';
        document.getElementById('count-feedback').innerHTML = '';
        document.getElementById('result').innerHTML = '';
        document.getElementById('dealer-cards').innerText = '?';
        document.getElementById('dealer-total').innerText = '?';
        document.getElementById('player-cards').innerText = '?';
        document.getElementById('player-total').innerText = '?';
        document.getElementById('feedback').innerText = "Ready — press Deal to start";
        document.getElementById('count-guess').value = '';

        // Reset game state
        playerHands = [];
        dealerHand = [];
        seenCards = [];  // Now safe to reset

        gamePhase = 'betting';
        updateDisplay();  // Deal button appears here
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
