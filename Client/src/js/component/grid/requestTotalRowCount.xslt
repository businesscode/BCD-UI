<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
<!--  Takes the grid's configuration and build a Wrq from it -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:grid="http://www.businesscode.de/schema/bcdui/grid-1.0.0"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" />

  <xsl:param name="statusModel" select="/*[1=0]"/>
  <xsl:param name="columnFilterModel" select="/*[1=0]"/>
  <xsl:param name="gridModelId"/>
  <xsl:param name="countColumnBRef" select="/*/grid:SelectColumns//grid:C[1]/@bRef"/>
  <xsl:param name="timeStampColumns"/>

  <xsl:variable name="excludedStatusFilterBrefs" select="/*/grid:SelectColumns/grid:FilterExclude/@bRefs"/>

  <xsl:template match="/*">

    <wrq:WrsRequest>
      <wrq:Select>
        <wrq:Columns>
          <wrq:C aggr="count" bRef="{$countColumnBRef}"/>
        </wrq:Columns>
        <wrq:From><xsl:copy-of select="/*/wrq:BindingSet"/></wrq:From>
        <f:Filter>
          <xsl:choose>
            <!-- from status model, take either all filters or apply exclude logic (top level only) -->
            <xsl:when test="$excludedStatusFilterBrefs != ''">
              <xsl:copy-of select="$statusModel/*/f:Filter/f:*[ @bRef and not( contains($excludedStatusFilterBrefs, @bRef) ) or @id and not( contains($excludedStatusFilterBrefs, @id) ) ]"/>
            </xsl:when>
            <xsl:otherwise>
              <xsl:copy-of select="$statusModel/*/f:Filter/f:*"/>
            </xsl:otherwise>
          </xsl:choose>
          <xsl:copy-of select="/*/grid:SelectColumns/f:Filter/*"/>
          <xsl:apply-templates select="$statusModel/*/guiStatus:ClientSettings/guiStatus:ColumnFilters[@id=$gridModelId]/*" mode="timestamp"/>
        </f:Filter>
      </wrq:Select>
    </wrq:WrsRequest>

  </xsl:template>

  <xsl:template match="f:Expression" mode="timestamp">
    <xsl:variable name="bRef" select="@bRef"/>
    <xsl:variable name="value" select="@value"/>
    <f:Expression>
      <xsl:copy-of select="@*[not(local-name(.)='value')]"/>
      <xsl:attribute name="value">
        <xsl:choose>
          <xsl:when test="contains($timeStampColumns, concat('&#xe0f2;', $bRef, '&#xe0f2;'))"><xsl:value-of select="translate($value, ' ', 'T')"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="$value"/></xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
      <xsl:apply-templates select="node()" mode="timestamp"/>
    </f:Expression>
  </xsl:template>
  
  
  <xsl:template match="node()|@*" mode="timestamp">
    <xsl:copy><xsl:apply-templates select="node()|@*" mode="timestamp"/></xsl:copy>
  </xsl:template>



</xsl:stylesheet>