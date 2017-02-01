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
                xmlns:doc="http://www.businesscode.de/schema/bcdui/doc-1.1.0">

<!-- 
     Generates a nice over page from siteIndex.xml
  -->

<xsl:import href="common.xslt"/>
<xsl:output method="html" version="1.0" encoding="UTF-8" indent="no"
            doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"
            doctype-public="-//W3C//DTD XHTML 1.0 Transitional//EN"/>

<xsl:variable name="quot">"</xsl:variable>
<xsl:variable name="contentPath" select="concat(translate(substring-before(substring-after(/processing-instruction('xml-stylesheet'),'href='),'_generator'),$quot,''),'content')"/>
<xsl:variable name="docs" select="document('../content/siteIndex.xml')"/>

<xsl:template match="/">
  <html>
    <head>
      <style type="text/css">
        tr { vertical-align:top }
        .hiddenPDFHeader { font-size:0px; color:white; margin-bottom:0px; display:none }
      </style>
    </head>
    <body style="text-align:center;font-family: 'jaf-bernino-sans', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Geneva, Verdana, sans-serif; font-size: 0.9em">
      <div style="width:1024px;text-align:left">
        <xsl:call-template name="header">
          <xsl:with-param name="title">BCD-UI</xsl:with-param>
          <xsl:with-param name="targetForBcdUiLink" select="concat($contentPath,'/overviewPage.xml')"/>
        </xsl:call-template>
      </div>
      <table border="0" style="width:1024px; text-align:left; line-height:130%">
        <xsl:for-each select="$docs/Docs/Block[position() mod 2 = 1]">
          <tr>
            <td style="width:50%">
              <h2 style="color: #ff7f00"><xsl:value-of select="@title"/></h2>
              <ul>
                <xsl:for-each select="./DocUrl">
                  <li><a href="{.}"><xsl:value-of select="document(.)/doc:Doc/@title"/></a></li>
                </xsl:for-each>
              </ul>
            </td>
            <td style="width:50%">
              <h2 style="color: #ff7f00"><xsl:value-of select="following-sibling::Block[1]/@title"/></h2>
              <ul>
                <xsl:for-each select="following-sibling::Block[1]/DocUrl">
                  <li><a href="{.}"><xsl:value-of select="document(.)/doc:Doc/@title"/></a></li>
                </xsl:for-each>
              </ul>
            </td>
          </tr>
        </xsl:for-each>
      </table>
    </body>
  </html>
</xsl:template>

</xsl:stylesheet>