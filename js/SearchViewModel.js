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

/* global $, ko, WorldWind, MAPQUEST_API_KEY */

export default class SearchViewModel {
  /**
   * Search view model. Uses the MapQuest Nominatim API. 
   * Requires an access key. See: https://developer.mapquest.com/
   * @param {Globe} globe
   * @param {Function} preview Function to preview the results
   * @param {String} mapQuestApiKey The MapQuest API key used by the Geocoder. Get your API key at https://developer.mapquest.com/
   * @returns {SearchViewModel}
   */
  constructor(globe, preview, mapQuestApiKey) {
    var self = this;
    this.geocoder = new WorldWind.NominatimGeocoder();
    this.searchText = ko.observable('');
    this.mapQuestApiKey = mapQuestApiKey
    
    /**
     * Search function
     */
    this.performSearch = function () {
      if (!self.mapQuestApiKey) {
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
          }, self.mapQuestApiKey);
        }
      }
    };
  }
}

