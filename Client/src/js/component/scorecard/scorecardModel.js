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
 * TODO: precalc auch fuer WrqModifer an aspect definition und steuerbar ob aggr precalc wirklich fuer alle wrsmo mit angewendet werden soll
 *       merge columns on join. for example an aspect loads specific values, these overwrite the aggr values for those dims (for example aggrs.)
 *       Allow number-formatted output
 */
/**
 * @fileoverview
 */
/**
 * The implementation of the Scorecard class.
 * @namespace bcdui.component.scorecard
 */
bcdui.util.namespace("bcdui.component.scorecard",{});  // Making sure our namespace exists

/*
 * ========================================================
 * Scorecard
 */
bcdui.component.scorecard.ScorecardModel = class extends bcdui.core.DataProvider
/**
 * @lends bcdui.component.scorecard.ScorecardModel.prototype
 */
{
  /* This class represents a Scorecard. The process is:
    * <pre>
        I. Read ScoreCard reference data
          1) Create internal format of ScoreCard ref data                           => _refSccDefinition

        II. Read measures and calculate KPIs
          4) Derive needed aggregators from KPI and measure/aggregator combinations => _refDistMeasCol
          5) Read needed aggregators
            6) Complete aggregator wrqs                                             => _agg_<aggrId>_WrqBuilder
            7) Run aggregator wrqs, i.e. read measures                              => _agg_<aggrId>_ColWrs
            7a) We may need to apply a pre-calculation on an aggragator's result    => _agg_<aggrId>_ColWrs_preCalced
            8) Transpose measures from each aggregator if needed                    => _agg_<aggrId>_RowWrs
          9) Join measures from all aggregator together                             => _agg_<aggrId>_Joined
             This may involve creating an extra dok with the dims only,
             derived from all aggrs with full dim depths                            => _refAggrDimsWrs
          10) Create an alias representing the doc with all kpi-aggrs joined        => _allAggrJoined or _completed_kpiAsp (skipping 11-18) if there are no aspects

        III. Apply aspects, do their calculations, maybe read additional data
          11) Determine which additional data to read for aspects via wrq_builder
          12) Determine which additional measure data to read for aspects via wrq_modifier
          13) Read additional data for aspects (WrqBuilder)                         => _asp_<aspId>_Wrq, _asp_<aspId>_ColWrs
          13a) We may need to apply a pre-calculation on the aspects result         => _asp_<aspId>_ColWrs_preCalced
          13b) Maybe transpose aspect data                                          => _asp_<aspId>_RowWrs
          14) Join each additional aspect data                                      => _asp_<aspId>_KpiData
          15) Read additional measure data for aspects, per aggr (WrqModifier)      => _asp_<aspId>_agg_<aggrId>_Wrq_aggr, _asp_<aspId>_ModifierColWrs
            15a) Transpose aspect data if needed                                    => _asp_<aspId>_agg_<aggrId>_RowWrs
          16) Join additional measure data for aspect                               => _asp_<aspId>_KpiData
          17) Run KPI calculation for the KPIs themselves and
              for all additional measure data requested by aspects                  => _completed_kpiCalcs
          18) Run aspect calculations, all KPIs and aspects are available here      => _completed_kpiAsp

        IV. We have the data, let's finish the final requested format
          19) Verticalize KPIs, keep aspects as columns, create attr asp, sort      => _final
          20) Optionally create colummn dimensions                                  => also _final
          21) Optionally join category data                                         => also _final
          22) Final data is in internal model and passed on Scorecard.getData()     => externally same as scorecard id
       </pre>
  */
  /**
   * @classdesc
   * Creates a scorecard-model from a scorecard definition, the scorecard model is derived {@link bcdui.core.DataProvider DataProvider}
   * Format of scorecard definition is defined by XSD http://www.businesscode.de/schema/bcdui/scorecard-1.0.0
   * <p/>
   * This scorecard does all calculations and also transposes data if necessary. It does not deal with any presentation part, though.
   * See {@link bcdui.component.createScorecard} if you want a default scorecard rendering.
   * @extends bcdui.core.DataProvider
   *
   * @constructs
   * @param {Object} args - Parameter map contains the following properties:
   * @param {bcdui.core.DataProvider} args.config                  - The scorecard definition
   * @param {string}                  [args.id]                    - The id of the new object. If omitted the id is automatically generated
   * @param {bcdui.core.DataProvider} [args.customParameter]       - Custom parameters for usage in the custom aggregator and aspect transformations.</li>
   * @param {bcdui.core.DataProvider} [args.statusModel=bcdui.wkModels.guiStatusEstablished] - StatusModel, containing the filters at /SomeRoot/f:Filter
   * @param {object}                  [args.parameters]            - Custom parameters to be shared between all aggregators, aspects, etc.
   */
  constructor(/* object */ args )
  {
    super(args);

    // Arguments
    this.customParameterModelId = args.customParameterModelId || args.customParameterModel || args.customParameter;
    this.scorecardRefDataModelId = args.config || args.metaDataModelId || args.metaDataModel;
    this.statusModel = args.statusModel || bcdui.wkModels.guiStatusEstablished;
    this.customParameters = jQuery.extend({}, args.parameters);

    // Internal data
    this.internalPrefix = this.id+"_bcdImpl"; // Prefix for internal models
    this.cp = bcdui.contextPath+"/bcdui/js/component/scorecard/";
    this.scAspIdArray  = null;        // Distinct aspect ids
    this.aspIdsWithWrq = new Object();  // one entry for each aspect with wrq_builder and one for each with wrq_modifier/aggregator combination
    this.aspCalcIds    = new Object();  // one entry for each aspect with wrq_modifier
    this.kpiData       = null;        // Final model to keep all data and calculated values
    this.scConfig   = null;        // becomes ready once ehnacned configuration is applied on it

    var date = new Date();
    this.startTime = date.getTime();
    bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', starting with loading scorecard ref data ... " );

    this.waitingForUncomittedChanges = new bcdui.core.status.WaitingForUncomittedChanges();
    this.initializedStatus = new bcdui.core.status.InitializedStatus();
    this.loadingStatus = new bcdui.core.status.LoadingStatus();
    this.transformingStatus = new bcdui.core.status.TransformingStatus()
    this.transformedStatus = new bcdui.core.status.TransformedStatus();

    this.addStatusListener(this._statusTransitionHandler.bind(this));
    this.setStatus(this.initializedStatus);
  }

  getClassName() {return "bcdui.component.scorecard.Scorecard";}

  /**
   * @private
   */
  _calculate()
  {
    bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', starting calculating ... " );

    //-------------------------------------
    // I. ScoreCard reference data
    // 1) Read ScoreCard ref data
    bcdui.factory.objectRegistry.getObject(this.scorecardRefDataModelId).onReady({ onlyOnce: true, executeIfNotReady: true, onSuccess: function() {
      var origSccDef = bcdui.factory.objectRegistry.getObject(this.scorecardRefDataModelId);
      var refSccDefinitionParameters = { statusModel: this.statusModel };
      // We add bcdAspects and bcdAggregators only conditionally as an optimization (because they trigger inlining in Chrome and Edge)
      if( origSccDef.query("/*/scc:Layout/scc:AspectRefs//scc:AspectRef[starts-with(@idRef,'bcd')]")  || origSccDef.query("/*/scc:Aspects/scc:Aspect/scc:BcdAspectWrqBuilder" ) )
        refSccDefinitionParameters["bcdAspects"] = new bcdui.core.SimpleModel(this.cp+"bcdAspects.xml");
      if( origSccDef.query("/*/scc:Kpis/scc:Kpi[@id=/*/scc:Layout/scc:KpiRefs/scc:KpiRef/@idRef]/calc:Calc//calc:ValueRef/@aggr[starts-with(.,'bcd')]") || origSccDef.query("/*/scc:Aggregators/scc:Aggregator/scc:BcdAggregator") )
        refSccDefinitionParameters["bcdAggregators"] = new bcdui.core.SimpleModel(this.cp+"bcdAggregators.xml");
      this.scConfig = new bcdui.core.ModelWrapper({ id: this.internalPrefix+"_refSccDefinition", chain: this.cp+"configuration.xslt", inputModel: origSccDef,
        parameters: refSccDefinitionParameters });

      this.customParameters.scConfig = this.scConfig;
    }.bind(this) });
    

    //-------------------------------------
    // II. Read measures and calculate KPIs
    // 4) Derive needed aggregators from KPI and measure/aggregator combinations
    // Calculate measure / aggregator combinations from KPI definitions
    this.distMeasCol = bcdui.factory.createModelWrapper( { id: this.internalPrefix+"_refDistMeasCol", url: this.cp+"measuresPerAggr.xslt", inputModel: this.internalPrefix+"_refSccDefinition" } );

    // Trigger calculation of _refDistMeasCol.
    // Once measures are determined for aggregators, run each aggregator
    var waitFor = new Array();
    waitFor.push(this.internalPrefix+"_refDistMeasCol");
    if(this.customParameterModelId)
      waitFor.push(this.customParameterModelId);
    bcdui.factory.objectRegistry.withReadyObjects( waitFor,
        function() {
          bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', start loading aggr measures  ... " );

          this.refSccDefinition = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition");

          // Assure that we find at least one KPI definition, we will crash otherwise. Its ok, if we do not find all, hiding definitions is valid
          var kpiDef = this.refSccDefinition.query("/*/scc:Layout/scc:KpiRefs/scc:KpiRef[@idRef=/*/scc:Kpis/scc:Kpi/@id]");
          if( !kpiDef )
            bcdui.log.warn( "Scorecard '"+this.id+"' No KPI definitions found." );
          // Assure that we find the scc:Aggregator definition for each scc:Kpi/@aggr, otherwise the scorecard will hang waiting for it to be loaded
          var undefinedAggrs = this.refSccDefinition.queryNodes("/*/scc:Kpis//*[@aggr and not(@aggr=/*/scc:Aggregators/scc:Aggregator/@id)]");
          if( undefinedAggrs.length > 0 )
            bcdui.log.error( "Scorecard '"+this.id+"' error: scc:Aggregator definition for id='"+undefinedAggrs.item(0).getAttribute("aggr")+"' not found. " );

          // this.dimensions is a space separated list for ids of the dimension columns
          var dims = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectNodes("/*/scc:Layout/scc:Dimensions//dm:LevelRef");
          if( dims.length>0 ) {
            this.dimensions = "";
            for( var d=0; d<dims.length; d++ )
              this.dimensions += dims.item(d).getAttribute("bRef") + (d<dims.length-1 ? " " : "");
          }

          this.customParameter = this.customParameterModelId ? bcdui.factory.objectRegistry.getObject(this.customParameterModelId) : "";
          // We rely on the fact that only needed scc:Aggregator definitions are selected by configuration.xslt
          var aggrNodes = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectNodes("/*/scc:Aggregators/*");

          // Loop over aggregators
          for( var i=0; i<aggrNodes.length; i++ ) {

            // Read the wrqBuilder of the aggregator from database and make it usable as XSLT
            var aggrId = aggrNodes.item(i).getAttribute("id");
            var aggrWrqBuilderNode = aggrNodes.item(i).selectSingleNode("scc:WrqBuilder/*");
            var aggrWrqBuilder = bcdui.factory.createStaticModel( { id: this.internalPrefix+"_agg_"+aggrId+"_WrqBuilder", data: new XMLSerializer().serializeToString(aggrWrqBuilderNode) } );

            // 6) Complete aggregator wrq
            var aggrWrq = bcdui.factory.createModelWrapper( { id: this.internalPrefix+"_agg_"+aggrId+"_Wrq", stylesheetModel: bcdui.factory.objectRegistry.getObject(aggrWrqBuilder),
              inputModel: this.internalPrefix+"_refDistMeasCol", parameters: { aggrId: aggrId, customParameter: this.customParameter,sccDefinition: bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition"),
                statusModel: this.statusModel, aggrDef: aggrNodes.item(i) } } );

            // 7) Run aggregator wrq, i.e. read measures
            // Load aggregator's data
            bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', aggregator '"+aggrId+"' measures loading ... " );
            var wrs = bcdui.factory.createModel( { id: this.internalPrefix+"_agg_"+aggrId+"_ColWrs", requestDocument: aggrWrq, url: bcdui.core.webRowSetServletPath + "/sc/aggr/" + aggrId } );

            // 7a) We may need to apply a pre-calculation on the aggragator's result
            var toBeTransposed = wrs;
            var preCalcNode = aggrNodes.item(i).selectSingleNode("scc:PreCalc/*[self::xsl:stylesheet or self::chain:Chain]");
            if( preCalcNode!=null ) {
              var preCalc = bcdui.factory.createStaticModel( { id: this.internalPrefix+"_agg_"+aggrId+"_WrqBuilder_preCalculation", data: new XMLSerializer().serializeToString(preCalcNode) } );
              toBeTransposed = bcdui.factory.createModelWrapper( { id: this.internalPrefix+"_agg_"+aggrId+"_ColWrs_preCalced",
                stylesheetModel: bcdui.factory.objectRegistry.getObject(preCalc), inputModel: wrs, parameters: jQuery.extend({}, this.customParameters, { customParameter: this.customParameter,
                statusModel: this.statusModel }) } );
            }

            // 8) Transpose measures from this aggregator once loaded
            this._createMeasuresInColumnsModel( { resultId: this.internalPrefix+"_agg_"+aggrId+"_RowWrs", input: toBeTransposed } );

            // 15) Read additional measure data for aspects
            // Once we know the aspects with modifiers, apply and run them for this aggregator wrq
            this._applyAspWrqModToAggr( aggrWrq, aggrId );
          }

          // This is a token to delay other steps and give starting of loading of measures timewise priority
          // This allows to do the two things in parallel: send the requests and let the server work and do the further steps on client in parallel
          bcdui.factory.createStaticModel( { id: this.internalPrefix+"_aggrMeasRequested", data: "<Root/>" } );
        }.bind(this)
    );

    // Determine list of actual distinct dimension members
    bcdui.factory.objectRegistry.withReadyObjects( this.internalPrefix+"_aggrMeasRequested",
        function() {
          bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', determining dimensions ..." );
          var aggrNodes = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectNodes("/*/scc:Aggregators/*");

          var expectedAggrWrs = new Array();
          for( var i=0; i<aggrNodes.length; i++ )
            expectedAggrWrs.push( this.internalPrefix+"_agg_"+aggrNodes.item(i).getAttribute("id")+"_RowWrs");

          // Build the doc with the complete dim combination for all aggr with the max dim depth
          bcdui.factory.objectRegistry.withReadyObjects( expectedAggrWrs,
              function() {
                bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', measures are all loaded and transposed, determine dist. dimension members  ... " );
                var aggrNodes = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectNodes("/*/scc:Aggregators/*");

                // First let's check which aggregators lead to the maximum dimension depths
                // TODO macht das Sinn? evtl einfach alle nehmen mit allen dimensions
                var maxDimDepth = 0;
                var singleAggrWithMaxDimDepthId;
                for( var i=0; i<aggrNodes.length; i++ ) {
                  var aggrId = aggrNodes.item(i).getAttribute("id");
                  var dimNodes = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_agg_"+aggrId+"_RowWrs").getData().selectNodes("/*/wrs:Header/wrs:Columns/wrs:C[contains('"+this.dimensions+"',@id)]");

                  // If singleAggrWithMaxDimDepthId is set, it will tell us if only one aggr has the max dim depths
                  // Then we do not need to determine the distinct dim values and no artifical join dim docu
                  // If we have no dimension at all, we just take any, because we cannot create an artificial dim Wrs in the next step anyway in that case
                  if( dimNodes.length > maxDimDepth || !this.dimensions )
                    singleAggrWithMaxDimDepthId = aggrId;
                  else if( dimNodes.length == maxDimDepth )
                    singleAggrWithMaxDimDepthId = null;

                  maxDimDepth = maxDimDepth < dimNodes.length ? dimNodes.length : maxDimDepth;
                }

                //--------------
                // Either skip creation of artifical doc holding the distinct dims of all docs which share the same dim depth
                // This is especially useful for small scorecards on mobiles
                if( singleAggrWithMaxDimDepthId )
                {
                  var captionTop = "Performance|"+aggrNodes.item(0).getAttribute("caption")+"|";
                  var singleAggrWithMaxDimDepthModelId = this.internalPrefix+"_agg_"+singleAggrWithMaxDimDepthId+"_RowWrs";
                  var headCols = bcdui.factory.objectRegistry.getObject(singleAggrWithMaxDimDepthModelId).getData().selectNodes("/*/wrs:Header/wrs:Columns/wrs:C");
                  for( var i=0; i<headCols.length; i++ ) {
                    var headCol = headCols.item(i);
                    // This is done when creating _refAggrDimsWrs otherwise
                    if( headCol.getAttribute("dimId") )
                      headCol.setAttribute("caption",headCol.getAttribute("caption").split("|").pop());
                    // This is done by join otherwise
                    else if( headCol.getAttribute("valueId") ) {
                      headCol.setAttribute("id","agg_"+singleAggrWithMaxDimDepthId+"_"+headCol.getAttribute("id"));
                      headCol.setAttribute("caption",captionTop+headCol.getAttribute("caption"));
                    }
                  }
                  new bcdui.core.DataProviderAlias({ id: this.internalPrefix+"_refAggrDimsWrs", name: this.internalPrefix+"_refAggrDimsWrs",
                    source: bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_agg_"+singleAggrWithMaxDimDepthId+"_RowWrs") });
                }

                //-----------------
                // Or create an artifical dist DOM document
                else {

                  // Now lets find all distinct dimension member combinations for those docs having the max dim depth
                  // and call them _refAggrDimsWrs, all data will get left outer joined with it
                  var dimSetArray = [];
                  var dimArray = this.dimensions ? this.dimensions.split(" ") : [];
                  var dimCaptionArray = new Array(dimArray.length);
                  var dimAttributeArray = new Array(dimArray.length);
                  var dimColTypeMap = {}; // (k,v) = (dimColId,type-name)

                  // Loop over the aggregators (i.e. Wrs from data base)
                  for( var i=0; i<aggrNodes.length; i++ ) {
                    var aggrId = aggrNodes.item(i).getAttribute("id");
                    var dimNodes = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_agg_"+aggrId+"_RowWrs").getData().selectNodes("/*/wrs:Header/wrs:Columns/wrs:C[contains('"+this.dimensions+"',@id)]");
                    if( maxDimDepth > dimNodes.length )
                      continue;
                    var aggrDoc = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_agg_"+aggrId+"_RowWrs").getData();

                    // Build one XPath with the union of all dimension column' position nodes
                    var colExpr = "wrs:C[";
                    for( var d=0; d<dimArray.length; d++ ) {
                      colExpr += "position()="+dimNodes.item(d).getAttribute("pos");
                      if( d < dimArray.length-1)
                        colExpr += " or ";
                    }
                    colExpr += "]";

                    // Now loop over the rows and within over the Cs at the positions determined as dimension column positions
                    var rowNodes = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_agg_"+aggrId+"_RowWrs").getData().selectNodes("/*/wrs:Data/wrs:R");
                    for( var r=0; r<rowNodes.length; r++ ) {
                      var cols = rowNodes.item(r).selectNodes(colExpr);
                      var dimSet = "";
                      for( var c=0; c<cols.length; c++ ) {
                        var col = cols.item(c);
                        var dm = col.firstChild;
                        dimSet += "<C";
                        // We only use @bcdGr to determine the distinct dimensions. the other attributes are added during each join
                        var valOfBcdGr = col.getAttribute("bcdGr");
                        if( valOfBcdGr)
                          dimSet += " bcdGr='"+valOfBcdGr+"'";
                          dimSet += (dm && dm.data ? ">"+(dm.nodeValue ? jQuery("<div/>").text(dm.nodeValue).html() : "")+"</C>" : "/>");
                      }
                      dimSetArray.push(dimSet);
                    }

                    // Derive caption of columns from Header section
                    for( var d=0; d<dimArray.length; d++ ) {
                      var ch = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_agg_"+aggrId+"_RowWrs").getData().selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='"+dimArray[d]+"']");
                      if( ch ) {
                        dimColTypeMap[dimArray[d]] = ch.getAttribute("type-name");
                        dimCaptionArray[d] = ch.getAttribute("caption").split("|").pop(); // may have multi-level caption, for dim we can use the latest
                        var attrs = ch.selectNodes("wrs:A");
                        dimAttributeArray[d] = "";
                        for( var att=0; att<attrs.length; att++ ) {
                          dimAttributeArray[d] += new XMLSerializer().serializeToString(attrs.item(att));
                        }
                      }
                    }
                  }
                  dimSetArray = dimSetArray.reduce(function(a, b) { if(a.indexOf(b)===-1) a.push(b); return a; }, []); // Make distinct.

                  // Now we have the distinct dimension menmbers, lets construct a Wrs from it to join the aggregator Wrs against it.
                  var wrs = "<Wrs xmlns='http://www.businesscode.de/schema/bcdui/wrs-1.0.0'>"+
                            " <Header><Columns>";
                  for( var d=0; d<dimArray.length; d++ ) {
                    var colHeadId = dimArray[d];
                    var colHeadCaption = dimCaptionArray[d] || dimArray[d];
                    wrs += "<C pos ='"+(d+1)+"' id='"+colHeadId+"' caption='"+colHeadCaption+"' type-name='"+dimColTypeMap[colHeadId]+"'>";
                    wrs += dimAttributeArray[d];
                    wrs += "</C>";
                  }
                  wrs += "</Columns></Header><Data>";
                  for( var dm=0; dm<dimSetArray.length; dm++ )
                    wrs += "<R id='"+dm+"'>"+dimSetArray[dm]+"</R>";
                  wrs += "</Data></Wrs>";
                  bcdui.factory.createStaticModel( { id: this.internalPrefix+"_refAggrDimsWrs", data: wrs } );
                }
              }.bind( this )
          );

        }.bind( this )
    );


    // 9) Join measures from each aggregator together
    bcdui.factory.objectRegistry.withReadyObjects( this.internalPrefix+"_refAggrDimsWrs",
        function() {
          bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', preparing joining aggr measures ..." );
          var aggrNodes = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectNodes("/*/scc:Aggregators/*");

          // Loop over the aggregators and chain each wrs to join all aggregator wrs together with the first one
          var captionTop = "Performance|";
          var joinedDoc = this.internalPrefix+"_refAggrDimsWrs";

          for( var i=0; i<aggrNodes.length; i++ ) {
            var aggrId      = aggrNodes.item(i).getAttribute("id");
            var aggrModelId = this.internalPrefix+"_agg_"+aggrId+"_RowWrs";
            // Of course we do not join agains ourselfes, if we are joinedDoc (i.e. joinDoc is just an alias to the current aggrModel)
            // Can happen if only one doc had max dim depth, either because there was only one anyway or because the others had a lesser depth
            if( aggrModelId == bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refAggrDimsWrs").source )
              continue;
            var newJoinedId = this.internalPrefix+"_agg_"+aggrId+"_Joined";
            // Trigger the execution of the join defined in the previous loop run, then define the next join
            bcdui.factory.objectRegistry.withReadyObjects( [ joinedDoc, aggrModelId ],
                function( joinedDoc, aggrNode, aggrId, aggrModelId, newJoinedId ) {
                  var aggrCaption = aggrNode.getAttribute("caption");
                  bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', joining aggregator '"+aggrId+"' ... " );
                  bcdui.factory.createModelWrapper( { id: newJoinedId, url: bcdui.contextPath+"/bcdui/xslt/wrs/join.xslt",
                    inputModel: aggrModelId,
                    parameters: { dimensions: this.dimensions, makeLeftOuterJoin: true,
                                  leftDoc: bcdui.factory.objectRegistry.getObject(joinedDoc),
                                  rightIdPrefix: "agg_"+aggrId+"_", rightCaptionPrefix: captionTop+aggrCaption+"|" } } );
                }.bind( this, joinedDoc, aggrNodes.item(i), aggrId, aggrModelId, newJoinedId )
            );
            joinedDoc = newJoinedId;
          }

          // 10) Create an alias representing a doc with all kpi-aggrs joined
          bcdui.factory.objectRegistry.withReadyObjects( joinedDoc,
              function( joinedDoc ) {
                bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', measures joined, calculating kpis ..." );
                var needsKpiCalc = this.scAspIdArray.length==0 && bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectSingleNode("/*/scc:Layout/scc:AspectRefs//scc:AspectKpi") == null;
                var resultId = needsKpiCalc ? this.internalPrefix+"_completed_kpiAsp" : this.internalPrefix+"_allAggrJoined";
                new bcdui.core.DataProviderAlias({ id: resultId, name: resultId, source: bcdui.factory.objectRegistry.getObject(joinedDoc) });
                if( needsKpiCalc )
                  this._finalizeScorecard();
              }.bind( this, joinedDoc )
          );
        }.bind( this )
    );

    //-------------------------------------
    // III. Read additional data for aspects and calculate aspects
    // Starting from the aspects which directly associated with the Scorecard, read which once are indirectly referenced
    // and which additional wrq to run
    var waitFor = new Array();
    waitFor.push(this.internalPrefix+"_refDistMeasCol");
    waitFor.push(this.internalPrefix+"_aggrMeasRequested");  // Usually, the kpi measures take longer for loading, so we give them prio here
    if(this.customParameterModelId)
      waitFor.push(this.customParameterModelId);
    bcdui.factory.objectRegistry.withReadyObjects( waitFor,
        function() {
          bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', determining aspects ..." );
          this.customParameter = this.customParameterModelId ? bcdui.factory.objectRegistry.getObject(this.customParameterModelId) : "";

          // List of aspects directly associated with ScoreCard:
          var scAspIdNodes = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectNodes("/*/scc:Layout/scc:AspectRefs//scc:AspectRef/@idRef");

          // 11) Determine which additional data to read for aspects and order to calculate aspects
          // Find the direct and indirect aspects , only two levels now, no recursion yet
          // For each direct associated, keep it and add potentially ones, referenced from here
          // TODO move this recursive logic to configuration.xslt
          this.scAspIdArray = new Array();
          for( var i=0; i<scAspIdNodes.length; i++ ) {
            var aspId = scAspIdNodes.item(i).nodeValue;
            if( this.scAspIdArray.indexOf(aspId)==-1 )
              this.scAspIdArray.push(aspId);

            var aspNode = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectSingleNode("/*/scc:Aspects/scc:Aspect[@id='"+aspId+"']");

            // Xslt
            if( aspNode ) {
              var depOnNodes = aspNode.selectNodes(".//calc:AspectRef/@idRef");
              for( var j=0; j<depOnNodes.length; j++ ) {
                if( this.scAspIdArray.indexOf(depOnNodes.item(j).nodeValue.split("_")[1])==-1 )
                  this.scAspIdArray.push(depOnNodes.item(j).nodeValue.split("_")[1]);
              }
            }            
            // Or a misconfiguration
            else
              bcdui.log.error("Scorecard '"+this.id+"' error: scc:Aspect definition for id='"+aspId+"' not found.");
          }

          // Reverse to start with the ones needed for others
          this.scAspIdArray.reverse();

          // 12) Determine which additional measure data to read for aspects via wrq_modifier
          // Find which aspects have a wrq builder and which wrq modifier
          // this.internalPrefix+"_refAspects" will trigger the modification of the aggregators
          // TODO if aspect recursion is done in configuration.xslt, this can be removed
          var aspIdsString = "<scc:Aspects xmlns:scc='http://www.businesscode.de/schema/bcdui/scorecard-1.0.0'>";
          var aggrIdNodes = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refDistMeasCol").getData().selectNodes("/*/scc:Aggr/@id");
          for( var as=0; as<this.scAspIdArray.length; as++ ) {
            var aspId = this.scAspIdArray[as];
            var aspNode = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectSingleNode("/*/scc:Aspects/scc:Aspect[@id='"+aspId+"']");

            if( aspNode ) {
              // Which ones have a wrq of their own
              var wrqBuilderNode = aspNode.selectSingleNode("scc:WrqBuilder/xsl:stylesheet");
              if( wrqBuilderNode!=null ) {
                aspIdsString += "<scc:Aspect id='"+aspId+"' caption='"+aspNode.getAttribute("caption")+"' type='wrqBuilder'/>";
                this.aspIdsWithWrq[aspId] = { wrqBuilderNode: wrqBuilderNode, aspNode: aspNode };
              }
              // And which ones modify Aggr Wrq. They must do this for each Aggr
              var wrqModifierNode = aspNode.selectSingleNode("scc:WrqModifier/xsl:stylesheet");
              if( wrqModifierNode!=null ) {
                aspIdsString += "<scc:Aspect id='"+aspId+"' caption='"+aspNode.getAttribute("caption")+"' type='wrqModifier'/>";
                for( var ag=0; ag<aggrIdNodes.length; ag++ ) {
                  this.aspIdsWithWrq[aspId+"_agg_"+aggrIdNodes.item(ag).nodeValue] = wrqModifierNode;
                  this.aspCalcIds[aspId] = null;
                }
              }
            }
          }
          bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', need to load aspect(_aggregator)s "+Object.keys(this.aspIdsWithWrq).toString() );

          // This model will trigger reading additional measures for each aggregator according to aspect's wrq modifier
          aspIdsString += "</scc:Aspects>";
          bcdui.factory.createStaticModel( { id: this.internalPrefix+"_refAspects", data: aspIdsString } );

          // 13) Read additional data for aspects, non-measures, i.e. non-WrqModifier but WrqBuilder
          var aspIdKeys = Object.keys(this.aspIdsWithWrq);
          for( var i=0; i<aspIdKeys.length; i++ )
          {
            var aspId = aspIdKeys[i];
            var wrqBuilderNode = this.aspIdsWithWrq[aspIdKeys[i]].wrqBuilderNode;
            if( !wrqBuilderNode )
              continue;
            var aspNode = this.aspIdsWithWrq[aspIdKeys[i]].aspNode;

            // Make the wrq builder doc from database avaiable as XSLT
            var wrqBuilder = bcdui.factory.createStaticModel( { id: this.internalPrefix+"_asp_"+aspId+"_WrqBuilder", data: new XMLSerializer().serializeToString(wrqBuilderNode) } );

            // create the wrq with the wrq builder and run it
            bcdui.factory.objectRegistry.withReadyObjects( [ wrqBuilder, this.internalPrefix+"_refSccDefinition" ],
                function( wrqBuilder, aspId, wrqBuilderNode, aspNode ) {
                  var aspWrq = bcdui.factory.createModelWrapper( { id: this.internalPrefix+"_asp_"+aspId+"_Wrq", stylesheetModel: bcdui.factory.objectRegistry.getObject(wrqBuilder),
                    inputModel: this.internalPrefix+"_refSccDefinition", parameters: { customParameter: this.customParameter,
                    statusModel: this.statusModel, aspectDef: aspNode } } );

                  // Run the aspect's wrq
                  bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', aspect '"+aspId+"' loading add. data ..." );
                  var wrsV = bcdui.factory.createModel( { id: this.internalPrefix+"_asp_"+aspId+"_ColWrs", requestDocument: aspWrq, url: bcdui.core.webRowSetServletPath + "/sc/asp/" + aspId } );

                  // 13a) We may need to apply a pre-calculation on the aspects result
                  var preCalcNode = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectSingleNode("/*/scc:Aspects/scc:Aspect[@id='"+aspId+"']/scc:PreCalc/*[self::xsl:stylesheet or self::chain:Chain]");
                  if( preCalcNode!=null ) {
                      var preCalc = bcdui.factory.createStaticModel( { id: this.internalPrefix+"_asp_"+aspId+"_WrqBuilder_preCalculation", data: new XMLSerializer().serializeToString(preCalcNode) } );
                      wrsV = bcdui.factory.createModelWrapper( { id: this.internalPrefix+"_asp_"+aspId+"_ColWrs_preCalced",
                        stylesheetModel: bcdui.factory.objectRegistry.getObject(preCalc), inputModel: wrsV, parameters: { customParameter: this.customParameter,
                        statusModel: this.statusModel } } );
                  }

                  // 13b) Transpose the wrs
                  // The transposed doc will trigger 14)
                  this._createMeasuresInColumnsModel( { resultId: this.internalPrefix+"_asp_"+aspId+"_RowWrs", input: wrsV } );
                }.bind( this, wrqBuilder, aspId, wrqBuilderNode, aspNode )
            );

          } // Loop over aspects with wrq builder

        }.bind( this )
    );

    //-------------------------------------
    // 14) Join additional aspects data
    // and 16) Join additional measure data for aspects
    bcdui.factory.objectRegistry.withReadyObjects( [ this.internalPrefix+"_allAggrJoined", this.internalPrefix+"_refAspects" ],
        function() {
          bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', joining "+Object.keys(this.aspIdsWithWrq).length+" aspects add. data  ..." );
          var leftDoc = this.internalPrefix+"_allAggrJoined";

          for( var i=0; i<Object.keys(this.aspIdsWithWrq).length; i++ ) {
            var aspId = Object.keys(this.aspIdsWithWrq)[i];
            bcdui.factory.objectRegistry.withReadyObjects( [ leftDoc, this.internalPrefix+"_asp_"+aspId+"_RowWrs" ],
                function( leftDoc, aspId ) {
                  bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', joning aspect '"+aspId+"' ..." );
                  var aspOnlyId = aspId.split("_agg_")[0];
                  var aggrOnlyId = aspId.split("_agg_")[1];
                  var idPrefix = "asp_"+aspOnlyId+"_";
                  var captionNode = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectSingleNode("/*/scc:Aspects/scc:Aspect[@id='"+aspOnlyId+"']/@caption"); 
                  var captionPrefix = (captionNode != null ? captionNode.text : "") + "|";
                  if( aggrOnlyId!=null ) {
                    var aggrNodeForCaption = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectSingleNode("/*/scc:Aggregators/scc:Aggregator[@id='"+aggrOnlyId+"']");
                    captionPrefix += aggrNodeForCaption.getAttribute("caption") || aggrNodeForCaption.getAttribute("id");
                    captionPrefix += "|";
                    idPrefix += "agg_"+aggrOnlyId+"_";
                  }
                  bcdui.factory.createModelWrapper( { url: bcdui.contextPath+"/bcdui/xslt/wrs/join.xslt", id: this.internalPrefix+"_asp_"+aspId+"_KpiData", inputModel: this.internalPrefix+"_asp_"+aspId+"_RowWrs",
                    parameters: { dimensions: this.dimensions, leftDoc: bcdui.factory.objectRegistry.getObject(leftDoc), makeLeftOuterJoin: true,
                                  rightIdPrefix: idPrefix, rightCaptionPrefix:  captionPrefix } } );
                }.bind( this, leftDoc, aspId )
            );
            leftDoc = this.internalPrefix+"_asp_"+aspId+"_KpiData";
          }

          // 17) Run KPI calculation for the KPIs themselves and for additional measure data requested by aspects
          // aspects data is joined, for those with wrq modifiers, run the kpi calculation
          bcdui.factory.objectRegistry.withReadyObjects( leftDoc,
              function( leftDoc ) {
                bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', add. data and measures for aspects joined, calculating kpis and kpis on aspects ..." );
                bcdui.factory.createModelWrapper( { id: this.internalPrefix+"_completed_kpiCalcs", inputModel: leftDoc, url: this.cp+"kpiAllCalcs.xslt",
                  parameters: { sccDefinition: bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition"), refAspWrqWithModifier: bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refAspects") } } );
              }.bind( this, leftDoc )
          );

          // 18) Run aspect calculations
          // All data and kpis are available, now run the aspect calculations
          // First we apply the aspects with JsProcFct, then the Xslt ones, including the calc:Calc from the ones with JsProcFct. 
          // TODO more control over order here, check if it refers other aspect for example in its configuration data
          
          // First full js and xslt procs in given order
          var aspCalcChain = [];
          var aspectsNode = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectSingleNode("/*/scc:Aspects");
          for( var i=0; i<this.scAspIdArray.length; i++ ) {
            var jsProcFctNode = aspectsNode.selectSingleNode("scc:Aspect[@id='"+this.scAspIdArray[i]+"']/scc:JsProcFct/text()");
            if( !!jsProcFctNode ) {
              var jsProcFct = jsProcFctNode.nodeValue.split(".").reduce( function(prevVal, currVal) { return prevVal[currVal] }, window); // Avoiding nasty eval here
              aspCalcChain.push( jsProcFct );
            }
            var xsltProcFctNode = aspectsNode.selectSingleNode("scc:Aspect[@id='"+this.scAspIdArray[i]+"']/scc:Stylesheet/@href");
            if( !!xsltProcFctNode ) {
              aspCalcChain.push( xsltProcFctNode.nodeValue );
            }
          }

          // Then the xslts
          aspCalcChain.push( this.cp+"aspectAllCalcs.xslt" );

          var aspIds = "";
          for( var i=0; i<this.scAspIdArray.length; i++ ) // TODO once recursive aspect finding is in configuration.xslt, the aspectIds param can go
            aspIds += " "+this.scAspIdArray[i];
          bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', applying "+this.scAspIdArray.length+" aspect calculations '"+ aspIds +"' ..." );
          // This xslt will result in a Nop operation, if aspIds is empty
          bcdui.factory.createModelWrapper( { url: aspCalcChain,
            inputModel: this.internalPrefix+"_completed_kpiCalcs", id: this.internalPrefix+"_completed_kpiAsp",
            parameters: { sccDefinition: bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition"), aspectIds: aspIds,
                          statusModel: this.statusModel } } );

          this.setStatus(this.transformingStatus);
        }.bind( this )
    );
  }

  // 15) Read additional measure data for aspects, per aggr

  /**
   * @private
   */
  _applyAspWrqModToAggr( aggrWrq, aggrId )
  {
    bcdui.factory.objectRegistry.withReadyObjects( [ this.internalPrefix+"_refAspects" ],
      function( aggrWrq, aggrId ) {
        var aspWrqWithModifierIdNodes = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refAspects").getData().selectNodes("//scc:Aspect[@type='wrqModifier']/@id");
        bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', reading "+aspWrqWithModifierIdNodes.length+" asp measures ..." );

        // Loop over the aspects with wrq modifiers and apply each on this aggregator
        for( var i=0; i<aspWrqWithModifierIdNodes.length; i++ )
        {
          var aspId = aspWrqWithModifierIdNodes.item(i).nodeValue;

          // Make the modifier db value available as an XSLT
          var aspWrqModifierNode = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectSingleNode("/*/scc:Aspects/scc:Aspect[@id='"+aspId+"']/scc:WrqModifier/xsl:stylesheet");
          var aspWrqModifier = bcdui.factory.createStaticModel( { id: this.internalPrefix+"_asp_"+aspId+"_agg_"+aggrId+"_WrqModifier", data: new XMLSerializer().serializeToString(aspWrqModifierNode) } );

          // Apply the modifier on the aggregator's wrq to get the wrq of the aspect
          var aspWrq = bcdui.factory.createModelWrapper( { id: this.internalPrefix+"_asp_"+aspId+"_agg_"+aggrId+"_Wrq", stylesheetModel: bcdui.factory.objectRegistry.getObject(aspWrqModifier), inputModel: aggrWrq } )

          // Run the aspects wrq
          var wrsV = bcdui.factory.createModel( { id: this.internalPrefix+"_asp_"+aspId+"_agg_"+aggrId+"_ModifierColWrs", requestDocument: aspWrq, url: bcdui.core.webRowSetServletPath + "/sc/asp_aggr/" + aspId + "/" + aggrId } );

          // We may need to apply a pre-calculation on the aggragator's result
          var toBeTransposed = wrsV;
          
          // This is the precalc inherited from the aggregator request we are modifying
          var aggrNode = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectSingleNode("/*/scc:Aggregators/*[@id='"+aggrId+"']");
          var preCalcNode = aggrNode.selectSingleNode("scc:PreCalc/*[self::xsl:stylesheet or self::chain:Chain]");
          if( preCalcNode!=null ) {
            var preCalc = bcdui.factory.createStaticModel( { id: this.internalPrefix+"_agg_"+aggrId+"_WrqBuilder_"+aspId+"_preCalculation", data: new XMLSerializer().serializeToString(preCalcNode) } );
            toBeTransposed = bcdui.factory.createModelWrapper( { id: this.internalPrefix+"_asp_"+aspId+"_ColWrs_agg_"+aggrId+"_preCalced",
              stylesheetModel: bcdui.factory.objectRegistry.getObject(preCalc), inputModel: wrsV, parameters: { customParameter: this.customParameter, statusModel: this.statusModel } } );
          }

          // This is the precalc for the current aspect itself
          var preCalcNodeAsp = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectSingleNode("/*/scc:Aspects/scc:Aspect[@id='"+aspId+"']/scc:PreCalc/*[self::xsl:stylesheet or self::chain:Chain]");
          if( preCalcNodeAsp!=null ) {
            var preCalcAsp = bcdui.factory.createStaticModel( { id: this.internalPrefix+"_agg_"+aggrId+"_WrqBuilder_"+aspId+"_preCalculationAsp", data: new XMLSerializer().serializeToString(preCalcNodeAsp) } );
            toBeTransposed = bcdui.factory.createModelWrapper( { id: this.internalPrefix+"_asp_"+aspId+"_ColWrs_agg_"+aggrId+"_preCalcedAsp",
              stylesheetModel: bcdui.factory.objectRegistry.getObject(preCalcAsp), inputModel: toBeTransposed, parameters: { customParameter: this.customParameter, statusModel: this.statusModel } } );
          }

          // 15a) Transpose the result
          // The transposed wrs will trigger 16)
          this._createMeasuresInColumnsModel( { resultId: this.internalPrefix+"_asp_"+aspId+"_agg_"+aggrId+"_RowWrs", input: toBeTransposed } );
        }
      }.bind( this, aggrWrq, aggrId )
    );
  }

  /**
   * Gets a model where the measures (for kpi data) or kpis (for aspects) are per row and returns a model where they are columnwise
   * @private
   */
  _createMeasuresInColumnsModel( args )
  {
    bcdui.factory.objectRegistry.withReadyObjects( args.input, function( args )
    {
      var input = bcdui.factory.objectRegistry.getObject(args.input);

      // Maybe the model has already measures in columns, then we just need an alias
      if( input.getData().selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='bcd_kpi_id' or @id='bcd_measure_id']") == null ) {
        new bcdui.core.DataProviderAlias({ id: args.resultId, name: args.resultId, source: input });
      }

      // If not we transpose it. Due to performance optimization on mobile webkit, we provide an extra implementation there
      else {
        var rule = bcdui.browserCompatibility.isWebKit ? bcdui.wrs.wrsUtil.transposeGrouping : bcdui.contextPath+"/bcdui/xslt/wrs/transposeGrouping.xslt";
        var dimNodes = input.getData().selectNodes("/*/wrs:Header/wrs:Columns/wrs:C[@dimId and not(@id='bcd_measure_id') and not(@id='bcd_kpi_id')]");
        var dimCount = 1+dimNodes.length;
        bcdui.factory.createModelWrapper( { id: args.resultId, url: rule,
          inputModel: input, parameters: { groupingColumnCount: dimCount, transposedColumnNo: dimCount } } );
      }
    }.bind(this, args));
  }

  /**
   * All calculations are now finished. We do apply the layout requsts here
   * Maybe turn KPIs into rows, model aspects as wrs:A attributes, do column dimensions
   * @private
   */
  _finalizeScorecard()
  {
    bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', calculating "+this.scAspIdArray.length+" aspects ..." );
    bcdui.factory.objectRegistry.withReadyObjects( this.internalPrefix+"_completed_kpiAsp",
        function() {
          // 19) Verticalize KPIs, keep aspects as columns
          bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', finalizing layout ..." );
          var urls = [ this.cp + "verticalizeKpis.xslt" ];
          var parameters = {
              sccDefinition: bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition")
          };

          // add sorting when we got sorted aspects or top n 
          if (this.refSccDefinition.query("/*/scc:Layout[scc:AspectRefs/*[@sort!=''] or scc:TopNDimMembers/scc:TopNDimMember]") != null) {
            parameters.paramModel = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition");
            urls.push(this.cp + "orderAndCut.xslt");
          }

          // LevelKpi does not count as a coldim in this sense but is treated as a measure
          var colDims = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectNodes("/*/scc:Layout/scc:Dimensions/scc:Columns/dm:LevelRef");
          if(colDims.length>0) {
            urls.push(bcdui.contextPath+"/bcdui/xslt/colDims.xslt");
            parameters.paramModel = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition");
          }
          // 21) Optionally join category data
          if (this.refSccDefinition.query("/*/scc:Layout/scc:CategoryTypeRefs/scc:CategoryTypeRef") !== null ) {
            urls.push(this.cp + "addCategories.xslt");
            // for column kpi categories we need to resort our data
            if (this.refSccDefinition.query("/*/scc:Layout/scc:Dimensions/scc:Columns/scc:LevelKpi") !== null)
              urls.push(this.cp + "sortColCategories.xslt");
          }
          // 22) Optionally remove empty rows and cols
          if ( bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition").getData().selectSingleNode("/*/scc:Layout/@removeEmptyCells") ) {
            urls.push(bcdui.contextPath+"/bcdui/js/component/cube/removeEmptyCells.xslt");
            parameters.paramModel = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition");
          }
          bcdui.factory.createModelWrapper( {
            url:        urls,
            inputModel: this.internalPrefix+"_completed_kpiAsp",
            id:         this.internalPrefix+"_final",
            parameters: parameters
          } );
        }.bind( this )
    );
    bcdui.factory.objectRegistry.withReadyObjects( this.internalPrefix+"_final", function() {
      // If we did treat the KPIs as measures in colDims for performance reasons, we need to manupulate the resulting header a bit
      var scDef = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_refSccDefinition");
      var doVerticalize = scDef.query("/*/scc:Internal/scc:VerticalizeKpis[@doVerticalize='true']") != null;
      if( !doVerticalize ) {
        var valueHeaderNodes = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_final").getData().selectNodes("/*/wrs:Header/wrs:Columns/wrs:C[@valueId]");
        for( var h=0; h<valueHeaderNodes.length; h++ ) {
          var valueId = valueHeaderNodes.item(h).getAttribute("valueId").split("|")[0];
          valueHeaderNodes.item(h).setAttribute("valueId",valueHeaderNodes.item(h).getAttribute("valueId").split("|")[1]);
        }
        
        // update colDimLevelIds/colDimLevelCaptions attributes by adding category and kpi information
        var columnHeaderNode = bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_final").getData().selectSingleNode("/*/wrs:Header/wrs:Columns");

        var oldColDimLevelIds = columnHeaderNode.getAttribute("colDimLevelIds") || "";
        var cat = "";
        jQuery.makeArray(scDef.queryNodes("/*/scc:Layout/scc:CategoryTypeRefs/scc:CategoryTypeRef")).forEach(function(e) {cat += "|" + e.getAttribute("idRef");});
        var f = oldColDimLevelIds + cat + "|bcd_kpi_id";
        f = f[0] == "|" ? f.substring(1) : f;
        columnHeaderNode.setAttribute("colDimLevelIds", f);

        var oldColDimLevelCaptions = columnHeaderNode.getAttribute("colDimLevelCaptions") || "";
        var cat = "";
        jQuery.makeArray(scDef.queryNodes("/*/scc:Layout/scc:CategoryTypeRefs/scc:CategoryTypeRef")).forEach(function(e) {cat += "|" + e.getAttribute("caption");});
        var f = oldColDimLevelCaptions + cat + "|";
        f = f[0] == "|" ? f.substring(1) : f;
        columnHeaderNode.setAttribute("colDimLevelCaptions", f);
      }
      // Scorecard is ready
      var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.getReadyStatus();
      this.setStatus(newStatus);
    }.bind(this) );
  }

  /**
   * @inheritdoc
   */
  getReadyStatus()
  {
    return this.transformedStatus;
  }

  /**
   * 22) Final data is in internal mode and passed on getData()
   */
  getData()
  {
    return bcdui.factory.objectRegistry.getObject(this.internalPrefix+"_final").getData();
  }

  /**
   * @private
   */
  _executeImpl()
  {
    if (this.status.equals(this.initializedStatus) || this.status.equals(this.getReadyStatus()) ) {
      this.setStatus(this.loadingStatus);
    }
  }

  /**
   * @private
   */
  _statusTransitionHandler(/* StatusEvent */ statusEvent)
  {
    if (statusEvent.getStatus().equals(this.loadingStatus)) {
      this._calculate();
    } else if (statusEvent.getStatus().equals(this.transformingStatus)) {
      this._finalizeScorecard();
    } else if (statusEvent.getStatus().equals(this.getReadyStatus())) {
      bcdui.log.isTraceEnabled() && bcdui.log.trace( "Scorecard '"+this.id+"', done." );
    }
  }

} ;