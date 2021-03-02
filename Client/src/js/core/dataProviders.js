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
 * A file containing some standard dataProvier classes. These classes are
 * especially useful to pass various types of parameters to a TransformationChain
 * or make an alias for a model.
 */

bcdui.core.PromptDataProvider = class extends bcdui.core.DataProvider
/**
 * @lends bcdui.core.PromptDataProvider.prototype
 */
{
  /**
   * @classdesc
   * This is a data provider showing the user a prompt on each execute() and returning the value the user has entered. It is mainly intended for debugging.
   * @extends bcdui.core.DataProvider
   *
   * @constructs
   * @param {string=} args.name - Title provided to the user when the input box pops up.
   * @param {id=}     args.id   - Globally unique id for use in declarative contexts
   */
  constructor(/* object */ args)
    {
      super(args);
      this.type = this.getClassName();
      this.value = "";
      this.waitingForUncomittedChanges = new bcdui.core.status.WaitingForUncomittedChanges();
      this.initializedStatus = new bcdui.core.status.InitializedStatus();
    }

  getClassName() {return "bcdui.core.PromptDataProvider";}
  /**
   * Shows a pop-up input box where the user can enter a value. This value
   * is then returned by "getData".
   * @private
   */
  _executeImpl()
    {
      this.value = prompt(this.name, "")
      var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.initializedStatus;
      this.setStatus(newStatus);
    }
  /**
   * @return {NullStatus} The null status because since the value is provided in
   * the constructor and is therefore always ready.
   */
  getReadyStatus()
    {
      return this.initializedStatus;
    }
  /**
   * @return {string} The text the user has entered in the input dialog.
   */
  getData()
    {
      return this.value;
    }
};


bcdui.core.ConstantDataProvider = class extends bcdui.core.DataProvider
/**
 * @lends bcdui.core.ConstantDataProvider.prototype
 */
{
  /**
   * @classdesc
   *   A data provider for constant values. This is especially useful to set values for the xsl:param elements of a {@link bcdui.core.TransformationChain TransformationChain} subclass.
   * @extends bcdui.core.DataProvider
   * 
   * @constructs
   * @param {object}  args       - paramater map
   * @param {id=}     args.id    - Globally unique id for use in declarative contexts
   * @param {string=} args.name  - The name of the data provider. This name should be unique within the scopt it is used, however it is not required to globally unique
   * @param {(string|number|boolean|object)} args.value - The data
   */
  constructor(/* object */ args)
    {
      super(args);
      /*
       * Validate if the name and value parameters are present.
       */
      if (typeof args.value == "undefined") {
        throw Error("Must specify a \"value\" property in the parameter map for '"+(args.id || args.name)+"'");
      }
      /**
       * The value provided by the "getData" function.
       * @type String|Number|Boolean
       * @private
       */
      this.value = args.value;
      this.type = this.getClassName();

    }

    getClassName() {return "bcdui.core.ConstantDataProvider";}
  /**
   * This class is not calculating or loading its value in any sense so this
   * method is doing nothing.
   * @private
   */
  _executeImpl()
    {
    }
  /**
   * @return {bcdui.core.NullStatus} The null status because since the value is provided in
   * the constructor and is therefore always ready.
   */
  getReadyStatus()
    {
      return this.nullStatus;
    }
  /**
   * Getter for the value passed to the constructor.
   * @return {*} The data provided in the constructor of this instance.
   */
  getData()
    {
      return this.value;
    }
  /**
   * @return {String} A summary of this class showing the key and value.
   */
  toString()
    {
      return "[bcdui.core.ConstantDataProvider: " + this.id + ", name=" + this.name + ", value=" + this.value + " ]";
    }
}; // Create class: bcdui.core.ConstantDataProvider

