# Test Vercel deploy locally
# Usage: .\test-vercel-deploy.ps1 -token <your-token> -target preview|production

param(
    [Parameter(Mandatory=$true)]
    [string]$token,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('preview', 'production')]
    [string]$target = 'preview'
)

Write-Host "Testing Vercel deploy with token: $($token.Substring(0,8))..." -ForegroundColor Cyan

$env:VERCEL_TOKEN = $token

Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
npm ci

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm ci failed" -ForegroundColor Red
    exit 1
}

Write-Host "`nBuilding..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: build failed" -ForegroundColor Red
    exit 1
}

Write-Host "`nDeploying to Vercel ($target)..." -ForegroundColor Yellow

if ($target -eq 'production') {
    npx vercel --token $env:VERCEL_TOKEN --prod --confirm
} else {
    npx vercel --token $env:VERCEL_TOKEN --confirm
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeploy SUCCESS!" -ForegroundColor Green
} else {
    Write-Host "`nDeploy FAILED" -ForegroundColor Red
    exit 1
}
