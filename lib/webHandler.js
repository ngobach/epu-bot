const express = require('express');
const { sv } = require('./epu');
const router = module.exports = express.Router();

router.get('/diemthi/:id([0-9]{10})', (req, res, next) => {
    res.render('diemthi', { id: req.params['id'] });
});

router.get('/diemthi/:id([0-9]{10}).json', (req, res, next) => {
    sv.diemthi(req.params['id'])
        .then(data => res.header('Content-Type', 'application/json').send(JSON.stringify(data, null, 2)))
        .catch(err => {
            res.sendStatus(500);
            console.error(err);
        });
});


router.get('/kqht/:id([0-9]{10})', (req, res, next) => {
    res.render('kqht', { id: req.params['id'] });
});

router.get('/kqht/:id([0-9]{10}).json', (req, res, next) => {
    sv.kqht(req.params['id'])
        .then(data => res.header('Content-Type', 'application/json').send(JSON.stringify(data, null, 2)))
        .catch(err => {
            res.sendStatus(500);
            console.error(err);
        });
});
