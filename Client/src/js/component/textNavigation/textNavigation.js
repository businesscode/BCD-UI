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
 * TODO add custom element, add xsd or drop xml, allow getting values from chooser html, decide widget / component
 *  add "clear" option, support for dm:Level/@visible=false
 */
/**
 * The implementation of the TextNavigation class.
 * @namespace bcdui.component.textnavigation
 */

/**
 * Create a text navigation based on http://www.businesscode.de/schema/bcdui/textnavigation-1.0.0 XSD
 * @type {bcdui.component.textnavigation.TextNavigation}
 * @extends bcdui.core.Renderer
 */
bcdui.component.textnavigation.TextNavigation = class extends bcdui.core.Renderer
{
  /**
   * @constructs
   * @param {Object} args - Parameter object:
   * @param {targetHtmlRef} args.targetHtml         - Where to place the microphone and text field
   * @param {Function} args.customPreEvaluator           - Called before the standard evaluation, can remove words by returning a shorter array
   * @param {Function} args.customPostEvaluator          - Called after the standard evaluation, can trigger page switches for example
   * @param {bcdui.core.DataProvider} args.config   - Definition if the chat according to Model with the chart definition according to XSD http://www.businesscode.de/schema/bcdui/textnavigation-1.0.0
   */
  constructor(args)
  {
    args = Object.assign({parameters: {paramModel: args.config}}, args);
    args.targetHtml = bcdui._migPjs._$(args.targetHtml);
    super(args);
    this.args = args;
    this.config = args.config;
    this.targetHtml = args.targetHtml;
    this.options = [];
    this.customPreEvaluator = args.customPreEvaluator;
    this.customPostEvaluator = args.customPostEvaluator;
    bcdui.factory.objectRegistry.withReadyObjects( [this.config, bcdui.wkModels.bcdDimensions], this._initOptionaModels.bind(this) );
  }

  /**
   * Setup widget part including optional mic and text field
   * @private
   */
  _refresh()
  {
    if( this.disabled ) {
      this.setStatus(this.transformedStatus);
      return;
    }

    //----------------------------------------
    // Do we want voice control?
    if( this.config.query("/*/txtnav:VoiceInput") != null ) {
      let callback = function(resulText) {
        this.targetHtml.find("input.bcdSpeechOutput").prop("value", resulText);
        this.targetHtml.find("span.bcdSpeechOutput").text(resulText);
        this.interpret(resulText);
      }.bind(this);
      this.args.timeoutSec = this.config.read("/*/txtnav:VoiceInput/@timeoutSec");
      this.voiceRecgn = new bcdui.component.textnavigation.VoiceRecognition(jQuery.extend(this.args, { interpreter: callback }));
    } else {
      this.voiceRecgn = null;
    }

    //----------------------------------------
    // Do we want a text line?
    if( this.config.query("/*/txtnav:TextLine") != null ) {

      // Should it be an input?
      if( this.config.read("/*/txtnav:TextLine/@input") === "false"  ) {
        this.targetHtml.append("<span class='bcdSpeechOutput' title='Click microphone to speak'></span>");
      } else {
        // Leave field or enter
        this.targetHtml.append("<input class='bcdSpeechOutput'></input>")
          .change( evt => this.interpret(evt.target.value) )
          // Only IE needs an explicit enter detection to trigger onchange
          .keypress( evt => { if(bcdui.browserCompatibility.isIE && evt.keyCode===13) this.interpret(evt.target.value) } );
      }
    }

    this.setStatus(this.transformedStatus);
  }

  /**
   * Interpret free text as filter settings and navigation
   * @param {String} resultText - Interpret result text with the help of the options from setup
   * @private
   */
  interpret( resultText )
  {
    // Do some cleanup of the words
    let words = this.singleDigitToWord(resultText, "num_").toLocaleLowerCase().split(/ +/);
    words = words.filter( w => w.length >= 2 );

    // We will apply the words on all options and reset the matches
    for(var option of this.options)
      option.foundRows = null;

    // Handle custom pre-evaluator, it may even remove words
    if( this.customPreEvaluator ) {
      let ret = this.customPreEvaluator(words);
      if( typeof ret !== "undefined" )
        words = ret;
    }

    // Check each word whether it is an dimension member
    let triggerLimit = null;
    for( var word of words ) {

      // The word may be a trigger for a certain dimension, in that case we limit the options we look at
      var wordIsTrigger = false;
      for(var option of this.options) {
        option.matchForWord = false;
        if( word === option.trigger ) {
          triggerLimit = option.trigger;
          wordIsTrigger = true;
        }
      }
      if( wordIsTrigger )
        continue;

      // Search in each list of options == dimension members
      for(var option of this.options) {

        // If we had a trigger, does it match to us?
        if( !!option.trigger && triggerLimit !== option.trigger )
          continue;

        let optionsModel = bcdui.factory.objectRegistry.getObject(option.optionsModelId);
        let optionsBcdVoiceLcAnchor = option.optionsBcdVoiceLcAnchor;

        // Dimension models have different xPahs as pure optionModelXpaths
        let optionsXPath = option.optionsXPath || "/*/wrs:Data/wrs:R/wrs:C[position() mod 2 = 1]";
        let useParentRow = optionsBcdVoiceLcAnchor.indexOf("wrs:C") === -1 ? "" : "/..";
        let condition = word.length > 3 ? "[contains(@bcdVoiceLc,'"+word+"')]" : "[@bcdVoiceLc='"+word+"']";
        let matchNodes = optionsModel.queryNodes( optionsBcdVoiceLcAnchor+condition+useParentRow );

        // If we have matching rows, intersect them with previous matches
        // So we limit multi-part words like "South Africa" vs. "South Asia" as well as multi-dm:Level "Germany > East" vs "UK > East"
        if( matchNodes.length > 0 ) {
          option.matchForWord = true;
          if( option.foundRows != null ) {
            option.foundRows = this._intersect( option.foundRows, matchNodes );
          } else {
            option.foundRows = matchNodes;
          }
        }
      }

      // Within a dimension we throw away all previous matches that do not fit out current word
      // "Germany > East" would go away of "West" was mentioned and there was a match like "Germany > West"
      for(var option of this.options) {
        if( !!option.trigger && triggerLimit !== option.trigger )
          continue;
        if(!!option.dimension && option.matchForWord ) {
          let dimension = option.dimension;
          for(var optionInner of this.options) {
            if(!!optionInner.foundRows && optionInner.dimension===dimension && !optionInner.matchForWord) {
              optionInner.foundRows = [];
            }
          }
        }
      }
    }

    // Within each dimension, we let only the shortest hierarchy survive
    // Because "Germany" and "Germany > East" both match "Germany", so there is no indication that "East" was meant
    // If "East" would have been mentioned, then "Germany" would not be present as a match
    for(var option of this.options) {
      if( !!option.foundRows && option.foundRows.length == 0 ) option.foundRows = null;
      let dimension = option.dimension;
      if( !!dimension && !!option.foundRows ) {
        let optionsModel = bcdui.factory.objectRegistry.getObject(option.optionsModelId);
        for(var optionInner of this.options) {
          if( optionInner.dimension === dimension && !!optionInner.foundRows ) {
            let optionsModelInner = bcdui.factory.objectRegistry.getObject(optionInner.optionsModelId);
            let headCols = "/*/wrs:Header/wrs:Columns/wrs:C";
            if( optionsModelInner.queryNodes(headCols).length > optionsModel.queryNodes(headCols).length ) {
              optionInner.foundRows = null;
            }
          }
        }
      }
    }

    // Now we have the valid options
    for(var option of this.options) {

      // We want unambiguous matches only
      if( option.foundRows != null && option.foundRows.length === 1 ) {
        let match = option.foundRows[0];
        let targetModel = bcdui.factory.objectRegistry.getObject(option.targetModelId);

        // The written targetXPath for a dimension chooser
        if( option.dimension ) {
          targetModel.remove(option.targetXPath+"/*");
          for( var c=0; c<match.selectNodes("wrs:C[position() mod 2 = 1]").length; c++ ) {
            let value = match.selectSingleNode("wrs:C["+(c*2+1)+"]").text;
            let caption = match.selectSingleNode("wrs:C["+(c*2+2)+"]").text;
            let optionsModel = bcdui.factory.objectRegistry.getObject(option.optionsModelId);
            let bRef = optionsModel.read("/*/wrs:Header/wrs:Columns/wrs:C["+(c*2+1)+"]/@bRef");
            let targetXPath = option.targetXPath + "/f:Expression[@bRef='"+bRef+"' and @op='=' and @caption='"+caption+"']/@value";
            targetModel.write(targetXPath, value, true);
          }
        }

        // Customer defined targetXPath
        else {
          let optionsModelRelativeValueXPath = option.optionsModelRelativeValueXPath || "wrs:C[1]";
          let value = match.selectSingleNode(optionsModelRelativeValueXPath).text;
          let caption = match.text;
          let optionsModel = bcdui.factory.objectRegistry.getObject(option.optionsModelId);
          let targetXPath = option.targetXPath;
          targetModel.remove(option.targetXPath+"/*");
          targetModel.write(targetXPath, value, true);
        }
      }
    }

    // Call caller defined post evaluator
    if( !!this.customPostEvaluator )
      this.customPostEvaluator(words);

    // Apply the settings and load a new page?
    if( words.indexOf("apply") !== -1 || this.config.read("/*/txtnav:VoiceInput/@autoApply") === "true" )
      bcdui.core.lifecycle.applyAction();

  }

  /**
   * Return the intersection of the two lists
   * @private
   */
  _intersect( nl1, nl2 ) {
    return Array.prototype.slice.call(nl1).filter( a => Array.prototype.slice.call(nl2).includes(a) );
  }

  /**
   * Evaluate, which dimensions are to be recognized
   * and collect the dimension members
   * @private
   */
  _initOptionaModels() {

    // No voice recognition supported and no input field wanted: nothing to do
    let inputFieldSetting = this.args.config.query("/*/txtnav:TextLine");
    // No support for voice recognition available and no input field wanted? Exit.
    if( (bcdui.browserCompatibility.isChromiumEdge || typeof webkitSpeechRecognition === "undefined")
         && (inputFieldSetting === null || inputFieldSetting.getAttribute("input") === "false") )
      this.disabled = true;

    // txtnav:Model: we refer to a model loaded outside
    // Come with an @optionsModelXpath and @targetModelXPath
    let modelNodes = this.config.queryNodes("/*/txtnav:Options/txtnav:Model");
    for( var mn=1; mn <= modelNodes.length; mn++ ) {
      let optionsModelXPath = this.config.read("/*/txtnav:Options/txtnav:Model["+mn+"]/@optionsModelXPath");
      let trigger = this.config.read("/*/txtnav:Options/txtnav:Model["+mn+"]/@trigger");
      let optionsModelAndXPath = bcdui.factory._extractXPathAndModelId(optionsModelXPath);
      let optionsModelRelativeValueXPath = this.config.read("/*/txtnav:Options/txtnav:Model["+mn+"]/@optionsModelRelativeValueXPath") || "";
      let targetModelXPath = this.config.read("/*/txtnav:Options/txtnav:Model["+mn+"]/@targetModelXPath");
      let targetModelAndXPath = bcdui.factory._extractXPathAndModelId(targetModelXPath);

      // An option represents one set of valid search terms
      let option = {
        optionsModelId: optionsModelAndXPath.modelId,
        optionsXPath: optionsModelAndXPath.xPath,
        optionsModelRelativeValueXPath: new RegExp(/\/@[^\/]+$/).test(optionsModelAndXPath.xPath) && optionsModelRelativeValueXPath === "../." ? "." : optionsModelRelativeValueXPath,
        targetModelId: targetModelAndXPath.modelId,
        targetXPath: targetModelAndXPath.xPath,
        trigger: trigger,
        optionsBcdVoiceLcAnchor: optionsModelAndXPath.xPath.replace(/\/@[^\/]+$/,""), // from any trailing attribute expression
      };

      // Create am @bcdVoiceLc attribute at each row, which contains the caption text in lower case
      bcdui.factory.objectRegistry.withReadyObjects( optionsModelAndXPath.modelId, function() {
        let optionsModel = bcdui.factory.objectRegistry.getObject(option.optionsModelId);
        let valueNodes = optionsModel.queryNodes(option.optionsXPath);
        for( var vn=0; vn < valueNodes.length; vn++ ) {
          var item = valueNodes.item(vn);
          item = item.nodeType === 2 ? (item.ownerElement || item.selectSingleNode("..")): item;
          let lcCaption = this.singleDigitToWord(valueNodes.item(vn).text, "num_").toLowerCase();
          item.setAttribute("bcdVoiceLc", lcCaption );
        }
        this.options.push(option)
      }.bind(this) );
    }

    // We refer to a dimension chooser-like setup and load the models ourselfs
    // txtnav:Dimension
    // Are read from well known bcdDimensions model an come with only a @targetModelXPath
    let dimNodes = this.config.queryNodes("/*/txtnav:Options/txtnav:Dimension");
    for( var dn=1; dn <= dimNodes.length; dn++ ) {
      let dimId = this.config.read("/*/txtnav:Options/txtnav:Dimension["+dn+"]/@dimension");
      let trigger = this.config.read("/*/txtnav:Options/txtnav:Dimension["+dn+"]/@trigger");
      let useCaptions = this.config.read("/*/txtnav:Options/txtnav:Dimension["+dn+"]/@useCaptions");
      let targetModelXPath = this.config.read("/*/txtnav:Options/txtnav:Dimension["+dn+"]/@targetModelXPath");
      let targetModelAndXPath = bcdui.factory._extractXPathAndModelId(targetModelXPath);
      let hierNodes = bcdui.wkModels.bcdDimensions.queryNodes("/*/dm:Dimension[@id='"+dimId+"']/dm:Hierarchy");

      // For each hierarchy of the dimension we load the data
      let bRefsList = [];
      for( var hn=1; hn <= hierNodes.length; hn++ ) {
        let bindingSetId = bcdui.wkModels.bcdDimensions.read("/*/dm:Dimension[@id='"+dimId+"']/dm:Hierarchy["+hn+"]/@bindingSet");
        let bRefNodes = bcdui.wkModels.bcdDimensions.queryNodes("/*/dm:Dimension[@id='"+dimId+"']/dm:Hierarchy["+hn+"]/dm:Level/@bRef");
        var bRefs = "";
        for( var bn=0; bn < bRefNodes.length; bn++ ) {
          bRefs += bRefNodes.item(bn).value  + " ";
          bRefs += bRefNodes.item(bn).value  + (useCaptions ? "_caption" : "") + " ";

          // If this hierarchy was not yet mentioned, load a model for it
          if( bRefsList.indexOf(bRefs) === -1 ) {

            // dm:Level/@visible would have to be skipped here and during evaluation one would have to check that the deepest level of a hierarchy was matched
            // TODO later
            if( bcdui.wkModels.bcdDimensions.read("/*/dm:Dimension[@id='"+dimId+"']/dm:Hierarchy["+hn+"]/dm:Level["+(bn+1)+"]/@visible") === "false" )
              throw "dm:Level/@visible='false' is currently not supportted for textNavigation";

            bRefsList.push(bRefs);

            let autoModelId = bcdui.factory.objectRegistry.generateTemporaryId();
            let am = new bcdui.core.AutoModel({ id: autoModelId, bindingSetId: bindingSetId, bRefs: bRefs, isDistinct: true, orderByBRefs:"  " });

            // An option represents one set of valid search terms
            let option = {
              optionsModelId: autoModelId,
              targetModelId: targetModelAndXPath.modelId,
              targetXPath: targetModelAndXPath.xPath,
              optionsBcdVoiceLcAnchor: "/*/wrs:Data/wrs:R/wrs:C[position() mod 2 = 0]",
              dimension: dimId,
              trigger: trigger
            };

            // Load the model representing the hierarchy
            am.onceReady( { onSuccess: function() {
                // Create am @bcdVoiceLc attribute at each row, which contains the caption text in lower case
                let valueNodes = am.queryNodes(option.optionsBcdVoiceLcAnchor);
                for( var vn=0; vn < valueNodes.length; vn++ ) {
                  let lcCaption = this.singleDigitToWord(valueNodes.item(vn).text, "num_").toLowerCase();
                  valueNodes.item(vn).setAttribute("bcdVoiceLc", lcCaption );
                }
                this.options.push(option);
              }.bind(this),
              executeIfNotReady: true
            });
          }
        }
      }
    }
  }

  /**
   * Start voice recognition
   */
  startVoiceRecognition() {
    this.voiceRecgn.start();
  }

  /**
   * Stop voice recognition
   */
  stopVoiceRecognition() {
    this.voiceRecgn.stop();
  }

  /**
   * Replace all single-digits in the text be the corresponding English word "1" -> "one"
   * @param {String} text - Text in which to replace single digit words representing numbers
   * @param {String} prefix - Optional prefix to make the words longer and less ambiguous in conains relations
   * @return transformed text
   */
  singleDigitToWord( text, prefix ) {
    let regex = RegExp(/\W\d\W/);
    var trans = ["zero","one","two","three","four","five","six","seven","eight","nine"];
    if( !!prefix )
      trans = trans.map( numw => prefix + numw );
    let transText = text.split(" ").map(word => trans[parseInt(word)] ? trans[parseInt(word)] : word ).join(" ");
    return transText;
  }

}

