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
 * A namespace for the BCD-UI widgets.
 * @namespace bcdui.widget
 */
bcdui.util.namespace("bcdui.widget",
/**  @lends bcdui.widget */
{
  /**
   * well known html dom events, which are fired by widgets at given circumstances,
   * these events are fired by widgets using jQuery.trigger() and can be consumed by
   * jQuery.on()
   *
   */
  events : {
    /**
     * a GUI value is written to model, this equals to .onchange() on html controls
     */
    writeValueToModel : "bcdui.widget.event.writeValueToModel"
  },

  /**
   * Creates a field where the user can enter a value or select it from a list of
   * pre-defined values. These values are copied to a target model under a specified
   * target XPath. When there is a list of allowed values the inputField can also
   * apply a caption-value translation so that the displayed values can differ from
   * the data that is actually placed in XML.This function creates an input field in
   * the given target HTML element. This input field can be a text box or a combo box, dependent on the parameters.
   * 
   * @param {Object}        args                                  The parameter map contains the following properties.
   * @param {writableModelXPath}  args.targetModelXPath           The xPath pointing to the root-node this widget will place entered selected items into. The underlying XML format of data written is implemented by individual widget. If pointing into a Wrs, it switches to Wrs mode, i.e. the wrs:R will be marked as modified, target node will not be deleted. If you specify a targetmodelxpath, the box automatically acts as target.
   * @param {targetHtmlRef} args.targetHtml                       An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
   * @param {string}        [args.id]                             ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
   * @param {modelXPath}    [args.optionsModelXPath]              xPath pointing to an absolute xpath (starts with $model/..) providing a node-set of available options to display; especially this one supports cross references between models, i.e. $options / * / Value[@id = $guiStatus / * / MasterValue]
   * @param {xpath}         [args.optionsModelRelativeValueXPath] xPath expression relative to 'optionsModelXPath' providing values for options to display, if this is defined, values referenced by optionsModelXPath are treated as captions. Wins over @caption and @ignoreCaption param.
   * @param {boolean}       [args.optionsModelIsSuggestionOnly]   If true, values different from the options model can are allowed. Default is that, if an optionsModel is given, only values from that model are allowed.
   * @param {writableModelXPath} [args.additionalFilterXPath]     An additional XPath created, kept up-to-date during writing, not only when a final value us choosen, not listened on. Usually used to control a server-side filtered options model.
   * @param {boolean}       [args.keepEmptyValueExpression=false] A flag that can be set to 'true' if the target node should not be removed as soon as the value is empty.
   * @param {string}        [args.clearOption=false]              If != 'false', an additional option to clear the selection is shown in the drop-down box. If 'true' bcd_autoCompletionBox_clearOption is used for the text, otherwise this is the i18n key.
   * @param {string}        [args.emptyValue=false]               If != 'false', a text is displayed if nothing is selected / entered. If 'true' bcd_autoCompletionBox_emptyValue is used for the text, otherwise this is the i18n key.
   * @param {boolean}       [args.mandatory=false]                An empty value is invalid if this parameters sets to true. Default is false.
   * @param {string}        [args.wildcard]                       For a f:Filter with @op='like', this controls the prefilling with wildcards ('*') when the value is yet empty and the field gets the focus. Can be 'contains', 'startswith' or 'endswith'. The user can overwrite this by adding/removing wildcards when editing the field. The wildcards apply to filtering within the top down list and for server side filters, both plain and for retrieving drop-down values dynamically from the server.
   * @param {boolean}       [args.bcdAutofit=false]               If true, drop down resizes depending on available options.
   * @param {boolean}       [args.isSortOptions=false]            A flag that can be set to 'true' if the options shown in popup should be sorted alphabetically.
   * @param {integer}       [args.maxlength]                      Maximum number of characters for the input field.
   * @param {string}        [args.onEnterKey]                     Handler function NAME triggered on ENTER key.
   * @param {string}        [args.onEscKey]                       Handler function NAME triggered on ESC key.
   * @param {string}        [args.onTabKey]                       Handler function NAME triggered on TAB key.
   * @param {string}        [args.onBlur]                         Handler function NAME triggered on blur event.
   * @param {string}        [args.onFocus]                        Handler function NAME triggered on focus event.
   * @param {boolean}       [args.setCursorPositionAtEnd=false]   If true, the cursor is automatically positioned at the end of the input box.
   * @param {boolean}       [args.setFocus=false]                 If true, let this input field get focus after creation.
   * @param {string}        [args.tabIndex]                       Tab index of html element.
   * @param {string}        [args.widgetCaption]                  A caption which is used as prefix for navPath generation for this widget.
   */
  createInputField: function(args)
    {
      args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createInputField_args );
      args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "inputField_");
	    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createInputField_args);

      if (!args.id) {
        args.id = bcdui.factory.objectRegistry.generateTemporaryIdInScope("inputField_");
        if (args.id == "inputField_") {
          args.id += "0";
        }
      }
      var targetModelParams = bcdui.factory._extractXPathAndModelId(args.targetModelXPath);
      var parameters = {
          targetModelId: targetModelParams.modelId,
          targetModelXPath: targetModelParams.xPath,
          keepEmptyValueExpression: args.keepEmptyValueExpression,
          clearOption: args.clearOption,
          emptyValue: args.emptyValue,
          mandatory: args.mandatory,
          isSortOptions: args.isSortOptions,
          wildcard: args.wildcard,
          onEnterKey: args.onEnterKey,
          onTabKey: args.onTabKey,
          onEscKey: args.onEscKey,
          maxlength: args.maxlength,
          setFocus: args.setFocus,
          onFocus: args.onFocus,
          onBlur: args.onBlur,
          tabIndex: args.tabIndex,
          autofit: args.autofit,
          setCursorPositionAtEnd: args.setCursorPositionAtEnd,
          id: args.id,
          widgetCaption: args.widgetCaption
      };
      if (bcdui.util.isString(args.optionsModelXPath) && !!args.optionsModelXPath.trim()) {
        var optionsModelParams = bcdui.factory._extractXPathAndModelId(args.optionsModelXPath);
        parameters.optionsModel = bcdui.factory._generateSymbolicLink(optionsModelParams.modelId);
        parameters.optionsModelId = optionsModelParams.modelId;
        parameters.optionsModelXPath = optionsModelParams.xPath;
        parameters.optionsModelRelativeValueXPath = args.optionsModelRelativeValueXPath;
        parameters.optionsModelIsSuggestionOnly = args.optionsModelIsSuggestionOnly;
        parameters.additionalFilterXPath = args.additionalFilterXPath;
      }

      jQuery("#" + args.targetHTMLElementId).empty().append("<span></span>");
      var e = jQuery("#" + args.targetHTMLElementId).children().last().get(0);
      bcdui.widget._addBcdAttributes(e, parameters);
      bcdui.widget.inputField.init(e);
    },

  /**
   * This function creates an dimension chooser in the given target HTML element.
   * @param {Object}        args                                  The parameter map contains the following properties.
   * @param {writableModelXPath} args.targetModelXPath            The xPath pointing to the root-node this widget will place entered selected items into. The underlying XML  format of data written is implemented by individual widget. If pointing into a Wrs, it switches to Wrs mode, i.e. the wrs:R will be marked as modified, target node will not be deleted. If you specify a targetmodelxpath, the box automatically acts as target.
   * @param {targetHtmlRef} args.targetHtml                       An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
   * @param {string}        args.dimension                        Unique name to select a dimension from the dimension model (located at '/bcdui/conf/dimensions.xml'.
   * @param {string}        [args.id]                             ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
   * @param {string}        [args.url]                            The URL the model is loaded from. This URL can be extended with a compressed request document if a requestDocument parameter is provided. If omitted the WrsServlet is taken.
   * @param {string}        [args.multiSelect=false]              Make a multi selected dimension chooser. Can be 'true'|'false'|'check', 'false' is default.
   * @param {boolean}       [args.allowMixedSelect=false]         Allow heterogene selection in multi select chooser.
   * @param {string}        [args.checkBoxCaption=MultiSelect]    Caption of checkbox to turn on and of the multiselect.
   * @param {string}        [args.clearOption=false]              If != 'false', an additional option to clear the level selection is shown in the drop-down box. If 'true' bcd_autoCompletionBox_clearOption is used for the text, otherwise this is the i18n key.
   * @param {string}        [args.clearOptionLevel=false]         See clearOption. This value is for the level selector input box only. If not specified, clearOption is used.
   * @param {string}        [args.emptyValue=false]               If != 'false', a text is displayed if no level is selected. If 'true' bcd_autoCompletionBox_emptyValue is used for the text, otherwise this is the i18n key.
   * @param {string}        [args.emptyValueLevel=false]          See emptyValue. This value is for the level selector input box only. If not specified, emptyValue is used.
   * @param {boolean}       [args.mandatory=false]                An empty value is invalid if this parameters sets to true. Default is false.
   * @param {boolean}       [args.useCaptions=false]              If true, the chooser will receive captions and codes. By convention the bref of the captions column is 'bRef'_caption. By default no captions are created.
   * @param {string}        [args.widgetCaption]                  A caption which is used as prefix for navPath generation for this widget.
   * @param {string}        [args.configurationModelId]           ModelId of chooser configuration xml file. This model can hold a per-level configuration which allows additional filtering.
   * @param {string}        [args.limitLevels]                    Space separated list of levelIds. The available levels from the dimensions model get limited to this subset.
   * 
   * @example <Caption>Configuration Model</Caption>
   * 
   * The Level element can have one child element called FilterCondition. It is a textnode which specifies an additional xpath statement
   * which is added as an AND condition in the request document filter element. You should use brackets around it.
   * There are several Level element attributes (see bcdui.core.AutoModel for details) which allows loading of additional bRefs or
   * filtering: bRef, filterBRefs, mandatoryfilterBRefsSubset, additionalFilterXPath.
   * You can also modify the handling of the Level input fields (see bcdui.widget.InputField): optionsModelIsSuggestionOnly, wildcard.
   * A server sided options model filter can be set via serverSideOptionsModelFilter attribute.
   * If there is a need to hide a level for direct selection (but the level is needed as dependency for a different level selection)
   * you can use the visible attriute.
   * 
   * @example
   * 
   *   &lt;Configuration xmlns="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"&gt;
   *   &lt;Level id="customerGroup" bRefs="ecom"&gt;
   *     &lt;FilterCondition&gt;( ../wrs:C[2]='1')&lt;/FilterCondition&gt;
   *   &lt;/Level&gt;
   * &lt;/Configuration&gt;
   *
   * When using 'customerGroup' level (which is bound to one bRef (wrs:C[1])) another bRef 'ecom' is used and checked against value '1' via the given filter condition.
   *   
   * @example
   *
   *   &lt;Configuration xmlns="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"&gt;
   *   &lt;Level id="station" bRefs="facility_type s_isselectable"&gt;
   *     &lt;FilterCondition&gt;( ../wrs:C[4]='1' and (not($guiStatus///f:Filter/f:Or[@id='facility_type']/f:Expression[@bRef='facility_type']/@value) or ../wrs:C[3] = $guiStatus//f:Filter/f:Or[@id='facility_type']/f:Expression[@bRef='facility_type']/@value) )&lt;/FilterCondition&gt;
   *   &lt;/Level&gt;
   * &lt;/Configuration&gt;
   *
   * When using 'station' level (which is bound to two bRef (wrs:C[1] and wrs:C[2])) two more bRefs 'facility_type' and 's_isselectable' are used.
   * s_isselectable (which will be wrs:C[4] is checked against the value '1' and facility_type is checked against a guiStatus filter (if available)).
   * So you can easily filter available level data with other possibly set client or server filters.
   *
   * @example
   * 
   *   &lt;Configuration xmlns="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"&gt;
   *   &lt;Level id="group" wildcard="startswith" serverSideOptionsModelFilter="true"/&gt;
   * &lt;/Configuration&gt;
   *   
   * Group level information is generated while typing.
   * 
   * @example
   * 
   *   &lt;Configuration xmlns="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"&gt;
   *   &lt;Level id="group" visible="false"/&gt;
   * &lt;/Configuration&gt;
   * 
   * Group level does not appear in Level drop down but can be used as a dependency level for a different level selection.
  */
  createDimensionChooser: function(args)
    {
      args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createDimensionChooser_args );
      args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "dimensionChooser_");
	    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createDimensionChooser_args);

      if (!args.id) {
        args.id = bcdui.factory.objectRegistry.generateTemporaryIdInScope("dimensionChooser_");
        if (args.id == "dimensionChooser_") {
          args.id += "0";
        }
      }

      args.emptyValueLevel         = args.emptyValueLevel || args.emptyValue;
      args.clearOptionLevel        = args.clearOptionLevel || args.clearOption;
      args.multiSelect             = args.multiSelect;
      args.allowMixedSelect        = bcdui.factory._normalizeBoolean(args.allowMixedSelect,  false);
      args.useCaptions             = bcdui.factory._normalizeBoolean(args.useCaptions,    false);
      args.mandatory               = bcdui.factory._normalizeBoolean(args.mandatory,    false);

      var targetModelParams  = bcdui.factory._extractXPathAndModelId(args.targetModelXPath);
      var parameters = {
          id: args.id,
          targetModelId: targetModelParams.modelId,
          targetModelXPath: targetModelParams.xPath,
          dimension: args.dimension,
          multiSelect: args.multiSelect,
          allowMixedSelect: args.allowMixedSelect,
          checkBoxCaption: args.checkBoxCaption,
          configurationModelId: args.configurationModelId,
          useCaptions: args.useCaptions,
          url: args.url,
          clearOption: args.clearOption,
          clearOptionLevel: args.clearOptionLevel,
          emptyValue: args.emptyValue,
          emptyValueLevel: args.emptyValueLevel,
          mandatory: args.mandatory,
          widgetCaption: args.widgetCaption,
          limitLevels: args.limitLevels
      };

      jQuery("#" + args.targetHTMLElementId).empty().append("<div></div>");
      var e = jQuery("#" + args.targetHTMLElementId).children().last().get(0);
      bcdui.widget._addBcdAttributes(e, parameters);
      bcdui.widget.dimensionChooser.init(e);
    },

  /**
   * Creates a single selection radio button group where a value can be selected and stored to the target model.
   * @param {Object}        args                                  The parameter map contains the following properties.
   * @param {writableModelXPath}  args.targetModelXPath           The xPath pointing to the root-node this widget will place entered selected items into. The underlying XML  format of data written is implemented by individual widget. If pointing into a Wrs, it switches to Wrs mode, i.e. the wrs:R will be marked as modified, target node will not be deleted. If you specify a targetmodelxpath, the box automatically acts as target.
   * @param {targetHtmlRef} args.targetHtml                       An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
   * @param {modelXPath}    args.optionsModelXPath                xPath pointing to an absolute xpath (starts with $model/..) providing a node-set of available options to display; especially this one supports cross references between models, i.e. $options / * / Value[@id = $guiStatus / * / MasterValue]
   * @param {string}        [args.id]                             ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
   * @param {string}        [args.optionsModelRelativeValueXPath] xPath expression relative to 'optionsModelXPath' providing values for options to display, if this is defined, values referenced by optionsModelXPath are treated as captions. Wins over @caption and @ignoreCaption param.
   * @param {boolean}       [args.keepEmptyValueExpression=false] A flag that can be set to 'true' if the target node should not be removed as soon as the value is empty.
   * @param {string}        [args.widgetCaption]                  A caption which is used as prefix for navPath generation for this widget.
   */
  createSingleSelect: function(args)
    {
      args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createSingleSelect_args );
      args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "singleSelect_");
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createSingleSelect_args);
      if (!args.id) {
        args.id = bcdui.factory.objectRegistry.generateTemporaryIdInScope("singleSelect_");
        if (args.id == "singleSelect_") {
          args.id += "0";
        }
      }
      var targetModelParams = bcdui.factory._extractXPathAndModelId(args.targetModelXPath);

      if(! args["inputType"]) args["inputType"]="radio";
      var parameters = {
          targetModelId: targetModelParams.modelId,
          targetModelXPath: targetModelParams.xPath,
          keepEmptyValueExpression: args.keepEmptyValueExpression,
          bcdInputType:args.inputType,
          id:args.id,
          widgetCaption: args.widgetCaption
      };
      if (bcdui.util.isString(args.optionsModelXPath) && !!args.optionsModelXPath.trim()) {
        var optionsModelParams = bcdui.factory._extractXPathAndModelId(args.optionsModelXPath);
        parameters.optionsModel = bcdui.factory._generateSymbolicLink(optionsModelParams.modelId);
        parameters.optionsModelId = optionsModelParams.modelId;
        parameters.optionsModelXPath = optionsModelParams.xPath;
        parameters.optionsModelRelativeValueXPath = args.optionsModelRelativeValueXPath;
      }
      jQuery("#" + args.targetHTMLElementId).empty().append("<span></span>");
      var e = jQuery("#" + args.targetHTMLElementId).children().last().get(0);
      bcdui.widget._addBcdAttributes(e, parameters);
      bcdui.widget.singleSelect.init(e);
    },

  /**
   * Creates a multi selection box where multiple values can be selected and stored to the target model.
   * @param {Object}        args                                  The parameter map contains the following properties.
   * @param {writableModelXPath}  args.targetModelXPath           The xPath pointing to the root-node this widget will place entered selected items into. The underlying XML  format of data written is implemented by individual widget. If pointing into a Wrs, it switches to Wrs mode, i.e. the wrs:R will be marked as modified, target node will not be deleted. If you specify a targetmodelxpath, the box automatically acts as target.
   * @param {targetHtmlRef} args.targetHtml                       An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
   * @param {modelXPath}    args.optionsModelXPath                xPath pointing to an absolute xpath (starts with $model/..) providing a node-set of available options to display; especially this one supports cross references between models, i.e. $options / * / Value[@id = $guiStatus / * / MasterValue]
   * @param {string}        [args.id]                             ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
   * @param {string}        [args.optionsModelRelativeValueXPath] xPath expression relative to 'optionsModelXPath' providing values for options to display, if this is defined, values referenced by optionsModelXPath are treated as captions. Wins over @caption and @ignoreCaption param.
   * @param {string}        [args.delimiter]                      If defined, will switch to delimiter-based storing, i.e. multiple values will be written into one DOM node and separated by given delimiter.
   * @param {integer}       [args.visibleSize]                    Number of visible elements in list.
   * @param {boolean}       [args.isCheckBox=false]               Use checkbox html element instead of multiselect.
   * @param {boolean}       [args.keepEmptyValueExpression=false] A flag that can be set to 'true' if the target node should not be removed as soon as the value is empty.
   * @param {string}        [args.widgetCaption]                  A caption which is used as prefix for navPath generation for this widget.
   */
  createMultiSelect: function(args)
    {
      args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createMultiSelect_args );
      args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "multiSelect_");
	    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createMultiSelect_args);

      if (!args.id) {
        args.id = bcdui.factory.objectRegistry.generateTemporaryIdInScope("multiSelect_");
        if (args.id == "multiSelect_") {
          args.id += "0";
        }
      }
      var targetModelParams = bcdui.factory._extractXPathAndModelId(args.targetModelXPath);
      var parameters = {
          targetModelId:            targetModelParams.modelId,
          targetModelXPath:         targetModelParams.xPath,
          keepEmptyValueExpression: args.keepEmptyValueExpression || "false",
          isCheckBox:               args.isCheckBox || "false",
          visibleSize:              args.visibleSize || 4,
          id:                       args.id,
          delimiter:                args.delimiter||"",
          widgetCaption:           args.widgetCaption
      };
      if (bcdui.util.isString(args.optionsModelXPath) && !!args.optionsModelXPath.trim()) {
        var optionsModelParams = bcdui.factory._extractXPathAndModelId(args.optionsModelXPath);
        parameters.optionsModel = bcdui.factory._generateSymbolicLink(optionsModelParams.modelId);
        parameters.optionsModelId = optionsModelParams.modelId;
        parameters.optionsModelXPath = optionsModelParams.xPath;
        parameters.optionsModelRelativeValueXPath = args.optionsModelRelativeValueXPath;
      }

      jQuery("#" + args.targetHTMLElementId).empty().append("<span></span>");
      var e = jQuery("#" + args.targetHTMLElementId).children().last().get(0);
      bcdui.widget._addBcdAttributes(e, parameters);
      bcdui.widget.multiSelect.init(e);
    },

  /**
   * Creates a period chooser. The period chooser supports a number of options and formats, see parameters.
   * You can control what kind of periods a user may select and in which format it is written.
   * Note that the bRef written are <b>always</b> <code>yr, qr, mo, cwyr, cw or dy</code> with an optional postfix of there are different types of dates.<br/>
   * The period chooser outputs to args.targetModelXPath, which may point to any model but needs to end with <code>f:And[@id='myPeriod']</code>, where @id is the period chooser's id.
   * @param {Object}        args                                The parameter map contains the following properties.
   * @param {writableModelXPath} args.targetModelXPath          The xPath pointing to the root-node where to place the selected value. Point to an f:And element, like "/guiStatus:Status/f:Filter/f:And[@id='myPeriod']" for example
   * @param {targetHtmlRef} args.targetHtml                     An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
   * @param {string}        [args.id]                           ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
   * @param {string}        [args.caption]                      Default 'Date', it will be used as i18n key to translate the caption if isFreeRangeSelectable set to true, then caption may contain two terms for 'From' and 'To' captions. Divider: ';' Example: caption = 'i18.md.From;i18.md.To'
   * @param {string}        [args.firstSelectableDay]           The first day that can be selected. A week or month can only be selected if all days are selectable.
   * @param {boolean}       [args.lastSelectableDay]            The last day that can be selected. A week or month can only be selected if all days are selectable.
   * @param {boolean}       [args.isFreeRangeSelectable=false]  Allows date free range selection.
   * @param {boolean}       [args.isSecondSelectable=false]     Allows second selection.
   * @param {boolean}       [args.isMinuteSelectable=false]     Allows minute selection.
   * @param {boolean}       [args.isHourSelectable=false]       Allows hour selection.
   * @param {boolean}       [args.isDaySelectable=true]         Allows day selstion.
   * @param {boolean}       [args.isWeekSelectable=false]       Allows week selection.
   * @param {boolean}       [args.isMonthSelectable=true]       Allows month selection.
   * @param {boolean}       [args.isQuarterSelectable=true]     Allows quarter selection
   * @param {boolean}       [args.isYearSelectable=true]        Allows year selection.
   * @param {boolean}       [args.mandatory=false]              An empty value is invalid if this parameters sets to true. Default is false.
   * @param {boolean}       [args.outputPeriodType=false]       Produces selected dates as one of known date periods. For example if this contains mo and the user selects a data range, which fits a month, mo with be written.
   *                                                            This is usefull if you allow free range but you also have a month aggregation for performance optimization.
   *                                                            On the other hand, if this is not set and the user selects a month in the widget, then the month is written in terms of dy.
   * @param {boolean}       [args.showPrevNextButtons=false]    If this is set to 'true' the buttons Previous Period and Next Period are showed. The default value is 'false'.
   * @param {boolean}       [args.suppressCaptions=false]       Set this to true if the buttons should not have any caption text. Default is false.
   * @param {boolean}       [args.textInput=false]              Add the free range feature.
   * @param {boolean}       [args.validate=true]                Turn on-off the validation of the keyboard entered date values.
   * @param {modelXPath}    [args.optionsModelXPath]              Allows to use a single period chooser widget for different logical types of dates (see args.postfix), which then can be selected from a drop-down. The node set found at this xPath lists the postfixes.
   * @param {string}        [args.optionsModelRelativeValueXPath] xPath expression relative to 'optionsModelXPath' providing values for options to display, if this is defined, values referenced by optionsModelXPath are treated as captions. Wins over @caption and @ignoreCaption param.
   * @param {string}        [args.postfix]                      An optional postfix which is added to the filter bRefs (dy/mo.., see above). Use this if you deal with different types of dates. If optionsModel is given, this value should be one of the available ones.
   * @param {string}        [args.widgetCaption]                A caption which is used as prefix for navPath generation for this widget.
   */
  createPeriodChooser: function(args)
    {
      args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createPeriodChooser_args );
      args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "periodChooser_");
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createPeriodChooser_args);
      if (!args.id) {
        args.id = bcdui.factory.objectRegistry.generateTemporaryIdInScope("periodChooser_");
        if (args.id == "periodChooser_") {
          args.id += "0";
        }
      }
      var targetModelParams = bcdui.factory._extractXPathAndModelId(args.targetModelXPath);

      var parameters = {
          targetModelId:          targetModelParams.modelId
        , caption:                args.caption
        , targetModelXPath:       targetModelParams.xPath
        , firstSelectableDay:     args.firstSelectableDay
        , lastSelectableDay:      args.lastSelectableDay
        , isSecondSelectable:     args.isSecondSelectable
        , isMinuteSelectable:     args.isMinuteSelectable
        , isHourSelectable:       args.isHourSelectable
        , isDaySelectable:        args.isDaySelectable
        , isWeekSelectable:       args.isWeekSelectable
        , isMonthSelectable:      args.isMonthSelectable
        , isQuarterSelectable:    args.isQuarterSelectable
        , isYearSelectable:       args.isYearSelectable
        , showPrevNextButtons:    args.showPrevNextButtons
        , isFreeRangeSelectable:  args.isFreeRangeSelectable
        , outputPeriodType:       args.outputPeriodType
        , textInput:              args.textInput
        , validate:               args.validate
        , mandatory:              args.mandatory
        , suppressCaptions:       args.suppressCaptions
        , id:                     args.id
        , postfix:                args.postfix
        , widgetCaption:         args.widgetCaption
      };
      if (bcdui.util.isString(args.optionsModelXPath) && !!args.optionsModelXPath.trim()) {
        var optionsModelParams = bcdui.factory._extractXPathAndModelId(args.optionsModelXPath);
        parameters.optionsModel = bcdui.factory._generateSymbolicLink(optionsModelParams.modelId);
        parameters.optionsModelId = optionsModelParams.modelId;
        parameters.optionsModelXPath = optionsModelParams.xPath;
        parameters.optionsModelRelativeValueXPath = args.optionsModelRelativeValueXPath;
      }

      jQuery("#" + args.targetHTMLElementId).empty().append("<span></span>");
      var e = jQuery("#" + args.targetHTMLElementId).children().last().get(0);
      bcdui.widget._addBcdAttributes(e, parameters);
      bcdui.widget.periodChooser.init(e)
    },

  /**
   * Displays a field where the user can enter a formula
   * @param {Object}        args                                  The parameter map contains the following properties.
   * @param {writableModelXPath}  args.targetModelXPath           The xPath pointing to the root-node this widget will place entered selected items into. The underlying XML  format of data written is implemented by individual widget. If pointing into a Wrs, it switches to Wrs mode, i.e. the wrs:R will be marked as modified, target node will not be deleted. If you specify a targetmodelxpath, the box automatically acts as target.
   * @param {targetHtmlRef} args.targetHtml                       An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
   * @param {string}        [args.id]                             ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
   * @param {string}        [args.caption='']                     Default '', it will be used as i18n key to translate the caption.
   * @param {boolean}       [args.mandatory=false]                An empty value is invalid if this parameters sets to true. Default is false.
   * @param {modelXPath}    [args.optionsModelXPath]              xPath pointing to an absolute xpath (starts with $model/..) providing a node-set of available options to display; especially this one supports cross references between models, i.e. $options / * / Value[@id = $guiStatus / * / MasterValue]
   * @param {string}        [args.optionsModelRelativeValueXPath] xPath expression relative to 'optionsModelXPath' providing values for options to display, if this is defined, values referenced by optionsModelXPath are treated as captions. Wins over @caption and @ignoreCaption param.
   * @param {boolean}       [args.validate=true]                  Turn on-off the validation of the formula.
   * @param {boolean}       [args.validateVariableNamesCheckbox=false] Show or hide checkbox for validate variables option.
   * @param {string}        [args.skipValidationCaption=Skip check of values] Caption to be shown for skipping validation. Default is 'Skip check of values'.
   * @param {boolean}       [args.skipServerSidedFunctions=false] Set to true to disable usage of server sided functions like CntDist. Default is false.
   * @param {string}        [args.widgetCaption]                  A caption which is used as prefix for navPath generation for this widget.
   */
  createFormulaEditor: function(args)
    {
      args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createFormulaEditor_args );
      args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "formulaEditor_");
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createFormulaEditor_args);

      if (!args.id) {
        args.id = bcdui.factory.objectRegistry.generateTemporaryIdInScope("formulaEditor_");
        if (args.id == "formulaEditor_") {
          args.id += "0";
        }
      }

      var parameters = {
            caption:                args.caption
          , targetModelXPath:       args.targetModelXPath
          , validate:               args.validate
          , mandatory:              args.mandatory
          , optionsModelXPath:      args.optionsModelXPath
          , optionsModelRelativeValueXPath:  args.optionsModelRelativeValueXPath
          , id:                     args.id
          , validateVariableNamesCheckbox: args.validateVariableNamesCheckbox
          , skipValidationCaption: args.skipValidationCaption
          , skipServerSidedFunctions: args.skipServerSidedFunctions
          , widgetCaption: args.widgetCaption
        };

      jQuery("#" + args.targetHTMLElementId).empty().append("<span></span>");
      var e = jQuery("#" + args.targetHTMLElementId).children().last().get(0);
      bcdui.widget._addBcdAttributes(e, parameters);
      bcdui.widget.formulaEditor.init(e);
    },


  /**
   * @private
   */
  _runningId: 0,

  /**
   * Here we store the widget listener for an id
   * Listener store their target via id, so if we re-create an input field for example,
   * we want the listner from the previous creation to be removed as we create a new one
   * If the id changes each time, its the bcdui.widget.XMLDataUpdateListener' task to see that its target is gone and de-register itself
   * @private
   */
  _htmlElementIdToListenerMapping: {},

  /**
   * Assures that an id is set to the element, if none is there, generates one
   * @private
   */
  _cleanupHTMLElementId: function(htmlElement)
    {
      if (htmlElement.id == null || !htmlElement.id.trim()) {
        htmlElement.id = "element_" + (bcdui.widget._runningId++);
      } else {
        var listener = bcdui.widget._htmlElementIdToListenerMapping[htmlElement.id];
        if (typeof listener != "undefined") {
          delete bcdui.widget._htmlElementIdToListenerMapping[htmlElement.id];
          listener.unregister();
        }
      }
    },

  /**
   * @private
   */
  _registerHTMLElementListener: function(htmlElement, listener)
    {
      bcdui.widget._cleanupHTMLElementId(htmlElement);
      bcdui.widget._htmlElementIdToListenerMapping[htmlElement.id] = listener;
    },

  /**
   * @private
   */
  _getDataFromXML: function(targetModel, targetModelXPath)
    {
      var data = targetModel.getData();
      if (data == null)
        return null;

      var node = data.selectSingleNode(targetModelXPath);
      if (node == null)
        return null;
      if (node.nodeType == 1) {
        var wrsNull = node.selectSingleNode("wrs:null");
        return wrsNull ? null : (node.text || "");
      }
      return node.nodeValue || "";
    },
    /**
     * fetches the value from targetModelXPath and if available also the @caption from same location.
     * @private
     */
    _getDataAndCaptionFromXML: function(targetModel, targetModelXPath)
    {
      var data = targetModel.getData();
      var result = { value: null, caption: null};
      if (data == null)
        return result;

      var node = data.selectSingleNode(targetModelXPath);
      if (node == null)
        return result;
      if (node.nodeType == 1 ) {
        result.value   = node.selectSingleNode("wrs:null")?null:(node.text || null);
        result.caption = node.getAttribute('caption') || null;
      }else{
        result.value =  node.nodeValue || null;
        if ( typeof node.ownerElement == 'undefined'){
          var modifiedXpath = targetModelXPath.substr(0, targetModelXPath.lastIndexOf ('@')) + '@caption';
          var captionNode = data.selectSingleNode(modifiedXpath);
          if (captionNode){result.caption = captionNode.nodeValue;}
        }
        else {
          result.caption = node.ownerElement.getAttribute('caption') || null;
        }
      }
      return result;
    },
    /**
     * this method replace always < with &lt; and if the value is for an attribute targetxpath single and double quotes will be replaced as well
     * @private
     */

   _escapeText: function( targetXpath, /* String */ value ){
     if (value == null ) return null;
      if ( targetXpath.match("/@\\w+$")){
          return value.replace(/</g, '&lt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
       }else{
         return value.replace(/</g, '&lt;');
       }
    },
    
    /**
     * @private
     */
    _unescapeText: function( targetXpath, /* String */ value){
      if (value == null ) return null;
      if (targetXpath.match("/@\\w+$")){
        return value.replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
     }else{
       return value.replace(/&lt;/g, "<");
     }
    },
    /**
     * @private
     * @return true in case the target document was changed
     */
    _copyDataFromHTMLElementToTargetModel: function(/* DataProvider */ targetModel, /* String */ targetModelXPath, /* String */ value, /* Boolean? */ keepEmptyValueExpression, isRadio, /* func to execute before commit */ cbBeforeCommit){
      return bcdui.widget._copyDataAndCaptionFromHTMLElementToTargetModel( targetModel, targetModelXPath, value, null, keepEmptyValueExpression, isRadio, cbBeforeCommit );
    },

  /**
   * @private
   * @return true in case the target document was changed
   */
  _copyDataAndCaptionFromHTMLElementToTargetModel: function(/* DataProvider */ targetModel, /* String */ targetModelXPath, /* String */ value, /* String */ caption, /* Boolean? */ keepEmptyValueExpression, isRadio, /* func to execute before commit */ cbBeforeCommit)
    {
      // In a wrs model, switch wrs:R to wrs:M
      var isWrsModel = (targetModel.getData().selectSingleNode("/wrs:Wrs") != null ? true:false);
      if(isWrsModel && !value)value=null; // in WRS case we handle empty value as being null

      // Do nothing if unchanged
      if (value == bcdui.widget._getDataFromXML(targetModel, targetModelXPath)){
        return;
      }
      var oNode = targetModel.getData().selectSingleNode(targetModelXPath);
      if( isWrsModel && oNode != null && oNode.parentNode.nodeName != "wrs:M"){// rename to WRS modify row
        this._renameToModifiedRow(oNode, targetModel);
      }

      // Value was cleared
      if (value == null || value == "")
      {
        // In Wrs create a <null/> element and remove any text
        if(isWrsModel)
        {
          var nd = bcdui.core.createElementWithPrototype(targetModel, targetModelXPath);
          nd.text = "";
          if(nd.selectSingleNode("wrs:null") == null)
            bcdui.core.browserCompatibility.appendElementWithPrefix(nd,"wrs:null", false);
        }
        // Non-Wrs
        else{
          // If not radio, we also remove the "carrier" element of the targetXPath (for example f:Expression) even if the target node is an attribute
          if(!isRadio){
            var expressionMatcher = keepEmptyValueExpression ? null : targetModelXPath.match("(.*/f:Expression[^/]*)/@value");
            if (expressionMatcher != null && expressionMatcher.length > 1) {
              bcdui.core.removeXPath(targetModel, expressionMatcher[1]);
            } else {
              bcdui.core.removeXPath(targetModel, targetModelXPath);
            }
          }
          // For radio we keep all created nodes, just clean the value
          else{
            var node = bcdui.core.createElementWithPrototype(targetModel, targetModelXPath);
            value = bcdui.widget._maxLengthTruncate(targetModel, targetModelXPath, value);
            if (node.nodeType == 1) {
              node.text = value;
            } else {
              node.nodeValue = value;
            }
          }
        }
      }
      // The value is not empty
      else {
        var node = bcdui.core.createElementWithPrototype(targetModel, targetModelXPath);
        value = bcdui.widget._maxLengthTruncate(targetModel, targetModelXPath, value);
        if (node.nodeType == 1) {
          node.text = value;
          if (caption != null ) {node.setAttribute('caption', caption);}
        } else {
          node.nodeValue = value;
          if (caption != null ) {
            if (typeof node.ownerElement == 'undefined'){
              var modifiedXpath = targetModelXPath.substr(0, targetModelXPath.lastIndexOf ('/@'));
              var ownerElement = targetModel.getData().selectSingleNode(modifiedXpath);
              if ( ownerElement){
                ownerElement.setAttribute('caption', caption);
              }
            } else {
              node.ownerElement.setAttribute('caption', caption);
            }
          }
        }
      }
      if(cbBeforeCommit){
        cbBeforeCommit();
      }
      targetModel.fire();
      return true;
    },

    /**
     * @private
     */
    _maxLengthTruncate: function(targetModel, targetModelXPath, value){
      var nodeHeader = bcdui.widget._getWrsHeaderNode(targetModel, targetModelXPath);
      if (nodeHeader != null){
        var displaySize = nodeHeader.getAttribute("display-size");
        var type = nodeHeader.getAttribute("type-name");
        if ( type === 'VARCHAR' && displaySize != null && displaySize < value.length){
          value = value.slice(0, displaySize);
          //alert("Data execeeded maxlength, value is truncated");
        }
      }
      return value;
    },

  /**
   * Creates WRS modified row
   * @private
   */
  _renameToModifiedRow:function( /*XML Node*/originNode, /*Model*/ targetModel){
    if(originNode.parentNode.nodeName != "I" && originNode.parentNode.nodeName != "wrs:I"){
      var doc = originNode.ownerDocument;
      var newRow = bcdui.core.createElementWithPrototype(targetModel, "/wrs:Wrs/wrs:M");
      var children = originNode.parentNode.childNodes;
      for ( var i = 0; i < children.length; ++i) {
        if (children.item(i).nodeType != 1)
          continue;
        var valueElement = newRow.appendChild(children.item(i).cloneNode(true));
        var origValueNode = bcdui.core.browserCompatibility.appendElementWithPrefix(newRow,"wrs:O", false);
        if (valueElement.selectSingleNode("wrs:null") != null) {
          origValueNode.appendChild(valueElement.selectSingleNode("wrs:null").cloneNode(true));
        } else {
          origValueNode.text = valueElement.text;
        }
      }
      // take over id attribute
      if(originNode.parentNode.getAttributeNode("id") != null){
        newRow.setAttribute("id", originNode.parentNode.getAttribute("id"));
      }
      originNode.parentNode.parentNode.replaceChild(newRow, originNode.parentNode);
    }
  },

  /**
   * @private
   */
  _schema_createModalBox_args:
    {
      name: "_schema_createModalBox_args",
      properties: {
        title:                  { type: "string",  required: false },
        message:                { type: "string",  required: false },
        titleTranslate:         { type: "string",  required: false },
        messageTranslate:       { type: "string",  required: false },
        modalBoxType:           { type: "integer", required: false },
        width:                  { type: "integer", required: false },
        height:                 { type: "integer", required: false },
        position:               { type: "string",  required: false },
        htmlElementId:          { type: "string",  required: false },
        onclick:                { type: "string",  required: false }
      }
    },
  /**
  * Enumeration with modalbox types
  */
  modalBoxTypes : { ok : 0, warning: 1, error: 2, plainText: 3},

  /**
   * Open and show modalbox
   * @param {Object}        args                    The parameter map contains the following properties.
   * @param {string}        [args.title]            Modal box title. You can also use titleTranslate.
   * @param {string}        [args.titleTranslate]   It will be used as i18n key to translate the title.
   * @param {string}        [args.message]          Modal box message. You can also use messageTranslate.
   * @param {string}        [args.messageTranslate] It will be used as i18n key to translate the message.
   * @param {integer}       [args.modalBoxType=0]   One of three types modalBoxTypes.ok, modalBoxTypes.warning, modalBoxTypes.error. By default = modalBoxTypes.ok
   * @param {integer}       [args.width = 300]      Width of modal box. 300 by default
   * @param {integer}       [args.height]           Height of modal box. auto by default
   * @param {string}        [args.onclick]          Optional js function which is called after closing the modal box
   * @param {string}        [args.position]         jQuery position parameter bag. Default is center top
   * @param {string}        [args.htmlElementId]    Id of a html segment which is taken as messagebox instead. ModalBoxType is ignored in this case.
   */
  showModalBox: function(args)
    {
      args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createModalBox_args );
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createModalBox_args);

      args.modalBoxType = typeof args.modalBoxType == 'undefined' ? bcdui.widget.modalBoxTypes.ok : args.modalBoxType;

      // no auto width in case no width is given since IE has issues with absolute positioned divs without a given fixed width
      // and we do not want gigantic wide boxes when you have long texts

      args.width = typeof args.width == 'undefined' ? 300 : args.width;
      args.height = typeof args.height == 'undefined' ? "auto" : args.height;
      args.position = typeof args.position == 'undefined' ? {my: "center top", at: "center top"} : args.position;

      if(args.titleTranslate)
        args.title = bcdui.i18n.syncTranslateFormatMessage({msgid:args.titleTranslate});
      if(args.messageTranslate)
        args.message = bcdui.i18n.syncTranslateFormatMessage({msgid:args.messageTranslate});
      if (typeof args.title == 'undefined')
        args.title = '';
      if (typeof args.message == 'undefined')
        args.message = '';
      if (typeof args.onclick == 'undefined')
        args.onclick = '';
      if (typeof args.resizeable == 'undefined')
        args.resizeable = false;
      var onclick = "bcdui.widget.hideModalBox();";

      var text = "";
      if (args.modalBoxType == bcdui.widget.modalBoxTypes.plainText)
        text = args.message;
      else if (args.modalBoxType == bcdui.widget.modalBoxTypes.ok)
        text = '<div class="bcdModalMessage" ><div class="bcdSuccess"><center><b>' + args.message + '</b></center><div class="bcdButton"><a id="MB_OkButton" href="javascript:void(0)" onclick="' + onclick + '"> OK </a></div></div></div>';
      else if (args.modalBoxType == bcdui.widget.modalBoxTypes.warning)
        text = '<div class="bcdModalMessage" ><div class="bcdWarning"><center><b>' + args.message + '</b></center><div class="bcdButton"><a id="MB_WarningButton" href="javascript:void(0)" onclick="' + onclick + '"> OK </a></div></div></div>';
      else if (args.modalBoxType == bcdui.widget.modalBoxTypes.error)
        text = '<div class="bcdModalMessage" ><div class="bcdError"><center><b>' + args.message + '</b></center><div class="bcdButton"><a id="MB_ErrorButton" href="javascript:void(0)" onclick="' + onclick + '"> OK </a></div></div></div>';

      // take over either created html text or prepared html via id
      jQuery("#bcdModalBoxDiv").empty();
      jQuery("#bcdModalBoxDiv").append(typeof args.htmlElementId != "undefined" ? jQuery("#" + args.htmlElementId) : text);
      jQuery("#bcdModalBoxDiv").dialog( {
            width: args.width
          , height: args.height
          , minWidth: 50
          , minHeight: 50
          , modal: true
          , closeOnEscape: true
          , position: args.position
          , resizable: args.resizeable
          , draggable: true
          , closeText: 'x'
          , title: args.title
          , open: function() {

            // set auto width/height again since upper method does not seem to work on all browsers and jQuery seems to calculate a px value
            if (args.width == "auto") jQuery('#bcdModalBoxDiv').css('width','auto');
            if (args.height == "auto") jQuery('#bcdModalBoxDiv').css('height','auto');

            // style setup
            jQuery('.ui-widget-overlay').addClass('bcdModalBoxOverlay');
            jQuery('.ui-dialog-titlebar').addClass('bcdModalBoxTitleBar');
            jQuery('.ui-dialog-content').addClass('bcdModalBoxContent');
            jQuery('.ui-dialog').addClass('bcdModalBoxDialog');
          }
          , close: function() {

            // remove the body, needed when you handle html modal box types which created ids etc dynamically
            // and want to do this again (e.g. cube user calc editor) since the upper appendTo moves the DOM part
            jQuery("#bcdModalBoxDiv").empty();
            jQuery("#bcdAutoCompletionBox").hide();

            // run optional onclick
            if (typeof args.onclick == "function")
              args.onclick();
            else if (args.onclick != "")
              eval(args.onclick);
          }
        }
      );
    },
    /**
     * Hide opened modalbox
     */
    hideModalBox: function()
    {
      jQuery("#bcdModalBoxDiv").dialog("close");
    },

  /**
   * Creates menu with default renderer an default menu js handler.
   * @param {Object}        args                        The parameter map contains the following properties.
   * @param {targetHtmlRef} args.targetHtml             An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
   * @param {string}        [args.id]                   ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
   * @param {string}        [args.menuHandlerClassName] Javascript menu handler class name, could extend bcdui.widget.menu.Menu.
   * @param {boolean}       [args.menuRootElementId]    Root menu HTML element (UL) id
   * @param {string}        [args.modelId]              xml model id, can be used for menues defined in folder '/WEB-INF/bcdui/menu/'.
   * @param {string}        [args.modelUrl]             Optional: URL where model get data from, allows reading a random xml file from the server.
   * @param {string}        [args.parameters]           Own action handler.
   * @param {string}        [args.rendererUrl]          URL to XSLT stylesheet that renders the model.
   * 
   */
  createMenu: function(args)
    {
      args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createMenu_args );
      args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "menu_");
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createMenu_args);

        // Set default parametrs
        if(!args.menuHandlerClassName ||args.menuHandlerClassName == ""){
            args.menuHandlerClassName = "bcdui.widget.menu.Menu";
        }
        if(!args.modelUrl ||args.modelUrl == ""){
            args.modelUrl = bcdui.contextPath+"/bcdui/servlets/Menu";
        }

        var _modelIdOrModelRef = (typeof args.modelId != "undefined" && args.modelId != null) ? args.modelId : bcdui.factory.createModel({url:args.modelUrl});
        var actualIdPrefix = typeof args.id == "undefined" || args.id == null ? bcdui.factory.objectRegistry.generateTemporaryIdInScope("menu_") : args.id;
        var _rendererUrl = (typeof args.rendererUrl != "undefined" && args.rendererUrl != null && args.rendererUrl != "") ? args.rendererUrl : "/bcdui/js/widget/menu/menu.xslt";
        var menuRootElementId = (actualIdPrefix + "RendererMenuRoot");

        var _rendererRefId = "bcdRenderer_" + actualIdPrefix;
        var _menuHandlerClassName = (typeof args.menuHandlerClassName != "undefined" && args.menuHandlerClassName != null)? args.menuHandlerClassName : "bcdui.widget.menu.Menu";
        var _menuRootElementId = (args.menuRootElementId)?args.menuRootElementId:menuRootElementId;
        var _menuHandlerVarName = (args.id) ? args.id : _rendererRefId + "MenuHandler";

        if (!args.parameters) {
          args.parameters = {};
        }
        args.parameters.contextPath=bcdui.contextPath;
        args.parameters.rootElementId=menuRootElementId;
        
        // provide the cleaned current location to the renderer to path-find and highlight the currently used menu item
        // it automatically includes the url parameter bcdPageId in the comparism
        // renderer attribute "bcdPageId" can be used to overwrite the default value of "bcdPageId"
        var loc = window.location.href.substring(window.location.href.indexOf(bcdui.contextPath) + bcdui.contextPath.length);
        var cleanLoc = loc.indexOf("?") != -1 ? loc.substring(0, loc.indexOf("?")) : loc;
        
        var tokenName = args.parameters.bcdPageId || "bcdPageId";
        var bcdPageIdParam = "";
        var paramPos = loc.indexOf(tokenName + "=")
        if (paramPos > 0 && (loc[paramPos - 1] == "&" || loc[paramPos - 1] == "?")) {
          bcdPageIdParam = loc.substring(paramPos);
          var endPos = bcdPageIdParam.indexOf("&");
          bcdPageIdParam = bcdPageIdParam.substring(0, endPos < 0 ? bcdPageIdParam.length : endPos);
        }
        args.parameters.location = cleanLoc;
        args.parameters.bcdPageIdParam = bcdPageIdParam;

        var _rendererOrRendererRefId = bcdui.factory.createRenderer({
          id: _rendererRefId
          ,url: bcdui.util.url.resolveToFullURLPathWithCurrentURL(_rendererUrl)
          ,inputModel: _modelIdOrModelRef
          ,parameters: args.parameters
          ,targetHTMLElementId: args.targetHTMLElementId
        });

        // show the menu (which should be initially hidden)
        bcdui.factory.objectRegistry.withReadyObjects(_rendererOrRendererRefId, function(optionsModelId) {

          bcdui.log.isTraceEnabled() && bcdui.log.trace('call TransformedStatus listener on: ' + _rendererRefId);
          var strVal =_menuHandlerVarName + " = new "+_menuHandlerClassName + "({name:'" + _menuHandlerVarName+"'"
          +", customConfigFunction:function configMenu(){this.closeDelayTime = 300;}"
          +",rootIdOrElement:'"+_menuRootElementId+"'});";

          bcdui.log.isTraceEnabled() && bcdui.log.trace(strVal);
          eval(strVal);

          if (bcdui._migPjs._$(args.targetHTMLElementId).children().length > 0)
            bcdui._migPjs._$(args.targetHTMLElementId).children()[0].style.display="block";
        });
    },

    /**
     * extracts unique model names from modelXPath, including $ tokens
     *
     * @return Array with models or null
     * @private
     */
    _extractModelsFromModelXPath : function(modelXPath){
      var models = modelXPath.match(/[$][a-zA-Z_]{1}[a-zA-Z0-9_]*/g);
      return models ? models.reduce(function(a, b) { if(a.indexOf(b)===-1) a.push(b); return a; }, []) : null;
    },

    /**
     * @param models : an array of unique model names with $ tokens, i.e [$guiStatus,$referenceModel]
     * @param config is an array of:
     *   optionsModelId
     *   optionsModelXPath
     *   optionsModelRelativeValueXPath
     *   element
     * @param extraConstantParams{Object} a map of extra constant params to pass to the transformation
     * @private
     */
    _createWrapperModel: function(models, config, wrapperModel, extraConstantParams){
      var dependencyWrapperId = bcdui.factory.objectRegistry.generateTemporaryId();
      var modelsMap = new Object();
      var oldPath = config.optionsModelXPath;
      var i;
      for(i = 0; i < models.length; i++){
        var modelPaths = modelsMap[models[i]];
        if(!modelPaths){
          modelPaths = new Array();
          modelsMap[models[i]] = modelPaths;
        }
        bcdui.widget._extractXPathForModel(oldPath, models[i], modelPaths);
        // ensure uniqueness of model paths
        modelsMap[models[i]] = modelPaths.reduce(function(a, b) { if(a.indexOf(b)===-1) a.push(b); return a; }, []);
      }

        var dataP = new Array();
        var tmp = "";
      // Let's make sure, whenever the input model changes, our combining wrapper changes as well
      bcdui.factory.addDataListener({
          idRef: config.optionsModelId,
          listener: function() {
            dW = bcdui.factory.objectRegistry.getObject(dependencyWrapperId);
            if( dW && dW.getStatus()==dW.getReadyStatus())
              dW.execute(true);
          }
        });
      // Let's also listen on each change for additional models (for the right tracking XPath)
      // We loop over the distinct model (keys)...
      Object.keys(modelsMap).forEach(function(prop) {
          if(i > 0){
            tmp += " ";
          }
        tmp += prop; // each model will become a dataprovider of the wrapper we are building
          var modelId = prop.substring(1, prop.length);
          var model =bcdui.factory.objectRegistry.getObject(modelId);
        // ... creating a listener for each trackingXpath of this model
          modelsMap[prop].forEach(function(p){
            bcdui.factory.addDataListener({
              idRef: modelId,
              trackingXPath: p,
              listener: function() {
              dW = bcdui.factory.objectRegistry.getObject(dependencyWrapperId);
              if( dW && dW.getStatus()==dW.getReadyStatus())
                dW.execute(true);
              }
            });
          });
          dataP.push(model);
      });
      tmp = tmp.trim();
      var modelsString  = new bcdui.core.ConstantDataProvider({name:"models", value:tmp});
      var pathString  = new bcdui.core.ConstantDataProvider({name:"valuesPath", value:config.optionsModelXPath});

      //
      if(!config.optionsModelRelativeValueXPath || !config.optionsModelRelativeValueXPath.trim()){
        if(config.optionsModelXPath.match(/@[a-zA-Z0-9_]+$/)){
          config.optionsModelRelativeValueXPath = "parent::*";
          config.element.setAttribute("bcdOptionsModelRelativeValueXPath",config.optionsModelRelativeValueXPath);
        }
        else{
          config.optionsModelRelativeValueXPath = ".";
          config.element.setAttribute("bcdOptionsModelRelativeValueXPath",config.optionsModelRelativeValueXPath);
        }
      }
      var optionsModelsString  = new bcdui.core.ConstantDataProvider({name:"optionsModelRelativeValueXPath", value:config.optionsModelRelativeValueXPath});

      if(extraConstantParams){
        for(var key in extraConstantParams){
          dataP.push(new bcdui.core.ConstantDataProvider({name:key, value:extraConstantParams[key]}));
        }
      }

      //

      dataP.push(modelsString);
      dataP.push(pathString);
      dataP.push(optionsModelsString);
      bcdui.factory.objectRegistry.withReadyObjects( config.optionsModelId, function(optionsModelId) {
          dataP.push(bcdui.factory.objectRegistry.getObject(optionsModelId));
          dataP.reverse(); // make sure the object added above becomes the primary model (at pos 0)
       var dependencyWrapper = new bcdui.core.TransformationChain({
       id:dependencyWrapperId,
            chain: bcdui.config.jsLibPath + wrapperModel,
            dataProviders: dataP
       });
      }.bind(undefined,config.optionsModelId) );
      config.optionsModelId = dependencyWrapperId;
      config.optionsModelXPath = "//Values/Value/@caption";
      config.element.setAttribute("bcdOptionsModelId", dependencyWrapperId);
      config.element.setAttribute("bcdOptionsModelXPath", "//Values/Value/@caption");
      config.optionsModelRelativeValueXPath = "parent::*";
      config.element.setAttribute("bcdOptionsModelRelativeValueXPath",config.optionsModelRelativeValueXPath);
      return dependencyWrapperId;
   },

  /**
   * @private
   */
   _extractXPathForModel: function(wholePath, model, modelPaths){
        if(wholePath){
          var index = wholePath.indexOf(model);
          if(index > 0){
            var restString = wholePath.substring(index + model.length);
            var openedBracket = 0;
            for(var i = 0; i < restString.length; i++){
              var c = restString.charAt(i);
              if(c == ']'){
                if(openedBracket > 0){
                  openedBracket--;
                }
                else{
                var foundPath = restString.substring(0, i);
                modelPaths.push(foundPath.trim());
                  bcdui.widget._extractXPathForModel(restString, model, modelPaths);
                  break;
                }
              }else if(c == '['){
                openedBracket++;
              }
              else if(openedBracket == 0 && c.match(/\t|\s|\r|\+|,|-|=|<|>|\!|\)/)){
                 var foundPath = restString.substring(0, i);
                 modelPaths.push(foundPath);
                   bcdui.widget._extractXPathForModel(restString, model, modelPaths);
                   break;
              }
            }
          }
        }
      },

   /**
    * @private
    */
   _getValueOfCaption: function(/* String */ htmlElementId, /* String */ caption)
     {
       if (typeof caption == "undefined" || caption == null || !caption.trim()) return "";

       var htmlElement = document.getElementById(htmlElementId);
       var optionsModelId = htmlElement.getAttribute("bcdOptionsModelId");
       var optionsModelXPath = htmlElement.getAttribute("bcdOptionsModelXPath");
       var optionsModelRelativeValueXPath = htmlElement.getAttribute("bcdOptionsModelRelativeValueXPath");

       if (optionsModelId == null || !optionsModelId.trim() ||
               optionsModelXPath == null || !optionsModelXPath.trim() ||
               optionsModelRelativeValueXPath == null || !optionsModelRelativeValueXPath.trim())
             return caption;
       var v = caption.replace(/\"/g,"");
       var xPath = optionsModelXPath + "[normalize-space(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\"', 'abcdefghijklmnopqrstuvwxyz')) = normalize-space(translate(\"" + v + "\", 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'))]/" + optionsModelRelativeValueXPath;
       var optionsModel = bcdui.factory.objectRegistry.getObject(optionsModelId);
       var result = bcdui.widget._getDataFromXML(optionsModel, xPath);
       return result;
     },

     /**
      * @private
      * @return an 2dim array containining caption/value array or NULL if no caption mapping available (i.e. values=caption), the array is of items with size 2
      */
     _getCaptionValueArray: function(/* String */ htmlElementId)
     {
       var htmlElement = document.getElementById(htmlElementId);
       var optionsModelId = htmlElement.getAttribute("bcdOptionsModelId");
       var optionsModelXPath = htmlElement.getAttribute("bcdOptionsModelXPath");
       var optionsModelRelativeValueXPath = htmlElement.getAttribute("bcdOptionsModelRelativeValueXPath");

       if (optionsModelId == null || !optionsModelId.trim() ||
           optionsModelXPath == null || !optionsModelXPath.trim() ||
           optionsModelRelativeValueXPath == null || !optionsModelRelativeValueXPath.trim())
         return null;
       var valueXPath = optionsModelXPath + "/" + optionsModelRelativeValueXPath;
       var optionsModel = bcdui.factory.objectRegistry.getObject(optionsModelId);

       var valueArr = jQuery.makeArray(optionsModel.getData().selectNodes(valueXPath)).map(function(e) { return e.nodeValue || e.text; });
       var ppp=0;
       return jQuery.makeArray(optionsModel.getData().selectNodes(optionsModelXPath)).map(function(e) { return [e.nodeValue || e.text, valueArr[ppp++]]; });
     },

   /**
    * @private
    */
   _getCaptionOfValue: function(/* String */ htmlElementId, /* String */ value)
     {
       if (typeof value == "undefined" || value == null || !value.trim()) return "";

       var htmlElement = document.getElementById(htmlElementId);
       var optionsModelId = htmlElement.getAttribute("bcdOptionsModelId");
       var optionsModelXPath = htmlElement.getAttribute("bcdOptionsModelXPath");
       var optionsModelRelativeValueXPath = htmlElement.getAttribute("bcdOptionsModelRelativeValueXPath");

       if (optionsModelId == null || !optionsModelId.trim() ||
           optionsModelXPath == null || !optionsModelXPath.trim() ||
           optionsModelRelativeValueXPath == null || !optionsModelRelativeValueXPath.trim())
         return value;

       var optionsModel = bcdui.factory.objectRegistry.getObject(optionsModelId);
       var xPath = optionsModelXPath + "[" + optionsModelRelativeValueXPath + " = \"" + value + "\"]";
       var result = bcdui.widget._getDataFromXML(optionsModel, xPath);
       return result;
     },

     /**
      * @private
      * @return String The input-value if found in optsionModel or if no options model is given (==all values allowed), otherwise an empty string
      */
     _findValueInOptionsModel: function(/* String */ htmlElementId, /* String */ value)
     {
       if (typeof value == "undefined" || value == null || !value.trim()) return "";

       var htmlElement = document.getElementById(htmlElementId);
       var optionsModelId = htmlElement.getAttribute("bcdOptionsModelId");
       var optionsModelXPath = htmlElement.getAttribute("bcdOptionsModelXPath");
       var optionsModelRelativeValueXPath = htmlElement.getAttribute("bcdOptionsModelRelativeValueXPath");

       if (optionsModelId == null || !optionsModelId.trim() ||
           optionsModelXPath == null || !optionsModelXPath.trim())
         return value;

       var optionsModel = bcdui.factory.objectRegistry.getObject(optionsModelId);
       var xPath = optionsModelXPath;
       if(optionsModelRelativeValueXPath) {
         // If caption is an attribute (i.e. xPath end with an attribute) and value first searches its parent (i.e. the owning element), we translate this because in some browsers @a/../*[t='b'] fails
         // TODO this does not work if the attribute is followed by a predicate
         var m = xPath.match(/.*(@\w+)$/);
         if( m && optionsModelRelativeValueXPath.startsWith("..") ) {
           xPath = xPath.substring(0,xPath.length-(m[1].length+1)); // Remove attribute and the preceding /, resulting in the owning element
           xPath += optionsModelRelativeValueXPath.substring(2);    // add the part behind .. (if any)
         } else
           xPath += "/"+optionsModelRelativeValueXPath;
       }
       xPath += "[. = \"" + value + "\"]";
       var node = optionsModel.getData().selectSingleNode(xPath);
       if( node!= null )
         return value;
       return "";
     },

   /**
    * Creates tab menu widget.
    * @param {Object}        args                       The parameter map contains the following properties.
    * @param {targetHtmlRef} args.targetHtml            An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
    * @param {string}        defElementId               Html element id where tabs are defined.
    * @param {string}        [args.id]                  ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
    * @param {string}        [args.handlerJsClassName]  own JS class name to handler click action on tab
    * @param {string}        [args.rendererUrl]         URL to own renderer
    */
   createTabMenu:function(args)
     {
       args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createTabMenu_args );
       args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "tab_");
       bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createTabMenu_args);

       if (!args.id) {
         args.id = bcdui.factory.objectRegistry.generateTemporaryIdInScope("tab_");
         if (args.id == "tab_") {
           args.id += "0";
         }
       }
       var defElement = document.getElementById(args.defElementId);
       if (defElement) {
         bcdui._migPjs._$(defElement).addClass("bcdTabDefinition");
       }
       args.idOrElement = args.defElementId;
       bcdui.widget.tab.init(args);
     },

   /**
    * Creates a BlindUpDown Area.
    * @param {Object}        args                         The parameter map contains the following properties.
    * @param {targetHtmlRef} args.targetHtml              An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
    * @param {string}        [args.id]                    ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
    * @param {string}        [args.caption]               Caption shown in the blindUpDown Header.
    * @param {string}        [args.defaultState=closed]   'closed' or empty String for opened, default is closed.
    * @param {number}        [args.duration=0.2]          The duration of the blind effect, valid values are from 0 to 1.0 as decimal.
    * @param {writableModelXPath} [args.targetModelXPath=$guiStatus/guiStatus:Status/guiStatus:ClientSettings/BlindUpDown]  The xPath pointing to the root-node this input widget will place entered selected items into. with attribute status=open/closed
    * @param {boolean}       [args.noEffect=false]        True for a simple show/hide without blind effect (blind can influence charts gradients on IE
    */
   createBlindUpDownArea:function(args){
     args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createBlindUpDownArea_args );

     // If we do not have bodyIdOrElement given, then targetHtml takes this role and we prepend a div for the open/close bar
     // Otherwise args.targetHtml is the header and args.bodyIdOrElement is the body. Providing args.bodyIdOrElement is allowed for backward compatibility
     if( ! args.bodyIdOrElement ) {
       args.bodyIdOrElement = args.targetHtml;
       args.targetHtml = jQuery('<div></div>');
       jQuery(bcdui._migPjs._$(args.bodyIdOrElement)).before(args.targetHtml);
     }

     args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "blindUpDown_");
     bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createBlindUpDownArea_args);

      //Set default parameters
      if(!args.caption || args.caption == ""){
         args.caption = "Blind content";
      }
      if(!args.defaultState || args.defaultState == ""){
         args.defaultState = "closed";
      }

      var actualId;
      if (args.id) {
        actualId = args.id;
      } else {
        actualId = bcdui.factory.objectRegistry.generateTemporaryIdInScope("blindUpDown_");
        if (actualId == "blindUpDown_") {
          actualId += "0";
        }
      }
      var root = jQuery("<span id='" + actualId + "'></span>").addClass('bcdBlindUpDown');

      args.targetModelXPath = args.targetModelXPath || "$guiStatus/*/guiStatus:ClientSettings/BlindUpDown[@id='"+ (actualId + "_bcduiBlindBody") +"']";
      var targetModelParams = bcdui.factory._extractXPathAndModelId(args.targetModelXPath);

      jQuery(bcdui._migPjs._$(args.targetHTMLElementId)).css("min-width", jQuery(bcdui._migPjs._$(args.bodyIdOrElement)).width() + "px");
      bcdui._migPjs._$(args.targetHTMLElementId).append(root);

      var state = null;
      if(args.defaultState && args.defaultState == "closed") {
        state = args.defaultState;
      }

      bcdui.factory.objectRegistry.withReadyObjects({
        ids: targetModelParams.modelId,
        fn:function(){
          var stateNd = bcdui.factory.objectRegistry.getObject(targetModelParams.modelId).getData().selectSingleNode(targetModelParams.xPath);
          if(stateNd){
            state = stateNd.text;
          }

          var ul = jQuery('<ul class="bcdBlindUpDown"></ul>');
          var liCaption = jQuery("<li id='" + (actualId + "_bcduiBlindHead") + "'>" + args.caption + "</li>").addClass('bcdBlindUpDownHead' + (state=='closed'?' bcdHeadClosed':' bcdHeadOpened'));
          liCaption.attr("bcdTranslate", args.caption);

          var liClose = jQuery("<span id='" + (actualId + "_bcduiBlindHeadClose") + "'></span>").addClass("bcdBlindUpDownClose");
          liCaption.append(liClose);

          ul.append(liCaption);

          ul.css({display:'none'});
          bcdui.i18n.translateHTMLElement({elementOrId:ul.get(0), display:''});

          var liBody = jQuery("<li id='" + (actualId + "_bcduiBlindBody") + "'></li>").addClass("bcdBlindUpDownBody");
          liBody.css({// workaround for IE Bug: disappear graphs in body
            zoom:1
          });

          bcdui._migPjs._$(args.bodyIdOrElement).css({display:"inline"});
          liBody.append(bcdui._migPjs._$(args.bodyIdOrElement));
          ul.append(liBody);
          root.append(ul);
          
          bcdui.factory.objectRegistry.getObject(targetModelParams.modelId).onChange({
              trackingXPath: targetModelParams.xPath
            , callback: function() {
              bcdui.widget.effects._syncBlindUpDown({noEffect:args.noEffect, idOrElement:actualId, duration:args.duration, targetModelId: targetModelParams.modelId, targetModelXPath: targetModelParams.xPath});
            } 
          });

          liCaption.on("click", function(){
            bcdui.widget.effects.blindUpDown({noEffect:args.noEffect, idOrElement:actualId, duration:args.duration, targetModelId: targetModelParams.modelId, targetModelXPath: targetModelParams.xPath});
          });

          if(state=='closed'){
            bcdui.widget.effects.blindUpDown({noEffect:args.noEffect, idOrElement:actualId, duration:0.01, targetModelId: targetModelParams.modelId, targetModelXPath: targetModelParams.xPath});
          }
        }.bind(this)
       });
    },

  /**
   * @private
   */
  _computeRowAndColIdents: function(/* HTMLElement */ baseElement)
    {
      var result = {
            bcdRowIdent: null
          , bcdColIdent: null
          , colIndex: -1
      };

      var ese = bcdui._migPjs._$(baseElement);

      // We determine bcdRowIdent
      var row = ese.prop("tagName") == "TR" ? ese : ese.closest("tr");
      if (row != null)
        result.bcdRowIdent = row.attr("bcdRowIdent");
      else
        return result; // in case we dont have a row

      var td = (ese.prop("tagName") == "TD" || ese.prop("tagName") == "TH") ? ese : ese.closest("td, th");

      // in case we dont have a cell
      if(!td.length > 0){
        return result;
      }

      // in case we're a header element, we can simply take over the bcdColIdent attribute
      if (td.get(0).parentNode.parentNode.nodeName == "THEAD") {
        result.bcdColIdent = td.attr("bcdColIdent");
        return result;
      }

      // Here we determine bcdColIdent
      // The TD elements can be spanned so we cannot use the "cellIndex" property.
      // Instead we have to sum up the colSpans.
      result.colIndex = td.prevAll("*").toArray().reduce(
          function(sumValue, value) { return sumValue + (value.colSpan || 1); }, 1);

      // In addition due to row-span, cells may be need to be added from a previous row
      // We do this here only limitted, assuming only rowspans at the beginning (before our cell)
      // TODO not test for row!= null here
      result.colIndex += jQuery(row).prevAll("*").toArray().reduce(function(sumValue, value) {
        var forThisRow = jQuery(value).find("th").toArray().reduce(function(rowSumValue, rowTh) {
            return (rowTh.rowSpan || 1) > (row.prop("rowIndex")-value.rowIndex) ? rowSumValue+1 : rowSumValue; }, 0);
        return sumValue + forThisRow;
      }, 0);

      // We assume there is at least one thead/tr/th in any of the rows of the header, which starts at the same
      // position as the td for which we search bcdColIdent and we only accept those having span=1 to skip spanning columns
      var tiles = new Array(); // Holds an array where spanning th 'block' a rectangular
      var headerRows = td.closest("table").find("thead > tr");
      for( var hr=0; hr<headerRows.length; hr++ ) {
        var ths = jQuery(headerRows[hr]).find("th");
        var startPos = 1;
        for( var th=0; startPos<=result.colIndex && th<ths.length; th++ ) {
          while( tiles[hr] && tiles[hr][startPos] )
            startPos++; // the current pos may be blocked by a col or row span already
          if( startPos==result.colIndex && (ths[th].colSpan||1)==1 && jQuery(ths[th]).attr("bcdColIdent") ) {
            result.bcdColIdent = jQuery(ths[th]).attr("bcdColIdent");
            return result;
          }
          // Lets block in this row and the following any position we cover via col/row span
          for( var tc=0; tc<(ths[th].colSpan||1); tc++ )
            for( var tr=0; tr<(ths[th].rowSpan||1); tr++ ) {
              if( !tiles[hr+tr] ) tiles[hr+tr] = new Array();
              tiles[hr+tr][startPos+tc] = "x";
            }
        }
      }
      return result;
    },

  /**
   * Use createTooltip in most cases instead of this function
   * Attaches one renderer (tooltipRenderer) to another renderer (targetRenderer) so that
   * it displays tooltips for it. Therefore it adds an HTML listener to the content div of
   * the targetRenderer and tracks if the user moves the mouse inside of it. Then it
   * (re-)executes the tooltipRenderer, positions its contentDiv below the respective HTML
   * element and makes the contentDiv visible. It also hides the contentDiv of the
   * tooltipRenderer if no tooltip is shown (the rendering result is blank) or the area
   * of the targetRenderer's contentDiv is left.
   *
   * @param args The parameter map contains the following properties:
   *    <ul>
   *      <li>tooltipRendererId: {String|DataProvider} The renderer responsible
   *          for generating the tooltip content. When the "tableMode" parameter
   *          is true this renderer will get two additional parameters "bcdRowIdent"
   *          and "bcdColIdent". These parameters come from the table cell the mouse
   *          is placed over in the targetRenderer.</li>
   *      <li>targetHtmlElement: {HtmlElement} The HtmlElement we are attached to.</li>
   *      <li>filter: {String?} An optional filter on the tag name where the
   *          tooltip should appear. In "tableMode" it is recommended to set it
   *          on "td" or "th|td".</li>
   *      <li>tableMode: {Boolean?} This flag can be set to "true" if the "bcdRowIdent"
   *          and "bcdColIdent" parameters should be extracted from the HTML and added
   *          as parameters on the tooltipRenderer.</li>
   *      <li>delay: {Integer?} The delay in Miliseconds that the tooltip should wait
   *          before it appears.</li>
   *    </ul>
   * @private
   */
  _attachTooltipRenderer: function(args)
    {
      var isVisible = false;

      var config = {
      baseElement: args.targetHtmlElement
        , htmlElement: bcdui._migPjs._$(bcdui.factory.objectRegistry.getObject(args.tooltipRendererId).targetHTMLElementId).get(0)
        , rendererId: args.tooltipRendererId
        , event: null
      };

      bcdui._migPjs._$(config.baseElement).on("mousedown", function() {
        config.htmlElement.style.display = "none";
        config.event = null;
      });

      var reDisplay = bcdui.factory.reDisplay.bind(undefined,{
        idRef: config.rendererId,
        fn: bcdui.widget._flyOverPositioning.bind(undefined,config)
      });

      var mouseTracker =
        new bcdui.widget.MouseTracker({
            baseElement: config.baseElement
          , delay: args.delay
          , onEnter: function(e) {
              // We do not want get into conflict with the context menu
              if( jQuery("#bcdContextMenuDiv").is(":visible") ) {
                isVisible = false;
                return;
              }
              config.event = e;
              var renderer = bcdui.factory.objectRegistry.getObject(args.tooltipRendererId);
              if (args.tableMode)
                bcdui.widget._setIdents(e, renderer);
              else if ( args.identsWithin ) {
                bcdui.wkModels.bcdRowIdent.setData( bcdui.widget._findAttribute( e.target, "bcdRowIdent", bcdui._migPjs._$(args.identsWithin).get(0) ) || "" );
                bcdui.wkModels.bcdColIdent.setData( bcdui.widget._findAttribute( e.target, "bcdColIdent", bcdui._migPjs._$(args.identsWithin).get(0) ) || "" );
              }
              isVisible = true;
              reDisplay();
            }
          , onLeave: function() {
              if(!isVisible)
                return;
              isVisible = false;
              bcdui._migPjs._$(config.htmlElement).hide();
              config.event = null;
            }
          , onMove: function(e) {
              // In praxis the test for isVisible is not enough, probably a timing issue
              if(!isVisible || jQuery("#bcdContextMenuDiv").is(":visible") )
                return;
              config.event = e;
              bcdui.widget._flyOverPositioning(config);
            }
          , filter: args.filter
        });
      mouseTracker.start();
    },

  /**
   * Finds the inner most occurance of an attribute
   * starting at the startElement following its anchestor axis to maximal endElement
   * @return value of the attribute, null if attribute was not found
   * @private
   */
  _findAttribute: function(/* HTMLElement */ startElement, /* String */ attrName, /* HTMLElement */ endElement)
    {
      var _endElement = endElement || null;
      while (startElement != null) {
        var attr = startElement.getAttribute(attrName);
        if (attr != null) return attr;
        if (startElement == _endElement) return null;
        startElement = startElement.parentNode;
      }
      return null;
    },

  /**
   * Use createContextMenu in most cases instead of this function
   * Attaches a context menu renderer to a target renderer. This function is similar
   * to the attachTooltipRenderer function, but it is triggered with onClick and it
   * provides the contextId parameter to the stylesheet.
   * @param args The parameter map contains the following properties:
   *    <ul>
   *      <li>contextMenuRendererId: {String|DataProvider} The renderer responsible
   *          for generating the context menu. Usually the HTML rendering is done
   *          by the default contextMenu.xslt stylesheet.</li>
   *      <li>targetHtmlElement: {String|DataProvider} The renderer the context menu is to be attached to. (or give targetRendererId)</li>
   *      <li>tableMode: {Boolean?} This flag can be set to "true" if the "bcdRowIdent"
   *          and "bcdColIdent" parameters should be extracted from the HTML.</li>
   *    </ul>
   * @private
   */
  _attachContextMenu: function(args)
    {
      var config = {
          baseElement: args.targetHtmlElement // We listen on this
        , htmlElement: bcdui._migPjs._$(bcdui.factory.objectRegistry.getObject(args.contextMenuRendererId).targetHTMLElementId).get(0) // We show us in this
            , rendererId: args.contextMenuRendererId
            , event: null
            , positionUnderMouse: true
      };

      var reDisplay = bcdui.factory.reDisplay.bind(undefined,{
          idRef: config.rendererId,
          fn: function(){
            bcdui.widget._flyOverPositioning(config);
            if(bcdui._migPjs._$(config.htmlElement).length > 0){
              var elem = bcdui._migPjs._$(config.htmlElement);
              var timeOutId = null;
              if(elem.attr("timeOutId") != ""){
                clearTimeout(elem.attr("timeOutId"));
                elem.attr("timeOutId","");
              }

              timeOutId = setTimeout( function(){
                clearTimeout(elem.attr("timeOutId"));
                elem.attr("timeOutId","");

                bcdui._migPjs._$(config.htmlElement).hide();
              }, (args.duration ? args.duration : 2000));

              elem.attr("timeOutId", timeOutId);

              elem.on("mouseover", function(event){
                  if(elem.attr("timeOutId") != "" ){
                    clearTimeout(elem.attr("timeOutId"));
                    elem.attr("timeOutId","");
                  }
                }
              );
            }
          }
        });

      var handler = function(event) {
        config.event = new bcdui.widget.DetachedEvent(event, null, config.baseElement);
        var renderer = bcdui.factory.objectRegistry.getObject(config.rendererId);
        if (args.tableMode){
          // In table mode we extract info from the cell's position. This test makes sure that we really clicked inside hte monitored element
          if(! jQuery.contains(args.targetHtmlElement, config.event.target))
            return;
          bcdui.widget._setIdents(config.event, renderer, config.htmlElement);
        }
        else if ( args.identsWithin ) {
          bcdui.wkModels.bcdRowIdent.setData( bcdui.widget._findAttribute( config.event.target, "bcdRowIdent", bcdui._migPjs._$(args.identsWithin).get(0) ) || "" );
          bcdui.wkModels.bcdColIdent.setData( bcdui.widget._findAttribute( config.event.target, "bcdColIdent", bcdui._migPjs._$(args.identsWithin).get(0) ) || "" );
        }

        if (args.refreshMenuModel){
          renderer.getPrimaryModel().execute();
        }
        renderer.addDataProvider(new bcdui.core.ConstantDataProvider({
          name: "contextId",
          value: config.event.findAttribute("contextId") || ""
        }));

        var id = bcdui._migPjs._$(config.event.target).get(0).id || bcdui.factory.objectRegistry.generateTemporaryId();
        bcdui._migPjs._$(config.event.target).get(0).id = id;

        bcdui._migPjs._$(config.htmlElement).attr("bcdEventSourceElementId", id);
        // Context menu wins over tooltip.
        jQuery("#bcdTooltipDiv").hide();
        reDisplay();
      };

      bcdui._migPjs._$(config.baseElement).on("contextmenu", function(event) {
        event.stopPropagation();
        event.preventDefault();
        handler(event);
        if (bcdui.browserCompatibility.isIE)
          return false;
      });
      // This code is useful when you want to trigger the context menu
      // programmatically. Since it is not possible to generate a "contextmenu"
      // event we need a custom "bcd:contextmenu" event which can be generated
      // by the prototype.js function Event.fire.
      bcdui._migPjs._$(config.baseElement).on("bcd:contextmenu", function(event) {
        event.stopPropagation();
        event.preventDefault();
        handler(event);
      });
    },

  /**
   * Create an instance of dynamic context menu. Consider setting args.refreshMenuModel to true.
   * If 'tableMode' is set to 'true' the renderer is expected to render an HTML table with the
   * appropriate 'bcdRowIdent/bcdColIdent' attributes of tr rows header columns.
   *
   * @param {Object}         args                     The parameter map contains the following properties.
   * @param {bcdui.core.DataProvider} args.inputModel A model with context menu definition according to namespace http://www.businesscode.de/schema/bcdui/contextMenu-1.0.0
   * @param {string}         [args.targetRendererId]  The renderer the tooltip is attached to. The HTML listeners are placed on the targetHtml of this renderer.
   * @param {string}         [args.id]                ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
   * @param {boolean}        [args.refreshMenuModel=false]  This flag can be set to 'true' if the menu model needs to be executed always. Needs to be true, if the menu depends on the position in a table, i.e. technically on bcdColIdent and bcdRowIdent.
   * @param {string}         [args.url]               This parameter can be set when you only want to apply one single XSLT style sheet. It contains the URL pointing to it. If this parameter is set no nested 'chain' tag must be provided; provided XSLT must produce HTML.
   * @param {string}         [args.identsWithin]      Id of an element. If given bcdColIdent and bcdRowIdent are set to the innermost values given between the event source and the element given here. bcdRow/ColIdent do not need to be set at the same element.
   * @param {boolean}        [args.tableMode=false]   This flag can be set to 'true' if the 'bcdRowIdent' and 'bcdColIdent' parameters should be extracted from the HTML and added as parameters on the tooltipRenderer. They are derived from 'bcdRowIdent' and 'bcdColIdent' attributes of tr rows and header columns (td or th).
   * @param {targetHtmlRef}  [args.targetHtml]        The HTML listeners are placed on this Element instead of the targetHtml of the given targetRendererId.
   */
  createContextMenu: function(args){

    args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createContextMenu_args );
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createContextMenu_args);

    if (args.targetHtml) {
      var targetId = bcdui.util._getTargetHtml({targetHtml: args.targetHtml}, "bcdContextMenu_");
      args.targetHtmlElement = jQuery("#" + targetId);
    }
    
    // Set default parametrs
    if(!args.tableMode ||args.tableMode == ""){
      args.tableMode = false;
    }
    if(!args.refreshMenuModel ||args.refreshMenuModel == ""){
      args.refreshMenuModel = false;
    }
    args.id = args.id ? args.id : bcdui.factory.objectRegistry.generateTemporaryIdInScope("contextMenu_"+(args.targetRendererId?args.targetRendererId:""));
    bcdui.log.isTraceEnabled() && bcdui.log.trace("Creating contextMenu "+args.id);

    bcdui.widget.contextMenu._createContextMenuDiv();

    // In case no input model is give, the first data provider is used as instead. But in our case that would be bcdRowIdent, which is not a valid model
    // So we make sure that we add the guiStatus instead
    args.dataProviders = args.dataProviders || (!!args.inputModel ? [] : [bcdui.wkModels.guiStatus]);
    args.dataProviders.push(bcdui.wkModels.bcdRowIdent);
    args.dataProviders.push(bcdui.wkModels.bcdColIdent);

    // Renderer of the context menu itself
    bcdui.factory.createRenderer({
        id                 : args.id
      , targetHTMLElementId: "bcdContextMenuDiv"
      , chain              : args.chain
      , url                : (args.url ? args.url : (args.chain ? null : bcdui.contextPath+"/bcdui/js/widget/contextMenu/contextMenu.xslt") )
      , inputModel         : args.inputModel
      , dataProviders      : args.dataProviders
      , parameters         : args.parameters
    });

    bcdui.factory.objectRegistry.withReadyObjects({
      ids: [ args.id, args.targetRendererId ],
      fn: function() {
        bcdui.widget._attachContextMenu({
            contextMenuRendererId: args.id
          , targetHtmlElement    : bcdui._migPjs._$(args.targetHtmlElement).length > 0 ? bcdui._migPjs._$(args.targetHtmlElement).get(0) : bcdui._migPjs._$(bcdui.factory.objectRegistry.getObject(args.targetRendererId).targetHTMLElementId).get(0)
          , tableMode            : args.tableMode
          , identsWithin         : args.identsWithin
          , refreshMenuModel     : args.refreshMenuModel
        });
      }
    });

    return bcdui.factory._generateSymbolicLink(args);
  },

  /**
   * Generates a tooltip for another renderer. 
   * @param {Object}         args                       The parameter map contains the following properties.
   * @param {string}         [args.targetRendererId]    The renderer the tooltip is attached to. The HTML listeners are placed on the targetHtml of this renderer. If 'tableMode' is set to 'true' the renderer is expected to render an HTML table with the appropriate 'bcdRowIdent/bcdColIdent' attributes of tr rows header columns.
   * @param {string}         [args.id]                  ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
   * @param {integer}        [args.delay]               The delay in Miliseconds that the tooltip should wait before it appears.
   * @param {string}         [args.filter]              An optional filter on the tag name where the tooltip should appear. In 'tableMode' it is recommended to set it on 'td' or 'th|td'.
   * @param {string}         [args.identsWithin]        Id of an element. If given bcdColIdent and bcdRowIdent are set to the innermost values given between the event source and the element given here. bcdRow/ColIdent do not need to be set at the same element.
   * @param {string}         [args.stylesheetUrl]       This parameter can be set when you only want to apply one single XSLT style sheet. It contains the URL pointing to it. If this parameter is set no nested 'chain' tag must be provided
   * @param {boolean}        [args.tableMode=false]     This flag can be set to 'true' if the 'bcdRowIdent' and 'bcdColIdent' parameters should be extracted from the HTML and added as parameters on the tooltipRenderer. They are derived from 'bcdRowIdent' and 'bcdColIdent' attributes of tr rows and header columns (td or th).
   * @param {targetHtmlRef}  [args.targetHtml]          The HTML listeners are placed on this Element instead of the targetHtml of the given targetRendererId.
   * @param {string}         [args.tooltipTargetHtmlId] Existing HTML Element Id which is used for the tooltip. By default this is 'bcdTooltipDiv'.
   */
  createTooltip: function(args){

    args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createTooltip_args );
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createTooltip_args);

    if (args.targetHtml) {
      var targetId = bcdui.util._getTargetHtml({targetHtml: args.targetHtml}, "bcdTooltip_");
      args.targetHtmlElement = jQuery("#" + targetId);
    }

    // Set default parametrs
    if(!args.tableMode ||args.tableMode == ""){
      args.tableMode = false;
    }
    args.id = args.id ? args.id : bcdui.factory.objectRegistry.generateTemporaryIdInScope("tootltip_"+(args.targetRendererId?args.targetRendererId:""));
    bcdui.log.isTraceEnabled() && bcdui.log.trace("Creating tooltip "+args.id);

    var delay = args.delay == "" || isNaN(args.delay) ? 200 : args.delay;

    // The existence of the div is mandatory in the theme (standardPage.html)
    // It cannot be create dynamically as we need is synchronously and may be during page load when creating the context menu
    var tooltipTargetHtmlId = args.tooltipTargetHtmlId || "bcdTooltipDiv";
    var cm = bcdui._migPjs._$(tooltipTargetHtmlId);
    if( "true"!=cm.attr("bcdInitialized") ) {
      cm.attr("bcdInitialized",true);
    }

    args.dataProviders = args.dataProviders || [];
    args.dataProviders.push(bcdui.wkModels.bcdRowIdent);
    args.dataProviders.push(bcdui.wkModels.bcdColIdent);

    // if we are bound to a renderer or simple plain htmlElement
    var boundToRenderer = args.targetRendererId && !!args.targetRendererId.trim();

    var _createTooltipRenderer = function(args){
      bcdui.factory.createRenderer({
          id                 : args.id
        , targetHTMLElementId: tooltipTargetHtmlId
        , chain              : args.chain
        , url                : args.url
        , inputModel         : args.inputModel
        , dataProviders      : args.dataProviders
        , parameters         : args.parameters
      });
    };

    // Renderer of the tooltip itself
    if(boundToRenderer){
      bcdui.factory.objectRegistry.withReadyObjects( args.targetRendererId, function(args) {
        if( args.targetRendererId && !args.inputModel)
          args.inputModel = bcdui.factory.objectRegistry.getObject(args.targetRendererId).getPrimaryModel().getName();
          _createTooltipRenderer(args);
      }.bind(undefined,args));
    }else{
      _createTooltipRenderer(args);
    }

    // sync against target renderer, if bound to
    var objectsToWait = [args.id];
    if(boundToRenderer){
      objectsToWait.push(args.targetRendererId);
    }

    bcdui.factory.objectRegistry.withReadyObjects({
      ids: objectsToWait,
      fn: function() {
        if(!boundToRenderer && !args.targetHtmlElement){
          // we dont attach tooltip renderer as we dont have a target
          return;
        }
        bcdui.widget._attachTooltipRenderer({
            tooltipRendererId : args.id
          , targetHtmlElement : bcdui._migPjs._$(args.targetHtmlElement).length > 0 ? bcdui._migPjs._$(args.targetHtmlElement).get(0) : bcdui._migPjs._$(bcdui.factory.objectRegistry.getObject(args.targetRendererId).targetHTMLElementId).get(0)
          , filter            : args.filter
          , tableMode         : args.tableMode
          , identsWithin      : args.identsWithin
          , delay             : delay
        });
      }
    });

    return bcdui.factory._generateSymbolicLink(args);
  },

  /**
   * Helper function, assuring bcdOptionsModelId, bcdOptionsModelXPath, bcdTargetModelId and bcdTargetModelXPath
   * are set, they may be derived from the xxXPath attributed when using $midelId/xPath syntax
   * @param args The parameter map contains the following properties:
   *    <ul>
   *      <li>htmlElement: (HTMLElement) htmlTargetElement to work on</li>
   *    </ul>
   * @private
   */
  _assureModelIdAndXPathAttributes: function(args)
    { var htmlElement = args.htmlElement;
      var bcdOptionsModelXPath = htmlElement.getAttribute("bcdOptionsModelXPath");
      if( bcdOptionsModelXPath && bcdOptionsModelXPath.charAt(0)=='$' ) {
        var optionsModel = bcdui.factory._extractXPathAndModelId(bcdOptionsModelXPath);
        htmlElement.setAttribute("bcdOptionsModelId",   optionsModel.modelId);
        htmlElement.setAttribute("bcdOptionsModelXPath",optionsModel.xPath);
      }
      var bcdTargetModelXPath = htmlElement.getAttribute("bcdTargetModelXPath");
      if( bcdTargetModelXPath && bcdTargetModelXPath.charAt(0)=='$' ) {
        var targetModel = bcdui.factory._extractXPathAndModelId(bcdTargetModelXPath);
        htmlElement.setAttribute("bcdTargetModelId",   targetModel.modelId);
        htmlElement.setAttribute("bcdTargetModelXPath",targetModel.xPath);
      }
      if( !htmlElement.getAttribute("bcdTargetModelId") )
        htmlElement.setAttribute("bcdTargetModelId", "guiStatus" );
    },

  /**
   * Helper function, init mandatory behavior:
   *     - read attributes bcdTargetModelId, bcdTargetModelXPath, bcdMandatory from the htmlElement
   *     - in non-wrs-case:
   *        - write initial @mandatory into targetModel
   *        - add listener to the target model on the mandatoryXPath - call args.onMandatoryChanged
   *
   * @param args The parameter map contains the following properties:
   *    <ul>
   *      <li>htmlElement: (HTMLElement) htmlTargetElement to work on</li>
   *      <li>onMandatoryChanged: (function) the callback function - will be called on mandatory changed</li>
   *    </ul>
   * @private
   */
  _initWidgetMandatory: function(args) {
      var htmlElement = args.htmlElement;
      //
      var targetModelId = htmlElement.getAttribute("bcdTargetModelId");
      var targetModelXPath = htmlElement.getAttribute("bcdTargetModelXPath");
      var mandatory = htmlElement.getAttribute("bcdMandatory");
      //
      bcdui.factory.objectRegistry.withReadyObjects({
        ids: targetModelId,
        fn: function() {
          var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
          //
          // calculate mandatoryXPath
          var isWrsModel = (targetModel.getData().selectSingleNode("/wrs:Wrs") != null ? true : false);
          var mandatoryXPath = bcdui.widget._getMandatoryXPath(targetModel, targetModelXPath);
          if (!isWrsModel) {
            // set initial targetModel/.../@mandatory from the widget parameter
            if (mandatory == "true") {
              var mandatoryNode = targetModel.dataDoc.selectSingleNode(mandatoryXPath);
              if (mandatoryNode == null || mandatoryNode.text != "true") {
                bcdui.core.createElementWithPrototype(targetModel.dataDoc, mandatoryXPath).text = "true";
//                targetModel.fire();
              }
            }
            else { // not mandatory
              if (targetModel.dataDoc.selectSingleNode(mandatoryXPath) != null) {
                bcdui.core.removeXPath(targetModel.dataDoc, mandatoryXPath);
//                targetModel.fire();
              }
            }
            //
            bcdui.factory.addDataListener({
              idRef: targetModelId,
              trackingXPath: mandatoryXPath,
              listener: args.onMandatoryChanged
            });
          }
        }
      });
    },
    /**
    * returns the corresponding header c node from wrs for a given targetXpath or null if neither wrs nor existing header
    * @private
    */
    _getWrsHeaderNode: function( /*dataProvider*/ targetModel, /* String*/ targetModelXpath ){
      var doc = targetModel.getData();
      var isWrsModel = (doc.selectSingleNode("/wrs:Wrs") != null ? true : false);
      if (isWrsModel){
        var columnIndex = 1 + doc.selectSingleNode(targetModelXpath).selectNodes("./preceding-sibling::wrs:C").length;
        var headerXPath = "/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@pos='" + columnIndex + "']";
        return doc.selectSingleNode(headerXPath);
      }else{
        return null;
      }
    },
    /**
     * Calculate mandatoryXPath for given targetModel and targetModelXPath.
     * The model should be ready.
     *
     * @param targetModel
     * @param targetModelXPath
     * @return String - the calculated @mandatory xPath
     *
     * @private
     */
    _getMandatoryXPath: function(/* DataProvider */ targetModel, /* String */ targetModelXPath) {
      var doc = targetModel.getData();
      var isWrsModel = (doc.selectSingleNode("/wrs:Wrs") != null ? true : false);
      var mandatoryXPath;
      if (isWrsModel) {
        // read from wrs:Header/../@nullable
        var columnIndex = 1 + doc.selectSingleNode(targetModelXPath).selectNodes("./preceding-sibling::wrs:C").length;
        mandatoryXPath = "/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@pos='" + columnIndex + "']";
        if (doc.selectSingleNode(mandatoryXPath) != null) {
          mandatoryXPath += "/@nullable";
        } else {
          mandatoryXPath = "/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[" + columnIndex + "]/@nullable";
        }
      }
      else {
        // check if the targetModelXPath points to an attribute - point @mandatory to the parent node,
        // try to replace any last attribute (if exists) to mandatory attribute by regexp
        mandatoryXPath = targetModelXPath.replace(/\/@\w+$/, "/@mandatory");
        // if targetModelXPath points to the node (and because privious replace wasn't done)
        if (!mandatoryXPath.endsWith("/@mandatory")) {
          // then add mandatory attribute to the targetModelXPath
          mandatoryXPath = targetModelXPath + "/@mandatory";
        }
      }
      return mandatoryXPath;
    },

    /**
     * Checks WRS mode.
     * @param doc {Document} The XML document.
     * @returns {Boolean} True in WRS mode.
     * @private
     */
    _isWrs: function(doc)
      {
        return doc.selectSingleNode("/wrs:Wrs") != null;
      },

    /**
     * Extracts and returns the row and column indexes from WRS xpath.
     * @param targetModel {DataProvider} The target model.
     * @param targetModelXPath {String} The XPath in whole XML model data.
     * @return The map contains the following properties:
     * <ul>
     *   <li>row: {Integer} Row index.</li>
     *   <li>col: {Integer} Column index.</li>
     * </ul>
     * @private
     */
    _extractRowAndColFromWrsModelXPath: function(targetModel, targetModelXPath)
      {
        var node = targetModel.getData().selectSingleNode(targetModelXPath);
        var rowIndex = node.parentNode.selectNodes("./preceding-sibling::wrs:*").length;
        var columnIndex = node.selectNodes("./preceding-sibling::wrs:C").length;
        return { row: 1 + rowIndex, col: 1 + columnIndex };
      },


  /**
   * @private
   */
  _setIdents: function(/* Event */ event, /* DataProvider */ renderer, /* HTMLElement */ targetElement)
    {
      var element = event.target;
      var idents = bcdui.widget._computeRowAndColIdents(element);
      event.bcdRowIdent = idents.bcdRowIdent || "";
      event.bcdColIdent = idents.bcdColIdent || "";
      bcdui.wkModels.bcdRowIdent.setData(event.bcdRowIdent);
      bcdui.wkModels.bcdColIdent.setData(event.bcdColIdent);
      var tE = bcdui._migPjs._$(targetElement) || bcdui._migPjs._$(renderer.targetHTMLElementId);
      if (tE.length > 0) {
        tE.attr("bcdRowIdent", event.bcdRowIdent);
        tE.attr("bcdColIdent", event.bcdColIdent);
      }
    },


  /**
   * @private
   */
  _flyOverPositioning: function(args)
    {
      if (args.event == null || bcdui.util.stripTags(bcdui._migPjs._$(args.htmlElement).html()).trim().length===0) {
        bcdui._migPjs._$(args.htmlElement).hide();
        args.event = null;
      } else {
        bcdui._migPjs._$(args.htmlElement).show();
        var ctDivFd = bcdui._migPjs._$(args.htmlElement);
        if(ctDivFd.outerWidth()==0 || ctDivFd.outerHeight()==0)
          ctDivFd = bcdui._migPjs._$(bcdui._migPjs._$(args.htmlElement).children().get(0));
        if(!ctDivFd.length > 0 || ctDivFd.outerWidth()==0 || ctDivFd.outerHeight()==0)
          return;
        var ctWidth = ctDivFd.outerWidth();
        var ctHeight = ctDivFd.outerHeight();
        var offset = (args.positionUnderMouse ? -10 : 3);
        var ctX = args.event.pageX + offset;
        if( ctX+ctWidth > jQuery(window).outerWidth() + jQuery(window).scrollLeft() )
          ctX -= (ctWidth + offset*2);
        var ctY = args.event.pageY + offset;
        var topScrollOffset = jQuery(window).scrollTop();
        if( ctY+ctHeight > jQuery(window).outerHeight() + topScrollOffset )
          ctY -= (ctHeight + offset*2);
        if(ctY<topScrollOffset)
          ctY = topScrollOffset;
        bcdui._migPjs._$(args.htmlElement).css({
          top:  ctY + "px",
          left: ctX + "px"
        });
        return;
      }
    },

  /**
   * Pleade note that in IE6 and some IE8 this must not becalled from code insight body during page load
   * That's why context menu and tooltip are not using it
   * @private
   */
  _createTopLevelElement: function(args)
    {
      var e = bcdui._migPjs._$(args.htmlElementId);
      if (e.length > 0) return e;
      e = document.createElement("div");
      e.id = args.htmlElementId;
      e.style.display = "none";
      e.style.position = "absolute";
      document.body.appendChild(e);
      return bcdui._migPjs._$(e).get(0);
    },

    /**
     *
     * @param args:
     *             targetModelId
     *             targetModelXPath
     *             delta
     *             lastPage
     *             currentPage
     *             elementId
     *             fn
     * @private
     */
    _pagingPanelChangePageNum:function(args) {
      var model = bcdui.factory.objectRegistry.getObject(args.targetModelId);
      var delta = args.delta * 1;
      if(model){
        var cp = args.currentPage;// is 1 based
        if (cp == 'all') return false; // if "show all" option selected no need to move page
        cp = parseInt(cp);

        var nd = model.dataDoc.selectSingleNode(args.targetModelXPath);
        if(nd)
          cp = nd.text * 1;

        if( (cp==1 && delta < 0) || (cp==args.lastPage && delta > 0)){
          return;
        }
        if( ! nd)
          nd = bcdui.core.createElementWithPrototype(model.dataDoc,args.targetModelXPath);

        var oldVal = nd.text;
        nd.text = (cp + delta);

        model.fire();

        if(oldVal != nd.text){
          if(args.elementId && bcdui._migPjs._$(args.elementId).length > 0){
            bcdui._migPjs._$(args.elementId).get(0).selectedIndex = (nd.text - 1);// is zero based
          }
          if(args.fn)
            args.fn();
        }
      }
    },

    /**
     * Create fixed table header by adding a fixed copy of the original
     * Its size is derived from the "original" header, still in place for the table
     * @param {Object}        args                 The parameter map contains the following properties.
     * @param {string}        args.rendererId      Id of the renderer to work on
     * @param {boolean}       [args.isSync=false]  Decide whether the action is to be called synchronous or not
    */
    createFixedTableHeader: function(args) {

      var action = function( rendererId ) {
        var tRenderer = bcdui._migPjs._$(bcdui.factory.objectRegistry.getObject(rendererId).getTargetHtml());

        // IE specific, TODO the reason for the 1px is unclear and it seams not to be exactly 1px
        var iePadding = bcdui.browserCompatibility.isIE ? 16 : 0;

        var tDiv = null;
        if( tRenderer.find("table").length==1 ) {
          tRenderer.css({position:"relative"});
          tDiv = bcdui._migPjs._$(document.createElement("div"));
          tDiv.css({overflowY:"scroll",overflowX:"hidden",height:tRenderer.css("height"), paddingRight:iePadding+"px"});
          // If the user has set the bcdFhInitialScrollPos value, we do not overwrite it
          var tRendererId = tRenderer.attr('id');
          var onUnLoad = "if(!bcdui._migPjs._$('"+tRendererId+"').attr('bcdFhInitialScrollPos')) bcdui._migPjs._$('"+tRendererId+"').attr('bcdFhInitialScrollPos',jQuery('#" + tRendererId + "_outerDiv').get(0).scrollTop);";
          tDiv.attr("bcdOnUnload", onUnLoad);
          tDiv.attr("id", tRendererId + "_outerDiv");
          tDiv.append(tRenderer.find("table")[0]);
          tRenderer.append(tDiv);

          // set to stored top scroll position
          if(tRenderer.attr("bcdFhInitialScrollPos") ) {
            tDiv.get(0).scrollTop = parseInt(tRenderer.attr("bcdFhInitialScrollPos"), 10);
            tRenderer.get(0).removeAttribute("bcdFhInitialScrollPos");  // Remove it here, so that we later know whether we have to set it or the user did set it already
          }

          var fixTable = jQuery(tDiv.find("table").get(0).cloneNode(false));
          fixTable.append(jQuery(tDiv.find("thead")).first().clone(true,true));
          fixTable.css({position:"absolute", top:"0px", display: "none"});
          fixTable.attr("bcdHideOnExport","true");
          tRenderer.append(fixTable);
        }

        tRenderer.find("table")[1].style.width = "auto"; // In terms of size, follow the settings on the th below

        // do width calculation in a timeout to allow the browser to finish/resize table first
        setTimeout(function() {

          // border separation/collapse results in additional count factor
          var isSeparate = tRenderer.find("table").first().css("borderCollapse") == "separate";

          // set tr heights 
          var origHs = jQuery(tRenderer.find("table")[0]).find("thead tr");
          var fixHs  = jQuery(tRenderer.find("table")[1]).find("thead tr");
          for(var h = 0; h < origHs.length; h++)
            fixHs[h].style.height = jQuery(origHs[h]).css('height');

          // set th widths
          fixTable.find("th").each(function(index) {
            jQuery(this).addClass("bcdFixedTableHeaderNoPad");  // remove any left/right padding/merging

            // now try to calculate the width needed by borders 
            var border = 0.5 * (jQuery(tRenderer.find("table")[0]).find("th").eq(index).outerWidth() - jQuery(tRenderer.find("table")[0]).find("th").eq(index).innerWidth());
            border *= (border > 0 && bcdui.browserCompatibility.isGecko ? 2 : 1);  // Firefox seems to count borders only once, so we need to double them again
            border += isSeparate ? 1 : 0;

            jQuery(this).css("width", (jQuery(tRenderer.find("table")[0]).find("th").eq(index).outerWidth() - border) + "px"); // and set the new calculated width
          });
          // The copied header may contain widgets and other extras, which we need to activate
          if( fixTable )
            bcdui.factory.objectRegistry.getObject(rendererId)._executeOnXAttributes(fixTable,"bcdOnLoad");

          // finally show it
          fixTable.show();
        });
      };

      // Decide whether to be called synchronous (for example in case of a just created renderer output in bcdOnLoad)
      if( args.isSync ) {
        action( args.rendererId );
      } else {
        bcdui.factory.objectRegistry.withReadyObjects( args.rendererId, function() { action( args.rendererId ); } );
      }
    },

    /**
     * takes a paramBag parameters and adds them with bcd prefix (and upperCase first character) as htmlElement attributes)
     * @param htmlElement 
     * @param {object} paramBag
     * @private
     */
    _addBcdAttributes: function(htmlElement, paramBag) {
      for (var p in paramBag)
        if (typeof paramBag[p] != "undefined" && paramBag[p] != null)
          htmlElement.setAttribute("bcd" + p[0].toUpperCase() + p.substr(1), paramBag[p]);
     },
     
      /**
       * adds widget link to NavPath model
       * @param htmlElement
       * @private
       */
      _linkNavPath: function(id, caption) {
        if (typeof id == "string" && id != "") {

          // don't link internal widgets
          var target = jQuery("#" + id).length > 0 ? jQuery("#" + id).first() : jQuery("*[bcdTargetHtmlElementId='" + id + "']").first();
          // inner widgets (like inputfields in dimchooser)
          if (target.parents("*[bcdTargetModelXPath]").length > 0) return;
          // cube dnd/templates/ranking
          if (target.parents(".bcdCubeDndMatrix").length > 0) return;
          if (target.parents(".bcdCubeRanking").length > 0) return;
          if (target.parents(".bcdReportTemplates").length > 0) return;
          // grid input field
          if (target.find(".bcdInputFieldGrid").length > 0) return;

  				bcdui.wkModels.bcdNavPath.write("/*/guiStatus:NavPath[@id='" + id + "']", caption ? caption : "", true);
        }
      },

     /**
     * constructs a domAttribute='value' string out of a given bcdAttribute 
     * @param htmlElement 
     * @param {string} bcdAttribute - bcdAttribute to read
     * @param {string} domAttribute - domAttribute to write
     * @return string with attribute and value or empty string if value is empty or wrong attribute
     * @private
      */
     _domFromBcdAttribute: function(htmlElement, bcdAttribute, domAttribute) {
       var value = htmlElement.getAttribute(bcdAttribute);
       if (value != null) value = value.replace(/'/g, "&#39;");
       return ((value != null && value != "") ? " " + domAttribute + "='" + value + "'" : "");
     },

     /**
      * gets value from given attribute
      * @param htmlElement 
      * @param {string} bcdAttribute - bcdAttribute to read
      * @return value or empty string if wrong attribute
      * @private
       */
      _getBcdAttributeValue: function(htmlElement, bcdAttribute) {
        var value = htmlElement.getAttribute(bcdAttribute);
        return ((value != null) ? value : "");
      },
     /**
      * moves bcd attributes from one htmlElement to another 
      * @param sourceHtmlElement 
      * @param targetHtmlElement
      * @private
      */
     _moveBcdAttributes: function(sourceHtmlElement, targetHtmlElement) {
       jQuery.makeArray(sourceHtmlElement.attributes).forEach(function(a){
         if (a.nodeName.startsWith("bcd")) {
           targetHtmlElement.setAttribute(a.nodeName, a.nodeValue);
           sourceHtmlElement.removeAttribute(a.nodeName);
         }
       });
     },

     /**
      * rename bcdId from htmlElement id attribute if id does not exist 
      * @param htmlElement 
      * @private
      */
     _bcdIdToDomId: function(htmlElement) {
       if (htmlElement.getAttribute("id") == null && htmlElement.getAttribute("bcdId") != null) {
         htmlElement.setAttribute("id", htmlElement.getAttribute("bcdId"));
       }
       htmlElement.removeAttribute("bcdId");
     },

     /**
      * since IE8 does not support nth-child selectors, this functions adds classes to even/odd rows 
      * @param htmlElement
      * @private
      */
     createEvenOdd: function(htmlElement) {
       if (bcdui.browserCompatibility.isIE8) {
         jQuery(htmlElement).find("tr:nth-child(2n+0)").addClass("bcdIE8Even");
         jQuery(htmlElement).find("tr:nth-child(2n+1)").addClass("bcdIE8Odd");
       }
     },

     /**
      * shows a js alert box with the given message
      * @param msgKey
      * @param defaultValue
      */
     i18nAlert : function(/* string */ msgKey, /* string */ defaultValue) {
       alert(bcdui.i18n.syncTranslateFormatMessage({msgid: msgKey}) || defaultValue);
     },
     
     /**
      * shows a js confirm box with the given message
      * @param msgKey
      * @param defaultValue
      */
     i18nConfirm : function(/* string */ msgKey, /* string */ defaultValue) {
       return confirm(bcdui.i18n.syncTranslateFormatMessage({msgid: msgKey}) || defaultValue);
     },

     /**
      * Get widgetCaption information from the given target
      * @param {element|string} elOrId An existing HTML element or its id representing a widget targetHtml
      * @return string of found widgetCaption or empty string 
      */
     getWidgetCaption : function( elOrId ) {
       var el = jQuery.bcdFindById( elOrId );
       var caption = el.attr("bcdWidgetCaption") || el.attr("widgetCaption") || ""; // Widget API
       if(!caption && el.is(jQuery.bcdui.bcduiWidget.SELECTOR)){
         caption = el._bcduiWidget().options.widgetCaption || caption; // WidgetNg API
       }
       if (! caption  && el.find("[bcdWidgetCaption]").length > 0)
         caption = el.find("[bcdWidgetCaption]").first().attr("bcdWidgetCaption");
       if (caption.length > 1 && caption[0] === bcdui.i18n.TAG)
         caption = bcdui.i18n.syncTranslateFormatMessage({msgid: caption.substring(1)});
       return caption;
     },

     /**
      * Writes navpath widget information to the given target and updates this information changes
      * @param {Object}        [args]                The parameter map contains the following properties.
      * @param {targetHtmlRef} [args.targetHtml=bcdNavPath] An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
      * @param {string}        [args.title=Report]   A title string which is used during filename generation for exports 
      * @param {string}        [args.values]         A space separated string which lists the ordered targetIds of the widgets which should be queried 
      * @param {string}        [args.separator]      A string used for delimiter between single widget navpath values, default is ' ' (space)
      */
     createNavPath : function(args) {
       args = args || {};
       args.targetHtml = args.targetHtml || "bcdNavPath";
       args.separator = args.separator || " ";
       args.title = args.title || "Report";
       args.values = args.values || "";

       var targetId = bcdui.util._getTargetHtml({targetHtml: args.targetHtml}, "bcdNavPath_");
       if (! jQuery("#" + targetId).length > 0)
           return;

       var root = bcdui.wkModels.bcdNavPath.query("/*");
       if (root) {
         root.setAttribute("title", args.title);
         root.setAttribute("targetId", targetId);
       }

       var fkt = function(){jQuery("#" + targetId).html(bcdui.widget._navPathPrint(args.values, args.separator, true))};
       // render data on any change
       bcdui.wkModels.bcdNavPath.onChange(fkt);
       // and initially
       fkt();
     },

     /**
      * Get current live navpath widget information via callback for the given widget targets. This function regets the current caption information from the
      * widgets themselves and does not use the navPath model which represents the captions when entering the page 
      * @param {function}      callback         A callback function which gets the final navpath string and an object holding the single ids/captions
      * @param {string}        [values]         A space separated string which lists the ordered targetIds of the widgets which should be queried (or empty for all)
      * @param {string}        [separator=" "]  A string used for delimiter between single widget navpath values
      */
     getLiveNavPath: function(callback, values, separator) {
       var sep = separator || " ";
       var valList = bcdui.widget._getSortedNavPathItems(values);

       var valueArray = [];
       
       if (valList.length == 0) {
         callback("");
         return;
       }

       for (var e = 0; e < valList.length; e++) {
         var id = valList[e];
         var getFunction = null;

         // try to identify the widgets behind the targetIds
         if (jQuery("#" + id + " > .bcdDimensionChooser").length > 0)  getFunction = bcdui.widget.dimensionChooser.getNavPath;
         if (jQuery("#" + id + " > .bcdFormulaEditor").length > 0)     getFunction = bcdui.widget.formulaEditor.getNavPath;
         if (jQuery("#" + id + " > .bcdInputField").length > 0)        getFunction = bcdui.widget.inputField.getNavPath;
         if (jQuery("#" + id + " > .bcdMultiSelect").length > 0)       getFunction = bcdui.widget.multiSelect.getNavPath;
         if (jQuery("#" + id + " > .bcdPeriodChooser").length > 0)     getFunction = bcdui.widget.periodChooser.getNavPath;
         if (jQuery("#" + id + " > .bcdSingleSelect").length > 0)      getFunction = bcdui.widget.singleSelect.getNavPath;
         if (jQuery("#" + id + " > button").length > 0)                 getFunction = bcdui.widgetNg.button.getNavPath;
         if (jQuery("#" + id + " > input[type='checkbox']").length > 0) getFunction = bcdui.widgetNg.checkbox.getNavPath;
         if (jQuery("#" + id + " > input[type='date']").length > 0)     getFunction = bcdui.widgetNg.input.getNavPath;
         if (jQuery("#" + id + " > input[type='text']").length > 0)     getFunction = bcdui.widgetNg.input.getNavPath;
         if (jQuery("#" + id + " > .bcdSideBySideChooser").length > 0)  getFunction = bcdui.widgetNg.sideBySideChooser.getNavPath;
         if (jQuery("#" + id + " > select").length > 0)                 getFunction = bcdui.widgetNg.singleSelect.getNavPath;
         if (jQuery("#" + id + " > textarea").length > 0)               getFunction = bcdui.widgetNg.input.getNavPath;
         // connectable widget excluded (returns "" anyway), suggestInput handled via input

         if (getFunction != null) {
           getFunction(id, function(id, value) {
             valueArray.push({i: id, v: value});

             if (valueArray.length == valList.length) {
               var caption = "";
               for (var i = 0; i < valList.length; i++) {
                 var idX = valList[i];
                 var valueX = "";
                 for (var j = 0; j < valueArray.length; j++) {
                   if (valueArray[j].i == idX) {
                     valueX = valueArray[j].v;
                     break;
                   }
                 }
                 var widgetCaption = bcdui.widget.getWidgetCaption(idX) || bcdui.wkModels.bcdNavPath.read("/*/guiStatus:NavPath[@id='" + idX + "']/@caption", "");
                 if (valueX != "") {
                   if (widgetCaption != "")
                     widgetCaption += " ";
                   caption += ((caption != "") ? sep + widgetCaption + valueX : widgetCaption + valueX);
                 }
               }
               callback(caption, valueArray);
               return;
             }
           });
         }
         else {
           valueArray.push({i: id, v: ""});

           if (valueArray.length == valList.length) {
             var caption = "";
             for (var i = 0; i < valList.length; i++) {
               var idX = valList[i];
               var valueX = "";
               for (var j = 0; j < valueArray.length; j++) {
                 if (valueArray[j].i == idX) {
                   valueX = valueArray[j].v;
                   break;
                 }
               }
               var widgetCaption = bcdui.widget.getWidgetCaption(idX) || bcdui.wkModels.bcdNavPath.read("/*/guiStatus:NavPath[@id='" + idX + "']/@caption", "");
               if (valueX != "") {
                 if (widgetCaption != "")
                   widgetCaption += " ";
                 caption += ((caption != "") ? sep + widgetCaption + valueX : widgetCaption + valueX);
               }
             }
             callback(caption, valueArray);
             return;
           }
         }
       }
     },

     /**
      * Get current navpath widget information for the given widget targets.
      * @param {string}        [values]         A space separated string which lists the ordered targetIds of the widgets which should be queried (or empty for all)
      * @param {string}        [separator=" "]  A string used for delimiter between single widget navpath values
      * @return string containing the current navPath for your selected values 
      */
     getCurrentNavPath: function(values, separator) {
       return bcdui.widget._navPathPrint(values, separator, false);
     },
     
     /**
      * Helper function for navpath operations. Takes a given list as is or, if not provided it
      * takes all ids from the bcdNavPath model but orders them according to their placement on the screen
      * @param {string}        [values]         A space separated string which lists the ordered targetIds of the widgets which should be queried (or empty for all)
      * @return Array containing the values (sorted by appearance if no values specified or original order)
      * @private
      */
     _getSortedNavPathItems: function(values) {
       // in case we don't specify any values, we use the full list (sorted by appearance)
       if (! values || values.trim().length == 0) {
         values = "";
         var nodes = jQuery.makeArray(bcdui.wkModels.bcdNavPath.queryNodes("/*/guiStatus:NavPath"));
         nodes.sort(function (a, b) {
           var idA = a.getAttribute("id");
           var A = jQuery("#" + idA).length > 0 ? jQuery("#" + idA).first() : jQuery("*[bcdTargetHtmlElementId='" + idA + "']").first();
           var y_a = idA != null ? A.position() : null;
           y_a = y_a ? y_a.top : 0;
           var idB = b.getAttribute("id");
           var B = jQuery("#" + idB).length > 0 ? jQuery("#" + idB).first() : jQuery("*[bcdTargetHtmlElementId='" + idB + "']").first();
           var y_b = idB != null ? B.position() : null;
           y_b = y_b ? y_b.top : 0;
           return (y_a > y_b ? 1 : y_a < y_b ? -1 : 0);
         });         

         for (var n = 0; n < nodes.length; n++) {
           var id = nodes[n].getAttribute("id");
           values += (id != null) ? ((values != "" ? " " : "") + id) : "";
         }
       }
       return values ? values.split(" ") : [];;
     },

     /**
      * General (formatted) navpath widget information printer function  
      * @param {string}        [values]            A space separated string which lists the ordered targetIds of the widgets which should be queried (or empty for all)
      * @param {string}        [separator=" "]     A string used for delimiter between single widget navpath values
      * @param {boolean}       [doFormat=false]    true if you want a span with className around the widgetCaption
      * @return string containing the current navPath for your selected values
      * @private 
      */
     _navPathPrint: function(values, separator, doFormat) {
       var caption = "";
       var sep = separator || " ";
       var valList = bcdui.widget._getSortedNavPathItems(values);
       var pre = doFormat ? "<span class='bcdWidgetCaption'>" : "";
       var post = doFormat ? "</span>" : "";
       for (var e = 0; e < valList.length; e++) {
         var id = valList[e];
         var value = bcdui.wkModels.bcdNavPath.read("/*/guiStatus:NavPath[@id='" + id + "']", "");
         var widgetCaption = bcdui.widget.getWidgetCaption(id) || bcdui.wkModels.bcdNavPath.read("/*/guiStatus:NavPath[@id='" + id + "']/@caption", "");
         if (widgetCaption != "") {
           widgetCaption += " ";
           widgetCaption = pre + widgetCaption + post;
         }
         if (value != "")
           caption += ((caption != "") ? sep + widgetCaption + value : widgetCaption + value);
       }
       return caption;
     },

     /**
      * build up caption string from target value (with help of caption attribute or optionsModel)   
      * @param {Object} e the HTML Element with the known bcd Model attributes
      * @private
      */
     _getCaptionFromWidgetElement: function(e, callback) {

       if (e == null) {
         callback("");
         return;
       }

       e = jQuery(e);
       if(e.is(jQuery.bcdui.bcduiWidget.SELECTOR)){ // WidgetNg API
         var eOptions = e._bcduiWidget().options;
         var targetModelId = eOptions.targetModelId || "guiStatus";
         var targetXPath = eOptions.targetModelXPath;
         var optionsModelId = eOptions.optionsModelId;
         var optionsModelXPath = eOptions.optionsModelXpath;
         var optionsModelRelativeValueXPath = eOptions.optionsModelRelativeValueXPath;
       } else { // Widget
         e = e.get(0);
         var targetModelId = e.getAttribute("bcdTargetModelId") || "guiStatus";
         var targetXPath = e.getAttribute("bcdTargetModelXPath");
         var optionsModelId = e.getAttribute("bcdOptionsModelId");
         var optionsModelXPath = e.getAttribute("bcdOptionsModelXpath");
         var optionsModelRelativeValueXPath = e.getAttribute("bcdOptionsModelRelativeValueXPath");
       }


       if (targetXPath && targetXPath.indexOf("$") != -1) {
         var t = bcdui.factory._extractXPathAndModelId(targetXPath);
         targetModelId = t.modelId;
         targetXPath = t.xPath;
       }
       if (optionsModelXPath && optionsModelXPath.indexOf("$") != -1) {
         var t = bcdui.factory._extractXPathAndModelId(optionsModelXPath);
         optionsModelId = t.modelId;
         optionsModelXPath = t.xPath;
       }

       // don't allow multi-model referencing options models
       if (optionsModelXPath != null && optionsModelXPath != "") {
         var optionModels = bcdui.widget._extractModelsFromModelXPath(optionsModelXPath);
         if (optionModels != null)
           optionsModelId = optionsModelXPath = optionsModelRelativeValueXPath = null;
       }

       var models = [];
       if (targetModelId != null && targetModelId != "")
         models.push(targetModelId);
       if (optionsModelId != null && optionsModelId != "")
         models.push(optionsModelId);

       bcdui.factory.objectRegistry.withReadyObjects(models, function() {

         var finalCaption = "";
         if (targetModelId != null && targetModelId != "") {
           var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
           if (targetXPath != null) {
             var targetNodes = targetModel.getData().selectNodes(targetXPath);

             for (var t = 0; t < targetNodes.length; t++) {

               if (t > 3) {
                 finalCaption += ((finalCaption == "" ? "..." : ",..."));
                 break;
               }

               var targetNode = targetNodes[t];

               var value = targetNode.text;

               var caption = targetNode.nodeType == 2 ? null : targetNode.getAttribute("caption");
               if (targetNode.nodeType == 2) {
                 var node = targetModel.getData().selectSingleNode(targetXPath + "/..");
                 if (node != null)
                   caption = node.getAttribute("caption");
               }
    
               // if caption value is available, use it
               if (caption != null && caption != "")
                 finalCaption += (finalCaption == "" ?  caption : ("," + caption));
               else {

                 // otherwise lookup caption in optionsModel
                 if (optionsModelId && optionsModelId != "") {
                   var optionsModel = bcdui.factory.objectRegistry.getObject(optionsModelId);
                   var options = new Array();
                   if (optionsModel && optionsModelXPath && optionsModelXPath != "") {
                     var nodes = optionsModel.getData().selectNodes(optionsModelXPath);
                     options = jQuery.makeArray(nodes).map(function(node) {
                       var caption = node.nodeValue || node.text;
                       var value = optionsModelRelativeValueXPath ? node.selectSingleNode(optionsModelRelativeValueXPath) : null;
                       if (value != null)
                         value = value.nodeValue || value.text;
                       else
                         value = caption;
                       return { value: bcdui.util.escapeHtml(value), caption: bcdui.util.escapeHtml(caption) };
                     });
                   }

                   var o = options.filter(function(e){return (e.value == value) })
                   if (o.length > 0)
                     finalCaption += (finalCaption == "" ? o[0].caption : ("," + o[0].caption));
                   else   // simply take value
                     finalCaption += (finalCaption == "" ? value : ("," + value));
                 }
                 else   // simply take value
                   finalCaption += (finalCaption == "" ? value : ("," + value));
               }
             }
           }
         }
         callback(finalCaption);
       });
     }
}); // namespace

