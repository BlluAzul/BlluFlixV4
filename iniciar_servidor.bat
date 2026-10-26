@echo off
echo ============================================
echo    BlluFlix - Servidor Local
echo ============================================
echo.
echo Iniciando servidor na porta 8080...
echo.
echo Acesse: http://localhost:8080
echo.
echo Pressione Ctrl+C para parar o servidor
echo ============================================
echo.

REM Tenta usar Python 3
python -m http.server 8080 2>nul
if %errorlevel% neq 0 (
    REM Tenta usar Python 2
    python -m SimpleHTTPServer 8080 2>nul
    if %errorlevel% neq 0 (
        echo.
        echo ERRO: Python nao encontrado!
        echo.
        echo Instale Python em: https://python.org
        echo.
        echo Ou use a extensao Live Server do VS Code
        echo.
        pause
    )
)
