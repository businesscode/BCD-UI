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
<xsl:stylesheet version="1.0"
  xmlns:html="http://www.w3.org/1999/xhtml"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xi="http://www.w3.org/2001/XInclude"
  xmlns:generator="urn(bcd-xsltGenerator)">

<xsl:import href="bcduicp://bcdui/xslt/renderer/numberFormatting.xslt"/>
<xsl:import href="bcduicp://bcdui/xslt/stringUtil.xslt"/>

<!--
   Generates the following variables

     $numericSQLTypes

  Generates the following keys

     rowDimKey_Level{1,2,3...}
 -->

<xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

<generator:VariablesForBody/>

<!-- Lookup column definition by column index. -->
<generator:ColumnDefinitionLookupKey/>

<xsl:output method="html" version="1.0" encoding="UTF-8" indent="no"/>

<!--
  Root template
 -->
<xsl:template match="/*">
  <table class="bcdReport" controllerVariableName="{$bcdControllerVariableName}">
    <xsl:attribute name="bcdOnLoad">
      <xsl:if test="$isExpandCollapseCells">bcdui.component.cube.expandCollapse._init(this);</xsl:if>
      <xsl:if test="$inlineChart">
        bcdui.component.cube.inlineChart._init({
          targetHtml: this
        , cubeId: '<xsl:value-of select="$bcdControllerVariableName"/>'
        , chartType1: '<xsl:value-of select="$inlineChartType1"/>'
        , chartType2: '<xsl:value-of select="$inlineChartType2"/>'
        , minMaxRow: <xsl:value-of select="$inlineChartMinMaxRow"/>
        });
      </xsl:if>
      <xsl:if test="$stickyEnabled">
         const self = this;
         setTimeout(function() { bcdui.widget.stickyTable({
          targetHtml: self
        , width: '<xsl:value-of select="$stickyWidth"/>'
        , height: '<xsl:value-of select="$stickyHeight"/>'
        , bcdDimension: <xsl:value-of select="$stickyDims"/>
        , header: <xsl:value-of select="$stickyHeader"/>
        , footer: <xsl:value-of select="$stickyFooter"/>
        , nFirstCols: <xsl:value-of select="$stickyFirstCols"/>
        , nFirstRows: <xsl:value-of select="$stickyFirstRows"/>
        , nLastCols: <xsl:value-of select="$stickyLastCols"/>
        , nLastRows: <xsl:value-of select="$stickyLastRows"/>
        , disableMaxWH: <xsl:value-of select="$stickyDisableMaxWH"/>
        }); });
      </xsl:if>
      <xsl:choose>
        <xsl:when test="not($isCreateHeaderFilters) and $isCreateFixHeader">bcdui.widget._enableFixedTableHeader(this, '<xsl:value-of select="$bcdControllerVariableName"/>', true);</xsl:when>
        <xsl:when test="$isCreateHeaderFilters and $isCreateFixHeader">bcdui.widget._enableFixedTableHeader(this, '<xsl:value-of select="$bcdControllerVariableName"/>', true, true);</xsl:when>
        <xsl:when test="$isCreateHeaderFilters and not($isCreateFixHeader)">bcdui.widget.createFilterTableHeader({renderer: '<xsl:value-of select="$bcdControllerVariableName"/>'});</xsl:when>
      </xsl:choose>
    </xsl:attribute>
    <xsl:apply-templates select="wrs:Header/wrs:Columns"/>
    <xsl:apply-templates select="wrs:Data"/>
  </table>
</xsl:template>

<!--
  Creates the table body.
 -->
<xsl:template match="wrs:Data">
  <tbody>
    <generator:OnlyIfRowSpan>
      <generator:LoopOverAllHeaderCols/>
    </generator:OnlyIfRowSpan>
    <generator:IfNoRowSpan>
      <generator:ForEachRowWithMaxRowLimit>
        <generator:SortRows/>
        <xsl:apply-templates select=".">
          <xsl:with-param name="pos" select="position()"/>
        </xsl:apply-templates>
      </generator:ForEachRowWithMaxRowLimit>
    </generator:IfNoRowSpan>
  </tbody>
</xsl:template>

<!--
  Creates one single row of data. This can either be a spanned row or a single
  data row.
 -->
<xsl:template match="wrs:Data/wrs:*" name="matchWrsRow">
  <generator:RowSpanParameters/>
  <tr bcdRowIdent="{@id}">
    <xsl:variable name="rowTotalCss">
      <xsl:apply-templates select="wrs:*[1]" mode="determineCssClassTotal"/>
    </xsl:variable>
    <xsl:attribute name="class">
      <xsl:value-of select="$rowTotalCss"/>
      <xsl:if test="$rowTotalCss!=''"> bcdTotal</xsl:if>
      <xsl:choose>
        <xsl:when test="self::wrs:I"> bcdInserted</xsl:when>
        <xsl:when test="self::wrs:M"> bcdModified</xsl:when>
        <xsl:when test="self::wrs:D"> bcdDeleted</xsl:when>
      </xsl:choose>
    </xsl:attribute>
    <generator:ApplyColumnValues/>
  </tr>
