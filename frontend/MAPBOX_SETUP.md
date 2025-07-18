# 🗺️ Mapbox Setup Guide

The Interactive Driver Map component requires a valid Mapbox access token to function. Follow these steps to set it up:

## Quick Setup

### 1. Get a Mapbox Account
- Visit [mapbox.com](https://account.mapbox.com) 
- Sign up for a free account (includes 50,000 free map loads per month)

### 2. Generate an Access Token
- Go to your [Mapbox Account Tokens page](https://account.mapbox.com/access-tokens/)
- Click "Create a token"
- Give it a name like "LogiTrack Development"
- Leave the default scopes (they include what we need)
- Click "Create token"
- Copy the token (starts with `pk.`)

### 3. Add Token to Environment Variables
- Open `frontend/.env.local`
- Replace the demo token:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_actual_token_here
```

### 4. Restart Development Server
```bash
cd frontend
npm run dev
```

## Demo Mode Fallback

If no valid token is configured, the app automatically switches to **Demo Mode** which shows:
- ✅ Simulated driver markers with real-time updates
- ✅ Interactive popups and status indicators  
- ✅ All UI functionality working
- ✅ Perfect for testing and development

## Token Scopes Required

The default token includes these scopes (all we need):
- `styles:read` - Load map styles
- `fonts:read` - Load map fonts  
- `sprites:read` - Load map icons
- `datasets:read` - Read map data
- `vision:read` - Computer vision features

## Troubleshooting

**"Invalid token" error?**
- Ensure token starts with `pk.`
- Check token is copied completely
- Verify token is active in Mapbox dashboard

**Map not loading?**
- Check browser console for errors
- Verify `.env.local` file exists in `frontend/` directory
- Restart development server after token changes

**Demo mode stuck?**
- Clear browser cache and reload
- Check environment variable is set correctly
- Verify token doesn't contain "demo" in the name

## Free Tier Limits

Mapbox free tier includes:
- 50,000 map loads/month
- 500,000 direction API requests
- 50,000 geocoding requests

Perfect for development and small deployments!

## Production Notes

For production:
- Use a production-specific token
- Set up token rotation if needed
- Monitor usage in Mapbox dashboard
- Consider upgrading plan for higher usage