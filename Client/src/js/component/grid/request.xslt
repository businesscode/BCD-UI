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
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  exclude-result-prefixes="exslt msxsl">

  <xsl:import href="bcduicp://bcdui/xslt/stringUtil.xslt"/>
  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set']= function (x) { return x; }</msxsl:script>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" />

  <xsl:param name="statusModel" select="/*[1=0]"/>
  <xsl:param name="pagerModel" select="/*[1=0]"/>
  <xsl:param name="keyColumnsServerSidedDp" select="/*[1=0]"/>
  <xsl:param name="serverSidedPagination"/>
  <xsl:param name="gridModelId"/>
  <xsl:param name="timeStampColumns"/>
  <xsl:param name="separatorColumns"/>
  <xsl:variable name="separatorColumnsStr"><xsl:call-template name="tokenize"><xsl:with-param name="string" select="$separatorColumns" /><xsl:with-param name="delimiter" select="'&#xe0f3;'" /></xsl:call-template></xsl:variable>
  <xsl:variable name="separatorColumnsTokens" select="exslt:node-set($separatorColumnsStr)" />

  <xsl:variable name="excludedStatusFilterBrefs" select="/*/grid:SelectColumns/grid:FilterExclude/@bRefs"/>
  <xsl:variable name="keyColsServerSidedStr"><xsl:call-template name="tokenize"><xsl:with-param name="string" select="$keyColumnsServerSidedDp" /><xsl:with-param name="delimiter" select="' '" /></xsl:call-template></xsl:variable>
  <xsl:variable name="keyColsServerSidedTokens" select="exslt:node-set($keyColsServerSidedStr)" />

  <xsl:variable name="doc" select="/"/>
 
  <xsl:template match="/*">

    <xsl:variable name="paginate" select="$pagerModel/*/xp:Paginate"/>
    <xsl:variable name="paginate.pageSize" select="$paginate/xp:PageSize"/>
    <xsl:variable name="paginate.pageNumber" select="$paginate/xp:PageNumber"/>
    <xsl:variable name="y2">
      <xsl:choose>
        <xsl:when test="$paginate.pageNumber = 'all'">-1</xsl:when>
        <xsl:otherwise><xsl:value-of select="number($paginate.pageSize) * number($paginate.pageNumber)"/></xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="y1">
     <xsl:choose>
        <xsl:when test="$paginate.pageNumber = 'all'">1</xsl:when>
        <xsl:otherwise><xsl:value-of select="number($y2) - number($paginate.pageSize) + 1"/></xsl:otherwise>
      </xsl:choose>
    </xsl:variable>

    <wrq:WrsRequest>
      <wrq:Select>
        <xsl:if test="$serverSidedPagination='true' and ($y2 + $y1) = ($y2 + $y1)">
          <xsl:if test="$y1 > 0 and $y2 > 0">
            <xsl:attribute name="rowStart"><xsl:value-of select="$y1"/></xsl:attribute>
          </xsl:if>
          <xsl:if test="$y2 > 0">
            <xsl:attribute name="rowEnd"><xsl:value-of select="$y2"/></xsl:attribute>
          </xsl:if>
        </xsl:if>
        <wrq:Columns>
          <xsl:for-each select="/*/grid:SelectColumns//grid:C">
            <wrq:C>
              <xsl:copy-of select="@*"/>
              <xsl:copy-of select="wrq:A"/>
            </wrq:C>
          </xsl:for-each>
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
          <xsl:if test="$serverSidedPagination='true'">
            <xsl:apply-templates select="$statusModel/*/guiStatus:ClientSettings/guiStatus:ColumnFilters[@id=$gridModelId]/*" mode="columnFilter"/>
          </xsl:if>
        </f:Filter>
        <wrq:Ordering>
          <xsl:choose>
            <xsl:when test="$serverSidedPagination='true' and $statusModel/*/guiStatus:ClientSettings/guiStatus:ColumnSorting[@id=$gridModelId]">
              <wrq:C bRef="{$statusModel/*/guiStatus:ClientSettings/guiStatus:ColumnSorting[@id=$gridModelId]/@columnId}">
                <xsl:attribute name="order">
                  <xsl:choose>
                    <xsl:when test="$statusModel/*/guiStatus:ClientSettings/guiStatus:ColumnSorting[@id=$gridModelId]/@direction='ascending'">asc</xsl:when>
                    <xsl:otherwise>desc</xsl:otherwise>
                  </xsl:choose>
                </xsl:attribute>
              </wrq:C>
            </xsl:when>
            <xsl:otherwise>
              <xsl:for-each select="/*/grid:OrderColumns/grid:C">
                <wrq:C>
                  <xsl:copy-of select="@*"/>
                </wrq:C>
              </xsl:for-each>
            </xsl:otherwise>
          </xsl:choose>

          <!-- add key columns as additional sorting information when using serversided pagination -->
          <xsl:if test="$serverSidedPagination='true' and $keyColsServerSidedTokens/wrs:Wrs/wrs:Data/wrs:R">
            <xsl:variable name="colSort" select="$statusModel/*/guiStatus:ClientSettings/guiStatus:ColumnSorting[@id=$gridModelId]/@columnId"/>
            <xsl:variable name="configSort" select="/*/grid:OrderColumns/grid:C"/>
            <xsl:for-each select="$keyColsServerSidedTokens/wrs:Wrs/wrs:Data/wrs:R">
              <xsl:variable name="keybRef" select="."/>
              <xsl:choose>
                <xsl:when test="$colSort=$keybRef"></xsl:when>
                <xsl:when test="$configSort[@bRef=$keybRef]"></xsl:when>
                <xsl:otherwise><wrq:C bRef="{.}"/></xsl:otherwise>
              </xsl:choose>
            </xsl:for-each>
          </xsl:if>
        </wrq:Ordering>

        <!-- GROUP BY if requested -->
        <xsl:if test="/*/grid:SelectColumns/@isDistinct = 'true'">
          <wrq:Grouping>
            <xsl:for-each select="/*/grid:SelectColumns//grid:C">
              <wrq:C>
                <xsl:copy-of select="@*"/>
                <xsl:copy-of select="wrq:A"/>
              </wrq:C>
            </xsl:for-each>
          </wrq:Grouping>
        </xsl:if>
      </wrq:Select>
    </wrq:WrsRequest>

  </xsl:template>

  <xsl:template match="f:Expression" mode="columnFilter">
    <xsl:variable name="bRef" select="@bRef"/>
    <xsl:variable name="value" select="@value"/>
    <xsl:variable name="finalValue">
        <xsl:choose>
          <xsl:when test="contains($timeStampColumns, concat('&#xe0f2;', $bRef, '&#xe0f2;'))"><xsl:value-of select="translate($value, ' ', 'T')"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="$value"/></xsl:otherwise>
        </xsl:choose>
    </xsl:variable>

    <xsl:variable name="colIdx" select="count($doc/*/grid:SelectColumns//grid:C[@bRef=$bRef][preceding-sibling::grid:C]) + 1"/>
    <xsl:variable name="separator" select="$separatorColumnsTokens/wrs:Wrs/wrs:Data/wrs:R[position()=$colIdx]/wrs:C"/>

    <xsl:choose>
      <xsl:when test="$separator!=''">
        <f:Expression op="like" bRef="{$bRef}" value="{concat('*', $separator, $finalValue, $separator, '*')}"/>
        <f:Expression op="like" bRef="{$bRef}" value="{concat($finalValue, $separator, '*')}"/>
        <f:Expression op="like" bRef="{$bRef}" value="{concat('*', $separator, $finalValue)}"/>
        <f:Expression op="=" bRef="{$bRef}" value="{$finalValue}"/>
      </xsl:when>
      <xsl:otherwise>
        <f:Expression>
          <xsl:copy-of select="@*[not(local-name(.)='value')]"/>
          <xsl:attribute name="value"><xsl:value-of select="$finalValue"/></xsl:attribute>
          <xsl:apply-templates select="node()" mode="columnFilter"/>
        </f:Expression>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="@*|node()" mode="columnFilter">
    <xsl:copy><xsl:apply-templates select="@*|node()" mode="columnFilter"/></xsl:copy>
  </xsl:template>

</xsl:stylesheet>