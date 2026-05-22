<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your hotel monitoring app

This contains everything you need to run the SkyTrack hotel price monitoring dashboard locally.

View your app in AI Studio: https://ai.studio/apps/drive/1G9hSF7aZ-nIGTcs0bfNmkV2Ptfw3ijsL

## What it does

- Tracks hotel prices across major OTAs (Ctrip, Fliggy, Qunar) with a simulated CDP collection layer.
- Provides compliance notes, rate-limit controls, and fallback strategies.
- Monitors price drops, availability changes, and anomalies in real time.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
