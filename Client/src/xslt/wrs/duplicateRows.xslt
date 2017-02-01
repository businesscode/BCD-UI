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
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">
  <!--
    Duplicates a range of rows in a WRS and places the duplicates either before
    or after the original rows.
   -->

  <xsl:import href="include/rowRangeParams.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:DuplicateRows[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <!--
    (Boolean) This flag indicates whether the cursor should stay in the selected
    rows or it should be moved behind the current selection
    -->
  <xsl:param name="insertBeforeSelection" select="true()"/>
  <!--
    (Integer) maybe used for generation the unique row-id.
    -->
  <xsl:param name="transactionsNumber" select="number(concat(0,/wrs:Wrs/wrs:Header/wrs:TransactionsNumber))"/>

  <xsl:variable name="wrsColCount" select="count(/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C)"/>
  <xsl:variable name="rowCount" select="$y2 - $y1 + 1"/>

  <xsl:template match="node()|@*">
    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>
  </xsl:template>

  <!-- This template prevents the header from being processed so that the nested wrs:Wrs elements
        inside the binding items are ignored -->
  <xsl:template match="wrs:Header">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:copy-of select="*[name() != 'TransactionsNumber']"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:TransactionsNumber">
    <wrs:TransactionsNumber><xsl:value-of select="$transactionsNumber + 1"/></wrs:TransactionsNumber>
  </xsl:template>

  <xsl:template match="wrs:Data">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:attribute name="newSelection">
        <xsl:choose>
          <xsl:when test="$insertBeforeSelection">
            <xsl:value-of select="concat(1, ',', $y1, ',', $wrsColCount, ',', $y2)"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="concat(1, ',', $y2 + 1, ',', $wrsColCount, ',', $y2 + $rowCount)"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
      <xsl:apply-templates select="*"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Data/*">
    <xsl:if test="position() = $y1 and $rowCount and $insertBeforeSelection">
      <xsl:apply-templates select="." mode="duplicateRow"/>
      <xsl:apply-templates select="following-sibling::*[$rowCount > position()]" mode="duplicateRow"/>
    </xsl:if>

    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>

    <xsl:if test="position() = $y2 and $rowCount and not($insertBeforeSelection)">
      <xsl:apply-templates select="preceding-sibling::*[$rowCount > position()]" mode="duplicateRow"/>
      <xsl:apply-templates select="." mode="duplicateRow"/>
    </xsl:if>
  </xsl:template>

  <xsl:template match="wrs:Data/*" mode="duplicateRow">
    <wrs:I id="D_{$transactionsNumber}_{@id}">
      <xsl:copy-of select="@*[not(local-name()='id')]|wrs:C"/>
    </wrs:I>
  </xsl:template>

</xsl:stylesheet>
