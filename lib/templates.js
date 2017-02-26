const PayloadFactory = require('./payload').PayloadFactory;
const moment = require('moment');

module.exports = {
    _quickRepy(text, buttons) {
        return {
            text,
            quick_replies: buttons.map(([title, payload]) => ({ content_type: 'text', title, payload }))
        }
    },

    menuFor(id, name) {
        return {
            attachment: {
                type: 'template',
                payload: {
                    template_type: 'button',
                    text: `Xin chào ${name}\nMình có thể giúp gì bạn?`,
                    buttons: [{
                        type: 'postback',
                        title: 'TKB tuần này',
                        payload: PayloadFactory.timeTable(id)
                    }, {
                        type: 'postback',
                        title: 'TKB tuần sau',
                        payload: PayloadFactory.timeTable(id, moment().utcOffset('+07:00').add(1, 'weeks'))
                    }]
                }
            }
        }
    },

    recentUsed(ids) {
        return this._quickRepy('Người dùng gần đây', ids.map(id => [id, /* PayloadFactory.timeTable(id) */ '']));
    }
}