# vercel-deploy.ps1
# Deploy via Vercel CLI using VERCEL_TOKEN environment variable
# Usage: set VERCEL_TOKEN env or pass through pipeline secrets

param(
  [Parameter(Mandatory=$false)]
  [ValidateSet('preview','production')]
  [string]$target = 'preview'
)

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "Vercel CLI não encontrado. Instalando globalmente (pode requerer Admin)..."
    npm i -g vercel
}

if (-not $env:VERCEL_TOKEN) {
    Write-Error "Variável VERCEL_TOKEN não encontrada. Exporte-a antes de rodar: $env:VERCEL_TOKEN='<token>'"
    exit 1
}

Set-Location -Path (Join-Path $PSScriptRoot '..')

if ($target -eq 'production') {
    vercel --prod --token $env:VERCEL_TOKEN --confirm
} else {
    vercel --token $env:VERCEL_TOKEN --confirm
}
