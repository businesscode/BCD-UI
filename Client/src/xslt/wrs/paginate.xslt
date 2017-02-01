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
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">

  <!--
    Drop rows of input WRS, see xp:Paginate
    -->

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:Paginate[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <!-- Individual parameters -->
  <!-- (Integer) size of one page and
       (Integer) number of page to be kept (starting at 1) -->
  <xsl:param name="pageSize"   select="$paramSet/xp:PageSize"/>
  <xsl:param name="pageNumber" select="$paramSet/xp:PageNumber"/>

  <xsl:variable name="y2">
    <xsl:choose>
      <xsl:when test="$pageNumber = 'all'"><xsl:value-of select="count(/wrs:Wrs/wrs:Data/wrs:*)"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="number($pageSize) * number($pageNumber)"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="y1">
   <xsl:choose>
      <xsl:when test="$pageNumber = 'all'">1</xsl:when>
      <xsl:otherwise><xsl:value-of select="number($y2) - number($pageSize) + 1"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       check there is something to do
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/">
    <xsl:choose>
      <!-- if one of params is NaN then we skip processing -->
      <xsl:when test="$y2 + $y1 != $y2 + $y1">
        <bcdxml:XsltNop/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:apply-templates/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       recursive copy
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       filter rows
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/wrs:Wrs/wrs:Data">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:copy-of select="*[position() >= $y1 and $y2 >= position()]"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>
