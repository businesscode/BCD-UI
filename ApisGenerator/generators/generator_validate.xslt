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
  xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
  xmlns:exslt="http://exslt.org/common"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
>

  <xsl:import href="generator_misc.xslt"/>

  <xsl:template match="BcdObject" mode="validate">
  
    <xsl:variable name="extendsTransformationChain" select="boolean(Api/extends[contains(.,'transformationChain')])"/>

    <xsl:if test="Api/Param and (@implementationFunction != '' or @implementationPackage != '')">
    
      <!-- build function call name out of either implementationFunction or -package -->

      <xsl:variable name="x">
        <xsl:call-template name="lastIndexOf">
          <xsl:with-param name="s" select="@implementationFunction"/>
          <xsl:with-param name="c" select="'.'"/>
        </xsl:call-template>
      </xsl:variable>
      <xsl:variable name="functionCall">
        <xsl:choose>
          <xsl:when test="@implementationFunction != ''">
            <xsl:value-of select="substring(@implementationFunction, number($x + 1))"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:call-template name="addPrefix">
              <xsl:with-param name="name" select="@name"/>
              <xsl:with-param name="prefix" select="'create'"/>
            </xsl:call-template>
    	 </xsl:otherwise>
        </xsl:choose>
      </xsl:variable>
      
      <!-- write object name like "_schema_createModel_args" -->

      <xsl:value-of select="concat('&#10;  /* jsvalidation scheme for ', $functionCall, ' */')"/>
      <xsl:value-of select="concat('&#10;  , _schema_', $functionCall, '_args:')"/>
      <xsl:text>&#10;    {</xsl:text>
      <xsl:value-of select="concat('&#10;      name: ', $qq, '_schema_', $functionCall, '_args', $qq, ',')"/>

      <!-- followed by the single properties... -->

      <xsl:text>&#10;      properties: {</xsl:text>
  
      <xsl:for-each select="Api/Param">
      
        <xsl:variable name="typeToken">
          <xsl:call-template name="tokenize">
            <xsl:with-param name="string" select="@type" />
            <xsl:with-param name="delimiter" select="'|'" />
          </xsl:call-template>
        </xsl:variable>
        <xsl:variable name="types" select="exslt:node-set($typeToken)" />

        <xsl:variable name="type">
          <xsl:if test="count($types/wrs:Wrs/wrs:Data/wrs:R/wrs:C) &gt; 1">[</xsl:if>
          <xsl:for-each select="$types/wrs:Wrs/wrs:Data/wrs:R/wrs:C[1]">
            <xsl:if test="position() &gt; 1">,</xsl:if>
          <!-- map type to a known jsvalidation type -->
            <xsl:choose>
              <xsl:when test=".='string'">&quot;string&quot;</xsl:when>
              <xsl:when test=".='htmlElement'">&quot;htmlElement&quot;</xsl:when>
              <xsl:when test=".='targetHtmlRef'">&quot;targetHtmlRef&quot;</xsl:when>
              <xsl:when test=".='dataProvider'">&quot;dataProvider&quot;</xsl:when>
              <xsl:when test=".='url'">&quot;string&quot;</xsl:when>
              <xsl:when test=".='boolean'">&quot;boolean&quot;</xsl:when>
              <xsl:when test=".='stringList'">&quot;string&quot;</xsl:when>
              <xsl:when test=".='absoluteXPath'">&quot;string&quot;</xsl:when>
              <xsl:when test=".='relativeXPath'">&quot;string&quot;</xsl:when>
              <xsl:when test=".='absoluteXPathWithDollar'">&quot;string&quot;</xsl:when>
              <xsl:when test=".='xpath'">&quot;string&quot;</xsl:when>
              <xsl:when test=".='writableModelXPath'">&quot;string&quot;</xsl:when>
              <xsl:when test=".='booleanWithDefault'">&quot;boolean&quot;</xsl:when>
              <xsl:when test=".='number'">&quot;number&quot;</xsl:when>
              <xsl:when test=".='integer'">&quot;integer&quot;</xsl:when>
              <xsl:when test=".='function'">&quot;function&quot;</xsl:when>
              <xsl:when test=".='array'">&quot;array&quot;</xsl:when>
              <xsl:when test=".='jsattr'">&quot;string&quot;</xsl:when>
              <xsl:when test=".='object'">&quot;object&quot;</xsl:when>
              <xsl:when test=".='jQuery'">&quot;jquery&quot;</xsl:when>
              <xsl:otherwise>
                <xsl:value-of select="concat('&quot;', @type, '&quot;')"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:for-each>
          <xsl:if test="count($types/wrs:Wrs/wrs:Data/wrs:R/wrs:C) &gt; 1">]</xsl:if>
        </xsl:variable>

        <xsl:variable name="required">
          <xsl:choose>
            <xsl:when test="@name='targetHtml' or @name='targetHTMLElementId' or @name='targetHtmlElementId'">true</xsl:when>
            <xsl:when test="@required='true'">true</xsl:when>
            <xsl:otherwise>false</xsl:otherwise>
          </xsl:choose>
        </xsl:variable>

        <!-- map type to a known jsvalidation pattern -->
        <xsl:variable name="pattern">
          <xsl:choose>
            <xsl:when test="@name='targetHTMLElementId' or @name='targetHtmlElementId'">, pattern: bcdui.factory.validate.jsvalidation._patterns.htmlElementId</xsl:when>
            <xsl:when test="contains(@type, 'absoluteXPathWithDollar')">, pattern: bcdui.factory.validate.jsvalidation._patterns.absoluteXPathWithDollar</xsl:when>
            <xsl:when test="contains(@type, 'absoluteXPath')">, pattern: bcdui.factory.validate.jsvalidation._patterns.absoluteXPath</xsl:when>
            <xsl:when test="contains(@type, 'relativeXPath')">, pattern: bcdui.factory.validate.jsvalidation._patterns.relativeXPath</xsl:when>
            <xsl:when test="contains(@type, 'dataProvider')">, pattern: bcdui.factory.validate.jsvalidation._patterns.dataProviderId</xsl:when>
          </xsl:choose>
        </xsl:variable>

        <!-- first entry does not have a leading comma, the rest does -->
        <xsl:variable name="x">
          <xsl:choose>
            <xsl:when test="position() &gt; 1"><xsl:text>    , </xsl:text></xsl:when>
            <xsl:otherwise><xsl:text>      </xsl:text></xsl:otherwise>
          </xsl:choose>
        </xsl:variable>

        <!-- get the correct js naming of the parameter -->
        <xsl:variable name="name">
          <xsl:choose>
            <xsl:when test="@jsName"><xsl:value-of select="@jsName"/></xsl:when>
            <xsl:otherwise><xsl:value-of select="@name"/></xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:value-of select="concat('&#10;  ', $x, $name, ':', ' { type: ', $type, ', required: ', $required, $pattern, ' }')"/>
      </xsl:for-each>
      
      <!-- trafo chain gets additional params -->
      <xsl:if test="$extendsTransformationChain">
        <xsl:text>&#10;      , dataProviders: { type: "array", required: false }</xsl:text>
        <xsl:text>&#10;      , parameters: { type: "object", required: false }</xsl:text>
      </xsl:if>
      
      <!-- add bcdSyntaxDummy (from jsp) as optional parameter to prevent obsolete warnings -->
      <xsl:text>&#10;      , bcdSyntaxDummy: { type: "string", required: false }</xsl:text>
  
      <xsl:text>&#10;      }</xsl:text>
      <xsl:text>&#10;    }&#10;</xsl:text>
    </xsl:if>
  </xsl:template>

</xsl:stylesheet>
