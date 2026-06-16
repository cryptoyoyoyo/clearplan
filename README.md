# DentalExplain — Patient Treatment Explainer

A web app for dental practices to generate clear, patient-friendly treatment plan explanations using AI.

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Get an Anthropic API key
- Sign up at [console.anthropic.com](https://console.anthropic.com)
- Create an API key
- In Netlify: **Site Settings → Environment Variables**
- Add: `ANTHROPIC_API_KEY` = your key

### 3. Deploy to Netlify
Push to GitHub, then connect in Netlify:
- Build command: `npm run build`
- Publish directory: `build`
- Add the `ANTHROPIC_API_KEY` environment variable

---

## How it works

1. Enter the patient's name (optional) and treatment
2. Choose a reading level — Simple, Standard, or Detailed
3. Add any notes for the AI (e.g. patient anxiety, follow-up instructions)
4. Click Generate
5. Print or save as PDF to hand to the patient

---

## Customisation

- **Practice name**: Update the brand name in `src/App.js`
- **Logo**: Replace the SVG in the `.brand-logo` div in `src/App.js`
- **Colours**: Edit CSS variables in `src/index.css`
- **Quick treatment picks**: Edit the `QUICK_TREATMENTS` array in `src/App.js`
