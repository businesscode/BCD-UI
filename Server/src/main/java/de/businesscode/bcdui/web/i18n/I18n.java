/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
package de.businesscode.bcdui.web.i18n;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import java.util.ResourceBundle;

import javax.servlet.ServletContext;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.web.BcdUiApplicationContextListener;
import de.businesscode.bcdui.web.servlets.SubjectPreferences;

/**
 *
 * Global i18n constants and helper class
 *
 */
public class I18n {
  /**
   * JNDI configuration property for the default language
   */
  public static final String JNDI_PROPERTY_CONTEXT_LANG = "bcdui/i18n/default/lang";
  /**
   * Cookie name storing the preferred language
   */
  public static final String HTTP_COOKIE_LANG = "bcd-lang";
  /**
   * Implicit subject filter storing the language
   */
  public static final String SUBJECT_FILTER_TYPE = "bcd_i18n:lang";
  /**
   * the default locale if any other configuration locale is not configured
   */
  public static final Locale DEFAULT_LOCALE = Locale.ENGLISH;
  /**
   * the default baseName of the resource bundle
   */
  private static final String BCD_BUNDLE_BASENAME = "bcdui/i18n";

  private static final Logger logger = LogManager.getLogger(I18n.class);

  /**
   * create a control suitable for database or local messages file backed resource bundle
   * 
   * @param servletContext
   * @return appropriate control implementation depending if bcd_i18n is enabled or not
   * @throws BindingException
   */
  public static ResourceBundle.Control createResourceControl(ServletContext servletContext) {
    return new ResourceBundleControl(servletContext);
  }

  /**
   * @return the default context locale as configured by {@link #JNDI_PROPERTY_CONTEXT_LANG} or the {@link #DEFAULT_LOCALE}
   */
  public static Locale getDefaultContextLocale() {
    return getDefaultContextLocale(DEFAULT_LOCALE);
  }

  /**
   * retrieve currently set locale for given session
   * 
   * @param session,
   *          whch may be null
   * @param defaultLocale
   * @return currently set locale or the defaultLocale
   */
  public static Locale getLocale(Locale defaultLocale) {
    ArrayList<String> values = (ArrayList<String>)SubjectPreferences.getPermission(SUBJECT_FILTER_TYPE);
    if (! values.isEmpty()) {
      String lang = values.get(0);
      if (!lang.isEmpty())
        return new Locale(lang);
    }
    return defaultLocale;
  }

  /**
   * @return currently active language for this user via session or request, if no session is available or no explicit language has been set, we guess from
   *         client information, and fallback to default language as per configuration.
   */
  public static Locale getUserLocale(HttpServletRequest request) {
    Locale locale = getLocale(null);
    if (locale == null) { // take from request
      locale = getLocale(request, null);
    }
    if (locale == null) { // if still not available, fallback to default system locale
      locale = getDefaultContextLocale();
    }
    return locale;
  }

  /**
   * set locale for given session
   * 
   * @param session
   * @param locale
   */
  public static void setLocale(Locale locale) {
    SubjectPreferences.setPermission(SUBJECT_FILTER_TYPE, locale.getLanguage());
  }

  /**
   * @param request
   * @return a resource bundle suitable to user locale
   */
  static ResourceBundle getUserBundle(HttpServletRequest request) {
    return ResourceBundle.getBundle(BCD_BUNDLE_BASENAME, getUserLocale(request), BcdUiApplicationContextListener.getResourceBundleControl());
  }

  /**
   * @param defaultLocale
   * @return the default context locale as configured by {@link #JNDI_PROPERTY_CONTEXT_LANG} or the given defaultLocale
   */
  private static Locale getDefaultContextLocale(Locale defaultLocale) {
    final String configuredLang = (String) Configuration.getInstance().getConfigurationParameterOrNull(JNDI_PROPERTY_CONTEXT_LANG);
    return configuredLang != null ? new Locale(configuredLang) : defaultLocale;
  }

  /**
   * retrieve a locale from cookie or client request header
   * 
   * @param request
   * @param defaultLocale
   * @return a Locale retrieved from a cookie / client request header or defaultLocale
   */
  private static Locale getLocale(HttpServletRequest request, Locale defaultLocale) {
    try {
      // try cookie
      Locale cookieLocale = getLocaleCookie(request.getCookies());

      if (cookieLocale != null) {
        return cookieLocale;
      }

      // still not found, try to guess from client header, i.e. Accept-Language: de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7
      final String langHeader = request.getHeader("Accept-Language");
      if (langHeader != null && !langHeader.trim().isEmpty()) {
        String[] parts = langHeader.split(",");
        if (parts.length > 0) {
          return new Locale(parts[0].split("[-_]")[0]); // keep the language portion only 
        }
      }
    } catch (Exception e) {
      logger.warn("failed to extract locale from HTTP/Cookie/Header", e);
    }

    return defaultLocale;
  }

  /**
   * get locale from HTTP cookies
   * 
   * @param cookies
   * @return {@link Locale} from cookie or null if no such cookie found
   */
  private static Locale getLocaleCookie(Cookie[] cookies) {
    if (cookies != null) {
      final Optional<Cookie> cookie = Arrays.stream(cookies).filter((ck) -> HTTP_COOKIE_LANG.equals(ck.getName())).findFirst();
      if (cookie.isPresent()) {
        final String cookieValue = cookie.get().getValue();
        if (cookieValue != null && !cookieValue.trim().isEmpty()) {
          return new Locale(cookieValue);
        }
      }
    }
    return null;
  }

  /**
   * set locale to HTTP cookie, the response must has been flushed yet
   * 
   * @param request
   * @param locale
   */
  private static void setLocaleCookie(HttpServletResponse response, Locale locale) {
    Cookie cookie = new Cookie(HTTP_COOKIE_LANG, locale.getLanguage());
    cookie.setMaxAge(60 * 60 * 24 * 365);
    cookie.setPath("/");
    cookie.setComment("Preferred Language");

    try {
      response.addCookie(cookie);
    } catch (Exception e) {
      logger.warn("failed to set cookie", e);
    }
  }
}
