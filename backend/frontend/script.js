import { initResultsButton } from './resultManager.js';

// DOM Elements
const startQuizButton = document.getElementById('startQuiz');
const nextQuestionButton = document.getElementById('nextQuestion');
const skipQuestionButton = document.getElementById('skipQuestion');
const restartQuizButton = document.getElementById('restartQuiz');
const submitQuizButton = document.getElementById('submitQuiz');
const sectionSelect = document.getElementById('sectionSelect');
const numQuestionsInput = document.getElementById('numQuestions');
const timerInput = document.getElementById('timer');
const questionContainer = document.getElementById('questionContainer');
const optionsContainer = document.getElementById('optionsContainer');
const timerDisplay = document.getElementById('timerDisplay');
const scoreDisplay = document.getElementById('score');
const quizSection = document.querySelector('.quiz');
const setupSection = document.querySelector('.setup');
const resultSection = document.querySelector('.result');

// Quiz State
let sections = {};
let selectedQuestions = [];
let userResponses = [];
let currentQuestionIndex = 0;
let examTimeRemaining = 0;
let examTimer = null;
let examStartTime = null;
let questionStartTime = null;
let score = 0;
let wrong = 0;
let hasAnswered = false;
let selectedButton = null;
let quizEnded = false;

// On page load
document.addEventListener('DOMContentLoaded', () => {
  initResultsButton();
  if (sectionSelect) populateSections();
});

// Load section names and their questions
function populateSections() {
  fetch('http://10.10.182.9:5000/api/questions/sections')
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data)) return;

      sections = data.reduce((acc, section) => {
        acc[section.name] = section.questions;
        return acc;
      }, {});

      sectionSelect.innerHTML = '<option value="">Select Section</option>';
      for (const sectionName in sections) {
        const option = document.createElement('option');
        option.value = sectionName;
        option.textContent = sectionName;
        sectionSelect.appendChild(option);
      }
    })
    .catch(err => console.error('Error fetching sections:', err));
}

// Auto-fill number of questions when a section is chosen
sectionSelect.addEventListener('change', e => {
  const section = e.target.value;
  numQuestionsInput.value = sections[section]?.length || '';
});

// Start quiz button
startQuizButton.addEventListener('click', () => {
  quizEnded = false;
  const section = sectionSelect.value;
  if (!section) return alert('Please select a section.');
  startQuiz(section);
});

// Restart quiz button
restartQuizButton.addEventListener('click', () => {
  resultSection.style.display = 'none';
  setupSection.style.display = 'block';
});

// Submit quiz button
submitQuizButton.addEventListener('click', () => {
    const confirmSubmit = confirm("Are you sure you want to submit the quiz?");
    if (!confirmSubmit) return;

    // If not already ended, trigger quiz end
    if (!quizEnded) {
        endQuiz(); // This should handle final scoring and call submitResponses()
    }
});

// Start quiz setup
function startQuiz(section) {
  const numQuestions = parseInt(numQuestionsInput.value);
  const duration = parseInt(timerInput.value);

  selectedQuestions = shuffleArray([...sections[section]]).slice(0, numQuestions);
  userResponses = Array(selectedQuestions.length).fill(null);
  currentQuestionIndex = 0;
  score = 0;
  wrong = 0;
  examTimeRemaining = duration;
  examStartTime = new Date().toISOString();

  setupSection.style.display = 'none';
  quizSection.style.display = 'block';
  showNextQuestion();
  startExamTimer();
}

// Skip current question
skipQuestionButton.addEventListener('click', () => {
  if (hasAnswered) return;
  recordResponse('Skipped', false);
  goToNextOrEnd();
});

// Next button (after answering)
nextQuestionButton.addEventListener('click', () => {
  goToNextOrEnd();
});

// Helper: Go to next question or end quiz
function goToNextOrEnd() {
  if (currentQuestionIndex < selectedQuestions.length - 1) {
    currentQuestionIndex++;
    showNextQuestion();
  } else {
    endQuiz();
  }
}

