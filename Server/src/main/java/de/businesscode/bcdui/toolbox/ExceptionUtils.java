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
package de.businesscode.bcdui.toolbox;

import java.io.PrintWriter;
import java.io.StringWriter;

import javax.servlet.ServletException;
import javax.servlet.jsp.JspException;
import javax.servlet.jsp.el.ELException;

@SuppressWarnings("deprecation")
public class ExceptionUtils {

  /**
   *
   */
  private ExceptionUtils() {
  }

  /**
   * This method extracts the stack trace from a Throwable.
   *
   * @param thr
   *          The exception the stack trace is taken from.
   * @return A stack trace.
   */
  public static String getStackTrace(Throwable thr) {
    StringWriter writer = new StringWriter();
    PrintWriter pw = new PrintWriter(writer);
    thr.printStackTrace(pw);

    // some old expcetion classes define their own rootCause. we need
    // to fetch these explicitly
    if (thr instanceof JspException)
      printRootCause(((JspException) thr).getRootCause(), thr, pw);
    if (thr instanceof ServletException)
      printRootCause(((ServletException) thr).getRootCause(), thr, pw);
    if (thr instanceof ELException)
      printRootCause(((ELException) thr).getRootCause(), thr, pw);

    return writer.getBuffer().toString();
  }

  /**
   * @param rootCause
   * @param original
   * @param pw
   */
  private static void printRootCause(Throwable rootCause, Throwable original, PrintWriter pw) {
    if (rootCause != null)
      printStackTraceAsCause(rootCause, pw, original.getStackTrace());
  }

  /**
   * Print t's stack trace as a cause for the specified stack trace.
   */
  private static void printStackTraceAsCause(Throwable t, PrintWriter s, StackTraceElement[] causedTrace) {
    // assert Thread.holdsLock(s);

    // Compute number of frames in common between this and caused
    StackTraceElement[] trace = t.getStackTrace();
    int m = trace.length - 1, n = causedTrace.length - 1;
    while (m >= 0 && n >= 0 && trace[m].equals(causedTrace[n])) {
      m--;
      n--;
    }
    int framesInCommon = trace.length - 1 - m;

    s.println("Caused by: " + t);
    for (int i = 0; i <= m; i++)
      s.println("\tat " + trace[i]);
    if (framesInCommon != 0)
      s.println("\t... " + framesInCommon + " more");

    // Recurse if we have a cause
    Throwable ourCause = t.getCause();
    if (ourCause != null)
      printStackTraceAsCause(ourCause, s, trace);
  }
}
