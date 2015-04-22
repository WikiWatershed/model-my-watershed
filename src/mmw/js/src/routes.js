'use strict';

var router = require('./router'),
    controllers = require('./controllers'),
    AppController = controllers.AppController,
    DrawController = require('./draw/controllers').DrawController,
    AnalyzeController = require('./analyze/controllers').AnalyzeController;

router.addRoute(/^/, DrawController, 'draw');
router.addRoute(/^analyze/, AnalyzeController, 'analyze');
router.addRoute(/^model/, AppController, 'runModel');
router.addRoute(/^compare/, AppController, 'compare');
