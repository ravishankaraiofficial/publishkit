# PublishKit Changelog

## [2026-05-12] Feedback Board & Reply System

### ✨ New Features
- **Feedback Board Page** (`/feedback`) — Public-facing feature request board
  - Vote on existing feature requests (signed-in users only)
  - Submit new feature requests with title + description
  - Real-time updates using Firestore onSnapshot
  - Status badges (pending, planned, completed)
  - Sort by votes (descending) then creation date

- **Reply/Answer System** — Comment-like functionality for feedback
  - Expand/collapse replies section for each feedback item
  - Signed-in users can post replies to feedback
  - Replies show author name, timestamp, and message
  - Real-time replies loading via Firestore sub-collection
  - YouTube-style single-level replies (no nested threads)

- **Navbar Update** — Added Feedback navigation link
  - Desktop: Text link between History and Settings
  - Mobile: Icon button in bottom navigation bar

### 🔐 Security & Database
- **Firestore Rules** — New feedback collection rules:
  ```
  match /feedback/{feedbackId} {
    allow read: if true;                    // Anyone can read
    allow create: if request.auth != null;  // Signed-in users can create
    allow update: if request.auth != null;  // Signed-in users can vote
    allow delete: if request.auth != null && request.auth.uid == resource.data.uid;
    
    match /replies/{replyId} {
      allow read: if true;                  // Anyone can read replies
      allow create: if request.auth != null;  // Signed-in users can reply
      allow delete: if request.auth != null && request.auth.uid == resource.data.uid;
    }
  }
  ```

### 🐛 Bug Fixes
- Fixed TypeScript compilation errors (unused imports in Feedback.tsx, ResultTabs.tsx)
- Added error handling to feedback loading with proper error logging
- Improved onSnapshot error callbacks to prevent stuck loading states

### 📝 Documentation Updates
- Updated GEMINI.md with new Feedback Board architecture
- Added Firestore collection schema documentation
- Documented security rules for feedback & replies

### 📦 Database Collections

**feedback/{feedbackId}**
```typescript
{
  id: string;
  title: string;              // Feature request title
  description: string;        // Detailed description
  votes: number;             // Total vote count
  votedBy: string[];         // Array of user UIDs who voted
  uid: string;               // Creator's UID
  userName: string;          // Creator's display name
  status: 'pending' | 'planned' | 'completed';
  createdAt: Timestamp;
}
```

**feedback/{feedbackId}/replies/{replyId}**
```typescript
{
  id: string;
  text: string;              // Reply content
  uid: string;               // Author's UID
  userName: string;          // Author's display name
  createdAt: Timestamp;
}
```

### 🚀 Deployment
- **Commit:** `b7444e0` — feat: add reply/answer functionality to feedback board
- **Status:** ✅ Live on https://publishkit.web.app
- **Components Updated:** Frontend + Firestore Rules
- **Functions:** Unchanged (no backend modifications needed)

---

## [2026-05-11] Feedback Board Initial Setup & Bug Fixes

### ✨ Features
- Feedback Board page layout with header and "New Request" button
- Modal for submitting feature requests
- Voting system with vote count display
- Real-time feedback list with Firestore integration
- Status badges for feedback items
- Empty state UI ("No requests yet. Be the first!")

### 🐛 Fixes
- Caching precision: Added generateThumbnails to cache key in processAudio.ts
- Failure UI visibility: showProcessing stays true on failed status
- Recovery error handling: setIsUploading guaranteed in finally block

### 📱 UI Enhancements
- Celebratory feedback card post-generation (signed-in users)
- Share feedback button in Navbar
- Emil Kowalski design polish (active:scale-95 micro-interactions)

---

## Getting Help
- See GEMINI.md for project setup and architecture
- Check git log for detailed commit messages
- File issues on GitHub: https://github.com/ravishankaraiofficial/publishkit