bcdui.core.DataProviderHolder = class extends bcdui.core.DataProvider
/**
 * @lends bcdui.core.DataProviderHolder.prototype
 */
{
  /**
   * @classdesc
   * This acts as a holder for the real DataProvider and behaves like a DataProvider itself.
   * It is possible to instantiate this even without a source, we then only become ready, once a source was set and became ready.
   * Use this if a DataProvider or even its type is not known in the moment you need it as a parameter.
   * If we are executed, we pass through it directly or once out source is added later. 
   * We mirror our source's state but reduce them to only initialized and loaded = ready.
   * @extends bcdui.core.DataProvider
   *
   * @constructs
   * @param {object} [args] - The argument map
   * @param {bcdui.core.DataProvider} [args.source] - The data provider to be wrapped, unless set later via {@link bcdui.core.DataProviderHolder#setSource}
   * @param {string}                  [id]          - id
   */
  constructor(/* object */ args)
    {

      args = args || {};
      super( args);
      /**
       * The status the provider is in before it has loaded its data.
       * @type Status
       * @private
       */
      this.initializedStatus = new bcdui.core.status.InitializedStatus();
      /**
       * This status indicates that the data is available.
       * @type Status
       * @private
       */
      this.loadedStatus = new bcdui.core.status.LoadedStatus();

      // pendingExecute: If execute is called on us and we have no source yet, we execute the source once it is added later
      this.pendingExecute = false;
      this.setSource(args.source);
    }
  /**
   * @private
   */
  _isSourceReadyStatus(/* Status */ status)
    {
      return status.equals(this.source.getReadyStatus());
    }
  /**
   * @private
   */
  _isSourceReady()
    {
      return this._isSourceReadyStatus(this.source.getStatus());
    }
  /**
   * Helper allowing us to register ourselves as a listener. Cannot be prefixed by _ because onChange requires this method name
   * A callback method forwarding the source data provider's modification
   * events to the listeners of this object.
   * @private
   */
  callback(evtSrc, causedByReadyStatus)
    {
      if (!causedByReadyStatus)
        bcdui.core.DataProvider.prototype.fire.call(this);
    }

  fire()
    {
      if (this.source)
        this.source.fire();
    }
    
  /**
   * Reads value from a given xPath (or optionally return default value)
   * @param {string} xPath - xPath pointing to value 
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions 
   * @param {string} [defaultValue] - default value in case xPath value does not exist
   * @return text value stored at xPath (or null if nothing found and no defaultValue supplied or when source isn't set yet)
   */
  read(xPath, fillParams, defaultValue)
    {
      if (this.source)
        return this.source.read(xPath, fillParams, defaultValue);
      else {
        var def = (typeof fillParams == "string") ? fillParams : defaultValue;
        return (defaultValue === undefined ? null : def);
      }
    }
    
  /**
   * Set a value to on a certain xPath and create the xPath where necessary. 
   * This combines Element.evaluate() for a single node with creating the path where necessary. 
   * It will prefer extending an existing start-part over creating a second one.
   * After the operation the xPath (with the optional value) is guaranteed to exist (pre-existing or created or extended) and the addressed node is returned.
   * 
   * @param {string}  xPath        - xPath pointing to the node which is set to the value value or plain xPath to be created if not there. 
   *    It tries to reuse all matching parts that are already there. If you provide for example "/n:Root/n:MyElem/@attr1" and there is already "/n:Root/n:MyElem@attr1", then ""/n:Root/n:MyElem" will be "re-used" and get a second attribute attr1.
   *    Many expressions are allowed, for example "/n:Root/n:MyElem[@attr1='attr1Value']/n:SubElem" is also ok.
   *    By nature, some xPath expressions are not allowed, for example using '//' or "/n:Root/n:MyElem/[@attr1 or @attr2]/n:SubElem" is obviously not unambiguous enough and will throw an error.
   *    This method is Wrs aware, use for example '/wrs:Wrs/wrs:Data/wrs:*[2]/wrs:C[3]' as xPath and it will turn wrs:R[wrs:C] into wrs:M[wrs:C and wrs:O], see Wrs format.
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions 
   * @param {string}  [value]      - Optional value which should be written, for example to "/n:Root/n:MyElem/@attr" or with "/n:Root/n:MyElem" as the element's text content. 
   *    If not provided, the xPath contains all values like in "/n:Root/n:MyElem[@attr='a' and @attr1='b']" or needs none like "/n:Root/n:MyElem" 
   * @param {boolean} [fire=false] - If true a fire is triggered to inform data modification listeners
   * @return The xPath's node (can be null if source isn't set yet or dataProvider isn't ready)
   */
  write(xPath, fillParams, value, fire)
    {
      if (this.source)
        return this.source.write(xPath, fillParams, value, fire);
      else
        return null;
    }

  /**
   * removes given xPath
   * @param {string} xPath - xPath pointing to value 
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions 
   * @param {boolean} [fire=false] - if true a fire is triggered to notify data modification listener
   */
  remove(xPath, fillParams, fire)
    {
      if (this.source)
        this.source.remove(xPath, fillParams, fire);
    }

  /**
   * Reads a single node from a given xPath
   * @param {string} xPath - xPath to query 
   * @return single node or null if query fails or source isn't set yet
   */
  query(xPath)
    {
      if (this.source)
        return this.source.query(xPath);
      else
        return null;
    }

  /**
   * Get node list from a given xPath
   * @param {string} xPath - xPath to query 
   * @return node list or empty list if query fails or source isn't set yet
   */
  queryNodes(xPath)
    {
      if (this.source)
        return this.source.queryNodes(xPath);
      else
        return [];
    }

  /**
   * Executes the source DataProvider if it is not ready yet.
   * @private
   */
  _executeImpl()
    {
      if( !this.source ) {
        this.pendingExecute = true;
        return;
      }

      if (this.source.isReady()) {
        this.setStatus(this.loadedStatus);
      } else {
        this.source.execute(false);
      }
    }
  /**
   * @return {bcdui.core.Status} Returns the final state indicating the the value is available.
   */
  getReadyStatus()
    {
      return this.loadedStatus;
    }
  /**
   * @inheritdoc
   */
  getData()
    {
    // in case of a not yet set source we simulate a not-ready source by returning null. Use case: add listener on holder, set source later.
    return this.source ? this.source.getData() : null;
    }
  /**
   * @return {string} Human readable summary of this class.
   */
  toString()
    {
      return "[bcdui.core.DataProviderHolder: " + this.id + ", name = "+ this.name + " for " + this.source.id + " ]";
    }
  /**
   * Set the underlying source delayed instead of via the constructor.
   * The DataProviderHolder does only become ready after the source was set and is or becomes ready.
   */
  setSource( newSource )
  {
    this.setStatus(this.initializedStatus);

    var statListener = function(statusEvent) {
      if (this._isSourceReadyStatus(this.source.getStatus())) {
        this.setStatus(this.loadedStatus);
      } else {
        this.setStatus(this.initializedStatus);
      }
    }.bind(this);
    
    if( this.source ) {
      // TODO
      throw "bcdui.core.DataProviderHolder: Overwriting a source is not yet implemented";

//      this.source.removeStatusListener(statListener);
//      this.source.removeStatusListener(this);
    }

    // Maybe we just removed the previous source
    if( !newSource )
      return;

    // Otherwise set the new one an make us listen on it (status + dataModification)
    this.source = newSource;
    this.source.addStatusListener({
      listener: statListener
    });
    if (this._isSourceReady()) {
      this.setStatus(this.loadedStatus);
    }
    /*
     * We need to forward the modification events from the source to the
     * listeners of this data provider.
     */
    if (bcdui.util.isFunction(this.source.onChange)) {
      this.source.onChange(this);
    } else {
      bcdui.log.warn("NO onChange function:");
      bcdui.log.warn(this.source);
    }
    
    if( this.pendingExecute )
      this.source.execute(false);
  }
}; // Create class: bcdui.core.DataProviderHolder



