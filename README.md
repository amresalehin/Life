<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/addba705-5f0c-4dd3-a2e0-c92c3c2c4eca

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

Push this project to the `main` branch of the `Life` repository. The included
GitHub Actions workflow builds the Vite app and deploys the generated `dist`
folder to GitHub Pages, so the browser never tries to load the development-only
`src/main.tsx` file.

In the repository, open **Settings → Pages** and set **Source** to
**GitHub Actions**. After the workflow completes, the project site will be
available at `https://amresalehin.github.io/Life/`.

If the repository name changes or you deploy under a custom domain, set
`VITE_BASE_PATH` during the build to the desired path (for example, `/MyRepo/`
or `/`).
