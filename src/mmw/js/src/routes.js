'use strict';

var router = require('./router').router,
    DrawController = require('./draw/controllers').DrawController,
    AnalyzeController = require('./analyze/controllers').AnalyzeController,
    ModelingController = require('./modeling/controllers').ModelingController,
    CompareController = require('./compare/controllers').CompareController,
    ProjectsController = require('./projects/controllers').ProjectsController,
    ErrorController = require('./core/error/controllers').ErrorController,
    SignUpController = require('./user/controllers').SignUpController;

router.addRoute(/^/, DrawController, 'draw');
router.addRoute(/^analyze/, AnalyzeController, 'analyze');
router.addRoute('project/new/:modelPackage(/)', ModelingController, 'makeNewProject');
router.addRoute('project(/:projectId)(/scenario/:scenarioId)(/)', ModelingController, 'project');
router.addRoute('project/:projectId/clone(/)', ModelingController, 'projectClone');
router.addRoute('project/:projectId/draw(/)', ModelingController, 'projectDraw');
router.addRoute('project(/:projectId)/compare(/)', CompareController, 'compare');
router.addRoute('projects(/)', ProjectsController, 'projects');
router.addRoute('error(/:type)(/)', ErrorController, 'error');
router.addRoute('sign-up(/)', SignUpController, 'signUp');
router.addRoute('sign-up/itsi(/:username)(/:first_name)(/:last_name)(/)', SignUpController, 'itsiSignUp');
