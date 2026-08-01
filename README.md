# Yournotify Next.js

Helpers for calling the current Yournotify API from Next.js route handlers and server actions.

## Install

```bash
npm install yournotify-nextjs
```

## Server Action Example

```js
'use server';

import { createYournotifyClient } from 'yournotify-nextjs';

const yournotify = createYournotifyClient({ apiKey: process.env.YOURNOTIFY_API_KEY });

export async function sendWelcomeEmail(email) {
	return yournotify.sendEmail(
		'Welcome',
		'Welcome',
		'<p>Hello</p>',
		'Hello',
		'draft',
		'noreply@smtp.yournotify.net',
		[email]
	);
}
```

## Helpers

- `validateAuth()` / `getProfile()`
- `createCampaign(data)`, `sendEmail(...)`, `sendSMS(...)`, `sendWhatsApp(data)`, `sendPush(data)`, `sendInApp(data)`, `testCampaign(data)`
- `addContact(...)`, `getContacts(params)`, `addList(...)`, `getCampaigns(channel, params)`
- `getRewards(params)`, `createReward(data)`, `sendReward(data)`
- `identify(data)`, `track(data)`
- `verifyYournotifyWebhook(headers, expectedToken)`
