"use strict";

/* ==========================================
   ELEMENTOS DE LA INTERFAZ
========================================== */

const historial = document.getElementById("historial");
const listaHistorial = document.getElementById("lista-historial");

const mensajes = document.getElementById("mensajes");
const opciones = document.getElementById("opciones");
const chatbox = document.getElementById("chatbox");

const botonNueva = document.getElementById("nueva-conversacion");
const botonReintentar = document.getElementById("reintentar-carga");
const etiquetaEleccion = document.getElementById("eleccion-recordada");

/* ==========================================
   ESTADO DEL PROGRAMA
   Los datos se conservan en memoria mientras
   la página permanece abierta.
========================================== */

let nodos = Object.create(null);
let nodoActual = null;
let eleccionRecordada = "";
let consultasVisitadas = [];

const MENSAJE_ERROR_CARGA =
    "Abrí el proyecto con Live Server o un servidor local para que pueda leer arbol_decision.json";

botonNueva.disabled = true;
botonNueva.addEventListener("click", reiniciarConversacion);
botonReintentar.addEventListener("click", cargarArbol);

/* ==========================================
   CARGAR Y VALIDAR EL ARCHIVO JSON
========================================== */

async function cargarArbol() {
    botonReintentar.classList.add("oculto");
    opciones.replaceChildren();

    try {
        const respuesta = await fetch("./arbol_decision.json");

        if (!respuesta.ok) {
            throw new Error("No se pudo leer el archivo JSON.");
        }

        const datos = await respuesta.json();

        if (!datos || !Array.isArray(datos.nodos)) {
            throw new Error("El árbol no tiene la estructura esperada.");
        }

        const nuevosNodos = Object.create(null);

        /* Primero registra todos los nodos. */
        for (const nodo of datos.nodos) {
            if (
                !nodo ||
                typeof nodo.id !== "string" ||
                !nodo.id.trim() ||
                typeof nodo.texto !== "string" ||
                !Array.isArray(nodo.opciones) ||
                nodo.opciones.length === 0 ||
                nuevosNodos[nodo.id]
            ) {
                throw new Error("Hay un nodo inválido o sin opciones.");
            }

            nuevosNodos[nodo.id] = nodo;
        }

        /* Después verifica que los saltos existan. */
        for (const nodo of datos.nodos) {
            for (const opcion of nodo.opciones) {
                if (
                    !opcion ||
                    typeof opcion.texto !== "string" ||
                    !opcion.texto.trim() ||
                    typeof opcion.siguiente !== "string" ||
                    !nuevosNodos[opcion.siguiente]
                ) {
                    throw new Error("Hay una opción con destino inválido.");
                }
            }
        }

        if (!nuevosNodos.inicio || !nuevosNodos.menu_principal) {
            throw new Error("Falta un nodo principal del árbol.");
        }

        nodos = nuevosNodos;
        nodoActual = null;
        eleccionRecordada = "";
        consultasVisitadas = [];

        actualizarEleccion();
        renderizarHistorial();

        botonNueva.disabled = false;

        mensajes.replaceChildren();
        mostrarNodo("inicio");

    } catch (error) {
        console.error("Error al cargar el árbol:", error);

        mensajes.replaceChildren();
        opciones.replaceChildren();

        agregarMensaje("bot", MENSAJE_ERROR_CARGA);
        botonReintentar.classList.remove("oculto");
    }
}

/* ==========================================
   AGREGAR MENSAJES
========================================== */

function agregarMensaje(tipo, texto, fuentes = []) {
    const articulo = document.createElement("article");
    articulo.className = `mensaje mensaje--${tipo}`;

    const autor = document.createElement("span");
    autor.className = "mensaje__autor";
    autor.textContent = tipo === "usuario" ? "Vos" : "Ben Sulayem";

    const contenido = document.createElement("p");
    contenido.className = "mensaje__texto";

    /* textContent evita interpretar el contenido como HTML. */
    contenido.textContent = personalizarTexto(texto);

    articulo.append(autor, contenido);

    /* Muestra fuentes oficiales definidas en el JSON. */
    if (Array.isArray(fuentes) && fuentes.length > 0) {
        const contenedorFuentes = document.createElement("div");
        contenedorFuentes.className = "mensaje__fuentes";

        fuentes.forEach((fuente) => {
            if (
                !fuente ||
                typeof fuente.texto !== "string" ||
                typeof fuente.url !== "string" ||
                !fuente.url.startsWith("https://")
            ) {
                return;
            }

            const enlace = document.createElement("a");

            enlace.className = "mensaje__fuente";
            enlace.textContent = fuente.texto;
            enlace.href = fuente.url;
            enlace.target = "_blank";
            enlace.rel = "noopener noreferrer";

            contenedorFuentes.appendChild(enlace);
        });

        if (contenedorFuentes.children.length > 0) {
            articulo.appendChild(contenedorFuentes);
        }
    }

    mensajes.appendChild(articulo);
    mensajes.scrollTop = mensajes.scrollHeight;
}

