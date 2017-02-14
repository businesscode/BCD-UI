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
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
  xmlns:bd="http://www.businesscode.de/schema/bcdui/doc-1.1.0">

  <!--
       Common part for documentation generating stylesheets
    -->
  <xsl:import href="../../../Client/src/js/widget/visualizeXml/visualizeXml.xslt"/>

  <xsl:template name="docHead">
    <xsl:param name="contentPath"/>
    <head>
      <xsl:call-template name="visualizeXml_head">
        <xsl:with-param name="contentPath"/>
      </xsl:call-template>
      <style>
        img {
          margin: 20px;
        }
        fieldset {
          padding: 5px;
        }
        fieldset legend {
          font-weight: bold;
          background-color: #c0c0c0;
          padding: 5px;
        }
        pre {
          line-height: 17px;
          font: courier 12px;
          padding: 5px 10px 5px 10px;
          margin: 10px 15px 10px 15px;
          background-color: #f8f8ff;
        }
        code {
          font: courier;
          padding: 5px;
          white-space: nowrap;
        }
        table.sampleDbTable {
          border: 1px solid gray;
          border-collapse: collapse;
          font-size: 12px;
          margin: 10px 25px 10px 25px;
        }
        table.sampleDbTable td {
          border: 1px solid gray;
          padding: 2px 8px 2px 2px;
          text-align: right;
          white-space: nowrap;
        }
        table.sampleDbTable colgroup.dims {
          background-color: #EEE;
        }
        table.sampleDbTable tr:first-child td {
          background-color: #EEE;
          font-weight: bold;
          border-bottom: 2px solid black;
          text-align: left;
        }
        table.propertyList{
          font: courier;
          font-size: 13px;
          border-collapse: collapse;
          margin: 15px 2% 15px 2%;
          width: 96%;
        }
        table.propertyList td {
          border: 1px solid gray;
          padding: 1px 5px 1px 5px;
          vertical-align: top
        }
        table.propertyList td.opt {
          border: 1px solid gray;
          padding: 1px 5px 1px 5px;
          font: italic;
        }
        table.propertyList th {
          border: 1px solid gray;
          padding: 1px 5px 1px 5px;
          background-color: #FAFAFA;
          text-align: left;
        }
        table.jspAttributes{
          width: 90%;
          background-color: black;
        }
        table.jspAttributes th {
          background-color: #404040;
          color: white;
        }
        table.jspAttributes td{
          background-color: white;
          padding: 5px;
        }
        dl {
          margin: 8px 8px 8px 0px;
          display: block;
        }
        dt {
          color: #cc0000;
          margin-top: 5px;
          font: italic;
          display: block;
        }
        dd {
          margin-left: 25px;
          display: block;
        }
        dl.featureList dt {
          font-style: normal;
        }
        .hiddenPDFHeader { font-size:0px; color:white; margin-bottom:0px; } /* cannot be display:none because it woule be ignored by pd4ml */
        .h3Style {font-size:14pt; font-weight: bold; color: #ff7f00; margin: 5px 0 5px 0}
        h3 {font-size:14pt; font-weight: bold; color: #ff7f00; margin: 5px 0 5px 0}

        a { background: url('<xsl:value-of select="$contentPath"/>/link.png') no-repeat; padding-left:13px; margin-left: 2px }
        a[generated=true] { background-image: none; padding-left:0px ; margin-left: 0px}
        pre a { background-image: none; padding-left:0px ; margin-left: 0px}
        Xa[href^=".."] { background-image: url('<xsl:value-of select="$contentPath"/>/bcd_small.png') }
        
        .apiList dt { border: 1px dashed #cc0000; padding-left: 20px; margin: 10px 0px 0px 20px; width: 50%; background-color: #ff7f00; color: #FFFFFF;}
       </style>
    </head>
  </xsl:template>

  <!-- The header contains several workarounds due to pd4ml limits, so be careful if changing -->
  <xsl:template name="header">
    <xsl:param name="anchor"/>
    <xsl:param name="title"/>
    <xsl:param name="chapterOneTitle"/>
    <xsl:param name="targetForBcdUiLink" select="'http://www.business-code.de'"/>
    <h2 class="hiddenPDFHeader"><xsl:value-of select="$title"/></h2>
    <h3 class="hiddenPDFHeader">1. <xsl:value-of select="$chapterOneTitle"/></h3>
    <a href="http://www.business-code.de" generated="true" style="position:absolute;border-style:none;margin:15px 0 0 5px;width:90px; height:90px"/>
    <div style="margin:0 0 10px 0;background-image:url('{$contentPath}/headerBack.png'); height: 87px">
      <a id="{$anchor}" generated="true"></a>
      <a href="{$targetForBcdUiLink}" generated="true">
        <div style="font-size:18pt;font-weight:bold;margin-left:700px;color: #ffffff;margin-bottom:0px;padding-right:22px;padding-top:10px;text-align:right;text-decoration:none">BCD-UI</div>
      </a>
    </div>
  </xsl:template>

  <xsl:template name="computeMinIndent">
    <xsl:param name="content"/>
    <xsl:param name="minSoFar" select="0"/>
    <xsl:variable name="row" select="substring-before(concat($content, '&#10;'), '&#10;')"/>
    <xsl:variable name="rest" select="substring-after($content, '&#10;')"/>

    <xsl:variable name="normalizedRow" select="normalize-space($row)"/>
    <xsl:variable name="pos" select="string-length(substring-before($row, substring($normalizedRow, 1, 1)))"/>

    <xsl:choose>
      <xsl:when test="normalize-space(substring($row, 1, 1)) != ''"><xsl:value-of select="'0'"/></xsl:when>
      <xsl:when test="string-length(normalize-space($rest)) > 0">
        <xsl:call-template name="computeMinIndent">
          <xsl:with-param name="content" select="$rest"/>
          <xsl:with-param name="minSoFar">
            <xsl:choose>
              <xsl:when test="($minSoFar = 0) or ($pos > 0 and number($minSoFar) > $pos)"><xsl:value-of select="$pos"/></xsl:when>
              <xsl:otherwise><xsl:value-of select="$minSoFar"/></xsl:otherwise>
            </xsl:choose>
          </xsl:with-param>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="$minSoFar = 0">
        <xsl:value-of select="$pos"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$minSoFar"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="printRows">
    <xsl:param name="content"/>
    <xsl:param name="minIndent"/>
    <xsl:param name="emptyRowsSoFar" select="true()"/>
    <xsl:variable name="row" select="substring-before(concat($content, '&#10;'), '&#10;')"/>
    <xsl:variable name="rest" select="substring-after($content, '&#10;')"/>
    <xsl:if test="normalize-space($row) != '' or not($emptyRowsSoFar)">
      <xsl:value-of select="concat(substring($row, $minIndent), '&#10;')"/>
    </xsl:if>
    <xsl:if test="string-length(normalize-space($rest)) > 0">
      <xsl:call-template name="printRows">
        <xsl:with-param name="content" select="$rest"/>
        <xsl:with-param name="minIndent" select="$minIndent"/>
        <xsl:with-param name="emptyRowsSoFar" select="$emptyRowsSoFar and normalize-space($row) = ''"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>
</xsl:stylesheet>