bcdui.core.DataProviderAlias = class extends bcdui.core.DataProviderHolder
/**
 * @lends bcdui.core.DataProviderAlias.prototype
 */
{
  /**
   * @classdesc
   *   This class is a wrapper for a DataProvider giving it a new name (not id) and
   *   reducing its states to only initialized and loaded. It is useful for
   *   renaming a DataProvider before passing it to a TransformationChain so
   *   that a DataProvider can be mapped to an arbitrary xsl:param element.
   *   where the bcdui.core.DataProviderAlias' name is used as the xsl:param's name
   * @extends bcdui.core.DataProvider
   *
   * @constructs
   * @param {object} args - The argument map taking two mandatory parameters:
   * @param {bcdui.core.DataProvider} args.source - The data provider to be wrapped
   * @param {string}                  args.name - The new name of the data provider
   */
  constructor(/* object */ args)
  {

    if (typeof args.name == "undefined") {
      throw Error("Must specify a \"name\" property in the parameter map.");
    }
    super(args );

  }
};


bcdui.core.DataProviderWithXPath = class extends bcdui.core.DataProviderHolder
/**
 * @lends bcdui.core.DataProviderWithXPath.prototype
 */
{
  /**
   * @private
   */
  static _nullValue= null
  /**
   * @classdesc
   * Reading a single data item from an XPath on getData() as string.
   * See {@link bcdui.core.DataProviderWithXPathNodes DataProviderWithXPathNodes} for reading a full XML node-set
   * @extends bcdui.core.DataProviderHolder
   * 
   * @constructs
   * @param {object}  args
   * @param {modelXPath} args.xPath - Data source like <code>"$modelId/guiStatus:MyNode/@myAttr"</code>
   * @param {string=}    args.name  - Logical name of this DataProvider when used as a parameter in a transformation
   */
  constructor(/* object */ args)
    {
      if (typeof args.xPath == "undefined") {
        throw Error("Must specify an \"xPath\" property in the parameter map.");
      }

      var modelParams = bcdui.factory._extractXPathAndModelId(args.xPath);
      if (! args.source)
        args.source = bcdui.factory.objectRegistry.getObject(modelParams.modelId);
      args.xPath = modelParams.xPath;

      super(args);

      this._xPath = args.xPath;
      if (typeof args.nullValue != undefined)
        this._nullValue = args.nullValue;
      

    }
  /**
   * @private
   */
  _getDataElement()
    {
      if (this.source == null) return null;
      var data = this.source.getData();
      if (data == null) return null;
      if (typeof data.item == "undefined") {
        return data;
      }
      if (data.length > 0) {
        return data.item(0);
      }
      return null;
    }
  /**
   * @inheritdoc
   */
  getData()
    {
      var dataElement = this._getDataElement();
      if (dataElement == null) return this._nullValue;
      var result = dataElement.selectSingleNode(this._xPath);
      if (result == null) return this._nullValue;
      // if result is xml node attribute returning value
      if (result.nodeType == 2) return result.value;
      // else returning full node
      return result;
    }
  /**
   * @return {string}
   */
  getXPath()
    {
      return this._xPath;
    }
};


