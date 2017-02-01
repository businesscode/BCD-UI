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
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  >

  <xsl:output method="xml" version="1.0" indent="no" encoding="UTF-8"/>

  <xsl:param name="bcdI18nModel" select="*[false()]"/>

  <xsl:variable name="isNormalized" select="boolean($bcdI18nModel/*/@isKeyNormalized = 'true')"/>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template name="getMessageByKey">
    <xsl:param name="key"/>
    <xsl:variable name="elName">
      <xsl:choose>
        <xsl:when test="$isNormalized = true()">
          <xsl:value-of select="translate($key, translate($key, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789-', ''), '')"/>
        </xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="$key"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:variable>

    <xsl:value-of select="$bcdI18nModel//*[name() = $elName]"/>
  </xsl:template>

</xsl:stylesheet>
