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
  This stylesheet computes the distinct measure and property names for each aggregator
  -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:key name="measure" match="calc:ValueRef/@idRef" use="concat(substring-before(.,'.'),'_',ancestor-or-self::*[@aggr][1]/@aggr)"/>
  <xsl:key name="col"     match="calc:ValueRef/@idRef" use="concat(substring-after(.,'.'),'_',ancestor-or-self::*[@aggr][1]/@aggr)"/>
  <xsl:key name="aggr"    match="@aggr[not(../descendant::*/@aggr)]"  use="."/>

  <xsl:template match="/">

    <scc:Aggregators>
      <xsl:copy-of select="/*/scc:Layout/scc:Dimensions"/>

      <xsl:for-each select="/*/scc:Kpis//@aggr[generate-id(.)=generate-id(key('aggr',.))]">
        <xsl:variable name="aggrId" select="."/>
        <scc:Aggr id="{.}">
          <wrq:Columns>
             <xsl:for-each select="/*/scc:Kpis/scc:Kpi//@idRef[generate-id(.)=generate-id(key('col',concat(substring-after(.,'.'),'_',$aggrId))) and ancestor-or-self::*[@aggr][1]/@aggr =   $aggrId]">
             <wrq:C bRef="{substring-after(.,'.')}"/>
            </xsl:for-each>
          </wrq:Columns>
          <scc:MeasuresAsList>
             <xsl:for-each select="/*/scc:Kpis/scc:Kpi//@idRef[generate-id(.)=generate-id(key('measure',concat(substring-before(.,'.'),'_',$aggrId))) and ancestor-or-self::*[@aggr][1]/@aggr =   $aggrId]">
              <xsl:value-of select="substring-before(.,'.')"/><xsl:if test="not(position()=last())">,</xsl:if>
            </xsl:for-each>
          </scc:MeasuresAsList>
        </scc:Aggr>
      </xsl:for-each>
    </scc:Aggregators>

  </xsl:template>

</xsl:stylesheet>