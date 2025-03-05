const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const Jimp = require("jimp");
const multer = require("multer");


const dynamoDb = new AWS.DynamoDB.DocumentClient(
  process.env.IS_OFFLINE && {
    region: "localhost",
    endpoint: "http://localhost:8000",
  }
);

const TABLE_NAME = process.env.DYNAMODB_TABLE;

exports.index = async (event) => {
  return {
    statusCode: 404,
    body: JSON.stringify({
      message: "Url Shortener v1.0",
    }),
  };
};

exports.createUrl = async (event) => {
  const { url } = JSON.parse(event.body);
  const key = uuidv4().slice(0, 8);

  const params = {
    TableName: TABLE_NAME,
    Item: {
      key,
      url,
      createdAt: new Date().toISOString(),
      clicks: 0,
    },
  };

  await dynamoDb.put(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ key, shortUrl: `http://localhost:3000/url/${key}` }),
  };
};

exports.listUrls = async (event) => {
  const params = {
    TableName: TABLE_NAME,
  };

  const { Items } = await dynamoDb.scan(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify(Items),
  };
};

exports.getUrl = async (event) => {
  const { key } = event.pathParameters;

  const params = {
    TableName: TABLE_NAME,
    Key: {
      key,
    },
  };

  const { Item } = await dynamoDb.get(params).promise();

  // Increase the number of clicks
  await dynamoDb
    .update({
      TableName: TABLE_NAME,
      Key: {
        key,
      },
      UpdateExpression: "SET clicks = clicks + :inc",
      ExpressionAttributeValues: {
        ":inc": 1,
      },
    })
    .promise();

  if (!Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "URL not found" }),
    };
  }

  return {
    statusCode: 301,
    headers: {
      Location: Item.url,
    },
  };
};





/**
 * Génération de l'image avec texte superposé
 * @param { Path de l'image en entrée } imagePath 
 * @param { Texte du haut à superposer } upperText 
 * @param { Texte du haut à superposer } lowerText 
 * @param { Path de l'image en sortie } outputPath 
 */
async function overlayTextOnImage(imagePath, upperText, lowerText, outputPath) {
  try {
    // Charger l'image
    const image = await Jimp.read(imagePath);

    // Charger une police d'écriture
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

    // Ajouter les textes sur l'image
    image.print(font, 10, 10, upperText); // Texte 1 en haut à gauche
    image.print(font, 10, 50, lowerText); // Texte 2 en dessous

    // Sauvegarder l’image modifiée
    await image.writeAsync(outputPath);

    console.log("✅ Image générée avec succès :", outputPath);

    // Convertir l'image en base64 pour stockage dans DynamoDB
    const imageBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
    const base64Image = imageBuffer.toString("base64");

    // Stocker dans DynamoDB
    await dynamoDb
      .put({
        TableName: "Images",
        Item: {
          id: Date.now().toString(), // ID unique
          image: base64Image,
          upperText,
          lowerText
        }
      }).promise();

    console.log("✅ Image stockée dans DynamoDB !");
  } catch (error) {
    console.error("❌ Erreur :", error);
  }
}












exports.createMeme = async (event) => {
  try {
    console.log("Starting createMeme function");


    // Check for request body
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing request body" })
      };
    }

    // Parse the request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid JSON in request body" })
      };
    }

    // Extract and validate required fields
    const { imageUrl, topText, bottomText } = requestBody;

    if (!imageUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "imageUrl is required" })
      };
    }
    if (topText && bottomText) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Les textes doivent être présents" })
      };
    }

    const id = uuidv4().slice(0, 8);
    console.log("Generated ID:", id);

    // Store meme information
    const memeData = {
      id,
      imageUrl,
      topText: topText,
      bottomText: bottomText,
      createdAt: new Date().toISOString(),
    };

    console.log("About to store in DynamoDB:", {
      TableName: TABLE_NAME,
      Item: memeData
    });

    await dynamoDb.put({
      TableName: TABLE_NAME,
      Item: memeData,
    }).promise();

    console.log("Meme successfully stored in DynamoDB");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id,
        message: "Meme created successfully",
        memeUrl: `http://localhost:3000/meme/${id}`
      }),
    };
  } catch (error) {
    console.error("Error in createMeme:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to create meme",
        error: error ? error.message : "Unknown error",
        stack: error ? error.stack : null
      }),
    };
  }
};


exports.getMeme = async (event) => {
  const { key } = event.pathParameters;

  const params = {
    TableName: TABLE_NAME,
    Key: {
      key,
    },
  };

  const { Item } = await dynamoDb.get(params).promise();

  if (!Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Image not found" }),
    };
  }

  return {
    statusCode: 301,
    headers: {
      Location: Item.url,
    },
  };
};