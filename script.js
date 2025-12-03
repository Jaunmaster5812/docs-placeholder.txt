// ======================================
// VALIDACIONES
// ======================================
function validarInput(input){
    input.value = input.value.toUpperCase().replace(/[^ABCD+\-*\(\)¬ ]/g,"");
}

function validarExpresion(exp) {
    // Validar paréntesis balanceados
    let open = (exp.match(/\(/g) || []).length;
    let close = (exp.match(/\)/g) || []).length;
    if (open !== close) return false;
    
    // Validar que no haya operadores consecutivos inválidos
    if (/[\+\*]{2,}/.test(exp)) return false;
    if (/^[\+\*]|[\+\*]$/.test(exp)) return false;
    
    // Validar que haya al menos una variable
    if (!/[ABCD]/.test(exp)) return false;
    
    return true;
}

function limpiarFormulario(...divIds) {
    divIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = "";
    });
    const input = document.getElementById("expresion");
    if (input) input.value = "";
    const errorMsg = document.getElementById("errorMsg");
    if (errorMsg) errorMsg.innerHTML = "";
}

// ======================================
// INSERTAR NEGACIÓN
// ======================================
function insertarNegacion(inputId){
    const input = document.getElementById(inputId);
    const pos = input.selectionStart;
    const text = input.value;
    input.value = text.slice(0,pos) + "¬" + text.slice(pos);
    input.focus();
    input.selectionStart = input.selectionEnd = pos + 1;
}

// ======================================
// EXPRESIONES BOOLEANAS
// ======================================
function insertarProducto(exp){
    // Insertar * entre: variable y variable, variable y (, ) y variable, ) y (
    // Soporta: A-D, variables negadas (A¯), paréntesis, y negación ¬
    let resultado = "";
    for(let i = 0; i < exp.length; i++){
        resultado += exp[i];
        // Verificar si necesitamos insertar un *
        if(i < exp.length - 1){
            let actual = exp[i];
            let siguiente = exp[i+1];
            
            // Definir qué caracteres pueden preceder a un *
            let esTerminal = /[A-D\)]/.test(actual) || (actual === '¯' && i > 0 && /[A-D]/.test(exp[i-1]));
            // Definir qué caracteres pueden seguir a un *
            let esInicio = /[A-D(¬]/.test(siguiente);
            
            if(esTerminal && esInicio){
                resultado += "*";
            }
        }
    }
    return resultado;
}

function balancearParentesis(exp){
    let open = (exp.match(/\(/g)||[]).length;
    let close = (exp.match(/\)/g)||[]).length;
    return exp + ")".repeat(open-close);
}

function detectarVars(exp){
    const vars=[];
    if(exp.includes("A")) vars.push("A");
    if(exp.includes("B")) vars.push("B");
    if(exp.includes("C")) vars.push("C");
    if(exp.includes("D")) vars.push("D");
    return vars;
}

