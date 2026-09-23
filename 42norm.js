#!/usr/bin/env node
/**
 * 42norm.js
 * ---------------------------------------------------------------------------
 * Single-file, zero-dependency Node.js tool for the 42 School C piscine.
 *
 * What it does:
 *   1. Recursively walks a directory tree starting at the given root
 *      (default: current working directory).
 *   2. For every *.c / *.h file it finds, it checks whether the file starts
 *      with a valid 42 header comment. If the header is missing, it is
 *      generated and inserted. If it exists but is malformed (wrong
 *      filename, wrong login, broken alignment, ...) it is regenerated,
 *      while preserving the original "Created" timestamp/login when it can
 *      be recovered.
 *   3. It then auto-fixes everything about whitespace/spacing that can be
 *      fixed unambiguously, straight from the official Norm doc:
 *        - leading indentation rewritten from spaces to real tabs
 *        - any run of spaces/tabs between tokens collapsed to one space
 *          ("you can never have two consecutive spaces"), never touching
 *          the inside of string/char literals
 *        - exactly one tab between a function's return type and its name
 *        - the opening brace of a function or control structure (if/
 *          while/for/else) moved onto its own new line
 *        - a space inserted after a comma/semicolon that's missing one
 *        - trailing whitespace removed, empty lines made truly empty, and
 *          consecutive blank lines collapsed to one
 *   4. It then runs a best-effort "Norm" linter over what's left and
 *      prints warnings for things it does NOT auto-fix (line length,
 *      forbidden // comments, too many functions per file, functions that
 *      are too long, too many parameters, nesting too deep, etc) since
 *      those need a human decision, not a mechanical rewrite.
 *
 * IMPORTANT: This is NOT a replacement for the official `norminette`. It is
 * a fast, dependency-free helper that catches and fixes the most common
 * mistakes and keeps your headers valid. Always run the real norminette
 * before turning in your work.
 *
 * Compatible with Node.js 12+ (CommonJS, no external packages required).
 *
 * Usage:
 *   node 42norm.js [rootDir] [options]
 *
 * Options:
 *   --login=<name>     Force the login used in the header (By/Created/Updated).
 *                       Defaults to: git config user.name -> $USER -> $USERNAME
 *                       -> OS username -> "login".
 *   --no-fix            Don't write anything to disk, only report what would
 *                       be changed (dry run for headers and whitespace).
 *   --header-only       Only check/fix headers, skip whitespace fixes and
 *                       the Norm linter entirely.
 *   --lint-only         Don't touch headers, but still auto-fix whitespace
 *                       and run the Norm linter.
 *   --quiet             Only print files that had something to report.
 *   --strict            Exit with code 1 if any lint warning was found.
 *   -h, --help          Show this help and exit.
 *
 * Examples:
 *   node 42norm.js
 *   node 42norm.js ./my_piscine_project --login=mbashenk
 *   node 42norm.js . --no-fix --strict
 * ---------------------------------------------------------------------------
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/* ==========================================================================
 * CONFIG
 * ========================================================================== */

const VALID_EXTENSIONS = ['.c', '.h'];
const IGNORE_DIRS = ['.git', 'node_modules', '.vscode', '.vs', 'build', 'dist'];

const MAX_LINE_LEN = 80;
const MAX_FUNCTIONS_PER_FILE = 5;
const MAX_FUNCTION_BODY_LINES = 25;
const MAX_FUNCTION_PARAMS = 4;
const MAX_NEST_DEPTH = 3;
// Norm: "You must indent your code with 4-char-long tabulations [...] a
// tabulation doesn't count as a single column, but as the number of spaces
// it represents." Used both to expand tabs when measuring line length and
// to decide how many tabs a run of leading spaces should become.
const TAB_WIDTH = 4;

/* ==========================================================================
 * SMALL UTILITIES
 * ========================================================================== */

const COLOR = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
	gray: '\x1b[90m',
	bold: '\x1b[1m',
};

function c(color, text) {
	if (process.env.NO_COLOR) return text;
	return color + text + COLOR.reset;
}

function pad2(n) {
	return String(n).length < 2 ? '0' + n : String(n);
}

function formatDate(d) {
	const y = d.getFullYear();
	const mo = pad2(d.getMonth() + 1);
	const da = pad2(d.getDate());
	const h = pad2(d.getHours());
	const mi = pad2(d.getMinutes());
	const s = pad2(d.getSeconds());
	return y + '/' + mo + '/' + da + ' ' + h + ':' + mi + ':' + s;
}

/* ==========================================================================
 * CLI ARGS
 * ========================================================================== */

