'use strict';

var router = require('./router').router,
    DrawController = require('./draw/controllers').DrawController,
    AnalyzeController = require('./analyze/controllers').AnalyzeController,
    ModelingController = require('./modeling/controllers').ModelingController,
    CompareController = require('./compare/controllers').CompareController,
    ErrorController = require('./core/error/controllers').ErrorController,
    SignUpController = require('./user/controllers').SignUpController;

router.addRoute(/^/, DrawController, 'draw');
router.addRoute(/^analyze/, AnalyzeController, 'analyze');
router.addRoute(/^project/, ModelingController, 'project');
router.addRoute('project/:projectId', ModelingController, 'project');
router.addRoute('project/:projectId/', ModelingController, 'project');
router.addRoute('project/:projectId/clone(/)', ModelingController, 'projectClone');
router.addRoute('project/:projectId/scenario/:scenarioId/', ModelingController, 'project');
//TODO Add route for /project/XX/scenario/compare
router.addRoute(/^compare/, CompareController, 'compare');
router.addRoute('error(/)(:type)', ErrorController, 'error');
router.addRoute('sign-up(/)', SignUpController, 'signUp');
router.addRoute('sign-up/itsi(/)(:username)(/:first_name)(/:last_name)', SignUpController, 'itsiSignUp');
