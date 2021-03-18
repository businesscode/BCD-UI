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
"use strict";
bcdui.widget.XMLDataUpdateListener = class
{
  /**
   * @class
   *   This listener is an abstract base class for XML listeners registered to a targetModel
   *   and depending on the existence of a specific HTML element. When the HTML element disappears
   *   the listener de-registers itself from the target model.
   * @abstract
   * @constructs
   */
  constructor(args)
    {
      /**
       * The ID of the HTML element to be watched.
       * @type String
       * @constant
       */
      this.htmlElementId = "";
      this.htmlElementId = args.htmlElementId;
      /**
       * The generated id of the listener.
       * @type String
       * @constant
       */
      this.id = "lst_" + this.htmlElementId;

      /**
       * The hidden referenceId of targetModel to be watched.
       * will be needed when idRef will be removed from object.
       * @type bcdui.core.DataProvider
       * @constant
       */
      this._targetModelId = args.idRef;
      /**
       * The referenceId of targetModel to be watched.
       * @type bcdui.core.DataProvider
       * @constant
       */
      this.idRef = args.idRef;

      /**
       * The XPath within the targetModel that should be observed by the client
       * class. It is not evaluated in this base class.
       * @type String
       * @constant
       */
      this.trackingXPath = "";
      this.trackingXPath = args.trackingXPath;

      /**
       * A flag which is set to false when the class has de-registered itself from
       * the targetModel after the htmlElement has disappeared.
       * @type Boolean
       */
      this.isUnRegistered = false;
    }

  /**
   * @return {String} The generated id of this listener.
   * @private
   */
  getId()
    {
      return this.id;
    }

  /**
   * This overridden method implements the behaviour provided by this class.
   * @private
   */
  _callback(evtSrc)
    {
      var htmlElement = document.getElementById(this.htmlElementId);
      if (htmlElement == null) {
        this.unregister();
      } else {
        this.updateValue(evtSrc);
      }
    }

    /**
     * This method called from factory when data changed.
     * @private
     */
    listener(evtSrc){
      this._callback(evtSrc);
    }

  /**
   * This method needs to be implemented by sub-classes to provide the functionality
   * of the listener.
   * @event
   * @abstract
   */
  updateValue(evtSrc)
    {
      bcdui.log.warn("not implemented");
    }

  /**
   * Tests, if the class has already unregistered itself from its target model. This
   * happens when the listener is called, but the HTML element it is assigned to has
   * disappeared.
   * @return {Boolean} True, if the class is unregistered.
   */
  hasBeenUnRegistered()
    {
      return this.isUnRegistered;
    }

  /**
   * This method removes this listener from the targetModel. It is called by the
   * {@link #callback} method when the listener is triggered and the HTML
   * element has disappeared.
   */
  unregister()
    {
      bcdui.factory.objectRegistry.getObject(this._targetModelId).removeDataListener(this);
      this.isUnRegistered = true;
    }
};
