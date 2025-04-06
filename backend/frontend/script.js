const startQuizButton = document.getElementById('startQuiz');
const nextQuestionButton = document.getElementById('nextQuestion');
const questionContainer = document.getElementById('questionContainer');
const optionsContainer = document.getElementById('optionsContainer');
const timerDisplay = document.getElementById('timerDisplay');
const numQuestionsInput = document.getElementById('numQuestions');
const timerInput = document.getElementById('timer');
const quizSection = document.querySelector('.quiz');
const setupSection = document.querySelector('.setup');
const resultSection = document.querySelector('.result');
const scoreDisplay = document.getElementById('score');
const restartQuizButton = document.getElementById('restartQuiz');
const sectionSelect = document.getElementById('sectionSelect'); // Dropdown for selecting section
const skipQuestionButton = document.getElementById('skipQuestion');

let currentQuestionIndex = 0;
let score = 0;
let wrong = 0;
let examTimer;
let examTimeRemaining;
let selectedQuestions = [];
let userResponses = [];
let selectedButton; // Track the currently selected button
let hasAnswered = false; // Track if an answer has already been selected for the current question
let sections = {}; // Store all sections data

// Function to update the number of questions input based on the selected section
function updateNumQuestionsInput(section) {
    if (sections[section]) {
        const numberOfQuestions = sections[section].length;
        numQuestionsInput.value = numberOfQuestions; // Set the number of questions input to the length of the section
    } else {
        numQuestionsInput.value = ''; // Clear the input if the section is not found
    }
}

// Populate sections dropdown
function populateSections() {
    fetch('http://10.10.182.2:5000/api/questions/sections')
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data)) {
                sections = data.reduce((acc, section) => {
                    acc[section.name] = section.questions;
                    return acc;
                }, {});
                sectionSelect.innerHTML = '<option value="">Select Section</option>';
                for (const section in sections) {
                    const option = document.createElement('option');
                    option.value = section;
                    option.textContent = section;
                    sectionSelect.appendChild(option);
                }
            } else {
                console.error('Unexpected data format for sections:', data);
            }
        })
        .catch(error => {
            console.error('Error fetching sections:', error);
        });
}

// Event listener for section selection
sectionSelect.addEventListener('change', (event) => {
    const selectedSection = event.target.value;
    updateNumQuestionsInput(selectedSection);
});

startQuizButton.addEventListener('click', () => {
    const selectedSection = sectionSelect.value;
    if (selectedSection) {
        startQuiz(selectedSection);
    } else {
        alert('Please select a section.');
    }
});

nextQuestionButton.addEventListener('click', () => {
    if (currentQuestionIndex < selectedQuestions.length - 1) {
        currentQuestionIndex++;
        showNextQuestion();
    } else {
        endQuiz();
    }
});

restartQuizButton.addEventListener('click', () => {
    resultSection.style.display = 'none';
    setupSection.style.display = 'block';
});

