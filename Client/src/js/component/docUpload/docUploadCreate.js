/*
  Copyright 2010-2021 BusinessCode GmbH, Germany

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
* This namespace contains functionality directly related to BCD-UI docUpload
* @namespace bcdui.component.docUpload
*/
"use strict"; 

/**
 * Creates an Uploader
 * @extends bcdui.core.Renderer
 */
bcdui.component.docUpload.Uploader = class extends bcdui.core.Renderer
{
  /**
  * @param args The parameter map contains the following properties:
  * @param {targetHtmlRef}           args.targetHtml                                        - A reference to the HTML DOM Element where to put the output
  * @param {string}                  args.scope                                             - The scope identifier, can be a space separated string when you want to map multiple scopeId and instanceId
  * @param {string}                  args.instance                                          - The instance identifier, can be a space separated string when you want to map multiple scopeId and instanceId
  * @param {string}                  [args.id]                                              - The object's id, needed only when later accessing via id. If given the docUpload registers itself at {@link bcdui.factory.objectRegistry}
  * @param {Object}                  [args.map]                                             - scope/instance map, alternative way to specify multiple scope/instances
  * @param {string}                  [args.addBRefs]                                        - Space separated list of additional bRefs you want to load
  * @param {string}                  [args.bindingSetId=bcd_docUpload]                      - Optional binding set id used for document storage, by default bcd_docUpload is used
  * @param {string}                  [args.doAcknowledge=false]                             - Set to true if acknowledge mode is required
  * @param {string}                  [args.downloadAll=false]                               - Set to true if you want to be able to download/zip all documents
  * @param {function}                [args.onBeforeSave]                                    - Function which is called before each save operation. Parameter holds current wrs dataprovider. Function needs to return true to save or false for skipping save process and resetting data
  * @param {filterBRefs}             [args.filterBRefs]                                     - The space separated list of binding Refs that will be used in filter clause of request document
  * @param {string}                  [args.zipName=documents.zip]                           - The filename for the generated zip, ensure it ends with .zip
  * @param {targetHtmlRef}           [args.zipDownloadTargetHtml]                           - optional targetHml htmlElement or jQuery object for zip download button, if not present, it's rendered to its default place
  * @param {chainDef}                [args.renderChain]                                     - A custom renderer chain 
  * @param {Object}                  [args.renderParameters]                                - Renderer parameters. Will be enrichted with docUploader default parameters
  * @param {bcdui.core.DataProvider} [args.config=bcdui.wkModels.bcdDocUpload]              - The model containing the docUpload configuration data. If it is not present the well known bcdui.wkModels.bcdDocUpload is used
  */
  constructor(args){

    if ((! args.scope || ! args.instance) && ! args.map) 
      throw new Error("You need to specify a scope and an instance value or a scope/instance map");

    var widgetId = args.id || bcdui.factory.objectRegistry.generateTemporaryIdInScope("docUploader");
    var targetHtml = bcdui.util._getTargetHtml(args, "docUploader_");
    var config = args.config || bcdui.wkModels.bcdDocUpload;

    var bindingSetId = args.bindingSetId || "bcd_docUpload";

    let scopes = args.scope ? args.scope.split(" ") : [];
    let instances = args.instance ? args.instance.split(" ") : [];

    if (args.map) {
      scopes = [];
      instances = [];
      for (let scope in args.map) {
        if (scope && typeof scope == "string") {
          scopes.push(scope);
          if (args.map[scope] && typeof args.map[scope] == "string")
            instances.push(args.map[scope])
        }
      }
    }

    if (scopes.length != instances.length)
      throw new Error("You need to specify the same amount of scopes and an instances");

    let filterExpression = "";
    scopes.forEach(function(e, i) {
      filterExpression += (i > 0 ? " or " : "") + "(scope='" + e +"' and instance='" + instances[i] + "')";
    });

    // get data from virtual filesystem for current scopes and instances and additional bRefs
    // ensure fileExists at last position (for later comment write modification)
    var finalBRefs = "path metaData scope required instance updatedBy lastUpdate " + (args.doAcknowledge ? "acknowledged" : "") + (args.addBRefs ? " " + args.addBRefs : "");
    finalBRefs = finalBRefs.split(" ").filter(function(e) { return e != "" && e != "fileExists"; });
    finalBRefs = finalBRefs.filter(function(e, idx){return finalBRefs.indexOf(e) == idx}); // make unique
    finalBRefs.push("fileExists");

    var dataModel = new bcdui.core.AutoModel({bRefs: finalBRefs.join(" "), bindingSetId: bindingSetId, filterElement: bcdui.wrs.wrsUtil.parseFilterExpression(filterExpression), isAutoRefresh: false, filterBRefs: args.filterBRefs
    , saveOptions: {
      // after saving, we unblock the ui and reload the model and of course refresh the vfs
        onSuccess: function() { jQuery.ajax({method: "GET", url : bcdui.contextPath+ "/bcdui/servlets/CacheManager?action=refreshVFS", success : function (data, successCode, jqXHR) { setTimeout(jQuery.unblockUI); } }) }
      , onFailure: function() { setTimeout(jQuery.unblockUI);}
      , onWrsValidationFailure: function() { setTimeout(jQuery.unblockUI); }
      , reload: true
    }
    });

    // let's build a model which holds the information active data
    var infoModel = new bcdui.core.ModelWrapper({
      inputModel: new bcdui.core.StaticModel("<Root/>")
    , chain: function(doc, cargs) {
        var metaDataIndex = parseInt(cargs.dataModel.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='metaData']/@pos").text, 10);
        var userIndex = parseInt(cargs.dataModel.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='updatedBy']/@pos").text, 10);
        var tsIndex = parseInt(cargs.dataModel.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='lastUpdate']/@pos").text, 10);
        var pathIndex = parseInt(cargs.dataModel.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='path']/@pos").text, 10);
        var fileExistsIndex  = parseInt(cargs.dataModel.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='fileExists']/@pos").text, 10);
        
        var scopeIndex  = parseInt(cargs.dataModel.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='scope']/@pos").text, 10);
        var instanceIndex  = parseInt(cargs.dataModel.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='instance']/@pos").text, 10);
        
        // rebuild it completely
        bcdui.core.removeXPath(doc, "/*/Entry", false);
        Array.from(cargs.dataModel.selectNodes("/*/wrs:Data/wrs:R")).forEach(function(e) {
          try {
            var metaData = e.selectSingleNode("wrs:C[" + metaDataIndex + "]").text;
            var d = bcdui.util.xml.parseDocument(metaData);
            var category = d.selectSingleNode("/*/Category");
            
            // take only entries which have a category setting in their metaData data
            if (category != null) {
              var id = category.getAttribute("id");
              if (id) {

                // user and ts are columns
                var user = bcdui.util.escapeHtml(e.selectSingleNode("wrs:C[" + userIndex + "]").text) || "";
                var ts = bcdui.util.escapeHtml(e.selectSingleNode("wrs:C[" + tsIndex + "]").text) || "";
                var fileExists = ("1" == e.selectSingleNode("wrs:C[" + fileExistsIndex + "]").text);
                
                var scope = bcdui.util.escapeHtml(e.selectSingleNode("wrs:C[" + scopeIndex + "]").text) || "";
                var instance = bcdui.util.escapeHtml(e.selectSingleNode("wrs:C[" + instanceIndex + "]").text) || "";

                // filename and comment are part of the metaData
                var uuid = category.getAttribute("uuid") || bcdui.util.getUuid();
                var fileName = category.getAttribute("fileName") || "-";
                var comment = category.getAttribute("comment") || "";
                var fileSize = bcdui.util.escapeHtml(category.getAttribute("fileSize") || "0");
                fileSize = parseInt(fileSize, 10);
                var fSize = fileSize + " Byte";
                if (fileSize > 1000) {
                  if (fileSize / 1024 < 1000)
                    fSize = (fileSize / 1024).toFixed(2) + " KByte";
                  else if (fileSize / 1024 / 1024 < 1000)
                    fSize = (fileSize / 1024 / 1024 ).toFixed(2) + " MByte";
                  else
                    fSize = (fileSize / 1024 / 1024 / 1024 ).toFixed(2) + " GByte";
                }

                var path = e.selectSingleNode("wrs:C[" + pathIndex + "]").text || "";
                var ext = fileName.indexOf(".") > -1 ? fileName.substring(fileName.lastIndexOf(".") + 1) : "";
                
                if (! fileExists)
                  fSize = "-";
                
                // add entry
                if (cargs.doAcknowledge) {
                  const acknowledgedIndex  = parseInt(cargs.dataModel.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='acknowledged']/@pos").text, 10);
                  const acknowledged = ("1" == e.selectSingleNode("wrs:C[" + acknowledgedIndex + "]").text);
                  bcdui.core.createElementWithPrototype(doc, "/*/Entry[@instance='"+instance+"' and @scope='"+scope+"' and @acknowledged='"+acknowledged+"' and @uuid='"+uuid+"' and @fileExists='"+fileExists+"' and @ext='"+ext+"' and @download='"+fileName+"' and @link='"+path+"' and @rowId='"+e.getAttribute("id")+"' and @catId='"+id+"' and @ts='"+ts+"' and @user='"+user+"' and @comment='"+comment+"' and @fileName='"+fileName+"' and @fileSizePrint='"+fSize+"' and @fileSize='"+fileSize+"']");
                }
                else
                  bcdui.core.createElementWithPrototype(doc, "/*/Entry[@instance='"+instance+"' and @scope='"+scope+"' and @uuid='"+uuid+"' and @fileExists='"+fileExists+"' and @ext='"+ext+"' and @download='"+fileName+"' and @link='"+path+"' and @rowId='"+e.getAttribute("id")+"' and @catId='"+id+"' and @ts='"+ts+"' and @user='"+user+"' and @comment='"+comment+"' and @fileName='"+fileName+"' and @fileSizePrint='"+fSize+"' and @fileSize='"+fileSize+"']");
              }
            }
          }
          catch(ex) {/* parsing of metaData failed... */}
        });
        return doc;
      }
      , parameters: {dataModel: dataModel, config: config, doAcknowledge: args.doAcknowledge}
    });

    // the actual renderer call
    // we add a hidden fileinput before the actual targetHtml
    jQuery("#" + targetHtml).append("<input bcdRole='fileInput' type='file' accept='.zip,.csv,.xlsx,.txt,.pdf,.doc,.docx,.png,.jpg,.gif,.jpeg,.svg,.ppt' style='display: none' onChange='bcdui.component.docUpload._onFileInputChange(this);'></input><div class='bcdDocUploader'></div>");

    var finalParams = {
      config: config
    , instances: instances.join(" ")
    , scopes: scopes.join(" ")
    , dataModel: dataModel
    , infoModel: infoModel
    , doAcknowledge: "" + args.doAcknowledge
    , i18_view: bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_DocUploader_View"}) || "VIEW"
    , i18_delete: bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_DocUploader_Delete"}) || "DELETE"
    , i18_comment: bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_DocUploader_Comment"}) || "COMMENT"
    , i18_download: bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_DocUploader_Download"}) || "DOWNLOAD"
    , i18_acknowledged_off: bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_DocUploader_Unacknowledged"}) || "CLICK TO UNACKNOWLEDGED"
    , i18_acknowledged_on: bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_DocUploader_Acknowledged"}) || "CLICK TO ACKNOWLEDGED"
    , i18_download_all: bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_DocUploader_DownloadAll"}) || "ZIP"
    , allowedScopes: bcdui.config.clientRights && bcdui.config.clientRights.bcdDocUpload ? "|" + bcdui.config.clientRights.bcdDocUpload.join("|") + "|" : ""
    };
    if (args.renderParameters) {
      jQuery.extend(finalParams, args.renderParameters);
    }

    super({
        id: widgetId
      , targetHtml: jQuery("#" + targetHtml).find(".bcdDocUploader")
      , chain: [function(doc, args) {
          Array.from(args.config.selectNodes("//rnd:Category")).forEach(function(n) {
            const help = n.getAttribute("help") || "";
            if (help.indexOf(bcdui.i18n.TAG) == 0)
              n.setAttribute("help", bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: help})));
          });
          return doc;
        }, args.renderChain || bcdui.contextPath + "/bcdui/js/component/docUpload/docUploadRenderer.xslt"]
      , parameters: finalParams
    });
    
    // take over all models and information to instance
    this.targetHtml = targetHtml;
    this.zipDownloadTargetHtml = args.zipDownloadTargetHtml;
    this.config = config;
    this.instances = instances;
    this.scopes = scopes;
    this.dataModel = dataModel;
    this.infoModel = infoModel;
    this.onBeforeSave = args.onBeforeSave;
    this.finalBRefs = finalBRefs;
    this.filterBRefs = args.filterBRefs;
    this.doAcknowledge = args.doAcknowledge;
    this.downloadAll = args.downloadAll;
    this.bindingSetId = bindingSetId;
    this.zipName = args.zipName || "documents.zip";
    this.filterExpression = filterExpression;

    // reexecute infoModel and renderer when dataModel was saved/deleted
    this.onceReady(function() {
      this.dataModel.onReady(function() {
        this.infoModel.onceReady(function() { this.execute(true); }.bind(this)); this.infoModel.execute(true);
      }.bind(this));
    }.bind(this));

    // after each rendering, reactivate jquery event hooks
    this.onReady(function() {

      var self = this;
      
      if (this.downloadAll) {
        if (this.zipDownloadTargetHtml) {
          jQuery(this.zipDownloadTargetHtml).find(".downloadAll").remove();
          jQuery(this.zipDownloadTargetHtml).append("<div class='downloadAll'><span class='bcdButton btn-primary zipLink'><a class='zipLink'>"+finalParams.i18_download_all+"</a></span></div>");
        }
        else {
          jQuery("#" + this.targetHtml).find(".docUploaderContainer .downloadAll").remove();
          jQuery("#" + this.targetHtml).find(".docUploaderContainer").prepend("<div class='downloadAll'><span class='bcdButton btn-primary zipLink'><a class='zipLink'>"+finalParams.i18_download_all+"</a></span></div>");
        }
      }

      // store docUploader instance
      jQuery("#" + targetHtml).find(".bcdDocUploader").data("objects", {instance: this});

      // add download all anchor
      let vfsConfig = '<Vfs xmlns="http://www.businesscode.de/schema/bcdui/vfs-1.0.0" xmlns:vfs="http://www.businesscode.de/schema/bcdui/vfs-1.0.0"><Zip>';
      
      let filesLength = 0;
      self.scopes.forEach(function(scope) {

        if (self.scopes.length > 1) {
          const caption = self.config.read("/*/rnd:Scopes/rnd:Scope[@id='{{=it[0]}}']/@caption",[scope], "");
          vfsConfig += "<Folder name='"+bcdui.util.escapeHtml(caption || scope)+"'>";
        }

        const files = Array.from(self.infoModel.queryNodes("/*/Entry[@scope='"+scope+"' and @fileExists='true']"));
        filesLength += files.length;
        files.forEach(function(e) {
          const link = e.getAttribute("link") || "";
          if (link)
            vfsConfig += bcdui.wkModels.guiStatus._getFillParams([bcdui.util.escapeHtml(link)], "<File name='{{=it[0]}}'/>");
        });

        if (self.scopes.length > 1)
          vfsConfig += "</Folder>";

      });
      vfsConfig += "</Zip></Vfs>";
      const htmlElement = self.zipDownloadTargetHtml ? jQuery(self.zipDownloadTargetHtml).find(".downloadAll") : jQuery("#" + targetHtml).find(".downloadAll");
      if (filesLength > 0) {
        const d = new bcdui.core.StaticModel(vfsConfig);
        d.execute();
        bcdui.core.compression.compressDOMDocument(d.getData(), function(compressedString) {
          const link = encodeURI(bcdui.contextPath + "/"+ self.zipName +"?zipInfo=" + compressedString);
          htmlElement.find("a").attr("href", link);
          htmlElement.find(".bcdButton").removeClass("disabled");
        });
      }
      else {
        htmlElement.find("a").removeAttr("href");
        htmlElement.find(".bcdButton").addClass("disabled");
      }

      // reactivate hooks
      var dropAreas = jQuery('.bcdDropArea');

      dropAreas.off("dragenter");
      dropAreas.off("dragleave drop dragdrop");
      dropAreas.off("dragover");
      dropAreas.on('dragenter', function(event) { event.preventDefault(); jQuery(this).addClass('bcdDropNow'); });
      dropAreas.on('dragleave drop dragdrop', function() { jQuery(this).removeClass('bcdDropNow'); });
      dropAreas.on('dragover', function(event) { event.preventDefault(); });

      // handle comment change and save
      jQuery("#" + this.targetHtml).off("change");
      jQuery("#" + this.targetHtml).on("change", ".commentinput", function() {
        var newComment = jQuery(this).val();
        var area = jQuery(event.target).closest(".bcdDropArea");
        var catId = area.attr("catId");
        var rowId = area.attr("rowId") || "";
        var fileSize = area.attr("fileSize");
        var fileName = area.attr("fileName");
        var required = area.attr("requiredDoc") || "false";
        var uuid = area.attr("uuid");

        const scope = area.attr("scope");
        const instance = area.attr("instance");

        // remove fileExists flag before saving
        var fileExistsIndex  = parseInt(self.dataModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@id='fileExists']/@pos", "0"), 10);
        bcdui.core.removeXPath(self.dataModel.getData(), "/*/wrs:Data/wrs:R/wrs:C["+fileExistsIndex+"]", false);
        bcdui.core.removeXPath(self.dataModel.getData(), "/*/wrs:Header/wrs:Columns/wrs:C[@id='fileExists']", false);

        if (rowId) {
          bcdui.wrs.wrsUtil.setCellValue(self.dataModel, rowId, "metaData", '<?xml version="1.0" encoding="UTF-8"?><Root><Category uuid="'+uuid+'" fileSize="'+fileSize+'" comment="'+bcdui.util.escapeHtml(newComment)+'" fileName="'+bcdui.util.escapeHtml(fileName)+'" id="'+bcdui.util.escapeHtml(catId)+'"/></Root>');
          self._saveData();
        }
        else {
          bcdui.wrs.wrsUtil.insertRow({model: self.dataModel, propagateUpdate: false, rowStartPos:1, rowEndPos:1, insertBeforeSelection: true, setDefaultValue: false, fn: function(){
            bcdui.wrs.wrsUtil.setCellValue(self.dataModel, 1, "path", "/vfs/documents/" + bcdui.util.getUuid());
            bcdui.wrs.wrsUtil.setCellValue(self.dataModel, 1, "metaData", '<?xml version="1.0" encoding="UTF-8"?><Root><Category uuid="'+uuid+'" fileSize="'+fileSize+'" comment="'+bcdui.util.escapeHtml(newComment)+'" fileName="'+bcdui.util.escapeHtml(fileName)+'" id="'+bcdui.util.escapeHtml(catId)+'"/></Root>');
            bcdui.wrs.wrsUtil.setCellValue(self.dataModel, 1, "instance", instance);
            bcdui.wrs.wrsUtil.setCellValue(self.dataModel, 1, "scope", scope);
            bcdui.wrs.wrsUtil.setCellValue(self.dataModel, 1, "required", required == "true" ? "1" : "0");
            self._saveData();
          }});
        }
      });

      if (this.doAcknowledge) {
        const target = this.zipDownloadTargetHtml ? jQuery(this.zipDownloadTargetHtml) : jQuery("#" + this.targetHtml).find(".docUploaderContainer");
        target.find(".downloadAll").off("click");
        target.find(".downloadAll").on("click", ".zipLink", function(event) {
          event.preventDefault();
          let hRef = jQuery(event.target).attr("href") || "";
          if (! hRef)
            hRef = jQuery(event.target).find("a").attr("href") || "";
          if (hRef) {
            window.open(hRef);
            self.setAcknowledge(null, false);
          }
        });
      }

      jQuery("#" + this.targetHtml).off("click");
      jQuery("#" + this.targetHtml).on("click", ".bcdDropArea", function(event) {
        var area = jQuery(event.target).closest(".bcdDropArea");
        if (jQuery(event.target).closest(".comment").length > 0 || ! area.hasClass("pointer_true")) {
          // nothing to do...prevent click from opening file dialog
        }
        else if (jQuery(event.target).hasClass("action")) {
          var action = "";
  
          if (self.doAcknowledge && (jQuery(event.target).hasClass("view") || jQuery(event.target).hasClass("download") || jQuery(event.target).hasClass("acknowledged")))
            self.setAcknowledge(area, jQuery(event.target).hasClass("acknowledged"));
          if (jQuery(event.target).hasClass("delete")) {
            action = "delete";
            if (! event.ctrlKey) {
              var msg = bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_DocUploader_Delete_Confirm"}) || "Please hold CTRL while clicking to delete this document!";
              bcdui.bcdAlerter.warn(msg, 10000);
              return;
            }
          }
          self._performAction(jQuery(event.target).closest(".bcdDropArea"), action);
        }
        else {
          var container = jQuery(event.target).closest(".bcdDocUploader");
          // add meta information on fileInput for later use
          container.parent().find("*[bcdRole=fileInput]").attr("catId", area.attr("catId"));
          container.parent().find("*[bcdRole=fileInput]").attr("rowId", area.attr("rowId"));
          container.parent().find("*[bcdRole=fileInput]").attr("uuid", area.attr("uuid"));
          container.parent().find("*[bcdRole=fileInput]").attr("comment", area.attr("comment"));
          container.parent().find("*[bcdRole=fileInput]").click(); 
        }
      });
    }.bind(this));
  }
  
  setAcknowledge(area, isAcknowledged) {
    const bRefs = this.finalBRefs.filter(function(e) { return e != "fileExists";});
    const ackModel = new bcdui.core.AutoModel({bRefs: bRefs.join(" "), bindingSetId: this.bindingSetId, filterElement: bcdui.wrs.wrsUtil.parseFilterExpression(this.filterExpression), isAutoRefresh: false, filterBRefs: this.filterBRefs });
    const self = this;
    ackModel.onceReady(function() {
      Array.from(ackModel.queryNodes("/*/wrs:Data/wrs:R")).forEach(function(r) {
        const rowId = r.getAttribute("id") || "";
        let metaNode = r.selectSingleNode("wrs:C[number(/*/wrs:Header/wrs:Columns/wrs:C[@id='metaData']/@pos)]");
        metaNode = metaNode != null ? metaNode.text : "";

        if (area == null) {
          bcdui.wrs.wrsUtil.setCellValue(ackModel, rowId, "acknowledged", "1");
        }
        else if (rowId != "" && metaNode.indexOf(area.attr("uuid") || "") != -1) {
          let ackValue = ackModel.read("/*/wrs:Data/wrs:R[@id='"+rowId+"']/wrs:C[number(/*/wrs:Header/wrs:Columns/wrs:C[@id='acknowledged']/@pos)]", "0");
          if (isAcknowledged)
            ackValue = ackValue == "1" ? "0" : "1";
          else
            ackValue = "1";
          bcdui.wrs.wrsUtil.setCellValue(ackModel, rowId, "acknowledged", ackValue);
        }
      });
      setTimeout(function(){jQuery.blockUI({message: bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Wait"})})});
      bcdui.wrs.wrsUtil.postWrs({
        wrsDoc: ackModel.getData()
      , onSuccess: function() { setTimeout(jQuery.unblockUI); self.dataModel.execute(true); }
      , onFailure: function() { setTimeout(jQuery.unblockUI); }
      , onWrsValidationFailure: function() { setTimeout(jQuery.unblockUI); }
      });
    });
    ackModel.execute();
  }

  getClassName() {return "bcdui.component.docUpload.Uploader";}

  /**
   * returns an array with objects for each category of the current scope.
   * in case of uploaded data it holds additional information like filename, size, url, comment, etc
   */
  getUploadInfo() {
    var info = [];
    Array.from(this.config.queryNodes("/*/rnd:Scopes/rnd:Scope[@id='{{=it[0]}}']/rnd:Category",[this.scope])).forEach(function(e) {
      var m = Array.from(this.infoModel.queryNodes("/*/Entry[@catId='{{=it[0]}}']", [e.getAttribute("id")]));
      var o = {
        id: "" + e.getAttribute("id")
      , caption: "" + e.getAttribute("caption")
      , required: "true" == (e.getAttribute("required") || "false")
      , uploaded: false
      , fileInfo: []
      };
      m.forEach(function(entry) {
        var q = {}
        q["timestamp"] = entry.getAttribute("ts");
        q["user"] = entry.getAttribute("user");
        q["name"] = entry.getAttribute("fileName");
        q["size"] = entry.getAttribute("fileSize");
        q["uuid"] = entry.getAttribute("uuid");
        q["url"] = entry.getAttribute("link");
        q["comment"] = entry.getAttribute("comment");
        if (! o["uploaded"])
          o["uploaded"] = (entry.getAttribute("fileExists") == "true"); 
        o["fileInfo"].push(q);
      });
      info.push(o);
    }.bind(this));
    return info;
  }

  /**
   * general save call, blind ui and send to server
   * @private
   */
  _saveData() {
    
    // undo changes in case onBeforeSave is specified and returns false 
    if (this.onBeforeSave && typeof this.onBeforeSave == "function")
      if (! this.onBeforeSave(this.dataModel)) {
        setTimeout(jQuery.unblockUI);
        this.dataModel.execute(true);
        return;
      }
    setTimeout(function(){jQuery.blockUI({message: bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Wait"})})});
    this.dataModel.sendData();
  }

  /**
   * @private
   */
  _performAction(container, action, fileName) {
    var catId = jQuery(container).attr("catId") || "";
    var rowId = jQuery(container).attr("rowId") || "";
    var uuid = jQuery(container).attr("uuid") || bcdui.util.getUuid();
    var comment = jQuery(container).attr("comment") || "";
    fileName = fileName || jQuery(container).attr("fileName");
    var fileSize = jQuery(container).attr("fileSize") || "0";
    var required = jQuery(container).attr("requiredDoc") || "false";

    const instance = jQuery(container).attr("instance") || "";
    const scope = jQuery(container).attr("scope") || "";

    fileSize = isNaN(fileSize) ? 0 : parseInt(fileSize);

    var self = this;
    if (action == "upload") {

      // depending on dnd or click, determine the file input element 
      var fileInput = container.parent().find("*[bcdRole=fileInput]");
      if (fileInput.length == 0)
        fileInput = container.closest(".bcdDocUploader").prev();

      // upload the file using a fileReader
      setTimeout(function(){jQuery.blockUI({message: bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Wait"})})});
      var fr = new FileReader();

      // for big files, show percentage value in overlay
      fr.onprogress = function(d) {
        if (d.lengthComputable) {                                            
          var percent = parseInt(100 * d.loaded / d.total, 10);
          jQuery(".blockMsg").text(bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Wait"}) + " (" + percent + "%)");
        }
      };

      // data is loaded (as base64), so start saving
      fr.onload = function() {

        // reset fileInput so you can upload identically named files (onchange)
        fileInput.val("");

        // data is in base64 format now
        var b64 = this.result.substring(this.result.indexOf("base64,") + "base64,".length);

        // extract possible file extension (currently only used for css icon selection)

        // change fileExists entry to resource blob 
        var fileExistsHeader = self.dataModel.query("/*/wrs:Header/wrs:Columns/wrs:C[@id='fileExists']");
        fileExistsHeader.setAttribute("id", "resourceBlob");
        fileExistsHeader.setAttribute("type-name", "BLOB");
        fileExistsHeader.removeAttribute("scale");
        fileExistsHeader.removeAttribute("display-size");
        fileExistsHeader.removeAttribute("signed");

        // if we got a rowId, we are replacing an existing cell
        if (rowId) {

          // create and fill the modified blob column C/O values
          bcdui.wrs.wrsUtil.setCellValue(self.dataModel, rowId, "resourceBlob", b64);
          bcdui.wrs.wrsUtil.setCellValue(self.dataModel, rowId, "path", "/vfs/documents/" + bcdui.util.getUuid() + "/" + fileName);
          bcdui.wrs.wrsUtil.setCellValue(self.dataModel, rowId, "metaData", '<?xml version="1.0" encoding="UTF-8"?><Root><Category uuid="'+uuid+'" fileSize="'+fileSize+'" comment="'+bcdui.util.escapeHtml(comment)+'" fileName="'+bcdui.util.escapeHtml(fileName)+'" id="'+bcdui.util.escapeHtml(catId)+'"/></Root>');
          self._saveData();
        }

        // otherwise we insert a new row at topmost position and prefill all needed columns (including instance and scope)
        else {
          bcdui.wrs.wrsUtil.insertRow({model: self.dataModel, propagateUpdate: false, rowStartPos:1, rowEndPos:1, insertBeforeSelection: true, setDefaultValue: false, fn: function(){
            bcdui.wrs.wrsUtil.setCellValue(self.dataModel, 1, "resourceBlob", b64);
            bcdui.wrs.wrsUtil.setCellValue(self.dataModel, 1, "path", "/vfs/documents/" + bcdui.util.getUuid() + "/" + fileName);
            bcdui.wrs.wrsUtil.setCellValue(self.dataModel, 1, "metaData", '<?xml version="1.0" encoding="UTF-8"?><Root><Category uuid="'+uuid+'" fileSize="'+fileSize+'" comment="'+bcdui.util.escapeHtml(comment)+'" fileName="'+bcdui.util.escapeHtml(fileName)+'" id="'+bcdui.util.escapeHtml(catId)+'"/></Root>');
            bcdui.wrs.wrsUtil.setCellValue(self.dataModel, 1, "instance", instance);
            bcdui.wrs.wrsUtil.setCellValue(self.dataModel, 1, "scope", scope);
            bcdui.wrs.wrsUtil.setCellValue(self.dataModel, 1, "required", required == "true" ? "1" : "0");
            self._saveData();
          }});
        }
      };

      // depending on dnd or click, use the correct file place
      if (fileInput.prop("bcdDnDSelected")) {
        fr.readAsDataURL(fileInput.prop("bcdDnDSelected"));
        fileSize = fileInput.prop("bcdDnDSelected").size;
      }
      else {
        fr.readAsDataURL(fileInput.get(0).files[0]);
        fileSize = fileInput.get(0).files[0].size;
      }
    }

    // delete action simply kills the current row (confirm first)
    if (action == "delete" && rowId) {
      bcdui.wrs.wrsUtil.deleteRow(this.dataModel, rowId, false);
      this._saveData();
    }
  }
}

bcdui.component.docUpload = Object.assign(bcdui.component.docUpload,
/** @lends bcdui.component.docUpload */
{
  /**
   * @private
   */
  _onDndDrop: function(event, element) {
    event.stopPropagation();
    event.preventDefault();
    var dndUploadFile = event.originalEvent ? event.originalEvent.dataTransfer.files[0] : event.dataTransfer.files[0];
    // We cannot manipulate the file input with javascript. 
    // For that reason, we store a dnd file as a property there instead, it will win over the input's value
    var container = jQuery(element).closest(".bcdDocUploader");
    container.parent().find("*[bcdRole=fileInput]").prop("bcdDnDSelected", dndUploadFile);
    var objects = jQuery(container).data("objects");
    if (objects && objects.instance && dndUploadFile.name)
      objects.instance._performAction(jQuery(element).closest(".bcdDropArea"), "upload", dndUploadFile.name);
  },

  /**
   * @private
   */
  _onFileInputChange: function(element) {
    var container = jQuery(element).next(".bcdDocUploader");
    container.parent().find("*[bcdRole=fileInput]").prop("bcdDnDSelected", null);
    var fileName = container.parent().find("*[bcdRole=fileInput]").prop("files")[0].name;
    var objects = jQuery(container).data("objects");
    if (objects && objects.instance)
      objects.instance._performAction(container.parent().find("*[bcdRole=fileInput]"), "upload", fileName);
  },
  
  /**
  * Generate a wrs modelwrapper holding overview information for the given scope (optionally limited to instances)
  * The wrs holds 1 row per instance with the information about loaded, needed and missing required documents 
  * @param args The parameter map contains the following properties:
  * @param {string}                  args.scope                                             - The scope identifier
  * @param {string}                  [args.id]                                              - The id of the returned wrs modelwrapper
  * @param {string|array}            [args.instance]                                        - Array or string or space separated string of instance ids in case you want to limit the output
  * @param {filterBRefs}             [args.filterBRefs]                                     - The space separated list of binding Refs that will be used in filter clause of request document
  * @param {bcdui.core.DataProvider} [args.config=bcdui.wkModels.bcdDocUpload]              - The model containing the docUpload configuration data. If it is not present the well known bcdui.wkModels.bcdDocUpload is used
  * @return a wrs model holding the overview information
  */
  getUploadOverview: function(args) {
    if (! args.scope)
      throw new Error("You need to specify a scope value");

    var instances = [];
    var id = args.id || bcdui.factory.objectRegistry.generateTemporaryIdInScope("docUploadOverview_");

    if (Array.isArray(args.instance))
      instances = args.instance;
    else if (typeof args.instance == "string" && args.instance.trim() != "") {
      if (args.instance.split(" ").length > 0)
        instances = args.instance.split(" ");
      else
        instances.push(args.instance)
    }
    var instfilter =  instances.length > 0 ? " and instance in '"+instances.join(",")+"'" : "";
    var config = args.config || bcdui.wkModels.bcdDocUpload;
    var dataModel = new bcdui.core.AutoModel({bRefs: "metaData instance fileExists", orderByBRefs: "instance", bindingSetId: "bcd_docUpload", filterElement: bcdui.wrs.wrsUtil.parseFilterExpression("scope='"+args.scope+"'" + instfilter), isAutoRefresh: true, filterBRefs: args.filterBRefs});

    return new bcdui.core.ModelWrapper({
      id: id
    , inputModel: dataModel
    , parameters: {scope: args.scope, dataModel: dataModel, config: config, instances: instances.join(" ")}
    , chain: function(doc, chainArgs) {

        var givenInstances = chainArgs.instances.split(" ").filter(function(e) { return e != ""; });

        var output = new bcdui.core.StaticModel("<wrs:Wrs xmlns:wrs=\"http://www.businesscode.de/schema/bcdui/wrs-1.0.0\"></wrs:Wrs>");

        // generate a minimal wrs header
        output.write("/*/wrs:Header/wrs:Columns/wrs:C[@caption='" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_DocUploader_Scope"}) + "' and @id='scope' and @type-name='VARCHAR']/@pos", "1");
        output.write("/*/wrs:Header/wrs:Columns/wrs:C[@caption='" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_DocUploader_Instance"}) + "' and @id='instance' and @type-name='VARCHAR']/@pos", "2");
        output.write("/*/wrs:Header/wrs:Columns/wrs:C[@caption='" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_DocUploader_Loaded_Documents"}) + "' and @id='loaded' and @type-name='INTEGER']/@pos", "3");
        output.write("/*/wrs:Header/wrs:Columns/wrs:C[@caption='" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_DocUploader_Number_Of_Categories"}) + "' and @type-name='INTEGER']/@pos", "4");
        output.write("/*/wrs:Header/wrs:Columns/wrs:C[@caption='" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_DocUploader_Missing_Required"}) + "' and @id='missing_required' and @type-name='INTEGER']/@pos", "5");

        // the number of needed files is simply the number of categories for the current scope in the config file
        var neededFiles = chainArgs.config.selectNodes("/*/rnd:Scopes/rnd:Scope[@id='"+chainArgs.scope+"']/rnd:Category").length;

        // get the mandatory ids for later check
        var mandatoryIds = Array.from(chainArgs.config.selectNodes("/*/rnd:Scopes/rnd:Scope[@id='"+chainArgs.scope+"']/rnd:Category[@required='true']")).map(function(e) { return e.getAttribute("id");});

        var oldInstance = "";
        var rowCount = 1;
        var instanceIdx = doc.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='instance']/@pos").text;
        var metaDataIdx = doc.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='metaData']/@pos").text;
        var fileExistsIdx = doc.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='fileExists']/@pos").text;

        // run over all loaded rows
        Array.from(doc.selectNodes("/*/wrs:Data/wrs:R")).forEach(function(row) {
          var curInstance = row.selectSingleNode("wrs:C["+instanceIdx+"]").text;

          // when a new instance was found, we write a new row in the output, otherwise we simply continue
          if (oldInstance != curInstance) {
            oldInstance = curInstance;

            // the number of loaded docs is simply the count of rows for the current instance which have fileExists = 1  
            var loadedDocs = chainArgs.dataModel.selectNodes("/*/wrs:Data/wrs:R[wrs:C["+instanceIdx+"]='"+curInstance+"' and wrs:C["+fileExistsIdx+"]='1']").length;

            // to find the number of missing required documents, we need to check the id attribute in the loaded meta data
            // we check each mandatory id (collected above) for existance
            var missingMandatory = mandatoryIds.length;
            var catRows = Array.from(doc.selectNodes("/*/wrs:Data/wrs:R[wrs:C["+instanceIdx+"]='"+curInstance+"' and wrs:C["+fileExistsIdx+"]='1']/wrs:C["+metaDataIdx+"]"));
            mandatoryIds.forEach(function(mandatoryId) {
              for (var catRow = 0; catRow < catRows.length; catRow++) {
                var found = catRows[catRow].text.match(/ id=\"([\w\d\s]+)\"/); // regex to find the id attribute value in the metaData
                if (found && found.length > 0 && found[1] == mandatoryId) {
                  // we've found the id, so reduce the possible missing ones
                  missingMandatory--;
                  break;
                }
              }
            });
            // add a new wrs row in one go with all information
            bcdui.core.createElementWithPrototype(output.getData(), "/*/wrs:Data/wrs:R[@id='R" + (rowCount++)+"' and wrs:C[1] = '"+chainArgs.scope+"' and wrs:C[2]='"+curInstance+"' and wrs:C[3]='"+loadedDocs+"' and wrs:C[4]='"+neededFiles+"' and wrs:C[5]='"+missingMandatory+"']");
          }
        });

        // in case of given instances, add rows for totally missing ones
        givenInstances.forEach(function(i) {
          if (doc.selectSingleNode("/*/wrs:Data/wrs:R[wrs:C["+instanceIdx+"]='"+i+"']") == null)
            bcdui.core.createElementWithPrototype(output.getData(), "/*/wrs:Data/wrs:R[@id='R" + (rowCount++)+"' and wrs:C[1] = '"+chainArgs.scope+"' and wrs:C[2]='"+i+"' and wrs:C[3]='0' and wrs:C[4]='"+neededFiles+"' and wrs:C[5]='"+mandatoryIds.length+"']");
        }); 
        output.fire();
        return output.getData();
      }
    });
  }
});

/************************
 * Glue-ware for declarative environments, not to be used directly
 */
bcdui.component = Object.assign(bcdui.component,
/** @lends bcdui.component */
{
  /**
   * Helper for jsp and XAPI and custom HTMLElements. First waits for all dependencies to be available
  /**
  * @param args The parameter map contains the following properties:
  * @param {targetHtmlRef}           args.targetHtml                                        - A reference to the HTML DOM Element where to put the output
  * @param {string}                  args.scope                                             - The scope identifier, can be a space separated string when you want to map multiple scopeId and instanceId
  * @param {string}                  args.instance                                          - The instance identifier, can be a space separated string when you want to map multiple scopeId and instanceId
  * @param {string}                  [args.id]                                              - The object's id, needed only when later accessing via id. If given the docUpload registers itself at {@link bcdui.factory.objectRegistry}
  * @param {string}                  [args.addBRefs]                                        - Space separated list of additional bRefs you want to load 
  * @param {function}                [args.onBeforeSave]                                    - Function which is called before each save operation. Parameter holds current wrs dataprovider. Function needs to return true to save or false for skipping save process and resetting data
  * @param {filterBRefs}             [args.filterBRefs]                                     - The space separated list of binding Refs that will be used in filter clause of request document
  * @param {string}                  [args.doAcknowledge=false]                             - Set to true if acknowledge mode is required
  * @param {string}                  [args.downloadAll=false]                               - Set to true if you want to be able to download/zip all documents
  * @param {bcdui.core.DataProvider} [args.config=bcdui.wkModels.bcdDocUpload]              - The model containing the docUpload configuration data. If it is not present the well known bcdui.wkModels.bcdDocUpload is used
  * @param {string}                  [args.bindingSetId=bcd_docUpload]                      - Optional binding set id used for document storage, by default bcd_docUpload is used
  * @param {chainDef}                [args.renderChain]                                     - A custom renderer chain 
  * @param {Object}                  [args.renderParameters]                                - Renderer parameters. Will be enrichted with docUploader default parameters
  * @param {string}                  [args.zipName=documents.zip]                           - The space separated list of binding Refs that will be used in filter clause of request document
  * @param {Object}                  [args.map]                                             - scope/instance map, alternative way to specify multiple scope/instances
  * @private
   */
  createDocUpload: function( args )
  {
    new bcdui.component.docUpload.Uploader( {
      targetHtml:           bcdui.util._getTargetHtml(args, "docUpload_"),
      scope:                args.scope,
      instance:             args.instance,
      id:                   args.id,
      addBRefs:             args.addBRefs,
      onBeforeSave:         args.onBeforeSave,
      filterBRefs:          args.filterBRefs,
      config:               args.config,
      doAcknowledge:        args.doAcknowledge,
      downloadAll:          args.downloadAll,
      bindingSetId:         args.bindingSetId,
      renderChain:          args.renderChain,
      renderParameters:     args.renderParameters,
      zipName:              args.zipName,
      map:                  args.map      
    });
    return { refId: args.id, symbolicLink: true };
  }  
});
