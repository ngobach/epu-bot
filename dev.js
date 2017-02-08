const EPU = require('./epu');

const tt = new EPU.TimeTable('1381310007');
tt.fetch().then(() => {
    console.log(tt.get('2017-02-14'));
});