import { createYournotifyClient } from '../src/index.js';
export async function POST() {
  const yn = createYournotifyClient({ apiKey: process.env.YOURNOTIFY_API_KEY });
  const profile = await yn.getProfile();
  return Response.json(profile);
}
