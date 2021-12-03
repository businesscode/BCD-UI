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
package de.businesscode.bcdui.vfs.provider.database;

import org.apache.commons.vfs.FileSystemConfigBuilder;

public class DatabaseFileSystemConfigBuilder extends FileSystemConfigBuilder{

  public final static String bindingSetId="bcd_virtualFileSystem";
  public final static String pathBindingSetItemId="path";
  public final static String bindingItemIdResourceClob="resourceClob";
  public final static String resourceBlobBindingSetItemId="resourceBlob";
  public final static String bindingItemIdIsServer="isServer";
  public final static String configFilePath="/de/businesscode/bcdui/vfs/provider/database/vfs-providers.xml";

  private static DatabaseFileSystemConfigBuilder ins = new DatabaseFileSystemConfigBuilder();

  /**
   * Constructor
   */
  private DatabaseFileSystemConfigBuilder() {}

  /**
   * Method getInstance
   */
  public static DatabaseFileSystemConfigBuilder getInstance(){
    return ins;
  }
  /**
   * returns Virtual File System BindingSetId
   */
  public String getBindingSetId(){
    return bindingSetId;
  }
  /**
   * returns BindingItemId of path column
   */
  public String getBindingItemIdPath(){
    return pathBindingSetItemId;
  }
  /**
   * returns BindingItemId of resource Clob column
   */
  public String getBindingItemIdResourceClob(){
    return bindingItemIdResourceClob;
  }
  /**
   * returns BindingItemId of resource Blob column
   */
  public String getBindingItemIdResourceBlob(){
    return resourceBlobBindingSetItemId;
  }

  /**
   * returns BindingItemId of resource isServer column
   */
  public String getBindingItemIdIsServer(){
    return bindingItemIdIsServer;
  }

  @Override
  protected Class getConfigClass() {
    return DatabaseFileSystem.class;
  }

}