/**
 * Create voice recognizer based on http://www.businesscode.de/schema/bcdui/textnavigation-1.0.0 XML
 * @type {bcdui.component.textnavigation.VoiceRecognition}
 * @private
 */
bcdui.component.textnavigation.VoiceRecognition = class
{

  /**
   * @constructs
   * @param {Object} args - Parameter object:
   * @param {Function} args.interpreter             - Text transcript is handed over to this callback
   * @param {targetHtmlRef} args.targetHtml         - Where to place the microphone
   * @param {bcdui.core.DataProvider} args.config   - Definition if the chat according to Model with the chart definition according to XSD http://www.businesscode.de/schema/bcdui/textnavigation-1.0.0
   * @private
   */
  constructor(args)
  {
    // No support for voice recognition available?
    if( bcdui.browserCompatibility.isChromiumEdge || typeof webkitSpeechRecognition === "undefined" )
      return;

    this.args = args;
    this.config = args.config;
    this.targetHtml = args.targetHtml;
    this.targetHtml.append("<span class='bcdSpeechMic' title='Click microphone to speak'></span>");
    this.timeoutSec = isFinite(parseFloat(args.timeoutSec)) ? parseFloat(args.timeoutSec) : null;

    this.recognition = new webkitSpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = "en-US";

    this.voiceIsActive = false;

    // Speech recognition started
    // Animate mic, clear text output
    this.recognition.onstart = function() {
      this.voiceIsActive = true;
      this.targetHtml.find(".bcdSpeechOutput").text(this.textSpeekNow);
      this.targetHtml.find(".bcdSpeechMic").addClass("bcdSpeechMicActive");
    }.bind( this );

    // Speech recognition stopped
    // Stop mic animation, hand over text transcript, display text in text output
    this.recognition.onend = function(event) {
      this.voiceIsActive = false;
      this.targetHtml.find(".bcdSpeechMic").removeClass("bcdSpeechMicActive");
      if( this.targetHtml.find(".bcdSpeechOutput").text() === this.textSpeekNow)
        this.targetHtml.find(".bcdSpeechOutput").text(this.textClickToSpeek);
    }.bind( this );

    // Text was detected and a pause happened
    this.recognition.onresult = function(event) {
      let result = event.results[event.results.length - 1][0].transcript;
      this.targetHtml.find(".speechOutput").text(result);
      if( !!args.interpreter )
        args.interpreter(result);
    }.bind(this);

    //Toggle microphone with click on mic symbol
    this.targetHtml.find(".bcdSpeechMic").click( function() {
      if( ! this.voiceIsActive ) {
        this.startVoiceRecognition();
      } else {
        this.stopVoiceRecognition();
      }
    }.bind(this) );

    //----------------------------------------
    // Do we want to start listening immediately?
    if( this.config.read("/*/txtnav:VoiceInput/@autoStart") === "true" ) {
      this.startVoiceRecognition();
    }
  }

  /**
   * Start speech recognition
   * @private
   */
  startVoiceRecognition() {
    this.recognition.start();
    if( !!this.timeoutTimer ) clearTimeout(this.timeoutTimer);
    if( !!this.timeoutSec )
      this.timeoutTimer = setTimeout( function(){ this.stopVoiceRecognition(); }.bind(this), this.timeoutSec * 1000 );
  }

  /**
   * Stop speech recognition
   * @private
   */
  stopVoiceRecognition() {
    this.recognition.stop();
    if( !!this.timeoutTimer ) clearTimeout(this.timeoutTimer);
  }

}