@echo off
title FormMind AOC-4 Playwright Assistant
cd /d "e:\AutomateFormFIll"
echo =====================================================
echo  FormMind AOC-4 Filing System — Interactive Runner
echo =====================================================
echo.
node aoc4_playwright_runner.cjs %*
if errorlevel 1 (
  echo.
  echo An error occurred during automation.
)
echo.
pause
