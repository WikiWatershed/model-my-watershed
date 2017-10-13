'use strict';

var router = require('./router').router,
    settings = require('./core/settings'),
    DrawController = require('./draw/controllers').DrawController,
    AnalyzeController = require('./analyze/controllers').AnalyzeController,
    AccountController = require('./account/controllers').AccountController,
    DataCatalogController = require('./data_catalog/controllers').DataCatalogController,
    ModelingController = require('./modeling/controllers').ModelingController,
    CompareController = require('./compare/controllers').CompareController,
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
router.addRoute('project(/:projectId)/compare(/)', CompareController, 'compare');
router.addRoute('projects(/)', ProjectsController, 'projects');
router.addRoute('error(/:type)(/)', ErrorController, 'error');
router.addRoute('sign-up(/)', SignUpController, 'signUp');
router.addRoute('sign-up/itsi(/:username)(/:first_name)(/:last_name)(/)', SignUpController, 'itsiSignUp');

if (settings.get('data_catalog_enabled')) {
    router.addRoute(/^search/, DataCatalogController, 'dataCatalog');
}

router.on('route', function() {
    // Allow Google Analytics to track virtual pageloads following approach in
    // https://developers.google.com/analytics/devguides/collection/
    // analyticsjs/single-page-applications
    window.ga('set', 'page', window.location.pathname);
    window.ga('send', 'pageview');
});
