#!/usr/bin/env pwsh

Write-Host "⏳ Waiting for server to start..." -ForegroundColor Cyan

# Wait for server to be ready (max 30 seconds)
$maxAttempts = 30
$attempt = 0
$serverReady = $false

while ($attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -ErrorAction SilentlyContinue -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $serverReady = $true
            break
        }
    } catch {
        # Server not ready yet
    }
    
    $attempt++
    Start-Sleep -Seconds 1
    Write-Host "." -NoNewline -ForegroundColor Cyan
}

if (-not $serverReady) {
    Write-Host ""
    Write-Host "❌ Server failed to start after 30 seconds" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Server is ready!" -ForegroundColor Green
Write-Host ""

# Test 1: Seed RBAC
Write-Host "🌱 Test 1: Seeding RBAC data..." -ForegroundColor Yellow
$seedResponse = Invoke-RestMethod -Uri "http://localhost:3000/rbac/admin/seed" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -ErrorAction SilentlyContinue

if ($seedResponse) {
    Write-Host "✅ Seed successful: $($seedResponse.message)" -ForegroundColor Green
} else {
    Write-Host "❌ Seed failed" -ForegroundColor Red
}

Write-Host ""

# Test 2: Create user
Write-Host "👤 Test 2: Creating test user..." -ForegroundColor Yellow
$userPayload = @{
    email    = "test@example.com"
    password = "Test@123456"
    name     = "Test User"
} | ConvertTo-Json

$userResponse = Invoke-RestMethod -Uri "http://localhost:3000/users" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $userPayload `
    -ErrorAction SilentlyContinue

if ($userResponse.id) {
    Write-Host "✅ User created: $($userResponse.id)" -ForegroundColor Green
} else {
    Write-Host "❌ User creation failed" -ForegroundColor Red
    Write-Host "$userResponse" -ForegroundColor Red
}

Write-Host ""

# Test 3: Login
Write-Host "🔐 Test 3: Login to get JWT token..." -ForegroundColor Yellow
$loginPayload = @{
    email    = "test@example.com"
    password = "Test@123456"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" `
    -Method POST `
    -Headers @{ "Content-Type" = "application/json" } `
    -Body $loginPayload `
    -ErrorAction SilentlyContinue

if ($loginResponse.access_token) {
    $jwt = $loginResponse.access_token
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "   Token: $($jwt.Substring(0, 20))..." -ForegroundColor Gray
} else {
    Write-Host "❌ Login failed" -ForegroundColor Red
    Write-Host "$loginResponse" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 4: Access protected endpoint (GET /bookings)
Write-Host "📚 Test 4: Testing protected endpoint (GET /bookings)..." -ForegroundColor Yellow
try {
    $bookingsResponse = Invoke-RestMethod -Uri "http://localhost:3000/bookings" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $jwt" } `
        -ErrorAction SilentlyContinue

    Write-Host "✅ Access granted to GET /bookings" -ForegroundColor Green
    Write-Host "   Count: $($bookingsResponse.Count ?? $bookingsResponse.data.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Access denied or error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Try to access endpoint without permission (POST /bookings/:id/refund)
Write-Host "🚫 Test 5: Testing permission denial (POST /bookings/1/refund)..." -ForegroundColor Yellow
try {
    $refundResponse = Invoke-RestMethod -Uri "http://localhost:3000/bookings/1/refund" `
        -Method POST `
        -Headers @{ "Authorization" = "Bearer $jwt" } `
        -ErrorAction SilentlyContinue

    Write-Host "⚠️  Unexpected success (may indicate permission not checked)" -ForegroundColor Yellow
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse.StatusCode -eq "Forbidden") {
        Write-Host "✅ Permission correctly denied (403 Forbidden)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Got status: $($errorResponse.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test 6: Invalid request (should show structured error)
Write-Host "🔍 Test 6: Testing error structure (invalid booking ID)..." -ForegroundColor Yellow
try {
    $invalidResponse = Invoke-RestMethod -Uri "http://localhost:3000/bookings/invalid-id" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $jwt" } `
        -ErrorAction SilentlyContinue

    Write-Host "⚠️  Got unexpected response" -ForegroundColor Yellow
} catch {
    $errorResponse = $_.Exception.Response
    $statusCode = [int]$errorResponse.StatusCode
    
    if ($statusCode -in (400, 404)) {
        Write-Host "✅ Got error response ($statusCode)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Got status: $statusCode" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ RBAC Testing Complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Check server logs for any errors" -ForegroundColor Gray
Write-Host "2. Test rate limiting by sending multiple requests" -ForegroundColor Gray
Write-Host "3. Check Redis cache performance" -ForegroundColor Gray
Write-Host "4. Review error response structures" -ForegroundColor Gray
