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
  xmlns:gen="http://businesscode.de/generated"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <xsl:import href="../stringUtil.xslt"/>

  <xsl:output method="xml" media-type="text/xslt" indent="no" version="1.0" encoding="UTF-8"/>

  <xsl:variable name="validationTemplate" select="document('validateWrsTemplate.xslt')"/>
  <xsl:variable name="keyColumns" select="/*/wrs:Header/wrs:Columns/wrs:C[@isKey = 'true']"/>
  <xsl:variable name="referencesWithRowFilterXPath" select="/*/wrs:Header/wrs:Columns/wrs:C[wrs:References/@rowFilterXPath]"/>

  <!-- standard copy template -->
  <xsl:template match="@*|node()"  mode="generateXSLT">
    <xsl:copy><xsl:apply-templates select="@*|node()" mode="generateXSLT"/></xsl:copy>
  </xsl:template>

  <xsl:template match="/*">
     <xsl:apply-templates select="$validationTemplate/*" mode="generateXSLT"/>
  </xsl:template>

  <xsl:template match="gen:keyGeneration" mode="generateXSLT">
    <xsl:element name="key" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">keyRows</xsl:attribute>
      <xsl:attribute name="match">/*/wrs:Data/wrs:*</xsl:attribute>
      <xsl:attribute name="use">
        <xsl:choose>
          <xsl:when test="count($keyColumns)>1">concat(<xsl:for-each select="$keyColumns">wrs:C[<xsl:value-of select="@pos" />]/text(),'|',</xsl:for-each>'')</xsl:when>
          <xsl:when test="count($keyColumns)=1">wrs:C[<xsl:value-of select="$keyColumns/@pos" />]</xsl:when>
          <xsl:otherwise>.</xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
       </xsl:element>
  </xsl:template>

  <xsl:template match="gen:currentValueGeneration" mode="generateXSLT">
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">currentValue</xsl:attribute>
      <xsl:attribute name="select">
        <xsl:choose>
          <xsl:when test="count($keyColumns)>1">concat(<xsl:for-each select="$keyColumns">wrs:C[<xsl:value-of select="@pos" />]/text(),'|',</xsl:for-each>'')</xsl:when>
          <xsl:when test="count($keyColumns)=1">wrs:C[<xsl:value-of select="$keyColumns/@pos" />]</xsl:when>
          <xsl:otherwise>/*[1=2]/*</xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
    </xsl:element>
  </xsl:template>

  <xsl:template match="gen:ReferencesCheckWithRowFilterXPath" mode="generateXSLT">
    <xsl:variable name="currentElement" select="."/>
    <xsl:for-each select="$referencesWithRowFilterXPath">
      <xsl:variable name="rowFilterXPath">
        <xsl:call-template name="replaceString">
          <xsl:with-param name="str" select="wrs:References/@rowFilterXPath"/>
          <xsl:with-param name="find">${rowNo}</xsl:with-param>
          <xsl:with-param name="replacement">$rowNum</xsl:with-param>
        </xsl:call-template>
      </xsl:variable>
      <xsl:comment>
        gen:ReferencesCheckWithRowFilterXPath for rowFilterPath: <xsl:value-of select="$rowFilterXPath"/>
      </xsl:comment>
      <xsl:element name="template" namespace="http://www.w3.org/1999/XSL/Transform">
       <xsl:attribute name="match">wrs:C[@pos = <xsl:value-of select="@pos"/>]/wrs:References</xsl:attribute>
       <xsl:apply-templates select="$currentElement/*" mode="rowFilterXPath">
         <xsl:with-param name="rowFilterXPath" select="$rowFilterXPath"/>
       </xsl:apply-templates>
     </xsl:element>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="node()"  mode="rowFilterXPath">
    <xsl:param name="rowFilterXPath"/>
    <xsl:element name="{local-name()}" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:copy-of select="@*"/>
      <xsl:apply-templates select="node()" mode="rowFilterXPath">
        <xsl:with-param name="rowFilterXPath" select="$rowFilterXPath"/>
      </xsl:apply-templates>
    </xsl:element>
  </xsl:template>

  <xsl:template match="gen:DynamicXPathTest" mode="rowFilterXPath">
    <xsl:param name="rowFilterXPath"/>
    <xsl:element name="if" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="test"><xsl:value-of select="concat('not(', @baseXPath, '[', $rowFilterXPath, '])')"/></xsl:attribute>
      <xsl:apply-templates select="*" mode="generateXSLT"/>
    </xsl:element>
  </xsl:template>
</xsl:stylesheet>
