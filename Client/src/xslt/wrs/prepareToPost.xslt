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
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">
  <!--
    Does remove all unchanged rows (i.e. wrs:R) from the Wrs and reorder to wrs:D -> wrs:M -> wrs:I.
    -->

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    The sheet filters/reorders WRS
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~-->
  <xsl:template match="/">
      <xsl:apply-templates/>
  </xsl:template>

  <!--
    dont send RequestDocument to the server, TODO: check if we can also
    skip ValidationResult and References elements, as they are also ignored
    in DataSaver
   -->
  <xsl:template match="wrs:RequestDocument"/>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Please note that the rows are intentionally re-ordered to prevent possible unique key constraint validations. Of course wrs:R are dropped
    We allow standard /wrs:Wrs as well as /*/wrs:Wrs in case of multi-wrs writing
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~-->
  <xsl:template match="wrs:Data">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:copy-of select="wrs:D"/>
      <xsl:copy-of select="wrs:M"/>
      <xsl:copy-of select="wrs:I"/>
    </xsl:copy>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    copy 1:1
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~-->
  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>