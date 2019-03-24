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

export default class ToolsViewModel {
  /**
   * Constructs a view model for tools palette on the globe
   * @param {Globe} globe
   * @param {MarkersViewModel} markers
   * @returns {ToolsViewModel}
   */
  constructor(globe, markers) {
    let self = this;
    let imagePath = "https://unpkg.com/worldwindjs@1.7.0/build/dist/images/pushpins/";
    this.globe = globe;
    this.markers = markers;
    // An array of pushpin marker images
    this.markerPalette = [
      imagePath + "castshadow-red.png",
      imagePath + "castshadow-green.png",
      imagePath + "castshadow-blue.png",
      imagePath + "castshadow-orange.png",
      imagePath + "castshadow-teal.png",
      imagePath + "castshadow-purple.png",
      imagePath + "castshadow-white.png",
      imagePath + "castshadow-black.png"
    ];
    // The currently selected marker icon 
    this.selectedMarkerImage = ko.observable(this.markerPalette[0]);
    // Callback invoked by the Click/Drop event handler
    this.dropCallback = null;
    // The object dropped on the globe at the click location
    this.dropObject = null;
    // Observable boolean indicating that click/drop is armed
    this.isDropArmed = ko.observable(false);
    // Change the globe's cursor to crosshairs when drop is armed
    this.isDropArmed.subscribe(armed =>
      $(globe.wwd.canvas).css("cursor", armed ? "crosshair" : "default"));

    // Set up the common placemark attributes used in the dropMarkerCallback
    let commonAttributes = new WorldWind.PlacemarkAttributes(null);
    commonAttributes.imageScale = 1;
    commonAttributes.imageOffset = new WorldWind.Offset(
      WorldWind.OFFSET_FRACTION, 0.3,
      WorldWind.OFFSET_FRACTION, 0.0);
    commonAttributes.imageColor = WorldWind.Color.WHITE;
    commonAttributes.labelAttributes.offset = new WorldWind.Offset(
      WorldWind.OFFSET_FRACTION, 0.5,
      WorldWind.OFFSET_FRACTION, 1.0);
    commonAttributes.labelAttributes.color = WorldWind.Color.YELLOW;
    commonAttributes.drawLeaderLine = true;
    commonAttributes.leaderLineAttributes.outlineColor = WorldWind.Color.RED;

    /**
     * Button click event handler to arm the drop
     */
    this.armDropMarker = function () {
      self.isDropArmed(true);
      self.dropCallback = self.dropMarkerCallback;
      self.dropObject = self.selectedMarkerImage();
    };

    /**
     * "Drop" action callback creates and adds a marker (WorldWind.Placemark) to the globe.
     * @param {WorldWind.Location} position
     */
    this.dropMarkerCallback = function (position) {
      let attributes = new WorldWind.PlacemarkAttributes(commonAttributes);
      attributes.imageSource = self.selectedMarkerImage();

      let placemark = new WorldWind.Placemark(position, /*eyeDistanceScaling*/ true, attributes);
      placemark.label = "Lat " + position.latitude.toPrecision(4).toString() + "\n" + "Lon " + position.longitude.toPrecision(5).toString();
      placemark.altitudeMode = WorldWind.CLAMP_TO_GROUND;
      placemark.eyeDistanceScalingThreshold = 2500000;

      // Add the placemark to the layer and to the observable array
      let layer = self.globe.findLayerByName("Markers");
      layer.addRenderable(placemark);

      // Update marker view model
      self.markers.addMarker(placemark);
    };

    /**
     * Handles a click on the WorldWindow. If a "drop" action callback has been
     * defined, it invokes the function with the picked location.
     * @param {Object} event
     */
    this.handleClick = function (event) {
      if (!self.isDropArmed()) {
        return;
      }
      // Get the clicked window coords
      let type = event.type, x, y;
      switch (type) {
        case 'click':
          x = event.clientX;
          y = event.clientY;
          break;
        case 'touchend':
          if (!event.changedTouches[0]) {
            return;
          }
          x = event.changedTouches[0].clientX;
          y = event.changedTouches[0].clientY;
          break;
      }
      if (self.dropCallback) {
        // Get all the picked items 
        let pickList = self.globe.wwd.pickTerrain(self.globe.wwd.canvasCoordinates(x, y));
        // Terrain should be one of the items if the globe was clicked
        let terrain = pickList.terrainObject();
        if (terrain) {
          self.dropCallback(terrain.position, self.dropObject);
        }
      }
      self.isDropArmed(false);
      event.stopImmediatePropagation();
    };

    // Assign a click event handlers to the WorldWindow for Click/Drop support
    globe.wwd.addEventListener('click', self.handleClick);
    globe.wwd.addEventListener('touchend', self.handleClick);
  }
}
