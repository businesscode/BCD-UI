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
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"  />

  <xsl:param name="dimName" />

  <xsl:key name="level" match="dm:Dimension/dm:Hierarchy/dm:Level" use="concat(../../@id,@caption)" />
  
  <xsl:template match="/*">
    <Levels>
      <xsl:copy-of select="dm:Dimension[@id=$dimName]/dm:Hierarchy/dm:Level[generate-id()=generate-id(key('level',concat(../../@id, @caption))[1])]"/>
    </Levels>
  </xsl:template>

</xsl:stylesheet>
