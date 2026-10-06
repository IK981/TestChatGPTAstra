# Ready-to-play downloads

- [Download the standalone game](https://github.com/IK981/TestChatGPTAstra/raw/refs/heads/main/downloads/apex-game.html): save the HTML file and open it in a modern browser on your computer. No installation required.
- [Download the website ZIP](https://github.com/IK981/TestChatGPTAstra/raw/refs/heads/main/downloads/apex-website.zip): upload this archive to a static website host, such as [Netlify Drop](https://app.netlify.com/drop), to get a public game URL. The archive contains `index.html` at its root.

If GitHub shows a file page instead of downloading, use **Download raw file**. Sign in to GitHub if the repository requires it.

These packages were generated from the repository source. Run `npm ci` and `npm run export` to regenerate the standalone HTML in `release/`. The production website files are in `dist/`; ZIP that directory's contents with `index.html` at the archive root.
