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
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:csv="http://www.businesscode.de/schema/bcdui/csv-1.0.0"
  xmlns:xi="http://www.w3.org/2001/XInclude"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)"
  exclude-result-prefixes="generator csv"
>
  <xsl:import href="include/rowRangeParams.xslt"/>
  <xsl:import href="include/colRangeParams.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>

  <xsl:variable name="paramSet" select="$paramModel//xp:Paste[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <xsl:param name="clipboardData"/>

  <xsl:param name="transactionsNumber" select="number(concat(0,/wrs:Wrs/wrs:Header/wrs:TransactionsNumber))"/>
  <!--
    (String?Boolean) if the whole content of clipboard should be pasted as new row(s)
    -->
  <xsl:param name="pasteAsNewRows" select="false()"/>

  <!-- (String?Boolean) avoid pasting into read only cols -->
  <xsl:param name="preventReadOnlyCol" select="true()"/>

  <xsl:variable name="csvDataColCount" select="count($clipboardData/csv:CSVData/csv:R[1]/csv:C)"/>
  <xsl:variable name="csvDataRowCount" select="count($clipboardData/csv:CSVData/csv:R)"/>

  <xsl:variable name="wrsColumns" select="/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C"/>
  <xsl:variable name="wrsColCount" select="count($wrsColumns)"/>
  <xsl:variable name="wrsRowCount" select="count(/wrs:Wrs/wrs:Data/*)"/>

  <xsl:key name="columnsNumericNonNullableByPos" match="/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@type-name='NUMERIC' and @nullable='0']" use="@pos"/>
  <xsl:key name="columnsWithCaptionValueReferences" match="/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[wrs:References/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[2]]" use="@pos"/>
  <xsl:key name="readOnlyColumn" match="/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@isReadOnly='true']" use="@pos"/>

  <generator:Keys/>

  <xsl:variable name="x1PlusCsvDataColCount">
    <xsl:choose>
      <xsl:when test="$x1 + $csvDataColCount - 1 > $wrsColCount">
        <xsl:value-of select="$wrsColCount"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$x1 + $csvDataColCount - 1"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="actualX2_raw">
    <xsl:choose>
      <xsl:when test="$x1PlusCsvDataColCount > $x2">
        <xsl:value-of select="$x1PlusCsvDataColCount"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$x2"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="actualX2" select="number($actualX2_raw)"/>

  <xsl:variable name="actualY2_raw">
    <xsl:choose>
      <xsl:when test="$y1 + $csvDataRowCount - 1 > $y2">
        <xsl:value-of select="$y1 + $csvDataRowCount - 1"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$y2"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="actualY2" select="number($actualY2_raw)"/>
  <xsl:variable name="isPasteAsNewRows" select="($pasteAsNewRows = true() or $pasteAsNewRows = 'true')"/>

  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Header">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <wrs:TransactionsNumber><xsl:value-of select="$transactionsNumber + 1"/></wrs:TransactionsNumber>
      <xsl:copy-of select="*[name() != 'TransactionsNumber']"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Data">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:attribute name="newSelection">
        <xsl:choose>
          <xsl:when test="$isPasteAsNewRows = true()">
            <xsl:value-of select="concat($x1, ',', $y1+1, ',', $x2, ',', ($y2 + $csvDataRowCount) )"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="concat($x1, ',', $y1, ',', $actualX2, ',', $actualY2)"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
      <xsl:for-each select="wrs:*">
        <xsl:variable name="pos" select="position()"/>
        <xsl:choose>
          <xsl:when test="$pos = $y1 and $isPasteAsNewRows = true()">
            <xsl:call-template name="getInsertRows">
              <xsl:with-param name="rowPos" select="$pos"/>
            </xsl:call-template>
            <xsl:apply-templates select="."/>
          </xsl:when>
          <xsl:when test="$pos >= $y1 and $pos &lt;= $actualY2 and not($isPasteAsNewRows)">
            <xsl:apply-templates select="." mode="replaceData">
              <xsl:with-param name="rowNum" select="$pos"/>
            </xsl:apply-templates>
          </xsl:when>
          <xsl:otherwise>
            <xsl:apply-templates select="."/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>

      <!-- inserts at the end new rows -->
      <xsl:if test="not($isPasteAsNewRows)">
        <xsl:variable name="insertRowStart">
          <xsl:value-of select="$wrsRowCount - $y1 + 1"/>
        </xsl:variable>

        <xsl:call-template name="getInsertRows">
          <xsl:with-param name="startPos" select="$insertRowStart"/>
        </xsl:call-template>
      </xsl:if>

    </xsl:copy>
  </xsl:template>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    gets wrs:I from clipboard data
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template name="getInsertRows">
    <xsl:param name="startPos" select="number(0)"/>
    <xsl:for-each select="$clipboardData/csv:CSVData/csv:R[position() > $startPos]">
      <xsl:variable name="clipboardRow" select="."/>

      <wrs:I>
        <xsl:attribute name="id"><xsl:value-of select="concat('P_', $transactionsNumber, '_', position())"/></xsl:attribute>
        <xsl:for-each select="$wrsColumns">
          <xsl:variable name="pos" select="position()"/>
          <xsl:choose>
            <!-- handle value retrieval by default lookup -->
            <xsl:when test="$pos >= $x1 and $pos &lt;= $actualX2">
              <wrs:C>
                <xsl:variable name="value" select="$clipboardRow/csv:C[$pos - $x1 + 1]"/>
                <xsl:call-template name="getValue">
                  <xsl:with-param name="pos" select="$pos" />
                  <xsl:with-param name="value" select="$value" />
                </xsl:call-template>
              </wrs:C>
            </xsl:when>
            <!-- if has LOVs, take the first one -->
            <xsl:when test="key('columnsWithCaptionValueReferences', $pos)">
              <wrs:C>
                <xsl:value-of select="key('columnsWithCaptionValueReferences', $pos)/wrs:References/wrs:Wrs/wrs:Data/*[1]/wrs:C[2]"/>
              </wrs:C>
            </xsl:when>
            <!-- handle default numeric non nullable and paste zero -->
            <xsl:when test="key('columnsNumericNonNullableByPos', $pos)"><wrs:C>0</wrs:C></xsl:when>
            <!-- if nothing matched we insert null -->
            <xsl:otherwise>
              <wrs:C><wrs:null/></wrs:C>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:for-each>
      </wrs:I>
    </xsl:for-each>

  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template name="getValue">
