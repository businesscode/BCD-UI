/*
  Copyright 2010-2018 BusinessCode GmbH, Germany

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

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.ResourceBundle.Control;

import javax.servlet.ServletContext;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.web.BcdUiApplicationContextListener;

/**
 * Custom {@link Control} implementing loading resource bundle from either {@link SqlResourceBundle} or {@link WrsResourceBundle} depending if the binding-set
 * 'bcd_i18n' was found or if the resource contains any keys for a {@link Locale}. A resource bundle is considered as not exsiting if it does not contain any
 * key for given language. The default (fallback) language is configured via {@link I18n#JNDI_PROPERTY_CONTEXT_LANG}
 */
class ResourceBundleControl extends ResourceBundle.Control {
  private static final String LOC_CATALOG_FILE_PROJECT = "/bcdui/conf/messages.xml";
  private static final String LOC_CATALOG_FILE_LIB = "/bcdui/js/i18n/messages.xml";
  /**
   * JNDI configuration property for the language cache ttl; -1: never cache, 0: never expire, >0: TTL in millis; dont put into public API yet, as we might
   * consider connecting bundle with ehCache
   */
  private static final String JNDI_PROPERTY_CACHE_TTL = "bcdui/i18n/cache/ttl";
  private static final long DEFAULT_TTL_MS = TTL_NO_EXPIRATION_CONTROL;

  private final static String FORMAT_SQL = "bcdui.sql", FORMAT_FILE = "bcdui.file";
  private final static List<String> FORMATS_LIST = Arrays.asList(new String[] { FORMAT_SQL, FORMAT_FILE });

  private final Logger logger = LogManager.getLogger(getClass());
  private final Locale defaultLocale;
  private final ServletContext servletContext;
  private final long cacheTtl;

  ResourceBundleControl(ServletContext servletContext) {
    this.defaultLocale = I18n.getDefaultContextLocale();
    this.cacheTtl = getCacheTtl(DEFAULT_TTL_MS);
    this.servletContext = servletContext;
    logger.debug(String.format("configuration: defaultLocale: %s", defaultLocale));
  }

  /**
   * get configured cache ttl in millis, if no {@link #JNDI_PROPERTY_CACHE_TTL} parameter found in JNDI the defaultTtl value is returned, for negative value
   * {@link ResourceBundle.Control#TTL_DONT_CACHE} is returned, for 0 {@link ResourceBundle.Control#TTL_NO_EXPIRATION_CONTROL} is returned otherwise the
   * configured value.
   * 
   * @param defaultTtl
   * @return either configured or defaultTtl
   */
  private static long getCacheTtl(long defaultTtl) {
    Long configuredTtl = (Long) Configuration.getInstance().getConfigurationParameterOrNull(JNDI_PROPERTY_CACHE_TTL);
    if (configuredTtl == null) {
      return defaultTtl; // as-is, does not apply to remapping
    } else {
      if (configuredTtl < 0) {
        return ResourceBundle.Control.TTL_DONT_CACHE;
      } else if (configuredTtl == 0) {
        return ResourceBundle.Control.TTL_NO_EXPIRATION_CONTROL;
      } else {
        return configuredTtl;
      }
    }
  }

  @Override
  public final Locale getFallbackLocale(String baseName, Locale locale) {
    return defaultLocale;
  }

  @Override
  public boolean needsReload(String baseName, Locale locale, String format, ClassLoader loader, ResourceBundle bundle, long loadTime) {
    // enable TTL if cacheTtl is positive, returning false would effectively disable aging
    return cacheTtl != TTL_NO_EXPIRATION_CONTROL;
  }

  @Override
  public final long getTimeToLive(String baseName, Locale locale) {
    return cacheTtl;
  }

  @Override
  public final List<String> getFormats(String baseName) {
    return FORMATS_LIST;
  }

  @Override
  public List<Locale> getCandidateLocales(String baseName, Locale locale) {
    return Arrays.asList(locale);
  }

  @Override
  public ResourceBundle newBundle(String baseName, Locale locale, String format, ClassLoader loader, boolean reload)
      throws IllegalAccessException, InstantiationException, IOException {
    logger.debug(String.format("new bundle, locale:%s, format:%s", locale, format));
    final ResourceBundle rb;
    switch (format) {
    case FORMAT_SQL:
      rb = newSqlBundle(locale);
      break;
    case FORMAT_FILE:
      rb = newLocalBundle(locale);
      // throw unrecoverable Error if defaultLocale ends in null-bundle
      if (rb == null && defaultLocale.equals(locale)) {
        throw new Error("No suitable message catalog found, please create a catalog with at least one key for default language: " + locale);
      }
      break;
    default:
      throw new InstantiationException("unknown format:" + format);
    }
    return rb;
  }

  /**
   * @param locale
   * @return {@link SqlResourceBundle} if it contains at least one key, null otherwise
   * @throws IOException
   *           if failed test the bcd_i18n binding-set for existence
   */
  private ResourceBundle newSqlBundle(Locale locale) throws IOException {
    try {
      if (!Bindings.getInstance().hasBindingSet("bcd_i18n")) {
        return null;
      }
    } catch (BindingException e) {
      throw new IOException("Failed to check for bindingSet", e);
    }
    final MapResourceBundle rb = new SqlResourceBundle(locale);
    return rb.isEmpty() ? null : rb;
  }

  /**
   * resolves a local message file, first looks up in context at {@value #LOC_CATALOG_FILE_PROJECT} falling back to looking up in classpath at
   * {@value #LOC_CATALOG_FILE_LIB}
   * 
   * @param locale
   * @return {@link WrsResourceBundle} if it contains at least one key, null otherwise
   * @throws IOException
   *           if failing to read from file or file was not found
   */
  private ResourceBundle newLocalBundle(Locale locale) throws IOException {
    // resolve local catalog
    InputStream catalogFileIs = servletContext.getResourceAsStream(LOC_CATALOG_FILE_PROJECT); // project defined
    if (catalogFileIs == null) {
      logger.debug("load default messages catalog from library classpath at " + LOC_CATALOG_FILE_LIB);
      catalogFileIs = BcdUiApplicationContextListener.class.getResourceAsStream(LOC_CATALOG_FILE_LIB); // from jar
      if (catalogFileIs == null) {
        logger.debug("load default messages catalog from project path at " + LOC_CATALOG_FILE_LIB);
        catalogFileIs = servletContext.getResourceAsStream(LOC_CATALOG_FILE_LIB); // injected
      }
    } else {
      logger.debug("messages catalog located in project at " + LOC_CATALOG_FILE_PROJECT);
    }
    if (catalogFileIs == null) {
      throw new IOException("failed to resolve messages.xml catalog");
    }
    try (InputStream iis = catalogFileIs) {
      MapResourceBundle rb = new WrsResourceBundle(iis, locale);
      return rb.isEmpty() ? null : rb;
    }
  }
}