/* ==========================================
   PERSONALIZAR LOS TEXTOS DEL JSON
========================================== */

function personalizarTexto(texto) {
    const eleccion = eleccionRecordada || "ningún tema todavía";

    return texto.replace(/\{eleccion\}/g, eleccion);
}

/* ==========================================
   MOSTRAR UN NODO DEL ÁRBOL
========================================== */

function mostrarNodo(id) {
    const nodo = nodos[id];

    if (!nodo) {
        return;
    }

    nodoActual = id;

    agregarMensaje("bot", nodo.texto, nodo.fuentes || []);

    registrarConsulta(nodo);
    renderizarHistorial();

    /* Quita los controles de la respuesta anterior. */
    opciones.replaceChildren();

    /* Crea una opción clickeable por cada salto del JSON. */
    nodo.opciones.forEach((opcion) => {
        const boton = document.createElement("button");
        const texto = document.createElement("span");
        const flecha = document.createElement("span");

        boton.type = "button";
        boton.className = "opcion";

        if (id === "menu_principal") {
            boton.classList.add("opcion--principal");
        }

        if (opcion.siguiente === "terminar") {
            boton.classList.add("opcion--terminar");
        }

        texto.className = "opcion__texto";
        texto.textContent = opcion.texto;

        flecha.className = "opcion__flecha";
        flecha.textContent = "→";
        flecha.setAttribute("aria-hidden", "true");

        boton.append(texto, flecha);

        boton.addEventListener("click", () => {
            seleccionarOpcion(opcion);
        });

        opciones.appendChild(boton);
    });

    mensajes.scrollTop = mensajes.scrollHeight;
}

/* ==========================================
   EJECUTAR UNA OPCIÓN SELECCIONADA
========================================== */

function seleccionarOpcion(opcion) {
    /* Guarda la categoría principal elegida por la persona. */
    if (typeof opcion.recuerda === "string" && opcion.recuerda.trim()) {
        eleccionRecordada = opcion.recuerda;
        actualizarEleccion();
    }

    /* Reinicia únicamente si la persona lo selecciona. */
    if (opcion.siguiente === "inicio") {
        reiniciarConversacion();
        return;
    }

    agregarMensaje("usuario", opcion.texto);

    /* El destino siempre procede de arbol_decision.json. */
    mostrarNodo(opcion.siguiente);
}

/* ==========================================
   MEMORIA TEMPORAL DE LA ELECCIÓN
========================================== */

function actualizarEleccion() {
    etiquetaEleccion.textContent =
        eleccionRecordada || "Todavía no elegiste un tema";
}

/* ==========================================
   HISTORIAL DE CONSULTAS
========================================== */

function registrarConsulta(nodo) {
    const nodosGenerales = [
        "inicio",
        "menu_principal",
        "terminar"
    ];

    if (nodosGenerales.includes(nodo.id)) {
        return;
    }

    /* Evita duplicados; mantiene la consulta más reciente al final. */
    consultasVisitadas = consultasVisitadas.filter(
        (id) => id !== nodo.id
    );

    consultasVisitadas.push(nodo.id);
}

function renderizarHistorial() {
    listaHistorial.replaceChildren();

    if (consultasVisitadas.length === 0) {
        const vacio = document.createElement("li");

        vacio.className = "historial__vacio";
        vacio.textContent = "Tus consultas aparecerán acá.";

        listaHistorial.appendChild(vacio);
        return;
    }

    /* Presenta primero la consulta visitada más recientemente. */
    [...consultasVisitadas].reverse().forEach((id) => {
        const nodo = nodos[id];

        if (!nodo) {
            return;
        }

        const elemento = document.createElement("li");
        elemento.className = "historial__elemento";

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "historial__boton";

        if (id === nodoActual) {
            boton.classList.add("historial__boton--activo");
            boton.setAttribute("aria-current", "page");
        }

        const icono = document.createElement("span");
        icono.className = "historial__icono";
        icono.textContent = "↗";
        icono.setAttribute("aria-hidden", "true");

        const texto = document.createElement("span");
        texto.className = "historial__texto";
        texto.textContent = nodo.titulo || id;

        boton.append(icono, texto);

        boton.addEventListener("click", () => {
            mostrarNodo(id);
        });

        elemento.appendChild(boton);
        listaHistorial.appendChild(elemento);
    });
}

/* ==========================================
   REINICIAR LA CONVERSACIÓN
========================================== */

function reiniciarConversacion() {
    if (!nodos.inicio) {
        return;
    }

    nodoActual = null;
    eleccionRecordada = "";
    consultasVisitadas = [];

    mensajes.replaceChildren();
    opciones.replaceChildren();

    actualizarEleccion();
    renderizarHistorial();

    mostrarNodo("inicio");
}

/* ==========================================
   ARRANQUE
========================================== */

cargarArbol();