/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
/**
 * JSDoc improvement:
 *           This statement is required by JSDoc, because it reaches this
 *           file before it reaches widget.js and therefore it assumes
 *           that MouseTracker is a static field of a bcdui.widget class.
 *           This statement fixes this issue because then JSDoc treats
 *           bcdui.widget as namespace.
 */
if (typeof bcdui.widget == "undefined") {
  bcdui.widget = {};
}

/**
 * <p>
 *   This class represents a DOM event which can be stored for later use,
 *   especially in a timeout function. It encapsulates the event functionality
 *   provided by prototype.js, but it is not destroyed when the event has
 *   finished. Instead it can be kept to invoke the event handler later.
 * </p>
 * <p>
 *   A use case for this event object is for example a delayed tooltip
 *   appearing for example 200 ms after the mouse over event has occurred.
 * </p>
 */
bcdui.widget.DetachedEvent = class
{
  /**
   * @constructs
   * @param {Event} event The event object that should be the base for this
   * object.
   * @param {HtmlElement} [element] The source element of the event if it should
   * not be derived from the provided event.
   * @param {HtmlElement} [endElement] The optional end element for the findAttribute
   * method. No attribute on of an ancestor of this element is returned by
   * findAttribute.
   */
  constructor(event, element, endElement, memo) {
    /**
     * @private
     */
    this._element = element || event.target;
    /**
     * @private
     */
    this._endElement = endElement || null;
    /**
     * @private
     */
    this._pointer = { x: event.pageX, y: event.pageY };
    /**
     * @private
     */
    this._pointerX = event.pageX;
    /**
     * @private
     */
    this._pointerY = event.pageY;

    for (var key in event) {
      var value = event[key];
      // trying to get value (some event properties may be not avaliable to get and produce "Permission denied error")
      try {
        if (!bcdui.util.isFunction(value))
          this[key] = value;
      }catch(e){ continue; }

    }
  }

  /**
   * Getter for the event origin element.
   * @return {HtmlElement} The element that caused the event.
   */
  element()
    {
      return this._element;
    }

  /**
   * Getter for the coordinates the event has been triggered at.
   * @return {{x: number, y: number }} An object in the form { x: ##, y: ## } holding the x and y position
   * where the event has been triggered.
   */
  pointer()
    {
      return this._pointer;
    }

  /**
   * Getter for the X coordinate of the event.
   * @return {integer} The X coordinate where the event has been triggered.
   */
  pointerX()
    {
      return this._pointerX;
    }

  /**
   * Getter for the Y coordinate of the event.
   * @return {integer} The Y coordinate where the event has been triggered.
   */
  pointerY()
    {
      return this._pointerY;
    }

  /**
   * A convenience wrapper for {@link bcdui.widget._findAttribute}.
   */
  findAttribute(/* String */ attrName)
    {
      return bcdui.widget._findAttribute(this.target, attrName, this._endElement);
    }
};