function parseArgs(argv) {
	const opts = {
		root: '.',
		login: "mbashenk",
		fix: true,
		headerOnly: false,
		lintOnly: false,
		quiet: false,
		strict: false,
		help: false,
	};

	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '-h' || a === '--help') {
			opts.help = true;
		} else if (a === '--no-fix') {
			opts.fix = false;
		} else if (a === '--header-only') {
			opts.headerOnly = true;
		} else if (a === '--lint-only') {
			opts.lintOnly = true;
		} else if (a === '--quiet') {
			opts.quiet = true;
		} else if (a === '--strict') {
			opts.strict = true;
		} else if (a.indexOf('--login=') === 0) {
			opts.login = a.slice('--login='.length);
		} else if (a.charAt(0) !== '-') {
			opts.root = a;
		}
	}
	return opts;
}

function printHelp() {
	const lines = [
		'42norm.js - 42 School header fixer + best-effort Norm linter',
		'',
		'Usage:',
		'  node 42norm.js [rootDir] [options]',
		'',
		'Options:',
		'  --login=<name>   Force the login used in the header',
		'  --no-fix         Dry run, do not write files',
		'  --header-only    Only check/fix headers',
		'  --lint-only      Only run the Norm linter',
		'  --quiet          Only print files with issues',
		'  --strict         Exit 1 if any lint warning was found',
		'  -h, --help       Show this help',
	];
	console.log(lines.join('\n'));
}

/* ==========================================================================
 * LOGIN DETECTION
 * ========================================================================== */

function detectLogin(explicit) {
	if (explicit) return explicit;

	try {
		const gitLogin = execSync('git config user.name', {
			stdio: ['ignore', 'pipe', 'ignore'],
		})
			.toString()
			.trim();
		if (gitLogin) return gitLogin.replace(/\s+/g, '');
	} catch (e) {
		/* no git / no config, fall through */
	}

	if (process.env.USER) return process.env.USER;
	if (process.env.USERNAME) return process.env.USERNAME;

	try {
		const info = os.userInfo();
		if (info && info.username) return info.username;
	} catch (e) {
		/* ignore */
	}

	return 'login';
}

/* ==========================================================================
 * 42 HEADER TEMPLATE
 *
 * The header is always exactly 80 columns wide. Three lines are completely
 * fixed (the border + the two "diagonal decoration only" lines). Four lines
 * have variable content (filename, By, Created, Updated); for those, the
 * decorative right-hand side always starts at a fixed column so everything
 * stays visually aligned, exactly like the header produced by the classic
 * 42 vim/emacs header plugins.
 * ========================================================================== */

const HR = '/* ' + '*'.repeat(74) + ' */'; // border line, 80 chars
const BLANK = '/*' + ' '.repeat(76) + '*/'; // empty line, 80 chars

const FIXED_LINE_1 = '/*                                                        :::      ::::::::   */';
const FIXED_LINE_2 = '/*                                                    +:+ +:+         +:+     */';
const FIXED_LINE_3 = '/*                                                +#+#+#+#+#+   +#+           */';

// { column where the decoration starts, decoration string }
const FILENAME_COL = 56;
const FILENAME_SUFFIX = ':+:      :+:    :+:   */';

const BY_COL = 52;
const BY_SUFFIX = '+#+  +:+       +#+        */';

const CREATED_COL = 55;
const CREATED_SUFFIX = '#+#    #+#             */';

const UPDATED_COL = 54;
const UPDATED_SUFFIX = '###   ########.fr       */';

function buildAlignedLine(leftText, col, suffix) {
	let left = leftText;
	if (left.length < col) {
		left = left + ' '.repeat(col - left.length);
	} else {
		// content too long for the standard width: keep at least one space
		// before the decoration instead of corrupting the line.
		left = left.slice(0, Math.max(col - 1, 0)) + ' ';
	}
	return left + suffix;
}

function buildHeader(filename, login, createdDate, createdLogin, updatedDate, updatedLogin) {
	const filenameLine = buildAlignedLine('/*   ' + filename, FILENAME_COL, FILENAME_SUFFIX);
	const byLine = buildAlignedLine('/*   By: ' + login, BY_COL, BY_SUFFIX);
	const createdLine = buildAlignedLine(
		'/*   Created: ' + createdDate + ' by ' + createdLogin,
		CREATED_COL,
		CREATED_SUFFIX
	);
	const updatedLine = buildAlignedLine(
		'/*   Updated: ' + updatedDate + ' by ' + updatedLogin,
		UPDATED_COL,
		UPDATED_SUFFIX
	);

	return [
		HR,
		BLANK,
		FIXED_LINE_1,
		filenameLine,
		FIXED_LINE_2,
		byLine,
		FIXED_LINE_3,
		createdLine,
		updatedLine,
		BLANK,
		HR,
	].join('\n');
}