function shuffleArray(array) {
    if (!array || !Array.isArray(array)) {
        console.error('Invalid array for shuffling:', array);
        return;
    }
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function startQuiz(section) {
    const numQuestions = parseInt(numQuestionsInput.value);
    const timePerExam = parseInt(timerInput.value);

    if (!sections[section]) {
        console.error('Section not found:', section);
        alert('Selected section is not valid.');
        return;
    }

    selectedQuestions = sections[section];
    shuffleArray(selectedQuestions);
    
    // Adjust the number of questions if needed
    if (numQuestions > selectedQuestions.length) {
        alert(`There are only ${selectedQuestions.length} questions available in the selected section. The quiz will be adjusted to include all available questions.`);
        selectedQuestions = selectedQuestions.slice(0, selectedQuestions.length);
    } else {
        selectedQuestions = selectedQuestions.slice(0, numQuestions);
    }

    setupSection.style.display = 'none';
    quizSection.style.display = 'block';

    score = 0;
    wrong = 0;
    currentQuestionIndex = 0;
    userResponses = new Array(numQuestions).fill(null);
    examTimeRemaining = timePerExam;

    showNextQuestion();
    startExamTimer();
}

skipQuestionButton.addEventListener('click', () => {
    if (currentQuestionIndex < selectedQuestions.length - 1) {
        currentQuestionIndex++;
        showNextQuestion();
    } else {
        endQuiz();
    }
});

// Other existing JavaScript code...

function showNextQuestion() {
    const currentQuestion = selectedQuestions[currentQuestionIndex];
    if (!currentQuestion) {
        console.error('Current question is missing:', currentQuestionIndex);
        return;
    }

    // Clear previous question content
    questionContainer.innerHTML = '';
    const questionNumber = currentQuestionIndex+1;

    // Display question text with line breaks and comprehension
    const questionText = document.createElement('div');
    const formattedText = formatTextWithSuperSubscript(formatTextWithParagraphs(currentQuestion['Question']));
    questionText.innerHTML = `<b>Question ${questionNumber}\r\n ${formattedText}</b>`;

    // Display comprehension text if available
    if (currentQuestion['Comprehension']) {
        const comprehensionText = document.createElement('div');
        comprehensionText.innerHTML = `<p><strong>Comprehension:</strong> ${formatTextWithSuperSubscript(formatTextWithParagraphs(currentQuestion['Comprehension']))}</p>`;
        questionContainer.appendChild(comprehensionText);
    }

    questionContainer.appendChild(questionText);

    // Display question image if available
    if (currentQuestion['Question Image URL']) {
        const questionImage = document.createElement('img');
        questionImage.src = `http://10.10.182.2:5000${currentQuestion['Question Image URL']}`;
        questionImage.alt = 'Question Image';
        questionContainer.appendChild(questionImage);
    }

    // Clear previous options
    optionsContainer.innerHTML = '';

    for (let i = 1; i <= 4; i++) { // Assuming there are four answers
        const answerText = formatTextWithSuperSubscript(currentQuestion[`Answer ${i} Text`]);
        const answerImageUrl = currentQuestion[`Answer ${i} Image URL`];
        const button = document.createElement('button');
        button.classList.add('answer-option');

        // Apply formatting to answer text
        if (answerText) {
            button.innerHTML = answerText; // Use innerHTML to include HTML tags
        }

        // Append answer image if available
        if (answerImageUrl) {
            const answerImage = document.createElement('img');
            answerImage.src = `http://10.10.182.2:5000${answerImageUrl}`;
            answerImage.alt = answerText;
            button.appendChild(answerImage);
        }

        button.addEventListener('click', () => selectAnswer(i - 1, button));
        optionsContainer.appendChild(button);
    }

    // Remove highlight from previously selected button
    if (selectedButton) {
        selectedButton.classList.remove('selected');
    }

    nextQuestionButton.style.display = 'none';
    skipQuestionButton.style.display = 'block'; // Show skip button
    hasAnswered = false; // Reset answer flag for the new question
}

function selectAnswer(index, button) {
    if (hasAnswered) return; // Prevent re-selection if already answered

    const currentQuestion = selectedQuestions[currentQuestionIndex];
    if (!currentQuestion) {
        console.error('Current question is missing:', currentQuestionIndex);
        return;
    }

    // Check if the answer is correct
    const isCorrect = index === currentQuestion['Correct Answer Index'];
    if (isCorrect) {
        score++;
    } else {
        wrong++;
    }

    // Store the answer and correctness
    userResponses[currentQuestionIndex] = {
        question: currentQuestion['Question'] || currentQuestion['Question Image URL'] || 'N/A',
        comprehension: currentQuestion['Comprehension'] || 'N/A', // Include comprehension
        response: button.textContent || currentQuestion[`Answer ${index + 1} Image URL`] || 'N/A',
        correct: isCorrect
    };

    // Remove highlight from previously selected button
    if (selectedButton) {
        selectedButton.classList.remove('selected');
    }

    // Highlight the newly selected button
    selectedButton = button;
    selectedButton.classList.add('selected');

    nextQuestionButton.style.display = 'block';

    // Disable all options to prevent further clicks
    document.querySelectorAll('.answer-option').forEach(btn => btn.disabled = true);

    hasAnswered = true; // Mark this question as answered
}

function startExamTimer() {
    clearInterval(examTimer);
    examTimer = setInterval(() => {
        let minutes = Math.floor(examTimeRemaining / 60);
        let seconds = examTimeRemaining % 60;

        let formattedMinutes = String(minutes).padStart(2, '0');
        let formattedSeconds = String(seconds).padStart(2, '0');

        timerDisplay.textContent = `t- ${formattedMinutes}:${formattedSeconds}`;

        if (examTimeRemaining <= 300) { // 300 seconds = 5 minutes
            timerDisplay.style.color = 'red';
            timerDisplay.style.fontWeight = 'bold'; // or 'normal', '100', '200', etc.
        } else {
            timerDisplay.style.color = 'black';
        }

        if (examTimeRemaining <= 0) {
            clearInterval(examTimer);
            endQuiz();
        }

        examTimeRemaining--;
    }, 1000);
}

function endQuiz() {
    clearInterval(examTimer);
    quizSection.style.display = 'none';
    resultSection.style.display = 'block';
    scoreDisplay.textContent = `You scored ${score} & lost ${wrong} out of ${selectedQuestions.length}!`;
    submitResponses();
}

function submitResponses() {
    const username = prompt("Enter your username:");
    console.log('Username:', username);

    // Ensure all user responses have a valid format
    const responses = selectedQuestions.map((question, index) => {
        const userResponse = userResponses[index] || { response: 'N/A', correct: false };

        return {
            question: question['Question'] || question['Question Image URL'] || 'N/A',
            comprehension: question['Comprehension'] || 'N/A', // Include comprehension
            response: userResponse.response,
            correct: userResponse.correct
        };
    });

    console.log('Responses:', responses);

    // Send responses with scores to the server
    fetch('http://10.10.182.2:5000/api/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, responses, score })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Response from /api/response:', data);
        alert(data.message);
    })
    .catch(error => {
        console.error('Error submitting responses:', error);
    });

    fetch('http://10.10.182.2:5000/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, score, wrong })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Response from /api/score:', data);
        alert(data.message);
    })
    .catch(error => {
        console.error('Error submitting score:', error);
    });
}

