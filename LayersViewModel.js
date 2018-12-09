/* 
 * The MIT License
 *
 * Copyright 2018 Bruce Schubert.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import Globe from './Globe.js';

/* global ko, WorldWind */

export default class LayersViewModel {
  /**
   * Constructs a view model for the globe's layers.
   * @param {Globe} globe
   */
  constructor(globe) {
    let self = this;

    this.globe = globe;
    this.baseLayers = ko.observableArray(globe.getLayers('base').reverse());
    this.overlayLayers = ko.observableArray(globe.getLayers('overlay').reverse());

    // Update the view model whenever the model changes
    globe.getCategoryTimestamp('base').subscribe(newValue =>
      Globe.loadLayers(globe.getLayers('base'), self.baseLayers));
    globe.getCategoryTimestamp('overlay').subscribe(newValue =>
      Globe.loadLayers(globe.getLayers('overlay'), self.overlayLayers));

    // Button click event handler specified in index.html view
    this.toggleLayer = function (layer) {
      self.globe.toggleLayer(layer);
      // Zoom to the layer if it has a bbox assigned to it
      if (layer.enabled && layer.bbox) {
        self.globe.zoomToLayer(layer);
      }
    };
  }
}

