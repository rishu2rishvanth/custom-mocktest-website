const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { execSync } = require('child_process');

const app = express();
app.use(express.json({ limit: '5mb' })); // or higher if needed
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cors());

// Update script.js with local IP using Python script
try {
    execSync('python update_ip.py', { stdio: 'inherit' });
} catch (error) {
    console.error('Failed to update IP address:', error);
}

app.use((req, res, next) => {
    if (req.url.match(/\.(png|jpg|jpeg|gif|svg)$/i)) {
        res.setHeader('Cache-Control', 'no-store');
    }
    next();
});

// Load questions from Excel file
const excelFilePath = path.join(__dirname, 'quiz-database/Exam/questions.xlsx');
let jsonData = {};

try {
    const workbook = XLSX.readFile(excelFilePath);
    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];

jsonData[sheetName] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    });
} catch (error) {
    console.error('Error reading Excel file:', error);
}

function readWorkbookSafe(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    return XLSX.readFile(filePath);
}

// function backupFile(filePath) {
//     const backup = filePath.replace('.xlsx', `_backup_${Date.now()}.xlsx`);
//     fs.copyFileSync(filePath, backup);
// }

// Static file serving
app.use('/images', express.static(
    path.join(__dirname, 'quiz-database/Exam/images'),
    {
        etag: false,
        lastModified: false,
        setHeaders: (res) => {
            res.setHeader('Cache-Control', 'no-store');
        }
    }
));

app.use(express.static(path.join(__dirname, 'frontend')));

// Serve main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Sections API
app.get('/api/questions/sections', (req, res) => {
    const sections = Object.keys(jsonData).map(name => ({
        name,
        questions: jsonData[name]
    }));
    res.json(sections);
});

// Section-specific questions API
app.get('/api/questions', (req, res) => {
    const { section } = req.query;
    if (!section || !jsonData[section]) {
        return res.status(400).json({ message: 'Invalid section' });
    }
    res.json(jsonData[section]);
});

// Handle user responses
app.post('/api/response', (req, res) => {
    const { username, responses, score, section, examStartTime } = req.body;
    if (!username || !Array.isArray(responses)) {
        return res.status(400).json({ message: 'Invalid data format.' });
    }

    const filePath = path.join(__dirname, 'quiz-database/responses.xlsx');
    const workbook = fs.existsSync(filePath)
        ? XLSX.readFile(filePath)
        : XLSX.utils.book_new();

    const existingSheet = workbook.Sheets['Responses'] || {};
    const existingData = XLSX.utils.sheet_to_json(existingSheet);

    const newResponses = responses.map(r => ({
        questionId: r.QuestionID || r.questionId || '',
        timestamp: moment(examStartTime).format('YYYY-MM-DD HH:mm:ss'),
        username,
        section: section || 'unknown',
        question: r.question,
        questionImage: r.questionImage || '',
        comprehension: r.comprehension || '',
        type: r.type || 'MCQ', // ✅ <-- ADD THIS LINE
        response: r.response,
        comment: r.comment || '',
        correct: r.correct,
        weightage: r.weightage,
        score: Number(score).toFixed(2),
        responseTime: r.responseTime ?? '',
        correctAnswer: r.correctAnswer || '',
        options: JSON.stringify(r.options || []), // Store options as JSON string
        submitTime: moment().format('YYYY-MM-DD HH:mm:ss')
        }));

    const updatedData = existingData.concat(newResponses);
    const updatedSheet = XLSX.utils.json_to_sheet(updatedData);
    workbook.Sheets['Responses'] = updatedSheet;
    XLSX.writeFile(workbook, filePath);

    res.json({ message: 'Responses recorded successfully.' });
});

// Score-only logging
app.post('/api/score', (req, res) => {
    const { username, score, wrong } = req.body;
    if (typeof username !== 'string' || typeof score !== 'number' || typeof wrong !== 'number') {
        return res.status(400).json({ message: 'Invalid input' });
    }

    const scoreData = `Username: ${username}, Score: ${score}, Lost: ${wrong}\n`;
    const filePath = path.join(__dirname, 'scores.txt');

    fs.appendFile(filePath, scoreData, err => {
        if (err) {
            console.error('Error saving score:', err);
            return res.status(500).json({ message: 'Error saving score' });
        }
        res.json({ message: 'Score recorded successfully.' });
    });
});

