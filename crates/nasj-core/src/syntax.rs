//! Bounded generic Nginx syntax parser. AST arguments are unredacted input;
//! only allowlisted, sanitized semantic values belong in exported topology.
use crate::SourceLocation;
use std::{error::Error, fmt};

pub const MAX_FILE_BYTES: usize = 4 * 1024 * 1024;
pub const MAX_NESTING: usize = 64;
const MAX_TOKENS: usize = 200_000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Directive {
    pub name: String,
    pub args: Vec<String>,
    pub children: Option<Vec<Directive>>,
    pub source: SourceLocation,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParseError {
    pub code: &'static str,
    /// Fixed diagnostic text: never includes configuration tokens or secrets.
    pub message: &'static str,
    pub source: SourceLocation,
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}:{}: {}: {}",
            self.source.path.escape_debug(),
            self.source.line,
            self.code,
            self.message
        )
    }
}
impl Error for ParseError {}

#[derive(Debug, PartialEq, Eq)]
enum Kind {
    Word(String),
    Open,
    Close,
    Semi,
}

#[derive(Debug)]
struct Token {
    kind: Kind,
    line: usize,
}

struct Lexer<'a> {
    text: &'a str,
    path: &'a str,
    offset: usize,
    line: usize,
}

impl Lexer<'_> {
    fn peek(&self) -> Option<char> {
        self.text[self.offset..].chars().next()
    }

    fn next(&mut self) -> Option<char> {
        let ch = self.peek()?;
        self.offset += ch.len_utf8();
        if ch == '\n' {
            self.line += 1;
        }
        Some(ch)
    }

    fn error(&self, code: &'static str, message: &'static str) -> ParseError {
        ParseError {
            code,
            message,
            source: SourceLocation {
                path: self.path.into(),
                line: self.line,
            },
        }
    }

    fn escape(&mut self, word: &mut String) -> Result<(), ParseError> {
        match self.next() {
            Some('n') => word.push('\n'),
            Some('r') => word.push('\r'),
            Some('t') => word.push('\t'),
            Some(ch @ ('\\' | '"' | '\'')) => word.push(ch),
            Some(ch) => {
                word.push('\\');
                word.push(ch);
            }
            None => return Err(self.error("syntax.escape", "trailing escape")),
        }
        Ok(())
    }

    fn word(&mut self) -> Result<String, ParseError> {
        let mut word = String::new();
        let quote = self.peek().filter(|ch| matches!(ch, '"' | '\''));
        if quote.is_some() {
            self.next();
        }
        let mut variable = false;
        loop {
            let Some(ch) = self.peek() else {
                return if quote.is_some() {
                    Err(self.error("syntax.quote", "unterminated quoted string"))
                } else {
                    Ok(word)
                };
            };
            if quote == Some(ch) {
                self.next();
                if self
                    .peek()
                    .is_some_and(|ch| !space(ch) && !matches!(ch, ';' | '{' | ')'))
                {
                    return Err(
                        self.error("syntax.delimiter", "expected delimiter after closing quote")
                    );
                }
                return Ok(word);
            }
            if quote.is_none() && (space(ch) || ch == ';' || (ch == '{' && !variable)) {
                return Ok(word);
            }
            self.next();
            if ch == '\\' {
                self.escape(&mut word)?;
                variable = false;
            } else {
                word.push(ch);
                variable = ch == '$';
            }
        }
    }

    fn tokens(&mut self) -> Result<Vec<Token>, ParseError> {
        let mut tokens = Vec::new();
        while let Some(ch) = self.peek() {
            if space(ch) {
                self.next();
                continue;
            }
            if ch == '#' {
                while self.next().is_some_and(|ch| ch != '\n') {}
                continue;
            }
            let line = self.line;
            let kind = match ch {
                '{' => {
                    self.next();
                    Kind::Open
                }
                '}' => {
                    self.next();
                    Kind::Close
                }
                ';' => {
                    self.next();
                    Kind::Semi
                }
                _ => Kind::Word(self.word()?),
            };
            tokens.push(Token { kind, line });
            if tokens.len() > MAX_TOKENS {
                return Err(self.error("limit.tokens", "too many syntax tokens"));
            }
        }
        Ok(tokens)
    }
}

fn space(ch: char) -> bool {
    matches!(ch, ' ' | '\t' | '\r' | '\n')
}

struct Parser<'a> {
    tokens: std::vec::IntoIter<Token>,
    path: &'a str,
    line: usize,
}

impl Parser<'_> {
    fn error(&self, code: &'static str, message: &'static str) -> ParseError {
        ParseError {
            code,
            message,
            source: SourceLocation {
                path: self.path.into(),
                line: self.line,
            },
        }
    }

    fn block(&mut self, depth: usize) -> Result<Vec<Directive>, ParseError> {
        if depth > MAX_NESTING {
            return Err(self.error("limit.nesting", "configuration nesting limit exceeded"));
        }
        let mut directives = Vec::new();
        while let Some(token) = self.tokens.next() {
            self.line = token.line;
            let name = match token.kind {
                Kind::Word(name) => name,
                Kind::Close if depth > 0 => return Ok(directives),
                _ => return Err(self.error("syntax.directive", "expected directive name")),
            };
            let source = SourceLocation {
                path: self.path.into(),
                line: token.line,
            };
            let mut args = Vec::new();
            let children = loop {
                let Some(token) = self.tokens.next() else {
                    return Err(self.error("syntax.terminator", "expected semicolon or block"));
                };
                self.line = token.line;
                match token.kind {
                    Kind::Word(value) => args.push(value),
                    Kind::Semi => break None,
                    Kind::Open => break Some(self.block(depth + 1)?),
                    Kind::Close => {
                        return Err(self.error(
                            "syntax.terminator",
                            "expected semicolon before closing block",
                        ))
                    }
                }
            };
            // Embedded languages need their own tokenizer; reject rather than
            // interpreting code as Nginx routes.
            if name.ends_with("_by_lua_block") || name == "js_content" && children.is_some() {
                return Err(self.error(
                    "syntax.embedded",
                    "embedded language blocks are unsupported",
                ));
            }
            directives.push(Directive {
                name,
                args,
                children,
                source,
            });
        }
        if depth != 0 {
            return Err(self.error("syntax.block", "unclosed block"));
        }
        Ok(directives)
    }
}

/// Parse syntax without IO or directive-specific semantic validation. Fails on
/// the first error; no partial AST is passed to the semantic analyzer.
pub fn parse(text: &str, path: &str) -> Result<Vec<Directive>, ParseError> {
    let mut lexer = Lexer {
        text,
        path,
        offset: 0,
        line: 1,
    };
    if text.len() > MAX_FILE_BYTES {
        return Err(lexer.error("limit.bytes", "configuration file size limit exceeded"));
    }
    if text.chars().any(|ch| ch.is_control() && !space(ch)) {
        return Err(lexer.error("syntax.control", "unsupported control character"));
    }
    let tokens = lexer.tokens()?;
    Parser {
        tokens: tokens.into_iter(),
        path,
        line: 1,
    }
    .block(0)
}
