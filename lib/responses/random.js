const messages = [
    '<3 <3 <3',
    ':)',
    ';*',
    'XD'
];

module.exports = function() {
    return require('lodash')(messages).sample();
}