// All raw responses API
app.get('/api/all-responses', (req, res) => {
    const filePath = path.join(__dirname, 'quiz-database/responses.xlsx');
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'No responses found.' });
    }

    try {
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets['Responses'];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        const parsedData = rawData.map(entry => ({
            ...entry,
            options: entry.options ? JSON.parse(entry.options) : []
        }));

        res.json(parsedData);
    } catch (error) {
        console.error('Error reading responses file:', error);
        res.status(500).json({ message: 'Failed to read responses.' });
    }
});

// Quiz attempts summary
app.get('/api/attempts', (req, res) => {
    const filePath = path.join(__dirname, 'quiz-database/responses.xlsx');
    if (!fs.existsSync(filePath)) return res.json([]);

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Responses'];
    const data = XLSX.utils.sheet_to_json(sheet);

    const summary = {};
    data.forEach(entry => {
        const key = `${entry.timestamp}|${entry.username}|${entry.score}`;
        if (!summary[key]) {
            summary[key] = {
                timestamp: entry.timestamp,
                username: entry.username,
                section: entry.section || 'Unknown',
                score: entry.score
           };
        }
    });

    res.json(Object.values(summary));
});

// Attempt detail API
app.get('/api/attemptDetails', (req, res) => {
    const { timestamp, username } = req.query;
    if (!timestamp || !username) {
        return res.status(400).json({ message: 'Missing timestamp or username.' });
    }

    const filePath = path.join(__dirname, 'quiz-database/responses.xlsx');
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'No responses file found.' });
    }

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Responses'];
    const data = XLSX.utils.sheet_to_json(sheet);

    const filtered = data
        .filter(entry => entry.Timestamp === timestamp && entry.Username === username)
        .map(entry => ({
            ...entry,
            options: entry.options ? JSON.parse(entry.options) : []
        }));

    res.json(filtered);
});

// Delete response API
app.post('/api/delete-response', (req, res) => {
    const { username, timestamp } = req.body;
    if (!username || !timestamp) {
        return res.status(400).json({ message: 'Missing username or timestamp.' });
    }

    const filePath = path.join(__dirname, 'quiz-database/responses.xlsx');
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'quiz-database/responses.xlsx not found.' });
    }

    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets['Responses'];
        let data = XLSX.utils.sheet_to_json(sheet);

        // Filter out rows that match username + timestamp
        const originalLength = data.length;
        data = data.filter(entry => 
            !(entry.username === username && entry.timestamp === timestamp)
        );

        const deletedCount = originalLength - data.length;
        if (deletedCount === 0) {
            return res.status(404).json({ message: 'No matching records found to delete.' });
        }

        // Write updated data back
        const newSheet = XLSX.utils.json_to_sheet(data);
        workbook.Sheets['Responses'] = newSheet;
        XLSX.writeFile(workbook, filePath);

        res.json({ message: `Deleted ${deletedCount} records for ${username} at ${timestamp}.` });
    } catch (error) {
        console.error('Error deleting response:', error);
        res.status(500).json({ message: 'Failed to delete response.' });
    }
});

