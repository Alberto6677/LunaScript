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
// EXECUTION
// =======================

function execute(ast) {
    const env = {};

    function evalValue(node) {
        if (node.type === "value") return node.value;
        if (node.type === "var") return env[node.name];
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

            case "if":
                if (evalValue(node.cond))
                    node.body.forEach(run);
                return;

            case "repeat":
                let n = evalValue(node.count);
                for (let k = 0; k < n; k++)
                    node.body.forEach(run);
                return;
        }
    }

    ast.forEach(run);
}
