import { initResultsButton } from './resultManager.js';

// DOM Elements
const startQuizButton = document.getElementById('startQuiz');
const nextQuestionButton = document.getElementById('nextQuestion');
const skipQuestionButton = document.getElementById('skipQuestion');
const restartQuizButton = document.getElementById('restartQuiz');
const submitQuizButton = document.getElementById('submitQuiz');
const numQuestionsInput = document.getElementById('numQuestions');
const timerInput = document.getElementById('timer');
const questionContainer = document.getElementById('questionContainer');
const optionsContainer = document.getElementById('optionsContainer');
const timerDisplay = document.getElementById('timerDisplay');
const scoreDisplay = document.getElementById('score');
const quizSection = document.querySelector('.quiz');
const setupSection = document.querySelector('.setup');
const resultSection = document.querySelector('.result');
const sectionSearchInput = document.getElementById('sectionSearchInput');
const sectionDropdown = document.getElementById('sectionGroupedDropdown');

// Quiz State
let sections = {};
let selectedQuestions = [];
let userResponses = [];
let groupedSections = {};
let currentActiveItem = null;
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
  if (sectionSearchInput) populateSections();
});

// Load section names and their questions
function populateSections() {
  fetch('http://10.10.182.8:5000/api/questions/sections')
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data)) return;

      sections = data.reduce((acc, section) => {
        acc[section.name] = section.questions;
        return acc;
      }, {});
      groupedSections = groupByPrefix(Object.keys(sections));
      renderGroupedDropdown(groupedSections);
    })
    .catch(err => console.error('Error fetching sections:', err));
}

function groupByPrefix(names) {
  const groups = {};
  names.forEach(name => {
    const [prefix, suffix] = name.split(' - ');
    const group = suffix ? prefix.trim() : 'Other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(name);
  });
  return groups;
}

function fuzzyMatch(query, target) {
  const parts = query.toLowerCase().split(/\s+/);
  return parts.every(part => target.toLowerCase().includes(part));
}

function renderGroupedDropdown(groups, filter = '') {
  sectionDropdown.innerHTML = '';
  const normalizedFilter = filter.trim().toLowerCase();

  Object.keys(groups).sort().forEach(group => {
    const matchedSections = groups[group].filter(name =>
      fuzzyMatch(normalizedFilter, name)
    );

    if (!matchedSections.length) return;

    const details = document.createElement('details');
    details.classList.add('section-group');

    if (normalizedFilter) details.open = true;

    const summary = document.createElement('summary');
    summary.textContent = group;
    details.appendChild(summary);

    const ul = document.createElement('ul');
    ul.classList.add('section-list');

    matchedSections.forEach(name => {
      const questionCount = sections[name]?.length || 0;
      const li = document.createElement('li');
      li.textContent = `${name} (${questionCount})`;
      li.tabIndex = 0;

      li.addEventListener('click', () => {
        sectionSearchInput.value = name;
        numQuestionsInput.value = questionCount;
        sectionDropdown.style.display = 'none';
        sectionSearchInput.focus();
      });

      // Optional keyboard navigation
      li.addEventListener('keydown', e => {
        if (e.key === 'Enter') li.click();
        if (e.key === 'ArrowDown') li.nextElementSibling?.focus();
        if (e.key === 'ArrowUp') li.previousElementSibling?.focus();
      });

      ul.appendChild(li);
    });

    details.appendChild(ul);
    sectionDropdown.appendChild(details);
  });

  sectionDropdown.style.display = 'block';
}

// 🔍 Filter on input
sectionSearchInput.addEventListener('input', () => {
  const query = sectionSearchInput.value.trim().toLowerCase();
  renderGroupedDropdown(groupedSections, query);
});

// 👇 Show all groups when input is focused or clicked
sectionSearchInput.addEventListener('click', () => {
  renderGroupedDropdown(groupedSections);
});

// ⌨️ Keyboard navigation
sectionSearchInput.addEventListener('keydown', e => {
  const items = sectionDropdown.querySelectorAll('li');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    const next = currentActiveItem
      ? currentActiveItem.nextElementSibling || items[0]
      : items[0];
    highlightItem(next, items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prev = currentActiveItem
      ? currentActiveItem.previousElementSibling || items[items.length - 1]
      : items[items.length - 1];
    highlightItem(prev, items);
  } else if (e.key === 'Enter' && currentActiveItem) {
    currentActiveItem.click();
  }
});

function highlightItem(item, items) {
  items.forEach(i => i.classList.remove('active'));
  item.classList.add('active');
  currentActiveItem = item;
}

// 🖱️ Click outside to close
document.addEventListener('click', e => {
  if (!e.target.closest('.section-search-wrapper')) {
    sectionDropdown.style.display = 'none';
  }
});

// Auto-fill number of questions when a section is chosen
sectionSearchInput.addEventListener('change', e => {
  const section = e.target.value;
  numQuestionsInput.value = sections[section]?.length || '';
});

