@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >/dev/null 2>/dev/null || (echo Python 3.10 이상을 먼저 설치하세요: https://www.python.org/downloads/ & pause & exit /b 1)
if not exist .venv py -3 -m venv .venv
.venv\Scripts\python -m pip install --upgrade pip
.venv\Scripts\python -m pip install -r requirements.txt || (echo 설치 중 오류가 났습니다. 위 메시지를 확인하세요. & pause & exit /b 1)
if not exist config.json copy config.example.json config.json >nul
echo.
echo 설치 완료. 다음 순서: calibrate.bat 로 킬 피드 위치 지정 → start.bat
pause
