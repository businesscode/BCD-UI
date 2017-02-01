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
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  xmlns:generator="urn(bcd-xsltGenerator)">

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>
  <generator:FullDimsKey/>
  <generator:RowDimsKey/>
  <generator:ColDimsKey/>

  <generator:Layout/>

  <xsl:variable name="doc" select="/"/>
  <xsl:variable name="countRowDims" select="count($augmLayout/*/xp:Dimensions/xp:Rows/*)"/>
  <xsl:variable name="countColDims" select="count($augmLayout/*/xp:Dimensions/xp:Columns/*)"/>
  <xsl:variable name="emptyColDimKey"> <!-- For row-dim-only measures -->
    <xsl:for-each select="$augmLayout/*/xp:Dimensions/xp:Columns/*">&#xE0F0;1|</xsl:for-each>
  </xsl:variable>
  <xsl:variable name="colCount" select="count($augmLayout/*/xp:Measures/xp:RowDims/*)+count($distinctColDimsKey/*/*)*count($augmLayout/*/xp:Measures/xp:AllDims/*)"/>
  <generator:distinctRowGroups/>

  <!-- Distinct column dimension keys -->
  <xsl:variable name="distinctColDimsKeyString">
    <ColDims>
      <xsl:for-each select="/*/wrs:Data/wrs:R">
        <!-- There should always be some order on columns, as not all col dims need to be existing for each row and
             if we do not sort, they show up in the order of their first appearance, which looks quite random to a user -->
        <generator:ColSorting/>
        <generator:ColDimKeyOfRow/>
        <generator:ColDimKeyOfRowCaption/>
         <xsl:if test="($colDimKeyOfRow!=$emptyColDimKey and (not(contains($colDimKeyOfRow,'||'))) or $augmLayout/*/xp:Dimensions/xp:Columns/*[1]/@total)
                        and generate-id(.)=generate-id(key('colDims',$colDimKeyOfRow))">
           <ColDim>
             <xsl:attribute name="caption"><xsl:value-of select="$colDimKeyOfRowCaption"/></xsl:attribute>
             <xsl:copy-of select="@*"/> <!-- Preserve attributes like bcdVdm -->
             <xsl:value-of select="$colDimKeyOfRow"/>
           </ColDim>
         </xsl:if>
      </xsl:for-each>
    </ColDims>
  </xsl:variable>
  <xsl:variable name="distinctColDimsKey" select="exslt:node-set($distinctColDimsKeyString)"/>

  <!-- Main starting point -->
  <xsl:template match="/*">
    <wrs:Wrs>
      <xsl:apply-templates select="wrs:Header"/>
      <xsl:apply-templates select="wrs:Data"/>
      <wrs:Footer>
        <xsl:apply-templates select="wrs:Footer/*"/>
      </wrs:Footer>
    </wrs:Wrs>
  </xsl:template>

  <!-- Generate the new header -->
  <xsl:template match="wrs:Header">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <wrs:Columns>
        <xsl:apply-templates select="wrs:Columns/@*"/>
        <xsl:attribute name="colDimLevelIds">
          <xsl:for-each select="$augmLayout/*/xp:Dimensions/xp:Columns/*">
            <xsl:if test="position()>1">|</xsl:if><xsl:value-of select="@bRef"/>
          </xsl:for-each>
        </xsl:attribute>

        <xsl:attribute name="colDimLevelCaptions">
          <xsl:for-each select="$augmLayout/*/xp:Dimensions/xp:Columns/*">
            <xsl:if test="position()>1">|</xsl:if><xsl:value-of select="@caption"/>
          </xsl:for-each>
        </xsl:attribute>

        <!-- Row dimensions -->
        <xsl:variable name="headColumns" select="wrs:Columns"/>
        <xsl:for-each select="$augmLayout/*/xp:Dimensions/xp:Rows/*">
          <xsl:variable name="currCell" select="$headColumns/wrs:C[@id=current()/@bRef]"/>
          <wrs:C>
            <xsl:apply-templates select="$currCell/@*"/>
            <xsl:attribute name="pos"><xsl:value-of select="position()"/></xsl:attribute>
            <xsl:attribute name="dimId"><xsl:value-of select="$currCell/@id"/></xsl:attribute>
            <xsl:apply-templates select="$currCell/*"/>
          </wrs:C>
        </xsl:for-each>

        <!-- Measures depending only on row dimensions -->
        <xsl:for-each select="$augmLayout/*/xp:Measures/xp:RowDims/*">
          <xsl:variable name="currCell" select="$headColumns/wrs:C[@id=current()/@bRef]"/>
          <wrs:C>
            <xsl:apply-templates select="$currCell/@*"/>
            <xsl:attribute name="pos"><xsl:value-of select="$countRowDims+1+count(preceding-sibling::*[@bRef])"/></xsl:attribute>
            <xsl:attribute name="id"><xsl:value-of select="$currCell/@id"/></xsl:attribute>
            <xsl:attribute name="caption"><xsl:value-of select="$currCell/@caption"/></xsl:attribute>
            <xsl:attribute name="valueId"><xsl:value-of select="($currCell/@valueId | $currCell/@id)"/></xsl:attribute>
            <xsl:copy-of select="$currCell/wrs:A"/>
          </wrs:C>
        </xsl:for-each>

        <!-- Measures depending on full dimensions (i.e. row and col) -->
        <xsl:variable name="countRowMeasures" select="count($augmLayout/*/xp:Measures/xp:RowDims/*)"/>
        <xsl:variable name="countColMeasures" select="count($augmLayout/*/xp:Measures/xp:AllDims/*)"/>
        <xsl:choose>
          <xsl:when test="count($distinctColDimsKey/*/*)>0">
            <!-- Case which col dims: outer loop over col dims, inner loop over measures -->
            <xsl:for-each select="$distinctColDimsKey/*/*">
              <xsl:variable name="colDim" select="."/>
              <xsl:variable name="startPos" select="$countRowDims+$countRowMeasures+1+count(preceding-sibling::*)*$countColMeasures"/>
              <xsl:for-each select="$augmLayout/*/xp:Measures/xp:AllDims/*">
                <xsl:variable name="currCell" select="$headColumns/wrs:C[@id=current()/@bRef]"/>
                <wrs:C>
                  <xsl:apply-templates select="$currCell/@*"/>
                  <xsl:apply-templates select="$colDim/@*"/>
                  <xsl:attribute name="pos"><xsl:value-of select="$startPos+count(preceding-sibling::*[@bRef])"/></xsl:attribute>
                  <xsl:attribute name="id"><xsl:value-of select="concat($colDim,$currCell/@id)"/></xsl:attribute>
                  <xsl:attribute name="caption"><xsl:value-of select="concat($colDim/@caption,$currCell/@caption)"/></xsl:attribute>
                  <xsl:attribute name="valueId"><xsl:value-of select="($currCell/@valueId | $currCell/@id)"/></xsl:attribute>
                  <xsl:copy-of select="$currCell/wrs:A"/>
                </wrs:C>
              </xsl:for-each>
            </xsl:for-each>
          </xsl:when>
          <xsl:otherwise>
            <!-- Case without col dims: directly loop over measures -->
            <xsl:variable name="startPos" select="$countRowDims+1+$countRowMeasures"/>
            <xsl:for-each select="$augmLayout/*/xp:Measures/xp:AllDims/*">
              <xsl:variable name="currCell" select="$headColumns/wrs:C[@id=current()/@bRef]"/>
              <wrs:C>
                <xsl:apply-templates select="$currCell/@*"/>
                <xsl:attribute name="pos"><xsl:value-of select="$startPos+count(preceding-sibling::*[@bRef])"/></xsl:attribute>
                <xsl:attribute name="id"><xsl:value-of select="$currCell/@id"/></xsl:attribute>
                <xsl:attribute name="caption"><xsl:value-of select="$currCell/@caption"/></xsl:attribute>
                <xsl:attribute name="valueId"><xsl:value-of select="$currCell/@valueId | $currCell/@id"/></xsl:attribute>
                <xsl:copy-of select="$currCell/wrs:A"/>
              </wrs:C>
            </xsl:for-each>
          </xsl:otherwise>
        </xsl:choose>

      </wrs:Columns>
    </xsl:copy>
  </xsl:template>

  <!--  Generate the data section -->
  <xsl:template match="wrs:Data">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:for-each select="$distinctRowGroups">
