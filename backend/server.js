const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { execSync } = require('child_process'); // Import execSync to run shell commands

// Run the Python script to update IP address in script.js
try {
    execSync('python update_ip.py', { stdio: 'inherit' });
    // console.log('IP address updated successfully in script.js.');
} catch (error) {
    console.error('Failed to update IP address:', error);
}

const app = express();
app.use(express.json());
app.use(cors());

// Load the Excel file and parse all sheets
let jsonData = {};
const excelFilePath = path.join(__dirname, 'PMP-Exam/questions.xlsx');

try {
    const workbook = XLSX.readFile(excelFilePath); // Path to your Excel file

    // Iterate through all sheets and store their data
    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        jsonData[sheetName] = XLSX.utils.sheet_to_json(worksheet);
    });

    // console.log('Excel file loaded successfully with multiple sheets.');
} catch (error) {
    console.error('Error reading Excel file:', error);
}

// Serve static files (images) from the 'images' directory
app.use('/images', express.static(path.join(__dirname, 'PMP-Exam/images')));

app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Endpoint to get all sections
app.get('/api/questions/sections', (req, res) => {
    const sections = Object.keys(jsonData).map(sheetName => ({
        name: sheetName,
        questions: jsonData[sheetName]
    }));

    res.json(sections);
});

// Set up a route to serve questions from a specific sheet
app.get('/api/questions', (req, res) => {
    const { section } = req.query;

    // Validate section parameter
    if (!section || !jsonData[section]) {
        return res.status(400).json({ message: 'Invalid section' });
    }

    res.json(jsonData[section]);
});

// Function to write responses to an Excel file
function writeResponsesToExcel(responses, filePath) {
    let data = [];
    
    responses.forEach(response => {
        data.push({
            Timestamp: response.timestamp,
            Username: response.username,
            Question: response.question,
            Response: response.response,
            Comprehension: response.comprehension || '', // Ensure comprehension is included
            Correct: response.correct ? 'Yes' : 'No',
            Score: response.score
        });
    });

    // Create a new workbook and add a worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');

    // Write the workbook to a file
    XLSX.writeFile(workbook, filePath);
}


app.post('/api/response', (req, res) => {
    const { username, responses, score } = req.body;

    if (!username || !Array.isArray(responses)) {
        return res.status(400).json({ message: 'Invalid data format.' });
    }

    // Define the path to the responses.xlsx file
    const filePath = path.join(__dirname, 'responses.xlsx');

    // Read the existing workbook if it exists
    let workbook;
    if (fs.existsSync(filePath)) {
        workbook = XLSX.readFile(filePath);
    } else {
        workbook = XLSX.utils.book_new();
    }

    // Read existing data from the sheet if it exists
    const existingSheet = workbook.Sheets['Responses'] || {};
    const existingData = XLSX.utils.sheet_to_json(existingSheet);

    // Create an array of responses in the required format with custom timestamp
    const newResponses = responses.map(r => ({
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'), // Custom timestamp format
        username,
        question: r.question,
        response: r.response,
        comprehension: r.comprehension || '', // Include comprehension
        correct: r.correct,
        score
    }));

    // Append the new responses to the existing data
    const updatedData = existingData.concat(newResponses);
    
    // Create or update the sheet with the updated data
    const updatedSheet = XLSX.utils.json_to_sheet(updatedData);
    workbook.Sheets['Responses'] = updatedSheet; // Replace the sheet if it exists

    // Save the updated workbook
    XLSX.writeFile(workbook, filePath);

    res.json({ message: 'Responses recorded successfully.' });
});


// Endpoint to save user score
app.post('/api/score', (req, res) => {
    const { username, score, wrong } = req.body;

    // Validate input
    if (typeof username !== 'string' || typeof score !== 'number' || typeof wrong !== 'number') {
        return res.status(400).json({ message: 'Invalid input' });
    }

    // Construct a string to save to the file
    const scoreData = `Username: ${username}, Score: ${score}, Lost: ${wrong}\n`;

    // Define the path to the scores file
    const filePath = path.join(__dirname, 'scores.txt');

    // Append the score data to the file
    fs.appendFile(filePath, scoreData, (err) => {
        if (err) {
            console.error('Error saving score:', err);
            return res.status(500).json({ message: 'Error saving score' });
        }
        
        // Send a valid JSON response
        res.json({ message: 'Score recorded successfully.' });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
