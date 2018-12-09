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

/* global $, ko, WorldWind */

export default class SearchPreviewViewModel {
  /**
   * Define the view model for the Search Preview.
   * @param {WorldWindow} primaryGlobe
   * @param {String} mapQuestApiKey The MapQuest API key used by the Geocoder. Get your API key at https://developer.mapquest.com/
   * @returns {PreviewViewModel}
   */
  constructor(primaryGlobe, mapQuestApiKey) {
    var self = this;
    // Show a warning message about the MapQuest API key if missing
    this.showApiWarning = (mapQuestApiKey === null || mapQuestApiKey === "");

    // Create secondary globe with a 2D Mercator projection for the preview
    this.previewGlobe = new Globe("preview-canvas", "Mercator");
    let resultsLayer = new WorldWind.RenderableLayer("Results");
    let bingMapsLayer = new WorldWind.BingRoadsLayer();
    bingMapsLayer.detailControl = 1.25; // Show next level-of-detail sooner. Default is 1.75
    this.previewGlobe.addLayer(bingMapsLayer);
    this.previewGlobe.addLayer(resultsLayer);

    // Set up the common placemark attributes for the results
    let placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
    placemarkAttributes.imageSource = WorldWind.configuration.baseUrl + "images/pushpins/castshadow-red.png";
    placemarkAttributes.imageScale = 0.5;
    placemarkAttributes.imageOffset = new WorldWind.Offset(
      WorldWind.OFFSET_FRACTION, 0.3,
      WorldWind.OFFSET_FRACTION, 0.0);

    // Create an observable array who's contents are displayed in the preview
    this.searchResults = ko.observableArray();
    this.selected = ko.observable();

    // Shows the given search results in a table with a preview globe/map
    this.previewResults = function (results) {
      if (results.length === 0) {
        return;
      }
      // Clear the previous results
      self.searchResults.removeAll();
      resultsLayer.removeAllRenderables();
      // Add the results to the observable array
      results.map(item => self.searchResults.push(item));
      // Create a simple placemark for each result
      for (let i = 0, max = results.length; i < max; i++) {
        let item = results[i];
        let placemark = new WorldWind.Placemark(
          new WorldWind.Position(
            parseFloat(item.lat),
            parseFloat(item.lon), 100));
        placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
        placemark.displayName = item.display_name;
        placemark.attributes = placemarkAttributes;
        resultsLayer.addRenderable(placemark);
      }

      // Initialize preview with the first item
      self.previewSelection(results[0]);
      // Display the preview dialog
      $('#previewDialog').modal();
      $('#previewDialog .modal-body-table').scrollTop(0);
    };
    
    this.previewSelection = function (selection) {
      let latitude = parseFloat(selection.lat),
        longitude = parseFloat(selection.lon),
        location = new WorldWind.Location(latitude, longitude);
      // Update our observable holding the selected location
      self.selected(location);
      // Go to the posiion
      self.previewGlobe.wwd.goTo(location);
    };
    
    this.gotoSelected = function () {
      // Go to the location held in the selected observable
      primaryGlobe.wwd.goTo(self.selected());
    };
  }
}