bcdui.core.DataProviderWithXPathNodes = class extends bcdui.core.DataProviderHolder
    /**
     * @lends bcdui.core.DataProviderWithXPathNodes.prototype
     */
    {
      /** 
       * @classdesc
       *  This class creates a static model with a top level element '<Root/>' and appends all
       *  the elements that are found by xpath as children. Useful for be passing data as parameter to an XSLT transformation.
       *  See {@link bcdui.core.DataProviderWithXPath DataProviderWithXPath} for reading a single value as a string
       * @extends bcdui.core.DataProviderHolder
       *
       * @constructs
       * @param {object}                  args
       * @param {modelXPath}              [args.xPath]  - Data source like <code>"$modelId/guiStatus:MyNode/@myAttr"</code>
       * @param {bcdui.core.DataProvider} [args.source] - Optional source, which will override source reference from args.xPath
       * @param {string}                  [args.name]   - Logical name of this DataProvider when used as a parameter in a transformation
       */
      constructor(/* object */ args)
        {
          if (typeof args.xPath == "undefined") {
            throw Error("Must specify an \"xPath\" property in the parameter map.");
          }

          var modelParams = bcdui.factory._extractXPathAndModelId(args.xPath);
          if (! args.source)
            args.source = bcdui.factory.objectRegistry.getObject(modelParams.modelId);
          args.xPath = modelParams.xPath;

          super( args);
          this._xPath = args.xPath;

        }
      /**
       * returns the root-element of the document
       * @private
       */
      _getDataElement()
        {
          if (this.source == null) return null;
          var data = this.source.getData();
          if (data == null) return null;
          if (typeof data.item == "undefined") {
            return data;
          }
          if (data.length > 0) {
            return data.item(0);
          }
          return null;
        }
      /**
       * The xpath is applied to dataElement with selectSingleNode, selectNodes doesnt work in firefox 
       * @inheritdoc
       */
      getData()
        {
          var dataElement = this._getDataElement();
          var nodes = null;
          if (dataElement != null) {
            nodes  = jQuery.makeArray(dataElement.selectNodes(this._xPath));
          }

          var newDoc = bcdui.core.browserCompatibility.createDOMFromXmlString("<Root/>");
          var parent = newDoc.documentElement;
          if (nodes != null){
            nodes.forEach( function(e){
              if( e.nodeType===2 ){
                parent.appendChild( newDoc.createElement(e.nodeName) ).text=e.nodeValue;
              } else
                parent.appendChild(e.cloneNode(true));
            })
          }
          return newDoc;
        }
      /**
       * @return {string}
       */
      getXPath()
        {
          return this._xPath;
        }
    };

