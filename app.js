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

app.get('/\/tab/.*/', restify.plugins.serveStatic({
    directory: __dirname,
    // default: './index.html'
}));

//=========================================================
// Bots Dialogs
//=========================================================

// When user joins, it begin Greeting dialog
bot.on('conversationUpdate', message => {
    if (message.membersAdded) {
        message.membersAdded.forEach(identity => {
            if (identity.id === message.address.bot.id) {
                bot.beginDialog(message.address, 'Greeting');
            }
        });
    }
});

const firstChoices = {
    "Recommend for lunch": {
        value: 'lunch',
        title: '行列のできるタイ料理屋',
        subtitle: 'ランチセットがコスパ良し',
        text: '品川駅から徒歩10分くらいのところにあるタイ料理屋。トムヤムクンヌードルがおすすめ。',
        imageURL: 'https://sakkuru.github.io/simple-bot-nodejs/images/tom.jpg',
        button: '予約する',
        url: 'http://example.com/'
    },
    "Recommend for drinking": {
        value: 'drink',
        title: '落ち着いた雰囲気の個室居酒屋',
        subtitle: 'なんでも美味しいが、特に焼き鳥がおすすめ',
        text: '品川駅から徒歩5分くらいの路地裏にひっそりある。',
        imageURL: 'https://sakkuru.github.io/simple-bot-nodejs/images/yaki.jpg',
        button: '予約する',
        url: 'http://example.com/'
    }
};

// default first dialog
bot.dialog('/', [
    session => {
        session.send("Hello!");
        session.beginDialog('Greeting');
    }
]);

bot.dialog('Greeting', [
    session => {
        session.send("This is Saki's Bot.");
        session.beginDialog('FirstQuestion');
    }
]);

bot.dialog('FirstQuestion', [
    (session, results, next) => {
        builder.Prompts.choice(session, "What can I do for you?", firstChoices, { listStyle: 3 });
    },
    (session, results, next) => {
        const choice = firstChoices[results.response.entity];
        console.log(results.response);

        session.send('How about this?');

        const card = new builder.HeroCard(session)
            .title(choice.title)
            .subtitle(choice.subtitle)
            .text(choice.text)
            .images([
                builder.CardImage.create(session, choice.imageURL)
            ])
            .buttons([
                builder.CardAction.openUrl(session, choice.url, choice.button)
            ]);

        const msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
        session.beginDialog('EndDialog');
    }
]);

bot.dialog('GetFreeText', [
    session => {
        builder.Prompts.text(session, "Input freely.");
    },
    (session, results) => {
        console.log(results.response);
        const res = util.getLuis(results.response).then(res => {
            console.log('res', res);
            // process LUIS response
        });
    }
]);

bot.dialog('EndDialog', [
    session => {
        builder.Prompts.confirm(session, "Have you solved your problem?", { listStyle: 3 });
    },
    (session, results) => {
        console.log(results.response);
        if (results.response) {
            session.send('Thank you!');
            session.endDialog();
        } else {
            session.send('I\'m sorry for the inconvenience.');
            session.beginDialog('FirstQuestion');
        }
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
        session.beginDialog('FirstQuestion');
    },
]).triggerAction({
    matches: /^exit$/i
});

// Always accepts free text input
bot.dialog('Any', [
    (session, results) => {
        console.log(results.intent.matched.input);
        session.endDialog("Your input: %s", results.intent.matched.input);
        session.beginDialog('Greeting');
    },
]).triggerAction({
    matches: /^.*$/i
});