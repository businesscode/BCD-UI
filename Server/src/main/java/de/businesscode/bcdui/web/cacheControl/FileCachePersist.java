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

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FilenameFilter;
import java.io.InputStream;
import java.io.OutputStream;

import org.apache.log4j.Logger;



/**
 * This class implements the file system based caching store.
 */
public class FileCachePersist implements IServerCachePersist {
    private File rootFolder;
    private final Logger logger = Logger.getLogger(FileCachePersist.class);

    /**
     * Constructor
     */
    public FileCachePersist(){
        super();
    }

    /**
     * Method setAbsoluteFolderPath
     * @param absoluteFolderPath
     */
    public void setAbsoluteFolderPath(String absoluteFolderPath){
        rootFolder = new File(absoluteFolderPath);
        if(!rootFolder.exists()){
            rootFolder.mkdirs();
            logger.info("create folder for server side caching: " + absoluteFolderPath);
        }
    }

    /**
     * @see de.businesscode.bcdui.web.cacheControl.IServerCachePersist#clean(String)
     */
    @Override
    public void clean(final String prefix) throws Exception {
        logger.info("try to clean root folder: " + getRootFolder().getName());
        File[] listFiles = getRootFolder().listFiles(new FilenameFilter() {
            @Override
            public boolean accept(File dir, String name) {
                return name.startsWith(prefix);
            }
        });
        if(listFiles != null && listFiles.length > 0){
            for(File file : listFiles){
                try{
                    file.delete();
                }
                catch(Exception e){
                    logger.error("could not delete cache file: " + file.getName(), e);
                }
            }
        }
    }

    /**
     * @see de.businesscode.bcdui.web.cacheControl.IServerCachePersist#getInputStream(String, String)
     */
    @Override
    public InputStream getInputStream(String prefix, String key) throws Exception {
        String name = prefix+ key.replace("/", "_");
        logger.info("open input stream for: " + key);
        File result = new File(getRootFolder(), name);
        return new FileInputStream(result);
    }

    /**
     * @see de.businesscode.bcdui.web.cacheControl.IServerCachePersist#getOutputStream(String, String)
     */
    @Override
    public OutputStream getOutputStream(String prefix, String key) throws Exception {
        String name = prefix+ key.replace("/", "_");
        logger.info("open output stream for: " + name);
        File result = new File(getRootFolder(),name);
        if(result.exists()){
            logger.warn("cached file \""+result.getName()+"\" already exists and will be overwritten");
        }
        return new FileOutputStream(result);
    }

    /**
     * @see de.businesscode.bcdui.web.cacheControl.IServerCachePersist#dropItem(String, String)
     */
    @Override
    public void dropItem(String prefix, String key) throws Exception {
        String name = prefix+ key.replace("/", "_");
        logger.info("remove cached file: " +name);
        new File(getRootFolder(),name).delete();
    }

    /**
     * @see de.businesscode.bcdui.web.cacheControl.IServerCachePersist#isCached(String, String)
     */
    @Override
    public boolean isCached(String prefix, String key) throws Exception {
        String name = prefix+ key.replace("/", "_");
        return new File(getRootFolder(),name).exists();
    }

    /**
     * @see de.businesscode.bcdui.web.cacheControl.IServerCachePersist#getLastModified(String, String)
     */
    @Override
    public long getLastModified(String prefix, String key) throws Exception {
        String name = prefix+ key.replace("/", "_");
        return new File(getRootFolder(),name).lastModified();
    }



    //=========================================================================

    /**
     * @return the rootFolder
     */
    private File getRootFolder() {
        return rootFolder;
    }
}
