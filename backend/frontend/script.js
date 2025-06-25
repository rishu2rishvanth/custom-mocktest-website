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

document.addEventListener('DOMContentLoaded', () => {
  initResultsButton();
  if (sectionSelect) populateSections();
});

// Populate sections dropdown
function populateSections() {
  fetch('http://10.10.182.9:5000/api/questions/sections')
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        sections = data.reduce((acc, section) => {
          acc[section.name] = section.questions;
          return acc;
        }, {});
        sectionSelect.innerHTML = '<option value="">Select Section</option>';
        Object.keys(sections).forEach(section => {
          const option = document.createElement('option');
          option.value = section;
          option.textContent = section;
          sectionSelect.appendChild(option);
        });
      }
    })
    .catch(err => console.error('Error fetching sections:', err));
}

// Update number of questions on section change
sectionSelect.addEventListener('change', e => {
  const section = e.target.value;
  numQuestionsInput.value = sections[section]?.length || '';
});

// Start quiz
startQuizButton.addEventListener('click', () => {
  const section = sectionSelect.value;
  if (!section) return alert('Please select a section.');
  startQuiz(section);
});

// Restart quiz
restartQuizButton.addEventListener('click', () => {
  resultSection.style.display = 'none';
  setupSection.style.display = 'block';
});

// Skip question logic
skipQuestionButton.addEventListener('click', () => {
  if (hasAnswered) return;
  const current = selectedQuestions[currentQuestionIndex];
  const timeSpent = Date.now() - questionStartTime;

  userResponses[currentQuestionIndex] = {
    question: current['Question'] || current['Question Image URL'] || 'N/A',
    comprehension: current['Comprehension'] || '',
    response: 'Skipped',
    correct: false,
    responseTime: Math.round(timeSpent / 1000)
  };

  if (currentQuestionIndex < selectedQuestions.length - 1) {
    currentQuestionIndex++;
    showNextQuestion();
  } else {
    endQuiz();
  }
});

// Next question logic
nextQuestionButton.addEventListener('click', () => {
  if (currentQuestionIndex < selectedQuestions.length - 1) {
    currentQuestionIndex++;
    showNextQuestion();
  } else {
    endQuiz();
  }
});

// Start the quiz
function startQuiz(section) {
  const numQuestions = parseInt(numQuestionsInput.value);
  const duration = parseInt(timerInput.value);

  selectedQuestions = [...sections[section]];
  shuffleArray(selectedQuestions);
  selectedQuestions = selectedQuestions.slice(0, Math.min(numQuestions, selectedQuestions.length));

  currentQuestionIndex = 0;
  score = 0;
  wrong = 0;
  examTimeRemaining = duration;
  userResponses = new Array(selectedQuestions.length).fill(null);
  examStartTime = new Date().toISOString();

  setupSection.style.display = 'none';
  quizSection.style.display = 'block';
  showNextQuestion();
  startExamTimer();
}

// Shuffle questions (Fisher-Yates)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Display the current question
function showNextQuestion() {
  const current = selectedQuestions[currentQuestionIndex];
  if (!current) return console.error('No question at index', currentQuestionIndex);

  questionContainer.innerHTML = '';
  optionsContainer.innerHTML = '';
  const qNum = currentQuestionIndex + 1;

  const questionText = document.createElement('div');
  questionText.innerHTML = `<b>Question ${qNum}</b><br>${formatTextWithSuperSubscript(formatTextWithParagraphs(current['Question']))}`;

  if (current['Comprehension']) {
    const comp = document.createElement('div');
    comp.innerHTML = `<p><strong>Comprehension:</strong> ${formatTextWithSuperSubscript(formatTextWithParagraphs(current['Comprehension']))}</p>`;
    questionContainer.appendChild(comp);
  }

  questionContainer.appendChild(questionText);

  if (current['Question Image URL']) {
    const img = document.createElement('img');
    img.src = `http://10.10.182.9:5000${current['Question Image URL']}`;
    img.alt = 'Question Image';
    questionContainer.appendChild(img);
  }

  for (let i = 1; i <= 4; i++) {
    const text = formatTextWithSuperSubscript(current[`Answer ${i} Text`]);
    const imgUrl = current[`Answer ${i} Image URL`];
    const btn = document.createElement('button');
    btn.classList.add('answer-option');

    if (text) btn.innerHTML = text;
    if (imgUrl) {
      const img = document.createElement('img');
      img.src = `http://10.10.182.9:5000${imgUrl}`;
      img.alt = text || `Option ${i}`;
      btn.appendChild(img);
    }

    btn.addEventListener('click', () => selectAnswer(i - 1, btn));
    optionsContainer.appendChild(btn);
  }

  if (selectedButton) selectedButton.classList.remove('selected');
  selectedButton = null;
  nextQuestionButton.style.display = 'none';
  skipQuestionButton.style.display = 'block';
  hasAnswered = false;
  questionStartTime = Date.now();
}

