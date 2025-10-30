Write-Host "Waiting 12 seconds for server to start..."
Start-Sleep -Seconds 12

Write-Host "Testing RBAC seed endpoint..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/rbac/admin/seed" `
        -Method POST `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ Success! Status: $($response.StatusCode)"
    Write-Host "Response:"
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.Exception.Response.StatusCode)"
}
