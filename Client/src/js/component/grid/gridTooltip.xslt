<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2019 BusinessCode GmbH, Germany

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
  Grid tooltip, shown the original value if the value was changed and lists any validation errors
  Also shows all wrs:A attributes, if any
  -->

<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:grid="http://www.businesscode.de/schema/bcdui/grid-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

<xsl:import href="../../../xslt/renderer/numberFormatting.xslt"/>
<xsl:import href="../../../xslt/stringUtil.xslt"/>

<xsl:output method="html" version="1.0" encoding="UTF-8" indent="no"/>

<xsl:key name="columnDefinitionLookupById" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>

<xsl:param name="bcdColIdent"/>
<xsl:param name="bcdRowIdent"/>
<xsl:param name="bcdI18nModel"/>

<xsl:param name="gridDefinition"/>
<xsl:param name="gridModelValidation" select="*[false()]"/> <!-- validateWrs.xslt output in stand-alone mode -->

<xsl:variable name="sqlTypes" select="document('../../../xslt/renderer/sqlTypes.xml')"/>

<xsl:variable name="cellPos"  select="number(key('columnDefinitionLookupById',$bcdColIdent)/@pos)"/>
<xsl:variable name="cellHead" select="/*/wrs:Header/wrs:Columns/wrs:C[@id=$bcdColIdent]"/>

<!--
  Overwrite this when specializing and importing this
 -->
<xsl:template match="/">
  <xsl:variable name="cell" select="/*/wrs:Data/wrs:*[@id=$bcdRowIdent]/wrs:C[$cellPos]"/>
  <xsl:variable name="attrs" select="$cell/@*[local-name()=$cellHead/wrs:A/@id]"/>

  <xsl:call-template name="showAttrs">
    <xsl:with-param name="cell" select="$cell"/>
    <xsl:with-param name="attrs" select="$attrs"/>
  </xsl:call-template>
</xsl:template>

<!--
  Default behavior, show attributes of associated wrs:C 
  Shows only if there are values to show
  Shows two columns, one with the value's caption and one with the value itself
 -->
<xsl:template name="showAttrs">
  <xsl:param name="cell"           select="/*/wrs:Data/wrs:*[@id=$bcdRowIdent]/wrs:C[$cellPos]"/>
  <xsl:param name="attrs"          select="$cell/@*[local-name()=$cellHead/wrs:A/@id]"/>
  <xsl:variable name="cellOrig"    select="/*/wrs:Data/wrs:*[@id=$bcdRowIdent]/wrs:O[$cellPos]"/>
  <xsl:variable name="cellCaption" select="$cellHead/@caption"/>
  <xsl:variable name="invalids"    select="$gridModelValidation/*/wrs:Wrs/wrs:Data/wrs:*[wrs:C[1]=$bcdRowIdent and wrs:C[2]=$bcdColIdent]"/>
  
  <xsl:variable name="cellOrigCaptionToValue">
    <xsl:choose>
      <xsl:when test="/*/wrs:Data/@isDocument='true'">[XML Data]</xsl:when>
      <xsl:when test="/*/wrs:Data/@mappedCaption != ''">
        <xsl:value-of select="/*/wrs:Data/@mappedCaption"/>
      </xsl:when>
      <xsl:when test="$cellHead/wrs:References[wrs:Wrs/wrs:Data/wrs:R]">
        <xsl:value-of select="$cellHead/wrs:References/wrs:Wrs/wrs:Data/wrs:R[wrs:C[position()=2 and .=$cellOrig]]/wrs:C[1]"/>
      </xsl:when>
      <xsl:otherwise><xsl:value-of select="$cellOrig"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
 <xsl:variable name="cellCaptionToValue">
    <xsl:choose>
      <xsl:when test="/*/wrs:Data/@isDocument='true'">[XML Data]</xsl:when>
      <xsl:when test="/*/wrs:Data/@mappedCaption != ''">
        <xsl:value-of select="/*/wrs:Data/@mappedCaption"/>
      </xsl:when>
      <xsl:when test="$cellHead/wrs:References[wrs:Wrs/wrs:Data/wrs:R]">
        <xsl:value-of select="$cellHead/wrs:References/wrs:Wrs/wrs:Data/wrs:R[wrs:C[position()=2 and .=$cell]]/wrs:C[1]"/>
      </xsl:when>
      <xsl:otherwise><xsl:value-of select="$cell"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
 
    <!-- We return an empty output to prevent a tooltip if there is nothing to show -->
    <xsl:if test="$attrs or ($cellOrig and $cellOrig != $cell) or $invalids">

      <table class="bcdTooltip">

        <!-- Print each wrs:A attribute -->
        <xsl:for-each select="$attrs">
          <xsl:variable name="def" select="$cellHead/wrs:A[@id=local-name(current())]"/>
          <tr>
            <th>
              <xsl:copy-of select="$def/@bcdTranslate"/>
              <xsl:value-of select="$def/@caption"/>:
            </th>
            <td>
              <xsl:choose>
                <xsl:when test="$sqlTypes/*/rnd:Numeric/rnd:Type[@name=$def/@type-name]">
                  <xsl:call-template name="formatNumber">
                    <xsl:with-param name="columnDefinition" select="$def | $cell"/>
                  </xsl:call-template>
               </xsl:when>
                <xsl:otherwise>
                  <xsl:value-of select="."/>
                </xsl:otherwise>
              </xsl:choose>
            </td>
          </tr>
        </xsl:for-each>

      <!-- For modified cells, show its original value -->
      <xsl:if test="$cellOrig and $cellOrig != $cell">
        <tr>
          <th><xsl:value-of select="$bcdI18nModel/*/bcd_Edit_OrigValue"/></th>
          <td><xsl:value-of select="$cellOrigCaptionToValue"/></td>
        </tr>
      </xsl:if>

      <!-- For invalid cells, show the errors -->
      <xsl:for-each select="$invalids">
        <tr>
          <th>
            <xsl:choose>
              <xsl:when test="$bcdI18nModel/*/*[local-name(.)=current()/wrs:C[3]]!=''"><xsl:value-of select="$bcdI18nModel/*/*[local-name(.)=current()/wrs:C[3]]"/></xsl:when>
              <xsl:otherwise><xsl:value-of select="current()/wrs:C[3]"/></xsl:otherwise>
            </xsl:choose>
          </th>
          <td><xsl:value-of select="$cellCaptionToValue"/></td>
        </tr>
      </xsl:for-each>

    </table>

  </xsl:if>

</xsl:template>

</xsl:stylesheet>