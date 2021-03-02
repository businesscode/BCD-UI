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
/**
 * @fileoverview
 * The implementation of the StaticModel class.
 *
 */

bcdui.core.StaticModel = class extends bcdui.core.AbstractUpdatableModel
/**
 * @lends bcdui.core.StaticModel.prototype
 */
{

  /**
   * @classdesc
   * Creates a model from fixed data without accessing the network.</p>
   * As opposed to most DataProviders, execute() of a StaticModel is guaranteed to be synchronous except when using model updaters.
   * Note that this implies that it is only static once the page is fully loaded {@link bcdui.core.ready()}
   * <ol>
   *   <li> execute() is called after {@link bcdui.core.ready()} was reached, because otherwise model updaters may still register themselves</li>
   *   <li> at the time of .execute() no model updaters were registered for this model, because model updaters operate asynchronously</li>
   * </ol>
   * @extends bcdui.core.AbstractUpdatableModel
   * 
   * @constructs
   * @description
   * Create a StaticModel and provide the data.
   * @param {string|object|Document} args - An XML string, which is parsed, a DOM document </p>or a parameter map
   * @param {string}                 [args.id]              - Globally unique id for use in declarative contexts, ignored if args.data is not set
   * @param {string|object|Document} [args.data="</Empty>"] - And XML string, which is parsed, an XML Document or a JSON object or any other kind of data
   * @example
   * // Provide data as a {@link bcdui.core.DataProvider DataProvider}
   * var myModel = new bcdui.core.StaticModel( "<Root myAttr='Test'></Root>" );
   * myModel.execute();
   * var myAttr = myModel.getData().selectSingleNode("/Root/@myAttr").nodeValue;
   * @example
   * // Provide data as a {@link bcdui.core.DataProvider DataProvider} with an id or use in a declarative context
   * var myModel = new bcdui.core.StaticModel({ id: "dayModel", data: "<Values> <V>Mon</V> <V>Wed</V> </Values>" });
   * myModel.execute();
   * bcdui.widgetNg.createSingleSelect({ targetHtml: "selectDayHtml", optionsModelXPath: "$dayModel/Values/V", targetModelXPath: "$guiStatus/guiStatus:Status/guiStatus:SelectedDay/@value" });
   */
  constructor(args)
    {
      if( args && !args.data ) {
        args = { data: args };
      }
      super(args);
      this.type = this._getClassName();
      if (typeof args.data == "undefined" || (typeof args.data == "string" && !args.data.trim())) {
        args.data = "<Empty/>";
      }
      if (typeof args.data == "string" || args.data.nodeType === 1 || args.data.nodeType === 9) {
        try{
          this.dataDoc = bcdui.util.xml.parseDocument(args.data); // clone or parse
        }catch(e){
          throw new Error("Failed parsing data parameter for static model. " + e);
        }
      } else {
        this.dataDoc = args.data;
      }

      /**
       * @constant
       */
      this.initializedStatus = new bcdui.core.status.InitializedStatus();
      /**
       * @constant
       */
      this.transformedStatus = new bcdui.core.status.TransformedStatus();

      this.addStatusListener(this._statusTransitionHandler.bind(this));

      /*
       * These are the status objects that are considered to be ready stati for this
       * model during the model updater phase.
       */
      this._readyStatiForModelUpdates = [ this.initializedStatus,
                                          this.transformedStatus,
                                          this._refreshingModelUpdatersStatus ];

      /*
       * This flag is set to "true" as soon as an execute is called when the model is
       * not yet set to the initialized status.
       */
      this._mustStartExecution = false;

      /*
       * We set the NULL status to delay the loading of the status until the page
       * is ready. This is important to enable attaching modelUpdaters to the static
       * model, because otherwise the static model would be ready before its model
       * updaters have even been added to it.
       *
       * Please note that this "setStatus" command is for documentation only, because
       * the status is nullStatus by default.
       */
      this.setStatus(this.nullStatus);

      /*
       * We advance to the initialized status as soon as the page is ready. Please
       * note that Internet Explorer fires the event too early so we need to additionally
       * defer the setStatus call.
       */
      bcdui.core.ready(this._deferredInitialization.bind(this));

    }

  /**
   * @private
   */
  _deferredInitialization()
    {
      if (this.getStatus().equals(this.nullStatus)) {
        var waitingKeys = Object.keys(this._modelUpdatersThatWillBeAddedSoon);
        if (waitingKeys.length == 0) {
          this.setStatus(this.initializedStatus);
        }
      }
    }

  /**
   * @private
   */
  _modelUpdaterAdded()
    {
      var waitingKeys = Object.keys(this._modelUpdatersThatWillBeAddedSoon);
      if (this.getStatus().equals(this.nullStatus) && waitingKeys.length == 0) {
        this.setStatus(this.initializedStatus);
      }
    }

  /**
   * @private
   */
  _getTheStateBeforeRefreshingModelUpdatersStatus()
    {
      return this.initializedStatus;
    }

  /**
   * @private
   */
  _statusTransitionHandler(/* StatusEvent */ statusEvent)
    {
      if (statusEvent.getStatus().equals(this.initializedStatus)) {
        /*
         * As soon as we reach the initialized status we need to check if an
         * execution has been requested. In this case we start the execution
         * otherwise we do not.
         */
        if (this._mustStartExecution) {
          this._mustStartExecution = false;
          this.execute();
        }
      } else
      if (statusEvent.getStatus().equals(this._refreshingModelUpdatersStatus)) {
        this._applyModelUpdaters(false); // This makes the model sync ready if there are no model updaters
      }
    }

  /**
   * <p>
   *  The status transitions of the class are as follows:          </p>
   *                                                               <p style="padding-left: 10px"><table><tr><td style="border: 3px double black; text-align: center" colspan="2">
   *      Initialized                                              </td><td style="padding-left: 20px">
   *          All variables have been initialized.
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td style="border: 1px solid black; text-align: center" colspan="2">
   *  <i> RefreshingModelUpdaters </i>                             </td><td style="padding-left: 20px">
   *          ModelUpdaters are currently running.
   *          (<i>execute</i>)
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td style="border: 3px double black; text-align: center" colspan="2">
   *  <b> Transformed </b>                                         </td><td style="padding-left: 20px">
   *          The data XML document has been generated.
   *          (<b>ready</b>)
   *
   * </td></tr></table></p>
   * @return {bcdui.core.Status} The ready state of the document.
   */
  getReadyStatus()
    {
      return this.transformedStatus;
    }

  /**
   * The executing does nothing, because there is nothing to be loaded or read.
   * This method is guaranteed the be sync for static model, when there are no model updaters
   * @private
   */
  _executeImpl()
    {
      if (this.status.equals(this.nullStatus)) {
        /*
         * This data provider has been requested to be executed so we need to execute
         * it as soon at is becomes initialized. Therefore we must set the
         * _mustStartExecution flag.
         */
        this._mustStartExecution = true;
      } else if (this.status.equals(this.initializedStatus) || this.status.equals(this.getReadyStatus())) {
				// We know _refreshingModelUpdatersStatus -> ready is sync if there are no ModelUpdaters, so StaticModel becomes ready sync if there are none
        this.setStatus(this._refreshingModelUpdatersStatus); // This makes the model sync ready if there are no model updaters
      }
    }

  /**
   * @return {XMLDocument} The data document provided in the constructor.
   */
  getData()
    {
      return this.dataDoc;
    }

  /**
   * Debugging function showing a text for this model.
   * @return {string} A summary of the model.
   */
  toString()
    {
      return "[bcdui.core.StaticModel: " + this.id + "]";
    }
}; // Create class: bcdui.core.StaticModel

/**
 * A fixed empty model which can be used in various cases when the real model is not
 * yet available. The model contains a single root element &lt;Empty/>.
 * @constant
 */
bcdui.core.emptyModel = new bcdui.core.StaticModel({ id: "EMPTY_MODEL", data: "<Empty/>" });
bcdui.core.emptyModel.execute();
