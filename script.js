// Vue.js application
const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        // Game state
        const gameStarted = ref(false);
        const memorizationPhase = ref(false);
        const memorizationTime = ref(5);
        const timer = ref(0);
        const timerInterval = ref(null);
        const matchedPairs = ref(0);
        const flippedCards = ref([]);
        
        // Word pairs
        const wordPairs = ref([
            { word1: '', word2: '' }
        ]);
        
        // Cards
        const cards = ref([]);
        
        // Computed properties
        const totalPairs = computed(() => {
            return wordPairs.value.filter(pair => 
                pair.word1.trim() !== '' && pair.word2.trim() !== ''
            ).length;
        });
        
        // Methods
        const addPair = () => {
            wordPairs.value.push({ word1: '', word2: '' });
        };
        
        const removePair = (index) => {
            if (wordPairs.value.length > 1) {
                wordPairs.value.splice(index, 1);
            }
        };
        
        const loadDefaultPairs = async () => {
            try {
                const response = await fetch('default_pairs.json');
                if (!response.ok) {
                    throw new Error('Failed to load default pairs');
                }
                const defaultPairs = await response.json();
                
                // Clear existing pairs and add default pairs
                wordPairs.value = defaultPairs.map(pair => ({
                    word1: pair[0],
                    word2: pair[1]
                }));
            } catch (error) {
                console.error('Error loading default pairs:', error);
                alert('Failed to load default pairs.');
            }
        };
        
        const startGame = () => {
            // Filter valid pairs
            const validPairs = wordPairs.value.filter(pair => 
                pair.word1.trim() !== '' && pair.word2.trim() !== ''
            );
            
            // Check if we have at least 2 pairs
            if (validPairs.length < 2) {
                alert('Please add at least 2 valid pairs to start the game.');
                return;
            }
            
            // Reset game state
            matchedPairs.value = 0;
            flippedCards.value = [];
            
            // Create cards
            createCards(validPairs);
            
            // Start game
            gameStarted.value = true;
            memorizationPhase.value = true;
            
            // Start memorization timer
            timer.value = memorizationTime.value;
            
            timerInterval.value = setInterval(() => {
                timer.value--;
                
                if (timer.value <= 0) {
                    clearInterval(timerInterval.value);
                    hideAllCards();
                    startGameTimer();
                }
            }, 1000);
        };
        
        const createCards = (validPairs) => {
            // Create flat array of all words
            const allWords = [];
            validPairs.forEach(pair => {
                allWords.push(pair.word1, pair.word2);
            });
            
            // Shuffle the words
            const shuffledWords = shuffleArray([...allWords]);
            
            // Create card objects
            cards.value = shuffledWords.map(word => ({
                word: word,
                isFlipped: true, // Start flipped for memorization
                isMatched: false
            }));
        };
        
        const hideAllCards = () => {
            cards.value.forEach(card => {
                card.isFlipped = false;
            });
            memorizationPhase.value = false;
        };
        
        const startGameTimer = () => {
            timer.value = 0;
            
            timerInterval.value = setInterval(() => {
                timer.value++;
            }, 1000);
        };
        
        const flipCard = (card) => {
            // Ignore if in memorization phase, card is already flipped or matched, or two cards are already flipped
            if (memorizationPhase.value || card.isFlipped || card.isMatched || flippedCards.value.length >= 2) {
                return;
            }
            
            // Flip the card
            card.isFlipped = true;
            flippedCards.value.push(card);
            
            // Check for a match if two cards are flipped
            if (flippedCards.value.length === 2) {
                setTimeout(checkForMatch, 1000);
            }
        };
        
        const checkForMatch = () => {
            const [card1, card2] = flippedCards.value;
            
            // Check if the words form a pair
            let isMatch = false;
            for (const pair of wordPairs.value) {
                if ((card1.word === pair.word1 && card2.word === pair.word2) || 
                    (card1.word === pair.word2 && card2.word === pair.word1)) {
                    isMatch = true;
                    break;
                }
            }
            
            if (isMatch) {
                // Mark cards as matched
                card1.isMatched = true;
                card2.isMatched = true;
                
                // Update matches count
                matchedPairs.value++;
                
                // Check if game is complete
                if (matchedPairs.value === totalPairs.value) {
                    gameOver();
                }
            } else {
                // Flip cards back
                setTimeout(() => {
                    card1.isFlipped = false;
                    card2.isFlipped = false;
                }, 500);
            }
            
            // Clear flipped cards array
            flippedCards.value = [];
        };
        
        const gameOver = () => {
            clearInterval(timerInterval.value);
            setTimeout(() => {
                alert(`Congratulations! You completed the game in ${timer.value} seconds!`);
            }, 500);
        };
        
        const restartGame = () => {
            clearInterval(timerInterval.value);
            gameStarted.value = false;
            memorizationPhase.value = false;
        };
        
        const shuffleArray = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        };
        
        // Load default pairs on mount (optional)
        onMounted(() => {
            // Uncomment to load default pairs on startup
            // loadDefaultPairs();
        });
        
        return {
            gameStarted,
            memorizationPhase,
            memorizationTime,
            timer,
            matchedPairs,
            totalPairs,
            wordPairs,
            cards,
            addPair,
            removePair,
            loadDefaultPairs,
            startGame,
            flipCard,
            restartGame
        };
    }
}).mount('#app');
