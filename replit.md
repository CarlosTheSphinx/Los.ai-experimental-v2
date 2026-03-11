# Loan Pricing White-Label Tool

## Overview
This project is a white-label loan pricing application for Sphinx Capital. Its primary purpose is to automate loan pricing, improve sales efficiency, and manage the entire loan lifecycle from quotes to agreements and closing. The platform aims to integrate external pricing providers while safeguarding proprietary data, providing robust internal administration tools, and offering a smooth borrower experience to streamline loan origination and management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application is built with a modern web stack: React 18 with TypeScript for the frontend, Express.js with TypeScript for the backend, and PostgreSQL with Drizzle ORM for data persistence.

**Frontend:**
-   **Technology Stack**: React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS (shadcn/ui), Framer Motion, React Hook Form with Zod, Vite.
-   **Key Features**: Comprehensive loan pricing forms, quote/agreement management (PDF generation, e-signatures), multi-stage deal/loan management, a dedicated borrower portal, a borrower quote flow, and an admin back office with dashboards, user management, and loan program configuration. Includes onboarding wizards, a customizable quote form builder, and an AI-powered Commercial Deal Submission Module.
-   **UI/UX**: Adheres to a "Pipeline Design System" for consistent aesthetics, supporting List, Board (Kanban), and Compact views. Typography uses Cormorant Garamond for display, Playfair Display for public body text, and DM Sans for UI elements.
-   **Dynamic Forms**: `DynamicQuoteForm` component renders forms based on JSON configurations, supporting various field types, conditional visibility, and Zod validation.

**Backend:**
-   **Technology Stack**: Express.js, TypeScript, Drizzle ORM, RESTful API, Zod for validation.
-   **Core Functionality**: JWT-based authentication with Google OAuth 2.0, multi-tenant architecture, user role differentiation, deal-linked messaging, automated notifications, and orchestration of external pricing requests.
-   **Security**: Implements SOC 2 compliance features including account lockout, immutable audit logging, password management, JWT invalidation, PII encryption, and Content-Security-Policy. Includes SOC 2-compliant API Key Management and Webhook System.

**Database Schema Highlights**: Manages users, pricing requests, quotes, documents, e-signatures, audit logs, projects (deals), tasks, activities, system settings, partners, loan programs, message threads, and commercial loan submissions.

**Key Architectural Decisions:**
-   **Multi-Tenancy**: Ensures full data isolation using `tenantId`.
-   **Google Drive Integration**: Automates folder creation and document synchronization per project.
-   **Multi-Property Support**: Handles multiple properties per loan.
-   **Program-to-Deal Sync**: Non-destructive propagation of loan program template changes to existing deals.
-   **Unified Checklist System**: Provides a single source of truth for checklists with role-based filtering.
-   **AI Integration**: Features an AI Draft Messages Panel, a Deal Memory System for persistent context, and an "Auto Process Pipeline" for AI-powered document and communication generation. AI Reviews tab for document review, draft messages, and risk flags.
-   **Gmail Integration**: Opt-in email integration for syncing threads, messages, and attachments with an in-app inbox.
-   **Dynamic Deal Details**: Deal detail cards dynamically render based on `quoteFormFields` configuration with role-based access control.
-   **Enhanced Document Management**: 5-step status lifecycle for documents, per-document AI review triggers, and "Push to Drive" functionality.
-   **Internal E-Signature Flow**: Manages internal signing for quotes, generating PDFs with pre-positioned signature fields and handling the signing process.
-   **Quote PDF Generator**: Server-side PDF generation using `pdf-lib` for customizable summary and LOI templates.
-   **Program Creation Wizard**: A multi-step wizard for defining loan programs, including credit policies, quote forms, stages, tasks, AI rules, and pricing configurations for external APIs.
-   **Smart Form Tasks**: Reusable inquiry form templates linked to program tasks, allowing borrowers to submit data which auto-creates contacts and completes tasks.
-   **Borrower Portal**: Redesigned portal for borrowers to view "My Loans" as a flat table and access a `deal-detail` view with full progress stages, overview, and `LoanChecklist`. Includes dedicated messaging and document management with classification.
-   **Per-Person Invite Links**: System for generating and managing invite links for users, tracking their status, and configuring broker-specific settings.

## External Dependencies

-   **Apify**: Web scraping for external pricing providers.
-   **PostgreSQL**: Primary database.
-   **PandaDoc**: E-signing, status synchronization, and document retrieval.
-   **Resend**: Email sending.
-   **Twilio**: SMS messaging.
-   **Google OAuth 2.0**: Authentication and Google Drive integration.
-   **Google Drive API**: For folder creation and document synchronization.
-   **n8n / External LOS**: Optional webhook integrations.