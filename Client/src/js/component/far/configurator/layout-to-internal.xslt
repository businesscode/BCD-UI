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
  transforms the far:Layout configuration to internal representation

  input document: far:Layout
  output document: internal status
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:far="http://www.businesscode.de/schema/bcdui/far-1.0.0"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns="http://www.businesscode.de/schema/bcdui/far-1.0.0">
  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="sortingItemSeparator" select="'__'"/>
  <!-- $/Root/far:Layout -->
  <xsl:param name="targetLayoutElement"/>
  <xsl:variable name="layout" select="$targetLayoutElement//far:Layout"/>
  <xsl:variable name="selected.dims" select="$layout/far:Columns/dm:LevelRef"/>
  <xsl:variable name="selected.meas" select="$layout/far:Columns/dm:MeasureRef"/>
  <xsl:variable name="selected.sorting" select="$layout/far:Ordering/*"/>
  
  <!--
    write far:Layout element from status/far:ConfigurationLayout;
    notice following source structure:
    Layout
      Dimensions
        Item
      Measures
        Item
      Sorting
        Item ( .asc/.desc postfix in idRef )
  -->
  <xsl:template match="/*">
    <guiStatus:Status>
      <xsl:if test="$selected.dims or $selected.meas">
        <far:Dimensions>
          <xsl:apply-templates select="$selected.dims" mode="asItem"/>
        </far:Dimensions>
      
        <far:Measures>
          <xsl:apply-templates select="$selected.meas" mode="asItem"/>
        </far:Measures>
        
        <far:Sorting>
          <xsl:apply-templates select="$selected.sorting" mode="asSortingItem"/>
        </far:Sorting>
      </xsl:if>
    </guiStatus:Status>
  </xsl:template>

  <xsl:template match="dm:LevelRef | dm:MeasureRef" mode="asItem">
    <far:Item><xsl:value-of select="concat(substring(@bRef,0,1 div string-length(@idRef)),@idRef)"/></far:Item>
  </xsl:template>
  <xsl:template match="dm:LevelRef | dm:MeasureRef" mode="asSortingItem">
    <xsl:variable name="catQualifier">
      <xsl:choose>
        <xsl:when test="self::dm:LevelRef">D</xsl:when>
        <xsl:otherwise>M</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="sortingSuffix">
      <xsl:choose>
        <xsl:when test="@sort = 'descending'">D</xsl:when>
        <xsl:otherwise>A</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <far:Item><xsl:value-of select="concat(normalize-space($catQualifier), $sortingItemSeparator, concat(substring(@bRef,0,1 div string-length(@idRef)),@idRef), $sortingItemSeparator, normalize-space($sortingSuffix))"/></far:Item>
  </xsl:template>
</xsl:stylesheet>