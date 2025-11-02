import { Client, Message, MessageFlags, OAuth2Scopes, PermissionFlagsBits, TextChannel, type Interaction } from 'discord.js';
import { GoogleGenAI, GenerateContentResponse, createUserContent, createPartFromUri } from "@google/genai";
import dotenv from 'dotenv';
import client from './client.js';
import fs from 'fs';
dotenv.config();

const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});

enum RGB {
    Red = 'r',
    Green = 'g',
    Blue = 'b'
}

type History = {
    role: "user" | "model";
    parts: { text: string }[];
}[];

const Chats = new Map<string, History>();

export default class DiscordEvents {
    public static log(msg: string, c: RGB = RGB.Red): void {
        const colors = {
            'r': '\x1b[31m',
            'b': '\x1b[34m',
            'g': '\x1b[32m',
        };
        console.log(`${colors[c] || colors['g']}(${new Date().toLocaleString()})\x1b[0m ${msg}`);
    }

    private static parseMessage(message: string): Array<string> {
        const MAX_LEN = 1980;
        if (message.length <= MAX_LEN) return [message];

        const lines = message.split("\n");
        const chunks: string[] = [];

        let current = "";
        let inCB = false;
        let lang = "";

        for (const line of lines) {
            const linetd = line + "\n";

            const match = line.match(/```(\s*\w+)?/);
            if (match) {
                if (!inCB) {
                    inCB = true;
                    lang = match[1]?.trim() ?? "";
                } else {
                    inCB = false;
                    lang = "";
                }
            }

            if (current.length + linetd.length > MAX_LEN) {
                if (inCB) current += "```";
                chunks.push(current.trimEnd());
                current = "";

                if (inCB) current += `\`\`\`${lang}\n`;
            }

            current += linetd;
        }

        if (current) {
            if (inCB) current += "```";
            chunks.push(current.trimEnd());
        }

        return chunks;
    }

    public static ClientReady(client: Client): void {
        this.log(`Logged in as ${client.user?.tag}!`, RGB.Green);
        this.log(`Invite Link: ${client.generateInvite({permissions: [PermissionFlagsBits.Administrator], scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands]})}`, RGB.Blue);
    }

    public static async CommandHandler(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) return;
        const command = (interaction.client as typeof import("./client.js").default).commands.get(interaction.commandName);
        if (!command) {
            this.log(`No command matching ${interaction.commandName} was found.`)
            return;
        }

        try {
            await command.execute(interaction)
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral,
                });
            }
        }
    }

    public static async MessageCreate(msg: Message): Promise<void> {
        const botId = client.user?.id ?? process.env.BOT_ID!;
        const history: History = Chats.get(msg.channelId) || [];
        if (msg.content === ".clear") {
            Chats.delete(msg.channel.id)
            await msg.reply("Cleared chat history for this channel!")
            return;
        }
        if (!msg.mentions.has(botId)) return;

        const channel: TextChannel = (await client.channels.fetch(msg.channelId)) as TextChannel;
        if (channel.isTextBased()) await channel.sendTyping();

        let embedded: {inlineData: { mimeType: string, data: string }}[] = []; // discord embeds

        for (const [, att] of msg.attachments) {
            if (att.contentType?.startsWith('image/')) {
                try {
                    const response = await fetch(att.url);
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const mimeType = response.headers.get('content-type') || 'image/png';

                    embedded.push({
                        inlineData: {
                            mimeType,
                            data: buffer.toString('base64'),
                        },
                    });
                } catch (err) {
                    console.error('Failed to fetch attachment:', err);
                }
            }
        }

        for (const embed of msg.embeds) {
            if (embed.image?.url) {
                try {
                    const response = await fetch(embed.image.url);
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const mimeType = response.headers.get('content-type') || 'image/png';

                    embedded.push({
                        inlineData: {
                            mimeType,
                            data: buffer.toString('base64'),
                        },
                    });
                } catch (err) {
                    console.error('Failed to fetch embed image:', err);
                }
            }
        };

        const config: { systemIns: string } = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history,
            config: {
                temperature: 0.5,
                maxOutputTokens: 2048,
                tools: [{googleSearch: {}, urlContext: {}}],
                systemInstruction: config.systemIns
            },
        });

        const prompt: string = `[${new Date(msg.createdTimestamp)}] ${msg.author.displayName} (${msg.author.username}): ${msg.content}`;

        let response: GenerateContentResponse;

        try {
            response = (!embedded.length)
                ? await chat.sendMessage({ message: prompt })
                : await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        { role: 'user', parts: [{ text: prompt }, ...embedded] }
                    ]
                });
        } catch (e) {
            console.error('Error generating response:', e);
            this.log('^^^ Fetching response error (Possibly overloaded) ^^^', RGB.Red);
            response = { text: 'Error occurred while generating content.' } as any;
        }

        //console.log(prompt)

        history.push({
            role: "user",
            parts: [{text: prompt}]
        });

        const res: Array<string> = this.parseMessage(response.text || "");

        history.push({
            role: "model",
            parts: [{text: response.text || "Failed to get AI response"}]
        });

        //console.log(res)

        for (let i = 0; i < res.length; i++) {
            const resp: string = res[i] as string;
            if (resp.length < 1) continue;
            try {
                if (i === 0) await msg.reply(resp);
                else if (channel.isTextBased()) await channel.send(resp);
            } catch (e) {
                console.error(e);
                this.log('^^^ Sending discord message error ^^^', RGB.Red);
            } finally {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }


        Chats.set(msg.channelId, history);
    }
}