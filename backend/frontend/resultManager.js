
// Escape text to prevent XSS
function sanitize(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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
            ? `<img src="${rawImage}" style="max-height: 200px;">`
            : '';

        // Compare EXACT VALUES (text or image path)
        const isCorrect =
            r.correctAnswer === rawText ||
            r.correctAnswer === rawImage;

        const isUser =
            r.response === rawText ||
            r.response === rawImage;

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
            ? `<img src="${rawImage}" style="max-height: 200px;">`
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

    responses.forEach(r => {
        if (r.response === 'Skipped') skipped++;
        else if (r.correct === true) correct++;
        else if (r.correct === false) wrong++;

        const time = typeof r.responseTime === 'number' ? r.responseTime : parseFloat(r.responseTime);
        if (!isNaN(time)) totalTime += time;
    });

    const penalizedScore = (0.33 * wrong).toFixed(2);
    const attempted = total - skipped;

    function formatDuration(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    let html = `<h3>Response Details for ${sanitize(username)}</h3>`;
    html += `<p>Section: <b>${sanitize(sectionName)}</b>  |   Attempted at: <b>${sanitize(timestamp)}</b>  |   Scored: <b>${sanitize(CurrentScore)}</b></p>`;
    html += `
    <div style="margin-top: 15px; font-size: 15px; line-height: 1.6;">
        <p><b>🧮Total Questions:</b> ${total} | <b>📌Attempted:</b> ${attempted} | <b>🟣Skipped:</b> <span style="color: purple;">${skipped}</span> <br> <b>🎯Correct:</b> <span style="color: green;">${correct}</span> | <b>❌Wrong:</b> <span style="color: red;">${wrong}</span> | <b>🔻Penalized (0.33 per Q):</b> <span style="color: darkorange;">${penalizedScore}</span></p>
    </div>`;
    html += `<button onclick="window.location.reload()">Home</button>`;

    responses.forEach((r, index) => {
        let questionHTML = '';
        if (r.type || r.weightage) {
            questionHTML += `<div style="font-size: 15px; line-height: 1.6; text-align: right">${sanitize(r.type)} | ${sanitize(r.weightage)} Mark(s)</div>`;
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
            ? `<img src="${r.response}" style="max-height:200px;">`
            : sanitize(r.response);

        correctAnswerHTML = /\.(png|jpe?g)$/i.test(r.correctAnswer)
            ? `<img src="${r.correctAnswer}" style="max-height:200px;">`
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
                userAnswerHTML = userIdx
                    .map(idx => {
                        const opt = r.options[idx - 1];
                        if (!opt) return '';
                        if (opt.image) return `<img src="${opt.image}" style="max-height:80px;">`;
                        return sanitize(opt.text || '');
                    })
                    .filter(Boolean)
                    .join('<br>');
            } else {
                userAnswerHTML = 'Skipped';
            }

            // correctAnswerHTML: replace "1,2,3" with actual options (image/text)
            const correctIdx = parseIndexList(r.correctAnswer);
            if (correctIdx.length > 0) {
                correctAnswerHTML = correctIdx
                    .map(idx => {
                        const opt = r.options[idx - 1];
                        if (!opt) return '';
                        if (opt.image) return `<img src="${opt.image}" style="max-height:80px;">`;
                        return sanitize(opt.text || '');
                    })
                    .filter(Boolean)
                    .join('<br>');
            } else {
                // fallback - keep original
                correctAnswerHTML = /\.(png|jpe?g)$/i.test(r.correctAnswer)
                    ? `<img src="${r.correctAnswer}" style="max-height:200px;">`
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
        <div id="q${index + 1}" class="question-block" style="border: 1px solid #ccc; padding: 15px; margin-top: 20px; border-radius: 8px;">
            ${r.comprehension ? `<p><b>Comprehension:</b> ${formatText(sanitize(r.comprehension))}</p>` : ''}
            <b>Q${index + 1}:</b> ${questionHTML}
            ${optionsHTML || ''}
            <p><b>Your Response:<br></b> ${userAnswerHTML} ${r.correct ? '✅' : '❌'}</p>
            ${r.comment ? `<p><b>Comment:</b> ${sanitize(r.comment)}</p>` : ''}
            <p><b>Correct Answer:<br></b> ${correctAnswerHTML || r.correctAnswer}</p>
            <p><b>Time Taken:</b> ${timeTaken} seconds</p>
        </div>`;
    });

    html += `
        <div style="margin-top: 40px;">
            <h4>Time Distribution</h4>
            <canvas id="timeHistogram" height="200"></canvas>
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

        navHTML += `<button class="nav-btn ${colorClass}" data-target="q${index + 1}">${index + 1}</button>`;
    });

    navHTML += `</div>`;
    html = html + navHTML; // Append navigator at end
    container.innerHTML = html;

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

    // Collect valid numeric response times
    const timeBins = responses
        .map(r => typeof r.responseTime === 'number' ? r.responseTime : parseFloat(r.responseTime))
        .filter(time => !isNaN(time));

    // Create histogram data
    const binSize = 10; // seconds
    const maxTime = Math.max(...timeBins, 60);
    const binCount = Math.ceil(maxTime / binSize) + 1; // ✅ +1 for upper bound

    const bins = Array.from({ length: binCount }, () => 0);
    const questionNumbersPerBin = Array.from({ length: binCount }, () => []);

    timeBins.forEach((time, i) => {
        const binIndex = Math.floor(time / binSize);
        if (binIndex >= bins.length || binIndex < 0) {
            console.warn(`Invalid bin index ${binIndex} for time:`, time);
            return;
        }

        bins[binIndex]++;
        questionNumbersPerBin[binIndex].push(i + 1);
    });

    const labels = bins.map((_, i) => `${i * binSize}-${(i + 1) * binSize}s`);

    // Destroy old chart if exists
    if (window.histogramChart) window.histogramChart.destroy();

    // Render histogram
    const ctx = document.getElementById('timeHistogram').getContext('2d');
    window.histogramChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Number of Questions',
                data: bins,
                backgroundColor: '#4e79a7'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Time Per Question Distribution'
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const idx = context.dataIndex;
                            const count = context.dataset.data[idx];
                            const questions = questionNumbersPerBin[idx];
                            return [
                                `Questions: ${questions.join(', ')}`,
                                `Count: ${count}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time Range (seconds)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Questions'
                    },
                    beginAtZero: true
                }
            }
        }
    });
    handleScrollButtonsVisibility();
}

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
            <input type="text" id="resultsSearch" placeholder="Search username, section, date..." style="margin-bottom: 10px; padding: 8px; width: 100%; font-size: 16px;" />
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

        document.getElementById('resultsSearch').addEventListener('input', function () {
            const filter = this.value.toLowerCase();
            const rows = document.querySelectorAll('#resultsTable tbody tr');
            rows.forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none';
            });
        });

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

function handleScrollButtonsVisibility() {
    const scrollButtons = document.getElementById('scrollButtons');
    if (!scrollButtons) return;

    window.addEventListener('scroll', () => {
        const isResultsVisible = document.getElementById('resultsContainer')?.style.display !== 'none';
        const scrolled = window.scrollY > 100;

        if (isResultsVisible && scrolled) {
            scrollButtons.style.display = 'flex';
        } else {
            scrollButtons.style.display = 'none';
        }
    });

    // Scroll actions
    document.getElementById('goTop').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('goBottom').addEventListener('click', () => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
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