bcdui.core.OptionsDataProvider = class extends bcdui.core.DataProviderHolder
/**
 * @lends bcdui.core.OptionsDataProvider.prototype
 */
{
  /** 
   * @classdesc
   *  This class creates a static model with a top level element '&lt;cust:Options/>' and appends all
   *  the elements that are found by xpath as children (as element '&lt;cust:Option value="v" caption="x"/>').
   *  Useful for be passing data as parameter to transformators.
   * @extends bcdui.core.DataProviderHolder
   *
   * @constructs
   * @param {object}                  args
   * @param {modelXPath}              args.optionsModelXPath                - Data xPath with model reference, like <code>"$modelId/guiStatus:MyNode/@myAttr"</code>,
   *                                                                        is treated as value+caption in case args.optionsModelRelativeValueXPath is NOT DEFINED or
   *                                                                        is treated as value only in case args.optionsModelRelativeValueXPath IS DEFINED.
   * @param {xPath}                   [args.optionsModelRelativeValueXPath] - optional xPath relative to args.optionsModelXPath
   * @param {string}                  [args.name]                           - Logical name of this DataProvider when used as a parameter in a transformation
   */
  constructor(/* object */ args){
    super( args);

    if (!args.optionsModelXPath) {
      throw Error('Must specify an "optionsModelXPath" property in the parameter map.');
    }

    this.args = jQuery.extend(true, {}, args, {
      options : bcdui.factory._extractXPathAndModelId(args.optionsModelXPath)
    });
    this.args.source = args.source = bcdui.factory.objectRegistry.getObject(this.args.options.modelId);

  }
  /**
   * returns the root-element of the document
   * @private
   */
  _getDataElement(){
    if (this.args.source == null) return null;
    var data = this.args.source.getData();
    if (data == null) return null;
    if (typeof data.item == "undefined") {
      return data;
    }
    if (data.length > 0) {
      return data.item(0);
    }
    return null;
  }
  /**
   * @inheritdoc
   */
  getData(){
    var dataElement = this._getDataElement();
    var nodes = null;
    if (dataElement != null) {
      nodes  = jQuery.makeArray(dataElement.selectNodes(this.args.options.xPath));
    }

    var newDoc = bcdui.core.browserCompatibility.createDOMFromXmlString('<cust:Options xmlns:cust="http://www.businesscode.de/schema/bcdui/customization-1.0.0" xmlns="http://www.businesscode.de/schema/bcdui/customization-1.0.0"/>');
    var parent = newDoc.documentElement;
    if (nodes != null){
      nodes.forEach(function(n){
        var captionNode = n;
        var valueNode = this.args.optionsModelRelativeValueXPath ? n.selectSingleNode(this.args.optionsModelRelativeValueXPath) : null;
        var optionNode = bcdui.core.browserCompatibility.appendElementWithPrefix(parent, "cust:Option");
        optionNode.setAttribute("value", (valueNode || captionNode).text);
        optionNode.setAttribute("caption", captionNode.text);
      }.bind(this))
    }
    return newDoc;
  }
};

