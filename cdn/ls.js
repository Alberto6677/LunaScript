// =======================
// LS — VERSION 0.1.0 
// =======================

(function () {

    function loadLSScripts() {
        const scripts = document.querySelectorAll('script[type="ls"]');

        scripts.forEach(async script => {
            let code = script.src
                ? await fetch(script.src).then(r => r.text())
                : script.innerText;

            try {
                const tokens = tokenize(code);
                const ast = parse(tokens);
                execute(ast);
            } catch (err) {
                console.error("[LS ERROR]", err && err.message ? err.message : err);
            }
        });
    }

    window.addEventListener("DOMContentLoaded", loadLSScripts);
})();

// ----------------- TOKENIZER -----------------
function tokenize(code) {
    const tokens = [];
    let i = 0;

    while (i < code.length) {
        let c = code[i];

        if (/\s/.test(c)) { i++; continue; }

        if (/[a-zA-Z_]/.test(c)) {
            let start = i;
            while (/[a-zA-Z0-9_]/.test(code[i])) i++;
            tokens.push({ type: "ident", value: code.slice(start, i) });
            continue;
        }

        if (/[0-9]/.test(c)) {
            let start = i;
            while (/[0-9]/.test(code[i])) i++;
            tokens.push({ type: "number", value: Number(code.slice(start, i)) });
            continue;
        }

        if (c === '"' || c === "'") {
            let quote = c;
            let start = ++i;
            while (i < code.length && code[i] !== quote) i++;
            tokens.push({ type: "string", value: code.slice(start, i) });
            i++;
            continue;
        }

        tokens.push({ type: "symbol", value: c });
        i++;
    }

    tokens.push({ type: "EOF" });
    return tokens;
}

// ----------------- DOM HELPERS -----------------
const doc = {
    id: (id) => wrapElement(document.getElementById(id)),
    type: (type) => {
        const els = Array.from(document.getElementsByTagName(type));
        return els.map(wrapElement);
    }
};

function wrapElement(el) {
    if (!el) return null;
    return {
        _el: el,
        get texte() { return el.textContent; },
        set texte(val) { if (el) el.textContent = val; },
        get html() { return el.innerHTML; },
        set html(val) { if (el) el.innerHTML = val; },
        suppr: () => { if (el && el.parentNode) el.parentNode.removeChild(el); }
    };
}

function showPopup(text) {
    try {
        // modal container
        const id = "__ls_popup_modal__";
        let modal = document.getElementById(id);
        if (!modal) {
            modal = document.createElement("div");
            modal.id = id;
            modal.style.position = "fixed";
            modal.style.left = "0";
            modal.style.top = "0";
            modal.style.width = "100%";
            modal.style.height = "100%";
            modal.style.display = "flex";
            modal.style.alignItems = "center";
            modal.style.justifyContent = "center";
            modal.style.zIndex = "999999";
            modal.style.background = "rgba(0,0,0,0.35)";

            const box = document.createElement("div");
            box.style.background = "white";
            box.style.padding = "20px";
            box.style.borderRadius = "8px";
            box.style.maxWidth = "90%";
            box.style.boxShadow = "0 6px 30px rgba(0,0,0,0.3)";
            box.style.fontFamily = "system-ui, sans-serif";
            box.style.fontSize = "16px";
            box.style.color = "#111";
            box.id = id + "_box";

            const txt = document.createElement("div");
            txt.id = id + "_txt";
            txt.style.marginBottom = "12px";

            const btn = document.createElement("button");
            btn.textContent = "OK";
            btn.style.padding = "8px 12px";
            btn.style.border = "none";
            btn.style.borderRadius = "6px";
            btn.style.cursor = "pointer";

            btn.addEventListener("click", () => {
                if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
            });

            box.appendChild(txt);
            box.appendChild(btn);
            modal.appendChild(box);
            document.body.appendChild(modal);
        }
        const txtEl = document.getElementById(id + "_txt");
        if (txtEl) txtEl.innerText = String(text);
    } catch (e) {
        console.log("[LS POPUP]", text);
    }
}

