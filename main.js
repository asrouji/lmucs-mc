import DiscordJS, { Intents, Interaction, MessageEmbed } from 'discord.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';

dotenv.config();

const CREATE_COMMANDS = false;

const client = new DiscordJS.Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.on('ready', () => {

  console.log('Bot is ready!');

  client.user.setActivity("lmucs1.my.pebble.host", {
    type: "PLAYING",
  });

  const guildId = '870102910447546418';
  const guild = client.guilds.cache.get(guildId);
  let commands;

  if (guild) {
    commands = guild.commands;
  } else {
    commands = client.application?.commands;
  }

  if (CREATE_COMMANDS) {
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

    commands?.create({
      name: 'playtime',
      description: 'Displays a leaderboard of players with the most time spent on the server.',
    });

  }

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

    const playerData = JSON.parse(fs.readFileSync('players.json').toString());

    fetch('https://api.mcsrvstat.us/2/play.emeraldisle.fun')
      .then((response) => response.json())
      .then((data) => {
        let playerString = '';
        for (let player of data.players.list) {
          let found = false;
          for (let user of playerData) {
            if (player === user.name) {
              playerString += `${user.name} (${user.nick})\r\n`;
              found = true;
            }
          }
          if (!found) {
            playerString += `${player}\r\n`;
          }
        }
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
                ? playerString
                : '[No Players Online]'
            }`,
          })
          .setTimestamp()
          .setThumbnail(
            'https://scontent-lax3-1.xx.fbcdn.net/v/t1.6435-9/69144297_2292516594298688_6969891426372943872_n.jpg?_nc_cat=100&ccb=1-5&_nc_sid=973b4a&_nc_ohc=o1qE9IQfHq8AX9wmrij&_nc_ht=scontent-lax3-1.xx&oh=abcd43c5cca10e088f2f171b525dc046&oe=616D2DD8'
          );
        interaction.editReply({
          embeds: [embed],
        });
      });
  } else if (commandName === 'whitelist') {
    const name = options.getString('username');
    const nick =
      interaction.member.nickname !== null
        ? interaction.member.nickname
        : interaction.member.user.username;

    await interaction.deferReply({
      ephemeral: false,
    });

    let playerData = JSON.parse(fs.readFileSync('players.json').toString());
    let player = { nick: nick, name: name };

    let response = `Username **${name}** has been whitelisted on the server 👍`;
    let newPlayer = true;

    for (let user of playerData) {
      if (user.nick === nick) {
        newPlayer = false;
        if (user.name === name) {
          response = `Username **${name}** is already whitelisted!`;
        } else {
          user.name = name;
          fs.writeFileSync('players.json', JSON.stringify(playerData));
        }
      }
    }

    if (newPlayer) {
      playerData.push(player);
      fs.writeFileSync('players.json', JSON.stringify(playerData));
    }

    await interaction.editReply({
      content: response,
    });
  } else if (commandName === 'playtime') {
    await interaction.deferReply({
      ephemeral: false,
    });

    const playerData = JSON.parse(fs.readFileSync('players.json').toString());

    fetch('https://api.mcsrvstat.us/2/play.emeraldisle.fun')
      .then((response) => response.json())
      .then((data) => {
        let playerString = '';
        for (let player of data.players.list) {
          let found = false;
          for (let user of playerData) {
            if (player === user.name) {
              playerString += `${user.name} (${user.nick})\r\n`;
              found = true;
            }
          }
          if (!found) {
            playerString += `${player}\r\n`;
          }
        }
        const embed = new MessageEmbed()
          .setColor('#5b8731')
          .setAuthor(
            'Server Playtime Leaderboard',
            'https://images-ext-1.discordapp.net/external/ha2UA0g2Fsh0wn67g6bU49JA1YOJFqyn2LgPvDS2W2w/https/orig00.deviantart.net/34de/f/2012/204/b/c/grass_block_by_barakaldo-d58bi3u.gif'
          )
          .addFields({
            name: `All Time`,
            value: `${
              data.players.list.length > 0
                ? playerString
                : '[No Players Online]'
            }`,
          })
          .setTimestamp()
          .setThumbnail(
            'https://scontent-lax3-1.xx.fbcdn.net/v/t1.6435-9/69144297_2292516594298688_6969891426372943872_n.jpg?_nc_cat=100&ccb=1-5&_nc_sid=973b4a&_nc_ohc=o1qE9IQfHq8AX9wmrij&_nc_ht=scontent-lax3-1.xx&oh=abcd43c5cca10e088f2f171b525dc046&oe=616D2DD8'
          );
        interaction.editReply({
          embeds: [embed],
        });
      });
  }
});

client.login(process.env.DISCORDJS_BOT_TOKEN);
