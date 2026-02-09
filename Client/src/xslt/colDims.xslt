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
  This stylesheet gets a standard Wrs and turns it into a Wrs where some of the dimensions became column dimensions.
  Imagine a Wrs with ctr and prod as dimensions and vol and wght as measures, and each combination of ctr and prod has a separate row.
  You can turn this into a Wrs, which only has one one row per ctr, followed by columns where vol and wght are repeated for each prod.

  ctr prod vol wght                  P01          P02    [Empty]    (total)
  DE  P01   1   11                 vol wght   vol wght   vol wght   vol wght
  DE  P02   2   12     ==>    DE    1   11     2   12                3    23
  DE   ∑    3   23            FR    4   14                5    15    9    29
  FR  P01   4   14
  FR  null  5   15
  FR   ∑    9   29

  (∑ means @bcdGr="1". The actual text for [Empty] and (total) is driven by i18n, this output's caption is emtpy)
  For empty dimension members, '&#xE0F0;1' indicates the total, '&#xE0F0;0' indicates a simple empty dimension member value.
  Also | separates the different levels.
  The latter is used by htmlBuilder to show multi-level headers.
  The result has the following header with adjusted @id and @caption and new @colDimLevelIds, @dimId, @valueId

  <wrs:Columns colDimLevelIds="prod">
    <wrs:C id="ctr" dimId="ctr"/>
    <wrs:C id="P01|vol" valueId="vol" caption="P01|Volume"/>
    <wrs:C id="P01|wght"/>
    <wrs:C id="P02|vol"/>
    <wrs:C id="P02|wght"/>
    <wrs:C id="&#xE0F0;0|vol"/>
    <wrs:C id="&#xE0F0;0|wght"/>
    <wrs:C id="&#xE0F0;1|vol"/>
    <wrs:C id="&#xE0F0;1|wght" valueId="wght" caption="|Volume"/>
  </wrs:Columns>

  Parameters, see XsltParameters xp:ColDim in xsd. or use param colDimNrOfColDims for simple cases
  -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  xmlns:generator="urn(bcd-xsltGenerator)"
  bcdxml:wrsHeaderIsEnough="true">

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:namespace-alias stylesheet-prefix="xsla" result-prefix="xsl"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt"/>


  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

  <xsl:variable name="sqlTypesDoc" select="document('renderer/sqlTypes.xml')"/>
  <xsl:variable name="colDimsTemplate" select="document('colDimsTemplate.xslt')"/>
  <xsl:variable name="doc" select="/"/>

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:ColDims[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <xsl:param name="layout" select="$paramSet"/>

  <!-- Instead of providing a full layout, one can also just say how many coldims are requested, 
      easier but loosing the advanced features compared to a full layout -->
  <xsl:param name="colDimNrOfColDims" select="number(-1)"/>

  <xsl:variable name="colDimNrOfColDimsCntRowDims" select="count(/*/wrs:Header/wrs:Columns/wrs:C[@dimId]) - $colDimNrOfColDims"/>
  <xsl:variable name="colDimNrOfColDimsLayoutString">
    <xp:ColDims>
      <xsl:if test="$colDimNrOfColDims >= 0">
        <xp:Measures>
          <xp:AllDims>
            <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[@valueId]">
              <dm:MeasureRef bRef="{@id}"/>
            </xsl:for-each>
          </xp:AllDims>
        </xp:Measures>
        <xp:Dimensions>
          <xp:Rows>
            <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[@dimId and position() &lt;= $colDimNrOfColDimsCntRowDims]">
              <dm:LevelRef bRef="{@bRef}"/>
            </xsl:for-each>
          </xp:Rows>
          <xp:Columns>
            <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[@dimId and position() > $colDimNrOfColDimsCntRowDims]">
              <dm:LevelRef bRef="{@bRef}"/>
            </xsl:for-each>
          </xp:Columns>
        </xp:Dimensions>
      </xsl:if>
    </xp:ColDims>
  </xsl:variable>
  <xsl:variable name="colDimNrOfColDimsLayout" select="exslt:node-set($colDimNrOfColDimsLayoutString)"/>

  <!-- Let's augment the input definition with @origPos -->
  <xsl:variable name="layoutString">
    <xsl:apply-templates select="$colDimNrOfColDimsLayout[$colDimNrOfColDims >= 0]" mode="prepare"/>
    <xsl:apply-templates select="$layout[$colDimNrOfColDims &lt; 0]" mode="prepare"/>
  </xsl:variable>
  <xsl:template match="*[@bRef]" mode="prepare">
    <xsl:copy>
      <xsl:apply-templates select="@*" mode="prepare"/>
      <xsl:variable name="node" select="."/>
      <xsl:for-each select="$doc">
        <xsl:attribute name="origPos"><xsl:value-of select="key('colHeadById',$node/@bRef)/@pos"/></xsl:attribute>
      </xsl:for-each>
    </xsl:copy>
  </xsl:template>
  <xsl:template match="node()|@*" mode="prepare">
    <xsl:copy><xsl:apply-templates select="node()|@*" mode="prepare"/></xsl:copy>
  </xsl:template>
  <xsl:variable name="augmLayout" select="exslt:node-set($layoutString)"/>

  <xsl:template match="/*">
    <xsl:choose>
      <xsl:when test="$augmLayout/*/xp:Measures/*/*">
        <xsla:stylesheet>
          <xsl:copy-of select="$colDimsTemplate/*/@*"/>
          <xsl:comment>Generated dimension column generator</xsl:comment>
          <xsl:apply-templates select="$colDimsTemplate/*/*" mode="generateXSLT"/>
        </xsla:stylesheet>
      </xsl:when>
      <xsl:otherwise>
        <bcdxml:XsltNop xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Make the augmented augmLayout available to the generated stylesheet -->
  <xsl:template match="generator:Layout" mode="generateXSLT">
    <xsla:variable name="layoutString">
      <xsl:copy-of select="$layoutString"/>
    </xsla:variable>
    <xsla:variable name="augmLayout" select="exslt:node-set($layoutString)"/>
  </xsl:template>

  <!-- Make a xsl:key on rows with the full dimensions as key available to the generated stylesheet -->
  <xsl:template match="generator:FullDimsKey" mode="generateXSLT">
    <xsla:key name="fullDims" match="/*/wrs:Data/wrs:R">
      <xsl:attribute name="use">
        <xsl:call-template name="dimKeyOfRow"/>
      </xsl:attribute>
    </xsla:key>
  </xsl:template>

  <!-- Make a xsl:key on rows with the only row dimensions as key available to the generated stylesheet -->
  <xsl:template match="generator:RowDimsKey" mode="generateXSLT">
    <xsla:key name="rowDims" match="/*/wrs:Data/wrs:R">
      <xsl:attribute name="use">
        <xsl:call-template name="dimKeyOfRow">
          <xsl:with-param name="rowsOrColumns" select="'Rows'"/>
        </xsl:call-template>
      </xsl:attribute>
    </xsla:key>
  </xsl:template>

  <!-- Generates the key of row dimensions for the current row -->
  <xsl:template match="generator:RowDimKeyOfRow" mode="generateXSLT">
    <xsla:variable name="rowDimKeyOfRow">
      <xsl:attribute name="select">
        <xsl:call-template name="dimKeyOfRow">
          <xsl:with-param name="rowsOrColumns" select="'Rows'"/>
        </xsl:call-template>
      </xsl:attribute>
    </xsla:variable>
  </xsl:template>

  <!-- Make a xsl:key on rows with the only col dimensions as key available to the generated stylesheet -->
  <xsl:template match="generator:ColDimsKey" mode="generateXSLT">
    <xsla:key name="colDims" match="/*/wrs:Data/wrs:R">
      <xsl:attribute name="use">
        <xsl:call-template name="dimKeyOfRow">
          <xsl:with-param name="rowsOrColumns" select="'Columns'"/>
        </xsl:call-template>
      </xsl:attribute>
    </xsla:key>
  </xsl:template>

  <!-- Generates the key of row dimensions for the current row -->
  <xsl:template match="generator:ColDimKeyOfRow" mode="generateXSLT">
    <xsla:variable name="colDimKeyOfRow">
      <xsl:attribute name="select">
        <xsl:call-template name="dimKeyOfRow">
          <xsl:with-param name="rowsOrColumns" select="'Columns'"/>
        </xsl:call-template>
      </xsl:attribute>
    </xsla:variable>
  </xsl:template>

  <!-- Generates the key of row dimensions for the current row in terms of caption-->
  <xsl:template match="generator:ColDimKeyOfRowCaption" mode="generateXSLT">
    <xsla:variable name="colDimKeyOfRowCaption">
      <xsl:attribute name="select">
        <xsl:call-template name="dimKeyOfRow">
          <xsl:with-param name="isCaption" select="true()"/>
          <xsl:with-param name="rowsOrColumns" select="'Columns'"/>
        </xsl:call-template>
      </xsl:attribute>
    </xsla:variable>
  </xsl:template>

  <!-- Helper for key generators above -->
  <xsl:template name="dimKeyOfRow">
    <xsl:param name="rowsOrColumns"/>
    <xsl:param name="isCaption" select="false()"/>
    <xsl:variable name="dimBRefs" select="$augmLayout/*/xp:Dimensions/xp:*[local-name()=$rowsOrColumns or not($rowsOrColumns)]/*/@bRef"/>
    <xsl:choose>
      <xsl:when test="count($dimBRefs)>0">
        concat(
          <xsl:for-each select="$dimBRefs">
            <xsl:sort select="local-name(../..)" order="descending"/> <!-- "Rows" first. Within remains in doc order -->
            <xsl:variable name="bRef" select="."/>
            <xsl:for-each select="$doc">
              <xsl:choose>
                <xsl:when test="$isCaption and key('colHeadById',$bRef)/wrs:A[@name='caption']">
                  <xsl:text>wrs:C[</xsl:text><xsl:value-of select="key('colHeadById',$bRef)/@pos"/><xsl:text>]/@caption,'|'</xsl:text>
                </xsl:when>
                <xsl:when test="$isCaption">
                  <xsl:text>wrs:C[</xsl:text><xsl:value-of select="key('colHeadById',$bRef)/@pos"/><xsl:text>],'|'</xsl:text>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:text>wrs:C[</xsl:text><xsl:value-of select="key('colHeadById',$bRef)/@pos"/><xsl:text>],substring(concat('&#xE0F0;',wrs:C[</xsl:text><xsl:value-of select="key('colHeadById',$bRef)/@pos"/><xsl:text>]/@bcdGr),1,string-length(concat('&#xE0F0;',wrs:C[</xsl:text><xsl:value-of select="key('colHeadById',$bRef)/@pos"/><xsl:text>]/@bcdGr)) * (number(string-length(wrs:C[</xsl:text><xsl:value-of select="key('colHeadById',$bRef)/@pos"/><xsl:text>]) = 0))),'|'</xsl:text>
                </xsl:otherwise>
              </xsl:choose>
            </xsl:for-each>
            <xsl:if test="position()&lt;last()">,</xsl:if>
          </xsl:for-each>
        )
      </xsl:when>
      <xsl:otherwise>@bcdDummy[1=0]</xsl:otherwise> <!-- This is to preven syntax issues with concat when no dimBRefs is given -->
    </xsl:choose>
  </xsl:template>

  <!-- Generates the sorting expression for rows (by dimension in their order)
       Is part of this step already to allow for cumulation in the next step
       Totals may be leading, trailing or true (just sorted along with the other values)
       The priority of sorting is @sort, @caption, value -->
  <xsl:template match="generator:RowSorting | generator:ColSorting" mode="generateXSLT">
    <xsl:variable name="rowOrCol">
      <xsl:choose>
        <xsl:when test="self::generator:RowSorting">Rows</xsl:when>
        <xsl:otherwise>Columns</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:for-each select="$augmLayout/*/xp:Dimensions/xp:*[local-name()=$rowOrCol]/*[@sort or @total]">
      <xsl:variable name="elem" select="."/>
      <xsl:for-each select="$doc">
        <xsl:choose>
          <xsl:when test="$elem/@total='leading'">
            <xsla:sort select="wrs:C[{key('colHeadById',$elem/@bRef)/@pos}]/@bcdGr" order="descending"/>
          </xsl:when>
          <xsl:when test="$elem/@total='trailing'">
            <xsla:sort select="wrs:C[{key('colHeadById',$elem/@bRef)/@pos}]/@bcdGr" order="ascending"/>
          </xsl:when>
        </xsl:choose>
        <!-- When sorting by values (or @order or @caption), sort empty to the end -->
        <xsl:choose>
          <xsl:when test="$elem/@sort and key('colHeadById',$elem/@bRef)/wrs:A[@name='order']">
            <xsla:sort select="string-length(wrs:C[{key('colHeadById',$elem/@bRef)/@pos}]/@order)=0" order="ascending"/>
            <xsla:sort select="wrs:C[{key('colHeadById',$elem/@bRef)/@pos}]/@order" order="{$elem/@sort}">
              <xsl:if test="key('colHeadById',$elem/@bRef)/wrs:A[@name='order']/@type-name = $sqlTypesDoc/*/rnd:Numeric/rnd:Type/@name">
                <xsl:attribute name="data-type">number</xsl:attribute>
              </xsl:if>
            </xsla:sort>
          </xsl:when>
          <xsl:when test="$elem/@sort and key('colHeadById',$elem/@bRef)/wrs:A[@name='caption']">
            <xsla:sort select="string-length(wrs:C[{key('colHeadById',$elem/@bRef)/@pos}]/@caption)=0" order="ascending"/>
            <xsla:sort select="wrs:C[{key('colHeadById',$elem/@bRef)/@pos}]/@caption" order="{$elem/@sort}">
              <xsl:if test="key('colHeadById',$elem/@bRef)/wrs:A[@name='caption']/@type-name = $sqlTypesDoc/*/rnd:Numeric/rnd:Type/@name">
                <xsl:attribute name="data-type">number</xsl:attribute>
              </xsl:if>
            </xsla:sort>
          </xsl:when>
          <xsl:when test="$elem/@sort">
            <xsla:sort select="string-length(wrs:C[{key('colHeadById',$elem/@bRef)/@pos}])=0" order="ascending"/>
            <xsla:sort select="wrs:C[{key('colHeadById',$elem/@bRef)/@pos}]" order="{$elem/@sort}">
              <xsl:if test="key('colHeadById',$elem/@bRef)/@type-name = $sqlTypesDoc/*/rnd:Numeric/rnd:Type/@name">
                <xsl:attribute name="data-type">number</xsl:attribute>
              </xsl:if>
            </xsla:sort>
          </xsl:when>
        </xsl:choose>
      </xsl:for-each>
    </xsl:for-each>
  </xsl:template>

  <!-- Variable containing one row of each row group. A Row group contains all rows with the same row-dimenions -->
  <xsl:template match="generator:distinctRowGroups" mode="generateXSLT">
    <xsl:variable name="dimBRefs" select="$augmLayout/*/xp:Dimensions/xp:Rows/*/@bRef"/>
    <xsla:variable name="distinctRowGroups">
      <xsl:choose>
        <xsl:when test="count($dimBRefs)=0">
          <xsl:attribute name="select">/*/wrs:Data/wrs:R[1]</xsl:attribute>
        </xsl:when>
        <xsl:otherwise>
          <xsl:attribute name="select">
            /*/wrs:Data/wrs:R[count(.| key('rowDims',
              <xsl:call-template name="dimKeyOfRow">
                <xsl:with-param name="rowsOrColumns" select="'Rows'"/>
              </xsl:call-template>
              )[1])=1]
          </xsl:attribute>
        </xsl:otherwise>
      </xsl:choose>
    </xsla:variable>
  </xsl:template>

  <!-- Per default copy all nodes from the template to the generated stylesheet -->
  <xsl:template match="node()|@*" mode="generateXSLT">
    <xsl:copy><xsl:apply-templates select="node()|@*" mode="generateXSLT"/></xsl:copy>
  </xsl:template>

</xsl:stylesheet>
