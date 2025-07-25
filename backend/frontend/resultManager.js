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
    const attempted = total-skipped;

    function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
    }

    let html = `<h3>Response Details for ${sanitize(username)}</h3>`;
        html += `<p>Section: <b>${sanitize(sectionName)}</b>  |   Attempted at: <b>${sanitize(timestamp)}</b>  |   Scored: <b>${sanitize(CurrentScore)}</b></p>`;
    html += `
    <div style="margin-top: 15px; font-size: 15px; line-height: 1.6;">
        <p><b>🧮Total Questions:</b> ${total} | <b>📌Attempted:</b> ${attempted} | <b>🟣Skipped:</b> <span style="color: purple;">${skipped}</span> | <b>⏱️Total Time Taken:</b> ${formatDuration(totalTime)} (mm:ss) <br> <b>🎯Correct:</b> <span style="color: green;">${correct}</span> | <b>❌Wrong:</b> <span style="color: red;">${wrong}</span> | <b>🔻Penalized (0.33 per Q):</b> <span style="color: darkorange;">${penalizedScore}</span></p>
    </div>`;
    html += `<button onclick="window.location.reload()">Home</button>`;

    responses.forEach((r, index) => {
        let questionHTML = '';
        if (r.question) {
        questionHTML += `<div>${formatText(sanitize(r.question))}</div>`;
        }
        if (r.questionImage) {
        questionHTML += `<div><img src="http://10.10.182.8:5000${r.questionImage}" alt="Question Image" style="max-width: 100%; margin-top: 8px;"></div>`;
        }
        if (!questionHTML) {
        questionHTML = 'N/A';
        }

        let userAnswerHTML = '';
        let correctAnswerHTML = '';

        if (r.response && /\.(png|jpe?g)$/i.test(r.response)) {
            userAnswerHTML = `<img src="http://10.10.182.8:5000${r.response}" alt="Your Answer" style="max-height: 200px;">`;
        } else {
            userAnswerHTML = sanitize(r.response);
        }

        if (r.correctAnswer && /\.(png|jpe?g)$/i.test(r.correctAnswer)) {
            correctAnswerHTML = `<img src="http://10.10.182.8:5000${r.correctAnswer}" alt="Correct Answer" style="max-height: 200px;">`;
        } else {
            correctAnswerHTML = sanitize(r.correctAnswer);
        }

        const timeTaken = r.responseTime || 'Skipped';

        const correctAnswerIndex = typeof r.correctAnswerIndex === 'string'
            ? parseInt(r.correctAnswerIndex)
            : r.correctAnswerIndex;

        let optionsHTML = '';
        if (Array.isArray(r.options)) {
            optionsHTML = '<ul style="list-style-type:none; padding-left: 0;">';
            r.options.forEach((opt, i) => {
                const rawText = opt.text || '';
                const rawImage = opt.image || '';

                const text = formatText(sanitize(rawText));
                const image = rawImage
                    ? `<br><img src="http://10.10.182.8:5000${rawImage}" alt="Option ${i + 1}" style="max-height: 200px;">`
                    : '';

                const isCorrect = (
                r.correctAnswer === rawText ||
                r.correctAnswer === `http://10.10.182.8:5000${rawImage}`
                );

                const isUserResponse = (
                r.response === rawText ||
                r.response === `http://10.10.182.8:5000${rawImage}`
                );

                let style = '';
                if (isCorrect) {
                    style += 'background-color: #d4edda; border: 2px solid green;';
                }
                else {
                    style += 'background-color: #f8d7da; border: 1px solid red;';
                }

                optionsHTML += `<li style="margin-bottom: 8px; padding-left: 6px; border-radius: 6px; ${style}">
                    ${text || ''}${image}
                </li>`;
            });
            optionsHTML += '</ul>';
        }

        html += `
        <div id="q${index + 1}" class="question-block" style="border: 1px solid #ccc; padding: 15px; margin-top: 20px; border-radius: 8px;">
            ${r.comprehension ? `<p><b>Comprehension:</b> ${formatText(sanitize(r.comprehension))}</p>` : ''}
            <p><b>Q${index + 1}:</b> ${questionHTML}</p>
            ${optionsHTML || ''}
            <p><b>Your Response:</b> ${userAnswerHTML} ${r.correct ? '✅' : '❌'}</p>
            ${r.comment ? `<p><b>Comment:</b> ${sanitize(r.comment)}</p>` : ''}
            <p><b>Correct Answer:</b> ${correctAnswerHTML || r.correctAnswer}</p>
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
    const binSize = 10; // seconds per bin
    const maxTime = Math.max(...timeBins, 60);
    const binCount = Math.ceil(maxTime / binSize);
    const bins = Array(binCount).fill(0);
    const questionNumbersPerBin = Array(binCount).fill(null).map(() => []);

    timeBins.forEach((time, i) => {
    const binIndex = Math.floor(time / binSize);
    bins[binIndex]++;
    questionNumbersPerBin[binIndex].push(i + 1); // Q1, Q2...
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
            label: function(context) {
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
