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
/*
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

bcdui.widget.MouseTracker = bcdui._migPjs._classCreate( null,
/**
 * @lends bcdui.widget.MouseTracker.prototype
 */
{
  /**
   * @private
   */
  _schema_constructor_args:
    {
      name: "_schema_constructor_args",
      properties: {
        baseElement: { type: "htmlElement",  required: true  },
        delay:       { type: "number",       required: false },
        onEnter:     { type: "function",     required: true  },
        onLeave:     { type: "function",     required: false },
        onMove:      { type: "function",     required: false },
        filter:      { type: "string",       required: false }
      }
    },

  /**
   * Creates a new mouse tracker instance. This instance is inactive until the
   * {@link #start()} method is called. Then it tracks the mouse movement on the
   * specified base element until the {@link #stop()} method is executed.
   * @class
   * <p>
   *   A utility class tracking mouse enter and leave events within a specified
   *   parent element. It keeps track of the mouse movement and fires the event
   *   as soon as the mouse does not move for a certain amount of time (default
   *   200 ms). This is useful because when the function does a complex
   *   computation like executing a tooltip XSLT it is not recommended to
   *   execute it with every mouse move.
   * </p>
   * <p>
   *   Please note that "onLeave" does NOT work on HTML table elements in FireFox. So
   *   in this case the baseElement must be the DIV containing the table.
   * </p>
   * <p>
   *   Example:
   * </p>
   * <pre>
       new bcdui.widget.MouseTracker({
           baseElement: $$("table.treeView")[0].up()
         , delay: 1000
         , onEnter: function(e) {
             bcdui.log.isTraceEnabled() && bcdui.log.trace("row No: " + e.element().rowIndex);
           }
         , onLeave: function() {
             bcdui.log.isTraceEnabled() && bcdui.log.trace("onLeave")
           }
         , filter: "tr"
       }).start();
     </pre>
   *
   * @constructs
   * @param {Object} args The argument map offers the following properties:
   *   <ul>
   *     <li>baseElement: {HTMLEement|String} The id or HTML element that contains
   *         the sub-elements the mouse enter / leave events should be tracked on.
   *         It is recommended to use an HTML DIV element as base element.</li>
   *     <li>onEnter: {Function?} The function to be executed when an observed
   *         element is entered by the mouse pointer. This function gets an event
   *         parameter (of the type {@link bcdui.widget.DetachedEvent}) as
   *         argument.</li>
   *     <li>onLeave: {Function?} A function which is run when the mouse leaves an
   *         observed element. The function has no arguments.</li>
   *     <li>filter: {String?} The tag name (or multiple pipe-separated tag names)
   *         that should be observed for the onEnter / onLeave events. It is often
   *         TD or TR so that moving the mouse over table cells / rows inside the
   *         base element is observed. If omitted every child element is observed.
   *         </li>
   *     <li>delay: {Integer?} The duration in milliseconds defining how long the
   *         events should be idle until the provided function is triggered. The
   *         default value is 200.</li>
   *   </ul>
   */
  initialize: function(args)
    {
      bcdui.factory.validate.jsvalidation._validateArgs(args, this._schema_constructor_args);
      this.baseElement = bcdui._migPjs._$(args.baseElement).get(0);
      this.delay = 200;
      if (args.delay)
        this.delay = args.delay;
      this.onEnter = args.onEnter;
      this.onLeave = args.onLeave;
      this.onMove = args.onMove;
      this.filter = null;
      if (args.filter)
        this.filter = bcdui.util.isString(args.filter) ? new RegExp("^" + args.filter + "$", "i") : args.filter;

      /**
       * @private
       */
      this._currentHtmlElement = null;

      /**
       * @private
       */
      this._filteredHtmlElement = null;

      /**
       * @private
       */
      this._fnTimeout = null;

      /**
       * @private
       */
      this._handlers = {};
    },

  /**
   * Starts the observation of the base element. New instances of the MouseTracker
   * object do not automatically start tracking so the start() method should be
   * called on them.
   */
  start: function()
    {
      this.stop();
      this._handlers.mousemove = this._mouseMoveHandler.bind(this);
      this._handlers.mouseleave = this._mouseLeaveHandler.bind(this);
      for (var eventName in this._handlers)
        bcdui._migPjs._$(this.baseElement).on(eventName, this._handlers[eventName]);
    },

  /**
   * Stops observing the base element for mouse enter / leave.
   */
  stop: function()
    {
      for (var eventName in this._handlers)
        bcdui._migPjs._$(this.baseElement).off(eventName, this._handlers[eventName]);
      this._handlers = {};
    },

  /**
   * @private
   */
  _mouseMoveHandler: function(/* Event */ event)
    {
      if(event.target === document){
        return;
      }
      if (this._currentHtmlElement != event.target) {
        this._currentHtmlElement = event.target;
        var newFilteredElement = this._getFilteredElement();
        if (newFilteredElement != this._filteredHtmlElement) {
          this._filteredHtmlElement = newFilteredElement;
          if (this._fnTimeout != null) {
            clearTimeout(this._fnTimeout);
            this._fnTimeout = null;
          }
          if (this._filteredHtmlElement == null) {
            if (this.onLeave)
              this.onLeave();
          } else {
            this._fnTimeout = setTimeout(
                this.onEnter.bind(this,
                    new bcdui.widget.DetachedEvent(event, this._filteredHtmlElement)
                )
              , this.delay);
          }
        }
      }
      if( this.onMove )
        this.onMove(event);
    },

  /**
   * @private
   */
  _mouseLeaveHandler: function()
    {
      //this.stop();
      if (this._fnTimeout != null) {
        clearTimeout(this._fnTimeout);
        this._fnTimeout = null;
        this._currentHtmlElement = null;
        this._filteredHtmlElement = null;
        if (this.onLeave)
          this.onLeave();
      }
    },

  /**
   * @private
   */
  _getFilteredElement: function()
    {
      if (typeof this.filter == "undefined" || (bcdui.util.isString(this.filter) && !this.filter.trim()) ||
          this.filter == null)
        return this._currentHtmlElement;
      var startElement = bcdui._migPjs._$(this._currentHtmlElement).get(0);
      var endElement = this.baseElement;
      do {
        if (this.filter.test(startElement.tagName)) return startElement;
        if (startElement == endElement) return null;
        startElement = bcdui._migPjs._$(startElement).parent().get(0);
      } while (startElement != null);
      return null;
    }
});
