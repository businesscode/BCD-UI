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
  xmlns:bcd="http://www.businesscode.de/schema/bcdui/html-extensions-1.0.0">

  <xsl:output method="html" encoding="UTF-8"
    indent="no" />

<xsl:output method="html" encoding="UTF-8" indent="no"/>

<!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
<xsl:template name="createTabMenu">
  <!-- tab id -->
  <xsl:param name="id"/>
  <!-- URL to renderer xslt stylesheet -->
  <xsl:param name="rendererUrl"/>
  <!-- renderer id -->
  <xsl:param name="rendererId"/>
  <!-- Tab menu handler variable name, default bcdui.widget.tab -->
  <xsl:param name="handlerJsClassName"/>
  <!-- target where HTML content to paste to -->
  <xsl:param name="targetHTMLElementId"/>
  <!-- id of/or HTML element where tabs are defined -->
  <xsl:param name="idOrElement"/>

  <div style="display: none;" bcdOnLoad="bcdui.widget.tab.initFromHtml"
   data-id="{$id}"
   data-renderer-url="{$rendererUrl}"
   data-renderer-id="{$rendererId}"
   data-handler-js-class-name="{$handlerJsClassName}"
   data-target-html-element-id="{$targetHTMLElementId}"
   data-id-or-element="{$idOrElement}"></div>
</xsl:template>

</xsl:stylesheet>
