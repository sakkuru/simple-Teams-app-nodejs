require('dotenv').config();
const builder = require('botbuilder');
const restify = require('restify');
const bodyParser = require('body-parser');
const teams = require('botbuilder-teams');
const app = restify.createServer();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//=========================================================
// Bot Setup
//=========================================================

const port = process.env.port || process.env.PORT || 3999;
const server = app.listen(port, () => {
    console.log('bot is listening on port %s', port);
});

// Create chat bot
const connector = new teams.TeamsChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

const bot = new builder.UniversalBot(connector);

const stripBotAtMentions = new teams.StripBotAtMentions();
bot.use(stripBotAtMentions);

bot.on('conversationUpdate', msg => {
    if (!msg.membersAdded) return;
    const members = msg.membersAdded;
    for (let i = 0; i < members.length; i++) {
        console.log(members);
        if (members[i].id.includes(process.env.MicrosoftAppId)) {
            const botmessage = new builder.Message()
                .address(msg.address)
                .text('Hello! This is Saki\'s Bot!');
            bot.send(botmessage, err => {});
            bot.beginDialog(msg.address, 'BotAdded');
        }
    }
});

app.post('/api/messages', connector.listen());

app.get('/', (req, res) => {
    res.send(`Bot is running on port ${port}!\n`);
});

//=========================================================
// Tab Setup
//=========================================================

app.get('/\/tabs/.*/', restify.plugins.serveStatic({
    directory: __dirname,
    // default: './index.html'
}));

//=========================================================
// Bots Dialogs
//=========================================================

// default first dialog
bot.dialog('/', [
    session => {
        session.send("Hello!");
        session.beginDialog('Greeting');
    }
]);

bot.dialog('Greeting', [
    session => {
        session.send("Type help.");
    }
]);

bot.dialog('BotAdded', [
    session => {
        session.send("Saki\'s Bot is added!");
        console.log('Bot is added.');
    }
]);

// help command
bot.customAction({
    matches: /^help$/i,
    onSelectAction: (session, args, next) => {
        const helpTexts = [
            'channel: Show channel meta data.',
            'help: This help menu. Previous dialog is still continues.',
            'exit: End the dialog and back to beginning dialog.',
        ]
        session.send(helpTexts.join('\n\n'));
    }
});

// exit command
bot.dialog('Exit', [
    session => {
        console.log(session.userData);
        session.endDialog("Bye.");
    },
]).triggerAction({
    matches: /^exit$/i
});

// Always accepts free text input
bot.dialog('Channel', [
    (session, results) => {
        const ids = session.message.sourceEvent;
        const conversationId = session.message.address.conversation.id;
        const tenantId = teams.TeamsMessage.getTenantId(session.message);
        connector.fetchMemberList(
            (session.message.address).serviceUrl,
            conversationId,
            tenantId,
            (err, result) => {
                if (err) {
                    session.endDialog('There is some error');
                } else {
                    console.log(result);
                    session.send('Ids: %s', JSON.stringify(ids));
                    session.endDialog('Member list: %s', JSON.stringify(result));
                }
            }
        );
    },
]).triggerAction({
    matches: /^channel.*$/i
});