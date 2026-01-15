/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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
 * A namespace for the BCD-UI widgets.
 * @namespace bcdui.widget
 */
jQuery.extend(bcdui.widget,
/**  @lends bcdui.widget */
{
  /**
   * well known html dom events, which are fired by widgets at given circumstances,
   * these events are fired by widgets using jQuery.trigger() and can be consumed by
   * jQuery.on(). Values: writeValueToModel
   * @readonly
   * @enum {string}
   */
  events : {
    /**
     * a GUI value is written to model, this equals to .onchange() on html controls
     */
    writeValueToModel : "bcdui.widget.event.writeValueToModel"
  },

  /**
   * Creates a field where the user can enter a value or select it from a list of pre-defined values.
   * These values are copied to a target model under a specified
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
   * @param {xPath}         [args.optionsModelRelativeValueXPath] xPath expression relative to 'optionsModelXPath' providing values for options to display, if this is defined, values referenced by optionsModelXPath are treated as captions. Wins over @caption and @ignoreCaption param.
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
   * @param {boolean}       [args.enableNavPath]                  Set to true if widget should not be added to navpath handling.
   * @param {boolean}       [args.isPassword]                     If true, input element type will be 'password'.
   * @param {string}        [args.label]                          If provided, renders label element to this input
   * @param {boolean}       [args.hideWildcardChar]               If true, no asterisk characters are shown
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
          widgetCaption: args.widgetCaption,
          enableNavPath: args.enableNavPath,
          isPassword: args.isPassword,
          label: args.label,
          hideWildcardChar: args.hideWildcardChar
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
   * @param {writableModelXPath} args.targetModelXPath            The targetModelXPath for the dimensionChooser acts slightly different than for other widgets. The path points a node which will hold the value for the selected level. The widget builds up filter expressions automatically, so your targetXPath doesn't need any f:Expression statements, e.g. /guiStatus:Status/guiStatus:Dimension[@id='dimensionChooser']/@value.
   * @param {targetHtmlRef} args.targetHtml                       An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
   * @param {string}        args.dimension                        Unique name to select a dimension from the dimension model (located at '/bcdui/conf/dimensions.xml'.
   * @param {string}        [args.id]                             ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
   * @param {string}        [args.url]                            The URL the model is loaded from. This URL can be extended with a compressed request document if a requestDocument parameter is provided. If omitted the WrsServlet is taken.
   * @param {string}        [args.multiSelect=false]              Make a multi selected dimension chooser. Can be 'true'|'false'|'check', 'false' is default.
   * @param {boolean}       [args.allowMixedSelect=false]         Allow heterogene selection in multi select chooser.
   * @param {string}        [args.checkBoxCaption="MultiSelect"]  Caption of checkbox to turn on and of the multiselect.
   * @param {string}        [args.clearOption=false]              If != 'false', an additional option to clear the level selection is shown in the drop-down box. If 'true' bcd_autoCompletionBox_clearOption is used for the text, otherwise this is the i18n key.
   * @param {string}        [args.clearOptionLevel=false]         See clearOption. This value is for the level selector input box only. If not specified, clearOption is used.
   * @param {string}        [args.emptyValue=false]               If != 'false', a text is displayed if no level is selected. If 'true' bcd_autoCompletionBox_emptyValue is used for the text, otherwise this is the i18n key.
   * @param {string}        [args.emptyValueLevel=false]          See emptyValue. This value is for the level selector input box only. If not specified, emptyValue is used.
   * @param {boolean}       [args.mandatory=false]                An empty value is invalid if this parameters sets to true. Default is false.
   * @param {boolean}       [args.useCaptions=false]              If true, the chooser will receive captions and codes. By convention the bref of the captions column is 'bRef'_caption. By default no captions are created.
   * @param {string}        [args.widgetCaption]                  A caption which is used as prefix for navPath generation for this widget.
   * @param {string}        [args.configurationModelId]           ModelId of chooser configuration xml file. This model can hold a per-level configuration which allows additional filtering.
   * @param {string}        [args.limitLevels]                    Space separated list of levelIds. The available levels from the dimensions model get limited to this subset.
   * @param {boolean}       [args.enableNavPath]                  Set to true if widget should not be added to navpath handling.
   * @param {string}        [args.label]                          If provided, renders label element to this input
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
   *   &lt;Level id="group" wildcard="startswith" serverSideOptionsModelFilter="true" hideWildcardChar="true"/&gt;
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
          limitLevels: args.limitLevels,
          enableNavPath: args.enableNavPath,
          label: args.label
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
   * @param {boolean}       [args.enableNavPath]                  Set to true if widget should not be added to navpath handling.
   * @param {string}        [args.label]                          If provided, renders label element to this widget
   * @param {string}        [args.skin="radio"]                   Decide between radio or panel skin.
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
          widgetCaption: args.widgetCaption,
          enableNavPath: args.enableNavPath,
          label :args.label,
          skin: args.skin || "radio"
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
   * @param {writableModelXPath}  args.targetModelXPath           The xPath pointing to the root-node this input widget will place entered selected items into. The underlying XML format of data written is implemented by individual widget. If pointing into a Wrs, it switches to Wrs mode, i.e. the wrs:R will be marked as modified, target node will not be deleted. If you specify a targetmodelxpath, the box automatically acts as target. Keep in mind when specifying a targetModelXPath for the multiSelect, you should use a f:Or in your expression. For example: /guiStatus:Status/f:Filter/f:Or/f:Expression[@bRef='country' and @op='=']/@value.
   * @param {targetHtmlRef} args.targetHtml                       An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
   * @param {modelXPath}    args.optionsModelXPath                xPath pointing to an absolute xpath (starts with $model/..) providing a node-set of available options to display; especially this one supports cross references between models, i.e. $options / * / Value[@id = $guiStatus / * / MasterValue]
   * @param {string}        [args.id]                             ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
   * @param {string}        [args.optionsModelRelativeValueXPath] xPath expression relative to 'optionsModelXPath' providing values for options to display, if this is defined, values referenced by optionsModelXPath are treated as captions. Wins over @caption and @ignoreCaption param.
   * @param {string}        [args.delimiter]                      If defined, will switch to delimiter-based storing, i.e. multiple values will be written into one DOM node and separated by given delimiter.
   * @param {integer}       [args.visibleSize]                    Number of visible elements in list.
   * @param {boolean}       [args.isCheckBox=false]               Use checkbox html element instead of multiselect.
   * @param {boolean}       [args.keepEmptyValueExpression=false] A flag that can be set to 'true' if the target node should not be removed as soon as the value is empty.
   * @param {string}        [args.widgetCaption]                  A caption which is used as prefix for navPath generation for this widget.
   * @param {boolean}       [args.enableNavPath]                  Set to true if widget should not be added to navpath handling.
   * @param {boolean}       [args.doSortOptions=false]            Set to true if widget should sort options.
   * @param {string}        [args.label]                          If provided, renders label element to this input, unless args.isCheckBox = true
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
          widgetCaption:            args.widgetCaption,
          enableNavPath:           args.enableNavPath,
          doSortOptions:            args.doSortOptions || "false",
          label :                   !args.isCheckBox ? args.label : null
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
   * @param {writableModelXPath} args.targetModelXPath          Unless you don't use the useSimpleXPath option, this targetModelXPath acts slightly different than for other widgets. You only define a root node like '/guiStatus:Status/f:Filter/f:And[@id='period']' here. The period chooser places its f:Expression elements below this given rootnode automatically. The number of expressions and how they are added depends on periodChooser settings (e.g. a range or writing mo/yr instead of yyyy-mm-dd etc.)
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
   * @param {string}        [args.useSimpleXPath=false]         Set this to true if you want a minimal periodchooser setup (only day selectable via popcalendar) which only writes an ISO date to an XPath which you provide (not a complex one in normal mode).
   * @param {string}        [args.autoPopup=false]              Set this to true if the popup calendar should appear after creation.
   * @param {string}        [args.suppressButtons=false]        Set this to true if from and to buttons should be hidden. Default is false.
   * @param {boolean}       [args.enableNavPath]                Set to true if widget should not be added to navpath handling.
   * @param {boolean}       [args.showClearButton]              Set this to true if you need one clear button which removes the currently set date.
   * @param {string}        [args.label]                        If provided, renders label element to this periodchooser.
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
        , widgetCaption:          args.widgetCaption
        , useSimpleXPath:         args.useSimpleXPath
        , autoPopup:              args.autoPopup
        , suppressButtons:        args.suppressButtons
        , enableNavPath:          args.enableNavPath
        , showClearButton:        args.showClearButton
        , label:                  args.label
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
   * @param {string}        [args.skipValidationCaption="Skip check of values"] Caption to be shown for skipping validation. Default is 'Skip check of values'.
   * @param {boolean}       [args.skipServerSidedFunctions=false] Set to true to disable usage of server sided functions like CntDist. Default is false.
   * @param {string}        [args.widgetCaption]                  A caption which is used as prefix for navPath generation for this widget.
   * @param {boolean}       [args.enableNavPath]                  Set to true if widget should not be added to navpath handling.
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
          , enableNavPath: args.enableNavPath
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
     * @param {string} value
     * @private
     */

   _escapeText: function( targetXpath,value ){
     if (value == null ) return null;
      if ( targetXpath.match("/@\\w+$")){
          return value.replace(/</g, '&lt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
       }else{
         return value.replace(/</g, '&lt;');
       }
    },
    
    /**
     * @param {string} value
     * @private
     */
    _unescapeText: function( targetXpath, value){
      if (value == null ) return null;
      if (targetXpath.match("/@\\w+$")){
        return value.replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
     }else{
       return value.replace(/&lt;/g, "<");
     }
    },
    /**
     * @param {bcdui.core.DataProvider} targetModel
     * @param {string} targetModelXPath
     * @param {string} value
     * @param {boolean} [keepEmptyValueExpression]
     * @param {func} cbBeforeCommit func to execute before commit
     * @private
     * @return {boolean} true in case the target document was changed
     */
    _copyDataFromHTMLElementToTargetModel: function( targetModel, targetModelXPath, value,  keepEmptyValueExpression, isRadio, cbBeforeCommit){
      return bcdui.widget._copyDataAndCaptionFromHTMLElementToTargetModel( targetModel, targetModelXPath, value, null, keepEmptyValueExpression, isRadio, cbBeforeCommit );
    },

  /**
   * @private
   * @param {bcdui.core.DataProvider} targetModel
   * @param {bcdui.core.DataProvider} targetModelXPath
   * @param {string} value
   * @param {string} caption
   * @param {boolean} [keepEmptyValueExpression]
   * @param {func} cbBeforeCommit - func to execute before commit
   * @return {boolean} true in case the target document was changed
   */
  _copyDataAndCaptionFromHTMLElementToTargetModel: function(targetModel, targetModelXPath,  value,  caption, keepEmptyValueExpression, isRadio, cbBeforeCommit)
    {
      // In a wrs model, switch wrs:R to wrs:M
      var isWrsModel = (targetModel.getData().selectSingleNode("/wrs:Wrs") != null ? true:false);
      if(isWrsModel && !value)value=null; // in WRS case we handle empty value as being null

      // Do nothing if unchanged
      if (value == bcdui.widget._getDataFromXML(targetModel, targetModelXPath)){
        return;
      }
      var oNode = targetModel.getData().selectSingleNode(targetModelXPath);
      if( isWrsModel && oNode != null && (oNode.parentNode.localName||oNode.parentNode.baseName) != "M"){// rename to WRS modify row
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
            var expressionMatcher = keepEmptyValueExpression ? null : targetModelXPath.match("(.*/f:Expression[^/]*)/@\\w+");
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
   * @param {XmlNode} originNode
   * @param {Model} targetModel
   * @private
   */
  _renameToModifiedRow:function( originNode, targetModel){
    if((originNode.parentNode.localName||originNode.parentNode.baseName) != "I"){
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
  * Enumeration with modalBox types. Values: ok | ‚warning | error | plainText
  * @readonly
  * @enum {number}
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
      if (typeof args.resizable == 'undefined')
        args.resizable = false;

      var text = "";
      if (args.modalBoxType == bcdui.widget.modalBoxTypes.plainText)
        text = args.message;
      else if (args.modalBoxType == bcdui.widget.modalBoxTypes.ok)
        text = '<div class="bcdModalMessage" ><div class="bcdSuccess"><center><b>' + args.message + '</b></center><div class="bcdButton"><a class="action" id="MB_OkButton"> OK </a></div></div></div>';
      else if (args.modalBoxType == bcdui.widget.modalBoxTypes.warning)
        text = '<div class="bcdModalMessage" ><div class="bcdWarning"><center><b>' + args.message + '</b></center><div class="bcdButton"><a class="action" id="MB_WarningButton"> OK </a></div></div></div>';
      else if (args.modalBoxType == bcdui.widget.modalBoxTypes.error)
        text = '<div class="bcdModalMessage" ><div class="bcdError"><center><b>' + args.message + '</b></center><div class="bcdButton"><a class="action" id="MB_ErrorButton"> OK </a></div></div></div>';

      // take over either created html text or prepared html via id
      bcdui.util.getSingletonElement("bcdModalBoxDiv")
      .empty()
      .append(typeof args.htmlElementId != "undefined" ? jQuery("#" + args.htmlElementId) : text)
      .dialog( {
            width: args.width
          , height: args.height
          , minWidth: 50
          , minHeight: 50
          , modal: true
          , closeOnEscape: true
          , position: args.position
          , resizable: args.resizable
          , draggable: true
          , closeText: "\u2716"
          , title: args.title
          , open: function() {
            
            jQuery("#bcdModalBoxDiv").find("a.action").off("click");
            jQuery("#bcdModalBoxDiv").find("a.action").on("click", bcdui.widget.hideModalBox);

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
              bcdui.util._executeJsFunctionFromString(args.onclick);
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
   * @param {string|chainDef}        [args.rendererUrl]          URL to XSLT stylesheet that renders the model or chain definition; default is "/bcdui/js/widget/menu/menu.xslt"
   * @param {string}        [args.menuId]               Optional menuId to use one specific menu out of the available ones. If not available, the default one is used.
   * 
   */
  createMenu: function(args)
    {
      args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createMenu_args );
      args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "menu_");
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createMenu_args);

      // Set default parametrs
      if((!args.menuHandlerClassName || args.menuHandlerClassName == "") && bcdui.config.settings.bcdui.legacyTheme === true){
          args.menuHandlerClassName = "bcdui.widget.menu.Menu";
      }
      if(!args.modelUrl ||args.modelUrl == ""){
          args.modelUrl = bcdui.contextPath+"/bcdui/servlets/Menu" + (args.menuId ? "?menuId=" + args.menuId : "");
      }

      var _modelIdOrModelRef = (typeof args.modelId != "undefined" && args.modelId != null) ? args.modelId : bcdui.factory.createModel({url:args.modelUrl});
      var actualIdPrefix = typeof args.id == "undefined" || args.id == null ? bcdui.factory.objectRegistry.generateTemporaryIdInScope("menu_") : args.id;
      var _rendererUrl = (typeof args.rendererUrl != "undefined" && args.rendererUrl != null && args.rendererUrl != "") ? args.rendererUrl : "/bcdui/js/widget/menu/menu.xslt";
      var menuRootElementId = (actualIdPrefix + "RendererMenuRoot");

      var _rendererRefId = "bcdRenderer_" + actualIdPrefix;
      var _menuHandlerClassName = args.menuHandlerClassName;
      var _menuRootElementId = (args.menuRootElementId)?args.menuRootElementId:menuRootElementId;
      var _menuHandlerVarName = (args.id) ? args.id : _rendererRefId + "MenuHandler";

      if (!args.parameters) {
        args.parameters = {};
      }
      args.parameters.contextPath = bcdui.contextPath;
      args.parameters.rootElementId = menuRootElementId;
      
      // provide the cleaned current location to the renderer to path-find and highlight the currently used menu item
      // it automatically includes the url parameter bcdPageId in the comparism
      // renderer attribute "bcdPageId" can be used to overwrite the default value of "bcdPageId"
      var loc = bcdui.contextPath != ""
      ? window.location.href.substring(window.location.href.indexOf(bcdui.contextPath + "/") + bcdui.contextPath.length + 1)
      : window.location.href.substring(window.location.href.indexOf("//") + 2).substring(window.location.href.substring(window.location.href.indexOf("//") + 2).indexOf("/") + 1);
      var cleanLoc = "/" + (loc.indexOf("?") != -1 ? loc.substring(0, loc.indexOf("?")) : loc);

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
      args.parameters.legacyTheme = "" + (bcdui.config.settings.bcdui.legacyTheme === true);

      bcdui.factory.objectRegistry.withReadyObjects(_modelIdOrModelRef, function() {
        var renderer = new bcdui.core.Renderer({
            chain: typeof _rendererUrl == "string" ? bcdui.util.url.resolveToFullURLPathWithCurrentURL(_rendererUrl) : _rendererUrl
          , inputModel: bcdui.factory.objectRegistry.getObject(_modelIdOrModelRef)
          , parameters: args.parameters
          , targetHtml: args.targetHtml
        });
        renderer.onceReady(function() {

          jQuery("#" + args.targetHtml + " .isClickable").off("click");
          jQuery("#" + args.targetHtml + " .isClickable").on("click", function(event) {
            const bcdAction = jQuery(event.target).attr("bcdAction") || "";
            if (bcdAction != "")
              bcdui.util._executeJsFunctionFromString(bcdAction);
          });

          jQuery("#" + args.targetHtml + " .bcdMenu").show();
          if (_menuHandlerClassName) {
            const o = bcdui.util._getJsObjectFromString(_menuHandlerClassName);
            window[_menuHandlerVarName] = new o({
              name: _menuHandlerVarName
            , customConfigFunction: function configMenu(){this.closeDelayTime = 300;}
            , rootIdOrElement: _menuRootElementId
            });
          }
        });
      });
    },

    /**
     * Creates credential menu
     * @param {Object}        args                      The parameter map contains the following properties.
     * @param {targetHtmlRef} args.targetHtml           An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
     * @param {string}        [args.modelId]            id of model holding custom model definition. If not provided, a standard one with just logout is created.
     * @param {string}        [args.userName]           string to use as the username, by default it takes bcdui.config.userName
     * 
     */
    createCredentialsMenu: function(args)
      {
        jQuery(args.targetHtml).addClass("bcd__header__credentials-widget");
        var modelId = args.modelId;
        if (!modelId) {
          var model = new bcdui.core.StaticModel("<Menu xmlns='http://www.businesscode.de/schema/bcdui/menu-1.0.0'><Entry caption='User'><Entry id='logout' caption='Logout' href='/logout'/></Entry></Menu>");
          bcdui.factory.objectRegistry.registerObject(model);
          modelId = model.id;
        }
        var menuArgs = {
          targetHtml: args.targetHtml
        , modelId: modelId
          , parameters: {
            isCredentialMenu: true
          , userName: args.userName || bcdui.config.userName
          , userEmail: args.userEmail || bcdui.config.userEmail
          , userLogin: args.userLogin || bcdui.config.userLogin
          }
        }
        bcdui.widget.createMenu(menuArgs);
      },

    /**
     * extracts unique model names from modelXPath, including $ tokens
     *
     * @return {Array<bcdui.core.DataProvider>} Array with models or null
     * @private
     */
    _extractModelsFromModelXPath : function(modelXPath){
      var models = modelXPath.match(/[$][a-zA-Z_]{1}[a-zA-Z0-9_]*/g);
      return models ? models.reduce(function(a, b) { if(a.indexOf(b)===-1) a.push(b); return a; }, []) : null;
    },

    /**
     * @param models - an array of unique model names with $ tokens, i.e [$guiStatus,$referenceModel]
     * @param {Array} config is an array of:
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

      const bcdMemo = {
        id: bcdui.factory.objectRegistry.generateTemporaryIdInScope("wrapModel_")
      , idRef: config.optionsModelId
      , element: config.element
      };

      bcdui.factory.addDataListener({
          id: bcdMemo.id
        , idRef: bcdMemo.idRef
        , listener: function(memo) {
            // in case of a given html element, check if this is still connected to DOM, if not, kill listener
            if (memo.element && jQuery(memo.element).closest("body").length == 0)
              bcdui.factory.removeDataListener({idRef: memo.idRef, id: memo.id})

            var dW = bcdui.factory.objectRegistry.getObject(dependencyWrapperId);
            if( dW && dW.getStatus()==dW.getReadyStatus())
              dW.execute(true);
        }.bind(this, bcdMemo)
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
            const bcdMemo = {
              id: bcdui.factory.objectRegistry.generateTemporaryIdInScope("wrapModel_")
            , idRef: modelId
            , element: config.element
            };
            bcdui.factory.addDataListener({
              id : bcdMemo.id
            , idRef: bcdMemo.idRef
            , trackingXPath: p
            , listener: function(memo) {
                // in case of a given html element, check if this is still connected to DOM, if not, kill listener
                if (memo.element && jQuery(memo.element).closest("body").length == 0)
                  bcdui.factory.removeDataListener({idRef: memo.idRef, id: memo.id})

                var dW = bcdui.factory.objectRegistry.getObject(dependencyWrapperId);
                if( dW && dW.getStatus()==dW.getReadyStatus())
                  dW.execute(true);
              }.bind(this, bcdMemo)
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
    * @param {string} htmlElementId
    * @param {string} caption
    * @private
    */
   _getValueOfCaption: function( htmlElementId, caption)
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
       var optionsModel = bcdui.factory.objectRegistry.getObject(optionsModelId);

       // case insensitive/trim check
       var xPath1 = optionsModelXPath + "[normalize-space(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\"', 'abcdefghijklmnopqrstuvwxyz')) = normalize-space(translate(\"" + v + "\", 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'))]/" + optionsModelRelativeValueXPath;
       var result1 = bcdui.widget._getDataFromXML(optionsModel, xPath1);
       // exact match
       var xPath2 = optionsModelXPath + "[. = \"" + v + "\"]/" + optionsModelRelativeValueXPath;
       var result2 = bcdui.widget._getDataFromXML(optionsModel, xPath2);

       // prefer perfect match
       return result2 || result1;
     },

     /**
      * @private
      * @param {string} htmlElementId
      * @return an 2dim array containining caption/value array or NULL if no caption mapping available (i.e. values=caption), the array is of items with size 2
      */
     _getCaptionValueArray: function(htmlElementId)
     {
       var htmlElement = document.getElementById(htmlElementId);

       // return if element is gone
       if (! htmlElement) return null;

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
    * @param {string} htmlElementId
    * @param {string} value
    * @private
    */
   _getCaptionOfValue: function( htmlElementId, value)
     {
       if (typeof value == "undefined" || value == null || !value.trim()) return "";

       var htmlElement = document.getElementById(htmlElementId);
       var optionsModelId = htmlElement.getAttribute("bcdOptionsModelId");
       var optionsModelXPath = htmlElement.getAttribute("bcdOptionsModelXPath");
       var optionsModelRelativeValueXPath = htmlElement.getAttribute("bcdOptionsModelRelativeValueXPath");

       if (optionsModelId == null || !optionsModelId.trim() ||
           optionsModelXPath == null || !optionsModelXPath.trim() )
         return value;

       // The caption can be the value or an explicit caption.
       // result is null, if value is not found at all in the options model
       var searchXPath = optionsModelRelativeValueXPath || ".";
       var optionsModel = bcdui.factory.objectRegistry.getObject(optionsModelId);
       var xPath = optionsModelXPath + "[" + searchXPath + " = \"" + value + "\"]";
       var result = bcdui.widget._getDataFromXML(optionsModel, xPath);
       return result;
     },

     /**
      * @private
      * @param {string} htmlElementId
      * @param {string} value
      * @return {string} String The input-value if found in optsionModel or if no options model is given (==all values allowed), otherwise an empty string
      */
     _findValueInOptionsModel: function( htmlElementId, value)
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
    * @param {string}        args.defElementId          Html element id where tabs are defined.
    * @param {string}        [args.args.id]             ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
    * @param {string}        [args.handlerJsClassName]  Own JS class name to handler click action on tab.
    * @param {string}        [args.rendererUrl]         URL to own renderer.
    * @param {boolean}       [args.isPersistent=false]  Set this to true to make the tab selection persistent.
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
       setTimeout(function() {
         var defElement = document.getElementById(args.defElementId);
         if (defElement) {
           bcdui._migPjs._$(defElement).addClass("bcdTabDefinition");
         }
         args.idOrElement = args.defElementId;
         bcdui.widget.tab.init(args);
       });
     },

   /**
    * Creates a BlindUpDown Area.
    * @param {Object}        args                         The parameter map contains the following properties.
    * @param {targetHtmlRef} args.targetHtml              An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
    * @param {string}        [args.id]                    ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
    * @param {string}        [args.caption]               Caption shown in the blindUpDown Header.
    * @param {string}        [args.defaultState="closed"] 'closed' or empty String for opened, default is closed.
    * @param {number}        [args.duration=0.2]          The duration of the blind effect, valid values are from 0 to 1.0 as decimal.
    * @param {writableModelXPath} [args.targetModelXPath="$guiStatus/guiStatus:Status/guiStatus:ClientSettings/BlindUpDown"]  The xPath pointing to the root-node this input widget will place entered selected items into. with attribute status=open/closed
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

      if (args.caption.length > 1 && args.caption[0] === bcdui.i18n.TAG)
        args.caption = bcdui.i18n.syncTranslateFormatMessage({msgid: args.caption.substring(1)});

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

          // in case of a custom element, we take its body (not itself since this would end in a recusion). If no body is avaialble, an empty div is created
          if (typeof args.bodyIdOrElement == "object" && args.bodyIdOrElement.nodeName == "BCD-BLINDUPDOWNAREA") {
            if (jQuery(args.bodyIdOrElement).children().length == 0)
              jQuery(args.bodyIdOrElement).append("<div></div>");
            args.bodyIdOrElement = jQuery(args.bodyIdOrElement).children().first().get(0);
          }

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
   * @param {HtmlElement} baseElement
   * @private
   */
  _computeRowAndColIdents: function(baseElement)
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
      if (jQuery(td).closest("thead").length > 0) {
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
   * @param {string} args.tooltipRendererId The renderer responsible
   *          for generating the tooltip content. When the "tableMode" parameter
   *          is true this renderer will get two additional parameters "bcdRowIdent"
   *          and "bcdColIdent". These parameters come from the table cell the mouse
   *          is placed over in the targetRenderer.
   * @param {HtmlElement} args.targetHtmlElement The HtmlElement we are attached to.
   * @param  {string} [args.filter] An optional filter on the tag name where the
   *          tooltip should appear. In "tableMode" it is recommended to set it
   *          on "td" or "th|td".
   * @param {boolean} [args.tableMode] This flag can be set to "true" if the "bcdRowIdent"
   *          and "bcdColIdent" parameters should be extracted from the HTML and added
   *          as parameters on the tooltipRenderer.
   * @param {integer} [args.delay] The delay in Milliseconds that the tooltip should wait
   *          before it appears.
   * @param {integer} [args.offset] Offset value which is used to position the tooltip
   *          relatively to the mouse pointer, if not given it's determined automatically
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
        , offset: args.offset
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
              // We do not want get into conflict with the context menu or grid input
              if( jQuery("#bcdContextMenuDiv").is(":visible") || jQuery(".bcdGridEditor").length > 0) {
                isVisible = false;
                return;
              }
              // don't show tooltip if a table header filter tooltip is currently displayed (unless we show another table header filter)
              if (! jQuery(e.target).parent().hasClass("bcdFilterContainer") && jQuery("#bcdTooltipDiv").is(":visible") && jQuery(".bcdFilterTooltip").length > 0) {
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
   * Finds the inner most occurrence of an attribute
   * starting at the startElement following its anchestor axis to maximal endElement
   * @param {HtmlElement} startElement
   * @param {string} attrName
   * @param {HtmlElement} endElement
   * @return {string} value of the attribute, null if attribute was not found
   * @private
   */
  _findAttribute: function( startElement, attrName,  endElement)
    {
      var _endElement = endElement || null;
      while (startElement != null && !startElement.documentElement) {
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
   * @param args The parameter map
   * @param {string|bcdui.core.DataProvider} args.contextMenuRendererId The renderer responsible
   *          for generating the context menu. Usually the HTML rendering is done
   *          by the default contextMenu.xslt stylesheet.
   * @param {string|bcdui.core.DataProvider} args.targetHtmlElement The renderer the context menu is to be attached to. (or give targetRendererId)</li>
   * @param {boolean} [args.tableMode] This flag can be set to "true" if the "bcdRowIdent"
   *          and "bcdColIdent" parameters should be extracted from the HTML.
   * @param {integer} [args.offset] Offset value which is used to position the contextMenu
   *          relatively to the mouse pointer, if not given it's determined automatically
   * @param {function} args.clickResolver function which is able to parse data-bcd-action tokens to run javascript actions
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
            , offset: args.offset
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

        if (args.clickResolver)
          jQuery("#bcdContextMenuDiv").data("clickResolver", args.clickResolver);
        else
          jQuery("#bcdContextMenuDiv").removeData("clickResolver");

        // mark event target html element with an id
        var id = bcdui._migPjs._$(config.event.target).get(0).id || bcdui.factory.objectRegistry.generateTemporaryId();
        bcdui._migPjs._$(config.event.target).get(0).id = id;
        bcdui._migPjs._$(config.htmlElement).attr("bcdEventSourceElementId", id);

        renderer.addDataProvider(new bcdui.core.ConstantDataProvider({
          name: "contextId",
          value: config.event.findAttribute("contextId") || ""
        }));

        if (args.refreshMenuModel){
          renderer.getPrimaryModel().execute();
        }

        // Context menu wins over tooltip.
        jQuery("#bcdTooltipDiv").hide();
        reDisplay();
      };

      bcdui._migPjs._$(config.baseElement).on("contextmenu", function(event) {
        event.stopPropagation();
        event.preventDefault();
        handler(event);
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
   * @param {bcdui.core.DataProvider} [args.targetRenderer] The renderer the tooltip is attached to. The HTML listeners are placed on the targetHtml of this renderer. 
   * @param {string}         [args.id]                ID of the Executable object which renders this widget this must be UNIQUE and MUST NOT have same names as any global JavaScript variable. If not given, an auto-id is generated.
   * @param {boolean}        [args.refreshMenuModel=false]  This flag can be set to 'true' if the menu model needs to be executed always. Needs to be true, if the menu depends on the position in a table, i.e. technically on bcdColIdent and bcdRowIdent.
   * @param {string}         [args.url]               This parameter can be set when you only want to apply one single XSLT style sheet. It contains the URL pointing to it. If this parameter is set no nested 'chain' tag must be provided; provided XSLT must produce HTML.
   * @param {string}         [args.identsWithin]      Id of an element. If given bcdColIdent and bcdRowIdent are set to the innermost values given between the event source and the element given here. bcdRow/ColIdent do not need to be set at the same element.
   * @param {boolean}        [args.tableMode=false]   This flag can be set to 'true' if the 'bcdRowIdent' and 'bcdColIdent' parameters should be extracted from the HTML and added as parameters on the tooltipRenderer. They are derived from 'bcdRowIdent' and 'bcdColIdent' attributes of tr rows and header columns (td or th).
   * @param {targetHtmlRef}  [args.targetHtml]        The HTML listeners are placed on this Element instead of the targetHtml of the given targetRendererId.
   * @param {function|string} [args.clickResolver]    String (representing a function name) or function which handles the click events of the contextMenu
   */
  createContextMenu: function(args){

    args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.widget._schema_createContextMenu_args );
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.widget._schema_createContextMenu_args);

    let clickResolver = args.clickResolver;
    if (typeof clickResolver == "string")
      clickResolver = bcdui.util._toJsFunction(clickResolver);

    if (args.targetHtml) {
      var targetId = bcdui.util._getTargetHtml({targetHtml: args.targetHtml}, "bcdContextMenu_");
      args.targetHtmlElement = jQuery("#" + targetId);
    }
    
    // Set default parametrs
    if(!args.tableMode ||args.tableMode == ""){
      args.tableMode = false;
    }

    if (!args.targetRendererId && args.targetRenderer) {
      args.targetRendererId = args.targetRenderer.id;
      if (typeof bcdui.factory.objectRegistry.getObject(args.targetRendererId) == "undefined")
        bcdui.factory.objectRegistry.registerObject(args.targetRendererId);
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
          , offset               : args.offset
          , clickResolver        : clickResolver
        });
      }
    });

    return bcdui.factory._generateSymbolicLink(args);
  },

  /**
   * Generates a tooltip for another renderer. 
   * @param {Object}         args                       The parameter map contains the following properties.
   * @param {string}         [args.targetRendererId]    The renderer the tooltip is attached to. The HTML listeners are placed on the targetHtml of this renderer. If 'tableMode' is set to 'true' the renderer is expected to render an HTML table with the appropriate 'bcdRowIdent/bcdColIdent' attributes of tr rows header columns.
   * @param {bcdui.core.DataProvider} [args.targetRenderer] The renderer the tooltip is attached to. The HTML listeners are placed on the targetHtml of this renderer. If 'tableMode' is set to 'true' the renderer is expected to render an HTML table with the appropriate 'bcdRowIdent/bcdColIdent' attributes of tr rows header columns. 
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

    if (!args.targetRendererId && args.targetRenderer) {
      args.targetRendererId = args.targetRenderer.id;
      if (typeof bcdui.factory.objectRegistry.getObject(args.targetRendererId) == "undefined")
        bcdui.factory.objectRegistry.registerObject(args.targetRendererId);
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
      bcdui.util.getSingletonElement("bcdTooltipDiv");
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
          , offset            : args.offset
        });
      }
    });

    return bcdui.factory._generateSymbolicLink(args);
  },

  /**
   * Helper function, assuring bcdOptionsModelId, bcdOptionsModelXPath, bcdTargetModelId and bcdTargetModelXPath
   * are set, they may be derived from the xxXPath attributed when using $midelId/xPath syntax
   * @param {Object} args The parameter map
   * @param args.htmlElement: (HTMLElement) htmlTargetElement to work on
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
   * @param args The parameter map
   * @param {HtmlElement} args.htmlElement htmlTargetElement to work on
   * @param {function} args.onMandatoryChanged the callback function - will be called on mandatory changed
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
     * @param {bcdui.core.DataProvider} targetModel
     * @param {string} targetModelXPath
     * @return {string} - the calculated @mandatory xPath
     *
     * @private
     */
    _getMandatoryXPath: function( targetModel,  targetModelXPath) {
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
     * @param {DomDocument} doc The XML document.
     * @returns {boolean} True in WRS mode.
     * @private
     */
    _isWrs: function(doc)
      {
        return doc.selectSingleNode("/wrs:Wrs") != null;
      },

    /**
     * Extracts and returns the row and column indexes from WRS xpath.
     * @param {bcdui.core.DataProvider} targetModel The target model.
     * @param {string} targetModelXPath The XPath in whole XML model data.
     * @return {Object} The map contains the following properties:
     * <ul>
     *   <li>row: {integer} Row index.</li>
     *   <li>col: {integer} Column index.</li>
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
   * @param {Event} event
   * @param {bcdui.core.DataProvider} renderer
   * @param {HtmlElement} targetElement
   * @private
   */
  _setIdents: function(event, renderer, targetElement)
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
        var offset = args.offset || (args.positionUnderMouse ? -10 : 3);
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
     *
     * @param el - htmlElement of the pagingPanel table calling this via bcdOnLoad
     * @private
     */
    _pagingPanelInit : function() {
      const el = this;
      jQuery(el).off("click");
      jQuery(el).on("click", ".bcdPagingButton", function(event) {
        const targetModelId = jQuery(event.target).attr("targetModelId") || "";
        const targetModelXPath = jQuery(event.target).attr("targetModelXPath") || "";
        const delta = jQuery(event.target).attr("delta") || "";
        const currentPage = jQuery(event.target).attr("currentPage") || "";
        const lastPage = jQuery(event.target).attr("lastPage") || "";
        const elementId = jQuery(event.target).attr("elementId") || "";
        const paginatedAction = jQuery(event.target).attr("paginatedAction") || "";
        if (targetModelId != "" && targetModelXPath !="" && delta != "" && currentPage != "" && lastPage != "" && elementId != "") {
          bcdui.widget._pagingPanelChangePageNum({
            targetModelId: targetModelId
          , targetModelXPath: targetModelXPath
          , delta: parseInt(delta, 10)
          , currentPage: currentPage
          , lastPage: parseInt(lastPage, 10)
          , elementId: elementId
          });
          if (paginatedAction)
            bcdui.util._executeJsFunctionFromString();
        }
      });
      jQuery(el).off("change");
      jQuery(el).on("change", "select", function(event) {
        const targetModelId = jQuery(event.target).attr("targetModelId") || "";
        const targetModelXPath = jQuery(event.target).attr("targetModelXPath") || "";
        const paginatedAction = jQuery(event.target).attr("paginatedAction") || "";
        if (targetModelId != "" && targetModelXPath !="") {
          const val = event.target.value;
          bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(targetModelId).dataDoc, targetModelXPath).text = val;
          for (let i = 0; i < this.options.length; i++ )
            if (this.options[i].value == val)
              this.options[i].selected = 'selected';
          bcdui.factory.objectRegistry.getObject(targetModelId).fire();
          if (paginatedAction)
            bcdui.util._executeJsFunctionFromString(paginatedAction);
        }
      });
    },

    /**
     *
     * @param args
     * @param args.targetModelId
     * @param args.targetModelXPath
     * @param args.delta
     * @param args.lastPage
     * @param args.currentPage
     * @param args.elementId
     * @param args.fn
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
     * injectFilter in table
     * @param {Object}        args                                        The parameter map contains the following properties.
     * @param {HtmlElement}   args.tableElement                           The HTML Table Element which you want to use for injection
     * @param {writableModelXPath}  args.targetModelXPath                 The xPath pointing to the root-node this widget will place entered selected items into
     * @param {bcdui.core.DataProvider}  args.inputModel                             WRS datamodel representing the table columns
     * @param {bcdui.core.DataProvider}  [args.statusModel=bcdui.wkModels.guiStatus] StatusModel where the widget will write its content to.
     * @param {boolean}       [args.useCustomHeaderRenderer=false]        Set to true when your code adds bcdFilterButton classes on its own (e.g. grid)
     * @param {function}      [args.callback]                             Function which will be executed after a change of the filters have been performed
     * @param {function}      [args.getCaptionForColumnValue]             Function (colIdx, colValue) which returns the rendered caption for the cell. By default standard wrs @caption, wrs:references and unit/scale handling is supported already. Deprecated (prefer valueCaptionProvider parameter). 
     * @param {function}      [args.getFilteredValues]                    Function (colIdx) which needs to return a wrs:C array which holds the valid values for the current column. Use this to e.g. only show prefiltered values . Deprecated (prefer valueCaptionProvider parameter).
     * @param {function}      [args.valueCaptionProvider]                 Function (inputModel, colIdx) which needs to return a Promise which resolves with an array of objects {value, caption, isFiltered}  
     * @param {Object}        [args.columnFiltersCustomFilter]            CustomColumnFilter functions passed to column filter. columnFiltersCustomFilter is an array holding an object per bRef/column and an operations array which defines id, caption, valueCaptionProvider, filterFunction and gridFilterRowFunction
     */
    createTableHeadFilter: function(args) {
      var tableHead = jQuery(args.tableElement).find("thead");
      var statusModel = args.statusModel || bcdui.wkModels.guiStatus;
      var targetModelXPath = args.targetModelXPath;
      var callback = args.callback;
      var inputModel = args.inputModel;

      // add filter icons and determine filter state for title fly-over (or skip when customHeaderRenderer is used)
      if (args.useCustomHeaderRenderer !== true) {

        var headerRows = tableHead.find("tr").length;
        tableHead.find("th").each(function(i,e) {
          // if we have a bcdColIdent value at the column (e.g. by cube standard html builder), refer to this 
          var colId = jQuery(e).attr("bcdColIdent") || "";
          // otherwise, take a 1:1 header to column mapping (beware of multiple thead/tr though)
          colId = colId != "" ? colId : inputModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@pos='" + (i + 1) +"']/@id", "");

          // in case of a cube column dim/measure combination, we want icons at the lowest tr only but also for row dims (first tr)
          // so in case of a bcdColIdent/colId with | separator, we skip it when it's not on the last header row   
          colId = (colId != "" && colId.indexOf("|") != -1 && jQuery(e).closest("tr").index() + 1 != headerRows) ? "" : colId;

          if (colId != "") {
            jQuery(e).html("<div class='bcdFilterContainer'><div class='bcdFilterOriginal'>" + jQuery(e).html() + "</div><div bcdColIdent='" + colId + "' class='bcdFilterButton' colId='"+colId+"'></div></div>");
            if (statusModel.query(targetModelXPath + "/f:Or[@id='" + colId + "']/f:Expression") != null)
              jQuery(e).find(".bcdFilterButton").addClass("active");
          }
        });
      }

      // add tooltip on header
      bcdui.widget.createTooltip({
        filter: "div"
        , targetHtml: tableHead.get(0)
        , inputModel: statusModel
        , identsWithin: tableHead.get(0)
        , chain: function(doc, args){
            // render up to 20 values in the flyover
            jQuery("#bcdTooltipDiv").empty();
            var values = jQuery.makeArray(statusModel.queryNodes(targetModelXPath + "/f:Or[@id='" + args.bcdColIdent + "']/f:Expression")).map(function(e){ return (e.getAttribute("caption")||e.getAttribute("value"));});
            if (values.length > 20)
              values.splice(20, values.length, '...');
            var tooltip = "<div class='bcdFilterTooltip'><p bcdTranslate='bcd_widget_filter_filter'></p><ul>";
            values.forEach(function(e) {
              var inputText = (e == bcdui.core.magicChar.dimEmpty ? bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_widget_filter_emptyValue"})) : e);
              inputText = (e == "\uE0F1" ? bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_widget_filter_totalValue"})) : bcdui.util.escapeHtml(inputText));
              tooltip += "<li>" + bcdui.widget._getTooltipFilterOption(inputText) + "</li>";
            });
            tooltip += "</ul></div>";
            jQuery("#bcdTooltipDiv").append(values.length == 0 ? "" : tooltip);
            bcdui.i18n.syncTranslateHTMLElement({elementOrId: "bcdTooltipDiv"});
            return doc;
          }
      });

      // and a listener on column change which triggers re-rendering by executing the wrapper and the renderer
      if (callback) {
        var listenerId = args.inputModel.id + "_listener";
        statusModel.removeDataListener({id: listenerId});
        statusModel.onChange({id: listenerId, trackingXPath: targetModelXPath, callback: callback});
      }
      
      // add click handler to the inserted items
      tableHead.on("click", ".bcdFilterButton", {inputModel: inputModel, columnFiltersCustomFilter: args.columnFiltersCustomFilter, valueCaptionProvider: args.valueCaptionProvider, getFilteredValues: args.getFilteredValues, statusModel: statusModel, targetModelXPath: targetModelXPath, getCaptionForColumnValue: args.getCaptionForColumnValue}, function(event) {

        // disable selected grid header if column filters are within a grid
        if (jQuery(event.target).closest(".htColumnHeaders").length > 0)
          jQuery(event.target).closest(".htColumnHeaders").handsontable("getInstance").deselectCell();

        var inputModel       = event.data.inputModel;
        var getFilteredValues = event.data.getFilteredValues;
        var statusModel      = event.data.statusModel;
        var targetModelXPath = event.data.targetModelXPath;
        var getCaptionForColumnValue = event.data.getCaptionForColumnValue;
        var valueCaptionProvider = event.data.valueCaptionProvider;
        var columnFiltersCustomFilter = event.data.columnFiltersCustomFilter || [];

        var id      = jQuery(event.target).attr("colId");
        var index   = parseInt(inputModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@id='" + id + "']/@pos", "-1"), 10);
        var caption = inputModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@id='" + id + "']/@caption", "");
        var scale   = inputModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@id='" + id + "']/@scale", "0");
        var unit    = inputModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@id='" + id + "']/@unit", "");
        var useRefs = inputModel.query("/*/wrs:Header/wrs:Columns/wrs:C[@id='" + id + "']/wrs:References/wrs:Wrs/wrs:Data/wrs:R") != null;

        // if we got an i18n caption, translate it
        if (caption.indexOf(bcdui.i18n.TAG) == 0) {
          caption = bcdui.i18n.syncTranslateFormatMessage({msgid: caption});
        }

        var rootXPath         = targetModelXPath + "/f:Or[@id='" + id + "']";
        var selectedCondition = statusModel.read(rootXPath + "/@condition", "contains");
        var selectedInput     = " value='" + statusModel.read(rootXPath + "/@value", "") + "'";

        // i18n key translate
        if (caption.indexOf(bcdui.i18n.TAG) == 0)
          caption = bcdui.i18n.syncTranslateFormatMessage({msgid: caption});
        var title     = bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_widget_filter_filterFor"}) + ": " + caption;

        // build multi select options
        var typeName = inputModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@id='" + id + "']/@type-name", "");
        var isNumeric = typeName == "INTEGER" || typeName == "NUMERIC" || typeName == "DECIMAL";

        var defaultProvider = function(inputModel, colIdx){
          return new Promise(function(resolve, reject) {
          // get set of filtered values
            var filteredValues = (getFilteredValues ? getFilteredValues(index) : jQuery.makeArray(inputModel.queryNodes("/*/wrs:Data/wrs:*/wrs:C[position()='"+index+"']"))).map(function(e) {
              var isTotal = (e.getAttribute("bcdGr") || "0")  == "1";
              return isTotal? "\uE0F1" : e.text;
            });

            // get caption for values
            var values = jQuery.makeArray(inputModel.queryNodes("/*/wrs:Data/wrs:*/wrs:C[position()='"+index+"']")).map(function(e) {

              // caption is either an existing caption attribute or the node value
              var caption = (e.getAttribute("caption") || e.text);
              var isTotal = (e.getAttribute("bcdGr") || "0")  == "1";
              var value = e.text;
              var isFiltered = "" + (filteredValues.indexOf(e.text) == -1);
              isFiltered = isTotal ? "" + (filteredValues.indexOf("\uE0F1") == -1) : isFiltered;
              var isInvalid = isNaN(e.text) || e.text == "Infinity";

              if (isNumeric) {
                if (isInvalid) {
                  caption = bcdui.core.magicChar.dimEmpty;
                }
                else {
                  var scaleInt = parseInt(scale, 10);
                  if (scaleInt > 10) {
                    caption = Math.round(value / scaleInt) * scaleInt;
                  }
                  else if (scaleInt < -10) {
                    caption = Math.round(value / scaleInt) * -1;
                  }
                  else {
                    // in case of < 0, remove trailing zeros (by using parseFloat again)
                    var mul = (unit == "%") ? 100.0 : 1.0;
                    caption = scaleInt < 0 ? parseFloat((mul * parseFloat(value)).toFixed(Math.abs(scaleInt))) : (mul * parseFloat(value)).toFixed(Math.abs(scaleInt));
                  }
                  if (unit != "")
                    caption += " " + unit;
                }
              }

              // in case of reference usage, lookup caption for value
              if (useRefs) {
                var refNode = inputModel.query("/*/wrs:Header/wrs:Columns/wrs:C[@id='" + id + "']/wrs:References/wrs:Wrs/wrs:Data/wrs:R/wrs:C[position()=2 and .='{{=it[0]}}']/wrs:C[1]", [value]);
                if (refNode != null)
                  caption = refNode.text;
              }
              if (getCaptionForColumnValue) {
                caption = getCaptionForColumnValue(index, value, e.selectSingleNode("..").getAttribute("id"));
              }
              var rt = value == "" ? (bcdui.core.magicChar.dimEmpty + bcdui.core.magicChar.separator + bcdui.core.magicChar.dimEmpty + bcdui.core.magicChar.separator + isFiltered) : (value + bcdui.core.magicChar.separator + caption + bcdui.core.magicChar.separator + isFiltered);
              rt =  value == "" && isTotal ? ("\uE0F1" + bcdui.core.magicChar.separator + "\uE0F1" + bcdui.core.magicChar.separator + isFiltered) : rt;
              return rt;
            });
            values = values.filter(function(e, idx){return values.indexOf(e) == idx}); // make unique
            values = values.map(function(e) { var q = e.split(bcdui.core.magicChar.separator); return {value: q[0], caption: q[1], isFiltered: q[2] == "true"} }); // make value/caption object

            resolve(values);
          });
        };

		// build object lookup map for customProvider functions
        var customProviders = {};
        columnFiltersCustomFilter.filter(function(f) { return (f.bRef == id);}).forEach(function(e) {
          e.operations.forEach(function(o) {
          if (o.valueCaptionProvider)
            customProviders[o.id] = o.valueCaptionProvider;
          })
        });


		// determine which provider to use, either custom, valueCaptionProvider from args or the default one
        var customProviderFunction = null;
        if (customProviders && customProviders[selectedCondition])
          customProviderFunction = customProviders[selectedCondition];

        var provider = customProviderFunction? customProviderFunction : valueCaptionProvider ? valueCaptionProvider : defaultProvider;
        provider(inputModel, index).then(function(values) {

          // generate optons model for the current provider
          var multiSelectDataModel = bcdui.widget._buildFilterOptionsModel(statusModel, rootXPath, id, inputModel, index, values, useRefs);

          // filter functions
          bcdui.widget._bcdFilter = {}
          bcdui.widget._bcdFilter.contains = function(cellValue, value)   { return value == "" ? true : cellValue.toLowerCase().indexOf(value.toLowerCase()) != -1;};
          bcdui.widget._bcdFilter.endswith = function(cellValue, value)   { return value == "" ? true : cellValue.toLowerCase().endsWith(value.toLowerCase());};
          bcdui.widget._bcdFilter.startswith = function(cellValue, value) { return value == "" ? true : cellValue.toLowerCase().startsWith(value.toLowerCase());};
          bcdui.widget._bcdFilter.isequal = function(cellValue, value)    { return value == "" ? true : cellValue.toLowerCase() == value.toLowerCase();};
          bcdui.widget._bcdFilter.isnotequal = function(cellValue, value) { return value == "" ? true : cellValue.toLowerCase() != value.toLowerCase();};
          bcdui.widget._bcdFilter.isempty = function(cellValue, value)    { return value == "" ? true : cellValue == bcdui.core.magicChar.dimEmpty;};
          bcdui.widget._bcdFilter.isnotempty = function(cellValue, value) { return value == "" ? true : cellValue != bcdui.core.magicChar.dimEmpty;};
          bcdui.widget._bcdFilter.isbigger = function(cellValue, value)   {
            if (cellValue == bcdui.core.magicChar.dimEmpty || cellValue == "\uE0F1")
              return false;
            if (value == "")
              return true;
            var isNumberCell = cellValue.replace(/^[+-]?\d*\.\d+$|^[+-]?\d+(\.\d*)?$/g, "") == "";
            var isNumberValue = value.replace(/^[+-]?\d*\.\d+$|^[+-]?\d+(\.\d*)?$/g, "") == "";
            return (isNumberCell && isNumberValue) ? (parseFloat(cellValue) > parseFloat(value)) : (cellValue > value);
          };
          bcdui.widget._bcdFilter.issmaller = function(cellValue, value)  {
            if (cellValue == bcdui.core.magicChar.dimEmpty || cellValue == "\uE0F1")
              return false;
            if (value == "")
              return true;
            var isNumberCell = cellValue.replace(/^[+-]?\d*\.\d+$|^[+-]?\d+(\.\d*)?$/g, "") == "";
            var isNumberValue = value.replace(/^[+-]?\d*\.\d+$|^[+-]?\d+(\.\d*)?$/g, "") == "";
            return (isNumberCell && isNumberValue) ? (parseFloat(cellValue) < parseFloat(value)) : (cellValue < value);
          };
          bcdui.widget._bcdFilter.isbiggerorequal = function(cellValue, value)   {
            if (cellValue == bcdui.core.magicChar.dimEmpty || cellValue == "\uE0F1")
              return false;
            if (value == "")
              return true;
            var isNumberCell = cellValue.replace(/^[+-]?\d*\.\d+$|^[+-]?\d+(\.\d*)?$/g, "") == "";
            var isNumberValue = value.replace(/^[+-]?\d*\.\d+$|^[+-]?\d+(\.\d*)?$/g, "") == "";
            return (isNumberCell && isNumberValue) ? (parseFloat(cellValue) >= parseFloat(value)) : (cellValue >= value);
          };
          bcdui.widget._bcdFilter.issmallerorequal = function(cellValue, value)  {
            if (cellValue == bcdui.core.magicChar.dimEmpty || cellValue == "\uE0F1")
              return false;
            if (value == "")
              return true;
            var isNumberCell = cellValue.replace(/^[+-]?\d*\.\d+$|^[+-]?\d+(\.\d*)?$/g, "") == "";
            var isNumberValue = value.replace(/^[+-]?\d*\.\d+$|^[+-]?\d+(\.\d*)?$/g, "") == "";
            return (isNumberCell && isNumberValue) ? (parseFloat(cellValue) <= parseFloat(value)) : (cellValue <= value);
          };

          // build dialog template
          jQuery(".bcdFilterDialog").remove();

          // prepare options dropdown
          var options = "";
          var opt = [
            ["bcd_widget_filter_isEqual"   , "isequal"]
          , ["bcd_widget_filter_isNotEqual", "isnotequal"]
          , ["bcd_widget_filter_contains"  , "contains"]
          , ["bcd_widget_filter_startsWith", "startswith"]
          , ["bcd_widget_filter_endsWith"  , "endswith"]
          , ["bcd_widget_filter_isBigger"  , "isbigger"]
          , ["bcd_widget_filter_isSmaller" , "issmaller"]
          , ["bcd_widget_filter_isBiggerOrEqual"  , "isbiggerorequal"]
          , ["bcd_widget_filter_isSmallerOrEqual" , "issmallerorequal"]
            // is empty / is not empty might not be intuitive since you need to check the <empty> checkbox additionally, so for now, disable them from the drop down list
  //        , ["bcd_widget_filter_isEmpty"   , "isempty"]
  //        , ["bcd_widget_filter_isNotEmpty", "isnotempty"]
          ];

          // add custom filter functions
          columnFiltersCustomFilter.filter(function(f) { return (f.bRef == id);}).forEach(function(e) {
            e.operations.forEach(function(o) {
              opt.push([o.caption, o.id]);
              bcdui.widget._bcdFilter[o.id] = o.filterFunction;
            });
          });
          // add custom operator options
          opt.forEach(function(e){
            var selectedStatus = e[1] == selectedCondition ? " selected" : "";
            options += "<option value='" + e[1] + "'" + selectedStatus + " bcdTranslate='" + e[0] + "'>" + e[0] + "</option>";
          });

          // prepare html template
          jQuery("body").append("<div class='bcdFilterDialog' title='"+ title +"'>" +
            "<div class='bcdFilterSelection'>" +
              "<select class='bcdFilterSelect form-control'>" + options + "</select>" +
              "<input class='bcdFilterInput form-control'" + selectedInput + " placeholder='" + bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_widget_filter_value"}) + "'></input>" +
              "<div class='bcdFilterActions'>" +
                "<div><input type='checkbox'></input><span class='bcdShowAll' bcdTranslate='bcd_widget_filter_showAll'></span></div>" +
                "<p>&nbsp;</p>" +
                "<div class='form-row'>" +
                  "<div class='col-sm-auto'><bcd-buttonng bcdActionId='selectAll' caption='" + bcdui.i18n.TAG + "bcd_widget_filter_selectAll' onClickAction='bcdui.widget._filterClickAction'></bcd-buttonng></div>" +
                  "<div class='col-sm-auto'><bcd-buttonng bcdActionId='clear' caption='" + bcdui.i18n.TAG + "bcd_widget_filter_clear' onClickAction='bcdui.widget._filterClickAction'></bcd-buttonng></div>" +
                  "<div class='col-sm-auto'><bcd-buttonng bcdActionId='reset' caption='" + bcdui.i18n.TAG + "bcd_widget_filter_reset' onClickAction='bcdui.widget._filterClickAction'></bcd-buttonng></div>" +
                "</div>"+
              "</div>" +
              "<div class='bcdFilterMultiSelect'></div>"+
              "<p><span class='bcdCount'></span>&nbsp;<span bcdTranslate='bcd_widget_filter_itemsSelected'></span></p>"+
            "</div>"+
            "<div class='form-row'>" +
              "<div class='col-sm-auto'><bcd-buttonng bcdActionId='apply' caption='" + bcdui.i18n.TAG + "bcd_widget_filter_apply' onClickAction='bcdui.widget._filterClickAction'></bcd-buttonng></div>" +
              "<div class='col-sm-auto'><bcd-buttonng bcdActionId='remove' caption='" + bcdui.i18n.TAG + "bcd_widget_filter_remove' onClickAction='bcdui.widget._filterClickAction'></bcd-buttonng></div>" +
              "<div class='col-sm-auto'><bcd-buttonng bcdActionId='cancel' caption='" + bcdui.i18n.TAG + "bcd_widget_filter_cancel' onClickAction='bcdui.widget._filterClickAction'></bcd-buttonng></div>" +
        		"</div>" +
          "</div>");
          bcdui.i18n.syncTranslateHTMLElement({elementOrId: jQuery(".bcdFilterDialog").get(0)});

          // remember current provider
          jQuery(".bcdFilterDialog").data("lastProvider", provider);

          // let's append the config to the dialog
          jQuery(".bcdFilterDialog").data("config", {
              statusModel: statusModel
            , targetModelXPath: targetModelXPath 
            , multiSelectDataModel: multiSelectDataModel
            , inputModel: inputModel
            , id: id
            , rootXPath : rootXPath
          });

          // initially filter options and run renderer
          bcdui.widget._filterOptions(".bcdFilterDialog", multiSelectDataModel);
          bcdui.widget._renderFilterOptions(".bcdFilterDialog", multiSelectDataModel);
  
          // and make it a jQuery dialog
          jQuery(".bcdFilterDialog").dialog({
              height: "auto"
            , width: "auto"
            , modal: false
            , resizable: false
            , draggable: true
            , closeText: "\u2716"
            , position: { my: 'left top', at: 'left top', of: event }
            , close: function(){ bcdui.widget._cancelFilter(inputModel.id, id);}
            , create: function() { jQuery("body").css({ overflow: 'hidden' }); jQuery(".bcdFilterDialog .bcdFilterInput").focus();}
            , beforeClose: function() {jQuery("body").css({ overflow: 'inherit'});}
          });
  
          // effect for checkbox area hover
          jQuery(".bcdFilterMultiSelect").on("mouseenter", "div", function() {jQuery(this).addClass("highlight"); });
          jQuery(".bcdFilterMultiSelect").on("mouseleave", "div", function() {jQuery(this).removeClass("highlight"); });
          // trigger input click when clicking the span
          jQuery(".bcdFilterMultiSelect").on("click", "span", function() { jQuery(this).prev("input").trigger("click"); });
  
          // trigger input click when clicking the span
          jQuery(".bcdShowAll").on("click", function() { jQuery(this).prev("input").trigger("click"); });
          // listener on hide/show all checkbox change
          jQuery(".bcdFilterActions input").on("change", function() {
            bcdui.widget._filterOptions(".bcdFilterDialog", multiSelectDataModel);
            bcdui.widget._renderFilterOptions(".bcdFilterDialog", multiSelectDataModel);
          });
          
          // listener on checkbox change, mark selected items as enabled/disabled
          jQuery(".bcdFilterMultiSelect").on("change", "input", function() {
            var item = multiSelectDataModel.query("/*/Item[@id='{{=it[0]}}']", [jQuery(this).val()]);
            if (item != null)
              item.setAttribute("enabled", "" + jQuery(this).is(':checked'));
            jQuery(".bcdFilterSelection p span.bcdCount").text(multiSelectDataModel.queryNodes("/*/Item[@enabled='true']").length);
          });
          // listeners on condition change, triggers filtering
          jQuery(".bcdFilterSelect").on("change", function(){
            // check which provider to use for the current condition and also if it really requires to refresh data
            var condition = jQuery(this).val();
            var lastProvider = jQuery(".bcdFilterDialog").data("lastProvider");
            var newProvider = customProviders[condition] ? customProviders[condition] : valueCaptionProvider ? valueCaptionProvider : defaultProvider ;

            // old and new providers are not identical, so regenerate option values
            if (lastProvider != newProvider) {

              bcdui.core.removeXPath(statusModel.getData(), rootXPath, false);

              // rememeber new provider
              jQuery(".bcdFilterDialog").data("lastProvider", newProvider);
              // get data
              newProvider(inputModel, index).then(function(values) {
                // build and update model
                multiSelectDataModel = bcdui.widget._buildFilterOptionsModel(statusModel, rootXPath, id, inputModel, index, values, useRefs);
                var config = jQuery(".bcdFilterDialog").data("config");
                if (config) {
                  config.multiSelectDataModel = multiSelectDataModel; 
                  jQuery(".bcdFilterDialog").data("config", config);
                  bcdui.widget._filterOptions(".bcdFilterDialog", multiSelectDataModel);
                  bcdui.widget._renderFilterOptions(".bcdFilterDialog", multiSelectDataModel);
                }
              });
            }
            // old and new providers are identical, so simply go on
            else {
              bcdui.widget._filterOptions(".bcdFilterDialog", multiSelectDataModel);
              bcdui.widget._renderFilterOptions(".bcdFilterDialog", multiSelectDataModel);
            }
          });
          // listeners on input key change, triggers filtering
          jQuery(".bcdFilterInput").on("keyup", function(){
            bcdui.widget._filterOptions(".bcdFilterDialog", multiSelectDataModel);
            bcdui.widget._renderFilterOptions(".bcdFilterDialog", multiSelectDataModel);
          });
        });
      });
    },
    /**
     * builds a static model with the filter options
     * @private
     */
    _buildFilterOptionsModel: function(statusModel, rootXPath, id, inputModel, index, values, useRefs) {
      // sort either numerical (by value) (in case of reference we can't be sure if it maps to a non numerical value, so use string sort then) or by string
      
      var typeName = inputModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@pos='" + index + "']/@type-name", "");
      var isNumeric = typeName == "INTEGER" || typeName == "NUMERIC" || typeName == "DECIMAL";

      if (isNumeric && !useRefs)
        values.sort(function(a,b) {
          var aa = isNaN(a.value) ? 0 : parseFloat(a.value);
          var bb = isNaN(b.value) ? 0 : parseFloat(b.value);
          return aa > bb ? 1 : aa < bb ? -1 : 0;});
      else
        values.sort(function(a,b) {
          var aa = a.caption.toLowerCase();
          var bb = b.caption.toLowerCase();
          // sort empty to top
          if (aa != bb) {
            if (aa == "\uE0F1")
              return -1;
            if (bb == "\uE0F1")
              return 1;
            if (aa == bcdui.core.magicChar.dimEmpty)
              return -1;
            if (bb == bcdui.core.magicChar.dimEmpty)
              return 1;
          }
          return aa > bb ? 1 : aa < bb ? -1 : 0;
        });

      var modelData = "<Data>";
      var i = 1;
      values.forEach(function(e) {
        var isSelected = statusModel.query(rootXPath + "/f:Expression[@op='=' and @bRef='" + id + "' and @value='{{=it[0]}}']", [e.value]) != null;
        var enabled = isSelected ? " enabled='true'" : "";
        var isFiltered = e.isFiltered ? " isFiltered='true'" : "";
        modelData +="<Item caption='" + bcdui.util.escapeHtml(e.caption) + "'" + enabled + isFiltered + " id='R" + (i++) +"'>" + bcdui.util.escapeHtml(e.value) + "</Item>";
      });
      modelData += "</Data>";
      var multiSelectDataModel = new bcdui.core.StaticModel({data:modelData});
      bcdui.factory.objectRegistry.registerObject(multiSelectDataModel);
      multiSelectDataModel.execute();
      
      return multiSelectDataModel;
    },

    /**
     * filter action function, take the current condition and set the values to filtered=true if matched
     * @private
     */
    _filterOptions: function(targetHtml, inputModel) {
      var inputValue = jQuery(targetHtml).find(".bcdFilterInput").val() || "";
      var condition = jQuery(targetHtml).find(".bcdFilterSelect").val() || "contains";
      jQuery.makeArray(inputModel.queryNodes("/*/Item")).forEach(function(e) {
        e.removeAttribute("filtered");
        if (! bcdui.widget._bcdFilter[condition](e.getAttribute("caption") || e.text, inputValue))
          e.setAttribute("filtered", "true");
      });
    },

    /**
     * renderer which shows only filtered values and creates checkbox list for them and updates the count printout
     * @private
     */
    _renderFilterOptions: function(targetHtml, multiSelectDataModel) {
      jQuery(targetHtml).find(".bcdFilterMultiSelect form").remove();
      var multiSelect = "<form>";
      var showAll = jQuery(targetHtml).find(".bcdFilterActions input").is(':checked');
      var values = jQuery.makeArray(multiSelectDataModel.queryNodes("/*/Item"));
      values.forEach(function(e) {
        var isEnabled = e.getAttribute("enabled") === "true";
        var isFiltered = e.getAttribute("isFiltered") === "true";
        var isCurrentlyFiltered = e.getAttribute("filtered") === "true";
        var checkStatus = isEnabled ? " checked" : "";
        var cssClass = isFiltered ? " class='bcdDisabled'" : (e.getAttribute("caption") == "\uE0F1" || e.getAttribute("caption") == bcdui.core.magicChar.dimEmpty) ? " class='bcdItalic'" : "";
        var inputText = e.getAttribute("caption") == bcdui.core.magicChar.dimEmpty ? bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_widget_filter_emptyValue"})) :  e.getAttribute("caption");
        inputText = e.getAttribute("caption") == "\uE0F1" ? bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_widget_filter_totalValue"})) : bcdui.util.escapeHtml(inputText);  
        if ((showAll && ! isCurrentlyFiltered) || (isEnabled && ! isCurrentlyFiltered) || (! showAll && ! isFiltered && ! isCurrentlyFiltered))
          multiSelect += "<div><input type='checkbox' name='" + e.getAttribute("caption") + "' value='" + e.getAttribute("id") + "'" + checkStatus + "></input><span" + cssClass + ">" +   bcdui.widget._getSingleFilterOption(inputText) + "</span></div>";
      });
      multiSelect += "</form>";
      jQuery(targetHtml).find(".bcdFilterMultiSelect").append(multiSelect);
      jQuery(targetHtml).find(".bcdFilterSelection p span.bcdCount").text(multiSelectDataModel.queryNodes("/*/Item[@enabled='true']").length);
    },
    
    /**
     * text to be shown in the filterOption, customize by overwriting this function
     * @private
     */
    _getSingleFilterOption: function(inputText) {
      return inputText;
    },
    
    /**
     * text to be shown in the tooltip, customize by overwriting this function
     * @private
     */
    _getTooltipFilterOption: function(inputText) {
      return inputText;
    },
    
    _filterClickAction: function() {
      const action = jQuery(this).closest("*[bcdActionId]").attr("bcdActionId") || "";
      if (action == "selectAll")
        bcdui.widget._setFilterStatus(this, true);
      if (action == "clear")
        bcdui.widget._setFilterStatus(this, false);
      if (action == "reset")
        bcdui.widget._setFilterStatus(this, false, true);
      if (action == "apply")
        bcdui.widget._applyFilter(this);
      if (action == "remove")
        bcdui.widget._removeFilter(this);
      if (action == "cancel")
        bcdui.widget._cancelFilter(this);
    },

    /**
     * either turn on/off the current filtered list items or reset all
     * @private
     */
    _setFilterStatus: function(element, value, reset) {
      var config = jQuery(element).closest(".bcdFilterDialog").data("config");
      if (reset) {
        jQuery(element).closest(".bcdFilterDialog").find(".bcdFilterActions input").prop('checked', true);
        jQuery.makeArray(config.multiSelectDataModel.queryNodes("/*/Item")).forEach(function(item) { jQuery(item).removeAttr("enabled filtered"); });
        jQuery(".bcdFilterInput").val("");
      }
      else {
        jQuery(".bcdFilterMultiSelect input").each(function(i, e){
          var item = config.multiSelectDataModel.query("/*/Item[@id='" + jQuery(e).val() + "']");
          if (item != null)
            item.setAttribute("enabled", "" + value);
        });
      }
      bcdui.widget._renderFilterOptions(jQuery(element).closest(".bcdFilterDialog"), config.multiSelectDataModel);
    },

    /**
     * write enabled items and filter list and close dialog
     * @private
     */
    _applyFilter: function(element) {
      var config = jQuery(element).closest(".bcdFilterDialog").data("config");
      var inputValue = jQuery(element).closest(".bcdFilterDialog").find(".bcdFilterInput").val() || "";
      var condition = jQuery(element).closest(".bcdFilterDialog").find(".bcdFilterSelect").val() || "contains";
      config.statusModel.remove(config.rootXPath);
      config.statusModel.write(config.rootXPath + "/@value", inputValue);
      config.statusModel.write(config.rootXPath + "/@condition", condition);
      var i = 0;
      jQuery.makeArray(config.multiSelectDataModel.queryNodes("/*/Item[@enabled='true']")).forEach(function(e) {
        var caption = e.getAttribute("caption") || "";
        if (caption != "")
          config.statusModel.write(config.rootXPath + "/f:Expression[@i='" + i++ + "' and @bRef='" + config.id +"' and @op='=' and @caption='{{=it[0]}}']/@value", [caption], e.text);
        else
          config.statusModel.write(config.rootXPath + "/f:Expression[@i='" + i++ + "' and @bRef='" + config.id +"' and @op='=']/@value", e.text);
      });
      config.statusModel.fire();
      jQuery(element).closest(".bcdFilterDialog").dialog("close");
    },

    /**
     * simply close dialog on cancel
     * @private
     */
    _cancelFilter: function(element) {
      jQuery(element).closest(".bcdFilterDialog").dialog("close");
    },

    /**
     * remove outer targetModel node for current column and close dialog
     * @private
     */
    _removeFilter: function(element) {
      var config = jQuery(element).closest(".bcdFilterDialog").data("config");
      config.statusModel.remove(config.rootXPath, true);
      jQuery(element).closest(".bcdFilterDialog").dialog("close");
    },

    /**
     * Create filter table header
     * @param {Object}        args                 The parameter map contains the following properties.
     * @param {(string|bcdui.core.Renderer)} args.renderer        Id of the registered renderer to work on or the render itself
     * @param {boolean}       [args.isSync=false]  Decide whether the action is to be called synchronous or not
     * @param {boolean}       [args.alwaysShowHeader=true] If filtering leads to no rows to be displayed, this flag will show the table header to allow removal of filters
     * @param {function}      [args.getCaptionForColumnValue]             Function (colIdx, colValue) which returns the rendered caption for the cell. By default standard wrs @caption, wrs:references and unit/scale handling is supported already 
     * @param {function}      [args.getFilteredValues]                    Function (colIdx) which needs to return a wrs:C array which holds the valid values for the current column. Use this to e.g. only show prefiltered values 
    */
    createFilterTableHeader: function(args) {
      var action = function( rendererOrRendererId ) {
        
        var renderer = bcdui.factory.objectRegistry.getObject(rendererOrRendererId);

        var tableHead = jQuery(renderer.getTargetHtml()).find("table thead").first();
        if ((tableHead.length == 0 && ! renderer.backupHeader) || renderer.getPrimaryModel().query("/*/wrs:Header/wrs:Columns/wrs:C") == null) {
          return; // no table found or not using a wrs model, so do nothing
        }

        // single filters will be added as f:Or[id='columId']/f:Expression[op='=' value='actualValue bRef='columnId'] to the following root
        var targetModelXPath = "/*/guiStatus:ClientSettings/guiStatus:ColumnFilters[@id='" + (renderer.originalInputModel || renderer.getPrimaryModel()).id +"']";
        var statusModel = bcdui.wkModels.guiStatus;  // needs to be a registered model

        // replace renderer input model with filter wrapper
        if (! renderer.replacedPrimaryModel) {
          renderer.replacedPrimaryModel = true;

          // remember original execute function and inputModel
          renderer.originalInputModel = renderer.getPrimaryModel();
          renderer.originalExecute = renderer.execute;

          // replace renderer's execute with ours, which first re-executes the replaced inputModel (filter) (and so a refresh of original input data is also provided)
          // and then calls the original renderer execute
          renderer.execute = function(args) {
            renderer.getPrimaryModel().onReady({
                onlyOnce: true
              , futureOnly: true
              , executeIfNotReady: false
              , onSuccess: function() { renderer.originalExecute();}  
            });
            renderer.getPrimaryModel().execute(args);
          };

          var paramModel = new bcdui.core.StaticModel("<Root><xp:FilterXPath><xp:Value>$" + statusModel.id + targetModelXPath + "</xp:Value></xp:FilterXPath></Root>");
          paramModel.execute(true);

          var newInputModel = new bcdui.core.ModelWrapper({
              inputModel: renderer.originalInputModel
            , id: renderer.originalInputModel.id + "_filtered" // registered for widget use
            , chain: bcdui.contextPath + "/bcdui/xslt/wrs/filterRows.xslt"
            , parameters: {paramModel: paramModel}
            });
          
          newInputModel.execute();
          renderer.setPrimaryModel(newInputModel);
        }

        var inputModel = renderer.originalInputModel;
        var filteredModel = renderer.getPrimaryModel();

        // table was removed due to filtering, so re-add it to target
        if (tableHead.length == 0 && inputModel.queryNodes("/*/wrs:Data/wrs:*").length > 0 && renderer.backupHeader && args.alwaysShowHeader!==false) {
         jQuery(renderer.getTargetHtml()).append(renderer.backupHeader);
         tableHead = jQuery(renderer.getTargetHtml()).find("table thead").first();
        }
        else {
          renderer.backupHeader = tableHead.closest("table").clone(true);
          jQuery(renderer.backupHeader).find("tbody").remove();
        }

        bcdui.widget.createTableHeadFilter({
            tableElement: jQuery(tableHead).closest("table").get(0)
          , inputModel: inputModel
          , getFilteredValues: args.getFilteredValues || function(colIdx){return jQuery.makeArray(filteredModel.queryNodes("/*/wrs:Data/wrs:*/wrs:C[position()='"+colIdx+"']"));}
          , getCaptionForColumnValue: args.getCaptionForColumnValue
          , statusModel: statusModel
          , targetModelXPath: targetModelXPath
          , callback: function() { renderer.execute(true); } // on filter change, we rerender (replaced execute will refresh the renderer inputModel (filterRows)
        });
      };

      if( args.isSync ) {
        action( args.renderer || args.rendererId );
      } else {
        bcdui.factory.objectRegistry.withReadyObjects( args.renderer || args.rendererId, function() { action( args.renderer || args.rendererId ); } );
      }
    },

    /**
     * Create fixed table header by adding a fixed copy of the original
     * Its size is derived from the "original" header, still in place for the table
     * @param {Object}        args                 The parameter map contains the following properties.
     * @param {string}        args.rendererId      Id of the renderer to work on
     * @param {boolean}       [args.storeSize=true]  Decide whether the action is to be called synchronous or not
     * @param {boolean}       [args.enableColumnFilters=false]  Set to true if you wnat to enable column filters, too
     * @param {function}      [args.getCaptionForColumnValue]  if you enabled column filters, you can set its getCaptionForColumnValue here 
    */
    createFixedTableHeader: function(args) {
      var storeSize = typeof args.storeSize != "undefined" ? args.storeSize : true;
      var tableElement =  jQuery(bcdui.factory.objectRegistry.getObject(args.rendererId).getTargetHtml()).find("table");
      bcdui.widget._enableFixedTableHeader(tableElement, args.rendererId, storeSize, args.enableColumnFilters, args.getCaptionForColumnValue);
    },

    /**
     * Create fixed table header by adding a fixed copy of the original
     * Its size is derived from the "original" header, still in place for the table
     * @param {HtmlElement}   tableElement    the table html element
     * @param {string}        rendererId      Id of the renderer to work on
     * @param {boolean}       storeSize       Decide whether the action is to be called synchronous or not
     * @param {boolean}       enableColumnFilters Set to true if you wnat to enable column filters, too
     * @param {function}      getCaptionForColumnValue if you enabled column filters, you can set its getCaptionForColumnValue here
     * @private 
    */
    _enableFixedTableHeader: function(tableElement, rendererId, storeSize, enableColumnFilters, getCaptionForColumnValue) {

      if (enableColumnFilters) {
        var paramBag = {rendererId: rendererId}
        if (getCaptionForColumnValue)
          paramBag["getCaptionForColumnValue"] = getCaptionForColumnValue;
        bcdui.widget.createFilterTableHeader(paramBag);
      }

      // move table to new container and clone header to another new container
      var table = jQuery(tableElement);
      table.parent().append("<div class='bcdTableHeadHolder' rendererId='"+rendererId+"'><div class='bcdCloneTableHolder'></div><div class='bcdOrigTableHolder'></div></div>");
      var bcdTableHeadHolder = table.parent().find(".bcdTableHeadHolder");
      bcdTableHeadHolder.find(".bcdCloneTableHolder").append(jQuery(table.get(0).cloneNode(false)));
      bcdTableHeadHolder.find(".bcdCloneTableHolder table").append(jQuery(table.find("thead").get(0).cloneNode(true)));
      table.parent().find(".bcdOrigTableHolder").append(table);

      if (storeSize) {
        // initially take stored width/heights in case of a rerender. This avoids flickering (assuming number of cells did not change), but only needed
        // if you got manual refeshs like collapsable cubes clicks (maybe columnfilters, too)
        bcdTableHeadHolder.find(".bcdCloneTableHolder").attr("storeSize", "true");
        bcdTableHeadHolder.find(".bcdCloneTableHolder").find("tr").each(function(i, e) {
          jQuery(e).find("th, td").each(function(j, f) {
            var h = bcdui.wkModels.guiStatus.read("/*/guiStatus:ClientSettings/guiStatus:FixedTable[@id='"+rendererId+"']/guiStatus:R[@id='r"+i+"']/guiStatus:C[@id='"+j+"']/@h", "");
            var w = bcdui.wkModels.guiStatus.read("/*/guiStatus:ClientSettings/guiStatus:FixedTable[@id='"+rendererId+"']/guiStatus:R[@id='r"+i+"']/guiStatus:C[@id='"+j+"']/@w", "");
            if (h != "")
              jQuery(f).css("height", h);
            if (w != "")
              jQuery(f).css("width", w);
          });
        });
        var ww = bcdui.wkModels.guiStatus.read("/*/guiStatus:ClientSettings/guiStatus:FixedTable[@id='"+rendererId+"']/@w", "");
        if (ww != "")
          bcdTableHeadHolder.find(".bcdCloneTableHolder table thead").css("width", ww);
        bcdui.wkModels.guiStatus.remove("/*/guiStatus:ClientSettings/guiStatus:FixedTable[@id='"+rendererId+"']", true);
      }

      // let's enable collapseable buttons also in cloned thead
      if (jQuery(tableElement).find(".bcdExpandContainer").length > 0)
        bcdui.component.cube.expandCollapse._init(bcdTableHeadHolder.find(".bcdCloneTableHolder table").get(0)); 

      var cloneTable = bcdTableHeadHolder.find(".bcdCloneTableHolder table");
      var origTableHead = bcdTableHeadHolder.find(".bcdOrigTableHolder table thead");

      // hide clone header when doing a wysiwyg export
      cloneTable.attr("bcdHideOnExport", "true");

      if (enableColumnFilters) {
        jQuery(origTableHead).find("tr").each(function(i, e) {
          jQuery(e).find("th, td").each(function(j, f) {
            var cell = jQuery(jQuery(origTableHead.find("tr").get(i)).find("th, td").get(j));
            if (cell.find(".bcdInfoBox").length == 0)
              cell.html("<div class='bcdFilterContainer'><div class='bcdFilterOriginal'>"+cell.text()+"</div><div class='bcdFilterButton'></div></div>")
          });
        });
      }

      // initial recalc of columns
      setTimeout(function() { bcdui.widget._recalcFixedHeader(tableElement); });

      // on window resize we recalc the columns again to match the original table
      var resizeTimeout = null;
      if (! jQuery(window).data("bcdFixedtable")) {
        jQuery(window).data("bcdFixedtable", true);
        jQuery(window).on("resize", function() {
          // prevent reentry
          if (resizeTimeout != null)
            clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(function() {
            // reset possible set 'table' first, recalc decides is a new one is needed
            jQuery(tableElement).closest(".bcdTableHeadHolder").get(0).style.display = '';
            bcdui.widget._recalcFixedHeader(tableElement)
          });
        });

        // if sidebar gets toggled, we resize
        bcdui.wkModels.guiStatus.onChange(function(){
          setTimeout(function() { bcdui.widget._recalcFixedHeader(tableElement); });
        }, "/*/guiStatus:PersistentSettings/guiStatus:bcdSideBarPin|/*/guiStatus:PersistentSettings/guiStatus:bcdSideBarPin-left|/*/guiStatus:PersistentSettings/guiStatus:bcdSideBarPin-right");
      }
    },

    /**
     * recalculates the height and width of the fixed header
     * @param {HtmlElement} tableElement - the container holding .bcdTableHeadHolder
     * @param {boolean} noFinalRefresh - flag to skip a 2nd run of recalc to avoid some possible browser redraw flaws
     * @private
     */
    _recalcFixedHeader: function(tableElement, noFinalRefresh) {
      var bcdTableHeadHolder = jQuery(tableElement).closest(".bcdTableHeadHolder");
      var cloneTableHead = bcdTableHeadHolder.find(".bcdCloneTableHolder table thead");
      var origTableHead = bcdTableHeadHolder.find(".bcdOrigTableHolder table thead");
      var storeSize = bcdTableHeadHolder.find(".bcdCloneTableHolder").attr("storeSize") == "true";
      var rendererId = bcdTableHeadHolder.attr("rendererId");
      jQuery(cloneTableHead).find("tr").each(function(i, e) {
        jQuery(e).css("height", jQuery(origTableHead.find("tr").get(i)).outerHeight() + "px");
        jQuery(e).find("th, td").each(function(j, f) {
          var cell = jQuery(jQuery(origTableHead.find("tr").get(i)).find("th, td").get(j));
          var paddingTop = parseFloat(jQuery(cell).css("padding-top"));
          var paddingBottom = parseFloat(jQuery(cell).css("padding-bottom"));
          paddingTop = isNaN(paddingTop) ? 0 : paddingTop;
          paddingBottom = isNaN(paddingBottom) ? 0 : paddingBottom;
          var paddingY = bcdTableHeadHolder.css("box-sizing") == "border-box" ? 0 : (paddingTop + paddingBottom);
          var paddingLeft = parseFloat(jQuery(cell).css("padding-left"));
          var paddingRight = parseFloat(jQuery(cell).css("padding-right"));
          paddingLeft = isNaN(paddingLeft) ? 0 : paddingLeft;
          paddingRight = isNaN(paddingRight) ? 0 : paddingRight;
          var paddingX = bcdTableHeadHolder.css("box-sizing") == "border-box" ? 0 : (paddingLeft + paddingRight);
          var cellWidth = (cell.innerWidth() - paddingX) + "px";
          var cellHeight = (cell.innerHeight() - paddingY) + "px";
          jQuery(f).css("height", cellHeight);
          jQuery(f).css("width", cellWidth);
          if (storeSize) {
            bcdui.wkModels.guiStatus.write("/*/guiStatus:ClientSettings/guiStatus:FixedTable[@id='"+rendererId+"']/guiStatus:R[@id='r"+i+"']/guiStatus:C[@id='"+j+"']/@h", cellHeight);
            bcdui.wkModels.guiStatus.write("/*/guiStatus:ClientSettings/guiStatus:FixedTable[@id='"+rendererId+"']/guiStatus:R[@id='r"+i+"']/guiStatus:C[@id='"+j+"']/@w", cellWidth);
          }
        });
        cloneTableHead.css("width", origTableHead.outerWidth() + "px");
      });
      if (storeSize)
        bcdui.wkModels.guiStatus.write("/*/guiStatus:ClientSettings/guiStatus:FixedTable[@id='"+rendererId+"']/@w", origTableHead.outerWidth() + "px", true);

      // in case we have a horizontal scrolling table, we additionally set the display type to table
      // so the clone gets resized too
      var w = bcdTableHeadHolder.find(".bcdOrigTableHolder table").outerWidth();
      var c = bcdTableHeadHolder.find(".bcdCloneTableHolder table").outerWidth();
      if (c + 1 < w) { // + 1 = IE quirk prevention
        bcdTableHeadHolder.get(0).style.display = 'table';
      }

      // in case we did the recalc once, we do a final second run since there can
      // be cases like a very quick resize of the browser window where the browser did not finish
      // rendering the table yet and we already did a recalc. 500ms is just an assumption and
      // needs to be tested further
      if (! noFinalRefresh)
        setTimeout(function() {bcdui.widget._recalcFixedHeader(tableElement, true);}, 500);
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
       * @param {string} id html element id of the current widget
       * @param {string} caption caption value of the current widget
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
     * @return {string} string with attribute and value or empty string if value is empty or wrong attribute
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
      * @return {string} value or empty string if wrong attribute
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
           targetHtmlElement.setAttribute(a.nodeName, a.value);
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
      * initiatialises a label element for given control with given contents
      *
      * @param {DomElement} labelElement - the label element to modify
      * @param {string} controlId - the id of control this label is for, can be null, then no for-attribute is created on a label
      * @param {string} label - as text or i18n key
      *
      * @private
      */
     _initLabel: function(labelElement, controlId, label){
       // handle .label
       if(label){
         labelElement.parent().addClass("form-group");
         if(controlId){
           labelElement.attr("for", controlId);
         }
         if(label.startsWith(bcdui.i18n.TAG)){
           labelElement.attr("bcdTranslate", label);
         } else {
           labelElement.text(label);
         }
       }
     },

     /**
      * shows a js alert box with the given message
      * @param {string} msgKey
      * @param {string} defaultValue
      */
     i18nAlert : function( msgKey,  defaultValue) {
       alert(bcdui.i18n.syncTranslateFormatMessage({msgid: msgKey}) || defaultValue);
     },
     
     /**
      * shows a js confirm box with the given message
      * @param {string} msgKey
      * @param {string} defaultValue
      */
     i18nConfirm : function( msgKey,  defaultValue) {
       return confirm(bcdui.i18n.syncTranslateFormatMessage({msgid: msgKey}) || defaultValue);
     },

     /**
      * Get widgetCaption information from the given target
      * @param {HtmlElement|string} elOrId An existing HTML element or its id representing a widget targetHtml
      * @return {string} string of found widgetCaption or empty string
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
      * @param {targetHtmlRef} [args.targetHtml="#bcdNavPath"] An existing HTML element this widget should be attached to, provide a dom element, a jQuery element or selector, or an element id.
      * @param {string}        [args.title="Report"] A title string which is used during filename generation for exports
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
      * @return {string} string containing the current navPath for your selected values
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
      * @return {string} string containing the current navPath for your selected values
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
         var optionsModelXPath = eOptions.optionsModelXPath;
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

       bcdui.factory.objectRegistry.withReadyObjectsNoExecute(models, function() {

         var finalCaption = "";
         if (targetModelId != null && targetModelId != "") {
           var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
           if (targetXPath != null) {
             var targetNodes = targetModel.getData().selectNodes(targetXPath);

             for (var t = 0; t < targetNodes.length; t++) {

               if (t > 2) {
                 finalCaption += ((finalCaption == "" ? "+" : ",+") + (targetNodes.length - t));
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
     },

     /**
      * opens a modal dialog ready for renderer and delegates to callbacks from arguments;
      * you can trigger 'dialog-close' event within body to close the dialog programmatically,
      * any argument to this event will be provided to the resolving promise as well as to the 'close'
      * callback.
      * In addition to those parameters described in this documentation you can provide any other
      * valid parameter according to jQueryUI Dialog Widget API. This dialog returns a Promise
      * resolving with value provided to 'dialog-close' event, allowing you to easily build
      * on cascading dialogs utilizing promise chain.
      * 
      * @param {object} args - arguments
      * @param {function} args.open - function to execute when dialog is opened, it gets args object with properties: targetHtml
      * @param {function} [args.close] - function to execute after dialog is closed
      * @param {function} [args.create] - function to execute when dialog is created
      * @param {function} [args.beforeClose] - function to execute before dialog is closed - it gets args object with properties: targetHtml; if this function returns false, the dialog is not closed.
      * @param {string} [args.title] - dialog title
      * @param {number} [args.width=640] - dialog width; > 1 means absolute size <= 1 means percentage of the current view-port size, i.e. .75 = 75% of view-port size 
      * @param {number} [args.width=320] - dialog height; > 1 means absolute size <= 1 means percentage of the current view-port size, i.e. .75 = 75% of view-port size
      * @return {Promise<string>} resolving with value provided from 'dialog-close' event, when dialog is closed.
      * @example
      * bcdui.widget.openDialog({
      *   open : (args) => {
      *     new bcdui.core.Renderer({
      *       targetHtml : args.targetHtml, chain : "confirm.buy.dott"
      *     });
      *   },
      *   title : bcdui.i18n.TAG + "confirm.buy"
      * });
      */
     openDialog: function(args){
       args = args||{};
       var delegate = {
         open : args.open,
         close : args.close,
         beforeClose: args.beforeClose,
         create : args.create
       }

       if(!args.open)throw ".open required";
       
       return new Promise(function(resolve){
         const dataPropName = "bcdDialogCloseData";

         // defaults
         args = Object.assign( {
           width: 640,
           height: 320,
           minWidth: 100,
           minHeight: 80,
           modal: true,
           closeOnEscape: true,
           position: {my: "center center", at: "center center"},
           resizable: false,
           draggable: false,
           closeText: "\u2716",
           title: args.title
         },
         args, // provided args
         {
           close: function() {
             jQuery("body").removeClass("bcdNoScroll");
             resolve(jQuery(this).prop(dataPropName)); // resolve promise
             jQuery(this).empty();
             delegate.close && delegate.close();
           },
           beforeClose: function(event){
             if(delegate.beforeClose && delegate.beforeClose({
               targetHtml : jQuery(this).find("div").first()
             }) === false){
               event.stopImmediatePropagation();
               return false;
             }
           },
           create: function(event, ui){
             jQuery(this).on("dialog-close", function(event,data){
               jQuery(this).prop(dataPropName, data).dialog("close");
             });
             delegate.create && delegate.create();
           },
           open: function() {
             jQuery("body").addClass("bcdNoScroll");
             // translate title, if was i18n key
             if(args.title && args.title.startsWith(bcdui.i18n.TAG)){
               jQuery(this).parent().find('.ui-dialog-title').attr("bcdTranslate", args.title).bcdTranslate();
             }
             delegate.open({
               targetHtml : jQuery("<div></div>").appendTo(this)
             });
           }
         });
         
         // recalc width/height if percentage provided
         const _recalc = (ref, value) => ref <= 1 ? Math.round(ref * value) : ref;
         args.width = _recalc(args.width,  document.documentElement.clientWidth);
         args.height = _recalc(args.height,  document.documentElement.clientHeight);
         
         jQuery("<div></div>").appendTo(bcdui.util.getSingletonElement("bcdui_dialog").empty()).dialog(args);
       });
     },
    /**
     * make parts of the given table sticky 
     * @param {Object}        args              
     * @param {HtmlElement}   args.targetHtml     targetHtml containing/being table
     * @param {string}        [args.width]        the width of the table  (e.g. 10, 20px or 30em)
     * @param {string}        [args.height]       the height of the table (e.g. 10, 20px or 30em)
     * @param {boolean}       [args.header=false] make header sticky
     * @param {boolean}       [args.footer=false] make footer sticky
     * @param {integer}       [args.nFirstCols]   make the first n columns sticky
     * @param {integer}       [args.nFirstRows]   make the first n rows sticky
     * @param {integer}       [args.nLastCols]    make the last n columns sticky
     * @param {integer}       [args.nLastRows]    make the last n rows sticky
     * @param {boolean}       [args.bcdDimension=false] make all dimension cells (cube) sticky (higher prio than other options)
     * @param {boolean}       [args.disableMaxWH=false] setting this to true will use width/heigth instead of max-width/max-height 
     */
    stickyTable: function(args) {

      const table = jQuery(args.targetHtml).find("table").addBack(args.targetHtml).first();

      const dims = args.bcdDimension ? ("" + table.find("thead tr:first-child *.bcdDimension").length) : 0;
      if (dims > 0) {
        args.header = true;
        args.footer = false;
        args.nFirstCols = args.nLastCols = 0;
      }

      // when called through xslt htmlBuilder, we might have 0 as a not set width/height
      if (args.width == "0") delete args.width;
      if (args.height == "0") delete args.height;

      if (table.length == 0) throw new Error("no table for sticky table)");

      // clean classes/left/top offsets
      table.removeClass("bcdStickyTable bcdStickyHead bcdStickyFoot bcdStickyFirstColumn bcdStickyLastColumn bcdStickyLastRow bcdStickyFirstRow");
      if (table.parent().hasClass("bcdStickyContainer")) {
        table.parent().css("overflow", "inherit");
        table.parent().css(args.disableMaxWH ? "width"  : "max-width",    "inherit");
        table.parent().css(args.disableMaxWH ? "height" : "max-height",   "inherit");
      }
      table.find(".bcdStickyNthCol").each(function(j, e) {jQuery(e).removeClass("bcdStickyNthCol"); jQuery(e).css("left", ""); jQuery(e).css("right", "");});
      table.find(".bcdStickyNthRow").each(function(j, e) {jQuery(e).removeClass("bcdStickyNthRow"); jQuery(e).css("top", "");  jQuery(e).css("bottom", "");});

      // handle checkboxes, they simply add classes
      if (args.header)   table.addClass("bcdStickyTable bcdStickyHead");
      if (args.footer)   table.addClass("bcdStickyTable bcdStickyFoot");

      // handle width/height bei modifying the container around the table
      if (args.width || args.height) {
        if (args.width) {
          const width = ("" + parseInt(args.width, 10)) === args.width ? args.width + "px" : args.width;
          table.parent().css(args.disableMaxWH ? "width" : "max-width", width); 
        }
        if (args.height) {
          const height = ("" + parseInt(args.height, 10)) === args.height ? args.height + "px" : args.height;
          table.parent().css(args.disableMaxWH ? "height" : "max-height", height);
        }
        table.parent().addClass("bcdStickyContainer").css("overflow", "auto");
      }

      // for dims it is assumed that they are the n-first columns in the first header row
      const firstCols = parseInt(args.nFirstCols || ("" + dims), 10);
      const firstRows = parseInt(args.nFirstRows || "0", 10);
      const lastCols  = parseInt(args.nLastCols || "0", 10);
      const lastRows  = parseInt(args.nLastRows || "0", 10);
      table.addClass("bcdStickyTable");
      ["thead", "tbody", "tfoot"].forEach(function(part) {bcdui.widget._scanTablePart(table.find(part), firstCols, firstRows, lastCols, lastRows, args.header, args.footer)});

      // remember args on table for resize listener
      jQuery(table).data("bcdStickyArgs", args);

      // redraw all sticky tables on window resize
      if (! jQuery(window).data("bcdStickyResize")) {
        jQuery(window).data("bcdStickyResize", true);
        jQuery(window).on("resize", function() {
          jQuery(".bcdStickyTable").each(function(i, t) {
            const stickyArgs = jQuery(t).data("bcdStickyArgs");
            if (stickyArgs)
              bcdui.widget.stickyTable(stickyArgs);
          });
        });
      }
    },

    /**
     * run over table and decide which cells to make sticky
     * @param {HtmlElement} el html element (either thead, tbody, tfoot)
     * @param {integer} nFirstCols number of first columns to make sticky
     * @param {integer} nFirstRows number of first rows to make sticky
     * @param {integer} nLastCols number of last columns to make sticky
     * @param {integer} nLastRows number of last rows to make sticky
     * @param {boolean} stickyHeader header is sticky
     * @param {boolean} stickyFooter footer is sticky
     * @private
     */
     _scanTablePart: function(el, nFirstCols, nFirstRows, nLastCols, nLastRows, stickyHeader, stickyFooter) {

      const element = jQuery(el);
      const htmlEl = element.get(0);
      const table  = element.closest("table");

      if (!htmlEl)
        return;

      const top    = table.find("thead").length > 0 ? table.find("thead").outerHeight() : 0;
      const bottom = table.find("tfoot").length > 0 ? table.find("tfoot").outerHeight() : 0;

      // for now, no sticky rows for header/footer (looks weird)
      if (htmlEl.nodeName == "THEAD" || htmlEl.nodeName == "TFOOT")
        nFirstRows = nLastRows = 0;

      // check if we can use css classes
      let rowExit = nFirstRows == 0 && nLastRows == 0;
      let colExit = nFirstCols == 0 && nLastCols == 0;
      if (nFirstCols == 1 && element.find("tr >*[rowspan]").length == 0) {
        table.addClass("bcdStickyFirstColumn");
        colExit |= true;
      }
      if (nLastCols  == 1 && element.find("tr >*[rowspan]").length == 0) {
        table.addClass("bcdStickyLastColumn");
        colExit |= true;
      }
      if (nFirstRows == 1) {
        table.addClass("bcdStickyFirstRow");
        table.find("tbody tr:first-child").css("top", stickyHeader ? top : 0);
        rowExit |= true;
      }
      if (nLastRows == 1) {
        table.addClass("bcdStickyLastRow");
        table.find("tbody tr:last-child").css("bottom", stickyFooter ? bottom : 0);
        rowExit |= true;
      }
      if (nFirstCols > 1 || nLastCols > 1 || nFirstRows > 1 || nLastRows > 1) {
        rowExit = colExit = false;
        table.removeClass("bcdStickyFirstColumn bcdStickyLastColumn bcdStickyFirstRow bcdStickyLastRow");
        if (htmlEl.nodeName == "TBODY") {
          table.find("tbody tr:first-child").css("top", "");
          table.find("tbody tr:last-child").css("bottom", "");
        }
      }
      if (rowExit && colExit)
        return;

      // unfortunately css classes are not enough, run through table cells
      const maxCols = nLastCols != 0 ? Infinity : nFirstCols != 0 ? nFirstCols : Infinity;
      const maxRows = nFirstCols != 0 || nLastCols != 0 || nLastRows != 0 ? Infinity : nFirstRows != 0 ? nFirstRows : Infinity;

      let posTop = [];       // remember top position of tr at pos y
      let posLeft = [];      // remember left position or td/th at pos x
      let cells = [];        // remember html cells
      let m = [];            // flag matrix for scanTree
      let maxCol = 0;        // determined max x index
      let maxRow = 0;        // determined max y index
      let lastColRight = 0;  // determined max x right position
      let lastRowBottom = 0; // determined max y bottom position
      let pos = [];

      const maxY = maxRows < htmlEl.rows.length ? maxRows : htmlEl.rows.length;
      for (let y = 0; y < maxY; y++) {
        const row = htmlEl.rows[y];

        const maxX = maxCols < row.cells.length ? maxCols : row.cells.length;
        for (let x = 0; x < maxX; x++) {
          const cell = row.cells[x];
          const theCell = jQuery(cell);
          let xx = x

          for (; m[y] && m[y][xx]; ++xx); // skip already determined cells

          const innerMaxX = maxCols < xx + cell.colSpan ? maxCols : xx + cell.colSpan;
          const innerMaxY = maxRows < y + cell.rowSpan ? maxRows : y + cell.rowSpan;
          for (let tx = xx; tx < innerMaxX; ++tx) {
            for (let ty = y; ty < innerMaxY; ++ty) {
              m[ty] = m[ty] || [];
              m[ty][tx] = true;

              // +1 / -1 just for avoiding position() call when left/top was already determined to be 0 (posLeft[xx] = posLeft[xx] || ....)
              posLeft[xx] = posLeft[xx] || (theCell.position().left + 1);
              posTop[y]   = posTop[y]   || (theCell.parent().position().top + 1);
              
              if (typeof pos["" + xx + "|" + y] == "undefined") {
                pos["" + xx + "|" + y] = 1;
                const props = {
                  c: theCell
                , l: posLeft[xx] - 1
                , t: posTop[y] - 1
                , w: parseInt(theCell.outerWidth(), 10)
                , h: parseInt(theCell.outerHeight(), 10)
                , x: xx
                , y: y
                };
                cells.push(props);
  
                if (maxCol < xx) {
                  maxCol = xx
                  lastColRight = props.l + props.w;
                }
                if (maxRow < y) {
                  maxRow = y
                  lastRowBottom = props.t + props.h;
                }
              }
            }
          }
        }
      }

      const maxNonStickyCol = maxCol - nLastCols;
      const maxNonStickyRow = maxRow - nLastRows;

      // modify css for collected cells 'at one go'
      let yT = []; // remember rows where top is already set
      let yB = []; // remember rows where bottom is already set
      cells.forEach(function(cell) {
        if (nFirstCols != 0 && cell.x < nFirstCols)       {cell.c.addClass("bcdStickyNthCol")         .css("left",   cell.l); }
        if (nLastCols  != 0 && cell.x > maxNonStickyCol)  {cell.c.addClass("bcdStickyNthCol")         .css("right",  lastColRight - cell.l - cell.w);}
        if (nFirstRows != 0 && cell.y < nFirstRows && ! yT[cell.y]) {
          yT[cell.y] = true;
          cell.c.parent().addClass("bcdStickyNthRow").css("top",    cell.t - (stickyHeader ? 0 : top ));
        }
        if (nLastRows != 0 && cell.y > maxNonStickyRow && ! yB[cell.y]) {
          yB[cell.y] = true;
          cell.c.parent().addClass("bcdStickyNthRow").css("bottom", lastRowBottom - cell.t - cell.h + (stickyFooter ? bottom : 0 ));
        }
      });
     }
}); // namespace

