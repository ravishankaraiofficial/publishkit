# Reliability, Security, and UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the upload "blind spot", enable Firebase App Check, and improve guest-to-user transition.

**Architecture:**
- **Reliability:** Use `localStorage` to persist metadata about an active upload before a Firestore `resultId` is available.
- **Security:** Initialize Firebase App Check on the client and enforce it in the `processAudio` Cloud Function.
- **UX:** Clear the `freeTrialUsed` flag upon successful Google sign-in and remove the forced flag setting on logout.

**Tech Stack:** React 19, Firebase SDK v12, TypeScript.

---

### Task 1: UX - Refine Free Trial Management

**Files:**
- Modify: `src/hooks/useAuth.tsx`

- [ ] **Step 1: Clear `freeTrialUsed` on Google sign-in (Popup)**
  In `signInWithGoogle`, after a successful popup sign-in, remove the `freeTrialUsed` key from `localStorage`.

- [ ] **Step 2: Clear `freeTrialUsed` on Google sign-in (Redirect)**
  In the `useEffect` block, update the `getRedirectResult` chain to clear the `freeTrialUsed` key if a user is returned.

- [ ] **Step 3: Remove forced `freeTrialUsed` on logout**
  Remove `localStorage.setItem('freeTrialUsed', 'true')` from the `logout` function. The flag should only be set when a guest session is actually used.

- [ ] **Step 4: Verify Auth flow**
  Manual verification: Sign in as guest, use session (flag set), sign in with Google (flag cleared), sign out (flag remains cleared).

---

### Task 2: Reliability - Persist Pending Upload Metadata

**Files:**
- Modify: `src/hooks/useUpload.tsx`

- [ ] **Step 1: Define `PendingUpload` interface**
  Add an interface for storing minimal metadata about an upload-in-progress.

```typescript
interface PendingUpload {
  fileName: string;
  fileType: string;
  outputLanguage: OutputLanguage;
  thumbnailPromptEnabled: boolean;
}
```

- [ ] **Step 2: Add `pendingUpload` state**
  Add `pendingUpload` state and logic to save/load it from `localStorage` keyed by `user.uid`.

- [ ] **Step 3: Save metadata in `handleFileSelect`**
  Set `pendingUpload` immediately when a file is selected, before the Storage upload starts.

- [ ] **Step 4: Restore state on mount/re-auth**
  If `pendingUpload` exists in `localStorage` on mount (and no `resultId` is active), set `isUploading(true)` and initialize the `statusCycle` using the stored metadata.

- [ ] **Step 5: Clear metadata on completion**
  In the Firestore `onSnapshot` listener, clear the `pendingUpload` from state and `localStorage` when the status becomes `complete` or `failed`.

- [ ] **Step 6: Verify reliability**
  Manual verification: Start an upload, refresh the page before the Firestore doc is created. The UI should still show "Uploading...".

---

### Task 3: Security - Enable Firebase App Check

**Files:**
- Modify: `src/lib/firebase.ts`
- Modify: `functions/src/processAudio.ts`

- [ ] **Step 1: Initialize App Check on Frontend**
  Uncomment and configure App Check in `src/lib/firebase.ts`. Use a placeholder for the reCAPTCHA site key.

- [ ] **Step 2: Enforce App Check in Cloud Function**
  Update `processAudio` in `functions/src/processAudio.ts` to verify `context.app`.

```typescript
if (!context.app) {
  throw new functions.https.HttpsError(
    'failed-precondition',
    'The function must be called from an App Check verified app.'
  );
}
```

- [ ] **Step 3: Build and Deploy**
  Run `npm run build` and `firebase deploy --only functions,hosting`.

---
