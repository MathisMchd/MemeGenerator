# Meme Generator - Serverless Application

## Description du Projet
Ce projet est une application serverless qui permet de générer et gérer des mèmes en ajoutant du texte à des images. L'application utilise AWS Lambda, API Gateway, DynamoDB et S3 pour créer une solution complète, évolutive et sans serveur.

## Fonctionnalités
Création de mèmes en ajoutant du texte sur des images
Stockage des images dans S3 avec accès public
Stockage des métadonnées dans DynamoDB
Liste de tous les mèmes générés

## Prérequis
- Node.js (v18 ou supérieur)
- Serverless Framework (npm install -g serverless)
- Docker (pour exécuter DynamoDB Local et S3 Local)
- S3 (npm install serverless-s3-local)
- Sharp : combinaison texte et image (npm i sharp)
- Multer : Manipulation Image (npm i multer)

## Installation et Configuration
Clonez le dépôt: \
```git clone https://github.com/votre-utilisateur/meme-generator.git```

Puis :
```cd MemeGenerator```

Installez les dépendances: \
```npm install```

Démarrez l'environnement local: \
```serverless offline start --reloadHandler```

Ce qui démarre:

Un serveur API Gateway local sur http://localhost:3000 \
Un émulateur DynamoDB local sur http://localhost:8000 \
Un serveur S3 local sur http://localhost:4569 

## Structure du Projet
````
MemeGenerator/
├── handler.js            # Fonctions Lambda
├── serverless.yml        # Configuration Serverless Framework
├── package.json          # Dépendances npm
└── buckets/              # Stockage local pour S3
````

## API
1. Création d'un memes \
```Endpoint POST /meme```

### Payload
````json
{
  "imageUrl": "https://example.com/image.jpg",
  "text": "Mon texte de meme"
}
````

Note: imageUrl peut être une URL ou une image encodée en base64

### Exemple cURL
````json
curl -X POST \
  http://localhost:3000/meme \
  -H 'Content-Type: application/json' \
  -d '{
    "imageUrl": "https://fastly.picsum.photos/id/157/200/200.jpg?hmac=WcY71o73tg2eJc3TmpgdISkTe-p8ZGn-A3Q3jh2h7T4",
    "text": "TOP TEXT"
}'
````

### Exemple Postman
````
POST: http://localhost:3000/meme
Headers: Content-Type: application/json
Body (raw, JSON): 
{
  "imageUrl": "https://fastly.picsum.photos/id/157/200/200.jpg?hmac=WcY71o73tg2eJc3TmpgdISkTe-p8ZGn-A3Q3jh2h7T4",
  "text": "TOP TEXT"
}
````

Réponse
````
{
  "memeId": "7PN1A6xP",
  "memeUrl": "http://localhost:4569/meme-generator-dev-images/7PN1A6xP.jpg",
  "downloadUrl": "http://localhost:4569/meme-generator-dev-images/7PN1A6xP.jpg"
}
````

2. Récupération de tous les memes \
```Endpoint GET /memes```

Exemple cURL
```curl -X GET http://localhost:3000/memes```

Exemple Postman
```GET: http://localhost:3000/memes```

### Réponse
````json
[
  {
    "key": "7PN1A6xP",
    "type": "meme",
    "imageUrl": "http://localhost:4569/meme-generator-dev-images/7PN1A6xP.jpg",
    "text": "TOP TEXT",
    "createdAt": "2023-06-10T14:23:45.123Z",
    "views": 0
  }
]
````

## Notes de Développement
L'application utilise **sharp** pour le traitement des images \
Les fichiers générés sont accessibles via le navigateur à l'URL S3 locale. \
Si vous rencontrez des problèmes avec DynamoDB local, essayez de modifier les paramètres dans serverless.yml pour désactiver Docker ou le mode inMemory. 

### Déploiement sur AWS

Pour déployer sur AWS, exécutez:
```
serverless deploy
````

Cela déploiera:

- Fonctions Lambda
- Table DynamoDB
- Bucket S3
- API Gateway

### Maintenance
Les fichiers S3 locaux sont stockés dans le dossier /buckets \
Pour nettoyer les données locales, supprimez le contenu du dossier /buckets