// Helper: Fisher-Yates shuffle
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Show current question
function showNextQuestion() {
  const current = selectedQuestions[currentQuestionIndex];
  if (!current) return console.error('No question at index', currentQuestionIndex);

  questionContainer.innerHTML = '';
  optionsContainer.innerHTML = '';

  const qNum = currentQuestionIndex + 1;
  const questionText = document.createElement('div');

  if (current['Comprehension']) {
    const comp = document.createElement('div');
    comp.innerHTML = `<p><strong>Comprehension / Directions</strong> ${formatTextWithSuperSubscript(formatTextWithParagraphs(current['Comprehension']))}</p>`;
    questionContainer.appendChild(comp);
  }

  questionText.innerHTML = `<b>Question ${qNum}</b><br>${formatTextWithSuperSubscript(formatTextWithParagraphs(current['Question']))}`;  
  questionText.innerHTML = `<b>Question ${qNum}</b><br>${formatText(current['Question'])}`;
  questionContainer.appendChild(questionText);


  if (current['Question Image URL']) {
    const img = document.createElement('img');
    img.src = `http://10.10.182.9:5000${current['Question Image URL']}`;
    img.alt = 'Question Image';
    questionContainer.appendChild(img);
  }

  // Render options
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

    btn.addEventListener('click', () => handleAnswer(i - 1, btn));
    optionsContainer.appendChild(btn);
  }

  if (selectedButton) selectedButton.classList.remove('selected');
  selectedButton = null;
  hasAnswered = false;
  questionStartTime = Date.now();
  nextQuestionButton.style.display = 'none';
  skipQuestionButton.style.display = 'block';
}

// Handle selected answer
function handleAnswer(index, button) {
  if (hasAnswered) return;

  const current = selectedQuestions[currentQuestionIndex];
  const isCorrect = index === current['Correct Answer Index'];
  const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

  if (isCorrect) score++;
  else wrong++;

  const text = button.textContent?.trim() || '';
  const img = current[`Answer ${index + 1} Image URL`]
    ? `http://10.10.182.9:5000${current[`Answer ${index + 1} Image URL`]}`
    : '';

  recordResponse(img || text || 'N/A', isCorrect, timeSpent);

  selectedButton = button;
  selectedButton.classList.add('selected');
  hasAnswered = true;

  document.querySelectorAll('.answer-option').forEach(btn => btn.disabled = true);
  nextQuestionButton.style.display = 'block';
}

// Record user response
function recordResponse(response, correct, timeSpent = null) {
  const current = selectedQuestions[currentQuestionIndex];
  userResponses[currentQuestionIndex] = {
    question: current['Question'] || current['Question Image URL'] || 'N/A',
    comprehension: current['Comprehension'] || '',
    response,
    correct,
    responseTime: timeSpent ?? Math.round((Date.now() - 
    questionStartTime) / 1000)
  };
  hasAnswered = true;
}

// Start exam timer
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

// End quiz
function endQuiz() {
  if (quizEnded) return;
  quizEnded = true;
  clearInterval(examTimer);
  quizSection.style.display = 'none';
  resultSection.style.display = 'block';
  scoreDisplay.textContent = `You scored ${score} & lost ${wrong} out of ${selectedQuestions.length}! Your Final Score is ${(score-0.3*wrong).toFixed(2)}`;
  submitResponses();
}

// Submit responses to backend
function submitResponses() {
  const username = 'Admin';
  const section = sectionSelect.value;
  const submitTime = new Date().toISOString();

  const responses = selectedQuestions.map((q, i) => {
    const u = userResponses[i] || {
      response: 'Skipped',
      correct: false,
      responseTime: 'Skipped'
    };

    const options = [];
    for (let j = 1; j <= 4; j++) {
      options.push({
        text: q[`Answer ${j} Text`] || '',
        image: q[`Answer ${j} Image URL`] || ''
      });
    }

    const correctIndex = q['Correct Answer Index'];
    const correctAnswer = q[`Answer ${correctIndex + 1} Text`] || q[`Answer ${correctIndex + 1} Image URL`] || '';

    return {
      question: q['Question'] || q['Question Image URL'] || 'N/A',
      comprehension: q['Comprehension'] || '',
      options,
      correctAnswerIndex: correctIndex,
      correctAnswer,
      response: u.response,
      correct: u.correct,
      responseTime: u.responseTime,
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

// Add paragraphs
function formatTextWithParagraphs(text) {
  if (typeof text !== 'string') return '';
  return text.split(/\r?\n/).map(line => `<p>${line}</p>`).join('');
}

// Add superscripts/subscripts
function formatTextWithSuperSubscript(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\^\((.*?)\)/g, '<sup>$1</sup>')
    .replace(/\_\((.*?)\)/g, '<sub>$1</sub>');
}

// Combined formatter
function formatText(raw) {
  return formatTextWithSuperSubscript(formatTextWithParagraphs(raw));
}

let calculatorWindow = null;
document.getElementById('openCalculator').addEventListener('click', () => {
  if (!calculatorWindow || calculatorWindow.closed) {
    calculatorWindow = window.open('calculator.html', '_blank', 'width=480,height=350');
  } else {
    calculatorWindow.focus();
  }
});
