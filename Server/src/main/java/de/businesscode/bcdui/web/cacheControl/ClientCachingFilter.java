/*
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
*/
/**
 *
 */
package de.businesscode.bcdui.web.cacheControl;

import java.io.IOException;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;

import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.FilterUtils;


/**
 * ClientCachingFilter implements client side caching.<br>
 * This Filter set expires value for the within the init-parameters declared resource types. <br>
 * The value is depends on the values from init-param. <br>
 * Expected value must be of the type:
 * <ul>
 * <li>ExpiresAbsTime: for absolute time</li>
 * <li>ExpiresAbsDow: for absolute day of the week</li>
 * <li>ExpiresAbsDatetime: for absolute date and time</li>
 * <li>ExpiresRelDays: for relative day</li>
 * <li>ExpiresRelTime: for relative time</li>
 * <li>CacheRequestDirective: for native HTTP1.1 Cache-Control string</li>
 * </ul>
 * This Filter supports the exclude urls.<br>
 * <p>
 * To exclude URLs (using starts-with matching method) add a space separated list of tokens to the parameter <b>ExcludeUrls</b>
 * To exclude extensions from the excluded URLs (using ends-with matching method) add a space separated list of tokens to the parameter <b>ExtensionsRestriction</b>,
 * so that all extensions found in ExtensionsRestriction are re-included
 * </p>
 * <p>
 * The parameter <b>ExcludeExtensions</b> is a pendant to <b>ExcludeUrls</b> parameter and allows specific extensions to be excluded from caching,
 * (using ends-with matching method). Extenions defined here are of higher precedence than <b>ExcludeUrls</b> / <b>ExtensionsRestriction</b> group
 * </p>
 * For further information please consult your BCD-UI documentation
 *
 */
public class ClientCachingFilter extends AbstractCacheFilter {

    private static final String EXTENSIONS_RESTRICTION_PARAM_NAME = "ExtensionsRestriction";
    private static final String CACHE_EXCLUDE_EXTENSIONS_PARAM_NAME = "ExcludeExtensions";
    private static final String CACHE_EXCLUDE_PARAM_NAME = "ExcludeUrls";

    private Set<String> extensions;
    private Set<String> excludes;
    private Set<String> excludeExtensions;

    //
    private Logger logger = Logger.getLogger(ClientCachingFilter.class);

    //

    /**
     * Constructor
     */
    public ClientCachingFilter() {
        super();
    }

    /**
     * @see javax.servlet.Filter#doFilter(javax.servlet.ServletRequest, javax.servlet.ServletResponse, javax.servlet.FilterChain)
     */
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        if (!Configuration.isCacheDisabled() && !isWithinExcludes(httpRequest)) {
            boolean cache = false;
            if (getRestrictingExtensions().size() > 0) {
                Iterator<String> iterator = getRestrictingExtensions().iterator();
                while (iterator.hasNext()) {
                    String extension = iterator.next();
                    if (httpRequest.getRequestURI().endsWith(extension)) {
                        cache = true;
                    }
                }
            } else {
                cache = true;
            }
            if (cache) {
                if (getDefinedExpires() == Expires.CacheRequestDirective) {
                  String expiresValue = getExpiresValue();
                  // in case value contains public; the caching is effectively enabled
                  boolean isPublic = expiresValue.contains("public");

                  // if value does not contain max-age and is not public we explicitely set max-age to 0
                  if(!expiresValue.contains("max-age") && !isPublic){
                    expiresValue += ", max-age=0";
                  }

                  httpResponse.setHeader("Cache-Control", expiresValue);

                  // if no public; directive is contained, we additionally set Expires header
                  if( !isPublic ) {
                    httpResponse.setDateHeader("Expires", -1);
                  }
                } else {
                    try {
                        long computeExpirationValue = getDefinedExpires().computeExpirationValue(getExpiresValue());
                        httpResponse.setHeader("Cache-Control", "public");
                        httpResponse.setDateHeader("Expires", computeExpirationValue);
                    }
                    catch (Exception e) {
                        logger.warn("could not set expires!", e);
                    }
                }
            }
        } else if ( Configuration.isCacheDisabled() ){
          // cache is disabled by configuration: explicitly suppress caching via Cache-Control and Expires header
          httpResponse.setHeader("Cache-Control", "no-store, no-cache, max-age=0"); // must appear in exactly this order, otherwise download of https resources on ie8 fails
          httpResponse.setHeader("Expires", "-1");
        } else {
          // ; request excluded from processing
        }

        chain.doFilter(request, response);
    }

    /**
     * @see javax.servlet.Filter#init(javax.servlet.FilterConfig)
     */
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        super.init(filterConfig);
        String restrictExtentions = filterConfig.getInitParameter(EXTENSIONS_RESTRICTION_PARAM_NAME);
        String excludes = filterConfig.getInitParameter(CACHE_EXCLUDE_PARAM_NAME);
        String excludesExtensions = filterConfig.getInitParameter(CACHE_EXCLUDE_EXTENSIONS_PARAM_NAME);

        if (restrictExtentions != null && restrictExtentions.trim().length() > 0) {
            getRestrictingExtensions().addAll(FilterUtils.getValuesAsList(restrictExtentions));
        }
        if (excludes != null && excludes.trim().length() > 0) {
            getExcludes().addAll(FilterUtils.getValuesAsList(excludes));
        }
        if (excludesExtensions != null && excludesExtensions.trim().length() > 0) {
          getExcludesExtensions().addAll(FilterUtils.getValuesAsList(excludesExtensions));
        }
    }

    /**
     * Method isWithinExcludes TODO add '*' handling
     *
     * @param httpRequest
     * @return
     */
    private boolean isWithinExcludes(HttpServletRequest httpRequest) {
        String requestURI = httpRequest.getRequestURI();
        if (getExcludes().size() > 0) {
            Iterator<String> iterator = getExcludes().iterator();
            while (iterator.hasNext()) {
                String value = httpRequest.getContextPath() + iterator.next();
                if (requestURI.startsWith(value)) {
                    return true;
                }
            }
        }
        if(getExcludesExtensions().size()>0){
          Iterator<String> iterator = getExcludesExtensions().iterator();
          while (iterator.hasNext()) {
              if (requestURI.endsWith(iterator.next())) {
                  return true;
              }
          }
        }
        return false;
    }

    /**
     * @return the extensions
     */
    private Set<String> getRestrictingExtensions() {
        if (extensions == null) {
            extensions = new HashSet<String>();
        }
        return extensions;
    }

    /**
     * @return the excludes
     */
    private Set<String> getExcludesExtensions() {
      if (this.excludeExtensions == null) {
        this.excludeExtensions = new HashSet<String>();
      }
      return this.excludeExtensions;
    }

    /**
     * @return the excludes
     */
    private Set<String> getExcludes() {
        if (excludes == null) {
            excludes = new HashSet<String>();
        }
        return excludes;
    }

    @Override
    public void destroy() {
    }
}
