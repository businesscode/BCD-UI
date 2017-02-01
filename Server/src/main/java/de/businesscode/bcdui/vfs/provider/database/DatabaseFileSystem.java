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

import java.util.Collection;

import org.apache.commons.vfs.FileName;
import org.apache.commons.vfs.FileObject;
import org.apache.commons.vfs.FileSystem;
import org.apache.commons.vfs.FileSystemOptions;
import org.apache.commons.vfs.provider.AbstractFileSystem;

public class DatabaseFileSystem extends AbstractFileSystem implements FileSystem{

  /**
   *
   * Constructor
   * @param rootName
   * @param fileSystemOptions
   */
  protected DatabaseFileSystem(FileName rootName, FileSystemOptions fileSystemOptions) {

    super(rootName, null, fileSystemOptions);

  }

  @Override
  protected void addCapabilities(Collection paramCollection) {
    paramCollection.addAll(DatabaseFileProvider.capabilities);
  }

  @Override
  /**
   * gets/reads file from database or manager gets it from cache
   *
   */
  protected FileObject createFile(FileName paramFileName) throws Exception {
    return new DatabaseFileObject(paramFileName, this);
  }

}
