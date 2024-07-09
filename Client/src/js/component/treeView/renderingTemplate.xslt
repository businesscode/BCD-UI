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
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"  
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:xi="http://www.w3.org/2001/XInclude"
  xmlns:generator="urn(bcd-xsltGenerator)">

  <xsl:import href="../../../xslt/stringUtil.xslt"/>
  <xsl:import href="../../../xslt/renderer/numberFormatting.xslt"/>
  <xsl:import href="../../widgetNg/widgetNg.xslt"/>

  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>

  <xsl:param name="guiStatus"/>

  <!--
    enables autoexpand of single elements on a level
   -->
  <xsl:param name="enableAutoexpand" select="'false'"/>
  <!--
    enables auto expand of all levels. 1 means nothing expanded, high numbers mean "all"
   -->
  <xsl:param name="autoExpandToLevel" select="'0'"/>

  <!--
    If true(), thead will name the dimension captions
   -->
  <xsl:param name="showDimHeaderCaptions" select="false()"/>

  <!--
    (Integer) The number of levels (including leaves).
   -->
  <xsl:param name="number_of_levels" select="count(/*/wrs:Header/wrs:Columns/wrs:C[@dimId])"/>

  <xsl:key name="colDefinitionLookup" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

  <xsl:variable name="sqlTypesDoc" select="document('../../../xslt/renderer/sqlTypes.xml')"/>
  <xsl:variable name="numericSQLTypes" select="$sqlTypesDoc/*/rnd:Numeric/rnd:Type/@name"/>
  <xsl:variable name="bcdOnLoad" select="''"/>

  <!-- If found, the parent/child hierarchy is derived from this information -->
  <xsl:variable name="parentChildColIdx" select="number(/*/wrs:Header/wrs:Columns/wrs:C[wrs:A[@id='parentId']]/@pos)"/>

  <xsl:variable name="emptyData">
    <xsl:call-template name="empty_td">
      <xsl:with-param name="n" select="count(/*/wrs:Header/wrs:Columns/wrs:C) - $number_of_levels"/>
      <xsl:with-param name="lastClass">bcdLast</xsl:with-param>
    </xsl:call-template>
  </xsl:variable>

  <xsl:template match="/">
    <xsl:choose>
      <xsl:when test="/*/wrs:Data/wrs:Level | /*/wrs:Data/wrs:R">
        <xsl:variable name="onLoad" select="concat('bcdui.component.treeView._registerTreeViewListener(&quot;', $bcdControllerVariableName, '&quot;);', $bcdOnLoad)"/>
        <div class="bcdTreeView" bcdOnLoad="{$onLoad}">
          <table class="{concat('bcdReport bcdTreeReport',substring('Pi',0,1div(not($parentChildColIdx))))}">

            <!-- Create thead with htmlHeaderBuilderTemplate -->
            <xsl:apply-templates select="/*/wrs:Header/wrs:Columns">
              <xsl:with-param name="extraStartColSpan" select="1 - boolean($parentChildColIdx)"/> <!-- No extra leading column for hide/close if we use parentChildColIdx and cannot know columns for hide/show button in advance -->
              <xsl:with-param name="hideDimHeaderCaptions" select="not($showDimHeaderCaptions='true')"/>
            </xsl:apply-templates>

            <tbody>
              <xsl:apply-templates select="/*/wrs:Data/wrs:Level | /*/wrs:Data/wrs:R" mode="content">
                <xsl:with-param name="indent" select="0"/>
                <xsl:sort select="@order" data-type="number"/>
              </xsl:apply-templates>
            </tbody>
          </table>
        </div>
      </xsl:when>
      <xsl:otherwise>
        <div class="bcdInfoBox"><span bcdTranslate="bcd_EmptyReport">Please note, no data is available for the current chooser settings.</span></div>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!--
    extension point:
    is called everytime a before new html tr element is created
    incoming params: indent:number, is_expanded:boolean
   -->
  <xsl:template match="wrs:Level" mode="onRowStart">
    <xsl:param name="indent"/>
    <xsl:param name="is_expanded"/>
  </xsl:template>

  <!--
    extension point:
    translates a dimension value
    params:
      columnPosition:number the column to translate
      token:string the original token to translate
    the default implementation prints out the token
    the result is wrapped by a TD element
   -->
  <xsl:template name="renderDimensionColumnToken">
    <xsl:param name="columnPosition"/>
    <xsl:param name="token"/>
    <xsl:value-of select="$token"/>
  </xsl:template>

  <!--
    extension point:
    is called everytime a before new html tr element is created on a leaf
    incoming params: indent:number
   -->
  <xsl:template match="wrs:R" mode="onRowStart">
    <xsl:param name="indent"/>
  </xsl:template>

  <!-- Create row for a leaf Level -->
  <xsl:template match="wrs:Level" mode="content">
    <xsl:param name="indent"/>

    <xsl:variable name="guiStatus_expanded"
      select="$guiStatus/*/rnd:TreeView[@idRef = $bcdControllerVariableName]/rnd:Exp[. = current()/@levelId]"/>
    <xsl:variable name="auto_expand"
      select="count(./wrs:Level) &lt; 2 and $enableAutoexpand = 'true'"/>
    <xsl:variable name="is_expanded"
      select="$guiStatus_expanded or $auto_expand or $autoExpandToLevel > count(ancestor-or-self::wrs:Level)"/>

    <xsl:variable name="levelPos" select="sum(preceding::wrs:Level[@isVisible = 'true']/@rowCount)+ sum(ancestor::wrs:Level[@isVisible = 'true']/@rowCount)"/>
    <xsl:variable name="hasLevelSiblings" select="boolean(../wrs:Level/wrs:Level)"/>

    <xsl:for-each select="wrs:R | wrs:Level[$is_expanded]">
      <xsl:variable name="newIndent" select="$indent + boolean(self::wrs:Level)"/>
      <xsl:variable name="localPos" select="position()"/>
      <xsl:apply-templates select="." mode="content">
        <xsl:with-param name="indent" select="$newIndent"/>
        <xsl:with-param name="parentPos" select="$levelPos"/>
        <xsl:with-param name="localPos"  select="$localPos"/>
        <xsl:with-param name="is_expanded" select="$is_expanded"/>
        <xsl:with-param name="hasLevelSiblings" select="$hasLevelSiblings"/>
        <xsl:with-param name="levelIdBeforeLeaf">        
          <xsl:choose>
            <xsl:when test="self::wrs:R"><xsl:value-of select="substring-before(concat(../@levelId,'___bcdLeaf'),'___bcdLeaf')"/></xsl:when>
            <xsl:otherwise><xsl:value-of select="substring-before(concat(@levelId,'___bcdLeaf'),'___bcdLeaf')"/></xsl:otherwise>
          </xsl:choose>          
        </xsl:with-param>
        <xsl:sort select="@order" data-type="number"/>
      </xsl:apply-templates>
    </xsl:for-each>
    
  </xsl:template>

  <!-- Create row from data, for each data row and each level, not having a row with data attached -->
  <xsl:template match="wrs:R | wrs:Level[not(*[position()=1 and self::wrs:R])]" mode="content">
    <xsl:param name="indent"/>
    <xsl:param name="levelIdBeforeLeaf"/>
    <xsl:param name="is_expanded"/>
    <xsl:param name="localPos"/>
    <xsl:param name="parentPos"/>
    <xsl:param name="hasLevelSiblings"/>

    <!-- In dim case (not($parentChildColIdx)), if we are the deepest level, in parentChildColIdx case, if there is no level below us (i.e. a wrs:Level follows us, being the wrs:R of the current level) -->
    <xsl:variable name="isLeaf" select="not(following-sibling::*[position()=1 and self::wrs:Level/wrs:R])"/>

    <xsl:apply-templates select="." mode="onRowStart">
      <xsl:with-param name="indent" select="$indent"/>
      <xsl:with-param name="is_expanded" select="$is_expanded"/>
    </xsl:apply-templates>

    <tr bcdRowIdent="{@id}">
      <xsl:attribute name="levelId">
        <xsl:choose>
          <xsl:when test="count(../wrs:R)=1"><xsl:value-of select="$levelIdBeforeLeaf"/></xsl:when>
          <xsl:when test="$parentChildColIdx"><xsl:value-of select="concat($levelIdBeforeLeaf,'___',wrs:C[$parentChildColIdx])"/></xsl:when>          
          <xsl:otherwise><xsl:value-of select="concat(../../@levelId,'___',wrs:C[$number_of_levels])"/></xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
      <xsl:attribute name="pos"><xsl:value-of select="$localPos"/></xsl:attribute>
      <xsl:attribute name="class">
        <xsl:choose>
          <xsl:when test="$isLeaf"> bcdLeaf </xsl:when>
          <xsl:otherwise> bcdNoLeaf </xsl:otherwise>
        </xsl:choose>
        <xsl:value-of select="concat('bcdLevel', $indent)"/>
        <xsl:if test="not(preceding::wrs:R)">
          <xsl:value-of select="' bcdFirstRow'"/>
        </xsl:if>
        <xsl:value-of select="concat(' bcdReport',substring-before(concat(substring('Even ',0,1 div (($parentPos+$localPos) mod 2=0)),'Odd '),' '))"/>
        <xsl:value-of select="concat(' bcdReportParent',substring-before(concat(substring('Even ',0,1 div ($parentPos mod 2=0)),'Odd '),' '))"/>
      </xsl:attribute>
      <xsl:if test="not($parentChildColIdx) and $indent > 0">
        <td class="bcdEmpty bcdIndent" colspan="{$indent}">&#160;</td>
      </xsl:if>
      
      <!-- +/-, but we create no extra +/- column if we have an unknown recursion-depth due to parentChildColIdx -->
      <xsl:if test="not($parentChildColIdx)">
        <td levelId="{../@levelId}" isExpended="{$is_expanded}" rendererId="{$bcdControllerVariableName}">
          <xsl:attribute name="class">
            <xsl:choose>
              <xsl:when test="$isLeaf">bcdExpandCollapseButton bcdIndent bcdEmpty</xsl:when>
              <xsl:when test="$is_expanded">bcdExpandCollapseButton bcdCollapse</xsl:when>
              <xsl:otherwise>bcdExpandCollapseButton bcdExpand</xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>
          <xsl:choose>
            <xsl:when test="not($isLeaf)">
              <xsl:call-template name="buttonNg">
                <xsl:with-param name="onClickAction">bcdui.component.treeView._toggleAction</xsl:with-param>
              </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>&#160;</xsl:otherwise>
          </xsl:choose>
        </td>
      </xsl:if>

      <!-- The dimension caption -->
      <td class="{concat('bcdCaption bcdIndent',$indent)}">
        <xsl:if test="not($parentChildColIdx)">
          <xsl:attribute name="colspan">
            <xsl:value-of select="$number_of_levels - $indent"/>
          </xsl:attribute>
        </xsl:if>
        <xsl:copy-of select="@bcdTranslate"/>

        <!-- In case of parentChildColIdx +/- is inlined into the caption. We reserve space (bcdPlusSpan) for each level which has at least one +- button -->
        <span levelId="{../@levelId}" isExpended="{$is_expanded}" rendererId="{$bcdControllerVariableName}">
          <xsl:attribute name="class">
            <xsl:choose>
              <xsl:when test="$isLeaf">bcdExpandCollapseButton </xsl:when>
              <xsl:when test="$is_expanded">bcdExpandCollapseButton bcdCollapse </xsl:when>
              <xsl:otherwise>bcdExpandCollapseButton bcdExpand </xsl:otherwise>
            </xsl:choose>
            <xsl:value-of select="substring('bcdPlusSpan',0,1 div not($parentChildColIdx and $hasLevelSiblings))"/>
          </xsl:attribute>
          <xsl:choose>
            <xsl:when test="not($isLeaf)  and $parentChildColIdx">
              <xsl:call-template name="buttonNg">
                <xsl:with-param name="onClickAction">bcdui.component.treeView._toggleAction</xsl:with-param>
              </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>&#160;</xsl:otherwise>
          </xsl:choose>
        </span>

        <xsl:variable name="columnPositionStr">
          <xsl:choose>
            <xsl:when test="$parentChildColIdx"><xsl:value-of select="1"/></xsl:when>
            <xsl:otherwise><xsl:value-of select="$indent + 1"/></xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:variable name="columnPosition" select="number($columnPositionStr)"/>
        <xsl:variable name="token">
          <xsl:choose>
            <xsl:when test="wrs:C[$columnPosition]/@caption"><xsl:value-of select="wrs:C[$columnPosition]/@caption"/></xsl:when>
            <xsl:otherwise><xsl:value-of select="wrs:C[$columnPosition]"/></xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:call-template name="renderDimensionColumnToken">
          <xsl:with-param name="c" select="wrs:C[$columnPosition]"/>
          <xsl:with-param name="columnPosition" select="$columnPosition"/>
          <xsl:with-param name="token" select="$token"/>
        </xsl:call-template>
      </td>

      <!-- Data, if the level has it, otherwise (wrs:Level has no associated wrs:R[1] but only wrs:Level) we only show the levels caption -->
      <xsl:choose>
        <xsl:when test="wrs:C">
          <!-- Data values -->
          <xsl:choose>
            <xsl:when test="$parentChildColIdx"><xsl:apply-templates select="wrs:C[position() > 1]"/></xsl:when>
            <xsl:otherwise><xsl:apply-templates select="wrs:C[position() > $number_of_levels]"/></xsl:otherwise>
          </xsl:choose>
        </xsl:when>
        <xsl:otherwise>
          <xsl:copy-of select="$emptyData"/>
        </xsl:otherwise>
      </xsl:choose>
    </tr>

    <xsl:apply-templates select="wrs:Level" mode="content">
      <xsl:with-param name="indent" select="$indent + 1"/>
    </xsl:apply-templates>

  </xsl:template>



  <!-- Create a wrs:C -->
  <xsl:template match="wrs:C">
    <xsl:variable name="precedingColCount"><xsl:number/></xsl:variable>
    <xsl:variable name="columnDefinition" select="key('colDefinitionLookup', $precedingColCount)"/>
    <xsl:variable name="isNumeric" select="$columnDefinition/@type-name = $numericSQLTypes or @type-name = $numericSQLTypes"/>
    <xsl:variable name="class">
      <xsl:if test="position() = last()">
        <xsl:value-of select="' bcdLast '"/>
      </xsl:if>
    </xsl:variable>
    <td>
      <xsl:copy-of select="@bcdTranslate"/>
      <xsl:choose>
        <xsl:when test="$isNumeric">
          <xsl:attribute name="class"><xsl:value-of select="$class"/> bcdNumber </xsl:attribute>
          <xsl:call-template name="formatNumber">
            <xsl:with-param name="columnDefinition" select="$columnDefinition"/>
          </xsl:call-template>
        </xsl:when>
        <xsl:otherwise>
          <xsl:if test="normalize-space($class)">
            <xsl:attribute name="class"><xsl:value-of select="$class"/></xsl:attribute>
          </xsl:if>
          <xsl:choose>
            <xsl:when test=".!=''"><xsl:value-of select="."/></xsl:when>
            <xsl:otherwise>&#160;</xsl:otherwise>
          </xsl:choose>
        </xsl:otherwise>
      </xsl:choose>
    </td>
  </xsl:template>

  <!-- Create n empty <td> elements  -->
  <xsl:template name="empty_td">
    <xsl:param name="n"/>
    <xsl:param name="elementName">td</xsl:param>
    <xsl:param name="lastClass"/>

    <xsl:if test="$n > 0">
      <xsl:element name="{$elementName}">
        <xsl:attribute name="class">
          <xsl:if test="$n = 1">
            <xsl:value-of select="$lastClass"/>
          </xsl:if>
          <xsl:text> bcdEmpty </xsl:text>
        </xsl:attribute>
        &#160;
      </xsl:element>
      <xsl:call-template name="empty_td">
        <xsl:with-param name="n" select="$n - 1"/>
        <xsl:with-param name="elementName" select="$elementName"/>
        <xsl:with-param name="lastClass" select="$lastClass"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>

</xsl:stylesheet>