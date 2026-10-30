const USE_BACKEND = false;
const API_URL = 'api_productos.php';

// Base de datos simulada en localStorage

let productos = JSON.parse(localStorage.getItem('inventario_productos')) || [
    {
        id: 1,
        codigo_barras: '1234567890123',
        nombre: 'Laptop HP Pavilion',
        categoria: 'Electrónicos',
        descripcion: 'Laptop HP Pavilion 15" con 8GB RAM',
        stock: 10,
        precio: 599.99,
        stock_minimo: 2
    },
    {
        id: 2,
        codigo_barras: '2345678901234',
        nombre: 'Camiseta Básica',
        categoria: 'Ropa',
        descripcion: 'Camiseta 100% algodón',
        stock: 50,
        precio: 19.99,
        stock_minimo: 10
    },
    {
        id: 3,
        codigo_barras: '3456789012345',
        nombre: 'Silla de Oficina',
        categoria: 'Hogar',
        descripcion: 'Silla ergonómica para oficina',
        stock: 8,
        precio: 149.99,
        stock_minimo: 3
    }
];

let proximoId = Math.max(...productos.map(p => p.id), 0) + 1;
let html5QrCode = null;
let scannerEnMarcha = false;
let scannerIniciando = false;
let cancelarInicioScanner = false;
let procesandoCodigo = false;
let escaneoRapido = false;

/*--------------------------------
    Funciones para usar el backend
---------------------------------*/

// Funciones de navegación
function mostrarTab(tabName){
    if (tabName !== 'scanner' && (scannerEnMarcha || scannerIniciando)) {
        detenerScanner();
    }

    //Ocultar todos los contenidos
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Mostrar el contenido seleccionado
    document.getElementById(`content-${tabName}`).classList.add('active');

    // Actualizar estilos de pestañas
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('active');
    });

    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Cargar datos si es necesario 
    if(tabName === 'productos'){
        cargarProductos();
    }
}

