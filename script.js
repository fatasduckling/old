let deck = [], playerHands = [], dealerHand = [], seenCards = [];
let bankroll = 5000, baseUnit = 25, currentBet = 25, currentHandIndex = 0;
let gamePhase = 'betting', moveJustMade = false, countingEnabled = true, guessCountEnabled = true;
let totalDecisions = 0, correctDecisions = 0, totalCountGuesses = 0, correctCountGuesses = 0;
let numDecks = 6;

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Image mapping for your specific filenames
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

function updateBetSuggestion() {
    if (!countingEnabled) { document.getElementById('bet-suggestion').style.display = 'none'; return; }
    const tc = getCurrentTrueCount();
    let units = 1;
    if (tc >= 1 && tc < 2) units = 2;
    else if (tc >= 2 && tc < 3) units = 4;
    else if (tc >= 3 && tc < 4) units = 8;
    else if (tc >= 4) units = 12; // 1-12 Profitable Spread
    document.getElementById('bet-suggestion').innerHTML = `Suggested bet: $${baseUnit * units} (${units} units)`;
}

function updateDisplay() {
    document.getElementById('bankroll').innerText = bankroll.toLocaleString();
    document.getElementById('true-count').innerText = countingEnabled ? getCurrentTrueCount() : "N/A";
    document.getElementById('decks-left').innerText = (deck.length / 52).toFixed(1);
    updateBetSuggestion();

    const hideDealer = (gamePhase === 'playing' || gamePhase === 'insurance' || gamePhase === 'dealer');
    
    // Using innerHTML to render the <img> tags
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
    bankroll -= currentBet;
    playerHands = [[]]; dealerHand = []; currentHandIndex = 0; gamePhase = 'playing'; moveJustMade = false;
    document.getElementById('end-round').style.display = 'none';
    dealCard(playerHands[0]); dealCard(dealerHand); dealCard(playerHands[0]); dealCard(dealerHand);
    updateDisplay();
}

function playerMove(action) {
    const hand = playerHands[currentHandIndex];
    if (action === 'hit') { dealCard(hand); if (calculateTotal(hand) > 21) nextHand(); }
    else if (action === 'stand') nextHand();
    updateDisplay();
}

function nextHand() {
    if (currentHandIndex < playerHands.length - 1) currentHandIndex++;
    else dealerPlay();
}

function dealerPlay() {
    gamePhase = 'dealer-turn';
    updateDisplay();
    const step = () => {
        if (calculateTotal(dealerHand) < 17) { dealCard(dealerHand); updateDisplay(); setTimeout(step, 800); }
        else evaluateResults();
    };
    setTimeout(step, 800);
}

function evaluateResults() {
    // Basic win/loss logic
    if (guessCountEnabled) {
        document.getElementById('end-round').style.display = 'block';
        document.getElementById('check-count-btn').style.display = 'inline-block';
    } else { gamePhase = 'betting'; }
    updateDisplay();
}

function checkCount() {
    document.getElementById('check-count-btn').style.display = 'none';
    const actual = seenCards.reduce((s, c) => s + getHiLoTag(c), 0);
    const guess = parseInt(document.getElementById('count-guess').value) || 0;
    if (guess === actual) document.getElementById('count-feedback').innerText = "✓ Correct!";
    else document.getElementById('count-feedback').innerText = `✗ Wrong: was ${actual}`;
    
    setTimeout(() => { 
        document.getElementById('end-round').style.display = 'none'; 
        gamePhase = 'betting'; 
        updateDisplay(); 
    }, 3000);
}

createDeck();
updateDisplay();
document.getElementById('deal-button').onclick = startHand;
document.getElementById('hit-btn').onclick = () => playerMove('hit');
document.getElementById('stand-btn').onclick = () => playerMove('stand');
document.getElementById('check-count-btn').onclick = checkCount;
document.getElementById('settings-btn').onclick = () => { document.getElementById('settings-menu').style.display='block'; document.getElementById('overlay').style.display='block'; };
document.getElementById('apply-settings-btn').onclick = () => { 
    countingEnabled = document.getElementById('counting-on').value === 'true';
    guessCountEnabled = document.getElementById('guess-count-on').value === 'true';
    document.getElementById('settings-menu').style.display='none'; 
    document.getElementById('overlay').style.display='none'; 
    updateDisplay(); 
};
