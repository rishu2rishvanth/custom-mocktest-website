
import { initResultsButton, handleScrollButtonsVisibility } from './resultManager.js';

// DOM Elements
const startQuizButton = document.getElementById('startQuiz');
const nextQuestionButton = document.getElementById('nextQuestion');
const prevQuestionButton = document.getElementById('prevQuestion');
const skipQuestionButton = document.getElementById('skipQuestion');
const markQuestionButton = document.getElementById('markQuestion');
const restartQuizButton = document.getElementById('restartQuiz');
const submitQuizButton = document.getElementById('submitQuiz');
const numQuestionsInput = document.getElementById('numQuestions');
const timerInput = document.getElementById('timer');
const questionContainer = document.getElementById('questionContainer');
const optionsContainer = document.getElementById('optionsContainer');
const commentContainer = document.getElementById('commentContainer');
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
let natObserver = null;
let subjectMap = {};
let activeSubject = null;
let subjectLastVisited = {};

// -------------------- Helper additions / fixes --------------------

let subjectHoverBox = null;

function createSubjectHoverBox() {
  if (subjectHoverBox) return;

  subjectHoverBox = document.createElement('div');
  subjectHoverBox.id = 'subjectHoverBox';
  document.body.appendChild(subjectHoverBox);
}

// Clean raw text for storage (remove any HTML tags that may have been inserted when rendering)
function cleanTextForStorage(str) {
  if (!str) return '';
  return String(str).replace(/<[^>]*>/g, '').trim();
}

// storeTimeBeforeLeaving: ONLY updates/creates responseTime, doesn't change other fields
function storeTimeBeforeLeaving() {
  const prev = userResponses[currentQuestionIndex];
  const elapsed = Math.round((Date.now() - questionStartTime) / 1000);

  if (!prev) {
    // Store minimal entry but mark as no-answer placeholder
    userResponses[currentQuestionIndex] = {
      responseTime: elapsed,
      _noAnswer: true
    };
  } else {
    prev.responseTime = (prev.responseTime || 0) + elapsed;
  }

  // reset questionStartTime so repeated calls without navigation don't double-count
  questionStartTime = Date.now();
}

function clearNatObserver() {
  if (natObserver) {
    clearInterval(natObserver);
    natObserver = null;
  }
}

function syncActiveSubjectWithQuestion() {
  const q = selectedQuestions[currentQuestionIndex];
  if (!q) return;

  const subject = (q['Subject'] && q['Subject'].trim()) || 'Uncategorized';

  if (subject !== activeSubject) {
    activeSubject = subject;
    renderSubjectTabs();
    renderQuestionNavigator();
  }
}

// -------------------- End helpers --------------------

// On page load
document.addEventListener('DOMContentLoaded', () => {
  initResultsButton();
  if (sectionSearchInput) populateSections();
  addSectionSearchButton();   // ← added here
  handleScrollButtonsVisibility(quizSection, resultSection);
  createSubjectHoverBox();
});

// -------------------- Question Paper Button --------------------
const questionPaperBtn = document.createElement('button');
questionPaperBtn.id = 'questionPaperBtn';
questionPaperBtn.className = 'questionPaperBtn';
questionPaperBtn.innerHTML = '<span class="questionpaper_icon"></span> Question Paper';
questionPaperBtn.style.display = 'none'; // 🔒 hidden by default

document.addEventListener('DOMContentLoaded', () => {

  const qpContainer = document.createElement('div');
  qpContainer.id = 'questionPaperContainer';
  qpContainer.className = 'question-paper-container';

  qpContainer.appendChild(questionPaperBtn);

  // Append inside quiz section (top area)
  quizSection.prepend(qpContainer);

  questionPaperBtn.style.display = 'none';
});

