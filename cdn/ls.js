(function() {

    let LS_FUNCTIONS = {};

    async function loadConfig() {
        try {
            const res = await fetch("./ls-config.json");
            const json = await res.json();
            LS_FUNCTIONS = json.functions || {};
        } catch {
            console.warn("[LS] Aucun fichier ls-config.json trouvé.");
        }
    }

    async function loadLSScripts() {
        await loadConfig();

        const scripts = document.querySelectorAll('script[type="ls"]');

        for (let script of scripts) {
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
        }
    }

    window.addEventListener("DOMContentLoaded", loadLSScripts);
})();


// ---------------------------
// TOKENIZER
// ---------------------------
function tokenize(code) {
    const tokens = [];
    let i = 0;

    while (i < code.length) {
        let c = code[i];

        if (/\s/.test(c)) { i++; continue; }

        if (/[a-zA-Z_]/.test(c)) {
            let start = i;
            while (/[a-zA-Z0-9_.]/.test(code[i])) i++;
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


// ---------------------------
// PARSER
// ---------------------------
function parse(tokens) {
    let i = 0;

    function peek() { return tokens[i]; }
    function next() { return tokens[i++]; }

    function parseValue() {
        let t = next();
        if (t.type === "number" || t.type === "string") return t;
        if (t.type === "ident") return t;
        throw new Error("Valeur invalide");
    }

    function parseStatement() {
        let t = peek();

        // def / var
        if (t.value === "def" || t.value === "var") {
            next();
            let name = next().value;
            next(); // =
            let value = parseValue();
            return { type: "assign", const: (t.value === "def"), name, value };
        }

        // Fonction dynamique venant de ls-config.json
        if (t.type === "ident" && LS_FUNCTIONS[t.value]) {
            let funcName = next().value; // consume name
            next(); // (
            let arg = parseValue();
            next(); // )
            return { type: "call", name: funcName, arg };
        }

        throw new Error("Instruction inconnue : " + t.value);
    }

    const program = [];

    while (peek().type !== "EOF") {
        program.push(parseStatement());
    }

    return program;
}


// ---------------------------
// EXECUTION
// ---------------------------
function execute(ast) {
    const env = {};

    function evalValue(node) {
        if (node.type === "number" || node.type === "string") return node.value;
        if (node.type === "ident") return env[node.value];
        throw new Error("Valeur inconnue");
    }

    function run(node) {
        switch (node.type) {

            case "assign":
                env[node.name] = evalValue(node.value);
                return;

            case "call":
                let js = LS_FUNCTIONS[node.name];

                // conversion string → vraie fonction JS
                const func = eval(js);

                func(evalValue(node.arg));
                return;
        }
    }

    ast.forEach(run);
}
