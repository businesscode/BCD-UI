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
  xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  xmlns:generator="urn(bcd-xsltGenerator)"
  bcdxml:wrsHeaderIsEnough="true">

  <xsl:import href="../../../xslt/wrs/orderRowsAndCols.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt"/>

  <xsl:namespace-alias stylesheet-prefix="xsla" result-prefix="xsl"/>
  
  <xsl:param name="sccDefinition"/>
  
  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:OrderAndCut[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

  <xsl:variable name="sqlTypesDoc" select="document('../../../xslt/renderer/sqlTypes.xml')"/>
  <xsl:variable name="headerCs" select="/*/wrs:Header/wrs:Columns/wrs:C"/>

  <xsl:variable name="doc" select="/"/>
  
  <xsl:variable name="kpiPos" select="key('colHeadById','bcd_kpi_id')/@pos"/>

  <xsl:variable name="gotColDims" select="boolean($sccDefinition/*/scc:Layout/scc:Dimensions/scc:Columns/dm:LevelRef)"/>
  <xsl:variable name="kpiAsRows" select="boolean($sccDefinition/*/scc:Layout/scc:Dimensions/scc:Rows/scc:LevelKpi)"/>
  <xsl:variable name="colDimIdx" select="$headerCs[@id=$sccDefinition/*/scc:Layout/scc:Dimensions/scc:Columns/dm:LevelRef[position()=1]/@bRef]/@pos"/>

  <xsl:template match="/">

    <xsla:stylesheet version="1.0"
      xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
      xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
      xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
      xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
      xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
      xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
      xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
      xmlns:exslt="http://exslt.org/common"
      xmlns:msxsl="urn:schemas-microsoft-com:xslt"
      xmlns:generator="urn(bcd-xsltGenerator)"
      bcdxml:wrsHeaderIsEnough="true">
    
      <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>
    
      <xsla:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>
      
      <xsla:param name="sccDefinition"/>
      
      <!-- Parameter model  -->
      <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
      <xsla:param name="paramModel" select="/*[0=1]"/>
      <!-- (String) Optional specific parameter set ID  -->
      <xsla:param name="paramSetId"/>
      <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
      <xsla:param name="paramSet" select="$paramModel//xp:OrderAndCut[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>
    
      <xsla:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
      <xsla:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>
    
      <xsla:variable name="sqlTypesDoc" select="document('../../../xslt/renderer/sqlTypes.xml')"/>
      <xsla:variable name="headerCs" select="/*/wrs:Header/wrs:Columns/wrs:C"/>
    
      <xsla:variable name="doc" select="/"/>
      
      <xsla:variable name="kpiPos" select="key('colHeadById','bcd_kpi_id')/@pos"/>

      <!-- the key consists of all C's up to the KPI
           in case of row kpis and additional column dimensions, the key also takes these column dims into account
      -->
      <xsl:variable name="use">
        <xsl:choose>
          <xsl:when test="$gotColDims and $kpiAsRows">
            <xsl:text>concat('',''</xsl:text>
              <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &lt;= $kpiPos or (position() &gt;= $colDimIdx and @dimId!='')]">
                <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
                <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
              </xsl:for-each>
              <xsl:text>)</xsl:text>
          </xsl:when>
          <xsl:otherwise>
            <xsl:text>concat('',''</xsl:text>
              <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &lt;= $kpiPos]">
                <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
                <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
              </xsl:for-each>
              <xsl:text>)</xsl:text>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:variable>

      <xsla:key name="rowKey" match="/*/wrs:Data/wrs:R" use="{$use}"/>

      <xsla:template match="wrs:Data">
        <xsla:copy>
          <xsla:copy-of select="@*"/>
          <xsla:for-each select="*">

            <!-- sort everything before kpi (for row kpis with column dimension, we also sort the column dimensions) -->
            <xsl:choose>
              <xsl:when test="$gotColDims and $kpiAsRows">
                <xsl:for-each select="$paramSet/xp:RowsOrder/wrs:Columns/*[position() &lt; $kpiPos or (position() &gt;= $colDimIdx and @dimId!='')][@sort | @total]">
                  <xsl:call-template name="generateSort">
                    <xsl:with-param name="elem" select="."/>
                  </xsl:call-template>
                </xsl:for-each>
              </xsl:when>
              <xsl:otherwise>
                <xsl:for-each select="$paramSet/xp:RowsOrder/wrs:Columns/*[position() &lt; $kpiPos][@sort | @total]">
                  <xsl:call-template name="generateSort">
                    <xsl:with-param name="elem" select="."/>
                  </xsl:call-template>
                </xsl:for-each>
              </xsl:otherwise>
            </xsl:choose>

            <!-- sort kpi using its original ordering -->
            <xsla:sort select="count($sccDefinition/*/scc:Layout/scc:KpiRefs/scc:KpiRef[@idRef=current()/wrs:C[$kpiPos]/@id]/preceding-sibling::*)" order="ascending"/>

            <!-- run block-wise over data to keep ordering up to kpi position -->
            <xsla:if test="generate-id(.)=generate-id(key('rowKey',{$use}))">
              <xsla:for-each select="key('rowKey',{$use})">

                <!-- sort everything after kpi (for row kpis with column dimension, we exclude the column dimensions, since they were part of the sort before already) -->
                <xsl:choose>
                  <xsl:when test="$gotColDims and $kpiAsRows">
                    <xsl:for-each select="$paramSet/xp:RowsOrder/wrs:Columns/*[position() &gt; $kpiPos and not(position() &gt;= $colDimIdx and @dimId='')][@sort | @total]">
                      <xsl:call-template name="generateSort">
                        <xsl:with-param name="elem" select="."/>
                      </xsl:call-template>
                    </xsl:for-each>
                  </xsl:when>
                  <xsl:otherwise>
                   <xsl:for-each select="$paramSet/xp:RowsOrder/wrs:Columns/*[position() &gt; $kpiPos][@sort | @total]">
                      <xsl:call-template name="generateSort">
                        <xsl:with-param name="elem" select="."/>
                      </xsl:call-template>
                    </xsl:for-each>
                  </xsl:otherwise>
                </xsl:choose>

                <!-- limit output -->
                <xsl:choose>
                  <xsl:when test="$paramSet/xp:RowsOrder/@limit != ''">
                    <xsla:if test="position() &lt;= {$paramSet/xp:RowsOrder/@limit} or wrs:C[{$kpiPos + 1}]/@bcdGr='1'">
                      <xsla:apply-templates select="."/>
                    </xsla:if>
                    </xsl:when>
                  <xsl:otherwise>
                    <xsla:apply-templates select="."/>
                  </xsl:otherwise>
                </xsl:choose>
               </xsla:for-each>
            </xsla:if>
          </xsla:for-each>
        </xsla:copy>
      </xsla:template>

      <xsla:template match="@*|node()">
        <xsla:copy>
          <xsla:apply-templates select="@*|node()" />
        </xsla:copy>
      </xsla:template>

    </xsla:stylesheet>

  </xsl:template>

</xsl:stylesheet>