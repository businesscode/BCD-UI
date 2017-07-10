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
  Takes bcdRowIdent and bcdColIdent and creates a filter from the dimensions
  Can be easily imported and overwritten for filters on specific levels
  Supports the following measure defintions:
  1) A single-measure calc, measure does not influence the export filter
  2) A multi-measure calc, and an dm:DetailExport/dm:Filter is defined
  3) A i/t calc, then we we filter on t=0 and t=1

  Input model is the Cube's data (already grouped as rendered), plus params, see below
 -->
<xsl:stylesheet version="1.0"
  xmlns:dim="http://www.businesscode.de/schema/bcdui/dimension-1.0.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  exclude-result-prefixes="exslt msxsl">

  <!-- Creates filters from the cell position in the report (using bcdRow/ColIdent and the Wrs needs to be the input model)  -->
  <xsl:import href="cubeFilterFromCell.xslt"/>

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="cubeEnhancedConfiguration" select="/*[1=0]"/> <!-- Cube's internal enhanced configuration -->
  <xsl:param name="cubeOrigConfiguration" select="/*[1=0]"/> <!-- Cube's original configuration, with all measure definitions available -->

  <!-- Use this to externally control sets of export, for example to provide 2 different exports in context menu for an item via "chainParameters: { scope: 2 }" -->
  <xsl:param name="scope" select="''"/>

  <xsl:key name="allValueLevelRefs" match="//calc:ValueRef | //dm:LevelRef" use="(@idRef | @bRef)"/>
  <xsl:variable name="colDef" select="/*/wrs:Header/wrs:Columns/wrs:C[@id=$bcdColIdent]"/>
  <xsl:variable name="measure" select="$cubeEnhancedConfiguration/*/cube:Layout/cube:Measures//dm:Measure[@id=($colDef/@valueId|$colDef/@id)]"/>

  <xsl:param name="detailData"         select="$measure/dm:DetailData[not(@scope) or @scope=$scope][1]"/>
  <!-- Defaults: name and scope both need to match or to be empty -->
  <xsl:param name="detailDataDefaults" select="$cubeOrigConfiguration/*/dm:DetailDataDefaults/dm:DetailData[(not(@name) or @name=$detailData/@defaults) and (not(@scope) or @scope=$scope)][1]"/>

  <xsl:variable name="bindingSet">
    <xsl:choose>
      <xsl:when test="$detailData/dm:Translations/@bindingSet">
        <xsl:value-of select="$detailData/dm:Translations/@bindingSet"/>
      </xsl:when>
      <xsl:when test="$detailDataDefaults/dm:Translations/@bindingSet">
        <xsl:value-of select="$detailDataDefaults/dm:Translations/@bindingSet"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$cubeEnhancedConfiguration/*/wrq:BindingSet"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:variable>


  <xsl:template match="/">
    <!--  Check that we have a valid export definition. -->
    <wrq:WrsRequest>
      <wrq:Select>
        <wrq:Columns>
          <xsl:choose>
            <!-- build Column list by taking over bRef and caption attributes only (SYLK does not handle more anyway) -->
            <xsl:when test="$detailData/dm:Columns or $detailDataDefaults/dm:PrependColumns or $detailDataDefaults/dm:AppendColumns">
              <xsl:copy-of select="$detailDataDefaults/dm:PrependColumns/*"/>
              <xsl:copy-of select="$detailData/dm:Columns/*"/>
              <xsl:copy-of select="$detailDataDefaults/dm:AppendColumns/*"/>
            </xsl:when>
            <xsl:otherwise>
              <!-- Or use: all dimensions and measures available to the user, dims first
                   TODO (not just selected from enhanced config) -->
              <xsl:for-each select="$cubeEnhancedConfiguration//dm:LevelRef[generate-id()=generate-id(key('allValueLevelRefs',@bRef))]">
                <wrq:C><xsl:copy-of select="@bRef|@caption"/></wrq:C>
              </xsl:for-each>
              <xsl:for-each select="$cubeEnhancedConfiguration//calc:ValueRef[generate-id()=generate-id(key('allValueLevelRefs',@idRef))]">
                <wrq:C bRef="{@idRef}"/>
              </xsl:for-each>
            </xsl:otherwise>
          </xsl:choose>
        </wrq:Columns>

        <wrq:From>
          <wrq:BindingSet><xsl:value-of select="$bindingSet"/></wrq:BindingSet>
        </wrq:From>

        <f:Filter>
          <xsl:apply-templates select="$cellAndGuiStatusFilter/*/f:Filter/*"/> <!-- Derived from guiStatus and cell -->
          <xsl:copy-of select="$measure/dm:DetailData/f:Filter/*"/>
        </f:Filter>

      </wrq:Select>
    </wrq:WrsRequest>
  </xsl:template>

</xsl:stylesheet>