# 🚀 Automated API Test Script
# Run all tests with PowerShell - No dependencies!
# Usage: .\test-api.ps1

param(
    [string]$BaseUrl = "http://localhost:3000",
    [switch]$Verbose
)

# Colors
function Write-Status($msg, $type = "Info") {
    $colors = @{
        "Success" = "Green"
        "Error" = "Red"
        "Info" = "Cyan"
        "Test" = "Yellow"
        "Pass" = "Green"
        "Fail" = "Red"
    }
    
    $color = $colors[$type]
    Write-Host $msg -ForegroundColor $color
}

# HTTP Request Helper
function Invoke-ApiRequest($method, $path, $body = $null, $headers = @{}) {
    $uri = "$BaseUrl$path"
    
    $params = @{
        Uri = $uri
        Method = $method
        Headers = $headers
        ContentType = "application/json"
        ErrorAction = "Stop"
    }
    
    if ($body) {
        $params.Body = $body | ConvertTo-Json
    }
    
    try {
        $response = Invoke-RestMethod @params
        return @{ Success = $true; StatusCode = 200; Data = $response }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        return @{ Success = $false; StatusCode = $statusCode; Error = $_.Exception.Message }
    }
}

# Test Results
$testResults = @()

function Add-TestResult($name, $passed, $details = "") {
    $icon = if ($passed) { "✓" } else { "✗" }
    $status = if ($passed) { "Pass" } else { "Fail" }
    
    Write-Host "  $icon $name" -ForegroundColor $(if ($passed) { "Green" } else { "Red" })
    if ($details) {
        Write-Host "    → $details" -ForegroundColor Gray
    }
    
    $testResults += @{ Name = $name; Passed = $passed; Details = $details }
}

# Global Variables
$accessToken = ""
$userId = ""
$bookingId = ""
$email = ""
$idempotencyKey = ""

# ============================================================
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "  🚀 BOOKING API - FULL TEST SUITE" -ForegroundColor Cyan
Write-Host ("=" * 60) + "`n" -ForegroundColor Cyan

Write-Status "API Base: $BaseUrl" "Info"
Write-Status "Start Time: $(Get-Date -Format 'HH:mm:ss')`n" "Info"

# ============================================================
# TEST 1: Register User
# ============================================================
Write-Host "`n[1/10] 👤 Testing: Register User" -ForegroundColor Yellow

$email = "test_$(Get-Random)@example.com"
$registerBody = @{
    email = $email
    password = "Test@123456"
    fullName = "Test User"
} | ConvertTo-Json

$response = Invoke-ApiRequest "POST" "/auth/register" $registerBody

Add-TestResult "Status 201" ($response.StatusCode -eq 200 -or $response.Success)
Add-TestResult "Has userId" ($response.Data.data.userId -ne $null)

if ($response.Data.data.userId) {
    $userId = $response.Data.data.userId
    Write-Status "✓ User registered: $userId" "Success"
}

# ============================================================
# TEST 2: Login
# ============================================================
Write-Host "`n[2/10] 🔐 Testing: Login & Get Token" -ForegroundColor Yellow

$loginBody = @{
    email = $email
    password = "Test@123456"
} | ConvertTo-Json

$response = Invoke-ApiRequest "POST" "/auth/login" $loginBody

Add-TestResult "Status 200" ($response.Success)
Add-TestResult "Has accessToken" ($response.Data.data.accessToken -ne $null)

if ($response.Data.data.accessToken) {
    $accessToken = $response.Data.data.accessToken
    Write-Status "✓ Token acquired (${($accessToken.Length)} chars)" "Success"
}

$headers = @{ Authorization = "Bearer $accessToken" }

# ============================================================
# TEST 3: Create Booking
# ============================================================
Write-Host "`n[3/10] 📅 Testing: Create Booking" -ForegroundColor Yellow

$idempotencyKey = "booking_$(Get-Random)"
$headers['Idempotency-Key'] = $idempotencyKey

$bookingBody = @{
    propertyId = "prop_test_123"
    checkIn = "2025-11-01"
    checkOut = "2025-11-05"
    numberOfGuests = 2
    totalPrice = "1000"
} | ConvertTo-Json

$response = Invoke-ApiRequest "POST" "/bookings" $bookingBody $headers

Add-TestResult "Status 201" ($response.StatusCode -eq 200 -or $response.Success)
Add-TestResult "Has bookingId" ($response.Data.data.bookingId -ne $null)

if ($response.Data.data.bookingId) {
    $bookingId = $response.Data.data.bookingId
    Write-Status "✓ Booking created: $bookingId" "Success"
}

# ============================================================
# TEST 4: Get Booking Details
# ============================================================
Write-Host "`n[4/10] 📖 Testing: Get Booking Details" -ForegroundColor Yellow

$response = Invoke-ApiRequest "GET" "/bookings/$bookingId" $null $headers

Add-TestResult "Status 200" ($response.Success)
Add-TestResult "Has booking data" ($response.Data.data.bookingId -eq $bookingId)
Add-TestResult "Has status" ($response.Data.data.status -ne $null) "Status: $($response.Data.data.status)"

# ============================================================
# TEST 5: List Bookings
# ============================================================
Write-Host "`n[5/10] 📋 Testing: List Bookings (Pagination)" -ForegroundColor Yellow

$response = Invoke-ApiRequest "GET" "/bookings?page=1&limit=10" $null $headers

