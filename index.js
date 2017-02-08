const http = require('http');
const Bot = require('messenger-bot');
const EPU = require('./epu');
const moment = require('moment');

require('dotenv').config();

let bot = new Bot({
    token: process.env.PAGE_TOKEN,
    verify: process.env.VERIFY_TOKEN,
    app_secret: process.env.APP_SECRET
});

bot.on('error', (err) => {
    console.error(err.message);
});

bot.on('message', (payload, reply) => {
    let text = payload.message.text;
    if (/(hi|hello|chao|chào)/.test(text)) {
        // Just greeting
        reply({ text: 'Xin chào' });
    } else if (/(tks|thank|cam on|cảm ơn)/.test(text)) {
        // Say thanks
        reply({ text: 'My pleasure <3' });
    } else if (/(dit|lon|địt|lồn|f.ck|đĩ|đũy)/.test(text)) {
        // Hater =))
        reply({ text: 'GTFO ;)))' });
    } else if (/\d+/.test(text)) {
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
                            title: "Thời khóa biểu",
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
        reply({ text: 'Xin lỗi. Tôi không hiểu bạn đang cần gì :(\n\nĐể bắt đầu, vui lòng cho tôi biết mã số sinh viên của bạn.\nVD: 1381310007' });
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
                while (!startDate.isAfter(endDate)) {
                    if (tt.get(startDate))
                        data.push(...tt.get(startDate));
                    startDate.add(1, 'd');
                }

                let pr = reply({
                    text: `📅 Từ ${startDate.format('DD/MM/YYYY')} đến ${endDate.format('DD/MM/YYYY')}`
                }, () => {
                    if (data.length === 0) {
                        reply({ text: 'Tuyệt vời 💗!\nKhông có lịch nào cả' });
                    } else {
                        let text = data.map((sub) => {
                            return `📝 ${sub.subject}\n` +
                                `🕒 Từ tiết: ${sub.startAt}\n` +
                                `🏫 Phòng: ${sub.room}`;
                        }).join('\n----------\n');
                        reply({ text });
                    }
                });
            });
            break;
        default:
            reply({ text: 'Undefined postback action: ' + postback.action });
    }
});

http.createServer(bot.middleware()).listen(process.env.HTTP_PORT);
console.log('Bot server running at port :%d.', process.env.HTTP_PORT);