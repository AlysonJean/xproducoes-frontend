# update-lockfile.ps1
# Executar na pasta d:\agora vai\frontend
# Este script instala dependências (npm install) e commita o package-lock.json atualizado.

Write-Host "Atualizando lockfile e instalando dependências..."
cd $PSScriptRoot\..\

# Parar possíveis processos node
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.Id -Force }

# Remover node_modules problemático (opcional)
if (Test-Path "node_modules") {
    Write-Host "Removendo node_modules..."
    Remove-Item -LiteralPath node_modules -Recurse -Force -ErrorAction SilentlyContinue
}

# Instalar dependências (vai gerar/atualizar package-lock.json)
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install falhou. Verifique logs e execute manualmente."
    exit $LASTEXITCODE
}

# Commit do package-lock.json e package.json alterados
Write-Host "Adicionando package-lock.json e package.json ao git e realizando commit..."

git add package-lock.json package.json
git commit -m "chore(frontend): atualizar lockfile para incluir vite-tsconfig-paths e suportar aliases"

Write-Host "Pronto. Faça push com: git push origin main"