// Funciones de productos
function cargarProductos(){
    const tbody = document.getElementById('tablaProductos');
    tbody.innerHTML = '';

    //Datos del servidor




    // localStorage
    productos.forEach(producto => {
        const fila = document.createElement('tr');

        const stockClass = producto.stock <= producto.stock_minimo ? 'stock-low' : '';

        fila.innerHTML = `
            <td>${producto.id}</td>
            <td style = "font-family: monospace;">${producto.codigo_barras || 'N/A'}</td>
            <td>${producto.nombre}</td>
            <td>${producto.categoria}</td>
            <td class= "${stockClass}">${producto.stock}</td>
            <td>${producto.precio.toFixed(2)}</td>
            <td>
                <button onclick="editarProducto(${producto.id})" class="btn btn-primary" style="margin-right: 5px; padding: 5px 10px;">
                    &#x1F4DD;
                    Editar
                </button>
                <button onclick="eliminarProducto(${producto.id})" class="btn btn-danger" style="padding: 5px 10px;">
                    &#x274C;
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
    actualizarEstadisticas();
}

function actualizarEstadisticas(){
    const totalProductos = productos.length;
    const valorTotal = productos.reduce((total, producto) => total + (producto.stock * producto.precio), 0);

    document.getElementById('totalProductos').textContent = totalProductos;
    document.getElementById('valorTotal').textContent = valorTotal.toFixed(2);
}

// Formulario de productos
document.getElementById('formProducto').addEventListener('submit', function(e){
    e.preventDefault();

    const nuevoProducto = {
        id: proximoId,
        codigo_barras: document.getElementById('codigoBarras').value.trim(),
        nombre: document.getElementById('nombreProducto').value.trim(),
        categoria: document.getElementById('categoriaProducto').value,
        descripcion: document.getElementById('descripcionProducto').value.trim(),
        stock: Number(document.getElementById('stockProducto').value),
        precio: Number(document.getElementById('precioProducto').value),
        stock_minimo: parseInt(document.getElementById('stockMinimo').value)
    };

    if(nuevoProducto.codigo_barras && productos.some(p => p.codigo_barras === nuevoProducto.codigo_barras)){
        mostrarNotificacion('El código de barras ya existe', 'error');
        return;
    }

    proximoId += 1;
    productos.push(nuevoProducto);
    guardarEnLocalStorage();
    mostrarNotificacion('Producto agregado correctamente', 'success');
    limpiarFormulario();
    mostrarTab('productos');
});

function limpiarFormulario(){
    document.getElementById('formProducto').reset();
    document.getElementById('stockMinimo').value = 5;
}

function buscarProductos(){
    const termino = document.getElementById('buscarProducto').value.toLowerCase();
    const filas = document.querySelectorAll('#tablaProductos tr');

    filas.forEach(fila => {
        const texto = fila.textContent.toLowerCase();
        if (texto.includes(termino)){
            fila.style.display = '';
        }else{
            fila.style.display = 'none';
        }
    });
}

function buscarProductoPorCodigo(){
    const codigo = document.getElementById('codigoEscaneado').textContent.trim();
    if (!codigo) {
        mostrarNotificacion('Primero escanea un código de barras', 'error');
        return;
    }

    const producto = productos.find(p => p.codigo_barras === codigo);

    if(producto){
        mostrarTab('productos');
        document.getElementById('buscarProducto').value = codigo;
        buscarProductos();
        mostrarNotificacion('Producto encontrado', 'success');
    }else{
        mostrarNotificacion('producto no encontrado. ¿Deseas agregarlo?', 'error');
        document.getElementById('codigoBarras').value = codigo;
        mostrarTab('agregar');
    }
}

function abrirScannerRapido(){
    escaneoRapido = true;
    mostrarTab('scanner');
    iniciarScanner();
}

function usarCodigoEscaneado(){
    const codigo = document.getElementById('codigoEscaneado').textContent.trim();
    if (!codigo) {
        mostrarNotificacion('Primero escanea un código de barras', 'error');
        return;
    }

    document.getElementById('codigoBarras').value = codigo;
    escaneoRapido = false;
    mostrarTab('agregar');
    document.getElementById('nombreProducto').focus();
    mostrarNotificacion('Código agregado al formulario', 'success');
}

function editarProducto(id){
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    document.getElementById('editarId').value = producto.id;
    document.getElementById('editarNombre').value = producto.nombre;
    document.getElementById('editarStock').value = producto.stock;
    document.getElementById('editarPrecio').value = producto.precio;

    document.getElementById('modalEditar').classList.add('show');
}

function cerrarModal(){
    document.getElementById('modalEditar').classList.remove('show');
}

//Backend

// Funciones del scanner
async function iniciarScanner(){
    if (scannerEnMarcha || scannerIniciando) return;
    if (typeof Html5Qrcode === 'undefined') {
        mostrarNotificacion('No se pudo cargar el lector. Comprueba tu conexión e inténtalo de nuevo.', 'error');
        return;
    }

    scannerIniciando = true;
    cancelarInicioScanner = false;
    procesandoCodigo = false;
    const botonIniciar = document.getElementById('btnIniciarScanner');
    botonIniciar.disabled = true;

    try {
        html5QrCode = new Html5Qrcode('reader');
        await html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 150 } },
            async (decodedText) => {
                if (procesandoCodigo) return;
                procesandoCodigo = true;
                document.getElementById('codigoEscaneado').textContent = decodedText.trim();
                document.getElementById('resultadoScan').classList.add('show');
                await detenerScanner(false);

                if (escaneoRapido) {
                    document.getElementById('codigoBarras').value = decodedText.trim();
                    escaneoRapido = false;
                    mostrarTab('agregar');
                    document.getElementById('nombreProducto').focus();
                    mostrarNotificacion('Código escaneado. Completa los datos para agregar el producto.', 'success');
                } else {
                    mostrarNotificacion('Código escaneado correctamente', 'success');
                }
            }
        );
        scannerEnMarcha = true;
        if (cancelarInicioScanner) {
            await detenerScanner();
            return;
        }
        botonIniciar.style.display = 'none';
        document.getElementById('btnDetenerScanner').style.display = 'inline-block';
    } catch (error) {
        if (html5QrCode) {
            html5QrCode.clear();
            html5QrCode = null;
        }
        mostrarNotificacion('No se pudo iniciar la cámara. Permite el acceso y usa HTTPS o localhost.', 'error');
        console.error('Error al iniciar el escáner:', error);
    } finally {
        scannerIniciando = false;
        botonIniciar.disabled = false;
    }
}

async function detenerScanner(notificarError = true){
    if (scannerIniciando && !scannerEnMarcha) {
        cancelarInicioScanner = true;
        return;
    }

    if (html5QrCode && (scannerEnMarcha || scannerIniciando)) {
        try {
            if (scannerEnMarcha) {
                await html5QrCode.stop();
            }
            html5QrCode.clear();
        } catch (error) {
            if (notificarError) {
                mostrarNotificacion('No se pudo detener correctamente la cámara.', 'error');
            }
            console.error('Error al detener el escáner:', error);
        } finally {
            html5QrCode = null;
            scannerEnMarcha = false;
            scannerIniciando = false;
            document.getElementById('btnIniciarScanner').style.display = 'inline-block';
            document.getElementById('btnDetenerScanner').style.display = 'none';
        }
    }
}

function mostrarNotificacion(mensaje, tipo){
    let notificacion = document.getElementById('notificacion');
    if (!notificacion) {
        notificacion = document.createElement('div');
        notificacion.id = 'notificacion';
        notificacion.setAttribute('role', 'status');
        notificacion.setAttribute('aria-live', 'polite');
        document.body.appendChild(notificacion);
    }

    notificacion.textContent = mensaje;
    notificacion.className = `notification ${tipo === 'error' ? 'notification-error' : 'notification-success'}`;
    notificacion.classList.add('show');
    clearTimeout(notificacion.timeoutId);
    notificacion.timeoutId = setTimeout(() => notificacion.classList.remove('show'), 4000);
}

function guardarEnLocalStorage(){
    localStorage.setItem('inventario_productos', JSON.stringify(productos));
}

//Inicialización
document.addEventListener('DOMContentLoaded', function() {
    cargarProductos();
});

