
        // --- CAPTURA DEL ENVÍO DEL FORMULARIO (SUBMIT) ---
        const formRegistro = document.getElementById('formRegistro');

        if (formRegistro) {
            formRegistro.addEventListener('submit', (e) => {
                e.preventDefault(); // Evitamos que la página se recargue inmediatamente

                const datosRegistro = Object.fromEntries(
                    new FormData(formRegistro).entries()
                );

                sessionStorage.removeItem('registrosPeligro');
                sessionStorage.setItem('datosRegistro', JSON.stringify(datosRegistro));

                console.log("Datos listos para enviar a la Base de Datos o API:", datosRegistro);

                
            
                // Redireccionamos al menú principal
                window.location.href = '../RegistrarEspecifico/Registrar.html';
            });
        }
