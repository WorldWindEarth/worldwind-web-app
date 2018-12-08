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

/*global $, WorldWind */

/**
 * The Globe encapulates the WorldWindow object (wwd) and provides application
 * specific logic for interacting with layers.
 */
export default class Globe {
  /**
   * Constructs a Globe object for the given canvas with an optional projection.
   * @param {String} canvasId
   * @param {String|null} projectionName
   * @returns {Globe}
   */
  constructor(canvasId, projectionName) {
    // Create a WorldWindow globe on the specified HTML5 canvas
    this.wwd = new WorldWind.WorldWindow(canvasId);

    // Layer management support
    this.nextLayerId = 1;

    // Projection support
    this.roundGlobe = this.wwd.globe;
    this.flatGlobe = null;
    if (projectionName) {
      this.changeProjection(projectionName);
    }

    // A map of category and 'observable' timestamp pairs
    this.categoryTimestamps = new Map();
    // Add a BMNGOneImageLayer background layer. We're overriding the default 
    // minimum altitude of the BMNGOneImageLayer so this layer always available.
    this.addLayer(new WorldWind.BMNGOneImageLayer(), {category: "background", minActiveAltitude: 0});
  }

  get projectionNames() {
    return[
      "3D",
      "Equirectangular",
      "Mercator",
      "North Polar",
      "South Polar",
      "North UPS",
      "South UPS",
      "North Gnomonic",
      "South Gnomonic"
    ];
  }

  changeProjection(projectionName) {
    if (projectionName === "3D") {
      if (!this.roundGlobe) {
        this.roundGlobe = new WorldWind.Globe(new WorldWind.EarthElevationModel());
      }
      if (this.wwd.globe !== this.roundGlobe) {
        this.wwd.globe = this.roundGlobe;
      }
    } else {
      if (!this.flatGlobe) {
        this.flatGlobe = new WorldWind.Globe2D();
      }
      if (projectionName === "Equirectangular") {
        this.flatGlobe.projection = new WorldWind.ProjectionEquirectangular();
      } else if (projectionName === "Mercator") {
        this.flatGlobe.projection = new WorldWind.ProjectionMercator();
      } else if (projectionName === "North Polar") {
        this.flatGlobe.projection = new WorldWind.ProjectionPolarEquidistant("North");
      } else if (projectionName === "South Polar") {
        this.flatGlobe.projection = new WorldWind.ProjectionPolarEquidistant("South");
      } else if (projectionName === "North UPS") {
        this.flatGlobe.projection = new WorldWind.ProjectionUPS("North");
      } else if (projectionName === "South UPS") {
        this.flatGlobe.projection = new WorldWind.ProjectionUPS("South");
      } else if (projectionName === "North Gnomonic") {
        this.flatGlobe.projection = new WorldWind.ProjectionGnomonic("North");
      } else if (projectionName === "South Gnomonic") {
        this.flatGlobe.projection = new WorldWind.ProjectionGnomonic("South");
      }
      if (this.wwd.globe !== this.flatGlobe) {
        this.wwd.globe = this.flatGlobe;
      }
    }
  }

  /**
   * Returns a new array of layers within the given category.
   * @param {String} category E.g., "base", "overlay" or "setting".
   * @returns {Array}
   */
  getLayers(category) {
    return this.wwd.layers.filter(layer => layer.category === category);
  }

  /**
   * Add a layer to the globe and applies options object properties to the 
   * the layer.
   * @param {WorldWind.Layer} layer
   * @param {Object|null} options E.g., {category: "base", enabled: true}
   */
  addLayer(layer, options) {
    // Copy all properties defined on the options object to the layer object
    if (options) {
      for (let prop in options) {
        if (!options.hasOwnProperty(prop)) {
          continue; // skip inherited props
        }
        layer[prop] = options[prop];
      }
    }
    // Assign a category property for layer management 
    if (typeof layer.category === 'undefined') {
      layer.category = 'overlay'; // default category
    }

    // Assign a unique layer ID to ease layer management 
    layer.uniqueId = this.nextLayerId++;

    // Insert the layer within the given category
    // Find the index of first layer within the layer's category.
    let index = this.wwd.layers.findIndex(function (element) {
      return element.category === layer.category;
    });
    if (index < 0) {
      // Add to the end of the overall layer list
      this.wwd.addLayer(layer);
    } else {
      // Add the layer to the end the category
      let numLayers = this.getLayers(layer.category).length;
      this.wwd.insertLayer(index + numLayers, layer);
    }
    // Signal a change in the category
    this.updateCategoryTimestamp(layer.category);
  }

