#!/bin/bash

# Mensaje de bienvenida
echo "Bienvenido, corriendo script para instalar Docker y Docker Compose..."

# Pausar para continuar
read -p "Presiona Enter para continuar..."

# Actualizar el sistema
echo "Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependencias necesarias
echo "Instalando dependencias..."
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common jq

# Añadir la clave GPG de Docker
echo "Añadiendo la clave GPG de Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Añadir el repositorio oficial de Docker
echo "Añadiendo el repositorio oficial de Docker..."
sudo sh -c "echo 'deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable' > /etc/apt/sources.list.d/docker.list"

# Actualizar el índice de paquetes
echo "Actualizando el índice de paquetes..."
sudo apt update

# Instalar Docker
echo "Instalando Docker..."
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Habilitar y verificar Docker
echo "Habilitando y verificando Docker..."
sudo systemctl enable docker
sudo systemctl start docker
docker --version

# Instalar Docker Compose (última versión)
echo "Instalando Docker Compose..."
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación de Docker Compose
echo "Verificando instalación de Docker Compose..."
docker-compose --version

# Ejecutar Docker Compose para levantar los contenedores
echo "Ejecutando Docker Compose..."
sudo docker-compose up -d

# Mensaje final
echo "Docker y Docker Compose han sido instalados correctamente."
echo "Los contenedores se están ejecutando en segundo plano."

# Pausa final
read -p "Presiona Enter para salir."
