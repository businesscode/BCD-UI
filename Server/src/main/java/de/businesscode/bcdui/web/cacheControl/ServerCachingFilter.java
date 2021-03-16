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
package de.businesscode.bcdui.web.cacheControl;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.lang.reflect.Proxy;
import java.net.MalformedURLException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;

import javax.naming.InitialContext;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.output.TeeOutputStream;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.FilterUtils;
import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.toolbox.WEEKDAY;
import de.businesscode.bcdui.web.cacheControl.server.wrapper.TeePrintWriterWrapper;
import de.businesscode.bcdui.web.errorLogging.ErrorLogEvent;


/**
 * Implements server side caching.
 * This Filter caches the server response to the given store.<br>
 * Only the url's from the init-param will be cached.<br>
 * The store will be get from the JNDI and must be declare by user.<br>
 * The name of the expected store object is BCD-UI/ServerCacheControl<br>
 * This filter support all expires from ClientCachingFilter excepts CacheRequestDirective.<br>
 *
 * For further information please consult your BCD-UI documentation
 *
 */
public class ServerCachingFilter extends AbstractCacheFilter {
    private static final String KEY_INSTANCE = "de.businesscode.bcdui.web.cacheControl.ServerCachingFilter";
    private final static String URLS_PATTERN_PARAM_NAME = "pattern";
    //
    protected Logger log = LogManager.getLogger(this.getClass());
    //
    private Set<String> urls;

    private  IServerCachePersist serverCacheControl;

    private String filterName;

    /**
     * Returns an instance bound to given request. May return null if request is not cached. To enable caching for request - please set up such rule in your web descriptor.
     *
     * @param request
     * @return NULL or the instance for given request
     */
    public static ServerCachingFilter getInstance(ServletRequest request) {
        return (ServerCachingFilter) request.getAttribute(KEY_INSTANCE);
    }

    /**
     * @see javax.servlet.Filter#destroy()
     */
    @Override
    public void destroy() {

    }

