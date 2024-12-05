#!/bin/bash

# Mensaje de bienvenida
echo "Bienvenido, corriendo script..."

# Pausar para continuar
read -p "Continuar? [Enter]"

# Actualizar el sistema
echo "Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar Docker y Docker Compose
echo "Instalando Docker y Docker Compose..."
sudo apt install -y docker.io docker-compose

# Verificar instalación de Docker
echo "Verificando instalación de Docker..."
sudo systemctl start docker
sudo systemctl enable docker
docker --version

# Verificar instalación de Docker Compose
echo "Verificando instalación de Docker Compose..."
docker-compose --version

# Ejecutar Docker Compose para levantar los contenedores
echo "Ejecutando Docker Compose..."
sudo docker-compose up -d

# Mensaje final
echo "Docker Compose ha sido ejecutado. Los contenedores están corriendo en segundo plano."

# Mantener el script activo para observación
read -p "Presiona Enter para salir."
