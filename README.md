# Deploy frontend to Vercel

Minimal steps to deploy this Vite + React app to Vercel and connect to the backend:

1. Create a new Project in Vercel and import this repository.
2. Set Environment Variables in Vercel:
   - `VITE_API_URL` = `https://xproducoes-backend.onrender.com` (or your backend URL)
   - Any other secrets (OAuth client ids, feature flags) as Vercel Environment Variables.
3. Build & Output settings: Vercel will run `npm install` and `npm run build` by default.
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy and open the project URL.

Local build test:

```powershell
npm ci
npm run build
npm run preview
```

Notes:
- This project uses `VITE_API_URL` at runtime (prefixed `VITE_` for Vite env exposure).
- If you use a custom domain, update `VITE_API_URL` to the production backend URL.