function prepararJS(exp, varsContext){
    let s = balancearParentesis(exp);
    
    // Insertar productos implícitos ANTES de sustituir variables
    s = insertarProducto(s);
    
    // Sustituir variables por sus valores (como números 0 o 1)
    for(let v in varsContext) {
        s = s.replace(new RegExp("\\b" + v + "\\b", "g"), "(" + varsContext[v] + ")");
    }
    
    // Convertir operadores booleanos a JavaScript
    // Primero reemplazar ¬ con ! pero de forma que funcione con paréntesis
    // ¬(expresión) debe convertirse en !(expresión)
    s = s.replace(/¬/g, "!");
    
    // Reemplazar operadores lógicos
    s = s.replace(/\*/g, "&&").replace(/\+/g, "||");
    
    return s;
}
// FUNCIONES PARA PASOS EDUCATIVOS
function aplicarLeyes(exp){
    let pasos = [];
    let original = exp;

    // Ley de idempotencia: AA -> A
    let nuevo = exp.replace(/(A|B|C|D)\1/g, '$1');
    if(nuevo !== exp){
        pasos.push(`Idempotencia: ${exp} → ${nuevo}`);
        exp = nuevo;
    }

    // Ley de Dominación: A+1 -> 1 ; A*0 -> 0
    nuevo = exp.replace(/([ABCD])\+1/g,'1').replace(/1\+([ABCD])/g,'1');
    if(nuevo !== exp){ pasos.push(`Dominación (+): ${exp} → ${nuevo}`); exp=nuevo; }
    nuevo = exp.replace(/([ABCD])\*0/g,'0').replace(/0\*([ABCD])/g,'0');
    if(nuevo !== exp){ pasos.push(`Dominación (*): ${exp} → ${nuevo}`); exp=nuevo; }

    // Ley de complemento: A+¬A ->1 ; A*¬A ->0
    nuevo = exp.replace(/A\+¬A/g,'1').replace(/¬A\+A/g,'1');
    nuevo = nuevo.replace(/B\+¬B/g,'1').replace(/¬B\+B/g,'1');
    nuevo = nuevo.replace(/C\+¬C/g,'1').replace(/¬C\+C/g,'1');
    nuevo = nuevo.replace(/D\+¬D/g,'1').replace(/¬D\+D/g,'1');
    if(nuevo !== exp){ pasos.push(`Complemento (+): ${exp} → ${nuevo}`); exp=nuevo; }
    nuevo = exp.replace(/A\*¬A/g,'0').replace(/¬A\*A/g,'0');
    nuevo = nuevo.replace(/B\*¬B/g,'0').replace(/¬B\*B/g,'0');
    nuevo = nuevo.replace(/C\*¬C/g,'0').replace(/¬C\*C/g,'0');
    nuevo = nuevo.replace(/D\*¬D/g,'0').replace(/¬D\*D/g,'0');
    if(nuevo !== exp){ pasos.push(`Complemento (*): ${exp} → ${nuevo}`); exp=nuevo; }

    // Ley de absorción: A + AB -> A ; A*(A+B) -> A
    nuevo = exp.replace(/([ABCD])\+\1\*[ABCD]/g,'$1');
    if(nuevo !== exp){ pasos.push(`Absorción (+): ${exp} → ${nuevo}`); exp=nuevo; }
    nuevo = exp.replace(/([ABCD])\*\(\1\+([ABCD])\)/g,'$1');
    if(nuevo !== exp){ pasos.push(`Absorción (*): ${exp} → ${nuevo}`); exp=nuevo; }

    // Ley de DeMorgan: ¬(A*B) -> ¬A + ¬B ; ¬(A+B) -> ¬A * ¬B
    nuevo = exp.replace(/¬\((A|B|C|D)\*(A|B|C|D)\)/g,'¬$1+¬$2');
    if(nuevo !== exp){ pasos.push(`DeMorgan: ${exp} → ${nuevo}`); exp=nuevo; }
    nuevo = exp.replace(/¬\((A|B|C|D)\+(A|B|C|D)\)/g,'¬$1*¬$2');
    if(nuevo !== exp){ pasos.push(`DeMorgan: ${exp} → ${nuevo}`); exp=nuevo; }

    if(pasos.length===0) pasos.push(`No se aplicaron leyes adicionales a ${original}`);

    return pasos;
}

