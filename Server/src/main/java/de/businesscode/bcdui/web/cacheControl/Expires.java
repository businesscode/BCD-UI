/*
  Copyright 2010-2024 BusinessCode GmbH, Germany

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

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.Locale;
import java.util.TimeZone;

import de.businesscode.bcdui.toolbox.WEEKDAY;

/**
 * Enum with all supported expires values.
 * Each value implements the method public long computeExpirationValue(String param) throws Exception for calculation next expiration date.
 */
public enum Expires {
    ExpiresAbsTime {

        @Override
        public long computeExpirationValue(String param) throws Exception {
            if (param != null && param.matches("^\\d\\d:\\d\\d:\\d\\d$")) {
                String[] timeItems = param.split(":");
                int hours = Integer.valueOf(timeItems[0]);
                int minutes = Integer.valueOf(timeItems[1]);
                int seconds = Integer.valueOf(timeItems[2]);
                if (hours > 24 || minutes > 60 || seconds > 60) {
                    throw new Exception("the value: " + param + " does not matched pattern: HH:mm:ss");
                }

                GregorianCalendar calendar = new GregorianCalendar(TimeZone.getTimeZone("GMT"));
                calendar.add(GregorianCalendar.DAY_OF_MONTH, 1);
                calendar.set(GregorianCalendar.HOUR_OF_DAY, hours);
                calendar.set(GregorianCalendar.MINUTE, minutes);
                calendar.set(GregorianCalendar.SECOND, seconds);
                return calendar.getTimeInMillis();
            }
            throw new Exception("the value: " + param + " does not matched pattern: HH:mm:ss");
        }

    },
    ExpiresAbsDow {

        @Override
        public long computeExpirationValue(String param) throws Exception {
            if (param != null && param.matches("^(?:Mon-\\d\\d|Tue-\\d\\d|Wed-\\d\\d|Thu-\\d\\d|Fri-\\d\\d|Sat-\\d\\d|Sun-\\d\\d)$")) {
                SimpleDateFormat dateFormat = new SimpleDateFormat("EEE", Locale.ENGLISH);
                WEEKDAY today = WEEKDAY.valueOf(dateFormat.format(new Date()));
                WEEKDAY requestDay = WEEKDAY.valueOf(param.substring(0, 3));
                int expiresHour = Integer.parseInt(param.substring(4, 6));
                GregorianCalendar calendar = new GregorianCalendar(TimeZone.getDefault());
                int def = 0;
                if (today.compareTo(requestDay) < 0 || (today.compareTo(requestDay) == 0 && calendar.get(Calendar.HOUR_OF_DAY)<expiresHour) ) {
                    def = requestDay.ordinal() - today.ordinal();
                } else {
                    def = 7 - (today.ordinal() - requestDay.ordinal());
                }
                calendar.add(GregorianCalendar.DAY_OF_MONTH, def);
                calendar.set(calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH), expiresHour, 0, expiresHour!=0 ? 0 : 1);

                return calendar.getTimeInMillis();
            }
            throw new Exception("the value: " + param + " does not matched pattern: Dow-HH");
        }
    },
    ExpiresAbsDatetime {

        @Override
        public long computeExpirationValue(String param) throws Exception {
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss z", Locale.ENGLISH);
            Date result = null;
            try {
                result = dateFormat.parse(param + " GMT");
            }
            catch (Exception exception) {
                throw new Exception("the value: " + param + " does not matched pattern: yyyy-MM-dd HH:mm:ss");
            }
            return result.getTime();
        }
    },
    ExpiresRelDays {

        @Override
        public long computeExpirationValue(String param) throws Exception {
            if (param != null) {
                try {
                    Integer days = Integer.valueOf(param);
                    GregorianCalendar calendar = new GregorianCalendar(TimeZone.getTimeZone("GMT"));
                    calendar.add(GregorianCalendar.DAY_OF_MONTH, days);
                    return calendar.getTimeInMillis();
                }
                catch (Exception e) {
                    throw new Exception("the value: " + param + " is not a number.");
                }
            }
            throw new Exception("the value: " + param + " is empty.");
        }
    },
    ExpiresRelTime {

        @Override
        public long computeExpirationValue(String param) throws Exception {
            if (param != null && param.matches("^\\d\\d:\\d\\d:\\d\\d$")) {
                String[] timeItems = param.split(":");
                int hours = Integer.valueOf(timeItems[0]);
                int minutes = Integer.valueOf(timeItems[1]);
                int seconds = Integer.valueOf(timeItems[2]);
                if (hours > 24 || minutes > 60 || seconds > 60) {
                    throw new Exception("the value: " + param + " does not matched pattern: HH:mm:ss");
                }
                GregorianCalendar calendar = new GregorianCalendar(TimeZone.getTimeZone("GMT"));
                calendar.add(GregorianCalendar.HOUR_OF_DAY, hours);
                calendar.add(GregorianCalendar.MINUTE, minutes);
                calendar.add(GregorianCalendar.SECOND, seconds);
                return calendar.getTimeInMillis();
            }
            throw new Exception("the value: " + param + " does not matched pattern: HH:mm:ss");
        }
    },
    CacheRequestDirective {

        @Override
        public long computeExpirationValue(String param) throws Exception {
            throw new Exception("nothing to compute.");
        }
    },
    ExpiresNever{

      @Override
        public long computeExpirationValue(String param) throws Exception {
          throw new Exception("nothing to compute.");
        }
    };

    /**
     * Method computeExpirationValue
     * @param param
     * @return the next expiration date depends on expire value.
     * @throws Exception
     */
    abstract public long computeExpirationValue(String param) throws Exception;
}