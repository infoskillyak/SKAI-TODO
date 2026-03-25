# Software Requirements Specification (SRS) - SKAI-ToDo v2.0

## 1. Introduction
This document specifies the software requirements for SKAI-ToDo v2.0, a cross-platform (Android, Web) intelligent productivity ecosystem powered by AI, focusing on the Eisenhower Matrix, voice dictation, and smart scheduling.

## 2. Functional Requirements
### 2.1 Authentication & Authorization
- **FR1.1:** The system shall support user registration and login via Email/Password.
- **FR1.2:** The system shall provide JWT-based authentication with refresh tokens.
- **FR1.3:** The system shall enforce Role-Based Access Control (Admin, Team Member, Viewer).

### 2.2 Task Management & Matrix
- **FR2.1:** The system shall display tasks in a 4-quadrant Eisenhower Matrix (Q1: Urgent/Important, Q2: Not Urgent/Important, Q3: Urgent/Not Important, Q4: Not Urgent/Not Important).
- **FR2.2:** Users shall be able to drag and drop tasks between quadrants.
- **FR2.3:** Tasks shall support subtasks, comments, attachments, estimated duration, and energy levels.

### 2.3 Voice Dictation & AI Processing
- **FR3.1:** The frontend shall provide a one-tap voice recording interface capable of up to 2-minute dictations.
- **FR3.2:** Audio shall be transcribed using Whisper (local or via n8n integration).
- **FR3.3:** Transcriptions shall be processed by GPT-4o (via n8n) to extract task title, due dates, duration, prioritization, and assignees.

### 2.4 Auto-Scheduling & Calendar Sync
- **FR4.1:** The system shall bidirectionally sync with Google and Outlook Calendars.
- **FR4.2:** The AI scheduler shall identify free calendar blocks and place Q1/Q2 tasks accordingly.
- **FR4.3:** The scheduler shall dynamically resolve conflicts and reschedule low-priority items if a high-priority item is added.

### 2.5 Meetings & Collaboration
- **FR5.1:** Users shall be able to upload audio/video recordings of meetings.
- **FR5.2:** The system shall return summarized notes and distinct action items assigned to recognized users.
- **FR5.3:** Admins shall have a dashboard to manage organizations, invite users, and track billing limits.

### 2.6 Billing & Monetization
- **FR6.1:** The system shall integrate with Stripe to manage Free, Pro, Team, and Enterprise plans.
- **FR6.2:** AI usage (Whisper/OpenAI) shall be tracked via a credit system.

## 3. Non-Functional Requirements
### 3.1 Performance & Scalability
- **NFR1.1:** API responses must return in < 300ms (excluding external AI processing calls).
- **NFR1.2:** The system must support real-time UI updates via WebSockets for collaborating users.
- **NFR1.3:** The database and backend must scale horizontally via Docker/Docker Compose.

### 3.2 Security & Privacy
- **NFR2.1:** All self-hosted instances shall retain 100% of data locally on the VPS (PostgreSQL).
- **NFR2.2:** Passwords must be hashed using bcrypt (cost factor >= 10).
- **NFR2.3:** The system must be GDPR compliant, allowing full data export and deletion.

### 3.3 Reliability & Availability
- **NFR3.1:** Target uptime of 99.9% for managed deployments.
- **NFR3.2:** Automated backups for PostgreSQL data shall be configured in the deployment scripts.

## 4. Technology Stack (Mandatory Constraints)
- **Frontend:** Flutter 3.24+ (Single codebase for Android + Web)
- **Backend:** NestJS 10 (TypeScript), WebSockets
- **Database:** PostgreSQL 16
- **ORM:** Prisma
- **Automation / AI Glue:** Self-hosted n8n
- **Caching / Rate Limiting:** Redis
- **Infra/Deployment:** Docker Compose (Hostinger VPS)

## 5. Use Cases
### Use Case 1: Voice Task Creation
1. User taps "Voice Button".
2. User dictates: "Remind John to send the Q3 report by tomorrow 2 PM, it will take about an hour and is very important."
3. Flutter app streams/sends audio to backend.
4. Backend triggers n8n workflow.
5. n8n transcribes audio, parses intent.
6. n8n creates Task in PostgreSQL: Title="Send Q3 Report", Assignee="John", Due="Tomorrow 2 PM", Duration="1h", Quadrant="Q1".
7. WebSocket pushes the new task to the UI.

### Use Case 2: AI Auto-Scheduling
1. User requests "Daily Planner" generation.
2. Backend fetches all Unscheduled Q1/Q2 tasks.
3. Backend fetches user's synced Calendar free/busy times.
4. System executes scheduling algorithm to map tasks to free blocks protecting focus slots.
5. System inserts Calendar Events and updates Task references.
