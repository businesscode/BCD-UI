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
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  version="1.0">

  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes" />

  <!-- models for the input fields -->
  <xsl:param name="rankOrderModelId"/>
  <xsl:param name="targetModelId" />
  <xsl:param name="metaDataModel"/>
  <xsl:param name="objectId"/>

  <xsl:template match="/">
    <xsl:call-template name="renderRankingEditor"/>
  </xsl:template>
  <xsl:template name="renderRankingEditor"/>
</xsl:stylesheet>
