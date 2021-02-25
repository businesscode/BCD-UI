/*
  Copyright 2010-2018 BusinessCode GmbH, Germany

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

/*
  description: Parses and generates filter expression (JISON)
  required scope funcs: resolveVariable(varName), escapeHtml(text)
 */

/* lexical grammar */
%lex
%%

\s+                   /* skip whitespace */
("!="|"<>"|">="|"<="|"<"|">"|"="|\blike\b|\bnotLike\b|\bnotIn\b|\bin\b|\bbitand\bgeoContains\bgeoContained\bgeoIntersect\b)	return 'OP'
"not"                 return 'NOT'
"and"                 return 'AND'
"or"                  return 'OR'
"("                   return '('
")"                   return ')'
"'"[^']*"'"           return 'TEXT'
":"[a-zA-Z0-9_]+      return 'VARNAME'
[a-zA-Z0-9_]+         return 'BREF'
<<EOF>>               return 'EOF'
.                     return 'INVALID'

/lex

/* operator associations and precedence */

%left 'OR'
%left 'AND'
%left 'NOT'
%left '('

%start expressions

%% /* language grammar */

expressions
  : e EOF
      { return "<f:And xmlns:f='http://www.businesscode.de/schema/bcdui/filter-1.0.0'>" + $1 + "</f:And>"; }
  ;

e	: BREF OP VARNAME
		{ $$ = "<f:Expression bRef='" + $1 + "' op='" + yy.escapeHtml($2) + "' value='" + yy.resolveVariable($3) + "'/>";  }
	| BREF OP TEXT
		{ var len=$3.length; $$ = "<f:Expression bRef='" + $1 + "' op='" + yy.escapeHtml($2) + "' value='" + yy.escapeHtml($3.substring(1,len-1)) + "'/>";  }
	| NOT '(' e ')'
		{ $$ = "<f:Not>"+ $3 +"</f:Not>"; }
	| e 'AND' e
		{ $$ = "<f:And>"+ $1 + $3 +"</f:And>"; }
  | e 'OR' e
		{ $$ = "<f:Or>"+ $1 + $3 +"</f:Or>"; }
  | '(' e ')'
		{ $$ = $2; }
	;
