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

import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;

import org.apache.commons.vfs.Capability;
import org.apache.commons.vfs.FileName;
import org.apache.commons.vfs.FileSystem;
import org.apache.commons.vfs.FileSystemConfigBuilder;
import org.apache.commons.vfs.FileSystemException;
import org.apache.commons.vfs.FileSystemOptions;
import org.apache.commons.vfs.provider.AbstractOriginatingFileProvider;

public class DatabaseFileProvider extends AbstractOriginatingFileProvider{

  protected final static Collection<Capability> capabilities = Collections
      .unmodifiableCollection(Arrays.asList(new Capability[] {
          Capability.GET_LAST_MODIFIED,
          Capability.GET_TYPE,
          Capability.LIST_CHILDREN,
          Capability.READ_CONTENT,
          Capability.URI,
          Capability.VIRTUAL }));


  @Override
  protected FileSystem doCreateFileSystem(FileName paramFileName, FileSystemOptions paramFileSystemOptions) throws FileSystemException {
    return new DatabaseFileSystem(paramFileName, paramFileSystemOptions);
  }

  public Collection<Capability> getCapabilities() {
    return capabilities;
  }


  @Override
  public FileSystemConfigBuilder getConfigBuilder() {
    return DatabaseFileSystemConfigBuilder.getInstance();
  }
}
