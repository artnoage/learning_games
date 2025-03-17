document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const setupArea = document.querySelector('.setup-area');
    const gameArea = document.querySelector('.game-area');
    const pairInputs = document.querySelector('.pair-inputs');
    const addPairBtn = document.getElementById('add-pair');
    const loadDefaultsBtn = document.getElementById('load-defaults');
    const startGameBtn = document.getElementById('start-game');
    const restartGameBtn = document.getElementById('restart-game');
    const cardsContainer = document.querySelector('.cards-container');
    const timeDisplay = document.getElementById('time');
    const matchesDisplay = document.getElementById('matches');
    const totalPairsDisplay = document.getElementById('total-pairs');

    // Game variables
    let pairs = [];
    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let timer;
    let seconds = 0;
    let gameStarted = false;
    let memorizationTime = 5; // seconds to memorize cards

    // Add event listeners
    addPairBtn.addEventListener('click', addPairInput);
    loadDefaultsBtn.addEventListener('click', loadDefaultPairs);
    startGameBtn.addEventListener('click', startGame);
    restartGameBtn.addEventListener('click', restartGame);
    
    // Add first pair input if none exists
    if (pairInputs.children.length === 0) {
        addPairInput();
    }

    // Load default pairs from JSON file
    async function loadDefaultPairs() {
        try {
            const response = await fetch('default_pairs.json');
            if (!response.ok) {
                throw new Error('Failed to load default pairs');
            }
            const defaultPairs = await response.json();
            
            // Clear existing pairs
            pairInputs.innerHTML = '';
            
            // Add default pairs to the UI
            defaultPairs.forEach(pair => {
                const pairDiv = document.createElement('div');
                pairDiv.className = 'pair';
                pairDiv.innerHTML = `
                    <input type="text" class="word1" placeholder="Word 1" value="${pair[0]}">
                    <input type="text" class="word2" placeholder="Word 2" value="${pair[1]}">
                    <button class="remove-pair">✕</button>
                `;
                pairInputs.appendChild(pairDiv);
                
                // Add event listener to remove button
                const removeBtn = pairDiv.querySelector('.remove-pair');
                removeBtn.addEventListener('click', () => {
                    if (pairInputs.children.length > 1) {
                        pairInputs.removeChild(pairDiv);
                    }
                });
            });
        } catch (error) {
            console.error('Error loading default pairs:', error);
            alert('Failed to load default pairs. Using empty pairs instead.');
            // Add a single empty pair if loading fails
            addPairInput();
        }
    }
    
    // Add a new pair input
    function addPairInput() {
        const pairDiv = document.createElement('div');
        pairDiv.className = 'pair';
        pairDiv.innerHTML = `
            <input type="text" class="word1" placeholder="Word 1">
            <input type="text" class="word2" placeholder="Word 2">
            <button class="remove-pair">✕</button>
        `;
        pairInputs.appendChild(pairDiv);

        // Add event listener to remove button
        const removeBtn = pairDiv.querySelector('.remove-pair');
        removeBtn.addEventListener('click', () => {
            if (pairInputs.children.length > 1) {
                pairInputs.removeChild(pairDiv);
            }
        });
    }

    // Start the game
    function startGame() {
        // Collect pairs from inputs
        pairs = [];
        const pairElements = pairInputs.querySelectorAll('.pair');
        
        pairElements.forEach(pair => {
            const word1 = pair.querySelector('.word1').value.trim();
            const word2 = pair.querySelector('.word2').value.trim();
            
            if (word1 && word2) {
                pairs.push([word1, word2]);
            }
        });

        // Check if we have at least 2 pairs
        if (pairs.length < 2) {
            alert('Please add at least 2 valid pairs to start the game.');
            return;
        }

        // Update total pairs display
        totalPairsDisplay.textContent = pairs.length;
        matchesDisplay.textContent = '0';
        matchedPairs = 0;

        // Hide setup area and show game area
        setupArea.classList.add('hidden');
        gameArea.classList.remove('hidden');

        // Create cards
        createCards();

        // Show all cards for memorization
        showAllCards();

        // Start timer for memorization phase
        seconds = memorizationTime;
        timeDisplay.textContent = seconds;
        
        timer = setInterval(() => {
            seconds--;
            timeDisplay.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(timer);
                hideAllCards();
                startGameTimer();
            }
        }, 1000);
    }

    // Create cards from pairs
    function createCards() {
        cardsContainer.innerHTML = '';
        cards = [];
        flippedCards = [];
        
        // Create flat array of all words
        const allWords = [];
        pairs.forEach(pair => {
            allWords.push(...pair);
        });
        
        // Shuffle the words
        const shuffledWords = shuffleArray([...allWords]);
        
        // Create card elements
        shuffledWords.forEach(word => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-inner">
                    <div class="card-front"></div>
                    <div class="card-back">${word}</div>
                </div>
            `;
            cardsContainer.appendChild(card);
            
            // Store card data
            const cardData = {
                element: card,
                word: word,
                isFlipped: false,
                isMatched: false
            };
            
            cards.push(cardData);
            
            // Add click event
            card.addEventListener('click', () => flipCard(cardData));
        });
    }

    // Show all cards for memorization
    function showAllCards() {
        cards.forEach(card => {
            card.element.classList.add('flipped');
            card.isFlipped = true;
        });
        gameStarted = false;
    }

    // Hide all cards to start the game
    function hideAllCards() {
        cards.forEach(card => {
            card.element.classList.remove('flipped');
            card.isFlipped = false;
        });
        gameStarted = true;
    }

    // Start the game timer
    function startGameTimer() {
        seconds = 0;
        timeDisplay.textContent = seconds;
        
        timer = setInterval(() => {
            seconds++;
            timeDisplay.textContent = seconds;
        }, 1000);
    }

    // Flip a card
    function flipCard(card) {
        // Ignore if game hasn't started, card is already flipped or matched, or two cards are already flipped
        if (!gameStarted || card.isFlipped || card.isMatched || flippedCards.length >= 2) {
            return;
        }
        
        // Flip the card
        card.element.classList.add('flipped');
        card.isFlipped = true;
        flippedCards.push(card);
        
        // Check for a match if two cards are flipped
        if (flippedCards.length === 2) {
            setTimeout(checkForMatch, 1000);
        }
    }

    // Check if the two flipped cards are a match
    function checkForMatch() {
        const [card1, card2] = flippedCards;
        
        // Check if the words form a pair
        let isMatch = false;
        for (const pair of pairs) {
            if ((card1.word === pair[0] && card2.word === pair[1]) || 
                (card1.word === pair[1] && card2.word === pair[0])) {
                isMatch = true;
                break;
            }
        }
        
        if (isMatch) {
            // Mark cards as matched
            card1.isMatched = true;
            card2.isMatched = true;
            card1.element.classList.add('matched');
            card2.element.classList.add('matched');
            
            // Update matches count
            matchedPairs++;
            matchesDisplay.textContent = matchedPairs;
            
            // Check if game is complete
            if (matchedPairs === pairs.length) {
                gameOver();
            }
        } else {
            // Flip cards back
            card1.element.classList.remove('flipped');
            card2.element.classList.remove('flipped');
            card1.isFlipped = false;
            card2.isFlipped = false;
        }
        
        // Clear flipped cards array
        flippedCards = [];
    }

    // Game over
    function gameOver() {
        clearInterval(timer);
        setTimeout(() => {
            alert(`Congratulations! You completed the game in ${seconds} seconds!`);
        }, 500);
    }

    // Restart the game
    function restartGame() {
        clearInterval(timer);
        setupArea.classList.remove('hidden');
        gameArea.classList.add('hidden');
    }

    // Utility function to shuffle an array
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
});
