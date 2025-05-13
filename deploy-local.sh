#!/bin/bash

echo "🚀 Iniciando despliegue local..."

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor, instálalo desde https://nodejs.org/"
    exit 1
fi

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado. Por favor, instálalo junto con Node.js"
    exit 1
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Verificar si existe el archivo .env
if [ ! -f .env ]; then
    echo "⚠️ Archivo .env no encontrado. Creando uno desde .env.example..."
    cp .env.example .env
    echo "⚙️ Por favor, configura las variables en el archivo .env antes de continuar"
    exit 1
fi

# Construir el proyecto
echo "🛠️ Construyendo el proyecto..."
npm run build

# Verificar si la construcción fue exitosa
if [ ! -d "dist" ]; then
    echo "❌ Error en la construcción del proyecto"
    exit 1
fi

# Instalar serve si no está instalado
if ! command -v serve &> /dev/null; then
    echo "📥 Instalando serve..."
    npm install -g serve
fi

echo "✅ Construcción completada!"
echo "🌐 Para iniciar el servidor local, ejecuta:"
echo "serve -s dist -l 3001"
echo "🔗 La aplicación estará disponible en: http://localhost:3000"

# Para desarrollo
npm run dev -- --port 3001 