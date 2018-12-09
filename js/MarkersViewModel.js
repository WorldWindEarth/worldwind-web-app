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

/* global $, ko, WorldWind */

export default class MarkersViewModel {
  /**
   * Markers view model.
   * @param {Globe} globe
   * @returns {MarkersViewModel}
   */
  constructor(globe) {
    let self = this;
    this.globe = globe;
    // Observable array of markers displayed in the view
    this.markers = ko.observableArray();

    /**
     * Adds a marker to the view model
     * @param {WorldWind.Placemark} marker
     */
    this.addMarker = function (marker) {
      self.markers.push(marker);
    };

    /** 
     * "Goto" function centers the globe on the given marker.
     * @param {WorldWind.Placemark} marker
     */
    this.gotoMarker = function (marker) {
      self.globe.wwd.goTo(new WorldWind.Location(marker.position.latitude, marker.position.longitude));
    };

    /** 
     * "Edit" function invokes a modal dialog to edit the marker attributes.
     * @param {WorldWind.Placemark} marker
     */
    this.editMarker = function (marker) {
      // TODO bind marker to dialog, maybe create an individual marker view-model
      //                        var options = {};
      //                        $('#editMarkerModal').modal(options)
    };

    /** 
     * "Remove" function removes a marker from the globe.
     * @param {WorldWind.Placemark} marker
     */
    this.removeMarker = function (marker) {
      // Find and remove the marker from the layer and the observable array
      let markerLayer = self.globe.findLayerByName("Markers");
      for (let i = 0, max = self.markers().length; i < max; i++) {
        let placemark = markerLayer.renderables[i];
        if (placemark === marker) {
          markerLayer.renderables.splice(i, 1);
          self.markers.remove(marker);
          break;
        }
      }
    };
  }
}


