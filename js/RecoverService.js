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

/* global $, WorldWind */

export default class RecoverService {

    /**
     * Constructs the Recover ArcGIS resources.
     * 
     * @param {String} arcGisServiceAddress Root service address for ArcGIS, e.g., http://hostname.com/arcgis
     * @param {String} folder The folder containing the layers to load; null = root folder
     * @param {String} defaultLayer The name of the layer to enable and zoom to
     */
    constructor(arcGisServiceAddress, folder, defaultLayer) {
        this.restEndpoint = arcGisServiceAddress + '/rest/services';
        this.servicesEndpoint =  arcGisServiceAddress + '/services';
        this.folder = folder;   // OK if null
        this.defaultLayer = defaultLayer;   // OK if null
    }

    loadLayers(globe) {
        let self = this;
        let url = this.restEndpoint + "/" + this.folder;
        let query = 'f=json';
        console.log(url + '?' + query);
        $.ajax({
            url: url,
            data: query,
            success: function (response) {
                let arcgis = JSON.parse(response);
                arcgis.services.forEach((service) => {
                    if (service.type === 'MapServer') {
                        self.loadWmsServices(globe, service.name, service.type);
                    }
                });
            }
        });
    }

    loadWmsServices(globe, serviceName, serviceType) {
        let self = this;
        let url = this.restEndpoint + '/' + serviceName + '/' + serviceType;
        let query = 'f=json';
        $.ajax({
            url: url,
            data: query,
            success: function (response) {
                let service = JSON.parse(response);
                if (service.supportedExtensions.includes('WMSServer')) {
                    let serviceAddress =  self.servicesEndpoint + '/' + serviceName + '/' + serviceType + '/WMSServer';
                    self.addWmsLayers(globe, serviceAddress);
                }
            }
        });
    }

    addWmsLayers(globe, serviceAddress ) {
        const self = this;
        // Create a GetCapabilities request URL
        let url = serviceAddress.split('?')[0];
        url += "?service=wms";
        url += "&request=getcapabilities";
        // Define the function that parses capabilities
        let parseCapabilities = function (xml) {
            // Create a WmsCapabilities object from the returned xml
            let wmsCapabilities = new WorldWind.WmsCapabilities(xml);
            let layers = wmsCapabilities.getNamedLayers();
            let options = {category: 'overlay', enabled: false, opacity: 0.75};
            layers.forEach((layerCaps) => {
                var layerConfig = WorldWind.WmsLayer.formLayerConfiguration(layerCaps);
                // Create the layer and add it to the globe
                var wmsLayer = new WorldWind.WmsLayer(layerConfig);
                // Extract the bbox out of the WMS layer configuration
                options.bbox = layerConfig.sector;
                options.enabled = (wmsLayer.displayName === self.defaultLayer);
                // Add the layer to the globe
                globe.addLayer(wmsLayer, options);
                // Zoom to the default layer
                if (wmsLayer.displayName === self.defaultLayer) {
                    globe.zoomToLayer(wmsLayer);
                }
            });
        };
        // Create the request to retrieve the capabilties and then parse and load the layers
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
}