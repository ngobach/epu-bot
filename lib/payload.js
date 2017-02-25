const moment = require('moment');

/**
 * Payload generator class
 */
class PayloadFactory {
    static timeTable(id, day = moment().utcOffset('+07:00')) {
        return JSON.stringify({
            action: 'timetable',
            param: {
                id,
                day: day.day(0).format(require('./constants').DATE_FORMAT)
            }
        });
    }

    static welcome() {
        return JSON.stringify({
            action: 'welcome'
        });
    }
    static help() {
        return JSON.stringify({
            action: 'help'
        });
    }
    static marks() {
        return JSON.stringify({
            action: 'marks',
            param: {

            }
        });
    }
    static recents() {
        return JSON.stringify({
            action: 'recents'
        });
    }
}

exports.PayloadFactory = PayloadFactory;