const BORDER_RE = /^\/\*\s*\*+\s*\*\/\s*$/;
const BY_RE = /By:\s*(\S+)/;
const CREATED_RE = /Created:\s*(\S+ \S+)\s+by\s+(\S+)/;
const UPDATED_RE = /Updated:\s*(\S+ \S+)\s+by\s+(\S+)/;

/**
 * Detects an existing header block at the very top of the file and extracts
 * whatever fields it can recognise (By login, Created date/login, Updated
 * date/login). Returns null if there is no header at all.
 * `end` is the index of the line AFTER the closing border (i.e. the header
 * spans lines[start..end-1]).
 */
function detectHeader(lines) {
	if (lines.length === 0 || !BORDER_RE.test(lines[0])) return null;

	// look for the closing border within a reasonable window
	let closeIdx = -1;
	for (let i = 1; i < Math.min(lines.length, 20); i++) {
		if (BORDER_RE.test(lines[i])) {
			closeIdx = i;
			break;
		}
	}
	if (closeIdx === -1) return null;

	let byLogin = null;
	let createdDate = null;
	let createdLogin = null;
	let updatedDate = null;
	let updatedLogin = null;

	for (let i = 0; i <= closeIdx; i++) {
		const byMatch = BY_RE.exec(lines[i]);
		if (byMatch && byLogin === null) byLogin = byMatch[1];

		const createdMatch = CREATED_RE.exec(lines[i]);
		if (createdMatch) {
			createdDate = createdMatch[1];
			createdLogin = createdMatch[2];
		}

		const updatedMatch = UPDATED_RE.exec(lines[i]);
		if (updatedMatch) {
			updatedDate = updatedMatch[1];
			updatedLogin = updatedMatch[2];
		}
	}

	return {
		start: 0,
		end: closeIdx + 1,
		byLogin: byLogin,
		createdDate: createdDate,
		createdLogin: createdLogin,
		updatedDate: updatedDate,
		updatedLogin: updatedLogin,
	};
}

/**
 * Ensures `filepath` has a correct, up-to-date 42 header.
 * Returns { changed: bool, action: 'added'|'fixed'|'ok', content: string }
 *
 * Behaviour mirrors the classic 42 editor header plugins:
 *   - "By:" and "Created:" are set once and preserved forever afterwards.
 *   - "Updated:" (date + login) only changes when the header actually needed
 *     a real repair (missing header, wrong filename, corrupted/malformed
 *     field). A header that is already perfectly well-formed is left 100%
 *     untouched, so re-running the tool on a clean project is a no-op.
 */
function ensureHeader(filepath, content, login) {
	const filename = path.basename(filepath);
	const now = formatDate(new Date());
	const lines = content.split('\n');

	const existing = detectHeader(lines);

	if (!existing) {
		const header = buildHeader(filename, login, now, login, now, login);
		let rest = content;
		// avoid stacking multiple blank lines if file already starts with one
		rest = rest.replace(/^\s*\n/, '');
		const newContent = header + '\n\n' + rest;
		return { changed: true, action: 'added', content: newContent };
	}

	const byLogin = existing.byLogin || login;
	const createdDate = existing.createdDate || now;
	const createdLogin = existing.createdLogin || login;
	const oldUpdatedDate = existing.updatedDate || now;
	const oldUpdatedLogin = existing.updatedLogin || login;

	const oldHeader = lines.slice(existing.start, existing.end).join('\n');

	// First, check whether the header is *already* well-formed, reusing its
	// own existing Updated field. If this reconstruction matches exactly,
	// nothing is actually wrong and we must not touch the file at all.
	const checkHeader = buildHeader(filename, byLogin, createdDate, createdLogin, oldUpdatedDate, oldUpdatedLogin);
	if (checkHeader === oldHeader) {
		return { changed: false, action: 'ok', content: content };
	}

	// The header has a real defect (wrong filename, missing/garbled field,
	// broken alignment, ...). Regenerate it and bump Updated to now, using
	// the currently detected login as the one performing the fix.
	const newHeader = buildHeader(filename, byLogin, createdDate, createdLogin, now, login);
	const before = lines.slice(0, existing.start);
	const after = lines.slice(existing.end);
	// drop a single leading blank line right after the header, we re-add it
	if (after.length > 0 && after[0].trim() === '') after.shift();
	const newLines = before.concat(newHeader.split('\n')).concat(['', '']).concat(after);
	const newContent = newLines.join('\n');

	return { changed: true, action: 'fixed', content: newContent };
}

