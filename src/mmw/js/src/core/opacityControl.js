/*
Copyright (c) 2013, Jared Dominguez
Copyright (c) 2013, LizardTech
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice, this
  list of conditions and the following disclaimer in the documentation and/or
  other materials provided with the distribution.

* Neither the name of LizardTech nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

        Leaflet.OpacityControls, a plugin for adjusting the opacity of a Leaflet map.
        (c) 2013, Jared Dominguez
        (c) 2013, LizardTech

        https://github.com/lizardtechblog/Leaflet.OpacityControls


Modified by Azavea, 2015.
*/

'use strict';

var L = require('leaflet'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette');

module.exports = L.Control.extend({
    options: {
        position: 'topright'
    },

    setOpacityLayer: function (layer) {
            this.opacityLayer = layer;
    },

    onAdd: function (map) {
        var opacity_slider_div = L.DomUtil.create('div', 'opacity_slider_control'),
            opacityLayer = this.opacityLayer,
            initial_value = opacityLayer.options.opacity * 100,
            view = new SliderView().render().el;

        $(view).on('mousedown', function() {
            map.dragging.disable();
            map.once('mousedown', function() {
                map.dragging.enable();
            });
        });

        $(view).on('mouseup', function(e) {
            var el = $(e.target),
                slider_value = el.val();
            opacityLayer.setOpacity(slider_value / 100);
            el.attr('value', slider_value);
        });

        $(opacity_slider_div).append(view);
        $(view).find('input')
            .val(initial_value)
            .attr('value', initial_value);

        return opacity_slider_div;
    }
});

var SliderView = Marionette.ItemView.extend({
    template: false,
    tagName: 'input',
    className: 'slider slider-leaflet',
    attributes: {
        type: 'range',
        min: 0,
        max: 99,
        step: 3
    }
});
