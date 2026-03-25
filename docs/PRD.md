# Product Requirements Document (PRD) - SKAI-ToDo v2.0

## 1. Product Vision
SKAI-ToDo is a voice-first AI teammate that captures thoughts via voice, instantly turns them into organized Eisenhower Matrix tasks, auto-schedules them on calendar with smart time-blocking, extracts action items from meetings, and proactively reminds users and teams. It runs 100% self-hosted on Hostinger VPS (n8n + PostgreSQL) for privacy, with optional managed cloud plans for revenue.

## 2. Target Audience
- **Individuals:** People who want to organize their personal and professional life with AI-assisted prioritization.
- **Freelancers:** Professionals juggling multiple clients, billing, and deadlines.
- **Small Teams:** Groups needing shared context, delegated tasks, and workload management without the enterprise price tag.
- **Enterprises:** Companies requiring self-hosted, secure, and fully auditable task management.

## 3. User Personas
### Persona 1: The Busy Freelancer (Alex)
- **Goal:** Capture tasks on the go without typing. Ensure nothing falls through the cracks.
- **Pain Point:** Frequently forgets follow-ups after client meetings.
- **Solution:** Uses the SKAI Voice Button to dictate tasks while walking. Relies on AI Auto-Scheduling to block out deep work time.

### Persona 2: The Team Manager (Sarah)
- **Goal:** Delegate tasks effectively without micromanaging.
- **Pain Point:** Not knowing who has capacity for ad-hoc requests.
- **Solution:** Uses Team Analytics and AI Smart Delegation to assign tasks to the lowest-load team member automatically.

## 4. User Stories
- **US1:** As a user, I want to press a single button to dictate my tasks so I can quickly capture ideas on the go.
- **US2:** As a user, I want my voice notes automatically categorized into the Eisenhower Matrix so I know what to focus on first.
- **US3:** As a user, I want the system to find free time on my calendar and auto-schedule my Q1 Tasks so I have a realistic daily plan.
- **US4:** As a manager, I want to upload a meeting recording so the AI can extract action items and assign them to attendees.
- **US5:** As a user, I want my data to remain fully on my own VPS so I have 100% privacy and ownership.

## 5. Core Features & Prioritization
| Feature | Priority | Description |
| :--- | :---: | :--- |
| **Smart Voice Dictation** | P0 | Real-time speech-to-text with AI intent parsing (dates, urgency). |
| **Eisenhower Matrix UI** | P0 | 4-quadrant visual workspace with drag & drop functionality. |
| **AI Auto-Scheduling** | P0 | Calendar sync, time-blocking, and dynamic rescheduling. |
| **Meeting Intelligence** | P1 | Transcribe recordings and auto-create actionable tasks. |
| **Multi-User & Admin** | P1 | RBAC, team sharing, AI smart delegation, and capacity view. |
| **Multi-View UI** | P2 | Kanban, Timeline, Calendar, and Matrix views. |
| **Advanced Integrations** | P2 | Slack, Teams, Email-to-task, webhook exports. |

## 6. Success Metrics (KPIs)
- **Activation Rate:** % of users who create more than 5 tasks in their first week.
- **Voice Usage:** Average number of voice dictations per active user per day.
- **Retention:** Week 4 retention rate > 40%.
- **Monetization:** Conversion rate from Free Self-Hosted to Pro/Team Cloud Plans.

## 7. High-Level Roadmap
- **Phase 1 (MVP Foundation):** Backend API, Database Schema, Authentication, n8n webhook setup, Stripe Billing integration.
- **Phase 2 (Core UI & Voice):** Flutter mobile/web app, Eisenhower Matrix drag & drop, Whisper.cpp voice dictation integration.
- **Phase 3 (AI & Teams):** AI auto-scheduling engine, meeting intelligence, multi-user admin dashboard, advanced integrations.
