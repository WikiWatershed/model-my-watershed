!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.LeafletMapboxVectorTile=e():t.LeafletMapboxVectorTile=e()}(self,(()=>(()=>{var __webpack_modules__={193:(t,e,r)=>{var s=r(315),n=r(25);function o(t,e,i,r,s){if(!e)return null;for(var n in e)this[n]=e[n];this.mvtLayer=t,this.mvtSource=t.mvtSource,this.map=t.mvtSource.map,this.id=r,this.layerLink=this.mvtSource.layerLink,this.toggleEnabled=!0,this.selected=!1,this.divisor=e.extent/i.tileSize,this.extent=e.extent,this.tileSize=i.tileSize,this.tiles={},this.style=s,this.addTileFeature(e,i);var o=this;this.map.on("zoomend",(function(){o.staticLabel=null})),s&&s.dynamicLabel&&"function"==typeof s.dynamicLabel&&(this.dynamicLabel=this.mvtSource.dynamicLabel.createFeature(this)),a(o)}function a(t){var e=t.style;if(e&&e.ajaxSource&&"function"==typeof e.ajaxSource){var i=e.ajaxSource(t);i&&s.getJSON(i,(function(e,i,r){if(e)throw["ajaxSource AJAX Error",e];return function(t,e){t.ajaxData=e,"function"==typeof t.ajaxDataReceived&&t.ajaxDataReceived(t,e),t._setStyle(t.mvtLayer.style),h(t)}(t,i),!0}))}return!1}function h(t){var e=t.tiles,i=t.mvtLayer;for(var r in e)parseInt(r.split(":")[0])===t.map.getZoom()&&i.redrawTile(r)}t.exports=o,o.prototype._setStyle=function(t){this.style=t(this,this.ajaxData),this.removeLabel()},o.prototype.setStyle=function(t){this.ajaxData=null,this.style=t(this,null),a(this)||this.removeLabel()},o.prototype.draw=function(t){var e=this.tiles[t],i=e.vtf,r=e.ctx,s=t.split(":").slice(1,3).join(":");if(r.canvas=this.mvtLayer._tiles[s],this.selected)var n=this.style.selected||this.style;else n=this.style;switch(i.type){case 1:if(this._drawPoint(r,i.coordinates,n),!this.staticLabel&&"function"==typeof this.style.staticLabel){if(this.style.ajaxSource&&!this.ajaxData)break;this._drawStaticLabel(r,i.coordinates,n)}break;case 2:this._drawLineString(r,i.coordinates,n);break;case 3:this._drawPolygon(r,i.coordinates,n);break;default:throw new Error("Unmanaged type: "+i.type)}},o.prototype.getPathsForTile=function(t){return this.tiles[t].paths},o.prototype.addTileFeature=function(t,e){var i=this.map.getZoom();e.zoom==i&&(this.clearTileFeatures(i),this.tiles[e.id]={ctx:e,vtf:t,paths:[]})},o.prototype.clearTileFeatures=function(t){for(var e in this.tiles)e.split(":")[0]!=t&&delete this.tiles[e]},o.prototype.toggle=function(){this.selected?this.deselect():this.select()},o.prototype.select=function(){this.selected=!0,this.mvtSource.featureSelected(this),h(this);var t=this.linkedFeature();t&&t.staticLabel&&!t.staticLabel.selected&&t.staticLabel.select()},o.prototype.deselect=function(){this.selected=!1,this.mvtSource.featureDeselected(this),h(this);var t=this.linkedFeature();t&&t.staticLabel&&t.staticLabel.selected&&t.staticLabel.deselect()},o.prototype.on=function(t,e){this._eventHandlers[t]=e},o.prototype._drawPoint=function(t,e,i){if(i&&t&&t.canvas){var r,s=this.tiles[t.id];r="function"==typeof i.radius?i.radius(t.zoom):i.radius;var n,o=this._tilePoint(e[0][0]),a=t.canvas;try{n=a.getContext("2d")}catch(t){return void console.log("_drawPoint error: "+t)}n.beginPath(),n.fillStyle=i.color,n.arc(o.x,o.y,r,0,2*Math.PI),n.closePath(),n.fill(),i.lineWidth&&i.strokeStyle&&(n.lineWidth=i.lineWidth,n.strokeStyle=i.strokeStyle,n.stroke()),n.restore(),s.paths.push([o])}},o.prototype._drawLineString=function(t,e,r){if(r&&t&&t.canvas){var s=t.canvas.getContext("2d");s.strokeStyle=r.color,s.lineWidth=r.size,s.beginPath();var n=[],o=this.tiles[t.id];for(var a in e){var h=e[a];for(i=0;i<h.length;i++){var l=(0===i?"move":"line")+"To",u=this._tilePoint(h[i]);n.push(u),s[l](u.x,u.y)}}s.stroke(),s.restore(),o.paths.push(n)}},o.prototype._drawPolygon=function(t,e,i){if(i&&t&&t.canvas){var r=t.canvas.getContext("2d"),s=i.outline;"function"==typeof i.color?r.fillStyle=i.color(r):r.fillStyle=i.color,s&&(r.strokeStyle=s.color,r.lineWidth=s.size),r.beginPath();var n=[],o=this.tiles[t.id],a=this.dynamicLabel;a&&a.addTilePolys(t,e);for(var h=0,l=e.length;h<l;h++)for(var u=e[h],c=0;c<u.length;c++){u[c];var f=(0===c?"move":"line")+"To",d=this._tilePoint(u[c]);n.push(d),r[f](d.x,d.y)}r.closePath(),r.fill(),s&&r.stroke(),o.paths.push(n)}},o.prototype._drawStaticLabel=function(t,e,i){if(i&&t&&this.mvtLayer._map){var r=this._tilePoint(e[0][0]),s=this._project(r,t.tile.x,t.tile.y,this.extent,this.tileSize),o=L.point(s.x,s.y),a=this.map.unproject(o);this.staticLabel=new n(this,t,a,i),this.mvtLayer.featureWithLabelAdded(this)}},o.prototype.removeLabel=function(){this.staticLabel&&(this.staticLabel.remove(),this.staticLabel=null)},o.prototype._project=function(t,e,i,r,s){var n=e*s,o=i*s;return{x:Math.floor(t.x+n),y:Math.floor(t.y+o)}},o.prototype._tilePoint=function(t){return new L.Point(t.x/this.divisor,t.y/this.divisor)},o.prototype.linkedFeature=function(){var t=this.mvtLayer.linkedLayer();return t?t.features[this.id]:null}},678:(module,__unused_webpack_exports,__webpack_require__)=>{var MVTFeature=__webpack_require__(193),Util=__webpack_require__(315);function removeLabels(t){for(var e=t.featuresWithLabels,i=0,r=e.length;i<r;i++)e[i].removeLabel();t.featuresWithLabels=[]}function in_circle(t,e,i,r,s){return Math.pow(t-r,2)+Math.pow(e-s,2)<=Math.pow(i,2)}function waitFor(testFx,onReady,timeOutMillis){var maxtimeOutMillis=timeOutMillis||3e3,start=(new Date).getTime(),condition="string"==typeof testFx?eval(testFx):testFx(),interval=setInterval((function(){(new Date).getTime()-start<maxtimeOutMillis&&!condition?condition="string"==typeof testFx?eval(testFx):testFx():condition?(console.log("'waitFor()' finished in "+((new Date).getTime()-start)+"ms."),clearInterval(interval),"string"==typeof onReady?eval(onReady):onReady("success")):(console.log("'waitFor()' timeout"),clearInterval(interval),"string"==typeof onReady?eval(onReady):onReady("timeout"))}),50)}module.exports=L.TileLayer.Canvas.extend({options:{debug:!1,isHiddenLayer:!1,getIDForLayerFeature:function(){},tileSize:256,lineClickTolerance:2},_featureIsClicked:{},_isPointInPoly:function(t,e){if(e&&e.length){for(var i=!1,r=-1,s=e.length,n=s-1;++r<s;n=r)(e[r].y<=t.y&&t.y<e[n].y||e[n].y<=t.y&&t.y<e[r].y)&&t.x<(e[n].x-e[r].x)*(t.y-e[r].y)/(e[n].y-e[r].y)+e[r].x&&(i=!i);return i}},_getDistanceFromLine:function(t,e){var i=Number.POSITIVE_INFINITY;if(e&&e.length>1){t=L.point(t.x,t.y);for(var r=0,s=e.length-1;r<s;r++){var n=this._projectPointOnLineSegment(t,e[r],e[r+1]);n.distance<=i&&(i=n.distance)}}return i},_projectPointOnLineSegment:function(t,e,i){var r=e.distanceTo(i);if(r<1)return{distance:t.distanceTo(e),coordinate:e};var s=((t.x-e.x)*(i.x-e.x)+(t.y-e.y)*(i.y-e.y))/Math.pow(r,2);if(s<1e-7)return{distance:t.distanceTo(e),coordinate:e};if(s>.9999999)return{distance:t.distanceTo(i),coordinate:i};var n=L.point(e.x+s*(i.x-e.x),e.y+s*(i.y-e.y));return{distance:t.distanceTo(n),point:n}},initialize:function(t,e){this.mvtSource=t,L.Util.setOptions(this,e),this.style=e.style,this.name=e.name,this._canvasIDToFeatures={},this.features={},this.featuresWithLabels=[],this._highestCount=0},onAdd:function(t){var e=this;e.map=t,L.TileLayer.Canvas.prototype.onAdd.call(this,t),t.on("layerremove",(function(t){t.layer._leaflet_id===e._leaflet_id&&removeLabels(e)}))},drawTile:function(t,e,i){var r={canvas:t,tile:e,zoom:i,tileSize:this.options.tileSize};r.id=Util.getContextID(r),this._canvasIDToFeatures[r.id]||this._initializeFeaturesHash(r),this.features||(this.features={})},_initializeFeaturesHash:function(t){this._canvasIDToFeatures[t.id]={},this._canvasIDToFeatures[t.id].features=[],this._canvasIDToFeatures[t.id].canvas=t.canvas},_draw:function(t){},getCanvas:function(t){var e=t.tile,i=this._tiles[e.x+":"+e.y];if(i)return t.canvas=i,void this.redrawTile(t.id);var r=this;waitFor((function(){if(i=r._tiles[e.x+":"+e.y])return!0}),(function(){i=r._tiles[e.x+":"+e.y],t.canvas=i,r.redrawTile(t.id)}),2e3)},parseVectorTileLayer:function(t,e){var i=this,r=e.tile,s={canvas:null,id:e.id,tile:e.tile,zoom:e.zoom,tileSize:e.tileSize};s.canvas=i._tiles[r.x+":"+r.y],this._canvasIDToFeatures[s.id]?this.clearTileFeatureHash(s.id):this._initializeFeaturesHash(s);for(var n=t.parsedFeatures,o=0,a=n.length;o<a;o++){var h=n[o];h.layer=t;var l=i.options.filter;if("function"!=typeof l||!1!==l(h,s)){"function"==typeof i.options.getIDForLayerFeature?i.options.getIDForLayerFeature:Util.getIDForLayerFeature;var u,c=i.options.getIDForLayerFeature(h)||o,f=i.features[c];if("function"==typeof(u=i.options.layerOrdering)&&u(h,s),f)f.addTileFeature(h,s);else{var d=i.style(h);i.features[c]=f=new MVTFeature(i,h,s,c,d),d&&d.dynamicLabel&&"function"==typeof d.dynamicLabel&&i.featuresWithLabels.push(f)}s&&s.id&&i._canvasIDToFeatures[s.id].features.push(f)}}(u=i.options.layerOrdering)&&(i._canvasIDToFeatures[s.id].features=i._canvasIDToFeatures[s.id].features.sort((function(t,e){return-(e.properties.zIndex-t.properties.zIndex)}))),i.redrawTile(s.id)},setStyle:function(t){for(var e in this._highestCount=0,this._lowestCount=null,this.style=t,this.features)this.features[e].setStyle(t);var i=this.map.getZoom();for(var e in this._tiles){var r=i+":"+e;this.redrawTile(r)}},setHighestCount:function(t){t>this._highestCount&&(this._highestCount=t)},getHighestCount:function(){return this._highestCount},setLowestCount:function(t){(!this._lowestCount||t<this._lowestCount)&&(this._lowestCount=t)},getLowestCount:function(){return this._lowestCount},setCountRange:function(t){this.setHighestCount(t),this.setLowestCount(t)},handleClickEvent:function(t,e){var i=t.tileID.split(":").slice(1,3).join(":"),r=t.tileID.split(":")[0],s=this._tiles[i];if(s){for(var n,o,a=t.layerPoint.x-s._leaflet_pos.x,h=t.layerPoint.y-s._leaflet_pos.y,l={x:a,y:h},u=this._canvasIDToFeatures[t.tileID].features,c=Number.POSITIVE_INFINITY,f=null,d=0;d<u.length;d++){var p=u[d];switch(p.type){case 1:var y;for(y="function"==typeof p.style.radius?p.style.radius(r):p.style.radius,o=p.getPathsForTile(t.tileID),n=0;n<o.length;n++)in_circle(o[n][0].x,o[n][0].y,y,a,h)&&(f=p,c=0);break;case 2:for(o=p.getPathsForTile(t.tileID),n=0;n<o.length;n++){var v;p.style&&(v=this._getDistanceFromLine(l,o[n]))<(p.selected&&p.style.selected?p.style.selected.size:p.style.size)/2+this.options.lineClickTolerance&&v<c&&(f=p,c=v)}break;case 3:for(o=p.getPathsForTile(t.tileID),n=0;n<o.length;n++)this._isPointInPoly(l,o[n])&&(f=p,c=0)}if(0==c)break}f&&f.toggleEnabled&&f.toggle(),t.feature=f,e(t)}else e(t)},clearTile:function(t){var e=t.split(":"),i=e[1]+":"+e[2];if(void 0!==this._tiles[i]){var r=this._tiles[i];r.getContext("2d").clearRect(0,0,r.width,r.height)}else console.error("typeof this._tiles[canvasId] === 'undefined'")},clearTileFeatureHash:function(t){this._canvasIDToFeatures[t]={features:[]}},clearLayerFeatureHash:function(){this.features={}},redrawTile:function(t){this.clearTile(t);var e=this._canvasIDToFeatures[t];if(e){for(var i=e.features,r=[],s=0;s<i.length;s++){var n=i[s];n.selected?r.push(n):n.draw(t)}for(var o=0,a=r.length;o<a;o++)r[o].draw(t)}},_resetCanvasIDToFeatures:function(t,e){this._canvasIDToFeatures[t]={},this._canvasIDToFeatures[t].features=[],this._canvasIDToFeatures[t].canvas=e},linkedLayer:function(){if(this.mvtSource.layerLink){var t=this.mvtSource.layerLink(this.name);return this.mvtSource.layers[t]}return null},featureWithLabelAdded:function(t){this.featuresWithLabels.push(t)}})},318:(t,e,i)=>{var r=i(753).VectorTile,s=i(335),n=(i(788),i(315)),o=i(678);function a(t){t.parsedFeatures=[];for(var e=0,i=t._features.length;e<i;e++){var r=t.feature(e);r.coordinates=r.loadGeometry(),t.parsedFeatures.push(r)}return t}t.exports=L.TileLayer.MVTSource=L.TileLayer.Canvas.extend({options:{debug:!1,url:"",getIDForLayerFeature:function(){},tileSize:256,visibleLayers:[],xhrHeaders:{}},layers:{},processedTiles:{},_eventHandlers:{},_triggerOnTilesLoadedEvent:!0,_url:"",style:function(t){var e={};switch(t.type){case 1:e.color="rgba(49,79,79,1)",e.radius=5,e.selected={color:"rgba(255,255,0,0.5)",radius:6};break;case 2:e.color="rgba(161,217,155,0.8)",e.size=3,e.selected={color:"rgba(255,25,0,0.5)",size:4};break;case 3:e.color="rgba(49,79,79,1)",e.outline={color:"rgba(161,217,155,0.8)",size:1},e.selected={color:"rgba(255,140,0,0.3)",outline:{color:"rgba(255,140,0,1)",size:2}}}return e},initialize:function(t){L.Util.setOptions(this,t),this.layers={},this.activeTiles={},this.loadedTiles={},this._url=this.options.url,this.zIndex=t.zIndex,"function"==typeof t.style&&(this.style=t.style),"function"==typeof t.ajaxSource&&(this.ajaxSource=t.ajaxSource),this.layerLink=t.layerLink,this._eventHandlers={},this._tilesToProcess=0},redraw:function(t){!1===t&&(this._triggerOnTilesLoadedEvent=!1),L.TileLayer.Canvas.prototype.redraw.call(this)},onAdd:function(t){var e=this;e.map=t,L.TileLayer.Canvas.prototype.onAdd.call(this,t);var i=function(t){e._onClick(t)};t.on("click",i),t.on("layerremove",(function(r){r.layer._leaflet_id===e._leaflet_id&&r.layer.removeChildLayers&&(r.layer.removeChildLayers(t),t.off("click",i))})),e.addChildLayers(t),"function"==typeof DynamicLabel&&(this.dynamicLabel=new DynamicLabel(t,this,{}))},drawTile:function(t,e,i){var r={id:[i,e.x,e.y].join(":"),canvas:t,tile:e,zoom:i,tileSize:this.options.tileSize};this._tilesToProcess<this._tilesToLoad&&(this._tilesToProcess=this._tilesToLoad);var s=r.id=n.getContextID(r);this.activeTiles[s]=r,this.processedTiles[r.zoom]||(this.processedTiles[r.zoom]={}),this.options.debug&&this._drawDebugInfo(r),this._draw(r)},setOpacity:function(t){this._setVisibleLayersStyle("opacity",t)},setZIndex:function(t){this._setVisibleLayersStyle("zIndex",t)},_setVisibleLayersStyle:function(t,e){for(var i in this.layers)this.layers[i]._tileContainer.style[t]=e},_drawDebugInfo:function(t){var e=this.options.tileSize,i=t.canvas.getContext("2d");i.strokeStyle="#000000",i.fillStyle="#FFFF00",i.strokeRect(0,0,e,e),i.font="12px Arial",i.fillRect(0,0,5,5),i.fillRect(0,e-5,5,5),i.fillRect(e-5,0,5,5),i.fillRect(e-5,e-5,5,5),i.fillRect(e/2-5,e/2-5,10,10),i.strokeText(t.zoom+" "+t.tile.x+" "+t.tile.y,e/2-30,e/2-10)},_draw:function(t){var e=this;if(this._url){var i=this.getTileUrl({x:t.tile.x,y:t.tile.y,z:t.zoom}),n=new XMLHttpRequest;n.onload=function(){if("200"==n.status){if(!n.response)return;var i=new Uint8Array(n.response),o=new s(i),h=new r(o);if(e.map&&e.map.getZoom()!=t.zoom)return void console.log("Fetched tile for zoom level "+t.zoom+". Map is at zoom level "+e._map.getZoom());e.checkVectorTileLayers(function(t){for(var e in t.layers)a(t.layers[e]);return t}(h),t),function(t,e){t.loadedTiles[e.id]=e}(e,t)}e.reduceTilesToProcessCount()},n.onerror=function(){console.log("xhr error: "+n.status)},n.open("GET",i,!0);var o=e.options.xhrHeaders;for(var h in o)n.setRequestHeader(h,o[h]);n.responseType="arraybuffer",n.send()}},reduceTilesToProcessCount:function(){this._tilesToProcess--,this._tilesToProcess||(this._eventHandlers.PBFLoad&&this._eventHandlers.PBFLoad(),this._pbfLoaded())},checkVectorTileLayers:function(t,e,i){var r=this;if(r.options.visibleLayers&&r.options.visibleLayers.length>0)for(var s=0;s<r.options.visibleLayers.length;s++){var n=r.options.visibleLayers[s];t.layers[n]&&r.prepareMVTLayers(t.layers[n],n,e,i)}else for(var o in t.layers)r.prepareMVTLayers(t.layers[o],o,e,i)},prepareMVTLayers:function(t,e,i,r){var s=this;s.layers[e]||(s.layers[e]=s.createMVTLayer(e,t.parsedFeatures[0].type||null)),r?s.layers[e].getCanvas(i,t):s.layers[e].parseVectorTileLayer(t,i)},createMVTLayer:function(t,e){var i=this,r={getIDForLayerFeature:"function"==typeof i.options.getIDForLayerFeature?i.options.getIDForLayerFeature:n.getIDForLayerFeature,filter:i.options.filter,layerOrdering:i.options.layerOrdering,style:i.style,name:t,asynch:!0};return i.options.zIndex&&(r.zIndex=i.zIndex),new o(i,r).addTo(i.map)},getLayers:function(){return this.layers},hideLayer:function(t){this.layers[t]&&(this._map.removeLayer(this.layers[t]),this.options.visibleLayers.indexOf("id")>-1&&this.visibleLayers.splice(this.options.visibleLayers.indexOf("id"),1))},showLayer:function(t){this.layers[t]&&(this._map.addLayer(this.layers[t]),-1==this.options.visibleLayers.indexOf("id")&&this.visibleLayers.push(t)),this.bringToFront()},removeChildLayers:function(t){for(var e in this.layers){var i=this.layers[e];t.removeLayer(i)}},addChildLayers:function(t){var e=this;if(e.options.visibleLayers.length>0)for(var i=0;i<e.options.visibleLayers.length;i++){var r=e.options.visibleLayers[i];(n=this.layers[r])&&t.addLayer(n)}else for(var s in this.layers){var n;(n=this.layers[s])._map||t.addLayer(n)}},bind:function(t,e){this._eventHandlers[t]=e},_onClick:function(t){var e,i,r,s=this,n=s.options.onClick,o=s.options.clickableLayers,a=s.layers;if(t.tileID=(e=t.latlng.lat,i=t.latlng.lng,(r=this.map.getZoom())+":"+parseInt(Math.floor((i+180)/360*(1<<r)))+":"+parseInt(Math.floor((1-Math.log(Math.tan(e.toRad())+1/Math.cos(e.toRad()))/Math.PI)/2*(1<<r)))),o||(o=Object.keys(s.layers)),o&&o.length>0)for(var h=0,l=o.length;h<l;h++){var u=a[o[h]];u&&u.handleClickEvent(t,(function(t){"function"==typeof n&&n(t)}))}else"function"==typeof n&&n(t)},setFilter:function(t,e){for(var i in this.layers){var r=this.layers[i];e?i.toLowerCase()==e.toLowerCase()&&(r.options.filter=t,r.clearLayerFeatureHash()):(r.options.filter=t,r.clearLayerFeatureHash())}},setStyle:function(t,e){for(var i in this.layers){var r=this.layers[i];e?i.toLowerCase()==e.toLowerCase()&&r.setStyle(t):r.setStyle(t)}},featureSelected:function(t){this.options.mutexToggle&&(this._selectedFeature&&this._selectedFeature.deselect(),this._selectedFeature=t),this.options.onSelect&&this.options.onSelect(t)},featureDeselected:function(t){this.options.mutexToggle&&this._selectedFeature&&(this._selectedFeature=null),this.options.onDeselect&&this.options.onDeselect(t)},_pbfLoaded:function(){this.bringToFront();var t=this.options.onTilesLoaded;t&&"function"==typeof t&&!0===this._triggerOnTilesLoadedEvent&&t(this),this._triggerOnTilesLoadedEvent=!0}}),void 0===Number.prototype.toRad&&(Number.prototype.toRad=function(){return this*Math.PI/180})},315:t=>{var e=t.exports={};e.getContextID=function(t){return[t.zoom,t.tile.x,t.tile.y].join(":")},e.getIDForLayerFeature=function(t){return t.properties.id},e.getJSON=function(t,e){var i="undefined"!=typeof XMLHttpRequest?new XMLHttpRequest:new ActiveXObject("Microsoft.XMLHTTP");i.onreadystatechange=function(){var t=i.status;if(4===i.readyState&&t>=200&&t<300){var r=JSON.parse(i.responseText);e(null,r)}else e({error:!0,status:t})},i.open("GET",t,!0),i.send()}},25:(t,e,i)=>{function r(t,e,i,r){if(this.mvtFeature=t,this.map=t.map,this.zoom=e.zoom,this.latLng=i,this.selected=!1,t.linkedFeature){var s=t.linkedFeature();s&&s.selected&&(this.selected=!0)}!function(t,e,i,r,s){var n=e.ajaxData,o=t.style=s.staticLabel(e,n),a=t.icon=L.divIcon({className:o.cssClass||"label-icon-text",html:o.html,iconSize:o.iconSize||[50,50]});t.marker=L.marker(r,{icon:a}).addTo(t.map),t.selected&&t.marker._icon.classList.add(t.style.cssSelectedClass||"label-icon-text-selected"),t.marker.on("click",(function(e){t.toggle()})),t.map.on("zoomend",(function(e){var i=e.target.getZoom();t.zoom!==i&&t.map.removeLayer(t.marker)}))}(this,t,0,i,r)}i(315),t.exports=r,r.prototype.toggle=function(){this.selected?this.deselect():this.select()},r.prototype.select=function(){this.selected=!0,this.marker._icon.classList.add(this.style.cssSelectedClass||"label-icon-text-selected");var t=this.mvtFeature.linkedFeature();t.selected||t.select()},r.prototype.deselect=function(){this.selected=!1,this.marker._icon.classList.remove(this.style.cssSelectedClass||"label-icon-text-selected");var t=this.mvtFeature.linkedFeature();t.selected&&t.deselect()},r.prototype.remove=function(){this.map&&this.marker&&this.map.removeLayer(this.marker)}},954:(t,e,i)=>{t.exports=i(318)},251:(t,e)=>{e.read=function(t,e,i,r,s){var n,o,a=8*s-r-1,h=(1<<a)-1,l=h>>1,u=-7,c=i?s-1:0,f=i?-1:1,d=t[e+c];for(c+=f,n=d&(1<<-u)-1,d>>=-u,u+=a;u>0;n=256*n+t[e+c],c+=f,u-=8);for(o=n&(1<<-u)-1,n>>=-u,u+=r;u>0;o=256*o+t[e+c],c+=f,u-=8);if(0===n)n=1-l;else{if(n===h)return o?NaN:1/0*(d?-1:1);o+=Math.pow(2,r),n-=l}return(d?-1:1)*o*Math.pow(2,n-r)},e.write=function(t,e,i,r,s,n){var o,a,h,l=8*n-s-1,u=(1<<l)-1,c=u>>1,f=23===s?Math.pow(2,-24)-Math.pow(2,-77):0,d=r?0:n-1,p=r?1:-1,y=e<0||0===e&&1/e<0?1:0;for(e=Math.abs(e),isNaN(e)||e===1/0?(a=isNaN(e)?1:0,o=u):(o=Math.floor(Math.log(e)/Math.LN2),e*(h=Math.pow(2,-o))<1&&(o--,h*=2),(e+=o+c>=1?f/h:f*Math.pow(2,1-c))*h>=2&&(o++,h/=2),o+c>=u?(a=0,o=u):o+c>=1?(a=(e*h-1)*Math.pow(2,s),o+=c):(a=e*Math.pow(2,c-1)*Math.pow(2,s),o=0));s>=8;t[i+d]=255&a,d+=p,a/=256,s-=8);for(o=o<<s|a,l+=s;l>0;t[i+d]=255&o,d+=p,o/=256,l-=8);t[i+d-p]|=128*y}},689:(t,e,i)=>{"use strict";t.exports=a;var r,s,n,o=i(251);function a(t){var e;t&&t.length&&(t=(e=t).length);var i=new Uint8Array(t||0);return e&&i.set(e),i.readUInt32LE=r.readUInt32LE,i.writeUInt32LE=r.writeUInt32LE,i.readInt32LE=r.readInt32LE,i.writeInt32LE=r.writeInt32LE,i.readFloatLE=r.readFloatLE,i.writeFloatLE=r.writeFloatLE,i.readDoubleLE=r.readDoubleLE,i.writeDoubleLE=r.writeDoubleLE,i.toString=r.toString,i.write=r.write,i.slice=r.slice,i.copy=r.copy,i._isBuffer=!0,i}function h(t){for(var e,i,r=t.length,s=[],n=0;n<r;n++){if((e=t.charCodeAt(n))>55295&&e<57344){if(!i){e>56319||n+1===r?s.push(239,191,189):i=e;continue}if(e<56320){s.push(239,191,189),i=e;continue}e=i-55296<<10|e-56320|65536,i=null}else i&&(s.push(239,191,189),i=null);e<128?s.push(e):e<2048?s.push(e>>6|192,63&e|128):e<65536?s.push(e>>12|224,e>>6&63|128,63&e|128):s.push(e>>18|240,e>>12&63|128,e>>6&63|128,63&e|128)}return s}(r={readUInt32LE:function(t){return(this[t]|this[t+1]<<8|this[t+2]<<16)+16777216*this[t+3]},writeUInt32LE:function(t,e){this[e]=t,this[e+1]=t>>>8,this[e+2]=t>>>16,this[e+3]=t>>>24},readInt32LE:function(t){return(this[t]|this[t+1]<<8|this[t+2]<<16)+(this[t+3]<<24)},readFloatLE:function(t){return o.read(this,t,!0,23,4)},readDoubleLE:function(t){return o.read(this,t,!0,52,8)},writeFloatLE:function(t,e){return o.write(this,t,e,!0,23,4)},writeDoubleLE:function(t,e){return o.write(this,t,e,!0,52,8)},toString:function(t,e,i){var r="",s="";e=e||0,i=Math.min(this.length,i||this.length);for(var n=e;n<i;n++){var o=this[n];o<=127?(r+=decodeURIComponent(s)+String.fromCharCode(o),s=""):s+="%"+o.toString(16)}return r+decodeURIComponent(s)},write:function(t,e){for(var i=t===s?n:h(t),r=0;r<i.length;r++)this[e+r]=i[r]},slice:function(t,e){return this.subarray(t,e)},copy:function(t,e){e=e||0;for(var i=0;i<this.length;i++)t[e+i]=this[i]}}).writeInt32LE=r.writeUInt32LE,a.byteLength=function(t){return s=t,(n=h(t)).length},a.isBuffer=function(t){return!(!t||!t._isBuffer)}},335:(t,e,i)=>{"use strict";t.exports=s;var r=i.g.Buffer||i(689);function s(t){this.buf=r.isBuffer(t)?t:new r(t||0),this.pos=0,this.length=this.buf.length}s.Varint=0,s.Fixed64=1,s.Bytes=2,s.Fixed32=5;var n=4294967296,o=1/n,a=Math.pow(2,63);function h(t,e){for(var i=0;i<t.length;i++)e.writeVarint(t[i])}function l(t,e){for(var i=0;i<t.length;i++)e.writeSVarint(t[i])}function u(t,e){for(var i=0;i<t.length;i++)e.writeFloat(t[i])}function c(t,e){for(var i=0;i<t.length;i++)e.writeDouble(t[i])}function f(t,e){for(var i=0;i<t.length;i++)e.writeBoolean(t[i])}function d(t,e){for(var i=0;i<t.length;i++)e.writeFixed32(t[i])}function p(t,e){for(var i=0;i<t.length;i++)e.writeSFixed32(t[i])}function y(t,e){for(var i=0;i<t.length;i++)e.writeFixed64(t[i])}function v(t,e){for(var i=0;i<t.length;i++)e.writeSFixed64(t[i])}s.prototype={destroy:function(){this.buf=null},readFields:function(t,e,i){for(i=i||this.length;this.pos<i;){var r=this.readVarint(),s=r>>3,n=this.pos;t(s,e,this),this.pos===n&&this.skip(r)}return e},readMessage:function(t,e){return this.readFields(t,e,this.readVarint()+this.pos)},readFixed32:function(){var t=this.buf.readUInt32LE(this.pos);return this.pos+=4,t},readSFixed32:function(){var t=this.buf.readInt32LE(this.pos);return this.pos+=4,t},readFixed64:function(){var t=this.buf.readUInt32LE(this.pos)+this.buf.readUInt32LE(this.pos+4)*n;return this.pos+=8,t},readSFixed64:function(){var t=this.buf.readUInt32LE(this.pos)+this.buf.readInt32LE(this.pos+4)*n;return this.pos+=8,t},readFloat:function(){var t=this.buf.readFloatLE(this.pos);return this.pos+=4,t},readDouble:function(){var t=this.buf.readDoubleLE(this.pos);return this.pos+=8,t},readVarint:function(){var t,e,i,r,s,n,o=this.buf;if((i=o[this.pos++])<128)return i;if(i&=127,(r=o[this.pos++])<128)return i|r<<7;if(r=(127&r)<<7,(s=o[this.pos++])<128)return i|r|s<<14;if(s=(127&s)<<14,(n=o[this.pos++])<128)return i|r|s|n<<21;if(t=i|r|s|(127&n)<<21,t+=268435456*(127&(e=o[this.pos++])),e<128)return t;if(t+=34359738368*(127&(e=o[this.pos++])),e<128)return t;if(t+=4398046511104*(127&(e=o[this.pos++])),e<128)return t;if(t+=562949953421312*(127&(e=o[this.pos++])),e<128)return t;if(t+=72057594037927940*(127&(e=o[this.pos++])),e<128)return t;if(t+=0x8000000000000000*(127&(e=o[this.pos++])),e<128)return t;throw new Error("Expected varint not more than 10 bytes")},readVarint64:function(){var t=this.pos,e=this.readVarint();if(e<a)return e;for(var i=this.pos-2;255===this.buf[i];)i--;i<t&&(i=t),e=0;for(var r=0;r<i-t+1;r++){var s=127&~this.buf[t+r];e+=r<4?s<<7*r:s*Math.pow(2,7*r)}return-e-1},readSVarint:function(){var t=this.readVarint();return t%2==1?(t+1)/-2:t/2},readBoolean:function(){return Boolean(this.readVarint())},readString:function(){var t=this.readVarint()+this.pos,e=this.buf.toString("utf8",this.pos,t);return this.pos=t,e},readBytes:function(){var t=this.readVarint()+this.pos,e=this.buf.slice(this.pos,t);return this.pos=t,e},readPackedVarint:function(){for(var t=this.readVarint()+this.pos,e=[];this.pos<t;)e.push(this.readVarint());return e},readPackedSVarint:function(){for(var t=this.readVarint()+this.pos,e=[];this.pos<t;)e.push(this.readSVarint());return e},readPackedBoolean:function(){for(var t=this.readVarint()+this.pos,e=[];this.pos<t;)e.push(this.readBoolean());return e},readPackedFloat:function(){for(var t=this.readVarint()+this.pos,e=[];this.pos<t;)e.push(this.readFloat());return e},readPackedDouble:function(){for(var t=this.readVarint()+this.pos,e=[];this.pos<t;)e.push(this.readDouble());return e},readPackedFixed32:function(){for(var t=this.readVarint()+this.pos,e=[];this.pos<t;)e.push(this.readFixed32());return e},readPackedSFixed32:function(){for(var t=this.readVarint()+this.pos,e=[];this.pos<t;)e.push(this.readSFixed32());return e},readPackedFixed64:function(){for(var t=this.readVarint()+this.pos,e=[];this.pos<t;)e.push(this.readFixed64());return e},readPackedSFixed64:function(){for(var t=this.readVarint()+this.pos,e=[];this.pos<t;)e.push(this.readSFixed64());return e},skip:function(t){var e=7&t;if(e===s.Varint)for(;this.buf[this.pos++]>127;);else if(e===s.Bytes)this.pos=this.readVarint()+this.pos;else if(e===s.Fixed32)this.pos+=4;else{if(e!==s.Fixed64)throw new Error("Unimplemented type: "+e);this.pos+=8}},writeTag:function(t,e){this.writeVarint(t<<3|e)},realloc:function(t){for(var e=this.length||16;e<this.pos+t;)e*=2;if(e!==this.length){var i=new r(e);this.buf.copy(i),this.buf=i,this.length=e}},finish:function(){return this.length=this.pos,this.pos=0,this.buf.slice(0,this.length)},writeFixed32:function(t){this.realloc(4),this.buf.writeUInt32LE(t,this.pos),this.pos+=4},writeSFixed32:function(t){this.realloc(4),this.buf.writeInt32LE(t,this.pos),this.pos+=4},writeFixed64:function(t){this.realloc(8),this.buf.writeInt32LE(-1&t,this.pos),this.buf.writeUInt32LE(Math.floor(t*o),this.pos+4),this.pos+=8},writeSFixed64:function(t){this.realloc(8),this.buf.writeInt32LE(-1&t,this.pos),this.buf.writeInt32LE(Math.floor(t*o),this.pos+4),this.pos+=8},writeVarint:function(t){if((t=+t)<=127)this.realloc(1),this.buf[this.pos++]=t;else if(t<=16383)this.realloc(2),this.buf[this.pos++]=t>>>0&127|128,this.buf[this.pos++]=t>>>7&127;else if(t<=2097151)this.realloc(3),this.buf[this.pos++]=t>>>0&127|128,this.buf[this.pos++]=t>>>7&127|128,this.buf[this.pos++]=t>>>14&127;else if(t<=268435455)this.realloc(4),this.buf[this.pos++]=t>>>0&127|128,this.buf[this.pos++]=t>>>7&127|128,this.buf[this.pos++]=t>>>14&127|128,this.buf[this.pos++]=t>>>21&127;else{for(var e=this.pos;t>=128;)this.realloc(1),this.buf[this.pos++]=255&t|128,t/=128;if(this.realloc(1),this.buf[this.pos++]=0|t,this.pos-e>10)throw new Error("Given varint doesn't fit into 10 bytes")}},writeSVarint:function(t){this.writeVarint(t<0?2*-t-1:2*t)},writeBoolean:function(t){this.writeVarint(Boolean(t))},writeString:function(t){t=String(t);var e=r.byteLength(t);this.writeVarint(e),this.realloc(e),this.buf.write(t,this.pos),this.pos+=e},writeFloat:function(t){this.realloc(4),this.buf.writeFloatLE(t,this.pos),this.pos+=4},writeDouble:function(t){this.realloc(8),this.buf.writeDoubleLE(t,this.pos),this.pos+=8},writeBytes:function(t){var e=t.length;this.writeVarint(e),this.realloc(e);for(var i=0;i<e;i++)this.buf[this.pos++]=t[i]},writeRawMessage:function(t,e){this.pos++;var i=this.pos;t(e,this);var r=this.pos-i,s=r<=127?1:r<=16383?2:r<=2097151?3:r<=268435455?4:Math.ceil(Math.log(r)/(7*Math.LN2));if(s>1){this.realloc(s-1);for(var n=this.pos-1;n>=i;n--)this.buf[n+s-1]=this.buf[n]}this.pos=i-1,this.writeVarint(r),this.pos+=r},writeMessage:function(t,e,i){this.writeTag(t,s.Bytes),this.writeRawMessage(e,i)},writePackedVarint:function(t,e){this.writeMessage(t,h,e)},writePackedSVarint:function(t,e){this.writeMessage(t,l,e)},writePackedBoolean:function(t,e){this.writeMessage(t,f,e)},writePackedFloat:function(t,e){this.writeMessage(t,u,e)},writePackedDouble:function(t,e){this.writeMessage(t,c,e)},writePackedFixed32:function(t,e){this.writeMessage(t,d,e)},writePackedSFixed32:function(t,e){this.writeMessage(t,p,e)},writePackedFixed64:function(t,e){this.writeMessage(t,y,e)},writePackedSFixed64:function(t,e){this.writeMessage(t,v,e)},writeBytesField:function(t,e){this.writeTag(t,s.Bytes),this.writeBytes(e)},writeFixed32Field:function(t,e){this.writeTag(t,s.Fixed32),this.writeFixed32(e)},writeSFixed32Field:function(t,e){this.writeTag(t,s.Fixed32),this.writeSFixed32(e)},writeFixed64Field:function(t,e){this.writeTag(t,s.Fixed64),this.writeFixed64(e)},writeSFixed64Field:function(t,e){this.writeTag(t,s.Fixed64),this.writeSFixed64(e)},writeVarintField:function(t,e){this.writeTag(t,s.Varint),this.writeVarint(e)},writeSVarintField:function(t,e){this.writeTag(t,s.Varint),this.writeSVarint(e)},writeStringField:function(t,e){this.writeTag(t,s.Bytes),this.writeString(e)},writeFloatField:function(t,e){this.writeTag(t,s.Fixed32),this.writeFloat(e)},writeDoubleField:function(t,e){this.writeTag(t,s.Fixed64),this.writeDouble(e)},writeBooleanField:function(t,e){this.writeVarintField(t,Boolean(e))}}},788:t=>{"use strict";function e(t,e){this.x=t,this.y=e}t.exports=e,e.prototype={clone:function(){return new e(this.x,this.y)},add:function(t){return this.clone()._add(t)},sub:function(t){return this.clone()._sub(t)},mult:function(t){return this.clone()._mult(t)},div:function(t){return this.clone()._div(t)},rotate:function(t){return this.clone()._rotate(t)},matMult:function(t){return this.clone()._matMult(t)},unit:function(){return this.clone()._unit()},perp:function(){return this.clone()._perp()},round:function(){return this.clone()._round()},mag:function(){return Math.sqrt(this.x*this.x+this.y*this.y)},equals:function(t){return this.x===t.x&&this.y===t.y},dist:function(t){return Math.sqrt(this.distSqr(t))},distSqr:function(t){var e=t.x-this.x,i=t.y-this.y;return e*e+i*i},angle:function(){return Math.atan2(this.y,this.x)},angleTo:function(t){return Math.atan2(this.y-t.y,this.x-t.x)},angleWith:function(t){return this.angleWithSep(t.x,t.y)},angleWithSep:function(t,e){return Math.atan2(this.x*e-this.y*t,this.x*t+this.y*e)},_matMult:function(t){var e=t[0]*this.x+t[1]*this.y,i=t[2]*this.x+t[3]*this.y;return this.x=e,this.y=i,this},_add:function(t){return this.x+=t.x,this.y+=t.y,this},_sub:function(t){return this.x-=t.x,this.y-=t.y,this},_mult:function(t){return this.x*=t,this.y*=t,this},_div:function(t){return this.x/=t,this.y/=t,this},_unit:function(){return this._div(this.mag()),this},_perp:function(){var t=this.y;return this.y=this.x,this.x=-t,this},_rotate:function(t){var e=Math.cos(t),i=Math.sin(t),r=e*this.x-i*this.y,s=i*this.x+e*this.y;return this.x=r,this.y=s,this},_round:function(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}},e.convert=function(t){return t instanceof e?t:Array.isArray(t)?new e(t[0],t[1]):t}},753:(t,e,i)=>{t.exports.VectorTile=i(646),i(886),i(817)},646:(t,e,i)=>{"use strict";var r=i(817);function s(t,e,i){if(3===t){var s=new r(i,i.readVarint()+i.pos);s.length&&(e[s.name]=s)}}t.exports=function(t,e){this.layers=t.readFields(s,{},e)}},886:(t,e,i)=>{"use strict";var r=i(788);function s(t,e,i,r,s){this.properties={},this.extent=i,this.type=0,this._pbf=t,this._geometry=-1,this._keys=r,this._values=s,t.readFields(n,this,e)}function n(t,e,i){1==t?e._id=i.readVarint():2==t?function(t,e){for(var i=t.readVarint()+t.pos;t.pos<i;){var r=e._keys[t.readVarint()],s=e._values[t.readVarint()];e.properties[r]=s}}(i,e):3==t?e.type=i.readVarint():4==t&&(e._geometry=i.pos)}t.exports=s,s.types=["Unknown","Point","LineString","Polygon"],s.prototype.loadGeometry=function(){var t=this._pbf;t.pos=this._geometry;for(var e,i=t.readVarint()+t.pos,s=1,n=0,o=0,a=0,h=[];t.pos<i;){if(!n){var l=t.readVarint();s=7&l,n=l>>3}if(n--,1===s||2===s)o+=t.readSVarint(),a+=t.readSVarint(),1===s&&(e&&h.push(e),e=[]),e.push(new r(o,a));else{if(7!==s)throw new Error("unknown command "+s);e&&e.push(e[0].clone())}}return e&&h.push(e),h},s.prototype.bbox=function(){var t=this._pbf;t.pos=this._geometry;for(var e=t.readVarint()+t.pos,i=1,r=0,s=0,n=0,o=1/0,a=-1/0,h=1/0,l=-1/0;t.pos<e;){if(!r){var u=t.readVarint();i=7&u,r=u>>3}if(r--,1===i||2===i)(s+=t.readSVarint())<o&&(o=s),s>a&&(a=s),(n+=t.readSVarint())<h&&(h=n),n>l&&(l=n);else if(7!==i)throw new Error("unknown command "+i)}return[o,h,a,l]},s.prototype.toGeoJSON=function(t,e,i){for(var r=this.extent*Math.pow(2,i),n=this.extent*t,o=this.extent*e,a=this.loadGeometry(),h=s.types[this.type],l=0;l<a.length;l++)for(var u=a[l],c=0;c<u.length;c++){var f=u[c],d=180-360*(f.y+o)/r;u[c]=[360*(f.x+n)/r-180,360/Math.PI*Math.atan(Math.exp(d*Math.PI/180))-90]}return"Point"===h&&1===a.length?a=a[0][0]:"Point"===h?(a=a[0],h="MultiPoint"):"LineString"===h&&1===a.length?a=a[0]:"LineString"===h&&(h="MultiLineString"),{type:"Feature",geometry:{type:h,coordinates:a},properties:this.properties}}},817:(t,e,i)=>{"use strict";var r=i(886);function s(t,e){this.version=1,this.name=null,this.extent=4096,this.length=0,this._pbf=t,this._keys=[],this._values=[],this._features=[],t.readFields(n,this,e),this.length=this._features.length}function n(t,e,i){15===t?e.version=i.readVarint():1===t?e.name=i.readString():5===t?e.extent=i.readVarint():2===t?e._features.push(i.pos):3===t?e._keys.push(i.readString()):4===t&&e._values.push(function(t){for(var e=null,i=t.readVarint()+t.pos;t.pos<i;){var r=t.readVarint()>>3;e=1===r?t.readString():2===r?t.readFloat():3===r?t.readDouble():4===r?t.readVarint64():5===r?t.readVarint():6===r?t.readSVarint():7===r?t.readBoolean():null}return e}(i))}t.exports=s,s.prototype.feature=function(t){if(t<0||t>=this._features.length)throw new Error("feature index out of bounds");this._pbf.pos=this._features[t];var e=this._pbf.readVarint()+this._pbf.pos;return new r(this._pbf,e,this.extent,this._keys,this._values)}}},__webpack_module_cache__={};function __webpack_require__(t){var e=__webpack_module_cache__[t];if(void 0!==e)return e.exports;var i=__webpack_module_cache__[t]={exports:{}};return __webpack_modules__[t](i,i.exports,__webpack_require__),i.exports}__webpack_require__.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(t){if("object"==typeof window)return window}}();var __webpack_exports__=__webpack_require__(954);return __webpack_exports__})()));