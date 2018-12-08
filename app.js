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
import LayersViewModel from './LayersViewModel.js';
import SettingsViewModel from './SettingsViewModel.js';
import ToolsViewModel from './ToolsViewModel.js';
import MarkersViewModel from './MarkersViewModel.js';
import SearchViewModel from './SearchViewModel.js';
import SearchPreviewViewModel from './SearchPreviewViewModel.js';

/* global $, ko, WorldWind */

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

  // ---------------------
  // Initialize the globe
  // ----------------------

  // Create the primary globe
  let globe = new Globe("globe-canvas");
  
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

  // -----------------------------------------------
  // Initialize Knockout view models and html views
  // -----------------------------------------------

  let layers = new LayersViewModel(globe);
  let settings = new SettingsViewModel(globe);
  let markers = new MarkersViewModel(globe);
  let tools = new ToolsViewModel(globe, markers);
  let preview = new SearchPreviewViewModel(globe, MAPQUEST_API_KEY);
  let search = new SearchViewModel(globe, preview.previewResults, MAPQUEST_API_KEY);
  
  // Activate the Knockout bindings between our view models and the html
  ko.applyBindings(layers, document.getElementById('layers'));
  ko.applyBindings(settings, document.getElementById('settings'));
  ko.applyBindings(markers, document.getElementById('markers'));
  ko.applyBindings(tools, document.getElementById('tools'));
  ko.applyBindings(search, document.getElementById('search'));
  ko.applyBindings(preview, document.getElementById('preview'));

  // ---------------------------------------------------------
  // Add UI event handlers to create a better user experience
  // ---------------------------------------------------------
  
  // Auto-collapse the main menu when its button items are clicked
  $('.navbar-collapse a[role="button"]').click(function () {
    $('.navbar-collapse').collapse('hide');
  });
  // Collapse card ancestors when the close icon is clicked
  $('.collapse .close').on('click', function () {
    $(this).closest('.collapse').collapse('hide');
  });
});