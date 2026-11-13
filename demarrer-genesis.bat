@echo off
setlocal
title Genesis - Lancement
chcp 65001 >nul 2>nul
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
cd /d "%ROOT%" || (echo Impossible d'acceder au dossier du projet. & pause & exit /b 1)

where node >nul 2>&1 || (echo ERREUR : Node.js introuvable dans le PATH. & pause & exit /b 1)
where py >nul 2>&1 || (echo ERREUR : Python introuvable ^(lanceur "py"^). & pause & exit /b 1)
if not exist "%ROOT%\node_modules\express" (echo ERREUR : lancez d'abord "npm install". & pause & exit /b 1)
if not exist "%ROOT%\Backend\.env" (echo ERREUR : Backend\.env manquant ^(copiez Backend\.env.example^). & pause & exit /b 1)
if not exist "%ROOT%\Analyse\.env" (echo ERREUR : Analyse\.env manquant ^(copiez Analyse\.env.example^). & pause & exit /b 1)
findstr /C:"MOT_DE_PASSE_POSTGRES" "%ROOT%\Backend\.env" >nul && (echo ERREUR : renseignez le mot de passe PostgreSQL dans Backend\.env ^(DATABASE_URL^). & pause & exit /b 1)

echo.
echo  ===== Genesis - demarrage =====
echo  [1/3] Moteur d'analyse (Python, port 5001)
start "Genesis Analyse" cmd /k "cd /d ""%ROOT%"" && py -3 -I Analyse\app.py"
echo  [2/3] API (Node, port 3000)
start "Genesis API" cmd /k "cd /d ""%ROOT%"" && node Backend\server.js"
echo  [3/3] Interface (Vite, port 5173)
start "Genesis Interface" cmd /k "cd /d ""%ROOT%"" && npm run dev"

echo  Ouverture du navigateur dans 8 secondes...
timeout /t 8 /nobreak >nul 2>nul
start "" "http://localhost:5173"
echo.
echo  Interface : http://localhost:5173
echo  Fermez les trois fenetres "Genesis" pour arreter l'application.
echo.
pause
endlocal
