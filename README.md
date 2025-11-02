# discord-chatbot
Discord AI chatbot made with TypeScript and using Gemini's API

### Some cool features:
- Supports images and embed messages.
- Knows who it is talking to (Each user prompt includes the user's userName, displayName and timestamp).
- A custom chat history for each channel that can easily be reset by simply saying `.clear`.
- Can set a custom system instruction via `/set-system-instruction` and it can be viewed by running `/view-system-instruction`.
- Ensures code blocks don't get cut-off mid response if text is above 2000 chars (splits them accordingly too not just 2000 character text, discord limits 2000 characters max per message).

### Note:
Wouldn't recommend for production as this stores chat history in a `Map()` (use a database instead). Same goes for the `config.json` which has the system instruction, would suggest using a database for that and would recommend a chat filter too. Bot was made for fun and to gather experience only. By default it uses `gemini-2.5-flash`, if u want a different model simply go to `discord.ts` and change it to whatever you want, or you can create a command for that too.

You can simply run it by configuring the `.env` file:
```env
API_KEY=GOOGLE_GEMINI_API_KEY
BOT_TOKEN=DISCORD_BOT_TOKEN
BOT_ID=DISCORD_CLIENT_ID
```
And then run `npm i` to install dependencies and `npx tsx main.ts` to start the bot.

Again I say that this bot is not intended for production. Modify the code as you wish and then release it.

Here's an example of what I mean regarding code blocks not getting cut-off. You can clearly see here that the big block got split into two to fit with discord's 2000 messages limit, and they were parsed properly as it automatically adds backticks to the end/start of each new code message continuation.
<img width="604" height="414" alt="image" src="https://github.com/user-attachments/assets/b24b0bf3-0b65-4b58-8b5f-ff2f9606f99a" />
