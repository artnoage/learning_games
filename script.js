// Vue.js application
// Wait for Vue to load
window.onload = () => {
    console.log('Window loaded, checking for Vue');
    
    // Try multiple times to initialize Vue (in case it loads with delay)
    let attempts = 0;
    const maxAttempts = 5;
    
    function initVue() {
        console.log(`Attempt ${attempts + 1} to initialize Vue`);
        
        if (typeof Vue !== 'undefined') {
            console.log('Vue is defined, initializing app');
            initializeApp();
        } else if (attempts < maxAttempts) {
            console.log('Vue not defined yet, trying again in 500ms');
            attempts++;
            setTimeout(initVue, 500);
        } else {
            console.error('Vue is not defined after multiple attempts! Make sure the Vue script is loaded correctly.');
            alert('Error: Vue.js failed to load. Please check the console for details.');
        }
    }
    
    // Start the initialization process
    initVue();
};

function initializeApp() {
    console.log('Vue version:', Vue.version);
    const { createApp, ref, computed, onMounted } = Vue;

    const app = createApp({
    setup() {
        // Game state
        const gameStarted = ref(false);
        const memorizationPhase = ref(false);
        const memorizationTime = ref(5);
        const timer = ref(0);
        const timerInterval = ref(null);
        const matchedPairs = ref(0);
        const flippedCards = ref([]);
        const score = ref(0);
        const highScores = ref(JSON.parse(localStorage.getItem('memoryGameHighScores') || '{}'));
        
        // Sound effects
        const sounds = {
            match: null,
            wrong: null,
            levelUp: null
        };
        
        // Sound file paths
        const soundPaths = {
            match: '/sounds/match.wav',
            wrong: '/sounds/wrong.wav',
            levelUp: '/sounds/levelup.wav'
        };
        
        // Initialize sounds after user interaction
        const initSounds = () => {
            if (!sounds.match) {
                console.log('Initializing sounds from files');
                sounds.match = new Audio(soundPaths.match);
                sounds.wrong = new Audio(soundPaths.wrong);
                sounds.levelUp = new Audio(soundPaths.levelUp);
                
                // Preload sounds
                sounds.match.load();
                sounds.wrong.load();
                sounds.levelUp.load();
                
                // Play and immediately pause to initialize audio context
                const initSound = () => {
                    sounds.match.volume = 0;
                    sounds.match.play().then(() => {
                        sounds.match.pause();
                        sounds.match.currentTime = 0;
                        sounds.match.volume = 1;
                        console.log('Sound initialized successfully');
                    }).catch(e => console.error('Could not initialize audio:', e));
                };
                
                // Try to initialize
                initSound();
            }
        };
        
        // Game levels
        const levels = ref([
            { id: 1, name: "Beginner", pairsCount: 4, memTime: 5, unlocked: true },
            { id: 2, name: "Easy", pairsCount: 8, memTime: 10, unlocked: false },
            { id: 3, name: "Medium", pairsCount: 12, memTime: 15, unlocked: false },
            { id: 4, name: "Hard", pairsCount: 16, memTime: 20, unlocked: false },
            { id: 5, name: "Expert", pairsCount: 20, memTime: 25, unlocked: false }
        ]);
        const currentLevel = ref(1);
        
        // Load unlocked levels from localStorage
        try {
            const unlockedLevels = JSON.parse(localStorage.getItem('memoryGameUnlockedLevels') || '{"1": true}');
            levels.value.forEach(level => {
                if (unlockedLevels[level.id]) {
                    level.unlocked = true;
                }
            });
        } catch (e) {
            console.error('Error loading unlocked levels:', e);
        }
        
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
                console.log('Loading default pairs...');
                let defaultPairs;
                
                try {
                    // First try to load from the JSON file with explicit path
                    const response = await fetch('/default_pairs.json');
                    if (!response.ok) {
                        throw new Error('Failed to load from JSON file');
                    }
                    defaultPairs = await response.json();
                    console.log('Loaded pairs from JSON file:', defaultPairs);
                } catch (jsonError) {
                    console.warn('Could not load from JSON, trying API endpoint:', jsonError);
                    // Fallback to API endpoint
                    const apiResponse = await fetch('/api/default-pairs');
                    if (!apiResponse.ok) {
                        throw new Error('Failed to load from API');
                    }
                    defaultPairs = await apiResponse.json();
                    console.log('Loaded pairs from API:', defaultPairs);
                }
                
                if (!Array.isArray(defaultPairs) || defaultPairs.length === 0) {
                    throw new Error('Invalid default pairs data');
                }
                
                // Clear existing pairs and add default pairs
                wordPairs.value = defaultPairs.map(pair => ({
                    word1: pair[0],
                    word2: pair[1]
                }));
                
                // Limit pairs based on current level
                const currentLevelObj = levels.value.find(l => l.id === currentLevel.value);
                if (currentLevelObj && wordPairs.value.length > currentLevelObj.pairsCount) {
                    wordPairs.value = wordPairs.value.slice(0, currentLevelObj.pairsCount);
                }
                
                console.log('Default pairs loaded successfully');
            } catch (error) {
                console.error('Error loading default pairs:', error);
                alert('Failed to load default pairs: ' + error.message);
                
                // Fallback to hardcoded pairs
                const hardcodedPairs = [
                    ["Hello", "Hallo"],
                    ["Thank you", "Danke"],
                    ["Yes", "Ja"],
                    ["No", "Nein"]
                ];
                
                wordPairs.value = hardcodedPairs.map(pair => ({
                    word1: pair[0],
                    word2: pair[1]
                }));
                
                console.log('Using hardcoded pairs as fallback');
            }
        };
        
        const loadCustomJson = async () => {
            try {
                // Create a file input element
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.json';
                
                // Handle file selection
                fileInput.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (!file) return;
                    
                    try {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const customPairs = JSON.parse(e.target.result);
                                
                                if (!Array.isArray(customPairs) || customPairs.length === 0) {
                                    throw new Error('Invalid JSON format. Expected an array of pairs.');
                                }
                                
                                // Check if the format is correct (array of arrays with 2 elements each)
                                const isValidFormat = customPairs.every(pair => 
                                    Array.isArray(pair) && pair.length === 2 && 
                                    typeof pair[0] === 'string' && typeof pair[1] === 'string'
                                );
                                
                                if (!isValidFormat) {
                                    throw new Error('Invalid JSON format. Expected an array of pairs [string, string].');
                                }
                                
                                // Clear existing pairs and add custom pairs
                                wordPairs.value = customPairs.map(pair => ({
                                    word1: pair[0],
                                    word2: pair[1]
                                }));
                                
                                // Limit pairs based on current level
                                const currentLevelObj = levels.value.find(l => l.id === currentLevel.value);
                                if (currentLevelObj && wordPairs.value.length > currentLevelObj.pairsCount) {
                                    wordPairs.value = wordPairs.value.slice(0, currentLevelObj.pairsCount);
                                }
                                
                                console.log('Custom pairs loaded successfully');
                            } catch (parseError) {
                                console.error('Error parsing JSON:', parseError);
                                alert('Failed to parse JSON: ' + parseError.message);
                            }
                        };
                        reader.readAsText(file);
                    } catch (fileError) {
                        console.error('Error reading file:', fileError);
                        alert('Failed to read file: ' + fileError.message);
                    }
                };
                
                // Trigger file selection dialog
                fileInput.click();
            } catch (error) {
                console.error('Error loading custom JSON:', error);
                alert('Failed to load custom JSON: ' + error.message);
            }
        };
        
        const startGame = () => {
            // Initialize sounds (must be triggered by user interaction)
            initSounds();
            
            // Filter valid pairs
            const validPairs = wordPairs.value.filter(pair => 
                pair.word1.trim() !== '' && pair.word2.trim() !== ''
            );
            
            // Get current level settings
            const currentLevelObj = levels.value.find(l => l.id === currentLevel.value);
            const requiredPairs = currentLevelObj ? currentLevelObj.pairsCount : 2;
            
            // Check if level is unlocked
            if (currentLevelObj && !currentLevelObj.unlocked) {
                alert(`Level ${currentLevel.value} is locked. Complete the previous level first.`);
                return;
            }
            
            // Check if we have enough pairs for the current level
            if (validPairs.length < requiredPairs) {
                alert(`Level ${currentLevel.value} requires at least ${requiredPairs} valid pairs. Please add more pairs or choose a lower level.`);
                return;
            }
            
            // Limit pairs to the current level's count
            const gamePairs = validPairs.slice(0, requiredPairs);
            
            // Reset game state
            matchedPairs.value = 0;
            flippedCards.value = [];
            score.value = 0;
            
            // Create cards
            createCards(gamePairs);
            
            // Start game
            gameStarted.value = true;
            memorizationPhase.value = true;
            
            // Set memorization time based on level
            memorizationTime.value = currentLevelObj ? currentLevelObj.memTime : 5;
            
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
                
                // Update matches count and score
                matchedPairs.value++;
                score.value += 1;
                
                // Play match sound
                if (sounds.match) {
                    sounds.match.currentTime = 0;
                    sounds.match.play().catch(e => console.log('Error playing sound:', e));
                }
                
                // Add visual feedback
                addMatchAnimation(card1, card2);
                
                // Check if game is complete
                if (matchedPairs.value === totalPairs.value) {
                    gameOver();
                }
            } else {
                // Flip cards back and decrease score
                score.value = Math.max(0, score.value - 1); // Don't go below 0
                
                // Play wrong sound
                if (sounds.wrong) {
                    sounds.wrong.currentTime = 0;
                    sounds.wrong.play().catch(e => console.log('Error playing sound:', e));
                }
                
                // Add visual feedback for wrong match
                addWrongAnimation(card1, card2);
                
                setTimeout(() => {
                    card1.isFlipped = false;
                    card2.isFlipped = false;
                }, 1000);
            }
            
            // Clear flipped cards array
            flippedCards.value = [];
        };
        
        const addMatchAnimation = (card1, card2) => {
            // Add a CSS class for animation
            const elements = document.querySelectorAll('.card.flipped.matched');
            elements.forEach(el => {
                el.classList.add('match-animation');
                setTimeout(() => el.classList.remove('match-animation'), 1000);
            });
        };
        
        const addWrongAnimation = (card1, card2) => {
            // Add a CSS class for animation
            const elements = document.querySelectorAll('.card.flipped:not(.matched)');
            elements.forEach(el => {
                el.classList.add('wrong-animation');
                setTimeout(() => el.classList.remove('wrong-animation'), 1000);
            });
        };
        
        const gameOver = () => {
            clearInterval(timerInterval.value);
            
            // Calculate final score based on time and level
            const currentLevelObj = levels.value.find(l => l.id === currentLevel.value);
            const timeBonus = Math.max(0, 100 - timer.value); // Faster completion = higher bonus
            const finalScore = score.value + timeBonus + (currentLevel.value * 10);
            
            // Save high score if it's better than previous
            if (!highScores.value[currentLevel.value] || finalScore > highScores.value[currentLevel.value]) {
                highScores.value[currentLevel.value] = finalScore;
                localStorage.setItem('memoryGameHighScores', JSON.stringify(highScores.value));
            }
            
            // Check if player passed the level (more than half the maximum possible score)
            const maxPossibleScore = currentLevelObj.pairsCount + 100 + (currentLevel.value * 10);
            const passedLevel = finalScore > (maxPossibleScore / 2);
            
            // Unlock next level if passed and not already at max level
            if (passedLevel && currentLevel.value < levels.value.length) {
                const nextLevel = levels.value.find(l => l.id === currentLevel.value + 1);
                if (nextLevel && !nextLevel.unlocked) {
                    nextLevel.unlocked = true;
                    
                    // Save unlocked levels to localStorage
                    const unlockedLevels = {};
                    levels.value.forEach(level => {
                        if (level.unlocked) unlockedLevels[level.id] = true;
                    });
                    localStorage.setItem('memoryGameUnlockedLevels', JSON.stringify(unlockedLevels));
                    
                    // Play level up sound
                    if (sounds.levelUp) {
                        sounds.levelUp.currentTime = 0;
                        sounds.levelUp.play().catch(e => console.log('Error playing sound:', e));
                    }
                    
                    setTimeout(() => {
                        alert(`Congratulations! You completed level ${currentLevel.value} with a score of ${finalScore}!\n\nYou've unlocked level ${currentLevel.value + 1}!`);
                    }, 500);
                } else {
                    setTimeout(() => {
                        alert(`Congratulations! You completed level ${currentLevel.value} with a score of ${finalScore}!`);
                    }, 500);
                }
            } else if (currentLevel.value === levels.value.length && passedLevel) {
                // Player beat the final level
                setTimeout(() => {
                    alert(`Amazing! You've mastered the final level with a score of ${finalScore}!\n\nYou've completed all levels of the Memory Pairs Game!`);
                }, 500);
            } else {
                // Player didn't pass the level
                setTimeout(() => {
                    alert(`Game over! Your score: ${finalScore}\n\nYou need at least ${Math.ceil(maxPossibleScore / 2)} points to advance to the next level. Try again!`);
                }, 500);
            }
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
        
        // Load default pairs on mount
        onMounted(() => {
            console.log('Vue component mounted');
            // Load default pairs on startup
            loadDefaultPairs();
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
            levels,
            currentLevel,
            score,
            highScores,
            addPair,
            removePair,
            loadDefaultPairs,
            loadCustomJson,
            startGame,
            flipCard,
            restartGame
        };
    }
    });
    
    // Mount the app with error handling
    try {
        app.mount('#app');
        console.log('Vue app mounted successfully');
    } catch (error) {
        console.error('Failed to mount Vue app:', error);
        alert('Error: Failed to initialize the game. Please check the console for details.');
    }
}
