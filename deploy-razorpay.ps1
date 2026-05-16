# Razorpay Deployment & Diagnostic Script
# Sets up secrets, builds, deploys, and diagnoses 401 errors

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Razorpay Integration Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============ STEP 1: Check Firebase CLI ============
Write-Host "Step 1: Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseVersion = firebase --version 2>$null
if (-not $firebaseVersion) {
    Write-Host "ERROR: Firebase CLI not found. Install it first." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Firebase CLI found: $firebaseVersion" -ForegroundColor Green

# Check project
$currentProject = firebase projects:list 2>$null | Select-String "ACTIVE"
if (-not $currentProject) {
    Write-Host "`nNo active Firebase project detected." -ForegroundColor Yellow
    $projectId = Read-Host "Enter your Firebase Project ID"
    firebase projects:list
    Write-Host "Set project with: firebase use $projectId" -ForegroundColor Cyan
} else {
    Write-Host "✓ Active project: $(($currentProject -split '\s+')[0])" -ForegroundColor Green
}

# ============ STEP 2: Build Functions ============
Write-Host "`nStep 2: Building Cloud Functions..." -ForegroundColor Yellow
Push-Location functions
try {
    npm install 2>&1 | Select-String "added|up to date" -ErrorAction SilentlyContinue
    npm run build
    Write-Host "✓ Functions built successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Build failed. Check functions/src/ for TypeScript errors." -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

# ============ STEP 3: Inspect Secrets ============
Write-Host "`nStep 3: Inspecting Razorpay Secrets..." -ForegroundColor Yellow

function Inspect-Secret {
    param([string]$SecretName)

    Write-Host "`n  $SecretName" -ForegroundColor Cyan -NoNewline

    # Try to read the secret (Firebase CLI doesn't expose values, but we can check version)
    $secretCheck = firebase functions:secrets:list 2>&1 | Select-String $SecretName

    if ($secretCheck) {
        Write-Host " ✓ Set" -ForegroundColor Green

        # Warn if likely issues
        if ($SecretName -eq "RAZORPAY_KEY_ID") {
            Write-Host "    (Should start with: rzp_test_ or rzp_live_)" -ForegroundColor DarkGray
        } elseif ($SecretName -eq "RAZORPAY_KEY_SECRET") {
            Write-Host "    (Should be ~24 characters)" -ForegroundColor DarkGray
        }
    } else {
        Write-Host " ✗ NOT SET" -ForegroundColor Red
        return $false
    }
    return $true
}

$keyIdSet = Inspect-Secret "RAZORPAY_KEY_ID"
$keySecretSet = Inspect-Secret "RAZORPAY_KEY_SECRET"
$webhookSecretSet = Inspect-Secret "RAZORPAY_WEBHOOK_SECRET"

# ============ STEP 4: Offer to Reset Secrets ============
Write-Host "`nStep 4: Reset Missing or Incorrect Secrets?" -ForegroundColor Yellow

if (-not $keyIdSet) {
    Write-Host "`nRAZORPAY_KEY_ID is not set." -ForegroundColor Yellow
    $keyId = Read-Host "Paste your Razorpay Test Key ID (rzp_test_...)"
    $keyId = $keyId.Trim()
    firebase functions:secrets:set RAZORPAY_KEY_ID <<< $keyId
    Write-Host "✓ Set RAZORPAY_KEY_ID" -ForegroundColor Green
}

if (-not $keySecretSet) {
    Write-Host "`nRAZORPAY_KEY_SECRET is not set." -ForegroundColor Yellow
    $keySecret = Read-Host "Paste your Razorpay Key Secret"
    $keySecret = $keySecret.Trim()
    firebase functions:secrets:set RAZORPAY_KEY_SECRET <<< $keySecret
    Write-Host "✓ Set RAZORPAY_KEY_SECRET" -ForegroundColor Green
}

if (-not $webhookSecretSet) {
    Write-Host "`nRAZORPAY_WEBHOOK_SECRET is not set." -ForegroundColor Yellow
    $webhookSecret = Read-Host "Paste your Razorpay Webhook Secret (or press Enter for temp)"
    if ($webhookSecret) {
        $webhookSecret = $webhookSecret.Trim()
        firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET <<< $webhookSecret
    } else {
        firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET <<< "temp-webhook-secret-for-testing"
    }
    Write-Host "✓ Set RAZORPAY_WEBHOOK_SECRET" -ForegroundColor Green
}

# Ask to update if already set
Write-Host "`nUpdate existing secrets? (y/n): " -ForegroundColor Yellow -NoNewline
$updateChoice = Read-Host
if ($updateChoice -eq "y" -or $updateChoice -eq "Y") {
    $newKeyId = Read-Host "New Key ID (leave blank to skip)"
    if ($newKeyId) {
        firebase functions:secrets:set RAZORPAY_KEY_ID <<< $newKeyId.Trim()
        Write-Host "✓ Updated RAZORPAY_KEY_ID" -ForegroundColor Green
    }

    $newKeySecret = Read-Host "New Key Secret (leave blank to skip)"
    if ($newKeySecret) {
        firebase functions:secrets:set RAZORPAY_KEY_SECRET <<< $newKeySecret.Trim()
        Write-Host "✓ Updated RAZORPAY_KEY_SECRET" -ForegroundColor Green
    }

    $newWebhookSecret = Read-Host "New Webhook Secret (leave blank to skip)"
    if ($newWebhookSecret) {
        firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET <<< $newWebhookSecret.Trim()
        Write-Host "✓ Updated RAZORPAY_WEBHOOK_SECRET" -ForegroundColor Green
    }
}

# ============ STEP 5: Deploy ============
Write-Host "`nStep 5: Deploying Cloud Functions..." -ForegroundColor Yellow
firebase deploy --only functions:createSubscription,functions:razorpayWebhook,functions:generateScript,functions:generateRepurposing

Write-Host "✓ Deployment complete" -ForegroundColor Green

# ============ STEP 6: Next Steps ============
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host @"
1. Open a NEW PowerShell window in this folder:

   cd "D:\Project\Project 01\Google Antigravity Files"
   firebase functions:log --only createSubscription

2. Go to https://publishkit.web.app/pricing in your browser

3. Click "Upgrade to Pro" or "Upgrade to Ultra"

4. Watch the PowerShell window for logs. Copy these lines back here:

   [createSubscription] Plan ID:
   [createSubscription] Key ID loaded:
   [createSubscription] Key Secret loaded:
   [createSubscription] ERROR caught: (if any)

From those lines I can tell you the exact fix for the 401 error.
"@ -ForegroundColor Cyan

Write-Host "`n"
