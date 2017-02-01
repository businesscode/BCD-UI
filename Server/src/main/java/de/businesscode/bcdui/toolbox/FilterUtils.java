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
package de.businesscode.bcdui.toolbox;

import java.util.ArrayList;
import java.util.List;

/**
 * This class provides the common filter utilities.
 */
public class FilterUtils {

    /**
     * Constructor
     */
    public FilterUtils() {
    }

    /**
     * Method getValuesAsList
     *
     * @param param
     * @return
     */
    public static List<String> getValuesAsList(String param) {
        List<String> result = new ArrayList<String>();
        String[] values = param.trim().split("\\n");
        for (String row : values) {
            for (String value : row.trim().split(" ")) {
                result.add(value);
            }
        }
        return result;
    }

}