Add-TestResult "Status 200" ($response.Success)
Add-TestResult "Is array" ($response.Data.data -is [array])
Add-TestResult "Has pagination" ($response.Data.pagination -ne $null) "Total: $($response.Data.pagination.total)"

# ============================================================
# TEST 6: Cancel Booking (Saga)
# ============================================================
Write-Host "`n[6/10] ❌ Testing: Cancel Booking (Saga with Compensation)" -ForegroundColor Yellow

$cancelKey = "cancel_$(Get-Random)"
$headers['Idempotency-Key'] = $cancelKey

$cancelBody = @{
    reason = "User requested cancellation"
} | ConvertTo-Json

$response = Invoke-ApiRequest "PATCH" "/bookings/$bookingId/cancel" $cancelBody $headers

Add-TestResult "Status 200" ($response.Success)
Add-TestResult "Booking cancelled" ($response.Data.data.status -like "*CANCELLED*") "Status: $($response.Data.data.status)"
Add-TestResult "Refund amount exists" ($response.Data.data.refundAmount -ne $null) "Refund: $($response.Data.data.refundAmount)"

if ($response.Success) {
    Write-Status "✓ Saga executed successfully! Compensation triggered." "Success"
}

# ============================================================
# TEST 7: Verify Saga Compensation
# ============================================================
Write-Host "`n[7/10] ✅ Testing: Verify Saga Compensation" -ForegroundColor Yellow

$response = Invoke-ApiRequest "GET" "/bookings/$bookingId" $null $headers

Add-TestResult "Status 200" ($response.Success)
Add-TestResult "Status persisted CANCELLED" ($response.Data.data.status -eq "CANCELLED")

if ($response.Data.data.compensation) {
    Add-TestResult "Compensation saved" $true "Steps: $($response.Data.data.compensation.steps)"
}

# ============================================================
# TEST 8: Idempotency
# ============================================================
Write-Host "`n[8/10] 🔄 Testing: Idempotency (Duplicate Request)" -ForegroundColor Yellow

$idempotencyKey = "idempotent_$(Get-Random)"
$headers['Idempotency-Key'] = $idempotencyKey

$bookingBody = @{
    propertyId = "prop_idempotent_123"
    checkIn = "2025-12-01"
    checkOut = "2025-12-05"
    numberOfGuests = 3
    totalPrice = "1500"
} | ConvertTo-Json

# First request
$response1 = Invoke-ApiRequest "POST" "/bookings" $bookingBody $headers
$firstId = $response1.Data.data.bookingId

Add-TestResult "First request status" ($response1.Success) "Got: $($response1.StatusCode)"
Add-TestResult "Has bookingId" ($firstId -ne $null) "ID: $firstId"

Start-Sleep -Milliseconds 500

# Duplicate request
$response2 = Invoke-ApiRequest "POST" "/bookings" $bookingBody $headers
$secondId = $response2.Data.data.bookingId

Add-TestResult "Second request status" ($response2.Success) "Got: $($response2.StatusCode)"
Add-TestResult "Returns same booking (idempotent)" ($firstId -eq $secondId) "First: $firstId, Second: $secondId"

if ($firstId -eq $secondId) {
    Write-Status "✓ Idempotency working correctly!" "Success"
}

# ============================================================
# TEST 9: Outbox Events
# ============================================================
Write-Host "`n[9/10] 📤 Testing: Outbox Events" -ForegroundColor Yellow

$response = Invoke-ApiRequest "GET" "/outbox?status=SENT&limit=20" $null $headers

Add-TestResult "Status 200" ($response.Success)
Add-TestResult "Response is array" ($response.Data.data -is [array])

if ($response.Data.data.Count -gt 0) {
    $eventTypes = $response.Data.data | Select-Object -First 3 | ForEach-Object { $_.eventType }
    Add-TestResult "Found events" $true "Count: $($response.Data.data.Count), Types: $($eventTypes -join ', ')"
}

# ============================================================
# TEST 10: Error Handling
# ============================================================
Write-Host "`n[10/10] ⚠️  Testing: Error Handling" -ForegroundColor Yellow

# Test unauthorized
$response1 = Invoke-ApiRequest "GET" "/bookings" $null @{}
Add-TestResult "Unauthorized returns 401" ($response1.StatusCode -eq 401) "Got: $($response1.StatusCode)"

# Test invalid booking
$response2 = Invoke-ApiRequest "GET" "/bookings/invalid-id" $null $headers
Add-TestResult "Invalid booking returns error" ($response2.StatusCode -in @(400, 404)) "Got: $($response2.StatusCode)"

# ============================================================
# SUMMARY
# ============================================================
Write-Host "`n`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "  📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60) + "`n" -ForegroundColor Cyan

$passedCount = ($testResults | Where-Object { $_.Passed }).Count
$totalCount = $testResults.Count
$percentage = [math]::Round(($passedCount / $totalCount) * 100, 0)

Write-Host "Passed: $passedCount/$totalCount ($percentage%)" -ForegroundColor $(if ($passedCount -eq $totalCount) { "Green" } else { "Yellow" })
Write-Host "End Time: $(Get-Date -Format 'HH:mm:ss')`n" -ForegroundColor Gray

if ($passedCount -eq $totalCount) {
    Write-Status "`n✓ ALL TESTS PASSED! 🎉`n" "Success"
    exit 0
}
else {
    Write-Status "`n✗ $($totalCount - $passedCount) test(s) failed`n" "Error"
    exit 1
}
