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
  Quite generic tool-tip for a cube
  Showing each value for measures with multi-value formulas in the format string, otherwise empty
  -->

<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

<xsl:import href="../../../xslt/renderer/filterFromCell.xslt"/>
<xsl:import href="../../../xslt/renderer/numberFormatting.xslt"/>


<xsl:output method="html" version="1.0" encoding="UTF-8" indent="no"/>

<xsl:key name="colDefByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>
<xsl:key name="colDefById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>

<!-- We rely on the fact that only those keys are actually created, which are actually used
  Format is '|' + 'true' for total, 'false' otherwise + ':' + dimMemberValue. Dim member Value is empty for total and [Empty]
  -->
<xsl:key name="row1Dim"  match="/*/wrs:Data/wrs:R" use="concat('|',wrs:C[1]/@bcdGr='1',':',wrs:C[1])"/>
<xsl:key name="row2Dim"  match="/*/wrs:Data/wrs:R" use="concat('|',wrs:C[1]/@bcdGr='1',':',wrs:C[1],'|',wrs:C[2]/@bcdGr='1',':',wrs:C[2])"/>
<xsl:key name="row3Dim"  match="/*/wrs:Data/wrs:R" use="concat('|',wrs:C[1]/@bcdGr='1',':',wrs:C[1],'|',wrs:C[2]/@bcdGr='1',':',wrs:C[2],'|',wrs:C[3]/@bcdGr='1',':',wrs:C[3])"/>
<xsl:key name="row4Dim"  match="/*/wrs:Data/wrs:R" use="concat('|',wrs:C[1]/@bcdGr='1',':',wrs:C[1],'|',wrs:C[2]/@bcdGr='1',':',wrs:C[2],'|',wrs:C[3]/@bcdGr='1',':',wrs:C[3],'|',wrs:C[4]/@bcdGr='1',':',wrs:C[4])"/>
<xsl:key name="row5Dim"  match="/*/wrs:Data/wrs:R" use="concat('|',wrs:C[1]/@bcdGr='1',':',wrs:C[1],'|',wrs:C[2]/@bcdGr='1',':',wrs:C[2],'|',wrs:C[3]/@bcdGr='1',':',wrs:C[3],'|',wrs:C[4]/@bcdGr='1',':',wrs:C[4],'|',wrs:C[5]/@bcdGr='1',':',wrs:C[5])"/>
<xsl:key name="row6Dim"  match="/*/wrs:Data/wrs:R" use="concat('|',wrs:C[1]/@bcdGr='1',':',wrs:C[1],'|',wrs:C[2]/@bcdGr='1',':',wrs:C[2],'|',wrs:C[3]/@bcdGr='1',':',wrs:C[3],'|',wrs:C[4]/@bcdGr='1',':',wrs:C[4],'|',wrs:C[5]/@bcdGr='1',':',wrs:C[5],'|',wrs:C[6]/@bcdGr='1',':',wrs:C[6])"/>
<xsl:key name="row7Dim"  match="/*/wrs:Data/wrs:R" use="concat('|',wrs:C[1]/@bcdGr='1',':',wrs:C[1],'|',wrs:C[2]/@bcdGr='1',':',wrs:C[2],'|',wrs:C[3]/@bcdGr='1',':',wrs:C[3],'|',wrs:C[4]/@bcdGr='1',':',wrs:C[4],'|',wrs:C[5]/@bcdGr='1',':',wrs:C[5],'|',wrs:C[6]/@bcdGr='1',':',wrs:C[6],'|',wrs:C[7]/@bcdGr='1',':',wrs:C[7])"/>
<xsl:key name="row8Dim"  match="/*/wrs:Data/wrs:R" use="concat('|',wrs:C[1]/@bcdGr='1',':',wrs:C[1],'|',wrs:C[2]/@bcdGr='1',':',wrs:C[2],'|',wrs:C[3]/@bcdGr='1',':',wrs:C[3],'|',wrs:C[4]/@bcdGr='1',':',wrs:C[4],'|',wrs:C[5]/@bcdGr='1',':',wrs:C[5],'|',wrs:C[6]/@bcdGr='1',':',wrs:C[6],'|',wrs:C[7]/@bcdGr='1',':',wrs:C[7],'|',wrs:C[8]/@bcdGr='1',':',wrs:C[8])"/>
<xsl:key name="row9Dim"  match="/*/wrs:Data/wrs:R" use="concat('|',wrs:C[1]/@bcdGr='1',':',wrs:C[1],'|',wrs:C[2]/@bcdGr='1',':',wrs:C[2],'|',wrs:C[3]/@bcdGr='1',':',wrs:C[3],'|',wrs:C[4]/@bcdGr='1',':',wrs:C[4],'|',wrs:C[5]/@bcdGr='1',':',wrs:C[5],'|',wrs:C[6]/@bcdGr='1',':',wrs:C[6],'|',wrs:C[7]/@bcdGr='1',':',wrs:C[7],'|',wrs:C[8]/@bcdGr='1',':',wrs:C[8],'|',wrs:C[9]/@bcdGr='1',':',wrs:C[9])"/>
<xsl:key name="row10Dim" match="/*/wrs:Data/wrs:R" use="concat('|',wrs:C[1]/@bcdGr='1',':',wrs:C[1],'|',wrs:C[2]/@bcdGr='1',':',wrs:C[2],'|',wrs:C[3]/@bcdGr='1',':',wrs:C[3],'|',wrs:C[4]/@bcdGr='1',':',wrs:C[4],'|',wrs:C[5]/@bcdGr='1',':',wrs:C[5],'|',wrs:C[6]/@bcdGr='1',':',wrs:C[6],'|',wrs:C[7]/@bcdGr='1',':',wrs:C[7],'|',wrs:C[8]/@bcdGr='1',':',wrs:C[8],'|',wrs:C[9]/@bcdGr='1',':',wrs:C[9],'|',wrs:C[10]/@bcdGr='1',':',wrs:C[10])"/>

