
// Escape text to prevent XSS
function sanitize(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function normalizeValue(val) {
    if (val === null || val === undefined) return '';

    // Convert numbers & numeric strings to normalized string
    if (!isNaN(val) && val !== '') {
        return String(Number(val)); // "3", 3, "3.0" → "3"
    }

    return String(val).trim();
}

// Format duration as mm:ss
function calculateTimeDifference(start, end) {
    if (!start || !end) return '-';
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diff = Math.floor((endTime - startTime) / 1000);
    if (isNaN(diff) || diff < 0) return '-';
    const minutes = Math.floor(diff / 60).toString().padStart(2, '0');
    const seconds = (diff % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

// Group by attempts (timestamp + username)
function groupByAttempts(data) {
    const grouped = {};
    data.forEach(entry => {
        const key = `${entry.username}_${entry.timestamp}`;
        if (!grouped[key]) {
            grouped[key] = {
                username: entry.username,
                timestamp: entry.timestamp,
                section: entry.section || 'Unknown',
                score: entry.score || '-',
                submitTime: entry.submitTime || ''
            };
        }
    });
    return Object.values(grouped);
}

// Generate table rows
function generateTableRows(groupedData) {
    return groupedData.map(row => `
        <tr>
            <td>${sanitize(row.timestamp)}</td>
            <td>${sanitize(row.username)}</td>
            <td>${sanitize(row.section)}</td>
            <td>${sanitize(row.score)}</td>
            <td>${calculateTimeDifference(row.timestamp, row.submitTime)}</td>
            <td>
                <button class="view-button" data-username="${row.username}" data-timestamp="${row.timestamp}">
                    View
                </button>
            </td>
            <td>
                <button class="delete-button" data-username="${row.username}" data-timestamp="${row.timestamp}">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Delete response details for a given attempt
function deleteResponseDetails(data, username, timestamp) {
    if (!confirm(`Are you sure you want to delete ${username}'s attempt at ${timestamp}?`)) return;

    fetch('/api/delete-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, timestamp })
    })
        .then(res => res.json())
        .then(res => {
            alert(res.message || 'Deleted successfully.');
            fetchAndRenderResults(); // Refresh the table
        })
        .catch(err => {
            console.error('Error deleting response:', err);
            alert('Failed to delete response.');
        });
}

/* -------------------------
   NEW / REFACTORED HELPERS
   -------------------------
   We add minimal, well-contained functions for MSQ handling and parsing.
   MCQ renderer preserves your original comparison logic exactly.
*/


// Parse "0,1,2" OR numeric arrays and convert to 1-based indices
function parseIndexList(str) {
    if (!str) return [];
    if (Array.isArray(str)) {
        return str
            .map(x => parseInt(x, 10) + 1)    // convert 0→1, 1→2,...
            .filter(x => !isNaN(x));
    }

    return String(str)
        .split(',')
        .map(x => parseInt(x.trim(), 10) + 1) // convert to 1-based
        .filter(x => !isNaN(x));
}


// MCQ renderer: preserves original logic (text/image exact match)
function renderOptionsMCQ(r) {
    let html = '<ul style="list-style-type:none; padding-left: 0;">';

    r.options.forEach((opt, i) => {
        const rawText = opt.text || '';
        const rawImage = opt.image || '';

        const displayText = formatInlineText(sanitize(rawText));
        const displayImg = rawImage
            ? `<img src="${rawImage}" class="option-img">`
            : '';

        // Compare EXACT VALUES (text or image path)
        const correctNorm = normalizeValue(r.correctAnswer);
        const responseNorm = normalizeValue(r.response);
        const textNorm = normalizeValue(rawText);
        const imgNorm = normalizeValue(rawImage);

        const isCorrect =
            correctNorm === textNorm ||
            correctNorm === imgNorm;

        const isUser =
            responseNorm === textNorm ||
            responseNorm === imgNorm;

        let style = "";

        // Highlighting logic — preserved exactly
        if (isCorrect) {
            style = "background:#d4edda; border:2px solid green;";
        } else if (isUser) {
            style = "background:#f8d7da; border:2px solid red;";
        } else {
            style = "background:#e9ecef; border:1px solid #bfc5ca;";
        }

        html += `
        <li style="margin:6px 0; padding:6px; border-radius:6px; ${style}">
            ${displayText}${displayImg}
        </li>
        `;
    });

    html += '</ul>';
    return html;
}

// MSQ renderer: uses index-based matching (1-based indices)
function renderOptionsMSQ(r) {
    const userIdx = parseIndexList(r.response);       // e.g., "1, 2" -> [1,2]
    const correctIdx = parseIndexList(r.correctAnswer); // e.g., "1,2,3" -> [1,2,3]

    let html = '<ul style="list-style-type:none; padding-left: 0;">';

    r.options.forEach((opt, i) => {
        const index = i + 1;
        const rawText = opt.text || '';
        const rawImage = opt.image || '';

        const displayText = formatInlineText(sanitize(rawText));
        const displayImg = rawImage
            ? `<img src="${rawImage}" class="option-img">`
            : '';

        const isUser = userIdx.includes(index);
        const isCorrect = correctIdx.includes(index);

        let style = "";

        if (isCorrect && isUser) {
            style = "background:#d4edda; border:2px solid green;"; // correct & selected
        } else if (isCorrect && !isUser) {
            style = "background:#e0f0ff; border:2px solid blue;";  // correct but missed
        } else if (!isCorrect && isUser) {
            style = "background:#f8d7da; border:2px solid red;";   // wrong selection
        } else {
            style = "background:#e9ecef; border:1px solid #bfc5ca;"; // neutral
        }

        html += `
        <li style="margin:6px 0; padding:6px; border-radius:6px; ${style}">
            ${displayText}${displayImg}
        </li>
        `;
    });

    html += '</ul>';
    return html;
}

function renderSummaryTable(summary) {

    function rowColor(label) {
        if (label === 'Total Available') return '#0d6efd'; // blue
        if (label === 'Total Scored') return 'green';
        if (label === 'Total Lost') return 'red';
        if (label === 'Total Left') return 'purple';
        if (label === 'Negative') return 'darkorange';
        return '#212529'; // default
    }

    return `
    <div class="summary-table-wrapper" style="margin:20px 0; overflow-x:auto;">
        <table class="summary-table" style="border-collapse:collapse; width:100%; text-align:center; font-size: smaller;">
            <thead>
                <tr style="background:#f1f1f1; font-weight:bold;">
                    <th>Summary</th>
                    <th>Questions</th>
                    <th>Marks</th>
                    <th>1 / 2 Mark(s)</th>
                    <th>MCQ / MSQ / NAT</th>
                </tr>
            </thead>
            <tbody>
                ${summary.map(row => {
        const color = rowColor(row.label);
        return `
                    <tr>
                        <td><b>${sanitize(row.label)}</b></td>
                        <td style="color:${color}; font-weight:bold;">${sanitize(row.questions)}</td>
                        <td style="color:${color}; font-weight:bold;">${sanitize(row.marks)}</td>
                        <td style="color:${color};">${sanitize(row.half)}</td>
                        <td style="color:${color};">${sanitize(row.types)}</td>
                    </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    </div>
    `;
}


function buildSummaryData(responses) {
    const summary = {
        available: { q: responses.length, m: 0, h1: 0, h2: 0, mcq: 0, msq: 0, nat: 0 },

        attempted: { q: 0, m: 0, h1: 0, h2: 0, mcq: 0, msq: 0, nat: 0 },
        left: { q: 0, m: 0, h1: 0, h2: 0, mcq: 0, msq: 0, nat: 0 },
        lost: { q: 0, m: 0, h1: 0, h2: 0, mcq: 0, msq: 0, nat: 0 },
        scored: { q: 0, m: 0, h1: 0, h2: 0, mcq: 0, msq: 0, nat: 0 },
        negative: { q: 0, m: 0, h1: 0, h2: 0, mcq: 0, msq: 0, nat: 0 }
    };

    responses.forEach(r => {
        const w = Number(r.weightage) || 1;
        const type = (r.type || 'MCQ').toLowerCase();

        // AVAILABLE (always increments)
        summary.available.m += w;
        if (w === 1) summary.available.h1++;
        if (w === 2) summary.available.h2++;
        summary.available[type]++;

        const bucket =
            r.response === 'Skipped' ? summary.left :
                r.correct === true ? summary.scored :
                    r.correct === false ? summary.lost :
                        null;

        if (!bucket) return;

        bucket.q++;
        bucket.m += w;

        if (w === 1) bucket.h1++;
        if (w === 2) bucket.h2++;

        if (type === 'mcq') bucket.mcq++;
        if (type === 'msq') bucket.msq++;
        if (type === 'nat') bucket.nat++;

        // Attempted = scored + lost
        if (bucket === summary.scored || bucket === summary.lost) {
            summary.attempted.q++;
            summary.attempted.m += w;
            if (w === 1) summary.attempted.h1++;
            if (w === 2) summary.attempted.h2++;
            summary.attempted[type]++;
        }

        // Negative marking (MCQ only, same rule as quiz)
        if (r.correct === false && r.type === 'MCQ') {
            const neg = w === 1 ? 1 / 3 : w === 2 ? 2 / 3 : 0;
            summary.negative.q += 1;
            summary.negative.m += neg;
            if (w === 1) summary.negative.h1++;
            if (w === 2) summary.negative.h2++;
            summary.negative.mcq++;
        }
    });

    return [
        {
            label: 'Total Available',
            questions: summary.available.q,
            marks: summary.available.m,
            half: `${summary.available.h1} / ${summary.available.h2}`,
            types: `${summary.available.mcq} / ${summary.available.msq} / ${summary.available.nat}`
        },
        {
            label: 'Total Attempted',
            questions: summary.attempted.q,
            marks: summary.attempted.m,
            half: `${summary.attempted.h1} / ${summary.attempted.h2}`,
            types: `${summary.attempted.mcq} / ${summary.attempted.msq} / ${summary.attempted.nat}`
        },
        {
            label: 'Total Left',
            questions: summary.left.q,
            marks: summary.left.m,
            half: `${summary.left.h1} / ${summary.left.h2}`,
            types: `${summary.left.mcq} / ${summary.left.msq} / ${summary.left.nat}`
        },
        {
            label: 'Total Lost',
            questions: summary.lost.q,
            marks: summary.lost.m,
            half: `${summary.lost.h1} / ${summary.lost.h2}`,
            types: `${summary.lost.mcq} / ${summary.lost.msq} / ${summary.lost.nat}`
        },
        {
            label: 'Total Scored',
            questions: summary.scored.q,
            marks: summary.scored.m,
            half: `${summary.scored.h1} / ${summary.scored.h2}`,
            types: `${summary.scored.mcq} / ${summary.scored.msq} / ${summary.scored.nat}`
        },
        {
            label: 'Negative',
            questions: `-${summary.negative.q}`,
            marks: `-${summary.negative.m.toFixed(2)}`,
            half: `-${summary.negative.h1} / -${summary.negative.h2}`,
            types: `${summary.negative.mcq} / 0 / 0`
        }
    ];
}

/* -------------------------
   END NEW HELPERS
   ------------------------- */

// Show response details for a given attempt
function viewResponseDetails(data, username, timestamp) {
    const container = document.getElementById('resultsContainer');
    const responses = data.filter(r => r.username === username && r.timestamp === timestamp);

    const CurrentScore = responses[0]?.score || 'Unknown';
    const sectionName = responses[0]?.section || 'Unknown';
    let total = responses.length;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let totalTime = 0;
    let mcqWrong = 0;
    let penalty = 0;
    let maxMarks = 0;

    responses.forEach(r => {
        const w = Number(r.weightage) || 1;
        maxMarks += w;
        if (r.response === 'Skipped') {
            skipped++;
        }
        else if (r.correct === true) {
            correct++;
        }
        else if (r.correct === false && r.response !== 'Skipped') {
            wrong++;

            if (r.type === 'MCQ') {
                const marks = Number(r.weightage) || 1;
                penalty += (marks === 1 ? 1 / 3 : 2 / 3);
            }
        }

        const time = typeof r.responseTime === 'number'
            ? r.responseTime
            : parseFloat(r.responseTime);

        if (!isNaN(time)) totalTime += time;
    });

    const penalizedScore = penalty.toFixed(2);
    const attempted = total - skipped;

    function formatDuration(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    let html = `<h3>Response Details for ${sanitize(username)}</h3>`;
    html += `<p>Section: <b>${sanitize(sectionName)}</b>  |   Attempted at: <b>${sanitize(timestamp)}</b>  |  Final Score: 
    <b>
    <span style="font-size: 22px; color: darkgreen;">
        ${sanitize(CurrentScore)}
    </span>
    </b></p>`;
    html += `
    <!-- <div style="margin-top: 15px; font-size: 15px; line-height: 1.6; justify-items: center;">
        <p>
            <b>🧮Total Questions:</b> ${total} |
            <b>📌Attempted:</b> ${attempted} |
            <b>🟣Skipped:</b> <span style="color: purple;">${skipped}</span> <br>

            <b>🎯Correct:</b> <span style="color: green;">${correct}</span> |
            <b>❌Wrong:</b> <span style="color: red;">${wrong}</span> |
            <b>🔻Penalized:</b> <span style="color: darkorange;">${penalizedScore}</span> <br>

            <b>🏁Maximum Marks:</b> <span style="color: #0d6efd; font-weight:bold;">${maxMarks}</span>
        </p>
    </div> --> `;
    const summaryData = buildSummaryData(responses);

    html += `<h4 style="margin-top:20px;">📊 Analysis</h4>`;
    html += renderSummaryTable(summaryData);

    html += `<button onclick="window.location.reload()">Home</button>`;

    responses.forEach((r, index) => {
        let questionHTML = '';
        if (r.type || r.weightage) {
            const questionType = r.type || 'MCQ';
            const weightage = Number(r.weightage) || 1;

            // ---- Negative marking logic (same as quiz page) ----
            let negMarking = '0';
            if (questionType === 'MCQ') {
                if (weightage === 1) negMarking = '1/3';
                else if (weightage === 2) negMarking = '2/3';
            }

            questionHTML += `
                <div class="question-type-row"
                    style="display:flex; justify-content:space-between; align-items:center;
                            font-size:15px; margin-bottom:6px;">
                    
                    <!-- LEFT -->
                    <div style="font-weight:bold;">
                        Question Type: ${sanitize(questionType)}
                    </div>

                    <!-- RIGHT -->
                    <div>
                        <span>Marks for correct Answer: </span>
                        <span style="color:green; font-weight:bold;">
                            ${sanitize(weightage)}
                        </span>
                        <span> | </span>
                        <span>Negative Marks: </span>
                        <span style="color:red; font-weight:bold;">
                            ${negMarking}
                        </span>
                    </div>
                </div>
            `;
        }
        if (r.question) {
            questionHTML += `<div>${formatText(sanitize(r.question))}</div>`;
        }
        if (r.questionImage) {
            questionHTML += `<div><img src="http://192.168.1.2:5000${r.questionImage}" alt="Question Image" style="max-width: 100%; margin-top: 8px;"></div>`;
        }
        if (!questionHTML) {
            questionHTML = 'N/A';
        }

        // Default rendering for user & correct answer (keeps original behavior)
        let userAnswerHTML = '';
        let correctAnswerHTML = '';

        // If the response/correctAnswer are images (png/jpg) show them
        userAnswerHTML = /\.(png|jpe?g)$/i.test(r.response)
            ? `<img src="${r.response}" class="option-img" style="max-height:150px;">`
            : sanitize(r.response);

        correctAnswerHTML = /\.(png|jpe?g)$/i.test(r.correctAnswer)
            ? `<img src="${r.correctAnswer}" class="option-img" style="max-height:150px;">`
            : sanitize(r.correctAnswer);

        const timeTaken = r.responseTime || 'Skipped';

        const correctAnswerIndex = typeof r.correctAnswerIndex === 'string'
            ? parseInt(r.correctAnswerIndex)
            : r.correctAnswerIndex;

        // --- NEW: if MSQ, render userAnswerHTML & correctAnswerHTML as option blocks ---
        const isMSQ = r.type === "MSQ" || (typeof r.correctAnswer === 'string' && r.correctAnswer.includes(','));
        if (isMSQ && Array.isArray(r.options)) {
            // userAnswerHTML: replace "1,2" with actual options (image/text)
            const userIdx = parseIndexList(r.response);
            if (userIdx.length > 0) {
                // Case 1: proper index list found → render options
                userAnswerHTML = userIdx
                    .map(idx => {
                        const opt = r.options[idx - 1];
                        if (!opt) return '';
                        if (opt.image) return `<img src="${opt.image}" class="option-img" style="max-height:80px;">`;
                        return `➡️ ${sanitize(opt.text || '')}`;
                    })
                    .filter(Boolean)
                    .join('<br>');
            } else if (r.response && r.response !== 'Skipped') {
                // Case 2: NOT index-based → print full text response
                userAnswerHTML = sanitize(r.response);
            } else {
                // Case 3: truly skipped
                userAnswerHTML = 'Skipped';
            }

            // correctAnswerHTML: replace "1,2,3" with actual options (image/text)
            const correctIdx = parseIndexList(r.correctAnswer);
            if (correctIdx.length > 0) {
                correctAnswerHTML = correctIdx
                    .map(idx => {
                        const opt = r.options[idx - 1];
                        if (!opt) return '';
                        if (opt.image) return `<img src="${opt.image}" class="option-img" style="max-height:80px;">`;
                        return `➡️ ${sanitize(opt.text || '')}`;
                    })
                    .filter(Boolean)
                    .join('<br>');
            } else {
                // fallback - keep original
                correctAnswerHTML = /\.(png|jpe?g)$/i.test(r.correctAnswer)
                    ? `<img src="${r.correctAnswer}" class="option-img" style="max-height:150px;">`
                    : sanitize(r.correctAnswer);
            }
        }

        // Build options HTML by routing to the correct renderer
        let optionsHTML = '';
        if (Array.isArray(r.options)) {
            optionsHTML = r.type === "MSQ"
                ? renderOptionsMSQ(r)
                : renderOptionsMCQ(r);
        }

        html += `
        <div id="q${index + 1}" class="question-block" style="border: 1px solid #ccc; padding: 15px; margin-top: 20px; border-radius: 8px; font-size: medium;">
            ${r.comprehension ? `<p><b>Comprehension:</b> ${formatText(sanitize(r.comprehension))}</p>` : ''}
            <b>Q${index + 1}:</b> ${questionHTML}
            ${optionsHTML || ''}
		<p><b>Your Response:<br></b>
  		${userAnswerHTML === 'Skipped'
                ? `${userAnswerHTML} 🟣`
                : `${userAnswerHTML} ${r.correct ? '✅' : '❌'}`
            }
		</p>
            ${r.comment ? `<p><b>Comment:</b> ${sanitize(r.comment)}</p>` : ''}
            <p><b>Correct Answer:<br></b> ${correctAnswerHTML || r.correctAnswer}</p>
            <p><b>Time Taken:</b> ${timeTaken} seconds</p>
            <button class="edit-question-btn"
                data-section="${sanitize(sectionName)}"
                data-question-id="${sanitize(r.questionId)}">
                    ✏️ Edit
            </button>
        </div>`;
    });

    html += `
    <div style="margin-top: 40px; justify-items: center;">
        <h4>⏱ Time vs Question Distribution</h4>
        <div id="timeChartWrapper" style="width:100%; overflow-x:auto;">
            <canvas id="timeVsQuestion" height="320"></canvas>
        </div>
    </div>
    <br><button onclick="window.location.reload()">Home</button>`;

    let navHTML = `
        <!-- Toggle Button -->
        <button id="toggleNavigatorBtn" class="toggle-navigator-btn">☰ Questions</button>

        <!-- Navigator -->
        <div id="questionNavigator" class="question-navigator" style="margin-top: 20px;">
        <h4>Questions</h4>
        `;

    responses.forEach((r, index) => {
        let colorClass = 'nav-skipped';
        if (r.correct === true) colorClass = 'nav-correct';
        else if (r.correct === false && r.response !== 'Skipped') colorClass = 'nav-wrong';

        const questionType = r.type || 'MCQ';
        navHTML += `<button class="nav-btn ${colorClass}" data-target="q${index + 1}">${index + 1}<sup>${sanitize(questionType)}</sup></button>`;
    });

    navHTML += `</div>`;
    html = html + navHTML; // Append navigator at end
    container.innerHTML = html;

    // -------------------------
    // TIME vs QUESTION (SMART BAR CHART)
    // -------------------------

    const times = responses.map(r => {
        const t = typeof r.responseTime === 'number'
            ? r.responseTime
            : parseFloat(r.responseTime);
        return isNaN(t) ? 0 : t;
    });

    const labels = responses.map((_, i) => `Q ${i + 1}`);

    const statusList = responses.map(r => {
        if (r.response === 'Skipped') return 'Unattempted';
        if (r.correct === true) return 'Correct';
        if (r.correct === false) return 'Incorrect';
        return 'Unknown';
    });

    const barColors = responses.map(r => {
        if (r.response === 'Skipped') return 'purple';      // Total Left
        if (r.correct === true) return 'green';              // Total Scored
        if (r.correct === false) return 'red';               // Total Lost / Negative
        return '#6c757d';                                    // Fallback
    });

    const questionCount = responses.length;
    const COMPRESS_LIMIT = 150;
    const isCompressed = questionCount > COMPRESS_LIMIT;

    const canvas = document.getElementById('timeVsQuestion');
    if (isCompressed) {
        canvas.style.minWidth = `${questionCount * 12}px`;
    }

    if (window.timeChart) window.timeChart.destroy();

    const ctx = canvas.getContext('2d');

    window.timeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: times,
                backgroundColor: barColors, // #0d3b66
                borderWidth: 0,
                categoryPercentage: isCompressed ? 0.85 : 0.8,
                barPercentage: isCompressed ? 0.9 : 0.8,
                maxBarThickness: isCompressed ? 6 : 28
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: isCompressed ? 15 : 30
                    },
                    title: {
                        display: true,
                        text: 'Question Number'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Time (seconds)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        generateLabels: () => ([
                            {
                                text: 'Correct (Scored)',
                                fillStyle: 'green',
                                strokeStyle: 'green'
                            },
                            {
                                text: 'Incorrect (Lost)',
                                fillStyle: 'red',
                                strokeStyle: 'red'
                            },
                            {
                                text: 'Unattempted (Left)',
                                fillStyle: 'purple',
                                strokeStyle: 'purple'
                            }
                        ])
                    }
                },
                tooltip: {
                    callbacks: {
                        title: (context) => {
                            const i = context[0].dataIndex;
                            return `Q ${i + 1} - ${statusList[i]}`;
                        },
                        label: (context) => {
                            return `Time in Seconds: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });

    if (!window.matchMedia('(max-width: 0px)').matches) {
        container.insertAdjacentHTML(
            'afterbegin',
            '<div class="calculator-container"><span class="calc-toggle-btn icon-0"></span></div>'
        );
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from previously active button
            const prev = document.querySelector('.nav-btn.active');
            if (prev) prev.classList.remove('active');

            // Add active class to clicked button
            btn.classList.add('active');

            // Scroll to target question
            const targetId = btn.getAttribute('data-target');
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    document.getElementById('toggleNavigatorBtn').addEventListener('click', () => {
        const nav = document.getElementById('questionNavigator');
        nav.classList.toggle('collapsed');
    });

    handleScrollButtonsVisibility();
}

let calculatorWindow = null;

function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

function openCalculator() {
    if (!calculatorWindow || calculatorWindow.closed) {
        calculatorWindow = window.open(
            'calculator.html',
            '_blank',
            'width=470,height=320'
        );
    } else {
        calculatorWindow.focus();
    }
}

// ✅ Delegated click handler (works for dynamically added buttons)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.calc-toggle-btn');
    if (!btn) return;

    if (isMobileDevice()) {
        openCalculator();
    } else {
        toggleCalculator(); // existing desktop inline calculator
    }
});