// ----------------- PARSER -----------------
function parse(tokens) {
    let i = 0;

    function peek() { return tokens[i]; }
    function next() { return tokens[i++]; }

    function parseValue() {
        const t = peek();

        // doc.id("...") ou doc.type("...")
        if (t && t.type === "ident" && t.value === "doc") {
            next(); // consume 'doc'
            const dot = next(); // should be '.'
            if (!dot || dot.value !== ".") throw new Error("Syntaxe attendue: doc.<méthode>");
            const methodTok = next();
            if (!methodTok || methodTok.type !== "ident") throw new Error("Méthode doc invalide");
            const method = methodTok.value;
            const parOpen = next();
            if (!parOpen || parOpen.value !== "(") throw new Error("Attendu '(' après doc." + method);
            const argNode = parseValue();
            const parClose = next();
            if (!parClose || parClose.value !== ")") throw new Error("Attendu ')'");
            if (argNode.type !== "value") throw new Error("Argument doc doit être littéral (chaine/num)");
            return { type: "value", value: doc[method](argNode.value) };
        }

        const tok = next();
        if (tok.type === "number" || tok.type === "string") return { type: "value", value: tok.value };
        if (tok.type === "ident") return { type: "var", name: tok.value };
        throw new Error("Valeur invalide (" + JSON.stringify(tok) + ")");
    }

    function parseStatement() {
        const t = peek();
        if (!t) throw new Error("Fin inattendue");

        // def / var
        if (t.type === "ident" && (t.value === "def" || t.value === "var")) {
            next(); // def/var
            const nameTok = next();
            if (!nameTok || nameTok.type !== "ident") throw new Error("Nom invalide pour variable");
            const name = nameTok.value;
            const eq = next();
            if (!eq || eq.value !== "=") throw new Error("Attendu =");
            const value = parseValue();
            return { type: "assign", const: (t.value === "def"), name, value };
        }

        // msg(...)
        if (t.type === "ident" && t.value === "msg") {
            next(); next(); // msg (
            const val = parseValue();
            const close = next(); if (!close || close.value !== ")") throw new Error("Attendu ')'");
            return { type: "msg", value: val };
        }

        // popup(...)
        if (t.type === "ident" && t.value === "popup") {
            next(); next();
            const val = parseValue();
            const close = next(); if (!close || close.value !== ")") throw new Error("Attendu ')'");
            return { type: "popup", value: val };
        }

        // si(cond){...}
        if (t.type === "ident" && t.value === "si") {
            next(); next(); // si (
            const cond = parseValue();
            const parClose = next(); if (!parClose || parClose.value !== ")") throw new Error("Attendu ')'");
            const braceOpen = next(); if (!braceOpen || braceOpen.value !== "{") throw new Error("Attendu '{'");
            const body = parseBlock();
            return { type: "if", cond, body };
        }

        // repeter N { ... }
        if (t.type === "ident" && t.value === "repeter") {
            next();
            const count = parseValue();
            const braceOpen = next(); if (!braceOpen || braceOpen.value !== "{") throw new Error("Attendu '{'");
            const body = parseBlock();
            return { type: "repeat", count, body };
        }

        // member access: variable.member = value  OR variable.member(args)
        if (t.type === "ident" && tokens[i + 1] && tokens[i + 1].value === ".") {
            const objTok = next(); // variable name
            const objName = objTok.value;
            next(); // consume '.'
            const memberTok = next(); if (!memberTok || memberTok.type !== "ident") throw new Error("Member attendu");
            const member = memberTok.value;

            // assignment: obj.member = value
            if (peek() && peek().value === "=") {
                next(); // =
                const val = parseValue();
                return { type: "memberAssign", obj: objName, member, value: val };
            }

            // call: obj.member(arg1, arg2)
            if (peek() && peek().value === "(") {
                next(); // (
                const args = [];
                while (peek() && peek().value !== ")") {
                    args.push(parseValue());
                    if (peek() && peek().value === ",") next(); // consume comma
                }
                const close = next(); if (!close || close.value !== ")") throw new Error("Attendu ')'");
                return { type: "memberCall", obj: objName, member, args };
            }

            throw new Error("Syntaxe invalide pour member access");
        }

        throw new Error("Instruction inconnue : " + (t.value || JSON.stringify(t)));
    }

    function parseBlock() {
        const statements = [];
        while (peek() && peek().value !== "}") {
            statements.push(parseStatement());
        }
        const closer = next(); // consume "}"
        if (!closer || closer.value !== "}") throw new Error("Attendu '}'");
        return statements;
    }

    const program = [];
    while (peek() && peek().type !== "EOF") {
        program.push(parseStatement());
    }
    return program;
}

// ----------------- EXECUTION -----------------
function execute(ast) {
    const env = {};

    function evalValue(node) {
        if (!node) throw new Error("No node in evalValue");
        if (node.type === "value") return node.value;
        if (node.type === "var") return env[node.name];
        throw new Error("Valeur inconnue: " + JSON.stringify(node));
    }

    function setProp(target, prop, value) {
        if (Array.isArray(target)) {
            target.forEach(t => { if (t) t[prop] = value; });
            return;
        }
        if (target) target[prop] = value;
    }

    function callMethod(target, method, args) {
        if (Array.isArray(target)) {
            target.forEach(t => {
                if (t && typeof t[method] === "function") t[method](...args);
            });
            return;
        }
        if (target && typeof target[method] === "function") target[method](...args);
    }

    for (const node of ast) {
        (function run(n) {
            switch (n.type) {
                case "assign": {
                    if (n.const && env[n.name] !== undefined) throw new Error("Constante déjà définie : " + n.name);
                    env[n.name] = evalValue(n.value);
                    return;
                }
                case "msg": {
                    console.log(evalValue(n.value));
                    return;
                }
                case "popup": {
                    const txt = evalValue(n.value);
                    showPopup(txt);
                    return;
                }
                case "if": {
                    if (evalValue(n.cond)) n.body.forEach(run);
                    return;
                }
                case "repeat": {
                    const times = evalValue(n.count) || 0;
                    for (let r = 0; r < times; r++) n.body.forEach(run);
                    return;
                }
                case "memberAssign": {
                    const target = env[n.obj];
                    if (target === undefined) throw new Error("Objet inexistant : " + n.obj);
                    const val = evalValue(n.value);
                    setProp(target, n.member, val);
                    return;
                }
                case "memberCall": {
                    const target = env[n.obj];
                    if (target === undefined) throw new Error("Objet inexistant : " + n.obj);
                    const args = (n.args || []).map(evalValue);
                    callMethod(target, n.member, args);
                    return;
                }
                default:
                    throw new Error("Type de noeud inconnu: " + n.type);
            }
        })(node);
    }
}
