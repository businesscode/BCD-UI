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
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xi="http://www.w3.org/2001/XInclude"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  exclude-result-prefixes="wrs">
  <!--
    Restores the content of a rectangular selection of a wrs. It converts wrs:D to
    wrs:R and wrs:M to wrs:R if appropriate. wrs:I elements are not ignored.
   -->

  <xsl:import href="include/rowRangeParams.xslt"/>
  <xsl:import href="include/colRangeParams.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:DeleteRows[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>
  <!--
    (Integer) An id - used for generation the unique row-id.
    -->
  <xsl:param name="transactionsNumber" select="number(concat(0,/wrs:Wrs/wrs:Header/wrs:TransactionsNumber))"/>

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
      <xsl:variable name="removedRowCount" select="count(wrs:*[$y2 >= position() and position() >= $y1]/self::wrs:I)"/>
      <xsl:attribute name="newSelection">
        <xsl:value-of select="concat($x1, ' ', $y1, ' ', $x2, ' ', $y2 - $removedRowCount)"/>
      </xsl:attribute>
      <xsl:apply-templates select="wrs:*[$y1 > position()]"/>
      <xsl:apply-templates select="wrs:*[$y2 >= position() and position() >= $y1]" mode="restore"/>
      <xsl:apply-templates select="wrs:*[position() > $y2]"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:I" mode="restore"/>

  <xsl:template match="wrs:D | wrs:R" mode="restore">
    <wrs:R>
      <xsl:apply-templates select="@*|wrs:C"/>
    </wrs:R>
  </xsl:template>

  <!-- Modified rows are either fully restored to wrs:R or partially -->
  <xsl:template match="wrs:M" mode="restore">
    <!-- A flag indicating if there are any changes (differences between wrs:C and wrs:O)
         in the columns not within the column interval (between $x1 and $x2). -->
    <xsl:variable name="hasChangesOutsideColumnInterval" select="boolean(wrs:C[(position() > $x2 or $x1 > position()) and string(.) != string(following-sibling::wrs:O[1])])"/>
    <xsl:choose>

      <xsl:when test="$hasChangesOutsideColumnInterval">
        <!-- There are still some changes besides the restored columns so we must keep the wrs:M row. -->
        <xsl:copy>
          <xsl:apply-templates select="@*"/>
          <xsl:apply-templates select="wrs:*[$x1 * 2 - 1 > position()]"/>
          <xsl:for-each select="wrs:O[$x2 >= position() and position() >= $x1]">
            <C>
              <xsl:apply-templates select="@*|node()"/>
            </C>
            <xsl:apply-templates select="."/>
          </xsl:for-each>
          <xsl:apply-templates select="wrs:*[position() > $x2 * 2]"/>
        </xsl:copy>
      </xsl:when>

      <xsl:otherwise>
        <!-- There are no changes in the row anymore so we convert it back to a wrs:R. -->
        <R>
          <xsl:apply-templates select="@*"/>
          <xsl:for-each select="wrs:O">
            <C>
              <xsl:apply-templates select="@*|node()"/>
            </C>
          </xsl:for-each>
        </R>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>