function createQuestionPaperPanel() {
  if (document.getElementById('questionPaperPanel')) return;

  const panel = document.createElement('div');
  panel.id = 'questionPaperPanel';
  panel.style.cssText = `
    position: fixed;
    width: 70%;
    top: 10%;
    right: 15%;
    height: 80%;
    background: #fff;
    border: 1px solid #ccc;
    box-shadow: 0 0 10px rgba(0,0,0,0.2);
    padding: 15px;
    z-index: 999;
    display: none;
    overflow: hidden;
  `;

  panel.innerHTML = `
    <div class="qp-content">
      <div style="display:flex; flex-direction: column; position: sticky; top: 0; background: #fff; z-index: 1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin-bottom: 10px;"><span class="questionpaper_icon"></span>Question Paper</h3>
          <button id="closeQuestionPaper" style="width:auto; margin-top:0px; margin-bottom: 10px; margin-right: 10px; padding:5px 15px;">✖</button>
        </div>
        <hr style="margin:0;">
      </div>
      <div id="questionPaperContent"></div>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById('closeQuestionPaper').onclick = () => {
    panel.style.display = 'none';
  };
}

document.addEventListener('DOMContentLoaded', createQuestionPaperPanel);

function renderQuestionPaper() {
  const container = document.getElementById('questionPaperContent');
  container.innerHTML = '';

  selectedQuestions.forEach((q, i) => {
    const qDiv = document.createElement('div');
    qDiv.style.cssText = `
      margin-bottom: 15px;
      padding: 10px;
      border-bottom: 1px solid #ddd;
    `;

    const type = q['Question type'] || 'MCQ';
    const marks = q['Marks'] || 1;

    // ---- Negative marking logic ----
    let negative = 0;
    if (type === 'MCQ') {
      if (marks === 1) negative = '1/3';
      else if (marks === 2) negative = '2/3';
    }

    const questionText = formatText(q['Question'] || '');
    const questionImage = q['Question Image URL']
      ? `<img 
            src="http://192.168.1.2:5000${q['Question Image URL']}" 
            style="max-width:60%; margin-top:8px; display:block;"
            alt="Question Image"
        >`
      : '';

    qDiv.innerHTML = `
      <b>Q${i + 1}.</b>
      <div style="margin-top:6px;">${questionText}</div>
      ${questionImage}
      <div style="font-size:15px; margin-top:15px; color:#555; font-style: italic;">
        Question Type: <b>${type}</b> |
        Marks for correct Answer : <b><span style="color: green;">${marks}</span></b> |
        Negative Marks: <b><span style="color: red;">${negative}</span></b>
      </div>
    `;

    container.appendChild(qDiv);
    typesetMath(container);
  });
}

questionPaperBtn.addEventListener('click', () => {
  if (!selectedQuestions.length) {
    alert('Start the quiz first.');
    return;
  }

  renderQuestionPaper();
  document.getElementById('questionPaperPanel').style.display = 'block';
});

function triggerSectionSearch() {
  const input = document.getElementById('sectionSearchInput');
  const filter = input.value.toLowerCase();
  const dropdown = document.getElementById('sectionGroupedDropdown');

  dropdown.style.display = 'block'; // ← NEW

  const items = dropdown.querySelectorAll('summary, li'); // ← FIXED
  items.forEach(item => {
    const txt = item.textContent.toLowerCase();
    item.style.display = txt.includes(filter) ? '' : 'none';
  });
}

function addSectionSearchButton() {
  const wrapper = document.querySelector('.section-search-wrapper .input-with-keyboard');
  if (!wrapper) return;

  // Prevent duplicates
  if (document.getElementById('sectionSearchBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'sectionSearchBtn';
  btn.textContent = 'Search';

  if (window.matchMedia("(max-width: 768px)").matches) {
    btn.style.cssText = `
        display: none;
      `;
  } else {
    btn.style.cssText = `
          width: auto;
          margin-left: 8px;
	        margin-top: 0px;
	        margin-bottom: 15px;
          cursor: pointer;
      `;
  }

  wrapper.appendChild(btn);

  // Trigger search
  btn.addEventListener('click', triggerSectionSearch);

  const input = document.getElementById('sectionSearchInput');
  input.addEventListener('input', triggerSectionSearch);

  // Attach virtual keyboard if available
  if (typeof VKI_attach === 'function') {
    VKI_attach(input);
  }
}

// Load section names and their questions
function populateSections() {
  fetch('http://192.168.1.2:5000/api/questions/sections')
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
  // scroll to top
  window.scrollTo({
    top: 0,
    behavior: 'smooth' // optional
  });
});

// Restart quiz button
restartQuizButton.addEventListener('click', () => {
  questionPaperBtn.style.display = 'none';
  resultSection.style.display = 'none';
  setupSection.style.display = 'block';
  const sectionLabel = document.getElementById('activeSectionName');
  if (sectionLabel) {
    sectionLabel.textContent = '';
  }

  // 🔢 Restore floating keyboard on home
  if (window.vKeyboard) {
    vKeyboard.mode = 'floating';
  }
});

// Submit quiz button
submitQuizButton.addEventListener('click', (e) => {
  clearNatObserver();
  // If triggered by timer, a flag is passed → skip confirmation
  const autoSubmit = e.detail === 'AUTO';

  if (!autoSubmit) {
    const confirmSubmit = confirm("Are you sure you want to submit the quiz?");
    if (!confirmSubmit) return;
  }

  // 1️⃣ Always save time first
  storeTimeBeforeLeaving();

  // 2️⃣ Force-save last answer IF user has answered something
  const q = selectedQuestions[currentQuestionIndex];
  const type = q['Question Type'] || 'MCQ';

  if (!quizEnded) {

    // --- MCQ ---
    if (type === 'MCQ') {
      const selectedBtn = document.querySelector('.answer-option.selected');
      if (selectedBtn) {
        const index = parseInt(selectedBtn.dataset.index, 10);
        const isCorrect = index === q['Correct Answer Index'];

        const rawText = q[`Answer ${index + 1} Text`] || '';
        const rawImg = q[`Answer ${index + 1} Image URL`] || '';

        recordResponse(rawImg || rawText, isCorrect);
      }
    }

    // --- MSQ ---
    else if (type === 'MSQ') {
      const selected = [...document.querySelectorAll('.answer-option.selected')]
        .map(btn => parseInt(btn.dataset.index));

      const correctList = (q['MSQ Answers'] || '')
        .split(',')
        .map(n => parseInt(n.trim(), 10));

      const isCorrect =
        selected.slice().sort().join(',') ===
        correctList.slice().sort().join(',');

      recordResponse(selected.join(', '), isCorrect);
    }

    // --- NAT ---
    else if (type === 'NAT') {
      const input = document.getElementById('natInput');
      if (input && input.value.trim() !== '') {
        const val = parseFloat(input.value);
        const raw = q['NAT Answer Range'] || '';
        let isCorrect = false;

        if (!isNaN(val)) {
          const parts = raw.split(/\s+OR\s+/i);
          for (const part of parts) {
            const m = part.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
            if (m) {
              let low = parseFloat(m[1]);
              let high = parseFloat(m[2]);
              if (low > high) [low, high] = [high, low];
              if (val >= low && val <= high) {
                isCorrect = true;
                break;
              }
            }
          }
        }

        recordResponse(input.value, isCorrect);
      }
    }
  }

  // 3️⃣ Finally end quiz
  endQuiz();
});

// -------------------- Question paper validation (FAILSAFE) --------------------
function validateQuestionPaper(questions) {
  const errors = [];

  questions.forEach((q, idx) => {
    const qNo = idx + 1;
    const type = q['Question Type'] || 'MCQ';

    // ---------- MCQ ----------
    if (type === 'MCQ') {
      const idxVal = q['Correct Answer Index'];

      if (!Number.isInteger(idxVal) || idxVal < 0 || idxVal > 3) {
        errors.push(`Q${qNo}: MCQ invalid Correct Answer Index`);
        return;
      }

      const txt = q[`Answer ${idxVal + 1} Text`];
      const img = q[`Answer ${idxVal + 1} Image URL`];
      if (!txt && !img) {
        errors.push(`Q${qNo}: MCQ correct option has no text/image`);
      }
    }

    // ---------- MSQ ----------
    else if (type === 'MSQ') {
      const raw = q['MSQ Answers'];
      if (!raw || typeof raw !== 'string') {
        errors.push(`Q${qNo}: MSQ Answers missing`);
        return;
      }

      const parts = raw.split(',').map(v => v.trim());
      const seen = new Set();

      for (const p of parts) {
        const n = Number(p);
        if (!Number.isInteger(n) || n < 0 || n > 3) {
          errors.push(`Q${qNo}: MSQ invalid option index "${p}"`);
          break;
        }
        if (seen.has(n)) {
          errors.push(`Q${qNo}: MSQ duplicate option index "${n}"`);
          break;
        }
        seen.add(n);
      }
    }

    // ---------- NAT ----------
    else if (type === 'NAT') {
      const raw = q['NAT Answer Range'];

      if (raw === undefined || raw === null) {
        errors.push(`Q${qNo}: NAT Answer missing`);
        return;
      }

      if (typeof raw !== 'string') {
        errors.push(`Q${qNo}: NAT Answer must be string`);
        return;
      }

      const value = raw.trim();
      if (value === '') {
        errors.push(`Q${qNo}: NAT Answer cannot be empty`);
        return;
      }

      // Optional numeric validation (supports: 10-20, -2--15, OR)
      const num = '[-+]?\\d+(?:\\.\\d+)?';
      const range = `${num}\\s*-\\s*${num}`;
      const orRange = new RegExp(`^(${range})(\\s+OR\\s+(${range}))*$`, 'i');
      const singleNum = new RegExp(`^${num}$`);

      if (singleNum.test(value) || orRange.test(value)) {
        const parts = value.split(/\s+OR\s+/i);
        for (const p of parts) {
          if (singleNum.test(p)) continue;
          const m = p.match(new RegExp(`(${num})\\s*-\\s*(${num})`));
          if (!m) {
            errors.push(`Q${qNo}: Invalid NAT range "${p}"`);
            return;
          }
        }
      }
      // else → free-text NAT allowed
    }
  });

  return errors;
}

// Start quiz setup
function startQuiz(section) {
  const numQuestions = parseInt(numQuestionsInput.value);
  const duration = parseInt(timerInput.value);
  const minutes = Math.round(duration / 60);

  showCustomConfirm(section, numQuestions, minutes, () => {

    // 🔒 FAILSAFE CHECK
    const errors = validateQuestionPaper(sections[section]);
    if (errors.length) {
      alert(
        '❌ Test cannot start due to invalid questions:\n\n' +
        errors.slice(0, 10).join('\n') +
        (errors.length > 10 ? '\n\nMore errors exist…' : '')
      );
      return;
    }

    if (window.vKeyboard) {
      vKeyboard.mode = 'static';
    }

    // ✅ STEP 1: Select & shuffle overall pool first
    let pool = shuffleArray([...sections[section]]).slice(0, numQuestions);

    // ✅ STEP 2: Group by subject
    let tempSubjectMap = {};

    pool.forEach(q => {
      const subject = (q['Subject'] && q['Subject'].trim()) || 'Uncategorized';

      if (!tempSubjectMap[subject]) {
        tempSubjectMap[subject] = [];
      }

      tempSubjectMap[subject].push(q);
    });

    // ✅ STEP 3: Sort subjects in ascending order
    const sortedSubjects = Object.keys(tempSubjectMap).sort();

    // ✅ STEP 4: Shuffle inside each subject
    sortedSubjects.forEach(subject => {
      tempSubjectMap[subject] = shuffleArray(tempSubjectMap[subject]);
    });

    // ✅ STEP 5: Serially append subject after subject
    selectedQuestions = [];

    sortedSubjects.forEach(subject => {
      selectedQuestions.push(...tempSubjectMap[subject]);
    });

    // ✅ STEP 6: Build subjectMap based on new serial order
    subjectMap = {};

    selectedQuestions.forEach((q, index) => {
      const subject = (q['Subject'] && q['Subject'].trim()) || 'Uncategorized';

      if (!subjectMap[subject]) {
        subjectMap[subject] = [];
      }

      subjectMap[subject].push(index);
    });

    activeSubject = sortedSubjects[0];

    // Reset state
    userResponses = Array(selectedQuestions.length).fill(null);
    subjectLastVisited = {};
    currentQuestionIndex = 0;
    score = 0;
    wrong = 0;
    examTimeRemaining = duration;
    examStartTime = new Date().toISOString();

    setupSection.style.display = 'none';
    quizSection.style.display = 'block';
    // 🔥 Dynamically set section name in header
    const sectionLabel = document.getElementById('activeSectionName');
    if (sectionLabel) {
      sectionLabel.textContent = section;
    }

    renderSubjectTabs();
    questionPaperBtn.style.display = 'inline-block';
    showNextQuestion();
    renderQuestionNavigator();
    updateQuestionStatusCounts();
    updateNavButtonStyle(currentQuestionIndex);
    startExamTimer();
  });
}


function renderSubjectTabs() {
  const bar = document.getElementById('subjectBar');
  if (!bar) return;

  bar.innerHTML = '';

  Object.keys(subjectMap).forEach(subject => {

    const total = subjectMap[subject].length;

    // Count answered in this subject
    let answeredCount = 0;

    subjectMap[subject].forEach(index => {
      const resp = userResponses[index];
      if (resp && typeof resp.correct === 'boolean') {
        answeredCount++;
      }
    });

    const tab = document.createElement('div');
    tab.className = 'subject-tab';

    tab.innerHTML = `
      <span class="subject-name">${subject}</span>
      <span class="subject-count">(${answeredCount}/${total})</span>
    `;

    if (subject === activeSubject) {
      tab.classList.add('active');
    }

    tab.addEventListener('mouseenter', () => {
      showSubjectHover(subject, tab);
    });

    tab.addEventListener('mouseleave', () => {
      hideSubjectHover();
    });

    tab.addEventListener('click', () => {
      activeSubject = subject;
      renderSubjectTabs();
      renderQuestionNavigator();

      // Restore last visited question if exists
      if (subjectLastVisited[subject] !== undefined) {
        currentQuestionIndex = subjectLastVisited[subject];
      } else {
        currentQuestionIndex = subjectMap[subject][0];
      }

      showNextQuestion();
      updateNavButtonStyle(currentQuestionIndex);
    });


    bar.appendChild(tab);
  });
}

function showSubjectHover(subject, element) {
  if (!subjectHoverBox) return;

  const indices = subjectMap[subject];

  let notVisited = 0;
  let unanswered = 0;
  let skipped = 0;
  let answered = 0;
  let markedOnly = 0;
  let answeredAndMarked = 0;

  indices.forEach(index => {
    const resp = userResponses[index];

    // 1️⃣ Not visited
    if (!resp) {
      notVisited++;
      return;
    }

    const isMarked = resp.marked === true;
    const isAnswered = typeof resp.correct === 'boolean';

    // 2️⃣ Skipped
    if (resp.response === 'Skipped') {
      skipped++;
      return;
    }

    // 3️⃣ Answered & Marked
    if (isAnswered && isMarked) {
      answeredAndMarked++;
      return;
    }

    // 4️⃣ Answered only
    if (isAnswered) {
      answered++;
      return;
    }

    // 5️⃣ Marked only
    if (isMarked) {
      markedOnly++;
      return;
    }

    // 6️⃣ Visited but unanswered
    unanswered++;
  });

  subjectHoverBox.innerHTML = `
    <div class="hover-status">
      <div class="hover-title">${subject}</div>
      <hr>
      <div>Not Visited <span class="hover-notVisited">${notVisited}</span></div>
      <div>Unanswered <span class="hover-unanswered">${unanswered}</span></div>
      <div>Skipped <span class="hover-skipped">${skipped}</span></div>
      <div>Answered <span class="hover-answered">${answered}</span></div>
      <div>Marked <span class="hover-marked">${markedOnly}</span></div>
      <div>Answered & Marked <span class="hover-answered-marked">${answeredAndMarked}</span></div>
    </div>
  `;

  const rect = element.getBoundingClientRect();

  subjectHoverBox.style.top =
    rect.bottom + window.scrollY + 6 + 'px';

  subjectHoverBox.style.left =
    rect.left + window.scrollX + 'px';

  subjectHoverBox.style.display = 'block';
}

function hideSubjectHover() {
  if (subjectHoverBox) {
    subjectHoverBox.style.display = 'none';
  }
}


function renderQuestionNavigator() {
  const container = document.getElementById('questionNavContent');
  container.innerHTML = '';

  selectedQuestions.forEach((q, i) => {

    const subject =
      (q['Subject'] && q['Subject'].trim()) || 'Uncategorized';

    if (activeSubject && subject !== activeSubject) return;

    const btn = document.createElement('button');
    btn.textContent = i + 1;
    btn.className = 'nav-btn';
    btn.id = `nav-q-${i}`;

    btn.onclick = () => {
      clearNatObserver();
      // save time, then record skip
      storeTimeBeforeLeaving();
      resetCalculator();
      expandNavPanel();

      // scroll to top
      window.scrollTo({
        top: 0,
        behavior: 'smooth' // optional
      });
      currentQuestionIndex = i;
      showNextQuestion();
    };

    container.appendChild(btn);
    updateNavButtonStyle(i);
  });
}

function updateNavButtonStyle(index, state) {
  // Remove active class from previously active button
  const prevActiveBtn = document.querySelector('.nav-btn.active');
  if (prevActiveBtn && prevActiveBtn.id !== `nav-q-${index}`) {
    prevActiveBtn.classList.remove('active');
  }

  const btn = document.getElementById(`nav-q-${index}`);
  if (!btn) return;

  // Reset and mark active
  btn.className = 'nav-btn';
  btn.classList.add('active');

  if (state === 'marked') {
    btn.classList.add('marked');
  } else {
    const user = userResponses[index];

    if (user?.marked) {
      btn.classList.add('marked');   // 🔧 restore mark on revisit
    }
    if (!user) {
      // Visited but no record yet
      btn.classList.add('not-visited');
    }
    else if (user._noAnswer) {
      // Time recorded but no answer
      btn.classList.add('visited');
    }
    else if (user.response === 'Skipped') {
      btn.classList.add('skipped');
    }
    else if (typeof user.correct === 'boolean') {
      btn.classList.add('answered');

      if (user.marked) {
        btn.classList.add('answered-marked'); // 🟣 NEW CLASS
      }
    }
  }

  btn.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  updateQuestionStatusCounts();
}

function updateQuestionStatusCounts() {
  let notVisited = 0;
  let unanswered = 0;
  let skipped = 0;
  let answered = 0;
  let markedOnly = 0;
  let answeredAndMarked = 0;

  const total = selectedQuestions.length;

  for (let i = 0; i < total; i++) {
    const resp = userResponses[i];

    // 1️⃣ Not visited
    if (!resp) {
      notVisited++;
      continue;
    }

    const isMarked = resp.marked === true;
    const isAnswered = typeof resp.correct === 'boolean';

    // 2️⃣ Skipped
    if (resp.response === 'Skipped') {
      skipped++;
      continue;
    }

    // 3️⃣ Answered & Marked
    if (isAnswered && isMarked) {
      answeredAndMarked++;
      continue;
    }

    // 4️⃣ Answered only
    if (isAnswered) {
      answered++;
      continue;
    }

    // 5️⃣ Marked only (never unanswered)
    if (isMarked) {
      markedOnly++;
      continue;
    }

    // 6️⃣ Visited but unanswered
    unanswered++;
  }

  // 🔢 Update UI
  document.getElementById('count-notVisited').textContent = notVisited;
  document.getElementById('count-unanswered').textContent = unanswered;
  document.getElementById('count-skipped').textContent = skipped;
  document.getElementById('count-answered').textContent = answered;
  document.getElementById('count-marked').textContent = markedOnly;
  document.getElementById('count-answered-marked').textContent = answeredAndMarked;

  // 🛡️ DEV SAFETY CHECK (optional but HIGHLY recommended)
  const sum =
    notVisited +
    unanswered +
    skipped +
    answered +
    markedOnly +
    answeredAndMarked;

  if (sum !== total) {
    console.warn(
      '❌ Question count mismatch!',
      { total, sum, notVisited, unanswered, skipped, answered, markedOnly, answeredAndMarked }
    );
  }
}

/* =========================================================
   GLOBAL CALCULATOR HELPERS
   (Exposed to window for inline & legacy JS)
========================================================= */

function expandNavPanel() {
  const nav = document.getElementById('questionNavPanel');
  const statusPanel = document.getElementById('questionStatusPanel');
  const toggleBtn = document.getElementById('toggleNavPanelBtn');

  if (!nav || !nav.classList.contains('collapsed')) return;

  nav.classList.remove('collapsed');
  toggleBtn.classList.remove('moved');
  statusPanel.classList.remove('hidden');
  toggleBtn.textContent = "☰ Collapse";
}

function resetCalculatorPosition() {
  const calc = document.getElementById('loadCalc');
  if (!calc) return;

  calc.style.position = 'fixed';
  calc.style.top = '110px';
  calc.style.right = '0px';
  calc.style.left = 'auto';
  calc.style.transform = 'none';
}

function resetCalculator() {
  const $calcMinBtn = $('#calc_min');
  const $helpBackBtn = $('#keyPad_Helpback');
  const $helpContent = $('#helpContent');

  // If minimized → maximize
  if ($calcMinBtn.hasClass('calc_max')) {
    $calcMinBtn.trigger('click');
  }

  // If help open → back
  if ($helpContent.is(':visible') && $helpBackBtn.is(':visible')) {
    $helpBackBtn.trigger('click');
  }

  // Clear calculator
  $('#keyPad_btnAllClr').trigger('click');
  $('#keyPad_MC').trigger('click');

  resetCalculatorPosition();
  $('#loadCalc').hide();
}

function toggleCalculator() {
  const wrapper = document.getElementById('loadCalc');
  if (!wrapper) return;

  const isHidden = getComputedStyle(wrapper).display === 'none';

  if (isHidden) {
    resetCalculatorPosition();
    wrapper.style.display = 'block';
  } else {
    resetCalculator();
    wrapper.style.display = 'none';
  }
}

/* 🌍 EXPOSE GLOBALLY (CRITICAL) */
window.resetCalculator = resetCalculator;
window.resetCalculatorPosition = resetCalculatorPosition;
window.toggleCalculator = toggleCalculator;

// Skip current question
skipQuestionButton.addEventListener('click', () => {
  clearNatObserver();
  // save time, then record skip
  storeTimeBeforeLeaving();
  recordResponse('Skipped', null);
  updateQuestionStatusCounts();
  renderSubjectTabs();
  goToNextOrEnd();
});

// Previous question
prevQuestionButton.addEventListener('click', () => {
  clearNatObserver();
  // Save time only
  storeTimeBeforeLeaving();

  // Clear calculator & keypad (same as others)
  resetCalculator();
  expandNavPanel();

  // Scroll to top
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  // Move to previous question (wrap around like GATE)
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
  } else {
    currentQuestionIndex = selectedQuestions.length - 1;
  }
  syncActiveSubjectWithQuestion();
  showNextQuestion();
  updateNavButtonStyle(currentQuestionIndex);
});

function updatePrevButtonVisibility() {
  if (!prevQuestionButton) return;
  prevQuestionButton.style.display =
    currentQuestionIndex === 0 ? 'none' : 'inline-block';
}

// Mark question
markQuestionButton.addEventListener('click', () => {
  // save time when marking and move on (do not force save answer)
  storeTimeBeforeLeaving();

  const current = selectedQuestions[currentQuestionIndex];
  const type = current['Question Type'] || 'MCQ';

  // 🔹 SAVE RESPONSE FIRST (if any)
  if (!hasAnswered) {
    // nothing selected → just mark
  } else {
    // ---- MCQ ----
    if (type === 'MCQ') {
      const selectedBtn = document.querySelector('.answer-option.selected');

      if (selectedBtn) {
        const index = parseInt(selectedBtn.dataset.index, 10);
        const responseValue =
          current[`Answer ${index + 1} Image URL`] ||
          current[`Answer ${index + 1} Text`] ||
          '';

        const isCorrect = index === current['Correct Answer Index'];
        recordResponse(responseValue, isCorrect);
      }
    }


    // ---- MSQ ----
    else if (type === 'MSQ') {
      const selected = [...document.querySelectorAll('.answer-option.selected')]
        .map(btn => parseInt(btn.dataset.index));

      if (selected.length) {
        const correctList = (current['MSQ Answers'] || '')
          .split(',')
          .map(n => parseInt(n.trim(), 10));

        const isCorrect =
          selected.slice().sort().join(',') ===
          correctList.slice().sort().join(',');

        recordResponse(selected.join(', '), isCorrect);
      }
    }

    // ---- NAT ----
    else if (type === 'NAT') {
      const input = document.getElementById('natInput');
      if (input && input.value.trim() !== '') {
        const val = parseFloat(input.value);
        const raw = current['NAT Answer Range'] || '';
        let isCorrect = false;

        if (!isNaN(val)) {
          const parts = raw.split(/\s+OR\s+/i);
          for (const part of parts) {
            const m = part.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
            if (m) {
              let low = parseFloat(m[1]);
              let high = parseFloat(m[2]);
              if (low > high) [low, high] = [high, low];
              if (val >= low && val <= high) {
                isCorrect = true;
                break;
              }
            }
          }
        }

        recordResponse(input.value, isCorrect);
      }
    }
  }

  // 🔹 NOW APPLY MARK (without downgrading answer)
  const prev = userResponses[currentQuestionIndex] || {};
  userResponses[currentQuestionIndex] = {
    ...prev,
    marked: true
  };

  updateNavButtonStyle(currentQuestionIndex);
  updateQuestionStatusCounts();
  renderSubjectTabs();
  goToNextOrEnd();
});

const clearButton = document.createElement('button');
clearButton.id = 'clearResponse';
clearButton.textContent = 'Clear Response';
clearButton.classList.add('clear-response-button');

skipQuestionButton.parentNode.insertBefore(clearButton, skipQuestionButton.nextSibling);

document.getElementById('clearResponse').addEventListener('click', () => {
  resetCalculator();
  expandNavPanel();

  if (!quizSection.style.display || quizSection.style.display === 'none') return;

  const prev = userResponses[currentQuestionIndex];

  // 🔁 UNDO previous scoring if it existed
  if (prev && typeof prev.correct === 'boolean') {
    if (prev.correct === true) {
      score -= prev.marksAwarded || 0;
    } else if (prev.correct === false && prev.negativePenalty) {
      score += prev.negativePenalty;
      if (wrong > 0) wrong--;
    }
  }

  // Enable all options
  document.querySelectorAll('.answer-option').forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('selected');
  });

  // Clear user comment
  const commentBox = document.getElementById('userComment');
  if (commentBox) commentBox.value = '';

  // Clear NAT input
  const natInput = document.getElementById('natInput');
  if (natInput) natInput.value = '';

  // Store neutral cleared state
  userResponses[currentQuestionIndex] = {
    response: null,
    correct: null,
    negativePenalty: 0,
    marksAwarded: 0,
    responseTime: prev?.responseTime || 0,
    _noAnswer: true
  };

  // Reset state
  selectedButton = null;
  hasAnswered = false;
  updateNavButtonStyle(currentQuestionIndex);
  updateQuestionStatusCounts();
  renderSubjectTabs();
  nextQuestionButton.style.display = 'block';
});

// Next button (after answering)
nextQuestionButton.addEventListener('click', () => {
  clearNatObserver();
  const current = selectedQuestions[currentQuestionIndex];
  const type = current['Question Type'] || 'MCQ';

  // Always save time
  storeTimeBeforeLeaving();

  // ---------- MCQ ----------
  if (type === 'MCQ') {
    const selectedBtn = document.querySelector('.answer-option.selected');

    if (selectedBtn) {
      const index = parseInt(selectedBtn.dataset.index, 10);
      const isCorrect = index === current['Correct Answer Index'];

      const rawText = current[`Answer ${index + 1} Text`] || '';
      const rawImg = current[`Answer ${index + 1} Image URL`] || '';

      recordResponse(rawImg || rawText, isCorrect);
    }
    // ❌ NO ELSE
  }

  // ---------- MSQ ----------
  else if (type === 'MSQ') {
    const selected = [...document.querySelectorAll('.answer-option.selected')]
      .map(btn => parseInt(btn.dataset.index, 10));

    if (selected.length) {
      const correct = (current['MSQ Answers'] || '')
        .split(',')
        .map(n => parseInt(n.trim(), 10));

      const isCorrect =
        selected.slice().sort().join(',') ===
        correct.slice().sort().join(',');

      recordResponse(selected.join(', '), isCorrect);
    }
    // ❌ NO ELSE
  }

  // ---------- NAT ----------
  else if (type === 'NAT') {
    const input = document.getElementById('natInput');

    if (input && input.value.trim() !== '') {
      const val = parseFloat(input.value);
      const raw = current['NAT Answer Range'] || '';
      let isCorrect = false;

      if (!isNaN(val)) {
        for (const part of raw.split(/\s+OR\s+/i)) {
          const m = part.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
          if (m) {
            let [low, high] = [parseFloat(m[1]), parseFloat(m[2])];
            if (low > high) [low, high] = [high, low];
            if (val >= low && val <= high) {
              isCorrect = true;
              break;
            }
          }
        }
      }

      recordResponse(input.value, isCorrect);
    }
    // ❌ NO ELSE
  }

  goToNextOrEnd();
});

// Helper: Go to next question or end quiz
function goToNextOrEnd() {
  resetCalculator();
  expandNavPanel();

  // scroll to top
  window.scrollTo({
    top: 0,
    behavior: 'smooth' // optional
  });
  if (currentQuestionIndex < selectedQuestions.length - 1) {
    currentQuestionIndex++;
  } else {
    // loop back to first question
    currentQuestionIndex = 0;
  }
  // 🔥 NEW: auto-sync subject
  syncActiveSubjectWithQuestion();
  showNextQuestion();
  updateNavButtonStyle(currentQuestionIndex);
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
  // Remember last visited question for this subject
  const currentSubject =
    (selectedQuestions[currentQuestionIndex]['Subject']?.trim()) || 'Uncategorized';

  subjectLastVisited[currentSubject] = currentQuestionIndex;


  questionContainer.innerHTML = '';
  optionsContainer.innerHTML = '';
  commentContainer.innerHTML = '';

  const qNum = currentQuestionIndex + 1;
  const questionText = document.createElement('div');
  const weightage = current['Marks'] || 1;
  const questionType = current['Question Type'] || 'MCQ';

  // Type tag
  const typeTag = document.createElement('div');
  typeTag.className = 'question-type-row';

  // ---- Negative marking logic ----
  let negMarking = 0;
  if (questionType === 'MCQ') {
    if (weightage === 1) negMarking = '1/3';
    else if (weightage === 2) negMarking = '2/3';
  }

  // ---- LEFT: Question Type ----
  const leftDiv = document.createElement('div');
  leftDiv.style.fontWeight = 'bold';
  leftDiv.textContent = `Question Type: ${questionType}`;

  // ---- RIGHT: Marks Info ----
  const rightDiv = document.createElement('div');

  const marksText = document.createElement('span');
  marksText.textContent = 'Marks for correct Answer: ';

  const marksValue = document.createElement('span');
  marksValue.textContent = weightage;
  marksValue.style.color = 'green';
  marksValue.style.fontWeight = 'bold';

  const separator = document.createElement('span');
  separator.textContent = ' | ';

  const negText = document.createElement('span');
  negText.textContent = 'Negative Marks: ';

  const negValue = document.createElement('span');
  negValue.textContent = negMarking;
  negValue.style.color = 'red';
  negValue.style.fontWeight = 'bold';

  rightDiv.append(
    marksText,
    marksValue,
    separator,
    negText,
    negValue
  );

  // ---- Append row ----

  // Show Question Type row ONLY while quiz is active
  if (!quizEnded) {
    typeTag.append(leftDiv, rightDiv);
    questionContainer.appendChild(typeTag);

    const spacer = document.createElement('hr');
    spacer.style.border = '0';
    spacer.style.borderTop = '1px solid #ddd';
    spacer.style.margin = '6px 0 12px 0';

    questionContainer.appendChild(spacer);
  }


  if (current['Comprehension']) {
    const comp = document.createElement('div');
    comp.innerHTML = `<p><strong>Comprehension / Directions</strong> ${formatTextWithSuperSubscript(formatTextWithParagraphs(current['Comprehension']))}</p>`;
    questionContainer.appendChild(comp);
  }

  questionText.innerHTML = `<b style="font-size: large;">Question ${qNum}</b><br>${formatText(current['Question'])}`;
  questionContainer.appendChild(questionText);

  if (current['Question Image URL']) {
    const img = document.createElement('img');
    img.src = `http://192.168.1.2:5000${current['Question Image URL']}`;
    img.alt = 'Question Image';
    questionContainer.appendChild(img);
  }

  // Render options
  const type = current['Question Type'] || 'MCQ';
  optionsContainer.innerHTML = ''; // Clear previous
  commentContainer.innerHTML = '';

  if (type === 'NAT') {
    const label = document.createElement('label');
    // label.textContent = 'Enter your answer (NAT):';
    const input = document.createElement('input');
    input.type = 'text';  // Use text instead of number to allow selection
    input.id = 'natInput';
    input.placeholder = '';
    input.classList.add('nat-input');
    input.setAttribute('readonly', true); // Prevent typing
    input.onclick = function () {
      showNumericKeyboard(this); // Your existing numeric keyboard function
    };
    input.dispatchEvent(new Event('input'));

    optionsContainer.appendChild(label);
    optionsContainer.appendChild(input);

    // 🔒 In quiz static mode, keep numeric keyboard always visible
    if (vKeyboard.mode === 'static') {
      showNumericKeyboard(input);
    }

    // After creating the input element
    // 🔥 clear any old NAT observer
    clearNatObserver();

    let previousValue = '';

    natObserver = setInterval(() => {
      const currentValue = input.value.trim();
      if (currentValue && currentValue !== previousValue) {
        nextQuestionButton.style.display = 'block';
        hasAnswered = true;
        previousValue = currentValue;
      }
    }, 300);

  } else {
    for (let i = 1; i <= 4; i++) {
      const text = formatTextWithSuperSubscript(current[`Answer ${i} Text`]);
      const imgUrl = current[`Answer ${i} Image URL`];

      const btn = document.createElement('button');
      btn.classList.add('answer-option');
      btn.dataset.index = i - 1;

      if (text) btn.innerHTML = text;
      if (imgUrl) {
        const img = document.createElement('img');
        img.src = `http://192.168.1.2:5000${imgUrl}`;
        img.alt = text || `Option ${i}`;
        btn.appendChild(img);
      }

      btn.addEventListener('click', () => {

        if (type === 'MCQ') {
          document.querySelectorAll('.answer-option')
            .forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          hasAnswered = true;
        }

        else if (type === 'MSQ') {
          btn.classList.toggle('selected');
          hasAnswered =
            document.querySelectorAll('.answer-option.selected').length > 0;
        }

      });


      optionsContainer.appendChild(btn);
    }
  }
  document.querySelectorAll('.answer-option').forEach(btn => {
    btn.disabled = false;
  });

  // --- Comment box AFTER options ---
  const commentWrapper = document.createElement('div');
  commentWrapper.style.marginTop = '20px';

  // Label
  const commentLabel = document.createElement('label');
  commentLabel.textContent = 'Your Comment (Optional):';
  commentLabel.setAttribute('for', 'userComment');
  commentLabel.style.display = 'block';
  commentLabel.style.marginBottom = '5px';

  // Textarea
  const commentBox = document.createElement('textarea');
  commentBox.id = 'userComment';
  commentBox.className = 'keyboardInput';
  commentBox.rows = 2;
  commentBox.placeholder = 'Write your approach, doubt, or notes...';
  if (window.matchMedia("(max-width: 768px)").matches) {
    commentBox.style.cssText = `
      min-width: 70%;
      max-width: 70%;
      box-sizing: border-box;
    `;
  } else {
    commentBox.style.cssText = `
      min-width: 70%;
      max-width: 70%;
      box-sizing: border-box;
    `;
  }

  // Append elements
  commentWrapper.appendChild(commentLabel);
  commentWrapper.appendChild(commentBox);
  commentContainer.appendChild(commentWrapper);

  // 🔄 Attach virtual keyboard (if available)
  if (typeof VKI_attach === 'function') {
    VKI_attach(commentBox); // or whatever your plugin provides
  }

  if (selectedButton) selectedButton.classList.remove('selected');
  selectedButton = null;
  questionStartTime = Date.now(); // start timer BEFORE restore

  // ✅ Mark current question as visited if not already
  if (!userResponses[currentQuestionIndex]) {
    userResponses[currentQuestionIndex] = {
      responseTime: 0,
      _noAnswer: true
    };
  }

  // ---------------------- Restore previously recorded response (robust) ----------------------
  (function restorePrevious() {
    const saved = userResponses[currentQuestionIndex];
    if (!saved) return;

    const q = selectedQuestions[currentQuestionIndex] || {};
    const type = q['Question Type'] || 'MCQ';

    // If this was only a time placeholder, do not mark as answered — just leave time
    if (saved._noAnswer && saved.responseTime && !saved.response) {
      // show nothing selected, but keep nav state in sync (visited)
      updateNavButtonStyle(currentQuestionIndex);
      return;
    }

    // Otherwise, full saved response exists — restore UI
    hasAnswered = true;

    // MCQ / MSQ option buttons
    const btns = Array.from(document.querySelectorAll('.answer-option'));

    // Helper to normalize image URL variants
    const normalize = v => (typeof v === 'string' ? v.trim() : '');

    // --- MCQ ---
    if (type === 'MCQ') {
      btns.forEach(btn => {
        const idx = parseInt(btn.dataset.index, 10);
        const optTextRaw = cleanTextForStorage(q[`Answer ${idx + 1} Text`] || '');
        const optImgRel = normalize(q[`Answer ${idx + 1} Image URL`]); // likely relative path
        const fullImg = optImgRel ? `http://192.168.1.2:5000${optImgRel}` : '';

        // saved.response could be an image path or raw text
        const savedResp = normalize(saved.response || '');

        if (
          savedResp &&
          (savedResp === optTextRaw ||
            savedResp === optImgRel ||
            savedResp === fullImg)
        ) {
          btn.classList.add('selected');
          selectedButton = btn;
        }

        // disable options because it was already answered
        // btn.disabled = true;
      });

      nextQuestionButton.style.display = 'block';
      skipQuestionButton.style.display = 'block';
    }

    // --- MSQ (multiple selected indices stored as "0, 2" etc) ---
    if (type === 'MSQ') {
      const savedResp = normalize(saved.response || '');
      const chosen = (savedResp.match(/\d+/g) || []).map(n => parseInt(n, 10));

      if (chosen.length) {
        btns.forEach(btn => {
          const idx = parseInt(btn.dataset.index, 10);
          if (chosen.includes(idx)) btn.classList.add('selected');
          // keep disabled to prevent change
          // btn.disabled = true;
        });
        nextQuestionButton.style.display = 'block';
        skipQuestionButton.style.display = 'block';
      }
    }

    // --- NAT ---
    if (type === 'NAT') {
      const input = document.getElementById('natInput');
      if (input && saved.response && saved.response !== 'Skipped') {
        input.value = saved.response;
        // If you use a virtual numeric keyboard, ensure keyboard's internal value syncs with input if needed
        nextQuestionButton.style.display = 'block';
        skipQuestionButton.style.display = 'block';
      }
    }

    // --- Comment ---
    const commentBox = document.getElementById('userComment');
    if (commentBox && saved.comment) {
      commentBox.value = saved.comment;
    }

    // Keep nav button state in sync
    updateNavButtonStyle(currentQuestionIndex);
  })();

  updateNavButtonStyle(currentQuestionIndex);
  updatePrevButtonVisibility();
  nextQuestionButton.style.display = 'block';
  skipQuestionButton.style.display = 'block';
  typesetMath();
}

