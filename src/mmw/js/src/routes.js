'use strict';

var router = require('./router').router,
    DrawController = require('./draw/controllers').DrawController,
    AnalyzeController = require('./analyze/controllers').AnalyzeController,
    AccountController = require('./account/controllers').AccountController,
    ModelingController = require('./modeling/controllers').ModelingController,
    ProjectsController = require('./projects/controllers').ProjectsController,
    ErrorController = require('./core/error/controllers').ErrorController,
    SignUpController = require('./user/controllers').SignUpController;

router.addRoute(/^/, DrawController, 'splash');
router.addRoute(/^draw/, DrawController, 'draw');
router.addRoute(/^analyze/, AnalyzeController, 'analyze');
router.addRoute(/^account/, AccountController, 'account');
router.addRoute('project/new/:modelPackage(/)', ModelingController, 'makeNewProject');
router.addRoute('project(/:projectId)(/scenario/:scenarioId)(/)', ModelingController, 'project');
router.addRoute('project/:projectId/clone(/)', ModelingController, 'projectClone');
router.addRoute('project/:projectId/draw(/)', ModelingController, 'projectDraw');
router.addRoute('projects(/)', ProjectsController, 'projects');
router.addRoute('error(/:type)(/)', ErrorController, 'error');
router.addRoute('sign-up(/)', SignUpController, 'signUp');
router.addRoute('sign-up/sso(/:provider)(/:username)(/:first_name)(/:last_name)(/)', SignUpController, 'ssoSignUp');
