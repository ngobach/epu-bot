const http = require('http');
const Bot = require('messenger-bot');
const moment = require('moment');
const express = require('express');
const bodyParser = require('body-parser');

const EPU = require('./epu');

require('dotenv').config();
moment.locale('vi_VN');

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
        // Handling text message
        let text = payload.message.text.toLowerCase();
        if (/(hi|hello|chao|chào)/.test(text)) {
            // Just greeting
            reply({ text: 'Xin chào' });
        } else if (/\b(tks|thank|cam on|cảm ơn)\b/.test(text)) {
            // Say thanks
            reply({ text: 'My pleasure <3' });
        } else if (/\b(dit|lon|địt|lồn|f.ck|đĩ|đũy)\b/.test(text)) {
            // Hater =))
            reply({ text: 'GTFO ;)))' });
        } else if (/\d{10}/.test(text)) {
            // Show menu for Student
            const tt = new EPU.TimeTable(text);
            tt.fetch().then(data => {
                reply({
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'button',
                            text: `Xin chào ${data.name}\nTôi có thể giúp gì bạn?`,
                            buttons: [{
                                type: "postback",
                                title: "TKB tuần này",
                                payload: JSON.stringify({ id: text, action: 'timetable', param: {} })
                            }, {
                                type: "postback",
                                title: "TKB tuần sau",
                                payload: JSON.stringify({ id: text, action: 'timetable', param: { nextWeek: true } })
                            }, ]
                        }
                    }
                }, (err) => {
                    if (err) {
                        console.error(err);
                    }
                });
            }).catch(() => {
                reply({
                    text: 'Xin lỗi, mã sinh viên này không tồn tại :('
                });
            });
        } else {
            reply({ text: 'Để bắt đầu, vui lòng cho tôi biết mã số sinh viên của bạn.\nVD: 1381310007' });
        }
    } else {
        // Handling attachment
        reply({ text: '<3' });
    }
});

bot.on('postback', (payload, reply, action) => {
    const postback = JSON.parse(payload.postback.payload);
    switch (postback.action) {
        case 'timetable':
            const tt = new EPU.TimeTable(postback.id);
            tt.fetch().then(data => {
                const startDate = moment().utcOffset('+07:00').day(0);
                if (postback.param.nextWeek) {
                    startDate.add(1, 'week');
                }
                const endDate = moment(startDate).day(6);
                data = [];
                let empty = true;
                const currentDate = moment(startDate);
                while (!currentDate.isAfter(endDate)) {
                    if (tt.get(currentDate)) {
                        data[currentDate.format(EPU.DATE_FORMAT)] = tt.get(currentDate);
                        empty = false;
                    }
                    currentDate.add(1, 'd');
                }

                let pr = reply({
                    text: `📅 Từ ${startDate.format(EPU.DATE_FORMAT)} đến ${endDate.format(EPU.DATE_FORMAT)}`
                }, () => {
                    if (empty) {
                        reply({ text: 'Tuyệt vời 💗\nKhông có lịch nào cả' });
                    } else {
                        const messages = [];
                        for (let key in data) {
                            let text = data[key].map((sub) => {
                                return `📝 ${sub.subject}\n` +
                                    `🕒Tiết ${sub.startAt} ` +
                                    `🏫 ${sub.room}`;
                            }).join('\n----------\n');
                            messages.push(`📅 ${labelFor(moment(key, EPU.DATE_FORMAT))}\n\n${text}`);
                        }
                        messages.reduce((prev, curr) => {
                            return prev.then(() => {
                                return new Promise((res, rej) => {
                                    reply({ text: curr }, (err) => {
                                        if (!err) res();
                                        else rej(err);
                                    });
                                });
                            });
                        }, Promise.resolve(true));
                    }
                });
            });
            break;
        default:
            reply({ text: 'Undefined postback action: ' + postback.action });
    }
});

// Helper functions
function labelFor(m) {
    const now = moment().startOf('day');
    // const now = moment('2017-02-14', 'YYYY-MM-DD').startOf('day');
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
 * Http Server
 */
const app = express();

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
    res.setHeader('X-Author-Email', 'mail@ngobach.net');
    next();
});

app.use(express.static('public'));

app.listen(5000, () => {
    console.log('Express application running at 0.0.0.0:%d, NODE_ENV: %s', process.env.HTTP_PORT, process.env.NODE_ENV);
});