// Handle selected answer
/* function handleAnswer(index, button) {
  const current = selectedQuestions[currentQuestionIndex];
  const type = current['Question Type'] || 'MCQ';
  if (hasAnswered || type !== 'MCQ') return;

  const isCorrect = index === current['Correct Answer Index'];


  // STORE the raw source text / image path — not the rendered button text
  const optTextRaw = cleanTextForStorage(current[`Answer ${index + 1} Text`] || '');
  const optImgRel = current[`Answer ${index + 1} Image URL`] || '';
  const storageValue = optImgRel || optTextRaw || 'N/A';

  recordResponse(storageValue, isCorrect);

  selectedButton = button;
  selectedButton.classList.add('selected');
  hasAnswered = true;
  questionStartTime = Date.now();

  document.querySelectorAll('.answer-option').forEach(btn => btn.disabled = true);
  nextQuestionButton.style.display = 'block';
} */

// Record user response (merge with prev, don't clobber)
function recordResponse(response, correct, timeSpent = null) {
  const current = selectedQuestions[currentQuestionIndex];
  const questionType = current['Question Type'] || 'MCQ';
  let marks = Number(current['Marks']);
  if (!Number.isFinite(marks) || marks <= 0) marks = 1;

  const commentInput = document.getElementById('userComment');
  const userComment = commentInput ? commentInput.value.trim() : '';

  // Prev may be a minimal placeholder
  const prev = userResponses[currentQuestionIndex];

  // Undo previous scoring if already answered fully (only if prev.correct is explicitly boolean)
  if (prev && typeof prev.correct === 'boolean') {
    if (prev.correct === true) {
      score -= prev.marksAwarded || 0;
    } else if (prev.correct === false && prev.negativePenalty) {
      score += prev.negativePenalty;
      if (wrong > 0) wrong--;
    }
  }

  /* ---- Apply new scoring ---- */
  let marksAwarded = 0;
  let negativePenalty = 0;

  if (correct === true) {
    marksAwarded = marks;
    score += marks;
  }
  else if (
    questionType === 'MCQ' &&
    correct === false &&
    response !== 'Skipped'
  ) {
    negativePenalty = marks === 1 ? 1 / 3 : 2 / 3;
    score -= negativePenalty;
    wrong++;
  }
  // MSQ & NAT → NO negative marking

  const timeSpentCalc = (timeSpent ?? Math.round((Date.now() - questionStartTime) / 1000));

  // Merge existing fields to avoid losing anything (e.g., previously stored time-only placeholder)
  const merged = {
    ...(prev || {}),
    questionId: current.QuestionID,
    question: current['Question'] || '',
    questionImage: current['Question Image URL'] || '',
    comprehension: current['Comprehension'] || '',
    weightage: marks,
    response,
    correct,
    marksAwarded,
    negativePenalty,
    responseTime: (prev?.responseTime || 0) + timeSpentCalc,
    comment: userComment,
    questionType
  };

  // Remove _noAnswer flag if we now have a real response
  if (merged._noAnswer) delete merged._noAnswer;

  userResponses[currentQuestionIndex] = merged;

  hasAnswered = true;
  updateNavButtonStyle(currentQuestionIndex);
  updateQuestionStatusCounts();
  renderSubjectTabs();
}

