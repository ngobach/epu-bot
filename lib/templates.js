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
                    template_type: 'generic',
                    image_aspect_ratio: 'horizontal',
                    elements: [
                        {
                            title: 'Tra cứu thời khóa biểu',
                            buttons: [{
                                type: 'postback',
                                title: 'TKB tuần này',
                                payload: PayloadFactory.timeTable(id)
                            }, {
                                type: 'postback',
                                title: 'TKB tuần sau',
                                payload: PayloadFactory.timeTable(id, moment().utcOffset('+07:00').add(1, 'weeks'))
                            }]
                        }, {
                            title: 'Tra cứu web svdbcl.epu.edu.vn',
                            buttons: [
                                {
                                    type: 'web_url',
                                    title: 'Kết quả học tập',
                                    url: `${process.env.SITE_URL}/student/kqht/${id}`
                                }, {
                                    type: 'web_url',
                                    title: 'Điểm thi',
                                    url: `${process.env.SITE_URL}/student/diemthi/${id}`
                                }
                            ]
                        }
                    ]
                }
            }
        }
    },

    recentUsed(ids) {
        return this._quickRepy('Người dùng gần đây', ids.map(id => [id, /* PayloadFactory.timeTable(id) */ '']));
    },

    introduce() {
        return {
            attachment: {
                type: 'template',
                payload: {
                    template_type: 'generic',
                    image_aspect_ratio: 'horizontal',
                    elements: [{
                        title: 'EPU Bot',
                        subtitle: 'Xây dựng và phát triển bởi BachNX D8CNPM',
                        buttons: [{
                                type: 'element_share'
                            },
                            {
                                type: 'web_url',
                                url: "https://github.com/thanbaiks/epu-bot",
                                title: "Github"
                            },
                            {
                                type: 'web_url',
                                url: process.env.SITE_URL,
                                title: 'Trang chủ'
                            }
                        ]
                    }]
                }
            }
        }
    }
}