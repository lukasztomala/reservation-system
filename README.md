# Reservation System (MVP)

A web-based appointment reservation system designed for acupuncture clinics, enabling clients to book and cancel appointments online and allowing a clinic staff member to manage the calendar. The application features AI-driven recommendations for acupuncture points based on patient history and TCM principles.

## Table of Contents
1. [Project Description](#project-description)
2. [Tech Stack](#tech-stack)
3. [Getting Started Locally](#getting-started-locally)
4. [Available Scripts](#available-scripts)
5. [Project Scope](#project-scope)
6. [Project Status](#project-status)
7. [License](#license)

## Project Description
The Reservation System addresses the time-consuming and error-prone process of manually scheduling patient visits in notebooks or calendars. Built with performance and responsiveness in mind (mobile-first), the system delivers:
- Client self-service booking and cancellation of appointments
- Simple user accounts for one clinic staff member and multiple clients
- AI integration for suggesting acupuncture point recommendations based on patient notes and TCM guidance

## Tech Stack

**Frontend**
- Astro 5 for fastest page rendering with minimal JavaScript
- React 19 for interactive components
- TypeScript 5 for static typing and IDE support
- Tailwind CSS 4 for utility-first styling
- shadcn/ui for prebuilt accessible React components

**Backend & Services**
- Supabase (PostgreSQL, authentication, and storage) as Backend-as-a-Service
- Openrouter.ai for AI model routing (OpenAI, Anthropic, Google, etc.)

**CI/CD & Hosting**
- GitHub Actions for continuous integration and deployments
- Docker containers hosted on DigitalOcean

## Getting Started Locally

### Prerequisites
- Node.js v22.14.0 (managed via nvm; see `.nvmrc`)
- Git

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/reservation-system.git
   cd reservation-system
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy and configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env to set SUPABASE_URL, SUPABASE_KEY, OPENROUTER_API_KEY
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser at `http://localhost:3000`

## Available Scripts
In the project directory, you can run:

- `npm run dev`    
  Start Astro dev server with hot-reloading

- `npm run build`  
  Build the production version

- `npm run preview`  
  Preview the production build locally

- `npm run astro`  
  Run Astro CLI commands

- `npm run lint`   
  Lint all files with ESLint

- `npm run lint:fix`  
  Automatically fix linting issues

- `npm run format`  
  Format code using Prettier

## Project Scope

**Included (MVP)**
- Client registration and authentication
- Table view of appointment slots (month ahead)
- Booking and cancellation of appointments
- Client and staff notes (two categories)
- Staff calendar management (add, cancel, block slots, modify working hours)
- AI-driven acupuncture point recommendations (global or per-note)
- Conflict validation and UI feedback for operations
- Paginated appointment history

**Excluded (Out of MVP scope)**
- Social/community features
- Support for multiple staff members or clinic locations
- Email/SMS notifications (UI/log-only messaging)

## Project Status

This project is in active development (MVP stage). Upcoming milestones include:
- Finalizing UI for staff dashboard
- Completing AI integration workflows
- Conducting user acceptance testing

## License

This project currently has no license. Please contact the maintainers for licensing terms. 