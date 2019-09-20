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
  xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:b="http://www.businesscode.de/schema/bcdui/bindings-1.0.0"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:chain="http://www.businesscode.de/schema/bcdui/chain-1.0.0"
  xmlns:chart="http://www.businesscode.de/schema/bcdui/charts-1.0.0"
  xmlns:grid="http://www.businesscode.de/schema/bcdui/grid-1.0.0"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:csv="http://www.businesscode.de/schema/bcdui/csv-1.0.0"
  xmlns:ctx="http://www.businesscode.de/schema/bcdui/contextMenu-1.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  xmlns:menu="http://www.businesscode.de/schema/bcdui/menu-1.0.0"
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:sec="http://www.businesscode.de/schema/bcdui/subjectsettings-1.0.0"
  xmlns:env="http://www.w3.org/2003/05/soap-envelope"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:xapi="http://www.businesscode.de/schema/bcdui/xmlapi-1.0.0"
  xmlns:xi="http://www.w3.org/2001/XInclude"
  xmlns:fmla="http://www.businesscode.de/schema/bcdui/xsltFormulas-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:date="http://exslt.org/dates-and-times"
  xmlns:tree="http://www.businesscode.de/schema/bcdui/tree-1.0.0"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt">

  <!-- Please note that any namespace must also me declared in this xslt
       as it does copy user given XPath expressions as literals into its output xslt

       Creates a stylesheet which then will create an option model based on the input model but taking
       additional restrictions into account referring to further models. These show up as params in the generated stylsheet.
       The output is:

       Values[Value*]: Values element contains n - Value elements
       Value[@caption, @lowerCaseCaption?, CDATA]: Value element contains a specific value,
       and has following attributes:
        - caption: the caption
        - lowerCaseCaption: optional attribute carrying the lowercase caption to a performant ignore-case lookup, in case 'addLowerCaseCaption' is set to true
        - doRetainInputSchema: (default false), usually the output format is //Values/Value* as per given valuesPath, but in case we want to keep original source schema,
          this flag can be set to 'true', this allows us to leverage multi-doc resolution of this wrapper yet keeping original source schema.

        TODO: feature: in addition to 'doRetainInputSchema' add optionsModelRelativeValueXPath and optionsModelRelativeCaptionXPath which only applies when passing options
              and merges bcdCaption and bcdValue attributes with values from given xpaths

       -->

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt" />

  <xsl:namespace-alias stylesheet-prefix="xsla" result-prefix="xsl"/>

  <xsl:param name="models" />
  <xsl:param name="valuesPath" />
  <xsl:param name="optionsModelRelativeValueXPath" />
  <xsl:param name="addLowerCaseCaption" select="'false'"/>
  <xsl:param name="doRetainInputSchema" select="'false'"/>
  <xsl:param name="doSortOptions" select="'false'"/>

  <xsl:variable name="_addLowerCaseCaption" select="$addLowerCaseCaption = 'true'"/>
  <xsl:variable name="_doRetainInputSchema" select="$doRetainInputSchema = 'true'"/>
  <xsl:variable name="_doSortOptions" select="$doSortOptions = 'true'"/>

  <xsl:template match="/*">
    <xsla:stylesheet version="1.0" exslt:dummy="dummy">
      <xsl:attribute name="version">1.0</xsl:attribute>

      <xsl:element name="script" namespace="urn:schemas-microsoft-com:xslt">
        <xsl:attribute name="language">JScript</xsl:attribute>
        <xsl:attribute name="implements-prefix">exslt</xsl:attribute>
        <xsl:text>this['node-set'] = function (x) { return x; }</xsl:text>
      </xsl:element>

      <xsl:element name="output" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="version">1.0</xsl:attribute>
        <xsl:attribute name="method">xml</xsl:attribute>
        <xsl:attribute name="encoding">UTF-8</xsl:attribute>
        <xsl:attribute name="indent">yes</xsl:attribute>
      </xsl:element>

      <!-- Here we generate a param for each model on which we have a restriction -->
      <xsl:call-template name="writeParams">
        <xsl:with-param name="paramModels"><xsl:value-of select="$models"/></xsl:with-param>
      </xsl:call-template>

      <xsl:choose>
        <!-- TODO: for future implementation -->
        <xsl:when test="false()">
          <!--
            in case of retaining input schema with merge option we rewrite original elements pointed to by $valuesPath
            and merge bcdCaption attribute by our optionsModelRelativeValueXPath and optionsModelRelativeCaptionXPath
           -->
          <!--
          <xsla:template match="@*" mode="BCD_REWRITE">
            <xsla:apply-templates select=".." mode="BCD_REWRITE">
              <xsla:with-param name="caption" select="."/>
            </xsla:apply-templates>
          </xsla:template>

          <xsla:template match="*" mode="BCD_REWRITE">
          <xsla:param name="caption" select="."/>
            <xsla:copy>
              <xsla:attribute name="bcdCaption"><xsla:value-of select="$caption"/></xsla:attribute>
              <xsla:copy-of select="@*|*"/>
            </xsla:copy>
          </xsla:template>
           -->
        </xsl:when>
        <xsl:otherwise>
          <!-- prerequisites for default handling -->
          <xsla:variable name="optionsRawString">
            <Values>
              <xsl:element name="for-each" namespace="http://www.w3.org/1999/XSL/Transform">
                <xsl:attribute name="select"><xsl:value-of select="$valuesPath"/></xsl:attribute>
                <xsl:if test="$_doSortOptions">
                  <xsl:element name="sort" namespace="http://www.w3.org/1999/XSL/Transform">
                    <xsl:attribute name="select">.</xsl:attribute>
                  </xsl:element>
                </xsl:if>
                <Value>
                  <xsl:attribute name="caption">{.}</xsl:attribute>
                  <xsl:if test="$_addLowerCaseCaption"><xsl:attribute name="lowerCaseCaption">{translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')}</xsl:attribute></xsl:if>
                  <xsl:element name="value-of" namespace="http://www.w3.org/1999/XSL/Transform">
                    <xsl:attribute name="select"><xsl:value-of select="$optionsModelRelativeValueXPath"></xsl:value-of></xsl:attribute>
                  </xsl:element>
                </Value>
              </xsl:element>
            </Values>
          </xsla:variable>

          <xsla:variable name="optionsRaw" select="exslt:node-set($optionsRawString)/Values/*"/>
          <xsla:key name="distinctOptions" match="/Values/Value" use="."/>
        </xsl:otherwise>
      </xsl:choose>

      <xsl:element name="template" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="match">/*</xsl:attribute>

        <xsl:choose>
          <!-- TODO enable this once we implement the 'retain schema with merge option', this template is ready to go, add implementation to prerequisites block above -->
          <xsl:when test="false()">
          <!--
             <Values>
              <xsl:element name="apply-templates" namespace="http://www.w3.org/1999/XSL/Transform">
                <xsl:attribute name="select"><xsl:value-of select="$valuesPath"/></xsl:attribute>
                <xsl:attribute name="mode">BCD_REWRITE</xsl:attribute>
              </xsl:element>
             </Values>
           -->
          </xsl:when>
          <xsl:when test="$_doRetainInputSchema">
            <!--
              we simply copy the matched node-set

              TODO: enhance: to optimize DOM pollution create Values with the namespace of node in $valuesPath,
              as otherwise each child gets explicit default namespace which impacts performance on WebKit
              due to more serialization overhead
            -->
            <Values>
              <xsl:element name="copy-of" namespace="http://www.w3.org/1999/XSL/Transform">
                <xsl:attribute name="select"><xsl:value-of select="$valuesPath"/></xsl:attribute>
              </xsl:element>
            </Values>
          </xsl:when>
          <xsl:otherwise>
            <!-- default handling -->
            <Values>
              <xsla:for-each select="$optionsRaw">
                <xsla:if test="generate-id(.)=generate-id(key('distinctOptions',.))">
                  <xsla:copy-of select="."/>
                </xsla:if>
              </xsla:for-each>
            </Values>
          </xsl:otherwise>

        </xsl:choose>

      </xsl:element>

    </xsla:stylesheet>
  </xsl:template>

  <!-- Create params for each model on which $optionsModelRelativeValueXPath refers -->
  <xsl:template name="writeParams">
    <xsl:param name="paramModels"/>
    <xsl:element name="param"  namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:choose>
        <xsl:when test="contains($paramModels, ' ')"><xsl:attribute name="name"><xsl:value-of select="substring-after(substring-before($paramModels, ' '), '$')"/></xsl:attribute></xsl:when>
        <xsl:otherwise><xsl:attribute name="name"><xsl:value-of select="substring-after($paramModels, '$')"/></xsl:attribute></xsl:otherwise>
      </xsl:choose>
    </xsl:element>
    <xsl:choose>
        <xsl:when test="contains($paramModels, ' ')">
          <xsl:call-template name="writeParams">
            <xsl:with-param name="paramModels"><xsl:value-of select="substring-after($paramModels,' ')"/></xsl:with-param>
          </xsl:call-template>
        </xsl:when>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>