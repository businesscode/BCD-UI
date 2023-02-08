<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2023 BusinessCode GmbH, Germany

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
  Prepares and enriches the user-given cubeConfiguration for processing
  Replaces MeasureRefs via their definition (recursively)
  Prepares the XsltParameters for other used stylesheets from xslt lib
  Determines the distinct set of needed measures and dimensions for requestDoc.xslt
  -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="statusModel" select="/*[1=0]"/>

<!--
 key and meaBRefs / measureBRefs
 1st line is for simple measures (without calcs)
 2nd line is for MeasureRefs for virtual BindingItems (derived from server calcs), they should be handled as if they were normal Binding Items
 3nd line is for measures which are not present in layout (indirectly used in user measures)
 4rd line is for common calc measures
 -->

  <xsl:key name="meaBRefs" match="
    /*/cube:Layout/cube:Measures//dm:MeasureRef/@bRef
  | /*/cube:Layout/cube:Measures//dm:MeasureRef[@idRef=/*/dm:Measures/dm:Measure[wrq:Calc]/@id]/@idRef
  | /*/cube:Layout/cube:Measures//dm:Measure//calc:ValueRef/@idRef
  | /*/dm:Measures/dm:Measure[@id=/*/cube:Layout/cube:Measures//@idRef]//calc:ValueRef/@idRef"

  use="concat(.,'&#xE0F0;',../@aggr)"/>

  <xsl:variable name="measureBRefs" select="
    /*/cube:Layout/cube:Measures//dm:MeasureRef/@bRef
  | /*/cube:Layout/cube:Measures//dm:MeasureRef[@idRef=/*/dm:Measures/dm:Measure[wrq:Calc]/@id]/@idRef
  | /*/cube:Layout/cube:Measures//dm:Measure//calc:ValueRef/@idRef
  | /*/dm:Measures/dm:Measure[@id=/*/cube:Layout/cube:Measures//@idRef]//calc:ValueRef/@idRef"/>


  <!-- Root -->
  <xsl:template match="/cube:CubeConfiguration">
    <cube:CubeConfiguration xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">
      <xsl:copy-of select="@*"/>

      <xsl:apply-templates select="/*/wrq:BindingSet"/>
      <cube:Layout>
        <xsl:copy-of select="/*/cube:Layout/@*"/>
        <xsl:apply-templates select="/*/cube:Layout/*"/>
      </cube:Layout>

      <cube:DistinctMeasures>
        <!-- for readability dimensions first and measures sorted by name -->
        <wrq:Columns>
          <xsl:for-each select="/*/cube:Layout/cube:Dimensions//@bRef">
            <wrq:C bRef="{.}">
              <!-- Pass-through the name of this dimension level (creating a caption attribute in the header ) -->
              <xsl:for-each select="../@caption">
                <xsl:attribute name="caption"><xsl:value-of select="."/></xsl:attribute>
              </xsl:for-each>
              <!-- Take care for the well-known dimension member attributes @orderBRef and @captionBRef (creating attributes on the data)
                These cannot be used in case of VDM as they have no value and min() can also not be applied as it depends on the actual data not on the possible values.
                -->
              <xsl:variable name="hasVdms" select="/*/cube:Layout/cube:Dimensions/*/dm:LevelRef[@bRef=current()]/cube:VDM/cube:Map"/>
              <xsl:if test="../@captionBRef and not($hasVdms)">
                <wrq:A>
                  <xsl:attribute name="name">caption</xsl:attribute>
                  <xsl:attribute name="bRef"><xsl:value-of select="../@captionBRef"/></xsl:attribute>
                </wrq:A>
              </xsl:if>
              <xsl:if test="../@orderBRef and not($hasVdms)">
                <wrq:A>
                  <xsl:attribute name="name">order</xsl:attribute>
                  <xsl:attribute name="bRef"><xsl:value-of select="../@orderBRef"/></xsl:attribute>
                </wrq:A>
              </xsl:if>
            </wrq:C>
          </xsl:for-each>
          <xsl:for-each select="$measureBRefs[generate-id(.)=generate-id(key('meaBRefs',concat(.,'&#xE0F0;',../@aggr)))]">
            <xsl:sort select="."/>
            <xsl:variable name="bRef">
              <xsl:choose>
                <xsl:when test="starts-with(., '&#xE0F0;')"><xsl:value-of select="substring-after(.,'|')"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="."/></xsl:otherwise>
              </xsl:choose>
            </xsl:variable>
            <!-- take over non-total columns and bref from a total if bref is not already in list -->
            <xsl:if test="not(starts-with(., '&#xE0F0;')) or not(key('meaBRefs',concat($bRef,'&#xE0F0;',../@aggr)))">
              <wrq:C>
                <!-- in case of no dimensions, measures won't get an aggr attribute if skipAggForNoDim is true, otherwise ensure (at least default sum) aggregation -->
                <xsl:choose>
                  <xsl:when test="not(/*/cube:Layout/cube:Dimensions//@bRef) and (not(/*/cube:Layout/@skipAggForNoDim) or /*/cube:Layout/@skipAggForNoDim='false')">
                    <xsl:choose>
                      <xsl:when test="../@aggr!=''">
                        <xsl:attribute name="aggr"><xsl:value-of select="../@aggr"/></xsl:attribute>
                      </xsl:when>
                      <xsl:otherwise>
                        <xsl:attribute name="aggr">sum</xsl:attribute>
                      </xsl:otherwise>
                    </xsl:choose>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:attribute name="aggr"><xsl:value-of select="../@aggr"/></xsl:attribute>
                  </xsl:otherwise>
                </xsl:choose>
                <xsl:attribute name="bRef"><xsl:value-of select="$bRef"/></xsl:attribute>
                <xsl:if test="/*/dm:Measures/dm:Measure[@id=$bRef]/wrq:Calc">
                  <xsl:apply-templates select="/*/dm:Measures/dm:Measure[@id=$bRef]/wrq:Calc"/>
                </xsl:if>
                <xsl:apply-templates select="../self::calc:ValueRef/wrq:Calc"/>
              </wrq:C>
            </xsl:if>
          </xsl:for-each>
        </wrq:Columns>
        <f:Filter>  <!-- For column measures -->
          <f:Expression bRef="measure_id" op="in">
            <xsl:attribute name="value">
              <xsl:for-each select="$measureBRefs[generate-id(.)=generate-id(key('meaBRefs',concat(.,'&#xE0F0;',../@aggr)))]">
                <xsl:sort select="."/>
                <xsl:value-of select="."/><xsl:if test="position()!=last()">,</xsl:if>
              </xsl:for-each>
            </xsl:attribute>
          </f:Expression>
        </f:Filter>
      </cube:DistinctMeasures>

      <xsl:call-template name="xsltParameters"/>

    </cube:CubeConfiguration>
  </xsl:template>

  <!-- @orderBRef and @captionBRef cannot be used in case of VDM as they have no value and min() can also not be applied as it depends on the actual data not on the possible values. -->
  <xsl:template match="dm:LevelRef[cube:VDM/cube:Map]">
    <xsl:copy>
      <xsl:copy-of select="@*[not(local-name(.)='orderBRef') and not(local-name(.)='captionBRef')]"/>
      <xsl:apply-templates select="node()"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template name="xsltParameters">
    <!-- Create parameter for used stylesheets of xslt lib only when we have at least one measure, otherwise we have an empty dummy report-->
      <xp:XSLTParameters>

        <!-- Columns dimensions -->
        <xp:ColDims>
          <xsl:if test="/*/cube:Layout/cube:Dimensions/cube:Columns/*">
            <xsl:apply-templates select="/*/cube:Layout/*" mode="xsltParameters"/>
          </xsl:if>
        </xp:ColDims>

        <!-- Virtual dimension members, this is a feature or EnterpriseEdition only -->
        <xp:VirtDimMembers paramSetId="colDims" outerTotalLevelBRef="{/*/cube:Layout/cube:Dimensions/cube:Columns/dm:LevelRef[1]/@bRef}">
          <xsl:for-each select="cube:Layout/cube:Dimensions/cube:Columns/dm:LevelRef/cube:VDM">
            <xp:VirtDimMember bRef="{../@bRef}" caption="{@caption}">
              <xsl:apply-templates select="@*|node()"/>
            </xp:VirtDimMember>
          </xsl:for-each>
        </xp:VirtDimMembers>
        <xp:VirtDimMembers paramSetId="rowDims">
          <xsl:for-each select="cube:Layout/cube:Dimensions/cube:Rows/dm:LevelRef/cube:VDM">
            <xp:VirtDimMember bRef="{../@bRef}" caption="{@caption}">
              <xsl:apply-templates select="@*|node()"/>
            </xp:VirtDimMember>
          </xsl:for-each>
        </xp:VirtDimMembers>

        <xp:CubeCalculation lastColDim="{/*/cube:Layout/cube:Dimensions/cube:Columns/dm:LevelRef[position()=last()]/@bRef}" lastRowDim="{/*/cube:Layout/cube:Dimensions/cube:Rows/dm:LevelRef[position()=last()]/@bRef}"></xp:CubeCalculation>

        <!-- Sorting. No sorting if server-default sorting is requested (see request.xslt) -->
        <xp:OrderRowsAndCols>
          <xp:RowsOrder>
            <wrs:Columns>
              <xsl:choose>
                <xsl:when test="/*/cube:Layout[@manualSort='true']">
                  <xsl:for-each select="/*/cube:Layout/cube:Dimensions/cube:Rows/*">
                    <xsl:if test="@sort">
                      <wrs:C id="{@bRef}" sort="{@sort}" total="{concat(@total,substring('trailing',0,1 div string-length(@total)))}"/>
                    </xsl:if>
                  </xsl:for-each>
                </xsl:when>
                <xsl:otherwise>
	              <!-- special case when sorting is needed: first value of outer most column dimension does not have all values for inner most row dimension -->
                  <xsl:if test="/*/cube:Layout/cube:Dimensions/cube:Rows/*[@sort!='ascending' or @sortBy or @total!='trailing' or cube:VDM]
                              or (/*/cube:Layout/cube:Dimensions/cube:Columns/* and (/*/cube:Layout/cube:Dimensions//@sort or /*/cube:Layout/cube:Dimensions//@sortBy or /*/cube:Layout/cube:Dimensions//@total))">
                    <xsl:for-each select="/*/cube:Layout/cube:Dimensions/cube:Rows/*">
                      <wrs:C id="{@bRef}" sort="{concat(@sort,substring('ascending',0,1 div string-length(@sort)))}"
                             total="{concat(@total,substring('trailing',0,1 div string-length(@total)))}">
                        <xsl:copy-of select="@sortBy"/>
                      </wrs:C>
                    </xsl:for-each>
                  </xsl:if>
                </xsl:otherwise>
              </xsl:choose>
              <xsl:for-each select="/*/cube:Layout/cube:Measures//*[@sort]">
                <xsl:element name="C" namespace="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">
                  <xsl:attribute name="id">
                    <xsl:choose>
                      <xsl:when test="@sortColDims">
                        <xsl:value-of select="concat(@sortColDims,'|',@bRef | @idRef | @id)"/>
                      </xsl:when>
                      <xsl:otherwise>
                        <xsl:value-of select="@bRef | @idRef | @id"/>
                      </xsl:otherwise>
                    </xsl:choose>
                  </xsl:attribute>
                  <xsl:if test="@sort">
                    <xsl:attribute name="sort"><xsl:value-of select="@sort"/></xsl:attribute>
                  </xsl:if>
                </xsl:element>
              </xsl:for-each>
            </wrs:Columns>
          </xp:RowsOrder>
          <xsl:if test="/*/cube:Layout/cube:Dimensions/cube:Columns/*[@sort!='ascending' or @sortBy or @total!='trailing']">
            <xp:ColDimsOrder>
              <wrs:Columns>
                <xsl:for-each select="/*/cube:Layout/cube:Dimensions/cube:Columns/*">
                  <wrs:C id="{@bRef}" sort="{concat(@sort,substring('ascending',0,1 div string-length(@sort)))}"
                         total="{concat(@total,substring('trailing',0,1 div string-length(@total)))}">
                    <xsl:copy-of select="@sortBy"/>
                  </wrs:C>
                </xsl:for-each>
              </wrs:Columns>
            </xp:ColDimsOrder>
          </xsl:if>

          <!-- Hiding of dimension members -->
          <xsl:copy-of select="/*/cube:Layout/cube:Hide/f:Filter"/>

        </xp:OrderRowsAndCols>

        <!-- Cumulation, we run this in two steps to be able to cumulate in both directions at the same time -->
        <xsl:if test="/*/cube:Layout/cube:Measures//*[@cumulateRow]">
          <xp:CumulAndPercOfTotal paramSetId="rowCumul">
            <xp:RowDimensions>
              <xp:Columns>
                <!-- Because providing a dimension means, 'observe dimensions' to cumulate
                  we do not list them if the user wants the sort to break dimension borders -->
                <xsl:if test="/*/cube:Layout/cube:Dimensions/cube:Rows/*[@sort] or not(/*/cube:Layout/cube:Measures//*[@sort])">
                  <xsl:for-each select="/*/cube:Layout/cube:Dimensions/cube:Rows/*">
                    <wrs:C id="{@bRef}"/>
                  </xsl:for-each>
                </xsl:if>
              </xp:Columns>
            </xp:RowDimensions>
            <xp:RowCumulate>
              <xsl:for-each select="/*/cube:Layout/cube:Measures/cube:AllDims/*[@cumulateRow]">
                <wrs:C valueId="{@bRef | @idRef | @id}" type="{@cumulateRow}">
                  <xsl:copy-of select="@cumulateColDim"/>
                </wrs:C>
              </xsl:for-each>
            </xp:RowCumulate>
          </xp:CumulAndPercOfTotal>
        </xsl:if>
        <xsl:if test="/*/cube:Layout/cube:Measures//*[@cumulateCol]">
          <xp:CumulAndPercOfTotal paramSetId="colCumul">
            <xp:RowDimensions>
              <xp:Columns>
                <!-- Because providing a dimension means, 'observe dimensions' to cumulate
                  we do not list them if the user wants the sort to break dimension borders -->
                <xsl:if test="/*/cube:Layout/cube:Dimensions/cube:Rows/*[@sort] or not(/*/cube:Layout/cube:Measures//*[@sort])">
                  <xsl:for-each select="/*/cube:Layout/cube:Dimensions/cube:Rows/*">
                    <wrs:C id="{@bRef}"/>
                  </xsl:for-each>
                </xsl:if>
              </xp:Columns>
            </xp:RowDimensions>
            <xp:ColCumulate>
              <xsl:for-each select="/*/cube:Layout/cube:Measures//*[@cumulateCol]">
                <wrs:C valueId="{@bRef | @idRef | @id}" type="{@cumulateCol}">
                  <xsl:copy-of select="@cumulateColDim"/>
                </wrs:C>
              </xsl:for-each>
            </xp:ColCumulate>
          </xp:CumulAndPercOfTotal>
        </xsl:if>

        <xp:RemoveEmptyCells>
          <xsl:attribute name="apply">
            <xsl:choose>
              <xsl:when test="not(/*/cube:Layout/cube:Measures/*/*)">false</xsl:when>
              <xsl:otherwise>
                <xsl:value-of select="/*/cube:Layout/@removeEmptyCells"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>
        </xp:RemoveEmptyCells>

        <xp:ExpandCollapseCells apply="{/*/cube:Layout/@expandCollapseCells}"/>

        <!-- Default renderer options -->
        <xp:HtmlBuilder>
          <xp:EmptyMessage>
            <xsl:choose>
              <xsl:when test="not(/*/cube:Layout/cube:Measures//*)">bcd_PleaseSelectFirst</xsl:when>
              <xsl:otherwise>bcd_EmptyReport</xsl:otherwise>
            </xsl:choose>
          </xp:EmptyMessage>
          <xp:MakeColSpan>true</xp:MakeColSpan>
          <xp:MakeRowSpan><xsl:value-of select="boolean(count(/*/cube:Layout/cube:Dimensions/*/dm:LevelRef) &lt;= 10 and not(/*/cube:Layout[@manualSort='true']))"/></xp:MakeRowSpan>
          <xp:SortRows>false</xp:SortRows>
          <xp:SortCols>false</xp:SortCols>
          <xp:HideTotals>
            <xsl:choose>
              <xsl:when test="/*/cube:Layout/cube:Chart">true</xsl:when> <!-- hide totals in case of inline charts -->
              <xsl:otherwise><xsl:value-of select="/*/cube:Layout/cube:Dimensions/@hideTotals"/></xsl:otherwise>
            </xsl:choose>
          </xp:HideTotals>
          <!-- No more dimensions if sort by measure is activated -->
          <xsl:if test="/*/cube:Layout/cube:Measures//*[@sort] and not(/*/cube:Layout/cube:Dimensions/cube:Rows/*[@sort])">
            <xp:HeaderColsCount>0</xp:HeaderColsCount>
          </xsl:if>
          <xp:OnlyMeasureForTotal>
            <xsl:value-of select="count(/*/cube:Layout/cube:Dimensions/cube:Rows/*)=0 and count(/*/cube:Layout/cube:Dimensions/cube:Columns/*)=1"/>
          </xp:OnlyMeasureForTotal>

          <!--  expand/collaps feature via layout -->
          <xsl:if test="/*/cube:Layout/@expandCollapseCells"><xp:ExpandCollapseCells>true</xp:ExpandCollapseCells></xsl:if>

          <!-- sticky table settings via layout -->
          <xsl:if test="/*/cube:Layout/cube:Freeze/@header"><xp:StickyHeader><xsl:value-of select="/*/cube:Layout/cube:Freeze/@header"/></xp:StickyHeader></xsl:if>
          <xsl:if test="/*/cube:Layout/cube:Freeze/@footer"><xp:StickyFooter><xsl:value-of select="/*/cube:Layout/cube:Freeze/@footer"/></xp:StickyFooter></xsl:if>
          <xsl:if test="/*/cube:Layout/cube:Freeze/@bcdDimensions"><xp:StickyDims><xsl:value-of select="/*/cube:Layout/cube:Freeze/@bcdDimensions"/></xp:StickyDims></xsl:if>
          <xsl:if test="/*/cube:Layout/cube:Freeze/@height"><xp:StickyHeight><xsl:value-of select="/*/cube:Layout/cube:Freeze/@height"/></xp:StickyHeight></xsl:if>
          <xsl:if test="/*/cube:Layout/cube:Freeze/@width"><xp:StickyWidth><xsl:value-of select="/*/cube:Layout/cube:Freeze/@width"/></xp:StickyWidth></xsl:if>
          <xsl:if test="/*/cube:Layout/cube:Freeze/@nFirstCols"><xp:StickyFirstCols><xsl:value-of select="/*/cube:Layout/cube:Freeze/@nFirstCols"/></xp:StickyFirstCols></xsl:if>
          <xsl:if test="/*/cube:Layout/cube:Freeze/@nFirstRows"><xp:StickyFirstRows><xsl:value-of select="/*/cube:Layout/cube:Freeze/@nFirstRows"/></xp:StickyFirstRows></xsl:if>
          <xsl:if test="/*/cube:Layout/cube:Freeze/@nLastCols"><xp:StickyLastCols><xsl:value-of select="/*/cube:Layout/cube:Freeze/@nLastCols"/></xp:StickyLastCols></xsl:if>
          <xsl:if test="/*/cube:Layout/cube:Freeze/@nLastRows"><xp:StickyLastRows><xsl:value-of select="/*/cube:Layout/cube:Freeze/@nLastRows"/></xp:StickyLastRows></xsl:if>
          <xsl:if test="/*/cube:Layout/cube:Freeze/@disableMaxWH"><xp:StickyDisableMaxWH><xsl:value-of select="/*/cube:Layout/cube:Freeze/@disableMaxWH"/></xp:StickyDisableMaxWH></xsl:if>

          <!-- inline chart -->
          <xsl:if test="/*/cube:Layout/cube:Chart/@innerRowDim"><xp:InlineChartInnerRowDim><xsl:value-of select="/*/cube:Layout/cube:Chart/@innerRowDim"/></xp:InlineChartInnerRowDim></xsl:if>
          <xsl:if test="/*/cube:Layout/cube:Chart/@minMaxRow"><xp:InlineChartMinMaxRow><xsl:value-of select="/*/cube:Layout/cube:Chart/@minMaxRow"/></xp:InlineChartMinMaxRow></xsl:if>
          <xsl:if test="/*/cube:Layout/cube:Chart/cube:Series[1]/@chartType"><xp:InlineChartType1><xsl:value-of select="/*/cube:Layout/cube:Chart/cube:Series[1]/@chartType"/></xp:InlineChartType1></xsl:if>
          <xsl:if test="/*/cube:Layout/cube:Chart/cube:Series[2]/@chartType"><xp:InlineChartType2><xsl:value-of select="/*/cube:Layout/cube:Chart/cube:Series[2]/@chartType"/></xp:InlineChartType2></xsl:if>
          <xsl:if test="/*/cube:Layout/cube:Chart"><xp:InlineChart>true</xp:InlineChart></xsl:if>

        </xp:HtmlBuilder>

      </xp:XSLTParameters>
  </xsl:template>

  <!-- Helper for colDim -->
  <xsl:template match="dm:MeasureRef" mode="xsltParameters">
    <dm:MeasureRef bRef="{@idRef | @bRef}"/>
  </xsl:template>
  <xsl:template match="dm:Measure" mode="xsltParameters">
    <dm:MeasureRef bRef="{@id}"/>
  </xsl:template>
  <xsl:template match="cube:Layout/cube:Dimensions/cube:Columns/dm:LevelRef" mode="xsltParameters">
    <xsl:copy>
      <!-- We want some column order, because columns would otherwise show up in the order of their first appearance,
           which is quite random since not each coldim exisits for each row dim.
           But if an explicit sort is given, we do not need it, it will be executed by OrderRowsAnCols -->
      <xsl:if test="not(@sort)"><xsl:attribute name="sort">ascending</xsl:attribute></xsl:if>
      <!-- If there are row-dim-only measures, we need to enforce the total of the first col-dim, which becomes these measures' values -->
      <xsl:if test="position()=1 and /*/cube:Layout/cube:Measures/cube:RowDims/dm:*"><xsl:attribute name="total">trailing</xsl:attribute></xsl:if>
      <xsl:copy-of select="@*"/>
    </xsl:copy>
  </xsl:template>

  <!-- Per default, copy everything 1:1 but into xp namespace -->
  <xsl:template match="cube:*" mode="xsltParameters">
    <xsl:element name="{local-name()}" namespace="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">
      <xsl:apply-templates select="@*|node()" mode="xsltParameters"/>
    </xsl:element>
  </xsl:template>
  <xsl:template match="@*|node()" mode="xsltParameters">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()" mode="xsltParameters"/>
    </xsl:copy>
  </xsl:template>

  <!-- Replace references within Layout with the definition, embedded references with the calc content -->
  <xsl:template match="dm:MeasureRef[@idRef]">
    <xsl:choose>
      <!-- A MeasureRef nested within a Measure is relaced by its content only, skipping dm:Measure/calc:Calc -->
      <xsl:when test="ancestor::dm:Measure and /*/dm:Measures/dm:Measure[@id=current()/@idRef]/wrq:Calc">
        <calc:ValueRef idRef="{@idRef}">
          <xsl:apply-templates select="/*/dm:Measures/dm:Measure[@id=current()/@idRef]/wrq:Calc/*"/>
        </calc:ValueRef>
      </xsl:when>
      <xsl:when test="ancestor::dm:Measure">
        <xsl:apply-templates select="/*/dm:Measures/dm:Measure[@id=current()/@idRef]/calc:Calc/*"/>
      </xsl:when>
      <!-- Otherwise we want it with the dm:Measure root -->
      <xsl:otherwise>
        <dm:Measure>
          <xsl:apply-templates select="/*/dm:Measures/dm:Measure[@id=current()/@idRef]/@*"/>
          <xsl:copy-of select="@*"/>
          <xsl:apply-templates select="/*/dm:Measures/dm:Measure[@id=current()/@idRef]/*"/>
        </dm:Measure>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Per default, copy everything 1:1  -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>