package de.businesscode.bcdui.subjectsettings;

import java.io.Serializable;

import org.apache.shiro.subject.PrincipalCollection;

/**
 * A primary principal, which holds technical user id. This principal may be
 * used by the realm in order to indicate a primary principal, see
 * {@link PrincipalCollection#getPrimaryPrincipal()}. The
 * {@link SecurityHelper#getUserId(org.apache.shiro.subject.Subject)} handles
 * this type.
 */
public class PrimaryPrincipal implements Serializable {
  private static final long serialVersionUID = 1L;
  final String id;

  public PrimaryPrincipal(String id) {
    this.id = id;
  }

  public String getId() {
    return id;
  }

  @Override
  public String toString() {
    return id;
  }
}
