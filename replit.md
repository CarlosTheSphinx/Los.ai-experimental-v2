# Loan Pricing White-Label Tool

## Overview

This is a white-label loan pricing application for Sphinx Capital that allows sales representatives to input loan details through a clean interface. The system automates form submission to an external pricing provider using Apify's Puppeteer scraper, returning interest rates without exposing the provider's website to end users.

The application consists of a React frontend for loan data entry, an Express backend that orchestrates pricing requests, and PostgreSQL for persisting quotes and request logs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for page transitions
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

The frontend uses a left sidebar navigation (Shadcn Sidebar) with three main pages:
1. New Quote (/) - Loan pricing form with real-time LTV/DSCR calculations
2. Saved Quotes (/quotes) - View and manage saved pricing quotes with document status tracking
3. Agreements (/agreements) - Comprehensive agreement management with:
   - Filter tabs (All, Drafts, Sent, In Progress, Completed, Voided)
   - Search functionality
   - Actions dropdown (Resend, Remind, Edit & Resend, Void, Delete)
   - Click-through to agreement detail page

4. Agreement Detail (/agreements/:id) - Full document view with:
   - PDF viewer with page navigation and zoom
   - Field overlays showing signature positions
   - Signers panel with status and resend options
   - Document timeline (created, sent, completed, voided)
   - Actions (Resend All, Send Reminder, Void Document)

The signing page (/sign/:token) is rendered outside the sidebar layout for a focused signing experience.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Pattern**: REST endpoints defined in `shared/routes.ts`
- **Validation**: Zod schemas shared between frontend and backend
- **Authentication**: JWT tokens in httpOnly cookies with bcrypt password hashing

Key backend files:
- `server/routes.ts` - API endpoint handlers
- `server/storage.ts` - Database operations via Drizzle
- `server/db.ts` - Database connection setup
- `server/auth.ts` - Authentication utilities (password hashing, JWT generation/verification)
- `server/email.ts` - Email service for password reset notifications

### Authentication System
Multi-tenant authentication with complete data isolation:
- **Password Security**: bcrypt with 10 salt rounds
- **Session Management**: JWT tokens in httpOnly cookies with 7-day expiration
- **Cookie Settings**: secure=true in production, sameSite='lax'
- **Data Isolation**: All database queries filter by user_id

Auth Routes (Public):
- POST `/api/auth/register` - Register new user (accepts firstName/lastName or fullName)
- POST `/api/auth/login` - Login with email/password
- POST `/api/auth/logout` - Logout and clear session cookie
- GET `/api/auth/me` - Get current authenticated user
- POST `/api/auth/forgot-password` - Request password reset email
- POST `/api/auth/reset-password` - Reset password with token

Protected Routes (require authentication):
- All `/api/quotes/*` endpoints
- All `/api/documents/*` endpoints
- All `/api/esignature/agreements/*` endpoints
- All `/api/signers/*` and `/api/fields/*` endpoints

Public Routes (token-based or no auth):
- `/sign/:token` - Document signing page (uses signing token, not user auth)
- `/api/sign/:token` - Get signing data by token
- `/api/sign/:token/complete` - Complete document signing

Frontend Auth Components:
- `client/src/hooks/use-auth.tsx` - AuthContext and useAuth hook
- `client/src/pages/login.tsx` - Login page
- `client/src/pages/register.tsx` - Registration page
- `client/src/pages/forgot-password.tsx` - Password reset request
- `client/src/pages/reset-password.tsx` - Password reset completion

### External Automation
The core pricing functionality uses Apify's Puppeteer Scraper actor to:
1. Navigate to the pricing provider's website
2. Fill in loan form fields programmatically
3. Extract the resulting interest rate
4. Return results to the frontend

### Data Flow
1. User fills loan form on frontend
2. Form data validated with Zod schema
3. Backend triggers Apify actor with loan parameters
4. Puppeteer script fills external form and scrapes result
5. Interest rate returned to user
6. User can save quote with customer details and commission calculations

### Database Schema
Tables defined in `shared/schema.ts`:
- `users` - User accounts with authentication fields (email, passwordHash, fullName, passwordResetToken)
- `pricing_requests` - Logs all pricing API requests with status
- `saved_quotes` - Stores saved quotes with customer info, loan data, and commission calculations (user_id foreign key)
- `documents` - E-signature documents with status tracking (draft/sent/in_progress/completed/voided) (user_id foreign key)
  - Fields: sentAt, completedAt, voidedAt, voidedReason for timeline tracking
- `signers` - Document signers with email, token, status, and lastReminderSent
- `document_fields` - Signature/form fields positioned on document pages
- `audit_logs` - Tracks all document actions for compliance

Note: `saved_quotes` and `documents` have `user_id` foreign keys with CASCADE delete to ensure data isolation.

## External Dependencies

### Third-Party Services
- **Apify**: Cloud-based web scraping platform running Puppeteer scripts
- **PostgreSQL**: Primary database (requires DATABASE_URL environment variable)

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `APIFY_TOKEN` - API token for Apify client (has fallback in code)
- `JWT_SECRET` - Secret key for JWT token signing (required for production)
- `SESSION_SECRET` - Secret for session management

### Key NPM Packages
- `apify-client` - Apify API integration
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `@tanstack/react-query` - Async state management
- `framer-motion` - Animation library
- `connect-pg-simple` - Session storage (available but may not be in use)