<!--    <xsl:param name="rowNum"/>-->
    <xsl:param name="pos"/>
    <xsl:param name="value"/>
    <xsl:param name="oValue"/>
     <!--
    <xsl:variable name="value" select="$clipboardData/csv:CSVData/csv:R[($rowNum - $y1) mod $csvDataRowCount + 1]/csv:C[($pos - $x1) mod $csvDataColCount + 1]"/>

    <xsl:choose>
      <xsl:when test="key('columnsWithCaptionValueReferences', $pos)">
        <xsl:variable name="lookupValue" select="key(concat('valueLookupForCol', $pos), $value)"/>
        <xsl:choose>
          <xsl:when test="$lookupValue"><xsl:copy-of select="$lookupValue/node()"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="$value"/></xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <xsl:when test="$value = ''"><wrs:null/></xsl:when>
      <xsl:otherwise><xsl:value-of select="$value"/></xsl:otherwise>
    </xsl:choose>
     -->

    <xsl:choose>
      <xsl:when test="key('columnsWithCaptionValueReferences', $pos)">
        <xsl:variable name="lookupValue" select="key(concat('valueLookupForCol', $pos), $value)"/>
        <xsl:choose>
          <!--
            if a column is readonly:
              if original value exists, we retain it here
              if original value does not exist we take the first available from LOVs
                if no LOV value available we take wrs:null
            -->
          <xsl:when test="key('readOnlyColumn', $pos)">
            <xsl:choose>
              <xsl:when test="$oValue"><xsl:value-of select="$oValue"/></xsl:when>
              <!--
              <xsl:when
                test="count( key('columnsWithCaptionValueReferences', $pos)/wrs:References/wrs:Wrs/wrs:Data/wrs:R) = 1
                  and
                  $oValue
                "><xsl:copy-of select="$oValue/node()"/></xsl:when>
               -->
               <!--
              <xsl:when
                test="count( key('columnsWithCaptionValueReferences', $pos)/wrs:References/wrs:Wrs/wrs:Data/wrs:R) = 1
                  and
                  not($oValue)
                "><xsl:copy-of select="$lookupValue"/></xsl:when>
                -->
