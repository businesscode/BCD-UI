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
<!--
  Default context sensitive Scorecard context menu, offering
  - Everywhere: Export to Excel
  - On a data cell
    - Export failure details
    - Drill to analysis report
  You may overwrite this file via parameter args.contextMenu when creating the scorecard to trigger a custom chain for producing the export Wrq or target url
  args.contextMenu represents the chain parameter of the scorecard-created context menu.
  Of course you may also set args.contextMenu to false and create your own context menu from scratch with full control.
  -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns="http://www.businesscode.de/schema/bcdui/contextMenu-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt">

  <xsl:import href="../../../xslt/stringUtil.xslt"/>

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <!-- Provided by the scorecard to its context menus -->
  <xsl:param name="bcdContextPath" />
  <xsl:param name="bcdColIdent" />
  <xsl:param name="bcdRowIdent" />
  <xsl:param name="sccDefinition" />
  <xsl:param name="bcdPageAccess" select="''"/>

  <!-- Root -->
  <xsl:template match="/*">
    <ContextMenu>

      <!-- 
        A standard cell with a KPI
        -->
      <xsl:if test="string($bcdColIdent) and string($bcdRowIdent)">
        <ContextMenuEntryGroup caption="KPI actions" >

          <xsl:variable name="kpiPos" select="1 + count(/*/scc:Layout/scc:Dimensions/scc:Columns/scc:LevelKpi/preceding-sibling::*) + count(/*/scc:Layout/scc:CategoryTypeRefs/scc:CategoryTypeRef)"/>
          <xsl:variable name="colIdentString">
            <xsl:call-template name="tokenize">
              <xsl:with-param name="string" select="$bcdColIdent"/>
              <xsl:with-param name="delimiter" select="'|'"/>
            </xsl:call-template>
          </xsl:variable>
          <xsl:variable name="kpiIdCol" select="exslt:node-set($colIdentString)/wrs:Wrs/wrs:Data/wrs:R[position()=$kpiPos]/wrs:C"/>

          <xsl:variable name="kpiId">
            <xsl:choose>
              <xsl:when test="/*/scc:Layout/scc:Dimensions/scc:Columns/scc:LevelKpi"><xsl:value-of select="$kpiIdCol"/></xsl:when>
              <xsl:otherwise><xsl:value-of select="substring-after($bcdRowIdent,'_')"/></xsl:otherwise>
            </xsl:choose>
          </xsl:variable>

          <xsl:variable name="detailData" select="$sccDefinition/*/scc:Kpis/scc:Kpi[@id=$kpiId]/dm:DetailData"/>

          <!-- Drill to analysis  -->
          <xsl:variable name="url"        select="$detailData/dm:Translations/@analysisUrl"/>
          <xsl:variable name="accessRight" select="$detailData/dm:Translations/@analysisRight"/>
          <xsl:variable name="defaultUrl" select="$sccDefinition/*/scc:Kpis/dm:DetailDataDefaults/dm:DetailData[@name=$detailData/@defaults]/dm:Translations/@analysisUrl"/>
          <xsl:variable name="targetPage" select="$defaultUrl[not($url)] | $url"/>
          <xsl:if test="$targetPage">
            <xsl:if test="not($accessRight) or contains($bcdPageAccess, concat(' ', $accessRight, ' ')) or contains($bcdPageAccess, ' * ')">
              <Entry caption="Drill to analysis">
                  <!-- We "freeze" the current row/colIdents to prevent them from changing between the closing of the context menu and the start of the detail export -->
                  <JavaScriptAction>
                    bcdui._migPjs._$(this.eventSrcElement).trigger( "scorecardActions:drillToAnalysis", 
                      { bcdRowIdent: '<xsl:value-of select="$bcdRowIdent"/>',  bcdColIdent: '<xsl:value-of select="$bcdColIdent"/>', 
                        targetPage: '<xsl:value-of select="concat($bcdContextPath,'/',$targetPage)"/>' }
                    );
                  </JavaScriptAction>
              </Entry>
            </xsl:if>
          </xsl:if>

          <!-- Detail export based on scc:DetailData/scc:Source/@bindingSet -->
          <xsl:variable name="bs"        select="$detailData/dm:Translations/@bindingSet"/>
          <xsl:variable name="defaultBs" select="$sccDefinition/*/scc:Kpis/dm:DetailDataDefaults/dm:DetailData[@name=$detailData/@defaults]/dm:Translations/@bindingSet"/>
          <xsl:variable name="bindingSet" select="$defaultBs[not($bs)] | $bs"/>
          <xsl:if test="$bindingSet">
            <Entry caption="Export detail data">
              <JavaScriptAction>
                bcdui._migPjs._$(this.eventSrcElement).trigger( "scorecardActions:detailExport", 
                  { bcdRowIdent: '<xsl:value-of select="$bcdRowIdent"/>',  bcdColIdent: '<xsl:value-of select="$bcdColIdent"/>' }
                ); 
              </JavaScriptAction>
            </Entry>
          </xsl:if>
        </ContextMenuEntryGroup>
      </xsl:if>

      <!-- 
        Everywhere on the scorecard
        -->
      <ContextMenuEntryGroup caption="Report action" >
        <Entry caption="Export report WYSIWYG">
          <JavaScriptAction>bcdui._migPjs._$(this.eventSrcElement).trigger("scorecardActions:reportExcelExport")</JavaScriptAction>
        </Entry>
      </ContextMenuEntryGroup>

    </ContextMenu>
  </xsl:template>

</xsl:stylesheet>