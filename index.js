const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const PREFIX = "$"; // Command prefix

// Replace these with your actual role and channel IDs
const UNVERIFIED_ROLE_ID = "1316561501095596082"; // ID of the unverified role
const LORD_ROLE_ID = "1316561496737714216"; // ID of the "lord" role
const DAME_ROLE_ID = "1316561497429774358"; // ID of the "dame" role
const LOG_CHANNEL_ID = "1319110643621822464"; // Channel ID for logging
const ALLOWED_ROLE_IDS = ["1316561458921869325", "1316561457571303485", "1316561455536934932", "1316561452576014376"]; // Roles allowed to verify

// Object to track verification counts
const verificationCounts = {};

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages and messages that don't start with the prefix
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Handle the $top command
    if (command === "top") {
        if (Object.keys(verificationCounts).length === 0) {
            return message.reply("No one has verified anyone yet.");
        }

        const leaderboard = Object.entries(verificationCounts)
            .sort(([, a], [, b]) => b - a) // Sort by count descending
            .map(([userId, count], index) => `${index + 1}. <@${userId}> - ${count} verifications`)
            .join("\n");

        return message.reply(`**Verification Leaderboard:**\n${leaderboard}`);
    }

    // Handle verification commands
    if (!["vb", "vg"].includes(command)) return;
    if (args.length < 1) return message.reply("Please specify the user ID to verify.");

    const userId = args[0];

    // Check if the command issuer has an allowed role or Administrator permission
    const memberRoles = message.member.roles.cache;
    const hasAllowedRole = ALLOWED_ROLE_IDS.some(roleId => memberRoles.has(roleId));
    const hasAdminPermission = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // Allow verification if the user has either Administrator permissions or an allowed role
    if (!hasAllowedRole && !hasAdminPermission) {
        return message.reply("You do not have permission to verify users.");
    }

    try {
        const member = await message.guild.members.fetch(userId);
        if (!member) return message.reply("User not found in this server.");

        let roleToAdd, roleMessage;

        if (command === "vb") {
            if (member.roles.cache.has(UNVERIFIED_ROLE_ID)) {
                roleToAdd = LORD_ROLE_ID;
                roleMessage = "lord";
            } else {
                return message.reply("This user is already verified.");
            }
        } else if (command === "vg") {
            if (member.roles.cache.has(UNVERIFIED_ROLE_ID)) {
                roleToAdd = DAME_ROLE_ID;
                roleMessage = "dame";
            } else {
                return message.reply("This user is already verified.");
            }
        }

        // Remove unverified role and add the new role
        await member.roles.add(roleToAdd); // Add the target role first
        await member.roles.remove(UNVERIFIED_ROLE_ID); // Remove the unverified role afterward

        // Log the verification in the log channel
        const logChannel = await message.guild.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel) {
            logChannel.send(
                `User <@${message.author.id}> verified <@${userId}> as a ${roleMessage}.`
            );
        }

        // Track the verification count
        if (!verificationCounts[message.author.id]) {
            verificationCounts[message.author.id] = 0;
        }
        verificationCounts[message.author.id] += 1;

        return message.reply(`User <@${userId}> has been verified as a ${roleMessage}.`);
    } catch (error) {
        console.error(error);
        return message.reply("An error occurred while processing the command. Please check the user ID and try again.");
    }
});

client.login(process.env.TOKEN);