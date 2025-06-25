import { initResultsButton } from './resultManager.js';

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
const sectionSelect = document.getElementById('sectionSelect');
const skipQuestionButton = document.getElementById('skipQuestion');

let currentQuestionIndex = 0;
let score = 0;
let wrong = 0;
let examTimer;
let examTimeRemaining;
let selectedQuestions = [];
let userResponses = [];
let selectedButton;
let hasAnswered = false;
let sections = {};
let examStartTime = null;
let questionStartTime = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initResultsButton();
  if (sectionSelect) populateSections();
  else console.error('sectionSelect element not found.');
});

// Populate sections dropdown
function populateSections() {
  fetch('http://192.168.1.46:5000/api/questions/sections')
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
        console.error('Unexpected section data:', data);
      }
    })
    .catch(error => console.error('Error fetching sections:', error));
}

// Update question count based on selected section
sectionSelect.addEventListener('change', (event) => {
  const selectedSection = event.target.value;
  if (sections[selectedSection]) {
    numQuestionsInput.value = sections[selectedSection].length;
  } else {
    numQuestionsInput.value = '';
  }
});

// Start quiz
startQuizButton.addEventListener('click', () => {
  const selectedSection = sectionSelect.value;
  if (!selectedSection) return alert('Please select a section.');
  startQuiz(selectedSection);
});

// Restart quiz
restartQuizButton.addEventListener('click', () => {
  resultSection.style.display = 'none';
  setupSection.style.display = 'block';
});

// Skip question
skipQuestionButton.addEventListener('click', () => {
  if (currentQuestionIndex < selectedQuestions.length - 1) {
    currentQuestionIndex++;
    showNextQuestion();
  } else {
    endQuiz();
  }
});

// Next question
nextQuestionButton.addEventListener('click', () => {
  if (currentQuestionIndex < selectedQuestions.length - 1) {
    currentQuestionIndex++;
    showNextQuestion();
  } else {
    endQuiz();
  }
});

// Start quiz logic
function startQuiz(section) {
  const numQuestions = parseInt(numQuestionsInput.value);
  const timePerExam = parseInt(timerInput.value);

  if (!sections[section]) {
    alert('Invalid section.');
    return;
  }

  selectedQuestions = [...sections[section]];
  shuffleArray(selectedQuestions);

  selectedQuestions = selectedQuestions.slice(0, Math.min(numQuestions, selectedQuestions.length));

  setupSection.style.display = 'none';
  quizSection.style.display = 'block';

  score = 0;
  wrong = 0;
  currentQuestionIndex = 0;
  userResponses = new Array(selectedQuestions.length).fill(null);
  examTimeRemaining = timePerExam;
  examStartTime = new Date().toISOString();

  showNextQuestion();
  startExamTimer();
}

// Shuffle array (Fisher–Yates)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function showNextQuestion() {
  const currentQuestion = selectedQuestions[currentQuestionIndex];
  if (!currentQuestion) {
    console.error('Missing question at index', currentQuestionIndex);
    return;
  }

  questionContainer.innerHTML = '';
  optionsContainer.innerHTML = '';
  const questionNumber = currentQuestionIndex + 1;

  const questionText = document.createElement('div');
  const formattedText = formatTextWithSuperSubscript(formatTextWithParagraphs(currentQuestion['Question']));
  questionText.innerHTML = `<b>Question ${questionNumber}</b><br>${formattedText}`;

  if (currentQuestion['Comprehension']) {
    const comprehensionText = document.createElement('div');
    comprehensionText.innerHTML = `<p><strong>Comprehension:</strong> ${formatTextWithSuperSubscript(formatTextWithParagraphs(currentQuestion['Comprehension']))}</p>`;
    questionContainer.appendChild(comprehensionText);
  }

  questionContainer.appendChild(questionText);

  if (currentQuestion['Question Image URL']) {
    const img = document.createElement('img');
    img.src = `http://192.168.1.46:5000${currentQuestion['Question Image URL']}`;
    img.alt = 'Question Image';
    questionContainer.appendChild(img);
  }

  for (let i = 1; i <= 4; i++) {
    const answerText = formatTextWithSuperSubscript(currentQuestion[`Answer ${i} Text`]);
    const answerImageUrl = currentQuestion[`Answer ${i} Image URL`];

    const button = document.createElement('button');
    button.classList.add('answer-option');
    if (answerText) button.innerHTML = answerText;

    if (answerImageUrl) {
      const img = document.createElement('img');
      img.src = `http://192.168.1.46:5000${answerImageUrl}`;
      img.alt = answerText || 'Option';
      button.appendChild(img);
    }

    button.addEventListener('click', () => selectAnswer(i - 1, button));
    optionsContainer.appendChild(button);
  }

  if (selectedButton) selectedButton.classList.remove('selected');

  nextQuestionButton.style.display = 'none';
  skipQuestionButton.style.display = 'block';
  hasAnswered = false;
  questionStartTime = Date.now();
}

