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
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

  <xsl:import href="visualizeXml.xslt"/>
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:template match="/">
    <div class="bcdVisualizeXml">
      <xsl:call-template name="visualizeXml_head"/>
      <xsl:apply-templates mode="visualizeXml"/>
    </div>
  </xsl:template>

</xsl:stylesheet>