// Answer selection
function selectAnswer(index, button) {
  if (hasAnswered) return;

  const current = selectedQuestions[currentQuestionIndex];
  const isCorrect = index === current['Correct Answer Index'];
  const responseTimeMs = Date.now() - questionStartTime;

  if (isCorrect) score++;
  else wrong++;

  const responseText = button.textContent?.trim() || '';
  const responseImage = current[`Answer ${index + 1} Image URL`] ? `http://10.10.182.9:5000${current[`Answer ${index + 1} Image URL`]}` : '';

  userResponses[currentQuestionIndex] = {
    question: current['Question'] || current['Question Image URL'] || 'N/A',
    comprehension: current['Comprehension'] || '',
    response: responseImage || responseText || 'N/A',
    correct: isCorrect,
    responseTime: Math.round(responseTimeMs / 1000)
  };

  if (selectedButton) selectedButton.classList.remove('selected');
  selectedButton = button;
  selectedButton.classList.add('selected');
  hasAnswered = true;

  document.querySelectorAll('.answer-option').forEach(btn => btn.disabled = true);
  nextQuestionButton.style.display = 'block';
}

// Skip question logic (if user skips without selecting)
skipQuestionButton.addEventListener('click', () => {
  if (hasAnswered) return;

  const current = selectedQuestions[currentQuestionIndex];
  const timeSpent = Date.now() - questionStartTime;

  userResponses[currentQuestionIndex] = {
    question: current['Question'] || current['Question Image URL'] || 'N/A',
    comprehension: current['Comprehension'] || '',
    response: 'Skipped',
    correct: false,
    responseTime: Math.round(timeSpent / 1000)
  };

  if (currentQuestionIndex < selectedQuestions.length - 1) {
    currentQuestionIndex++;
    showNextQuestion();
  } else {
    endQuiz();
  }
});

// Timer countdown
function startExamTimer() {
  clearInterval(examTimer);
  examTimer = setInterval(() => {
    const min = Math.floor(examTimeRemaining / 60).toString().padStart(2, '0');
    const sec = (examTimeRemaining % 60).toString().padStart(2, '0');

    timerDisplay.textContent = `t- ${min}:${sec}`;
    timerDisplay.style.color = examTimeRemaining <= 300 ? 'red' : 'black';
    timerDisplay.style.fontWeight = examTimeRemaining <= 300 ? 'bold' : 'normal';

    if (examTimeRemaining <= 0) {
      clearInterval(examTimer);
      endQuiz();
    }

    examTimeRemaining--;
  }, 1000);
}

// End the quiz and show result section
function endQuiz() {
  clearInterval(examTimer);
  quizSection.style.display = 'none';
  resultSection.style.display = 'block';
  scoreDisplay.textContent = `You scored ${score} & lost ${wrong} out of ${selectedQuestions.length}!`;
  submitResponses(); // now fully fixed
}

// Submit response and score to backend
function submitResponses() {
  const username = prompt("Enter your username:");
  const section = sectionSelect.value;
  const submitTime = new Date().toISOString();

  const responses = selectedQuestions.map((question, index) => {
    const userResponse = userResponses[index] || {
      response: 'Skipped',
      correct: false,
      responseTime: 'Skipped'
    };

    const options = [];
    for (let i = 1; i <= 4; i++) {
      options.push({
        text: question[`Answer ${i} Text`] || '',
        image: question[`Answer ${i} Image URL`] || ''
      });
    }

    const correctAnswerIndex = question['Correct Answer Index'];
    const correctAnswer =
      (question[`Answer ${correctAnswerIndex + 1} Text`] || '') ||
      (question[`Answer ${correctAnswerIndex + 1} Image URL`] || '');

    return {
      question: question['Question'] || question['Question Image URL'] || 'N/A',
      comprehension: question['Comprehension'] || '',
      options,
      correctAnswerIndex,
      correctAnswer, // ✅ ADD THIS LINE
      response: userResponse.response,
      correct: userResponse.correct,
      responseTime: userResponse.responseTime ?? 'Skipped',
      timestamp: examStartTime,
      submitTime,
      section,
      score
    };
  });


  fetch('http://10.10.182.9:5000/api/response', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, responses, score, section, examStartTime, submitTime })
  })
    .then(res => res.json())
    .then(data => alert(data.message))
    .catch(err => console.error('Error submitting responses:', err));

  fetch('http://10.10.182.9:5000/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, score, wrong })
  })
    .then(res => res.json())
    .then(data => alert(data.message))
    .catch(err => console.error('Error submitting score:', err));
}

// Format question text with paragraphs
function formatTextWithParagraphs(text) {
  if (typeof text !== 'string') return '';
  return text.split(/\r?\n/).map(line => `<p>${line}</p>`).join('');
}

// Handle superscripts and subscripts like ^(x+1), _(n)
function formatTextWithSuperSubscript(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\^\((.*?)\)/g, '<sup>$1</sup>')
    .replace(/\_\((.*?)\)/g, '<sub>$1</sub>');
}

// Open calculator in popup
let calculatorWindow = null;
document.getElementById('openCalculator').addEventListener('click', () => {
  if (!calculatorWindow || calculatorWindow.closed) {
    calculatorWindow = window.open('calculator.html', '_blank', 'width=480,height=350');
  } else {
    calculatorWindow.focus();
  }
});
