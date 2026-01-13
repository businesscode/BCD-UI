<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2025 BusinessCode GmbH, Germany

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
  <xsl:import href="generator_xslt.xslt"/>
  

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <!-- Used when generating xslts for xslt and xapi -->
  <xsl:namespace-alias stylesheet-prefix="xsla" result-prefix="xsl"/>

  <!-- *****************
    Main document containing APIs for js, jsp-tags and init for js.
   -->
  <xsl:template match="/">
    <Apis>

      <!-- JS factory methods, mainly setting params as html attributes to the container -->
      <File name="gensrc/js/widgetNg/widgetPackage.js">
        <xsl:text>"use strict";</xsl:text>
        <xsl:text>bcdui.util.namespace("bcdui.widgetNg");</xsl:text>
        <xsl:text>bcdui.util.namespace("bcdui.component.scorecard");</xsl:text>
        <xsl:text>bcdui.util.namespace("bcdui.component.far");</xsl:text>
        <xsl:apply-templates select="$normalizedApi/*/BcdObject" mode="jsFactory"/>
      </File>

      <!-- JS stubs for init() for getting params from html -->
      <File name="gensrc/js/widgetNg/widgetImpl.js">
        <xsl:text>"use strict";</xsl:text>
        <xsl:text>bcdui.util.namespace("bcdui.widgetNg.impl.readParams");</xsl:text>
        <xsl:text>bcdui.util.namespace("bcdui.widgetNg.impl.validateParams");</xsl:text>
        <xsl:text>bcdui.util.namespace("bcdui.component.scorecard.impl.readParams");</xsl:text>
        <xsl:text>bcdui.util.namespace("bcdui.component.scorecard.impl.validateParams");</xsl:text>
        <xsl:text>bcdui.util.namespace("bcdui.component.far.impl.readParams");</xsl:text>
        <xsl:text>bcdui.util.namespace("bcdui.component.far.impl.validateParams");</xsl:text>
        <xsl:text>
/* allowedValues: pipe separated string with allowed values */
bcdui.widgetNg.impl.readParams._validateEnumValues = function(paramBag, paramName, allowedValues){
  var currentValue = paramBag[paramName];
  var _va = allowedValues.split("|");
  for(var i=0;i&lt;_va.length;i++){
    if(_va[i] == currentValue)return true;
  }
  throw new Error("Widget (id='"+paramBag.id+"') init error: invalid value '"+currentValue+"' for parameter '"+paramName+"', allowed values: " + allowedValues);
}
        </xsl:text>
        <xsl:apply-templates select="$normalizedApi/*/BcdObject" mode="jsInitReadParams"/>
        <xsl:apply-templates select="$normalizedApi/*/BcdObject" mode="jsInitValidateParams"/>
      </File>

      <!-- JSP Api, one file per widget -->
      <xsl:for-each select="$normalizedApi/*/BcdObject[not(@generateJSP) or @generateJSP='true']">
        <File name="gensrc/taglib/tags/widgetNg/{@name}.tag">
          <xsl:apply-templates select="." mode="jspTag"/>
        </File>
      </xsl:for-each>

      <!-- XSLT Api -->
      <File name="gensrc/js/widgetNg/widgetNg.xslt" outputFormat="xml">
        <xsla:stylesheet version="1.0" xmlns:xapi="http://www.businesscode.de/schema/bcdui/xmlapi-1.0.0">
          <xsla:output method="html" version="1.0" encoding="UTF-8" indent="no"/>
          <xsl:apply-templates select="$normalizedApi/*/BcdObject[not(@generateXSLT) or @generateXSLT='true']" mode="xslt"/>
        </xsla:stylesheet>
      </File>

    </Apis>
  </xsl:template>

</xsl:stylesheet>