// Start exam timer
function startExamTimer() {
  clearInterval(examTimer);
  examTimer = setInterval(() => {
    const min = Math.floor(examTimeRemaining / 60).toString().padStart(2, '0');
    const sec = (examTimeRemaining % 60).toString().padStart(2, '0');

    timerDisplay.textContent = `Time Left : ${min}:${sec}`;
    timerDisplay.style.color = examTimeRemaining <= 300 ? 'red' : 'black';
    timerDisplay.style.fontWeight = 'bold';

    examTimeRemaining--;

    if (examTimeRemaining <= 2) {
      clearInterval(examTimer);

      // AUTO submit → no popup
      submitQuizButton.dispatchEvent(new CustomEvent('click', { detail: 'AUTO' }));
      return;
    }

  }, 1000);
}


// End quiz
function endQuiz() {
  clearNatObserver();
  if (quizEnded) return;
  quizEnded = true;
  // 🔢 Switch numeric keyboard back to FLOATING mode
  if (window.vKeyboard) {
    vKeyboard.mode = 'floating';
  }
  clearInterval(examTimer);
  questionPaperBtn.style.display = 'none';
  quizSection.style.display = 'none';
  resultSection.style.display = 'block';
  const finalScore = Math.round(score * 100) / 100;
  scoreDisplay.innerHTML =
    `Final Score: <b>${finalScore.toFixed(2)}</b><br><br>
     Check the breakup in results page.<br>
     Thank you for your patience & Good Luck!`;
  typesetMath(resultSection);
  submitResponses();
}

