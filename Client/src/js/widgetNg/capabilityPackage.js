/*
  Copyright 2010-2017 BusinessCode GmbH, Germany

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
/**
 * A namespace for the BCD-UI browser capability and availability package.
 *
 * the API is chosen the same as Modernizr which is also used as subordinate availability provider.
 * the _hasFeature() API allows to query properties-by-dot-notation and if there is no known result we delegate
 * to Modernizr. Some special APIs provided by this package are explicitly documented.
 *
 * the property: bcdui.browserCompatibility._hasFeature("input.text") for instance, checks if we have internally some
 * availability flag for it, if not we delegate to Modernizr.input.text.
 * 
 * @namespace bcdui.browserCompatibility
 * @private
 */
bcdui.util.namespace("bcdui.browserCompatibility", {
  /**
   * internal representation of features, which is queried prior to Modernizr
   * @private
   */
    _intern: {
    },

    /**
     * static initialization (to be called prior to use this package)
     *
     * @private
     */
    _initialize: function(){
      //chrome has input.pattern yet does not validate!
      if(bcdui.browserCompatibility.isWebKit) {

        /**
         * A namespace for the BCUDI browser capability and availability package
         * @private
         * @namespace bcdui.browserCapability._intern.input
         */
        bcdui.util.namespace("bcdui.browserCapability._intern.input",{
          pattern: false
        });
      }
    },

    /**
     * API to test for a feature, currently supported features are in property-dot-notation and
     * compatible to Modernizr. i.e. _hasFeature("input.pattern") tells if input.pattern is supported
     *
     * @private
     */
    _hasFeature: function(prop){
      var internalVal = bcdui.browserCompatibility._getValue("bcdui.browserCompatibility._intern",prop);
      return internalVal != null ? internalVal : bcdui.browserCompatibility._getValue("Modernizr",prop);
    },

    /**
     * gets a value via property-dot-notation
     * @private
     */
    _getValue : function(objName, propertyName){
      try{
        return eval(objName + "." + propertyName);
      }catch(e){
        return null;
      }
    }
});

// initialize
bcdui.browserCompatibility._initialize();
