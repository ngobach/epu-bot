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
}

exports.PayloadFactory = PayloadFactory;