// FUNCIÓN MEJORADA: Aplicar leyes con detalles línea a línea
function aplicarLeyesDetallado(exp){
    let pasos = [];
    let original = exp;
    let actual = exp;

    // Paso 1: Ley de idempotencia: AA -> A
    let nuevo = actual.replace(/(A|B|C|D)\1/g, '$1');
    if(nuevo !== actual){
        pasos.push({
            ley: "Idempotencia",
            paso: `${actual} → ${nuevo} (Variable repetida se reduce a una)`
        });
        actual = nuevo;
    }

    // Paso 2: Ley de Dominación: A+1 -> 1 ; A*0 -> 0
    nuevo = actual.replace(/([ABCD])\+1/g,'1').replace(/1\+([ABCD])/g,'1');
    if(nuevo !== actual){ 
        pasos.push({
            ley: "Dominación (OR)",
            paso: `${actual} → ${nuevo} (A + 1 siempre es 1)`
        });
        actual = nuevo; 
    }
    
    nuevo = actual.replace(/([ABCD])\*0/g,'0').replace(/0\*([ABCD])/g,'0');
    if(nuevo !== actual){ 
        pasos.push({
            ley: "Dominación (AND)",
            paso: `${actual} → ${nuevo} (A * 0 siempre es 0)`
        });
        actual = nuevo; 
    }

    // Paso 3: Ley de Identidad: A + 0 -> A ; A*1 -> A
    nuevo = actual.replace(/([ABCD])\+0/g,'$1').replace(/0\+([ABCD])/g,'$1');
    if(nuevo !== actual){
        pasos.push({
            ley: "Identidad (OR)",
            paso: `${actual} → ${nuevo} (A + 0 = A)`
        });
        actual = nuevo;
    }
    
    nuevo = actual.replace(/([ABCD])\*1/g,'$1').replace(/1\*([ABCD])/g,'$1');
    if(nuevo !== actual){
        pasos.push({
            ley: "Identidad (AND)",
            paso: `${actual} → ${nuevo} (A * 1 = A)`
        });
        actual = nuevo;
    }

    // Paso 4: Ley de complemento: A+¬A ->1 ; A*¬A ->0
    nuevo = actual.replace(/A\+¬A/g,'1').replace(/¬A\+A/g,'1');
    nuevo = nuevo.replace(/B\+¬B/g,'1').replace(/¬B\+B/g,'1');
    nuevo = nuevo.replace(/C\+¬C/g,'1').replace(/¬C\+C/g,'1');
    nuevo = nuevo.replace(/D\+¬D/g,'1').replace(/¬D\+D/g,'1');
    if(nuevo !== actual){ 
        pasos.push({
            ley: "Complemento (OR)",
            paso: `${actual} → ${nuevo} (A + ¬A = 1)`
        });
        actual = nuevo; 
    }
    
    nuevo = actual.replace(/A\*¬A/g,'0').replace(/¬A\*A/g,'0');
    nuevo = nuevo.replace(/B\*¬B/g,'0').replace(/¬B\*B/g,'0');
    nuevo = nuevo.replace(/C\*¬C/g,'0').replace(/¬C\*C/g,'0');
    nuevo = nuevo.replace(/D\*¬D/g,'0').replace(/¬D\*D/g,'0');
    if(nuevo !== actual){ 
        pasos.push({
            ley: "Complemento (AND)",
            paso: `${actual} → ${nuevo} (A * ¬A = 0)`
        });
        actual = nuevo; 
    }

    // Paso 5: Ley de absorción: A + AB -> A ; A*(A+B) -> A
    nuevo = actual.replace(/([ABCD])\+\1\*[ABCD]/g,'$1');
    if(nuevo !== actual){ 
        pasos.push({
            ley: "Absorción (OR)",
            paso: `${actual} → ${nuevo} (A + AB = A)`
        });
        actual = nuevo; 
    }
    
    nuevo = actual.replace(/([ABCD])\*\(\1\+([ABCD])\)/g,'$1');
    if(nuevo !== actual){ 
        pasos.push({
            ley: "Absorción (AND)",
            paso: `${actual} → ${nuevo} (A * (A + B) = A)`
        });
        actual = nuevo; 
    }

    // Paso 6: Ley de DeMorgan
    nuevo = actual.replace(/¬\((A|B|C|D)\*(A|B|C|D)\)/g,'¬$1+¬$2');
    if(nuevo !== actual){ 
        pasos.push({
            ley: "DeMorgan (AND→OR)",
            paso: `${actual} → ${nuevo} (¬(A*B) = ¬A + ¬B)`
        });
        actual = nuevo; 
    }
    
    nuevo = actual.replace(/¬\((A|B|C|D)\+(A|B|C|D)\)/g,'¬$1*¬$2');
    if(nuevo !== actual){ 
        pasos.push({
            ley: "DeMorgan (OR→AND)",
            paso: `${actual} → ${nuevo} (¬(A+B) = ¬A * ¬B)`
        });
        actual = nuevo; 
    }

    // Paso 7: Doble negación: ¬¬A -> A
    nuevo = actual.replace(/¬¬([ABCD])/g,'$1');
    if(nuevo !== actual){
        pasos.push({
            ley: "Doble Negación",
            paso: `${actual} → ${nuevo} (¬¬A = A)`
        });
        actual = nuevo;
    }

    if(pasos.length === 0) {
        pasos.push({
            ley: "Sin cambios",
            paso: `No se aplicaron leyes adicionales a: ${original}`
        });
    }

    return pasos;
}

// ======================================
// TABLA DE VERDAD
// ======================================
function combinaciones(n){
    const out=[];
    for(let i=0;i<(1<<n);i++){
        const bits=[];
        for(let j=n-1;j>=0;j--) bits.push( (i & (1<<j))?1:0 );
        out.push(bits);
    }
    return out;
}

function evaluarExpresion(exp, vars){
    const combos = combinaciones(vars.length);
    const resultados = [];
    combos.forEach(bits=>{
        const ctx={};
        vars.forEach((v,i)=>ctx[v]=bits[i]);
        let s = prepararJS(exp, ctx);
        let f;
        try{ 
            f = eval(s)?1:0; 
        }catch(e){ 
            console.error("Error evaluando expresión:", exp);
            console.error("Expresión preparada (JS):", s);
            console.error("Contexto:", ctx);
            console.error("Error:", e.message);
            f=0; 
        }
        resultados.push(f);
    });
    return resultados;
}

