NEDVIZHIMOST BELARUSI (NBEL) - DEPLOYMENT PACKAGE

Extract this archive before upload. Repository root must contain package.json, Dockerfile, railway.json, cloud.mjs, server.mjs, app/ and scripts/.
Railway: one service, railway.json / Dockerfile. Attach a persistent volume at /data before accepting real leads.
Configure the public HTTPS origin, admin token and optional Telegram notification through private Variables. This archive contains no runtime data or secrets.
Listings, agents, phone numbers and company details in app/data.json are demo content. Replace them before public launch.
Requires Node 24.13+ under 25 (or Docker), persistent storage and HTTPS. Static or PHP-only hosting cannot save leads.
Fonts are self-hosted (SIL OFL 1.1). No external CDNs, trackers or media providers are used.
Run npm test and npm run check-data, then validate the full customer journey after deployment.