function selectAnswer(index, button) {
  if (hasAnswered) return;

  const currentQuestion = selectedQuestions[currentQuestionIndex];
  if (!currentQuestion) return;

  const isCorrect = index === currentQuestion['Correct Answer Index'];
  if (isCorrect) score++;
  else wrong++;

  const responseTimeMs = Date.now() - questionStartTime;

  userResponses[currentQuestionIndex] = {
    question: currentQuestion['Question'] || currentQuestion['Question Image URL'] || 'N/A',
    comprehension: currentQuestion['Comprehension'] || 'N/A',
    response: button.textContent || currentQuestion[`Answer ${index + 1} Image URL`] || 'N/A',
    correct: isCorrect,
    responseTime: Math.round(responseTimeMs / 1000)
  };

  if (selectedButton) selectedButton.classList.remove('selected');
  selectedButton = button;
  selectedButton.classList.add('selected');

  nextQuestionButton.style.display = 'block';

  document.querySelectorAll('.answer-option').forEach(btn => btn.disabled = true);
  hasAnswered = true;
}

function startExamTimer() {
  clearInterval(examTimer);
  examTimer = setInterval(() => {
    const minutes = Math.floor(examTimeRemaining / 60);
    const seconds = examTimeRemaining % 60;

    timerDisplay.textContent = `t- ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    timerDisplay.style.color = examTimeRemaining <= 300 ? 'red' : 'black';
    timerDisplay.style.fontWeight = examTimeRemaining <= 300 ? 'bold' : 'normal';

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
  const section = sectionSelect.value;

  const responses = selectedQuestions.map((question, index) => {
    const userResponse = userResponses[index] || { response: 'N/A', correct: false };

    return {
      question: question['Question'] || question['Question Image URL'] || 'N/A',
      comprehension: question['Comprehension'] || 'N/A',
      response: userResponse.response,
      correct: userResponse.correct,
      responseTime: userResponse.responseTime ?? 'Skipped'
    };
  });

  fetch('http://192.168.1.46:5000/api/response', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, responses, score, section, examStartTime })
  })
    .then(res => res.json())
    .then(data => alert(data.message))
    .catch(err => console.error('Error submitting responses:', err));

  fetch('http://192.168.1.46:5000/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, score, wrong })
  })
    .then(res => res.json())
    .then(data => alert(data.message))
    .catch(err => console.error('Error submitting score:', err));
}

// Helpers
function formatTextWithParagraphs(text) {
  if (typeof text !== 'string') return '';
  return text.split(/\r?\n/).map(line => `<p>${line}</p>`).join('');
}

function formatTextWithSuperSubscript(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\^\((.*?)\)/g, '<sup>$1</sup>')
    .replace(/\_\((.*?)\)/g, '<sub>$1</sub>');
}

// Calculator popup
let calculatorWindow = null;
document.getElementById('openCalculator').addEventListener('click', () => {
  if (!calculatorWindow || calculatorWindow.closed) {
    calculatorWindow = window.open('calculator.html', '_blank', 'width=480,height=350');
  } else {
    calculatorWindow.focus();
  }
});