</xsl:template>

<!-- Row css for total:
   Walks over all columns < $headerColsNum and finds the first one (if any) indicating a total value, adding class bcdTL1 -->
<xsl:template match="wrs:*" mode="determineCssClassTotal">
  <xsl:param name="level" select="1"/>
  <xsl:choose>
    <xsl:when test="@bcdGr='1' and $level &lt; 4"><xsl:value-of select="concat('bcdTL',$level)"/></xsl:when>
    <xsl:when test="@bcdGr='1'">bcdTLGe4</xsl:when>
    <xsl:when test="$level &lt;= $headerColsNum or $headerColsNum=0">
      <xsl:apply-templates select="following-sibling::wrs:*[1]" mode="determineCssClassTotal">
        <xsl:with-param name="level" select="$level+1"/>
      </xsl:apply-templates>
    </xsl:when>
  </xsl:choose>
</xsl:template>

<!--
  Header column generation in case of row span.
 -->
<generator:OnlyIfRowSpan>
  <generator:MatchHeaderColumn>
    <xsl:param name="rowTotalCss"/>
    <xsl:param name="rowSpan"/>
    <xsl:variable name="originalColumnIndex" select="substring-before(substring-after($columnOrderingList, concat('|', position() + $headerOffsetValue, ':')), '|')"/>
    <xsl:variable name="columnDefinition" select="key('columnDefinitionLookup', $originalColumnIndex)"/>
    <xsl:variable name="isNumber" select="@unit or @scale or contains($numericSQLTypes, concat(' ', @type-name, ' '))"/>
    <xsl:if test="$rowSpan != 0">
      <th>
        <xsl:attribute name="class">
          <xsl:if test="@bcdGr='1'"><xsl:value-of select="$rowTotalCss"/></xsl:if>
          <xsl:if test="$isInnerMostDim and ../@bcdVdm"> bcdVdm</xsl:if>
          <xsl:if test="$isNumber and . &lt; 0"> bcdNegNumber</xsl:if>
        </xsl:attribute>
        <xsl:apply-templates select="@*"/>
        <xsl:if test="$rowSpan > 1">
          <xsl:attribute name="rowspan"><xsl:value-of select="$rowSpan"/></xsl:attribute>
        </xsl:if>
        <!-- We know, we are only called for the latest @bcdGr='1' row dim, so we span the preceding -->
        <xsl:if test="@bcdGr='1'">
          <xsl:attribute name="colspan"><xsl:value-of select="count(preceding-sibling::*[@bcdGr='1'])+1"/></xsl:attribute>
        </xsl:if>
        <xsl:choose>
          <xsl:when test="@bcdGr='1'"><xsl:attribute name="bcdTranslate">bcd_Total</xsl:attribute></xsl:when>
          <xsl:when test="@bcdOt='1'"><xsl:attribute name="bcdTranslate">bcd_OtherDimmember</xsl:attribute></xsl:when>
          <xsl:when test="string-length(.)=0 and string-length(@caption)=0"><xsl:attribute name="bcdTranslate">bcd_EmptyDimmember</xsl:attribute></xsl:when>
          <xsl:when test="@caption"><xsl:value-of select="@caption"/></xsl:when>
          <xsl:when test="$isNumber">
            <xsl:call-template name="formatNumber">
              <xsl:with-param name="columnDefinition" select="$columnDefinition"/>
              <xsl:with-param name="numberFormattingOption" select="$numberFormattingOption"/>
            </xsl:call-template>
          </xsl:when>
          <xsl:otherwise><xsl:value-of select="."/></xsl:otherwise>
        </xsl:choose>
      </th>
    </xsl:if>
  </generator:MatchHeaderColumn>
</generator:OnlyIfRowSpan>

<!--
  Header column generation if there is no rowspan.
 -->
<generator:IfNoRowSpan>
  <generator:MatchHeaderColumn>
    <xsl:param name="rowTotalCss"/>
    <th>
      <xsl:attribute name="class">
        <xsl:value-of select="$rowTotalCss"/>
        <xsl:if test="$isInnerMostDim and ../@bcdVdm"> bcdVdm</xsl:if>
      </xsl:attribute>
        <xsl:choose>
          <xsl:when test="@bcdGr='1'"><xsl:attribute name="bcdTranslate">bcd_Total</xsl:attribute></xsl:when>
          <xsl:when test="@bcdOt='1'"><xsl:attribute name="bcdTranslate">bcd_OtherDimmember</xsl:attribute></xsl:when>
          <xsl:when test="string-length(.)=0 and string-length(@caption)=0"><xsl:attribute name="bcdTranslate">bcd_EmptyDimmember</xsl:attribute></xsl:when>
          <xsl:when test="@caption"><xsl:value-of select="@caption"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="."/></xsl:otherwise>
        </xsl:choose>
    </th>
  </generator:MatchHeaderColumn>
