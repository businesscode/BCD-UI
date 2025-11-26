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
<!--  Takes the grid's configuration and build a Wrq from it -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:grid="http://www.businesscode.de/schema/bcdui/grid-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  xmlns:exslt="http://exslt.org/common"
  exclude-result-prefixes="exslt msxsl">

  <xsl:import href="../../../xslt/stringUtil.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" />

  <xsl:param name="statusModel" select="/*[1=0]"/>
  <xsl:param name="binding"/>
  <xsl:param name="bRefs" />
  <xsl:param name="gridModelId"/>

  <xsl:variable name="bRefsStr">
    <xsl:call-template name="tokenize">
      <xsl:with-param name="string" select="$bRefs" />
      <xsl:with-param name="delimiter" select="' '" />
    </xsl:call-template>
  </xsl:variable>
  <xsl:variable name="bRefTokens" select="exslt:node-set($bRefsStr)" />

  <xsl:variable name="excludedStatusFilterBrefs" select="/*/grid:SelectColumns/grid:FilterExclude/@bRefs"/>

  <xsl:template match="/*">

    <wrq:WrsRequest>
      <wrq:Select>
        <wrq:Columns>
          <xsl:for-each select="$bRefTokens/wrs:Wrs/wrs:Data/wrs:R[wrs:C[.!='']]">
            <wrq:C bRef="{./wrs:C}" />
          </xsl:for-each>
        </wrq:Columns>
        <wrq:From>
          <wrq:BindingSet><xsl:value-of select="$binding"/></wrq:BindingSet>
        </wrq:From>
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
        </f:Filter>
        <wrq:Grouping>
          <xsl:for-each select="$bRefTokens/wrs:Wrs/wrs:Data/wrs:R[wrs:C[.!='']]">
            <wrq:C bRef="{./wrs:C}" />
          </xsl:for-each>
        </wrq:Grouping>
        <wrq:Ordering>
          <xsl:for-each select="$bRefTokens/wrs:Wrs/wrs:Data/wrs:R[wrs:C[.!='']]">
            <wrq:C bRef="{./wrs:C}" />
          </xsl:for-each>
        </wrq:Ordering>
      </wrq:Select>
    </wrq:WrsRequest>

  </xsl:template>

</xsl:stylesheet>