bcdui.core.RequestDocumentDataProvider = class extends bcdui.core.DataProvider
/**
 * @lends bcdui.core.RequestDocumentDataProvider.prototype
 */
{
  /**
   * @classdesc
   * Turns a DataProvider into a URL provider for SimpleModel.<p/>
   * We do reflect the status of the requestModel transparently as we are just glueware.
   * If the requestModel becomes invalid or throws dataModification, we do also become not-ready and stay so. 
   * Even if the requestModel becomes ready again, we stay until we are executed unless args.isAutoRefresh = true is set.
   * @extends bcdui.core.DataProvider
   * 
   * @constructs
   * @param {Object} args - Parameter object
   * @param {bcdui.core.DataProvider}        [args.requestModel]            - A DataProvider providing a request, for example a wrs:WrsRequest
   * @param {string}                         [args.url]                     - URL to load the data from, use this or args.requestModel.
   * @param {string|bcdui.core.DataProvider} [args.modelUrl=WrsServlet]     - When using args.requestModel, this is a string or string- DataProvider with the URL which to send the requestModel result to
   * @param {string}                         [args.uri]                     - uri extension as a suffix to .url to tag requests, must not start with '/'. This parameter is ineffective if .modelUrl or .url is provided.
   * @param {id}                             [args.id]                      - Globally unique id for use in declarative contexts
   * @param {boolean}                        [args.isAutoRefresh=false]     - If true, this DataProvider will always update itself when the requestDoc changes (without the need for execute) and fire a data modification event
   *                                                                          If used as a urlProvider from a {@link bcdui.core.SimpleModel SimpleModel}, it inherits its isAutoRefresh
   * @param {boolean}                        [args.attachSessionHash=false] - Logical name of this DataProvider when used as a parameter in a transformation
   * @param {string}                         [args.name]                    - Logical name of this DataProvider when used as a parameter in a transformation, locally unique
   * @param {string}                         [args.method=GET]              - Request method for SimpleModel, either "POST" or "GET"
   * @example
   * // Load a SimpleModel from a static Wrs request
   * var requestString = 
   *   "&lt;WrsRequest xmlns=\"http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0\" xmlns:f=\"http://www.businesscode.de/schema/bcdui/filter-1.0.0\">" +
   *   "  &lt;Select>"+
   *   "    &lt;Columns> &lt;C bRef='region'/> &lt;/Columns>"+
   *   "    &lt;From> &lt;BindingSet>md_geo</BindingSet> &lt;/From>"+
   *   "    &lt;f:Filter> &lt;f:Expression bRef='country' op='=' value='US'/> &lt;/f:Filter>"+
   *   "    &lt;Grouping> &lt;C bRef='region'/> &lt;/Grouping>"+
   *   "  &lt;/Select>"+
   *   "&lt;/WrsRequest>";
   * var myRequestModel = new bcdui.core.StaticModel( requestString );
   * var myUrlProvider  = new bcdui.core.RequestDocumentDataProvider({ requestModel: myRequestModel });
   * var geoModel       = new bcdui.core.SimpleModel({ url: myUrlProvider, isAutoRefresh: true});
   * geoModel.execute();
   * // Once geoModel.isReady() === true, it will hold region data for 'US'
   * 
   * // Somewhat later
   * myRequestModel.getData().selectSingleNode("/wrq:WrsRequest/wrq:Select/f:Filter/f:Expression[@bRef='country']/@value").nodeValue = "FR";
   * myRequestModel.fire();
   * // It will auto-reload and once geoModel.isReady() === true, it will hold region data for 'FR'
   */
  constructor(args){
    super(args);    
    args.modelURL = args.modelURL || args.modelUrl;
    
    this.method = (args.method != "GET" && args.method != "POST") ? "GET" : args.method;

    args["name"] = args.name || args.id;
    
    this.isAutoRefresh = args.isAutoRefresh;
    this.value = "";
    this.url = null;
    this.uri = args.uri;
    this.requestModel = null;
    if( bcdui.util.isString(args.url) ) {
      this.url = args.url;
      this.requestModel = new bcdui.core.SimpleModel({url:this.url, id: this.id + "_RequestDocDummy"});
    }
    else if(args.url)
      this.requestModel=args.url;
    else
      this.requestModel=args.requestModel;
    this.modelURLArg = args.modelURL || "";
    this.didAddListener = false;
    this.attachSessionHash = args.attachSessionHash;

    this.waitingForUncomittedChanges = new bcdui.core.status.WaitingForUncomittedChanges();

    // Status after instantiation or rest status after out input become invalid eventually (i.e. we are waiting to be executed (again))
    this.initializedStatus = new bcdui.core.status.InitializedStatus();
    // We will update ourselves as soon as out requestModel becomes ready, i.e. we are "actively" waiting
    this.waitingForParameterStatus = new bcdui.core.status.WaitingForParametersStatus();
    // TransformingStatus: Waiting for the compressed do to become available (can involve an async server request)
    this.transformingStatus = new bcdui.core.status.TransformingStatus();
    // TransformedStatus means, we are ready
    this.transformedStatus = new bcdui.core.status.TransformedStatus();

    this.requestModel.onChange({
      callback: function(){
        if(this.getStatus().equals(this.waitingForParameterStatus) || this.isAutoRefresh)
          this.setStatus(this.transformingStatus);
        else
          this.setStatus(this.initializedStatus); // waiting for the next execute
      }.bind(this)
    });

    this.requestModel.addStatusListener({
      listener: function(event) {
        if( ! event.status.equals(this.requestModel.getReadyStatus()) )
          this.markAsDirty();
      }.bind(this)// end listener func
    });

    this.addStatusListener(this._statusTransitionHandler.bind(this));
    
  }
  /**
   * @private
   */
  _statusTransitionHandler(/* StatusEvent */ statusEvent)
  {

    if (statusEvent.getStatus().equals(this.transformingStatus)) {
      this._retrieveCompressedValue();
    }
  }

  /**
   * Here we rely that the requestModel is ready, we get its value, compress it and mark ourself as ready
   * @private
   */
  _retrieveCompressedValue()
  {
    bcdui.core.compression.compressDOMDocument(this.requestModel.getData(), function(compressedString)
    {
      // decide which servlet url to use:
      // prio (from hi to low): model url argument, @url binding set attribute, standard
      var binding = this.requestModel.getData().selectSingleNode("//wrq:BindingSet");
      this.modelURL = bcdui.core.webRowSetServletPath;
      if(this.uri){
        this.modelURL += "/" + this.uri;
      }
      if (this.modelURLArg != "")
        this.modelURL = this.modelURLArg;
      else if (binding != null && binding.getAttribute("url"))
        this.modelURL = bcdui.contextPath + binding.getAttribute("url");

      this.value = this.modelURL + (this.modelURL.indexOf("?")==-1 ? "?" : "&") + "guiStatusGZ=" + compressedString;
      // attach sessionHash if forced or the URL contains well-known classifier for session cached resources
      if(this.attachSessionHash || this.value.indexOf("/servletsSessionCached/")>-1){
        this.value += "&sessionHash=" + bcdui.config.sessionHash;
      }
      var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.getReadyStatus();
      this.setStatus(newStatus);
    }.bind(this));
  }

  /**
   * @private
   */
  _executeImpl()
  {
    if(this.requestModel.isClear())
      this.setStatus(this.transformingStatus);
    else {
      this.setStatus(this.waitingForParameterStatus);
      this.requestModel.execute(false);
    }
  }
  /**
   * @inheritdoc
   */
  getData()
  {
    return this.value;
  }
  /**
   * @inheritdoc
   */
  getReadyStatus()
  {
    return this.transformedStatus;
  }
  /**
   * @inheritdoc
   */
  getStatus()
  {
    // Quick check: Can be that our input model became invalid and we have not heard about it yet in the listener -> dirty-flag ourselves and refresh
    if(this.requestModel && !this.requestModel.isReady() )
      this.markAsDirty();
    return this.status;
  }
  /**
   * @inheritdoc
   */
  isReady() {
    return this.getStatus().equals(this.transformedStatus);
  }
  setIsAutoRefresh(isAutoRefresh) {
    this.isAutoRefresh = isAutoRefresh;
  }
  // Our input model changed.
  // We will either just become initialized and wait until we are executed again
  // Or we are autoRefresh or anyway "actively" waiting for the model to become ready again, then we go to (or continue to be) waitingForParameter
  markAsDirty()
  {
    if( this.isAutoRefresh )
      this.setStatus(this.waitingForParameterStatus);
    else if( !this.status.equals(this.waitingForParameterStatus) )
      this.setStatus(this.initializedStatus);
  }
};// end RequestDocumentDataProvider


