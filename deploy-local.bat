@echo off
echo 🚀 Bienvenido al script de despliegue local...

REM Verificar si Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js no está instalado. Por favor, instálalo desde https://nodejs.org/
    exit /b 1
)

REM Verificar si npm está instalado
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm no está instalado. Por favor, instálalo junto con Node.js
    exit /b 1
)

REM Instalar dependencias
echo 📦 Instalando dependencias...
call npm install

REM Verificar si existe el archivo .env
if not exist .env (
    echo ⚠️ Archivo .env no encontrado. Creando uno desde .env.example...
    copy .env.example .env
    echo ⚙️ Por favor, configura las variables en el archivo .env antes de continuar
    exit /b 1
)

:MENU
cls
echo.
echo 🔧 Selecciona el modo de ejecución:
echo.
echo 1) Modo Desarrollo (cambios en tiempo real)
echo 2) Modo Producción (versión optimizada)
echo 3) Salir
echo.
set /p OPCION="Elige una opción (1-3): "

if "%OPCION%"=="1" (
    echo.
    echo 🚀 Iniciando servidor de desarrollo...
    echo 🔗 La aplicación estará disponible en: http://localhost:5173
    echo 🔄 Los cambios se verán en tiempo real
    echo ⚡ Presiona Ctrl + C para detener el servidor
    echo.
    call npm run dev
    goto MENU
)

if "%OPCION%"=="2" (
    echo.
    echo 🛠️ Construyendo el proyecto para producción...
    call npm run build

    if not exist "dist" (
        echo ❌ Error en la construcción del proyecto
        pause
        goto MENU
    )

    REM Instalar serve si no está instalado
    where serve >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo 📥 Instalando serve...
        call npm install -g serve
    )

    echo ✅ Construcción completada!
    echo 🌐 Iniciando servidor de producción...
    echo 🔗 La aplicación estará disponible en: http://localhost:3000
    echo.
    serve -s dist
    goto MENU
)

if "%OPCION%"=="3" (
    echo 👋 ¡Hasta luego!
    exit /b 0
)

echo ❌ Opción no válida
timeout /t 2 >nul
goto MENU 