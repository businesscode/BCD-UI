package de.businesscode.bcdui.binding.write;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.wrs.load.WrqBindingItem;

/**
 * Utility class for custom JDBC type handling/mapping, i.e. defined on a
 * {@link BindingItem} via type-name=OTHER cust:type-name=TEXT
 *
 */
public class CustomJdbcTypeSupport {

  /**
   * wraps with explicit typecast to custom database type
   *
   * @param wrqBindingItem
   * @param expr
   * @return either expr or expr wrapped into explicit typecast
   */
  public static String wrapTypeCast(WrqBindingItem wrqBindingItem, String expr) {
    BindingItem referencingBindingItem = wrqBindingItem.getReferenceBindingItem();
    if (referencingBindingItem != null && hasCustomDatabaseType(referencingBindingItem)) {
      return "(" + expr + ")::" + getCustomDatabaseType(referencingBindingItem);
    }
    return expr;
  }

  /**
   * @return custom database type defined via custom:type-name attribute
   * @throws IllegalArgumentException
   *           if such a type was not defined, check
   *           {@link #hasCustomDatabaseType(BindingItem)} to avoid such an
   *           exception
   */
  private static String getCustomDatabaseType(BindingItem bi) {
    String type = bi.getCustomAttributesMap().get("type-name");
    if (type == null || type.trim().isEmpty()) {
      throw new IllegalArgumentException("Custom database type expected on bindingItem " + bi.getId() + " at @cust:type-name but was not defined");
    }
    return type;
  }

  /**
   * 
   * @return TRUE if custom:type-name was defined on this item referring to
   *         custom database type and jdbc type name is set to OTHER
   */
  private static boolean hasCustomDatabaseType(BindingItem bi) {
    return bi.isDefinedJDBCDataType() && "OTHER".equalsIgnoreCase(bi.getJDBCDataTypeName()) && bi.getCustomAttributesMap().containsKey("type-name");
  }

}
