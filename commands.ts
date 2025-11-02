import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Embed } from "discord.js";
import fs from 'fs';

interface Config {
    systemIns: string
}

let config: Config;

export default [
    // set prompt
    {
        data: new SlashCommandBuilder()
            .setName('set-system-instruction')
            .setDescription('Sets a custom system prompt to the ChatBot')
            .addStringOption((option) => option.setName('prompt').setDescription('The prompt to set (Maximum 200 characters)').setRequired(true)),

        async execute(int: ChatInputCommandInteraction) {
            const prompt = await int.options.getString("prompt", true);
            try {
                config = JSON.parse(fs.readFileSync('./config.json', 'utf8')) as Config;
            } catch (error) {
                console.error('Error reading file:', error);
                await int.reply("Error while opening config");
                return;
            }

            config.systemIns = prompt.slice(0, 200);

            try {
                fs.writeFileSync('./config.json', JSON.stringify(config, null, 2), 'utf8')
            } catch (e) {
                console.error('Error writing to file:', e)
                await int.reply("Error while writing config");
                return;
            }

            await int.reply(`**Successfully set system prompt as:**\n\`\`\`${config.systemIns}\`\`\``);
        }
    },
    // view prompt
    {
        data: new SlashCommandBuilder()
            .setName("view-system-instruction")
            .setDescription("Views the currently set system prompt"),

        async execute(int: ChatInputCommandInteraction) {
            try {
                config = JSON.parse(fs.readFileSync('./config.json', 'utf8')) as Config;
                await int.reply(`Current system prompt:\n\`\`\`${config.systemIns}\`\`\``)
            } catch (error) {
                console.error('Error reading file:', error);
                await int.reply("Error while opening config");
                return;
            }
        }
    },
    // help command
    {
        data: new SlashCommandBuilder()
            .setName("help")
            .setDescription("Guide on how to use the bot & view prefix and slash commands"),

        async execute(int: ChatInputCommandInteraction) {
            const embed = new EmbedBuilder()
            	.setColor(0x0099ff)
                .setTitle('Guide & Commands')
                .setDescription('You can simply chat with the bot by mentioning it in your message or replying to any message it sent')
                .addFields(
                    { name: '`.clear`', value: 'Clears the current chat history in the channel', inline: true},
                    { name: '`/set-system-instruction`', value: 'Sets a custom system prompt to the ChatBot (max 200 chars)', inline: true },
                    { name: '`/view-system-instruction`', value: 'Views the currently set system prompt', inline: true },
                )
                .setTimestamp();
            
            await int.reply({embeds: [embed]})
        }
    }

]