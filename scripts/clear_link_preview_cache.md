# How to Clear Link Preview Cache

The issue is that iMessage and other platforms cache the Open Graph images. Here's how to force a refresh:

## 1. Facebook Debugger (Clears Facebook/iMessage cache)
1. Go to: https://developers.facebook.com/tools/debug/
2. Enter your URL: `https://aircrew-shuffle.vercel.app`
3. Click "Debug"
4. Click "Scrape Again" to force refresh

## 2. Twitter Card Validator
1. Go to: https://cards-dev.twitter.com/validator
2. Enter your URL: `https://aircrew-shuffle.vercel.app`
3. Click "Preview card"

## 3. LinkedIn Post Inspector
1. Go to: https://www.linkedin.com/post-inspector/
2. Enter your URL: `https://aircrew-shuffle.vercel.app`
3. Click "Inspect"

## 4. Test in iMessage
1. Send the link to yourself in iMessage
2. If it still shows the old image, try:
   - Deleting the conversation and sending again
   - Using a different device
   - Waiting 24-48 hours for cache to clear

## 5. Alternative: Use a different URL
Try sharing: `https://aircrew-shuffle.vercel.app/?v=2` to force a cache refresh

## 6. Check Current Meta Tags
You can verify the current meta tags by viewing the page source or using browser dev tools.
