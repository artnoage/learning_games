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
    const { createApp, ref, computed, onMounted, reactive } = Vue; // Added reactive

    const app = createApp({
    setup() {
        // --- App State ---
        const currentView = ref('mainMenu'); // 'mainMenu', 'memoryGame', 'exerciseBuilder'

        // --- Memory Game State ---
        const gameStarted = ref(false);
        const memorizationPhase = ref(false);
        const memorizationTime = ref(5);
        const timer = ref(0);
        const timerInterval = ref(null);
        const matchedPairs = ref(0);
        const flippedCards = ref([]);
        const score = ref(0); // Memory game score
        const highScores = ref(JSON.parse(localStorage.getItem('memoryGameHighScores') || '{}'));

        // --- Sound effects ---
        const sounds = {
            match: null,
            wrong: null,
            levelUp: null,
            // Add sounds for exercise if needed later
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

        // --- Memory Game Levels ---
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

        // Memory Game Word pairs
        const wordPairs = ref([
            { word1: '', word2: '' }
        ]);

        // Memory Game Cards
        const cards = ref([]);

        // --- Exercise Builder State ---
        const exerciseTopic = ref('');
        const exerciseLanguage = ref('German'); // Default language
        const availableLanguages = ref([ // Language options
            { code: 'en', name: 'English' },
            { code: 'es', name: 'Spanish' },
            { code: 'fr', name: 'French' },
            { code: 'de', name: 'German' }
        ]);
        const generatedExercise = reactive({ // Use reactive for nested object
            sentences: [],
            answers: [],
            word_bank: []
        });
        const userAnswers = reactive({}); // Structure: { sentenceId: { gapIndex: answer } }
        const exerciseResults = reactive({}); // Structure: { sentenceId: { gapIndex: true/false/null } }
        const exerciseScore = ref(0);
        const totalGaps = ref(0); // To track total number of gaps for scoring
        const isLoadingExercise = ref(false);
        const exerciseError = ref('');
        const isExerciseChecked = ref(false);
        const backendUrl = 'http://127.0.0.1:5001'; // Backend server URL

        // --- Computed properties ---
        // Memory Game
        const totalPairs = computed(() => {
            return wordPairs.value.filter(pair =>
                pair.word1.trim() !== '' && pair.word2.trim() !== ''
            ).length;
        });

        // Exercise Builder - NEW: Parse sentences into segments (text/input)
        const formattedSentences = computed(() => {
            return generatedExercise.sentences.map(sentence => {
                const segments = [];
                let lastIndex = 0;
                let gapIndex = 0;
                const regex = /<gap>(.*?)<\/gap>/g; // Find all gaps
                let match;

                while ((match = regex.exec(sentence.text)) !== null) {
                    // Add text segment before the gap
                    if (match.index > lastIndex) {
                        segments.push({ type: 'text', content: sentence.text.substring(lastIndex, match.index) });
                    }
                    // Add input segment for the gap
                    segments.push({
                        type: 'input',
                        gapIndex: gapIndex++, // Index of the gap within this sentence
                        correctAnswer: match[1] // Store correct answer from gap content
                    });
                    lastIndex = regex.lastIndex;
                }

                // Add any remaining text after the last gap
                if (lastIndex < sentence.text.length) {
                    segments.push({ type: 'text', content: sentence.text.substring(lastIndex) });
                }

                return {
                    id: sentence.id,
                    segments: segments
                };
            });
        });


        // --- Methods ---

        // Navigation
        const showMainMenu = () => {
            currentView.value = 'mainMenu';
            // Optionally reset states when going back to menu
            resetMemoryGame();
            resetExerciseBuilder();
        };
        const showMemoryGame = () => {
            currentView.value = 'memoryGame';
            resetExerciseBuilder(); // Reset other game when switching
            // Load default pairs if needed or keep existing state
             if (wordPairs.value.length <= 1 && wordPairs.value[0].word1 === '' && wordPairs.value[0].word2 === '') {
                 loadDefaultPairs();
             }
        };
        const showExerciseBuilder = () => {
            currentView.value = 'exerciseBuilder';
            resetMemoryGame(); // Reset other game when switching
        };

        // Memory Game Methods
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

                // Limit pairs based on current level if a game is not in progress
                if (!gameStarted.value) {
                    const currentLevelObj = levels.value.find(l => l.id === currentLevel.value);
                    if (currentLevelObj && wordPairs.value.length > currentLevelObj.pairsCount) {
                        wordPairs.value = wordPairs.value.slice(0, currentLevelObj.pairsCount);
                    }
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

                // Limit pairs based on current level if a game is not in progress
                 if (!gameStarted.value) {
                    const currentLevelObj = levels.value.find(l => l.id === currentLevel.value);
                    if (currentLevelObj && wordPairs.value.length > currentLevelObj.pairsCount) {
                        wordPairs.value = wordPairs.value.slice(0, currentLevelObj.pairsCount);
                    }
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
            wordPairs.value = gamePairs; // Update wordPairs to only include the ones used in the game

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
        
        // Grid style for cards layout
        const gridStyle = computed(() => {
            const totalCards = cards.value.length;
            if (totalCards === 0) return {};

            // Calculate optimal grid dimensions (as close to square as possible)
            let columns = Math.ceil(Math.sqrt(totalCards));
            // Avoid overly wide grids for small numbers of cards
            if (totalCards <= 6) columns = Math.min(columns, 3);
            else if (totalCards <= 12) columns = Math.min(columns, 4);
            else if (totalCards <= 20) columns = Math.min(columns, 5);
            else columns = Math.min(columns, 6); // Max 6 columns

            return {
                'display': 'grid',
                'grid-template-columns': `repeat(${columns}, 1fr)`,
                'grid-gap': '10px'
            };
        });
        
        const createCards = (validPairs) => {
            // Create flat array of all words
            const allWords = [];
            validPairs.forEach(pair => {
                allWords.push(pair.word1, pair.word2);
            });
            
            // Shuffle the words
            const shuffledWords = shuffleArray([...allWords]);

            // Create card objects
            cards.value = shuffledWords.map((word, index) => ({
                id: index, // Add simple id
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
                setTimeout(checkForMatch, 700); // Slightly faster check
            }
        };

        const checkForMatch = () => {
            const [card1, card2] = flippedCards.value;

            // Check if the words form a pair using the current game's pairs
            let isMatch = false;
            const currentValidPairs = wordPairs.value.filter(p => p.word1.trim() && p.word2.trim());

            for (const pair of currentValidPairs) {
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
                    sounds.match.play().catch(e => console.log('Error playing match sound:', e));
                }

                // Add visual feedback (handled by CSS :matched class now)
                // addMatchAnimation(card1, card2); // Can remove if CSS handles it

                // Check if game is complete
                if (matchedPairs.value === currentValidPairs.length) { // Check against actual pairs in game
                    gameOver();
                }
            } else {
                // Flip cards back and decrease score
                score.value = Math.max(0, score.value - 1); // Don't go below 0

                // Play wrong sound
                if (sounds.wrong) {
                    sounds.wrong.currentTime = 0;
                    sounds.wrong.play().catch(e => console.log('Error playing wrong sound:', e));
                }

                // Add visual feedback for wrong match (can use CSS)
                addWrongAnimation(card1, card2); // Keep or use CSS animation

                // Flip back slightly faster
                setTimeout(() => {
                    // Only flip back if they haven't been matched in the meantime by another pair
                    if (!card1.isMatched) card1.isFlipped = false;
                    if (!card2.isMatched) card2.isFlipped = false;
                }, 800);
            }

            // Clear flipped cards array
            flippedCards.value = [];
        };

        // Can be removed if CSS handles animations based on classes
        const addMatchAnimation = (card1, card2) => {
            // Example: Find elements by card id if needed
            // const el1 = document.querySelector(`.card[data-id='${card1.id}']`);
            // const el2 = document.querySelector(`.card[data-id='${card2.id}']`);
            // el1?.classList.add('match-animation');
            // el2?.classList.add('match-animation');
            // setTimeout(() => {
            //     el1?.classList.remove('match-animation');
            //     el2?.classList.remove('match-animation');
            // }, 1000);
        };

        const addWrongAnimation = (card1, card2) => {
             // Example: Find elements by card id if needed
             const el1 = document.querySelector(`.card[data-id='${card1.id}']`);
             const el2 = document.querySelector(`.card[data-id='${card2.id}']`);
             el1?.classList.add('wrong-animation');
             el2?.classList.add('wrong-animation');
             setTimeout(() => {
                 el1?.classList.remove('wrong-animation');
                 el2?.classList.remove('wrong-animation');
             }, 800); // Match timeout for flip back
        };

        const gameOver = () => {
            clearInterval(timerInterval.value);

            // Calculate final score based on time and level
            const currentLevelObj = levels.value.find(l => l.id === currentLevel.value);
            const timeBonus = Math.max(0, (currentLevelObj.pairsCount * 10) - timer.value); // Bonus based on pairs/time
            const finalScore = score.value + timeBonus + (currentLevel.value * 5); // Smaller level bonus

            // Save high score if it's better than previous
            if (!highScores.value[currentLevel.value] || finalScore > highScores.value[currentLevel.value]) {
                highScores.value[currentLevel.value] = finalScore;
                localStorage.setItem('memoryGameHighScores', JSON.stringify(highScores.value));
            }

            // Check if player passed the level (e.g., score > 0 or some threshold)
            const passedLevel = finalScore > 0; // Simple pass condition

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
                        sounds.levelUp.play().catch(e => console.log('Error playing level up sound:', e));
                    }

                    setTimeout(() => {
                        alert(`Congratulations! You completed level ${currentLevel.value} with a score of ${finalScore}!\n\nYou've unlocked level ${currentLevel.value + 1}!`);
                        // Optionally move to next level or back to setup
                        // currentLevel.value++; // Move to next level automatically?
                        restartGame(); // Go back to setup screen
                    }, 500);
                } else {
                    // Already unlocked or just completed a level again
                    setTimeout(() => {
                        alert(`Congratulations! You completed level ${currentLevel.value} with a score of ${finalScore}!`);
                        restartGame(); // Go back to setup screen
                    }, 500);
                }
            } else if (currentLevel.value === levels.value.length && passedLevel) {
                // Player beat the final level
                setTimeout(() => {
                    alert(`Amazing! You've mastered the final level with a score of ${finalScore}!\n\nYou've completed all levels of the Memory Pairs Game!`);
                    restartGame(); // Go back to setup screen
                }, 500);
            } else {
                 // Player didn't pass the level (score <= 0)
                 setTimeout(() => {
                    alert(`Game over! Your score: ${finalScore}. Try again!`);
                    restartGame(); // Go back to setup screen
                }, 500);
            }
        };

        const restartGame = () => { // Now resets to the setup screen of memory game
            clearInterval(timerInterval.value);
            gameStarted.value = false;
            memorizationPhase.value = false;
            cards.value = []; // Clear cards
            wordPairs.value = [{ word1: '', word2: '' }]; // Reset pairs input
            loadDefaultPairs(); // Reload default pairs for the current level
        };

        const resetMemoryGame = () => { // Full reset if needed
             clearInterval(timerInterval.value);
             gameStarted.value = false;
             memorizationPhase.value = false;
             timer.value = 0;
             matchedPairs.value = 0;
             flippedCards.value = [];
             score.value = 0;
             cards.value = [];
             wordPairs.value = [{ word1: '', word2: '' }];
             // Don't reset currentLevel or highScores/unlocked levels
        };

        // Exercise Builder Methods
        const generateExercise = async () => {
            if (!exerciseTopic.value.trim()) return;

            isLoadingExercise.value = true;
            exerciseError.value = '';
            resetExerciseState(); // Clear previous exercise data

            try {
                console.log(`Generating exercise for: ${exerciseTopic.value}, language: ${exerciseLanguage.value}`); // Log request
                const response = await fetch(`${backendUrl}/api/generate-exercise`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        topic: exerciseTopic.value,
                        language: exerciseLanguage.value,
                    }),
                });

                if (!response.ok) {
                    let errorMsg = `HTTP error! status: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        errorMsg += ` - ${errorData.error || 'Unknown server error'}`;
                        if (errorData.details) errorMsg += ` (${errorData.details})`;
                    } catch (e) { /* Ignore if response body is not JSON */ }
                    throw new Error(errorMsg);
                }

                const data = await response.json();
                console.log("Received exercise data (frontend):", JSON.stringify(data, null, 2)); // Log received data

                // Validate received data structure (basic)
                if (!data || !Array.isArray(data.sentences) || !Array.isArray(data.answers) || !Array.isArray(data.word_bank)) {
                    console.error("Validation failed: Invalid data structure received from server.", data); // Log validation failure
                    throw new Error("Invalid data structure received from server.");
                }
                console.log("Frontend validation passed."); // Log success

                // Assign data using Object.assign for reactivity
                Object.assign(generatedExercise, data);
                // Shuffle the word bank before assigning
                if (data.word_bank) {
                    data.word_bank = shuffleArray(data.word_bank);
                    console.log("Shuffled word bank.");
                }

                Object.assign(generatedExercise, data);
                console.log("Assigned data to generatedExercise:", JSON.stringify(generatedExercise, null, 2)); // Log state after assignment

                // Initialize userAnswers and results based on the new structure
                let currentTotalGaps = 0;
                formattedSentences.value.forEach(formattedSentence => {
                    userAnswers[formattedSentence.id] = {}; // Init sentence answers
                    exerciseResults[formattedSentence.id] = {}; // Init sentence results
                    formattedSentence.segments.forEach(segment => {
                        if (segment.type === 'input') {
                            userAnswers[formattedSentence.id][segment.gapIndex] = ''; // Init gap answer
                            exerciseResults[formattedSentence.id][segment.gapIndex] = null; // Init gap result
                            currentTotalGaps++;
                        }
                    });
                });
                totalGaps.value = currentTotalGaps; // Store total gaps count
                console.log(`Initialized userAnswers, exerciseResults. Total gaps: ${totalGaps.value}`); // Log initialization


            } catch (error) {
                console.error('Error generating exercise:', error);
                exerciseError.value = `Failed to generate exercise: ${error.message}`;
                // Clear potentially partial data
                 Object.assign(generatedExercise, { sentences: [], answers: [], word_bank: [] });
            } finally {
                isLoadingExercise.value = false;
            }
        };

        // UPDATED checkAnswers for multiple gaps
        const checkAnswers = () => {
            if (!formattedSentences.value.length) return;

            let correctCount = 0;
            formattedSentences.value.forEach(formattedSentence => {
                formattedSentence.segments.forEach(segment => {
                    if (segment.type === 'input') {
                        const userAnswer = userAnswers[formattedSentence.id]?.[segment.gapIndex]?.trim() || '';
                        const correctAnswer = segment.correctAnswer || ''; // Get correct answer stored during parsing

                        // Case-insensitive comparison
                        if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
                            exerciseResults[formattedSentence.id][segment.gapIndex] = true;
                            correctCount++;
                        } else {
                            exerciseResults[formattedSentence.id][segment.gapIndex] = false;
                        }
                    }
                });
            });

            exerciseScore.value = correctCount;
            isExerciseChecked.value = true;
            console.log(`Answers checked. Score: ${exerciseScore.value} / ${totalGaps.value}`);
        };

        // Removed getCorrectAnswer as feedback needs rework for multiple gaps

        // UPDATED resetExerciseBuilder
        const resetExerciseBuilder = () => {
            exerciseTopic.value = '';
            Object.assign(generatedExercise, { sentences: [], word_bank: [] }); // Removed answers
            // Clear nested reactive objects properly
            Object.keys(userAnswers).forEach(sentenceId => {
                Object.keys(userAnswers[sentenceId]).forEach(gapIndex => {
                    delete userAnswers[sentenceId][gapIndex];
                });
                delete userAnswers[sentenceId];
            });
             Object.keys(exerciseResults).forEach(sentenceId => {
                Object.keys(exerciseResults[sentenceId]).forEach(gapIndex => {
                    delete exerciseResults[sentenceId][gapIndex];
                });
                delete exerciseResults[sentenceId];
            });
            exerciseScore.value = 0;
            totalGaps.value = 0;
            isLoadingExercise.value = false;
            exerciseError.value = '';
            isExerciseChecked.value = false;
        };

         // UPDATED resetExerciseState
         const resetExerciseState = () => { // Reset only the generated content part
            Object.assign(generatedExercise, { sentences: [], word_bank: [] }); // Removed answers
             Object.keys(userAnswers).forEach(sentenceId => {
                Object.keys(userAnswers[sentenceId]).forEach(gapIndex => {
                    delete userAnswers[sentenceId][gapIndex];
                });
                delete userAnswers[sentenceId];
            });
             Object.keys(exerciseResults).forEach(sentenceId => {
                Object.keys(exerciseResults[sentenceId]).forEach(gapIndex => {
                    delete exerciseResults[sentenceId][gapIndex];
                });
                delete exerciseResults[sentenceId];
            });
            exerciseScore.value = 0;
            totalGaps.value = 0;
            isExerciseChecked.value = false;
            exerciseError.value = ''; // Clear previous errors too
        };


        // Utility Methods
        const shuffleArray = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]]; // Swap elements
            }
            return array;
        };

        // Load default pairs for memory game on mount
        onMounted(() => {
            console.log('Vue component mounted');
            // Start on main menu
            currentView.value = 'mainMenu';
            // Pre-load default pairs for memory game if needed later
            // loadDefaultPairs(); // Or load when switching to the game view
        });

        // Return all reactive state and methods
        return {
            // App State & Navigation
            currentView,
            showMainMenu,
            showMemoryGame,
            showExerciseBuilder,

            // Memory Game State & Methods
            gameStarted,
            memorizationPhase,
            memorizationTime, // Memory game specific
            timer, // Memory game specific timer
            matchedPairs, // Memory game specific
            totalPairs, // Memory game specific
            wordPairs, // Memory game specific
            cards, // Memory game specific
            levels, // Memory game specific
            currentLevel, // Memory game specific
            score, // Memory game specific score
            highScores, // Memory game specific
            gridStyle, // Memory game specific
            addPair, // Memory game specific
            removePair, // Memory game specific
            loadDefaultPairs, // Memory game specific
            loadCustomJson, // Memory game specific
            startGame, // Memory game specific
            flipCard, // Memory game specific
            restartGame, // Memory game specific

            // Exercise Builder State & Methods
            exerciseTopic,
            exerciseLanguage,
            availableLanguages,
            generatedExercise,
            userAnswers,
            exerciseResults,
            exerciseScore, // Exercise specific score
            isLoadingExercise,
            exerciseError,
            isExerciseChecked,
            formattedSentences, // Computed property
            generateExercise,
            checkAnswers,
            // Removed getCorrectAnswer from return

            // Sounds (if needed globally, otherwise move initSounds call)
            initSounds,
            totalGaps // Expose totalGaps for scoring display
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