<!--              <xsl:when test="$oValue"><xsl:value-of select="$oValue"/></xsl:when>-->
<!--
              <xsl:otherwise><wrs:null keyCol="" readOnlyColumn="readOnlyColumn"/></xsl:otherwise>
 -->
              <xsl:otherwise>
                <xsl:choose>
                  <xsl:when test="$lookupValue"><xsl:copy-of select="$lookupValue"/></xsl:when>
                  <xsl:otherwise><wrs:null keyCol="" readOnlyColumn="readOnlyColumn"/></xsl:otherwise>
                </xsl:choose>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:when>
          <!-- ambiguous case: render as: '!val1!val2!..!valN!'; TODO: for the future needs concept of rowFilterXPath compatible with pasting -->
          <xsl:when test="count($lookupValue)&gt;1"><xsl:text>!</xsl:text>
            <xsl:for-each select="$lookupValue">
              <xsl:value-of select="."/><xsl:text>!</xsl:text>
            </xsl:for-each>
          </xsl:when>
          <xsl:when test="$lookupValue"><xsl:copy-of select="$lookupValue/node()"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="$value"/></xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <xsl:when test="key('readOnlyColumn', $pos) and not($oValue)">
        <wrs:null readOnlyColumn="readOnlyColumn"/>
      </xsl:when>
      <xsl:when test="key('readOnlyColumn', $pos) and $oValue">
        <xsl:copy-of select="$oValue/node()"/>
      </xsl:when>
      <xsl:when test="$value = ''"><wrs:null/></xsl:when>
      <xsl:otherwise><xsl:value-of select="$value"/></xsl:otherwise>
    </xsl:choose>

  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="wrs:C" mode="replaceData">
    <xsl:param name="rowNum"/>
    <xsl:variable name="pos" select="position()"/>

    <!-- Create "wrs:C" element -->

    <xsl:choose>
      <xsl:when test="$pos >= $x1 and $pos &lt;= $actualX2">
        <xsl:copy>
          <xsl:apply-templates select="@*"/>
          <xsl:variable name="value" select="$clipboardData/csv:CSVData/csv:R[($rowNum - $y1) mod $csvDataRowCount + 1]/csv:C[($pos - $x1) mod $csvDataColCount + 1]"/>
          <xsl:call-template name="getValue">
            <xsl:with-param name="pos" select="$pos"/>
            <xsl:with-param name="value" select="$value"/>
            <xsl:with-param name="oValue" select="."/>
<!--            <xsl:with-param name="rowNum" select="$rowNum"/>-->
          </xsl:call-template>
          <!--
          <xsl:choose>
            <xsl:when test="key('columnsWithCaptionValueReferences', $pos)">
              <xsl:variable name="lookupValue" select="key(concat('valueLookupForCol', $pos), $value)"/>
              <xsl:choose>
                <xsl:when test="$lookupValue"><xsl:copy-of select="$lookupValue/node()"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="$value"/></xsl:otherwise>
              </xsl:choose>
            </xsl:when>
            <xsl:when test="$value = ''"><wrs:null/></xsl:when>
            <xsl:otherwise><xsl:value-of select="$value"/></xsl:otherwise>
          </xsl:choose>
          -->
        </xsl:copy>
      </xsl:when>

      <xsl:otherwise>
        <xsl:apply-templates select="."/>
      </xsl:otherwise>
    </xsl:choose>

    <!-- Create "wrs:O" element -->

    <xsl:variable name="successor" select="following-sibling::*[1]/self::wrs:O"/>
    <xsl:choose>

      <!-- Insert Rows do not have "wrs:O" elements -->
      <xsl:when test="parent::wrs:I"/>

      <xsl:when test="$successor">
        <xsl:copy-of select="$successor"/>
      </xsl:when>

      <xsl:otherwise>
        <wrs:O>
          <xsl:copy-of select="node()"/>
        </wrs:O>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="wrs:M | wrs:I" mode="replaceData">
    <xsl:param name="rowNum"/>
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:apply-templates select="wrs:C" mode="replaceData">
        <xsl:with-param name="rowNum" select="$rowNum"/>
      </xsl:apply-templates>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:R" mode="replaceData">
    <xsl:param name="rowNum"/>
    <wrs:M>
      <xsl:apply-templates select="@*"/>
      <xsl:apply-templates select="wrs:C" mode="replaceData">
        <xsl:with-param name="rowNum" select="$rowNum"/>
      </xsl:apply-templates>
    </wrs:M>
  </xsl:template>

</xsl:stylesheet>
