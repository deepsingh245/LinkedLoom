# Firebase Functions Integration

This directory contains the server-less functions for LinkedLoom, including LinkedIn integration and AI generation.

## Prerequisites

1.  **Node.js**: Ensure you have Node.js installed (v18 or later recommended).
2.  **Firebase CLI**: Install the Firebase CLI globally if you haven't already:
    ```bash
    npm install -g firebase-tools
    ```

## Setup & Initialization

1.  **Login to Firebase**:
    ```bash
    firebase login
    ```

2.  **Install Dependencies**:
    Navigate to the `functions` directory and install the necessary packages:
    ```bash
    cd functions
    npm install
    ```

## Environment Variables

The functions require several environment variables to work correctly.

**Option 1: using `.env` file (Recommended for Local & Simple Deployments)**
Create a `.env` file in the `functions/` directory with the following keys:

```ini
GEMINI_API_KEY=your_gemini_api_key_here
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=your_redirect_uri (e.g., https://your-app.web.app/integrations/linkedin/callback)
```

**Option 2: Firebase Config (For Production)**
You can also set these variables in the Firebase project configuration:

```bash
firebase functions:config:set gemini.api_key="THE_KEY" linkedin.client_id="THE_ID" ...
```
*(Note: You'll need to update the code to access `functions.config().gemini.api_key` if you choose this method, or use parameter stores).*

## Deployment

To deploy the functions to Firebase, use the `firebase deploy` command.

### Deploying ONLY the AI Function
As requested, to deploy **only** the `generatePost` function:

```bash
firebase deploy --only functions:generatePost
```

### Deploying All Functions
To deploy all functions (including LinkedIn auth and scheduler):

```bash
firebase deploy --only functions
```

## Testing Locally

You can test functions locally using the Firebase Emulator Suite:

```bash
npm run serve
# or
firebase emulators:start
```
