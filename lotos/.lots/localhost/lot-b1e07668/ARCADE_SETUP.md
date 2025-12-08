# Arcade.dev Email Reader Setup

## Overview

This script allows you to read your Gmail emails using Arcade.dev's Gmail toolkit API.

## Prerequisites

1. **Arcade.dev Account**: Sign up at [arcade.dev](https://www.arcade.dev/)
2. **API Key**: Get your API key from the Arcade.dev dashboard
3. **Python 3.8+**: Required for running the script

## Setup Instructions

### 1. Get Your Arcade.dev API Key

1. Log in to [arcade.dev](https://www.arcade.dev/)
2. Navigate to your API settings
3. Generate or copy your API key

### 2. Set Environment Variable

```bash
export ARCADE_API_KEY="your-api-key-here"
```

Or pass it directly when running:
```bash
python src/arcade_email_reader.py --api-key "your-api-key" --user-id "your-email@gmail.com" --auth
```

### 3. Authorize Gmail Access

First-time setup requires OAuth authorization:

```bash
python src/arcade_email_reader.py --user-id "your-email@gmail.com" --auth
```

This will:
1. Start the OAuth flow
2. Provide a URL to visit
3. Wait for you to authorize access
4. Store the authorization for future use

### 4. Read Your Emails

Once authorized, you can:

**List recent emails:**
```bash
python src/arcade_email_reader.py --user-id "your-email@gmail.com" --list 10
```

**Search emails:**
```bash
python src/arcade_email_reader.py --user-id "your-email@gmail.com" --search "from:example@gmail.com"
python src/arcade_email_reader.py --user-id "your-email@gmail.com" --search "subject:important"
```

## Usage Examples

### Basic Usage

```bash
# Authorize (first time only)
python src/arcade_email_reader.py --user-id "user@gmail.com" --auth

# List 5 recent emails
python src/arcade_email_reader.py --user-id "user@gmail.com" --list 5

# Search for emails from a specific sender
python src/arcade_email_reader.py --user-id "user@gmail.com" --search "from:boss@company.com"

# Search for unread emails
python src/arcade_email_reader.py --user-id "user@gmail.com" --search "is:unread"
```

### Using as a Python Module

```python
from src.arcade_email_reader import ArcadeEmailReader

# Initialize client
client = ArcadeEmailReader(api_key="your-api-key")

# Authorize (if needed)
auth_response = client.start_auth("user@gmail.com")
if auth_response["status"] != "completed":
    print(f"Visit: {auth_response['url']}")
    client.wait_for_auth_completion(auth_response)

# List emails
emails = client.list_emails("user@gmail.com", n_emails=10)
for email in emails:
    print(f"{email['subject']} - {email['from']}")

# Search emails
results = client.search_emails("user@gmail.com", "is:unread")
print(f"Found {len(results)} unread emails")
```

## Gmail Search Query Syntax

You can use Gmail's powerful search syntax:

- `from:example@gmail.com` - Emails from specific sender
- `to:example@gmail.com` - Emails to specific recipient
- `subject:keyword` - Emails with keyword in subject
- `is:unread` - Unread emails
- `is:read` - Read emails
- `has:attachment` - Emails with attachments
- `after:2024/1/1` - Emails after date
- `before:2024/12/31` - Emails before date
- `label:important` - Emails with label
- Combine with `AND`, `OR`, `NOT`: `from:boss AND is:unread`

## Security Notes

- Your API key is sensitive - never commit it to version control
- OAuth tokens are stored securely by Arcade.dev
- The script only requests read-only access to Gmail
- You can revoke access at any time via Google Account settings

## Troubleshooting

### "API key required" error
- Make sure you've set `ARCADE_API_KEY` environment variable
- Or pass `--api-key` parameter

### Authorization fails
- Check that you're using the correct user_id (email address)
- Ensure you've completed the OAuth flow by visiting the provided URL
- Verify your Arcade.dev account has access to Gmail toolkit

### No emails returned
- Check that authorization completed successfully
- Verify the email account has emails
- Try a broader search query

## API Reference

For more details, see:
- [Arcade.dev Gmail Toolkit Docs](https://docs.arcade.dev/en/toolkits/productivity/gmail)
- [Arcade.dev API Reference](https://docs.arcade.dev/)
