# Claude Code Configuration

## Development Server Commands

### Primary Development Commands
- `npm run dev` - Standard development server with Turbopack and HTTPS
- `npm run dev:fast` - **FASTEST** development server (skips linting for maximum speed)
- `npm run dev:debug` - Development server with Node.js debugging enabled

### Performance Optimized Scripts
- `npm run build:analyze` - Build with bundle analyzer
- `npm run clean` - Clear Next.js cache and build artifacts  
- `npm run reset` - Full clean + reinstall dependencies

### Linting & Type Checking
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Performance Notes
- Use `npm run dev:fast` for fastest startup and hot reload
- The project has been optimized with:
  - Auth service caching (15min localStorage)
  - Lazy-loaded chart components
  - Bundle splitting for heavy libraries
  - Filesystem caching enabled

## Environment Variables
Copy `.env.example` to `.env.local` and configure:
- Supabase credentials
- Claude API key
- Development optimizations (NEXT_TELEMETRY_DISABLED=1, etc.)