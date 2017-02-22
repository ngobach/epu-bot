const app = require('./lib/app.js');

app.listen(5000, () => {
    console.log('Express application running at 0.0.0.0:%d [NODE_ENV: %s]', process.env.HTTP_PORT, process.env.NODE_ENV);
});