<xsl:param name="bcdRowIdent"/>
<xsl:param name="bcdColIdent"/>
<xsl:param name="preCalcData"/>
<xsl:param name="cubeEnhancedConfiguration"/>
<xsl:param name="bcdI18nModel" select="*[false()]"/>


<xsl:variable name="filterFromCellIncludebcdGr" select="true()"/>
<xsl:variable name="doc" select="."/>
<xsl:variable name="colDef" select="/*/wrs:Header/wrs:Columns/wrs:C[@id=$bcdColIdent]"/>
<!-- Plain row is just any row matching the row dines, ignoring the coldim -->
<xsl:variable name="plainRow" select="/*/wrs:Data/wrs:*[@id=$bcdRowIdent]"/>
<xsl:variable name="precalcedRowId"><xsl:call-template name="findMatchingPrecalcedRowAnd"/></xsl:variable>

<!-- Precalced row is exactly the row matching row and col dims of the cell -->
<xsl:variable name="precalcedRow" select="$preCalcData/*/wrs:Data/wrs:*[@id=$precalcedRowId]"/>
<xsl:variable name="measure"  select="$cubeEnhancedConfiguration/*/cube:Layout/cube:Measures//dm:Measure[@id=($colDef/@valueId|$colDef/@id)]"/>

<!--
  Prints a table if the definition of the cell's measure references multiple values
  Otherwise empty -> no tooltip
 -->
