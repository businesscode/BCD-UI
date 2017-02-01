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
  Generates cube calculations
  -->
<xsl:stylesheet version="1.0"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  xmlns:generator="urn(bcd-xsltGenerator)">

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:namespace-alias stylesheet-prefix="xsla" result-prefix="xsl"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt"/>

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:CumulAndPercOfTotal[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

  <xsl:variable name="doc" select="/"/>
  <xsl:variable name="cumulAndPercOfTotalTemplate" select="document('cumulAndPercOfTotalTemplate.xslt')"/>
  <!-- (Only) in case of row-cumulation we need the key on the last row-dims column
    number() assures it is syntactically correct (even if unused) if there is no row dim at all
    -->
  <xsl:variable name="lastRowDimCol" select="count(/*/wrs:Header/wrs:Columns/wrs:C[@dimId])"/>
  <!-- Row dim excluding last dimension or static 1, meaning, all rows (as this is used in @use of the key -->
  <xsl:variable name="rowDimExclLastKeyOfRow">
    <xsl:choose>
      <xsl:when test="count($paramSet/xp:RowDimensions/xp:Columns/wrs:C)>1">
        <xsl:text>concat(</xsl:text>
          <xsl:for-each select="$paramSet/xp:RowDimensions/xp:Columns/wrs:C[position()!=last()]">
            <xsl:variable name="bRef" select="@id"/>
            <xsl:for-each select="$doc">wrs:C[<xsl:value-of select="key('colHeadById',$bRef)/@pos"/>],'|'</xsl:for-each>
            <xsl:if test="position()&lt;last()">,</xsl:if>
          </xsl:for-each>
        <xsl:text>)</xsl:text>
      </xsl:when>
      <xsl:otherwise>1</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

  <!-- Root match, empty output if we have nothing to do -->
  <xsl:template match="/*">
    <xsl:choose>
      <xsl:when test="$paramSet//wrs:C">
        <xsla:stylesheet>
          <xsl:copy-of select="$cumulAndPercOfTotalTemplate/*/@*"/>
          <xsl:apply-templates select="$cumulAndPercOfTotalTemplate/*/*" mode="generateXSLT"/>
        </xsla:stylesheet>
      </xsl:when>
      <xsl:otherwise>
        <bcdxml:XsltNop/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Generates the keys -->
  <xsl:template match="generator:Keys" mode="generateXSLT">

    <!--
      These keys map one row/col to the cumulation group (i.e. same dim except last and also same @valueId in case of col)
      -->
    <xsla:key name="rowDimsExclLastKey" match="/*/wrs:Data/wrs:R[wrs:C[{$lastRowDimCol}]/@bcdGr!='1']" use="{$rowDimExclLastKeyOfRow}"/>
    <xsla:key name="rowDimsExclLastTotalKey" match="/*/wrs:Data/wrs:R[wrs:C[{$lastRowDimCol}]/@bcdGr='1']" use="{$rowDimExclLastKeyOfRow}"/>
    <xsla:key name="colDimsExclLastPlusValueIdKey" match="/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1|'))]/@pos">
      <xsl:attribute name="use">
        <xsl:text>concat(substring-before(../@id,</xsl:text>
        <xsl:call-template name="colCumulKey">
          <xsl:with-param name="idExpr" select="'../@id'"/>
        </xsl:call-template>
        <xsl:text>),'|',../@valueId)</xsl:text>
      </xsl:attribute>
    </xsla:key>
    <xsla:key name="rowIsTotalKey" match="/*/wrs:Data/wrs:R[wrs:C[{$lastRowDimCol}]/@bcdGr=1]" use="@id"/>

    <!--
      These keys serve as boolean flags, which columns /rows take part in cumulation
      -->
    <xsl:call-template name="genKey">
      <xsl:with-param name="name">isColCumulKey</xsl:with-param>
      <xsl:with-param name="cols" select="$paramSet/xp:ColCumulate/wrs:C[@type='cumulate']"/>
    </xsl:call-template>
    <xsl:call-template name="genKey">
      <xsl:with-param name="name">isColCumulPercOfTotalKey</xsl:with-param>
      <xsl:with-param name="cols" select="$paramSet/xp:ColCumulate/wrs:C[@type='cumulate%']"/>
    </xsl:call-template>
    <xsl:call-template name="genKey">
      <xsl:with-param name="name">isColPercOfTotalKey</xsl:with-param>
      <xsl:with-param name="cols" select="$paramSet/xp:ColCumulate/wrs:C[@type='%']"/>
    </xsl:call-template>
    <xsl:call-template name="genKey">
      <xsl:with-param name="name">isRowCumulKey</xsl:with-param>
      <xsl:with-param name="cols" select="$paramSet/xp:RowCumulate/wrs:C[@type='cumulate']"/>
    </xsl:call-template>
    <xsl:call-template name="genKey">
      <xsl:with-param name="name">isRowCumulPercOfTotalKey</xsl:with-param>
      <xsl:with-param name="cols" select="$paramSet/xp:RowCumulate/wrs:C[@type='cumulate%']"/>
    </xsl:call-template>
    <xsl:call-template name="genKey">
      <xsl:with-param name="name">isRowPercOfTotalKey</xsl:with-param>
      <xsl:with-param name="cols" select="$paramSet/xp:RowCumulate/wrs:C[@type='%']"/>
    </xsl:call-template>
  </xsl:template>

  <!-- Helper for key generation -->
  <xsl:template name="genKey">
    <xsl:param name="name"/>
    <xsl:param name="cols"/>
    <xsl:element name="key" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name"><xsl:value-of select="$name"/></xsl:attribute>
      <xsl:attribute name="use">@pos</xsl:attribute>
      <xsl:attribute name="match">
        <xsl:text>/*/wrs:Header/wrs:Columns/wrs:C[</xsl:text>
        <xsl:for-each select="$cols">
          <xsl:variable name="quot">'</xsl:variable>
          <xsl:choose><!-- TODO row-dim restriction -->
            <xsl:when test="local-name($cols[1]/..)='ColCumulate' and @cumulateColDim"><xsl:value-of select="concat('@id=',$quot,@cumulateColDim,'|',@valueId,$quot)"/></xsl:when>
            <xsl:otherwise><xsl:value-of select="concat('@valueId=',$quot,@valueId,$quot)"/></xsl:otherwise>
          </xsl:choose>
          <xsl:if test="position()&lt;last()"> or </xsl:if>
        </xsl:for-each>
        <xsl:if test="not($cols)">1=0</xsl:if>
        <xsl:text>]</xsl:text>
      </xsl:attribute>
    </xsl:element>
  </xsl:template>

  <!--
    For row cumulation those columns belong to a group which start with the same dimension and have the same valueId. Mainly we cut the last dim out
    -->
  <xsl:template name="colCumulKey">
    <xsl:param name="idExpr"/>
    <xsl:param name="restLastColId" select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position()=last()]/@id"/>
    <xsl:if test="contains(substring-after($restLastColId,'|'),'|')">substring-after(</xsl:if>
      <xsl:choose>
        <xsl:when test="contains(substring-after($restLastColId,'|'),'|')">
          <xsl:call-template name="colCumulKey">
            <xsl:with-param name="idExpr" select="$idExpr"/>
            <xsl:with-param name="restLastColId" select="substring-after($restLastColId,'|')"/>
          </xsl:call-template>
        </xsl:when>
        <xsl:otherwise><xsl:value-of select="$idExpr"/></xsl:otherwise>
      </xsl:choose>
    <xsl:if test="contains(substring-after($restLastColId,'|'),'|')">,'|')</xsl:if>
  </xsl:template>

  <!-- Generates the col-cumul-group key lookup for a current cell, i.e. a variable currCumulDim with the value generated in colCumulKey -->
  <xsl:template match="generator:currColKeyLookup" mode="generateXSLT">
    <xsla:variable name="currCumulDim">
      <xsl:attribute name="select">
        <xsl:text>concat(substring-before($currId,</xsl:text>
          <xsl:call-template name="colCumulKey">
            <xsl:with-param name="idExpr" select="'$currId'"/>
          </xsl:call-template>
        <xsl:text>),'|',key('colHeadByPos',$currPos)/@valueId)</xsl:text>
      </xsl:attribute>
    </xsla:variable>
  </xsl:template>

  <!-- Generates the key of row dimensions for a current row -->
  <xsl:template match="generator:RowDimExclLastKeyOfRow" mode="generateXSLT">
    <xsla:variable name="rowDimExclLastKeyOfRow" select="{$rowDimExclLastKeyOfRow}"/>
  </xsl:template>

  <!-- Some parts are only needed for col or row cumulation -->
  <xsl:template match="generator:isRowCumul" mode="generateXSLT">
    <xsl:if test="$paramSet/xp:RowCumulate/wrs:C">
      <xsl:apply-templates select="@*|node()" mode="generateXSLT"/>
    </xsl:if>
  </xsl:template>
  <!-- Some parts are only needed for col or row cumulation -->
  <xsl:template match="generator:isColCumul" mode="generateXSLT">
    <xsl:if test="$paramSet/xp:ColCumulate/wrs:C">
      <xsl:apply-templates select="@*|node()" mode="generateXSLT"/>
    </xsl:if>
  </xsl:template>

  <!-- Per default copy all nodes from the template to the generated stylesheet -->
  <xsl:template match="@*|node()" mode="generateXSLT">
    <xsl:copy><xsl:apply-templates select="@*|node()" mode="generateXSLT"/></xsl:copy>
  </xsl:template>

</xsl:stylesheet>