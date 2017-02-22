const request = require('request');
const cheerio = require('cheerio');
const moment = require('moment');
const cache = require('lru-cache')(1000);
const DATE_FORMAT = require('./constants').DATE_FORMAT;

/**
 * Hepler function make GET request
 * And return promise
 */
function get(url) {
    return new Promise((res, rej) => {
        request(url, (err, response, body) => {
            if (err) return rej(err);
            res(body);
        });
    });
}

/**
 * Class for fetching time table
 */
class TimeTable {

    /**
     * @param string student    Student's ID
     */
    constructor(student) {
        this.student = student;
    }

    /**
     * Fetching function
     * Return promise
     */
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

    /**
     * Get timetable of a date
     */
    get(date) {
        const key = moment(date).format(DATE_FORMAT);
        if (!this.data || !this.data[key]) return null;
        return this.data[key];
    }
}

exports.TimeTable = TimeTable;