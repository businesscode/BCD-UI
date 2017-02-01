<?xml version="1.0" encoding="UTF-8" standalone="no"?>
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
<xsl:stylesheet xmlns="http://www.w3.org/1999/xhtml" version="1.0"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
xmlns:xapi="http://www.businesscode.de/schema/bcdui/xmlapi-1.0.0">

<xsl:output encoding="UTF-8" indent="no" method="html" version="1.0"/>
<xsl:param name="bcdContextPath"/>
<xsl:param name="bcdInputModelId"/>

<xsl:template name="extractJsParameters">
  <xsl:param name="parameterString" select="''"/>
  var parametersString = "<xsl:value-of select="$parameterString"/>";
  if( parametersString == "") {
    var params = bcdui.core.bcdParamBag[bcdui.core.bcdParamBag.length-1].parameters;
    if ( params ) {
      for( p in params ) {
        parametersString += parametersString!="" ? ", " : "";
        parametersString += p+": "+params[p]+"";
      }
    }
    parametersString = "{ "+parametersString+" }";
  }
  var parameters = eval('('+parametersString+')');
</xsl:template>

</xsl:stylesheet>
