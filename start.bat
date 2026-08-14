@echo off
chcp 65001 >nul
rem Biznes AI Boty işledýär
title Biznes AI Bot

where node >nul 2>&1
if errorlevel 1 (
    echo Node.js tapylmady!
    echo https://nodejs.org sahypasyndan "LTS" wersiýany gurnap, soňra täzeden işlediň.
    pause
    exit /b 1
)

echo Bot işledilýär... Brauzerde açyň: http://localhost:3000
echo Toqtatmak üçin bu penjirany ýapyň.
node server.js
pause
