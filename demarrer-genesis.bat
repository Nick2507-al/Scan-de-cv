@echo off
setlocal EnableDelayedExpansion
title Genesis GRH - Lancement
chcp 65001 >nul 2>nul

:: Repertoire du script (sans backslash final pour eviter les problemes de guillemets)
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

:: Fichiers de logs separes (evite "fichier utilise par un autre processus")
set "LOGFILE=%ROOT%\genesis-logs.txt"
set "LOGFILE_BACKEND=%ROOT%\genesis-logs-backend.txt"
set "LOGFILE_FRONTEND=%ROOT%\genesis-logs-frontend.txt"

cd /d "%ROOT%"
if errorlevel 1 (
    echo Erreur: impossible d'acceder au repertoire du projet.
    echo Chemin: %ROOT%
    pause
    exit /b 1
)

:: Verifier que Node.js est disponible (souvent absent du PATH en double-clic)
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERREUR: Node.js introuvable. Ajoutez Node.js au PATH systeme
    echo  ou lancez ce script depuis un terminal ou CMD ou vous avez fait "npm install".
    echo.
    pause
    exit /b 1
)

:: Verifier que les dependances sont installees (evite ERR_MODULE_NOT_FOUND)
if not exist "%ROOT%\node_modules\jsonwebtoken" (
    echo.
    echo  ERREUR: Les dependances npm ne sont pas installees.
    echo  Le backend a besoin de "jsonwebtoken" et autres modules.
    echo.
    echo  Executez d abord dans ce dossier:
    echo    npm install
    echo.
    echo  Puis relancez ce script.
    echo.
    pause
    exit /b 1
)

:: Demarrer le fichier de logs avec un en-tete de session
echo. >> "%LOGFILE%"
echo ======================================== >> "%LOGFILE%"
echo Session demarree %date% %time% >> "%LOGFILE%"
echo ======================================== >> "%LOGFILE%"
echo --- Backend (Node) --- >> "%LOGFILE%"

echo.
echo  ========================================
echo   Genesis GRH - Demarrage de l'application
echo  ========================================
echo.
echo  Logs backend  : genesis-logs-backend.txt
echo  Logs frontend : genesis-logs-frontend.txt
echo  Logs navigateur : genesis-logs.txt
echo.

:: Demarrer le backend (port 3000) avec sortie vers son propre fichier
echo [1/3] Demarrage du backend (Express, port 3000)...
start "Genesis Backend" cmd /k "cd /d ""%ROOT%"" && (node Backend\app.js >> ""%LOGFILE_BACKEND%"" 2>&1) || (echo. & echo Erreur au demarrage du backend. Voir genesis-logs-backend.txt & pause)"
if errorlevel 1 (
    echo Erreur: impossible de demarrer le backend.
    pause
    exit /b 1
)

:: Demarrer le frontend (Vite) avec sortie vers son propre fichier (evite conflit d'acces)
echo [2/3] Demarrage du frontend (Vite)...
start "Genesis Frontend" cmd /k "cd /d ""%ROOT%"" && (npm run dev >> ""%LOGFILE_FRONTEND%"" 2>&1) || (echo. & echo Erreur au demarrage du frontend. Voir genesis-logs-frontend.txt & pause)"
if errorlevel 1 (
    echo Erreur: impossible de demarrer le frontend.
    pause
    exit /b 1
)

:: Attendre que le serveur Vite soit pret
echo [3/3] Attente du demarrage du serveur (8 secondes)...
timeout /t 8 /nobreak >nul 2>nul
if errorlevel 1 ping 127.0.0.1 -n 9 >nul

:: Ouvrir le navigateur par defaut sur l'URL du frontend
echo Ouverture du navigateur sur http://localhost:5173
start "" "http://localhost:5173"

echo.
echo  ========================================
echo   L'application est en cours d'execution.
echo   - Frontend : http://localhost:5173
echo   - Backend  : http://localhost:3000
echo.
echo   Fermez les fenetres Genesis Backend et
echo   Genesis Frontend pour arreter l'application.
echo.
echo   En cas de defaillance, consultez les logs:
echo   - Backend  : genesis-logs-backend.txt
echo   - Frontend : genesis-logs-frontend.txt
echo   - Navigateur : genesis-logs.txt
echo  ========================================
echo.
pause
endlocal
