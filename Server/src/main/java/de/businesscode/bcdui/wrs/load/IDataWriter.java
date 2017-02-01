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
package de.businesscode.bcdui.wrs.load;

import java.sql.ResultSet;

import de.businesscode.bcdui.wrs.IRequestOptions;

/**
 * The class writes the full result of a load operation out
 */
public interface IDataWriter {

  /**
   * Write the result-set and (possible) input option
   *
   * @param options
   *          - the options used for ths request
   * @param generator
   *          - the generator used for the request
   * @param resultSet
   *          - data to write out. Can be null if generator was empty
   * @param duration
   *          - the database execution duration in MS
   */
  void write(IRequestOptions options, ISqlGenerator generator, ResultSet resultSet, long duration) throws Exception;

  /**
   * close the destination resource
   *
   * @throws Exception
   */
  void close() throws Exception;

  /**
   * @return The number of rows written with last write
   */
  int getRowCount();

  /**
   * @return The number of columns written with last write.
   */
  int getColumnsCount();

}
