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

// Load questions from Excel file
const excelFilePath = path.join(__dirname, 'quiz-database/Exam/questions.xlsx');
let jsonData = {};

try {
    const workbook = XLSX.readFile(excelFilePath);
    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        jsonData[sheetName] = XLSX.utils.sheet_to_json(worksheet);
    });
} catch (error) {
    console.error('Error reading Excel file:', error);
}

// Static file serving
app.use('/images', express.static(path.join(__dirname, 'quiz-database/Exam/images')));
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
        score,
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
        const key = `${entry.Timestamp}|${entry.Username}|${entry.Score}`;
        if (!summary[key]) {
            summary[key] = {
                timestamp: entry.Timestamp,
                username: entry.Username,
                section: entry.section || 'Unknown',
                score: entry.Score
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));