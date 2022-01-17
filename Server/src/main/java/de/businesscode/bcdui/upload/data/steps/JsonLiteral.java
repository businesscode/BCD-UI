package de.businesscode.bcdui.upload.data.steps;

import java.util.HashMap;
import java.util.Map;

/**
 * JSON literal helper to write safe JSON object
 */
public class JsonLiteral {
  private Map<String, Object> dataMap = new HashMap<>();

  /**
   * sets property
   * 
   * @param property
   *          - plain property map i.e. "key", dotted not allowed
   * @param value
   * @return
   */
  public JsonLiteral set(String property, Object value) {
    if (property.indexOf(".") > -1) {
      throw new RuntimeException("'.' not allowed in property name '" + property + "'");
    }
    dataMap.put(property, value);
    return this;
  }

  /**
   * 
   * @return current state as JSON
   */
  public String toJSONString() {
    StringBuilder sb = new StringBuilder();

    sb.append("{");

    dataMap.forEach((k, v) -> {
      sb.append("\"");
      sb.append(k);
      sb.append("\" : ");

      if (v == null || v instanceof Number) {
        sb.append(v);
      } else {
        sb.append("\"");
        sb.append(v.toString().replaceAll("\"", "\\\""));
        sb.append("\"");
      }

      sb.append(",");
    });
    if (dataMap.size() > 0) {
      sb.setLength(sb.length() - 1); // remove last comma
    }

    sb.append("}");

    return sb.toString();
  }
}
