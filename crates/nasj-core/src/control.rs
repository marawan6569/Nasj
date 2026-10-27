//! Small ordered rewrite program, not a request interpreter. Only server-level
//! literal comparisons with a single terminal return are accepted for `if`.
use crate::{redact, syntax::Directive, Comparison, Condition};

#[derive(Debug, Clone)]
pub(crate) enum Action {
    Redirect { status: String, expression: String },
    Response { status: String },
}

pub(crate) fn action(d: &Directive) -> Option<Action> {
    if d.children.is_some() {
        return None;
    }
    match d.args.as_slice() {
        [url]
            if url.starts_with("http://")
                || url.starts_with("https://")
                || url.starts_with("$scheme") =>
        {
            Some(Action::Redirect {
                status: "302".into(),
                expression: url.clone(),
            })
        }
        [status, url] if matches!(status.as_str(), "301" | "302" | "303" | "307" | "308") => {
            Some(Action::Redirect {
                status: status.clone(),
                expression: url.clone(),
            })
        }
        [status] | [status, _]
            if status
                .parse::<u16>()
                .is_ok_and(|n| (100..=599).contains(&n)) =>
        {
            Some(Action::Response {
                status: status.clone(),
            })
        }
        _ => None,
    }
}

fn condition(d: &Directive) -> Option<Condition> {
    let mut args = d.args.clone();
    let first = args.first_mut()?;
    *first = first.strip_prefix('(')?.into();
    if first.is_empty() {
        args.remove(0);
    }
    let last = args.last_mut()?;
    *last = last.strip_suffix(')')?.into();
    if last.is_empty() {
        args.pop();
    }
    let [variable, operator, value] = args.as_slice() else {
        return None;
    };
    let name = variable.strip_prefix('$')?;
    if name.is_empty()
        || !name.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
        || name.starts_with(|c: char| c.is_ascii_digit())
        || value.contains('$')
        || redact::sensitive_key(variable)
    {
        return None;
    }
    let operator = match operator.as_str() {
        "=" => Comparison::Equal,
        "!=" => Comparison::NotEqual,
        _ => return None,
    };
    let sanitized = redact::text(value);
    Some(Condition {
        variable: variable.clone(),
        operator,
        value_redacted: sanitized != *value,
        value: sanitized,
    })
}

pub(crate) enum Step<'a> {
    If {
        directive: &'a Directive,
        condition: Condition,
        action: Action,
        action_source: &'a Directive,
    },
    Return {
        directive: &'a Directive,
        action: Action,
    },
}

pub(crate) fn program(children: &[Directive]) -> Option<Vec<Step<'_>>> {
    // These can alter/error-redirect a response independently of rewrite order.
    if children.iter().any(|d| {
        d.name == "error_page" || d.name.ends_with("_by_lua_file") || d.name.starts_with("js_")
    }) {
        return None;
    }
    let mut steps = Vec::new();
    for d in children {
        match d.name.as_str() {
            "return" => {
                steps.push(Step::Return {
                    directive: d,
                    action: action(d)?,
                });
                break;
            }
            "if" => {
                let condition = condition(d)?;
                let [body] = d.children.as_deref()? else {
                    return None;
                };
                if body.name != "return" {
                    return None;
                }
                steps.push(Step::If {
                    directive: d,
                    condition,
                    action: action(body)?,
                    action_source: body,
                });
            }
            "set" | "rewrite" | "break" | "try_files" | "mirror" | "limit_except" => return None,
            _ if d.children.is_some() && d.name != "location" => return None,
            _ => {}
        }
    }
    Some(steps)
}
