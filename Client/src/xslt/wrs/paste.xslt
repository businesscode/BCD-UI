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
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:csv="http://www.businesscode.de/schema/bcdui/csv-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:xi="http://www.w3.org/2001/XInclude"
  xmlns:generator="urn(bcd-xsltGenerator)">
  <!--
    This template pastes clipboard data (in the format defined by csv-1.0.0.xsd) into
    a wrs. It can either take an rectangular selection (colStartPos,rowStartPos)-(colEndPos,rowEndPos) trying to fill
    it with the clipboard data or it can paste the data at the end when the selection
    is not specified. When the rectangular selection is smaller than the clipboard data
    the selection is enlarged to the size of it.
   -->

  <xsl:import href="include/rowRangeParams.xslt"/>
  <xsl:import href="include/colRangeParams.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt"/>

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>

  <xsl:variable name="paramSet" select="$paramModel//xp:Paste[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <!--
    (Document) The CSV data to be pasted. This data must satisfy the schema
    csv-1.0.0.xsd.
   -->
  <xsl:param name="clipboardData"/>

  <!--
    (Integer) An id - used for generation the unique row-id.
    -->
  <xsl:param name="transactionsNumber" select="number(concat(0,/wrs:Wrs/wrs:Header/wrs:TransactionsNumber))"/>
  <!--
    (String?Boolean) if the whole content of clipboard should be pasted as new row(s)
    -->
  <xsl:param name="pasteAsNewRows" select="false()"/>

   <!-- (String?Boolean) avoid pasting into read only cols -->
  <xsl:param name="preventReadOnlyCol" select="true()"/>

  <xsl:variable name="pasteTemplate" select="document('templates/pasteTemplate.xslt')"/>
  <!--
    The predicate "$colEndPos >= @pos" is currently not added, because this would
    need the computation of the $actualX2 value.
   -->
  <xsl:variable name="columnsWithCaptionValueReferences" select="/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@pos >= $x1 and wrs:References/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[2]]"/>

  <xsl:template match="/">
    <xsl:apply-templates select="$pasteTemplate/*" mode="generateXSLT"/>
  </xsl:template>

  <xsl:template match="node()|@*" mode="generateXSLT">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*" mode="generateXSLT"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="generator:Keys" mode="generateXSLT">
    <xsl:comment>Generated Keys</xsl:comment>
    <xsl:for-each select="$columnsWithCaptionValueReferences">
      <xsl:element name="key" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="name">valueLookupForCol<xsl:value-of select="@pos"/></xsl:attribute>
        <xsl:attribute name="match">/wrs:*/wrs:Header/wrs:Columns/wrs:C[<xsl:value-of select="@pos"/>]/wrs:References/wrs:Wrs/wrs:Data/wrs:*/wrs:C[2]</xsl:attribute>
        <xsl:attribute name="use">preceding-sibling::wrs:C[1]</xsl:attribute>
      </xsl:element>
    </xsl:for-each>
  </xsl:template>

</xsl:stylesheet>