bcdui.core.DataProviderHtmlAttribute = class extends bcdui.core.DataProvider
/**
 * Retrieves its value from an HTML element attribute
 * @lends bcdui.core.DataProviderHtmlAttribute.prototype
 */
{
  /**
   * @classdesc
   * A DataProvider retrieving its content on getData() from an attribute in the HTML DOM tree.
   * @extends bcdui.core.DataProvider
   * 
   * @constructs
   * @param {Object} args
   * @param {string} args.htmlElementId
   * @param {string} args.attributeName
   * @example
   * &lt;div id="myDiv" attr="123">&lt;/div>
   * &lt;script type="text/javascript">
   *   var dp = new bcdui.core.DataProviderHtmlAttribute({ htmlElementId: 'myDiv', attributeName: 'attr'});
   *   console.log(dp.getData());
   * &lt;/script>
   */
  constructor(/* object */ args)
  {
    super( args);
    this.htmlElementId = args.htmlElementId;
    this.attributeName = args.attributeName;
  }
  /**
   * @inheritsdoc
   */
  getData()
  {
    var element = document.getElementById(this.htmlElementId);
    if( !element )
      return null;
    return element.getAttribute(this.attributeName);
  }
  /**
   * @inheritsdoc
   */
  getReadyStatus()
  {
    return this.nullStatus;
  }
};


bcdui.core.StringDataProvider = class extends bcdui.core.DataProvider
/** @lends bcdui.core.StringDataProvider.prototype */
{
  /**
   * @classdesc
   * A StringDataProvider provides a plain string via getData()
   * @extends bcdui.core.DataProvider
   * 
   * @constructs
   * @param {Object} args
   * @param {string} args.value  - The data
   * @param {id}     [args.id]   - Globally unique id for use in declarative contexts
   * @param {string} [args.name] - Logical name of this DataProvider when used as a parameter in a transformation, locally unique
   */
  constructor(args){
    super( args);

    /*
     * Verification of the "value" parameter.
     */

    if (typeof args.value == "undefined") {
      throw Error("Must provide 'value' parameter");
    }
    this.value = args.value;

    /* Status objects */

    this.waitingForUncomittedChanges = new bcdui.core.status.WaitingForUncomittedChanges();

    /**
     * @constant
     */
    this.initializedStatus = new bcdui.core.status.InitializedStatus();
    /**
     * @constant
     */
    this.transformedStatus = new bcdui.core.status.TransformedStatus();

    /* These stati are considered as ready stati for modelUpdaters running on this model. */
    this._readyStatiForModelUpdates = [ this.transformedStatus ];

    this.addStatusListener(this._statusTransitionHandler.bind(this));

    this.setStatus(this.initializedStatus);
  }
  /**
   * @inheritdoc
   */
  getReadyStatus(){
    return this.transformedStatus;
  }
  /**
   * @private
   */
  _executeImpl(){
    // nothing to be done
  }
  /**
   * @private
   */
  _statusTransitionHandler(/* StatusEvent */ statusEvent){
    if (statusEvent.getStatus().equals(this.initializedStatus)) {
      /*
       * The StringDataProvider has only one simple transition, which is performed
       * on every set val
       */
      var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.getReadyStatus();  
      this.setStatus(newStatus);
    }
  }
  /**
   * @inheritdoc
   */
  getData(){
    return this.value;
  }
  /**
   * Assign a new value
   * @param {string} value - The new value
   */
  setData(value){
    if ( this.value != value){
      this.value = value;
      this.setStatus(this.initializedStatus);
    }
  }
  /**
   * Debugging function showing a text for this model.
   * @return {string} A summary of the model.
   */
  toString(){
    return "[bcdui.core.StringDataProvider: " + this.id + "]";
  }

};


