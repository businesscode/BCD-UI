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
  This stylesheets formats the ValidationResults within an Wrs document for a fly-over.
  Input: validated Wrs with a node /Wrs/Header/ValidationResult if it has any error
  output: HTML for use in fly-over
  bcdRowIdent and bcdColIdent of the HTML table provided via fly-over are used to identify the corresponding col/row in the underlying data.
  i18n is handled via standard BCDUI i18n mechanism (bcdTranslate attributes are created here)
  -->

<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  exclude-result-prefixes="exslt msxsl">

<xsl:output method="html" encoding="UTF-8" indent="yes"/>

<xsl:key name="validationMessages" use="concat(../wrs:C[1],'_$_',../wrs:C[2])" match="/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Data/wrs:R/wrs:C[3]"/>

<xsl:param name="bcdRowIdent"/>
<xsl:param name="bcdColIdent"/>

<!--
  Create an HTML table with a row per error concerning the cell
 -->
<xsl:template match="/">
  <xsl:if test="key('validationMessages',concat($bcdRowIdent,'_$_',$bcdColIdent))">
    <table>
      <xsl:for-each select="key('validationMessages',concat($bcdRowIdent,'_$_',$bcdColIdent))">
        <tr><td bcdTranslate="{.}"><xsl:value-of select="."/></td></tr>
      </xsl:for-each>
    </table>
    <div />
  </xsl:if>
</xsl:template>

</xsl:stylesheet>