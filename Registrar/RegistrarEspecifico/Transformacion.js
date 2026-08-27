document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // ELEMENTOS DEL FORMULARIO
    // =========================================================

    const selectIncidencia = document.getElementById('Incidencia');
    const contenedorDescripcion = document.getElementById('Descripcion');
    const formIncidencia = document.getElementById('incidenciaForm');

    const selectTipo = document.getElementById('tipo');
    const selectPeligro = document.getElementById('peligro');
    const registrosEncabezado = document.getElementById('registrosEncabezado');
    const registrosCuerpo = document.getElementById('registrosCuerpo');

    const modalElemento = document.getElementById('modalExito');
    const modalExito = new bootstrap.Modal(modalElemento);

    const datosInicio = JSON.parse(
        sessionStorage.getItem('datosRegistro') || '{}'
    );

    const obtenerDatosFormulario = () => Array.from(formIncidencia.elements)
        .filter(elemento => elemento.name)
        .reduce((datos, elemento) => {
            datos[elemento.name] = elemento.name === 'peligro'
                ? elemento.selectedOptions[0]?.textContent.trim()
                : elemento.value;
            return datos;
        }, {});

    const obtenerNivelProbabilidad = (datos) => {
        const nivelDeficiencia = Number(datos.NivelDeDeficiencia);
        const nivelExposicion = Number(datos.NivelDeExposicion);
        return nivelDeficiencia * nivelExposicion;
    };

    const obtenerNivelRiesgo = (datos) => {
        const nivelProbabilidad = Number(datos.NivelDeProbabilidad);
        const nivelConsecuencia = Number(datos.NivelDeConsecuencia);
        return nivelProbabilidad * nivelConsecuencia;
    };

    const obtenerAceptabilidadRiesgo = (nivelRiesgo) => {
        if (nivelRiesgo < 20) {
            return '0';
        }

        if (nivelRiesgo == 20) {
            return 'PERMISIBLE';
        }

        if (nivelRiesgo <= 120) {
            return 'MEJORABLE';
        }

        if (nivelRiesgo <= 500) {
            return 'ACEPTABLE CON CONTROL ESPECIFICO';
        }

        return 'INACEPTABLE';
    };

    const obtenerInterpretacionNivelProbabilidad = (producto) => {

        if (producto === 0) {
            return '0';
        }

        if (producto <= 4) {
            return '(B)';
        }

        if (producto <= 8) {
            return '(M)';
        }

        if (producto <= 20) {
            return '(A)';
        }

        return '(MA)';
    };

    const obtenerRegistros = () => JSON.parse(
        sessionStorage.getItem('registrosPeligro') || '[]'
    );

    const renderizarRegistros = () => {
        const registros = obtenerRegistros();
        registrosEncabezado.innerHTML = '';
        registrosCuerpo.innerHTML = '';

        if (!registros.length) {
            const fila = document.createElement('tr');
            const celda = document.createElement('td');
            celda.className = 'text-muted';
            celda.textContent = 'No hay registros para mostrar.';
            fila.appendChild(celda);
            registrosCuerpo.appendChild(fila);
            return;
        }

        const columnas = [...new Set(
            registros.flatMap(registro => Object.keys(registro))
        )];
        const encabezado = document.createElement('tr');

        columnas.forEach(columna => {
            const celda = document.createElement('th');
            celda.scope = 'col';
            celda.textContent = columna;
            encabezado.appendChild(celda);
        });

        const encabezadoAcciones = document.createElement('th');
        encabezadoAcciones.scope = 'col';
        encabezadoAcciones.textContent = 'Acciones';
        encabezado.appendChild(encabezadoAcciones);
        registrosEncabezado.appendChild(encabezado);

        registros.forEach((registro, indice) => {
            const fila = document.createElement('tr');

            columnas.forEach(columna => {
                const celda = document.createElement('td');
                celda.textContent = registro[columna] ?? '';
                fila.appendChild(celda);
            });

            const celdaAcciones = document.createElement('td');
            const botonBorrar = document.createElement('button');
            botonBorrar.type = 'button';
            botonBorrar.className = 'btn btn-danger btn-sm';
            botonBorrar.textContent = 'Borrar';
            botonBorrar.addEventListener('click', () => {
                const registrosActualizados = obtenerRegistros();
                registrosActualizados.splice(indice, 1);
                sessionStorage.setItem(
                    'registrosPeligro',
                    JSON.stringify(registrosActualizados)
                );
                renderizarRegistros();
            });
            celdaAcciones.appendChild(botonBorrar);
            fila.appendChild(celdaAcciones);
            registrosCuerpo.appendChild(fila);
        });
    };

    const exportarRegistros = () => {
        const registros = obtenerRegistros();

        if (!registros.length) {
            return;
        }

        const columnas = [...new Set(registros.flatMap(registro => Object.keys(registro)))];
        const escaparHtml = valor => String(valor ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        const colores = {
            '0': '#d9d9d9',
            '(B)': '#9dc3e6',
            '(M)': '#457e20',
            '(A)': '#fdfb5b',
            '(MA)': '#f35050'
        };
        const coloresAceptabilidad = {
            '0': colores['0'],
            'PERMISIBLE': colores['(B)'],
            'MEJORABLE': colores['(M)'],
            'ACEPTABLE CON CONTROL ESPECIFICO': colores['(A)'],
            'INACEPTABLE': colores['(MA)']
        };
        const filas = registros.map(registro => `<tr>${columnas.map(columna => {
            const color = columna === 'InterpretacionNivelDeProbabilidad'
                ? colores[registro[columna]]
                : undefined;
            const colorAceptabilidad = columna === 'AceptabilidadDelRiesgo'
                ? coloresAceptabilidad[registro[columna]]
                : undefined;
            const colorCelda = color || colorAceptabilidad;
            const estilo = colorCelda ? `background-color: ${colorCelda};` : '';
                    
            return `<td style="${estilo}">${escaparHtml(registro[columna])}</td>`;
        }).join('')}</tr>`).join('');
        const contenido = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr>${columnas.map(columna => `<th>${escaparHtml(columna)}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></body></html>`;

        const enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(
            new Blob([contenido], { type: 'application/vnd.ms-excel' })
        );
        enlace.download = 'Registro_Peligros.xls';
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(enlace.href), 0);
        sessionStorage.removeItem('registrosPeligro');
    };


    // =========================================================
    // PELIGROS SEGÚN EL PDF IPER
    // =========================================================

    const peligros = {

        // -----------------------------------------------------
        // 1. MECÁNICO
        // -----------------------------------------------------

        mecanico: [

            ["1.1", "Caída de personas al mismo nivel"],
            ["1.2", "Caída de personas a distinto nivel"],
            ["1.3", "Derrumbes (caída de herramientas, materiales desde altura, objetos)"],
            ["1.4", "Pisada sobre objetos"],
            ["1.5", "Atrapamiento por o entre objetos"],
            ["1.6", "Atrapamiento por vuelco de máquina o vehículo"],
            ["1.7", "Aplastamiento"],
            ["1.8", "Perforación o punzonamiento"],
            ["1.9", "Fricción o Abrasión"],
            ["1.10", "Choque contra objetos inmóviles"],
            ["1.11", "Choque contra objetos móviles"],
            ["1.12", "Golpes por o contra"],
            ["1.13", "Golpes con partes de máquina (en movimiento o estática)"],
            ["1.14", "Proyección de fragmentos o partículas"],
            ["1.15", "Maquinaria sin anclaje"],
            ["1.16", "Cortes con objetos"],
            ["1.17", "Contactos térmicos"],
            ["1.18", "Contacto con sustancias cáusticas o corrosivas"],
            ["1.19", "Atropello por vehículos"],
            ["1.20", "Punto de transmisión de fuerza sin protección"],
            ["1.21", "Punto de operación sin protección"],
            ["1.22", "Máquinas, equipos y herramientas defectuosas"],
            ["1.23", "Herramientas manuales defectuosas"],
            ["1.24", "Herramientas eléctricas defectuosas"],
            ["1.25", "Herramientas neumáticas defectuosas"],
            ["1.26", "Mecanismos en movimiento, elementos móviles, cortantes"],
            ["1.27", "Deficiencia en mantenimiento preventivo"],
            ["1.28", "Almacenamiento y movilización de materiales"],
            ["1.29", "Mercadería mal estibada"]

        ],


        // -----------------------------------------------------
        // 2. ELÉCTRICO
        // -----------------------------------------------------

        electrico: [

            ["2.1", "Contacto Eléctrico Directo (Contacto de personas con partes activas)"],
            ["2.2", "Contacto Eléctrico Indirecto (Contacto de personas con partes que se han hecho activas a causa de malas condiciones)"],
            ["2.3", "Aproximación a partes activas a alta tensión"],
            ["2.4", "Electricidad Natural (Rayo)"],
            ["2.5", "Líneas conductoras sin entubar"],
            ["2.6", "Contacto con líneas o puntos energizados"],
            ["2.7", "Sin polo a tierra"],
            ["2.8", "Empalmes defectuosos"],
            ["2.9", "Cajas, interruptores, tomas, terminales, cables, tacos, empalmes y acometidas en mal estado"],
            ["2.10", "Sin llaves eléctricas de seguridad (disyuntor diferencial)"],
            ["2.11", "Instalaciones eléctricas sobrecargadas"],
            ["2.12", "Electricidad Estática"]

        ],


        // -----------------------------------------------------
        // 3. FUEGO Y EXPLOSIÓN
        // -----------------------------------------------------

        fuego: [

            ["3.1", "Fuego y Explosión de Gases"],
            ["3.2", "Fuego y Explosión de Líquidos"],
            ["3.3", "Fuego y explosión de Sólidos"],
            ["3.4", "Fuego y Explosión Combinados"],
            ["3.5", "Incendios"],
            ["3.6", "Incendios Eléctricos"],
            ["3.7", "Incompatibilidad físico-química en materias primas"],
            ["3.8", "Presencia de sustancias, materiales o productos de fácil combustión"],
            ["3.9", "Incendios - Medios de Lucha"],
            ["3.10", "Incendios - Evacuación"]

        ],


        // -----------------------------------------------------
        // 4. QUÍMICOS
        // -----------------------------------------------------

        quimicos: [

            ["4.1", "Polvos orgánicos e inorgánicos (Sílice, granos, otros)"],
            ["4.2", "Fibras"],
            ["4.3", "Líquidos (nieblas, rocíos, corrosivos, disolventes, inflamables, etc.)"],
            ["4.4", "Humos metálicos y no metálicos"],
            ["4.5", "Humos de combustión en el ambiente"],
            ["4.6", "Metales (Soldaduras, Fundición y otros)"],
            ["4.7", "Solventes Orgánicos (pinturas, barnices, desengrasantes, lavados de piezas, otros)"],
            ["4.8", "Ácidos"],
            ["4.9", "Bases (Soda Cáustica, otros, productos de limpieza)"],
            ["4.10", "Gases y Vapores"],
            ["4.11", "Vapores manipulación y fraccionamiento (gasolina, formol, etc.)"],
            ["4.12", "Plaguicidas"]

        ],


        // -----------------------------------------------------
        // 5. FÍSICOS
        // -----------------------------------------------------

        fisicos: [

            ["5.1", "Ruído (impacto intermitente y continuo)"],
            ["5.2", "Iluminación (luz visible por exceso o deficiencia)"],
            ["5.3", "Carga Térmica"],
            ["5.4", "Stress Térmico (Por Frío o Calor)"],
            ["5.5", "Quemadura"],
            ["5.6", "Escaldaduras"],
            ["5.7", "Radiaciones No Ionizantes (láser, ultravioleta y infrarroja)"],
            ["5.8", "Radiaciones Ionizantes (rayos X, gama, beta y alfa)"],
            ["5.9", "Vibraciones (cuerpo entero, segmentaria)"],
            ["5.10", "Presiones barométricas anormales"]

        ],


        // -----------------------------------------------------
        // 6. BIOLÓGICOS
        // -----------------------------------------------------

        biologicos: [

            ["6.1", "Infecto Contagioso"],
            ["6.2", "Picaduras Insectos"],
            ["6.3", "Sustancias animales y vegetales"],
            ["6.4", "Mordedura de animales"],
            ["6.5", "Fluidos o excrementos"],
            ["6.6", "Virus"],
            ["6.7", "Bacterias"],
            ["6.8", "Hongos"],
            ["6.9", "Microorganismos"],
            ["6.10", "Animales y vectores"],
            ["6.11", "Presencia de productos descompuestos"],
            ["6.12", "Desconocimiento de normas de conservación, clasificación, empaque y almacenamiento"],
            ["6.13", "Empaques defectuosos y sin fecha de vencimiento"],
            ["6.14", "Presencia de productos alimenticios a nivel del suelo"],
            ["6.15", "Trabajo con productos contaminados"],
            ["6.16", "Rickettsia"],
            ["6.17", "Exposición a agentes biológicos como virus SARS-Covid, gripes comunes"],
            ["6.18", "Parásitos"]

        ],


        // -----------------------------------------------------
        // 7. FISIOLÓGICOS
        // -----------------------------------------------------

        fisiologicos: [

            ["7.1", "Gasto Energético Excesivo"]

        ],


        // -----------------------------------------------------
        // 8. BIOMECÁNICOS / ERGONÓMICOS
        // -----------------------------------------------------

        biomecanicos: [

            ["8.1", "Movimiento Repetitivo"],
            ["8.2", "Sobrecarga postural"],
            ["8.3", "Uso de fuerza excesiva en Extremidades Superiores"],
            ["8.4", "Sobresfuerzos"],
            ["8.5", "Malas posturas"],
            ["8.6", "Manejo Manual de Carga en forma inadecuada"],
            ["8.7", "Organización del trabajo (secuencias, ritmos, rutas, jornadas, turnos, rotaciones, descansos)"],
            ["8.8", "Almacenamiento y movilización de materiales"],
            ["8.9", "Técnicas de manipulación y levantamiento de cargas"],
            ["8.10", "Diseño de puesto de trabajo (relación máquina, herramienta y materiales, superficie de trabajo, silla, ubicación de controles inadecuados)"],
            ["8.11", "Posiciones de rodillas o de cuclillas por 20' o más"],
            ["8.12", "Posturas forzadas o por fuera de los ángulos de confort"],
            ["8.13", "Requerimientos de fuerza superior a la capacidad del individuo"],
            ["8.14", "La fuerza se realiza asociada a cargas estáticas altas"],
            ["8.15", "Requerimientos de fuerza asociados a cargas dinámicas altas"],
            ["8.16", "Requerimientos excesivos de movimiento"],
            ["8.17", "Técnicas de manipulación y levantamiento de cargas"],
            ["8.18", "Diseño de puesto de trabajo (relación máquina, herramienta y materiales, superficie de trabajo, silla, ubicación de controles inadecuados)"],
            ["8.19", "El movimiento se realiza sobre una carga estática alta"],
            ["8.20", "Asociación de Repetitividad y fuerza"],
            ["8.21", "Postura (prolongada, mantenida, forzada, antigravitacionales)"]

        ],


        // -----------------------------------------------------
        // 9. MENTALES Y/O PSICOSOCIALES
        // -----------------------------------------------------

        psicosociales: [

            ["9.1", "Elevadas exigencias cognitivas (atención sostenida o simultaneidad de tareas que exigen manejo de información)"],
            ["9.2", "Elevada probabilidad de error con consecuencias importantes"],
            ["9.3", "Tareas muy poco variadas que se repiten a lo largo de la jornada"],
            ["9.4", "Ritmo intenso de trabajo / monotonía"],
            ["9.5", "Insatisfacción en el trabajo"],
            ["9.6", "Inestabilidad económica"],
            ["9.7", "Ausencia de manuales de operación o de funcionamiento"],
            ["9.8", "Ausencia de normas de seguridad"],
            ["9.9", "Incentivos por producción"],
            ["9.10", "Sobrecarga de trabajo cualitativa o cuantitativa"],
            ["9.11", "Conflictos de autoridad"],
            ["9.12", "Perfil psicológico del trabajador"],
            ["9.13", "Contexto extra laboral"],
            ["9.14", "Carga Mental"],
            ["9.15", "Hábitos y costumbres inadecuadas"],
            ["9.16", "Poca conciencia preventiva"],
            ["9.17", "Insatisfacción"],
            ["9.18", "Poca Motivación"],
            ["9.19", "Poca habilidad y aptitud de aprendizaje"],
            ["9.20", "Deficiencias físicas"],
            ["9.21", "Talla, peso, y fuerza inapropiadas"],
            ["9.22", "Tiempo de reacción lento"],
            ["9.23", "Disturbios emocionales"],
            ["9.24", "Inducción y entrenamiento deficiente"],
            ["9.25", "Estándares (normas) y procedimientos de trabajo inadecuados"],
            ["9.26", "Carencia de subsistemas de información"],
            ["9.27", "Carencia de recursos para el control efectivo de los factores de riesgos"],
            ["9.28", "Adquisiciones sin visto bueno"],
            ["9.29", "Selección inadecuada del personal"],
            ["9.30", "Falta de programas de mantenimiento"],
            ["9.31", "Sin brigadas contra incendios o sin capacitación"],
            ["9.32", "Incumplimiento a los requisitos del cliente"],
            ["9.33", "Error o desacierto estratégico"],
            ["9.34", "Jornada de trabajo (pausas, trabajo nocturno, rotación, horas extras, descansos)"]

        ],


        // -----------------------------------------------------
        // 10. FENÓMENOS NATURALES
        // -----------------------------------------------------

        naturales: [

            ["10.1", "Sismo"],
            ["10.2", "Terremoto"],
            ["10.3", "Vientos fuertes"],
            ["10.4", "Inundaciones"],
            ["10.5", "Tormentas eléctricas"],
            ["10.6", "Precipitaciones (lluvias, granizadas)"],
            ["10.7", "Sismo"]

        ],


        // -----------------------------------------------------
        // 11. LOCATIVOS
        // -----------------------------------------------------

        locativos: [

            ["11.1", "Sin señalización, ni demarcación"],
            ["11.2", "Falta de orden y aseo"],
            ["11.3", "Almacenamiento inadecuado"],
            ["11.4", "Superficies de trabajo defectuosas"],
            ["11.5", "Escaleras y rampas inadecuadas"],
            ["11.6", "Techos defectuosos"],
            ["11.7", "Ventilación insuficiente"],
            ["11.8", "Sin sistemas de extinción de incendios (extintores, hidrantes, rociadores, etc.)"],
            ["11.9", "Extintores defectuosos (golpes, oxidados, mangueras cortadas, sin precinto, etc.)"],
            ["11.10", "Extintores despresurizados, vencidos (mantenimiento y ensayo hidrostático)"],
            ["11.11", "Sin salidas de emergencia, obstaculizadas o sin señalización"],
            ["11.12", "Inadecuada selección de extintor de acuerdo al material combustible"],
            ["11.13", "Barandas NO cumplen con separación máxima de 10 cm en cualquier abertura o hueco"],
            ["11.14", "Pisos defectuosos"],
            ["11.15", "Muros, puertas, ventanas defectuosas"],
            ["11.16", "Hacinamiento (relación espacio con puestos de trabajo)"],
            ["11.17", "Deficiente espacio destinado para la actividad"],
            ["11.18", "Mal uso del espacio"],
            ["11.19", "Áreas de circulación insuficiente"],
            ["11.20", "Áreas de circulación obstruidas"]

        ],


        // -----------------------------------------------------
        // 12. IMPACTOS AMBIENTALES
        // -----------------------------------------------------

        ambientales: [

            ["12.1", "Agotamiento recurso natural (No Renovable)"],
            ["12.2", "Agotamiento recurso natural (Renovable)"],
            ["12.3", "Contaminación agua"],
            ["12.4", "Contaminación Agua Y Suelo"],
            ["12.5", "Contaminación aire"],
            ["12.6", "Contaminación del suelo"]

        ],


        // -----------------------------------------------------
        // 13. PÚBLICOS OTROS
        // -----------------------------------------------------

        publicos: [

            ["13.1", "Hurtos"],
            ["13.2", "Asaltos"],
            ["13.3", "Altura Geográfica"],
            ["13.4", "Delincuencia común"],
            ["13.5", "Delincuencia organizada"],
            ["13.6", "Lesiones personales"],
            ["13.7", "Asonada o motín"],
            ["13.8", "Secuestro o Extorsión"],
            ["13.9", "Acciones de grupos al margen de la ley"],
            ["13.10", "Actos mal intencionados de terceros"],
            ["13.11", "Incumplimiento de normas de tránsito"],
            ["13.12", "Contrabando"],
            ["13.13", "Tráfico de drogas"],
            ["13.14", "Piratería terrestre"],
            ["13.15", "Lavado de activos"],
            ["13.16", "Hiperbarismos (ej. Buzos)"],
            ["13.17", "Iluminación inadecuada"],
            ["13.18", "Uso Negligente de Equipos de Protección Personal"],
            ["13.19", "Terrorismo"]

        ]

    };


    // =========================================================
    // CAMBIAR PELIGROS SEGÚN EL TIPO
    // =========================================================

    selectTipo.addEventListener('change', function () {

        const tipoSeleccionado = this.value;

        // Limpiar el select de peligro
        selectPeligro.innerHTML = '';

        // Si no hay tipo seleccionado
        if (!tipoSeleccionado) {

            selectPeligro.disabled = true;

            selectPeligro.innerHTML = `
                <option value="">
                    Seleccione primero un tipo
                </option>
            `;

            return;
        }


        // Activar el select
        selectPeligro.disabled = false;


        // Opción inicial
        selectPeligro.innerHTML = `
            <option value="">
                Seleccione un peligro...
            </option>
        `;


        // Obtener los peligros correspondientes
        const listaPeligros = peligros[tipoSeleccionado];


        // Crear las opciones
        listaPeligros.forEach(function (peligro) {

            const option = document.createElement('option');

            option.value = peligro[0];

            option.textContent =
                peligro[0] + ' - ' + peligro[1];

            selectPeligro.appendChild(option);

        });

    });


    // =========================================================
    // MOSTRAR DESCRIPCIÓN CUANDO SE SELECCIONA "OTRO"
    // =========================================================

    if (selectIncidencia) {
        selectIncidencia.addEventListener('change', function (e) {

        if (e.target.value === 'Otro') {

            contenedorDescripcion.innerHTML = `

                <label
                    for="detalleOtro"
                    class="form-label fw-bold text-danger"
                >
                    Por favor, especifique el problema:
                </label>

                <textarea
                    name="detalleOtro"
                    id="detalleOtro"
                    class="form-control"
                    rows="4"
                    placeholder="Describa brevemente lo ocurrido..."
                    required
                ></textarea>

            `;

        } else {

            contenedorDescripcion.innerHTML = '';

        }

        });
    }


    // =========================================================
    // ENVÍO DEL FORMULARIO
    // =========================================================

    formIncidencia.addEventListener('submit', function (e) {

        e.preventDefault();

        const datosIncidencia = obtenerDatosFormulario();
        const nivelProbabilidad = obtenerNivelProbabilidad(datosIncidencia);
        datosIncidencia.NivelDeProbabilidad = nivelProbabilidad;
        datosIncidencia.InterpretacionNivelDeProbabilidad =
            obtenerInterpretacionNivelProbabilidad(nivelProbabilidad);
        datosIncidencia.NivelDeRiesgo = obtenerNivelRiesgo(datosIncidencia);
        datosIncidencia.AceptabilidadDelRiesgo = obtenerAceptabilidadRiesgo(
            datosIncidencia.NivelDeRiesgo
        );
        const datosRegistro = { ...datosInicio, ...datosIncidencia };
        const registros = JSON.parse(
            sessionStorage.getItem('registrosPeligro') || '[]'
        );

        registros.push(datosRegistro);
        sessionStorage.setItem('registrosPeligro', JSON.stringify(registros));
        renderizarRegistros();

        console.log("Registro completo listo para enviar:", datosRegistro);

        modalExito.show();

    });


    // =========================================================
    // VOLVER AL MENÚ
    // =========================================================

    document.getElementById('closePopup').addEventListener('click', function () {

        alert('Ahora se descargara una tabla de Excel');
        exportarRegistros();
        window.history.back();

    });


    // =========================================================
    // REGISTRAR OTRA INCIDENCIA
    // =========================================================

    document.getElementById('registrarOtra').addEventListener('click', function () {
        modalExito.hide();

    });

    renderizarRegistros();

});