/**
 * Tooltip for widget validation results
 */
bcdui.widget.validationToolTip = class
{
  _schema_validationToolTip_args= !(bcdui.factory.validate.jsvalidation._patterns) ? {} : {
    name: "_schema_validationToolTip_args",
    properties: {
      id:                         { type: "string",  required: false, pattern: bcdui.factory.validate.jsvalidation._patterns.dataProviderId },
      targetModelId:              { type: "string",  required: true, pattern: bcdui.factory.validate.jsvalidation._patterns.dataProviderId },
      targetModelXPath:           { type: "string",  required: true,  pattern: bcdui.factory.validate.jsvalidation._patterns.writableModelXPath },
      containerHtmlElement:       { type: "htmlElement",  required: true},
      validateWrapperUrl:         { type: "string",  required: false },
      validateWrapperParameters:  { type: "object",  required: false }
    }
  }

  /**
   * Initializing tooltip widget
   * @param {Object} args
   * @param {string} args.id - option widget identifier
   * @param {string} args.targetModelId - identifier of model that should be tracked
   * @param {xPath} args.targetModelXPath - xpath of model that should be tracked
   * @param {DomElement} args.containerHtmlElement - html container with binded control
   * @param {url} args.validateWrapperUrl - xstl transformation which implement concrete validation logic
   * @param {object} args.validateWrapperParameters - parameters that should be passed to validateWrapper
   * */
  constructor(args)
  {
//    args = bcdui.factory._xmlArgs( args, this._schema_validationToolTip_args );
//    bcdui.factory.validate.jsvalidation._validateArgs(args, this._schema_validation"ip_args);
    
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
  }

  /**
   * Tool tip listener initialization and registering.
   * @param {HtmlElement} containerHtmlElement Widget container element.
   * @param {bcdui.core.DataProvider} targetModel
   * @param {string} targetModelId identifier of model that should be tracked
   * @param {string} targetModelXPath xpath of model that should be tracked
   * @param {DomDocument} doc XMLDocument of the targetModel
   * @param {HtmlElement} containerHtmlElement html container with binded control
   * @returns {Function} Listener which controls the tool tip.
   * @private
   */
  _initTooltip(t)
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
    }

    /**
     * Validation visualiser (adding bcdInvalid class to source html container if validation failed)
     * @param {HtmlElement}  containerHtmlElement Widget container element.
     * @param {string} targetModelId id of targetModel which holds the validationResult
     * @param {string} xpath xpath to the value
     * @private
     */
    _visualizeValidationResult(containerHtmlElement, targetModelId, xpath){
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
    }
    /**
     * Runs widget validation (which passed to validateWrapperUrl) and copy validation info from wrapper to the model.
     * @param containerHtmlElement
     * @private
     */
    _validateValue(containerHtmlElement){
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
};

// initialize pageEffects (if used)
bcdui.core.ready(function(){
  bcdui.widget.pageEffects.init();
});
