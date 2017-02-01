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
  xmlns="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)" exclude-result-prefixes="generator">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />


  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:Join[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <generator:JoinColumns/> <!-- leftWrsCol and rightWrsCol -->

  <xsl:param name="rightIdPrefix" select="$paramSet/xp:Right/@idPrefix"/>

  <xsl:param name="rightCaptionPrefix" select="$paramSet/xp:Right/@captionPrefix"/>

  <xsl:param name="leftIdPrefix" select="$paramSet/xp:Left/@idPrefix"/>
  <xsl:param name="leftCaptionPrefix" select="$paramSet/xp:Left/@captionPrefix"/>

  <xsl:param name="makeLeftOuterJoin" select="$paramSet/@makeLeftOuterJoin"/>

  <xsl:param name="leftDoc"/>

  <xsl:param name="joinColumnIdPrefix" select="$paramSet/@joinColumnIdPrefix"/>
  <xsl:param name="joinColumnCaptionPrefix" select="$paramSet/@joinColumnIdPrefix"/>


  <xsl:param name="dimensions"/>
  <xsl:param name="paramModelDimensions" select="$paramSet/xp:Dimensions/wrs:Columns/wrs:C"/>

  <xsl:variable name="effDimensions">
    <xsl:value-of select="$dimensions"/>
    <xsl:for-each select="$paramModelDimensions">
      <xsl:if test="$leftDoc/*/wrs:Header/wrs:Columns/wrs:C[@id=current()/@id] and /*/wrs:Header/wrs:Columns/wrs:C[@id=current()/@id]">
        <xsl:value-of select="concat(@id,' ')"/>
      </xsl:if>
    </xsl:for-each>
  </xsl:variable>

  <generator:Keys/>

  <xsl:variable name="leftJoinColumnPositions" select="$leftDoc/*/wrs:Header/wrs:Columns/wrs:C[contains(concat(' ', normalize-space($leftWrsCol), ' '), concat(' ', @id, ' '))]/@pos"/>
  <xsl:variable name="rightJoinColumnPositions" select="/*/wrs:Header/wrs:Columns/wrs:C[contains(concat(' ', normalize-space($rightWrsCol), ' '), concat(' ', @id, ' '))]/@pos"/>

  <xsl:variable name="leftWrsColCount" select="count($leftDoc/*/wrs:Header/wrs:Columns/wrs:C)"/>

  <xsl:variable name="leftOuterJoin_boolean" select="string($makeLeftOuterJoin) = 'true'"/>

  <xsl:variable name="rightDoc" select="/"/>

  <xsl:template match="/">

    <xsl:variable name="leftJoinColumnCount" select="(string-length(translate(normalize-space($leftWrsCol), translate($leftWrsCol, ' ', ''), '')) + 1) * number(boolean(normalize-space($leftWrsCol)))"/>
    <xsl:variable name="rightJoinColumnCount" select="(string-length(translate(normalize-space($rightWrsCol), translate($rightWrsCol, ' ', ''), '')) + 1) * number(boolean(normalize-space($rightWrsCol)))"/>
    <xsl:choose>
      <xsl:when test="$leftJoinColumnCount != $rightJoinColumnCount">
        <xsl:call-template name="error">
          <xsl:with-param name="message">Left join column count (<xsl:value-of select="$leftJoinColumnCount"/>) does not match right join column count (<xsl:value-of select="$rightJoinColumnCount"/>).</xsl:with-param>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="$leftJoinColumnCount != count($leftJoinColumnPositions)">
        <xsl:call-template name="error">
          <xsl:with-param name="message"><xsl:value-of select="$leftJoinColumnCount - count($leftJoinColumnPositions)"/> join column(s) have not been found in left doc.</xsl:with-param>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="$rightJoinColumnCount != count($rightJoinColumnPositions)">
        <xsl:call-template name="error">
          <xsl:with-param name="message"><xsl:value-of select="$rightJoinColumnCount - count($rightJoinColumnPositions)"/> join column(s) have not been found in right doc.</xsl:with-param>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:apply-templates select="$leftDoc/*"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="error">
    <xsl:param name="message"/>
    <Wrs>
      <Header>
        <Columns>
          <C pos="1" id="error"/>
        </Columns>
      </Header>
      <Data>
        <R>
          <C>Error in parameters for joinWrs.xslt: <xsl:value-of select="$message"/></C>
        </R>
        <R><C/></R>
        <R><C>Parameters:</C></R>
        <R><C>rightWrsCol: <xsl:value-of select="$rightWrsCol"/></C></R>
        <R><C>rightIdPrefix: <xsl:value-of select="$rightIdPrefix"/></C></R>
        <R><C>rightCaptionPrefix: <xsl:value-of select="$rightCaptionPrefix"/></C></R>
        <R><C>leftWrsCol: <xsl:value-of select="$leftWrsCol"/></C></R>
        <R><C>leftIdPrefix: <xsl:value-of select="$leftIdPrefix"/></C></R>
        <R><C>leftCaptionPrefix: <xsl:value-of select="$leftCaptionPrefix"/></C></R>
        <R><C>joinColumnIdPrefix: <xsl:value-of select="$joinColumnIdPrefix"/></C></R>
        <R><C>joinColumnCaptionPrefix: <xsl:value-of select="$joinColumnCaptionPrefix"/></C></R>
        <R><C/></R>
        <R><C>Left columns:</C></R>
        <R><C><xsl:for-each select="$leftDoc/*/wrs:Header/wrs:Columns/wrs:C"><xsl:if test="position() > 1"><xsl:value-of select="' ,'"/></xsl:if><xsl:value-of select="concat(@id, ' (', @caption, ')')"/></xsl:for-each></C></R>
        <R><C>Right columns:</C></R>
        <R><C><xsl:for-each select="$rightDoc/*/wrs:Header/wrs:Columns/wrs:C"><xsl:if test="position() > 1"><xsl:value-of select="' ,'"/></xsl:if><xsl:value-of select="concat(@id, ' (', @caption, ')')"/></xsl:for-each></C></R>
      </Data>
    </Wrs>
  </xsl:template>

  <xsl:template match="@*|node()">
    <xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy>
  </xsl:template>

  <xsl:template match="@*|node()" mode="left">
    <xsl:copy><xsl:apply-templates select="@*|node()" mode="left"/></xsl:copy>
  </xsl:template>

  <xsl:template match="@*|node()" mode="right">
    <xsl:copy><xsl:apply-templates select="@*|node()" mode="right"/></xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Wrs">
    <wrs:Wrs xmlns="http://www.businesscode.de/schema/bcdui/wrs-1.0.0" xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
      xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0" xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0" 
      xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">
      <xsl:apply-templates select="@*|node()"/>
    </wrs:Wrs>
  </xsl:template>


  <xsl:template match="wrs:RequestDocument"/>

  <xsl:template match="wrs:Columns/wrs:C" mode="right">
    <xsl:param name="pos" select="0"/>
    <xsl:copy>
      <xsl:apply-templates select="@*" mode="right"/>
      <xsl:attribute name="pos">
        <xsl:value-of select="$pos"/>
      </xsl:attribute>
      <xsl:call-template name="captionAndIdWithPrefixes">
        <xsl:with-param name="idPrefix" select="$rightIdPrefix"/>
        <xsl:with-param name="captionPrefix" select="$rightCaptionPrefix"/>
      </xsl:call-template>
      <xsl:copy-of select="wrs:A"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Columns">
    <xsl:copy>
      <xsl:apply-templates select="$leftDoc/*/wrs:Header/wrs:Columns/wrs:C" mode="left"/>
      <xsl:for-each select="$rightDoc/*/wrs:Header/wrs:Columns/wrs:C[not(@pos = $rightJoinColumnPositions)]">
        <xsl:apply-templates select="." mode="right">
          <xsl:with-param name="pos" select="$leftWrsColCount + position()"/>
        </xsl:apply-templates>
      </xsl:for-each>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Columns/wrs:C" mode="left">
    <xsl:copy>
      <xsl:apply-templates select="$rightDoc/*/wrs:Header/wrs:Columns/wrs:C[@id=current()/@id]/@*"/>
      <xsl:apply-templates select="@*" mode="left"/>
      <xsl:choose>
        <xsl:when test="@pos = $leftJoinColumnPositions">
          <xsl:call-template name="captionAndIdWithPrefixes">
            <xsl:with-param name="idPrefix" select="$joinColumnIdPrefix"/>
            <xsl:with-param name="captionPrefix" select="$joinColumnCaptionPrefix"/>
          </xsl:call-template>
        </xsl:when>
        <xsl:otherwise>
          <xsl:call-template name="captionAndIdWithPrefixes">
            <xsl:with-param name="idPrefix" select="$leftIdPrefix"/>
            <xsl:with-param name="captionPrefix" select="$leftCaptionPrefix"/>
          </xsl:call-template>
        </xsl:otherwise>
      </xsl:choose>
      <xsl:copy-of select="wrs:A"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template name="captionAndIdWithPrefixes">
    <xsl:param name="idPrefix"/>
    <xsl:param name="captionPrefix"/>
    <xsl:if test="not(contains(concat(' ',normalize-space($dimensions),' '),concat(' ',@id,' ')))">
      <xsl:if test="string-length($idPrefix) > 0">
        <xsl:attribute name="id">
          <xsl:value-of select="concat($idPrefix, @id)"/>
        </xsl:attribute>
      </xsl:if>
      <xsl:if test="string-length($captionPrefix) > 0">
        <xsl:attribute name="caption">
          <xsl:choose>
            <xsl:when test="@caption"><xsl:value-of select="concat($captionPrefix, @caption)"/></xsl:when>
            <xsl:otherwise><xsl:value-of select="concat($captionPrefix, @id)"/></xsl:otherwise>
          </xsl:choose>
        </xsl:attribute>
      </xsl:if>
    </xsl:if>
  </xsl:template>

  <xsl:template match="wrs:Data/wrs:*">
    <xsl:variable name="leftId" select="@id"/>
    <xsl:variable name="leftWrsCells" select="wrs:C"/>
    <xsl:variable name="lookupValue"><generator:LookupValue/></xsl:variable>
    <!-- Workaround: This for-each loop switches the context to $rightDoc,
                     because otherwise the key statement does not work. -->
    <xsl:for-each select="$rightDoc">
      <xsl:variable name="rightRows" select="key('rightRowLookup', $lookupValue)"/>
      <xsl:for-each select="$rightRows">
        <xsl:copy>
          <xsl:apply-templates select="@*"/>
          <xsl:attribute name="id">
            <xsl:choose>
              <xsl:when test="$rightRows[2]">
                <!-- If the join duplicates rows the must be adjusted so that there are no duplicate IDs. -->
                <xsl:value-of select="concat($leftId, '-', @id)"/>
              </xsl:when>
              <xsl:otherwise>
                <xsl:value-of select="$leftId"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>
          <xsl:variable name="rightRow" select="."/>
          <xsl:for-each select="$leftWrsCells">
            <xsl:variable name="joinColPos" select="position()"/>
            <xsl:copy>
              <!-- Let all attributes from right survive an attach them. When there is a conflict, the left attribute wins -->
              <xsl:variable name="rightCellPos" select="$rightJoinColumnPositions[$joinColPos]"/>
              <xsl:if test="$rightCellPos">
                <xsl:apply-templates select="$rightRow/wrs:C[number($rightCellPos)]/@*"/>
              </xsl:if>
              <xsl:apply-templates select="@*|node()"/>
            </xsl:copy>
          </xsl:for-each>
          <xsl:apply-templates select="wrs:C[not(position() = $rightJoinColumnPositions)]"/>
        </xsl:copy>
      </xsl:for-each>
      <xsl:if test="$leftOuterJoin_boolean and not($rightRows)">
        <R id="{$leftId}">
          <xsl:apply-templates select="@*"/>
          <xsl:apply-templates select="$leftWrsCells"/>
          <generator:EmptyRightCells/>
        </R>
      </xsl:if>
    </xsl:for-each>
  </xsl:template>

</xsl:stylesheet>