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
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  xmlns:generator="urn(bcd-xsltGenerator)"
  bcdxml:wrsHeaderIsEnough="true">

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
    
      <xsl:variable name="use">
        <xsl:text>concat('',''</xsl:text>
          <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &lt;= $kpiPos]">
            <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
            <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
          </xsl:for-each>
          <xsl:text>)</xsl:text>
      </xsl:variable>

      <xsla:key name="rowKey" match="/*/wrs:Data/wrs:R" use="{$use}"/>

      <xsla:template match="wrs:Data">
        <xsla:copy>
          <xsla:copy-of select="@*"/>
          <xsla:for-each select="*">

            <!-- sort everything before kpi -->
            <xsl:for-each select="$paramSet/xp:RowsOrder/wrs:Columns/*[position() &lt; $kpiPos][@sort | @total]">
              <xsl:call-template name="generateSort"/>
            </xsl:for-each>

            <!-- sort kpi using its original ordering -->
            <xsla:sort select="count($sccDefinition/*/scc:Layout/scc:KpiRefs/scc:KpiRef[@idRef=current()/wrs:C[$kpiPos]/@id]/preceding-sibling::*)" order="ascending"/>

            <!-- run block-wise over data to keep ordering up to kpi position -->
            <xsla:if test="generate-id(.)=generate-id(key('rowKey',{$use}))">
              <xsla:for-each select="key('rowKey',{$use})">

                <!-- sort everything after kpi -->
                <xsl:for-each select="$paramSet/xp:RowsOrder/wrs:Columns/*[position() &gt; $kpiPos][@sort | @total]">
                  <xsl:call-template name="generateSort"/>
                </xsl:for-each>

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

  <xsl:template name="generateSort">
      <xsl:variable name="elem" select="."/>

      <!-- Take care of the position of the (sub)totals, they win over the other sorting  -->
      <xsl:for-each select="$doc">
        <xsl:choose>
          <xsl:when test="$elem/@total='leading'">
            <xsla:sort select="wrs:C[{key('colHeadById',$elem/@id)/@pos}]/@bcdGr" order="descending"/>
          </xsl:when>
          <xsl:when test="$elem/@total='trailing'">
            <xsla:sort select="wrs:C[{key('colHeadById',$elem/@id)/@pos}]/@bcdGr" order="ascending"/>
          </xsl:when>
        </xsl:choose>

        <!-- Sort order (except totals) -->
        <xsl:if test="$elem/@sort">
          <xsl:element name="sort" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="order"><xsl:value-of select="$elem/@sort"/></xsl:attribute>
            <!--
              Now check for alphanumeric/numeric sorting. @sortBy (order dim-level by measure) is assumes to always be numeric.
              Otherwise we check for the type of the data itself or - if any - preferred for the type of the @order attribute. -->
            <xsl:variable name="isNumericSorting" select="
              $elem/@sortBy
              or $headerCs[@id=$elem/@id or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@id,'1|','') and @valueId=$elem/@id)]/wrs:A[@name='order']/@type-name=$sqlTypesDoc/*/rnd:Numeric/rnd:Type/@name
              or $headerCs[@id=$elem/@id or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@id,'1|','') and @valueId=$elem/@id)]/@type-name=$sqlTypesDoc/*/rnd:Numeric/rnd:Type/@name
            "/>
            <!-- Sort by the column itself or by the sub-total-value of a measure -->
            <xsl:choose>
              <xsl:when test="$elem/@sortBy">
                <xsl:variable name="sortByPos" select="number($headerCs[@id=$elem/@sortBy or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@sortBy,'1|','') and @valueId=$elem/@sortBy)]/@pos)"/>
                <xsl:variable name="ourPos" select="number(key('colHeadById',$elem/@id)/@pos)"/>
                <xsl:choose>
                  <xsl:when test="$ourPos > 1 and /*/wrs:Header/wrs:Columns/wrs:C[$ourPos+1]/@dimId">
                    <!-- If we are not the innermost and not the outermost dim, we need to search for the row which contains the total for our following dimension
                         within our group, i.e. all previous dimensions have the same value -->
                    <xsl:attribute name="select">../wrs:R[
                      <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[@pos &lt;= $ourPos]">
                        wrs:C[<xsl:value-of select="@pos"/>]=current()/wrs:C[<xsl:value-of select="@pos"/>] and
                      </xsl:for-each>
                      wrs:C[number(<xsl:value-of select="$ourPos"/>+1)]/@bcdGr='1']/wrs:C[<xsl:value-of select="$sortByPos"/>]</xsl:attribute>
                  </xsl:when>
                  <xsl:when test="/*/wrs:Header/wrs:Columns/wrs:C[$ourPos+1]/@dimId">
                    <!-- If we are the outermost but not the innermost dim, we need to search for the row which contains the total for our following dimension and the same value for our dimension, but we do not have an outer group to watch -->
                    <xsl:attribute name="select">../wrs:R[wrs:C[<xsl:value-of select="$ourPos"/>]=current()/wrs:C[<xsl:value-of select="$ourPos"/>] and wrs:C[number(<xsl:value-of select="$ourPos"/>+1)]/@bcdGr='1']/wrs:C[<xsl:value-of select="$sortByPos"/>]</xsl:attribute>
                  </xsl:when>
                  <xsl:otherwise>
                    <!-- If we are innermost we can just sort by value, previous sortings make sure we do not cross dimension borders -->
                    <xsl:attribute name="select">wrs:C[<xsl:value-of select="$sortByPos"/>]</xsl:attribute>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:when>
              <!-- Sort by the column itself -->
              <xsl:otherwise>
                <xsl:variable name="sortColPos" select="number($headerCs[@id=$elem/@id or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@id,'1|','') and @valueId=$elem/@id)]/@pos)"/>
                <xsl:attribute name="select">
                  <xsl:choose>
                    <xsl:when test="$headerCs[@id=$elem/@id or (contains(@id,'&#xE0F0;1') and translate(@id,'&#xE0F0;1|','')=translate($elem/@id,'1|','') and @valueId=$elem/@id)]/wrs:A[@name='order']">
                      <xsl:value-of select="concat('wrs:C[',$sortColPos,']/@order')"/>
                    </xsl:when>
                    <xsl:when test="$isNumericSorting">wrs:C[<xsl:value-of select="$sortColPos"/>]</xsl:when>
                    <!-- We do sort empty last as opposed to XSLT default, because db sorts them last per default as well their order should not depend on whether the order comes from db or us -->
                    <xsl:otherwise>concat(boolean(string-length(wrs:C[<xsl:value-of select="$sortColPos"/>])=0),'&#xE0F0;',wrs:C[<xsl:value-of select="$sortColPos"/>])</xsl:otherwise>
                  </xsl:choose>
                </xsl:attribute>
              </xsl:otherwise>
            </xsl:choose>
            <!-- set type of sorting -->
            <xsl:if test="$isNumericSorting">
              <xsl:attribute name="data-type">number</xsl:attribute>
            </xsl:if>
          </xsl:element>
        </xsl:if>
      </xsl:for-each>
  </xsl:template>

</xsl:stylesheet>