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
                console.error("[LS ERROR]", err.message);
            }
        });
    }

    window.addEventListener("DOMContentLoaded", loadLSScripts);
})();

// =======================
// TOKENIZER
// =======================

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

// =======================
// PARSER
// =======================

function parse(tokens) {
    let i = 0;

    function peek() { return tokens[i]; }
    function next() { return tokens[i++]; }

    function parseValue() {
        let t = next();

        // DOM access
        if (t.type === "ident" && t.value === "doc") {
            next(); // doc
            next(); // .
            let method = next().value; // id ou type
            next(); // (
            let arg = parseValue();
            next(); // )
            return { type: "value", value: doc[method](arg.value) };
        }
        
        if (t.type === "number" || t.type === "string")
            return { type: "value", value: t.value };

        if (t.type === "ident")
            return { type: "var", name: t.value };

        throw new Error("Valeur invalide");
    }

    function parseStatement() {
        let t = peek();

        // ----- assignation -----
        if (t.value === "def" || t.value === "var") {
            next(); // def/var
            let name = next().value;
            next(); // =
            let value = parseValue();
            return { type: "assign", const: (t.value === "def"), name, value };
        }

        // ----- msg("hello") -----
        if (t.value === "msg") {
            next(); // msg
            next(); // (
            let val = parseValue();
            next(); // )
            return { type: "msg", value: val };
        }

        // ----- popup("hello") -----
        if (t.value === "popup") {
            next(); // popup
            next(); // (
            let val = parseValue();
            next(); // )
            return { type: "popup", value: val };
        }

        // ----- si(cond){...} -----
        if (t.value === "si") {
            next(); // si
            next(); // (
            let cond = parseValue();
            next(); // )
            next(); // {
            let body = parseBlock();
            return { type: "if", cond, body };
        }

        // ----- repeter N {...} -----
        if (t.value === "repeter") {
            next();
            let count = parseValue();
            next(); // {
            let body = parseBlock();
            return { type: "repeat", count, body };
        }

        // ----- assignation sur propriété ou appel de méthode -----
        if (t.type === "ident" && tokens[i]?.value === ".") {
            let objName = next().value; // variable
            next(); // .
            let member = next().value; // propriété ou méthode
            
            if (peek().value === "=") { // assignation
                next(); // =
                let val = parseValue();
                return { type: "memberAssign", obj: objName, member, value: val };
            }
            
            if (peek().value === "(") { // appel méthode
                next(); // (
                const args = []
                    while (peek().value !== ")") {
                        args.push(parseValue());
                        if (peek().value === ",") next()
                    }
                next(); // )
                return { type: "memberCall", obj: objName, member, args };
            }
            throw new Error("Syntaxe invalide pour le member access");
        }

        throw new Error("Instruction inconnue : " + t.value);
    }

    function parseBlock() {
        const statements = [];
        while (peek().value !== "}") {
            statements.push(parseStatement());
        }
        next(); // }
        return statements;
    }

    const program = [];
    while (peek().type !== "EOF") {
        program.push(parseStatement());
    }

    return program;
}

// =======================
// DOM UTILS
// =======================

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
        set texte(val) { el.textContent = val; },
        get html() { return el.innerHTML; },
        set html(val) { el.innerHTML = val; },
        suppr: () => el.remove()
    };
}

// =======================
// EXECUTION
// =======================

function execute(ast) {
    const env = {};

    function evalValue(node) {
        if (node.type === "value") return node.value;
        if (node.type === "var") return env[node.name];
        if (node.type === "dom") return node.ref;
        throw new Error("Valeur inconnue");
    }

    function run(node) {
        switch (node.type) {

            case "assign":
                if (node.const && env[node.name] !== undefined)
                    throw new Error("Constante déjà définie : " + node.name);
                env[node.name] = evalValue(node.value);
                return;

            case "msg":
                console.log(evalValue(node.value));
                return;

            case "popup":
                alert(evalValue(node.value));
                return;

            case "if":
                if (evalValue(node.cond))
                    node.body.forEach(run);
                return;

            case "repeat":
                let n = evalValue(node.count);
                for (let k = 0; k < n; k++)
                    node.body.forEach(run);
                return;

            case "memberAssign":
                const target = env[node.obj];
                if (!target) throw new Error("Objet inexistant : " + node.obj);
                target[node.member] = evalValue(node.value);
                return;
            
            case "memberCall":
                const obj = env[node.obj];
                if (!obj) throw new Error("Objet inexistant : " + node.obj);
                const args = node.args.map(evalValue);
                
                if (obj && typeof obj[node.member] === "function") {
                    obj[node.member](...args);
                } else if (obj && obj._el && typeof obj[node.member] === "function") {
                    // pour les méthodes sur l'objet wrapElement
                    obj[node.member](...args);
                } else {
                    throw new Error("Méthode inexistante : " + node.member);
                }
    return;
        }
    }

    ast.forEach(run);
}
