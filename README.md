# Mansalema Backend

## Description

This is a backend for Mansalema Security Operations Management to simplify the management of complex security services.

This platform will streamline registration for Security Companies, Clients, and Security Officers, ensuring they meet all regulatory requirements.

The main focus of the application is to provide real-time emergency response, enhanced communication, and user-friendly service management tools for a safer community.

## Key features

The following features will be covered in this application:

- User registration and profile management for
  - Clients
  - Security companies
  - Officers
- Real-time notifications for emergency response
  - Panic button
  - Voice commands
- Tools for reporting incidents and managing security personnel

## Libraries used

The following libraries will be used in this application

- **TypeScript**: Leverage static typing for better code quality
- **Express**: Fast and minimal web framework for Node.js
- **Mongoose**: MongoDB object modeling for easy database interaction
- **dotenv**: Manage environment variables seamlessly
- **express-validator**: Validate incoming request data easily
- **Morgan**: HTTP request logger middleware for Node.js
- **Nodemon**: Automatically restart the server during development
- **bcrypt**: A library to hash passwords securely and handle authentication.
- **jsonwebtoken**: Generate and verify JSON Web Tokens for user authentication and authorization.
- **firebase-admin**: A library to interact with Firebase services like Firebase cloud messaging
- **nodemailer**: A module for Node.js to easily send emails with support for various transport methods and HTML content.
- **multer**: A Node.js middleware for handling file upload.
- **dayjs**: A lightweight JavaScript library for parsing, manipulating, and formatting dates.

## Prerequisites

- **Node.js**: Version 14 or higher is recommended.
- **npm**: Node Package Manager.

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   ```

2. Change to the project directory:

   ```bash
   cd <repository-name>
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Create a .env file in the root directory and define your environment variables. For example:

   ```bash
   MONGO_URI=your_mongodb_connection_string
   PORT=5000
   BCRYPT_SALT_ROUNDS=15
   JWT_SECRET=YOUR_JWT_SECRET
   FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
   FIREBASE_CLIENT_EMAIL=YOUR_FIREBASE_CLIENT_EMAIL
   FIREBASE_PRIVATE_KEY=YOUR_FIREBASE_PRIVATE_KEY
   EMAIL_USER=YOUR_GMAIL_EMAIL_ID
   EMAIL_PASS=YOUR_GMAIL_APP_PASSWORD
   ```

## Available Scripts

- **Build**: Compiles the TypeScript files to JavaScript.

  ```bash
  npm run build
  ```

- **Start**: Starts the application using `ts-node`.

  ```bash
  npm start
  ```

- **Dev**: Starts the application with Nodemon for development, which automatically restarts the server on file changes.
  ```bash
  npm run dev
  ```
