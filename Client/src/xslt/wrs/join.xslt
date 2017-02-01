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
  xmlns:generator="urn(bcd-xsltGenerator)"
  bcdxml:wrsHeaderIsEnough="true">
  <!--
    This stylesheet joins two WRS document either with an
      INNER JOIN (default),
      LEFT OUTER JOIN or
      CROSS JOIN (when no join columns are specified).
    It must be run on the right WRS document and be given the left WRS document
    in the "leftDoc" parameter.

   -->

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt"/>

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:Join[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <!-- Individual parameters -->
  <!-- (XMLDocument) The WRS document that should be joined with the WRS document
       this transformation is executed on. The letter takes the role of the right
       join partner whereas the former is the left join document. -->
  <xsl:param name="leftDoc" bcdxml:wrsHeaderIsEnough="true"/>

  <!-- (ID List?) A whitespace-separated list of column IDs identifying the join columns
       within the right document. This list may be empty if a cross-join should be done.
       The number of columns in this list must be equal to the ones specified in the
       "leftWrsCol" parameter.
       Example: "county station" -->
  <xsl:param name="rightWrsCol"/>
  <xsl:param name="paramModelRightWrsCol" select="$paramSet/xp:Right/wrs:Columns/wrs:C"/>

  <!-- (String?) The ID prefix the columns taken from the right document will get in the
       joined document (often necessary to make them unique). The join columns IDs will
       get a separate prefix specified in the "joinColumnIdPrefix" parameter so this
       prefix only applies to the non-join columns within the right document. -->
  <xsl:param name="rightIdPrefix" select="$paramSet/xp:Right/@idPrefix"/>

  <!-- (String?) The caption prefix the columns (except from the join columns) taken from
       the right document will get in the joined document. -->
  <xsl:param name="rightCaptionPrefix" select="$paramSet/xp:Right/@captionPrefix"/>

  <!-- (ID List?) A whitespace-separated list of column IDs identifying the join columns
       within the left document. This list may be empty if a cross-join should be done.
       The number of columns in this list must be equal to the ones specified in the
       "rightWrsCol" parameter.
       Example: "county station" -->
  <xsl:param name="leftWrsCol"/>
  <xsl:param name="paramModelLeftWrsCol" select="$paramSet/xp:Left/wrs:Columns/wrs:C"/>

  <!-- (String?) The ID prefix the columns taken from the left document will get in the
       joined document (often necessary to make them unique). The join columns IDs will
       get a separate prefix specified in the "joinColumnIdPrefix" parameter so this
       prefix only applies to the non-join columns within the left document. -->
  <xsl:param name="leftIdPrefix" select="$paramSet/xp:Left/@idPrefix"/>

  <!-- (String?) The caption prefix the columns (except from the join columns) taken from
       the left document will get in the joined document. -->
  <xsl:param name="leftCaptionPrefix" select="$paramSet/xp:Left/@captionPrefix"/>

  <!-- (Boolean?) When this flag is set to "true" this stylesheet makes a LEFT OUTER JOIN
       instead of an INNER JOIN. The default value is "false". -->
  <xsl:param name="makeLeftOuterJoin" select="$paramSet/@makeLeftOuterJoin"/>

  <!-- (String?) The ID prefix the join columns get within the joined document. -->
  <xsl:param name="joinColumnIdPrefix" select="$paramSet/@joinColumnIdPrefix"/>

  <!-- (String?) The caption prefix the join columns get within the joined document. -->
  <xsl:param name="joinColumnCaptionPrefix" select="$paramSet/@joinColumnIdPrefix"/>

  <xsl:param name="dimensions"/>
  <xsl:param name="paramModelDimensions" select="$paramSet/xp:Dimensions/wrs:Columns/wrs:C"/>

  <xsl:variable name="effRightWrsCol">
    <xsl:value-of select="concat(normalize-space($rightWrsCol),' ')"/>
    <xsl:call-template name="checkDim">
      <xsl:with-param name="dim" select="concat(normalize-space($dimensions),' ')"/>
    </xsl:call-template>
    <xsl:apply-templates select="$paramModelDimensions" mode="paramModelDimensions"/>
    <xsl:for-each select="$paramModelRightWrsCol"><xsl:value-of select="concat(@id,' ')"/></xsl:for-each>
  </xsl:variable>

  <xsl:variable name="effLeftWrsCol">
    <xsl:value-of select="concat(normalize-space($leftWrsCol),' ')"/>
    <xsl:call-template name="checkDim">
      <xsl:with-param name="dim" select="concat(normalize-space($dimensions),' ')"/>
    </xsl:call-template>
    <xsl:apply-templates select="$paramModelDimensions" mode="paramModelDimensions"/>
    <xsl:for-each select="$paramModelLeftWrsCol"><xsl:value-of select="concat(@id,' ')"/></xsl:for-each>
  </xsl:variable>

  <xsl:template name="checkDim">
    <xsl:param name="dim"/>
    <xsl:variable name="dimMember" select="substring-before($dim,' ')"/>
    <xsl:if test="string-length($dimMember)!=0">
      <xsl:if test="$leftDoc/*/wrs:Header/wrs:Columns/wrs:C[@id=$dimMember] and /*/wrs:Header/wrs:Columns/wrs:C[@id=$dimMember]">
        <xsl:value-of select="concat($dimMember,' ')"/>
      </xsl:if>
      <xsl:call-template name="checkDim">
        <xsl:with-param name="dim" select="substring-after($dim,' ')"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>

  <xsl:template match="wrs:C" mode="paramModelDimensions">
    <xsl:if test="$leftDoc/*/wrs:Header/wrs:Columns/wrs:C[@id=current()/@id] and /*/wrs:Header/wrs:Columns/wrs:C[@id=current()/@id]">
      <xsl:value-of select="concat(@id,' ')"/>
    </xsl:if>
  </xsl:template>

  <!-- ==================================== Variables ================================== -->

  <xsl:variable name="leftJoinColumnPositions" select="$leftDoc/*/wrs:Header/wrs:Columns/wrs:C[contains(concat(' ', normalize-space($effLeftWrsCol), ' '), concat(' ', @id, ' '))]/@pos"/>
  <xsl:variable name="rightJoinColumnPositions" select="/*/wrs:Header/wrs:Columns/wrs:C[contains(concat(' ', normalize-space($effRightWrsCol), ' '), concat(' ', @id, ' '))]/@pos"/>

  <xsl:variable name="rightWrsColNo" select="number(/*/wrs:Header/wrs:Columns/wrs:C[@id = $effRightWrsCol]/@pos)"/>
  <xsl:variable name="templateDoc" select="document('templates/joinTemplate.xslt')"/>
  <xsl:variable name="doc" select="/"/>


  <!-- ==================================== Templates ================================== -->

  <xsl:template match="/">
    <xsl:apply-templates select="$templateDoc" mode="generateXSLT"/>
  </xsl:template>

  <xsl:template match="node()|@*" mode="generateXSLT">
    <xsl:copy><xsl:apply-templates select="node()|@*" mode="generateXSLT"/></xsl:copy>
  </xsl:template>

  <xsl:template match="generator:LookupValue" mode="generateXSLT">
    <xsl:attribute name="select">
      <xsl:call-template name="constructWrsKeyExpression">
        <xsl:with-param name="columns" select="$leftJoinColumnPositions"/>
      </xsl:call-template>
    </xsl:attribute>
  </xsl:template>

  <xsl:template match="generator:Keys" mode="generateXSLT">
    <xsl:element name="key" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">rightRowLookup</xsl:attribute>
      <xsl:attribute name="match">/*/wrs:Data/wrs:*</xsl:attribute>
      <xsl:attribute name="use">
        <xsl:call-template name="constructWrsKeyExpression">
          <xsl:with-param name="columns" select="$rightJoinColumnPositions"/>
        </xsl:call-template>
      </xsl:attribute>
    </xsl:element>
  </xsl:template>

  <xsl:template name="constructWrsKeyExpression">
    <xsl:param name="columns"/>
    <xsl:variable name="separator">, '|', </xsl:variable>
    <xsl:choose>
      <xsl:when test="not($columns)">''</xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="'concat('"/>
        <xsl:for-each select="$columns">
          <xsl:if test="position() > 1"><xsl:value-of select="$separator"/></xsl:if>
          <xsl:value-of select="concat('wrs:C[', ., ']')"/>
          <xsl:value-of select="concat($separator,'boolean(wrs:C[', ., ']/@bcdGr=1)')"/>
        </xsl:for-each>
        <xsl:value-of select="')'"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="generator:JoinColumns" mode="generateXSLT">
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">rightWrsCol</xsl:attribute>
      <xsl:attribute name="select">'<xsl:value-of select="$effRightWrsCol"/>'</xsl:attribute>
    </xsl:element>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">leftWrsCol</xsl:attribute>
      <xsl:attribute name="select">'<xsl:value-of select="$effLeftWrsCol"/>'</xsl:attribute>
    </xsl:element>
  </xsl:template>

  <xsl:template match="generator:EmptyRightCells" mode="generateXSLT">
    <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[not(position() = $rightJoinColumnPositions)]"><wrs:C><wrs:null/></wrs:C></xsl:for-each>
  </xsl:template>

</xsl:stylesheet>