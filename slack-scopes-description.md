# Slack OAuth Scopes

## User Token Scopes

### chat:write

Used to post Claude Code Workflow cards to Slack channels. When users share a Claude Code Workflow, a rich message card containing workflow name, description, author information, and import links is posted.

### files:read

Used to download Claude Code Workflow JSON files from Slack messages. When users click an import link in a Claude Code Workflow card, the attached JSON file is fetched and opened in the editor for editing.

### files:write

Used to upload Claude Code Workflow JSON files to Slack. When users share a Claude Code Workflow, the JSON file is uploaded as a thread reply attachment, allowing team members to import it into their editors.

### channels:read

Used to display public Slack channels in the share dialog dropdown. Only channels the authenticated user is a member of are shown, ensuring users can only share Claude Code Workflows to channels they have access to.

### groups:read

Used to display private Slack channels in the share dialog dropdown. Only private channels the authenticated user is a member of are shown, ensuring users can only share Claude Code Workflows to channels they have access to.

### users:read

Used to display the Claude Code Workflow author as a clickable @mention in the shared message card. When sharing a Claude Code Workflow, the author's Slack username is fetched to create a profile link in the card.
