"use strict";

/* =====================================
   REFERENCIAS A LOS ELEMENTOS DEL DOM
===================================== */

const form = document.getElementById("consultation-form");
const textarea = document.getElementById("user-query");
const sendButton = document.getElementById("send-button");
const sendLabel = document.getElementById("send-label");
const characterCount = document.getElementById("character-count");
const formFeedback = document.getElementById("form-feedback");

const responseCard = document.getElementById("response-card");
const responseKicker = document.getElementById("response-kicker");
const responseTitle = document.getElementById("response-title");
const responseText = document.getElementById("response-text");

/* =====================================
   CONFIGURACIÓN DEL ENVÍO
===================================== */

const MAX_LENGTH = 3000;
const TIMEOUT_MS = 20000;
const COOLDOWN_MS = 2500;

let isSending = false;
let cooldownUntil = 0;
let cooldownInterval = null;

/* =====================================
   ACTUALIZACIÓN DEL CONTADOR
===================================== */

textarea.addEventListener("input", () => {
    characterCount.textContent =
        `${textarea.value.length} / ${MAX_LENGTH} caracteres`;

    updateSendButton();
});

/* =====================================
   ESTADOS DE LA RESPUESTA
===================================== */

function setResponse(state, title, message) {
    const icons = {
        idle: "✦",
        loading: "◌",
        success: "✓",
        error: "!"
    };

    responseCard.className = `response-card state-${state}`;
    responseKicker.textContent = {
        idle: "CONSULTOR MÉDICO",
        loading: "PROCESANDO CONSULTA",
        success: "RESPUESTA RECIBIDA",
        error: "NO SE PUDO COMPLETAR"
    }[state] || "CONSULTOR MÉDICO";

    responseTitle.textContent = title;
    responseText.textContent = message;

    const avatar = document.querySelector(".avatar");
    if (avatar) {
        avatar.textContent = icons[state] || "✦";
    }
}

/* =====================================
   MENSAJES DE ESTADO DEL FORMULARIO
===================================== */

function setFeedback(message, type = "") {
    formFeedback.textContent = message;
    formFeedback.className = type;
}

/* =====================================
   CONTROL DEL BOTÓN Y DEL TIEMPO DE ESPERA
===================================== */

function updateSendButton() {
    const remaining = Math.max(0, cooldownUntil - Date.now());

    textarea.disabled = isSending;
    sendButton.disabled =
        isSending ||
        remaining > 0 ||
        textarea.value.trim().length === 0;

    if (isSending) {
        sendLabel.textContent = "Enviando...";
    } else if (remaining > 0) {
        sendLabel.textContent =
            `Esperá ${Math.ceil(remaining / 1000)} s`;
    } else {
        sendLabel.textContent = "Enviar consulta";
    }
}

function startCooldown() {
    cooldownUntil = Date.now() + COOLDOWN_MS;

    if (cooldownInterval) {
        clearInterval(cooldownInterval);
    }

    updateSendButton();

    cooldownInterval = setInterval(() => {
        updateSendButton();

        if (Date.now() >= cooldownUntil) {
            clearInterval(cooldownInterval);
            cooldownInterval = null;
            updateSendButton();
        }
    }, 200);
}

/* =====================================
   INTERPRETACIÓN DE LA RESPUESTA
===================================== */

function extractResponse(data) {
    if (typeof data === "string") {
        return data.trim();
    }

    if (data && typeof data === "object") {
        const possibleKeys = [
            "respuesta",
            "response",
            "answer",
            "message",
            "text"
        ];

        for (const key of possibleKeys) {
            if (typeof data[key] === "string" && data[key].trim()) {
                return data[key].trim();
            }
        }

        /* Permite interpretar respuestas que contengan un objeto anidado. */
        if (data.data && typeof data.data === "object") {
            return extractResponse(data.data);
        }

        return JSON.stringify(data, null, 2);
    }

    return "";
}

/* =====================================
   ENVÍO ASÍNCRONO AL WEBHOOK
===================================== */

async function sendConsultation(message) {
    if (isSending || Date.now() < cooldownUntil) {
        return;
    }

    if (!message || message.length > MAX_LENGTH) {
        setFeedback("Escribí una consulta de hasta 3000 caracteres.", "error");
        return;
    }

    isSending = true;
    updateSendButton();
    setFeedback("");
    setResponse(
        "loading",
        "Estamos procesando tu consulta",
        "El asistente está esperando la respuesta. Esto puede tardar unos segundos."
    );

    const controller = new AbortController();

    /* Cancela la petición si supera el tiempo máximo. */
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, TIMEOUT_MS);

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json, text/plain"
            },
            body: JSON.stringify({
                consulta: message,
                message: message,
                agente: "Consultor medico"
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`El servidor respondió con el estado ${response.status}.`);
        }

        const rawBody = await response.text();
        let result;

        /* El webhook puede devolver texto plano o JSON. */
        try {
            result = JSON.parse(rawBody);
        } catch {
            result = rawBody;
        }

        const answer = extractResponse(result);

        if (!answer) {
            throw new Error("El servidor respondió, pero no devolvió contenido.");
        }

        setResponse(
            "success",
            "Respuesta del consultor médico",
            answer
        );

        setFeedback("Consulta procesada correctamente.", "success");

    } catch (error) {
        console.error("Error al procesar la consulta:", error);

        if (error.name === "AbortError") {
            setResponse(
                "error",
                "Se agotó el tiempo de espera",
                "El servidor tardó demasiado en responder. Revisá tu conexión e intentá nuevamente."
            );
        } else {
            setResponse(
                "error",
                "No pudimos obtener una respuesta",
                "Verificá que el webhook esté configurado, que el servicio esté disponible y que permita recibir solicitudes desde esta página. Después podés volver a intentarlo."
            );
        }

        setFeedback(
            "No se pudo completar el envío. Revisá la configuración del servicio.",
            "error"
        );

    } finally {
        clearTimeout(timeoutId);

        isSending = false;
        startCooldown();
    }
}

/* =====================================
   EVENTO DEL FORMULARIO
===================================== */

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = textarea.value.trim();

    if (!message) {
        setFeedback("Escribí tu consulta antes de enviarla.", "error");
        textarea.focus();
        return;
    }

    await sendConsultation(message);

    /* Limpia el campo solo si el usuario ya recibió respuesta. */
    if (responseCard.classList.contains("state-success")) {
        textarea.value = "";
        characterCount.textContent = `0 / ${MAX_LENGTH} caracteres`;
    }

    updateSendButton();
});

/* =====================================
   INICIALIZACIÓN
===================================== */

updateSendButton();