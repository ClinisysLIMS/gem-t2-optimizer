# Firebase Setup Guide for GEM T2 Optimizer

This guide will help you set up Firebase authentication and Firestore database to enable user accounts, profile saving, and trip history features.

## Prerequisites

- A Google account
- Basic understanding of web development

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" (or select existing project)
3. Enter project name (e.g., "gem-t2-optimizer")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, click "Authentication" in the sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable these providers:
   - **Email/Password**: Click to enable
   - **Google**: Click to enable, add your domain to authorized domains

## Step 3: Enable Firestore Database

1. Click "Firestore Database" in the sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location (choose closest to your users)
5. Click "Done"

## Step 4: Get Firebase Configuration

1. Click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon `</>`
5. Register your app with a nickname (e.g., "GEM Optimizer Web")
6. Copy the `firebaseConfig` object

## Step 5: Update Firebase Configuration

1. Open `js/firebase-config.js` in your project
2. Replace the placeholder config with your actual Firebase config:

```javascript
this.firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:your-app-id"
};
```

## Step 6: Configure Firestore Security Rules

In the Firestore Database section, go to "Rules" tab and update with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Allow users to access their profiles and trip history
      match /{subcollection=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Community features - shared configurations
    match /sharedConfigurations/{configId} {
      // Anyone can read published configurations
      allow read: if resource.data.status == 'published';
      // Only authenticated users can create
      allow create: if request.auth != null && request.auth.uid == request.resource.data.authorId;
      // Only author can update
      allow update: if request.auth != null && request.auth.uid == resource.data.authorId;
      // Only author can delete
      allow delete: if request.auth != null && request.auth.uid == resource.data.authorId;
    }
    
    // Community votes
    match /communityVotes/{voteId} {
      // Users can read their own votes
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      // Users can create/update their own votes
      allow create, update: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Community comments
    match /communityComments/{commentId} {
      // Anyone can read non-flagged comments
      allow read: if resource.data.flagged == false;
      // Only authenticated users can create comments
      allow create: if request.auth != null && request.auth.uid == request.resource.data.authorId;
      // Only author can update their comments
      allow update: if request.auth != null && request.auth.uid == resource.data.authorId;
    }
    
    // Community flags (moderation)
    match /communityFlags/{flagId} {
      // Only authenticated users can create flags
      allow create: if request.auth != null && request.auth.uid == request.resource.data.flaggedBy;
      // Users can read their own flags
      allow read: if request.auth != null && request.auth.uid == resource.data.flaggedBy;
    }
  }
}
```

## Step 7: Test the Setup

1. Open `test-firebase.html` in your browser
2. Check the console output for any errors
3. Try the authentication functions:
   - Sign up with a test email
   - Sign in with the same credentials
   - Save a test profile
   - Load profiles

## Features Enabled

Once Firebase is configured, users will be able to:

### Authentication
- Sign up with email/password
- Sign in with Google account
- Secure user sessions

### Vehicle Profiles
- Save multiple GEM configurations
- Load saved profiles with one click
- Auto-save current configurations
- Access profiles from any device

### Trip History
- Automatic saving of optimization results
- View past trips and settings
- Track usage patterns

### Community Features
- Share successful optimization settings
- Browse configurations by category (routes, events, conditions)
- Rate and comment on shared configurations
- Bookmark favorite configurations
- Search and filter community content
- Download and apply configurations from others
- Track download history
- Report inappropriate content

### Data Structure

The app creates this Firestore structure:
```
users/
  {userId}/
    displayName: "User Name"
    email: "user@example.com"
    createdAt: timestamp
    preferences: {}
    bookmarks: [configurationIds]
    stats: {
      configurationsShared: number
      lastActivity: timestamp
    }
    
    profiles/
      {profileId}/
        name: "Profile Name"
        description: "Description"
        vehicleData: {}
        tripSettings: {}
        controllerSettings: {}
        createdAt: timestamp
        lastUsed: timestamp
    
    tripHistory/
      {tripId}/
        vehicleData: {}
        tripData: {}
        settings: {}
        timestamp: timestamp
        summary: {}
    
    downloadHistory/
      {downloadId}/
        configurationId: string
        title: string
        authorName: string
        downloadedAt: timestamp

sharedConfigurations/
  {configId}/
    title: "Configuration Name"
    description: "Description"
    category: "route|event|condition|general"
    tags: [string]
    vehicleData: {}
    controllerSettings: {}
    routeInfo: {} (optional)
    eventInfo: {} (optional)
    conditions: {} (optional)
    authorId: string
    authorName: string
    createdAt: timestamp
    viewCount: number
    downloadCount: number
    averageRating: number
    ratingCount: number
    commentCount: number
    bookmarkCount: number
    status: "published|draft|flagged|removed"
    featured: boolean
    verified: boolean

communityVotes/
  {userId}_{configId}/
    userId: string
    configurationId: string
    rating: number (1-5)
    createdAt: timestamp
    updatedAt: timestamp

communityComments/
  {commentId}/
    configurationId: string
    authorId: string
    authorName: string
    text: string
    createdAt: timestamp
    updatedAt: timestamp
    likes: number
    flagged: boolean
    verified: boolean

communityFlags/
  {flagId}/
    configurationId: string
    flaggedBy: string
    reason: string
    createdAt: timestamp
    status: "pending|reviewed|resolved"
```

## Troubleshooting

### "Firebase SDK not loaded" error
- Check that Firebase scripts are loading before your app scripts
- Verify internet connection

### Authentication errors
- Check that Email/Password and Google providers are enabled
- Verify domain is added to authorized domains in Authentication settings

### Firestore permission errors
- Update security rules as shown in Step 6
- Ensure user is authenticated before accessing Firestore

### Configuration errors
- Double-check that all config values are correct
- Ensure no extra quotes or missing commas in config object

## Security Best Practices

1. **Never commit API keys** to public repositories
2. **Use environment variables** for production deployments
3. **Configure proper Firestore rules** to restrict data access
4. **Enable multi-factor authentication** for your Firebase account
5. **Monitor usage** in Firebase Console for suspicious activity

## Production Deployment

For production deployment:

1. Change Firestore rules from "test mode" to production rules
2. Set up proper domain authorization
3. Consider using Firebase Hosting for easy deployment
4. Enable Firebase App Check for additional security
5. Set up monitoring and alerts

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify Firebase project settings
3. Test with the included `test-firebase.html` page
4. Refer to [Firebase Documentation](https://firebase.google.com/docs)

The Firebase integration enhances the GEM T2 Optimizer with cloud-based user accounts and data persistence, making it easy for users to manage multiple vehicle configurations and access their data from anywhere.