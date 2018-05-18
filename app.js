/* global WorldWind */

$(document).ready(function () {
    "use strict";
    // Set your Bing Maps key which is used when requesting Bing Maps resources.
    // Without your own key you will be using a limited WorldWind developer's key.
    // See: https://www.bingmapsportal.com/ to register for your own key and then enter it below:
    const BING_API_KEY = "";
    if (BING_API_KEY) {
        // Initialize WorldWind properties before creating the first WorldWindow
        WorldWind.BingMapsKey = BING_API_KEY;
    } else {
        console.error("app.js: A Bing API key is required to use the Bing maps in production. Get your API key at https://www.bingmapsportal.com/");
    }
    // Set the MapQuest API key used by their Nominatim service.
    // Get your own key at https://developer.mapquest.com/
    // Without your own key you will be using a limited WorldWind developer's key.
    const MAPQUEST_API_KEY = "";
    
    /**
     * The Globe encapulates the WorldWindow object (wwd) and provides application
     * specific logic for interacting with layers.
     * @param {String} canvasId
     * @param {String|null} projectionName
     * @returns {Globe}
     */
    class Globe {
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
            // Copy all properties defined on the options object to the layer
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
            let index = this.wwd.layers.findIndex(function(element){return element.category === layer.category;});
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
         * @param {Object|null} options
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
         * @param {LayerProxy} layer Theelected for zooming
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
    }

    /**
     * loadLayers is a utility function used by the view models to copy
     * layers into an observable array. The top-most layer is first in the
     * observable array.
     * @param {Array} layers
     * @param {ko.observableArray} observableArray 
     */
    function loadLayers(layers, observableArray) {
        observableArray.removeAll();
        // Reverse the order of the layers to the top-most layer is first
        layers.reverse().forEach(layer => observableArray.push(layer));
    };

    /**
     * Layers view mode.
     * @param {Globe} globe
     * @returns {undefined}
     */
    function LayersViewModel(globe) {
        var self = this;
        self.baseLayers = ko.observableArray(globe.getLayers('base').reverse());
        self.overlayLayers = ko.observableArray(globe.getLayers('overlay').reverse());
        // Update the view model whenever the model changes
        globe.getCategoryTimestamp('base').subscribe(newValue =>
            loadLayers(globe.getLayers('base'), self.baseLayers));
        globe.getCategoryTimestamp('overlay').subscribe(newValue =>
            loadLayers(globe.getLayers('overlay'), self.overlayLayers));
        // Button click event handler
        self.toggleLayer = function (layer) {
            globe.toggleLayer(layer);
            // Zoom to the layer if it has a bbox assigned to it
            if (layer.enabled && layer.bbox) {
                globe.zoomToLayer(layer);
            }
        };
    }

    /**
     * Settings view model.
     * @param {Globe} globe
     */
    function SettingsViewModel(globe) {
        var self = this;
        self.settingLayers = ko.observableArray(globe.getLayers('setting').reverse());
        self.debugLayers = ko.observableArray(globe.getLayers('debug').reverse());
        // Update this view model whenever one of the layer categories change
        globe.getCategoryTimestamp('setting').subscribe(newValue =>
            loadLayers(globe.getLayers('setting'), self.settingLayers));
        globe.getCategoryTimestamp('debug').subscribe(newValue =>
            loadLayers(globe.getLayers('debug'), self.debugLayers));
        // Button click event handler
        self.toggleLayer = function (layer) {
            globe.toggleLayer(layer);
        };
    }

    /**
     * Tools view model for tools palette on the globe
     * @param {Globe} globe
     * @param {MarkersViewModel} markers
     * @returns {ToolsViewModel}
     */
    function ToolsViewModel(globe, markers) {
        var self = this;
        // An array of marker images
        self.markerPalette = [
            "https://files.worldwind.arc.nasa.gov/artifactory/web/0.9.0/images/pushpins/castshadow-red.png",
            "https://files.worldwind.arc.nasa.gov/artifactory/web/0.9.0/images/pushpins/castshadow-green.png",
            "https://files.worldwind.arc.nasa.gov/artifactory/web/0.9.0/images/pushpins/castshadow-blue.png",
            "https://files.worldwind.arc.nasa.gov/artifactory/web/0.9.0/images/pushpins/castshadow-orange.png",
            "https://files.worldwind.arc.nasa.gov/artifactory/web/0.9.0/images/pushpins/castshadow-teal.png",
            "https://files.worldwind.arc.nasa.gov/artifactory/web/0.9.0/images/pushpins/castshadow-purple.png",
            "https://files.worldwind.arc.nasa.gov/artifactory/web/0.9.0/images/pushpins/castshadow-white.png",
            "https://files.worldwind.arc.nasa.gov/artifactory/web/0.9.0/images/pushpins/castshadow-black.png"
        ];
        // The currently selected marker icon 
        self.selectedMarkerImage = ko.observable(self.markerPalette[0]);
        // Callback invoked by the Click/Drop event handler
        self.dropCallback = null;
        // The object dropped on the globe at the click location
        self.dropObject = null;
        // Observable boolean indicating that click/drop is armed
        self.isDropArmed = ko.observable(false);
        // Change the globe's cursor to crosshairs when drop is armed
        self.isDropArmed.subscribe(armed =>
            $(globe.wwd.canvas).css("cursor", armed ? "crosshair" : "default"));
        // Button click event handler to arm the drop
        self.armDropMarker = function () {
            self.isDropArmed(true);
            self.dropCallback = self.dropMarkerCallback;
            self.dropObject = self.selectedMarkerImage();
        };
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
         * "Drop" action callback creates and adds a marker (WorldWind.Placemark) to the globe.
         *
         * @param {WorldWind.Location} position
         */
        self.dropMarkerCallback = function (position) {
            let attributes = new WorldWind.PlacemarkAttributes(commonAttributes);
            attributes.imageSource = self.selectedMarkerImage();
            let placemark = new WorldWind.Placemark(position, /*eyeDistanceScaling*/ true, attributes);
            placemark.label = "Lat " + position.latitude.toPrecision(4).toString() + "\n" + "Lon " + position.longitude.toPrecision(5).toString();
            placemark.altitudeMode = WorldWind.CLAMP_TO_GROUND;
            placemark.eyeDistanceScalingThreshold = 2500000;
            // Add the placemark to the layer and to the observable array
            let layer = globe.findLayerByName("Markers");
            layer.addRenderable(placemark);
            markers.addMarker(placemark);
        };
        /**
         * Handles a click on the WorldWindow. If a "drop" action callback has been
         * defined, it invokes the function with the picked location.
         * @param {Object} event
         */
        self.handleClick = function (event) {
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
                let pickList = globe.wwd.pickTerrain(globe.wwd.canvasCoordinates(x, y));
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


    /**
     * Markers view model.
     * @param {Globe} globe
     * @returns {MarkersViewModel}
     */
    function MarkersViewModel(globe) {
        var self = this;
        // Observable array of markers displayed in the view
        self.markers = ko.observableArray();
        /**
         * Adds a marker to the view model
         * @param {WorldWind.Placemark} marker
         */
        self.addMarker = function (marker) {
            self.markers.push(marker);
        };
        /** 
         * "Goto" function centers the globe on the given marker.
         * @param {WorldWind.Placemark} marker
         */
        self.gotoMarker = function (marker) {
            globe.wwd.goTo(new WorldWind.Location(marker.position.latitude, marker.position.longitude));
        };
        /** 
         * "Edit" function invokes a modal dialog to edit the marker attributes.
         * @param {WorldWind.Placemark} marker
         */
        self.editMarker = function (marker) {
            // TODO bind marker to dialog, maybe create an individual marker view-model
            //                        var options = {};
            //                        $('#editMarkerModal').modal(options)
        };
        /** 
         * "Remove" function removes a marker from the globe.
         * @param {WorldWind.Placemark} marker
         */
        self.removeMarker = function (marker) {
            // Find and remove the marker from the layer and the observable array
            let markerLayer = globe.findLayerByName("Markers");
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
    /**
     * Search view model. Uses the MapQuest Nominatim API. 
     * Requires an access key. See: https://developer.mapquest.com/
     * @param {Globe} globe
     * @param {Function} preview Function to preview the results
     * @returns {SearchViewModel}
     */
    function SearchViewModel(globe, preview) {
        var self = this;
        self.geocoder = new WorldWind.NominatimGeocoder();
        self.searchText = ko.observable('');
        self.performSearch = function () {
            if (!MAPQUEST_API_KEY) {
                console.error("SearchViewModel: A MapQuest API key is required to use the geocoder in production. Get your API key at https://developer.mapquest.com/");
            }
            // Get the value from the observable
            let queryString = self.searchText();
            if (queryString) {
                if (queryString.match(WorldWind.WWUtil.latLonRegex)) {
                    // Treat the text as a lat, lon pair 
                    let tokens = queryString.split(",");
                    let latitude = parseFloat(tokens[0]);
                    let longitude = parseFloat(tokens[1]);
                    // Center the globe on the lat, lon
                    globe.wwd.goTo(new WorldWind.Location(latitude, longitude));
                } else {
                    // Treat the text as an address or place name
                    self.geocoder.lookup(queryString, function (geocoder, results) {
                        if (results.length > 0) {
                            // Open the modal dialog to preview and select a result
                            preview(results);
                        }
                    }, MAPQUEST_API_KEY);
                }
            }
        };
    }

    /**
     * Define the view model for the Search Preview.
     * @param {WorldWindow} primaryGlobe
     * @returns {PreviewViewModel}
     */
    function PreviewViewModel(primaryGlobe) {
        var self = this;
        // Show a warning message about the MapQuest API key if missing
        this.showApiWarning = (MAPQUEST_API_KEY === null || MAPQUEST_API_KEY === "");
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

    // ---------------------
    // Construct our web app
    // ----------------------

    // Create the primary globe
    let globe = new Globe("globe-canvas");
    // Add layers ordered by drawing order: first to last
    // Add layers to the globe 
    // Add layers ordered by drawing order: first to last
    globe.addLayer(new WorldWind.BMNGLayer(), {
        category: "base"
    });
    globe.addLayer(new WorldWind.BMNGLandsatLayer(), {
        category: "base",
        enabled: false
    });
    globe.addLayer(new WorldWind.BingAerialLayer(), {
        category: "base",
        enabled: false
    });
    globe.addLayer(new WorldWind.BingAerialWithLabelsLayer(), {
        category: "base",
        enabled: false,
        detailControl: 1.5
    });
    globe.addLayerFromWms("https://tiles.maps.eox.at/wms", "osm", {
        category: "base",
        enabled: false
    });
    globe.addLayer(new WorldWind.BingRoadsLayer(), {
        category: "overlay",
        enabled: false,
        detailControl: 1.5,
        opacity: 0.80
    });
    globe.addLayerFromWms("https://tiles.maps.eox.at/wms", "overlay", {
        category: "overlay",
        displayName: "OpenStreetMap overlay by EOX",
        enabled: false,
        opacity: 0.80
    });
    globe.addLayer(new WorldWind.RenderableLayer("Markers"), {
        category: "data",
        displayName: "Markers",
        enabled: true
    });
    globe.addLayer(new WorldWind.CoordinatesDisplayLayer(globe.wwd), {
        category: "setting"
    });
    globe.addLayer(new WorldWind.ViewControlsLayer(globe.wwd), {
        category: "setting"
    });
    globe.addLayer(new WorldWind.CompassLayer(), {
        category: "setting",
        enabled: false
    });
    globe.addLayer(new WorldWind.StarFieldLayer(), {
        category: "setting",
        enabled: false,
        displayName: "Stars"
    });
    globe.addLayer(new WorldWind.AtmosphereLayer(), {
        category: "setting",
        enabled: false,
        time: null // new Date() // activates day/night mode
    });
    globe.addLayer(new WorldWind.ShowTessellationLayer(), {
        category: "debug",
        enabled: false
    });
    

    // Activate the Knockout bindings between our view models and the html
    let layers = new LayersViewModel(globe);
    let settings = new SettingsViewModel(globe);
    let markers = new MarkersViewModel(globe);
    let tools = new ToolsViewModel(globe, markers);
    let preview = new PreviewViewModel(globe);
    let search = new SearchViewModel(globe, preview.previewResults);
    ko.applyBindings(layers, document.getElementById('layers'));
    ko.applyBindings(settings, document.getElementById('settings'));
    ko.applyBindings(markers, document.getElementById('markers'));
    ko.applyBindings(tools, document.getElementById('tools'));
    ko.applyBindings(search, document.getElementById('search'));
    ko.applyBindings(preview, document.getElementById('preview'));
    // Auto-collapse the main menu when its button items are clicked
    $('.navbar-collapse a[role="button"]').click(function () {
        $('.navbar-collapse').collapse('hide');
    });
    // Collapse card ancestors when the close icon is clicked
    $('.collapse .close').on('click', function () {
        $(this).closest('.collapse').collapse('hide');
    });
});