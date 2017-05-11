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
  transforms the internal status configuration to far:Layout
  input document: internal status
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:far="http://www.businesscode.de/schema/bcdui/far-1.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns="http://www.businesscode.de/schema/bcdui/far-1.0.0">
  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="sortingItemSeparator" select="'__'"/>

  <xsl:variable name="selected.dims" select="/*/far:Dimensions/far:Item"/>
  <xsl:variable name="selected.meas" select="/*/far:Measures/far:Item"/>
  <xsl:variable name="selected.sorting" select="/*/far:Sorting/far:Item"/>
  
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
    <Layout>
      <xsl:if test="$selected.dims or $selected.meas">
        <Columns>
          <xsl:apply-templates select="$selected.dims" mode="writeColumns"/>
          <xsl:apply-templates select="$selected.meas" mode="writeColumns"/>
        </Columns>
        <xsl:if test="far:Sorting">
          <Ordering>
            <xsl:apply-templates select="far:Sorting" mode="writeOrdering"/>
          </Ordering>
        </xsl:if>
      </xsl:if>
    </Layout>
  </xsl:template>

  <xsl:template match="far:Dimensions/far:Item|far:Measures/far:Item" mode="writeColumns">
    <xsl:choose>
      <xsl:when test="parent::far:Dimensions">
        <dm:LevelRef bRef="{.}"/>
      </xsl:when>
      <xsl:otherwise>
        <dm:MeasureRef idRef="{.}"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- suffix for descending sorting qualifier -->
  <xsl:variable name="qsuffix.sort.dsc" select="concat($sortingItemSeparator, 'D')"/>
  <xsl:variable name="qsuffix.sort.dsc.length" select="string-length($qsuffix.sort.dsc)"/>
  <!--
  The item identifier encodes qualifiers for Dimension/Measure and Ascending/Descending determintation, read more on this in sorting-adapter.xslt 
   -->
  <xsl:template match="far:Sorting/far:Item" mode="writeOrdering">
    <xsl:variable name="sort">
      <xsl:choose>
        <!-- ends-with(., $qsuffix.sort.dsc) -->
        <xsl:when test="substring(., string-length(.) - $qsuffix.sort.dsc.length + 1) = $qsuffix.sort.dsc">descending</xsl:when>
        <xsl:otherwise>ascending</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>

    <!-- unwrap the id -->
    <xsl:variable name="id" select="substring-before(substring-after(.,$sortingItemSeparator),$sortingItemSeparator)"/>
    <xsl:choose>
      <!-- test for a Dimension qualifier -->
      <xsl:when test="starts-with(., 'D')">
        <dm:LevelRef bRef="{normalize-space($id)}" sort="{normalize-space($sort)}"/>
      </xsl:when>
      <xsl:otherwise>
        <dm:MeasureRef idRef="{normalize-space($id)}" sort="{normalize-space($sort)}"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
</xsl:stylesheet>