<!--         <generator:RowSorting/> TODO disabled because function is taken over be order xslt now. remove this code completely? -->
        <generator:RowDimKeyOfRow/>
        <xsl:variable name="leadRow" select="."/>
        <xsl:copy>
          <xsl:apply-templates select="@*"/>

          <!-- Row dimensions -->
          <xsl:for-each select="$augmLayout/*/xp:Dimensions/xp:Rows/*">
            <xsl:apply-templates select="$leadRow/wrs:C[number(current()/@origPos)]"/>
          </xsl:for-each>

          <!-- Measures depending only on row dimensions -->
          <xsl:variable name="row" select="key('fullDims',concat($rowDimKeyOfRow,$emptyColDimKey))"/>
          <xsl:for-each select="$augmLayout/*/xp:Measures/xp:RowDims/*">
            <wrs:C>
              <xsl:variable name="currCell" select="$row/wrs:C[number(current()/@origPos)]"/>
              <xsl:apply-templates select="$currCell/@*"/>
              <xsl:apply-templates select="$currCell/node()"/>
            </wrs:C>
          </xsl:for-each>

          <!-- Measures depending on all dimensions -->
          <xsl:choose>
            <xsl:when test="count($distinctColDimsKey/*/*)>0">
              <xsl:for-each select="$distinctColDimsKey/*/*">
                <xsl:variable name="colDim" select="."/>
                <xsl:for-each select="$doc">
                  <xsl:call-template name="copyColMeasures">
                    <xsl:with-param name="row" select="key('fullDims',concat($rowDimKeyOfRow,$colDim))"/>
                  </xsl:call-template>
                </xsl:for-each>
              </xsl:for-each>
            </xsl:when>
            <xsl:otherwise>
              <xsl:call-template name="copyColMeasures">
                <xsl:with-param name="row" select="key('fullDims',$rowDimKeyOfRow)"/>
              </xsl:call-template>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:copy>
      </xsl:for-each>
    </xsl:copy>
  </xsl:template>

  <xsl:template name="copyColMeasures">
    <xsl:param name="row"/>
    <xsl:for-each select="$augmLayout/*/xp:Measures/xp:AllDims/*">
      <wrs:C>
        <xsl:variable name="currCell" select="$row/wrs:C[number(current()/@origPos)]"/>
        <xsl:apply-templates select="$currCell/@*"/>
        <xsl:apply-templates select="$currCell/node()"/>
      </wrs:C>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="node()|@*">
    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>
  </xsl:template>

</xsl:stylesheet>
