Assistant deploy helpers

1) GitHub Actions workflow
- File: .github/workflows/assistant-deploy.yml
- Purpose: executar build e deploy via Vercel usando o secret VERCEL_TOKEN.
- To run: go to Actions -> Assistant Deploy (manual) -> Run workflow -> choose target (preview|production)

2) Local deploy script (PowerShell)
- File: frontend/ci/vercel-deploy.ps1
- Usage:
  # set token in current session
  $env:VERCEL_TOKEN = '<your-vercel-token>'
  # preview deploy
  .\vercel-deploy.ps1 -target preview
  # production deploy
  .\vercel-deploy.ps1 -target production

Notes:
- You need a Vercel token. Create one in Vercel Dashboard -> Account -> Tokens.
- The GitHub Actions workflow requires adding the token as a repository secret named VERCEL_TOKEN.
