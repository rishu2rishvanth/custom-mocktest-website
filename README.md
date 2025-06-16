# Quiz Website

## Overview

This project is a simple quiz website

## Making Questions DataBase

Create an excel with following columns with "Question.xlsx".

<table class="table table-bordered">
  <thead class="thead-light">
    <tr>
      <th>Comprehension:</th>
      <th>Question</th>
      <th>Question Image URL</th>
      <th>Answer 1 Text</th>
      <th>Answer 1 Image URL</th>
      <th>Answer 2 Text</th>
      <th>Answer 2 Image URL</th>
      <th>Answer 3 Text</th>
      <th>Answer 3 Image URL</th>
      <th>Answer 4 Text</th>
      <th>Answer 4 Image URL</th>
      <th>Correct Answer Index</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <p></p>
      </td>
      <td>
        <p>what is 4+4?</p>
      </td>
      <td>
        <p></p>
      </td>
      <td>
        <p>1</p>
      </td>
      <td>
        <p></p>
      </td>
      <td>
        <p>4</p>
      </td>
      <td>
        <p></p>
      </td>
      <td>
        <p>8</p>
      </td>
      <td>
        <p></p>
      </td>
      <td>
        <p>10</p>
      </td>
      <td>
        <p></p>
      </td>
      <td>
        <p>2</p>
      </td>
    </tr>
    <tr>
      <td>
        <p>Supporting Data Text only</p>
      </td>
      <td>
        <p></p>
      </td>
      <td>
        <p>/images/question1.jpg</p>
      </td>
      <td>
        <p></p>
      </td>
      <td>
        <p>/images/q1-answer1.jpg</p>
      </td>
      <td>
        <p></p>
      </td>
      <td>
        <p>/images/q1-answer2.jpg</p>
      </td>
      <td>
        <p></p>
      </td>
      <td>
        <p>/images/q1-answer3.jpg</p>
      </td>
      <td>
        <p></p>
      </td>
      <td>
        <p>/images/q1-answer4.jpg</p>
      </td>
      <td>
        <p>0</p>
      </td>
    </tr>
  </tbody>
</table>

## Modifying "server.js"

Save Questions.xlsx and supporting images in a folder and update the path in line 23 and line 40 respectively.<br/>
This website supports sections with sheetNames and custom duration of test.

## Automating Start and Stop website with powershell

Create run_quiz_website.ps1 and stop_quiz_website.ps1 files

### run_quiz_website.ps1:-
cd <your-path>\custom-mocktest-website\backend<br>
.\venv\Scripts\Activate<br>
tasklist | findstr pythonw.exe<br>
taskkill /im pythonw.exe /F<br>
pythonw prevent_sleep.py<br>
deactivate<br>
npm start<br>

### stop_quiz_website.ps1:-

cd <your-path>\Final-quiz\backend<br>
.\venv\Scripts\Activate<br>
tasklist | findstr pythonw.exe<br>
taskkill /im pythonw.exe /F<br>
deactivate


Thank you!!