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
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xi="http://www.w3.org/2001/XInclude"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0">
  <!--
    Inserts a new row at a specific point in the WRS. The default values will be
    either taken from the references or set to an appropriate value if this is
    possible and the respective column is mandatory.
   -->

  <xsl:import href="include/rowRangeParams.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:InsertEmptyRows[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <!--
    This flag indicates whether the new row is inserted before row y1 or
    appended after row y2.
    -->
  <xsl:param name="insertBeforeSelection" select="'true'"/>
  <xsl:variable name="insertBeforeSelectionBoolean" select="boolean($insertBeforeSelection='true')"/>
  
  <!--
    (Integer) maybe used for generation the unique row-id.
    -->
  <xsl:param name="transactionsNumber" select="number(concat(0,/wrs:Wrs/wrs:Header/wrs:TransactionsNumber))"/>

  <!--
    Flag which auto-fills values
    -->
  <xsl:param name="setDefaultValue" select="'true'"/>
  <xsl:variable name="setDefaultValueBoolean" select="boolean($setDefaultValue='true')"/>

  <xsl:variable name="wrsColumns" select="/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C"/>
  <xsl:variable name="wrsColCount" select="count($wrsColumns)"/>
  <xsl:variable name="rowCount" select="$y2 - $y1 + 1"/>
  <xsl:variable name="sqlTypes" select="document('../renderer/sqlTypes.xml')"/>
  <xsl:variable name="numericTypes" select="$sqlTypes/*/rnd:Numeric/rnd:Type"/>

  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

  <!-- This template prevents the header from being processed so that the nested wrs:Wrs elements
        inside the binding items are ignored -->
  <xsl:template match="wrs:Header">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <wrs:TransactionsNumber><xsl:value-of select="$transactionsNumber + 1"/></wrs:TransactionsNumber>
      <xsl:copy-of select="*[name() != 'TransactionsNumber']"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Data">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:attribute name="newSelection">
        <xsl:choose>
          <xsl:when test="not($rowCount)">
            <xsl:variable name="wrsRowCount" select="count(/wrs:Wrs/wrs:Data/wrs:*)"/>
            <xsl:value-of select="concat(1, ' ', $wrsRowCount + 1, ' ', $wrsColCount, ' ', $wrsRowCount + 1)"/>
          </xsl:when>
          <xsl:when test="$insertBeforeSelectionBoolean">
            <xsl:value-of select="concat(1, ' ', $y1, ' ', $wrsColCount, ' ', $y1)"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="concat(1, ' ', $y2 + 1, ' ', $wrsColCount, ' ', $y2 + 1)"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
      <xsl:if test="not(*)">
        <xsl:call-template name="insertRow">
          <xsl:with-param name="id" select="'new'"/>
        </xsl:call-template>
      </xsl:if>
      <xsl:apply-templates select="*"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Data/wrs:*">
    <xsl:if test="position() = $y1 and $rowCount and $insertBeforeSelectionBoolean">
      <xsl:apply-templates select="." mode="insertRow"/>
    </xsl:if>
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
    <xsl:if test="position() = $y2 and $rowCount and not($insertBeforeSelectionBoolean)">
      <xsl:apply-templates select="." mode="insertRow"/>
    </xsl:if>
  </xsl:template>

  <xsl:template match="wrs:Data/wrs:*" name="insertRow" mode="insertRow">
    <xsl:param name="id"/>
    <xsl:param name="restRowCount" select="$rowCount"/>
    <xsl:variable name="useId">
      <xsl:choose>
        <xsl:when test="$id"><xsl:value-of select="$id"/></xsl:when>
        <xsl:otherwise><xsl:value-of select="concat('I_', $transactionsNumber, '_', @id)"/></xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <wrs:I>
      <xsl:attribute name="id"><xsl:value-of select="$useId"/></xsl:attribute>
      <xsl:for-each select="$wrsColumns">
        <wrs:C>
          <xsl:apply-templates select="." mode="getDefaultValue"/>
        </wrs:C>
      </xsl:for-each>
    </wrs:I>
    <xsl:if test="$restRowCount>1">
      <xsl:call-template name="insertRow">
        <xsl:with-param name="restRowCount"><xsl:value-of select="$restRowCount - 1"/></xsl:with-param>
        <xsl:with-param name="id"><xsl:value-of select="concat($useId,'_',$restRowCount)"/></xsl:with-param>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>

  <xsl:template match="wrs:C" mode="getDefaultValue">
    <xsl:variable name="firstReferenceValue" select="wrs:References/wrs:Wrs/wrs:Data/wrs:*[not(self::wrs:D)][1]/wrs:C[2 >= position()][last()]"/>
    <xsl:choose>
      <!-- When there is only one choice we take it -->
      <xsl:when test="not($setDefaultValueBoolean)"><wrs:null/></xsl:when>
      <xsl:when test="$firstReferenceValue and not(wrs:References/wrs:Wrs/wrs:Data/wrs:*[not(self::wrs:D)][2]/wrs:C)">
        <xsl:value-of select="$firstReferenceValue"/>
      </xsl:when>
      <!-- If the column is nullable we can use null here -->
      <xsl:when test="not(@nullable = '0')"><wrs:null/></xsl:when>
      <!-- If there are references and the column is not nullable we take the first reference even if there are more choices -->
      <xsl:when test="$firstReferenceValue">
        <xsl:value-of select="$firstReferenceValue"/>
      </xsl:when>
      <!-- If it is not nullable and no reference found and the column is numeric we can set 0 -->
      <xsl:when test="@type-name = $numericTypes/@name">
        <xsl:value-of select="0"/>
      </xsl:when>
      <!-- Otherwise we must take null even if we know that this will lead to an error -->
      <xsl:otherwise><wrs:null/></xsl:otherwise>
    </xsl:choose>
  </xsl:template>
</xsl:stylesheet>
