const rp = require('request-promise');
const cheerio = require('cheerio');
const moment = require('moment');
const cache = require('lru-cache')(1000);
const DATE_FORMAT = require('./constants').DATE_FORMAT;

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
            promise = rp(`http://dkmh.epu.edu.vn/default.aspx?page=thoikhoabieu&sta=1&id=${this.student}`)
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
                });
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

class SVDBCL {
    constructor() {
        this.request = rp.defaults({
            jar: rp.jar(),
            followAllRedirects: true,
            timeout: 10000
        });
    }

    // Login
    login() {
        return this.request('http://svdbcl.epu.edu.vn/default.htm')
            .then(html => cheerio.load(html))
            .then($ => {
                return $('#frmMain').serializeArray().reduce((pre, cur) => {
                    return Object.assign(pre, { [cur.name]: cur.value });
                }, {})
            })
            .then(form => {
                return Object.assign(form, {
                    '_ctl11:_ctl0:inpUserName': process.env.SVDBCL_USERNAME,
                    '_ctl11:_ctl0:inpPassword': process.env.SVDBCL_PASSWORD,
                    '_ctl11:_ctl0:inpSave': 'on',
                    '_ctl11:_ctl0:butLogin': 'Đăng nhập'
                });
            })
            .then(form => {
                return this.request({
                    uri: 'http://svdbcl.epu.edu.vn/default.htm',
                    method: 'POST',
                    form,
                    headers: {
                        Referer: 'http://svdbcl.epu.edu.vn/default.htm'
                    }
                });
            });
    }

    // Helper function check login status and make get request
    get(url) {
        return this.request.get(url)
            .then(html => {
                if (html.indexOf('/logout/') >= 0) {
                    return html;
                }
                return this.login().then(() => this.request.get(url));
            });
    }

    diemthi(id) {
        return this.get(`http://svdbcl.epu.edu.vn/student/viewexamresult/xem-ket-qua-hoc-tap.htm?code=${id}`)
            .then(cheerio.load)
            .then($ => {
                const result = $('.kTable tbody tr').map((i, el) => {
                    const $cols = $(el).find('td');
                    return {
                        name: $cols.eq('1').text().trim(),
                        mark: $cols.eq('8').text().trim(),
                        first: {
                            mark: $cols.eq('2').text().trim(),
                            final: `${$cols.eq('4').text().trim()} (${$cols.eq('6').text().trim()})`,
                            date: $cols.eq('9').text().trim()
                        },
                        second: {
                            mark: $cols.eq('3').text().trim(),
                            final: `${$cols.eq('5').text().trim()} (${$cols.eq('7').text().trim()})`,
                            date: $cols.eq('10').text().trim()
                        }
                    }
                }).get().filter(item => item.mark !== '' && item.mark !== '(I)').sort((a, b) => {
                    function date(item) {
                        let result = item.second.date ? item.second.date : item.first.date;
                        result = moment(result, 'DD/MM/YYYY');
                        return result;
                    }
                    return date(a).isBefore(date(b)) ? 1 : -1;
                });
                return result;
            });
    }

    kqht(id) {
        return this.get(`http://svdbcl.epu.edu.vn/student/viewstudyresult/xem-ket-qua-hoc-tap.htm?code=${id}`)
            .then(cheerio.load)
            .then($ => {
                const $tbody = $('.kTable tbody tr');
                return $tbody.map((idx, el) => {
                    const $cols = $(el).find('td');
                    return {
                        name: $cols.eq('1').text().trim(),
                        mark: $cols.eq('11').text().trim()
                    }
                }).get();
            })
    }
}

exports.TimeTable = TimeTable;
exports.sv = new SVDBCL();