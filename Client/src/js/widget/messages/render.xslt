<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  version="1.0">

  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:param name="guiStatus"/>
  <xsl:param name="bcdContextPath"/>
  
  <xsl:template match="/">
    <div class="bcdCkEditorContainer">
      <textarea
        id="bcdCkEditor"
        rows="30"
        required="true"
        doTrimInput="true"
        targetModelXPath="$guiStatus/*/guiStatus:ClientSettings/guiStatus:HtmlEditor"
        customConfig="{$bcdContextPath}/bcdui/js/3rdParty/ckeditor/ckeditor_config.js"
        formatter_in="bcdui.component.grid.GridEditor.bcduiHtmlEditor.format_in"
        formatter_out="bcdui.component.grid.GridEditor.bcduiHtmlEditor.format_out"
        bcdOnLoad="bcdui.widget._initCkEditor">
      </textarea>
    </div>
  </xsl:template>

</xsl:stylesheet>