/* ==========================================================================
 * BEST-EFFORT NORM LINTER
 *
 * This is a heuristic checker, not a full C parser. It aims to catch the
 * most common Norm mistakes made during the C piscine. It is intentionally
 * conservative to minimise false positives.
 * ========================================================================== */

function visualWidth(line) {
	// Expand tabs to their real column width (next multiple of TAB_WIDTH),
	// per Norm's explicit warning that a tab is not "1 column".
	let col = 0;
	for (let i = 0; i < line.length; i++) {
		if (line[i] === '\t') {
			col += TAB_WIDTH - (col % TAB_WIDTH);
		} else {
			col++;
		}
	}
	return col;
}

function stripStringsAndChars(line) {
	// crude removal of string/char literal contents so we don't get
	// confused by "//" or ";" that appear inside them.
	return line
		.replace(/"(\\.|[^"\\])*"/g, '""')
		.replace(/'(\\.|[^'\\])*'/g, "''");
}

// Matches a function *signature* line: `<return type> <sep> <name>(<params>)`
// optionally followed directly by `{`. Captures:
//   1) everything that makes up the return type
//   2) the single separator character right before the name (should be \t)
//   3) the function name (with any leading pointer '*'s stuck to it)
//   4) the parameter list
//   5) a trailing '{' if the brace was (wrongly) left on this line
const FUNC_SIG_RE = /^([A-Za-z_][A-Za-z0-9_ \t]*?)([ \t])(\**[A-Za-z_][A-Za-z0-9_]*)\s*\(([^;{}]*)\)[ \t]*(\{)?[ \t]*$/;

// `if (...) {`, `while (...) {`, `else if (...) {`, or a bare `else {`: the
// Norm requires a new line after every curly brace / end of control
// structure, so the '{' can never share a line with the condition.
const CONTROL_BRACE_RE = /^[ \t]*(?:\}[ \t]*)?(if|while|for)[ \t]*\(.*\)[ \t]*\{[ \t]*$/;
const ELSE_BRACE_RE = /^[ \t]*\}?[ \t]*else([ \t]+if[ \t]*\(.*\))?[ \t]*\{[ \t]*$/;

function lintLines(lines, headerEnd) {
	const issues = [];

	for (let i = 0; i < lines.length; i++) {
		const lineNo = i + 1;
		if (i < headerEnd) continue; // don't lint inside the header block
		const raw = lines[i];
		const clean = stripStringsAndChars(raw);

		const width = visualWidth(raw);
		if (width > MAX_LINE_LEN) {
			issues.push({ line: lineNo, level: 'error', msg: 'Line exceeds ' + MAX_LINE_LEN + ' columns (' + width + ')' });
		}

		// Flag any space anywhere in the leading indentation run, not just
		// a space at column 0 - a tab followed by leftover spaces (e.g.
		// "\t    foo();") is just as much a Norm violation as pure spaces.
		const leadingIndent = (raw.match(/^[ \t]*/) || [''])[0];
		if (/\S/.test(raw) && leadingIndent.indexOf(' ') !== -1 && !/^\s*\*/.test(raw)) {
			issues.push({ line: lineNo, level: 'warn', msg: 'Indentation uses spaces, Norm requires tabs' });
		}

		if (/[ \t]+$/.test(raw)) {
			issues.push({ line: lineNo, level: 'warn', msg: 'Trailing whitespace' });
		}

		// Function signature: exactly one TAB between return type and name,
		// and the brace (if any) may never share this line.
		const sigMatch = FUNC_SIG_RE.exec(clean);
		const isFuncSigLine = !!sigMatch;
		if (sigMatch) {
			const sep = sigMatch[2];
			const params = sigMatch[4];
			const brace = sigMatch[5];

			if (sep !== '\t') {
				issues.push({
					line: lineNo,
					level: 'error',
					msg: 'Must have a single tabulation between the return type and the function name (found a space)',
				});
			}
			if (brace) {
				issues.push({
					line: lineNo,
					level: 'error',
					msg: "Opening brace '{' must start a new line, not share the line with the function signature",
				});
			}
			if (/ {2,}/.test(params)) {
				issues.push({
					line: lineNo,
					level: 'warn',
					msg: 'Multiple consecutive spaces between tokens, Norm requires exactly one space',
				});
			}
		}

		// Control structure: `if/while/for/else (...) {` on one line.
		if (!isFuncSigLine && (CONTROL_BRACE_RE.test(raw) || ELSE_BRACE_RE.test(raw))) {
			issues.push({
				line: lineNo,
				level: 'error',
				msg: "Opening brace '{' must start a new line, not share the line with the control structure",
			});
		}

		// Mid-line whitespace: Norm requires tabs for indentation only, and
		// exactly one space between tokens everywhere else (the single tab
		// before a function name, handled above, is the sole exception).
		// Split off the leading indentation first so we don't re-flag it
		// here, and skip comment-body lines (e.g. " * foo" continuation
		// lines) where authors legitimately align text with extra spaces.
		const indent = (raw.match(/^[ \t]*/) || [''])[0];
		const afterIndent = raw.slice(indent.length);
		const cleanAfterIndent = stripStringsAndChars(afterIndent);
		const isCommentBodyLine = /^\*/.test(afterIndent) || /^\/\*/.test(afterIndent);

		if (!isFuncSigLine && !isCommentBodyLine && cleanAfterIndent.trim() !== '') {
			if (/ {2,}/.test(cleanAfterIndent)) {
				issues.push({
					line: lineNo,
					level: 'warn',
					msg: 'Multiple consecutive spaces between tokens, Norm requires exactly one space',
				});
			}

			if (/\t/.test(cleanAfterIndent)) {
				issues.push({
					line: lineNo,
					level: 'warn',
					msg: 'Tab used between tokens, Norm allows tabs for indentation only',
				});
			}
		}

		const commentIdx = clean.indexOf('//');
		if (commentIdx !== -1) {
			issues.push({ line: lineNo, level: 'error', msg: "'//' comments are forbidden by Norm, use /* */" });
		}

		// crude "multiple statements per line" check, skip for-loop headers
		if (!/\bfor\s*\(/.test(clean)) {
			const withoutParens = clean.replace(/\([^()]*\)/g, '()');
			const semis = (withoutParens.match(/;/g) || []).length;
			if (semis > 1) {
				issues.push({ line: lineNo, level: 'warn', msg: 'More than one statement on the same line' });
			}
		}
	}

	return issues;
}

const FUNC_DEF_RE = /^[A-Za-z_][A-Za-z0-9_ \t\*]*?\b([A-Za-z_][A-Za-z0-9_]*)\s*\(([^;{}]*)\)\s*$/;

function findFunctions(lines, headerEnd) {
	const functions = [];

	for (let i = headerEnd; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line === '' || line.charAt(0) === '#') continue;

		const m = FUNC_DEF_RE.exec(line);
		if (!m) continue;

		// the opening brace must be on the next non-blank line (Norm style)
		let j = i + 1;
		while (j < lines.length && lines[j].trim() === '') j++;
		if (j >= lines.length || lines[j].trim() !== '{') continue;

		// find the matching closing brace by counting depth
		let depth = 1;
		let maxDepth = 1;
		let k = j + 1;
		for (; k < lines.length && depth > 0; k++) {
			const opens = (lines[k].match(/{/g) || []).length;
			const closes = (lines[k].match(/}/g) || []).length;
			depth += opens - closes;
			if (depth > maxDepth) maxDepth = depth;
			if (depth <= 0) break;
		}

		functions.push({
			name: m[1],
			params: m[2].trim(),
			defLine: i + 1,
			bodyStart: j + 1,
			bodyEnd: k, // exclusive-ish, line index of closing brace + 1
			maxNestDepth: maxDepth - 1, // subtract the function's own top-level block
		});
	}

	return functions;
}

function lintFunctions(functions) {
	const issues = [];

	if (functions.length > MAX_FUNCTIONS_PER_FILE) {
		issues.push({
			line: functions[MAX_FUNCTIONS_PER_FILE].defLine,
			level: 'error',
			msg: 'More than ' + MAX_FUNCTIONS_PER_FILE + ' functions in this file (found ' + functions.length + ')',
		});
	}

	functions.forEach(function (fn) {
		const bodyLines = fn.bodyEnd - fn.bodyStart;
		if (bodyLines > MAX_FUNCTION_BODY_LINES) {
			issues.push({
				line: fn.defLine,
				level: 'error',
				msg: "Function '" + fn.name + "' body is " + bodyLines + ' lines (max ' + MAX_FUNCTION_BODY_LINES + ')',
			});
		}

		if (fn.params !== '' && fn.params.toLowerCase() !== 'void') {
			const paramCount = fn.params.split(',').filter(function (p) {
				return p.trim() !== '';
			}).length;
			if (paramCount > MAX_FUNCTION_PARAMS) {
				issues.push({
					line: fn.defLine,
					level: 'error',
					msg: "Function '" + fn.name + "' has " + paramCount + ' parameters (max ' + MAX_FUNCTION_PARAMS + ')',
				});
			}
		} else if (fn.params === '') {
			issues.push({
				line: fn.defLine,
				level: 'warn',
				msg: "Function '" + fn.name + "' should declare an empty parameter list as (void)",
			});
		}

		if (fn.maxNestDepth > MAX_NEST_DEPTH) {
			issues.push({
				line: fn.defLine,
				level: 'warn',
				msg: "Function '" + fn.name + "' nests control structures " + fn.maxNestDepth + ' levels deep (max ' + MAX_NEST_DEPTH + ')',
			});
		}
	});

	return issues;
}

/* ==========================================================================
 * AUTO-FIXER
 *
 * Mechanically rewrites the parts of the Norm that are unambiguous to fix
 * (whitespace, not code structure). It never touches anything inside a
 * string or char literal, never touches the header block, and never
 * attempts anything it isn't confident about (e.g. it will not try to
 * reflow struct/enum/union braces, split multi-statement lines, or reorder
 * declarations).
 * ========================================================================== */

// Splits a line into { type: 'code' | 'string', text } chunks so that
// whitespace fixes can be applied to code only, leaving string/char literal
// contents byte-for-byte untouched.
function splitCodeAndStrings(line) {
	const parts = [];
	let buf = '';
	let i = 0;

	while (i < line.length) {
		const ch = line[i];
		if (ch === '"' || ch === "'") {
			if (buf) {
				parts.push({ type: 'code', text: buf });
				buf = '';
			}
			const quote = ch;
			let lit = ch;
			let j = i + 1;
			while (j < line.length) {
				lit += line[j];
				if (line[j] === '\\' && j + 1 < line.length) {
					lit += line[j + 1];
					j += 2;
					continue;
				}
				if (line[j] === quote) {
					j++;
					break;
				}
				j++;
			}
			parts.push({ type: 'string', text: lit });
			i = j;
			continue;
		}
		buf += ch;
		i++;
	}
	if (buf) parts.push({ type: 'code', text: buf });
	return parts;
}

/**
 * Fixes one non-header, non-blank line's whitespace. Returns the fixed
 * text (without any trailing newline) plus, if a brace had to be split
 * off, a second line to insert right after it.
 */
function fixLineWhitespace(raw) {
	const indentMatch = raw.match(/^[ \t]*/);
	let indent = indentMatch ? indentMatch[0] : '';
	const rest = raw.slice(indent.length);
	const isCommentBodyLine = /^\*/.test(rest) || /^\/\*/.test(rest);

	// Leading indentation must be real tabs (Norm: 4-char-long tabulations,
	// never spaces). Rewrite any indentation that contains at least one
	// space, whether it's pure spaces or a tab followed by leftover spaces
	// (e.g. "\t    foo();"). We expand the existing run at TAB_WIDTH-wide
	// tab stops to get its visual width, then re-emit that many tabs.
	// Indentation that's already pure tabs is left alone.
	if (indent.length > 0 && indent.indexOf(' ') !== -1) {
		let width = 0;
		for (let k = 0; k < indent.length; k++) {
			if (indent.charAt(k) === '\t') {
				width += TAB_WIDTH - (width % TAB_WIDTH);
			} else {
				width += 1;
			}
		}
		const tabs = Math.max(1, Math.round(width / TAB_WIDTH));
		indent = '\t'.repeat(tabs);
	}

	let fixedRest = rest;
	if (!isCommentBodyLine) {
		const parts = splitCodeAndStrings(fixedRest);

		// Collapse any run of spaces/tabs in code (not inside a string/char
		// literal) down to a single space: "Norm: you can never have two
		// consecutive spaces", and tabs are for indentation only.
		parts.forEach(function (p) {
			if (p.type === 'code') p.text = p.text.replace(/[ \t]+/g, ' ');
		});

		// Norm: "Unless it's the end of a line, each comma or semi-colon
		// must be followed by a space." Handled part-by-part, but also
		// checking one char into the *next* part, so a comma/semicolon
		// sitting right before a string/char literal (e.g. printf("%c",'x'))
		// still gets its space.
		for (let idx = 0; idx < parts.length; idx++) {
			const p = parts[idx];
			if (p.type !== 'code') continue;
			p.text = p.text.replace(/([,;])(?=[^\s)])/g, '$1 ');
			const next = parts[idx + 1];
			const nextFirstChar = next ? next.text.charAt(0) : '';
			if (/[,;]$/.test(p.text) && nextFirstChar !== '' && nextFirstChar !== ' ' && nextFirstChar !== ')') {
				p.text += ' ';
			}
		}

		fixedRest = parts.map(function (p) { return p.text; }).join('');
	}
	fixedRest = fixedRest.replace(/[ \t]+$/, '');

	let line = indent + fixedRest;
	let extraLine = null;

	// Function signature: single tab before the name, brace never on this line.
	const sigMatch = FUNC_SIG_RE.exec(line);
	if (sigMatch) {
		const retType = sigMatch[1];
		const name = sigMatch[3];
		const params = sigMatch[4];
		const brace = sigMatch[5];
		line = retType + '\t' + name + '(' + params + ')';
		if (brace) extraLine = indent + '{';
		return { line: line, extraLine: extraLine };
	}

	// Control structure: `if/while/for/else (...) {` -> split the brace off.
	if (CONTROL_BRACE_RE.test(line) || ELSE_BRACE_RE.test(line)) {
		line = line.replace(/[ \t]*\{[ \t]*$/, '');
		extraLine = indent + '{';
	}

	return { line: line, extraLine: extraLine };
}

/**
 * Runs the whitespace auto-fixer over an entire file's content, skipping
 * the header block (lines[0..headerEnd)). Returns { content, fixedCount }.
 */
function autoFixContent(content, headerEnd) {
	const lines = content.split('\n');
	const out = [];
	let fixedCount = 0;

	for (let i = 0; i < lines.length; i++) {
		const raw = lines[i];

		if (i < headerEnd) {
			out.push(raw);
			continue;
		}

		if (raw.trim() === '') {
			// Norm: "An empty line must be empty: no spaces or tabulations."
			if (raw !== '') fixedCount++;
			out.push('');
			continue;
		}

		const result = fixLineWhitespace(raw);
		if (result.line !== raw || result.extraLine !== null) fixedCount++;
		out.push(result.line);
		if (result.extraLine !== null) out.push(result.extraLine);
	}

	// Norm: "You can never have two consecutive empty lines."
	const collapsed = [];
	let prevBlank = false;
	for (let i = 0; i < out.length; i++) {
		const isBlank = out[i] === '';
		if (i >= headerEnd && isBlank && prevBlank) {
			fixedCount++;
			continue;
		}
		collapsed.push(out[i]);
		prevBlank = isBlank;
	}

	return { content: collapsed.join('\n'), fixedCount: fixedCount };
}

function lintFile(content) {
	const lines = content.split('\n');
	const existing = detectHeader(lines);
	const headerEnd = existing ? existing.end : 0;

	const issues = lintLines(lines, headerEnd);
	const functions = findFunctions(lines, headerEnd);
	const fnIssues = lintFunctions(functions);

	return issues.concat(fnIssues).sort(function (a, b) {
		return a.line - b.line;
	});
}

/* ==========================================================================
 * DIRECTORY WALKER
 * ========================================================================== */

function walk(dir, out) {
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (e) {
		console.error(c(COLOR.red, 'Cannot read directory: ' + dir + ' (' + e.message + ')'));
		return;
	}

	entries.forEach(function (entry) {
		if (entry.name.charAt(0) === '.' && entry.name !== '.') {
			// skip hidden files/dirs except the root itself
			if (IGNORE_DIRS.indexOf(entry.name) === -1 && entry.name !== '.') {
				// still allow hidden files to be skipped quietly
			}
		}
		if (entry.isDirectory()) {
			if (IGNORE_DIRS.indexOf(entry.name) !== -1) return;
			if (entry.name.charAt(0) === '.') return;
			walk(path.join(dir, entry.name), out);
		} else if (entry.isFile()) {
			const ext = path.extname(entry.name);
			if (VALID_EXTENSIONS.indexOf(ext) !== -1) {
				out.push(path.join(dir, entry.name));
			}
		}
	});
}

/* ==========================================================================
 * MAIN
 * ========================================================================== */

function main() {
	const opts = parseArgs(process.argv.slice(2));

	if (opts.help) {
		printHelp();
		process.exit(0);
	}

	const root = path.resolve(opts.root);
	if (!fs.existsSync(root)) {
		console.error(c(COLOR.red, 'Path does not exist: ' + root));
		process.exit(1);
	}

	const login = detectLogin(opts.login);
	console.log(c(COLOR.gray, 'Scanning ' + root + '  (login: ' + login + ')'));
	console.log('');

	const files = [];
	const stat = fs.statSync(root);
	if (stat.isDirectory()) {
		walk(root, files);
	} else {
		files.push(root);
	}

	files.sort();

	let headersAdded = 0;
	let headersFixed = 0;
	let headersOk = 0;
	let totalErrors = 0;
	let totalWarnings = 0;
	let filesWithIssues = 0;
	let filesFormatFixed = 0;
	let totalFormatFixes = 0;

	files.forEach(function (filepath) {
		const rel = path.relative(process.cwd(), filepath);
		let content;
		try {
			content = fs.readFileSync(filepath, 'utf8');
		} catch (e) {
			console.error(c(COLOR.red, 'Could not read ' + rel + ': ' + e.message));
			return;
		}

		let headerResult = { changed: false, action: 'skipped', content: content };
		if (!opts.lintOnly) {
			headerResult = ensureHeader(filepath, content, login);
			if (headerResult.action === 'added') headersAdded++;
			else if (headerResult.action === 'fixed') headersFixed++;
			else if (headerResult.action === 'ok') headersOk++;
		}

		// Whitespace auto-fix runs on top of whatever the header step would
		// produce (even in dry-run, so --no-fix can report what *would*
		// change), skipping the header block itself either way.
		let formatFixedCount = 0;
		let fixedContent = headerResult.content;
		if (!opts.headerOnly) {
			const headerLines = fixedContent.split('\n');
			const existingHeader = detectHeader(headerLines);
			const headerEnd = existingHeader ? existingHeader.end : 0;
			const fixResult = autoFixContent(fixedContent, headerEnd);
			formatFixedCount = fixResult.fixedCount;
			fixedContent = fixResult.content;
		}
		const contentAfterFix = opts.fix ? fixedContent : headerResult.content;

		const contentChanged = fixedContent !== content;
		if (contentChanged && opts.fix) {
			fs.writeFileSync(filepath, fixedContent, 'utf8');
		}
		if (formatFixedCount > 0) filesFormatFixed++;
		totalFormatFixes += formatFixedCount;

		let lintIssues = [];
		if (!opts.headerOnly) {
			const contentForLint = opts.fix ? contentAfterFix : content;
			lintIssues = lintFile(contentForLint);
		}

		const errCount = lintIssues.filter(function (i) {
			return i.level === 'error';
		}).length;
		const warnCount = lintIssues.length - errCount;
		totalErrors += errCount;
		totalWarnings += warnCount;

		const hasReport =
			headerResult.action === 'added' || headerResult.action === 'fixed' || formatFixedCount > 0 || lintIssues.length > 0;
		if (hasReport) filesWithIssues++;

		if (opts.quiet && !hasReport) return;

		console.log(c(COLOR.bold, rel));

		if (!opts.lintOnly) {
			if (headerResult.action === 'added') {
				console.log('  ' + c(COLOR.green, '+ header added') + (opts.fix ? '' : c(COLOR.gray, ' (dry run)')));
			} else if (headerResult.action === 'fixed') {
				console.log('  ' + c(COLOR.yellow, '~ header fixed') + (opts.fix ? '' : c(COLOR.gray, ' (dry run)')));
			} else if (!opts.quiet) {
				console.log('  ' + c(COLOR.gray, '= header ok'));
			}
		}

		if (!opts.headerOnly && formatFixedCount > 0) {
			console.log(
				'  ' +
					c(COLOR.yellow, '~ ' + formatFixedCount + ' formatting issue' + (formatFixedCount === 1 ? '' : 's') + ' auto-fixed') +
					(opts.fix ? '' : c(COLOR.gray, ' (dry run)'))
			);
		}

		lintIssues.forEach(function (issue) {
			const tag = issue.level === 'error' ? c(COLOR.red, 'error') : c(COLOR.yellow, 'warn ');
			console.log('  ' + tag + '  line ' + String(issue.line).padStart(4, ' ') + '  ' + issue.msg);
		});

		if (!opts.quiet || hasReport) console.log('');
	});

	console.log(c(COLOR.bold, 'Summary'));
	console.log('  files scanned   : ' + files.length);
	if (!opts.lintOnly) {
		console.log('  headers added   : ' + c(COLOR.green, String(headersAdded)));
		console.log('  headers fixed   : ' + c(COLOR.yellow, String(headersFixed)));
		console.log('  headers ok      : ' + headersOk);
	}
	if (!opts.headerOnly) {
		console.log('  files formatted : ' + c(COLOR.yellow, String(filesFormatFixed)) + (opts.fix ? '' : c(COLOR.gray, ' (dry run)')));
		console.log('  formatting fixes: ' + c(COLOR.yellow, String(totalFormatFixes)));
		console.log('  lint errors     : ' + c(COLOR.red, String(totalErrors)));
		console.log('  lint warnings   : ' + c(COLOR.yellow, String(totalWarnings)));
		console.log('  files w/ issues : ' + filesWithIssues);
	}

	if (opts.strict && (totalErrors > 0 || totalWarnings > 0)) {
		process.exit(1);
	}
	process.exit(0);
}

main();