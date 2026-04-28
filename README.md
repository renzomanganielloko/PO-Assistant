# PO Assistant

A production-minded MVP for Product Owners who use Trello with clients and Jira internally. This tool bridges the gap between client-facing boards and internal development workflows.

Spanish instructions are available in [README.es.md](README.es.md).

## Key Features

### 📊 Dashboard
- Get a high-level overview of your workspace status.
- Monitor Trello and Jira integration health at a glance.

### 📋 Board Management
- List all your Trello boards.
- Mark frequently used boards as **Favorites** for quick access.
- Configure specific automation rules for each board.

### 🔄 Trello to Jira Sync
- Select a Trello board and list to sync.
- **Sync Preview**: View cards eligible for synchronization before running the process.
- **Smart Filtering**: Automatically identifies cards that are already synced or those that belong to specific workflows (like Sprints).
- **Automated Issue Creation**: Create Jira issues (Stories, Tasks, etc.) directly from Trello cards.

### 🔔 Smart Alerts & Notifications
- **Live Feed**: Stay updated with Trello and Jira mentions and activity.
- **Direct Interaction**: Reply to Trello comments directly from the app.
- **Attachments**: Support for sending text and image attachments in replies.
- **Jira Activity**: Dedicated feed for Jira-specific alerts and updates.

### ⚙️ Secure Settings
- **Local Encryption**: All Trello and Jira API credentials are stored locally using AES-256 encryption.
- **Configuration Status**: Easily verify if your integrations are correctly set up.

### 🎨 User Experience
- **Multi-language**: Full support for English and Spanish.
- **Dark/Light Mode**: Optimized UI for any lighting condition.
- **Action Logs**: Detailed history of operations performed within the app.

## What Works Now

- Secure credential storage.
- Fetching Trello boards, lists, and cards.
- Selection of automation targets (Jira project and issue type) per Trello board.
- Manual execution of board automations.
- Real-time alert feed with reply capability.
- Multi-language and theme switching.

## Setup

1. Install dependencies:

   ```bash
   npm install
   npm --prefix server install
   npm --prefix client install
   ```

2. Configure environment:

   ```bash
   copy server\.env.example server\.env
   ```

   Update `CREDENTIAL_SECRET` with a long random value before storing real credentials.

3. Run locally:

   ```bash
   npm run dev
   ```

   Frontend: http://localhost:5173  
   Backend: http://localhost:4000

## Where To Input API Keys

Open the app, go to **Settings**, and enter:

- Trello API Key
- Trello Token
- Jira Base URL
- Jira Email
- Jira API Token

## API Endpoints

- `GET /api/health` - Check API status.
- `GET /api/settings/status` - Check if credentials are configured.
- `POST /api/settings` - Save credentials.
- `GET /api/trello/boards` - Fetch Trello boards.
- `GET /api/jira/projects` - Fetch Jira projects.
- `GET /api/alerts` - Fetch live alerts.
- `POST /api/alerts/reply` - Reply to an alert.
- `POST /api/automations/:id/run` - Run a specific automation.

## Next Steps

- Scheduled polling for background sync.
- Richer Jira field mapping (assignees, labels, custom fields).
- Performance reports and sync history.
