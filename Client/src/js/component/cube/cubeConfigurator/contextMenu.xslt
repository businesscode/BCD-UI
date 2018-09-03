<?xml version="1.0" encoding="UTF-8"?>
<!--
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
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns="http://www.businesscode.de/schema/bcdui/contextMenu-1.0.0"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="wrsModel" select="/*[0=1]"/>
  <xsl:param name="bcdColIdent" />
  <xsl:param name="bcdRowIdent" />
  <xsl:param name="bcdMeasure" />
  <xsl:param name="bcdDimension" />
  <xsl:param name="cubeId" />

  <xsl:variable name="maxRowDimPos" select="count($wrsModel/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@dimId])"/>
  <xsl:variable name="statusModelLayout" select="/*/cube:Layout[@cubeId=$cubeId]"/>
  <xsl:variable name="colHead" select="$wrsModel/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@id = $bcdColIdent]"/>
  <xsl:variable name="measure" select="$statusModelLayout//dm:MeasureRef[@idRef=$measureId] | $statusModelLayout//dm:Measure[@id=$measureId]"/>
  <xsl:variable name="gotVdm" select="$wrsModel/wrs:Wrs/wrs:Data/wrs:R/@bcdVdm"/>
  <xsl:variable name="row" select="$wrsModel/wrs:Wrs/wrs:Data/wrs:R[@id=$bcdRowIdent]"/>

  <!-- Defines on which area of the cube we are -->
  <xsl:variable name="contextType">
    <xsl:call-template name="cellContextType"/>
  </xsl:variable>

  <xsl:variable name="isVdm" select="boolean($colHead/@bcdVdm) or boolean($row/@bcdVdm)"/>

  <xsl:variable name="measureCaption">
    <xsl:call-template name="getMeasureId">
      <xsl:with-param name="bcdColIdentRest" select="$colHead/@caption"/>
    </xsl:call-template>
  </xsl:variable>
  <xsl:variable name="measureId">
    <xsl:call-template name="getMeasureId">
      <xsl:with-param name="bcdColIdentRest" select="$bcdColIdent"/>
    </xsl:call-template>
  </xsl:variable>
  <xsl:template name="getMeasureId">
    <xsl:param name="bcdColIdentRest"/>
    <xsl:choose>
      <xsl:when test="substring-after($bcdColIdentRest,'|')">
        <xsl:call-template name="getMeasureId">
          <xsl:with-param name="bcdColIdentRest" select="substring-after($bcdColIdentRest,'|')"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$bcdColIdentRest"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Root -->
  <xsl:template match="/*">
    <ContextMenu>

      <!-- Options depending on the area of the cube -->
      <xsl:choose>
        <!-- Row dimension header -->
        <xsl:when test="$contextType='RowDimensionHeader'">
          <xsl:call-template name="columnSort"/>
          <xsl:call-template name="sortDimByMeas">
            <xsl:with-param name="isColDim" select="false()"/>
          </xsl:call-template>
          <xsl:call-template name="totals">
            <xsl:with-param name="isColDim" select="false()"/>
          </xsl:call-template>
        </xsl:when>

        <!-- Col dimension member -->
        <xsl:when test="$contextType='ColTotalHeader'">
          <xsl:call-template name="columnSort"/>
          <xsl:call-template name="totals">
            <xsl:with-param name="isColDim" select="true()"/>
          </xsl:call-template>
        </xsl:when>

        <!-- Col dimension member -->
        <xsl:when test="$contextType='ColDimensionMember'">
          <xsl:call-template name="columnSort"/>
          <xsl:call-template name="sortDimByMeas">
            <xsl:with-param name="isColDim" select="true()"/>
          </xsl:call-template>
          <ContextMenuEntryGroup caption="Hide &amp; Exclude Dimension Members" >
            <xsl:if test="not($isVdm)">
              <TwoColumns>
                <Entry caption="Hide">
                  <JavaScriptAction>
                    var levelId = bcdui._migPjs._$(this.eventSrcElement).closest("tr").attr("levelId");
                    if( bcdui._migPjs._$(this.eventSrcElement).get(0).firstChild )
                      bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, isColDim: true, all: false } )
                  </JavaScriptAction>
                </Entry>
                <Entry caption="Hide all">
                  <JavaScriptAction>
                    var levelId = bcdui._migPjs._$(this.eventSrcElement).closest("tr").attr("levelId");
                    if( bcdui._migPjs._$(this.eventSrcElement).get(0).firstChild )
                      bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, isColDim: true, all: true } )
                  </JavaScriptAction>
                </Entry>
                <Entry caption="Exclude (req. apply)">
                  <JavaScriptAction>
                    var levelId = bcdui._migPjs._$(this.eventSrcElement).closest("tr").attr("levelId");
                    if( bcdui._migPjs._$(this.eventSrcElement).get(0).firstChild )
                      bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"excludeDimMember", levelId: levelId, isColDim: true, all: false } )
                  </JavaScriptAction>
                </Entry>
                <Entry caption="Exclude all (req. apply)">
                  <JavaScriptAction>
                    var levelId = bcdui._migPjs._$(this.eventSrcElement).closest("tr").attr("levelId");
                    if( bcdui._migPjs._$(this.eventSrcElement).get(0).firstChild )
                      bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"excludeDimMember", levelId: levelId, isColDim: true, all: true } )
                  </JavaScriptAction>
                </Entry>
              </TwoColumns>
            </xsl:if>
            <Entry caption="Show all values for this dimension">
              <JavaScriptAction>
                var levelId = bcdui._migPjs._$(this.eventSrcElement).closest("tr").attr("levelId");
                bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, showAll: true } )
              </JavaScriptAction>
            </Entry>
          </ContextMenuEntryGroup>
          <xsl:call-template name="totals">
            <xsl:with-param name="isColDim" select="true()"/>
          </xsl:call-template>
        </xsl:when>

        <!-- Measure header -->
        <xsl:when test="$contextType='ColMeasureHeader'">
          <ContextMenuTitle caption="Actions for '{$measureCaption}'"/>
          <xsl:call-template name="columnSort"/>
          <xsl:call-template name="cumulate"/>
        </xsl:when>

        <!-- Row total dimension member -->
        <xsl:when test="$contextType='RowDimensionTotalMember'">
          <xsl:call-template name="columnSort"/>
          <xsl:call-template name="totals">
            <xsl:with-param name="isColDim" select="false()"/>
          </xsl:call-template>
        </xsl:when>

        <xsl:when test="$contextType='RowDimensionMember'">
          <xsl:call-template name="columnSort"/>
          <xsl:call-template name="sortDimByMeas">
            <xsl:with-param name="isColDim" select="false()"/>
          </xsl:call-template>
          <xsl:if test="not($isVdm)">
            <ContextMenuEntryGroup caption="Hide &amp; Exclude Dimension Members" >
              <TwoColumns>
                <Entry caption="Hide">
                  <JavaScriptAction>
                    var levelId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                    if( bcdui._migPjs._$(this.eventSrcElement).get(0).firstChild )
                      bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, isColDim: false, all: false } )
                  </JavaScriptAction>
                </Entry>
                <Entry caption="Hide all">
                  <JavaScriptAction>
                    var levelId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                    if( bcdui._migPjs._$(this.eventSrcElement).get(0).firstChild )
                      bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, isColDim: false, all: true} )
                  </JavaScriptAction>
                </Entry>
                <Entry caption="Exclude (apply)">
                  <JavaScriptAction>
                    var levelId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                    if( bcdui._migPjs._$(this.eventSrcElement).get(0).firstChild )
                      bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"excludeDimMember", levelId: levelId, isColDim: false, all: false } )
                  </JavaScriptAction>
                </Entry>
                <Entry caption="Exclude all (apply)">
                  <JavaScriptAction>
                    var levelId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                    if( bcdui._migPjs._$(this.eventSrcElement).get(0).firstChild )
                      bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"excludeDimMember", levelId: levelId, isColDim: false, all: true } )
                  </JavaScriptAction>
                </Entry>
              </TwoColumns>
              <Entry caption="Show all values for this dimension">
                <JavaScriptAction>
                  var levelId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                  bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, showAll: true} )
                </JavaScriptAction>
              </Entry>
            </ContextMenuEntryGroup>
          </xsl:if>
          <xsl:call-template name="totals">
            <xsl:with-param name="isColDim" select="false()"/>
          </xsl:call-template>
        </xsl:when>

        <!-- A standard cell with a measure -->
        <xsl:when test="$contextType='MeasureCell'">
          <ContextMenuTitle caption="Actions for '{$measureCaption}'"/>
          <xsl:call-template name="columnSort"/>
          <xsl:call-template name="cumulate"/>
          <xsl:call-template name="detailExport"/>
        </xsl:when>

        <!-- A total cell with a measure -->
        <xsl:when test="$contextType='MeasureTotalCell'">
          <xsl:call-template name="columnSort"/>
          <xsl:call-template name="detailExport"/>
        </xsl:when>

      </xsl:choose>

      <!--
        These options are always available as they do not need a specific input
        -->
      <ContextMenuEntryGroup caption="Create Custom Calculations" >
        <TwoColumns>
          <xsl:call-template name="addRowCalculation"/>
          <Entry caption="Measure (all dim)">
            <JavaScriptAction>bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'addColumnMeasure' })</JavaScriptAction>
          </Entry>
          <xsl:call-template name="addColumnCalculation"/>
          <Entry caption="Measure (row dim)">
            <JavaScriptAction>bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'addRowMeasure' })</JavaScriptAction>
          </Entry>
        </TwoColumns>
        <xsl:call-template name="editCalculation">
          <xsl:with-param name="isRow" select="true()"/>
          <xsl:with-param name="vdmId" select="$row/@bcdVdm"/>
        </xsl:call-template>
        <xsl:call-template name="editCalculation">
          <xsl:with-param name="isRow" select="false()"/>
          <xsl:with-param name="vdmId" select="$colHead/@bcdVdm"/>
        </xsl:call-template>
        <xsl:if test="$measure/@userDefined='true'">
          <ContextMenuSubHeader caption="Modification of measure '{$measureCaption}'"/>
          <TwoColumns>
            <Entry caption="Edit">
              <JavaScriptAction>bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'editUserMeasure', calcId: '<xsl:value-of select="$measureId"/>'})</JavaScriptAction>
            </Entry>
            <Entry caption="Delete">
              <JavaScriptAction>bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'deleteUserMeasure', calcId: '<xsl:value-of select="$measureId"/>'})</JavaScriptAction>
            </Entry>
          </TwoColumns>
        </xsl:if>
      </ContextMenuEntryGroup>

      <ContextMenuEntryGroup caption="General Options" >
        <Entry caption="Report export">
          <JavaScriptAction>bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:reportExport")</JavaScriptAction>
        </Entry>
        <Entry caption="Show all hidden values">
          <JavaScriptAction>
            var levelId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
            bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: "bcdAll", showAll: true} )
          </JavaScriptAction>
        </Entry>
      </ContextMenuEntryGroup>
    </ContextMenu>
  </xsl:template>

  <!-- Determines on which area of the table we are -->
  <xsl:template name="cellContextType">
    <xsl:variable name="isGrouping" select="$row/wrs:C[position()=$maxRowDimPos]/@bcdGr='1'" />
    <xsl:choose>

      <!-- Detect if we are a column header and which type  -->
      <xsl:when test="$bcdRowIdent = '' or  $bcdRowIdent = 'bcdMeasureHeader'">
        <xsl:choose>
          <xsl:when test="contains($bcdColIdent,'&#xE0F0;1')"><!-- column showing totals -->
            <xsl:text>ColTotalHeader</xsl:text>
          </xsl:when>
          <xsl:when test="$colHead/@dimId"><!-- Header above row dimensions at the top left -->
            <xsl:text>RowDimensionHeader</xsl:text>
          </xsl:when>
          <xsl:when test="$bcdRowIdent='bcdMeasureHeader'"><!-- Standard col measure -->
            <xsl:text>ColMeasureHeader</xsl:text>
          </xsl:when>
          <xsl:when test="not(contains($bcdColIdent,'|'))"><!-- row-dim-only col measure -->
            <xsl:text>ColMeasureHeader</xsl:text>
          </xsl:when>
          <xsl:otherwise>
            <xsl:text>ColDimensionMember</xsl:text><!-- Any other must be col dimension member -->
          </xsl:otherwise>
        </xsl:choose>
      </xsl:when>

     <!-- measure section or row-dimension members of table -->
      <xsl:otherwise>
        <xsl:choose>
          <xsl:when test="$colHead/@valueId != ''">
            <xsl:choose>
              <xsl:when test="contains($bcdColIdent,'&#xE0F0;1') or $isGrouping">
                <xsl:text>MeasureTotalCell</xsl:text>
              </xsl:when>
              <xsl:otherwise>
                <xsl:text>MeasureCell</xsl:text>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:when>
          <xsl:when test="$colHead/@dimId != ''">
            <xsl:choose>
              <xsl:when test="$isGrouping">
                <xsl:text>RowDimensionTotalMember</xsl:text>
              </xsl:when>
              <xsl:otherwise>
                <xsl:text>RowDimensionMember</xsl:text>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:when>
          <xsl:otherwise><xsl:text>UNKOWN_CELL</xsl:text></xsl:otherwise>
        </xsl:choose>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="columnSort">
    <ContextMenuEntryGroup caption="Column Sorting" >
      <TwoColumns>
        <Entry caption="Sort ascending">
          <JavaScriptAction>
            bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh",{ actionId: 'setColumnSort', isDim: <xsl:value-of select="boolean(not($measure))"/>, direction: "ascending"});
          </JavaScriptAction>
        </Entry>
        <Entry caption="Sort descending">
          <JavaScriptAction>
            bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh",{ actionId: 'setColumnSort', isDim: <xsl:value-of select="boolean(not($measure))"/>, direction: "descending"});
          </JavaScriptAction>
        </Entry>
        <xsl:if test="$statusModelLayout/@manualSort='true'">
          <Entry caption="Clear sorting">
            <JavaScriptAction>
              bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh",{ actionId: 'setColumnSort', isDim: <xsl:value-of select="boolean(not($measure))"/>, direction: null});
            </JavaScriptAction>
          </Entry>
        </xsl:if>
      </TwoColumns>
    </ContextMenuEntryGroup>
  </xsl:template>

  <!-- Helper for sortDimByMeas, lists the distinct measures -->
  <xsl:template name="sortDimByMeas">
    <xsl:param name="isColDim"/>
    <!-- only available if the dim got a total set and we actually have measures-->
    <xsl:if test="$statusModelLayout//dm:LevelRef[@total!='' and @bRef=$bcdDimension] and not($statusModelLayout/cube:Hide//f:Expression[@bRef=$bcdDimension]) and count($statusModelLayout//cube:Measures/*/*) != 0">
      <ContextMenuEntryGroup caption="Sort Level By Measure">
        <xsl:call-template name="sortDimByMeasInner">
          <xsl:with-param name="direction">ascending</xsl:with-param>
          <xsl:with-param name="isColDim" select="$isColDim"/>
        </xsl:call-template>
        <xsl:call-template name="sortDimByMeasInner">
          <xsl:with-param name="direction">descending</xsl:with-param>
          <xsl:with-param name="isColDim" select="$isColDim"/>
        </xsl:call-template>
        <xsl:if test="$statusModelLayout//dm:LevelRef/@sortBy">
          <ContextMenuSubHeader caption="Clear sorting">
            <Entry caption="Clear Sorting">
                <JavaScriptAction>bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"setSortDimByMeasure", clear: true
                  <xsl:if test="$isColDim">, colDimId: bcdui._migPjs._$(this.eventSrcElement).closest('tr').attr('levelId')</xsl:if> } )</JavaScriptAction>
            </Entry>
          </ContextMenuSubHeader>
        </xsl:if>
      </ContextMenuEntryGroup>
    </xsl:if>
  </xsl:template>

  <xsl:template name="sortDimByMeasInner">
    <xsl:param name="direction"/>
    <xsl:param name="isColDim"/>
    <ContextMenuSubHeader caption="{$direction}:"/>
    <!-- Loop over distinct valueIds. We want those, which represent the total as that allows us easily to derive the caption.
      Also, col dimensions can only be sorted by measures where thay apply but row dimensions can be sorted by all measures
    -->
    <TwoColumns>
      <xsl:for-each select="$wrsModel/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@valueId and not(@valueId=preceding-sibling::wrs:C/@valueId) and (not($isColDim) or contains(@id,'|'))]">
        <xsl:variable name="caption">
          <xsl:call-template name="substringAfterLast">
            <xsl:with-param name="string" select="@caption"/>
          </xsl:call-template>
        </xsl:variable>
        <Entry caption="{$caption}">
          <JavaScriptAction>bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"setSortDimByMeasure",
                direction: '<xsl:value-of select="$direction"/>',
                sortBy: '<xsl:value-of select="@valueId"/>'
                <xsl:if test="$isColDim">
                  , colDimId: bcdui._migPjs._$(this.eventSrcElement).closest('tr').attr('levelId')
                </xsl:if>
              });
          </JavaScriptAction>
        </Entry>
      </xsl:for-each>
    </TwoColumns>
  </xsl:template>

  <!-- Helper to the $string part after last $token  -->
  <xsl:template name="substringAfterLast">
    <xsl:param name="string"/>
    <xsl:param name="token" select="'|'"/>
    <xsl:choose>
      <xsl:when test="contains($string,$token)">
        <xsl:call-template name="substringAfterLast">
          <xsl:with-param name="string" select="substring-after($string,$token)"/>
          <xsl:with-param name="token" select="$token"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$string"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="cumulate">
    <ContextMenuEntryGroup caption="Measure Cumulation">
      <TwoColumns>
        <Entry caption="Cumulate row">
          <xsl:if test="not(contains($bcdColIdent,'|'))"><xsl:attribute name="isDisabled">true</xsl:attribute></xsl:if>
          <JavaScriptAction>bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"setCumulate", isRow: true})</JavaScriptAction>
        </Entry>
        <Entry caption="Cumulate colunm">
          <JavaScriptAction>bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"setCumulate", isRow: false})</JavaScriptAction>
        </Entry>
      </TwoColumns>
      <xsl:if test="boolean($measure/@cumulateCol) or boolean($measure/@cumulateRow)">
        <Entry caption="Clear cumulation">
          <JavaScriptAction>bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"setCumulate", clear: true})</JavaScriptAction>
        </Entry>
      </xsl:if>
    </ContextMenuEntryGroup>
  </xsl:template>

  <xsl:template name="totals">
    <xsl:param name="isColDim"/>
    <ContextMenuEntryGroup caption="Totals" >
      <xsl:if test="$statusModelLayout//dm:LevelRef[(@total!='') and @bRef=$bcdDimension] and not($statusModelLayout/cube:Hide//f:Expression[@bRef=$bcdDimension and @op='!=' and @value='&#xE0F0;1'])">
        <Entry caption="Hide total values for this level">
          <xsl:choose>
            <xsl:when test="$isColDim">
              <JavaScriptAction>
                var levelNode = bcdui._migPjs._$(this.eventSrcElement).closest("tr");
                var levelId = levelNode.attr("levelId");
                if (levelId == null) {
                  levelNode = levelNode.prev();
                  if (levelNode.length > 0)
                    levelId = levelNode.attr("levelId");
                }
                var outerLevelId = null;
                var outerLevel = levelNode.prevAll("tr");
                if( outerLevel )
                  outerLevelId = outerLevel.attr("levelId");
                bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, outerLevelId: outerLevelId, isColDim: true, all: true, total: true } )
              </JavaScriptAction>
            </xsl:when>
            <xsl:otherwise>
              <JavaScriptAction>
                var levelId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                var outerLevelId = "<xsl:value-of select="$colHead/preceding-sibling::*[1]/@id"/>";
                bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, outerLevelId: outerLevelId, isColDim: false, all: true, total: true} )
              </JavaScriptAction>
            </xsl:otherwise>
          </xsl:choose>
        </Entry>
      </xsl:if>
      <xsl:if test="$statusModelLayout//dm:LevelRef[(not(@total) or @total='') and @bRef=$bcdDimension] or $statusModelLayout/cube:Hide//f:Expression[@bRef=$bcdDimension and @op='!=' and @value='&#xE0F0;1']">
        <xsl:choose>
          <xsl:when test="$isColDim">
            <Entry caption="Show total values for this level">
              <JavaScriptAction>
                var levelId = bcdui._migPjs._$(this.eventSrcElement).closest("tr").attr("levelId");
                bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"showThisTotals", levelId: levelId} )
              </JavaScriptAction>
            </Entry>
          </xsl:when>
          <xsl:otherwise>
            <Entry caption="Show total values for this level">
              <JavaScriptAction>
                var levelId = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
                bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"showThisTotals", levelId: levelId} )
              </JavaScriptAction>
            </Entry>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:if>

      <Entry>
        <xsl:attribute name="caption">
          <xsl:choose>
            <xsl:when test="$statusModelLayout//cube:Dimensions/@hideTotals='true'">Enable all totals</xsl:when>
            <xsl:otherwise>Disable all totals</xsl:otherwise>
          </xsl:choose>
        </xsl:attribute>
        <JavaScriptAction>bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"toggleHideTotals"} )</JavaScriptAction>
      </Entry>
    </ContextMenuEntryGroup>
  </xsl:template>

  <xsl:template name="detailExport">
    <ContextMenuEntryGroup caption="Detail Export" >
      <Entry caption="Detail export for this cell">
        <xsl:if test="$isVdm or $measure/@userDefined='true'"><xsl:attribute name="isDisabled">true</xsl:attribute></xsl:if>
        <!-- We "freeze" the current row/colIdents to prevent them von changing between the closing of the context menu and the start of the detail export -->
        <JavaScriptAction>bcdui._migPjs._$(this.eventSrcElement).trigger("cubeActions:detailExport", {bcdRowIdent: '<xsl:value-of select="$bcdRowIdent"/>', bcdColIdent: '<xsl:value-of select="$bcdColIdent"/>'} )</JavaScriptAction>
      </Entry>
    </ContextMenuEntryGroup>
  </xsl:template>

  <xsl:template name="addRowCalculation"/>
  <xsl:template name="addColumnCalculation"/>
  <xsl:template name="editCalculation"/>

</xsl:stylesheet>