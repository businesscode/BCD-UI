/*
  Copyright 2026-2026 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.subjectsettings.services;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.session.Session;
import org.apache.shiro.subject.Subject;
import org.apache.shiro.subject.support.SubjectThreadState;
import org.apache.shiro.util.ThreadState;
import org.apache.shiro.web.subject.WebSubject;

/**
 * Scopes a Shiro login to just the current request: logs in the given (not yet verified - see
 * {@link OnBehalfIdentityRealm}) on-behalf-of identity assertion, binds the resulting Subject to the
 * current thread, and on close() unbinds it again and destroys any session that got created along the
 * way - so these short-lived, per-call sessions never outlive the request or linger in the session store
 * until they time out naturally.
 *
 * Refuses to even start if the request already presents a session id (valid or not - a trusted caller
 * here is a machine, not a browser, so it must never send one). That alone is the guarantee that matters:
 * a request can only ever become associated with a session either because the client presented an id for
 * an existing one, or because something creates one fresh during this very request's own processing - a
 * request has no way to "inherit" a pre-existing, possibly-someone-else's session without a client-
 * presented id. So with no such id here, any session subject.login() below happens to encounter (e.g. one
 * some unrelated filter earlier in the pipeline created for its own reasons) is necessarily a brand new,
 * request-scoped one - not a security concern, even if it's a sign of an unrelated filter doing something
 * surprising with sessions on this path.
 * Use in a try-with-resources around the protected work.
 *
 * Built as a {@link WebSubject} (not a bare {@link Subject}) so it carries the current request/response
 * pair - required for {@link org.apache.shiro.web.util.WebUtils#isHttp} to recognize it as an HTTP-bound
 * subject; otherwise BindingSet SubjectFilter evaluation treats it as a non-interactive backend caller and
 * requires an explicit backendCanBypassSubjectFilter opt-out instead of applying the user's own filters.
 */
public class RequestSession implements AutoCloseable {

  private final Subject subject;
  private final ThreadState threadState;

  public RequestSession(RequestAuthenticationToken token, HttpServletRequest request, HttpServletResponse response) throws AuthenticationException {
    if (request.getRequestedSessionId() != null) {
      throw new AuthenticationException("Trusted callers must not present a session id");
    }
    subject = new WebSubject.Builder(SecurityUtils.getSecurityManager(), request, response)
        .buildSubject();
    subject.login(token);
    threadState = new SubjectThreadState(subject);
    threadState.bind();
  }

  @Override
  public void close() {
    Session session = subject.getSession(false);
    if (session != null) session.stop();
    threadState.clear();
  }
}