bcdui.widget.validationToolTip = bcdui._migPjs._classCreate( null,
/**
 * @lends bcdui.widget.validationToolTip.prototype
 */
{
  _schema_validationToolTip_args: !(bcdui.factory.validate.jsvalidation._patterns) ? {} : {
    name: "_schema_validationToolTip_args",
    properties: {
      id:                         { type: "string",  required: false, pattern: bcdui.factory.validate.jsvalidation._patterns.dataProviderId },
      targetModelId:              { type: "string",  required: true, pattern: bcdui.factory.validate.jsvalidation._patterns.dataProviderId },
      targetModelXPath:           { type: "string",  required: true,  pattern: bcdui.factory.validate.jsvalidation._patterns.writableModelXPath },
      containerHtmlElement:       { type: "htmlElement",  required: true},
      validateWrapperUrl:         { type: "string",  required: false },
      validateWrapperParameters:  { type: "object",  required: false }
    }
  },

  /*
   * @constructs
   * Initializing tooltip widget
   * input parameters arg
   *    id - option widget identifier
   *    targetModelId - identifier of model that should be tracked
   *    targetModelXPath - xpath of model that should be tracked
   *    containerHtmlElement - html container with binded control
   *    validateWrapperUrl - xstl transformation which implement concrete validation logic
   *    validateWrapperParameters - parameters that should be passed to validateWrapper
   * */
  initialize: function(args)
  {
//    args = bcdui.factory._xmlArgs( args, this._schema_validationToolTip_args );
//    bcdui.factory.validate.jsvalidation._validateArgs(args, this._schema_validationToolTip_args);
    
    if (!args.id) {
      args.id = bcdui.factory.objectRegistry.generateTemporaryIdInScope("validation_tooltip_");
      if (args.id == "validation_tooltip_") {
        args.id += "0";
      }
    }
    this.targetModelId = args.targetModelId;
    this.targetModelXPath = args.targetModelXPath;
    if (args.validateMethod)
      this.validateMethod = args.validateMethod;
    else
      this.validateMethod = this._validateValue;

    var t = {
        targetModelId: args.targetModelId,
        targetModel: bcdui.factory.objectRegistry.getObject(args.targetModelId),
        targetModelXPath: args.targetModelXPath,
        doc: bcdui.factory.objectRegistry.getObject(args.targetModelId).getData(),
        containerHtmlElement: args.containerHtmlElement
    };

    var tooltipListener = this._initTooltip(t);

    var validate = args.containerHtmlElement.getAttribute("bcdValidate");
    if (validate !== "true") { return; }

    // if args.validateWrapperUrl exists adding common validation method (checking mandatory, and calling external XSLT)
    if (typeof args.validateWrapperUrl == 'undefined') { return; }

    var currentObject = this;
    var mandatory, xpathFrom, xpathTo;
    xpathFrom = xpathTo = t.targetModelXPath;
    if (bcdui.widget._isWrs(t.doc)) {
      var nullableAttr = t.doc.selectSingleNode(bcdui.widget._getMandatoryXPath(t.targetModel, t.targetModelXPath));
      mandatory = nullableAttr != null && nullableAttr.value == "0" ? "true" : "false";
    } else {
      bcdui.widget._initWidgetMandatory({
        htmlElement: t.containerHtmlElement,
        onMandatoryChanged: function() {
          // run validation with changed mandatory value
          currentObject.validateMethod(t.containerHtmlElement);
        }
      });
      var mandatoryId = t.containerHtmlElement.getAttribute("id") + "_mandatory";
      mandatory = new bcdui.core.DataProviderWithXPath({
        id: mandatoryId,
        name: mandatoryId + "_name",
        source: t.targetModel,
        xPath: bcdui.widget._getMandatoryXPath(t.targetModel, t.targetModelXPath)
      });
    }
    var id = t.containerHtmlElement.getAttribute("id");
    var validateWrapperId = "validate_wrapper_" + id;
    t.containerHtmlElement.setAttribute("bcdValidateWrapperId", validateWrapperId);
    args.validateWrapperParameters.mandatory = mandatory;
    bcdui.factory.createModelWrapper({
      id: validateWrapperId,
      url: args.validateWrapperUrl,
      inputModel: t.targetModelId,
      parameters: args.validateWrapperParameters
    }); // validateWrapper
    bcdui.factory.objectRegistry.withReadyObjects(validateWrapperId, function() {
      // initial validation
      currentObject.validateMethod(t.containerHtmlElement);
    });
  },

  /**
   * Tool tip listener initialization and registering.
   * @param containerHtmlElement {HTMLElement} Widget container element.
   * @returns {Function} Listener which controls the tool tip.
   * @private
   */
  _initTooltip: function(t)
    {
      var xpath, xpathMessage;
      if (bcdui.widget._isWrs(t.doc)) {
        var f = bcdui.widget._extractRowAndColFromWrsModelXPath(t.targetModel, t.targetModelXPath);
        xpath = xpathMessage = "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Data/wrs:R[wrs:C[1]='" + f.row + "' and wrs:C[2]='" + f.col + "']/wrs:C[3]";
      } else {
        xpath = t.targetModelXPath + "/@isValid";
        xpathMessage = t.targetModelXPath + "/@message";
      }
      var validateTooltipId = "validate_tooltip_" + t.containerHtmlElement.getAttribute("id");
      var msgId = t.containerHtmlElement.getAttribute("id") + "_msg";
      bcdui.widget.createTooltip({
        id: validateTooltipId,
        chain: "",
        url: bcdui.util.url.resolveToFullURLPathWithCurrentURL("/bcdui/js/widget/simpleToolTipRenderer.xslt"),
        tableMode: false,
        targetHtmlElement: t.containerHtmlElement,
        inputModel: t.targetModel,
        delay: 200,
        filter: "",
        parameters: {
          message: new bcdui.core.DataProviderWithXPath({
            id: msgId,
            name: msgId + "_name",
            source: t.targetModel,
            xPath: xpathMessage,
            nullValue: ""
          })
        }
      });
      var currentObject = this;
      var listener = new bcdui.widget.XMLDataUpdateListener({
        idRef: t.targetModelId,
        trackingXPath: xpath,
        htmlElementId: t.containerHtmlElement.id
      });
      listener.updateValue = function(){
        currentObject._visualizeValidationResult(t.containerHtmlElement, t.targetModelId, xpath);
      };
      bcdui.factory.addDataListener(listener);
      return listener;
    },

    /**
     * Validation visualiser (adding bcdInvalid class to source html container if validation failed)
     * @param containerHtmlElement {HTMLElement} Widget container element.
     *        validateValue {boolean} result of validation true\false
     * @private
     */
    _visualizeValidationResult: function(containerHtmlElement, targetModelId, xpath){
      var doc=bcdui.factory.objectRegistry.getObject(targetModelId).getData();
      var node = doc.selectSingleNode(xpath);
      var value;
      if (bcdui.widget._isWrs(doc)) {
        value = node && node.text ? "false" : "true";
      } else {
        value = node ? node.value : "true";
      }
      if (value === "true") {
        bcdui._migPjs._$(containerHtmlElement).find("span.bcdValue").each(function(i, span) {
          if (jQuery(span).hasClass("bcdInvalid")) jQuery(span).removeClass("bcdInvalid");
        });
      } else if (value === "false") {
        bcdui._migPjs._$(containerHtmlElement).find("span.bcdValue").each(function(i, span) {
          if (!jQuery(span).hasClass("bcdInvalid")) jQuery(span).addClass("bcdInvalid");
        });
      }
    },
    /**
     * Runs widget validation (which passed to validateWrapperUrl) and copy validation info from wrapper to the model.
     * @param containerHtmlElement
     * @private
     */
    _validateValue: function(containerHtmlElement){
      if (containerHtmlElement.getAttribute("bcdValidate") == "true") {
        var validateWrapper = bcdui.factory.objectRegistry.getObject(containerHtmlElement.getAttribute("bcdValidateWrapperId"));
        validateWrapper.execute(true);
        // copy validation info from wrapper to the model
        var message = validateWrapper.getData().selectSingleNode("/validation-result").text;
        var doc = bcdui.factory.objectRegistry.getObject(this.targetModelId).getData();
        if (bcdui.widget._isWrs(doc)) {
          var column = bcdui.core.createElementWithPrototype(doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[1]");
          column.setAttribute("pos", "1");
          column.setAttribute("id", "RowId");
          column.setAttribute("type-name", "NUMERIC");
          column = bcdui.core.createElementWithPrototype(doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[2]");
          column.setAttribute("pos", "2");
          column.setAttribute("id", "ColPos");
          column.setAttribute("type-name", "NUMERIC");
          column = bcdui.core.createElementWithPrototype(doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[3]");
          column.setAttribute("pos", "3");
          column.setAttribute("id", "error");
          column.setAttribute("type-name", "VARCHAR");

          var f = bcdui.widget._extractRowAndColFromWrsModelXPath(bcdui.factory.objectRegistry.getObject(this.targetModelId), this.targetModelXPath);
          var xp = "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Data/wrs:R[wrs:C[1]='" + f.row + "' and wrs:C[2]='" + f.col + "']";
          var node = doc.selectSingleNode(xp);
          if (message) {
            if (node) {
              bcdui.core.createElementWithPrototype(doc, xp + "/wrs:C[3]", false).text = message;
            } else {
              // insert wrs:R to the last position under wrs:Data
              node = bcdui.core.createElementWithPrototype(doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Data", false);
              var pos = 1 + node.selectNodes("./wrs:R").length;
              var el = bcdui.core.createElementWithPrototype(doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Data/wrs:R[" + pos + "]/wrs:C[1]", false);
              el.text = f.row;
              el = bcdui.core.createElementWithPrototype(doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Data/wrs:R[" + pos + "]/wrs:C[2]", false);
              el.text = f.col;
              el = bcdui.core.createElementWithPrototype(doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Data/wrs:R[" + pos + "]/wrs:C[3]", false);
              el.text = message;
            }
          } else if (node) {
            node.parentNode.removeChild(node);
          }
        } else {
          var targetElement = bcdui.core.createElementWithPrototype(doc, this.targetModelXPath);
          if (message) {
            targetElement.setAttribute("isValid", "false");
            targetElement.setAttribute("message", message);
          } else {
            targetElement.setAttribute("isValid", "true");
            if (targetElement.getAttribute("message")) {
              targetElement.removeAttribute("message");
            }
          }
        }
        bcdui.factory.objectRegistry.getObject(this.targetModelId).fire();
      }
    }
});

// initialize pageEffects (if used)
bcdui.core.ready(function(){
  bcdui.widget.pageEffects.init();
});
