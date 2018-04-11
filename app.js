require('dotenv').config();
const builder = require('botbuilder');
const restify = require('restify');
const bodyParser = require('body-parser');
const app = restify.createServer();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//=========================================================
// Bot Setup
//=========================================================

const port = process.env.port || process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log('bot is listening on port %s', port);
});

// Create chat bot
const connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

const bot = new builder.UniversalBot(connector);

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
        session.send("Hello! This is Saki's Bot.");
        session.beginDialog('Greeting');
    }
]);

bot.dialog('Greeting', [
    session => {
        session.send("Type something.");
    }
]);

// help command
bot.customAction({
    matches: /^help$/i,
    onSelectAction: (session, args, next) => {
        const helpTexts = [
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
        session.endDialog("End with deleting dialog stack.");
        session.beginDialog('/');
    },
]).triggerAction({
    matches: /^exit$/i
});

// Always accepts free text input
bot.dialog('Any', [
    (session, results) => {
        console.log('input:', results.intent.matched.input);
        session.send("Your input: %s", results.intent.matched.input);
        // session.beginDialog('Greeting');
    },
]).triggerAction({
    matches: /^.*$/i
});