const request = require('request');
const cheerio = require('cheerio');
const moment = require('moment');
const cache = require('lru-cache')(1000);
const DATE_FORMAT = 'DD/MM/YYYY';

function get(url) {
    return new Promise((res, rej) => {
        request(url, (err, response, body) => {
            if (err) return rej(err);
            res(body);
        });
    });
}

class TimeTable {

    constructor(student) {
        this.student = student;
    }

    fetch() {
        let promise;
        if (cache.has(this.student)) {
            promise = Promise.resolve(cache.get(this.student));
        } else {
            promise = get(`http://dkmh.epu.edu.vn/default.aspx?page=thoikhoabieu&sta=1&id=${this.student}`)
                .then(cheerio.load)
                .then($ => {
                    const name = $('#ctl00_ContentPlaceHolder1_ctl00_lblContentTenSV').text().split('-')[0].trim();
                    const firstWeek = moment($('#ctl00_ContentPlaceHolder1_ctl00_lblNote').text().match(/\d+\/\d+\/\d+/)[0], 'DD/MM/YYYY').startOf('week').utcOffset("+07:00");
                    const $table = $('.grid-roll2');

                    // Check for invalid id
                    if (!name) {
                        return Promise.reject('Invalid student id');
                    }

                    let data = [];
                    $table.children().each((id, elem) => {
                        const $row = $(elem).find('tr').first().children('td');
                        const subject = $row.eq(1).text();
                        const count = $row.eq(7).children().length;
                        for (let i = 0; i < count; i++) {
                            data.push({
                                subject,
                                dayOfWeek: +$row.eq(8).children().eq(i).text(),
                                startAt: +$row.eq(9).children().eq(i).text(),
                                length: +$row.eq(10).children().eq(i).text(),
                                room: $row.eq(11).children().eq(i).text().trim(),
                                weeks: $row.eq(13).children().eq(i).text().trim(),
                            });
                        }
                    });
                    data = data.filter(subject => subject.dayOfWeek > 0);
                    return {
                        name,
                        firstWeek,
                        data,
                    };
                })
                .then(data => {
                    cache.set(this.student, data);
                    return data;
                })
        }

        return promise.then((res) => {
            this.data = [];
            res.data.forEach((sub) => {
                for (let i = 0; i < sub.weeks.length; i++) {
                    if (sub.weeks.charAt(i) !== '-') {
                        const key = moment(res.firstWeek).add(i, 'week').day(sub.dayOfWeek - 1).format(DATE_FORMAT);
                        this.data[key] = this.data[key] || [];
                        this.data[key].push(sub);
                    }
                }
            });
            for (let key in this.data) {
                this.data[key] = this.data[key].sort((a, b) => {
                    return a.startAt < b.startAt ? -1 : 1;
                });
            }
            return res;
        });
    }

    get(date) {
        const key = moment(date).format(DATE_FORMAT);
        if (!this.data || !this.data[key]) return null;
        return this.data[key];
    }
}

/**
 * Common responses
 */
exports.COMMON_MESSAGES = [{
        pattern: /(\bhi\b|hello|chao|chào)/,
        response: [
            'Xin chào :)',
            'Chào bạn :D',
            'Hello',
            'Bonjour'
        ]
    },
    {
        pattern: /((d|đ)(i|ị)t|lon|lồn|f.ck|đĩ|đũy|dm|đm|vl|vcc)/,
        response: [
            'GTFO ;)))',
            'Biến đi cháu',
            'C*c'
        ]
    },
    {
        pattern: /(tks|thank|cam on|cảm ơn)/,
        response: [
            'My pleasure <3',
            'You\'re welcome!'
        ]
    }
];

class PayloadFactory {
    static timeTable(id, day = moment().utcOffset('+07:00')) {
        return JSON.stringify({
            action: 'timetable',
            param: {
                id,
                day: day.day(0).format(DATE_FORMAT)
            }
        });
    }
}

exports.TimeTable = TimeTable;
exports.DATE_FORMAT = DATE_FORMAT;
exports.PayloadFactory = PayloadFactory;