// Show custom confirm and start quiz only on Yes
function showCustomConfirm(sectionName, questionCount, minutes, onConfirm) {
  document.getElementById('section').textContent = sectionName;
  document.getElementById('qCount').textContent = questionCount;
  document.getElementById('qMinutes').textContent = minutes;
  const modal = document.getElementById('customConfirm');
  modal.style.display = 'flex';

  document.getElementById('confirmYes').onclick = () => {
    modal.style.display = 'none';
    onConfirm();
  };

  document.getElementById('confirmNo').onclick = () => {
    modal.style.display = 'none';
  };
}

// ESC to close modal
document.addEventListener('keydown', (event) => {
  const modal = document.getElementById('customConfirm');
  if (event.key === 'Escape' && modal.style.display === 'flex') {
    modal.style.display = 'none';
  }
});

document.getElementById('customConfirm').addEventListener('click', (e) => {
  if (e.target.id === 'customConfirm') {
    e.currentTarget.style.display = 'none';
  }
});

// Start quiz button
startQuizButton.addEventListener('click', () => {
  quizEnded = false;
  const section = sectionSearchInput.value.trim();;
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
  const minutes = Math.round(duration / 60);

  showCustomConfirm(section, numQuestions, minutes, () => {
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
  });
}

// Skip current question
skipQuestionButton.addEventListener('click', () => {
  if (hasAnswered) return;
  recordResponse('Skipped', false);
  goToNextOrEnd();
});

const clearButton = document.createElement('button');
clearButton.id = 'clearResponse';
clearButton.textContent = 'Clear Response';
clearButton.classList.add('clear-response-button');

skipQuestionButton.parentNode.insertBefore(clearButton, skipQuestionButton.nextSibling);

document.getElementById('clearResponse').addEventListener('click', () => {
  if (!quizSection.style.display || quizSection.style.display === 'none') return;

  const prev = userResponses[currentQuestionIndex];
  if (prev) {
    if (prev.correct === true) score--;
    else if (prev.correct === false && prev.response !== 'Skipped') wrong--;
  }

  // Enable all options
  document.querySelectorAll('.answer-option').forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('selected');
  });

  // Clear user comment
  const commentBox = document.getElementById('userComment');
  if (commentBox) commentBox.value = '';

  // Clear recorded response
  userResponses[currentQuestionIndex] = null;

  // Reset state
  selectedButton = null;
  hasAnswered = false;
  nextQuestionButton.style.display = 'none';
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
    img.src = `http://10.10.182.8:5000${current['Question Image URL']}`;
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
      img.src = `http://10.10.182.8:5000${imgUrl}`;
      img.alt = text || `Option ${i}`;
      btn.appendChild(img);
    }

    btn.addEventListener('click', () => handleAnswer(i - 1, btn));
    optionsContainer.appendChild(btn);
  }

  // --- Comment box AFTER options ---
  const commentWrapper = document.createElement('div');
  commentWrapper.style.marginTop = '20px';

  const commentLabel = document.createElement('label');
  commentLabel.textContent = 'Your Comment (Optional):';
  commentLabel.setAttribute('for', 'userComment');
  commentLabel.style.display = 'block';
  commentLabel.style.marginBottom = '5px';

  const commentBox = document.createElement('textarea');
  commentBox.id = 'userComment';
  commentBox.rows = 2;
  commentBox.style.width = '200%';
  commentBox.style.maxWidth = '200%';
  commentBox.style.boxSizing = 'border-box';
  commentBox.placeholder = 'Write your approach, doubt, or notes...';

  commentWrapper.appendChild(commentLabel);
  commentWrapper.appendChild(commentBox);

  optionsContainer.appendChild(commentWrapper); // ✅ Appended after options

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

  // --- Undo previous score if any ---
  const prev = userResponses[currentQuestionIndex];
  if (prev) {
    if (prev.correct === true) score--;
    else if (prev.correct === false && prev.response !== 'Skipped') wrong--;
  }
  
  if (isCorrect) score++;
  else wrong++;

  const text = button.textContent?.trim() || '';
  const img = current[`Answer ${index + 1} Image URL`]
    ? `http://10.10.182.8:5000${current[`Answer ${index + 1} Image URL`]}`
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
  const commentInput = document.getElementById('userComment');
  const userComment = commentInput ? commentInput.value.trim() : '';
  userResponses[currentQuestionIndex] = {
    question: q['Question'] || '',
    questionImage: q['Question Image URL'] || '',
    comprehension: current['Comprehension'] || '',
    response,
    correct,
    responseTime: timeSpent ?? Math.round((Date.now() - 
    questionStartTime) / 1000),
    comment: userComment
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
  const section = sectionSearchInput.value.trim();;
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
      question: q['Question'] || '',
      questionImage: q['Question Image URL'] || '',
      comprehension: q['Comprehension'] || '',
      options,
      correctAnswerIndex: correctIndex,
      correctAnswer,
      response: u.response,
      comment: u.comment || '',
      correct: u.correct,
      responseTime: u.responseTime,
      timestamp: examStartTime,
      submitTime,
      section,
      score
    };
  });

  fetch('http://10.10.182.8:5000/api/response', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, responses, score, section, examStartTime, submitTime })
  })
    .then(res => res.json())
    .then(data => alert(data.message))
    .catch(err => console.error('Error submitting responses:', err));

  fetch('http://10.10.182.8:5000/api/score', {
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
