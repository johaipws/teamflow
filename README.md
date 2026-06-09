# TeamFlow

TeamFlow is a React frontend backed by an Express, MySQL, and JWT API.

## Local setup

1. Start MySQL on `localhost:3306`.
2. Copy `backend/.env.example` to `backend/.env` and set the database credentials, JWT secret, and initial lead credentials.
3. Initialize the database:

   ```powershell
   cd backend
   npm install
   npm run db:init
   ```

4. Start the API:

   ```powershell
   npm run dev
   ```

5. In a second terminal, start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

Open `http://localhost:5173` and sign in with the seeded lead account. Leads can create developer and QA accounts from the Team page.

## Role permissions

- Lead: manages projects, users, assignments, all tasks, QA decisions, and organization reports.
- Developer: views and updates assigned tasks, creates self-assigned tasks in existing projects, tracks time, and views personal reports.
- QA: views assigned QA tasks, performs reviews, and views personal reports.
- All roles: use task comments and links on accessible tasks, notifications, and password settings.

## Notification channels

- Real-time in-app popups use an authenticated Server-Sent Events connection.
- Browser push can be enabled by each user from the Notifications page.
- Email delivery supports EmailJS or SMTP. EmailJS is preferred when `EMAILJS_*` values are configured.
- Local VAPID keys are generated automatically in `backend/.vapid-keys.json`.

### EmailJS template variables

Create an EmailJS template that uses:

- `{{to_email}}`
- `{{to_name}}`
- `{{message}}`
- `{{notification_type}}`
- `{{task_id}}`
- `{{app_url}}`

## API

The backend serves all endpoints under `/api`. During local development, Vite proxies `/api` to `http://localhost:5000`.

`GET /api/health` reports both API and database readiness.