<xsl:template match="/">
  <xsl:variable name="rowVdm" select="$cubeEnhancedConfiguration/*/cube:Layout/cube:Dimensions//cube:VDM[@id=$plainRow/@bcdVdm]"/>
  <xsl:choose>

    <!-- Row virtual dimension member -->
    <xsl:when test="$colDef/@dimId=$rowVdm/../@bRef">
      <table class="bcdTooltip">
        <tr>
          <th>F(x):</th>
          <td>
            <xsl:value-of select="$rowVdm/@userInput"/>
          </td>
        </tr>
      </table>
    </xsl:when>

    <!-- Column virtual dimension member -->
    <xsl:when test="not($bcdRowIdent) and $colDef/@bcdVdm">
      <table class="bcdTooltip">
        <tr>
          <th>F(x):</th>
          <td>
            <xsl:value-of select="$cubeEnhancedConfiguration/*/cube:Layout/cube:Dimensions//cube:VDM[@id=$colDef/@bcdVdm]/@userInput"/>
          </td>
        </tr>
      </table>
    </xsl:when>

    <!-- Virtual measure (i.e. user calc) -->
    <xsl:when test="$bcdRowIdent='bcdMeasureHeader' and $colDef/@bcdVmeas">
      <table class="bcdTooltip">
        <tr>
          <th>F(x):</th>
          <td>
            <xsl:value-of select="$measure/@userInput"/>
          </td>
        </tr>
      </table>
    </xsl:when>

    <!-- A measure with a formula -->
    <xsl:when test="$bcdRowIdent and $bcdRowIdent!='bcdMeasureHeader' and not($colDef/@dimId) and count($measure/calc:Calc//*[self::calc:ValueRef or self::calc:Value])>0 ">
      <xsl:if test="not($measure/@hideToolTip) or $measure/@hideToolTip='false'">
        <table class="bcdTooltip">
          <thead>
            <tr>
              <th colspan="2"><xsl:value-of select="$measure/@caption"/></th>
            </tr>
          </thead>

          <!-- Now we have the row, print each value which is part of the measure -->
          <xsl:if test="$precalcedRow">
            <xsl:for-each select="$measure/calc:Calc//calc:ValueRef">
              <xsl:variable name="valueRef" select="."/>
              <xsl:variable name="pos" select="position()"/>

                <xsl:variable name="measureCaption" select="$cubeEnhancedConfiguration/*/cube:Layout/cube:Measures//dm:Measure[@id=substring-after($valueRef/@idRef, '|')]/@caption"/>

                <xsl:choose>
                  <xsl:when test="starts-with($valueRef/@idRef, '&#xE0F0;1C')">
                    <tr><th><xsl:value-of select="concat($measureCaption, ' [', $bcdI18nModel/*/bcd_SubTotal, 'OfCol]')"/></th><td></td></tr>
                  </xsl:when>
                  <xsl:when test="starts-with($valueRef/@idRef, '&#xE0F0;1R')">
                    <tr><th><xsl:value-of select="concat($measureCaption, ' [', $bcdI18nModel/*/bcd_SubTotal, 'OfRow]')"/></th><td></td></tr>
                  </xsl:when>
                  <xsl:when test="starts-with($valueRef/@idRef, '&#xE0F0;2C')">
                    <tr><th><xsl:value-of select="concat($measureCaption, ' [', $bcdI18nModel/*/bcd_Total, 'OfCol]')"/></th><td></td></tr>
                  </xsl:when>
                  <xsl:when test="starts-with($valueRef/@idRef, '&#xE0F0;2R')">
                    <tr><th><xsl:value-of select="concat($measureCaption, ' [', $bcdI18nModel/*/bcd_Total, 'OfRow]')"/></th><td></td></tr>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:for-each select="$preCalcData">
                      <xsl:variable name="colDef" select="key('colDefById',$valueRef/@idRef)"/>
                      <tr>
                        <th>
                          <xsl:choose>
                          <xsl:when test="starts-with($valueRef/@idRef, 'bcd_')">
                            <xsl:choose>
                              <xsl:when test="count($valueRef//@caption)=1"><xsl:value-of select="$valueRef//@caption"/></xsl:when>
                              <xsl:otherwise><xsl:value-of select="concat('F(x)[', $pos, ']')"/></xsl:otherwise>
                            </xsl:choose>
                          </xsl:when>
                          <xsl:otherwise>
                            <xsl:value-of select="$valueRef/@caption | $colDef/@caption"/>
                          </xsl:otherwise>
                          </xsl:choose>
                        </th>
                        <td>
                          <xsl:call-template name="formatNumber">
                            <xsl:with-param name="columnDefinition" select="$colDef"/>
                            <xsl:with-param name="value" select="$precalcedRow/wrs:C[position()=$colDef/@pos]"/>
                          </xsl:call-template>
                        </td>
                      </tr>
                    </xsl:for-each>
                </xsl:otherwise>
              </xsl:choose>
            </xsl:for-each>
            <xsl:for-each select="$measure/calc:Calc//calc:Value">
              <tr>
                <th>(Const.)</th>
                <td>
                  <xsl:value-of select="."/>
                </td>
              </tr>
            </xsl:for-each>
          </xsl:if>

          <!-- Footer showing the dimensions of the cell -->
          <xsl:if test="$cellFilter/*/*">
            <tr>
              <td colspan="2" class="bcdFooter">
                <xsl:text>( </xsl:text>
                <xsl:for-each select="$cellFilter/*/*">
                  <xsl:choose>
                    <xsl:when test="@bcdGr='1'">&#x2211;</xsl:when>
                    <xsl:when test="@value='&#xE0F0;0'"><span bcdTranslate="bcd_EmptyDimmember"></span></xsl:when>
                    <xsl:otherwise><xsl:value-of select="@value"/></xsl:otherwise>
                  </xsl:choose>
                  <xsl:if test="not(position()=last())"> / </xsl:if>
                </xsl:for-each>
                <xsl:text> )</xsl:text>
              </td>
            </tr>
          </xsl:if>

          <!-- Formula of user measure -->
          <xsl:if test="$measure/@userInput">
            <tr>
              <th>F(x):</th>
              <td><xsl:value-of select="$measure/@userInput"/></td>
            </tr>
          </xsl:if>
          <xsl:if test="$colDef/@bcdVdm">
            <tr>
              <th>F(x):</th>
              <td>
                <xsl:value-of select="$cubeEnhancedConfiguration/*/cube:Layout/cube:Dimensions//cube:VDM[@id=$colDef/@bcdVdm]/@userInput"/>
              </td>
            </tr>
          </xsl:if>
          <xsl:if test="$rowVdm/../@bRef">
            <tr>
              <th>F(x):</th>
              <td>
                <xsl:value-of select="$rowVdm/@userInput"/>
              </td>
            </tr>
          </xsl:if>

        </table>
        </xsl:if>
    </xsl:when>

  </xsl:choose>
