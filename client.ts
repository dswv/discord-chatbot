import { Client, GatewayIntentBits, Collection } from 'discord.js';

interface CmdClient extends Client {
    commands: Collection<string, any>;
}

export default new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    allowedMentions: { parse: ['users']}
}) as CmdClient;