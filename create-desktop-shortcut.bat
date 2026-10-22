@echo off
setlocal
echo Creating Desktop shortcut for Liquid Craft Launcher...

set "SCRIPT_DIR=%~dp0"
set "TARGET=%SCRIPT_DIR%node_modules\electron\dist\electron.exe"
set "SHORTCUT=%USERPROFILE%\Desktop\Liquid Craft Launcher.lnk"

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%TARGET%'; $s.Arguments = '%SCRIPT_DIR%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'Liquid Craft Minecraft Launcher'; $s.Save()"

echo Shortcut created on Desktop: %SHORTCUT%
pause
