const http = require('http');
const path = require('path');
const Bot = require('./messenger-bot');
const moment = require('moment');
const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');

const EPU = require('./epu');
const PayloadFactory = require('./payload').PayloadFactory;
const DATE_FORMAT = require('./constants').DATE_FORMAT;
const responses = require('./responses');
const templates = require('./templates');

require('dotenv').config();
moment.locale('vi_VN');

const db = require('lowdb')(path.join(__dirname, '..', 'data.json'));
db.defaults({ users: {} })
    .write();

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
 * Entrypoint for postback messages
 */
function handlePostback(sender, postback, reply) {
    switch (postback.action) {
        case 'timetable':
            const studentId = postback.param.id;
            const tt = new EPU.TimeTable(studentId);
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
                                        title: 'Tuần trước ◀️',
                                        payload: PayloadFactory.timeTable(postback.param.id, moment(startDate).add(-1, 'weeks'))
                                    }, {
                                        content_type: 'text',
                                        title: '▶️ Tuần tiếp',
                                        payload: PayloadFactory.timeTable(postback.param.id, moment(startDate).add(1, 'weeks'))
                                    }]
                                });
                            });
                    }
                });
            });
            break;
        case 'welcome':
            reply({
                    attachment: {
                        type: 'image',
                        payload: {
                            url: `${process.env.SITE_URL}/img/og.jpg`
                        }
                    }
                })
                .then(() => reply({ text: 'Chào mừng bạn đến với EPU Bot' }))
                .then(() => reply({ text: 'Để tiếp tục, vui lòng cho mình biết MSSV của bạn.' }));
            break;
        case 'help':
            // TODO: Build help menus
            reply({ text: 'Chức năng này đang được xây dựng :(' })
            break;
        case 'recents':
            if (db.has(['users', sender])) {
                reply(templates.recentUsed(db.get(['users', sender])));
            } else {
                reply({ text: 'Không có người dùng gần đây.' })
            }
            break;
        case 'introduce':
            reply(templates.introduce());
            break;
        default:
            reply({ text: 'Undefined postback action: ' + postback.action });
    }
}

/**
 * Entrypoint for text messages
 */
function handleTextMessage(sender, text, reply) {
    const response = responses.find(resp => resp.pattern && resp.pattern.test(text));
    if (response) {
        // Found corresponding response
        const arr = response.response;
        reply({ text: _(arr).sample() });
    } else if (/\d{10}/.test(text)) {
        // Show menu for Student
        const tt = new EPU.TimeTable(text);
        tt.fetch().then(data => {
            return reply({ text: `Xin chào ${data.name}\nMình có thể giúp gì bạn?` })
                .then(() => reply(templates.menuFor(text, data.name)));
        }).then(() => {
            const studentId = text;
            let ids = [];
            if (db.has(['users', sender])) {
                ids = db.get(['users', sender]).value();
            }
            db.set(['users', sender], _.toArray(_([studentId]).union(ids).take(5))).write();
        }).catch((err) => {
            console.error(err);
            return reply({
                text: 'Xin lỗi, mã sinh viên này không tồn tại :('
            });
        });
    } else {
        reply({ text: _(responses.default.response).sample() }).then(() => {
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
            handlePostback(payload.sender.id, JSON.parse(payload.message.quick_reply.payload), reply);
            return;
        }
        // Handling text message
        let text = payload.message.text.toLowerCase();
        handleTextMessage(payload.sender.id, text, reply);
    } else {
        // Handling attachment
        reply({ text: require('./responses/random')() });
    }
});

bot.on('postback', (payload, reply, action) => {
    const postback = JSON.parse(payload.postback.payload);
    handlePostback(payload.sender.id, postback, reply);
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

    Promise.resolve()
        .then(() => {
            // Greeting message
            return bot.setGreeting('Xin chào {{user_full_name}}, hân hạnh được phục vụ bạn!')
                .then(console.log);
        })
        .then(() => {
            // Getting started button
            return bot.setGetStartedButton([{
                    payload: PayloadFactory.welcome()
                }])
                .then(console.log);
        }).then(() => {
            // Persistent Menu
            return bot.setPersistentMenu([{
                    type: 'postback',
                    title: '🔥 Bắt đầu',
                    payload: PayloadFactory.welcome()
                }, {
                    type: 'postback',
                    title: '🔥 Người dùng gần đây',
                    payload: PayloadFactory.recents()
                }, {
                    type: 'postback',
                    title: '💎 Giới thiệu',
                    payload: PayloadFactory.introduce()
                }, {
                    type: 'web_url',
                    title: '😟 Báo lỗi!',
                    url: 'https://m.me/r4yqu4z4'
                }])
                .then(console.log);
        });

    const manualButton = {
        type: 'postback',
        title: '❓ Hướng dẫn',
        payload: PayloadFactory.help()
    }
}