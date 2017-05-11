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
  xmlns="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  >
  <!--

  input:  Wrq
  output: Wrq (with row count request)
  
  resulting sql: select count(*) over () FROM [bindingSet] WHERE [filter] GROUP BY [grouping];

   -->

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <xsl:template match="/wrq:WrsRequest">
    <WrsRequest>
      <!-- prevent request if no group-by criteria ( i.e. only measures selected ) -->
      <xsl:if test="wrq:Select/wrq:Grouping/*">
        <Select rowEnd="1">
          <Columns>
            <!--
              count(*) over ()
            -->
            <C bRef="totalRowsCount">
              <Calc type-name="NUMERIC">
                <CountOver>
                  <Value>*</Value>
                </CountOver>
              </Calc>
            </C>
          </Columns>
          <!-- we want to take over filters and grouping part from original data request -->
          <xsl:copy-of select="wrq:Select/wrq:From | wrq:Select/f:Filter | wrq:Select/wrq:Grouping"/>
        </Select>
      </xsl:if>
    </WrsRequest>
  </xsl:template>

</xsl:stylesheet>