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

/*global define, $, WorldWind */

export default class ArcGisServices {
  /**
   * Constructs an ArcGisServices object for the given endpoint.
   * @param {String} endpoint ArcGIS REST service endpoint 
   */
  constructor(endpoint) {
    this.endPoint = endpoint;
  }

  /**
   * Get the REST services at the endpoint
   * 
   * @param {Function} callback Function that accepts an array of "services"
   */
  getCatalog(callback) {
    var url = this.endPoint,
      query = 'f=json';
    console.log(url + '?' + query);
    $.ajax({
      url: url,
      data: query,
      success: function (response) {
        // Expected response:
        //   {
        //    "currentVersion": 10.51,
        //    "folders": [],
        //    "services": [
        //      {
        //        "name": "EDW/EDW_AerialFireRetardantAvoidanceAreas_01",
        //        "type": "MapServer"
        //      },
        //      {
        //        "name": "EDW/EDW_AerialFireRetardantAvoidanceAreasForSync_01",
        //        "type": "FeatureServer"
        //      }
        //      ...
        //     ]
        //   }
        
//        var json = JSON.parse(response);
//        callback(json.services);
        callback(response);
      }
    });
  }

  getService(service, callback) {
    var url = this.endPoint + "/" + service,
      query = 'f=json';
    console.log(url + '?' + query);
    $.ajax({
      url: url,
      data: query,
      success: function (response) {
        var json = JSON.parse(response);
        callback(json);
      }
    });
  }

  /**
   * Gets the feature from the MapServer REST service.
   * @param {String} layerId
   * @param {String} objectId
   * @param {Function} callback
   */
  getFeature(service, layerId, objectId, callback) {
    var url = this.endPoint + '/' + service + '/' + layerId + '/' + objectId,
      query = 'f=json';
    console.log(url + '?' + query);
    $.ajax({
      url: url,
      data: query,
      success: function (response) {
//                        var json = JSON.parse(response);
        callback(response);
      }
    });
  }

  /**
   * Gets the record count from the USFS MapServer REST service layer.
   * Example output:
   *  {"count":165}
   * @param {String} layerId
   * @param {Function} callback
   */
  getRecordCount(service, layerId, whereCriteria, callback) {
    var url = this.endPoint + '/' + service + '/' + layerId + '/query',
      query = 'where=' + (whereCriteria || '1=1')
      + '&returnCountOnly=true&f=geojson';
    console.log(url + '?' + query);
    $.ajax({
      url: url,
      data: query,
      success: function (response) {
        var json = JSON.parse(response);
        callback(json);
      }
    });
  }

  getRecordIds(service, layerId, whereCriteria, callback) {
    var url = this.endPoint + '/' + service + '/' + layerId + '/query',
      query = 'where=' + (whereCriteria || '1=1')
      + '&returnIdsOnly=true&f=geojson';
    console.log(url + '?' + query);
    $.ajax({
      url: url,
      data: query,
      success: function (response) {
        var json = JSON.parse(response);
        callback(json);
      }
    });
  }

  /**
   * Queries features in the USFS MapService . 
   * @param {String} whereCriteria
   * @param {String} layerId
   * @param {Boolean} includeGeometry
   * @param {Function(Object[])} callback Receives query results "features" array.
   */
  query(service, layerId, objectIds, whereCriteria, includeGeometry, callback) {
    var url = this.endPoint + '/' + service + '/' + layerId + '/query',
      query = 'where=' + (whereCriteria || '1=1')
      + '&text='
      + '&objectIds=' + (objectIds || '')
      + '&time='
      + '&geometry='
      + '&geometryType=esriGeometryEnvelope'
      + '&inSR=&spatialRel=esriSpatialRelIntersects'
      + '&relationParam=&outFields=*'
      + '&returnGeometry=' + (includeGeometry ? 'true' : 'false')
      + '&maxAllowableOffset='
      + '&geometryPrecision='
      + '&outSR=4326'
      + '&returnIdsOnly=false'
      + '&returnCountOnly=false'
      + '&orderByFields='
      + '&groupByFieldsForStatistics='
      + '&outStatistics='
      + '&returnZ=false'
      + '&returnM=false'
      + '&gdbVersion='
      + '&returnDistinctValues=false'
      + '&f=geojson';
    console.log(url + '?' + query);
    $.ajax({
      url: url,
      data: query,
      success: function (response) {
        // 
        //var json = JSON.parse(response);
        callback(response);
      }
    });
    // Use JSONP to request if the server doesn't
    // allow cross-origin requests.
//                WorldWind.WWUtil.jsonp(url + '?' + query, "jsonp", function (jsonData) {
//                    var json = JSON.parse(jsonData);
//                    callback(json.features);
//                });
  }

  /**
   * Identifies features ing the USFS ArcGIS MapService within the the given envelope. 
   * @param {Number} minLat
   * @param {Number} minLon
   * @param {String} layerId
   * @param {Function(String)} callback Callback: function(value){} receives map layer value at lat/lon.
   */
  identifyEnvelope(service, layerId, minLat, minLon, maxLat, maxLon, callback) {
    var url = this.endPoint + '/' + service + '/identify',
      query = 'geometry=' + minLon + ',' + minLat + ',' + maxLon + ',' + maxLat    // x,y
      + '&geometryType=esriGeometryEnvelope'
      + '&sr=4326'
      + '&layers=all:' + layerId
      + '&mapExtent=' + minLon + ',' + minLat + ',' + minLon + ',' + minLat
      + '&imageDisplay=1,1,96'    // width, height, dpi
      + '&returnGeometry=true'
      + '&tolerance=1'
      + '&f=geojson';
    console.log(url + '?' + query);
    $.ajax({
      url: url,
      data: query,
      success: function (response) {
        var json = JSON.parse(response);
        callback(json);
      }
    });
  }

}
