npx next dev --turbo

npm run dev:worker

$env:OPENNEXT_SKIP_CACHE_POPULATE="1"; npx wrangler deploy

$env:OPENNEXT_SKIP_CACHE_POPULATE="true"; npx opennextjs-cloudflare build; npx opennextjs-cloudflare deploy