    /**
     * @see javax.servlet.Filter#doFilter(javax.servlet.ServletRequest, javax.servlet.ServletResponse, javax.servlet.FilterChain)
     */
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        if(! Configuration.isCacheDisabled()){
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            String parameter = httpRequest.getParameter("bcd:clearServerCache");
            if (parameter != null && parameter.equals(getFilterName())) {
                try {
                    getServerCacheControl().clean(getFilterName());
                    chain.doFilter(request, response);
                }
                catch (Exception e) {
                    throw new ServletException("Could not clean cached data.", e);
                }
            } else {
                String requestKey = generateRequestKey(httpRequest);
                log.info(String.format("requested key '%s'", requestKey));

                if (!doResponseFromCache(requestKey)) {
                    log.info("bypassing cache");
                    chain.doFilter(request, response);
                } else {
                    handleEnableCaching(request, response, chain, requestKey);
                }
            }
        }
    }

    /**
     * Method handleEnableCaching
     *
     * @param request
     * @param response
     * @param chain
     * @param requestKey
     * @throws ServletException
     */
    private void handleEnableCaching(ServletRequest request, ServletResponse response, FilterChain chain, String requestKey) throws ServletException {
        try {
            boolean cached = getServerCacheControl().isCached(getFilterName(), requestKey);
            Date today = new Date();
            boolean current = isCurrent(requestKey, today);

            if (cached && current) {
                log.info("send cached data.");
                flushCachedResponse(requestKey, response.getOutputStream());
            } else if (cached && !current) {
                getServerCacheControl().dropItem(getFilterName(), requestKey);
                //don't cache if the absolute timestamt exceeded
                if(getDefinedExpires() != Expires.ExpiresAbsDatetime){
                    log.info("create cached data.");
                    HttpServletResponse cachingResponse = deployCachingResponse((HttpServletResponse) response, requestKey);
                    try {
                        chain.doFilter(request, cachingResponse);
                    }
                    catch (Exception e) {
                        getServerCacheControl().dropItem(getFilterName(), requestKey);
                        throw e;
                    }
                }
                else{
                    chain.doFilter(request, response);
                    return;
                }
            } else {
                log.info("create cached data.");
                HttpServletResponse cachingResponse = deployCachingResponse((HttpServletResponse) response, requestKey);
                try {
                    chain.doFilter(request, cachingResponse);
                }
                catch (Exception e) {
                    getServerCacheControl().dropItem(getFilterName(), requestKey);
                    throw e;
                }
            }
        }
        catch (Exception e) {
            throw new ServletException(e);
        }
    }

    /**
     * Method isCurrent
     * @param requestKey
     * @param today
     * @return
     * @throws Exception
     * @throws NumberFormatException
     */
    private boolean isCurrent(String requestKey, Date today) throws Exception, NumberFormatException {
        boolean send = false;
        switch (getDefinedExpires()) {
        case ExpiresAbsDow:{
            SimpleDateFormat dateFormat = new SimpleDateFormat("EEE", Locale.ENGLISH);
            WEEKDAY weekday = WEEKDAY.valueOf(dateFormat.format(today));
            WEEKDAY destDay = WEEKDAY.valueOf(getExpiresValue());
            send = weekday.compareTo(destDay) < 0;
            break;
        }
        case ExpiresAbsDatetime:{
            send = (getDefinedExpires().computeExpirationValue(getExpiresValue()) > today.getTime());
            break;
        }
        case ExpiresAbsTime:{
            long tmp = getDefinedExpires().computeExpirationValue(getExpiresValue());
            GregorianCalendar calendar = new GregorianCalendar(TimeZone.getTimeZone("GMT"));
            calendar.setTimeInMillis(tmp);
            calendar.roll(GregorianCalendar.DAY_OF_MONTH, false);
            send = calendar.getTimeInMillis() > new Date().getTime();
            break;
        }
        case ExpiresRelDays:{
            long lastMod = getServerCacheControl().getLastModified(getFilterName(), requestKey);
            GregorianCalendar calendar = new GregorianCalendar(TimeZone.getTimeZone("GMT"));
            calendar.setTimeInMillis(lastMod);
            calendar.add(GregorianCalendar.DAY_OF_MONTH, Integer.valueOf(getExpiresValue()));
            send = calendar.getTimeInMillis() > new Date().getTime();
            break;
        }
        case ExpiresRelTime:{
            String[] timeItems = getExpiresValue().split(":");
            int hours = Integer.valueOf(timeItems[0]);
            int minutes = Integer.valueOf(timeItems[1]);
            int seconds = Integer.valueOf(timeItems[2]);
            GregorianCalendar calendar = new GregorianCalendar(TimeZone.getTimeZone("GMT"));
            calendar.set(GregorianCalendar.HOUR_OF_DAY, hours);
            calendar.set(GregorianCalendar.MINUTE, minutes);
            calendar.set(GregorianCalendar.SECOND, seconds);
            send = calendar.getTimeInMillis() > new Date().getTime();
            break;
        }
        default:
            break;
        }
        return send;
    }

    /**
     * generates request URL which will be used to map request to cache, implementation can decide whether only the url part or parameters forms the key
     *
     * @param httpRequest
     * @return URL describing current request
     * @throws MalformedURLException
     */
    protected String generateRequestKey(HttpServletRequest httpRequest) throws MalformedURLException {
        return ServletUtils.getInstance().reconstructURI(httpRequest);
    }

    /**
     * default return value is TRUE, hence caching responses
     *
     * @param requestUrl
     * @return TRUE if caching facility should be bypassed, the response is not cached
     */
    protected boolean doResponseFromCache(String requestUrl) {
        if (getUrls().size() > 0) {
            Iterator<String> iterator = getUrls().iterator();
            while (iterator.hasNext()) {
                if (requestUrl.endsWith(iterator.next())) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * @return the urls
     */
    public Set<String> getUrls() {
        if (urls == null) {
            urls = new HashSet<String>();
        }
        return urls;
    }

    /**
     * @see javax.servlet.Filter#init(javax.servlet.FilterConfig)
     */
    @Override
    public void init(FilterConfig fc) throws ServletException {
        super.init(fc);
        //
        try {
            serverCacheControl = (IServerCachePersist) new InitialContext().lookup("java:comp/env/BCD-UI/ServerCacheControl");
        }
        catch (Exception e) {
            serverCacheControl = null;
        }
        //
        setFilterName(fc.getFilterName());
        try {
            getServerCacheControl().clean(getFilterName());
        }
        catch (Exception e) {
            log.error("persist context was not found!", e);
            throw new RuntimeException(e);
        }
        String value = fc.getInitParameter(URLS_PATTERN_PARAM_NAME);
        if (value != null) {
            getUrls().addAll(FilterUtils.getValuesAsList(value));
        }
    }

    /**
     * @param key
     * @param outputStream
     * @return ServletOutputStream which supports teeing to another stream
     * @throws IOException
     */
    protected TeeOutputStream wrap(String key, ServletOutputStream outputStream) throws Exception {
      log.info(String.format("deploying ServletOutputStream on url '%s'", key));
      return new TeeOutputStream(outputStream, getServerCacheControl().getOutputStream(getFilterName(), key));
    }

    /**
     * @return the serverCacheControl
     */
    protected IServerCachePersist getServerCacheControl() {
        return serverCacheControl;
    }

    /**
     * @param wrapperForURL
     * @param writer
     * @return
     * @throws IOException
     */
    protected PrintWriter wrap(String key, PrintWriter writer) throws Exception {
        log.info(String.format("deploying PrintWriter on key '%s'", key));
        return new TeePrintWriterWrapper(writer, new PrintWriter(getServerCacheControl().getOutputStream(getFilterName(), key), true));
    }

    /**
     * flushes previously saved response to the stream
     *
     * @param key
     * @param os
     * @throws IOException
     */
    public void flushCachedResponse(String key, OutputStream os) throws Exception {
        InputStream inputStream = null;
        try {
            inputStream = getServerCacheControl().getInputStream(getFilterName(), key);
            flushStream(inputStream, os);
        }
        finally {
            if (inputStream != null) {
                try {
                    inputStream.close();
                }
                catch (Exception e) {
                    throw new Exception(e);
                }
            }
        }
    }

    /**
     * flushing the inputstream into outputstream
     *
     * @param is
     * @param os
     * @throws IOException
     */
    private void flushStream(InputStream is, OutputStream os) throws IOException {
        BufferedInputStream bis = new BufferedInputStream(is);
        BufferedOutputStream bos = new BufferedOutputStream(os);

        int read;
        byte[] buffer = new byte[4096];
        while ((read = bis.read(buffer)) > -1) {
            bos.write(buffer, 0, read);
        }

        bos.flush();
    }

    /**
     * @return the filterName
     */
    protected String getFilterName() {
        return filterName;
    }

    /**
     * @param filterName the filterName to set
     */
    protected void setFilterName(String filterName) {
        this.filterName = filterName;
    }

    /**
     * @param response
     * @param key
     * @return
     */
    protected HttpServletResponse deployCachingResponse(HttpServletResponse response, String key) {
        // TODO: ep: resolve hardlinks to classes
        HttpServletResponse cachingResponse = (HttpServletResponse) Proxy.newProxyInstance(HttpServletResponse.class.getClassLoader(), new Class[] { HttpServletResponse.class },
                new HttpServletResponseInvocationHandler(response, key, this));

        return cachingResponse;
    }
}