  /**
   * Add a WMS layer to the globe and applies options object properties to the 
   * the layer.
   * @param {String} serviceAddress Service address for the WMS map server
   * @param {String} layerName Layer name (not title) as defined in the capabilities document
   * @param {Object|null} options Options applied after loading, e.g., displayName and opacity
   */
  addLayerFromWms(serviceAddress, layerName, options) {
    const self = this;

    // Create a GetCapabilities request URL
    let url = serviceAddress.split('?')[0];
    url += "?service=wms";
    url += "&request=getcapabilities";
    let parseCapabilities = function (xml) {
      // Create a WmsCapabilities object from the returned xml
      var wmsCapabilities = new WorldWind.WmsCapabilities(xml);
      var layerForDisplay = wmsCapabilities.getNamedLayer(layerName);
      var layerConfig = WorldWind.WmsLayer.formLayerConfiguration(layerForDisplay);
      // Create the layer and add it to the globe
      var wmsLayer = new WorldWind.WmsLayer(layerConfig);
      // Extract the bbox out of the WMS layer configuration
      options.bbox = layerConfig.sector;
      // Add the layer to the globe
      self.addLayer(wmsLayer, options);
    };

    // Create a request to retrieve the data
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true); // performing an asynchronous request 
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          parseCapabilities(xhr.responseXML);
        } else {
          alert("XMLHttpRequest to " + url + " failed with status code " + xhr.status);
        }
      }
    };
    xhr.send();
  }

  /**
   * Toggles the enabled state of the given layer and updates the layer
   * catetory timestamp. Applies a rule to the 'base' layers the ensures
   * only one base layer is enabled.
   * @param {WorldWind.Layer} layer
   */
  toggleLayer(layer) {
    // Apply rule: only one "base" layer can be enabled at a time
    if (layer.category === 'base') {
      this.wwd.layers.forEach(function (item) {
        if (item.category === 'base' && item !== layer) {
          item.enabled = false;
        }
      });
    }
    // Toggle the selected layer's visibility
    layer.enabled = !layer.enabled;
    // Trigger a redraw so the globe shows the new layer state ASAP
    this.wwd.redraw();
    // Signal a change in the category
    this.updateCategoryTimestamp(layer.category);
  }

  /**
   * Returns an observable containing the last update timestamp for the category.
   * @param {String} category
   * @returns {Observable} 
   */
  getCategoryTimestamp(category) {
    if (!this.categoryTimestamps.has(category)) {
      this.categoryTimestamps.set(category, ko.observable());
    }
    return this.categoryTimestamps.get(category);
  }

  /**
   * Updates the timestamp for the given category.
   * @param {String} category
   */
  updateCategoryTimestamp(category) {
    let timestamp = this.getCategoryTimestamp(category);
    timestamp(new Date());
  }

  /**
   * Returns the first layer with the given name.
   * @param {String} name
   * @returns {WorldWind.Layer|null}
   */
  findLayerByName(name) {
    let layers = this.wwd.layers.filter(layer => layer.displayName === name);
    return layers.length > 0 ? layers[0] : null;
  }

  /**
   * Moves the WorldWindow camera to the center coordinates of the layer, and then zooms in (or out)
   * to provide a view of the layer as complete as possible.
   * @param {WorldWind.Layer} layer The selected layer for zooming
   * TODO: Make this to work when Sector/Bounding box crosses the 180° meridian
   */
  zoomToLayer(layer) {
    // Verify layer sector (bounding box in 2D terms) existence and
    // do not center the camera if layer covers the whole globe.
    let layerSector = layer.bbox;
    if (!layerSector) { // null or undefined.
      console.error("zoomToLayer: No Layer sector / bounding box undefined!");
      return;
    }
    // Comparing each boundary of the sector to verify layer global coverage.
    if (layerSector.maxLatitude >= 90 &&
      layerSector.minLatitude <= -90 &&
      layerSector.maxLongitude >= 180 &&
      layerSector.minLongitude <= -180) {
      console.log("zoomToLayer: The selected layer covers the full globe. No camera centering needed.");
      return;
    }
    // Obtain layer center
    let center = findLayerCenter(layerSector);
    let range = computeZoomRange(layerSector);
    let position = new WorldWind.Position(center.latitude, center.longitude, range);
    // Move camera to position
    this.wwd.goTo(position);
    // Classical formula to obtain middle point between two coordinates
    function findLayerCenter(layerSector) {
      var centerLatitude = (layerSector.maxLatitude + layerSector.minLatitude) / 2;
      var centerLongitude = (layerSector.maxLongitude + layerSector.minLongitude) / 2;
      var layerCenter = new WorldWind.Location(centerLatitude, centerLongitude);
      return layerCenter;
    }
    // Zoom level is obtained following this simple method: Calculate approx arc length of the
    // sectors' diagonal, and set that as the range (altitude) of the camera.
    function computeZoomRange(layerSector) {
      var verticalBoundary = layerSector.maxLatitude - layerSector.minLatitude;
      var horizontalBoundary = layerSector.maxLongitude - layerSector.minLongitude;
      // Calculate diagonal angle between boundaries (simple pythagoras formula, we don't need to
      // consider vectors or great circles).
      var diagonalAngle = Math.sqrt(Math.pow(verticalBoundary, 2) + Math.pow(horizontalBoundary, 2));
      // If the diagonal angle is equal or more than an hemisphere (180°) don't change zoom level.
      // Else, use the diagonal arc length as camera altitude.
      if (diagonalAngle >= 180) {
        return null;
      } else {
        // Gross approximation of longitude of arc in km
        // (assuming spherical Earth with radius of 6,371 km. Accuracy is not needed for this).
        var diagonalArcLength = (diagonalAngle / 360) * (2 * 3.1416 * 6371000);
        return diagonalArcLength;
      }
    }
  }
  /**
   * loadLayers is a utility function used by the view models to copy
   * layers into an observable array. The top-most layer is first in the
   * observable array.
   * @param {Array} layers
   * @param {ko.observableArray} observableArray 
   */
  static loadLayers(layers, observableArray) {
    observableArray.removeAll();
    // Reverse the order of the layers to the top-most layer is first
    layers.reverse().forEach(layer => observableArray.push(layer));
  }
};