// Función para generar HTML de tabla de verdad
function generarTablaVerdad(exp, vars) {
    const combos = combinaciones(vars.length);
    const resultados = evaluarExpresion(exp, vars);
    let html = "<table><tr>";
    vars.forEach(v => html += `<th>${v}</th>`);
    html += "<th>F</th></tr>";
    
    combos.forEach((bits, i) => {
        html += "<tr>";
        bits.forEach(b => html += `<td>${b}</td>`);
        html += `<td style="background-color: ${resultados[i] === 1 ? '#c8e6c9' : '#ffcdd2'}; font-weight: bold;">${resultados[i]}</td>`;
        html += "</tr>";
    });
    html += "</table>";
    return html;
}

// ======================================
// MINTERMS Y MAXTERMS
// ======================================
function bitsToLiteral(bits, vars){
    let s="";
    for(let i=0;i<bits.length;i++) s += bits[i]===1? vars[i]: vars[i]+"\u0305";
    return s;
}

function bitsToMaxterm(bits, vars){
    let parts=[];
    for(let i=0;i<bits.length;i++) parts.push(bits[i]===0? vars[i]: vars[i]+"\u0305");
    return "("+parts.join("+")+")";
}

// Obtener lista de minterms sin suma
function obtenerMintermsList(resultados, vars) {
    const combos = combinaciones(vars.length);
    const minterms = [];
    resultados.forEach((f, i) => {
        if (f === 1) minterms.push(bitsToLiteral(combos[i], vars));
    });
    return minterms;
}

// Obtener lista de maxterms sin producto
function obtenerMaxtermsList(resultados, vars) {
    const combos = combinaciones(vars.length);
    const maxterms = [];
    resultados.forEach((f, i) => {
        if (f === 0) maxterms.push(bitsToMaxterm(combos[i], vars));
    });
    return maxterms;
}

function obtenerMinterms(resultados,vars){
    const combos=combinaciones(vars.length);
    const minterms=[];
    resultados.forEach((f,i)=>{if(f===1) minterms.push(bitsToLiteral(combos[i],vars));});
    return minterms.join("+")||"0";
}

function obtenerMaxterms(resultados,vars){
    const combos=combinaciones(vars.length);
    const maxterms=[];
    resultados.forEach((f,i)=>{if(f===0) maxterms.push(bitsToMaxterm(combos[i],vars));});
    return maxterms.join("")||"1";
}

// ======================================
// SIMPLIFICACIÓN (Quine-McCluskey)
// ======================================
function quineMcCluskey(minterms,n){
    const bin = minterms.map(m=>m.toString(2).padStart(n,"0"));
    let groups={};
    bin.forEach(b=>{
        const ones = (b.match(/1/g)||[]).length;
        groups[ones] = groups[ones] || [];
        groups[ones].push({bits:b, used:false});
    });
    let primeImplicants=[];
    function differOne(a,b){
        let dif=0,pos=-1;
        for(let i=0;i<a.length;i++){ if(a[i]!==b[i]){dif++; pos=i;} if(dif>1) return null; }
        if(dif===1) return a.substring(0,pos)+"-"+a.substring(pos+1);
        return null;
    }
    let nextGroups, currentGroups=groups;
    while(true){
        nextGroups={};
        const keys=Object.keys(currentGroups).map(k=>parseInt(k)).sort((a,b)=>a-b);
        for(let i=0;i<keys.length-1;i++){
            const g1=currentGroups[keys[i]];
            const g2=currentGroups[keys[i+1]];
            if(!g1||!g2) continue;
            g1.forEach(it1=>{
                g2.forEach(it2=>{
                    const comb=differOne(it1.bits,it2.bits);
                    if(comb!==null){
                        it1.used=it2.used=true;
                        const ones=(comb.match(/1/g)||[]).length;
                        nextGroups[ones]=nextGroups[ones]||[];
                        if(!nextGroups[ones].some(x=>x.bits===comb)) nextGroups[ones].push({bits:comb,used:false});
                    }
                });
            });
        }
        Object.values(currentGroups).forEach(gr=>gr.forEach(it=>{if(!it.used) primeImplicants.push(it.bits);}));
        if(Object.keys(nextGroups).length===0) break;
        currentGroups=nextGroups;
    }
    return [...new Set(primeImplicants)];
}

function implicanteToLiteral(imp,vars){
    let s="";
    for(let i=0;i<imp.length;i++){
        if(imp[i]==='1') s+=vars[i];
        else if(imp[i]==='0') s+=vars[i]+"\u0305";
    }
    return s;
}

function simplificarQM(resultados,vars){
    const combos=combinaciones(vars.length);
    const minterms=[];
    resultados.forEach((f,i)=>{if(f===1) minterms.push(i);});
    const primes=quineMcCluskey(minterms,vars.length);
    return primes.map(p=>implicanteToLiteral(p,vars)).join("+")||"0";
}
