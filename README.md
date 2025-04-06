# Quiz Website

## Overview

This project is a simple quiz website

## Making Questions DataBase

Create an excel with following columns.

Comprehension   |   Question    |   Question Image URL  |   Answer 1 Text   |   Answer 1 Image URL  |   Answer 2 Text   |   Answer 2 Image URL  |   Answer 3 Text   |   Answer 3 Image URL  |   Answer 4 Text   |   Answer 4 Image URL  |   Correct Answer Index

Example1:-
“Going by the _____ that many hands make light work, the school _____ involved all the students in the task.” The words that best fill the blanks in the above sentence are   | principle, principal  |   principal, principle    |   principle, principle	|	principal, principal	|	0
Example2:-
“Her _____ should not be confused with miserliness; she is ever willing to assist those in need.” 	|	cleanliness	|	punctuality |	frugality	|	greatness		2

## Modifying "server.js"

Save Questions.xlsx and supporting images in a folder and update the path in line 23 and line 40 respectively.

## Automating Start and Stop website with powershell

Create run_quiz_website.ps1 and stop_quiz_website.ps1 files

### run_quiz_website.ps1:-
cd <your-path>\custom-mocktest-website\backend  .\venv\Scripts\Activate  tasklist | findstr pythonw.exe  taskkill /im pythonw.exe /F  pythonw prevent_sleep.py  deactivate  npm start

### stop_quiz_website.ps1:-

cd <your-path>\Final-quiz\backend  .\venv\Scripts\Activate  tasklist | findstr pythonw.exe  taskkill /im pythonw.exe /F  deactivate
