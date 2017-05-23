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
<!--
  - Creates a Kpi detail export Wrq using information from filterFromCell.xslt,
    /*/scc:Kpis/dm:detailDataDefaults/dm:DetailData and /*/scc:Kpis/scc:Kpi/dm:DetailData.
  - Column captions will be taken from dm:DetailData/dm:[Prepend|Append|]Columns/@caption or from BindingItem's @caption
  - Returns a Wrq or a bcd_Sc_NoExport message, if /*/scc:Kpis/scc:Kpi/dm:DetailData is not given
 -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">

  <!-- Creates filters from the cell position in the report (using bcdRow/ColIdent)  -->
  <xsl:import href="scFilterFromCell.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:variable name="kpiDef" select="$sccDefinition/*/scc:Kpis/scc:Kpi[@id=$kpiId]"/>

  <xsl:template match="/">
    <xsl:choose>
      <xsl:when test="$detailData">
        <wrq:WrsRequest>
          <wrq:Select>
            <wrq:Columns>
              <xsl:copy-of select="$detailDataDefaults/dm:PrependColumns/*"/>
              <xsl:copy-of select="$detailData/dm:Columns/*"/>
              <xsl:copy-of select="$detailDataDefaults/dm:AppendColumns/*"/>
            </wrq:Columns>
            <wrq:From>
              <wrq:BindingSet>
                <xsl:value-of select="$detailDataDefaults/dm:Translations[not($detailData/dm:Translations)]/@bindingSet | $detailData/dm:Translations/@bindingSet"/>
              </wrq:BindingSet>
            </wrq:From>
            <f:Filter>
              <xsl:apply-templates select="$cellAndGuiStatusFilterDetailTranslated/*/f:Filter/*[not(@bRef) or (@bRef!='bcd_kpi_id' and not(starts-with(@bRef,'bcdCategory_')))]"/>
              <xsl:copy-of select="$detailDataDefaults/f:Filter[not($detailData/f:Filter)]/* | $detailData/f:Filter/*"/>
            </f:Filter>
          </wrq:Select>
        </wrq:WrsRequest>
      </xsl:when>
      <xsl:otherwise>
        <Error message="bcd_sc_NoExport" messageArg1="{$kpiDef/@caption}"/> <!-- Return dummy node, which is not a WrsRequest -->
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>