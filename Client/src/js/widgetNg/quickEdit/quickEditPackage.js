/*
  Copyright 2010-2018 BusinessCode GmbH, Germany

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
(() => {
  const LIB_PATH = bcdui.config.libPath + "js/widgetNg/quickEdit";

  const WIDGET_RENDERERS = {
    // meta-type; to use when a column defines wrs:References; i.e. optionsModelXPath is provided
    _LIST({ targetHtml, targetModelXPath, targetModelId, rowId, colPos, wrsHeaderCol, optionsModelXPath, optionsModelRelativeValueXPath, quickEditInstance }) {
      const args = {
        optionsModelXPath,
        optionsModelRelativeValueXPath,
        targetModelXPath,
        doSortOptions: true
      };
      if (wrsHeaderCol.getAttribute("nullable") == "0") {
        args.required = true;
      }
      if (wrsHeaderCol.getAttribute("isReadOnly") == "true") {
        args.disabled = true;
      }
      jQuery(targetHtml).bcduiSingleSelectNg(args);
    },

    DATE({ targetHtml, targetModelXPath, targetModelId, rowId, colPos, wrsHeaderCol, optionsModelXPath, optionsModelRelativeValueXPath, quickEditInstance }) {
      if (optionsModelXPath) {
        WIDGET_RENDERERS._LIST.call(undefined, arguments[0]);
        return;
      }
      const args = {
        targetModelXPath,
        placeholder: wrsHeaderCol.getAttribute("caption")
      };
      if (wrsHeaderCol.getAttribute("nullable") == "0") {
        args.required = true;
      }
      if (wrsHeaderCol.getAttribute("isReadOnly") == "true") {
        args.disabled = true;
      }
      jQuery(targetHtml).bcduiDateInputNg(args);
    },

    VARCHAR({ targetHtml, targetModelXPath, targetModelId, rowId, colPos, wrsHeaderCol, optionsModelXPath, optionsModelRelativeValueXPath, quickEditInstance }) {
      if (optionsModelXPath) {
        WIDGET_RENDERERS._LIST.call(undefined, arguments[0]);
        return;
      }
      const args = {
        targetModelXPath,
        placeholder: wrsHeaderCol.getAttribute("caption"),
        doTrimInput: true
      };
      if (wrsHeaderCol.getAttribute("nullable") == "0") {
        args.required = true;
      }
      if (wrsHeaderCol.getAttribute("isReadOnly") == "true") {
        args.disabled = true;
      }
      const typeName = wrsHeaderCol.getAttribute("type-name");
      // type specific extras
      switch (typeName) {
        case "VARCHAR": {
          args.maxlength = wrsHeaderCol.getAttribute("display-size");
          break;
        }
        case "BIGINT":
        case "DECIMAL":
        case "DOUBLE":
        case "FLOAT":
        case "INTEGER":
        case "NUMERIC":
        case "REAL":
        case "TINYINT": {
          args.type = "numeric";
          break;
        }
      }
      jQuery(targetHtml).bcduiInputNg(args);
    }
  };

  /**
   * the default mapping of type-name to widget renderer
   */
  const DEFAULT_WIDGET_TYPE_MAP = {
    VARCHAR: WIDGET_RENDERERS.VARCHAR,
    DATE: WIDGET_RENDERERS.DATE,

    BIGINT: WIDGET_RENDERERS.VARCHAR,
    DECIMAL: WIDGET_RENDERERS.VARCHAR,
    DOUBLE: WIDGET_RENDERERS.VARCHAR,
    FLOAT: WIDGET_RENDERERS.VARCHAR,
    INTEGER: WIDGET_RENDERERS.VARCHAR,
    NUMERIC: WIDGET_RENDERERS.VARCHAR,
    REAL: WIDGET_RENDERERS.VARCHAR,
    TINYINT: WIDGET_RENDERERS.VARCHAR
  };

  /**
   * @typedef {string} QuickEdit.CallbackHandlerType
   * @description
   * Defined callback handler types:
   * "DISPOSE" - this type is called when disposing the widget, either on explicit close or via destruction.
   */
  const CALLBACK_HANDLER_TYPES = {
    DISPOSE: "DISPOSE"
  };

  /**
   * QuickEdit widget provides UI to edit Wrs row
   * @class
   */
  class QuickEdit {
    /**
     * This callback is displayed as part of the Requester class.
     * @callback QuickEdit~callbackHandler
     * @param {QuickEdit} instance - the QuickEdit instance
     * @param {QuickEdit.CallbackHandlerType} type - a string specifying the type of callback
     * @param {object} args - arguments specific to the type
     */

    /**
     * Create QuickEdit
     * @param {object} args - the arguments
     * @param {bcdui.core.DataProvider} args.wrsDataProvider - The dataProvider with Wrs document
     * @param {string} args.rowId - the rowId to edit, the row with such ID must exist in the document already
     * @param {targetHtmlRef} args.targetHtml - the targetHtml to render UI
     * @param {object} [args.columnTypeWidgetRendererMap] - optional mapping for widget renderers mapped by 'type-name' of Wrs
     * @param {QuickEdit~callbackHandler} [args.callbackHandler] - optional callback handler function.
     *                                                             It is recommended to provide a handler to at least handle "DISPOSE" type,
     *                                                             otherwise we just hide the widget and clean its targetHtml if user clicks on "close" button.
     */
    constructor({ wrsDataProvider, rowId, targetHtml, columnTypeWidgetRendererMap, callbackHandler }) {
      if (!rowId) {
        throw ".rowId missing";
      }

      if (!wrsDataProvider) {
        throw ".wrsDataProvider missing";
      }

      if (!targetHtml) {
        throw ".targetHtml missing";
      }

      // precheck if wrsDataProvider is known to registry due to widget restrictions
      if (bcdui.factory.objectRegistry.getObject(wrsDataProvider.id) !== wrsDataProvider) {
        throw `.wrsDataProvider is either not registered to objectRegistry or is not same as $${wrsDataProvider.id}`;
      }

      targetHtml = jQuery("<div class='bcd-quickedit-container'/>").appendTo(jQuery(targetHtml).empty());

      this.context = {
        wrsDataProvider, targetHtml, columnTypeWidgetRendererMap: jQuery.extend({}, DEFAULT_WIDGET_TYPE_MAP, columnTypeWidgetRendererMap), callbackHandler, rowId
      };

      // attach global handlers
      targetHtml
        .on("click", ".bcd-quickedit-action-close", () => {
          this.validateAndClose();
        })
        .on("click", ".bcd-quickedit-action-restorerow", () => {
          this.restoreRow();
        });

      this.editRow();
    }

    /**
     * restores wrs:M; does not modify wrs:D or wrs:I
     * @private
     */
    restoreRow() {
      const wrsRow = this._getRowNode();
      if (wrsRow.selectSingleNode("self::wrs:M")) {
        bcdui.wrs.wrsUtil.restoreRow(this.context.wrsDataProvider, this.context.rowId, true);
      }
    }

    /**
     * validates the content and calls dispose, if input is valid
     * @private
     */
    validateAndClose() {
      bcdui.widget.validate(this.context.targetHtml).then((result) => {
        if (result.isValid) {
          this.dispose();
        }
      });
    }

    /**
     * dispose UI
     * @private
     */
    dispose() {
      if (!this.disposed) {
        this.disposed = true;
        if (this.context.callbackHandler) {
          this.context.callbackHandler(this, CALLBACK_HANDLER_TYPES.DISPOSE);
        } else {
          this.context.targetHtml.empty().hide();
        }
      }
    }

    /**
     * @private
     */
    _getRowNode() {
      const wrsRow = this.context.wrsDataProvider.getData().selectSingleNode(`/*/wrs:Data/wrs:*[@id='${this.context.rowId}']`);
      if (!wrsRow) {
        throw `rowId ${this.context.rowId} not found.`; // creating new row is not implemented yet
      }
      return wrsRow;
    }

    /**
     * open row for edit
     * @private
     */
    editRow() {
      this._renderUi(this._getRowNode());
    }

    /**
     * @param {element} wrsRow - to render editor for
     * @private
     */
    _renderUi(wrsRow) {
      const layoutRenderer = new bcdui.core.Renderer({
        targetHtml: this.context.targetHtml,
        inputModel: this.context.wrsDataProvider,
        chain: LIB_PATH + "/edit.layout.xslt",
        parameters: {
          wrsDataProviderId: this.context.wrsDataProvider.id,
          rowId: wrsRow.getAttribute("id")
        }
      });
      // once layout is ready, init widgets
      layoutRenderer.onceReady(() => {
        const self = this;
        this.context.targetHtml.find(".bcd-quickedit-widget").each(function () {
          self._renderWidget({ targetHtml: this, rowId: wrsRow.getAttribute("id") });
        });
      });
    }

    /**
     * @private
     */
    _renderWidget({ targetHtml, rowId }) {
      const colPos = jQuery(targetHtml).data("wrs-col-pos");
      // retrieve header column
      const wrsHeaderCol = this.context.wrsDataProvider.getData().selectSingleNode(`/*/wrs:Header/wrs:Columns/wrs:C[@pos='${colPos}']`);
      const typeName = wrsHeaderCol.getAttribute("type-name");
      // delegate to specific widget type renderer
      let widgetRenderingFunction = this.context.columnTypeWidgetRendererMap[typeName];
      if (!widgetRenderingFunction) {
        widgetRenderingFunction = this.context.columnTypeWidgetRendererMap["VARCHAR"]; // fallback to VARCHAR
      }
      const targetModelId = this.context.wrsDataProvider.id;
      // provide as much boilperplate as possible
      const widgetRenderingFunctionArgs = { targetHtml, targetModelXPath: `$${targetModelId}/wrs:Wrs/wrs:Data/wrs:*[@id='${rowId}']/wrs:C[${colPos}]`, targetModelId, rowId, colPos, wrsHeaderCol, quickEditInstance: this };
      // check for wrs:References, caption/value
      const wrsRefData = wrsHeaderCol.selectSingleNode("wrs:References/wrs:*/wrs:Data");
      if (wrsRefData) {
        widgetRenderingFunctionArgs.optionsModelXPath = `$${targetModelId}/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@pos='${colPos}']/wrs:References/wrs:Wrs/wrs:Data/wrs:R/wrs:C[1]`;
        // check if has value to caption
        if (wrsRefData.selectSingleNode("../wrs:Header/wrs:Columns/wrs:C[2]")) {
          widgetRenderingFunctionArgs.optionsModelRelativeValueXPath = "../wrs:C[2]";
        }
      }
      widgetRenderingFunction(widgetRenderingFunctionArgs);
    }

    /**
     * @private
     */
    destroy() {
      this.dispose();
      this.context.targetHtml.empty();
      delete this.context;
    }
  }

  /**
   * jQuery Wrapper for QuickEdit
   */
  jQuery.widget("bcdui.bcduiQuickEdit", jQuery.bcdui.bcduiWidget, {
    _getCreateOptions() {
      //return jQuery.extend(true, {}, this.options, bcdui.widgetNg.impl.readParams.input(this.element[0]));
      return jQuery.extend(true, {}, this.options, { targetHtml: this.element[0] });
    },
    _create() {
      this.instanceObject = new QuickEdit(this.options);
    },
    _destroy() {
      this.instanceObject.destroy();
      delete this.instanceObject;
    }
  });
})();