// Submit responses to backend
function submitResponses() {
  const username = 'Admin';
  const section = sectionSearchInput.value.trim();
  const submitTime = new Date().toISOString();
  const finalScore = Math.round(score * 100) / 100;

  const responses = selectedQuestions.map((q, i) => {
    const u = userResponses[i] || {
      response: 'Skipped',
      correct: null,
      responseTime: 0,
      comment: ''
    };

    const type = q['Question Type'] || 'MCQ';
    let correctAnswer = '';
    let correctAnswerIndex = null;
    let options = [];

    // Build options only for MCQ/MSQ
    if (type === 'MCQ' || type === 'MSQ') {
      options = [];
      for (let j = 1; j <= 4; j++) {
        options.push({
          text: q[`Answer ${j} Text`] || '',
          image: q[`Answer ${j} Image URL`] || ''
        });
      }
    }

    // Determine correct answer
    if (type === 'MCQ') {
      const correctIdx = q['Correct Answer Index'];
      correctAnswerIndex = correctIdx;
      correctAnswer = q[`Answer ${correctIdx + 1} Text`] || q[`Answer ${correctIdx + 1} Image URL`] || '';
    } else if (type === 'MSQ') {
      correctAnswer = q['MSQ Answers'] || '';
    } else if (type === 'NAT') {
      correctAnswer = q['NAT Answer Range'] || '';
    }

    return {
      questionId: q.QuestionID,
      question: q['Question'] || '',
      questionImage: q['Question Image URL'] || '',
      comprehension: q['Comprehension'] || '',
      options: type === 'NAT' ? [] : options,
      correctAnswerIndex,
      type,
      correctAnswer,
      response: u.response || 'Skipped',
      comment: u.comment || '',
      correct: typeof u.correct === 'boolean' ? u.correct : null,
      weightage: q['Marks'] || '1',
      responseTime: u.responseTime,
      timestamp: examStartTime,
      submitTime,
      username,
      section,
      score: finalScore
    };
  });

  // Send responses
  fetch('http://192.168.1.2:5000/api/response', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, responses, score: finalScore, section, examStartTime, submitTime })
  })
    .then(res => res.json())
    .then(data => alert(data.message))
    .catch(err => console.error('Error submitting responses:', err));

  // Send score summary
  fetch('http://192.168.1.2:5000/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, score: finalScore, wrong })
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

function typesetMath(container = document.body) {
  if (window.MathJax) {
    MathJax.typesetPromise([container]).catch(err =>
      console.error('MathJax error:', err)
    );
  }
}