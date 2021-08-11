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
>

  <!--
    Reads the widget Api spec and generates one big file with Apis in Js, Jsp, Xslt and Xapi
    Each File/@name is then split into implementation files
    Note cvs ID is defined below inside the version variable for usage in generated output
    -->

  <xsl:import href="generator_js.xslt"/>
  <xsl:import href="generator_jsp.xslt"/>
  <xsl:import href="generator_validate.xslt"/>
  <xsl:import href="generator_xslt.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <!-- Used when generating xslts for xslt and xapi -->
  <xsl:namespace-alias stylesheet-prefix="xsla" result-prefix="xsl"/>

  <!-- *****************
    Main document containing APIs for js, jsp-tags and init for js.
   -->
  <xsl:template match="/">
    <Apis>

      <!-- JSP Api, one file per core -->
      <xsl:for-each select="$normalizedApi/*/BcdObject[not(@generateJSP) or @generateJSP='true']">
        <File name="gensrc/taglib/tags/{@tagFolder}/{@name}.tag">
          <xsl:apply-templates select="." mode="jspTag"/>
        </File>
      </xsl:for-each>

      <!-- XSLT / XAPI Api -->
      <File name="gensrc/js/core/core.xslt" outputFormat="xml">
        <xsla:stylesheet version="1.0" xmlns:xapi="http://www.businesscode.de/schema/bcdui/xmlapi-1.0.0">
          <xsla:output method="html" version="1.0" encoding="UTF-8" indent="no"/>
          <xsla:param name="bcdContextPath"/>
          <xsla:param name="bcdInputModelId"/>
          <xsl:text>&#10;</xsl:text>
          <xsl:apply-templates select="$normalizedApi/*/BcdObject[not(@generateXSLT) or @generateXSLT='true']" mode="xslt"/>
          <xsl:text>&#10;</xsl:text>
          <xsl:for-each select="document('../api/bcduiCoreApi_static.xslt')/*/xsl:template">
            <xsl:comment>statically included template</xsl:comment>
            <xsl:text>&#10;</xsl:text>
            <xsl:copy-of select="."/>
            <xsl:text>&#10;&#10;</xsl:text>
          </xsl:for-each>
        </xsla:stylesheet>
      </File>

      <!-- Validate Api -->
      <File name="gensrc/js/core/coreValidate.js">
      <xsl:text>bcdui.factory.validate.core = bcdui.factory.validate.core || new Object();
jQuery.extend( bcdui.factory.validate.core, {&#10;  bcdSyntaxDummy: null&#10;</xsl:text>
        <xsl:apply-templates select="$normalizedApi/*/BcdObject" mode="validate"/>
      <xsl:text>});</xsl:text>
      </File>

    </Apis>
  </xsl:template>

</xsl:stylesheet>
