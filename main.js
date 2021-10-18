import DiscordJS, { Intents, Interaction, MessageEmbed } from 'discord.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import { Rcon } from 'rcon-client';

dotenv.config();

const CREATE_COMMANDS = false;

let whitelist_enabled = false;

const rcon = await Rcon.connect({
  host: '51.81.204.28',
  port: '8182',
  password: 'lmucs',
});

const client = new DiscordJS.Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.DIRECT_MESSAGES,
  ],
  partials: ['CHANNEL'],
});

client.on('ready', () => {
  console.log('Bot is ready!');

  client.user.setActivity('mc.lmucs.io', {
    type: 'PLAYING',
  });

  const guildId = '895557841925050388';
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
      description: 'Outputs the bot and API latency',
    });

    commands?.create({
      name: 'server',
      description: 'View Minecraft server status and see players online',
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
      description:
        'Displays a leaderboard of players with the most playtime on the Minecraft server',
    });
  }
});

client.on('guildMemberAdd', (member) => {
  const embed = new MessageEmbed()
    .setColor('#5b8731')
    .setTitle(`Welcome to the Server ${member.user.username}!`)
    .setDescription(
      `To gain access to the rest of the server,\n **reply here with your first and last name!**`
    )
    .setFooter(`Check out #getting-started next to get whitelisted!`);
  member.send({
    embeds: [embed],
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.type == 'DM') {
    const nick = message.content;
    if (nick === 'whitelist_enable') {
      whitelist_enabled = true;
      return;
    }
    const member = await client.guilds.cache
      .get('895557841925050388')
      .members.fetch(message.author.id);
    member.setNickname(nick);
    member.roles.add('895558382948343870');
    member.send(
      `Thanks ${
        nick.split(' ')[0]
      }! You can now see the rest of the server. Take a look at **<#895761647233278052>** to get playing!`
    );
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

    if (rcon == undefined) {
      interaction.editReply({
        content: 'Server is offline!',
      });
      return;
    }

    const playerData = JSON.parse(fs.readFileSync('players.json').toString());

    fetch('https://api.mcsrvstat.us/2/mc.lmucs.io')
      .then((response) => response.json())
      .then((data) => {
        let playerString = '';
        const playerList = data?.players?.list;
        if (playerList) {
          for (let player of playerList) {
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
        } else {
          playerString = '[No Players Online]';
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
            value: playerString,
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
    if (!whitelist_enabled) {
      interaction.reply({
        content: 'Whitelist will open Tuesday at 7:30PM!',
      });
      return;
    }
    const name = options.getString('username');
    const nick =
      interaction.member.nickname !== null
        ? interaction.member.nickname
        : interaction.member.user.username;
    const id = interaction.member.user.id;

    await interaction.deferReply({
      ephemeral: false,
    });

    await Promise.all([rcon.send(`whitelist add ${name}`)]);

    let playerData = JSON.parse(fs.readFileSync('players.json').toString());
    let player = { nick: nick, name: name, id: id };

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

    let playerTimes = [];
    for (let player of playerData) {
      const name = player.name;
      const nick = player.nick;
      const id = player.id;
      let responsePlaytime = await rcon.send(`playtime alltime player ${name}`);
      if (responsePlaytime.indexOf('not found') !== -1) {
        playerTimes.push({
          id: id,
          nick: nick,
          playtimeArr: [0, 0, 0],
          totalTime: 0,
        });
        continue;
      }
      let response = responsePlaytime.substring(2);
      let index = response.indexOf('§9');
      response = response.substring(index + 2);
      response = response.substring(0, response.indexOf('§') - 1);
      response = response.replace(/\D/g, ' ');
      response = response.replace(/  +/g, ' ');
      response = response.split(' ');
      response.pop();
      while (response.length < 3) {
        response.unshift('0');
      }
      if (responsePlaytime.indexOf('minute') === -1) {
        response[0] = response[1];
        response[1] = response[2];
        response[2] = '0';
      }
      if (responsePlaytime.indexOf('hour') === -1 && responsePlaytime.indexOf('day') !== -1) {
        response[0] = response[1];
        response[1] = '0';
      }
      response = response.map(Number);
      let totalTime = 1440 * response[0] + 60 * response[1] + response[2];
      playerTimes.push({
        id: id,
        nick: nick,
        playtimeArr: response,
        totalTime: totalTime,
      });
    }
    playerTimes.sort(function (a, b) {
      return b.totalTime - a.totalTime;
    });
    let timeString = '';
    let count = 0;
    for (let time of playerTimes) {
      const member = await client.guilds.cache
        .get('895557841925050388')
        .members.fetch(time.id);
      if (
        !member.roles.cache.some((role) => role.id === '895785110614470686') &&
        time.totalTime > 100 * 60
      ) {
        member.roles.add('895785110614470686');
      } else if (
        !member.roles.cache.some((role) => role.id === '895785887718309909') &&
        time.totalTime > 50 * 60
      ) {
        member.roles.add('895785887718309909');
      } else if (
        !member.roles.cache.some((role) => role.id === '895785017303777340') &&
        time.totalTime > 25 * 60
      ) {
        member.roles.add('895785017303777340');
      } else if (
        !member.roles.cache.some((role) => role.id === '895784799090929734') &&
        time.totalTime > 10 * 60
      ) {
        member.roles.add('895784799090929734');
      }
      if (count >= 10) {
        continue;
      }
      count++;
      if (time.playtimeArr[0] > 0 || time.playtimeArr[1] > 0)
        timeString += `**${count}.** ${time.nick} (${
          24 * time.playtimeArr[0] + time.playtimeArr[1]
        } hours)\r\n`;
      else {
        timeString += `**${count}.** ${time.nick} (${time.playtimeArr[2]} minutes)\r\n`;
      }
    }
    const embed = new MessageEmbed()
      .setColor('#5b8731')
      .setAuthor(
        'mc.lmucs.io',
        'https://images-ext-1.discordapp.net/external/ha2UA0g2Fsh0wn67g6bU49JA1YOJFqyn2LgPvDS2W2w/https/orig00.deviantart.net/34de/f/2012/204/b/c/grass_block_by_barakaldo-d58bi3u.gif'
      )
      .addFields({
        name: `Server Playtime Leaderboard`,
        value: timeString,
      })
      .setFooter('AFK time is excluded!')
      .setTimestamp()
      .setThumbnail(
        'https://scontent-lax3-1.xx.fbcdn.net/v/t1.6435-9/69144297_2292516594298688_6969891426372943872_n.jpg?_nc_cat=100&ccb=1-5&_nc_sid=973b4a&_nc_ohc=o1qE9IQfHq8AX9wmrij&_nc_ht=scontent-lax3-1.xx&oh=abcd43c5cca10e088f2f171b525dc046&oe=616D2DD8'
      );

    await interaction.editReply({
      embeds: [embed],
    });
  }
});

client.login(process.env.DISCORDJS_BOT_TOKEN);
