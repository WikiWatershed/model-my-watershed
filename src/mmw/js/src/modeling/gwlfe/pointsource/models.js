"use strict";

var $ = require('jquery'),
    Backbone = require('../../../../shim/backbone'),
    GwlfeModificationModel = require('../../models').GwlfeModificationModel;

var WindowModel = Backbone.Model.extend({
    defaults: {
        project_id: null, // Must be specified
        in_drb: false,
        in_pa: false,
        in_conus: false,
        scenario_id: null, // Must be specified
        pointsource_type: null,
        previous_pointsource_type: null,
        pointsource_output: null,
        pointsource_errors: [],
    },

    validate: function(attrs) {
        if (attrs.pointsource_output === null) {
            return 'Point Source cannot have empty output';
        }

        if (attrs.pointsource_errors.length > 0) {
            return 'Point Source has errors';
        }
    },

    fetchPointSource: function() {
        var self = this,
            project_id = this.get('project_id'),
            pointsource_type = this.get('pointsource_type'),
            url = '/mmw/modeling/projects/' + project_id + '/pointsource/' + pointsource_type;

        return $.ajax({
            url: url,
            type: 'GET',
            cache: true,
        }).then(function(data) {
            self.set({
                pointsource_output: data.output,
                pointsource_errors: data.errors || [],
            });
        }).catch(function(err) {
            var errors = err && err.responseJSON && err.responseJSON.errors;
            self.set({
                pointsource_output: null,
                pointsource_errors: errors || ['Unknown server error.'],
            });
        });
    },

    fetchPointSourceData: function() {
        var self = this;
        
        if (this.fetchPointSourcePromise === undefined) {
            this.fetchPointSourcePromise = this.fetchPointSource();
            this.fetchPointSourcePromise.always(function() {
                delete self.fetchPointSourcePromise;
            });
        }

        return this.fetchPointSourcePromise || $.when();
    },

    getOutputs: function() {
        var self = this,
            pointsourceOutput = self.get('pointsource_output');

        if("output" in pointsourceOutput){
            return Object.fromEntries(pointsourceOutput["output"]).map(function(entryTuple){
                var key = entryTuple[0]
                    output = entryTuple[1]
                return new GwlfeModificationModel({
                    modKey: key,
                    output: output,
                });
            });
        }
        return [];
    },
});

module.exports = {
    WindowModel: WindowModel,
};
