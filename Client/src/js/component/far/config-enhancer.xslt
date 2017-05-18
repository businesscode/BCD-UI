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
  transforms the configuration model to enhanced canonical configuration format,
  resolved dimensions, categeroies
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:far="http://www.businesscode.de/schema/bcdui/far-1.0.0"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns="http://www.businesscode.de/schema/bcdui/far-1.0.0">
  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="statusModel"/>
  <xsl:param name="dimensionsModel"/>
  <xsl:param name="categoriesModel"/>
  <xsl:param name="componentId"/>
  <!-- used to encode item semantics -->
  <xsl:param name="sortingItemSeparator" select="'__'"/>

  <!-- references the layout in status -->
  <xsl:variable name="layoutInStatus" select="$statusModel//far:Far[@id=$componentId]/far:Layout"/>

  <xsl:template match="/far:Configuration">
    <Configuration id="{$componentId}">
      <!-- process all except far:Layout, which requires special handling -->
      <xsl:apply-templates select="*[ not( self::far:Layout) ]"/>
      <!--
        merge Layout, we have to merge it since it main contain
        static rendering parameters
       -->
      <xsl:choose>
        <xsl:when test="not(far:Layout)"><!-- no local Layout definition, just take what we have from status -->
          <xsl:copy-of select="$layoutInStatus"/>
          <xsl:apply-templates select="$layoutInStatus/far:Paginate" mode="toInternalApi"/>
        </xsl:when>
        <xsl:otherwise><!-- we have local Layout, merge it -->
          <xsl:apply-templates select="far:Layout" mode="mergeLayout"/>
          <xsl:apply-templates select="far:Layout/far:Paginate" mode="toInternalApi"/>
        </xsl:otherwise>
      </xsl:choose>
      
      <!-- write appropriate message, in case no dimension was selected -->
      <xsl:if test="not( (far:Layout|$layoutInStatus)/far:Columns/dm:LevelRef )">
        <xp:HtmlBuilder>
          <!-- i18n-key -->
          <xp:EmptyMessage>bcd_FarComponent_DimensionMissing</xp:EmptyMessage>
        </xp:HtmlBuilder>
      </xsl:if>
    </Configuration>
  </xsl:template>

  <!--
    transforms far:Paginate to xp:Paginate
   -->
  <xsl:template match="far:Paginate" mode="toInternalApi">
    <xp:Paginate xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">
      <xsl:if test="far:PageSize">
        <xp:PageSize><xsl:value-of select="far:PageSize"/></xp:PageSize>
      </xsl:if>
      <xsl:if test="far:PageNumber">
        <xp:PageNumber><xsl:value-of select="far:PageNumber"/></xp:PageNumber>
      </xsl:if>
      <xsl:if test="far:ShowAllOption">
        <xp:ShowAllOption><xsl:value-of select="far:ShowAllOption"/></xp:ShowAllOption>
      </xsl:if>
    </xp:Paginate>
  </xsl:template>

  <!-- 
    local far:Layout always overrides over the one provided via status,
    if no local exists, we take the one from status 
   -->
  <xsl:template match="far:Layout" mode="mergeLayout">
    <xsl:copy>
      <!-- retain local attributes and all except Columns, Ordering , which we take from status -->
      <xsl:copy-of select="@*|*[ not( far:Columns or far:Ordering ) ]"/>
      <xsl:copy-of select="$layoutInStatus/far:Columns | $layoutInStatus/far:Ordering"/>
    </xsl:copy>
  </xsl:template>

  <!-- enhance dims/measures for configurator -->
  <xsl:template match="far:Configurator">
    <xsl:copy>
      <xsl:copy-of select="@*|node()"/>
      <!--
        references CategoryType in case one was enabled for grouping,
        when Categorization is not enabled, the Levels/Measures are copied in the order
        they appear in the document.

        If Categorization IS enabled, the order is defined by order of CategoryType,
        following by items which are not categorized in order they appear in the document.
      -->
      <xsl:variable name="categoryTypeId" select="far:CategoryGrouping/@idRef"/>
      <xsl:variable name="categoryType" select="$categoriesModel//dm:CategoryType[@id = $categoryTypeId]"/>

      <Dimensions>
        <xsl:choose>
          <xsl:when test="$categoryType">
            <!-- contains Levels all levels referenced by LevelRef or DimensionRef -->
            <xsl:variable name="dimRefs" select="../far:Dimensions/dm:DimensionRef"/>
            <xsl:variable name="levelRefs" select="../far:Dimensions/dm:LevelRef"/>
            <xsl:variable name="referencedLevels" select="$dimensionsModel/*//dm:Level[@bRef = $levelRefs/@bRef or ancestor::dm:Dimension[@id = $dimRefs/@idRef]]"/>

            <!-- build Categories referenced by dims -->
            <xsl:for-each select="$categoryType/dm:Category[@id = $referencedLevels/dm:Categories/@*[name() = $categoryTypeId]]">
              <Category idRef="{@id}" caption="{@caption}">
                <xsl:apply-templates select="$referencedLevels[dm:Categories/@*[name()=$categoryTypeId and . = current()/@id]]" mode="enhanceForConfigurator"/>
              </Category>
            </xsl:for-each>
            <!-- take remnants w/o Categories retain order of dimensionModel -->
            <xsl:apply-templates select="$referencedLevels[not(dm:Categories)]" mode="enhanceForConfigurator"/>
            <!-- take local remnants; dont check if they are available in dimensions repository -->
            <xsl:apply-templates select="$levelRefs" mode="enhanceForConfigurator"/>
          </xsl:when>
          <xsl:otherwise>
            <!-- take over flat w/o categorization -->
            <xsl:apply-templates select="../far:Dimensions/*" mode="enhanceForConfigurator"/>
          </xsl:otherwise>
        </xsl:choose>
      </Dimensions>
      <Measures>
        <xsl:variable name="measures" select="../far:Measures/*"/>
        <xsl:choose>
          <xsl:when test="$categoryType">
            <!-- build Categories referenced by measures -->
            <xsl:for-each select="$categoryType/dm:Category[@id = $measures/dm:Categories/@*[name() = $categoryTypeId]]">
              <Category idRef="{@id}" caption="{@caption}">
                <xsl:apply-templates select="$measures[dm:Categories/@*[name()=$categoryTypeId and . = current()/@id]]" mode="enhanceForConfigurator"/>
              </Category>
            </xsl:for-each>
            <!-- take remnants w/o Categories retain order of definition -->
            <xsl:apply-templates select="$measures[not(dm:Categories)]" mode="enhanceForConfigurator"/>
          </xsl:when>
          <xsl:otherwise>
            <!-- take over flat w/o categorization -->
            <xsl:apply-templates select="$measures" mode="enhanceForConfigurator"/>
          </xsl:otherwise>
        </xsl:choose>
      </Measures>
    </xsl:copy>
  </xsl:template>

  <!--
    #### rewrite Measure, Level, LevelRef as Item ### 
   -->
  <xsl:template match="dm:Measure" mode="enhanceForConfigurator">
    <Item idRef="{@id}" caption="{concat(substring(@id,0,1 div string-length(@caption)),@caption)}"/>
  </xsl:template>
  <xsl:template match="dm:Level" mode="enhanceForConfigurator">
    <Item idRef="{@bRef}" caption="{concat(substring(@bRef,0,1 div string-length(@caption)),@caption)}"/>
  </xsl:template>
  <xsl:template match="dm:DimensionRef | dm:LevelRef" mode="enhanceForConfigurator">
    <xsl:choose>
      <xsl:when test="self::dm:DimensionRef">
        <!-- resolve dm:DimensionRef minus LevelRef already used locally -->
        <xsl:for-each select="$dimensionsModel/*//dm:Dimension[@id=current()/@idRef]//dm:Level[not( @id = current()/../dm:LevelRef/@bRef )]">
          <Item idRef="{@bRef}" caption="{concat(substring(@bRef,0,1 div string-length(@caption)),@caption)}"/>
        </xsl:for-each>
      </xsl:when>
      <xsl:otherwise><!-- LevelRef -->
        <Item idRef="{@bRef}" caption="{concat(substring(@bRef,0,1 div string-length(@caption)),@caption)}"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
  
  <!-- resolve captions against dimensions model where not available -->
  <xsl:template match="far:Configuration/far:Dimensions/dm:LevelRef[ not(@caption) ]">
    <xsl:variable name="level" select="$dimensionsModel/*//dm:Level[@bRef = current()/@bRef]"/>
    <dm:LevelRef bRef="{@bRef}" caption="{concat(substring(@bRef,0,1 div string-length($level/@caption)),$level/@caption)}"/>
  </xsl:template>
  <!-- resolve dm:DimensionRef minus LevelRef already used locally -->
  <xsl:template match="far:Configuration/far:Dimensions/dm:DimensionRef">
    <xsl:for-each select="$dimensionsModel/*//dm:Dimension[@id=current()/@idRef]//dm:Level[not( @id = current()/../dm:LevelRef/@bRef )]">
      <dm:LevelRef bRef="{@bRef}" caption="{concat(substring(@bRef,0,1 div string-length(@caption)),@caption)}"/>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="node()">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:apply-templates/>
    </xsl:copy>
  </xsl:template>
</xsl:stylesheet>