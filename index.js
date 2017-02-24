const app = require('./lib/app.js');
const listenPort = process.env.HTTP_PORT || 80;

app.registerMenu();
app.listen(listenPort, () => {
    console.log('Express application running at 0.0.0.0:%d [NODE_ENV: %s]', listenPort, process.env.NODE_ENV);
});