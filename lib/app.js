const http = require('http');
const Bot = require('./messenger-bot');
const moment = require('moment');
const express = require('express');
const bodyParser = require('body-parser');

const EPU = require('./epu');
const PayloadFactory = require('./payload').PayloadFactory;
const DATE_FORMAT = require('./constants').DATE_FORMAT;
const responses = require('./responses');

require('dotenv').config();
moment.locale('vi_VN');

/**
 * Helper functions
 */
function labelFor(m) {
    const now = moment().startOf('day');
    switch (now.diff(m, 'days')) {
        case 1:
            return 'Hôm qua';
        case 0:
            return 'Hôm nay';
        case -1:
            return 'Ngày mai';
        case -2:
            return 'Ngày kia';
    }
    let res = m.format('dddd');
    res = res[0].toUpperCase() + res.slice(1);
    return res;
}

/**
 * Return random element in array
 */
function randElem(arr) {
    return arr[~~(Math.random() * arr.length)];
}

/**
 * Entrypoint for postback messages
 */
function handlePostback(postback, reply) {
    switch (postback.action) {
        case 'timetable':
            const tt = new EPU.TimeTable(postback.param.id);
            tt.fetch().then(data => {
                const startDate = moment(postback.param.day, DATE_FORMAT).utcOffset('+07:00').day(0);
                const endDate = moment(startDate).day(6);
                data = [];
                let empty = true;
                const currentDate = moment(startDate);
                while (!currentDate.isAfter(endDate)) {
                    if (tt.get(currentDate)) {
                        data[currentDate.format(DATE_FORMAT)] = tt.get(currentDate);
                        empty = false;
                    }
                    currentDate.add(1, 'd');
                }

                let pr = reply({
                    text: `📅 Từ ${startDate.format(DATE_FORMAT)} đến ${endDate.format(DATE_FORMAT)}`
                }, () => {
                    if (empty) {
                        reply({ text: 'Ameizing 💗\nKhông có lịch nào cả' });
                    } else {
                        const messages = [];
                        for (let key in data) {
                            let text = data[key].map((sub) => {
                                return `📝 ${sub.subject}\n` +
                                    `🕒Tiết ${sub.startAt} ` +
                                    `🏫 ${sub.room}`;
                            }).join('\n------------\n');
                            messages.push(`📅 ${labelFor(moment(key, DATE_FORMAT))} (${key})\n\n${text}`);
                        }
                        messages.reduce((prev, curr) => {
                                return prev.then(() => {
                                    return reply({ text: curr });
                                });
                            }, Promise.resolve(true))
                            .then(() => {
                                // Sending Navigator between weeks
                                reply({
                                    text: 'Bạn có muốn xem tuần khác?',
                                    quick_replies: [{
                                        content_type: 'text',
                                        title: 'Tuần trước',
                                        payload: PayloadFactory.timeTable(postback.param.id, moment(startDate).add(-1, 'weeks'))
                                    }, {
                                        content_type: 'text',
                                        title: 'Tuần tiếp',
                                        payload: PayloadFactory.timeTable(postback.param.id, moment(startDate).add(1, 'weeks'))
                                    }]
                                });
                            });
                    }
                });
            });
            break;
        case 'welcome':
            reply({ text: 'Chào mừng bạn đến với EPU Bot 🤖\nWebsite: https://epubot.me/' })
                .then(() => reply({ text: 'Để tiếp tục, vui lòng cho mình biết MSSV của bạn.' }));
            break;
        case 'help':
            // TODO: Build help menus
            reply({ text: 'Chức năng này đang được xây dựng :(' })
            break;
        default:
            reply({ text: 'Undefined postback action: ' + postback.action });
    }
}

/**
 * Entrypoint for text messages
 */
function handleTextMessage(text, reply) {
    const response = responses.find(resp => resp.pattern && resp.pattern.test(text));
    if (response) {
        // Found corresponding response
        const arr = response.response;
        reply({ text: randElem(arr) });
    } else if (/\d{10}/.test(text)) {
        // Show menu for Student
        const tt = new EPU.TimeTable(text);
        tt.fetch().then(data => {
            return reply({
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'button',
                        text: `Xin chào ${data.name}\nMình có thể giúp gì bạn?`,
                        buttons: [{
                            type: "postback",
                            title: "TKB tuần này",
                            payload: PayloadFactory.timeTable(text)
                        }, {
                            type: "postback",
                            title: "TKB tuần sau",
                            payload: PayloadFactory.timeTable(text, moment().utcOffset('+07:00').add(1, 'weeks'))
                        }]
                    }
                }
            });
        }).catch((err) => {
            console.error(err);
            return reply({
                text: 'Xin lỗi, mã sinh viên này không tồn tại :('
            });
        });
    } else {
        reply({ text: randElem(responses.default.response) }).then(() => {
            return reply({ text: 'VD: "1381310069" (chính xác 10 số)' });
        });
    }
}
/**
 * Main Application bot interface
 */
let bot = new Bot({
    token: process.env.PAGE_TOKEN,
    verify: process.env.VERIFY_TOKEN,
    app_secret: process.env.APP_SECRET
});

bot.on('error', (err) => {
    console.error(err.message);
});

bot.on('message', (payload, reply) => {
    if (payload.message.text) {
        // Check if this is a quick reply
        if (payload.message.quick_reply) {
            handlePostback(JSON.parse(payload.message.quick_reply.payload), reply);
            return;
        }
        // Handling text message
        let text = payload.message.text.toLowerCase();
        handleTextMessage(text, reply);
    } else {
        // Handling attachment
        reply({ text: '<3' });
    }
});

bot.on('postback', (payload, reply, action) => {
    const postback = JSON.parse(payload.postback.payload);
    handlePostback(postback, reply);
});


/**
 * Http Server
 */
const app = module.exports = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/webhook', (req, res) => {
    return bot._verify(req, res)
});

app.post('/webhook', (req, res) => {
    bot._handleMessage(req.body)
    res.end(JSON.stringify({ status: 'ok' }))
});

app.use((req, res, next) => {
    res.setHeader('X-Author-Name', 'BachNX');
    res.setHeader('X-Author-Email', 'mail@ngobach.com');
    next();
});

app.use(express.static('public'));

/**
 * Register persistence menu
 */
app.registerMenu = function() {
    // Greeting message
    bot.setGreeting('Xin chào {{user_full_name}}, hân hạnh được phục vụ bạn!');

    // Getting started button
    bot.setGetStartedButton([{
        payload: PayloadFactory.welcome()
    }]);

    // Persistent Menu
    bot.setPersistentMenu([{
        type: 'postback',
        title: '🔥 Bắt đầu',
        payload: PayloadFactory.welcome()
    }, {
        type: 'web_url',
        title: '🏠 Trang chủ',
        url: 'https://epubot.me/'
    }, {
        type: 'postback',
        title: '❓ Hướng dẫn',
        payload: PayloadFactory.help()
    }]);
}