function formatTextWithParagraphs(text) {
    if (typeof text !== 'string') {
        // console.warn('Invalid text for formatting:', text);
        return ''; // Return an empty string or some default value
    }
    return text.split(/\r?\n/).map(line => `<p>${line}</p>`).join('');
}

function formatTextWithSuperSubscript(text) {
    if (typeof text !== 'string' ) {
        // console.warn('Invalid text for formatting:', text);
        return text; // Return an empty string or some default value
    }
    // Replace ^(abc) with superscript HTML
    text = text.replace(/\^\((.*?)\)/g, '<sup>$1</sup>');
    // Replace _(abc) with subscript HTML
    text = text.replace(/\_\((.*?)\)/g, '<sub>$1</sub>');
    return text;
}

// Initialize sections dropdown on page load
document.addEventListener('DOMContentLoaded', () => {
    if (sectionSelect) {
        populateSections();
    } else {
        console.error('sectionSelect element not found.');
    }
});

// Global variable to keep track of the calculator window
let calculatorWindow = null;

document.getElementById('openCalculator').addEventListener('click', function() {
    // Check if the calculator window is already open
    if (calculatorWindow === null || calculatorWindow.closed) {
        calculatorWindow = window.open('calculator.html', '_blank', 'width=480,height=350');
    } else {
        // If the calculator window is open, bring it to the front
        calculatorWindow.focus();
    }
});
