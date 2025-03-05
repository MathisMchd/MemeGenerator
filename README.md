# URL Shortener - Local Development

## Prerequisites
- Node.js installed
- Serverless Framework installed (`npm install -g serverless`)
- S3 (`npm install serverless-s3-local`)
- Sharp : combinaison texte et image (`npm i sharp`)
- Multer : Manipulation Image (`npm i multer`)

## Starting the Project Locally

To run the project locally using serverless-offline, use the following command:

```bash
serverless offline start --reloadHandler
```

This command:
- Starts a local API Gateway emulator
- Enables hot reloading for Lambda functions
- Watches for changes in your handler files
- Automatically restarts the service when changes are detected

The API will be available at `http://localhost:3000` by default.

## Development Notes
- Any changes to your Lambda functions will trigger automatic reload
- Check the console for endpoint URLs and port information
- Use `Ctrl+C` to stop the local server