</generator:IfNoRowSpan>

<!--
  Creates a single data cell which usually contains a formatted numeric value.
 -->
<xsl:template match="wrs:C">
  <generator:OnlyIfRowSpan>
    <xsl:variable name="originalColumnIndex" select="substring-before(substring-after($columnOrderingList, concat('|', position() + $headerOffsetValue, ':')), '|')"/>
    <xsl:variable name="columnDefinition" select="key('columnDefinitionLookup', $originalColumnIndex)"/>
  </generator:OnlyIfRowSpan>
  <generator:IfNoRowSpan>
    <xsl:variable name="columnDefinition" select="key('columnDefinitionLookup', count(preceding-sibling::wrs:C) + 1)"/>
  </generator:IfNoRowSpan>

  <xsl:variable name="tableElement">
    <xsl:choose>
      <xsl:when test="boolean($columnDefinition/@dimId!='')">th</xsl:when>
      <xsl:otherwise>td</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

  <xsl:variable name="pos" select="number($columnDefinition/@pos)"/>

  <xsl:choose>
    <xsl:when test="$inlineChart and $tableElement='td' and $pos &gt;= $dims + 1 and $inlineChartType1='PIECHART' and $inlineChartInnerRowDim"><td class='bcdChartCell'></td></xsl:when>
    <xsl:when test="$inlineChart and $tableElement='td' and not($pos = $dims + 1)"></xsl:when>
    <xsl:when test="$inlineChart and $tableElement='td' and $pos = $dims + 1 "><td class='bcdChartCell' colspan="{$measures}"></td></xsl:when>
    <xsl:otherwise>
      <xsl:element name="{$tableElement}">

        <xsl:variable name="isNoNumber" select="@caption !='' or (not(contains($numericSQLTypes, concat(' ', $columnDefinition/@type-name, ' '))) and not(contains($numericSQLTypes, concat(' ', @type-name, ' '))))"/>

        <!-- @className handling -->
        <xsl:variable name="className">
          <xsl:choose>
            <xsl:when test="($tableElement='th' and @bcdGr='1') or contains($columnDefinition/@id,'&#xE0F0;1') or $isNoNumber">
              <xsl:choose>
                <xsl:when test="$tableElement='th' and @bcdGr='1'">
                  <xsl:apply-templates select="../wrs:*[1]" mode="determineCssClassTotal"/> 
                </xsl:when>
                <xsl:when test="contains($columnDefinition/@id,'&#xE0F0;1')">bcdTotal</xsl:when>
              </xsl:choose>                      
              <xsl:if test="$isNoNumber"> bcdNoNumber</xsl:if>
            </xsl:when>
            <xsl:when test="not($isNoNumber) and . &lt; 0">bcdNegNumber</xsl:when>
          </xsl:choose>
        </xsl:variable>

        <!-- write @class , merge with @html:class -->
        <xsl:if test="$className != '' or @html:class">
          <xsl:attribute name="class"><xsl:value-of select="concat(@html:class, ' ', $className)"/></xsl:attribute>
        </xsl:if>

        <!-- rewrite html atts all but @class handled above -->
        <xsl:for-each select="@html:*[local-name() != 'class']">
          <xsl:attribute name="{local-name()}"><xsl:value-of select="."/></xsl:attribute>
        </xsl:for-each>

        <xsl:choose>
          <xsl:when test="@bcdGr='1'"><xsl:attribute name="bcdTranslate">bcd_Total</xsl:attribute></xsl:when>
          <xsl:when test="@bcdOt='1'"><xsl:attribute name="bcdTranslate">bcd_OtherDimmember</xsl:attribute></xsl:when>
          <xsl:when test="$columnDefinition/@dimId and string-length(.)=0 and string-length(@caption)=0"><xsl:attribute name="bcdTranslate">bcd_EmptyDimmember</xsl:attribute></xsl:when>
          <xsl:when test="@caption"><xsl:value-of select="@caption"/></xsl:when>
          <xsl:when test="not($isNoNumber)">
            <xsl:call-template name="formatNumber">
              <xsl:with-param name="columnDefinition" select="$columnDefinition"/>
              <xsl:with-param name="numberFormattingOption" select="$numberFormattingOption"/>
            </xsl:call-template>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="."/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:element>
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>

</xsl:stylesheet>
