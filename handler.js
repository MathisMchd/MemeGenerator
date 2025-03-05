const AWS = require("aws-sdk");
const sharp = require('sharp');
const multer = require("multer");
const serverless = require("serverless-http");

const app = require("express")();
const upload = multer({ storage: multer.memoryStorage() });

AWS.config.update({
  region: 'localhost',
  accessKeyId: 'S3RVER',
  secretAccessKey: 'S3RVER'
});

const dynamoDb = new AWS.DynamoDB.DocumentClient(
  {
    region: "localhost",
    endpoint: "http://localhost:8000",
  }
);

const S3_ENTTY_POINT = 'http://localhost:4569'

const s3 = new AWS.S3({
  s3ForcePathStyle: true,
  accessKeyId: 'S3RVER',
  secretAccessKey: 'S3RVER',
  endpoint: 'http://localhost:4569',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'meme-generator-dev-images';
const TABLE_NAME = process.env.DYNAMODB_TABLE;

exports.index = async (event) => {
  return {
    statusCode: 404,
    body: JSON.stringify({
      message: "Url Shortener v1.0",
    }),
  };
};

exports.getAllMemes = async (event) => {
  try {
    const params = {
      TableName: TABLE_NAME,

    };

    const result = await dynamoDb.scan(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error("Error getting images:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to get images", message: error.message }),
    };
  }
}

exports.createMeme = async (event) => {
  try {
    const { imageUrl, text } = JSON.parse(event.body);

    // Generate a unique ID for the meme
    const memeId = uuidv4().slice(0, 8);

    // Download the image (if it's a URL) or use base64 data
    let imageBuffer;
    if (imageUrl.startsWith('http')) {
      const response = await fetch(imageUrl);
      imageBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(imageBuffer);
    } else {
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    }
    
    const width = 800;
    const height = 600;
    const resizedImage = await sharp(imageBuffer)
      .resize(width, height, { fit: 'inside' })
      .toBuffer();
    
    const metadata = await sharp(resizedImage).metadata();
    
    const svgText = `
      <svg width="${metadata.width}" height="${metadata.height}">
        <style>
          .title { fill: white; font-size: 40px; font-weight: bold; text-shadow: 2px 2px 2px black; }
        </style>
        <text x="50%" y="10%" text-anchor="middle" class="title">${text}</text>
      </svg>
    `;

    const svgBuffer = Buffer.from(svgText);
    
    const memeBuffer = await sharp(resizedImage)
      .composite([{ input: svgBuffer }])
      .jpeg()
      .toBuffer();
    
    const s3Key = `${memeId}.jpg`;
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: memeBuffer,
      ContentType: 'image/jpeg',
      ACL: 'public-read'
    }).promise();
    
    const memeUrl = process.env.IS_OFFLINE 
      ? `http://localhost:4569/${BUCKET_NAME}/${s3Key}`
      : `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
    
    const params = {
      TableName: TABLE_NAME,
      Item: {
        key: memeId,
        type: 'meme',
        imageUrl: memeUrl,
        text,
        createdAt: new Date().toISOString(),
        views: 0,
      },
    };
    await dynamoDb.put(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        memeId,
        memeUrl,
        downloadUrl: memeUrl
      })
    };
  } catch (error) {
    console.error('Error creating meme:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create meme', message: error.message })
    };
  }
};



/**
 * Modifie une image avec du texte
 * Prend en entré un fichier image et un texte
 * Les combines, sauvegarde sur S3 et l'url d'accès de l'image sur dynamodb.
 */
app.post('/uploadImageWithText', upload.single('file'), async (req, res) => {
  try {

    const file = req.file;
    const text = req.body.text;

    if (!file || text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Image file and text are required" }),
      };
    }

    // Ajouter le texte sur l'image
    const memeId = uuidv4().slice(0, 8);


    // Décoder l'image depuis la base64
    const imageBuffer = req.file.buffer


    // Utilisation de sharp pour ajouter le texte
    const imageWithText = await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(
            `<svg width="800" height="600">
               <style>
                 .title { fill: white; font-size: 40px; font-weight: bold; text-shadow: 2px 2px 2px black; }
               </style>
               <text x="50%" y="50%" text-anchor="middle" class="title">${text}</text>
             </svg>`
          ),
          top: 0,
          left: 0,
        },
      ])
      .toBuffer();

    // Nom de l'image dans S3
    const s3Key = `${memeId}.jpg`;

    // Upload de l'image avec texte sur S3
    await s3
      .putObject({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: imageWithText,
        ContentType: "image/jpeg",
        ACL: "public-read",
      })
      .promise();

    // L'URL de l'image sur S3
    const memeUrl = process.env.IS_OFFLINE
      ? `${S3_ENTTY_POINT}/${BUCKET_NAME}/${s3Key}`
      : `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;

    // Stocker dans DynamoDB
    const params = {
      TableName: TABLE_NAME,
      Item: {
        key: memeId,
        type: "meme",
        imageUrl: memeUrl,
        text,
        createdAt: new Date().toISOString(),
        views: 0,
      },
    };

    await dynamoDb.put(params).promise();

    // Retourner l'URL de l'image générée
    return {
      statusCode: 200,
      body: JSON.stringify({
        memeId,
        memeUrl,
        downloadUrl: memeUrl,
      }),
    };
  } catch (error) {
    console.error("Error uploading image with text:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to upload image", message: error.message }),
    };
  }
});

module.exports.uploadImageWithText = serverless(app);