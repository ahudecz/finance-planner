# Finance Planner

A modern personal finance planning application built with Next.js and TypeScript. This app helps users track expenses, set budgets, plan investments, and visualize their financial goals with an intuitive and responsive interface.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Development Scripts

```bash
# Development
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run typecheck    # TypeScript type checking
npm run format       # Format code with Prettier
npm run format:check # Check Prettier formatting
```

Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Database**: Supabase
- **State Management**: TanStack Query (React Query)
- **Validation**: Zod
- **Icons**: Lucide React
- **Utilities**: clsx, tailwind-merge
- **Code Quality**: ESLint, Prettier
- **Font**: Geist (optimized with `next/font`)

## Project Structure

```
src/
├── app/          # App Router pages and layouts
├── components/   # Reusable UI components
└── lib/          # Utility functions and configurations
```

You can start editing by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Environment Setup

### Supabase Configuration

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy your project URL and anon public key
4. Create `.env.local` from the example file:
   ```bash
   cp .env.local.example .env.local
   ```
5. Add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

**Security Note**: Only use the anon public key in `NEXT_PUBLIC_*` variables. Never expose service role keys on the client side.

6. **Set up the database schema**:
   - Follow the instructions in [`db/README.md`](./db/README.md)
   - Run the initial migration via Supabase SQL Editor
   - Create the `exports` storage bucket

### Health Check

Test your setup by visiting: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## API Endpoints

### Enrichment Services

**POST /api/enrich/org-size** - Organization Size Enrichment
- **Input**: `{ company: Company }`
- **Output**: `{ sizeBand: OrgSize, source: "linkedin"|"web"|"none", notes?: string }`
- **Status**: MVP stub implementation (returns "Unknown" with logging)
- **Security**: All enrichment happens server-side, no secrets exposed to client

**MVP Note**: Company enrichment is currently stubbed and returns "Unknown" size bands. The infrastructure is in place for future implementation of:
- LinkedIn company page parsing for employee counts
- Domain analysis and public database queries  
- Background agent integration for automated enrichment
- Caching and rate limiting for production use

The "Find size" button in the company form will call this endpoint but won't update the size field until real enrichment is implemented.
