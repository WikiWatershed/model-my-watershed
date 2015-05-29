'use strict';

var router = require('./router').router,
    controllers = require('./controllers'),
    AppController = controllers.AppController,
    ErrorController = require('./core/error/controllers').ErrorController,
    DrawController = require('./draw/controllers').DrawController,
    ModelingController = require('./modeling/controllers').ModelingController,
    AnalyzeController = require('./analyze/controllers').AnalyzeController;

router.addRoute(/^/, DrawController, 'draw');
router.addRoute(/^analyze/, AnalyzeController, 'analyze');
router.addRoute(/^model/, ModelingController, 'model');
router.addRoute('model/:projectId', ModelingController, 'model');
router.addRoute('model/:projectId/', ModelingController, 'model');
router.addRoute(/^compare/, AppController, 'compare');
router.addRoute('error(/)(:type)', ErrorController, 'error');
