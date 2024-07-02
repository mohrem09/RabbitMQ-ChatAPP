# Utiliser une image de base Node.js
FROM node:16

# Définir le répertoire de travail
WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste de l'application
COPY . .

# Construire l'application pour la production
RUN npm run build

# Utiliser une image de base Nginx pour servir l'application
FROM nginx:alpine

# Copier les fichiers de build Nginx
COPY --from=0 /app/build /usr/share/nginx/html

# Exposer le port de l'application
EXPOSE 80

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]
