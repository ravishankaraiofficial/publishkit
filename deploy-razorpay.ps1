# Razorpay Deployment & Diagnostic Script (PowerShell 5.1 - Windows-safe)
# Sets up secrets, builds, deploys, and prints a smoke-test runbook.
#
# Usage:  .\deploy-razorpay.ps1
#
# Pure ASCII content - PowerShell 5.1 mis-reads UTF-8 multi-byte chars
# without a BOM, which breaks string parsing. No em dashes, no smart
# quotes, no Unicode anywhere in this file.

# Do NOT set $ErrorActionPreference to "Stop". Firebase CLI writes progress
# messages to stderr which PS 5.1 turns into terminating NativeCommandError
# under strict mode. We use explicit $LASTEXITCODE checks instead.
$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Razorpay Integration Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============ STEP 1: Check Firebase CLI ============
Write-Host "Step 1: Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseVersion = (firebase --version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or -not $firebaseVersion) {
    Write-Host "ERROR: Firebase CLI not found. Install with: npm i -g firebase-tools" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Firebase CLI found: $firebaseVersion" -ForegroundColor Green

# Active project - read .firebaserc directly to avoid firebase CLI stderr noise.
if (Test-Path ".firebaserc") {
    $rcContent = Get-Content ".firebaserc" -Raw
    if ($rcContent -match '"default"\s*:\s*"([^"]+)"') {
        Write-Host "[OK] Active project (from .firebaserc): $($Matches[1])" -ForegroundColor Green
    } else {
        Write-Host "[!] .firebaserc found but no default project" -ForegroundColor Yellow
    }
} else {
    Write-Host "[!] No .firebaserc. Run: firebase use PROJECT_ID" -ForegroundColor Yellow
}

# ============ STEP 2: Build Functions ============
Write-Host ""
Write-Host "Step 2: Building Cloud Functions..." -ForegroundColor Yellow
Push-Location functions
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Functions build failed"
    }
    Write-Host "[OK] Functions built successfully" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Build failed. Check functions/src/ for TypeScript errors." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# ============ STEP 3: Set / Update Secrets ============
Write-Host ""
Write-Host "Step 3: Setting Razorpay secrets..." -ForegroundColor Yellow
Write-Host "(Existing secrets are listed. You will be asked before any change.)" -ForegroundColor DarkGray
Write-Host ""

# List existing secrets once
$existingList = firebase functions:secrets:list 2>&1 | Out-String

function Set-RazorpaySecret {
    param(
        [string]$Name,
        [string]$Hint
    )

    $alreadySet = $existingList -match $Name
    if ($alreadySet) {
        Write-Host "  $Name : already set" -ForegroundColor Green
        $update = Read-Host "    Update? (y/N)"
        if ($update -ne "y" -and $update -ne "Y") {
            return
        }
    } else {
        Write-Host "  $Name : not set" -ForegroundColor Yellow
    }

    Write-Host "    Hint: $Hint" -ForegroundColor DarkGray
    $secureValue = Read-Host "    Paste value (input hidden)" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

    if ([string]::IsNullOrWhiteSpace($plain)) {
        Write-Host "    Skipped (empty value)" -ForegroundColor DarkGray
        return
    }

    # Trim whitespace (catches trailing newlines from paste) and pipe via STDIN.
    $cleaned = $plain.Trim()
    Write-Host "    Value length after trim: $($cleaned.Length) chars" -ForegroundColor DarkGray
    $cleaned | firebase functions:secrets:set $Name --data-file=-

    if ($LASTEXITCODE -eq 0) {
        Write-Host "    [OK] $Name set" -ForegroundColor Green
    } else {
        Write-Host "    [FAIL] $Name not set (exit code $LASTEXITCODE)" -ForegroundColor Red
    }
}

Set-RazorpaySecret -Name "RAZORPAY_KEY_ID"         -Hint "Live key starts with rzp_live_  (test starts with rzp_test_)"
Set-RazorpaySecret -Name "RAZORPAY_KEY_SECRET"     -Hint "Live key secret, exactly 24 chars"
Set-RazorpaySecret -Name "RAZORPAY_WEBHOOK_SECRET" -Hint "Secret you set when registering the webhook URL on the live dashboard"

# ============ STEP 4: Deploy ============
Write-Host ""
Write-Host "Step 4: Deploying Razorpay Cloud Functions..." -ForegroundColor Yellow
firebase deploy --only functions:createSubscription,functions:razorpayWebhook
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Functions deploy failed." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Deploy complete" -ForegroundColor Green

# ============ STEP 5: Smoke-Test Runbook ============
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Live Smoke Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. In a NEW PowerShell window run:" -ForegroundColor Cyan
Write-Host "     firebase functions:log --only createSubscription,razorpayWebhook" -ForegroundColor White
Write-Host ""
Write-Host "2. Open https://publishkit.web.app/pricing as a signed-in non-Pro user." -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Click Upgrade on the Pro card. The Razorpay modal should say" -ForegroundColor Cyan
Write-Host "   'PublishKit Pro' and Rs.299/month. Complete with a real card you own." -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Within ~10 seconds the log window should show:" -ForegroundColor Cyan
Write-Host "     [createSubscription] Success! Subscription ID: sub_..." -ForegroundColor White
Write-Host "     subscription.activated event received (from razorpayWebhook)" -ForegroundColor White
Write-Host ""
Write-Host "5. Reload /pricing. Pro card should show 'Current Plan'. Navbar pill 'Pro'." -ForegroundColor Cyan
Write-Host ""
Write-Host "6. Refund the test payment from the Razorpay dashboard if desired." -ForegroundColor Cyan
Write-Host ""
