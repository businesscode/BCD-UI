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
  Scorecard-aware sorting and TOP-N, only applies if scc:LeveKpi is a row-dimension
  Parameters follow xsltParams standard but are not listed in xsd because of the specific nature of the stylesheet
  Root Element scc:OrderAndCut
   @sortBy: A valueId according to which to sort. If col-dims are present, its row-total is evaluated.
      This sorting is KPI aware, i.e. it first sorts the upper dimensions, then for each such combination all KPIs in the requested order
      and all row-dimensions below KPI after this value. Column dimensions are not affected.
   @sort (ascending|descending), default descending:
      Whether to sort ascending or descending. If @sortBy equals 'performance', then negative KPIs are sorted in reverse order.
   @limit integer
      If set, only the first 'limit' rows are shown. Subtotal rows are not counted or displayed.
      This implies sorting.
  -->

<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="sccDefinition"/>
  
  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//scc:OrderAndCut[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

  <xsl:variable name="isAscending" select="$paramSet/@sort='ascending'"/>
  <xsl:variable name="isTopN"      select="number($paramSet/@limit)=number($paramSet/@limit)"/>
  <xsl:variable name="topNRaw">
    <xsl:choose>
      <xsl:when test="$isTopN"><xsl:value-of select="$paramSet/@limit"/></xsl:when>
      <xsl:otherwise>4096</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="topN" select="number($topNRaw)"/>

  <xsl:variable name="hasColDims"    select="boolean($sccDefinition/*/scc:Layout/scc:Dimensions/scc:Columns/*)"/>
  <xsl:variable name="kpiPos"        select="number(key('colHeadById','bcd_kpi_id')/@pos)"/>
  <xsl:variable name="criteria"      select="$paramSet/@sortBy"/>
  <xsl:variable name="criteriaPos"   select="number(key('colHeadById',$criteria)/@pos)"/>
  <xsl:variable name="lastRowDimPos" select="count($sccDefinition/*/scc:Layout/scc:Dimensions/scc:Rows/*)"/>

  <!-- Define a set of keys for row dimensions on different levels -->
  <xsl:key name="rowDims1" match="/*/wrs:Data/wrs:R" use="concat('&#xE0F2;',wrs:C[1],'&#xE0F2;')"/>
  <xsl:key name="rowDims2" match="/*/wrs:Data/wrs:R" use="concat('&#xE0F2;',wrs:C[1],'&#xE0F2;',wrs:C[2],'&#xE0F2;')"/>
  <xsl:key name="rowDims3" match="/*/wrs:Data/wrs:R" use="concat('&#xE0F2;',wrs:C[1],'&#xE0F2;',wrs:C[2],'&#xE0F2;',wrs:C[3],'&#xE0F2;')"/>
  <xsl:key name="rowDims4" match="/*/wrs:Data/wrs:R" use="concat('&#xE0F2;',wrs:C[1],'&#xE0F2;',wrs:C[2],'&#xE0F2;',wrs:C[3],'&#xE0F2;',wrs:C[4],'&#xE0F2;')"/>
  <xsl:key name="rowDims5" match="/*/wrs:Data/wrs:R" use="concat('&#xE0F2;',wrs:C[1],'&#xE0F2;',wrs:C[2],'&#xE0F2;',wrs:C[3],'&#xE0F2;',wrs:C[4],'&#xE0F2;',wrs:C[5],'&#xE0F2;')"/>
  <xsl:key name="rowDims6" match="/*/wrs:Data/wrs:R" use="concat('&#xE0F2;',wrs:C[1],'&#xE0F2;',wrs:C[2],'&#xE0F2;',wrs:C[3],'&#xE0F2;',wrs:C[4],'&#xE0F2;',wrs:C[5],'&#xE0F2;',wrs:C[5],'&#xE0F2;')"/>

  <xsl:variable name="keyRowDims"         select="concat('rowDims',count($sccDefinition/*/scc:Layout/scc:Dimensions/scc:Rows/*))"/>
  <xsl:variable name="keyAboveKpiDims"    select="concat('rowDims',count($sccDefinition/*/scc:Layout/scc:Dimensions/scc:Rows/*[following-sibling::scc:LevelKpi]))"/>
  <xsl:variable name="keyKpiAndAboveDims" select="concat('rowDims',count($sccDefinition/*/scc:Layout/scc:Dimensions/scc:Rows/*[not(preceding-sibling::scc:LevelKpi)]))"/>

  <xsl:template match="/*">
      <xsl:choose>
        <xsl:when test="$sccDefinition/*/scc:Layout/scc:Dimensions/scc:Rows/scc:LevelKpi and $paramSet/@sortBy or $paramSet/@limit">
          <xsl:copy>
            <xsl:copy-of select="@*"/>
            <xsl:apply-templates select="*"/>
          </xsl:copy>
        </xsl:when>
        <xsl:otherwise>
          <bcdxml:XsltNop xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"/>
        </xsl:otherwise>
      </xsl:choose>
  </xsl:template>

  <xsl:template match="wrs:Data">
    <xsl:copy>
      <xsl:copy-of select="@*"/>

      <xsl:for-each select="wrs:R">

        <xsl:variable name="allRowsLoop" select="."/>

        <!-- For the current row the concatenated dim values for above kpi dims -->
        <xsl:variable name="aboveKpiDims">
          <xsl:for-each select="$sccDefinition/*/scc:Layout/scc:Dimensions/scc:Rows/*[following-sibling::scc:LevelKpi]">
            <xsl:variable name="pos" select="position()"/>
            <xsl:value-of select="concat('&#xE0F2;',$allRowsLoop/wrs:C[$pos])"></xsl:value-of>
          </xsl:for-each>
          <xsl:value-of select="'&#xE0F2;'"/>
        </xsl:variable>

        <xsl:choose>
          <xsl:when test="$aboveKpiDims = '&#xE0F2;'">

            <xsl:apply-templates select="$allRowsLoop">
              <xsl:with-param name="aboveKpiDims" select="$aboveKpiDims"/>
            </xsl:apply-templates>

          </xsl:when>
          <xsl:otherwise>

            <!-- Get all rows for this above-kpi-dimension-combination -->
            <xsl:for-each select="key($keyAboveKpiDims,$aboveKpiDims)">
              <!-- For each distinct outer dim combination -->
              <xsl:if test="generate-id(.)=generate-id(key($keyAboveKpiDims,$aboveKpiDims))">

                <xsl:apply-templates select="$allRowsLoop">
                  <xsl:with-param name="aboveKpiDims" select="$aboveKpiDims"/>
                </xsl:apply-templates>

              </xsl:if> <!-- End for each distinct outer dim combination -->
            </xsl:for-each>

          </xsl:otherwise>
        </xsl:choose>

      </xsl:for-each>

    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:R">
    <xsl:param name="aboveKpiDims"/>

      <!-- For such a combination, get the distinct kpis -->
      <xsl:variable name="kpiAndAboveDims" select="concat($aboveKpiDims,wrs:C[$kpiPos],'&#xE0F2;')"/>

      <!-- Is this the first appearance of the kpi within the above-kpi combination? -->
      <xsl:if test="generate-id(.) = generate-id(key($keyKpiAndAboveDims,$kpiAndAboveDims))">

        <xsl:variable name="kpiId"    select="wrs:C[$kpiPos]"/>
        <xsl:variable name="kpiIsNeg" select="$sccDefinition/*/scc:Kpis/scc:Kpi[@id=$kpiId]/@positive='false'"/>

        <!-- Per kpi we decide wehther to sort ascending or descending -->
        <xsl:variable name="ascdesc">
          <xsl:choose>
            <!-- We don't know how pos/neg affects the aspects except performance -->
            <xsl:when test="$criteria != 'performance'">
              <xsl:choose>
                <xsl:when test="$isAscending">ascending</xsl:when>
                <xsl:otherwise>descending</xsl:otherwise>
              </xsl:choose>
            </xsl:when>
            <xsl:when test="$kpiIsNeg and $isAscending">descending</xsl:when>
            <xsl:when test="$kpiIsNeg">ascending</xsl:when>
            <xsl:when test="$isAscending">ascending</xsl:when>
            <xsl:otherwise>
              <xsl:choose>
                <xsl:when test="$isAscending">ascending</xsl:when>
                <xsl:otherwise>descending</xsl:otherwise>
              </xsl:choose>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:variable>

        <!-- For each row for this above kpi dim and kpi combination -->
        <xsl:choose>
          <!-- We have column dimensions -->
          <xsl:when test="$hasColDims">
            <!-- Print all rows for that above-kpi-dims and kpi combination, sorted by criteria.
              In top-n case we do not display or count the row total, in case of sorting-only we want it to be included -->
            <xsl:for-each select="key($keyKpiAndAboveDims,$kpiAndAboveDims)[(not($isTopN) or not(wrs:C[$lastRowDimPos]/@bcdGr='1')) and wrs:C[$lastRowDimPos + 1]/@bcdGr='1']">
              <!-- always sort NaN/empty cells to the bottom -->
               <xsl:sort select="number(boolean(wrs:C[$criteriaPos]='NaN' or string-length(wrs:C[$criteriaPos])=0))" data-type="number" order="ascending"/>
               <xsl:sort select="wrs:C[$criteriaPos]" order="{$ascdesc}" data-type="number"/>
              <xsl:if test="position() &lt;= $topN">
                <!-- In case of later colDims, we create new rows combining different rows with the same row-dimensions.
                     For that reason we need to make sure we include all of them here. -->
                <xsl:variable name="rowAboveAndKpiDimLoop" select="."/>
                <xsl:variable name="rowDims">
                  <xsl:value-of select="$kpiAndAboveDims"/>
                  <xsl:for-each select="$sccDefinition/*/scc:Layout/scc:Dimensions/scc:Rows/*[preceding-sibling::scc:LevelKpi]">
                    <xsl:variable name="pos" select="count(preceding-sibling::*)+1"/>
                    <xsl:value-of select="concat($rowAboveAndKpiDimLoop/wrs:C[$pos],'&#xE0F2;')"/>
                  </xsl:for-each>
                </xsl:variable>
                <xsl:copy-of select="key($keyRowDims,$rowDims)"/>
              </xsl:if>
            </xsl:for-each>
          </xsl:when>
          <!-- We have no column dimensions -->
          <xsl:otherwise>
            <!-- Print all rows for that above-kpi-dims and kpi combination, sorted by criteria
                 In top-n case we do not display or count the row total, in case of sorting-only we want it to be included -->
            <xsl:for-each select="key($keyKpiAndAboveDims,$kpiAndAboveDims)[not($isTopN) or not(wrs:C[$lastRowDimPos]/@bcdGr='1')]">
              <!-- always sort NaN/empty cells to the bottom -->
              <xsl:sort select="number(boolean(wrs:C[$criteriaPos]='NaN' or string-length(wrs:C[$criteriaPos])=0))" data-type="number" order="ascending"/>
              <xsl:sort select="wrs:C[$criteriaPos]" order="{$ascdesc}" data-type="number"/>
              <xsl:if test="position() &lt;= $topN">
                <xsl:copy-of select="."/>
              </xsl:if>
            </xsl:for-each>
          </xsl:otherwise>
        </xsl:choose>

      </xsl:if> <!-- First kpi appearance for this above-kpi-dim combination -->

  </xsl:template>

  <!-- 1:1 copy -->
  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()" />
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>