app.post('/api/edit/save-question', (req, res) => {
    const {
    section,
    questionId,
    question,
    comprehension,
    options,
    type,
    correctAnswerIndex,
    msqAnswers,
    natRange,
    marks
    } = req.body;


    if (!section || !questionId) {
        return res.status(400).json({ message: 'Invalid edit payload.' });
    }

    try {
        const qPath = path.join(__dirname, 'quiz-database/Exam/questions.xlsx');
        const rPath = path.join(__dirname, 'quiz-database/responses.xlsx');

        // 🔐 BACKUP
        // backupFile(qPath);
        // if (fs.existsSync(rPath)) backupFile(rPath);

        /* ---------- UPDATE questions.xlsx ---------- */
        const qWB = readWorkbookSafe(qPath);
        const qSheet = qWB.Sheets[section];
        const qRows = XLSX.utils.sheet_to_json(qSheet, { defval: '' });

        const q = qRows.find(r => String(r.QuestionID) === String(questionId));
        if (!q) {
        return res.status(404).json({ message: 'QuestionID not found.' });
        }

        q.Question = question;
        q.Comprehension = comprehension;
        q['Question Type'] = type;
        q.Marks = marks;

        options.forEach((o, i) => {
            q[`Answer ${i+1} Text`] = o.text || '';
            q[`Answer ${i+1} Image URL`] = o.image || '';
        });

        q['Correct Answer Index'] = type === 'MCQ' ? correctAnswerIndex : '';
        q['MSQ Answers'] = type === 'MSQ' ? msqAnswers : '';
        q['NAT Answer Range'] = type === 'NAT' ? natRange : '';

        qWB.Sheets[section] = XLSX.utils.json_to_sheet(qRows);
        XLSX.writeFile(qWB, qPath);

        /* ---------- PATCH responses.xlsx ---------- */
        if (fs.existsSync(rPath)) {
            const rWB = XLSX.readFile(rPath);
            const rSheet = rWB.Sheets['Responses'];
            const rRows = XLSX.utils.sheet_to_json(rSheet, { defval: '' });

            rRows.forEach(r => {
                if (
                  String(r.section) !== String(section) ||
                  String(r.questionId) !== String(questionId)
                ) return;

                let correct = null;

                if (type === 'MCQ') {
                    const opt = options[correctAnswerIndex];
                    const correctVal = opt.image || opt.text;
                    correct = r.response === correctVal;
                    r.correctAnswer = correctVal;
                }
                else if (type === 'MSQ') {
                    const norm = s => String(s).split(',').map(x=>x.trim()).sort().join(',');
                    correct = norm(r.response || '') === norm(msqAnswers || '');
                    r.correctAnswer = msqAnswers;
                }
                else if (type === 'NAT') {
                    const [lo, hi] = natRange.split('-').map(Number);
                    const v = Number(r.response);
                    correct = !isNaN(v) && v >= lo && v <= hi;
                    r.correctAnswer = natRange;
                }

                r.correct = correct;
                r.type = type;
                r.weightage = marks;
                if (type === 'MCQ' || type === 'MSQ') {
                   r.options = JSON.stringify(options);
                } else {
                   r.options = '';
                }
                r.question = question;
                r.comprehension = comprehension;
            });

            rWB.Sheets['Responses'] = XLSX.utils.json_to_sheet(rRows);
            XLSX.writeFile(rWB, rPath);
        }

        res.json({ message: 'Question updated & responses regraded.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to save edits.' });
    }
});

app.post('/api/edit/get-question', (req, res) => {
    const { section, questionId } = req.body;

    if (!section || !questionId) {
        return res.status(400).json({ message: 'Missing section or questionId.' });
    }

    try {
        const qPath = path.join(__dirname, 'quiz-database/Exam/questions.xlsx');
        const workbook = readWorkbookSafe(qPath);
        const sheet = workbook.Sheets[section];

        if (!sheet) {
            return res.status(404).json({ message: 'Section not found.' });
        }

        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const rowIndex = rows.findIndex(r => r.QuestionID === questionId);
        if (rowIndex === -1) {
            return res.status(404).json({ message: 'Question not found.' });
        }

        const r = rows[rowIndex];

        res.json({
            questionId: r.QuestionID,
            rowIndex,
            section,
            question: r.Question,
            comprehension: r.Comprehension,
            questionImage: r['Question Image URL'],
            type: r['Question Type'],
            marks: r.Marks,
            correctAnswerIndex: r['Correct Answer Index'],
            msqAnswers: r['MSQ Answers'],
            natRange: r['NAT Answer Range'],
            options: [1,2,3,4].map(i => ({
                text: r[`Answer ${i} Text`] || '',
                image: r[`Answer ${i} Image URL`] || ''
            }))
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to load question.' });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
