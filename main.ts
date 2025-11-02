import dotenv from 'dotenv';
import { Events, Collection, type Interaction, REST, Routes } from 'discord.js'
import client from './client.js';
import DiscordEvents from './discord.js'
import commands from "./commands.js";
dotenv.config();

client.commands = new Collection();

commands.forEach((cmd) => {
    if ('data' in cmd && 'execute' in cmd) { client.commands.set(cmd.data.name, cmd); } 
    else DiscordEvents.log(`[WARNING] A command is missing a required "data" or "execute" property.`)
})

const rest = new REST().setToken(process.env.BOT_TOKEN as string);

(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.BOT_ID as string), { body: commands.map(cmd => cmd.data.toJSON()) });
        DiscordEvents.log(`Successfully reloaded application (/) commands.`)
    } catch (e) {
        console.error(e);
    }
})();

client.on(Events.ClientReady, ready => DiscordEvents.ClientReady(ready));
client.on(Events.MessageCreate, msg => DiscordEvents.MessageCreate(msg));
client.on(Events.InteractionCreate, int => DiscordEvents.CommandHandler(int));

client.login(process.env.BOT_TOKEN);