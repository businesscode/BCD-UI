/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
"use strict";
/**
 * @fileoverview
 * This file contains utility functions for handling dates and timestamps.
 *
 */

/**
 * Functions related to processing and formatting of (XML-) dates.
 * @namespace
 */
bcdui.util.datetime = 
/** @lends bcdui.util.datetime */
{
  /**
   * Parses a date if the argument is a string or returns the date otherwise. The
   * date can be in XML date or timestamp format.
   * @param {Date|string} date The date object to be parsed.
   * @returns {Date} The parsed date or the "date" argument if it is already a date object.
   */
  parseDate: function( date)
    {
      if (typeof date == "undefined" || (bcdui.util.isString(date) && !date.match(/^\d{4}-\d{2}-\d{2}/))) {
        return null;
      }

      if (!bcdui.util.isString(date)) return date;

      var year = parseInt(date.substring(0, 4), 10);
      var month = parseInt(date.substring(5, 7), 10);
      var day = parseInt(date.substring(8, 10), 10);
      var hour = 0;
      var minute = 0;
      var second = 0;

      if (date.match(/^\d{4}-\d{2}-\d{2}.\d{2}/)) {
        hour = parseInt(date.substring(11, 13), 10);
      }
      if (date.match(/^\d{4}-\d{2}-\d{2}.\d{2}:\d{2}/)) {
        minute = parseInt(date.substring(14, 16), 10);
      }
      if (date.match(/^\d{4}-\d{2}-\d{2}.\d{2}:\d{2}:\d{2}/)) {
        second = parseInt(date.substring(17, 19), 10);
      }

      return new Date(year, month - 1, day, hour, minute, second);
    },

/**
   * Checks if date passed is valid date
   * @param {String} date The date string to be parsed.
   * @returns {boolean} Whether the parsed "date" argument is valid date string.
   */
  isValidDate: function(date)
    {
      if (typeof date == "undefined" || (bcdui.util.isString(date) && !date.match(/^\d{4}-\d{2}-\d{2}/))) {
        return false;
      }

      var year = parseInt(date.substring(0, 4), 10);
      var month = parseInt(date.substring(5, 7), 10) - 1;
      var day = parseInt(date.substring(8, 10), 10);
      var hour = 0;
      var minute = 0;
      var second = 0;

    var d = new Date(year, month, day, hour, minute, second);
      return d.getFullYear() == year && d.getMonth() == month && d.getDate() == day;
    },

  /**
   * Tests if the specified date range exactly covers exactly one or more years
   * @param {(Date|string)} startDate First day of the date range
   * @param {(Date|string)} endDate Last day of the date range
   * @returns {boolean}
   */
  isYearRange: function(startDate, endDate)
    {
      if (typeof startDate == "undefined" || startDate == null ||
          typeof endDate == "undefined" || endDate == null) return false;

      if (bcdui.util.isString(startDate) && bcdui.util.isString(endDate)) {
        return bcdui.util.datetime.isYearRange(bcdui.util.datetime.parseDate(startDate), bcdui.util.datetime.parseDate(endDate));
      } else if (bcdui.util.isString(startDate)) {
        return bcdui.util.datetime.isYearRange(bcdui.util.datetime.parseDate(startDate), endDate);
      } else if (bcdui.util.isString(endDate)) {
        return bcdui.util.datetime.isYearRange(startDate, bcdui.util.datetime.parseDate(endDate));
      }

      var prevDate = new Date(startDate.getTime() - 86400000);
      if (prevDate.getFullYear() == startDate.getFullYear()) return false;
      var nextDate = new Date(endDate.getTime() + 86400000);
      return nextDate.getFullYear() != endDate.getFullYear();
    },

  /**
   * Tests if the date range corresponds to exactly to one quarter (Jan - Mar, Apr - Jun, Jul - Sep or Oct - Dec of the same year)
   * @param {(Date|string)} startDate First day of the date range
   * @param {(Date|string)} endDate Last day of the date range
   * @returns {boolean}
   */
  isQuarterRange: function(startDate, endDate)
    {
      if (typeof startDate == "undefined" || startDate == null ||
          typeof endDate == "undefined" || endDate == null) return false;

      if (bcdui.util.isString(startDate) && bcdui.util.isString(endDate)) {
        return bcdui.util.datetime.isQuarterRange(bcdui.util.datetime.parseDate(startDate), bcdui.util.datetime.parseDate(endDate));
      } else if (bcdui.util.isString(startDate)) {
        return bcdui.util.datetime.isQuarterRange(bcdui.util.datetime.parseDate(startDate), endDate);
      } else if (bcdui.util.isString(endDate)) {
        return bcdui.util.datetime.isQuarterRange(startDate, bcdui.util.datetime.parseDate(endDate));
      }

      var nextDate = new Date(endDate.getTime() + 86400000);

      return (startDate.getFullYear() == endDate.getFullYear() &&
              startDate.getMonth() % 3 == 0 && startDate.getDate() == 1 &&
              endDate.getMonth() == startDate.getMonth() + 2 &&
              nextDate.getMonth() != endDate.getMonth());
    },

  /**
   * Tests if the given date range covers exactly one or more months.
   * @param {(Date|string)} startDate First day of the date range
   * @param {(Date|string)} endDate Last day of the date range
   * @returns {boolean}
   */
  isMonthRange: function(startDate, endDate)
    {
      if (typeof startDate == "undefined" || startDate == null ||
          typeof endDate == "undefined" || endDate == null) return false;

      if (bcdui.util.isString(startDate) && bcdui.util.isString(endDate)) {
        return bcdui.util.datetime.isMonthRange(bcdui.util.datetime.parseDate(startDate), bcdui.util.datetime.parseDate(endDate));
      } else if (bcdui.util.isString(startDate)) {
        return bcdui.util.datetime.isMonthRange(bcdui.util.datetime.parseDate(startDate), endDate);
      } else if (bcdui.util.isString(endDate)) {
        return bcdui.util.datetime.isMonthRange(startDate, bcdui.util.datetime.parseDate(endDate));
      }

      var prevDate = new Date(startDate.getTime() - 86400000);
      if (prevDate.getMonth() == startDate.getMonth()) return false;
      var nextDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
      return nextDate.getMonth() != endDate.getMonth();
    },

  /**
   * Tests if the given date range covers exactly one or more calendar weeks.
   * @param {(Date|string)} startDate First day of the date range
   * @param {(Date|string)} endDate Last day of the date range
   * @returns {boolean}
   */
  isWeekRange: function( startDate, endDate)
    {
      if (typeof startDate == "undefined" || startDate == null ||
          typeof endDate == "undefined" || endDate == null) return false;

      if (bcdui.util.isString(startDate) && bcdui.util.isString(endDate)) {
        return bcdui.util.datetime.isWeekRange(bcdui.util.datetime.parseDate(startDate), bcdui.util.datetime.parseDate(endDate));
      } else if (bcdui.util.isString(startDate)) {
        return bcdui.util.datetime.isWeekRange(bcdui.util.datetime.parseDate(startDate), endDate);
      } else if (bcdui.util.isString(endDate)) {
        return bcdui.util.datetime.isWeekRange(startDate, bcdui.util.datetime.parseDate(endDate));
      }

      var prevDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 1);
      if (bcdui.util.datetime.getISOWeekNumber(prevDate) == bcdui.util.datetime.getISOWeekNumber(startDate)) return false;
      var nextDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
      return bcdui.util.datetime.getISOWeekNumber(nextDate) != bcdui.util.datetime.getISOWeekNumber(endDate);
    },

  /**
   * Shifts the given period by the given value
   * The value is assumed to have the same period type (qu, mo, dy) as startDate and endDate
   * @param {integer} value -  An integer of how many periods the input is to be shifted. Negative values are allowed.
   * @param {Date} startDate
   * @param {Date} endDate
   */
  increasePeriod: function( value, startDate, endDate)
    {
      if (startDate != null && endDate != null) {
        if (bcdui.util.datetime.isYearRange(startDate, endDate)) {
          startDate.setYear(startDate.getFullYear() + value);
          endDate.setYear(endDate.getFullYear() + value);
        }
        else if (bcdui.util.datetime.isQuarterRange(startDate, endDate)) {
          endDate.setDate(endDate.getDate() + 1); // switch to the 1. day of the next month
          startDate.setMonth(startDate.getMonth() + value*3);
          endDate.setMonth(endDate.getMonth() + value*3);
          endDate.setDate(endDate.getDate() - 1); // switch to the last day of the previous month
        }
        else if (bcdui.util.datetime.isMonthRange(startDate, endDate)) {
          endDate.setDate(endDate.getDate() + 1); // switch to the 1. day of the next month
          startDate.setMonth(startDate.getMonth() + value);
          endDate.setMonth(endDate.getMonth() + value);
          endDate.setDate(endDate.getDate() - 1); // switch to the last day of the previous month
        }
        else if (bcdui.util.datetime.isWeekRange(startDate, endDate)) {
          startDate.setDate(startDate.getDate() + value*7);
          endDate.setDate(endDate.getDate() + value*7);
        }
        else { // Day
          startDate.setDate(startDate.getDate() + value);
          endDate.setDate(endDate.getDate() + value);
        }
      }
    },

  /**
   * Calculates The year of the ISO week the date lies within. This can be different from
   * the year of the date, especially when the year has 53 ISO weeks.
   * @param {(Date|string)} date - date for which to determine the CW
   * @returns {integer} cwYr
   */
  getISOWeekYear: function( date)
    {
      var d = bcdui.util.datetime.parseDate(date);
      if (d.getMonth() > 0 && d.getMonth() < 11) {
        return d.getFullYear();
      }
      var weekNo = bcdui.util.datetime.getISOWeekNumber(d);
      if (weekNo >= 52 && d.getMonth() == 0) {
        return d.getFullYear() - 1;
      }
      if (weekNo == 1 && d.getMonth() == 11) {
        return d.getFullYear() + 1;
      }
      return d.getFullYear();
    },

  /**
   * Calculates the ISO week number the date belongs to. Derived from Klaus Tondering's Calendar document.
   * @param {(Date|string)} date - date for which to determine the CW
   * @returns {integer} cw
   */
  getISOWeekNumber: function( date)
    {
      var startAt = 1;      // 0 - sunday ; 1 - monday
      if (typeof date == "undefined" || date == null)
        return -1;
      if (bcdui.util.isString(date))
        return bcdui.util.datetime.getISOWeekNumber(bcdui.util.datetime.parseDate(date));

      // Algorithm used:
      // From Klaus Tondering's Calendar document (The Authority/Guru)
      // http://www.tondering.dk/claus/calendar.html
      // a = (14-month) / 12
      // y = year + 4800 - a
      // m = month + 12a - 3
      // J = day + (153m + 2) / 5 + 365y + y / 4 - y / 100 + y / 400 - 32045
      // d4 = (J + 31741 - (J mod 7)) mod 146097 mod 36524 mod 1461
      // L = d4 / 1460
      // d1 = ((d4 - L) mod 365) + L
      // WeekNumber = d1 / 7 + 1

      var year = date.getFullYear();
      var month = date.getMonth() + 1;
      var day;
      if (startAt == 0) {
         day = date.getDate() + 1;
      }
      else {
         day = date.getDate();
      }

      var a = Math.floor((14-month) / 12);
      var y = year + 4800 - a;
      var m = month + 12 * a - 3;
      var b = Math.floor(y/4) - Math.floor(y/100) + Math.floor(y/400);
      var J = day + Math.floor((153 * m + 2) / 5) + 365 * y + b - 32045;
      var d4 = (((J + 31741 - (J % 7)) % 146097) % 36524) % 1461;
      var L = Math.floor(d4 / 1460);
      var d1 = ((d4 - L) % 365) + L;
      var week = Math.floor(d1/7) + 1;

      return week;
   },

 /**
  * Pretty prints a date range
  * @param {(Date|string)} startDate First day of the date range
  * @param {(Date|string)} endDate Last day of the date range
  * @returns {String} A string describing the date range (e.g. "Jul 2010" or "CW 30, 2010").
  */
 prettyPrintDateRange: function(startDate, endDate)
   {
     if (typeof startDate == "undefined" || startDate == null || (bcdui.util.isString(startDate) && !startDate.trim()) ||
         typeof endDate == "undefined" || endDate == null || (bcdui.util.isString(endDate) && !endDate.trim()))
       return "(none)";

     var d1 = bcdui.util.datetime.parseDate(startDate);
     var d2 = bcdui.util.datetime.parseDate(endDate);

     if (bcdui.util.datetime.isYearRange(d1, d2)) {
       var y1 = d1.getFullYear();
       var y2 = d2.getFullYear();
       if (y1 == y2) return y1;
       return y1 + " - " + y2;
     }

     if (bcdui.util.datetime.isQuarterRange(d1, d2)) {
       return "Q" + Math.floor(d1.getMonth() / 3 + 1) + ", " + d1.getFullYear();
     }

     if (bcdui.util.datetime.isMonthRange(d1, d2)) {
       if (d1.getFullYear() == d2.getFullYear()) {
         if (d1.getMonth() == d2.getMonth())
           return bcdui.util.datetime._formatMonthAndYear(d1.getFullYear(), d1.getMonth() + 1);
         return bcdui.util.datetime.getShortMonthName(d1.getMonth() + 1) + " - " +
                bcdui.util.datetime.getShortMonthName(d2.getMonth() + 1) + " " + d1.getFullYear();
       }
       return bcdui.util.datetime._formatMonthAndYear(d1.getFullYear(), d1.getMonth() + 1) + " - " +
              bcdui.util.datetime._formatMonthAndYear(d2.getFullYear(), d2.getMonth() + 1);
     }

     if (bcdui.util.datetime.isWeekRange(d1, d2)) {
       var y1 = bcdui.util.datetime.getISOWeekYear(d1);
       var y2 = bcdui.util.datetime.getISOWeekYear(d2);
       var w1 = bcdui.util.datetime.getISOWeekNumber(d1);
       var w2 = bcdui.util.datetime.getISOWeekNumber(d2);
       if (y1 == y2) {
         if (w1 == w2)
           return "CW " + w1 + ", " + y1;
         return "CW " + w1 + " - " + w2 + ", " + y1;
       }
       return "CW " + w1 + ", " + y1 +  " - " + w2 + ", " + y2;
     }

     var str1 = bcdui.util.datetime.formatDate(d1);
     var str2 = bcdui.util.datetime.formatDate(d2);

     if (str1 == str2) return str1;

     return bcdui.util.datetime.formatDate(d1) + " - " +
            bcdui.util.datetime.formatDate(d2);
   },

 /**
  * @private
  */
 _shortMonthNames:
   [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ],

 /**
  * The month name as abbreviated string (e.g. "Jul")
  * @param {int} month
  * @returns {String}.
  */
 getShortMonthName: function(month)
   {
     return bcdui.util.datetime._shortMonthNames[month - 1];
   },

 /**
  * @param {int} year
  * @param {int} month
  * @private
  */
 _formatMonthAndYear: function( year,  month)
   {
     return bcdui.util.datetime.getShortMonthName(month) + " " + year;
   },

 /**
  * The date in the XML date format (e.g. "2010-07-23")
  * @param {Date} date
  * @returns {String}
  */
 formatDate: function( date)
   {
     return date.getFullYear() + "-" + bcdui.util.datetime._twoDigits(date.getMonth() + 1) + "-" + bcdui.util.datetime._twoDigits(date.getDate());
   },

 /**
  * The date in the XML datetime format (e.g. "2010-07-23T00:00:00")
  * @param {Date} date
  * @returns {String}
  */
 formatDateTime: function(date)
   {
     return date.getFullYear() + "-" + bcdui.util.datetime._twoDigits(date.getMonth() + 1) + "-" + bcdui.util.datetime._twoDigits(date.getDate())
       + "T" + bcdui.util.datetime._twoDigits(date.getHours()) + ":" + bcdui.util.datetime._twoDigits(date.getMinutes()) + ":" + bcdui.util.datetime._twoDigits(date.getSeconds());
   },
 /**
  * @param {int} value
  * @private
  */
 _twoDigits: function( value)
   {
     if (value < 10) return "0" + value;
     return value;
   }

}; // namespace