bcdui.core.JsDataProvider = class extends bcdui.core.DataProvider
/**
 * @lends bcdui.core.JsDataProvider.prototype
 */
{
  /**
   * @classdesc
   * Allows providing a custom js callback function returning a value.
   * @extends bcdui.core.DataProvider
   * 
   * @constructs
   * @param {Object} args - The parameter map contains the following properties:
   * @param {function} args.callback                 - The callback providing the data
   * @param {boolean}  [args.doAllwaysRefresh=false] - If true, each getData() calls the callback, otherwise only execute() will do.
   * @param {id}       [args.id]                     - Globally unique id for use in declarative contexts
   * @param {string}   [args.name]                   - Logical name of this DataProvider when used as a parameter in a transformation, locally unique
   */
  constructor(/* object */ args)
    {
      super(args);
      this.callback = args.callback;
      this.doAllwaysRefresh = typeof args.doAllwaysRefresh == "undefined" ? false : true;
      this.value = "";
      this.waitingForUncomittedChanges = new bcdui.core.status.WaitingForUncomittedChanges();
      this.initializedStatus = new bcdui.core.status.InitializedStatus();
      this.transformedStatus = new bcdui.core.status.TransformedStatus();

      var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.transformedStatus;
      this.setStatus( this.doAllwaysRefresh ? newStatus : this.initializedStatus );
    }
  /**
   * Calls the provided function
   * is then returned by "getData".
   * @private
   */
  _executeImpl()
    {
      this.value = this.callback();
      var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.transformedStatus;
      this.setStatus(newStatus);
    }
  /**
   * @inheritdoc
   */
  getReadyStatus()
    {
      return this.transformedStatus;
    }
  /**
   * @return {string} The text returned by the callback function
   */
  getData()
    {
      if( this.doAllwaysRefresh )
        this.value = this.callback();
      return this.value;
    }
};


bcdui.core.AsyncJsDataProvider = class extends bcdui.core.DataProvider
  /**
   * @lends bcdui.core.AsyncJsDataProvider.prototype
   */
  {
    /**
     * @classdesc
     * Allows providing a js callback function for deferred execution which has to execute .setData(data) on provided instance once data is available.<p/>
     * As all DataProviders, AsyncJsDataProvider will not become ready until data is available, i.e. until the callback has delivered data for the first time.
     * This leaves the callback time to do asynchronous data requests against a server for example.
     * @extends bcdui.core.DataProvider
     * 
     * @constructs
     * @param args The parameter map contains the following properties:
     * @param {function} args.callback - The callback providing the data; gets args object with 'setData' function to call once data is available.
     * @param {id}       [args.id]     - A globally unique id for use in declarative contexts
     * @param {string}   [args.name]   - Logical name of this DataProvider when used as a parameter in a transformation, locally unique
     */
    constructor(/* object */ args)
      {
        super( args);
        this.type = this.getClassName();
        this.callback = args.callback;
        this.value = null;
        this.waitingForUncomittedChanges = new bcdui.core.status.WaitingForUncomittedChanges();
        // object is initialized
        this.initializedStatus = new bcdui.core.status.InitializedStatus();
        // waiting for callback to .setData() in this status no further transition is possible
        this.transformingStatus = new bcdui.core.status.TransformingStatus();
        // we are ready
        this.transformedStatus = new bcdui.core.status.TransformedStatus();
        this.setStatus( this.initializedStatus );
      }
    /**
     * Calls the provided function which in turn set to .setData()
     *
     * @private
     * @member bcdui.core.AsyncJsDataProvider
     */
    _executeImpl()
      {
        // we are still transforming, dont trigger callback
        if(this.getStatus() === this.transformingStatus){
          return;
        }
        this.setStatus(this.transformingStatus);
        try{
          this.callback({setData : this.setData.bind(this)});
        }catch(e){
          bcdui.log.warn("error occurred while executing JS callback", e);
        }
      }
    /**
     * To be called by the callback once data is available. Sets data and transits this dataproviders state to .getReadyStatus() and fires data updated event
     * @param {*} data
     */
    setData(data)
    {
      // first set data
      this.value = data;

      // now switch state
      var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.transformedStatus;
      this.setStatus(newStatus);
    }
    /**
     * @inheritdoc
     */
    getReadyStatus(){
      return this.transformedStatus;
    }
    /**
     * @inheritdoc
     */
    getData(){
      if(bcdui.config.isDeubg && !this.isReady()){
        bcdui.log.warn("called .getData() although the model is not is ready state", this);
      }
      return this.value;
    }
};