// Fetch and display all results
export async function fetchAndRenderResults() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '<p>Loading...</p>';

    try {
        const response = await fetch('/api/all-responses');
        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = '<p>No results found.</p>';
            return;
        }

        const grouped = groupByAttempts(data).sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        container.innerHTML = `
            <button onclick="window.location.reload()">Home</button><br>

            <div id="searchContainer" style="position: relative; max-width: 360px; margin-bottom: 10px; margin-top: 10px">
                <input type="text" id="resultsSearch"
                    placeholder="Search user, section, date..."
                    style="padding: 8px; font-size:16px; margin-right: 5px" />

                <button id="searchBtn"
                        style="padding: 8px 15px; margin-top: 0px; margin-bottom:15px; background-color: darkgreen; font-size:16px; cursor:pointer; width:auto;">
                    Search
                </button>
            </div>

            <div class="responsive-table-wrapper">
                <table id="resultsTable" style="border-collapse: collapse; width: 100%;">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Username</th>
                            <th>Section</th>
                            <th>Score</th>
                            <th>Time Taken</th>
                            <th>View</th>
                            <th>Delete</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateTableRows(grouped)}
                    </tbody>
                </table>
            </div>
            <br><button onclick="window.location.reload()">Home</button>
        `;

        // --- Search UI Logic ---
        const searchBox = document.getElementById('resultsSearch');
        const searchBtn = document.getElementById('searchBtn');

        // Attach VKI
        if (searchBox && typeof VKI_attach === 'function') {
            VKI_attach(searchBox);
        }

        // Live filter while typing (optional)
        searchBox.addEventListener('input', triggerSearch);

        // Click Search Button
        searchBtn.addEventListener('click', triggerSearch);

        document.querySelectorAll('.view-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const user = btn.getAttribute('data-username');
                const time = btn.getAttribute('data-timestamp');
                viewResponseDetails(data, user, time);
            });
        });

        document.querySelectorAll('.delete-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const user = btn.getAttribute('data-username');
                const time = btn.getAttribute('data-timestamp');
                deleteResponseDetails(data, user, time);
            });
        });

        handleScrollButtonsVisibility();

    } catch (err) {
        console.error('Failed to load results:', err);
        container.innerHTML = '<p>Error loading results.</p>';
    }
}

