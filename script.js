/* =================================
   TASAS DE CAMBIO
================================= */

const DOLAR = 1530;
const EURO = 1780;


/* =================================
   PESOS → DÓLARES Y EUROS
================================= */

const pesos = document.getElementById("pesos");

pesos.addEventListener("input", function () {

    const valor = parseFloat(this.value);

    const resultadoDolar =
        document.getElementById("dolaresResultado");

    const resultadoEuro =
        document.getElementById("eurosResultado");

    const pesosIngresados =
        document.getElementById("pesosIngresados");


    // Si no hay ningún valor
    if (isNaN(valor)) {

        resultadoDolar.value = "";

        resultadoEuro.value = "";

        pesosIngresados.value = "";

        return;
    }


    // Conversión
    const dolares = valor / DOLAR;

    const euros = valor / EURO;


    // Mostrar resultados
    resultadoDolar.value =
        dolares.toFixed(2) + " USD";

    resultadoEuro.value =
        euros.toFixed(2) + " EUR";

    pesosIngresados.value =
        "$ " + valor.toFixed(2);

});


/* =================================
   DÓLARES → PESOS
================================= */

const dolares = document.getElementById("dolares");

dolares.addEventListener("input", function () {

    const valor = parseFloat(this.value);

    const resultado =
        document.getElementById("pesosDesdeDolar");


    if (isNaN(valor)) {

        resultado.value = "";

        return;
    }


    const pesos = valor * DOLAR;


    resultado.value =
        "$ " + pesos.toFixed(2);

});


/* =================================
   EUROS → PESOS
================================= */

const euros = document.getElementById("euros");

euros.addEventListener("input", function () {

    const valor = parseFloat(this.value);

    const resultado =
        document.getElementById("pesosDesdeEuro");


    if (isNaN(valor)) {

        resultado.value = "";

        return;
    }


    const pesos = valor * EURO;


    resultado.value =
        "$ " + pesos.toFixed(2);

});


/* =================================
   AGREGAR UNA NOTA
================================= */

function agregarNota() {

    const texto = prompt(
        "Escribí tu nueva anotación:"
    );


    // Si el usuario cancela
    if (texto === null) {
        return;
    }


    // Evitar notas vacías
    if (texto.trim() === "") {

        alert("La nota no puede estar vacía.");

        return;
    }


    const lista =
        document.getElementById("listaNotas");


    // Crear la nueva nota
    const nuevaNota =
        document.createElement("div");

    nuevaNota.classList.add("nota");


    // Crear texto
    const contenido =
        document.createElement("span");

    contenido.textContent =
        texto;


    // Crear botón eliminar
    const boton =
        document.createElement("button");

    boton.textContent = "×";

    boton.onclick = function () {
        eliminarNota(boton);
    };


    // Agregar elementos
    nuevaNota.appendChild(contenido);

    nuevaNota.appendChild(boton);

    lista.appendChild(nuevaNota);
}


/* =================================
   ELIMINAR UNA NOTA
================================= */

function eliminarNota(boton) {

    boton.parentElement.remove();

}