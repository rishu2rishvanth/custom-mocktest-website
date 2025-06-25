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
        </tr>
    `).join('');
}

// Show response details for a given attempt
function viewResponseDetails(data, username, timestamp) {
    const container = document.getElementById('resultsContainer');
    const responses = data.filter(r => r.username === username && r.timestamp === timestamp);
    const sectionName = responses[0]?.section || 'Unknown';

    let html = `<h3>Response Details for ${sanitize(username)}</h3>`;
    html += `<p>Section: <b>${sanitize(sectionName)}</b><br>Attempted at: ${sanitize(timestamp)}</p>`;

    responses.forEach((r, index) => {
        const questionContent = r.question?.startsWith('/images/')
            ? `<img src="${sanitize(r.question)}" alt="Question Image" style="max-width: 100%;">`
            : `<div>${sanitize(r.question)}</div>`;

        const comprehensionContent = sanitize(r.comprehension) || '-';
        const responseContent = sanitize(r.response) || 'Skipped';
        const correctness = r.correct ? '✅ Correct' : '❌ Incorrect';
        const time = r.responseTime !== undefined ? `${r.responseTime} seconds` : 'Skipped';

        html += `
            <div style="border: 1px solid #ccc; border-radius: 5px; margin: 15px 0; padding: 15px; background: #f9f9f9;">
                <h4>Question ${index + 1}</h4>
                <p><strong>Question:</strong><br>${questionContent}</p>
                <p><strong>Comprehension:</strong><br>${comprehensionContent}</p>
                <p><strong>Your Response:</strong> ${responseContent}</p>
                <p><strong>Status:</strong> ${correctness}</p>
                <p><strong>Time Taken:</strong> ${time}</p>
            </div>
        `;
    });

    html += `<br><button onclick="window.location.reload()">Home</button>`;
    container.innerHTML = html;
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

        const grouped = groupByAttempts(data);

        container.innerHTML = `
            <input type="text" id="resultsSearch" placeholder="Search username, section, date..." style="margin-bottom: 10px; padding: 8px; width: 100%; font-size: 16px;" />
            <table id="resultsTable" style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Username</th>
                        <th>Section</th>
                        <th>Score</th>
                        <th>Time Taken</th>
                        <th>View</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateTableRows(grouped)}
                </tbody>
            </table>
        `;

        // Filter handler
        document.getElementById('resultsSearch').addEventListener('input', function () {
            const filter = this.value.toLowerCase();
            const rows = document.querySelectorAll('#resultsTable tbody tr');

            rows.forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none';
            });
        });

        // Attach view button handlers
        document.querySelectorAll('.view-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const user = btn.getAttribute('data-username');
                const time = btn.getAttribute('data-timestamp');
                viewResponseDetails(data, user, time);
            });
        });

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