function triggerSearch() {
    const filter = document.getElementById("resultsSearch").value.toLowerCase();
    const rows = document.querySelectorAll("#resultsTable tbody tr");

    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(filter) ? "" : "none";
    });
}

// Hook the results page button
export function initResultsButton() {
    const resultsPageButton = document.getElementById('resultsPageButton');
    if (resultsPageButton) {
        resultsPageButton.addEventListener('click', () => {
            document.querySelector('.setup').style.display = 'none';
            document.querySelector('.quiz').style.display = 'none';
            document.querySelector('.result').style.display = 'none';
            document.getElementById('resultsContainer').style.display = 'block';
            fetchAndRenderResults();
        });
    }
}

export function handleScrollButtonsVisibility() {
    const scrollButtons = document.getElementById('scrollButtons');
    const quizSection = document.querySelector('.quiz');
    const resultSection = document.querySelector('.result');
    const resultsContainer = document.getElementById('resultsContainer');

    if (!scrollButtons) return;

    function isVisible(el) {
        return el && getComputedStyle(el).display !== 'none';
    }

    function updateScrollButtons() {
        const quizVisible = isVisible(quizSection);
        const resultVisible = isVisible(resultSection);
        const resultsPageVisible = isVisible(resultsContainer);

        // 🔥 ALWAYS visible during quiz
        if (quizVisible) {
            scrollButtons.classList.add('quiz-mode');
            scrollButtons.style.display = 'flex';
            return;
        }

        // 🔹 Normal scroll behavior for results pages
        const scrolled = window.scrollY > 100;

        if ((resultVisible || resultsPageVisible) && scrolled) {
            scrollButtons.classList.remove('quiz-mode');
            scrollButtons.style.display = 'flex';
        } else {
            scrollButtons.classList.remove('quiz-mode');
            scrollButtons.style.display = 'none';
        }
    }

    window.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);

    document.getElementById('goTop')?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('goBottom')?.addEventListener('click', () => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });

    updateScrollButtons();
}

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

function formatText(raw) {
    return formatTextWithSuperSubscript(formatTextWithParagraphs(raw));
}

function formatInlineText(raw) {
    if (typeof raw !== 'string') return raw;

    // Only superscript/subscript — NO paragraph wrapping
    return raw
        .replace(/\^\((.*?)\)/g, '<sup>$1</sup>')
        .replace(/\_\((.*?)\)/g, '<sub>$1</sub>');
}

window.fetchAndRenderResults = fetchAndRenderResults;
