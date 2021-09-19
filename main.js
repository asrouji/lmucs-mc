import DiscordJS, { Intents, Interaction, MessageEmbed } from 'discord.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const client = new DiscordJS.Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.on('ready', () => {
  console.log('Bot is ready!');

  const guildId = '870102910447546418';
  const guild = client.guilds.cache.get(guildId);
  let commands;

  if (guild) {
    commands = guild.commands;
  } else {
    commands = client.application?.commands;
  }

  // commands?.get()
  //guild.commands.delete('123456789012345678')

  commands?.create({
    name: 'ping',
    description: 'Prints the bot and API latency',
  });

  commands?.create({
    name: 'server',
    description: 'Posts the status of the Minecraft server',
  });

  commands?.create({
    name: 'whitelist',
    description: 'Adds player to whitelist of the Minecraft server',
    options: [
      {
        name: 'username',
        description: 'Minecraft username to whitelist',
        required: true,
        type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
      },
    ],
  });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }

  const { commandName, options } = interaction;

  if (commandName === 'ping') {
    interaction.reply({
      content: `🏓  Latency is **${
        Date.now() - interaction.createdTimestamp
      }ms**. API Latency is **${Math.round(client.ws.ping)}ms**`,
      ephemeral: false,
    });
  } else if (commandName === 'server') {
    await interaction.deferReply({
      ephemeral: false,
    });

    fetch('https://api.mcsrvstat.us/2/play.emeraldisle.fun')
      .then((response) => response.json())
      .then((data) => {
        const embed = new MessageEmbed()
          .setColor('#5b8731')
          .setAuthor(
            data.hostname,
            'https://images-ext-1.discordapp.net/external/ha2UA0g2Fsh0wn67g6bU49JA1YOJFqyn2LgPvDS2W2w/https/orig00.deviantart.net/34de/f/2012/204/b/c/grass_block_by_barakaldo-d58bi3u.gif'
          )
          .addFields({
            name: `Players Online (${
              data.players.online + '/' + data.players.max
            })`,
            value: `${
              data.players.list.length > 0
                ? data.players.list.join('\r\n')
                : '[No Players Online]'
            }`,
          })
          .setTimestamp();
        interaction.editReply({
          embeds: [embed],
        });
      });
  } else if (commandName === 'whitelist') {
    const name = options.getString('username');
    const id = interaction.member.id;

    await interaction.deferReply({
      ephemeral: false,
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    await interaction.editReply({
      content: `Username **${name}** has been whitelisted on the server 👍 <@${id}>`,
    });
  }
});

client.login(process.env.DISCORDJS_BOT_TOKEN);
