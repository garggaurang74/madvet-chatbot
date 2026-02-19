# Dr. Madvet Assistant

AI-powered veterinary chatbot for **Madvet Animal Healthcare**, built with Next.js 14, TypeScript, OpenAI, and Supabase.

## Setup (local)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   Copy `.env.example` to `.env.local` and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   # Optional: table name (auto-detects products, product, madvet_products, etc. if not set)
   NEXT_PUBLIC_SUPABASE_TABLE=
   OPENAI_API_KEY=sk-...
   ```

3. **Supabase table**
   Table must have columns: `product_name`, `salt`, `dosage` (optional: `packing`, `category`, `species`).
   The app auto-detects your table from common names—no need to rename in Supabase.

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel (GitHub)

1. Push your repo to GitHub. **Never commit `.env.local`** (it's in `.gitignore`).

2. In [Vercel](https://vercel.com), import the repo and add these env vars in **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_TABLE` (optional)
   - `OPENAI_API_KEY`

3. Deploy. Vercel will auto-detect Next.js and build.

## Features

- **Product search**: 3-layer search (fuzzy + Hindi/Hinglish keywords + fallback)
- **Product cache**: Re-fetches from Supabase every 5 minutes
- **Streaming**: Real-time AI responses via OpenAI API
- **Bilingual**: Detects Hindi/Hinglish vs English and responds accordingly
- **Product cards**: Renders product details after AI recommendations

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- OpenAI (gpt-4o)
- Supabase
- fuse.js
- react-markdown