</xsl:template>

<!--
  Finds the row in the pre-calced data which matched the dimensions of $cellFilter (i.e. current cell) and returns its wrs:R/@id
  -->
<xsl:template name="findMatchingPrecalcedRowAnd">
  <xsl:for-each select="$preCalcData"> <!-- Switch context for keys and loop -->
    <xsl:variable name="rowKey">
      <xsl:value-of select="concat('row',count(/*/wrs:Header/wrs:Columns/wrs:C[@dimId]),'Dim')"/>
    </xsl:variable>
    <!-- Here we create the key of the searched row. for format see key definition above -->
    <xsl:variable name="rowKeyValue">
      <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[@dimId]">
        <xsl:choose>
          <xsl:when test="$cellFilter/*/*[@bRef=current()/@dimId and (not(@bcdGr) or @bcdGr!='1')]">
            <xsl:choose>
              <xsl:when test="$cellFilter/*/*[@bRef=current()/@dimId]/@value='&#xE0F0;0'">|false:</xsl:when>
              <xsl:otherwise><xsl:value-of select="concat('|false:',$cellFilter/*/*[@bRef=current()/@dimId]/@value)"/></xsl:otherwise>
            </xsl:choose>
          </xsl:when>
          <xsl:otherwise>
            <xsl:text>|true:</xsl:text>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>
    </xsl:variable>
    <xsl:choose>
      <xsl:when test="$rowKeyValue and $rowKeyValue != '' and $rowKey and $rowKeyValue != ''">
        <xsl:value-of select="key($rowKey,$rowKeyValue)/@id"/>
      </xsl:when>
      <xsl:otherwise>-1</xsl:otherwise>
    </xsl:choose>
  </xsl:for-each>
</xsl:template>


</xsl:stylesheet>