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
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  xmlns:generator="urn(bcd-xsltGenerator)">

  <xsl:import href="../../../xslt/calculation/calculation.xslt"/>

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:namespace-alias stylesheet-prefix="xsla" result-prefix="xsl"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt"/>

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:CubeCalculation[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

  <xsl:variable name="cubeCalculationTemplate" select="document('calculationTemplate.xslt')"/>
  <xsl:variable name="doc" select="/"/>

  <!-- helper variables for Col/Row Dims -->

  <xsl:variable name="lastColDim" select="$paramSet/@lastColDim"/>
  <xsl:variable name="lastRowDim" select="$paramSet/@lastRowDim"/>
  <xsl:variable name="maxRowDimPosRaw" select="number(/*/wrs:Header/wrs:Columns/wrs:C[@bRef=$lastRowDim]/@pos)"/>
  <xsl:variable name="maxColDimPosRaw" select="number(/*/wrs:Header/wrs:Columns/wrs:C[@bRef=$lastColDim]/@pos)"/>
  <xsl:variable name="maxDimPosRaw" select="count(/*/wrs:Header/wrs:Columns/wrs:C[@dimId])"/>
  <xsl:variable name="maxDimPos">
    <xsl:choose>
      <xsl:when test="$maxDimPosRaw &gt; 0"><xsl:value-of select="$maxDimPosRaw"/></xsl:when>
      <xsl:otherwise>1</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="maxRowDimPos">
    <xsl:choose>
      <xsl:when test="$gotRowDims"><xsl:value-of select="$maxRowDimPosRaw"/></xsl:when>
      <xsl:otherwise>0</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="gotColDims" select="string($maxColDimPosRaw)!='NaN'"/>
  <xsl:variable name="gotRowDims" select="string($maxRowDimPosRaw)!='NaN'"/>



  <xsl:template match="/*">
    <xsla:stylesheet>
      <xsl:copy-of select="$cubeCalculationTemplate/*/@*"/>
      <xsl:comment>Generated cube calculator</xsl:comment>
      <xsl:apply-templates select="$cubeCalculationTemplate/*/*" mode="generateXSLT"/>
    </xsla:stylesheet>
  </xsl:template>

  <!-- Generates the the expressions for the measures -->
  <xsl:template match="generator:MeasureColumns" mode="generateXSLT">
    <xsl:apply-templates select="$paramModel/*/cube:Layout/cube:Measures/*/*" mode="generateXSLT"/>
  </xsl:template>

  <!-- Data for plain measures -->
  <xsl:template match="dm:MeasureRef" mode="generateXSLT">
    <xsl:variable name="bRef" select="@bRef"/>
    <xsla:for-each select="$doc">
      <xsla:copy-of select="$row/wrs:C[position()=key('colHeadById','{$bRef}')/@pos]"/>
    </xsla:for-each>
  </xsl:template>

  <!-- Data for calculated measures -->
  <xsl:template match="dm:Measure" mode="generateXSLT">
    <wrs:C>
      <!-- Special handling for ratios and %, keep the denominator as an attribute for later calculations. Due to a possible calc:Niz node you need to check on // -->
      <xsl:if test="count(calc:Calc//calc:Div/calc:*)=2">
        <xsla:attribute name="denominator">
          <xsla:value-of>
            <xsl:attribute name="select">
              <xsl:apply-templates select="calc:Calc//calc:Div/calc:*[2]" mode="calc"/>
            </xsl:attribute>
          </xsla:value-of>
        </xsla:attribute>
      </xsl:if>
      <xsl:apply-templates select="calc:Calc" mode="calc"/>
    </wrs:C>
  </xsl:template>


  <xsl:template match="generator:Keys" mode="generateXSLT">

    <!--  ident key, used for total exception cases for measure total/subtotal references -->
    <xsla:key name="ident" match="/*/wrs:Data/wrs:R[wrs:C[{$maxDimPos}]]">
      <xsl:attribute name="use">
        <xsl:text>concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &lt;= $maxDimPos]">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>)</xsl:text>
      </xsl:attribute>
    </xsla:key>

    <!--  for row subtotal calculation -->
    <xsla:key name="columnKeyAboveTotal" match="/*/wrs:Data/wrs:R[wrs:C[{$maxDimPos}]/@bcdGr='1']">
      <xsl:attribute name="use">
        <xsl:text>concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &lt; $maxDimPos]">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>)</xsl:text>
      </xsl:attribute>
    </xsla:key>
    <!--  for row total calculation -->
    <xsla:key name="columnKeyOuterTotal" match="/*/wrs:Data/wrs:R[wrs:C[{$maxRowDimPos} + 1]/@bcdGr='1']">
      <xsl:attribute name="use">
        <xsl:text>concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &lt;= $maxRowDimPos]">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>)</xsl:text>
      </xsl:attribute>
    </xsla:key>

    <!--  for column subtotal calculation -->
    <xsla:key name="rowKeyAboveTotal" match="/*/wrs:Data/wrs:R[wrs:C[{$maxRowDimPos}]/@bcdGr='1']">
      <xsl:attribute name="use">
        <xsl:text>concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[@bRef!=$lastRowDim and position() &lt;= $maxDimPos]">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>)</xsl:text>
      </xsl:attribute>
    </xsla:key>
    <!--  for column total calculation -->
    <xsla:key name="rowKeyOuterTotal" match="/*/wrs:Data/wrs:R[wrs:C[1]/@bcdGr='1']">
      <xsl:attribute name="use">
        <xsl:text>concat('',''</xsl:text>
        <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &gt; $maxRowDimPos and position() &lt;= $maxDimPos]">
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
          <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
        </xsl:for-each>
        <xsl:text>)</xsl:text>
      </xsl:attribute>
    </xsla:key>

  </xsl:template>

  <xsl:template match="generator:variableCurrRowGroup" mode="generateXSLT">

    <!--  for row (sub) total calculation -->
    <xsl:choose>

      <xsl:when test="not($gotColDims)">
        <xsla:variable name="currColumnGroupTotal">
          <xsl:attribute name="select">
            <xsl:text>key('ident',concat('',''</xsl:text>
            <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &lt;= $maxDimPos]">
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
            </xsl:for-each>
            <xsl:text>))</xsl:text>
          </xsl:attribute>
        </xsla:variable>
        <xsla:variable name="currColumnGroupOuterTotal">
          <xsl:attribute name="select">
            <xsl:text>key('ident',concat('',''</xsl:text>
            <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &lt;= $maxDimPos]">
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
            </xsl:for-each>
            <xsl:text>))</xsl:text>
          </xsl:attribute>
        </xsla:variable>
      </xsl:when>

      <xsl:otherwise>
        <xsla:variable name="currColumnGroupTotal">
          <xsl:attribute name="select">
            <xsl:text>key('columnKeyAboveTotal',concat('',''</xsl:text>
            <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &lt; $maxDimPos]">
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
            </xsl:for-each>
            <xsl:text>))</xsl:text>
          </xsl:attribute>
        </xsla:variable>
        <xsla:variable name="currColumnGroupOuterTotal">
          <xsl:attribute name="select">
            <xsl:text>key('columnKeyOuterTotal',concat('',''</xsl:text>
            <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &lt;= $maxRowDimPos]">
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
            </xsl:for-each>
            <xsl:text>))</xsl:text>
          </xsl:attribute>
        </xsla:variable>
      </xsl:otherwise>

    </xsl:choose>


    <!--  for column (sub) total calculation -->
    <xsl:choose>

      <xsl:when test="not($gotRowDims)">
        <xsla:variable name="currRowGroupTotal">
          <xsl:attribute name="select">
            <xsl:text>key('ident',concat('',''</xsl:text>
            <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &lt;= $maxDimPos]">
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
            </xsl:for-each>
            <xsl:text>))</xsl:text>
          </xsl:attribute>
        </xsla:variable>
        <xsla:variable name="currRowGroupOuterTotal">
          <xsl:attribute name="select">
            <xsl:text>key('ident',concat('',''</xsl:text>
            <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &lt;= $maxDimPos]">
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
            </xsl:for-each>
            <xsl:text>))</xsl:text>
          </xsl:attribute>
        </xsla:variable>
      </xsl:when>

      <xsl:otherwise>
        <xsla:variable name="currRowGroupTotal">
          <xsl:attribute name="select">
            <xsl:text>key('rowKeyAboveTotal',concat('',''</xsl:text>
            <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[@bRef!=$lastRowDim and position() &lt;= $maxDimPos]">
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
            </xsl:for-each>
            <xsl:text>))</xsl:text>
          </xsl:attribute>
        </xsla:variable>
        <xsla:variable name="currRowGroupOuterTotal">
          <xsl:attribute name="select">
            <xsl:text>key('rowKeyOuterTotal',concat('',''</xsl:text>
            <xsl:for-each select="$doc/*/wrs:Header/wrs:Columns/wrs:C[position() &gt; $maxRowDimPos and position() &lt;= $maxDimPos]">
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]</xsl:text>
              <xsl:text>,'|',wrs:C[</xsl:text><xsl:value-of select="@pos"/><xsl:text>]/@bcdGr</xsl:text>
            </xsl:for-each>
            <xsl:text>))</xsl:text>
          </xsl:attribute>
        </xsla:variable>
      </xsl:otherwise>

    </xsl:choose>

  </xsl:template>

  <!-- Per default copy all nodes from the template to the generated stylesheet -->
  <xsl:template match="node()|@*" mode="generateXSLT">
    <xsl:copy><xsl:apply-templates select="node()|@*" mode="generateXSLT"/></xsl:copy>
  </xsl:template>
  <xsl:template match="calc:ValueRef[@idRef]" mode="calc">
    <xsl:param name="colPos"/>
    <xsl:variable name="idRef" select="@idRef"/>

    <!-- idRef for special total and subtotal cases is
     specialChar1 or specialChar2 followed by C or R (for column or row total) PIPE measureId -->

    <xsl:variable name="measureId" select="substring-after(@idRef, '|')"/>
    <xsl:variable name="measureIdColIndex">
       <xsl:for-each select="$doc">
         <xsl:value-of select="key('colHeadById', $measureId)/@pos"/>
      </xsl:for-each>
    </xsl:variable>

    <xsl:variable name="colIndex">
      <xsl:for-each select="$doc">
        <xsl:value-of select="key('colHeadById', $idRef)/@pos"/>
      </xsl:for-each>
    </xsl:variable>

    <xsl:variable name="zeroIfNullOp" select="ancestor::calc:Calc[1]/@zeroIfNullOp='true'"/>
    <xsl:if test="$zeroIfNullOp">
      <xsl:text>translate(number(</xsl:text>
    </xsl:if>
    <xsl:choose>
      <xsl:when test="substring-before(@idRef, '|')='&#xE0F0;2R'">
        <xsl:value-of select="concat('$currColumnGroupOuterTotal/wrs:C[',$measureIdColIndex,']')"/>
      </xsl:when>
      <xsl:when test="substring-before(@idRef, '|')='&#xE0F0;2C'">
        <xsl:value-of select="concat('$currRowGroupOuterTotal/wrs:C[',$measureIdColIndex,']')"/>
      </xsl:when>
      <xsl:when test="substring-before(@idRef, '|')='&#xE0F0;1R'">
        <xsl:value-of select="concat('$currColumnGroupTotal/wrs:C[',$measureIdColIndex,']')"/>
      </xsl:when>
      <xsl:when test="substring-before(@idRef, '|')='&#xE0F0;1C'">
        <xsl:value-of select="concat('$currRowGroupTotal/wrs:C[',$measureIdColIndex,']')"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="concat('wrs:C[',number($colIndex),']')"/>
      </xsl:otherwise>
    </xsl:choose>
    <xsl:if test="$zeroIfNullOp">
      <xsl:text>),'aN','0')</xsl:text>
    </xsl:if>

  </xsl:template>

</xsl:stylesheet>
